# Plan 022: Stop swallowing request failures in the web UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/src/pages/admin web/src/features/place-detail`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (adds error rendering; no data-path or API change)
- **Depends on**: `plans/021-web-component-test-harness.md` — the tests in this plan
  render components, which is impossible until 021 lands the jsdom harness.
- **Category**: bug
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Six places in `web/` discard a failed request and leave the user staring at a UI that
looks like "there's nothing here" rather than "this didn't load". Two consequences:
users silently see wrong state (an admin reads an empty moderation roster and concludes
there is no work pending), and nobody — user or developer — gets a signal that the API
is down. One of the six is worse than silent: `ReportModal.submit()` has a `try/finally`
with no `catch`, so a failed report submission produces an **unhandled promise rejection**
while the modal closes its spinner and just sits there.

The repo already has the right primitive for this — `useToastStore` (`showToast`), used
throughout `SpotDetail.tsx`. This plan routes the swallowed failures into it, and gives
`SpotDetail` the error state it currently lacks entirely.

## Current state

Six confirmed sites. Excerpts are verbatim from the commit named above.

**1 + 2. `web/src/pages/admin/AdminPlaces.tsx:20` and `:34`**

```tsx
  const load = useCallback(() => {
    adminApi.listPlaces(token).then(setPlaces).catch(() => undefined)   // :20
  }, [token])
...
    try {
      const updated = await adminApi.setPlaceStatus(token, p.id, status)
      setPlaces((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
      setMsg(`${updated.name} → ${status}`)
      setTimeout(() => setMsg(null), 2200)
    } catch {
      /* ignore */                                                       // :34
    }
```

Note this file already has a flash-message channel (`msg` / `setMsg`, rendered as
`<div className="fg-adm-flash">`) — the status-change failure at `:34` should reuse it.

**3. `web/src/pages/admin/AdminUsers.tsx:11`**

```tsx
  useEffect(() => {
    adminApi.listUsers(token).then(setUsers).catch(() => undefined)
  }, [token])
```

**4. `web/src/pages/admin/AdminDashboard.tsx:18`**

```tsx
    adminApi.stats(token).then(setStats).catch((e: Error) => setErr(e.message))
    adminApi.eventCounts(token).then(setEvents).catch(() => undefined)   // :18
```

This file already has an `err` state and renders it — the `stats` call on the line above
uses it correctly. Only `eventCounts` is swallowed. Follow the pattern already there.

**5. `web/src/features/place-detail/SpotDetail.tsx:28` + `:54`**

```tsx
  const { data: p, isLoading } = usePlace(slug)          // :28  — `error` never read
...
  if (isLoading || !p) {                                  // :54
    return (
      <aside className="fg-detail" style={mobileStyle}>
        <DetailSkeleton onClose={onClose} />
      </aside>
    )
  }
```

When `usePlace` fails (network down, 404 on a bad slug), `isLoading` goes false and `p`
stays undefined — so the guard keeps rendering the **skeleton forever**. An infinite
loading shimmer, with no way to tell the user the spot could not be loaded.

**6. `web/src/features/place-detail/ReportModal.tsx:38-54`**

```tsx
  const submit = async () => {
    setSubmitting(true)
    try {
      const report = await placesApi.createReport({ ... })
      addReport(report)
      showToast('Thanks — report sent for review')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }
```

No `catch`. A rejected `createReport` propagates out of the async handler as an unhandled
rejection; the user sees the spinner stop and nothing else happen.

**Conventions to match:**
- Toasts: `const showToast = useToastStore((s) => s.show)` then `showToast('message')` —
  see `web/src/features/place-detail/SpotDetail.tsx:32` and its use in `requireAuth`.
- Data fetching uses TanStack Query via `web/src/shared/api/queries.ts`; `usePlace`
  returns the standard `{ data, isLoading, error }` shape — read `error`, don't add a
  parallel error state.
- Admin pages render their own inline message elements (`fg-adm-flash`) rather than toasts.
  Keep that split: admin pages use their local message channel, user-facing surfaces use toasts.
- User-visible copy is sentence case, plain English, no error codes
  (e.g. "Thanks — report sent for review").

## Commands you will need

