# Plan 020: Clear the critical/high npm advisories in `web/` (maplibre-gl XSS, react-router open redirect)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/package.json web/package-lock.json web/src/widgets/map`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (maplibre-gl 5 → 6 is a semver-major bump; the map is the product's core surface)
- **Depends on**: none
- **Category**: security / dependencies
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

`cd web && npm audit` reports 10 advisories: 1 critical, 5 high, 4 moderate. Two of
them are reachable in this product's actual code paths, not transitive build-only noise:

- **maplibre-gl (critical)** — "XSS Sanitizer Bypass in `DOM.sanitize()` via Live
  NamedNodeMap Removal Skip". GemSpot renders a MapLibre map on the home/explore
  screen with popups and attribution HTML; a sanitizer bypass in the map library is
  a live XSS surface on the most-visited page.
- **react-router / react-router-dom (high)** — "Open redirect via backslash in
  `<Link>` and `useNavigate` (CVE-2025-68470 bypass)" and "RSCErrorHandler Missing
  Protocol Validation (XSS)". The app navigates with `useNavigate` using values that
  originate from route state (e.g. `navigate('/auth', { state: { from: ... } })` in
  `web/src/features/place-detail/SpotDetail.tsx`), so redirect targets are not all
  hard-coded literals.

The remaining advisories (postcss, nanoid, brace-expansion, browserslist,
baseline-browser-mapping, vitest/@vitest/mocker) are build/test-time only and all
have non-major fixes; sweeping them up in the same lockfile refresh costs nothing.

After this lands, `npm audit --audit-level=high` exits 0 and the map still works.

## Current state

- `web/package.json` — dependency manifest. Relevant pins today:

```jsonc
// web/package.json (dependencies)
"maplibre-gl": "^5.24.0",
"react-router-dom": "^7.16.0",
"supercluster": "^8.0.1",
```

- `npm audit` today reports (abridged, run it yourself in step 1 to confirm):

```
maplibre-gl      critical  XSS Sanitizer Bypass in DOM.sanitize()   fix: maplibre-gl@6.10.0 (SemVer major)
react-router     high      Open redirect via backslash in <Link>/useNavigate; RSCErrorHandler XSS
react-router-dom moderate  (via react-router)
postcss/nanoid/brace-expansion/browserslist/baseline-browser-mapping/vitest  — all fixAvailable, non-major
```

- MapLibre is used in three places — these are what a major bump can break:
  - `web/src/widgets/map/SpotMap.tsx` — the main explore map: custom `maplibregl.Marker`
    elements, `map.easeTo`, `supercluster` integration, `createRoot` per marker.
  - `web/src/widgets/map/HeroMapCanvas.tsx` — decorative home-page map.
  - `web/src/widgets/map/GuideRouteMap.tsx` — guide route map.
  - `web/src/widgets/map/buildStyle.ts` (+ `buildStyle.test.ts`) — builds the style JSON
    object handed to the map; the only MapLibre-adjacent code with existing test cover.
  - `web/src/features/add-spot/LocationPicker.tsx` — also constructs a map and sets
    attribution HTML via `dangerouslySetInnerHTML`.

- Repo conventions: `web/` is React 19 + Vite + TypeScript, ESLint flat config, Vitest.
  Dependency ranges use carets. The lockfile `web/package-lock.json` is committed.

## Commands you will need

| Purpose        | Command                                   | Expected on success        |
|----------------|-------------------------------------------|----------------------------|
| Install        | `cd web && npm install`                   | exit 0                     |
| Audit          | `cd web && npm audit --audit-level=high`  | exit 0, "found 0 ... high" |
| Lint           | `cd web && npm run lint`                  | exit 0                     |
| Tests          | `cd web && npm run test`                  | all pass                   |
| Build (typecheck + bundle) | `cd web && npm run build`     | exit 0                     |

## Scope

**In scope** (the only files you should modify):
- `web/package.json`
- `web/package-lock.json`
- `web/src/widgets/map/*.tsx`, `web/src/widgets/map/buildStyle.ts`,
  `web/src/features/add-spot/LocationPicker.tsx` — **only** if the maplibre-gl 6.x
  API requires a call-site change to keep compiling/working.

**Out of scope** (do NOT touch, even though they look related):
- `api/` — entirely unrelated to this plan.
- Map *behaviour*, styling, marker design, clustering tuning. This is a security
  upgrade, not a redesign. If a v6 change alters visual output, report it in the
  PR description rather than "improving" it.
- Adding new dependencies (no wrapper libs, no `dompurify`, nothing).
- Pinning exact versions / removing carets — the repo uses carets deliberately.

## Git workflow

