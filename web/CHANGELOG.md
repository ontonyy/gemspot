# Changelog

All notable changes to this project are documented here.

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
