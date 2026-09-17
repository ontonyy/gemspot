# Plan 016: Route admin API calls through the 401 → refresh → retry seam

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 0ce116c..HEAD -- web/src/shared/api web/src/pages/admin`
> If any changed, compare the "Current state" excerpts below against the live code; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (reuses a helper already proven and test-covered in two sibling clients)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Access tokens live 15 minutes. `web/src/shared/api/authApi.ts` and
`web/src/shared/api/httpPlacesApi.ts` each carry an `authedFetch` helper that, on a 401, trades the
30-day refresh token for a fresh access token and retries once — the seam plan 005 added tests for.
`web/src/shared/api/adminApi.ts` does **not**: all twelve admin methods use a bare `fetch` with a
token the page captured once at render.

So an admin who leaves the moderation panel open past the token TTL gets a hard 401 on every list,
approve, reject and status change — on the one surface where the action mutates published data —
while their session is still perfectly valid. Nothing self-heals until a full page reload runs
`bootstrap()`. This also removes the third copy of a helper that already exists twice, which is the
mechanism that caused the miss in the first place.

## Current state

### The gap — `web/src/shared/api/adminApi.ts:81-105`

```ts
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function call<T>(path: string, init: RequestInit, token: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = (await res.json()) as { message?: string | string[] }
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    } catch {
      /* non-JSON error body */
    }
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
```

### The helper to reuse — `web/src/shared/api/authApi.ts:90-110`

```ts
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

/* The access token is short-lived (15m); an open tab outlives it, so any authed
   call can 401 mid-session. authedFetch attaches the current token and, on a 401,
   trades the (30d) refresh token for a fresh access token and retries once before
   giving up. `build` is re-run per attempt so the retry uses the new token and a
   fresh request body (FormData/streams are single-use). Mirrors httpPlacesApi. */
