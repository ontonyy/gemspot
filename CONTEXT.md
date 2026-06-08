# GemSpot — Context Glossary

```yaml
Working location:
  repo: gemspot
  base_branch: master
  branch: BP-NA-gemspot-fe-explore-slice
  worktree: /Users/ontony/.claude/worktrees/gemspot-fe-explore-slice
  last_commit: 3d63c99 (P2.3 — backend live on Render)
  status: P2-DONE — backend live https://gemspot-api.onrender.com (health/places/categories verified); frontend seam flip (VITE_API_URL secret) + admin password = user TODO
  updated: 2026-06-04
```

## Build progress (per-block durable handoff — compact facts only)
- **Block 1 (scaffold+tokens)** — DONE.
  - Worktree created at `/Users/ontony/.claude/worktrees/gemspot-fe-explore-slice` (branch off master; master lacks design_handoff/CONTEXT — those are untracked in main repo, read from main repo path `/Users/ontony/Desktop/archivarius/codes/gemspot/design_handoff_field_guide/field/fg.css`).
  - Vite+React+TS app in `web/`. Deps installed: react-router-dom, @tanstack/react-query, zustand, maplibre-gl, supercluster, @fontsource/{bricolage-grotesque,hanken-grotesk,space-mono}.
  - FSD dirs: `web/src/{app,pages,widgets,features,entities,shared}`.
  - Tokens ported verbatim → `web/src/shared/styles/tokens.css` (all fg.css :root OKLCH + global resets + .mono/.kicker). Added `--c-tennis: oklch(66% 0.145 128)` (green-yellow) + `--c-padel: oklch(62% 0.125 195)` (teal).
  - Fonts self-hosted via `web/src/shared/styles/fonts.ts`.
  - `web/src/pages/TokenProbe.tsx` renders 7 category swatches + neutrals + semantic + 3 font samples; wired in `main.tsx`. Removed default App/index.css.
  - Result: `npm run build` clean; `npm run dev` boots 200 on :5173.
  - Next: Block 2 — app shell (top bar + routing + query/zustand providers).
- **Block 2 (shell+atoms+cards)** — DONE.
  - CSS port → `web/src/shared/styles/atoms.css` (shell/top-bar/buttons/avatar/chips(keys)/tags/stamp/photo/card/toast + responsive `@media(max-width:980px)` topbar 60→56px, hides nav+brand-sub). Wired in `main.tsx` after tokens.css.
  - Atoms `web/src/shared/ui/`: `Icon.tsx` (full `Ic` set + Icon), `Button.tsx` (outline/solid/lg/block), `Chip.tsx` (category glyph-circle + [data-on]; "All" mono variant; added `.fg-key-glyph` to atoms.css — fg only had dot, instruction wanted glyph circle), `Tag.tsx`, `SaveButton.tsx` (fg-stamp, --stamp accent), `Avatar.tsx`, `Toast.tsx`.
  - `web/src/app/AppShell.tsx` — top bar (brand/nav/search/add/avatar) + body slot.
  - Entity `web/src/entities/place/`: `categories.tsx` (CategoryId type, FG_CATS 7 incl new tennis=racket+padel=perforated-racket glyphs, FG_CAT, catColor, CategoryGlyph), `Photo.tsx` (riso placeholder), `model.ts` (PlaceCard type ~PlaceCardDto), `SpecimenCard.tsx`, `mockPlaces.ts` (10 specimens, ported FG_PLACES card subset + swapped 2 entries to tennis/padel).
  - Demo `web/src/pages/ShellDemo.tsx` — shell + legend chip row + static card grid; wired in main.tsx (replaced TokenProbe render). TokenProbe file kept.
  - Result: `npm run build` clean (tsc+vite, 282ms).
  - Next: Block 3 — Explore split (rail + map + markers/clustering + distance + location states).
- **Block 3 (data+stores+geo)** — DONE.
  - DTO contract `web/src/shared/api/types.ts`: `CategoryDto`, `PlaceCardDto`, `PlaceDetailDto` (mirror docs/05; no `rating`). Deviation: `lat/lng` added to `PlaceCardDto` (map markers need coords on list rows).
  - Mock seam `web/src/shared/api/placesApi.ts`: `interface PlacesApi` + `mockPlacesApi` (async, ~180ms delay) + `placesApi` swap-point alias. Internal `RAW` dataset = ported FG_PLACES (10 spots) w/ real-ish Tallinn lat/lng + x/y canvas % + detail fields (note/by/verified/views/shares/isFree); entries 05/08 are tennis(Kadriorg)/padel(Pirita) to exercise 7-cat taxonomy. Methods: `getPlaces({cat?})`, `getPlace(slug)`, `getCategories()`. Maps→`appleMapsUrl`/`googleMapsUrl` built from coords.
  - Query hooks `web/src/shared/api/queries.ts`: `queryClient` (staleTime 60s, no refetch-on-focus) + `usePlaces(cat?)`/`usePlace(slug|null, enabled)`/`useCategories(staleTime∞)` + `placeKeys`. Wired `QueryClientProvider` in `main.tsx`.
  - Geo math `web/src/shared/lib/geo.ts`: `haversineKm`, `roundKm`, `TALLINN_CENTER (59.437,24.745)`, `OUT_OF_REGION_KM=30`, `LatLng`. Unit test `geo.test.ts` (vitest, 5 tests PASS).
  - Zustand stores `web/src/shared/store/`: `savedStore` (id Set, persist localStorage `gemspot.saved`, `toggle`/`isSaved`), `toastStore` (single msg, auto-dismiss 2.2s), `detailStore` (open slug|null), `geoStore` (status idle|locating|real|curated; `request()` uses Geolocation+Permissions API; denied/unsupported/timeout→Tallinn center + `isCurated`; origin always usable).
  - Derived list `web/src/features/explore/useExploreList.ts`: usePlaces → annotate distanceKm+isSaved+outOfRegion from geo origin → filter(cat+text query over name/area/tags) → sort by distance. Returns `{...query, items}`.
  - Added `vitest` dev dep + `npm test` script.
  - Result: `npm run build` clean (645ms); `npm test` 5/5 PASS. 3 geo states reachable (real/curated via denied/curated via unsupported).
  - Next: Block 4 — Explore split UI (rail + MapLibre map + markers/clustering + location-state banner; consume useExploreList/usePlace/geoStore/detailStore).
