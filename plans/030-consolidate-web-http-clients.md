# Plan 030: Consolidate the web HTTP clients onto the existing `authedFetch` seam

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise.
>
> **Origin**: build-tier execution of accepted proposal `plans/019-consolidate-web-http-clients.md`.
> That proposal deliberately left the shape open. This plan records the shape chosen, and why.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/src/shared/api/`
> If `authedFetch.ts` no longer exports `BASE` and `authedFetch`, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S (reduced from the proposal's M — plan 016 already did half of it)
- **Risk**: MED→LOW (touches every network call path, but only the middle of it; behaviour is
  pinned by characterisation tests written against the current code first)
- **Depends on**: plan 016 (`authedFetch` extraction — landed), plan 021 (test harness — landed)
- **Category**: tech-debt / architecture
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Proposal 019 counted five copies of the base-URL derivation, three of the error unwrapping and two
of the auth retry, and noted the duplication had already shipped a real bug (the missing admin 401
retry, fixed by 016). Plan 016 removed the retry duplication and two of the five `BASE` copies.
What is left is the part 016 did not reach: `warmup.ts` and `track.ts` still re-derive `BASE`, and
the `{message}` error unwrap still exists byte-identically in `adminApi.ts` and `authApi.ts`, along
with a duplicated `204 → undefined` / `res.json()` tail.

## The decision proposal 019 left open

**Chosen: option (a), "Minimal" — extend `authedFetch.ts` into the one HTTP seam.**
`BASE` already lives there; add `throwHttp(res)` (the body-message unwrap) and `parseBody<T>(res)`
(the 204/JSON tail) next to it. Each client keeps its own endpoint map, its own types and its own
exported shape. Net: one module owns base URL + error semantics + auth retry; nothing else changes.

**Rejected — option (b), typed `getJson`/`postJson` helpers in the shared module.** The proposal
flagged the precondition: every client's error semantics must *genuinely* be identical. They are
not. `adminApi` and `authApi` unwrap `{message}` from the response body and throw
`new Error(message)`; `httpPlacesApi.fail()` throws `` `${status} ${statusText} for ${path}` `` and
never reads the body. Unifying them would change the string users see on a failed public request —
a behaviour change wearing a refactor's clothes. `httpPlacesApi` therefore keeps its own `fail()`
and its own local `getJson`/`postJson`; that is recorded here as a deliberate non-goal, not an
oversight. Once plan 022 (surface swallowed errors) settles what a user-facing error message
should say, unifying the two becomes a *behaviour* decision someone can take on purpose.

**Rejected — option (c), adopt a client library (ky / axios / a TanStack Query wrapper).** The
remaining duplication is ~25 lines. `AGENTS.md` and the repo's rules are explicit that a few lines
beat a new dependency, and plan 020 is actively reducing the web dependency surface. Adding a
runtime dep to delete 25 lines is the wrong trade.

**Also rejected — renaming `authedFetch.ts` to `http.ts`.** It reads better and churns every
import plus two test files for zero behaviour. The module already exports `BASE` to non-authed
callers; a comment saying so is enough.

**Not decided here**: proposal 019(b) (keep the in-memory mocks — *kept*, untouched) and 019(c)
(admin pages onto TanStack Query — still a separate decision, still open).

## Current state

```
web/src/shared/api/authedFetch.ts   exports BASE, authedFetch
web/src/shared/api/warmup.ts:7      const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
web/src/shared/api/track.ts:6       (identical local copy)
web/src/shared/api/adminApi.ts      call(): imports BASE; inline {message} unwrap; 204 tail
web/src/shared/api/authApi.ts       throwHttp(): identical unwrap; call(): identical 204 tail
web/src/shared/api/httpPlacesApi.ts fail(): DIFFERENT error semantics — leave alone
```

Baseline: `cd web && npm run test` → **12 files / 51 tests passing**.

## Scope

In scope (the only files that may change):

- `web/src/shared/api/authedFetch.ts` — add `throwHttp`, `parseBody`
- `web/src/shared/api/warmup.ts` — import `BASE`
- `web/src/shared/api/track.ts` — import `BASE`
- `web/src/shared/api/adminApi.ts` — `call()` uses the shared helpers
- `web/src/shared/api/authApi.ts` — delete local `throwHttp`, use the shared one
- new: `web/src/shared/api/authApi.test.ts`, `web/src/shared/api/warmup.test.ts`,
  `web/src/shared/api/track.test.ts`
- `web/src/shared/api/adminApi.test.ts` — append error-unwrap cases

Out of scope, explicitly:

- `httpPlacesApi.ts` (different error semantics — see the decision above)
- the in-memory mocks in `adminApi.ts` / `authApi.ts` / `placesApi.ts` — preserved verbatim
- every call site outside `shared/api/` — no exported signature changes
- admin pages onto TanStack Query; any new dependency; any file rename
- `api/`, `.claude/`, `plans/README.md`, other plan files

## Steps

1. **Characterisation first.** Before touching any source, write the missing tests **against the
   current code** and watch them pass: `authApi.test.ts` (string `message`, array `message`,
   non-JSON body → `${status} ${statusText}`, 204 → `undefined`, `err.status` set),
   `warmup.test.ts` and `track.test.ts` (no fetch when `VITE_API_URL` unset; correct URL, method
   and `keepalive` when set — via `vi.stubEnv` + `vi.resetModules()` + dynamic import, since both
   capture `BASE` at module load), and two error-unwrap cases appended to `adminApi.test.ts`.
   *Verify*: `cd web && npm run test` — all new tests pass on unmodified source.
   A new test that fails here means the assertion is wrong, not the code. Fix the test.
2. **Extend the seam.** Add `throwHttp` and `parseBody` to `authedFetch.ts`, moved verbatim from
   `authApi.ts`. *Verify*: `cd web && npm run typecheck`.
3. **Rewire.** `warmup.ts` and `track.ts` import `BASE`; `adminApi.call` and `authApi.call` use
   `throwHttp` / `parseBody`; delete the local copies.
   *Verify*: `grep -c "import.meta.env.VITE_API_URL ?? ''" web/src/shared/api/*.ts` → only
   `authedFetch.ts` matches.
4. **Gate.** `cd web && npm run lint && npm run typecheck && npm run test && npm run build`.

## Test plan

- All 51 pre-existing tests pass **unchanged** — that is the faithfulness proof.
- New tests: `authApi` error/204 semantics, `warmup` and `track` fire-and-forget behaviour,
  `adminApi` error unwrap. Every one written and passing before the refactor.
- No mock-path test changes: `adminApi`/`authApi` resolve to their mocks when `VITE_API_URL` is
  unset, and the tests import the `http*` implementations by name (existing convention).

## STOP conditions

- Any pre-existing test needs editing to pass → stop. Behaviour changed.
- A characterisation test cannot be written without restructuring the code under test → stop.
- The shared unwrap would change any message string a user could see → stop.
- `httpPlacesApi.fail()` turns out to be reachable through the same path as `throwHttp` → stop.
- `npm run build` fails or the bundle gains a dependency → stop.

## Done criteria

- `authedFetch.ts` is the only module deriving `BASE`; the `{message}` unwrap exists once.
- Every exported symbol in `shared/api/` keeps its name, signature and semantics.
- Gate green; test count strictly greater than 51; the delta is only new files plus appended cases.
- This plan's decision section records the rejected options, which it does.
