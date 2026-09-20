# 6. The refresh token travels as an HttpOnly cookie, not in `localStorage`

Date: 2026-09-17

## Status

Superseded by [ADR 0007](0007-clerk-owns-identity.md), 2026-09-20 — hours after merging.

Merged to `master` in `8afe993` **with its origin prerequisite unmet**, so the cookie it
describes never served a working refresh: `gemspot.web.app` and `*.run.app` are both Public
Suffix List entries. Nobody was affected — `users` is empty and the API had not deployed since
2026-09-12. Clerk owns session transport, so `RefreshCookies`, the Origin allowlist guard and the
zustand `version: 2` migration are all deleted by ADR 0007's rip-out.

**Read this ADR anyway.** Its analysis of what an HttpOnly cookie does and does not buy — it
removes exfiltration, not XSS — is why ADR 0007 was considered at all, and its rejection of
`SameSite=None` as a default is the reasoning that made the split-origin deployment visible.

Supersedes the localStorage trade-off recorded against `web/src/shared/store/authStore.ts`.
Decided from proposal `plans/025-httponly-refresh-cookie-auth.md`; executed as
`plans/032-httponly-refresh-cookie.md` on branch `advisor/032-httponly-refresh-cookie`.

## Context

`authStore.ts` persisted `refreshToken` through zustand's `partialize`, putting the durable
credential — 30d, against the access token's 15m — in `localStorage`, readable by any script
on the origin. This was a deliberate SPA trade-off priced on "we have no XSS"; `plans/020`
(a critical sanitizer bypass in `maplibre-gl`, a high advisory in `react-router`) is what that
assumption failing looks like, and it will recur.

An HttpOnly cookie does not make XSS harmless: the attacker can still act as the user while
the page is open. What it removes is **exfiltration** — the long-lived credential can no
longer be copied off the machine and used after the tab closes. That is the entire benefit and
it should not be described as more.

The origin question decided the shape. `deploy-web.yml` puts the SPA on Firebase Hosting site
`gemspot` → `https://gemspot.web.app`; `deploy-api.yml` puts the API on Cloud Run in
`europe-north1` → `https://…run.app`. **`web.app` and `run.app` are both Public Suffix List
entries**, so the two are neither same-origin nor same-site, and `firebase.json` carries only
a catch-all SPA rewrite. Proposal 025 said to answer this before writing code, and the answer
is the uncomfortable one.

## Decision

The refresh token is set as `HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=30d` by
every session-minting endpoint, read from the cookie by `POST /auth/refresh`, and cleared by
`POST /auth/logout`. `AuthResponseDto.refreshToken` is `@JsonIgnore`d, so the service layer is
untouched and the credential leaves the wire. `RefreshDto` is deleted. The access token stays
in `localStorage` (proposal 025 Option B).

Attributes are configuration (`app.auth.refresh-cookie.*`), not constants, with
production-safe defaults. `secure` is **not** derived from `request.isSecure()`: Cloud Run
terminates TLS at the front end, so the container sees plain HTTP and would silently drop the
flag in production.

CSRF: `POST /auth/refresh` and `POST /auth/logout` reject any request whose `Origin` is absent
or outside `app.cors.origin`, with 403. Browsers always send `Origin` on POST and page script
cannot forge it. `SameSite=Lax` alone was not enough, because it stops protecting the moment
an operator sets `SameSite=None`.

Migration: every existing user is signed out exactly once. The persisted store bumps to
`version: 2` with a `migrate` that **deletes** the `refreshToken` key. Nothing reads it.

## Consequences

- **The defaults describe a deployment that does not exist yet, and this is the load-bearing
  operator action.** `SameSite=Lax` is correct only once the web and the API share an origin.
  Until a Firebase Hosting rewrite proxies `/api/**` to the `gemspot-api` Cloud Run service
  and `VITE_API_URL` points at `https://gemspot.web.app/api`, the operator must set
  `AUTH_COOKIE_SAMESITE=None` — which makes this a third-party cookie that **Safari blocks
  outright** and Firefox partitions. Shipping the cookie without one of those two acts is a
  broken login, not a hardened one. `.github/workflows/` and `firebase.json` were out of scope
  for the change, which is exactly why this is stated here rather than assumed done.
- `SameSite=None; Secure` was rejected as the *default* precisely because it is the value that
  works today: defaulting to it would have made the safe path opt-in, and it is the trade
  proposal 025 argued against — a fragile mechanism bought for a benefit that does not need it.
- A double-submit CSRF token was rejected: a second JS-readable cookie plus a header on every
  refresh call, for the same browser threat model a header comparison already covers.
  `SameSite=Strict` on `/auth` was rejected because it suppresses the cookie on the first
  navigation in from an external link, silently degrading the email-verification and OAuth
  returns.
- A silent one-shot migration (read the old `localStorage` token once, exchange it for a
  cookie) was rejected: it keeps a credential-reading path in shipped JavaScript behind a
  "temporary" label nobody removes. One forced re-login on a pre-launch product is cheaper and
  honest. **Both transports are not supported — the body token is gone, not deprecated.**
- The Origin guard does not defend against an XSS on the allowed origin itself. That attacker
  already holds the live session; it is a different, larger boundary and this ADR does not
  claim it. Nor does it cover a non-browser client that omits `Origin`; there is none, and
  adding one means revisiting this, not weakening the guard.
- `POST /auth/logout` stopped being a parity no-op: only the server can clear an HttpOnly
  cookie, so the SPA can no longer end its own session unilaterally. It stays fire-and-forget
  from the client, so a failed call leaves the cookie until it expires — the local session is
  cleared regardless, and `logout-all` remains the hard revoke.
