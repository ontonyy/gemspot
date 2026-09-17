# 3. Pin maplibre-gl to v5 until the v6 worker is bundled

Date: 2026-09-17


## Superseded

Superseded on 2026-09-17 by `plans/026-maplibre-v6-worker-bundling.md`, which
bundles the v6 module worker through Vite (`?worker&url` + `setWorkerUrl()`) and
verifies the map renders in both `vite preview` and dev. `maplibre-gl` is now on
`^6`; the advisory below is closed. The record below is kept unchanged — its
lesson (a green lint/test/build does not prove a map change works) still stands.

## Status

Accepted

## Context

`npm audit` reports a critical advisory against `maplibre-gl@5` (sanitizer bypass). The published fix is `maplibre-gl@6`, so the obvious action is to take the major bump.

The bump was attempted. It type-compiles after three mechanical edits — v6 drops the default export, so `import maplibregl from 'maplibre-gl'` becomes `import * as maplibregl`, and the error-event type narrows. `npm run lint`, `npm run test` and `npm run build` all pass on v6.

Every automated check passes and the map is still broken. In both dev and a production build, the explore map renders a blank canvas: zero markers, no tile requests. v6 is no longer self-contained — it loads `./maplibre-gl-worker.mjs` as a module worker via `import.meta.url`. Vite emits no such chunk (`dist/assets` contains no worker file), the request falls through to `index.html`, and the console reports `Failed to load module script: non-JavaScript MIME type text/html`.

The remaining nine advisories in the same audit are unrelated to this and clear under a plain `npm audit fix` with no source change and no `package.json` edit.

## Decision

Pin `maplibre-gl` at `^5.24.0` and take the other nine advisory fixes separately.

Clearing the maplibre critical requires `vite.config.ts` build plumbing to emit the v6 worker chunk and point the library at it. That is a build-configuration change with its own failure modes, and it is not a dependency bump — it gets its own plan and its own review, not a line in an advisory sweep.

## Consequences

- `npm audit --audit-level=high` exits non-zero on this repository until the worker plumbing lands. Any CI gate that fails the build on audit output must account for this one known entry, or it will be disabled the first time it fires.
- The sanitizer-bypass advisory stays open. It is reachable only through map content the application itself supplies, which is why accepting it for now is tolerable — that is a bounded exposure, not a clean bill of health.
- The general lesson, which is the reason this is an ADR and not a comment: **a green lint/test/build on this project does not prove a map change works.** There is no automated coverage that renders tiles. A maplibre change needs a visual check, and "all checks pass" is not a substitute.

