# GemSpot — Design Audit Findings (report-only)

> Produced 2026-06-08 from `web/src` at branch `master`. **No code changed.**
> Each finding has file:line evidence + a recommendation for a later pass.
> Constraints assumed unchanged: fg.css visuals only, OKLCH category color is the
> one taxonomy color, `--stamp` is save-only, DTO/seam intact.

---

## 1 · Category color — sources of truth

**Claim in review:** 3 sources (CSS OKLCH, DTO hex, MapLibre sRGB hex). **Actual: nuanced — only 2 live, 1 dead/mislabeled.**

| Source | Where | Value form | Status |
|--------|-------|-----------|--------|
| CSS OKLCH tokens `--c-*` | `web/src/shared/styles/tokens.css:24-31` | `oklch()` | **Canonical.** All UI color flows through `catColor(id) → var(--c-*)` (`categories.tsx:87`), consumed by chips/markers/hero/pills. |
| `CategoryDto.color` | set at `placesApi.ts:49` (`color: c.cssvar`), typed `types.ts:8-14` | the **var NAME string** `"--c-tabletennis"`, NOT a hex | **Dead + mislabeled.** Grep shows no consumer of `category.color` anywhere (`categories.tsx:14` is the only other `cssvar` ref). The type comment says `// hex/css color` but the value is a token name. |
| MapLibre basemap | `web/public/map-style.json` | sRGB hex (`#f1f5f2`, `#e4ede5`, …) | **Chrome only.** `map-style.json` metadata explicitly states taxonomy color lives in HTML markers, not the basemap. No category hex in the style — markers are HTML overlays using `catColor`. |

**Real finding:** the drift risk is smaller than stated — the map does **not** carry category hex, so CSS↔map cannot drift on taxonomy. The actual defect is `CategoryDto.color`:
- It is **unused** (no consumer), and
- It is **mislabeled** (comment promises hex; code ships a CSS var name).