- **Block 4 (maplibre + openfreemap + markers)** — DONE.
  - Basemap style `web/public/map-style.json`: hand-built openmaptiles style on OpenFreeMap source (`vector url https://tiles.openfreemap.org/planet`, glyphs `…/fonts/{fontstack}/{range}.pbf`, no key). Layers recolored to fg monochrome — paper bg #f1f5f2, water #d7e0e2, parks #e2ebe3, roads white #fff + casing #ced9d6, buildings faint, place/poi labels de-emphasized (ink-2/ink-3, uppercased, muted). fg OKLCH tokens converted to sRGB hex (MapLibre color parser has NO oklch). No basemap color = taxonomy; category color lives only in markers.
  - `web/src/widgets/map/SpotMap.tsx` (MapLibre GL): mounts style, center TALLINN_CENTER, zoom 12.4, minZoom 10, maxBounds [[24.55,59.36],[24.95,59.5]]. GeoJSON source `spots` cluster:true (clusterRadius 52, clusterMaxZoom 15). Hybrid marker render = HTML `maplibregl.Marker` overlays driven by `querySourceFeatures` on every render/move/data event; React roots cached per marker id, re-rendered only when visual-state key changes.
    - Unclustered = fg pin (`.fg-pin` disc 30/glyph16 default · 42/glyph22 selected + name tag · `[data-saved]` --stamp pip · hover lift), anchor:'bottom'. Reuses `CategoryGlyph`/`catColor`.
    - Clusters = fg count-pill (NEW `.fg-cluster` CSS added to atoms.css — fg.css never shipped one; built to docs/01 §4: white pill · ≤3 colour dots · mono count · `[data-active]` flips to ink). dots+active computed via `getClusterLeaves` (async). Cluster click → `getClusterExpansionZoom` → easeTo. Popover-at-maxzoom deferred to Block 5.
    - ResizeObserver → `map.resize()` (host mounts before flex layout settles its height; maplibre only auto-tracks window resize).
  - Demo `web/src/pages/MapDemo.tsx` — AppShell + full-bleed SpotMap fed by `useExploreList()`; requests geo on mount. Wired in main.tsx (replaced ShellDemo render; ShellDemo file kept).
  - `web/public/map-style.json` deps `maplibre-gl/dist/maplibre-gl.css` imported in widget.
  - Result: `npm run build` clean (tsc+vite 1.15s; only maplibre chunk-size >500kB warning). Live-render verify via Claude Preview hampered by hidden-tab RAF/timer throttle (map only paints/fetches tiles while rendering); force-pumped repaint in-page confirmed styleLoaded=true + 2031 rendered basemap features (tiles+recolor working) + tiles reachable. Markers path follows proven querySourceFeatures recipe.
  - Note: `.claude/launch.json` created in MAIN repo root (preview server config pointing at worktree web/) — untracked helper.
  - Next: Block 5 — Explore split UI (rail + map side-by-side + location-state banner + hover/select sync rail↔map + popover-at-maxzoom; consume useExploreList/usePlace/geoStore/detailStore).
- **Block 5 (explore split — desktop + mobile, URL-driven)** — DONE.
  - Router: React Router data router `web/src/app/router.tsx` (`createBrowserRouter`): `/`→redirect `/explore`, `/explore`→`Explore`, `*`→`/explore`. Wired `RouterProvider` in `main.tsx` (replaced MapDemo render; MapDemo file kept).
  - `web/src/pages/Explore.tsx` orchestrator: cat filter is **URL-driven** via `useSearchParams` `?cat=` (single-select, validated against `FG_CAT`; `setCat` uses `{replace:true}`, clears `selected`). Search query lives in NEW `web/src/shared/store/uiStore.ts` (top-bar input ↔ list, ephemeral/not in URL). Geo requested on mount; desktop shows curated banner when `isCurated && status!=='locating'`. Holds `hover`+`selected` slugs; map highlight = `selected ?? hover`. Desktop vs mobile via NEW `web/src/shared/lib/useViewport.ts` `useIsMobile()` (<980px, resize listener).
  - Explore feature parts in `web/src/features/explore/`: `Legend.tsx` (Chip row, All+7, single-select, `compact` for mobile), `RailCard.tsx` (slug-keyed ExploreCard row, derives №NN from list index, slug-based hover/select), `RailList.tsx` (shared cards/skeleton/empty; save toggle→savedStore+toast), `RailStates.tsx` (`SkeletonList` + `EmptyState` w/ searching vs filter copy), `DesktopExplore.tsx` (rail: legend+geo banner+rail-head "N spots nearby"+Near sort+scrolling list · map `fg-mapwrap` fills rest), `MobileExplore.tsx` (full-bleed map + floating `fg-m-keys` chip row + draggable `fg-sheet` peek128/half50%/full90% via Pointer events w/ snap-to-nearest + `fg-mobnav` Explore/Saved/Add/Guides/You).
  - `AppShell.tsx`: now renders `<Toast>` from toastStore; search wired via `query`/`onQuery` props (Explore passes uiStore).
  - CSS: ported explore/map-chrome/states/mobile from fg.css into `atoms.css` (explore split, rail/legend/rail-head/sort, **fg-pin set + fg-me + fg-mapctl + fg-mapstamp — were missing, needed even for Block 4 markers**, empty/skel/maploading, mobile sheet/m-keys/mobnav). Added NEW `fg-geobanner` (curated notice) + `fg-sheet[data-dragging]` (kills transition mid-drag). Mobile media block: `html,body,#root{height:100dvh}` for 100dvh; `fg-explore-m` height:100%.
  - Result: `npm run build` clean (tsc+vite 1.47s; only maplibre chunk>500kB warning). Live preview verified: desktop@1280 = rail 432px + map + legend + geo banner + 10 cards; filter chip→URL `?cat=basketball` + rail-head + list update; card select sets active accent. Mobile@390 = 8 chips + sheet + 5-item bottom nav; sheet pointer-drag half→full snap confirmed. Map tiles/markers blank in preview = known Block-4 hidden-tab RAF throttle (not a regression).
  - Next: Block 6 — Spot detail panel (`usePlace`/`detailStore`; desktop slide-over + mobile full-bleed; wire card/pin open→detail).