- Branch: `advisor/020-web-dependency-advisories`
- Commit style, from `git log`: `BP-NA. [gemspot] <imperative summary>` for source
  changes (e.g. `BP-NA. [gemspot] clear critical/high npm advisories in web`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Record the baseline

Run `cd web && npm audit` and save the full output somewhere you can diff against
at the end (paste it into the PR description later).

**Verify**: `cd web && npm audit --audit-level=high; echo "exit=$?"` → prints a
non-zero exit and lists at least `maplibre-gl` (critical) and `react-router` (high).
If it already exits 0, STOP — the advisories were fixed elsewhere and this plan is
obsolete.

### Step 2: Apply every non-major fix

```
cd web && npm audit fix
```

This resolves react-router / react-router-dom, postcss, nanoid, brace-expansion,
browserslist, baseline-browser-mapping, vitest and @vitest/mocker without a major bump.
Do **not** pass `--force` at any point in this plan.

**Verify**: `cd web && npm audit --audit-level=high` → the only remaining high-or-worse
advisory is `maplibre-gl`. `cd web && npm run lint && npm run test && npm run build` →
all exit 0.

If `npm run build` fails here, the react-router 7.x patch changed a type you use.
Fix the call sites in `web/src/app/router.tsx` and any component the compiler names,
keeping routing behaviour identical. If the fix needs more than mechanical type
adjustments, STOP and report.

### Step 3: Bump maplibre-gl to the fixed major

```
cd web && npm install maplibre-gl@^6
```

Then read the MapLibre GL JS v6 release notes/migration guide for breaking changes and
check each of the five call sites listed in "Current state" against them. The APIs this
repo actually uses and must keep working:

- `new maplibregl.Map({ ... })` construction with a style object from `buildStyle.ts`
- `new maplibregl.Marker({ element, anchor })` `.setLngLat().addTo(map)` and `.remove()`
- `map.easeTo({ center, zoom, duration })`, `map.getZoom()`, `map.getBounds()`
- map event subscriptions (`map.on('move' | 'load' | ...)`) and their cleanup
- attribution control / attribution HTML in `LocationPicker.tsx`

Make only the changes the v6 API requires. Do not refactor surrounding code.

**Verify**: `cd web && npm run build` → exit 0, no TypeScript errors.
`cd web && npm run test` → all pass (including `buildStyle.test.ts`).
`cd web && npm audit --audit-level=high` → exit 0.

### Step 4: Manually smoke-test the map

`npm audit` and `tsc` cannot catch a runtime regression in a map library. Run
`cd web && npm run dev` and confirm in a browser at the dev URL:

1. **Home page** — the hero map renders tiles (not a blank/grey canvas).
2. **Explore page** — spot pins render; clusters render with their counts; clicking a
   cluster zooms in; clicking a pin opens the spot detail panel.
3. **Add a spot** (`/add`, signed in if required) — the location picker map renders and
   the attribution text appears.
4. Browser devtools console shows no new errors originating from `maplibre-gl`.

Record what you checked in the PR description.

**Verify**: all four checks pass. If any fails, STOP and report which one, with the
console error — do not attempt a deep rewrite of the map widget under this plan.

## Test plan

No new automated tests are required by this plan; the change is a dependency upgrade
and the repo has no browser-rendering test harness (see plan 021, which adds one).

- Existing `web/src/widgets/map/buildStyle.test.ts` must still pass — it covers the
  style object handed to MapLibre and is the closest thing to a map regression test.
- The manual smoke test in step 4 is the acceptance evidence; record it in the PR.
- Verification: `cd web && npm run test` → all pass, count unchanged from baseline.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd web && npm audit --audit-level=high` exits 0
- [ ] `cd web && npm run lint` exits 0
- [ ] `cd web && npm run test` exits 0, no test removed or skipped
- [ ] `cd web && npm run build` exits 0
- [ ] `grep -n '"maplibre-gl"' web/package.json` shows a `^6` (or newer) range
- [ ] `git status --porcelain` lists no modified file outside the in-scope list
- [ ] Step 4's manual smoke test recorded in the commit/PR description
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 shows the advisories are already resolved (plan obsolete).
- maplibre-gl v6 requires changes beyond the five call sites listed in Scope, or a
  rewrite of the clustering/marker logic in `SpotMap.tsx`.
- Any step's verification fails twice after a reasonable fix attempt.
- You are tempted to run `npm audit fix --force` — that is never the answer here;
  report instead.
- The map smoke test in step 4 fails on any of the four checks.

## Maintenance notes

- `npm audit` findings will recur. The durable follow-up is a scheduled dependency
  workflow (Dependabot / Renovate) — deliberately **not** in this plan, because it is
  a CI/infrastructure change and belongs in its own proposal.
- A reviewer should scrutinise: (a) that no `--force` resolution silently downgraded a
  package, (b) the diff in `web/src/widgets/map/` — anything beyond mechanical API
  adaptation is out of scope, (c) that the smoke-test evidence is present.
- If `maplibre-gl` v6 changed the style-spec shape, `buildStyle.ts` is the single place
  that constructs it — future style work stays there.
