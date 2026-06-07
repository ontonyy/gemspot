# GemSpot — Project Status

> Spotter's Field Guide to Tallinn. Map-first UGC app: discover/save/submit outdoor spots
> (ping-pong, hoops, football, tennis, padel, viewpoints, sakura).
> Stack: React + Vite (FSD, HashRouter, base `/gemspot/`) → GitHub Pages · NestJS + Prisma + Postgres → Render.
> Last updated: 2026-06-04 · web `v0.2.0` · backend LIVE `https://gemspot-api.onrender.com`.

---

## TL;DR

- **Frontend: done.** Full app on mock seam → GitHub Pages. All 14 review items addressed (1 optional skipped earlier, now solid thumbnails shipped).
- **Backend: LIVE on Render.** `https://gemspot-api.onrender.com` — health/categories/places verified, DB migrated + seeded (7 cats, 10 places). NestJS + Prisma + free Postgres, Blueprint-managed off `master` (`render.yaml`).
- **Backend now has tests** — Jest unit suite, 33 tests, mocked Prisma (auth/saved-merge/submissions/admin moderation/relative-time).
- **Live site STILL on mock data until secret set** — set GitHub secret `VITE_API_URL=https://gemspot-api.onrender.com` + re-run Pages → seam flips mock→real (zero code change). Then run acceptance tests.
- **Gaps:** admin seeded with default password (`ADMIN_PASSWORD` unset) — set real one before launch; version/CHANGELOG at `0.2.0`; free tier cold-start ~50s; uploads on ephemeral FS.

---

## Frontend — DONE

Path: `web/`. FSD layers: `app / pages / widgets / features / entities / shared`.

| Area | State | Where |
|---|---|---|
| Explore (map + clustering + rail + filter) | ✅ | `features/explore/*`, `widgets/map/SpotMap.tsx` |
| Category filter + Free filter (`?cat=`,`?free=1`) | ✅ | `features/explore/Legend.tsx`, `useExploreList.ts` |
| Spot detail panel + directions deep-links | ✅ | `features/place-detail/SpotDetail.tsx` |
| Share (navigator.share → clipboard → toast) | ✅ | `SpotDetail.tsx` `onShare` |
| Report-a-problem (modal → mock/HTTP seam → Account) | ✅ | `features/report/*`, `reportsStore` |
| Save / collection (localStorage; server-merge on login) | ✅ | `shared/store/savedStore.ts` |
| Add-a-spot (category required, no "All", no photo field) | ✅ | `pages/AddSpot.tsx` |
| Guides (derived collections) | ✅ | `pages/Guides.tsx`, `GuideDetail.tsx` |
| Account menu (submissions, saved, Sign in→login) | ✅ | `features/account/AccountMenu.tsx` |
| Auth UI (guest default, email login) | ✅ | `authStore`, `shared/api/authApi.ts` |
| Admin panel (moderation/dashboard/places/users) | ✅ | `features/admin/*` (role-gated) |
| Analytics `track()` events | ✅ | wired to call sites → `events` API |
| Mobile (bottom sheet, mobile nav) | ✅ | `MobileExplore.tsx`, `widgets/nav/MobileNav.tsx` |
| Stable specimen numbering (`№{id}` list=detail) | ✅ | `RailList/Saved/GuideDetail` |

**Seam:** `shared/api/{placesApi,authApi,adminApi}.ts` pick HTTP client when `VITE_API_URL` set, else mock. Zero call-site changes to flip. DTO contract `shared/api/types.ts` is the stable boundary.

**Constraints held:** fg.css visuals only (no new colors/fonts); category color = only taxonomy color; `--stamp` = save-only; HashRouter + base `/gemspot/`.

---

## Backend — LIVE on Render

Path: `backend/`. NestJS, layered `api / application / domain / infra / contracts`. Prisma + Postgres.
Live at `https://gemspot-api.onrender.com` (Blueprint `render.yaml`, free web + free Postgres).
Endpoints conform to frontend DTO shapes (do not change shapes).

Modules + routes:
- `health` — `GET /health`
- `places` — `GET /places`, `GET /places/:slug`
- `categories` — `GET /categories`
- `guides` — `GET /guides`, `GET /guides/:id`
- `saved` — `GET /saved`, `POST /saved`, `POST /saved/merge`, `DELETE /saved/:placeId`
- `submissions` — `POST /submissions`, `GET /submissions/mine`
- `reports` — `POST /reports`, `GET /reports/mine`
- `uploads` — `POST /uploads` (photo multipart)
- `auth` — `register / login / refresh / logout`, `GET /auth/me` (JWT access+refresh)
- `admin` (role-gated) — `events`, `stats`, submissions queue + approve/reject, places + status patch, reports + status patch, users
- `events` — `POST /events` (analytics ingest)

Prisma schema: users, profiles, places, categories, place_categories, saved_places, submissions, submission_photos, reports + enums `UserRole`, `PlaceStatus`. Seed loads the 10 Tallinn spots from `web` `RAW[]`.

Env (Render): `DATABASE_URL` (fromDatabase), `PORT` (injected), `NODE_ENV=production`, `JWT_SECRET`/`JWT_REFRESH_SECRET` (generated) + TTLs, `CORS_ORIGIN=https://ontonyy.github.io`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (sync:false — currently UNSET → default `admin1234`). Build = `npm install --include=dev → prisma generate → migrate deploy → db:seed → nest build`. **Use `npm install`, not `npm ci`** (lock tree drift Render rejects). Deploy notes: CONTEXT.md Block P2.3.

---

## What's needed next (to ship real MVP)

1. **Flip live frontend to real API.** ✅ backend deployed. REMAINING: set GitHub repo secret `VITE_API_URL=https://gemspot-api.onrender.com` → re-run Pages workflow → seam flips mock→real (zero code change). Then verify live: Explore from API, login persists cross-device, approve PENDING → live map, `POST /events` 201.
2. **SECURITY: set admin password.** Admin seeded with default `admin1234` (`ADMIN_PASSWORD` unset). Set a real value in Render env before public launch (redeploys + re-seeds).
3. ~~**Backend tests.**~~ ✅ DONE — Jest, 33 tests (auth/saved-merge/submissions/admin moderation/relative-time), mocked Prisma.
4. **Version + CHANGELOG.** Bump `web/package.json` past `0.2.0`; log CW/C/D/E/F entries. Tag release.
5. **Avatar + verifiedAt** — derive avatar from auth user (hardcoded `"M"`); `verifiedAt` → real timestamp + relative format once API serves real dates.
6. **`TokenProbe.tsx`** dev page — remove or route-gate before launch.

---

## What can be added later (backlog)

- More base filters (outdoor/quiet/lit/access) — data fields exist, UI is single-axis + Free.
- Real place photos pipeline (object storage already stubbed via `uploads`); detail hero still placeholder when no photos.
- Landing/home screen (currently `/` → `/explore`; map-first is acceptable — decide explicitly).
- Collections as CMS (guides are derived today, no editing).
- Push/email on submission approval; rate-limit + spam guard on UGC.
- i18n (ET/EN/RU), PWA/offline, social-login.
- Analytics dashboard depth (funnels, retention) once events accumulate.

---

## Gotchas (carry forward)

- **Public-asset paths must use `import.meta.env.BASE_URL`**, never leading `/` (GH Pages base `/gemspot/` → 404 otherwise). Bit the map style once.
- **`.claude/launch.json` `web` cwd must point at the worktree you actually edit** — else preview serves stale code (green build but old UI).
- **DTO shapes (`web/src/shared/api/types.ts`) are the contract** — backend conforms; do not redesign frontend to match backend.
