# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- **Render deploy prep (P2.2).** Initial Prisma migration (`backend/prisma/migrations/0001_init`, generated offline via `migrate diff`); `render.yaml` Blueprint provisioning free Postgres + NestJS web service (build runs migrate deploy + idempotent seed; `--include=dev` so build tools survive `NODE_ENV=production`; `/health` check; CORS pinned to GitHub Pages; generated JWT secrets). Frontend `deploy.yml` already passes the `VITE_API_URL` secret, so flipping the seam mock→real needs only the secret set post-deploy. README + `.env.example` updated.
- **Backend tests (P2.1).** Jest + ts-jest unit suite over service business logic with a mocked Prisma (no Postgres → CI-green): auth (register/login/refresh/me, bcrypt-never-plaintext), saved (list order, save, **merge** valid/skip-unknown/skip-dupe/empty, remove), submissions (create PENDING + photoCount derive, listMine), admin moderation flips (approve PENDING→ACTIVE place + slug disambiguation, reject, place/report status, 404 paths), relative-time. 33 tests, all green; `backend npm test` now runs `jest` (was an echo stub).

### Fixed
- **Map blank (P1, critical).** Spot pins/clusters never rendered on `/explore` or `/spot/:slug`. Two root causes, both in `widgets/map/SpotMap.tsx`, previously misattributed to the preview hidden-tab RAF throttle:
  1. **Stale `once('idle')` closure wiped the source.** The initial `items=[]` render registered `map.once('idle', apply)` capturing empty items; it fired *after* the populated `setData(10)` and reset the GeoJSON source to empty. Replaced with an `itemsRef` + a single `pushData()` that always reads the latest items, called from the `load` handler and the items effect — no stale closures.
  2. **GeoJSON source was never tiled.** MapLibre only generates tiles for a source referenced by ≥1 layer. Pins/clusters render as HTML `Marker` overlays driven by `querySourceFeatures`, with no GL layer on the source → tiles never built → `querySourceFeatures` always returned `[]` → zero markers. Added an inert `spots-probe` circle layer (radius/opacity 0) to force tiling.
- Verified live-style (mock seam): basemap renders (Tallinn, districts, fg monochrome) and 10 spots render as 5 pins + 1 cluster with correct taxonomy colors. Existing WebGL-detect / 10s-timeout / `fg-maperr` Retry fallback unchanged.

## [0.2.0] - 2026-06-03

### Added
- Self-navigating AppShell top-nav (Explore/Saved/Guides/Add) + mobile bottom nav, active highlight via `useLocation`.
- Routes `/saved`, `/guides`, `/guides/:id`, `/add`.
- Guides: derived from the place set (no CMS) — one guide per category with ≥2 spots plus a "Free to play" cross-cut; `getGuides()`/`getGuide(id)` API + `useGuides`/`useGuide` hooks; Guides grid + GuideDetail (reuses Explore RailCard, preserves curated order).
- Add-a-spot flow → `submissionsStore` (session PENDING submissions).
- Account menu (avatar/"You"): profile stub, My submissions (PENDING list + count badge), Saved shortcut, disabled "Sign in" placeholder; scrim + Esc close.
- Saved page.

### Fixed
- Live map blank under base `/gemspot/`: `SpotMap` now loads `${import.meta.env.BASE_URL}map-style.json` instead of a leading-slash path (404 on GitHub Pages).

### Removed
- Stale Block-4 demo pages `MapDemo.tsx` / `ShellDemo.tsx`.

## [0.1.0] - 2026-06-02

### Added
- Explore page: category filter (`?cat=`), list/rail, place detail panel (`/spot/:slug`).
- MapLibre map with supercluster clustering and geolocation.
- GitHub Pages deploy: `base: '/gemspot/'`, HashRouter, build-time `__APP_VERSION__`.
- CI: build `web/` and deploy to GitHub Pages on push to `master` and `v*` tags.
