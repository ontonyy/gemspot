# Plan 021: Give `web/` a component test harness (jsdom + Testing Library)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/vite.config.ts web/package.json web/src/pages/admin web/src/features/place-detail`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (adds test infrastructure; no production code changes)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

`web/` has exactly six test files and every one of them tests a pure function or a
store — `buildStyle.test.ts`, `fieldNotes.test.ts`, `geo.test.ts`, `pluralize.test.ts`,
`httpPlacesApi.test.ts`, `authStore.test.ts`. **Not one React component is tested**, and
none can be: `web/vite.config.ts` declares no `test.environment`, so Vitest runs in the
Node environment with no DOM, and `@testing-library/react` is not installed.

That gap is load-bearing. The components carrying real branching logic — `AddSpot.tsx`
(multi-step submission form), `AdminModeration.tsx` (approve/reject queue),
`SpotDetail.tsx` (loading/error/photo states) — can only be verified by a human clicking
through the app. It also blocks the fix in plan 022 (surfacing swallowed errors), whose
whole point is *what the user sees when a request fails* — untestable without a DOM.

This plan installs the harness and proves it with one real component test. It changes no
production source file.

## Current state

- `web/vite.config.ts` — no `test` block at all:

```ts
// web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json'

export default defineConfig({
  base: '/',
  server: process.env.PORT ? { port: Number(process.env.PORT), strictPort: true } : undefined,
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
```

- `web/package.json` scripts: `"test": "vitest run"`. `vitest` ^4 is in devDependencies;
  `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`,
  `@testing-library/user-event` are **not**.

- `web/src/pages/admin/AdminUsers.tsx` — the smallest component with a real async data
  path, chosen as the harness's proof:

```tsx
// web/src/pages/admin/AdminUsers.tsx:1-13
import { useEffect, useState } from 'react'
import { adminApi, type AdminUser } from '../../shared/api/adminApi'
import { useAuthStore } from '../../shared/store/authStore'

/* Read-only user roster — id, email, role, join time. */
export default function AdminUsers() {
  const token = useAuthStore((s) => s.accessToken)!
  const [users, setUsers] = useState<AdminUser[]>([])

  useEffect(() => {
    adminApi.listUsers(token).then(setUsers).catch(() => undefined)
  }, [token])
```

- **Test conventions to match**: tests live next to the code as `*.test.ts(x)`, open with
  a block comment explaining *what seam* is under test and why it is driven that way, and
  use Vitest's `describe/it/expect/vi`. Read
  `web/src/shared/api/httpPlacesApi.test.ts` (lines 1–25) before writing anything — it is
  the exemplar, and it shows the house pattern of injecting state through
  `useAuthStore.setState` rather than module-mocking.

## Commands you will need

| Purpose   | Command                                       | Expected on success |
|-----------|-----------------------------------------------|---------------------|
| Install   | `cd web && npm install`                       | exit 0              |
| Tests     | `cd web && npm run test`                      | all pass            |
| One file  | `cd web && npx vitest run src/pages/admin/AdminUsers.test.tsx` | passes |
| Lint      | `cd web && npm run lint`                      | exit 0              |
| Build     | `cd web && npm run build`                     | exit 0              |

## Scope

**In scope** (the only files you should modify or create):
- `web/package.json` (devDependencies only)
- `web/package-lock.json`
- `web/vite.config.ts` (add a `test` block)
- `web/src/test/setup.ts` (create)
- `web/tsconfig.app.json` or `web/tsconfig.json` — **only** if the compiler needs the
  new setup file / matcher types registered. Check first; do not edit speculatively.
- `web/src/pages/admin/AdminUsers.test.tsx` (create)

**Out of scope** (do NOT touch, even though they look related):
- **Any production component, store, or API module.** This plan adds a harness. If a
  component looks untestable without changing it, STOP and report rather than editing it —
  that is a finding for a follow-up plan, not a silent refactor.
- Playwright / E2E / browser-mode testing — different tool, different plan.
- Coverage thresholds or reporters.
- Writing tests for more than the one component named above. Breadth comes later;
  this plan proves the harness works.
- `.github/workflows/*` — the existing CI already runs `npm run test`.

## Git workflow

