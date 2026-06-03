# GemSpot — MVP Gap Review & Claude Code Plan

> Reviewed: live site `https://ontonyy.github.io/gemspot/#/explore` (v0.2.0) + the
> `web/` codebase + `docs/` + `skills/` + `design_handoff_field_guide/`.
> This is the source-of-truth handoff for the next Claude Code session. It says what
> is **done**, what is **missing/wrong for MVP** (mapped to your own
> `docs/gemspot_mvp_brief.md`), and a **block-structured build plan** to finish it.

---

## TL;DR

The **Explore slice is genuinely well-built** and matches the "Spotter's Field Guide"
direction: map + clustering, category filter, rail, geo/distance states, spot-detail
panel, directions deep-links, saved, guides, add-spot form, account menu — all on
GitHub Pages with a clean mock `placesApi` seam and a real DTO contract.

But it is a **frontend prototype on mock data**, not an MVP. Against your own
`gemspot_mvp_brief.md` must-have list, the product is missing the things that make it
a *product*: **share, report-a-problem, real backend + persistence, auth, an admin /
moderation panel, photo upload, and analytics events**. Three of these (share, report,
free-filter) are cheap frontend fixes; the rest are the actual MVP build.

---

## Status vs your MVP must-haves (`docs/gemspot_mvp_brief.md`)

| MVP must-have | Status | Evidence |
|---|---|---|
| Interactive map + categories | ✅ Done | `widgets/map/SpotMap.tsx`, `features/explore/Legend.tsx` |
| Place card (name, cat, area, tags, freshness) | ✅ Done | `entities/place/SpecimenCard.tsx`, `RailCard.tsx` |
| Place detail panel | ✅ Done | `features/place-detail/SpotDetail.tsx` |
| Save / favourite | 🟡 Local only | `savedStore` → localStorage; no account, lost on device change |
| **Share link to a place** | ❌ **Inert** | Share button in `SpotDetail.tsx` has **no onClick**; no `navigator.share`/clipboard anywhere. Deep-link route `/spot/:slug` exists, so a *pasted* URL works — but nothing copies it. |
| "Open route" deep-link | ✅ Done | Apple/Google menu in `SpotDetail.tsx` |
| Add-a-spot form | 🟡 Session only | `pages/AddSpot.tsx` → `submissionsStore`; **dies on refresh**, photos counted not uploaded |
| **Report error / outdated** | ❌ **Missing** | No Report entity, route, or form anywhere |
| Base filters (free / outdoor / quiet / near me) | ❌ **Missing** | Only single-select category + free-text search. `isFree`/`tags` exist in data but no filter UI |
| **Basic auth (guest + login)** | ❌ **Stub** | Account menu is a client stub; "Sign in" is disabled; no auth store, no token, no `VITE_API` |
| **Real backend + persistence** | ❌ **Not started** | 100% mock `placesApi`; no `fetch`/`axios`/`VITE_API` in the codebase |
| **Admin / moderation panel** | ❌ **Missing** | Submissions go to PENDING with **nowhere to approve/reject**; no dashboard, no places mgmt |
| **Analytics events** | ❌ **Missing** | None of the 16 events in the brief (`map_opened`, `pin_clicked`, `place_saved`, …) are instrumented |
| Collections / guides | ✅ Done (derived) | `placesApi.buildGuides()` — derived from places, no CMS |
| Real place photos | ❌ Placeholder | Detail hero is a riso placeholder ("PHOTO n/3 — drop image"); no image assets |

Legend: ✅ done · 🟡 partial / prototype-only · ❌ missing or broken.

---

## The 3 cheap wins (frontend-only, do these first)

These are on the MVP must-have list, need **no backend**, and are small. Knock them
out before the backend work so the deployed prototype is actually demo-complete.

1. **Wire Share.** `SpotDetail.tsx` share button → `navigator.share()` with
   clipboard fallback that copies the canonical deep link
   (`${window.location.origin}${import.meta.env.BASE_URL}#/spot/${slug}`) and fires a
   toast ("Link copied"). Add the same affordance to `RailCard`/`SpecimenCard` if you
   want share-from-list. ~30 min.

