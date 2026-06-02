# 06 · Implementation Plan

Phased build order with effort tags and a prototype → production file map. Goal: ship a usable, measurable Tallinn MVP fast, then layer growth/monetisation.

Effort key: 🟢 easy · 🟡 medium · 🔴 hard.

---

## Phase 0 — Foundations (1 sprint)
- 🟢 Vite + React + TS app skeleton (FSD structure, doc 04).
- 🟢 Port `web.css` `:root` tokens → CSS variables / TS token file (doc 01).
- 🟢 Port `shared/ui` atoms: Button, Chip, Tag, CatBadge, SaveButton, Photo, Avatar, Input, Toast.
- 🟢 Port `GemMarker` / `GemGlyph` as components; keep the 4 states.
- 🟡 Spring Boot skeleton + MySQL + Spring Data JPA + Flyway initial migration (doc 05 schema).
- 🟡 Auth module: email login (`admin/admin` seed) + Spring Security JWT access/refresh; `GET /auth/me`.
- 🟢 Seed categories + ~30 places (reuse `GEM_SPOTS` as Flyway seed data).

## Phase 1 — Public discovery (core value, 1–2 sprints)
- 🔴 `<SpotMap>` on MapLibre/Mapbox with custom style + custom markers + clustering (doc 01 §4, doc 04).
- 🟡 Explore split: `<CategoryFilter>` + rail `<SpotListItem>` + map; URL-driven filters; distance sort.
- 🟡 `<SpotDetail>` panel + `/spot/:slug` full page; Directions handoff menu.
- 🟢 Landing page; 🟡 SEO (SSR/prerender, JSON-LD, sitemap, OG images) for `/`, `/explore`, `/spot/:slug`, category pages.
- 🟢 `places` + `categories` API (Spring `@RestController`); `PlaceCardDto`/`PlaceDetailDto`.
- 🟡 Loading + empty + error states for map/rail/detail (doc 02).
- **Exit check:** a guest can browse, filter, open a spot, and get directions — fully public, indexable.

## Phase 2 — Accounts & contribution (1–2 sprints)
- 🟡 `<AuthDialog>`: social OAuth (Google/Facebook/Instagram) + email register; `requireAuth` queue-and-resume.
- 🟢 Favorites: save/unsave (optimistic) + `<SavedPage>` as a filtered map view; inline remove + undo.
- 🔴 `<AddSpotFlow>`: 4-step stepper, **click-map-to-place pin**, photo upload (`files`), validation, submit → **pending** confirmation.
- 🟢 `submissions` + `favorites` + `files` API (Spring services + JPA repositories).
- 🟡 Location permission flow (Permissions API) + denied/out-of-region fallbacks.
- 🟢 Reports ("inaccurate / gone") from detail.
- **Exit check:** a member can save, add a spot (goes to pending), and report.

## Phase 3 — Operations & moderation (1 sprint)
- 🟡 `<AdminModeration>`: queue table + review drawer + approve/reject; duplicate-suspect flag; place table.
- 🟢 `moderation` API + `ModerationAction` audit log; approve creates/publishes the Place (transactional service).
- 🟡 Analytics events wired across the app (doc 05) + admin dashboard KPIs (pending, top categories, view→save/share, approval rate, freshness).
- **Exit check:** submissions flow end-to-end (user submits → admin approves → appears live); behaviour is measurable.

## Phase 4 — Public beta / growth (post-MVP)
- Collections / curated guides (schema reserved) + category landing pages as growth surfaces.
- "Verified recently" freshness automation; share-link OG polish.
- Sponsored spots / featured collections / business profiles (monetisation — B2B/local promotion, **not** banner ads).
- Later: ratings & reviews, social layer, TikTok/Reels embedding, personalised ranking, more cities.

---

## Prototype → production map

| Prototype file | Becomes | Phase |
|---|---|---|
| `web.css` `:root` | token file + global styles | 0 |
| `web-core.jsx` atoms | `shared/ui/*` | 0 |
| `markers.jsx`, `ui.jsx` glyphs/icons | `entities/place/marker`, `shared/ui/icon` | 0 |
| `web-core.jsx` `AppProvider/useApp` | auth store + TanStack Query + router | 0–1 |
| `web-map.jsx` `WebMap` | `widgets/map/SpotMap` (real map lib) | 1 |
| `web-landing.jsx` | `pages/Landing` (+ SEO) | 1 |
| `web-explore.jsx` | `features/explore`, `entities/place`, `features/place-detail` | 1 |
| `map.jsx` `GEM_SPOTS` | DB seed (Flyway) | 0 |
| `web-flows.jsx` auth | `features/auth/AuthDialog` | 2 |
| `web-flows.jsx` saved | `pages/Saved` | 2 |
| `web-flows.jsx` add | `features/submission/AddSpotFlow` | 2 |
| `web-flows.jsx` states | `shared/ui/EmptyState`, `features/geo` | 1–2 |
| `web-admin.jsx` | `pages/admin/Moderation` | 3 |
| `web-app.jsx` shell | `app/` shell + router | 0–1 |

---

## Risk / effort notes
- **Hardest:** the custom map style + branded markers + clustering at multiple zooms (Phase 1) and the add-a-spot pin-placement + upload flow (Phase 2). Budget accordingly.
- **Cheapest wins:** tokens, atoms, landing, favorites — they port almost directly from the prototype.
- **Don't gold-plate:** tablet-specific layout, dark mode, collections, ratings — all explicitly deferred. Keep MVP to the 3 phases above.
