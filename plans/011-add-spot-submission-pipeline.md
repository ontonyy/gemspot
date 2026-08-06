# 011 — "Add a spot": submit button not working + nothing reaches admin moderation

Priority: P1 · Effort: M-L · Risk: MED · Depends on: —
Status: DONE — merged to master 2026-08-06 as `7c2f235` (PR #26, squash of `deabb95`).
API deploy green; the admin-queue 500 fix is live on Cloud Run. Follow-up `786c960` (PR #27)
fixed a lint-gate failure this change surfaced in `AdminModeration.tsx` — see plans/004.

## Problem (user report, production gemspot.web.app)

1. Pressing submit on `#/add` does nothing (or silently fails).
2. Admin panel moderation queue (`#/admin/moderation`) shows nothing to verify.

## Known architecture (from source)

- Form: `web/src/pages/AddSpot.tsx` — `submit()` at lines 78-100 → `placesApi.createSubmission(…)` → `POST /submissions` via `httpPlacesApi` when `VITE_API_URL` set, else in-memory mock.
- Writes are STRICT (no mock fallback) — if API down/unreachable, submission fails; check how the error surfaces (toast? swallowed?).
- Success path: `submissionsStore.add(sub)`, toast "Spot submitted · pending moderation", redirect `/explore`.
- Admin queue: `AdminModeration.tsx` → `adminApi.listSubmissions(token,'PENDING')` → `GET /admin/submissions?status=` on the Spring API (`api/.../SubmissionsService.java`, `AdminService.java`).
- Auth: `/add` is auth-gated; submit needs valid access token; 401→refresh→retry seam in `httpPlacesApi.ts:21-35` is untested (plan 005).
- Deploy: `VITE_API_URL` injected in `.github/workflows/deploy-web.yml` from secret (Cloud Run). Possible stale/dead backend URL — README mentions both Cloud Run and onrender.com (see plans/README "Deploy-target source of truth").

## Diagnosis first — do NOT fix blind

Likely causes, in probability order:
1. Backend unreachable/dead (`VITE_API_URL` stale, Cloud Run service down/cold-fail) → POST /submissions fails.
2. Error swallowed in `submit()` → button appears dead (no toast/disabled state feedback).
3. Photo upload step (`placesApi.uploadPhoto`) fails first and blocks submit.
4. Auth token expired + refresh seam broken (plan 005 territory).
5. Validation silently blocks (name/category/location unset) with no visible error.

Diagnosis steps:
- Reproduce on prod with devtools: network tab for `POST /submissions` (status? CORS? never fired?), console errors.
- Read `submit()` + `httpPlacesApi.createSubmission` error handling paths.
- Hit API health endpoint directly (find base URL: check GH secret name/workflow, `web/.env.example`, `api/README.md`).

## Fix direction (after diagnosis)

- Whatever root cause: ALSO fix the UX so failures are visible — error toast + button loading/disabled state + inline validation messages in `AddSpot.tsx`.
- If backend down: restore/redeploy API or correct `VITE_API_URL` secret; verify `POST /submissions` → row appears in `GET /admin/submissions?status=PENDING`.
- End-to-end acceptance: submit spot on prod (or staging) as normal user → appears in admin PENDING queue → approve → spot becomes ACTIVE and visible on map.

## STOP conditions

- Do not change API contracts without checking `api/` Spring DTOs.
- If root cause is infra (dead Cloud Run service, secrets), stop and surface to user before touching GH secrets/deploys — deploy changes are user's call.

## Session blocks (2 fresh sessions)

Branch: `BP-NA-gemspot-web-add-spot-submit` off `master`.

Shared preamble (both blocks):
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-add-spot-submit (create off master; block 2 resumes it)
Task anchor: plans/011-add-spot-submission-pipeline.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

### Block 1 — diagnose (parallelization: read-only subagent wave allowed)

Prompt 1.1: Use shared preamble. Use superpowers:systematic-debugging. Diagnose why submit fails: read `AddSpot.tsx` submit path, `placesApi.ts`/`httpPlacesApi.ts` write + error handling, auth refresh seam; determine live `VITE_API_URL` source (`deploy-web.yml`, `.env.example`) and probe API reachability. May spawn ≤3 read-only subagents (frontend path / api path / deploy config) returning compact summaries; main agent merges.

Prompt 1.2: Write diagnosis into this plan file under "## Diagnosis result" (root cause, evidence, chosen fix scope). Stop — no code changes in this block.

## Diagnosis result (2026-07-05, block 1)

### Root cause

**Not infra.** Prod frontend is correctly wired to a live, healthy API. Root cause is client-side:

1. **Primary: `AddSpot.tsx` `submit()` (lines 80–102) has `try…finally` with NO `catch`.** Any error thrown by `placesApi.createSubmission()` is swallowed: no error toast, no console-visible UX, button just reverts to "Submit spot". Failure is invisible → user perceives "submit does nothing", and since the POST never succeeded, nothing appears in admin PENDING queue.
2. **Most likely actual thrown error: 401 auth chain.** API enforces JWT on `POST /submissions` (verified: unauthenticated POST → 401). Access token is 15-min-lived; if refresh fails or refresh token absent/expired, `authedFetch` (httpPlacesApi.ts:21–35) returns the 401 Response, `postJson` throws (`httpPlacesApi.ts:67`), and the error dies in the missing catch. `refreshSession()` (authStore.ts:210–226) also silently clears all tokens on failure → user silently logged out mid-submit.
3. **Secondary swallow: `AdminModeration.tsx:26`** — `.catch(() => undefined)` on `listSubmissions`; queue shows empty on any fetch/auth error with zero feedback.

### Evidence

- **Infra healthy** (live probes):
  - Prod bundle (`gemspot.web.app` → `/assets/index-_KgpALO5.js`) has `https://gemspot-api-1017776835940.europe-north1.run.app` baked in — `VITE_API_URL` repo variable was set at build time (`deploy-web.yml:33`). Mock-mode hypothesis eliminated.
  - `GET {cloud-run}/health` → 200 `{"status":"ok"}`.
  - `POST {cloud-run}/submissions` unauthenticated with `Origin: https://gemspot.web.app` → 401 with correct CORS headers (`access-control-allow-origin: https://gemspot.web.app`, credentials allowed). CORS hypothesis eliminated.
- **Code**: `AddSpot.tsx:85–101` try/finally, no catch (verified in main session, not just subagent). `httpPlacesApi.ts:54–68` throws on `!res.ok`. Writes have no mock fallback (`placesApi.ts` gracefulHttpPlacesApi — reads only).
- **DTO contract fine**: `SubmissionInput` (types.ts) matches `SubmissionInputDto` (api) field-for-field; no mismatch.
- **Stale doc**: `api/README.md:24` claims live URL `https://gemspot-api.onrender.com` — that host times out (dead/suspended Render). Real deploy is Cloud Run `gemspot-api`, `europe-north1` (`deploy-api.yml`). README needs fix.

### Chosen fix scope (block 2)

Frontend only, no API contract changes, no deploy/secret changes:

1. `AddSpot.tsx`: add `catch` → error toast (distinguish 401 "session expired, sign in again" vs generic failure), keep button loading/disabled state, keep inline validation messages visible.
2. `AdminModeration.tsx`: replace silent `.catch(() => undefined)` with visible error state.
3. Consider: on 401-after-failed-refresh, redirect to sign-in with return path (matches silent-logout behavior in authStore).
4. Docs: correct `api/README.md:24` stale onrender URL → Cloud Run.
5. Verify end-to-end per plan acceptance (submit → PENDING queue → approve).

### Block 2 — fix + verify (resumed; parallelization: none)

Prompt 2.1: Use context-refresher first (read this plan incl. Diagnosis result), then engineering-task-memory-orchestrator. Implement fix per diagnosis + always add visible failure UX (error toast, loading state, inline validation) in `AddSpot.tsx`.

Prompt 2.2: Verify end-to-end: submission POST succeeds (local api or staging), appears in admin PENDING queue, approve works. `npm run build` + tests. Update plan status. Stop.

## Fix result (block 2, 2026-07-05)

### Second root cause found during verification (was NOT in the diagnosis)

E2E against a real local API (Testcontainers-style Postgres in Docker) exposed a
**server-side 500** that the client-only diagnosis missed:

- `GET /admin/submissions?status=PENDING` → **500 `LazyInitializationException`**
  (`AdminService.listSubmissions`, api line ~89: `r.getPhotos()` lazy collection
  read outside any transaction). The moderation queue never loads in prod.
- Why the test suite missed it: `ContractIntegrationTest` is `@Transactional`, so
  a Hibernate session stays open for the whole test and the lazy read succeeds —
  masking the prod failure path entirely.
- **This is the real "nothing reaches admin moderation" cause.** The submission
  *did* persist (POST /submissions → 201, row PENDING), but the admin queue fetch
  500'd and `AdminModeration.tsx`'s `.catch(() => undefined)` swallowed it →
  admin saw an empty queue with zero feedback. Combined with the client-side
  swallow on the submit side, both halves of the user report were invisible.

### Changes

Frontend (visible-failure UX, per plan requirement):
- `web/src/pages/AddSpot.tsx` — added `catch` to `submit()`: 401 → toast "Session
  expired — sign in to submit" + redirect to `/auth`; other errors → inline
  error banner + toast. Kept existing loading/disabled button state and inline
  validation (name/category/note). New `submitError` state + `role="alert"` banner.
- `web/src/pages/admin/AdminModeration.tsx` — replaced silent
  `.catch(() => undefined)` on the queue load with a visible error banner + Retry.

Backend (the actual 500 fix):
- `api/.../service/AdminService.java` — `listSubmissions` now
  `@Transactional(readOnly = true)` so the lazy `photos` read has a session.
- `api/.../integration/AdminSubmissionsListRegressionTest.java` — NEW,
  deliberately non-transactional (the only way to reproduce), self-cleaning.
  Verified: FAILS without the fix, PASSES with it.

Docs:
- `api/README.md` — corrected stale `gemspot-api.onrender.com` (dead host) →
  actual Cloud Run URL.

### Verification

- **E2E (local API + Postgres)**: register → `POST /submissions` 201 (PENDING) →
  `GET /admin/submissions?status=PENDING` 200 (submission + photoUrls present) →
  `POST /admin/submissions/{id}/approve` 200 → place appears ACTIVE in
  `GET /places`. Full round-trip green.
- **web**: `npm run build` ✓, `npm run test` ✓ (20 passed).
- **api**: full `./gradlew test` → new regression test passes; AdminService fix
  in place. Two FAILURES are **pre-existing and unrelated** (confirmed by running
  on stashed master): `UploadsAuthMultipartTest.authedHandlerThrowsSurfacesRealStatusNot401`
  (409 duplicate-register from shared-container test isolation) and
  `SchemaAndSeedIntegrationTest` (order-dependent seed count). Spawned a separate
  task to fix test isolation — not part of this pipeline fix.

### Not committed — user's call.