**Recommendation (later pass, DTO contract is frozen — flag, don't change yet):**
- Keep OKLCH `--c-*` canonical (already is).
- Decide `CategoryDto.color`'s contract: either (a) drop the comment's "hex" promise and document it carries the token name, or (b) when the real backend serves it, derive a hex from the OKLCH token and add **one test** pinning `DTO.color` ↔ `--c-*` equal (no such test exists today).
- Document the OKLCH→sRGB mapping used in `map-style.json` (currently only a prose note in `metadata`).

Tokens for reference (`tokens.css:24-31`): tabletennis 69%/.155/66, basketball 64%/.165/46, football 60%/.12/152, scenic 58%/.115/245, sakura 72%/.12/350, tennis 66%/.145/128, padel 62%/.125/195.

---

## 2 · Typography — no shared heading ramp

3 families + `.kicker` defined (`tokens.css:33-35,60`). Heading/label sizes are set **ad hoc per surface**, not from a scale:

| Selector | Size | File:line |
|----------|------|-----------|
| `.fg-hero-copy h1` | clamp(34–54px) | `atoms.css:413` |
| `.fg-page-h h1` | 30px (mobile 24px) | `atoms.css:396,403` |
| `.fg-detail-body h1` | 24px | `atoms.css:355` |
| `.fg-empty h3` | 17px | `atoms.css:280` |
| `.fg-card-body h3` | 15px | `atoms.css:136` |
| `.kicker` | 10.5px | `tokens.css:60` |

**Finding:** two different `h1` sizes (page 30 vs detail 24) for comparable-rank titles, and `h3` ranges 15→17 with no token. Mono micro-labels float between 9–11px across `.fg-card-no` (10.5), `.fg-rail-head .sub` (10.5), `.fg-geobanner` (10), `.fg-detail-no` (10.5), `.fg-sort` (11) — close but not unified.

**Recommendation:** define a small type-scale (e.g. `--t-h1`, `--t-h2`, `--t-h3`, `--t-meta`) in `tokens.css` and point the surface selectors at it. Decide whether detail-h1 should equal page-h1 (30) or stay intentionally smaller for the narrow rail (24). Pure CSS, no new fonts.

---

## 3 · Sidebar vertical rhythm — geobanner is tighter

Horizontal padding is **consistent at 18px** across all rail blocks. Vertical padding is **not**:

| Block | Padding | File:line |
|-------|---------|-----------|
| `.fg-card` | `15px 18px` | `atoms.css:124` |
| `.fg-rail-head` | `15px 18px 11px` | `atoms.css:213` |
| `.fg-legend` | `13px 18px 14px` | `atoms.css:206` |
| `.fg-geobanner` | `8px 18px` | `atoms.css:225` |

**Finding:** the geo banner (8px) is markedly tighter top/bottom than card/rail-head (15px) and legend (~13/14px). It was "built for this slice" (comment at `:224`) and didn't inherit the rail's list-item rhythm. Reads as a cramped insert between legend and list.

**Recommendation:** align geobanner vertical padding to the ~13–15px family (or define `--rail-pad-y`) and reconcile against `GemSpot Field Guide.html` reference. Minor, CSS only.

---

## 4 · Breakpoints — `useIsMobile` flips <980px

`MOBILE_MAX = 980` (`web/src/shared/lib/useViewport.ts:6`). So **768 = mobile**, 1024 = desktop. Media queries in `atoms.css` all key on `max-width:980px` (`:158,403,492,536`).

This audit reads source only (no live render). Items to verify in a browser pass at each width:
- **375** — bottom-sheet drag-snap; **8-chip legend overflow** (7 categories + controls in `.fg-legend`, horizontal room is tightest here); full-screen detail (`.fg-detail` is `width:var(--rail)`=432px absolute — confirm it goes full-width on mobile via the `:158`/`:492` queries, else it clips at 375).
- **768** — still mobile layout; check map sheet doesn't clip.
- **1024** — rail 432px (`--rail`, `tokens.css:40`) + detail panel also 432px (`.fg-detail`, `atoms.css:333`) overlaying the map; confirm map isn't fully covered/crowded.

**Recommendation:** run `preview_resize` at 375/768/1024 in a follow-up; this report cannot assert pixel overflow from source alone. The structural risk flagged: detail panel and rail are both exactly `--rail` (432px) — on a ~1024 viewport the panel can dominate.

---

## 5 · Accessibility

### 5a · Contrast — category label text fails AA on paper
Category text uses `.fg-card-meta .cat { color: var(--cc) }` on `--paper`/`--paper-2` background (`atoms.css:141`). The tokens sit at L 58–72% (`tokens.css:24-31`); against `--paper` (L 97%) small text contrast is well under **4.5:1** for the lighter hues — **`--c-tabletennis` (L69%), `--c-sakura` (L72%), `--c-tennis` (L66%)** are the worst, almost certainly failing AA for the "PING PONG"-style label.

**Recommendation:** add a darker **text-only** variant token (e.g. `--c-*-text` at L≈45–50% same hue) for small labels on paper; keep the bright fill for markers/discs/hero where it's white-on-color (those pass). Don't recolor the taxonomy — add a paired darker text token.

### 5b · ARIA — map markers/cluster pills have no accessible name and no keyboard path
- `SaveButton` — **OK**, `aria-label` present (`SaveButton.tsx:15`). (Note: code comment still calls it "collector's stamp"; UI copy fix is review item #9.)
- Rail-head **Near/Sort** — **OK now**, both `<button>` with `onClick` + `aria-label` (`DesktopExplore.tsx:52-53,68-69`). The "dead Near button" from the review is already wired.
- Directions toggle — **OK**, `<button aria-haspopup="menu" aria-…` (`SpotDetail.tsx:176`).
- Back/Share — **OK**, `aria-label` (`SpotDetail.tsx:95-96`).
- **Map pins + cluster pills — GAP.** `SpotPin` and `ClusterPill` render plain `<div>`s with no `role`, no `aria-label`, no `tabindex` (`SpotMap.tsx:72-87`, `:103-110`); click handlers are attached to bare `<div>` elements (`:293-299` cluster, `:318-322` pin). Not keyboard-focusable, no accessible name announced.

**Recommendation:** give marker elements `role="button"`, `tabindex="0"`, keydown(Enter/Space), and `aria-label` (spot name for pins, "N spots, zoom in" for clusters). The rail list already offers a keyboard-accessible path to every spot, so this is enhancement not blocker — flag, schedule.

### 5c · Alt text — real photos get empty alt
`Photo` sets `alt={label ?? ''}` (`Photo.tsx:10`). The two real-image call sites pass **no `label`**: hero `SpotDetail.tsx:92` and carousel `SpotDetail.tsx:138`. Result: real imagery renders `alt=""` (treated as decorative). Placeholder/thumb usages (`RailCard.tsx:35`, `SpecimenCard.tsx:32`) are glyph placeholders where empty alt is acceptable.

**Recommendation:** pass the spot name as `label` (or a dedicated `alt` prop) at the real-image call sites so screen readers announce the photo subject. Keep empty alt for the decorative placeholder branch.

---

## Summary of recommended follow-ups (priority)
1. **A11y contrast** (5a) — add darker per-category text token; affects every category label on paper. Highest user impact.
2. **Alt text on real photos** (5c) — 2 call sites, trivial.
3. **Map marker keyboard/ARIA** (5b) — enhancement; rail provides fallback path.
4. **Typography scale** (2) + **geobanner rhythm** (3) — visual polish, CSS only.
5. **`CategoryDto.color` contract** (1) — clarify/test when backend lands; DTO frozen for now.
6. **Breakpoint live check** (4) — needs browser pass, not source.
