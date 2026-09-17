# Plan 028: Fix the saved-place sync race (last response wins, failures silent)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/src/shared/store/savedStore.ts web/src/shared/store/useGatedSave.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpt against the live code before proceeding; on a
> mismatch, re-locate the code rather than stopping.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (one store, one action; no API change)
- **Depends on**: plan 021 (jsdom test harness), plan 022 (toast idiom for surfacing failures)
- **Category**: correctness
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

`useSavedStore.toggle` optimistically updates `ids`, then fires `addSaved`/`removeSaved`
and overwrites the **entire** `ids` set from whichever response resolves last:

```ts
op.then((serverIds) => set({ ids: serverIds })).catch(() => undefined)
```

Two defects, one line:

1. **Last-response-wins.** Save A then save B. If A's response lands after B's, the store
   is reset to A's snapshot of the server set — B disappears from the UI even though the
   server has it. Same for save-then-unsave of one place: the UI settles on whichever
   HTTP round-trip happened to be slower. The save button is a one-tap control on the
   map and detail views, so double-toggles are ordinary user behaviour, not an edge case.
2. **Silent failure.** `.catch(() => undefined)` means a failed save looks identical to a
   successful one: `useGatedSave` has already shown "Saved to your collection". The user
   believes the place is saved; it is not, and the lie survives until the next reload.

The fix belongs in the store, not in callers. There are four call sites reading the store
and two mutating it (`useGatedSave` → `toggle`, `Auth.tsx` → `replace`); guarding in the
store fixes every caller at once and keeps `toggle`'s synchronous `boolean` contract.

## Current state

**`web/src/shared/store/savedStore.ts`** (whole file, ~40 lines). The relevant action:

```ts
toggle: (id) => {
  const has = get().ids.includes(id)
  set({ ids: has ? get().ids.filter((x) => x !== id) : [...get().ids, id] })
  const token = useAuthStore.getState().accessToken
  if (token) {
    const op = has ? authApi.removeSaved(token, id) : authApi.addSaved(token, id)
    op.then((serverIds) => set({ ids: serverIds })).catch(() => undefined)
  }
  return !has
},
```

**`web/src/shared/store/useGatedSave.ts`** — the only caller of `toggle`. Uses the return
value synchronously to pick a toast and fire analytics. Its contract must not change.

