# 010 — Footer info pages broken (About, Privacy, Bring GemSpot to your city, Report an issue)

Priority: P2 · Effort: M · Risk: LOW · Depends on: —

## Problem

Footer links are dead ends (confirmed in `web/src/pages/Home.tsx:175-202`):

- **About** → `navigate('/')` (no-op, lands on home)
- **Bring GemSpot to your city** → `navigate('/')`
- **Privacy** → `navigate('/')`
- **Report an issue** → `navigate('/add')` — WRONG target: `/add` is "Add a spot" contribution form, not issue reporting.

No routes/components exist for these pages (`web/src/app/router.tsx` has none).

## Fix direction

1. **Report an issue**: repoint. Existing per-spot report flow is `ReportModal` (reasons: closed / wrong-location / not-free / other) posting `POST /reports`. For a general (non-spot) issue, simplest correct option: link to a `mailto:` or a small `/feedback` page reusing report seam without `placeId` — check whether `createReport` requires `placeId` (`types.ts`, api). If backend requires placeId, use `mailto:` for MVP and note follow-up.
2. **New static pages**: add `About.tsx`, `Privacy.tsx`, `BringToYourCity.tsx` under `web/src/pages/static/` (or `pages/`), routes `/about`, `/privacy`, `/bring-your-city` in `router.tsx`. Reuse Home's chrome (header/footer) — check how Home composes layout vs `AppShell`.
3. Content: short placeholder-quality but real copy (project purpose, contact, privacy summary matching actual data practices: localStorage tokens, analytics `track.ts`, geolocation usage, Firebase hosting). For "Bring to your city": short pitch + contact CTA (mailto or form later).
4. Update footer links in `Home.tsx` to the new routes.

## Verify

- All four footer links navigate to real, styled pages; back navigation works (hash router).
- Direct deep links work: `#/about`, `#/privacy`, `#/bring-your-city`.
- `npm run build` passes; 404 catch-all still redirects to `/explore`.

## STOP conditions

- Privacy page must not overpromise (no claims of GDPR machinery that doesn't exist). Describe actual behavior only — verify against `authStore.ts`, `track.ts`, `geoStore.ts` before writing copy.

## Session blocks (2 fresh sessions)

Branch: `BP-NA-gemspot-web-static-pages` off `master`.

Shared preamble (both blocks):
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-static-pages (create off master; block 2 resumes it)
Task anchor: plans/010-static-info-pages.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

### Block 1 — routes + pages skeleton (parallelization: none)

Prompt 1.1: Use shared preamble. Read plans/010 plan, `Home.tsx` footer + layout composition, `router.tsx`. Create the three static page components + routes, wire footer links. Minimal real copy; match fg-* visual language.

Prompt 1.2: Verify routes deep-link + build. Append short status note to this plan file (Done/what changed). Stop.

### Block 2 — Report an issue target (resumed; parallelization: none)

Prompt 2.1: Use context-refresher first (read this plan + block 1 status), then engineering-task-memory-orchestrator. Check `createReport` seam for placeId requirement; implement chosen "Report an issue" target (repointed link + mailto or minimal /feedback).

Prompt 2.2: Verify + build. Update plan status. Stop.

## Block 1 status

Done (2026-07-05, branch `BP-NA-gemspot-web-static-pages`). Changed files:

- `web/src/pages/static/About.tsx`, `Privacy.tsx`, `BringToYourCity.tsx` — new, AppShell + `fg-page`/`fg-static` scaffold
- `web/src/app/router.tsx` — routes `/about`, `/privacy`, `/bring-your-city`
- `web/src/pages/Home.tsx` — footer About / Bring / Privacy repointed (Report an issue untouched — block 2)
- `web/src/shared/styles/atoms.css` — `.fg-static*` prose styles

Privacy copy verified against `authStore.ts` (localStorage `gemspot.auth` tokens), `savedStore.ts` (guest saves local-only), `track.ts` (first-party `/events`, no 3rd-party), `geoStore.ts` (on-demand geolocation, local-only, Tallinn fallback). Verified in browser: deep links, footer nav, back nav, `*`→`/explore`; `npm run build` passes. Contact uses `hello@gemspot.app` placeholder mailto.

## Block 2 status

Done (2026-07-05). Choice: **mailto MVP**. Rationale: `ReportInput.placeId` is required (`web/src/shared/api/types.ts:69`, non-optional), `POST /reports` seam is spot-scoped (`httpPlacesApi.ts:91`) — no placeless report path. Footer "Report an issue" in `Home.tsx` now `href="mailto:hello@gemspot.app?subject=GemSpot issue report"` (was `navigate('/add')`). Verified in browser; `npm run build` passes.

Follow-up: a placeless `/feedback` page needs a backend seam (optional `placeId` on reports or dedicated feedback endpoint).