- **Block 6 (spot detail + verify — Explore slice complete)** — DONE.
  - `web/src/features/place-detail/SpotDetail.tsx`: ported fg-app.jsx Detail. Hero (FgPhoto tinted, glyph off, "PHOTO n/3" label) + 3 clickable dots + back/share `fg-iconbtn` + `fg-detail-cattag` (category-colored). Body: Specimen №NN · Tallinn (uses `p.id`), name, loc (area · distance · saves), byline `@contributor` + `fg-verified` badge, field note, 3-cell `fg-facts` (Access/Lit/Best from new `fieldNotes`), Sightings strip (2 FgPhoto). Sticky `fg-detail-bar`: Save (toggles savedStore + toast, `data-saved`→stamp) + **Directions deep-link menu** (NEW `fg-dir` popover: Apple/Google `<a>` from `appleMapsUrl`/`googleMapsUrl`; fg shipped a single button). Distance computed in-panel via geoStore origin + haversine (detail DTO carries no distance). Loading skeleton (`DetailSkeleton`, fg-skel rhythm) while `usePlace` pending. `mobile` prop → full-screen overlay (position absolute, z45).
  - **URL-driven**: NEW route `/spot/:slug` → renders `Explore` (panel over explore; full page on cold load since Explore mounts behind). `Explore.tsx`: reads `useParams().slug` = detailSlug; `openSpot(slug)` = navigate `/spot/:slug?<search>`; `closeSpot` = navigate `/explore?<search>`. Card/pin click now `onSelect=openSpot` (was local `selected` state — removed; map highlight = `detailSlug ?? hover`). detailStore left unused (URL is the source of truth).
  - Wiring: `DesktopExplore` renders `<SpotDetail>` inside `.fg-explore` (overlays rail, 432px). `MobileExplore` renders `<SpotDetail mobile>` inside `.fg-m-stage` (full-screen). Both take `detailSlug`/`onCloseDetail`.
  - DTO: added `fieldNotes{access,lit,best}` to `PlaceDetailDto` + RAW rows (`access/lit/best` per spot; access = Free/Paid/Booking) + `toDetail` mapping.
  - CSS: ported fg.css detail block into `atoms.css` (fg-detail/hero/iconbtn/cattag/dots/body/no/loc/byline/verified/note/notes-h/facts/fact/strip/savebar) + NEW `fg-dir`/`fg-dir-scrim`/`fg-dir-menu`/`fg-dir-item` (directions popover) + `fg-detail-hero-skel`.
  - Files added: `features/place-detail/SpotDetail.tsx`. Modified: `types.ts`, `placesApi.ts`, `app/router.tsx`, `pages/Explore.tsx`, `features/explore/{DesktopExplore,MobileExplore}.tsx`, `shared/styles/atoms.css`.
  - Result: `npm run build` clean (tsc+vite 1.22s; only maplibre chunk>500kB warning). Live preview verified: mobile@375 full-screen detail (hero/cattag/dots/specimen no/name/loc/byline+verified/note/Field-notes table/Sightings/Save→Collected/Directions) matches prototype screenshot; desktop@1280 detail panel (432px) slides over rail with map beside; Directions menu deep-links Apple+Google; save toggles. Map tiles blank in preview = known Block-4 hidden-tab RAF throttle (not regression).
  - **Explore vertical slice COMPLETE.** Deferred (not started): Add-a-spot flow, Home/Guides/Saved pages, account menu, backend (Node/Prisma/Postgres). Account avatar + top-nav Saved/Guides + mobile Add/Guides/You are static stubs.
  - Next: Block 7 — GitHub Pages deploy + versioning (tag v0.1.0).

## Versioning

- **Scheme**: SemVer, major = milestone. `v0.x` = Explore slice (mock data, GH Pages). `v1.x` = accounts + add-spot + real backend. `v2.x` = admin + analytics + SEO + monetization.
- **History of working builds** = git tags (`git tag v0.1.0`), one per known-good deployable point. Roll back = checkout/redeploy tag.
- `web/CHANGELOG.md`, Keep-a-Changelog format. One entry per tag.
- In-app version: Vite `define` `__APP_VERSION__` from `package.json` version → shown in footer/top bar.
- GH Action deploys on push to `master` (latest) AND on tag `v*` (pinned release).
- First tag after Block 7 = `v0.1.0`.

## Block 7 — GitHub Pages deploy + versioning (PLAN, not yet done)

