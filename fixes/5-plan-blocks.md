# GemSpot — Fix Session Blocks (from `fixes/5-review.md`)

> Copy ONE block into a fresh Claude Code session. Each block is self-contained:
> context refresh → scope → root cause → fix → acceptance → verify → writeback.
> Source of truth = [`fixes/5-review.md`](5-review.md). Do blocks in the order below.
> Repo: `/Users/ontony/Desktop/archivarius/codes/gemspot` (web app in `web/`).

---

## Shared preamble (every block already embeds this — shown here once)

```
Run /context-refresher and /karpathy-guidelines first.
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot — frontend in web/.
Read fixes/5-review.md for full context. Use code-review-graph MCP tools
(semantic_search_nodes, query_graph, get_impact_radius) BEFORE Grep/Read.

GLOBAL CONSTRAINTS (hold on every fix):
- fg.css visuals only — NO new fonts/colors. Category color is the only
  taxonomy color; --stamp is save-only.
- Keep DTO contract (web/src/shared/api/types.ts) and placesApi/authApi seam intact.
- HashRouter + base:'/gemspot/'; public assets via import.meta.env.BASE_URL.
- AFTER the fix: `npm run build` + `npm test` green, append a CONTEXT.md block,
  add a CHANGELOG.md line, bump web/package.json version.
- Surgical changes only. Confirm assumptions. State acceptance proof.
```

---

## BLOCK 0 — Redeploy + re-audit (DO FIRST)

```
/context-refresher then read fixes/5-review.md "Read first" section.

TASK: Live site (ontonyy.github.io/gemspot v0.2.1) is STALE vs web/src. Several
"bugs" already fixed in code, not deployed.
1. Push a fresh GitHub Pages build of master. Hard-refresh (Ctrl+Shift+R).
2. Re-audit all 12 items live. Mark each FIXED / still-broken.
3. Confirm GitHub secret VITE_API_URL points at live Render API (else app runs
   in-memory mock — saves/auth/admin/events don't persist). Wiring is the OTHER
   plan's Block 0; note status, don't block on it.
OUTPUT: updated status list of all 12 items so later blocks skip resolved ones.
```

---

## BLOCK 1 — Spot detail map flyTo + isolate ⭐ (unlocks #2, #10)

```
[Shared preamble] BUG #1 in fixes/5-review.md.
Files: web/src/widgets/map/SpotMap.tsx, web/src/features/explore/DesktopExplore.tsx,
web/src/pages/Explore.tsx (+ MobileExplore.tsx).

ROOT CAUSE: SpotDetail renders no map; desktop detail panel slides OVER the shared
Explore <SpotMap>. SpotMap only re-skins the selected pin via selectedSlug — never
flyTo/easeTo the coords, never isolates it. Opening /spot/:slug leaves viewport put.

FIX:
1. SpotMap.tsx: add focusSlug?: string|null prop. On change, look up item lat/lng
   from itemsRef.current and map.flyTo({center:[lng,lat], zoom:15.5, duration:700}).
   Guard against re-firing on hover-only selection (focus only from detail open).
2. Isolate: when focusSlug active, dim other markers (CSS opacity:.35 via per-marker
   key + data-dim) — keep spatial context. Enlarge focused pin.
3. Wire: Explore.tsx knows detailSlug; pass through Desktop/MobileExplore to SpotMap
   as focusSlug. On closeSpot clear focus (+ optional fitBounds back to list).

ACCEPTANCE: /spot/:slug flies map to spot at street zoom, pin enlarged, others dimmed;
closing returns to multi-pin view. Verify in preview.
```

---

## BLOCK 2 — Search result pans the map

```
[Shared preamble] BUG #2. DEPENDS ON BLOCK 1.
Files: web/src/app/AppShell.tsx (SearchBox) + #1 plumbing.

ROOT CAUSE: SearchBox.jump() only navigate('/spot/'+slug). Map flies only if #1's
focusSlug flow exists.

FIX: Once #1 landed, confirm search-jump sets detailSlug → focusSlug → flyTo. No
extra work beyond confirming search path populates focus.

ACCEPTANCE: pick any spot from search dropdown → map flies to it, pin highlighted,
from any page.
```

---

## BLOCK 3 — Spot hero: solid fill + big icon (kill hatch)

```
[Shared preamble] BUG #3.
Files: web/src/entities/place/Photo.tsx,
web/src/shared/styles/atoms.css (.fg-photo, .fg-photo-glyph, .fg-photo-label).

ROOT CAUSE: Photo.tsx no-photo state renders category-tinted hatch/stripe bg with a
faint small glyph. Want: solid category accent fill + large centered white icon.

FIX:
- atoms.css: change .fg-photo placeholder to solid var(--pc) (or subtle flat tint),
  drop the hatch. Enlarge .fg-photo-glyph, render white/high-contrast, centered.
- Photo.tsx: default placeholder glyph size up (~26 cards, ~64 detail hero — pass
  heroGlyph size prop or scale by a `large` flag), glyph color="#fff". Leave real-url
  branch untouched. Reuse existing CategoryGlyph.

ACCEPTANCE: no-photo spots render clean solid colored card/hero with one big centered
category icon; no stripe pattern anywhere. Verify cards + hero in preview.
```

