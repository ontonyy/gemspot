# GemSpot — MVP Gap Review & Claude Code Plan (v3)

> Reviewed: live site `https://ontonyy.github.io/gemspot/#/explore` against the local
> `gemspot/web` codebase, `docs/`, `skills/`, and `design_handoff_field_guide/`.
> Date: 2026-06-04. Codebase: `web v0.2.0` (PROJECT-STATUS).

---

## ⚠️ Headline finding — read this first

**The live GitHub Pages site is STALE. It does not reflect the current `web/` codebase.**

Most of the bugs in your 13-item list are *already fixed in the code on disk* — they
just were never deployed. Before Claude Code "fixes" anything, it must **rebuild and
redeploy `master`**, then re-test the live URL. About **7 of your 13 items will
disappear on redeploy alone.**

The thing that is *actually* missing for MVP is not in your list: **the NestJS backend
is built but never deployed**, so the live site runs 100% on mock data — no real
persistence, no cross-device saves, no moderation, no analytics. That is the real MVP
gate (see Block P2).

---

## Your 13 items, triaged against the actual code

Legend: 🟢 already done in code (redeploy fixes it) · 🟡 partially done / needs finishing · 🔴 genuine gap.

| # | Item | Verdict | Evidence in code |
|---|---|---|---|
| 1 | Map blank on `/explore` & `/spot/:slug` | 🟡 **CRITICAL — verify live** | `widgets/map/SpotMap.tsx` is robust: WebGL detect, error fallback, 10s load timeout, `import.meta.env.BASE_URL` style path (the GH-Pages 404 bug was already fixed). If still blank live → stale deploy OR OpenFreeMap CDN/tile reachability OR a map-container CSS height collapse. Must be debugged on the real HTTPS deploy. |
| 2 | Spot hero = hatch placeholder | 🟡 design choice | `entities/place/Photo.tsx` already renders a **category-tinted** card + glyph (size 26) + label when there are no photos — it's the intentional "riso" hatch, not a broken state. Your ask (solid color + *large* icon) is a small `fg-photo` CSS tweak + glyph-size bump. Decide: keep riso texture or go flat. |
| 3 | NEAR button → trigger geolocation | 🔴 **genuine bug** | `features/explore/DesktopExplore.tsx`: the rail-head `<button className="fg-sort">…Near</button>` has **no onClick** — it's a dead label. (Geo is requested on mount and via the "Use my location" banner, but this button does nothing.) |
| 4 | USE MY LOCATION — loading + error states | 🟡 half done | `geoStore.ts` + the `fg-geobanner` have a **`locating…`** state, but **no error/denied feedback**: on deny it silently falls back to "curated" with no message. Add a `permission==='denied'` toast/inline error. |
| 5 | Guide card icons → category icon | 🟢 done | `pages/Guides.tsx` already maps `g.coverCategory → CategoryGlyph`. Only the derived "Free to play" cross-cut guide may show an arbitrary category glyph — pick a sensible cover category for it. |
| 6 | Profile → My submissions / My reports | 🟢 done | `features/account/AccountMenu.tsx` has **both**, with counts, inline lists, and empty states ("No spots submitted yet" / "No problems reported yet"). You saw the stale deploy. |
| 7 | Share button → Web Share + clipboard + toast | 🟢 done | `SpotDetail.tsx` `onShare`: `navigator.share()` → clipboard fallback → "Link copied" toast, sharing the canonical `#/spot/:slug` deep link. Stale deploy. |
| 8 | Add-a-spot — remove "All", required validation | 🟢 done | `pages/AddSpot.tsx` passes `<Legend allowAll={false}>` and runs `validate()` (name ≥3, category required, note length). Stale deploy. |
| 9 | Verified timestamp — make dynamic | 🔴 genuine debt | `SpotDetail.tsx` renders `verified {p.verifiedAt}` verbatim — `verifiedAt` is a **mock string** ("12 days ago"). Switch to a real ISO date field + client-side relative formatting (lands properly with the backend, P2). |
| 10 | Specimen № align list vs detail | 🟢 likely done | Detail uses `Specimen №{p.id}`; PROJECT-STATUS claims stable `№{id}` everywhere. **Verify** `RailList` passes `no={p.id}` (not the array index) into `RailCard`. |
| 11 | Active filters → removable chip pills | 🔴 improvement | Today the active filter is shown as a **text line** in `fg-rail-head .sub` + a "Clear" button. Replace with removable pill chips (one per active facet: category, free, search) each with an ✕. |
| 12 | Zero search results — empty state | 🟢 done | `features/explore/RailStates.tsx` `EmptyState` has a **searching** variant with copy + "Clear search" button. Optional polish: add an "Add this spot" CTA. |
| 13 | Mobile — list + map toggle / bottom sheet | 🟢 done | `MobileExplore.tsx` ships a draggable bottom sheet (peek/half/full) + `MobileNav`. Stale deploy. |