async function authedFetch(
  build: (token: string | null) => { url: string; init: RequestInit },
): Promise<Response> {
  const attempt = (token: string | null) => {
    const { url, init } = build(token)
    return fetch(url, init)
  }
  let res = await attempt(useAuthStore.getState().accessToken)
  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    const ok = await useAuthStore.getState().refreshSession()
    if (ok) res = await attempt(useAuthStore.getState().accessToken)
  }
  return res
}
```

`httpPlacesApi.ts` has a byte-similar copy. Note the `build` callback shape: it is re-invoked per
attempt so the retry picks up the new token.

### Callers — `web/src/pages/admin/`

```
AdminDashboard.tsx:9    const token = useAuthStore((s) => s.accessToken)
AdminModeration.tsx:17  const token = useAuthStore((s) => s.accessToken)!
AdminPlaces.tsx:15      const token = useAuthStore((s) => s.accessToken)!
AdminUsers.tsx:7        const token = useAuthStore((s) => s.accessToken)!
```

All call sites pass `token` as the first argument (`adminApi.stats(token)`,
`adminApi.approveSubmission(token, s.id)`, …). The `AdminApi` interface at the top of
`adminApi.ts` declares that `token: string` parameter on every method, and there is an in-memory
mock implementation in the same file used when `VITE_API_URL` is unset.

### Conventions to match

- Feature-sliced layout: shared network code lives in `web/src/shared/api/`.
- Tests are vitest, colocated (`web/src/shared/api/httpPlacesApi.test.ts`). That file is the
  exemplar for testing this exact seam — read it in full before writing the new test; it drives the
  seam through the public surface and injects `refreshSession` via `useAuthStore.setState` rather
  than module-mocking.
- No test-environment DOM is configured, so the new test must stay module-level (no React
  rendering).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Lint    | `cd web && npm run lint`  | exit 0 |
| Tests   | `cd web && npm run test`  | all pass |
| Build   | `cd web && npm run build` | exit 0 |
| Gate    | `cd web && npm run lint && npm run test && npm run build` | exit 0 |

## Scope

**In scope**:
- `web/src/shared/api/authedFetch.ts` (create)
- `web/src/shared/api/adminApi.ts`
- `web/src/shared/api/authApi.ts` — only to import the extracted helper instead of its local copy.
- `web/src/shared/api/httpPlacesApi.ts` — only the same swap. **If** its copy differs in any
  behaviour beyond naming, leave it alone and say so in your report.
- `web/src/shared/api/adminApi.test.ts` (create)

**Out of scope**:
- The `AdminApi` interface's `token` parameter and every call site in `web/src/pages/admin/`.
  Keep the signatures exactly as they are — the parameter simply stops being the source of truth
  for the header. Changing twelve signatures and four pages is a bigger diff for no user-visible
  gain, and it is what makes this plan LOW risk.
- The in-memory mock implementation in `adminApi.ts` — untouched.
- Error handling in the admin pages (the `.catch(() => undefined)` swallowing) — a separate concern.
- `web/src/shared/store/authStore.ts` — do not change `refreshSession` or `bootstrap`.

## Git workflow

- Branch: `advisor/016-admin-api-refresh-retry`
- Commit message style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract the helper

Create `web/src/shared/api/authedFetch.ts` exporting:
- `BASE` — the same `(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')` expression.
- `authedFetch(build)` — verbatim the implementation quoted above from `authApi.ts`, including its
  explanatory comment (adjust the last line so it no longer says "Mirrors httpPlacesApi"; it is now
  the single copy).

Import `useAuthStore` from `../store/authStore`.

**Verify**: `cd web && npm run build` → exit 0.

### Step 2: Point the existing clients at it

In `authApi.ts`, delete the local `authedFetch` and `BASE` and import both from `./authedFetch`.
Do the same in `httpPlacesApi.ts` **only if** its copy is behaviourally identical — diff the two
first (`sed -n` the relevant ranges and compare by eye). If it differs, leave it and note why.

**Verify**: `cd web && npm run lint && npm run test && npm run build` → exit 0 and all existing
tests still pass. `httpPlacesApi.test.ts` passing unchanged is the proof the extraction is faithful.

### Step 3: Rewrite `adminApi.call` on top of it

Rewrite `call<T>(path, init, token)` so that:
- It keeps the same three-parameter signature (the `token` argument is accepted and ignored — add
  a one-line comment saying the store's current token wins per attempt, which is what makes the
  retry work).
- It calls `authedFetch((t) => ({ url: `${BASE}${path}`, init: { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, ...(init.headers as Record<string, string> | undefined) } } }))`.
- The `!res.ok` unwrapping, the `status` property on the thrown `Error`, and the 204 handling stay
  exactly as they are today.

If your linter objects to an unused parameter, prefix it (`_token`) rather than removing it from
the signature.

**Verify**: `cd web && npm run lint && npm run test && npm run build` → exit 0.

### Step 4: Test

Write the test described below.

**Verify**: `cd web && npm run test` → all pass.

## Test plan

Create `web/src/shared/api/adminApi.test.ts`, structurally mirroring
`web/src/shared/api/httpPlacesApi.test.ts` (same `vi.stubGlobal('fetch', …)` setup, same
`useAuthStore.setState({ refreshSession })` injection, same `json()`/`unauthorized()` helpers).

Cases, driven through a real admin method (`adminApi.listPlaces('stale-token')` is a good choice —
a plain GET):
1. **No refresh on success** — first fetch returns 200; `refreshSession` never called; one fetch.
2. **401 → refresh → retry with the new token** — first fetch 401, `refreshSession` resolves true
   and sets a new `accessToken`, second fetch returns 200. Assert two fetches, and that the second
   request's `Authorization` header carries the *new* token (copy `bearerOf` from the exemplar).
3. **401 with a failed refresh gives up** — `refreshSession` resolves false; the promise rejects
   with an error whose `status` is 401, and there is no third attempt.

Only run these against the http implementation. If `adminApi` resolves to the in-memory mock when
`VITE_API_URL` is unset, check how `httpPlacesApi.test.ts` handles the same problem and follow it
(it imports the http implementation directly by name).

## STOP conditions

- The drift check shows an in-scope file changed and the excerpts no longer match → STOP.
- `httpPlacesApi`'s `authedFetch` copy differs behaviourally from `authApi`'s → do not reconcile
  them in this plan. Leave `httpPlacesApi` alone, finish the rest, and report the difference.
- `adminApi` cannot be imported in a test without a DOM environment → STOP and report; adding a
  jsdom test environment is out of scope here.
- Existing tests in `httpPlacesApi.test.ts` or `authStore.test.ts` start failing after step 2 →
  revert step 2, keep the extraction as a new file used only by `adminApi`, and report.

## Done criteria

- `cd web && npm run lint && npm run test && npm run build` exits 0 (this is the campaign gate).
- `grep -n 'await fetch' web/src/shared/api/adminApi.ts` returns nothing.
- `grep -rn 'async function authedFetch' web/src/shared/api/` returns exactly one hit, in
  `authedFetch.ts`.
- The new `adminApi.test.ts` 401-retry case fails if you temporarily revert `call` to a bare
  `fetch`. Confirm this, then restore.

## Maintenance note

`shared/api/authedFetch.ts` is now the single place where the auth retry, the base URL and (later)
anything cross-cutting — request IDs, timeouts, breadcrumbs — belongs. Any new API client in
`web/src/shared/api/` must build on it rather than calling `fetch` directly; watch for that in
review. The remaining duplication (three near-identical error-unwrapping blocks) is deliberately
left for a separate consolidation proposal.
