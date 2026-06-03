# GemSpot — Claude Code prompt: diagnose & finish the broken/stub features

> Paste everything inside the code block below into Claude Code, run from the repo root.
> Контекст: только Explore slice реально собран. Saved / Guides / Add / Account — мёртвые заглушки. Search вроде подключён. Сначала проверить вживую, потом чинить. Не переделывать рабочий Explore.

```text
You are a senior frontend engineer picking up the GemSpot codebase. Your job is to
DIAGNOSE and then FINISH the features that don't work — not to redesign anything.

═══════════════════════════════════════════════════════════════════════
PHASE 0 — ORIENT (read before touching code; do not skip)
═══════════════════════════════════════════════════════════════════════
Read these first, in order, and summarize back to me what you learned:
  1. CONTEXT.md  — block-by-block build log + decisions. THE source of truth for
     what is built vs deferred. Note especially the Block 6 line:
     "Deferred (not started): Add-a-spot flow, Home/Guides/Saved pages, account
      menu, backend. Account avatar + top-nav Saved/Guides + mobile Add/Guides/You
      are static stubs."
  2. web/CHANGELOG.md
  3. skills/taste-skill.md  and  skills/emil-kowalski-philosophy.md
     — these define the design taste/interaction bar. Honor them on every new screen.
  4. design_handoff_field_guide/field/fg.css + fg-app.jsx — the canonical visual
     direction ("Spotter's Field Guide"). All new UI must match it 1:1 (OKLCH tokens,
     Bricolage/Hanken/Space Mono, the single warm --stamp accent = "saved" only,
     category color is the ONLY taxonomy color).
  5. docs/05 (domain/data model/API) and docs/mvp-backend-plan-webapp-claude.md
     for the DTO contract (PlaceCardDto / PlaceDetailDto / CategoryDto / SavedPlaceDto).
  6. The live code paths: web/src/app/router.tsx, web/src/app/AppShell.tsx,
     web/src/pages/Explore.tsx, web/src/shared/store/{savedStore,uiStore}.ts,
     web/src/features/**, web/src/shared/api/placesApi.ts.

Hard constraints (carry through every phase):
  - Keep the approved fg.css visual direction. Do NOT invent a new aesthetic.
  - Frontend only. Keep the mock `placesApi` seam and the DTO shapes as the stable
    contract. No backend, no auth server this pass (Account = client stub is fine).
  - Keep HashRouter + base '/gemspot/' (GitHub Pages). Don't switch routers.
  - Keep FSD structure (app/pages/widgets/features/entities/shared).
  - `npm run build` must stay green (tsc + vite) and `npm test` must pass after every block.

═══════════════════════════════════════════════════════════════════════
PHASE 1 — REPRODUCE & DIAGNOSE (confirm; don't trust the notes blindly)
═══════════════════════════════════════════════════════════════════════
Check BOTH the live site (https://ontonyy.github.io/gemspot/#/explore) and a local
`cd web && npm install && npm run dev`. Open the browser console on each route.

For each item below, report: does it work? what's the exact root cause? which file/line?

  A. MAIN PAGE (/explore) — Suspected WORKING but verify.
     - Does the page render? Any console errors? Do MapLibre/OpenFreeMap tiles load
       on the LIVE https site (geolocation + tiles need HTTPS; the preview iframe
       throttles RAF so tiles look blank there — that's NOT a real bug)?
     - Confirm the category chips, rail list, and /spot/:slug detail panel work.
     - If anything is actually broken, capture the console error verbatim.

  B. SAVED (top-nav "Saved") — Suspected NOT BUILT.
     - Expected finding: no `/saved` route in router.tsx; AppShell's nav calls
       `onNavigate`, but Explore.tsx passes `onNavigate={() => setCat(null)}`, so the
       button just clears the filter and navigates nowhere. savedStore already
       persists ids to localStorage — the data layer exists, the page does not.

  C. GUIDES (top-nav "Guides") — Suspected NOT BUILT.
     - Expected: no `/guides` route; same dead `onNavigate`. No content/data model
       for guides exists yet — flag this as a product decision (see Phase 2).

  D. SEARCH (top-bar input) — Suspected WIRED; confirm.
     - It flows AppShell `onQuery` → uiStore.searchQuery → useExploreList (filters
       name/area/tags). Verify it actually filters the rail live. If it "doesn't
       work," determine whether it's a real bug or an expectation gap (it only
       filters the Explore list; it is not global search). Report which.

  E. ACCOUNT (avatar, top-right) — Suspected STUB.
     - Expected: `<Avatar>` has no onClick / no menu. No auth store. Decide scope in
       Phase 2 (client-only menu vs. real auth — default to client-only this pass).

  F. ADD A SPOT (top-bar button + mobile nav) — Suspected NOT BUILT.
     - Expected: Explore.tsx never passes `onAdd` to AppShell, so the button is inert.
       No submission route, form, or PENDING-submission flow exists. The domain has a
       "Submission" entity (PENDING → admin approves → Place) — see CONTEXT/docs.

═══════════════════════════════════════════════════════════════════════
PHASE 2 — WRITE THE PLAN (and STOP for my approval before building)
═══════════════════════════════════════════════════════════════════════
Produce a concrete, block-structured plan in the same style as CONTEXT.md's build
log. For EACH feature give: route, new components (FSD path), store/state, data seam
(mock placesApi method + DTO), key states (loading / empty / error / permission /
validation), and acceptance criteria. Cover:

  1. Wire navigation properly first (smallest fix, unblocks everything):
     - Add `/saved` and `/guides` routes; make AppShell nav use real navigation
       (NavLink / navigate) instead of `setCat(null)`; pass `onAdd` and an account
       handler from the page level. Keep `route` highlight in sync with the URL.
  2. SAVED page: list of saved spots from savedStore (reuse RailCard/SpecimenCard),
     empty state ("no saved spots yet"), remove-on-unsave, count badge already exists.
  3. ADD-A-SPOT flow: route + form (name, category, location pick on map, field note,
     photos optional), client-side validation + error states, submit → optimistic
     "PENDING / pending moderation" toast, store the submission in a mock seam
     (mockPlacesApi.createSubmission) so it survives the session. No real upload.
  4. ACCOUNT: client-only menu (profile stub, "my submissions", saved shortcut,
     sign-in placeholder). Explicitly mark real auth as out of scope this pass.
  5. GUIDES: propose the minimum viable shape (e.g. curated category/area collections
     from existing mock places) since no guide content model exists — ask me to
     confirm scope before building. Don't invent a CMS.
  6. SEARCH: only if Phase 1 found a real bug, include the fix; otherwise note it works.

For every new screen, apply skills/taste-skill.md and emil-kowalski-philosophy.md
(motion, empty states, focus, restraint) and reuse fg.css tokens/atoms — no new colors,
no new fonts, category color stays the only taxonomy color, --stamp stays save-only.

Wait for my approval of the plan before writing feature code.

═══════════════════════════════════════════════════════════════════════
PHASE 3 — IMPLEMENT (block by block, after approval)
═══════════════════════════════════════════════════════════════════════
  - Do it in the same incremental "block" cadence as CONTEXT.md. After each block:
    run `npm run build` + `npm test`, append a durable block entry to CONTEXT.md, and
    add a CHANGELOG.md entry. Bump web/package.json version when you cut a release.
  - Mobile + desktop both (the app has useIsMobile()/MobileExplore — every new screen
    needs both layouts and the mobile bottom-nav wired: Explore/Saved/Add/Guides/You).
  - End state: build green, all six items work on the live GitHub Pages URL, console
    clean. Verify geolocation + tiles on the real HTTPS deploy, not just locally.

Deliverable for each phase: a written report (Phase 1 diagnosis table, Phase 2 plan,
Phase 3 block log). Be concrete, cite file paths, and don't drift into a redesign.
```