2. **Report-a-problem flow.** Add a small "Report / outdated" action on the detail
   panel → lightweight modal (reason radio: *closed · wrong location · not free
   anymore · other* + optional note) → `placesApi.createReport()` mock seam (mirror
   `createSubmission`) → toast + store in a `reportsStore` so it shows in Account.
   This is MVP UGC #2 and currently 100% absent. ~half day.

3. **Base filters.** Add a free/outdoor toggle row (start with **Free** — `isFree`
   already exists; "near me" sort already exists) as a second filter axis next to the
   category Legend. Keep it URL-driven like `?cat=` (`?free=1`). Don't over-build —
   the brief only asks for a handful of facets. ~half day.

> Constraints for all three: stay 1:1 on `fg.css` tokens (no new colors/fonts),
> category color stays the only taxonomy color, `--stamp` stays save-only, honor
> `skills/taste-skill.md` + `emil-kowalski-philosophy.md` for the modal motion/empty
> states. Build stays green (`npm run build` + `npm test`).

---

## The real MVP: backend + auth + admin (the Phase-2 build)

Everything above is polish on a mock. The MVP gate is **Phase 2** from your own brief:
real backend, CRUD, persistence, moderation, events. The plan and DTO contract already
exist — wire to them, don't redesign.

### Block A — Backend scaffold (Node + TS + Prisma + PostgreSQL on Render)
Follow `docs/mvp-backend-plan-webapp-claude.md` verbatim (it's already validated).
- NestJS (or Express) + Prisma + Postgres. Layered structure: `api / application /
  domain / infra / contracts`.
- Prisma schema: `users, profiles, places, categories, place_categories,
  saved_places, submissions, submission_photos, reports`, enums `UserRole`,
  `PlaceStatus (draft|pending|approved|rejected|archived)`.
- Implement endpoints exactly to the **DTO contract the frontend already codes to**
  (`PlaceCardDto` / `PlaceDetailDto` / `CategoryDto` / `SavedPlaceDto` /
  `SubmissionDto`) — see `web/src/shared/api/types.ts`. **Do not change DTO shapes.**
- Seed the 10 Tallinn spots from `web/src/shared/api/placesApi.ts` `RAW[]` so the live
  map looks identical after the swap.
- `GET /health`, CORS for the Pages origin, env-driven (`DATABASE_URL`, `PORT`,
  `JWT_*`, `CORS_ORIGIN`). README run guide.
- **Acceptance:** `GET /places`, `/places/:slug`, `/categories` return the same JSON
  shape the mock returns today.

### Block B — Frontend swaps mock → HTTP behind the existing seam
- `placesApi.ts` already declares `interface PlacesApi` and ends with the swap comment
  `// later: export const placesApi = httpPlacesApi`. Implement `httpPlacesApi`
  (fetch-based, reads `VITE_API_URL`) and flip the one export line. **Zero call-site
  changes** — that's the whole point of the seam.
- Add `.env` (`VITE_API_URL`) + a CI secret for the deployed API URL.
- Keep mock as the fallback when `VITE_API_URL` is unset (good for offline dev/preview).
- **Acceptance:** Explore + detail render from the real API on the live site; mock path
  still works with no env.

### Block C — Auth (guest browse + email login)
- `POST /auth/register|login|refresh|logout`, `GET /auth/me` (JWT access + refresh).
- Frontend `authStore` (Zustand) + token storage; wire the disabled "Sign in" in
  `AccountMenu.tsx` to a real login screen. **Guest stays the default** — browsing the
  map needs no account.
- Gate **save** and **submit/report** behind auth (prompt to sign in on action).
  Migrate `savedStore` (localStorage) → server `saved_places` when logged in; keep
  local saves for guests and merge on login.
- **Acceptance:** guest can browse; sign-in persists saves across devices; `POST
  /places` and `/saved` reject unauthenticated.

### Block D — Real submissions + photo upload
- `AddSpot.tsx` and the new Report flow post to the real API; submissions persist as
  `PENDING` and survive refresh.
- Photo upload: real multipart upload to object storage (Render disk / S3-compatible /
  Cloudinary). Replace the "previews only — not uploaded" note.
- **Acceptance:** a submitted spot appears in the moderation queue (Block E) and
  survives a reload.

### Block E — Admin / moderation panel (operational must-have)
Per `docs/gemspot_design_brief_for_claude.md` admin section — **separate from the
consumer nav**, more utilitarian (left sidebar + tables + detail drawer), but visually
related (same tokens). This is the operational gate: right now PENDING submissions go
nowhere.
- Routes under `/admin` (role-gated): **Dashboard** (DAU/new spots/pending count/top
  categories/top by opens·saves·shares), **Moderation queue** (approve/reject
  submissions + edit reports → flips `PlaceStatus`), **Places management** (list +
  status + quick-edit coords/category/tags/flags), **Users**, **Content analytics**.
- Start with **Moderation queue** (smallest path to "submissions actually become live
  places") then Dashboard, then the rest.
- **Acceptance:** approving a PENDING submission makes it appear on the public map.

### Block F — Analytics events (instrument from day one)
- Implement the brief's event list (`app_opened, map_opened, category_selected,
  filters_applied, pin_clicked, place_opened, place_saved, place_shared, route_opened,
  submission_started, submission_sent, submission_approved/rejected, report_sent,
  collection_opened, signup_completed`) + dimensions (device, lang, guest/auth,
  category, area).
- Thin `track(event, props)` util → `POST /events` (or a provider). Fire from the
  existing call sites (save toggle, share, directions click, pin click, filter change).
- **Acceptance:** the admin dashboard reads real event counts.

---

## Smaller fixes / debt worth flagging

- **Avatar is hardcoded `initials="M"`** (`AppShell.tsx`) — derive from the auth user
  once Block C lands.
- **`verifiedAt` is a mock string** ("12 days ago"), not a timestamp — switch to a real
  date + relative-format on the client when the backend lands.
- **`TokenProbe.tsx`** dev page is still in the tree — remove or route-gate before
  launch.
- **Landing/home** — `/` redirects straight to `/explore`. The brief lists a landing
  screen; for a map-first MVP this is arguably fine. **Decide explicitly** rather than
  leave it implicit — if you want one, it's a separate small block.
- **`docs/05` says Spring/MySQL** but `CONTEXT.md` decision overrides to
  **Node/Prisma/Postgres** — make sure the Claude Code session reads `CONTEXT.md`'s
  decisions, not the stale `docs/05` stack note (DTO shapes from `docs/05` still hold).

---

## Suggested order (smallest risk → biggest value)

1. **Cheap wins** (Share, Report, Free filter) — finishes the *frontend* MVP loop, no backend, ~1.5 days.
2. **Block A + B** (backend + HTTP swap) — turns the prototype into a real app.
3. **Block C** (auth) — unlocks real saves/submissions.
4. **Block D** (submissions + photos) — real UGC.
5. **Block E** (admin/moderation) — operational gate; submissions become live.
6. **Block F** (analytics) — measure the MVP hypotheses the brief cares about.

After each block: `npm run build` + `npm test` green, append a durable entry to
`CONTEXT.md` (same cadence as the existing block log), add a `CHANGELOG.md` entry, bump
`web/package.json` version, tag a release. Keep HashRouter + `base:'/gemspot/'`, FSD
structure, and the fg.css visual direction throughout. Don't redesign the working
Explore slice.

---

## Hard constraints to carry through every block (do not violate)

- Keep the approved **fg.css "Spotter's Field Guide"** visuals (OKLCH tokens,
  Bricolage/Hanken/Space Mono). No new aesthetic, no new fonts, no new colors.
- **Category color is the only taxonomy color; `--stamp` is the only save accent.**
- Keep the **DTO contract** (`web/src/shared/api/types.ts`) stable — backend conforms
  to the frontend's existing shapes, not the other way around.
- Keep the **`placesApi` seam** — swap mock→http at the one export line.
- Both **desktop + mobile** layouts for every new screen (the app has
  `useIsMobile()`/`MobileExplore`/`MobileNav` — wire new destinations into the bottom
  nav).
- Honor `skills/taste-skill.md` + `skills/emil-kowalski-philosophy.md` (motion, empty
  states, focus, restraint) on every new screen.
