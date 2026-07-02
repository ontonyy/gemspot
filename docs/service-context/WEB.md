# Web frontend

React 19 + Vite + TypeScript SPA in `web/`, feature-sliced design. Consumes the API DTO
contract. Built static, deployed to Firebase Hosting.

<!-- service-context:auto:start -->

## Layout (feature-sliced)

`app/` (router + AppShell) · `features/` (auth, explore, place-detail, add-spot, account) ·
`shared/` (api, store, lib, ui, styles) · `pages/` · `widgets/` (map, nav) · `entities/` (place).

## API seam (`web/src/shared/api`)

- Mock vs real swap on `VITE_API_URL` (unset → in-memory mock; set → HTTP clients).
- `httpPlacesApi.ts` does **401 → refresh → retry-once** via `useAuthStore.refreshSession()`;
  concurrent refreshes deduped; refresh failure clears session.
- Bearer token from `authApi.ts`.

## Routes (`web/src/app/router.tsx`, hash router)

`/`, `/explore`, `/spot/:slug`, `/saved`, `/guides`, `/guides/:id`, `/add` (auth-gated),
`/auth`, `/account`, `/account/verify-email`, `/admin/*` (ADMIN-gated), `*` → `/explore`.

## State (zustand, `web/src/shared/store`)

| Store | Persistence |
|-------|-------------|
| authStore | localStorage `gemspot.auth` (tokens — see OBSERVABILITY trade-off) |
| savedStore | localStorage `gemspot.saved` |
| submissions / reports / geo / ui / toast | in-memory |

TanStack Query (`shared/api/queries.ts`): 60s staleTime, no refetch-on-focus, 1 retry.

## Map (`web/src/widgets/map/SpotMap.tsx`)

maplibre-gl + native GeoJSON clustering. Tallinn bounds lock. Provider seam:
`openfreemap` (default) / `maptiler` / `selfhosted`.

## Env var NAMES (VITE_*)

`VITE_API_URL`, `VITE_MAPTILER_KEY`, `VITE_MAP_PROVIDER`, `VITE_MAP_STYLE`,
`VITE_SELFHOST_TILES`, `VITE_SELFHOST_GLYPHS`, `VITE_GOOGLE_CLIENT_ID`,
`VITE_FACEBOOK_APP_ID`.

## Build / deploy

`npm run build` (`tsc -b && vite build`) → `web/dist` → Firebase Hosting (site `gemspot`,
SPA rewrite). See [RUNBOOK.md](RUNBOOK.md).

**Confidence**: HIGH (source grep-verified at `aad27f1`).

<!-- service-context:auto:end -->
