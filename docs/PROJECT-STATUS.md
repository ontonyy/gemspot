# GemSpot — Project Status

> Spotter's Field Guide to Tallinn. Map-first UGC app: discover / save / submit outdoor spots
> (ping-pong, hoops, football, tennis, padel, viewpoints, sakura).
> Last updated: 2026-08-06 · web `v0.2.11`.

**This file is a pointer, not a second source of truth.** The authoritative description of the
service lives in [`docs/service-context/`](service-context/README.md), which is generated from
the code and grep-verified. Everything below is either a link into that pack or a fact the pack
deliberately does not carry (ownership, open work, launch gaps).

An earlier version of this file described a NestJS + Prisma + Render backend on GitHub Pages.
That stack was replaced — see [ADR 0001](adr/0001-rewrite-backend-nestjs-to-spring.md). None of
it survives in the repo.

---

## Stack (one line each — details in the pack)

| Part | What it is | Where it runs | Doc |
|---|---|---|---|
| `api/` | Spring Boot 3.5.6, Java 25, Gradle. 11 REST controllers, 38 endpoints | Google Cloud Run, `europe-north1` | [HTTP.md](service-context/HTTP.md) |
| `web/` | React 19 + Vite + TS, feature-sliced, HashRouter, base `/` | Firebase Hosting → `https://gemspot.web.app` | [WEB.md](service-context/WEB.md) |
| Database | PostgreSQL (Supabase, pooler `:6543`, direct `:5432`), Liquibase owns DDL | Supabase `eu-north-1` | [DATA.md](service-context/DATA.md) |
| Photos | Supabase S3-compatible bucket `place-photos` | Supabase | [DEPENDENCIES.md](service-context/DEPENDENCIES.md) |
| Auth | Custom dual-token JWT + refresh-reuse detection; Google + Facebook OAuth | — | [HTTP.md](service-context/HTTP.md) |

Build / run / test commands, ports and deploy triggers: [RUNBOOK.md](service-context/RUNBOOK.md).
Config keys and env-var names (no values): [CONFIG.md](service-context/CONFIG.md).

---

## CI gate

Since 2026-08-06 both deploy workflows gate on the suites before shipping:

- `deploy-web.yml` — `npm run lint` + `npm run test`, then build + deploy.
- `deploy-api.yml` — `./gradlew test` (JUnit + Testcontainers Postgres), then build + deploy.

A red suite blocks the deploy; prod stays on the previous build. Plan:
[`plans/004-ci-lint-test-gates.md`](../plans/004-ci-lint-test-gates.md).

**Gotcha:** merging a branch that is behind master can fail the gate on the merged tree even
though both sides were green. Rebase before merge. This happened on the very first merge after
the gate landed.

---

## Open work

Tracked in [`plans/`](../plans/README.md) — that file's status table is the source of truth.

| Plan | What | Status |
|---|---|---|
| 002 | Eliminate N+1 queries in list endpoints | TODO |
| 003 | Validate lat/lng on submission input | TODO |
| 005 | Test the web 401→refresh→retry auth seam | TODO |

---

## Launch gaps (not code)

These are operator / console tasks, not tracked as plans:

1. **Supabase S3 access key equals the secret key.** Rotate to a distinct access/secret pair.
2. **No database backups.** Nothing exists until the first real users; decide before launch.
3. **MapTiler cutover** is code-complete with OpenFreeMap as permanent fallback; the account and
   key steps are pending. See the vault runbook.
4. **Admin credentials** — confirm the production `ADMIN_EMAIL` / `ADMIN_PASSWORD` are real
   values in Secret Manager, not seed defaults.
5. **Version + CHANGELOG** — `web/package.json` is at `0.2.11`; no tagged releases.

---

## Backlog

- More base filters (outdoor / quiet / lit / access) — data fields exist, UI is single-axis + Free.
- Real place photos pipeline (uploads work; detail hero is still a placeholder when a spot has none).
- Landing/home screen (`/` → `/explore` today; map-first is acceptable — decide explicitly).
- Collections as CMS (guides are derived, not editable).
- Push/email on submission approval; rate-limit + spam guard on UGC.
- i18n (ET/EN/RU), PWA/offline.
- Analytics depth (funnels, retention) once events accumulate.

---

## Gotchas (carry forward)

- **Public-asset paths must use `import.meta.env.BASE_URL`**, never a leading `/`. Bit the map
  style once (blank live map).
- **DTO shapes in `web/src/shared/api/types.ts` are the contract.** The API conforms to the
  frontend, not the other way round.
- **Map tile/glyph URLs are never hardcoded in components** — go through
  `web/src/widgets/map/provider.ts`.
- **`.claude/launch.json` `web` cwd must point at the worktree you actually edit**, else the
  preview serves stale code (green build, old UI).
- **Google sign-in needs the same client id in two places**: web build `VITE_GOOGLE_CLIENT_ID`
  and api runtime `GOOGLE_CLIENT_ID`. Unset on either side → the button reports "isn't configured".
