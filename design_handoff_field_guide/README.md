# Handoff: GemSpot — Spotter's Field Guide

## Overview
GemSpot is a **local discovery map for Tallinn** — find ping-pong tables, basketball
hoops, football pitches, scenic viewpoints and seasonal sakura, collected and verified
by locals. It is a *discovery* product, not a navigation app: the map is the stage,
directions hand off to Apple/Google Maps.

This bundle is the **"Spotter's Field Guide" visual direction** (the chosen direction —
a clean cartographic geo-product where **colour carries taxonomy only** and all data/labels
are set in a monospace "survey" voice).

## About the Design Files
The files in this bundle are **design references created in HTML/React-via-Babel** — a
working prototype that demonstrates the intended look, layout, copy, and interactions.
They are **not production code to copy verbatim.**

Your task is to **recreate these designs in the target codebase's environment.** Per the
planning docs, the intended stack is **React (frontend) + Spring/Java (backend)**. Build
with that codebase's real component primitives, routing, data fetching, and state — using
this prototype as the precise spec for visuals and behaviour. Where the prototype fakes
data (a hardcoded `FG_PLACES` array, a hand-drawn SVG map), wire the real equivalents
(API-backed places, a real map provider such as Mapbox/MapLibre with a custom style).

## Fidelity
**High-fidelity.** Colours, typography, spacing, radii, and motion are final and
intentional. Recreate the UI faithfully. The one place to substitute reality for the
mock is the **map**: the prototype uses a decorative inline-SVG canvas (`fg-map.jsx`) as a
stand-in. In production, render a real map with a custom monochrome style and place the
branded category markers on it (see "Marker system" below).

---

## Routes / Screens

The app is a single shell (`fg-shell`) = top bar + body. The body swaps by `route`.
The prototype simulates desktop and mobile in one file via a viewport toggle; in
production these are just responsive breakpoints (mobile < ~980px).

### 1. Home / Landing  (`route: 'home'` — default)
Public, SEO-indexable "about the product" page.
- **Hero** (2-col on desktop, stacked on mobile): mono eyebrow `TALLINN · LOCAL DISCOVERY`,
  display H1 "Hidden city gems, spotted by locals.", body, two CTAs
  (`Explore the map` solid, `Add a spot` outline), and a stat row
  (`10 specimens mapped · 5 categories · 100% locally spotted`).
  Right column is a framed, clickable **map preview** with category pins → opens Explore.
- **Find your kind of spot**: grid of the 5 category cards → clicking one opens Explore
  filtered to that category.
- **Spotted this week**: 4 featured specimen cards → clicking opens that spot's detail in Explore.
- **How GemSpot works**: 3 steps — Discover / Save / Add.
- **CTA band** (ink background): "Know a spot we're missing?" → Add a spot.
- **Footer**: brand + link columns (Explore / Contribute / GemSpot) + tagline.

### 2. Explore  (`route: 'explore'`)
The core screen. **Desktop = split view**, **mobile = map + bottom sheet.**
- **Desktop**: left **rail** (width `--rail: 432px`) holds the Legend (category filter
  chips + "All"), a result header (`N spots nearby`, sorted by distance, a "Near" sort
  control), and a scrolling list of **specimen cards**. The remaining space is the **map**.
  Selecting a card or pin opens the **Detail panel**, which slides over the rail.
- **Mobile**: full-bleed map with a floating horizontal-scroll legend at top and a
  draggable **bottom sheet** (states: `peek` 128px / `half` 50% / `full` 90%) holding the
  same list. A bottom nav (Explore / Saved / Add / Guides / You) sits below.

### 3. Spot Detail  (panel, not a route)
Opens from a card/pin. Hero image carousel (3 dots), category tag, `Specimen №NN · Tallinn`,
name, location + distance + save count, **byline** (`spotted by @user` + verified badge),
field note, a 3-cell **Field notes** table (Access / Lit / Best), a "Sightings" photo strip,
and a sticky action bar (`Save` / `Directions`). On mobile it covers the stage.

### 4. Saved  (`route: 'saved'`)
Same Explore UI, list filtered to saved spots (one flat list — no collections in MVP).

