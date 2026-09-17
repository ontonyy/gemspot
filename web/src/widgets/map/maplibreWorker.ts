// maplibre-gl v6 derives its worker URL from its own import.meta.url, which no
// bundler emits; the request 404s to index.html and the map renders blank.
// Point it at the chunk Vite emits instead. Side-effect import — pull this in
// before constructing a Map. See plans/026-maplibre-v6-worker-bundling.md.
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from './maplibre.worker?worker&url'

setWorkerUrl(workerUrl)