LOCKED: host repo = `ontonyy/gemspot` (project page) · base `/gemspot/` · URL https://ontonyy.github.io/gemspot/ · **HashRouter** · no custom domain.

- **7.1 Vite config for Pages.**
  - `vite.config.ts`: `base: '/gemspot/'`.
  - `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`; declare in `vite-env.d.ts`.
  - Set `web/package.json` `version` = `0.1.0`.
- **7.2 SPA routing on Pages.**
  - Swap `createBrowserRouter` → `createHashRouter` in `app/router.tsx`. (Hash chosen → NO 404.html shim needed.)
  - Show `__APP_VERSION__` in footer/top bar.
  - Note: GH Action must build only `web/` (repo master also holds empiregranit.ee content — keep separate; Pages artifact = `web/dist` only).
- **7.3 Deploy workflow + release.**
  - `.github/workflows/deploy.yml`: triggers `push: master` + `push: tags v*`; steps = checkout, setup-node, `cd web && npm ci && npm run build`, `actions/upload-pages-artifact` (`web/dist`), `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`. Enable Pages = GitHub Actions source.
  - `web/CHANGELOG.md` `## [0.1.0]` entry (Explore + Spot detail, mock data, MapLibre/OpenFreeMap).
  - Tag: `git tag v0.1.0 && git push --tags`.
  - Verify live URL: Explore + filter + detail + Directions; map tiles load (real HTTPS, no RAF throttle). Geolocation prompts (HTTPS ok).
- **Stop:** live GH Pages URL shows working Explore slice; `v0.1.0` tagged.

