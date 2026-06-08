# GemSpot — AI context (project-wide)

- **Type**: ai-context (durable, stable facts only).
- **Scope**: WHOLE project current state — not a single session.
- **Date**: 2026-06-07.
- **Source of truth = repo. Revalidate before trusting.** Notes/chat may lag code
  (e.g. CONTEXT.md referenced commit 3d63c99 while HEAD was a5fed56).

## Project shape

- **Frontend** (`web/`): React 19 + Vite 8 + TS, FSD layers
  (`app / pages / widgets / features / entities / shared`). React Router 7
  **HashRouter**, base `/gemspot/`. TanStack Query, Zustand stores. MapLibre GL +
  OpenFreeMap (vendored `public/map-style.json`, no key). Plain CSS ported from
  `design_handoff_field_guide/field/fg.css` (no UI kit). Self-hosted fonts.
  Deploy: GitHub Pages `https://ontonyy.github.io/gemspot/` via
  `.github/workflows/deploy.yml` (push master + tags `v*`; artifact = `web/dist`).
  Version `0.2.1`.
- **Backend** (`backend/`): NestJS 10 + Prisma 5 + Postgres, layers
  `api / application / domain / infra / contracts`. Deploy: Render Blueprint
  (`render.yaml`, root `render.yaml`) — free web `gemspot-api` + free Postgres
  `gemspot-db`. Target URL `https://gemspot-api.onrender.com`. Version `0.1.0`.
- **Seam** (mock ↔ http): `shared/api/{placesApi,authApi}.ts`. HTTP client when
  `VITE_API_URL` set, else in-memory mock — zero call-site change to flip.
  placesApi adds **graceful mock-fallback**: READ paths fall back to the mock
  dataset on network error / 5xx (warns once). `shared/api/warmup.ts` fires
  `GET /health` on boot to wake the sleeping free dyno (no-op on mock).
- **DTO contract** (the stable boundary): `web/src/shared/api/types.ts`. Backend
  conforms to these shapes byte-for-byte; never redesign frontend to match backend.
- **Design constraints (hard)**: fg.css visuals only (no new colors/fonts);
  category color = the ONLY taxonomy color; `--stamp` warm accent = save-only;
  HashRouter + base `/gemspot/`; public-asset paths must use
  `import.meta.env.BASE_URL` (leading `/` 404s under the Pages base).

## Root cause / central problem

Not feature-writing — **reliable wiring of two loops**: mock↔HTTP seam, graceful
degradation when the API is down, Render free-tier cold start (~50s), and
unverifiable manual ops (deploy, secrets, admin password, OAuth client id).

## Feature/block status

- DONE: Explore (map+cluster+rail+filter), category+Free filters, spot detail +
  directions deep-links, share, report, save/collection (+server merge), add-spot
  (PENDING submission), guides (derived, no CMS), account menu, email auth UI,
  admin panel (role-gated), Field Guide landing + hero map, mobile sheet/nav,
  seam + graceful fallback + warmup. Backend: all REST routes + Prisma schema +
  migrations + seed. Jest suite.
- PARTIAL / NOT CONFIGURED: Google OAuth — code complete (verify via
  `oauth2.googleapis.com/tokeninfo`, checks `aud` + `email_verified`, links by
  email, OAuth-only users have null passwordHash) but `GOOGLE_CLIENT_ID` (backend)
  + `VITE_GOOGLE_CLIENT_ID` (web) UNSET → disabled.
- UNVERIFIED (manual/external): live Render deploy status; `VITE_API_URL` secret +
  Pages re-run (live frontend mock→real flip); `ADMIN_PASSWORD` value.
- NOT DONE: object storage for photos (uploads on ephemeral FS); i18n; PWA; push;
  JS code-split (bundle 1.44 MB).

## Backend routes

health `GET /health` · places `GET /places`,`/places/:slug` · categories `GET` ·
guides `GET /guides`,`/guides/:id` · saved `GET/POST /saved`,`POST /saved/merge`,
`DELETE /saved/:placeId` · submissions `POST`,`GET /mine` · reports `POST`,`GET /mine` ·
uploads `POST` · events `POST` · auth `register/login/refresh/oauth/google/logout`,
`GET /me` · admin (role-gated) events/stats/submissions(+approve/reject)/places(+status)/
reports(+status)/users.

## Schema (Prisma / Postgres)

Models: User, Profile, Category, Place, PlaceCategory, PlacePhoto, SavedPlace,
Submission, SubmissionPhoto, Report, Event. Enums: UserRole, PlaceStatus,
SubmissionStatus, ReportStatus, ReportReason. Migrations `0001_init`,
`0002_user_oauth`. Schema change in 0002: `User.passwordHash` nullable + added
`provider`/`providerId` (nullable) + `@@unique([provider, providerId])`.
`Place.id` = zero-padded string `"01".."10"` (matches mock DTO ids).
Seed: 7 categories, 10 Tallinn places, admin user.

## Verification (evidence: direct repo run, 2026-06-07)

- web `npm run build` — PASS (tsc+vite ~1.5s; only maplibre >500kB chunk warning).
- web `npm test` (vitest) — PASS 5/5.
- backend `npm test` (jest, mocked Prisma, no DB) — PASS 38/38, 5 suites.
- Live deploy / secrets / external accounts — NOT verifiable from repo.

## Residual risk / next

1. Flip live frontend: set repo secret `VITE_API_URL` → re-run Pages (no code change).
2. SECURITY: set real `ADMIN_PASSWORD` in Render (else seeded `admin1234`).
3. Configure Google OAuth: set `GOOGLE_CLIENT_ID` + `VITE_GOOGLE_CLIENT_ID`.
4. Cold start ~50s (warmup mitigates, not eliminates).
5. Object storage for uploads before real photos.

## Hard constraints to carry forward

- DTO shapes (`web/src/shared/api/types.ts`) are the contract — backend conforms.
- fg.css visual rules; category-only color; `--stamp` = save-only.
- HashRouter + base `/gemspot/`; asset paths via `import.meta.env.BASE_URL`.
- Render free: build uses `npm install` (NOT `npm ci` — lock ajv 6/8 drift);
  `--include=dev` (NODE_ENV=production skips build tools otherwise); migrate+seed
  folded into buildCommand (no preDeployCommand on free); idempotent seed upserts.
- Anchor dir-name gitignores with leading `/` (unanchored `uploads/` once swallowed
  `src/api/uploads/`).