---

## BLOCK 4 — Guide spot-card names: 2-line wrap

```
[Shared preamble] BUG #5.
Files: web/src/shared/styles/atoms.css (.fg-card h3), affects GuideDetail.tsx grid
(.fg-page-grid).

ROOT CAUSE: RailCard <h3>{p.name}</h3> clamped to 1 line (nowrap+ellipsis). Narrower
.fg-page-grid cards (GuideDetail/Saved) cut long names ("Kadrioru tennis co…").

FIX: allow 2 lines. atoms.css .fg-card h3: display:-webkit-box; -webkit-line-clamp:2;
-webkit-box-orient:vertical; overflow:hidden; white-space:normal; bump line-height.
Verify card min-height absorbs 2-line title. If rail must stay 1-line, scope the
2-line rule to .fg-page-grid .fg-card h3 only.

ACCEPTANCE: no ellipsis-cut name in GuideDetail/Saved; long names wrap to 2 lines,
cards stay aligned.
```

---

## BLOCK 5 — Copy fixes: Saved "stamp" + "spots nearby"

```
[Shared preamble] BUGS #9 + #12 (both copy, batch together).
Files: web/src/pages/Saved.tsx, web/src/features/explore/DesktopExplore.tsx
(.fg-rail-head, mirror MobileExplore.tsx if shown).

#9 ROOT CAUSE: Saved empty state says "Tap the stamp on any specimen…" but control
is SaveButton — a bookmark icon.
FIX: change to "Tap the bookmark icon on any spot to save it here. Your collection
lives on this device." Optional: swap empty-state Ic.flag for bookmark glyph.

#12 ROOT CAUSE: rail-head says "{items.length} spots nearby · sorted by distance"
but default geo is curated (Tallinn center, isCurated:true) — distances aren't true
GPS. "Nearby" is misleading.
FIX: noun reflects geo status — "spots in view" when geoStatus !== 'real', only
"nearby" when status==='real'. Explore already has geoStatus; thread boolean into
DesktopExplore.

ACCEPTANCE: no "stamp" wording anywhere; label says "in view" on curated default,
"nearby" only with real GPS.
```

---

## BLOCK 6 — NEAR geolocation: loading + denied states

```
[Shared preamble] BUG #8.
Files: web/src/features/explore/DesktopExplore.tsx, web/src/shared/store/geoStore.ts,
web/src/features/explore/MobileExplore.tsx.

ROOT CAUSE: two inconsistent "near" controls:
- .fg-geobanner ("Use my location") calls request()→getCurrentPosition, shows
  "Locating…" — good.
- .fg-rail-head "Near" sort button has NO onClick — dead button.
- geoStore.request() on denial silently falls back to Tallinn, no error flag.

FIX:
1. geoStore: on getCurrentPosition error callback set denied:true (or error:'denied')
   alongside the curated fallback.
2. Wire rail-head "Near" button to request() (or remove if banner is canonical — no
   dead button). Show "Getting location…" while status==='locating'.
3. On denial show inline/toast: "Location access denied — showing distances from
   Tallinn centre" and reset button to idle label.

ACCEPTANCE: clicking Near with location off prompts browser, shows loading label, on
denial shows exact copy above and resets — never a dead click.
```

---

## BLOCK 7 — Search 0-results empty state + "Submit this spot"

```
[Shared preamble] BUG #11.
Files: web/src/app/AppShell.tsx (SearchBox), web/src/pages/AddSpot.tsx.

ROOT CAUSE: SearchBox shows `Nothing matches "{q}"` but no CTA, no prefill path.

FIX: empty branch renders "No results for '[query]'" + link "Submit this spot →"
that navigate('/add', { state:{ name:q }}) (or ?name=). AddSpot.tsx reads it into
the name input's initial value.

ACCEPTANCE: no-match search shows friendly line + working "Submit this spot →" landing
on /add with name pre-filled.
```

---

## BLOCK 8 — Spot-detail map interactive + "Open in full map"