- Branch: `advisor/021-web-component-test-harness`
- Commit style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
  (e.g. `BP-NA. [gemspot] add jsdom + testing-library harness for web components`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install the test dependencies

```
cd web && npm install -D jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Use versions compatible with React 19 and Vitest 4 (the latest majors of each of these
packages support both; let npm resolve them).

**Verify**: `cd web && node -e "require.resolve('@testing-library/react')"` → exits 0.
`cd web && npm run build` → exit 0 (nothing broken by the install).

### Step 2: Configure the jsdom environment

Add a `test` block to `web/vite.config.ts`, keeping everything already there unchanged:

```ts
export default defineConfig({
  // ...existing base / server / plugins / define, unchanged...
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

Keep `globals: false` — the existing tests import `describe/it/expect/vi` explicitly from
`vitest` and must keep doing so.

If TypeScript complains that `test` is not a valid property of the Vite config, add the
Vitest config reference the way Vitest's docs prescribe for your installed version
(a `/// <reference types="vitest/config" />` triple-slash directive at the top of the
file is the usual form). Do not switch the project to a separate `vitest.config.ts`.

Create `web/src/test/setup.ts`:

```ts
/* Vitest global setup for component tests: registers jest-dom matchers and
   unmounts any mounted React tree between tests so stores/effects from one
   test can't leak into the next. */
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

**Verify**: `cd web && npm run test` → all six existing test files still pass, zero
failures. If any existing test breaks under jsdom, STOP and report which one — a
pure-logic test failing in a DOM environment means something unexpected about it.

### Step 3: Write the proof test

Create `web/src/pages/admin/AdminUsers.test.tsx`. Open it with a house-style comment
explaining the seam, then cover exactly these three cases:

1. **Renders the roster** — stub `adminApi.listUsers` to resolve with two users, render
   `<AdminUsers />`, assert both users' emails appear in the document.
2. **Empty roster** — stub it to resolve with `[]`, assert the table renders with no
   user rows (and does not throw).
3. **Request rejects** — stub it to reject, assert the component does not crash and the
   roster stays empty. **Assert only today's actual behaviour.** Today this component
   swallows the error and shows an empty table; write the test against that, not against
   what it *should* do. Plan 022 changes the behaviour and will update this test.

Supply the access token the component reads by setting it on the store the way
`httpPlacesApi.test.ts` does (`useAuthStore.setState({ accessToken: 'test-token' })`) and
reset it afterwards. Stub `adminApi.listUsers` with `vi.spyOn(adminApi, 'listUsers')`;
restore it in an `afterEach`. Use `findBy*` / `waitFor` for the async render — never a
bare `setTimeout`.

**Verify**: `cd web && npx vitest run src/pages/admin/AdminUsers.test.tsx` → 3 tests pass.

### Step 4: Confirm the whole gate

**Verify**: `cd web && npm run lint && npm run test && npm run build` → all exit 0, and
the test run reports 3 more tests than the baseline you recorded in step 2.

## Test plan

- New file: `web/src/pages/admin/AdminUsers.test.tsx` — three cases, listed in step 3
  (populated roster, empty roster, rejected request → current swallow behaviour).
- Structural pattern to follow: `web/src/shared/api/httpPlacesApi.test.ts` — the leading
  comment explaining the seam, explicit vitest imports, store state injected via
  `useAuthStore.setState`, assertions on observable behaviour rather than internals.
- Verification: `cd web && npm run test` → all pass, 3 new tests present.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "jsdom" web/vite.config.ts` returns a match
- [ ] `web/src/test/setup.ts` exists and is referenced by `setupFiles` in `web/vite.config.ts`
- [ ] `grep -n "@testing-library/react" web/package.json` returns a match under devDependencies
- [ ] `web/src/pages/admin/AdminUsers.test.tsx` exists
- [ ] `cd web && npm run test` exits 0, with 3 more tests than before this plan
- [ ] `cd web && npm run lint` exits 0
- [ ] `cd web && npm run build` exits 0
- [ ] `git status --porcelain` shows **no** modified file under `web/src` other than the
      new `test/setup.ts` and `AdminUsers.test.tsx` — no production component changed
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- An existing passing test starts failing under the jsdom environment.
- `AdminUsers` cannot be rendered in a test without modifying the component
  (e.g. it demands a router or provider context this plan didn't anticipate). Report
  exactly what it needs — do not change the component, and do not wrap the test in a
  sprawling provider stack invented on the spot. Rendering inside a
  `<MemoryRouter>` from the already-installed `react-router-dom` is acceptable if that
  is all that is missing; anything more, report.
- A step's verification fails twice after a reasonable fix attempt.
- You find yourself adding a test for a second component — that is out of scope.

## Maintenance notes

- This harness is the prerequisite for plan 022 (surface swallowed errors), whose tests
  assert on rendered error messages. 022 will rewrite case 3 of the proof test.
- The obvious follow-ups, deliberately deferred: tests for `AddSpot.tsx` (multi-step
  submission form) and `AdminModeration.tsx` (approve/reject queue) — the two components
  with the most untested branching. Pick them up once the harness is in.
- A reviewer should scrutinise that `globals` stayed `false` (otherwise the existing
  explicit-import convention silently rots) and that `cleanup()` runs between tests —
  without it, zustand store state bleeds across cases and produces flaky ordering bugs.
- If component tests later get slow, the `environment: 'jsdom'` setting can be narrowed
  per-file with `// @vitest-environment jsdom` docblocks instead of applying globally.
