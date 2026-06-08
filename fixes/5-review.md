# GemSpot — Claude Code Plan: Bugs · UX · Design Audit

> Built **2026-06-07** by auditing the live site `https://ontonyy.github.io/gemspot/#/explore` (v0.2.1)
> against the real `web/` source. Every item below was traced to specific files/lines, so each fix
> names exactly where to work. Scope = the 12 reported bugs/UX items + the design-audit (report-only) tasks.
> The earlier `GemSpot MVP Fix Plan (2026-06).md` covers the **backend/auth/admin** gap — keep both; this one is the polish pass.

---

## ⚠️ Read first — the live site is STALE vs the code

Several "bugs" are **already fixed in `web/src` but not deployed** (live is `v0.2.1`, the worktree is ahead):

- **#6 Specimen number** — `SpotDetail.tsx` already renders `Specimen №{p.id}` (canonical DB id), and `RailCard`/`Saved`/`GuideDetail` all pass `no={p.id}`. The sort-index bug you saw on live is gone in code.
- **#4 Guide icons** — `Guides.tsx` already uses `<CategoryGlyph cat={g.coverCategory}>`, not a fixed mountain. The "generic mountain" on live = the **`scenic` glyph used as the cover for the *Free to play* cross-cut guide** (it has no sport category), not a hardcoded icon.

**So Step 0 is: redeploy `master` and re-audit live.** Push a fresh Pages build, hard-refresh (Ctrl+Shift+R), and re-check all 12. Some will already be resolved; this plan flags those as **VERIFY** rather than **FIX** so you don't rebuild working code.

> While you're there: the live app is still on the **in-memory mock** unless the GitHub secret `VITE_API_URL` points at the live Render API. Map/detail still work on mock, but saves/auth/admin/events don't persist. That wiring is the *other* plan's Block 0 — do it too, but it's orthogonal to the items below.

---

# BUGS

## 1 · Spot detail map doesn't fly/zoom to the spot — **FIX** ⭐ highest impact
**Files:** `widgets/map/SpotMap.tsx`, `features/explore/DesktopExplore.tsx`, `pages/Explore.tsx`

**Root cause (verified):** `SpotDetail.tsx` renders **no map of its own** — on desktop the detail panel slides *over* the rail and the user keeps looking at the shared Explore `<SpotMap>` in `DesktopExplore`. That map is fed `items={s.items}` (all spots) and `selectedSlug={mapSel}`. `SpotMap` only **re-skins** the selected pin (bigger glyph + name tag via the `selectedSlug` effect) — it **never `flyTo`/`easeTo`** the coordinates and never isolates the pin. Result: open `/spot/:slug` and the viewport stays put showing every pin.

**Fix:**
1. In `SpotMap.tsx`, add a `focusSlug?: string | null` prop (or reuse `selectedSlug` when it came from a detail open). On change, look up the item's `lat/lng` from `itemsRef.current` and `map.flyTo({ center:[lng,lat], zoom: 15.5, duration: 700 })`. Guard against re-firing on hover-only selection (pass focus only from detail open, not from rail hover).
2. "Show only that spot highlighted": when a `focusSlug` is active, dim the other markers — either filter the GeoJSON `setData` to the single feature, or add `data-dim` to non-selected pins via the existing per-marker `key` and a CSS `opacity:.35`. Prefer the visual dim so the user keeps spatial context.
3. Wire it: `Explore.tsx` already knows `detailSlug`; pass it down through `DesktopExplore`/`MobileExplore` to `SpotMap` as `focusSlug`. On `closeSpot`, clear focus and `fitBounds` back to the list (or just clear focus and leave viewport).

**Acceptance:** navigating to `/spot/:slug` flies the map to that spot at street zoom with its pin enlarged + others dimmed; closing returns to the multi-pin Explore view.

## 2 · Selecting a search result doesn't pan the map — **FIX**
**Files:** `app/AppShell.tsx` (`SearchBox`), plus the #1 plumbing.

**Root cause (verified):** `SearchBox.jump()` does `navigate('/spot/'+slug)` and nothing else. The map only flies if #1's `focusSlug` flow exists. Same defect, same fix — once #1 lands, a search-jump sets `detailSlug` → `focusSlug` → `flyTo`. No extra work beyond confirming the search path also populates focus.

**Acceptance:** pick any spot from the search dropdown → map flies to it and its pin is visible/highlighted, from any page.

## 3 · Spot hero shows a diagonal hatch placeholder — **FIX**
**Files:** `entities/place/Photo.tsx`, `shared/styles/atoms.css` (`.fg-photo`, `.fg-photo-glyph`, `.fg-photo-label`)