**Established idiom for surfacing failures** (plan 022, PR #42): `useToastStore`. Outside
React, the repo calls it imperatively — `web/src/shared/store/geoStore.ts:41`:

```ts
useToastStore.getState().show('Location access denied — …')
```

That is the idiom to follow here. Do not invent an error-state field or a new hook.

## Commands you will need

```bash
cd web
npm run lint
npm run test
npm run build
```

## Scope

**In scope**
- `web/src/shared/store/savedStore.ts`
- `web/src/shared/store/savedStore.test.ts` (new)
- `plans/028-saved-place-sync-race.md` (this file)
- `web/src/shared/store/useGatedSave.ts` — **only if** the fix changes `toggle`'s contract.
  It should not; treat a needed change here as a sign the fix went the wrong way.

**Out of scope**
- `plans/README.md`, other plan files, `.claude/`
- `api/` — the server endpoints are fine; this is a client ordering bug
- `web/src/shared/api/authApi.ts` — no signature change
- `web/src/pages/Auth.tsx` (`replace` on login merge is a deliberate full overwrite)
- Any other store, component, or test file

## Git workflow

Branch `advisor/028-saved-place-sync-race` off `night-shift/integration` is already
checked out. Leave changes in the working tree — do not commit, push, or open a PR.

## Steps

### Step 1 — Guard the store against stale responses

In `savedStore.ts`, add a module-level monotonic counter. Each `toggle` claims a ticket;
only the response belonging to the newest ticket may write to `ids`. Stale responses —
successes and failures alike — are dropped.

```ts
let syncSeq = 0
```

Inside `toggle`, after the optimistic `set`:

```ts
const token = useAuthStore.getState().accessToken
if (token) {
  const mine = ++syncSeq
  const before = get().ids
  const op = has ? authApi.removeSaved(token, id) : authApi.addSaved(token, id)
  op.then((serverIds) => {
    if (mine === syncSeq) set({ ids: serverIds })
  }).catch(() => {
    if (mine !== syncSeq) return
    set({ ids: before })
    useToastStore.getState().show(
      has ? "Couldn't remove that spot — please try again" : "Couldn't save that spot — please try again",
    )
  })
}
```

`before` is the pre-toggle set, so the rollback is a true undo of this toggle. Import
`useToastStore` from `./toastStore`. Update the file header comment: server calls are no
longer "fire-and-forget" — the newest response wins and failures roll back and toast.

**Verify**: `cd web && npm run lint` — clean.

### Step 2 — Tests that actually reproduce the race

New file `web/src/shared/store/savedStore.test.ts`, mocking `../api/authApi` at module
level in the style of `authStore.test.ts`, with deferred promises so resolution order is
explicit and timing-free. Reset `useSavedStore.setState({ ids: [] })` and the auth token
in `beforeEach`.

Required cases:

1. **Out-of-order success** — toggle A, toggle B, both in flight; resolve **B first**,
   then A with A's stale server set. Assert the settled `ids` equal B's set (the newest
   response), not A's. Against the old code this fails: A's late response overwrites.
2. **Out-of-order save/unsave of the same id** — save `p1` then unsave `p1`; resolve the
   remove first, then the add with `['p1']`. Assert `p1` is absent. Old code: present.
3. **Failure rolls back and toasts** — single toggle, request rejects. Assert `ids`
   returns to the pre-toggle value and `useToastStore.getState().message` is set. Old
   code: no rollback, no message.
4. **Stale failure is ignored** — toggle A, toggle B; reject A after B resolved. Assert B's
   state survives and no toast fired. (This one also passes against the old code, which
   swallowed the rejection; it is a regression guard on the new rollback path.)
5. **Guest (no token)** — toggle with `accessToken` null still flips `ids` locally and
   calls no API method.

Do not `await` each toggle in turn — a serialized test passes against the old code and
proves nothing. Before running the suite, confirm cases 1-3 fail against the pre-fix
store (set the file aside with `git checkout --`, run, restore).

**Verify**: `cd web && npm run test` — new file passes, all pre-existing tests
(46 across 11 files) still pass.

### Step 3 — Gate

**Verify**: `cd web && npm run lint && npm run test && npm run build` — all green.

## Test plan

Uses the jsdom + Testing Library harness from plan 021; this store needs no DOM, so plain
vitest + a module mock of `authApi` suffices. Deferred promises (`let settle` captured
from a `new Promise`) give deterministic out-of-order resolution with no fake timers and
no sleeps. Toast assertions read `useToastStore.getState().message` directly rather than
rendering `<Toast>` — the store is the seam under test.

## Done criteria

- A late-landing response can no longer overwrite a newer one; the settled set always
  reflects the most recent toggle.
- A failed add/remove rolls the optimistic change back and shows a toast.
- `toggle` still returns `boolean` synchronously; `useGatedSave` is unchanged.
- `npm run lint`, `npm run test`, `npm run build` all pass; 46 pre-existing tests green.
- Race/rollback tests (cases 1-3) demonstrably fail against the pre-fix store.

## STOP conditions

- The fix requires changing `toggle`'s signature or editing more than the in-scope files.
- Any pre-existing test fails after the change.
- `useToastStore` no longer exists or its `show` signature differs from `geoStore.ts`'s use.
- `authApi.addSaved`/`removeSaved` no longer resolve to `string[]`.

## Maintenance notes

The counter is per-module and global across ids — a coarse guard, deliberately. Each
response carries the server's full authoritative set, so "newest wins" is correct for the
whole set; per-id sequencing would be more code for no behavioural gain. Revisit only if
the API moves to per-id deltas.