## Blocks 8–12 — finish stub features (`v0.2.0`, DONE 2026-06-03)
- **Block 8 (nav)** — DONE. `AppShell` self-navigates via `useNavigate`/`useLocation` (active highlight); `MobileNav` gated by `useIsMobile`; `accountOpen` added to `uiStore`. Routes `/explore /spot/:slug /saved /guides /guides/:id /add` in `app/router.tsx`.
- **Blocks 9–10 (guides)** — DONE. Guides derived from the place set (no CMS) in `placesApi.ts` — `buildGuides()` = one guide per category with ≥2 spots + a "Free to play" cross-cut. New API `getGuides()`/`getGuide(id)`; hooks `useGuides`/`useGuide`. `Guides.tsx` (card grid, cover glyph+accent from `coverCategory`) + `GuideDetail.tsx` (reuses Explore RailCard by annotating guide slugs against the live list, preserves curated order). Guide-card CSS in atoms.css (layout-only, existing tokens). Deleted stale Block-4 demo pages `MapDemo.tsx`/`ShellDemo.tsx`.
- **Blocks 11–12 (account menu + submissions surface)** — DONE. `features/account/AccountMenu.tsx`, rendered by AppShell when `uiStore.accountOpen`. Items: profile head, **My submissions** (count badge; toggles inline list of session PENDING spots from `submissionsStore` — name + `FG_CAT[id].label` · status · submittedAt), **Saved** shortcut → `/saved` (count badge), disabled **Sign in** placeholder. Scrim + Esc close. Opened by desktop avatar (`toggleAccount`) + mobile "You" (`openAccount`). Round-trip confirmed: `AddSpot` → `submissionsStore.add` → AccountMenu reads `items`. `.fg-acct*` CSS already in atoms.css; only inline layout styles added. (Note: `Category.label`, not `name`; no `CATEGORIES` export.)
- **Block 13 (search)** — works as designed, no code. Top bar writes `uiStore.searchQuery` → `Explore` reads it via `useExploreList({query})` → filters the Explore rail only (name/area/tags). No global search requested.
- **Map base-path fix** — `SpotMap` style path changed `/map-style.json` → `` `${import.meta.env.BASE_URL}map-style.json` `` (leading-slash 404'd under `/gemspot/` on GH Pages = blank live map). Rule: any public-asset path must use `import.meta.env.BASE_URL`.

## P1 — Map blank (markers never rendered) — DONE 2026-06-04
- **Root cause: NOT deploy/CDN/CSS.** OpenFreeMap (planet/fonts/tiles) all 200; `.fg-mapcanvas`/`.fg-mapwrap` heights fine; style path already `BASE_URL`-relative; basemap rendered. The genuine bug = pins/clusters never appeared (always blamed on preview RAF throttle; never actually verified rendering since Block 4). Two compounding defects in `widgets/map/SpotMap.tsx`:
  1. **Stale `once('idle')` wiped data.** Items effect on first (empty) render took the `else map.once('idle', apply)` branch capturing `items=[]`; when the query resolved, the immediate `apply(10)` ran, then the queued empty-closure idle fired and `setData([])` — leaving the source permanently empty. Fix: `itemsRef` (updated every render) + single `pushData()` reading `itemsRef.current`; called from the `load` handler (after addSource) and the `[items]` effect. No stale closures, no `once('idle')`.
  2. **GeoJSON source never tiled.** MapLibre only builds tiles for a source consumed by ≥1 style layer. Markers are HTML `Marker` overlays driven by `querySourceFeatures(SOURCE)` with NO GL layer on `spots` → tiles never generated → `querySourceFeatures` always `[]` → 0 markers. Fix: add inert `spots-probe` circle layer (`circle-radius:0`, `circle-opacity:0`) right after `addSource`, purely to force tiling. **Rule: any HTML-marker-over-GeoJSON pattern needs a (possibly invisible) layer on that source.**
- **Verified** (mock seam, tab foregrounded): basemap (Tallinn/districts/fg monochrome) + 10 spots = 5 pins + 1 cluster, correct taxonomy colors. `npm run build` + `npm test` (5/5) green.
- **Preview caveats observed**: (a) `.env.local` sets `VITE_API_URL=http://localhost:4000` → dev uses HTTP seam → empty list when backend down (live CI leaves it unset → mock). (b) Preview tab runs `document.hidden=true` → maplibre RAF throttle stalls `'load'` → 10s timeout fires `fg-maperr` box; only foreground (or right after a screenshot) loads cleanly. Neither affects live HTTPS. (c) `/` now renders `Home.tsx` landing (untracked) instead of redirect to `/explore`.

## P2 — Deploy backend (MVP gate) · Block P2.1 (backend tests) — DONE 2026-06-04
- **Decision**: host = **Render** (Web Service + managed Postgres), per `docs/mvp-backend-plan-webapp-claude.md`. Sequence = tests first, then deploy prep.
- **Test stack**: Jest + ts-jest (added devDeps `jest@^29`/`ts-jest@^29`/`@types/jest@^29`). `backend/jest.config.js` (preset ts-jest, node env, `roots: test/`, `*.spec.ts`). `package.json` `test` script = `jest` (was echo stub) + `test:watch`. Tests live in `backend/test/` — excluded from `nest build` (tsconfig `include: src/**`), so dist stays clean.
- **Approach = pure unit tests with a mocked Prisma — NO Postgres needed**, so `npm test` is green in CI without a DB. `test/prisma-mock.ts` = typed `jest.fn()` stub per model + `$transaction` that runs the callback with the same mock (so `tx.place.create` ↔ `prisma.place.create`).
- **Coverage (33 tests, 5 suites, all green)**:
  - `auth.service.spec.ts` — register conflict + email lowercase/trim + bcrypt hash (never plaintext) + token issue; login unknown/wrong-pw/valid; refresh garbage/wrong-typ(access-as-refresh)/rotate; me missing/ok. Uses a real `JwtService` (service passes secrets explicitly).
  - `saved.service.spec.ts` — list in place-sort order; add known/unknown(no upsert); **merge** valid+skip-unknown+skip-dupes + empty no-op; remove.
  - `submissions.service.spec.ts` — create PENDING w/ photos + photoCount derive + no-photo case; listMine newest-first DTO.
  - `admin.service.spec.ts` — stats aggregate; **approveSubmission** missing→404, PENDING→ACTIVE place(next padded id/sort, slug, primary category)+submission APPROVED, slug disambiguation; rejectSubmission 404+flip; setPlaceStatus 404+update; setReportStatus 404+flip+enum→front-slug map.
- **Verify**: `npx jest` 33/33 PASS; `npm run build` (nest build) green.
## Block P2.2 (Render deploy prep) — DONE 2026-06-04
- **Initial migration created** (was none → `prisma migrate deploy` would have no-op'd/failed). Generated offline (no DB) via `prisma migrate diff --from-empty --to-schema-datamodel --script` → `backend/prisma/migrations/0001_init/migration.sql` (212 lines, all enums+tables) + `migration_lock.toml` (provider postgresql). `prisma validate` green.
- **`render.yaml`** (repo root) = Blueprint: `gemspot-db` (free Postgres) + `gemspot-api` (free Node web service, `rootDir: backend`). buildCommand = `npm ci --include=dev && prisma:generate && prisma migrate deploy && db:seed && nest build`; startCommand = `npm run start`; healthCheckPath `/health`.
  - **Gotcha 1**: Render free plan has NO `preDeployCommand` (paid-only) → migrate+seed folded into buildCommand. Both idempotent (seed upserts categories/places/admin), safe to re-run per build.
  - **Gotcha 2**: `NODE_ENV=production` makes `npm ci` skip devDeps, but nest-cli/prisma/ts-node/typescript live there → `--include=dev` required or build fails.
  - **Gotcha 3**: free filesystem ephemeral → `uploads/` photos lost on redeploy (noted in render.yaml + README; move to object storage later).
  - envVars: `DATABASE_URL` fromDatabase; `NODE_ENV=production`; `CORS_ORIGIN=https://ontonyy.github.io`; `JWT_SECRET`/`JWT_REFRESH_SECRET` generateValue (stable); TTLs; `ADMIN_EMAIL` + `ADMIN_PASSWORD` (sync:false).
- **Frontend deploy already wired**: `.github/workflows/deploy.yml` passes `VITE_API_URL: ${{ secrets.VITE_API_URL }}` to the web build. No workflow change needed — user sets the repo secret to the Render API URL post-deploy, re-runs Pages, seam flips mock→real.
- **README** updated: Tests section, Render deploy steps, corrected env-var table (`JWT_SECRET` not `JWT_ACCESS_SECRET`), removed stale "auth not wired" note. `.env.example` gained ADMIN_EMAIL/ADMIN_PASSWORD.
- **Verify**: `prisma validate` green; `npx jest` 33/33; `nest build` green.
- **HANDOFF — user-only remaining steps** (need accounts/secrets I can't create): (1) Render Dashboard → New → Blueprint → this repo → set `ADMIN_PASSWORD`. (2) Copy live API URL → GitHub repo secret `VITE_API_URL` → re-run Pages deploy. (3) Acceptance check on live HTTPS: Explore+detail from API, cross-device saves (login persists), PENDING→approve→public map, `POST /events` 201.

## Block P2.3 (Render deploy — LIVE) — DONE 2026-06-04
- **Backend live: `https://gemspot-api.onrender.com`** (Render free web service `gemspot-api` srv-d8gmleegvqtc73evl9lg + free Postgres `gemspot-db`, Blueprint-managed off `master`). DB migrated (`0001_init` applied) + seeded (7 categories, 10 places, admin `admin@gemspot.ee`).
- **Verified live**: `GET /health` → `{"status":"ok"}`; `GET /categories` → 7; `GET /places` → all 10 (ids 01–10, byte-shape matches PlaceCardDto). CORS pinned to `https://ontonyy.github.io`.
- **Deploy took 5 failed builds — 4 real blockers fixed in order** (all were repo/config defects, NOT Render):
  1. **Stale lock — Node version theory (WRONG).** First failures: `npm ci` EUSAGE "package-lock out of sync, ajv@8.12.0 does not satisfy ajv@6.15.0". Pinned Node 22.13.1 (`backend/.node-version` + `NODE_VERSION` env) thinking Render's Node 24/npm 11 was stricter. **Did not fix** — same error on Node 22.13.1. (Node pin kept anyway; harmless + reproducible.)
  2. **Corrupted package-lock.** Committed lock had a malformed hybrid v2/v3 tree (inconsistent ajv 6/8 nested entries). `rm package-lock.json && npm install` regenerated clean (372 lines changed). `npm ci` passed locally but **STILL failed on Render** — the lock inconsistency is tolerated by local npm 10.9.2, rejected by Render's. 
  3. **`npm ci` → `npm install`.** Switched buildCommand `npm ci --include=dev` → `npm install --include=dev --no-audit --no-fund`. `npm install` reconciles the lock instead of hard-failing. **This cleared the install wall** — install/prisma generate/migrate deploy/seed all then passed. **Rule: for this repo's lock, use `npm install` on Render, not `npm ci`.**
  4. **`src/api/uploads/` was gitignored → never committed → `nest build` TS2307 "Cannot find module './api/uploads/uploads.module'".** Root cause: `backend/.gitignore` had unanchored `uploads/` which matched BOTH the runtime photo dir AND `src/api/uploads/`. Fixed: anchored to `/uploads/`, force-added `uploads.controller.ts` + `uploads.module.ts`. Scanned `comm -23 (find src) (git ls-files src)` → uploads was the only untracked src gap. **Rule: anchor dir-name gitignores with a leading `/` so they don't swallow same-named source dirs.**
- **Commits (on master)**: pin-node → regen-lock → npm-install → commit-uploads (3d63c99 = live). Build pipeline now: `npm install --include=dev → prisma generate → migrate deploy (idempotent) → db:seed (idempotent upserts) → nest build`.
- **STILL OPEN (user)**: (a) set `VITE_API_URL=https://gemspot-api.onrender.com` GitHub secret + re-run Pages → flips live frontend mock→real. (b) **SECURITY: admin seeded with default `admin1234`** (`ADMIN_PASSWORD` left unset) — set real password in Render env before public launch. (c) free tier cold-start ~50s after idle. (d) ephemeral FS → uploaded photos lost on redeploy (object storage later).

## Polish pass #1 (spot-detail map flyTo + isolation) — DONE 2026-06-08
- **Bug #1 (fixes/5-review.md):** opening `/spot/:slug` never moved the map. `SpotDetail` renders no map; on desktop its panel slides over the shared Explore `SpotMap`, which only re-skinned the selected pin — never `flyTo`/isolated it.
- **Fix:** `SpotMap` gains a `focusSlug?: string|null` prop, **distinct from `selectedSlug`** (which also fires on hover, so hover never moves the viewport). On change: `flyTo({center:[lng,lat],zoom:15.5,duration:700})` to the item from `itemsRef`, and dims every other pin/cluster via `data-dim` (`opacity:.35` in `atoms.css`). Focused pin stays enlarged via existing `data-sel`. The focus effect calls `updateMarkers()` first so clearing focus un-dims back to the multi-pin view.
- **Wiring:** `Explore.tsx` already threads `detailSlug` to `Desktop/MobileExplore`; both now pass it straight to `SpotMap` as `focusSlug` (no new Explore-level state). On `closeSpot` `detailSlug`→null → focus clears; viewport left in place (fitBounds-back was optional in the review, not done).
- **Unblocks:** #2 (search-jump) and #10 (open-in-full-map) reuse the same `focusSlug`→flyTo path.
- **Verify limit:** preview sandbox can't reach `tiles.openfreemap.org` (vector source + glyphs) → map hits the 10s error fallback, so flyTo/dim are unverifiable in-browser here. Route wiring confirmed (card click → `/spot/snelli-pond-tables`, detail panel mounts). `npm run build` + `npm test` (5) green. v0.2.1→0.2.2.

## Polish pass #2 (search-jump pans the map) — DONE 2026-06-08
- **Bug #2 (fixes/5-review.md):** picking a spot from the top-bar search dropdown didn't move the map. `SearchBox.jump()` only `navigate('/spot/'+slug)`.
- **Confirmed (no extra wiring):** that route renders `Explore` (`router.tsx`), `useParams().slug` → `detailSlug` → passed as `focusSlug` to `SpotMap` in both `Desktop/MobileExplore` → #1's `[focusSlug]` flyTo fires. `jump()` also clears the query, so the rail un-filters and the spot is present in `itemsRef` for the coord lookup.
- **One gap fixed:** "from any page" — a search-jump from a non-Explore page (e.g. `/guides`) cold-mounts `Explore`/`SpotMap` with `focusSlug` already set; the `[focusSlug]` effect ran before `mapRef.current` existed and never re-fires. Added an initial-focus `flyTo` in `SpotMap`'s `load` handler (reads `focusRef.current`). Surgical, no new props/state, DTO + seam untouched.
- **Verify limit:** preview sandbox can't reach `tiles.openfreemap.org` → map hits the 10s error fallback, so the fly is unverifiable in-browser here (same constraint as #1). Route/prop chain confirmed by source. `npm run build` + `npm test` (5) green. v0.2.2→0.2.3.

## Polish pass #3 (photo placeholder solid fill + big white glyph) — DONE 2026-06-08
- **Bug #3 (fixes/5-review.md):** no-photo cards/hero rendered a category-tinted `color-mix(--pc 32%, --paper)` background with a faint (`opacity:.55`) small category-colored glyph — muddy, low-contrast (no literal stripe/hatch in CSS, just the weak tint).
- **Fix:** `atoms.css` `.fg-photo` now fills solid `var(--pc)`; `.fg-photo-glyph` renders white (`color:#fff`) at full opacity, centered. `Photo` gained a `large` flag → glyph size 64 (hero) vs 26 (cards), glyph `color="#fff"`. Real-`url` branch untouched; same `CategoryGlyph`. `SpotDetail` hero passes `large`.
- **Verify:** preview confirmed — Explore cards render solid colored thumbs + centered white glyphs; `/spot/:slug` hero shows solid orange fill + big white ping-pong glyph, no stripes anywhere. `npm run build` + `npm test` (5) green. v0.2.3→0.2.4.

## Polish pass #5 (guide/saved card names wrap to 2 lines) — DONE 2026-06-08
- **Bug #5 (fixes/5-review.md):** `.fg-card-body h3` is `white-space:nowrap` + ellipsis for the 1-line rail rhythm. In the narrower `.fg-page-grid` cards (GuideDetail/Saved), long names cut ("Kadrioru tennis co…"). Actual selector is `.fg-card-body h3`, not `.fg-card h3` as the review brief stated.
- **Fix:** scoped rule `.fg-page-grid .fg-card-body h3` in `atoms.css` — `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; white-space:normal; overflow:hidden; line-height:1.2`. Rail single-line rhythm untouched (scoped, not global). CSS-only, no new tokens.
- **Verify:** preview confirmed — long name forced into a `.fg-page-grid` card wraps to exactly 2 lines (36px = 2×18), clamps cleanly, sibling cards stay top-aligned (`.fg-card align-items:start`). `npm run build` + `npm test` (5) green. v0.2.4→0.2.5.

## Polish pass #9 + #12 (copy: bookmark wording + accurate rail-head noun) — DONE 2026-06-08
- **Bug #9 (fixes/5-review.md):** Saved empty state said "Tap the **stamp** on any specimen…" but the save control is `SaveButton` — a bookmark glyph. Fix: copy → "Tap the bookmark icon on any spot to save it here. Your collection lives on this device." Added `Ic.bookmark` (matches SaveButton's inline path `M6 21V5a2 2 0 012-2h8a2 2 0 012 2v16l-6-3.6L6 21z`); empty-state mark uses it instead of `Ic.flag`. `pages/Saved.tsx`, `shared/ui/Icon.tsx`.
- **Bug #12:** rail-head read "{n} spots **nearby** · sorted by distance" even on the curated Tallinn-center default (no real GPS). Fix: noun conditional on existing `curated` boolean (`isCurated && status!=='locating'`) — "spots in view" when curated, "spots nearby" only with real GPS. DesktopExplore already had `curated`; threaded it from `Explore` into `MobileExplore` (new optional prop). `features/explore/DesktopExplore.tsx`, `MobileExplore.tsx`, `pages/Explore.tsx`.
- **Verify:** no "stamp" wording remains in UI; label = "in view" on curated default, "nearby" only with real GPS. `npm run build` + `npm test` (5) green. v0.2.5→0.2.6. Copy/icon only — no new tokens, DTO/seam intact.

## Polish pass #8 ("Near" geolocation: loading + denied states) — DONE 2026-06-08
- **Bug #8 (fixes/5-review.md):** two inconsistent "near" controls. `.fg-geobanner` ("Use my location") called `request()` and showed "Locating…" — fine. The `.fg-rail-head` "Near" sort button had **no `onClick`** — dead click. And `geoStore.request()` fell back to Tallinn on denial **silently** (no error/denied flag, no user signal).
- **Fix:** `geoStore` gained `denied: boolean` — set `true` on the `getCurrentPosition` error callback and the `geoUnsupported()` path (alongside the curated Tallinn fallback), reset `false` on locating/success. Both denial paths fire `useToastStore.getState().show(...)` with exact copy **"Location access denied — showing distances from Tallinn centre"** (toastStore already mounted in AppShell). The rail-head "Near" button in `DesktopExplore` + `MobileExplore` is wired to `onEnableLocation` (=`request()`), `disabled` while locating, label "Getting location…" when `status==='locating'` else "Near"; added `aria-label`. Threaded `onEnableLocation`/`locating` props from `Explore` into `MobileExplore` (DesktopExplore already had them). `shared/store/geoStore.ts`, `features/explore/DesktopExplore.tsx`, `MobileExplore.tsx`, `pages/Explore.tsx`.
- **Note:** `Explore` already auto-calls `request()` on mount, so the denial toast can also surface on first load (acceptable — same copy). No new tokens/colors; DTO/seam intact.
- **Verify:** `npm run build` + `npm test` (5) green. v0.2.6→0.2.7.

Local-discovery map for Tallinn. Discovery product, not navigation. React frontend + Spring/Java backend.

## Canonical sources

- **Frontend visuals**: `design_handoff_field_guide/field/fg.css` + `fg-app.jsx` ("Spotter's Field Guide" direction). Wins all visual decisions.
- **Architecture / routing / state**: `design_handoff_field_guide/docs/04`.
- **Domain / data model / API**: `design_handoff_field_guide/docs/05`.
- **Superseded for visuals**: `docs/01-03` (older "Direction C"). Disregard its rounded radius, Space Grotesk, blue accent.

## Terms

- **Spot / Place** — a discoverable location (ping-pong table, hoop, pitch, viewpoint, sakura). DB entity = `Place`; UI calls it a "spot" / "specimen".
- **Specimen** — UI/voice synonym for an approved Place, framed as a field-guide specimen (`Specimen №NN`).
- **Category** — taxonomy of a spot. Carries the only color in the UI. **7 at launch**: tabletennis, basketball, football, tennis, padel, scenic, sakura.
- **Save** — bookmark a spot. One metaphor everywhere (cards/detail/markers). No hearts, no ratings. Accent = warm `--stamp`, used ONLY for saves.
- **Submission** — a user-added spot pending moderation. Never instantly live → PENDING → admin approves → becomes a live Place.
- **Field note** — free-text description on a spot detail.
- **Stamp** — the single warm accent color; semantic = "saved/collected".

## Decisions

- 7 categories seeded at launch (fg.css ships 5 tokens; add `tennis` + `padel` in matching OKLCH).
- **This session = frontend only.** Mock data behind a typed `placesApi` seam (port `FG_PLACES`). No backend scaffold yet.
- **Backend (later session) = Node + TypeScript + Prisma + PostgreSQL on Render** (per `docs/mvp-backend-plan-webapp-claude.md`). Overrides handoff `docs/05` Spring/MySQL — user decision. DTO shapes (`PlaceCardDto`/`PlaceDetailsDto`/`CategoryDto`/`SavedPlaceDto`) still the stable contract; frontend codes to them.
- Map = **MapLibre GL + OpenFreeMap** (no key, free, self-hostable). Start from `positron` style JSON, recolor layers to fg palette, vendor the style file in repo. Risk accepted: no SLA on public CDN → self-host fallback later.
- **Frontend stack** (confirmed): React + TypeScript + Vite, React Router (data router), TanStack Query (wraps mock `placesApi`), Zustand (saved/toast/auth-stub/geo/detailId), plain CSS + CSS vars (port `fg.css` ~1:1, no UI kit), FSD structure, self-hosted fonts (Bricolage Grotesque / Hanken Grotesk / Space Mono).
- **Geolocation**: real browser Geolocation + Permissions API now (no backend). Haversine distance client-side to mock coords. Denied/unavailable → fake origin Tallinn center (59.437, 24.745) + "location off → curated" state. Out-of-region = >~30km from center.
- **Markers/clustering**: hybrid — GeoJSON source `cluster:true` (native clustering + zoom-to-bounds, popover only at max zoom) + HTML markers for individual pins and cluster count-pills (pixel-perfect fg disc/glyph/ink-stem, 4 states default/selected/saved/cluster).
- **This-session deliverable** = vertical slice through Explore: scaffold → tokens → shell → chips+cards → Explore split (map+rail+markers+clustering+distance+location states) → Spot detail panel. Deferred: Add-a-spot, Home/Guides/Saved, account menu, backend.

## Polish pass — #4 guide cover icons (v0.2.11)

- **Cross-cut guide cover icon independent of category.** Sport guides already rendered the right `CategoryGlyph`; only the "Free to play" cross-cut guide was wrong — it has no sport category, so `coverCategory` fell back to `scenic` → scenic peak glyph. Added optional `coverIcon?: string` (an `Ic` key) to `GuideDto`. `buildGuides()` sets `coverIcon: 'ticket'` on the Free guide; new `Ic.ticket` in Icon.tsx. `Guides.tsx` renders `<Icon d={Ic[coverIcon]} size={34}>` (white, via cover `color:#fff`) when `coverIcon` present + known, else `CategoryGlyph`. Sport guides keep sport glyph; Viewpoint keeps scenic glyph. DTO additive (optional field, seam intact); no new tokens/colors. Build + 5 tests green.

## Polish pass — #7 verified relative time (v0.2.10)

- **Verified badge = live relative time.** `PlaceDetailDto.verifiedAt` refined from free-text to **ISO 8601 timestamp** (contract shape unchanged, only field semantics). `SpotDetail` renders `formatDistanceToNow(new Date(p.verifiedAt), { addSuffix:true })` (new `date-fns` dep) instead of printing the raw string. Existing `{p.verifiedAt && …}` guard kept → absent timestamp = no badge. Mock `RawPlace.verified` is now optional ISO: 8 spots carry real ISO dates, Löwenruh pitch + Pirita padel club left unset to demo the hidden-badge fallback. No new tokens/colors; placesApi/authApi seam untouched. Build + 5 tests green.

## Polish pass — #10 "Open in full map" (v0.2.9)

- **Detail → full map affordance.** `SpotDetail` gains an "Open in full map →" link (`.fg-report-link` + `Ic.pin`) → `navigate('/explore?focus='+slug)`. `Explore.tsx` reads `?focus=` and computes `focusSlug = detailSlug ?? params.get('focus')`, passed as a new `focusSlug` prop through Desktop/MobileExplore into `SpotMap` (previously `focusSlug={detailSlug}` inline). Reuses Block 1's `flyTo`/dim + cold-open load handler. `focus` is one-shot: stripped from the propagated nav `search` so it never sticks to spot links. Map confirmed interactive (no `interactive:false`/`scrollZoom.disable()`). No new tokens/colors; DTO/seam untouched. Build + 5 tests green.

## Polish pass — #11 search empty state (v0.2.8)

- **Search 0-results CTA + prefill.** `SearchBox` (AppShell.tsx) empty branch: "No results for '{q}'" + "Submit this spot →" button → `navigate('/add', { state:{ name:q }})`. `jump()` extended to take optional router state. `AddSpot.tsx` reads `useLocation().state.name` into initial `name` useState. New `.fg-search-cta` CSS (display font / `--ink` / underline — no new tokens). Build + 5 tests green.
