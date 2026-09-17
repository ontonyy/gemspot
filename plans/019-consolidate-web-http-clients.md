# Proposal 019: Consolidate the five hand-rolled web HTTP clients

> **Tier: propose.** This is an architecture decision — where the web app's one network boundary
> lives, and what belongs on it — not a mechanical refactor to hand to an executor as-is. It also
> should not start before there is enough test cover to prove the move was faithful. Turn the
> chosen shape into a build-tier plan first.
>
> **Escalation trigger**: architecture — it changes the seam every network call in the SPA goes
> through, including the auth retry path that plans 005 and 016 built tests for.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (touches every network call path in the app)
- **Depends on**: plan 016 (extracts `authedFetch` — do that first and let it settle)
- **Category**: tech-debt / architecture
- **Planned at**: commit `0ce116c`, 2026-09-17

## The problem

`web/src/shared/api/` contains five modules that each re-derive the same base URL:

```
web/src/shared/api/adminApi.ts:81        const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
web/src/shared/api/authApi.ts:90         (identical)
web/src/shared/api/httpPlacesApi.ts:14   (identical)
web/src/shared/api/warmup.ts:7           (identical)
web/src/shared/api/track.ts:6            (identical)
```

The `{statusCode, message}` error-unwrapping exists three times in near-identical form
(`adminApi.ts:91-102`, `authApi.ts:110-120`, and a `fail()` variant in `httpPlacesApi.ts:30-41`),
and the 401→refresh→retry helper exists twice (`authApi.ts:97`, `httpPlacesApi.ts`).

This is not merely repetitive — it has already produced a real bug. The refresh-retry was added to
two of the three authed clients and missed `adminApi`, so the admin panel hard-fails on 401 (that
is what plan 016 fixes). The next cross-cutting concern — request IDs, timeouts, Sentry
breadcrumbs, a retry policy — will land the same way, in two places out of three.

## What needs deciding

**a) How far the shared layer goes.** Three plausible shapes:
  - *Minimal* — `shared/api/http.ts` exports `BASE`, `parseError`, `authedFetch`, and each client
    keeps its own endpoint map and types. Smallest diff; keeps the per-domain clients readable.
    (Plan 016 already takes the first step of this.)
  - *Typed request helpers* — the shared module also owns `getJson`/`postJson`/`del` with the JSON
    and 204 handling, and clients become thin endpoint maps. More consolidation, but every client's
    error semantics must genuinely be identical — verify that before assuming it.
  - *Adopt a client library* (e.g. ky, or lean harder on TanStack Query's boundary). Removes the
    hand-rolled code entirely at the cost of a runtime dependency and a larger migration. The app
    already uses TanStack Query for the public read paths (`shared/api/queries.ts`), so some of
    this layer may simply be redundant with it.

**b) Whether the in-memory mock implementations survive.** `adminApi.ts`, `authApi.ts` and
`placesApi` each ship a mock used when `VITE_API_URL` is unset, so the app is demoable with no
backend — a deliberate and useful property. Any consolidation has to preserve it, or the maintainer
has to decide to drop it.

**c) Whether the admin clients move onto TanStack Query.** The admin pages hand-roll
`useEffect` + `useState` loading (`web/src/pages/admin/AdminModeration.tsx:26-43`,
`AdminPlaces.tsx:20`) while the public side uses TanStack Query. That inconsistency is the source
of a separate class of bugs — swallowed errors, out-of-order responses on tab switches — that
consolidating only the transport layer would not fix. It may be the more valuable half of this
work, and it is a different decision.

## Evidence

| What | Where |
|------|-------|
| Five copies of the `BASE` derivation | `adminApi.ts:81`, `authApi.ts:90`, `httpPlacesApi.ts:14`, `warmup.ts:7`, `track.ts:6` |
| Three copies of error unwrapping | `adminApi.ts:91-102`, `authApi.ts:110-120`, `httpPlacesApi.ts:30-41` |
| Two copies of the auth retry helper | `authApi.ts:97-110`, `httpPlacesApi.ts` |
| The bug the duplication caused | `adminApi.ts:83` — bare `fetch`, no retry (see plan 016) |
| Hand-rolled loading in admin pages | `pages/admin/AdminModeration.tsx:26-43`, `AdminPlaces.tsx:20` |
| Existing TanStack Query boundary | `shared/api/queries.ts` |

## Trade-offs, briefly

The duplication is small in absolute terms — a few dozen lines — and mechanically harmless until
someone adds a cross-cutting concern, which is exactly when it bites. Against that, this refactor
touches every network call in the app, and the web test suite is currently six module-level files
with **no component or page tests** (`web/package.json` has no `@testing-library/*`, no jsdom, and
`vite.config.ts` sets no test environment). A refactor of the whole network layer with no
integration-level cover is how a quiet regression ships.

So the honest sequencing is: land plan 016 (which removes the actual bug and does the minimal
extraction), add component-test infrastructure and a couple of flow tests for the admin approve
path and the add-spot submit path, and only then decide how much further to consolidate. By that
point the maintainer may find the minimal shape is enough and the rest is not worth doing.

## If accepted

Likely build-tier plans, in order:
1. **Web component-test infrastructure** — `@testing-library/react` + jsdom, a `test.environment`
   in `vite.config.ts`, and two flow tests (AdminModeration approve; AddSpot submit-after-upload).
   This is a prerequisite, and it is worth doing on its own merits regardless of what is decided
   here.
2. **The chosen consolidation shape**, with the mock implementations explicitly preserved and the
   existing `httpPlacesApi.test.ts` / `authStore.test.ts` / new `adminApi.test.ts` suites passing
   unchanged as the faithfulness proof.
3. *(separate decision)* **Admin pages onto TanStack Query**, if (c) is accepted.

Gate for all of them: `cd web && npm run lint && npm run test && npm run build`.