**Net:** 6 already done (1,5,6,7,8,12,13 ≈ 🟢), 3 partial (2,4,10), 3–4 genuine (3,9,11 + verify 1).

---

## What's actually missing for MVP (not in your list)

From `docs/gemspot_mvp_brief.md` + PROJECT-STATUS, the real gaps:

- **Backend deployed.** `backend/` (NestJS + Prisma + Postgres) builds green but is **not hosted**; `VITE_API_URL` is unset in CI → live site is mock-only. No real persistence, no cross-device saves, no moderation, no analytics ingest. **This is the MVP gate.**
- **Auth wired end-to-end.** UI exists (`authStore`, `/auth`), but with no backend, login/save-merge is unproven.
- **Moderation loop closed.** Submissions go PENDING with no live place to approve into (admin UI exists in `features/admin/*` but needs a real API behind it).
- **Real photos.** Hero is a placeholder until the `uploads` pipeline runs against hosted storage.
- **Dev leftovers.** `pages/TokenProbe.tsx` still in tree — route-gate or delete; bump version/CHANGELOG past 0.2.0.

---

## The plan for Claude Code (prioritized blocks)

> Hard constraints, every block: keep **fg.css** visuals (OKLCH tokens, Bricolage/Hanken/Space Mono),
> **category color = only taxonomy color, `--stamp` = save-only**; keep the **DTO contract**
> (`web/src/shared/api/types.ts`) stable; keep **HashRouter + base `/gemspot/`** and FSD structure;
> honor `skills/taste-skill.md` + `emil-kowalski-philosophy.md`; `npm run build` + `npm test` green after each block.

### P0 — Redeploy & re-baseline (do this FIRST, ~30 min)
1. `cd web && npm ci && npm run build` → confirm green.
2. Trigger the GH Pages deploy (`.github/workflows/deploy.yml`, push to `master`).
3. Re-test the **live** URL and re-check items 1–13. Items 5,6,7,8,12,13 should now pass.
4. Write down which items *still* fail live — that's the true bug list.
- **Acceptance:** live site matches the local `npm run dev` build; only genuine bugs remain.

### P1 — Map blank (CRITICAL, item 1) — debug on live HTTPS
- Open the live console on `/explore` and `/spot/:slug`. Capture errors verbatim.
- Check, in order: (a) `map-style.json` 200s under `/gemspot/` (BASE_URL); (b) OpenFreeMap
  `tiles.openfreemap.org/planet` + `…/fonts/...pbf` are reachable / not CORS-blocked / not rate-limited;
  (c) the map host (`.fg-mapcanvas` / `.fg-mapwrap`) has non-zero height (flex/`100dvh` collapse);
  (d) `status` reaches `'ready'` (else the 10s timeout fired → tiles never loaded).
- If OpenFreeMap is the failure: add a **self-hosted style/tile fallback** or a second provider, and
  surface the existing `fg-maperr` "Retry" box instead of a silent white box.
- **Acceptance:** basemap + branded markers render on both routes on the live HTTPS site; console clean.

### P2 — Deploy the backend (the real MVP gate)
Follow `docs/mvp-backend-plan-webapp-claude.md` + PROJECT-STATUS "What's needed next":
1. Hosted Postgres (Render/Neon/Supabase) → real `DATABASE_URL`; `prisma migrate deploy` + `npm run db:seed` (loads the 10 Tallinn spots from `RAW[]` so the map looks identical).
2. Host NestJS (Render/Fly/Railway) → public HTTPS; set `CORS_ORIGIN=https://ontonyy.github.io`.
3. Set `VITE_API_URL` secret in the GH Actions web build → flips `placesApi`/`authApi`/`adminApi` seams to HTTP (zero call-site changes; mock stays the no-env fallback).
4. Add backend tests (currently a stub): auth, submissions, moderation flips, saved-merge.
- **Acceptance:** Explore + detail render from the API; login persists saves cross-device; approving a PENDING submission makes it appear on the public map; `POST /events` receives analytics.

