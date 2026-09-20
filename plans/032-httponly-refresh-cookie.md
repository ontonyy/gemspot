# Plan 032: Move the refresh token out of `localStorage` into an HttpOnly cookie

## Status

- **Tier**: execute (authorised by the maintainer's acceptance of `plans/025-httponly-refresh-cookie-auth.md`, 2026-09-17)
- **Escalation trigger**: **public API / contract break** — `POST /auth/refresh` and
  `POST /auth/logout` change how the refresh credential travels, and every session-minting
  endpoint stops returning `refreshToken` in its JSON body.
- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH — every signed-in user traverses this path.
- **Depends on**: `plans/021` (component test harness — landed), `plans/024` (atomic rotation
  — landed), `plans/030` (`authedFetch.ts` as the single web HTTP seam — landed).
- **Category**: security architecture
- **Option taken**: **B** from proposal 025 — refresh token in an HttpOnly cookie, access
  token stays in `localStorage`.
- **Planned at**: branch `advisor/032-httponly-refresh-cookie`, off `night-shift/integration`.

## Why this matters

`web/src/shared/store/authStore.ts:231` persists `refreshToken` through zustand's
`partialize`. The refresh token is the durable credential — 30d TTL
(`JWT_REFRESH_TTL: "30d"`, `.github/workflows/deploy-api.yml`) against the access token's
15m. Any XSS anywhere on the origin reads it and keeps the session after the tab closes.

An HttpOnly cookie does not make XSS harmless — the attacker can still act as the user while
the page is open. What it removes is **credential exfiltration**: the long-lived token can no
longer be copied off the machine. That is the whole value proposition and it should not be
sold as more.

## Current state

| Thing | Where | Today |
|---|---|---|
| Refresh token issued | `AuthService` → `AuthResponseDto(user, accessToken, refreshToken)` | in the JSON body |
| Refresh token stored | `authStore.ts` `partialize` | `localStorage` key `gemspot.auth` |
| Refresh consumed | `AuthController.refresh(@Valid @RequestBody RefreshDto)` | request body |
| Logout | `AuthController.logout()` | no-op, returns `{ok:true}` |
| CSRF | `SecurityConfig` `.csrf(disable)` | safe *because* nothing is ambient |
| CORS | `CorsConfig` | `allowCredentials(true)` already set |
| 401→refresh→retry | `authedFetch.ts:22` | gated on `store.refreshToken` being non-null |

## Decisions

### D1 — The deployment is cross-site today, and that is the load-bearing fact

Evidence: `.github/workflows/deploy-web.yml` deploys Firebase Hosting site `gemspot` →
`https://gemspot.web.app`. `.github/workflows/deploy-api.yml` deploys Cloud Run service
`gemspot-api` in `europe-north1` → `https://<hash>-<proj>.europe-north1.run.app`, reached by
the SPA through `VITE_API_URL`. `web.app` and `run.app` are **both entries on the Public
Suffix List**, so `gemspot.web.app` and `gemspot-api…run.app` are neither same-origin nor
same-site. `firebase.json` has a single catch-all SPA rewrite and no `run` rewrite.

That forces exactly one of two worlds:

- **Same-origin (chosen target).** Add a Firebase Hosting rewrite so `/api/**` proxies to the
  Cloud Run service, and point `VITE_API_URL` at `https://gemspot.web.app/api`. The cookie is
  then a **first-party** cookie: `SameSite=Lax` works, no third-party-cookie policy touches
  it, and `allowCredentials` CORS is not even exercised.
- **Cross-site (status quo).** `SameSite=None; Secure` is mandatory, and the cookie is a
  third-party cookie: **Safari's ITP blocks it outright**, Firefox partitions it by top-level
  site, and Chrome's support is in managed decline. That is a silently broken session for
  every Safari user — which this plan's own bar forbids.

**Decision:** implement the cookie, default its attributes to the **same-origin** world
(`SameSite=Lax; Secure; Path=/auth; HttpOnly; Max-Age=refresh TTL`), and make every attribute
environment-driven so the operator can set `AUTH_COOKIE_SAMESITE=None` knowingly if they
choose to stay cross-site. The Firebase rewrite and the `VITE_API_URL` change are **ops
actions this plan does not perform** — `.github/workflows/` is out of scope, and `firebase.json`
is deployment topology, not auth code. They are recorded as a blocking operator precondition
in the ADR and in "Done criteria".

**Rejected:** shipping `SameSite=None; Secure` as the default. It is the only attribute set
that works on the *current* deployment, and it is exactly the trade proposal 025 argued
against — a fragile mechanism, broken on Safari, bought in exchange for a benefit that does
not need it. Defaulting to the broken-on-Safari value would make the safe path opt-in.

**Rejected:** treating the cross-site finding as a STOP and taking Option C (harden only).
Defensible under 025's own recommendation, but the maintainer authorised 032 after that
recommendation was written, and the same-site world is one `firebase.json` rewrite away —
"cannot be aligned" is not true here.

### D2 — CSRF defence: an `Origin` allowlist check on the cookie-reading endpoints

The moment the credential travels automatically, `POST /auth/refresh` is reachable from any
page the user visits. `SameSite=Lax` already blocks cross-site *POST*, but that protection
evaporates the instant an operator sets `SameSite=None`, so it cannot be the only defence.

**Decision:** `POST /auth/refresh` and `POST /auth/logout` reject any request whose `Origin`
header is absent or is not in the configured `app.cors.origin` allowlist, with 403. Browsers
send `Origin` on every POST, cross-origin and same-origin alike, and it is not settable from
page JavaScript.

**Does not cover:** an XSS on the allowed origin itself (it can forge the request with the
right `Origin`) — but an XSS already holds the live session, so this is not the boundary the
defence exists at. Also does not cover a non-browser client that omits `Origin`; there is
none, and integration tests set it explicitly.

**Rejected:** double-submit CSRF token. Needs a second, JS-readable cookie, a header on every
refresh call, and client plumbing on a path that currently has none — strictly more moving
parts than a header comparison for the same browser threat model.

**Rejected:** `SameSite=Strict` on `/auth`. It would be the strongest option in the
same-origin world, but it also suppresses the cookie on the first navigation into the app
from any external link, which silently degrades the email-verification and OAuth return
flows. `Lax` + `Origin` check gets the same POST protection without that.

### D3 — Local development: attributes are environment-driven, production-safe by default

`Secure` cookies are not stored by browsers over plain `http://localhost` in every
browser/context combination, and the dev SPA runs on `http://localhost:5173` against an API
on `http://localhost:8080` — which is same-**site** (both `localhost`) but cross-**origin**.

**Decision:** `app.auth.refresh-cookie.secure` defaults to `true` and is set to `false` by the
local profile / `AUTH_COOKIE_SECURE=false`. `same-site` defaults to `Lax`. Both are plain
config keys with production-safe defaults, so an unset variable in production is safe and an
unset variable in dev is the only thing that needs an override.

**Rejected:** deriving `Secure` from `request.isSecure()`. Cloud Run terminates TLS at the
front end and the container sees plain HTTP, so this would silently drop `Secure` in
production — the exact failure a hardcoded default avoids.

### D4 — Migration: every existing user is logged out once, deliberately

**Decision:** a forced one-time re-login. The persisted store bumps to `version: 2` with a
`migrate` that **deletes** the `refreshToken` key from the persisted state. Old clients whose
`/auth/refresh` call now carries no cookie get a 401, which the store already handles by
clearing the session. Nothing reads the old value.

**Rejected:** a one-shot silent migration that reads the `localStorage` token once and posts
it to exchange for a cookie. It keeps a `localStorage`-reading code path in shipped
JavaScript and needs a follow-up nobody schedules — a permanently-supported second transport
wearing a temporary label. A single re-login on a pre-launch product is the cheaper honest
price.

### D5 — Access token stays in `localStorage` (proposal 025 Option B)

**Rejected:** Option A (access token in memory only). It adds a refresh round-trip to every
cold start and a logged-out flicker, for a credential that expires by itself in 15 minutes.
Option B removes the durable exfiltration risk, which is the entire point.

## Scope

**In scope**
- `api/src/main/java/ee/gemspot/api/security/RefreshCookies.java` (new)
- `api/src/main/java/ee/gemspot/api/web/AuthController.java`
- `api/src/main/java/ee/gemspot/api/dto/AuthResponseDto.java`
- `api/src/main/java/ee/gemspot/api/dto/RefreshDto.java` (deleted)
- `api/src/main/resources/application.yml`
- `api/src/test/java/ee/gemspot/api/integration/RefreshCookieTest.java` (new)
- `api/src/test/java/ee/gemspot/api/integration/LoginRefreshRegressionTest.java`
- `api/src/test/java/ee/gemspot/api/integration/ContractIntegrationTest.java` (if it asserts the field)
- `web/src/shared/api/authApi.ts`, `web/src/shared/api/authedFetch.ts`
- `web/src/shared/store/authStore.ts`
- their `.test.ts` files
- `docs/adr/0006-refresh-token-in-httponly-cookie.md` (new)
- `Engineering Vault/08 Decisions/personal-web-lessons.md` (one row)
- `plans/032-httponly-refresh-cookie.md`

**Out of scope**
- `.github/workflows/**` — including the `VITE_API_URL` and `CORS_ORIGIN` values this change
  makes the operator responsible for.
- `firebase.json` — the same-origin rewrite is deployment topology; recorded as an operator
  precondition, not performed here.
- `plans/README.md`, `.claude/**`.
- `SecurityConfig` route matrix (unchanged — `/auth/refresh` and `/auth/logout` stay
  `permitAll`; they authenticate by cookie, and the `Origin` guard runs in the controller).
- Native/mobile clients (none exist).

## Steps

### Step 1 — `RefreshCookies`: issue / read / clear, plus the `Origin` guard

One component in `security/`, holding the cookie attributes from config and the trusted-origin
set from `app.cors.origin`. The guard lives beside the cookie deliberately: it exists *because*
the cookie is ambient, and splitting them invites adding a cookie-reading endpoint without one.

Verify: `cd api && ./gradlew compileJava`

### Step 2 — Controller: set the cookie, stop returning the token

`register`, `login`, `oauth/google`, `oauth/facebook`, `password` and `refresh` take
`HttpServletResponse` and issue the cookie. `refresh` reads the token from the cookie (no body
— `RefreshDto` is deleted) and calls the guard first. `logout` calls the guard and clears the
cookie. `AuthResponseDto.refreshToken` gets `@JsonIgnore` so the service layer is untouched
and the wire shape loses the field.

Verify: `cd api && ./gradlew compileJava compileTestJava`

### Step 3 — API integration tests

New `RefreshCookieTest`: cookie attributes on login; refresh from cookie with an empty body;
rotation (the new cookie differs); logout clears it; no cookie → 401; forged `Origin` → 403.
Update `LoginRefreshRegressionTest` to drive the cookie instead of `$.refreshToken`.

Verify: `cd api && ./gradlew test`

### Step 4 — Web: drop the token from the store and the wire

`authStore`: remove `refreshToken` from state, `partialize`, and every clear site; `bootstrap`
and `refreshSession` stop reading it; `persist` gains `version: 2` + a `migrate` that deletes
the persisted key. `authApi.refresh()` loses its parameter and sends `credentials: 'include'`
with an empty body; `logout()` likewise. `authedFetch` drops the `refreshToken` gate on the
401 retry.

Verify: `cd web && npm run typecheck`

### Step 5 — Web tests + full gate

Verify: `cd api && ./gradlew build test` and
`cd web && npm run lint && npm run typecheck && npm run test && npm run build`

## Test plan

| Claim | Test |
|---|---|
| Login sets `gemspot_rt` HttpOnly, Secure, SameSite=Lax, Path=/auth, Max-Age>0 | `RefreshCookieTest.loginSetsHttpOnlyRefreshCookie` |
| Refresh works from the cookie with **no body token** | `RefreshCookieTest.refreshReadsTheCookieWithNoBody` |
| Refresh rotates the cookie | same test — new value ≠ old |
| A request with no cookie is rejected | `RefreshCookieTest.refreshWithoutCookieIs401` |
| A forged cross-origin refresh is rejected | `RefreshCookieTest.refreshFromForeignOriginIs403` |
| Logout clears the cookie | `RefreshCookieTest.logoutClearsTheCookie` |
| The token is no longer in the JSON body | `RefreshCookieTest.authResponseBodyCarriesNoRefreshToken` |
| Rotation/reuse detection still holds | existing `LoginRefreshRegressionTest` (cookie-driven) |
| `localStorage` holds no refresh token after login | `authStore.test.ts` persisted-state assertion |
| 401 → refresh → retry still works with the credential ambient | existing `httpPlacesApi.test.ts` / `adminApi.test.ts`, with the `refreshToken` seed removed |

## STOP conditions

- The `Origin` guard turns out to break the integration suite's own same-origin calls in a way
  that can only be fixed by weakening it to "absent `Origin` is allowed" — that would leave the
  CSRF hole open and must be reported, not worked around.
- Removing `refreshToken` from the response body breaks a consumer outside `web/` — stop and
  report; there is no second client, but a surprise one changes the contract calculus.
- Any web test needs its *assertion* changed (not just its setup) to keep passing — that is a
  behaviour change, and it must be named explicitly rather than absorbed.

## Done criteria

- [ ] `grep -rn 'refreshToken' web/src` returns nothing outside type definitions the API no longer sends.
- [ ] `api` gate green; `web` gate green with all 64 tests passing or explicitly updated.
- [ ] ADR `docs/adr/0006-*.md` written, number verified unclaimed across all worktrees and branches.
- [ ] One row appended to the vault index.
- [ ] **Operator precondition recorded and reported:** before this ships, either add a
      Firebase Hosting rewrite proxying `/api/**` to the `gemspot-api` Cloud Run service and
      set `VITE_API_URL=https://gemspot.web.app/api` (keeping `SameSite=Lax`), **or** set
      `AUTH_COOKIE_SAMESITE=None` and accept that Safari users cannot stay signed in.