### 5. Guides  (`route: 'guides'`)
Scrollable grid of curated **collection cards** (e.g. "Best sunset spots", "Hoops in the
centre", "Spring sakura trail"). Each maps to a category; clicking → opens Explore with that
category filter active + a toast.

### 6. Add a Spot  (modal overlay)
Opened from the top-bar button, the home CTAs, the account menu, or the mobile FAB.
Single reviewed form: a **pick-a-location** hint row → **5-category** picker grid →
**name** input → optional **field note** → optional **tag** chips → `Submit for review`.
On submit, a **success state** with a `Pending` stamp: submissions go to review, never
instantly live (a local reviewer approves them in the admin moderation queue).

### 7. Account menu  (dropdown)
Avatar in the top bar opens a popover: "Signed in as Maris" header, Profile, Saved spots,
Add a spot, Admin panel, Settings, Sign out. Closes on outside-click / Esc.

> **Admin** (moderation queue, places management, analytics) is a **separate, utilitarian
> desktop surface** — see `docs/`. Not styled like the playful consumer app.

---

## Design Tokens  (from `field/fg.css` `:root`)

Colours are authored in **OKLCH**. Keep them as-is.

### Paper & ink (cool survey-paper neutrals — NOT cream)
| Token | Value | Use |
|---|---|---|
| `--paper`   | `oklch(97.2% 0.008 165)` | page background |
| `--paper-2` | `oklch(94.3% 0.011 168)` | hover / inset fills |
| `--paper-3` | `oklch(91.5% 0.013 170)` | deeper fill |
| `--ink`     | `oklch(26% 0.018 215)`   | primary text, 1.5px borders, solid buttons |
| `--ink-2`   | `oklch(46% 0.018 215)`   | secondary text |
| `--ink-3`   | `oklch(63% 0.014 210)`   | tertiary / mono labels |
| `--line`    | `oklch(87% 0.012 180)`   | hairline dividers |
| `--line-2`  | `oklch(82% 0.014 185)`   | control borders |

### Semantic
| Token | Value | Use |
|---|---|---|
| `--stamp` | `oklch(54% 0.16 28)` | the **one warm accent** — "saved/collected" only |
| `--fresh` | `oklch(55% 0.10 160)` | verified / fresh signal |

### Category ink-set (hue carries meaning; ~shared L/C)
| Category | Token | Value |
|---|---|---|
| Table tennis | `--c-tabletennis` | `oklch(69% 0.155 66)` |
| Basketball   | `--c-basketball`  | `oklch(64% 0.165 46)` |
| Football     | `--c-football`    | `oklch(60% 0.12 152)` |
| Viewpoint    | `--c-scenic`      | `oklch(58% 0.115 245)` |
| Sakura       | `--c-sakura`      | `oklch(72% 0.12 350)` |

> **Colour rule:** the chrome is monochrome ink-on-paper. Colour appears **only** as
> category identity (markers, chips, tags, photo tints) and the single `--stamp` for saves.
> Do not introduce new accent colours.

### Typography
| Role | Family | Notes |
|---|---|---|
| Display (`--font-display`) | **Bricolage Grotesque** | headings, weights 700–800, `letter-spacing: -0.02 to -0.035em` |
| UI / body (`--font-ui`) | **Hanken Grotesk** | 400–700 |
| Mono / data (`--font-mono`) | **Space Mono** | 400/700 — all numbers, labels, kickers, map data; `font-feature-settings:"tnum"` |

- **Kicker** style: Space Mono, ~10.5px, `letter-spacing:0.14em`, uppercase, `--ink-3`.
- Type floors: body ≥ 13px; never shrink mono labels below ~9px.
- Loaded via Google Fonts `<link>` in the prototype; self-host in production.

### Motion (Emil-Kowalski-style, crisp & functional)
| Token | Value |
|---|---|
| `--ease`     | `cubic-bezier(0.22,1,0.36,1)` |
| `--ease-out` | `cubic-bezier(0.23,1,0.32,1)` |

- UI transitions **150–250ms**, `ease-out`. Press feedback: `transform: scale(0.94–0.98)` on `:active`.
- Popovers/menus scale in from `0.97` + fade (origin top-right). Modal scales from `0.97`+`translateY(8px)`.
- Sheet height transitions ~320ms. Honour `prefers-reduced-motion` (already gated in CSS).

### Shape, spacing, layout
- **Corners are sharp (radius 0)** everywhere except circles (logo, avatars, marker discs,
  status dots). This is the cartographic signature — keep it. (Disregard any "6–8px radius"
  note from older briefs; the built system is square.)
- Borders: `1px` hairlines (`--line`), `1.25px` control borders (`--line-2`), `1.5px` ink
  for emphasis (top bar, buttons, markers, modal).
- `--topbar: 60px` (56px mobile), `--rail: 432px`.
- Marker discs cast a hard offset shadow: `0 2px 0 var(--ink), 0 4px 9px rgba(20,30,30,.22)`.

---

## Marker system (the most branded component)
Each category = a **coloured disc + white glyph + ink stem** (a map tack). Three states:
- **Default**: 30px disc.
- **Selected**: grows to 42px **in place** (`.fg-pin-tag` is absolutely positioned so the
  layout doesn't shift) + shows a mono name label below.
- **Saved**: a small `--stamp` dot badge on the disc.

City-zoom **clustering is required** (count pill that de-clusters on interaction) — the
prototype omits it; implement it with the real map provider. Glyphs live in
`fg-data.jsx` (`FG_GLYPHS`) — simple enough to render at small sizes.

## Interactions & Behaviour
- **Save** = one bookmark metaphor everywhere (cards, detail, markers); pairs with the Saved
  destination. No hearts, no ratings/stars in MVP. Toast confirms save/submit.
- **Filter** = category chips + leading "All" reset. The only filter in MVP.
- **Add** → modal → `Pending` (never instant publish).
- **Directions** opens a provider deep-link menu (Apple/Google) — no in-app navigation.
- **Public vs gated**: browsing/filtering/spot pages are public & indexable. Login required
  only for save, add, /saved, /admin (social + email; gated actions resume after login).
- **Distance** is shown on cards and is the default sort.

## State (prototype shape — map to real state/store + API)
`route`, `query`, `active` (Set of category ids), `saved` (Set of spot ids), `hoverId`,
`detailId`, `loading`, `adding` (modal), `toast`, plus viewport detection. The derived
`list` = base (all, or saved-only) filtered by category + query, sorted by distance.

## Critical states to build (these ARE the product)
Location permission / denied / out-of-region (Tallinn-only), empty filter, empty saved,
search no-match, submit→pending, report-sent, loading skeletons. See `docs/07-ux-decisions-locked.md`.

## Assets
- **Fonts**: Bricolage Grotesque, Hanken Grotesk, Space Mono (Google Fonts → self-host).
- **Icons**: inline 24×24 stroke icons (`Ic` map in `fg-app.jsx`) and category glyphs
  (`FG_GLYPHS` in `fg-data.jsx`). Swap for your icon library if preferred, keeping stroke 1.6.
- **Photos**: the prototype uses category-tinted hatched **placeholders** (`FgPhoto`). Real
  user/spot photography slots into these frames.
- **Map**: replace the decorative SVG (`fg-map.jsx`) with a real custom-styled map provider.

## Files in this bundle
- `GemSpot Field Guide.html` — entry point (mounts the three JSX files).
- `field/fg.css` — **the full design system** (tokens + every component). Read this first.
- `field/fg-app.jsx` — shell, top bar, account menu, legend, cards, detail, map view,
  desktop/mobile explore, guides, add-spot modal, landing page, root state.
- `field/fg-data.jsx` — categories, glyphs, sample `FG_PLACES`, pin & photo components.
- `field/fg-map.jsx` — decorative map canvas (replace in production).
- `docs/` — the full product/design/engineering plan: design system, components, motion,
  **architecture & routing/state (04)**, **data model & API (05)**, implementation plan (06),
  and **locked UX decisions (07)**. These are authoritative for backend + IA.

## How to run the prototype locally
It loads React + Babel from a CDN and uses `<script src>` for the JSX, so it must be served
over HTTP (not `file://`). From this folder:
```
python3 -m http.server 8000
# open http://localhost:8000/GemSpot%20Field%20Guide.html
```
