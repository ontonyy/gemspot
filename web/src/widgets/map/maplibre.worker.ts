// Worker entry so Vite emits maplibre v6's module worker (plus the shared chunk
// it imports) as a real asset. maplibre marks dist/*.mjs side-effect-free, so a
// bare `import` is tree-shaken to an empty chunk — the reference below is
// load-bearing. See plans/026-maplibre-v6-worker-bundling.md.
// @ts-expect-error - no type declarations ship for the worker entry point
import MaplibreWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs'

;(self as unknown as { MaplibreWorker?: unknown }).MaplibreWorker = MaplibreWorker
