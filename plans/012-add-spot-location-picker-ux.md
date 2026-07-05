# 012 — "Add a spot": location picker map unusable

Priority: P2 · Effort: M · Risk: LOW-MED · Depends on: 011 (soft — same page; land 011 first)

Status: DONE + VERIFIED (branch BP-NA-gemspot-web-location-picker-ux). Candidates 1-4 shipped; geocoder (5) skipped per scope.

Verification (2026-07-05, dev server, desktop + mobile 375px):
- Zoom controls: click + → map zooms (streets/labels render) ✓
- Pan → coords sync: map.panBy moved center 59.437,24.745 → 59.435036,24.75015; coords chip = 59.43504,24.75015 and parent hint = 59.4350,24.7502 (same source, map.getCenter) ✓
- Crosshair == picked coords: pin CSS-centered, chip = map.getCenter by construction ✓
- Submit payload: coords state (proven synced) → createSubmission input.lat/lng; submit succeeded → navigated #/explore ✓
- My location: button present, click no crash, recenter guarded (flyTo only on geoStatus==='real' + awaitingFix) — curated default never wrongly recenters ✓ (geo path code-verified; harness geolocation not deterministic)
- cooperativeGestures: code path `cooperativeGestures: isTouch` (pointer:coarse) correct; NOT runtime-tested — preview harness reports pointer:fine even at 375px viewport, so gesture overlay doesn't engage there. Verified by inspection only ✓
- Mobile 375px layout: map 332×373px (clamp 46vh in 812h), zoom + locate + chip + centered crosshair all present ✓
- npm run build ✓ · npm run test 20/20 ✓
- No defects found. No code changes needed at verify.

Changed files:
- web/src/features/add-spot/LocationPicker.tsx — NavigationControl zoom (no compass), "My location" button wired to geoStore.request() → flyTo on real fix (guarded so curated Tallinn default doesn't recenter), cooperativeGestures on touch (pointer:coarse), on-map coords chip + "drag map" hint, local picked state synced with parent onChange.
- web/src/shared/styles/atoms.css — .fg-pickmap height 240px → clamp(300px,46vh,440px); new .fg-pick-locate / .fg-pick-hint / .fg-pick-coords styles.

Audit results (dev, desktop + mobile 375):
- No zoom controls (confirmed) → added NavigationControl.
- Mobile page-scroll hijack by map pan/zoom → cooperativeGestures on touch.
- No "use my location" despite geoStore → added button.
- Weak coords feedback (tiny line below map only) → on-map coords chip + hint.
- Map cramped at fixed 240px → responsive clamp, ~374px desktop.
- Crosshair-center pattern kept (good, not the problem).
- Env note: openfreemap tiles load (200) but survey-paper palette renders very pale at z13 — not a picker bug; SpotMap uses same buildStyle.

Verify: coords chip == parent hint == crosshair center (map.getCenter by construction); submit → /explore success with coords in payload. `npm run build` + `npm run test` (20/20, buildStyle green).

## Problem

Map in `#/add` is "really unusable" — hard to pick a precise location.

## Current implementation

`web/src/features/add-spot/LocationPicker.tsx` (69 lines):
- Small MapLibre map, fixed crosshair pin at center, `moveend` reports center coords.
- Max bounds hardcoded Tallinn `[[24.55,59.36],[24.95,59.5]]`.
- Style from `widgets/map/buildStyle.ts`; static attribution via `dangerouslySetInnerHTML` (known nit).

## Audit first (name concrete pain points before fixing)

Open `/add` in dev + prod, mobile + desktop, and score:
- map height/size (too small?)
- zoom controls present? pinch/scroll zoom conflicts with page scroll?
- no search/geocode — must pan manually from default center
- no "use my location" button (geoStore exists: `web/src/shared/store/geoStore.ts`)
- crosshair visibility, coords feedback, confirmation of picked point
- initial center/zoom sensible?

## Fix direction (scope to findings; candidates)

1. Bigger map area + explicit zoom controls (`maplibregl.NavigationControl`).
2. "Use my location" button wired to existing `geoStore.request()` → center map on user.
3. Show picked address/coords readout + subtle "move map to position pin" hint text.
4. Sensible `cooperativeGestures` on mobile so page scroll isn't hijacked.
5. Optional (bigger): geocoder search box — only if user confirms scope; adds dependency.

Keep crosshair-center pattern (good mobile pattern) unless audit proves it's the problem.

## Verify

- Mobile 375px + desktop: can zoom, pan, locate self, and pick a precise point in <15s.
- Picked coords match crosshair; submit payload lat/lng correct (log/inspect).
- `npm run build` + `npm run test` (buildStyle tests still green).

## STOP conditions

- No new map provider / heavy dependency without user sign-off.
- Don't touch SpotMap.tsx (explore map) — this plan is LocationPicker only.

## Session block (1 fresh session)

Branch: `BP-NA-gemspot-web-location-picker-ux` off `master`. Parallelization: none.

Shared preamble:
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-location-picker-ux (create off master)
Task anchor: plans/012-add-spot-location-picker-ux.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

Prompt 1: Use shared preamble. Read plans/012 plan, `LocationPicker.tsx`, `AddSpot.tsx` (picker integration), `geoStore.ts`, `buildStyle.ts`. Run audit checklist in dev server (mobile + desktop viewport); list concrete pain points found.

Prompt 2: Implement fixes 1-4 scoped to audit findings (skip geocoder unless user asked). Surgical changes to LocationPicker + its CSS only.

Prompt 3: Verify per plan; update plan status with changed files + audit results. Stop.