| Purpose  | Command                    | Expected on success |
|----------|----------------------------|---------------------|
| Install  | `cd web && npm install`    | exit 0              |
| Tests    | `cd web && npm run test`   | all pass            |
| Lint     | `cd web && npm run lint`   | exit 0              |
| Build    | `cd web && npm run build`  | exit 0              |

## Scope

**In scope** (the only files you should modify or create):
- `web/src/pages/admin/AdminPlaces.tsx`
- `web/src/pages/admin/AdminUsers.tsx`
- `web/src/pages/admin/AdminDashboard.tsx`
- `web/src/features/place-detail/SpotDetail.tsx`
- `web/src/features/place-detail/ReportModal.tsx`
- `web/src/pages/admin/AdminUsers.test.tsx` (exists after plan 021 — update case 3)
- `web/src/features/place-detail/ReportModal.test.tsx` (create)
- `web/src/features/place-detail/SpotDetail.test.tsx` (create)

**Out of scope** (do NOT touch, even though they look related):
- `web/src/shared/api/*` — no change to how requests are made, retried, or typed. This
  plan is about what the UI does with a rejection, not about the fetch layer.
- Adding a global error boundary or a shared `<ErrorState>` component. Tempting and
  wrong for this plan: five call sites do not justify a new abstraction, and a
  half-designed one will outlive this PR. Use the primitives already in the repo.
- `web/src/shared/store/toastStore.ts` — use it as-is; do not extend it with severity
  levels or variants.
- Retry logic, TanStack Query defaults, `queries.ts`.
- `web/src/pages/AddSpot.tsx` and `web/src/pages/admin/AdminModeration.tsx` — they have
  their own error handling already; leave them alone.
- Changing any user-visible copy other than adding the new error messages.

## Git workflow