### P3 — Genuine frontend fixes (items 3, 4, 9, 11)
- **(3) NEAR button** — `DesktopExplore.tsx`: wire the rail-head "Near" button to `geoStore.request()` (and/or make it the explicit re-sort-by-distance action); reflect `locating` state; if `permission==='denied'` show the error from P1/item 4.
- **(4) USE MY LOCATION error state** — extend `geoStore` to expose a denied/unsupported reason; render an inline error + retry on the `fg-geobanner` and a toast on deny. Keep the curated fallback.
- **(9) Verified timestamp** — add a real `verifiedAt` ISO field to the DTO; format relative time on the client (e.g. `Intl.RelativeTimeFormat`); drop the hardcoded string. Pairs with P2.
- **(11) Active-filter chips** — replace the rail-head text line with removable pill chips (category / free / search), each ✕ clears just that facet; "Clear" clears all. Reuse `Chip`/fg tokens; URL stays `?cat=&free=1`.
- **Acceptance:** each interaction works desktop + mobile; build/tests green.

### P4 — Polish & cleanup (items 2, 5, 10, 12 + debt)
- **(2)** Decide hero treatment: keep riso hatch or switch `.fg-photo` placeholder to flat category fill + larger glyph. One CSS change in `atoms.css` + glyph size.
- **(5)** Give the derived "Free to play" guide a deliberate cover category/glyph.
- **(10)** Verify `RailList` passes `no={p.id}` so list № == detail №; fix if it's still the index.
- **(12)** Optional: add an "Add this spot" CTA to the search empty state.
- **Debt:** route-gate or delete `TokenProbe.tsx`; derive avatar initials from the auth user (not hardcoded `"M"`); bump `web/package.json` + CHANGELOG; tag a release.

---

## Suggested order
**P0 (redeploy) → P1 (map) → P3 (cheap FE fixes) → P2 (backend = MVP gate) → P4 (polish).**
P0/P1/P3 make the *deployed demo* honest in ~1 day. P2 is the multi-day MVP build. Don't redesign the working Explore slice.

---

## Paste-ready prompt for Claude Code

```text
You are a senior engineer picking up GemSpot. Read CONTEXT.md, docs/PROJECT-STATUS.md,
docs/gemspot_mvp_brief.md, docs/mvp-backend-plan-webapp-claude.md, skills/taste-skill.md,
skills/emil-kowalski-philosophy.md, and design_handoff_field_guide/field/fg.css FIRST,
then summarize what you learned.

CRITICAL CONTEXT: the live GitHub Pages site is STALE — most reported bugs are already
fixed in web/ and just not deployed. Do NOT start fixing blind.

PHASE 0 (do first): cd web && npm ci && npm run build (must be green), redeploy master via
.github/workflows/deploy.yml, then re-test the live URL and report which of these 13 items
STILL fail live: [paste the table above]. Only the still-failing ones are real bugs.

PHASE 1: produce a block plan (route, FSD paths, store/state, mock+HTTP seam, states:
loading/empty/error/permission/validation, acceptance criteria) for: P1 map-blank debug on
live HTTPS, P2 backend deploy (Postgres + NestJS + VITE_API_URL seam flip), P3 genuine FE
fixes (NEAR button, geo error state, dynamic verifiedAt, active-filter chips), P4 polish.
STOP for my approval before building.

Constraints: keep fg.css visuals (no new colors/fonts; category color = only taxonomy color;
--stamp = save-only), keep the DTO contract in web/src/shared/api/types.ts stable, keep
HashRouter + base '/gemspot/' + FSD, build + tests green after every block, append a durable
block entry to CONTEXT.md and a CHANGELOG entry per block. Both desktop AND mobile for every
screen. Don't redesign the working Explore slice.
```