**Root cause (verified):** `Photo.tsx` (used by both the card thumb and the detail hero) renders the no-photo state as a category-tinted **hatch/stripe** background (`.fg-photo` CSS) with a *faint* small glyph. The audit wants: **solid category accent fill + large centered category icon**, no stripes.

**Fix:** in `atoms.css`, change the `.fg-photo` placeholder to a solid `var(--pc)` (or a very subtle flat tint of it) and drop the hatch. Enlarge `.fg-photo-glyph` and render it in white/high-contrast, centered. In `Photo.tsx`, default the placeholder glyph `size` up (≈26 on cards, ≈64 on the detail hero — pass a `heroGlyph` size prop or scale by a `large` flag) and set glyph `color="#fff"`. Keep the real-`url` branch untouched. Same `CategoryGlyph` used by pins/pills/filter chips — already imported.

**Acceptance:** spots with no photo render a clean solid colored card/hero with one big centered category icon; no stripe pattern anywhere.

## 4 · Guide cards show the generic mountain icon — **MOSTLY FIX (cross-cut guides only)**
**Files:** `pages/Guides.tsx`, `shared/api/placesApi.ts` (`buildGuides`)

**Root cause (verified):** sport guides already render the correct `CategoryGlyph`. The only wrong icon is on **cross-cut guides** (e.g. *Free to play*) whose `coverCategory` falls back to `scenic` → you see the scenic peak glyph. The category-glyph system has no icon for "Free to play".

**Fix:** give guides a `coverIcon` concept independent of category. Simplest: in `buildGuides()` tag cross-cut guides with an explicit icon key (e.g. `ticket`/`check` for *Free to play*), and in `Guides.tsx` render that icon (add `Ic.ticket`/reuse `Ic.check`) when present, else fall back to `CategoryGlyph`. Sport guides keep the category glyph; *Viewpoint* legitimately uses the `scenic` glyph (binoculars-style) — confirm that reads as "views" and leave it.

**Acceptance:** every guide cover icon matches its content — *Free to play* shows a ticket/check, sport guides show their sport glyph, Viewpoint shows the scenic glyph.

## 5 · Guide spot-card names truncate with "…" — **FIX**
**Files:** `shared/styles/atoms.css` (`.fg-card h3`), affects `GuideDetail.tsx` grid (`.fg-page-grid`)

**Root cause (verified):** `RailCard` `<h3>{p.name}</h3>` is clamped to one line by `.fg-card h3` (nowrap + ellipsis). In the narrower `.fg-page-grid` cards used by GuideDetail/Saved, long names like "Kadrioru tennis co…" get cut.

**Fix:** allow two lines. In `atoms.css` set `.fg-card h3` to `display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; white-space:normal;` and bump `line-height` accordingly so the card grid stays even. Verify card min-height absorbs a 2-line title without breaking the rail single-line rhythm (if the rail must stay 1-line, scope the 2-line rule to `.fg-page-grid .fg-card h3`).

**Acceptance:** no name is ellipsis-cut in GuideDetail/Saved; long names wrap to two lines, cards stay aligned.

## 6 · "SPECIMEN №07" used sort index — **VERIFY (already canonical in code)**
**Files:** `features/place-detail/SpotDetail.tsx`, `RailCard.tsx`, `Saved.tsx`, `GuideDetail.tsx`

**Status:** code already uses the canonical DB id (`p.id`) everywhere (`Specimen №{p.id}`, `no={p.id}`). The live discrepancy is **stale deploy** (Step 0). After redeploy, confirm the same spot shows the same № on Explore, in a guide, in Saved, and on its detail page regardless of sort/filter. No code change expected — if any surface still derives № from list index, switch it to `p.id`.

**Acceptance:** one spot, one number, everywhere.

## 7 · "verified 3 days ago" is a hardcoded string — **FIX**
**Files:** `features/place-detail/SpotDetail.tsx`, `shared/api/types.ts` (`verifiedAt`), `placesApi.ts`

**Root cause (verified):** `PlaceDetailDto.verifiedAt?: string` is a free-text string and `SpotDetail` prints it raw: `verified {p.verifiedAt}`. In the current mock it isn't even set (badge hidden). If the real API sends an ISO date, it'll print the raw ISO; if it sends "3 days ago" it's static.

