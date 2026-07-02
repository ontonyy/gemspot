# Plan 005: Test the web 401→refresh→retry auth seam

> **Executor instructions**: Follow step by step. Run every Verify command. If a "STOP
> condition" occurs, stop and report. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat aad27f1..HEAD -- web/src/shared/api web/src/shared/store`
> If cited files changed, compare excerpts to live code; on mismatch STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (adds tests only)
- **Depends on**: none (ideally land after 004 so CI runs these)
- **Category**: tests
- **Planned at**: commit `aad27f1`, 2026-07-03

## Why this matters

The most intricate auth logic on the frontend — attach token, on 401 refresh once, retry with
the new token, dedupe concurrent refreshes — has **zero test coverage**. Only two web tests
exist (`web/src/shared/lib/geo.test.ts`, `web/src/widgets/map/buildStyle.test.ts`), both pure
utilities. A regression in the refresh/retry path silently logs users out or loops on dead
tokens, and nothing catches it. This is the highest-risk untested surface in `web/`.

## Current state

`web/src/shared/api/httpPlacesApi.ts:21-35` — the seam under test:
```js
async function authedFetch(build) {
  const auth = useAuthStore.getState()
  const attempt = (token) => { const { url, init } = build(token); return fetch(url, init) }
  let res = await attempt(auth.accessToken)
  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    const ok = await useAuthStore.getState().refreshSession()
    if (ok) res = await attempt(useAuthStore.getState().accessToken)
  }
  return res
}
```
`refreshSession()` + its in-flight dedup live in `web/src/shared/store/authStore.ts` (the
module-level `refreshInFlight` guard — read it to confirm the exact export names before mocking).

Test runner: Vitest (`web/package.json` → `"test": "vitest run"`). Existing tests use plain
Vitest with no DOM harness; check `web/vite.config.ts`/`vitest` config for `environment`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Run web tests | `cd web && npm run test` | all pass |
| Run one file | `cd web && npx vitest run src/shared/api/httpPlacesApi.test.ts` | pass |
| Typecheck | `cd web && npx tsc -b` | exit 0 |

## Scope

**In scope** (create tests + minimal test seams only):
- `web/src/shared/api/httpPlacesApi.test.ts` (create)
- `web/src/shared/store/authStore.test.ts` (create)

**Out of scope** (do NOT modify to make tests pass):
- `httpPlacesApi.ts`, `authStore.ts` runtime logic. If they are untestable without a seam,
  prefer mocking `fetch` and `useAuthStore.getState()` rather than changing source. If a source
  change is truly required, STOP and report — don't refactor silently.
- Backend, other stores, map widget.

## Git workflow

- Branch: `advisor/005-web-auth-refresh-tests`
- Commit: `BP-NA. [gemspot] test 401 refresh-retry auth seam`
- No push/PR unless told.

## Steps

### Step 1: Confirm testability + mocking approach
Read `authStore.ts` to note the exact store shape (`accessToken`, `refreshToken`,
`refreshSession`, the in-flight guard). Decide the mock strategy: stub global `fetch` with
`vi.fn()` and drive `useAuthStore.setState(...)` (zustand stores are directly settable in tests).

**Verify**: `cd web && npx tsc -b` → exit 0 after adding an empty test file importing the module.

### Step 2: Test authedFetch happy path + 401 retry
In `httpPlacesApi.test.ts` (you may need to export `authedFetch` or test it via a public method
like `getJson(path, true)` — prefer testing the public surface). Cases:
1. Token valid → `fetch` called once, response returned, no refresh.
2. First call 401 + refreshToken present + `refreshSession()` resolves true → `fetch` called
   twice, second uses the new token, final response is the retried one.
3. 401 + `refreshSession()` resolves false → no infinite loop, the 401 is returned once retry is
   skipped/failed.
4. 401 + no refreshToken → no refresh attempt.

**Verify**: `cd web && npx vitest run src/shared/api/httpPlacesApi.test.ts` → all pass.

### Step 3: Test refreshSession dedup
In `authStore.test.ts`: fire two concurrent `refreshSession()` calls; assert the underlying
refresh `fetch` is invoked once (dedup), both callers resolve with the same result, and the
in-flight guard resets afterward (a third call after settle refreshes again).

**Verify**: `cd web && npx vitest run src/shared/store/authStore.test.ts` → all pass.

### Step 4: Full suite green
**Verify**: `cd web && npm run test` → all pass (2 existing + new).

## Test plan

- Files: `httpPlacesApi.test.ts`, `authStore.test.ts`.
- Cases enumerated in Steps 2–3 (happy path, 401→refresh→retry, refresh-fails-no-loop,
  no-refresh-token, concurrent-dedup, guard-reset).
- Pattern reference: `web/src/shared/lib/geo.test.ts` for Vitest structure; extend with
  `vi.fn()`/`vi.stubGlobal('fetch', ...)`.

## Done criteria

- [ ] `cd web && npm run test` passes with the new files.
- [ ] `cd web && npx tsc -b` exits 0.
- [ ] Concurrent-refresh dedup is asserted (one underlying refresh call for two callers).
- [ ] No runtime source modified (`git status` shows only new `*.test.ts`), OR any required
      source change is reported, not silently made.
- [ ] `plans/README.md` status row for 005 updated.

## STOP conditions

- `authedFetch`/`refreshSession` cannot be exercised without changing source visibility beyond a
  trivial `export` — STOP and report the minimal seam needed.
- Vitest lacks a DOM/`fetch` environment and adding one requires config changes beyond a test
  file — STOP and report (config change may belong in a separate plan).

## Maintenance notes

- If the auth seam moves to HttpOnly cookies (a direction option in `plans/README.md`), these
  tests must be rewritten around cookie behavior.
- Reviewer: confirm tests assert call *counts* (dedup, retry-once), not just final status.
