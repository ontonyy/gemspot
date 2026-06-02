# Changelog

All notable changes to this project are documented here.

## [0.1.0] - 2026-06-02

### Added
- Explore page: category filter (`?cat=`), list/rail, place detail panel (`/spot/:slug`).
- MapLibre map with supercluster clustering and geolocation.
- GitHub Pages deploy: `base: '/gemspot/'`, HashRouter, build-time `__APP_VERSION__`.
- CI: build `web/` and deploy to GitHub Pages on push to `master` and `v*` tags.
