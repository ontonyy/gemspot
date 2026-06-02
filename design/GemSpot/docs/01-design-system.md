# 01 · Design System

Tokens extracted verbatim from the prototype (`lib/web.css` `:root`, `lib/configs.jsx` `DIR_C`). This is **Direction C — clean geo-product with playful accents**. Port these as CSS variables / a TS token file; do not re-pick values.

Applying the *taste* skill: one accent, one neutral family, one radius scale, one type pairing, full component states. Category colour is decorative signal only — it never becomes a CTA colour.

---

## 1. Color

### Neutrals & accent (the whole UI runs on these)

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#f1f4f8` | App background, map letterbox |
| `--surface` | `#ffffff` | Cards, rail, sheets, top bar |
| `--surface2` | `#e9eef5` | Inset chips, facts, hovers, placeholders |
| `--ink` | `#19202b` | Primary text, headings |
| `--ink-soft` | `#5c6675` | Secondary text, body |
| `--ink-faint` | `#94a0b0` | Meta, captions, disabled |
| `--line` | `#e4e9f0` | All borders & dividers |
| `--accent` | `#2f6fe0` | **The** brand action colour — buttons, links, selection, active nav |
| `--accent2` | `#1ba0a0` | Rare secondary accent (also the padel category) — use sparingly |

Semantic status (not in `:root` — add as tokens): success `#2f9e5b`, warning `#e0a32e` / `#c2761a`, danger `#d4504e`.

### Category palette (markers & badges ONLY)

| Category | id | Hex | Glyph cue |
|----------|----|----|-----------|
| Table tennis | `tabletennis` | `#e0a32e` | paddle + ball |
| Basketball | `basketball` | `#ee7733` | hoop/ball |
| Football | `football` | `#2f9e5b` | pitch/ball |
| Tennis | `tennis` | `#74b13a` | racket lines |
| Padel | `padel` | `#1ba0a0` | enclosed court |
| Scenic spot | `scenic` | `#3b7ddd` | sun + horizon |
| Sakura spot | `sakura` | `#e85f9c` | blossom |

> MVP scope note (doc 07): the briefs name **3–5** categories. The prototype ships all 7. Launch decision pending — the system supports any subset; categories are data-driven (`GET /categories`), not hard-coded.

Each category is recognisable by **both colour and glyph** so it survives colour-blindness and greyscale. Keep that rule when adding categories.

---

## 2. Typography

Pairing (Google Fonts): **Space Grotesk** (display/headings) + **Hanken Grotesk** (body/UI).

| Role | Family | Size / weight (desktop) |
|------|--------|------------------------|
| Hero H1 | Space Grotesk 700 | 54px / line 1.02 / tracking −0.03em |
| Section H2 | Space Grotesk 700 | 32px / −0.025em |
| Detail title H1 | Space Grotesk 700 | 23px |
| Card title H3 | Space Grotesk 700 | 15–16px |
| Body | Hanken Grotesk 400–600 | 13.5–18px / line 1.5 |
| Meta / caption | Hanken Grotesk 600–700 | 11–12.5px |
| Stat number | Space Grotesk 700 | 26–30px |

Headings use negative tracking; body never. One pairing across consumer **and** admin (admin just uses tighter sizes).

---

## 3. Spacing, radius, elevation

- **Radius:** `--r-card: 16px`, `--r-chip: 10px`, `--r-btn: 12px`, sheet/modal `22px`, pill `100px`. Pick from this scale only.
- **Spacing:** 4px base; common steps 6 / 8 / 10 / 14 / 18 / 22 / 26 / 40px. Rail padding 14–18px; section padding 46px desktop / 34px mobile.
- **Elevation** (tinted to ink, never pure black):
  - Card hover: `0 10px 26px rgba(20,26,40,0.10)`
  - Panel/drawer: `8px 0 30px rgba(20,26,40,0.10)`
  - Popover/menu: `0 12px 34px rgba(20,26,40,0.16)`
  - Map control / marker: `0 3px 10px rgba(20,26,40,0.12–0.26)`
- **Borders:** 1px `--line` is the default separator; prefer a border or `surface2` fill over a shadow for flat groupings.

---

## 4. Marker system (the signature component)

From `lib/markers.jsx` (`GemMarker`, variant `clean`). This is the most brand-defining element — reuse the exact spec.

- **Shape:** filled circle in the category colour, **2.5px white ring**, soft drop shadow. White glyph centred (~62% of marker size).
- **States:**
  - `default` — 27px on the web map.
  - `hover` — 30px (desktop pointer only).
  - `selected` — ~32px scaled up + a translucent colour **halo** + a white pill **label** with the spot name beneath.
  - `saved` — small white heart-less bookmark dot top-right (prototype uses a heart pip; **change to a bookmark pip** for save-metaphor consistency per doc 07).
  - `cluster` — white pill with up to 3 colour dots + a count; `data-active` (contains selection) flips to dark `--ink`.
- **Clustering:** greedy proximity grouping; clicking a cluster opens a popover list (prototype) — in production with a real zoomable map, a cluster click should **zoom to bounds** and only fall back to the popover at max zoom. Reuse the count-pill visual.
- **Production:** render as a custom MapLibre/Mapbox symbol or an HTML marker overlay; keep ring, shadow, glyph, and the four states.

---

## 5. Component primitives (atoms)

All implemented in the prototype; port the visual exactly.

- **Buttons** — `.gs-btn` base; `primary` (accent fill, white, soft accent shadow), `ghost` (surface + line border), `lg` (50px), `block`, `[data-dim]` (disabled look). All press to `scale(0.97)` (doc 03).
- **Chips** — category filter chips: 34px pill, glyph circle + label; `[data-on]` fills with the category colour (the only place category colour touches a "control"); leading **"All"** chip resets.
- **Tag** — tiny `surface2` pill for utility tags (Free, Lights, Seasonal…). Max 2–3 per card.
- **CatBadge** — category glyph + label on a 10%-tint background; `lg` variant on detail.
- **SaveButton** — circular bookmark toggle; `[data-saved]` fills accent; `[data-light]` variant for over-photo placement.
- **Photo** — placeholder: category-tinted gradient + faint glyph watermark + optional label. **Production swaps this for real `PlacePhoto` images**; keep the tinted gradient as the loading/empty fallback.
- **Avatar** — initial on accent circle.
- **Inputs** — label above, 46px field, focus = accent border + 3px accent ring at 12% (doc 02 form rules).
- **Toast** — dark pill, bottom-center, check glyph (doc 03).

---

## 6. Iconography

The prototype ships a small custom stroke set (`UIcon` in `lib/ui.jsx`): search, back, close, share, route, plus, location, pin, bookmark, compass, layers, camera, clock, check, chevron(s), star, sliders, filter. Stroke 1.7–2, round caps/joins, 20px grid.

**Production:** either keep this curated set (it's tiny and on-brand) or adopt one icon library (e.g. Phosphor) and restyle to the same stroke weight. **One family only.** Category glyphs (`GemGlyph`) are separate and stay as-is — they are brand assets.

---

## 7. Dark mode

Out of scope for MVP (per brief) but design tokens are structured for it: everything reads from `:root` variables. When added, swap the neutral ramp and keep `--accent` recognisable; maintain WCAG AA. Do not ship a half-built dark mode.