```
[Shared preamble] BUG #10. DEPENDS ON BLOCK 1.
Files: web/src/features/place-detail/SpotDetail.tsx, web/src/pages/Explore.tsx,
web/src/widgets/map/SpotMap.tsx.

CONTEXT: desktop detail map = shared interactive Explore SpotMap behind panel; after
#1 it flies + isolates. Missing: explicit "Open in full map" affordance.

FIX:
1. SpotDetail: add "Open in full map →" button (near Directions/hero) →
   navigate('/explore?focus='+slug). Explore.tsx reads ?focus= on mount → sets map
   focusSlug → flyTo (reuses #1).
2. Confirm detail-context map allows zoom/pan (no interactive:false /
   scrollZoom.disable() anywhere).

ACCEPTANCE: from a spot detail, open full map already centered on that spot; map is
pan/zoom interactive.
```

---

## BLOCK 9 — verifiedAt: real relative time

```
[Shared preamble] BUG #7.
Files: web/src/features/place-detail/SpotDetail.tsx, web/src/shared/api/types.ts
(verifiedAt), web/src/shared/api/placesApi.ts.

ROOT CAUSE: PlaceDetailDto.verifiedAt?:string is free-text, SpotDetail prints raw
("verified {p.verifiedAt}"). Mock doesn't set it (badge hidden); real API ISO would
print raw ISO.

FIX: make verifiedAt an ISO timestamp in DTO + mock, add date-fns, render
formatDistanceToNow(new Date(p.verifiedAt), {addSuffix:true}). Keep {p.verifiedAt &&…}
guard (no timestamp = no badge). Mock sets a few real ISO dates to demo formatting.
NOTE: this touches the DTO — keep contract shape, only refine field semantics.

ACCEPTANCE: verified badge shows live-computed relative time from a real timestamp,
disappears entirely when field is null.
```

---

## BLOCK 10 — Guide cover icons (cross-cut guides only)

```
[Shared preamble] BUG #4.
Files: web/src/pages/Guides.tsx, web/src/shared/api/placesApi.ts (buildGuides).

ROOT CAUSE: sport guides already render correct CategoryGlyph. Only cross-cut guides
(e.g. "Free to play") whose coverCategory falls back to scenic show the scenic peak
glyph. No category-glyph for "Free to play".

FIX: give guides a coverIcon concept independent of category. In buildGuides() tag
cross-cut guides with an explicit icon key (ticket/check for "Free to play"); in
Guides.tsx render that icon (add Ic.ticket / reuse Ic.check) when present, else fall
back to CategoryGlyph. Sport guides keep category glyph; Viewpoint keeps scenic glyph.

ACCEPTANCE: every guide cover icon matches content — Free to play = ticket/check,
sport guides = sport glyph, Viewpoint = scenic glyph.
```

---

## BLOCK 11 — VERIFY specimen number canonical (no code expected)

```
[Shared preamble] BUG #6 — VERIFY only. Requires BLOCK 0 redeploy done.
Files: web/src/features/place-detail/SpotDetail.tsx, RailCard.tsx, Saved.tsx,
GuideDetail.tsx.

STATUS: code already uses canonical DB id (p.id) everywhere (Specimen №{p.id},
no={p.id}). Live discrepancy was stale deploy.

TASK: after redeploy, confirm one spot shows the same № on Explore, in a guide, in
Saved, and on its detail page regardless of sort/filter. If any surface still derives
№ from list index, switch it to p.id.

ACCEPTANCE: one spot, one number, everywhere.
```

---

## BLOCK 12 — Design audit (report-only, own ticket, LAST)

```
[Shared preamble] DESIGN AUDIT section of fixes/5-review.md. REPORT FINDINGS ONLY —
do NOT auto-fix. Produce fixes/5-design-findings.md.

Investigate + document (with file:line evidence):
1. Category color: 3 sources of truth — CSS OKLCH --c-* (tokens.css), CategoryDto.color
   hex (types.ts), MapLibre sRGB hex. No test pins them equal. Recommend OKLCH
   canonical, derive DTO hex, document mapping.
2. Typography: 3 families + .kicker defined, but heading sizes set ad-hoc per surface.
   Audit atoms.css h1/h3/label across Explore/Detail/Guides/Saved vs a defined ramp.
3. Sidebar spacing: .fg-card/.fg-rail-head/.fg-legend/.fg-geobanner vertical paddings
   for equal rhythm vs GemSpot Field Guide.html.
4. Breakpoints (useIsMobile flips <980px): test 375 (sheet snap, 8-chip legend
   overflow, full-screen detail), 768 (map sheet clip), 1024 (rail 432 + map crowding).
5. A11y: contrast — --c-tabletennis oklch(69% .155 66) as "PING PONG" text on white
   --paper likely fails AA 4.5:1; flag darker TEXT token (keep marker fill bright).
   ARIA — verify SaveButton, rail-head Near/Sort, cluster pills, directions toggle
   expose names. Alt text — Photo alt={label??''} → ensure spot name on real imagery.

OUTPUT: findings doc, no code edits.
```

---

## Execution order

Block 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.
(#1 unlocks #2 & #8/#10. Copy + verify blocks batched. Design audit last as own ticket.)
