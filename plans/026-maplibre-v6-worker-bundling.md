# Plan 026: Land `maplibre-gl@6` by bundling its module worker through Vite

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
>
> **This plan is not done when lint/test/build are green.** See ADR 0003: the
> previous attempt passed all three while rendering a blank map. The acceptance
> evidence is a browser check against both `vite preview` (production bundle)
> and `vite dev`.

## Status

- **Priority**: P1
- **Effort**: S/M
- **Risk**: MED (build-plumbing change; the map is the product's core surface)
- **Depends on**: plan 020 (landed the other nine advisories), ADR 0003
- **Category**: security / build configuration
- **Planned at**: branch `advisor/026-maplibre-v6-worker`, 2026-09-17

## Why this matters

`cd web && npm audit` still reports one critical advisory: `maplibre-gl <= 6.4.0`,
"XSS Sanitizer Bypass in `DOM.sanitize()`" (GHSA-jrc7-96c5-q579). The fix is
`maplibre-gl@6.10.0`, a semver-major bump. Plan 020 attempted it, found the map
rendered blank, and pinned v5 (ADR 0003) because clearing it needs `vite.config.ts`
build plumbing that was out of that plan's scope. That scope is now authorized.

## Current state

- `web/package.json`: `"maplibre-gl": "^5.24.0"`.
- `web/vite.config.ts`: plain `defineConfig` with `react()`, a `define`, and the
  vitest block. No `worker` key.
- Four files construct a map and import the library as a default import:
  `web/src/widgets/map/SpotMap.tsx`, `HeroMapCanvas.tsx`, `GuideRouteMap.tsx`,
  `web/src/features/add-spot/LocationPicker.tsx`.
  `web/src/widgets/map/buildStyle.ts` imports only the `StyleSpecification` type.

### Why v6 renders blank (the root cause, confirmed by reading the v6 dist)

`node_modules/maplibre-gl/dist/maplibre-gl.mjs` contains:

```js
function Ki(){let e=import.meta.url;if(!/^https?:/.test(e))return``;
  let t=e.endsWith(`-dev.mjs`)?`maplibre-gl-worker-dev.mjs`:`maplibre-gl-worker.mjs`;
  return new URL(`./${t}`,e).href}
...
async function Xi(){let e=o.WORKER_URL||Ki(); ... new Worker(e,{type:`module`}) ...}
```

So v6 derives a sibling worker URL from its own `import.meta.url` unless
`WORKER_URL` is set. Vite never emits `maplibre-gl-worker.mjs` next to the bundle,
the request falls through to the SPA `index.html`, and the browser refuses it
(`non-JavaScript MIME type text/html`). Dev fails the same way from
`/node_modules/.vite/deps/`.

The escape hatch is public API: `setWorkerUrl(url)` (exported from `maplibre-gl`,
see `maplibre-gl.d.ts`). Point it at a worker chunk Vite itself emits.

`maplibre-gl-worker.mjs` is **not** self-contained — it starts with
`import ... from "./maplibre-gl-shared.mjs"` — so copying that one file with
`?url` is not enough. It must go through Vite's worker bundling
(`?worker&url`), which pulls the shared chunk in.

v6 also drops the default export (the d.ts ends with a named-export list only),
so the four call sites need `import * as maplibregl from 'maplibre-gl'`.

## Scope

**In scope** (the only files to modify):
- `web/package.json`, `web/package-lock.json`
- `web/vite.config.ts`
- `web/src/widgets/map/SpotMap.tsx`, `HeroMapCanvas.tsx`, `GuideRouteMap.tsx`
- `web/src/features/add-spot/LocationPicker.tsx` — import-form change only; these
  three siblings cannot compile after the bump otherwise
- one new helper: `web/src/widgets/map/maplibreWorker.ts` (+ its worker entry)
- `plans/026-maplibre-v6-worker-bundling.md`
- `docs/adr/0003-maplibre-gl-pinned-to-v5.md` — add a `## Superseded` note at the
  top only. Do not rewrite its history.

**Out of scope**: everything else. Specifically `api/`, `plans/README.md`,
`.claude/`, other plan files, map behaviour/styling/clustering, new dependencies
(no copy plugins), and weakening any check to make it pass.

## Steps

### Step 1: Baseline

```
cd web && npm audit; npm run lint && npm run test && npm run build
```

**Verify**: audit reports exactly the one `maplibre-gl` critical; lint/test/build
exit 0. If audit is already clean, STOP — plan obsolete.

### Step 2: Bump

```
cd web && npm install maplibre-gl@^6
```

**Verify**: `grep '"maplibre-gl"' package.json` shows `^6`; `npm audit` → 0
vulnerabilities.

### Step 3: Fix the import form

In the four call sites, `import maplibregl from 'maplibre-gl'` →
`import * as maplibregl from 'maplibre-gl'`. Change nothing else.

**Verify**: `npm run build` — only remaining errors, if any, are the narrowed
map-event types; fix those mechanically at the call site.

### Step 4: Emit the worker through Vite and point the library at it

Add a worker entry that re-exports the library's worker, and a helper that
registers its emitted URL before any map is constructed:

```ts
// web/src/widgets/map/maplibre.worker.ts
import 'maplibre-gl/dist/maplibre-gl-worker.mjs'
```

```ts
// web/src/widgets/map/maplibreWorker.ts
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from './maplibre.worker?worker&url'
setWorkerUrl(workerUrl)
```

Import `./maplibreWorker` (side-effect import) at the top of each of the four map
components. Add to `vite.config.ts`:

```ts
worker: { format: 'es' },
```

— required because maplibre constructs the worker with `{ type: 'module' }`; an
IIFE worker chunk that splits would use `importScripts` and fail there.

**Verify**: `npm run build`, then
`ls web/dist/assets | grep -i worker` → at least one emitted worker chunk.

### Step 5: Prove it renders — production bundle

```
cd web && npm run build && npx vite preview --port 4173
```

Open `http://localhost:4173/` in a browser (Browser pane tools; do not delegate
this to a human).

**Verify, all four**:
1. Tiles render on the explore/home map — not a blank or grey canvas.
2. Spot markers/pins appear.
3. Console has no errors (in particular no `Failed to load module script`).
4. Network shows no 404 for any `*worker*` request, and the worker chunk request
   returns 200 with a JavaScript MIME type.

### Step 6: Prove it renders — dev server

```
cd web && npm run dev
```

Repeat the same four checks. Dev and build resolve workers differently; ADR 0003's
failure appeared in both, so both must be checked.

## Test plan

No new automated test. There is no browser-rendering harness in this repo (that is
plan 021), and adding one is not this plan's job — which is exactly why steps 5 and
6 are mandatory and are the acceptance evidence.

- `web/src/widgets/map/buildStyle.test.ts` must still pass unchanged.
- `npm run test` count must not drop; no test removed, skipped, or loosened.

## Done criteria

All must hold:

- [ ] `cd web && npm audit` → 0 vulnerabilities
- [ ] `cd web && npm run lint && npm run test && npm run build` → all exit 0
- [ ] `grep '"maplibre-gl"' web/package.json` shows `^6`
- [ ] `ls web/dist/assets | grep -i worker` → non-empty
- [ ] Step 5 (preview) recorded: tiles ✓, markers ✓, no console errors, no worker 404
- [ ] Step 6 (dev) recorded: same four
- [ ] `docs/adr/0003-*.md` carries a `## Superseded` note, history intact
- [ ] `git status --porcelain` lists no file outside the in-scope list

## STOP conditions

Stop and report — do not improvise — if:

- The worker chunk still cannot be bundled after a genuine attempt. Report exactly
  what was tried and the console/network evidence. **Do not leave a blank map
  behind a green suite**, and do not revert to v5 silently.
- Fixing the bump requires rewriting the clustering/marker logic in `SpotMap.tsx`.
- Any verification fails twice after a reasonable fix attempt.
- You are tempted to add a dependency (a static-copy plugin), to weaken a check, or
  to run `npm audit fix --force`.
