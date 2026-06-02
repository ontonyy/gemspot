# 04 · Architecture, Routing & State

How the app shell is structured, the URL scheme (public vs authed, SEO), the client state model, and the responsive strategy. Mirrors `lib/web-app.jsx` + `lib/web-core.jsx`.

---

## App shell

```
<AppHeader>          persistent top bar (hidden on /admin)
<main>               route outlet
<MobileTabBar>       mobile only, on app routes (not landing/admin)
<AuthDialog>         global modal
<Toaster>            global
```

The **map persists** across explore ↔ saved ↔ spot detail — detail is an overlay/panel, not a new page that unmounts the map. On desktop the rail + map are one layout; the spot panel slides over the rail.

---

## Routes & URL scheme

Use a real router (React Router). Every public view is server-renderable / prerendered for SEO.

| Path | View | Auth | SEO |
|------|------|------|-----|
| `/` | Landing | public | ✅ index |
| `/explore` | Explore (map + rail) | public | ✅ index |
| `/explore?cat=scenic` | Explore filtered | public | ✅ (category landing) |
| `/spot/:slug` | Spot detail (panel over explore, or full page on cold load) | public | ✅ **per-spot indexable page** |
| `/saved` | Saved | authed | noindex |
| `/add` | Add-a-spot flow | authed | noindex |
| `/login`, `/register` | Auth (modal, or page on deep link) | public | noindex |
| `/admin` | Moderation | role=admin/moderator | noindex |
| `/about`, `/bring-gemspot-to-your-city`, `/privacy` | Marketing/legal | public | ✅ |

Rules:
- **Filters live in the URL** (`?cat=`, future `?near=`, `?q=`) — shareable, back-button works, drives both rail and map.
- **Spot detail has a canonical URL** with a slug (`patkuli-viewpoint`) → strong local SEO ("scenic viewpoints Tallinn"). Visiting cold renders the full page; navigating within explore renders the panel + pushes the URL.
- Viewing is **never** behind auth. Only `save`, `add`, `/saved`, `/admin` require a session.

### SEO specifics (public site is in MVP scope)
- SSR or static prerender for `/`, `/explore`, `/spot/:slug`, category pages.
- Per-spot `<title>`, meta description, **OpenGraph image** (hero photo), and `LocalBusiness`/`TouristAttraction` **JSON-LD** (name, geo, category, neighbourhood).
- `sitemap.xml` generated from approved places + categories. Canonical tags. `noindex` on authed/admin.
- Category pages double as curated landing pages ("Best sunset spots in Tallinn").

---

## Client state model

Prototype centralises state in `AppProvider` (`useApp`). Production: keep a thin global store (Zustand/Jotai/Context) for cross-cutting state; use the data layer (TanStack Query) for server state.

| State | Prototype | Production home |
|-------|-----------|-----------------|
| route / selected spot | `route`, `selected` | router (URL) |
| category filter | `category` | URL query param |
| auth user + role | `auth` (localStorage) | auth store + httpOnly refresh cookie |
| saved ids | `savedIds` (localStorage) | server (`/favorites`) + optimistic cache |
| login modal + queued action | `loginOpen`, `pendingAction` | auth store (`requireAuth` pattern — keep it) |
| toast | `toast` | toast store |
| location permission | `locPerm` | geo store + Permissions API |
| places (mock) | `WEB_SPOTS` | TanStack Query (`/places`) |

**`requireAuth(fn)` pattern** (worth keeping): when a guest taps Save/Add, open the auth dialog and **queue the action**; on success, resume it. Removes dead-end "please log in" friction.

**Persistence:** keep slide/scroll/route in the URL; cache auth/session via secure cookies; saved state is server-authoritative with optimistic UI.

---

## Responsive strategy

Single breakpoint at **900px** (plus 560px tweak), matching `web.css`.

| | Desktop ≥900 | Mobile <900 |
|---|---|---|
| Nav | top bar (logo, nav, search, Add, You) | minimal top bar + bottom tab bar |
| Explore | rail (416px) + persistent map | full map + collapsible bottom sheet + floating chip row |
| Spot detail | slide-in panel over rail (map stays) | full-screen |
| Add | side panel + map (click to place pin) | map (top ~38%) + panel sheet below |
| Admin | sidebar + tables + drawer | stacked; tables scroll; nav becomes a top strip |

Mobile uses `100dvh` (not `vh`) so the bottom nav isn't hidden behind mobile browser chrome. Tablet (768–899) currently resolves to the mobile layout — acceptable for MVP; a landscape-tablet "narrow desktop" split is a v2 nicety.

---

## Map integration (production)
- MapLibre GL (open) or Mapbox GL. Custom style approximating the prototype palette: land `#eef1f6`, water `#cfe0f2`, parks `#d3e7ca`, roads white with `#e0e5ee` casing, muted labels. De-emphasise default POIs and business labels.
- Bound the viewport to Tallinn; `fitBounds` on filter/cluster.
- Markers as custom symbols or HTML overlays (doc 01 §4). Cluster via the map lib's clustering; keep the count-pill visual.
- `map_opened`, `pin_clicked` analytics fire here (doc 05).