**Fix:** make `verifiedAt` an **ISO timestamp** in the DTO + mock, add `date-fns`, and render `formatDistanceToNow(new Date(p.verifiedAt), { addSuffix:true })`. Keep the existing `{p.verifiedAt && …}` guard so **no timestamp = no badge** (the audit's fallback). Backend should serve a real `verifiedAt`; until then the mock can set a few real ISO dates so the relative formatting is demonstrable.

**Acceptance:** the verified badge shows a live-computed relative time from a real timestamp, and disappears entirely when the field is null.

---

# UX IMPROVEMENTS

## 8 · "NEAR" should trigger geolocation with loading + denied states — **FIX**
**Files:** `features/explore/DesktopExplore.tsx`, `shared/store/geoStore.ts`, `MobileExplore.tsx`

**Root cause (verified):** there are two "near" controls and they're inconsistent:
- the **`.fg-geobanner`** ("Use my location") *does* call `request()` → `getCurrentPosition` and shows "Locating…" — good.
- the **`.fg-rail-head` "Near" sort button has no `onClick`** — it's a dead button.
- `geoStore.request()` on denial **silently** falls back to Tallinn center with **no user-facing error**; the store exposes no error/denied flag.

**Fix:**
1. Add a `permission`/`error` surface to `geoStore`: on the `getCurrentPosition` error callback set a `denied: true` (or `error: 'denied'`) field in addition to the curated fallback.
2. Wire the rail-head **"Near"** button to `request()` (or remove it if the banner is the canonical control — don't ship a dead button). Show "Getting location…" while `status==='locating'`.
3. On denial, show the inline message **"Location access denied — showing distances from Tallinn centre"** (toast via `toastStore`, or inline under the banner) and reset the button to its idle label.

**Acceptance:** clicking Near with location off prompts the browser, shows a loading label, and on denial shows the exact copy above and resets — never a dead click.

## 9 · Saved empty-state copy mentions a "stamp" — **FIX (one line)**
**File:** `pages/Saved.tsx`

**Root cause (verified):** empty state reads *"Tap the stamp on any specimen to save it here."* The actual control is `SaveButton` — a **bookmark icon**.

**Fix:** change to **"Tap the bookmark icon on any spot to save it here. Your collection lives on this device."** (Optional: also swap the empty-state mark `Ic.flag` for the bookmark glyph so the icon matches the words.)

**Acceptance:** copy names the bookmark icon; no "stamp" wording in user-facing UI.

## 10 · Make the spot-detail map interactive + "Open in full map" — **FIX**
**Files:** `features/place-detail/SpotDetail.tsx`, `pages/Explore.tsx`, `widgets/map/SpotMap.tsx`

**Context:** on desktop the "detail map" is the shared, already-interactive Explore `SpotMap` behind the panel — so once **#1** lands it flies + isolates the spot and is pannable/zoomable. The missing piece is an explicit **"Open in full map"** affordance and (on mobile, where the detail is full-screen with no map) a static-feeling experience.

**Fix:**
1. Add an **"Open in full map →"** button in `SpotDetail` (near Directions or the hero) that does `navigate('/explore?focus='+slug)` (or pushes `focusSlug` state) so Explore opens centered/zoomed on this spot. `Explore.tsx` reads `?focus=` on mount → sets the map `focusSlug` → `flyTo` (reuses #1).
2. Ensure the detail-context map allows zoom/pan (the Explore map already does; just confirm no `interactive:false` / `scrollZoom.disable()` was added anywhere).

**Acceptance:** from a spot detail you can open the full map already centered on that spot; the map is pan/zoom interactive.

## 11 · Search 0-results needs a friendly empty state + "Submit this spot" — **FIX**
**Files:** `app/AppShell.tsx` (`SearchBox`), `pages/AddSpot.tsx`

**Root cause (verified):** `SearchBox` already shows `Nothing matches "{q}"` when `!hasHits`, but there's **no CTA** and no prefill path.

**Fix:** in the empty branch, render the query-aware line **"No results for '[query]'"** plus a link **"Submit this spot →"** that navigates to `/add` and **pre-fills the name field** with the query — pass it via router state (`navigate('/add', { state:{ name:q }})`) or `?name=`, and have `AddSpot.tsx` read it into the name input's initial value.

**Acceptance:** a no-match search shows the friendly line + working "Submit this spot →" that lands on `/add` with the name pre-filled.

## 12 · "X spots nearby" is inaccurate — **FIX (copy, conditional)**
**File:** `features/explore/DesktopExplore.tsx` (`.fg-rail-head`), mirror in `MobileExplore.tsx` if shown there.

**Root cause (verified):** rail-head reads `{items.length} spots nearby · sorted by distance`, but by default geo is **curated** (Tallinn center, `isCurated:true`) — distances aren't true GPS proximity. "Nearby" is misleading.

**Fix:** make the noun reflect geo status — use **"spots in view"** (or "spots in Tallinn") when `geoStatus !== 'real'`, and only say **"nearby"** when real GPS is active (`status==='real'`). `Explore` already has `geoStatus`; thread a boolean into `DesktopExplore`.

**Acceptance:** label says "in view" on the curated default and only "nearby" once the user's real location is in use.

---

# DESIGN AUDIT — findings only (do not auto-fix)

> Reported per the brief. Each is a finding + where to look; hold for a follow-up pass.

### Category color system consistency
- **Two sources of truth exist.** UI color comes from CSS OKLCH tokens `--c-*` in `tokens.css` (used by chips, markers, guide covers via `--cc`, hero via `--pc`, search icons — all through `catColor()`), **but** `CategoryDto.color` in `types.ts` is a **separate hex** the API serves, and the MapLibre basemap/style uses **hand-converted sRGB hex** (MapLibre can't parse OKLCH). Risk: the API hex and the CSS OKLCH can drift and **no single test pins them equal.** Recommend: make the OKLCH tokens canonical, derive the DTO hex from them, and document the mapping.
- All 7 categories *are* defined once each in `tokens.css` (`tabletennis/basketball/football/tennis/padel/scenic/sakura`) and consumed via `catColor`, so within-CSS usage is consistent. The gap is **CSS-token ↔ API-hex ↔ map-style-hex** alignment.

### Typography scale
- Tokens define 3 families (Bricolage display / Hanken UI / Space Mono data) and one `.kicker` (10.5px, 0.14em, uppercase). Heading sizes are **set ad hoc per surface** (`.fg-detail h1`, `.fg-page-h h1`, `.fg-card h3`, etc.) rather than from a shared scale — audit `atoms.css` for h1/h3/label sizes across Explore / Spot detail / Guides / Saved and confirm they match a defined ramp. Likely minor inconsistencies between the detail `h1` and page `h1`.

### Sidebar spacing/padding
- Check `.fg-card`, `.fg-rail-head`, `.fg-legend`, `.fg-geobanner` vertical paddings in `atoms.css` for equal rhythm — the geo banner and rail-head were added at different times and may not share the rail's list-item padding. Compare against the `GemSpot Field Guide.html` reference spacing.

### Mobile breakpoints (375 / 768 / 1024)
- `useIsMobile()` flips at **<980px**, so 768 = mobile (sheet + bottom nav), 1024 = desktop split. Test: (a) 375 — bottom sheet drag snap, 8-chip legend overflow, detail full-screen; (b) 768 — same mobile layout, check the map sheet doesn't clip; (c) 1024 — rail 432px + map, confirm the detail panel (432px) doesn't crowd the map. List any overflow/clipping found.

### Accessibility
- **Contrast:** `--c-tabletennis` = `oklch(69% 0.155 66)` (light orange). As the **"PING PONG" label text on white `--paper`** this almost certainly **fails WCAG AA (4.5:1)** — flag for darkening the *text* token (keep the marker fill bright; use a darker variant for small text on paper). Re-check all category label texts the same way.
- **ARIA:** back/share buttons in `SpotDetail` have `aria-label`; `Avatar` has one. **Verify** `SaveButton` (bookmark), the rail-head "Near"/"Sort" buttons, cluster pills, and the directions toggle expose accessible names — several icon-only controls likely lack labels.
- **Alt text:** `Photo` sets `alt={label ?? ''}` — real photos get empty alt when no label is passed; ensure meaningful alt (spot name) on actual imagery.

---

## Suggested order
**Step 0 (redeploy + re-audit)** → **#1 (map flyTo)** unlocks #2 & #10 → **#3 (hero)** → **#5 (truncation)** → **#9/#12 (copy)** → **#8 (geo states)** → **#11 (search empty)** → **#7 (verifiedAt)** → **#4 (guide icons)** → **#6 (verify)**. Do the design-audit pass last as its own ticket.

## Constraints (hold every fix)
- fg.css visuals only — **no new fonts/colors**; category color is the only taxonomy color, `--stamp` is save-only.
- Keep the **DTO contract** (`shared/api/types.ts`) and the `placesApi`/`authApi` **seam** intact.
- HashRouter + `base:'/gemspot/'`; public assets via `import.meta.env.BASE_URL`.
- After each item: `npm run build` + `npm test` green, append a `CONTEXT.md` block, add a `CHANGELOG.md` line, bump `web/package.json`.