- Branch: `advisor/022-surface-swallowed-errors-web`
- Commit style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
  (e.g. `BP-NA. [gemspot] surface failed requests instead of swallowing them`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `ReportModal` — handle the rejection

Add a `catch` to `submit()` in `web/src/features/place-detail/ReportModal.tsx` between
the `try` and the existing `finally`. On failure, call the toast the component already
imports: `showToast("Couldn't send that report — please try again")`. Leave the modal
**open** on failure (do not call `onClose()`), so the user's typed note isn't lost.
`setSubmitting(false)` already runs in `finally`; leave it there.

**Verify**: `cd web && npm run build` → exit 0, and
`grep -n "catch" web/src/features/place-detail/ReportModal.tsx` shows the new catch inside
`submit`.

### Step 2: `SpotDetail` — render an error state

In `web/src/features/place-detail/SpotDetail.tsx`, destructure `error` from `usePlace`
(line 28) and split the current combined guard at line 54 into two:

- still loading → the existing `<DetailSkeleton />` (unchanged)
- not loading, and (`error` is set **or** `p` is undefined) → an error panel inside the
  same `<aside className="fg-detail" style={mobileStyle}>` wrapper, containing a short
  message ("Couldn't load this spot.") and a close control wired to the existing
  `onClose` prop, so the user is never trapped.

Reuse whatever close affordance `DetailSkeleton` already renders (it takes `onClose`);
match its markup rather than inventing new class names. Do not add new CSS files.

**Verify**: `cd web && npm run build && npm run lint` → both exit 0.

### Step 3: Admin pages — surface load and action failures

- `AdminUsers.tsx:11` — replace `.catch(() => undefined)` with a catch that sets a local
  error message state, rendered above the table in the same visual slot the other admin
  pages use (`<div className="fg-adm-flash">`). Message: "Couldn't load users."
- `AdminDashboard.tsx:18` — replace `.catch(() => undefined)` on `eventCounts` with
  `.catch((e: Error) => setErr(e.message))`, exactly matching the `stats` call on the
  line above it. No new state.
- `AdminPlaces.tsx:20` — catch the list failure into a message: "Couldn't load places."
  Reuse the existing `msg` state and its `fg-adm-flash` rendering.
- `AdminPlaces.tsx:34` — replace the `/* ignore */` catch body with
  `setMsg(\`Couldn't set ${p.name} → ${status}\`)`, reusing the same flash channel the
  success path uses (including its existing auto-clear behaviour if you keep the
  `setTimeout`; it is fine either way, but be consistent within the file).

Do not restructure these components, add a shared hook, or change their data flow.

**Verify**: `cd web && npm run lint && npm run build` → both exit 0.
`grep -rn "catch (\?) *{* *\/\* ignore \*\/\|catch(() => undefined)\|catch(() => undefined)" web/src/pages/admin/` → no matches.

### Step 4: Tests

See "Test plan" below. Write them after the behaviour changes so each test is written
against real, running code.

**Verify**: `cd web && npm run test` → all pass, new tests included.

### Step 5: Full gate

**Verify**: `cd web && npm run lint && npm run test && npm run build` → all exit 0.

## Test plan

Uses the jsdom + Testing Library harness from plan 021. Structural pattern: follow
`web/src/pages/admin/AdminUsers.test.tsx` as it exists after plan 021 (which in turn
follows `web/src/shared/api/httpPlacesApi.test.ts`) — leading comment naming the seam,
explicit `vitest` imports, `vi.spyOn` on the api module, store state via
`useAuthStore.setState`, `findBy*`/`waitFor` for async assertions.

1. **`web/src/pages/admin/AdminUsers.test.tsx`** — update the existing "request rejects"
   case: it currently asserts the failure is swallowed. Change it to assert the error
   message "Couldn't load users." is rendered.
2. **`web/src/features/place-detail/ReportModal.test.tsx`** (new) — three cases:
   - successful submit → success toast recorded in `useToastStore`, `onClose` called once;
   - rejected submit → failure toast recorded, `onClose` **not** called, and no unhandled
     rejection escapes (assert the promise returned by the click handler settles);
   - rejected submit → the submit button is re-enabled (`submitting` back to false).
3. **`web/src/features/place-detail/SpotDetail.test.tsx`** (new) — three cases:
   - `usePlace` loading → skeleton rendered;
   - `usePlace` resolved with a place → the place name rendered;
   - `usePlace` errored → the error copy rendered and the skeleton **not** rendered.
   Stub the query at the `usePlace` seam (`vi.spyOn` on the module exporting it from
   `web/src/shared/api/queries.ts`) rather than standing up a real QueryClient — if that
   proves impossible, wrapping the render in a `QueryClientProvider` with `retry: false`
   is the acceptable fallback.

Verification: `cd web && npm run test` → all pass, at least 6 net-new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "catch(() => undefined)" web/src/pages/admin/` returns no matches
- [ ] `grep -rn "/\* ignore \*/" web/src/pages/admin/AdminPlaces.tsx` returns no matches
- [ ] `grep -n "error" web/src/features/place-detail/SpotDetail.tsx` shows `error` read from `usePlace`
- [ ] `grep -n "catch" web/src/features/place-detail/ReportModal.tsx` shows a catch inside `submit`
- [ ] `web/src/features/place-detail/ReportModal.test.tsx` and
      `web/src/features/place-detail/SpotDetail.test.tsx` exist
- [ ] `cd web && npm run test` exits 0 with at least 6 more tests than before this plan
- [ ] `cd web && npm run lint` exits 0
- [ ] `cd web && npm run build` exits 0
- [ ] `git status --porcelain` lists no modified file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 021 has not landed (no `test.environment` in `web/vite.config.ts`) — this plan's
  tests cannot run. Do not install the harness yourself; execute 021 first.
- Any cited excerpt in "Current state" does not match the live code.
- `SpotDetail` cannot render an error state without restructuring `DetailSkeleton` or
  adding CSS — report what is missing rather than adding a stylesheet.
- You conclude a shared error component / error boundary is needed. That is a real
  observation and an out-of-scope change: report it, finish the plan with the local fixes.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Six local error messages is the right size *today*. If a seventh and eighth appear,
  that is the signal to extract a shared `<ErrorState>` / error-boundary — deliberately
  deferred here to keep this diff reviewable.
- A reviewer should scrutinise: (a) that `ReportModal` stays open on failure — closing it
  would discard the user's typed note, (b) that `SpotDetail`'s error branch still renders
  a working close control (otherwise a mobile user is trapped full-screen), (c) that no
  error message leaks a raw API error string to a non-admin surface.
- Related but untouched: `AddSpot.tsx` and `AdminModeration.tsx` handle their own errors
  already — if their copy drifts from the messages added here, align them in a follow-up.
- The api-side counterpart to this work is making sure those endpoints return useful
  status codes; that is plan 023's and the API's business, not this one's.
