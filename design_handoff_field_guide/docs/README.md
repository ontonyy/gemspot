# GemSpot — Implementation Handoff

This folder is the bridge between the **clickable prototype** (`GemSpot Web.html` + `lib/web-*.jsx`) and the **production React + backend build**. It is written for the engineers who will rebuild the prototype as a real product.

The prototype is the source of truth for **look, layout, interaction, and UX decisions**. These docs translate it into tokens, component contracts, data models, and a build order. Where the prototype and the original briefs disagree, these docs say which wins and why.

## Read in this order

| # | Doc | What it covers |
|---|-----|----------------|
| — | `README.md` (this) | Map of the prototype, stack decisions, conventions |
| 01 | `01-design-system.md` | Tokens: color, type, spacing, radius, the marker system, component primitives. (Applies the *taste* skill.) |
| 02 | `02-components.md` | Component inventory: prototype → React, props, and the full state matrix (loading / empty / error). |
| 03 | `03-motion-and-interaction.md` | Animation & interaction spec — durations, easing, what animates and why. (Applies the *Emil Kowalski* design-engineering skill.) |
| 04 | `04-architecture-routing-state.md` | App shell, routes, public vs authed, state model, responsive strategy. |
| 05 | `05-data-model-and-api.md` | GemSpot domain entities, MySQL/JPA schema, REST endpoints, DTOs, analytics events. |
| 06 | `06-implementation-plan.md` | Phased build plan, effort (easy/medium/hard), prototype-file → production-module map. |
| 07 | `07-ux-decisions-locked.md` | Non-negotiable UX decisions baked into the prototype during the audit — do not silently revert. |

## The prototype, in one paragraph

GemSpot is a **map-first local-discovery web app for Tallinn**. Visiting is public (no login); **saving and adding** require an account. The desktop layout is a persistent shell — top bar + a left card rail + a map that never disappears; spot detail opens as a slide-in panel and also has its own URL. On mobile it collapses to a map with a bottom sheet and a bottom nav. Submissions go through a **moderation queue** in a desktop admin surface before they go live. The visual direction is **"Direction C — clean geo-product with playful accents"**: a calm neutral map, branded per-category markers (colour **and** glyph), one accent blue.

## Prototype file map

```
GemSpot Web.html              host: loads fonts, React/Babel, all modules
lib/web.css                   the entire stylesheet (token source in :root)
lib/web-core.jsx              tokens, data layer, AppProvider/useApp store, shared atoms
lib/web-map.jsx               WebMap: responsive map + marker clustering + pin placement
lib/web-landing.jsx           public SEO landing page
lib/web-explore.jsx           filter bar, spot cards, explore split, spot detail
lib/web-flows.jsx             auth modal, saved, add-a-spot stepper, location/empty states, toast
lib/web-admin.jsx             admin moderation queue + stats + review drawer
lib/web-app.jsx               shell: top bar, mobile nav, routing, mount

Reused unchanged from the saved Direction C design:
lib/markers.jsx               GEM_CATEGORIES, GemGlyph, GemMarker
lib/map.jsx                   GEM_SPOTS (mock), TallinnMap (hand-built SVG map)
lib/ui.jsx                    UIcon, Avatar
lib/configs.jsx               DIR_C token object
```

## Stack decision (reconciled)

> ⚠️ **The two backend briefs (`mvp-backend-*.md`) describe a *specialists / bookings* marketplace and a Node/NestJS stack — both wrong for this build.** The **confirmed stack is Java + Spring Boot + MySQL** (per `gemspot_mvp_brief.md`); the **domain** is Place / Category / Submission / Favorite / Report / Moderation. See doc 05.

**Adopted stack**

- **Frontend:** React + TypeScript, Vite. Plain CSS (CSS variables) or CSS Modules — the prototype's `web.css` ports almost 1:1; do **not** introduce a heavy UI kit that fights the existing visual language.
- **Maps:** MapLibre GL or Mapbox GL with a **custom style** matching the prototype palette (see doc 01 → Map). The prototype's hand-drawn SVG map is a stand-in; production uses a real tiled map with the same colours and the same custom markers.
- **Backend:** **Java + Spring Boot** (modular monolith), **MySQL** from day one, **Spring Data JPA / Hibernate**, **Flyway** migrations, **Spring Security + JWT** access+refresh, **S3-compatible** file storage. Social login via OAuth2 (Google / Facebook / Instagram) + email. React consumes these REST endpoints over view-ready DTOs.
- **Analytics:** event table from day one (doc 05 → Events). Behaviour metrics matter more than raw user counts.

## Conventions

- **One accent.** `#2f6fe0`. Category colours are for markers/badges only, never for primary actions.
- **No ratings in MVP.** Social proof = save count + distance + "Approved" badge. (See doc 07.)
- **One save metaphor:** bookmark, everywhere. No hearts.
- **Every list/detail/map has loading + empty + error states.** They are MVP scope, not polish (doc 02).
- **URLs are first-class:** every filter, spot, and view is linkable and SEO-indexable where public (doc 04).
