# Proposal 025: Move the refresh token out of `localStorage` into an HttpOnly cookie

> **This is a proposal, not a build plan.** It changes the auth contract between
> `web/` and `api/` and needs a maintainer decision before anyone writes code. Do not
> execute it as-is. If the decision is "yes", the outcome is two or three build plans
> written against the chosen option.

## Status

- **Tier**: propose
- **Escalation trigger**: **public API / contract break** — `POST /auth/refresh` and
  `POST /auth/logout` change how the refresh credential travels (body/localStorage →
  cookie), and `SecurityConfig` + CORS credential handling change with them. Any client
  built against today's shape breaks.
- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH (every signed-in user's session flows through this)
- **Depends on**: none technically; in practice `plans/021` (component test harness) and
  `plans/024` (atomic rotation) should land first — see "Sequencing".
- **Category**: direction / security architecture
- **Planned at**: commit `0ce116c`, 2026-09-17

## The situation

`web/src/shared/store/authStore.ts` persists the whole session to `localStorage` via
zustand's `persist` middleware:

```ts
// web/src/shared/store/authStore.ts:231
partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }),
```

Both the short-lived access token and the **long-lived refresh token** sit in
`localStorage`, readable by any JavaScript running on the origin. The refresh token is the
durable credential: whoever holds it can mint access tokens until it is rotated or revoked.

This was a deliberate call, and the existing index records it as such — mitigated by a
15-minute access-token TTL and server-side refresh-reuse detection
(`AuthService.refresh()`, the "D4" scheme). It is a reasonable SPA trade-off, not a bug.
It is listed here because it is the largest remaining structural security decision in the
codebase, and because two things have changed the calculus:

1. `npm audit` currently reports a **critical XSS sanitizer bypass in `maplibre-gl`** and a
   **high XSS advisory in `react-router`** (see `plans/020`). The localStorage trade-off is
   priced on "we don't have XSS". Dependency advisories are how that assumption fails, and
   they will recur.
2. `web/src/features/add-spot/LocationPicker.tsx:64` uses `dangerouslySetInnerHTML` (for
   static vendor attribution HTML — not currently exploitable, but the pattern exists).

Under XSS, an HttpOnly refresh cookie does not make the attacker harmless — they can still
call the API as the user *while the page is open*. What it removes is **credential
exfiltration**: the attacker cannot copy a long-lived token out to their own machine and
keep the session after the user closes the tab. That is the entire value proposition, and
it should be weighed honestly rather than sold as "fixes XSS".

## What this would involve

Roughly, and only to size the decision — not as an implementation spec:

- **api**: set the refresh token as `HttpOnly; Secure; SameSite=...; Path=/auth` on login,
  register, OAuth callback and refresh; read it from the cookie in `refresh()` and
  `logout()` instead of the request body; clear it on logout. `SecurityConfig` and the CORS
  configuration must allow credentialed cross-origin requests from the web origin.
- **web**: drop `refreshToken` from `partialize`, keep the access token in memory (or keep
  it in `localStorage` — see Option B), and send `credentials: 'include'` on the auth calls.
  The 401→refresh→retry seam in `web/src/shared/api/httpPlacesApi.ts` and the refresh dedup
  in `authStore.ts` are both affected.
- **deployment**: cookies pin you to a cookie-compatible origin story. If `web/` and `api/`
  are served from different registrable domains today, `SameSite=None; Secure` is required
  and you inherit browser third-party-cookie restrictions — in some browsers that path is
  actively degrading. **This is the question to answer first**, before any code: what are
  the production origins of `web/` and `api/`, and can they be made same-site (e.g. api
  behind `/api` on the web origin, or a shared parent domain)? If they cannot, this
  proposal is substantially less attractive and Option C becomes the realistic answer.

## Options

**A. Full move — refresh token in an HttpOnly cookie, access token in memory only.**
Strongest posture: nothing durable is reachable from JS. Costs: a page reload always needs
a refresh round-trip before the first authenticated call (a visible cold-start delay, and
a "logged out for a moment" flicker unless handled); CSRF becomes a live concern the moment
a credential travels automatically, so the refresh endpoint needs CSRF protection (SameSite
plus a double-submit token, typically); OAuth and email-verification flows must be re-checked.

**B. Partial move — refresh token in an HttpOnly cookie, access token stays in `localStorage`.**
Removes the durable-credential exfiltration risk while keeping instant cold-start rendering.
An XSS still yields a ≤15-minute access token. Materially less work than A and captures most
of the benefit; the usual criticism ("you still have a token in localStorage") is true but
applies to a credential that expires on its own.

**C. Do nothing; harden instead.** Keep the current model and spend the same effort on the
things that actually gate the threat: keep dependency advisories at zero (`plans/020` plus a
scheduled dependency workflow), add a Content-Security-Policy to the web app, remove the
`dangerouslySetInnerHTML` use, and keep the access-token TTL short. This is a legitimate
answer and may well be the right one for a product at this stage — the cost of A or B is a
high-risk change to the path every single user traverses.

## Recommendation

**Answer the origin question first, then take B or C.** If `web/` and `api/` are (or can
cheaply be made) same-site, Option B is a good trade: it removes durable credential theft,
avoids the cold-start regression of A, and is a bounded change. If they are cross-site and
cannot be aligned, take **C** — the `SameSite=None` third-party-cookie path buys a fragile
mechanism in exchange for a real risk of breaking sessions in some browsers, which is a bad
trade for the benefit on offer.

In either case, **C's hardening work is worth doing regardless** and does not need this
decision: it is cheap, independent, and reduces the very XSS exposure that makes the token
location matter.

## Sequencing

- `plans/020` (clear the critical/high advisories) is unconditional and should land first
  — it addresses the live exposure this proposal is reacting to.
- `plans/024` (atomic refresh rotation) should land before any auth-transport change, so
  the rotation logic is already correct when it moves.
- `plans/021` (component test harness) makes the web half of A or B testable; attempting
  an auth-flow change with no component tests is how sessions break in production.

## Decision needed from the maintainer

1. What are the production origins of `web/` and `api/`, and can they be same-site?
2. Option A, B, or C?
3. If A or B: is a cold-start refresh round-trip (A only) acceptable UX?

Record the answer as an ADR in `docs/adr/` before any implementation plan is written —
this is exactly the kind of decision that needs to outlive the PR that implements it, and
the existing rejected-findings note about localStorage should then point at that ADR.

## Open questions to resolve during design (not now)

- CSRF strategy for the refresh endpoint once the credential travels automatically.
- Migration for users with an existing `localStorage` refresh token: silently exchange it
  for a cookie on next refresh, or force a re-login?
- Whether `logout` must clear the cookie server-side for all devices or just the caller.
- Mobile/native clients, if any are planned — cookies are a worse fit there than bearer
  tokens, which may argue for keeping both transports.
