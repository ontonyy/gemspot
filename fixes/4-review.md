# GemSpot — MVP Fix Plan for Claude Code

> Reviewed **2026-06-06** against the live site `https://ontonyy.github.io/gemspot/#/explore`,
> the `web/` + `backend/` codebase, `docs/`, `skills/`, and the `GemSpot Field Guide.html`
> design reference. This supersedes the earlier `GemSpot MVP Gap Review + Claude Code Plan.md`
> for the *operational* gaps — the frontend feature set is built; what's missing is **a live
> backend and the polish/auth that turns the prototype into a usable MVP**.

---

## TL;DR — the one root cause behind almost every complaint

**The live site is still running on the in-memory MOCK, not the real backend.**

`deploy.yml` builds with `VITE_API_URL: ${{ secrets.VITE_API_URL }}`. If that repo secret
is **unset** (or points at a backend that isn't deployed/awake), the whole app silently
falls back to the mock seam in `authApi.ts` / `placesApi.ts`. The mock:

- **hardcodes every user as `role: 'CLIENT'` and seeds NO admin** → admin login is *structurally impossible*;
- keeps users **in memory only** → register/login is lost on refresh, never persists cross-device;
- **echoes saves** instead of storing them → no cross-device saves;
- has **no `/events` endpoint** → no analytics fire.

So "admin doesn't work", "sign-in is bad / doesn't persist", and "events don't fire" are
**all the same bug**: the backend isn't wired into the live build.

### Confirm in 60 seconds (do this first)
Open the live site → DevTools → **Network** tab → hard refresh (Ctrl+Shift+R):
- **No requests to an `onrender.com` (or your API) origin** → `VITE_API_URL` secret is unset → backend never wired. *(Most likely.)*
- **Requests exist but 503 / timeout / CORS error** → backend deployed but asleep (Render free tier cold-starts ~50s), crashed, or `CORS_ORIGIN` wrong.
- **Requests 200 but admin still fails** → backend up but admin not seeded / wrong creds / role not returned.

---

## Your 4 complaints → cause → fix

| # | What you reported | Real cause | Fixed in block |
|---|---|---|---|
| 1 | Sign in / register is bad; no Google / Facebook / Instagram login | (a) running on mock so it never persists; (b) **no social/OAuth login exists at all** — only an email+password form; (c) the form is plain/utilitarian vs the design | **B1 + B2** |
| 2 | Main page is bad vs the design | Live app drops you on bare `/explore`; the polished editorial landing from `GemSpot Field Guide.html` (hero, stats, map preview) was never shipped as the front door | **B4** |
| 3 | Search / Guides / Explore "not working", "no other options" | If `VITE_API_URL` is set but the backend is asleep/erroring, the http seam returns empty → blank Explore, empty Guides, dead search. If on mock, they *do* work but feel limited (single filter axis, derived guides) | **B0 + B3** |
| 4 | Admin username/password not working (`admin@gemspot.ee` / `admin1234`) | Mock can't do admin (role hardcoded CLIENT, no admin seeded). Real admin only exists once the backend is deployed **and** seeded with `ADMIN_EMAIL`/`ADMIN_PASSWORD` | **B0 + B5** |

---

## What is genuinely DONE (do not rebuild)

The frontend is far more complete than `PROJECT-STATUS.md` implies — these all exist in `web/src`:
Explore (map + clustering + rail + filter), spot detail + share + directions, report-a-problem,
save/collection, add-a-spot, guides, account menu, **email auth UI (`pages/Auth.tsx` + `authStore`)**,
**admin panel (`pages/admin/*`)**, **analytics `track()` (`shared/api/track.ts`)**, and the **http seam**
(`httpPlacesApi.ts`, `adminApi.ts`, `authApi.ts`). The backend (`backend/`, NestJS + Prisma) is built,
tested (33 tests), and has a `render.yaml` + seed (incl. admin) ready. **The wiring is the gap, not the code.**

---

# The plan — ordered by unblock value

Paste the block you're working on into Claude Code. After each: `npm run build` + `npm test` green,
append a durable entry to `CONTEXT.md`, add a `CHANGELOG.md` line, bump `web/package.json`.

---

## BLOCK 0 — Deploy the backend & flip the live site off mock *(unblocks #3 + #4, highest value)*

This is mostly **ops, not code** — but it's the MVP gate. Follow `render.yaml` + `backend/README.md` + `CONTEXT.md` "Block P2.2".

1. **Render → New → Blueprint → this repo.** It provisions `gemspot-db` (Postgres) + `gemspot-api` (Node web service, `rootDir: backend`).
2. Set the `ADMIN_PASSWORD` env var on the service (marked `sync:false`). Confirm `ADMIN_EMAIL=admin@gemspot.ee` (or set your own). `CORS_ORIGIN=https://ontonyy.github.io`.
3. First deploy runs `prisma migrate deploy` + `db:seed` (idempotent) → seeds the 10 spots **and** the admin user.
4. Verify the API directly (no frontend): `curl https://<api>.onrender.com/health` → `{status:'ok'}`; `curl …/places` → 10 spots; `POST …/auth/login` with the admin creds → returns a token with `role:'ADMIN'`.
5. **Wire the frontend:** GitHub repo → Settings → Secrets → Actions → add `VITE_API_URL = https://<api>.onrender.com`. Re-run the Pages deploy (push to `master` or `workflow_dispatch`).
6. **Acceptance:** live Explore + detail load from the API (10 spots on hard refresh); `POST /events` returns 201 in Network; admin login works (Block 5 covers the route).

> ⚠️ **Render free tier sleeps after ~15 min idle** → first request after idle cold-starts ~50s. This is the single biggest reason the live app looks "broken/empty". Block 3 makes that survivable; longer term, upgrade the service or add a cron ping.

---

## BLOCK 1 — Make the seam fail gracefully *(stops "everything is blank")* 

Right now once `VITE_API_URL` is set, a sleeping/erroring backend returns nothing and the UI just empties out — that's complaint #3.

1. In `httpPlacesApi.ts` / `authApi.ts`, **on network error / 5xx, fall back to the mock** for *read* paths (places, categories, guides) so the map is never blank, and surface a non-blocking toast ("Live data unavailable — showing samples"). Keep writes (auth, save, submit) strict.
2. Add real **loading / error / retry** states to Explore, Guides, Saved (skeletons already exist — wire an error variant with a Retry button that refetches).
3. Add a tiny **cold-start warmup**: fire a `GET /health` on app boot so the Render dyno is waking while the user reads the landing.
4. **Acceptance:** with the backend stopped, Explore still shows spots (from mock) + a toast; with it running, real data; no blank screens, ever.

---

## BLOCK 2 — Redesign the auth screen + add social login *(complaint #1)*

`pages/Auth.tsx` today is a bare email/password form. Two parts:

**2a — Polish the email form** to match the Field Guide direction (fg.css tokens, Bricolage/Hanken/Space Mono, the editorial framing). Add: inline validation, show/hide password, a clear "continue as guest" affordance, and the same warm restraint as the rest of the app. Honor `skills/taste-skill.md` + `emil-kowalski-philosophy.md` (motion, focus, empty/error states).

**2b — Social login.** Add provider buttons above the email form. Be realistic about what each provider actually offers:

- **Google — do this first.** Cleanest path. Google Identity Services (OAuth 2.0 / OIDC). Backend: add `GET /auth/google` + callback (or verify the Google ID token client-side and exchange it at `POST /auth/oauth/google`). Issue your own JWT on success.
- **Facebook — possible but heavier.** Requires a Meta app + Facebook Login product + app review for `email` scope before it works for non-test users. Backend mirrors the Google flow (`/auth/oauth/facebook`).
- **Instagram — ⚠️ set expectations.** There is **no general "Sign in with Instagram" for third-party login.** Instagram Basic Display is deprecated, and Instagram Login is for *business/creator API* access, not consumer SSO — it routes through Meta/Facebook Login. **Recommendation: drop the Instagram button** (or label it "via Facebook"). Don't promise a flow that doesn't exist.

> **Schema note:** add `provider` + `providerId` (nullable) to the `User` model and make `passwordHash` nullable for OAuth-only accounts; migration + seed update. Account-linking (same email across providers) is a known edge — decide explicitly (link by verified email, or keep separate).

- **Acceptance:** "Continue with Google" completes a real OAuth round-trip → app session persists across refresh and devices; Facebook works in test mode (note review requirement); Instagram is removed or honestly relabeled.

---

## BLOCK 3 — Fix Search / Guides / Explore "no other options" *(complaint #3, content side)*

Once Block 0+1 land, re-verify each on the live HTTPS site (not the preview iframe, which throttles map RAF):

- **Explore** — confirm 10 markers + rail render from the API. If empty, it's Block 0/1 (data), not Explore code.
- **Search** — today it only filters the Explore rail (name/area/tags) via `uiStore.searchQuery`. "No other options" = it's not global. Decide: keep rail-scoped (cheap) or make it search across guides + categories too. At minimum add a visible "no results" state + clear button.
- **Guides** — derived from categories (`placesApi.buildGuides()`), no CMS. If they look thin, that's by design. Either accept, or add 2-3 hand-curated editorial guides (a small content model). Confirm with the user before building a CMS.
- **Filters** — only category + free-text today. The data has `isFree` / `tags`; add a **Free** toggle (`?free=1`) as a second axis (it's listed in `PROJECT-STATUS` as already partway). Don't over-build facets.
- **Acceptance:** every nav destination renders real content with proper empty/loading states; search has a no-results state; at least the Free filter is live.

---

## BLOCK 4 — Ship the real landing / main page *(complaint #2)*

The polished front door already exists as a **static design** in `GemSpot Field Guide.html`
(editorial hero "Hidden city gems, spotted by locals.", `10 / 5 / 100%` stats, live map preview,
category grid). The live `Home.tsx` is a thinner version, and `/` may route straight to `/explore`.

1. Port the Field Guide landing into `Home.tsx` at full fidelity (hero, stats pulled from real counts, an interactive `SpotMap` preview that deep-links into `/explore`, category grid). Reuse fg.css atoms — **no new colors/fonts**, category color stays the only taxonomy color, `--stamp` save-only.
2. Make `/` render this landing (not redirect to `/explore`). Wire all CTAs into the map/add flows. Mobile layout required.
3. **Acceptance:** the live root URL matches the `GemSpot Field Guide.html` design quality; both desktop + mobile; no console errors.

---

## BLOCK 5 — Admin login + role plumbing *(complaint #4)*

Once the backend is live (Block 0) the admin user exists. Verify the frontend plumbs the role through:

1. `authApi` types already carry `role: 'CLIENT' | 'ADMIN'`. Confirm `/auth/login` + `/auth/me` return `ADMIN` for the seeded admin and that `authStore` persists it.
2. Confirm the `/admin/*` routes are **role-gated** (redirect non-admins) and that there's a way to *reach* admin after login (the consumer nav shouldn't expose it; a direct `/admin` URL or an item that appears only when `role==='ADMIN'`).
3. **Critical mock bug to fix even for local dev:** `mockAuthApi` always returns `role:'CLIENT'` and seeds no admin. Add a mock admin (e.g. login `admin@gemspot.ee` / `admin1234` → `role:'ADMIN'`) so the admin panel is demoable offline too.
4. **Acceptance:** admin logs in with the seeded creds → reaches `/admin` → **approves a PENDING submission → it appears on the public map**; a normal user cannot reach `/admin`.

---

## BLOCK 6 — Run the acceptance test (your handoff checklist)

On `https://ontonyy.github.io/gemspot/` after Blocks 0-5:
1. ☐ Explore + detail load from API — **10 spots**, hard refresh (Ctrl+Shift+R).
2. ☐ Register / login → **save persists across devices** (sign in on a second browser, saves are there).
3. ☐ Admin login (`admin@gemspot.ee` / `admin1234`) → **approve a PENDING submission → appears on public map**.
4. ☐ **Events fire** — `POST /events` returns 201 in the Network tab on map open / pin click / save.
5. ☐ Google social login completes a round-trip; auth survives refresh.

---

## Hard constraints (carry through every block)

- Keep the **fg.css "Spotter's Field Guide"** visuals — OKLCH tokens, Bricolage Grotesque / Hanken Grotesk / Space Mono. **No new aesthetic, fonts, or colors.** Category color is the only taxonomy color; `--stamp` is save-only.
- Keep the **DTO contract** (`web/src/shared/api/types.ts`) stable — backend conforms to the frontend shapes, not vice-versa.
- Keep the **`placesApi` / `authApi` seam** — swap mock↔http at the one export line.
- Keep **HashRouter + `base:'/gemspot/'`** (GitHub Pages) and the **FSD** structure.
- Every new screen needs **desktop + mobile** (wire mobile bottom-nav: Explore / Saved / Add / Guides / You).
- Honor `skills/taste-skill.md` + `skills/emil-kowalski-philosophy.md` on every new surface.

## Suggested order
**B0 (deploy) → B1 (graceful seam) → B5 (admin) → B3 (content/search) → B4 (landing) → B2 (auth + social).**
B0 alone fixes complaints #3 and #4 and most of #1. Do it first.
