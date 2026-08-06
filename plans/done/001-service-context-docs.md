# Plan 001: Create the canonical service-context doc set (UPPERCASE split-transport scheme)

> **Executor instructions**: Follow this plan step by step. This is a **docs-only**
> task — do NOT modify source code, build config, or runtime behavior. Run every Verify
> command and confirm the expected result before moving on. If anything in "STOP
> conditions" occurs, stop and report — do not improvise. When done, update the status
> row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat fdbc18f..HEAD -- api/src docs/service-context`
> If any cited source file or the existing service-context doc changed since this plan was
> written, compare the "Current state" excerpts against the live code before proceeding;
> on a mismatch treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW (docs only)
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `fdbc18f`, 2026-06-28

## Why this matters

`docs/service-context/` holds only one ad-hoc file (`gemspot-api-auth.md`) covering the
`/auth` subsystem. There is no canonical, durable, whole-service context map for either
the Spring API or the React web frontend. The canonical UPPERCASE split-transport scheme
(README/API/HTTP/GRPC/MESSAGING/DATA/CACHE/CONFIG/DEPENDENCIES/OBSERVABILITY/RUNBOOK) gives
any agent or new engineer a fast, grep-verified orientation and a single source of truth
that the vault only links to. After this plan: the full doc set exists, the lone auth doc
is folded into `HTTP.md`/`API.md` with a redirect stub, and absent transports (gRPC,
messaging, cache) are explicitly documented as Not Applicable so future readers do not
re-investigate.

## Current state

The repo is a monorepo with two deployables:
- `api/` — Spring Boot 3.5.6, Java 25, Gradle. Layered `web`(controllers)→`service`→
  `repository`, plus `dto`, `domain`, `mapper`, `security`, `storage`, `config`, `seed`.
- `web/` — React 19 + Vite + TypeScript, feature-sliced (`app`/`features`/`shared`/
  `pages`/`widgets`/`entities`). Built to `web/dist`, deployed to Firebase Hosting.

Existing service-context dir (the ONLY file there today):

`docs/service-context/gemspot-api-auth.md` (excerpt, lines 1–11):
```
# Service context — gemspot-api auth & account surface

Scope: the `/auth` HTTP surface, its persistence, and the mail dependency. Source of
truth is the code (`AuthController`, `AuthService`, `SecurityConfig`); this doc is the
fast orientation for that subsystem.

## HTTP endpoints (`/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
```

`api/README.md` already documents run/deploy (excerpt):
```
## Run locally
./gradlew bootRun        # starts on :8080 (server.port: ${PORT:8080})
./gradlew test           # JUnit integration + service tests
./gradlew bootJar        # build runnable jar → build/libs/*.jar
## Deploy
Dockerfile (multi-stage) → Cloud Run by .github/workflows/deploy-api.yml on push to
master touching api/**. Live: https://gemspot-api.onrender.com → Cloud Run gemspot-api.
```
NOTE: that "Live" URL (onrender.com) vs Cloud Run is a possible staleness — see Step 11;
RUNBOOK must NOT assert a live URL, only point at the workflow + flag the ambiguity.

`docs/adr/` has `0001-rewrite-backend-nestjs-to-spring.md`, `0002-keep-custom-jwt-over-supabase-auth.md`.
Repo glossary lives in `CONTEXT.md` (root). No `AGENTS.md`/`CLAUDE.md` in the repo.

### Grep-verified facts to encode (source of truth = code at commit `fdbc18f`)

**HTTP (api `web/` package) — controllers, all mounted at root, port 8080:**
- `AuthController` `/auth` — register, login, refresh, oauth/google, oauth/facebook, me (GET/PATCH/DELETE), password, logout-all, email/change-request, email/verify (`api/src/main/java/ee/gemspot/api/web/AuthController.java`)
- `PlacesController` `/places` — GET list (`?cat=`), GET `/{slug}` (`web/PlacesController.java`)
- `CategoriesController` `/categories` (`web/CategoriesController.java`)
- `GuidesController` `/guides`, `/guides/{id}` (`web/GuidesController.java`)
- `EventsController` `/events` POST (202, anonymous analytics) (`web/EventsController.java`)
- `SavedController` `/saved` — GET, POST, POST `/merge`, DELETE `/{placeId}` (`web/SavedController.java`)
- `SubmissionsController` `/submissions` — POST, GET `/mine` (`web/SubmissionsController.java`)
- `ReportsController` `/reports` — POST, GET `/mine` (`web/ReportsController.java`)
- `UploadsController` `/uploads` POST (multipart, 5MB, JPEG/PNG/WebP/GIF) (`web/UploadsController.java`)
- `AdminController` `/admin/**` (ADMIN role) — events, stats, submissions approve/reject, places status, reports status, users (`web/AdminController.java`)
- `HealthController` `/health` (`web/HealthController.java`)
- `GlobalExceptionHandler` — Nest-compatible error shape `{statusCode, message, error}` (`web/GlobalExceptionHandler.java`)
- Security route matrix in `config/SecurityConfig.java`: permit-all (places, categories, guides, auth, POST events, actuator health+prometheus); authenticated (saved, submissions, reports, uploads); ADMIN (`/admin/**`).

**DATA (`domain/`, `repository/`, `db/changelog`):** PostgreSQL; Liquibase owns DDL;
Hibernate `ddl-auto: validate`; `globally_quoted_identifiers: true` (Prisma-legacy
case-sensitive columns). Entities/tables: User/users, Profile/profiles, Category/categories,
Place/places, PlacePhoto/place_photos, PlaceCategory/place_categories, SavedPlace/saved_places,
Submission/submissions, SubmissionPhoto/submission_photos, Report/reports, Event/events,
RefreshToken/refresh_tokens, EmailChangeToken/email_change_tokens. 13 JPA repositories in
`repository/`. Changelogs: `0001-init.xml` (enums + core), `0002-refresh-tokens.xml`,
`0003-email-change-tokens.xml`, master `db.changelog-master.xml`.

**CACHE:** ABSENT — no Redis/Dragonfly/Caffeine/Spring cache. Stateless; queries hit DB.
**MESSAGING:** ABSENT — no Kafka/Rabbit/SQS. `/events` persisted synchronously to DB.
**GRPC:** ABSENT — no `.proto`, no gRPC server/client. HTTP-only REST.

**CONFIG (`application.yml`, `config/`):** keys only, NO secret values —
`spring.application.name=gemspot-api`, `spring.datasource.url=${DATABASE_URL}` (pooler
:6543, `prepareThreshold=0`), `spring.jpa.hibernate.ddl-auto=validate`,
`globally_quoted_identifiers=true`, `spring.mail.*` (SMTP_*; dev MailHog localhost:1025),
`spring.liquibase.*` (separate migration DB URL), `server.port=${PORT:8080}`,
`management.endpoints.web.exposure.include=health,prometheus`,
`management.metrics.tags.application=gemspot-api`, `sentry.dsn=${SENTRY_DSN:}`
(no-op if empty), `sentry.send-default-pii=false`, `app.cors.origin=${CORS_ORIGIN:...}`,
`app.mail.from`, `app.web-url`, `supabase.s3.*` (endpoint, region eu-north-1, bucket
place-photos). Config classes: `config/SecurityConfig.java`, `config/CorsConfig.java`,
`config/StorageConfig.java`, `config/JacksonConfig.java`. Env var NAMES (values live in
secrets — never reproduce): DATABASE_URL/USER/PASSWORD (+ MIGRATION_*), SMTP_*, SENTRY_*,
CORS_ORIGIN, MAIL_FROM, WEB_URL, SUPABASE_S3_*, SUPABASE_BUCKET, JWT_SECRET,
JWT_REFRESH_SECRET, JWT_ACCESS_TTL (15m), JWT_REFRESH_TTL (30d), PORT.

**DEPENDENCIES (`build.gradle.kts`, code):** Spring `RestClient` → Google/Facebook OAuth
token verification (`service/AuthService.java`); AWS SDK v2 S3 client → Supabase Storage
(`config/StorageConfig.java`); `JavaMailSender` SMTP (`service/MailService.java`). Starters:
web, data-jpa, validation, security, mail, actuator; liquibase-core; postgresql;
jjwt 0.12.6 (api/impl/jackson, HS256); micrometer-registry-prometheus;
sentry-spring-boot-starter-jakarta 8.43.2; logstash-logback-encoder 8.0;
spring-boot-starter-test, testcontainers (postgresql).

**OBSERVABILITY:** structured JSON logs → stdout via Logstash encoder
(`resources/logback-spring.xml`), MDC `correlationId` promoted to top-level; per-request
`X-Correlation-Id` (legacy `X-Request-Id`) minted/echoed in `common/RequestLoggingFilter.java`;
request log line METHOD/URI/status/duration_ms at INFO. Actuator `health` + `prometheus`
exposed; Micrometer Prometheus tagged `application=gemspot-api`. Sentry opt-in via
`SENTRY_DSN`, no PII.

**RUNBOOK:** `./gradlew bootRun` (:8080), `./gradlew test` (Testcontainers Postgres),
`./gradlew bootJar`. Multi-stage Dockerfile (Gradle/JDK 25 build → eclipse-temurin:25-jre,
non-root uid 10001, `-XX:MaxRAMPercentage=75`, EXPOSE 8080). Deploy via
`.github/workflows/deploy-api.yml` on push to `master` touching `api/**`. Ports: app 8080,
Postgres pooler 6543 (runtime), Postgres direct 5432 (migrations), MailHog 1025 (dev).

**WEB frontend facts:** React 19 + Vite + TS, feature-sliced. API seam in
`web/src/shared/api` swaps mock vs real on `VITE_API_URL`; `httpPlacesApi.ts` does 401→
refresh→retry-once; Bearer token via `authApi.ts`. Hash router `web/src/app/router.tsx`
(routes: `/`, `/explore`, `/spot/:slug`, `/saved`, `/guides`, `/guides/:id`, `/add`
[auth-gated], `/auth`, `/account`, `/account/verify-email`, `/admin/*` [ADMIN-gated]).
Zustand stores in `web/src/shared/store` (authStore persists to localStorage `gemspot.auth`;
savedStore `gemspot.saved`; submissions/reports/geo/ui/toast in-memory). TanStack Query
(60s staleTime, 1 retry) in `web/src/shared/api/queries.ts`. Map: maplibre-gl + native
GeoJSON clustering in `web/src/widgets/map/SpotMap.tsx`, Tallinn bounds lock, provider seam
(openfreemap default / maptiler / selfhosted). VITE_* env keys: VITE_API_URL,
VITE_MAPTILER_KEY, VITE_MAP_PROVIDER, VITE_MAP_STYLE, VITE_SELFHOST_TILES,
VITE_SELFHOST_GLYPHS, VITE_GOOGLE_CLIENT_ID, VITE_FACEBOOK_APP_ID. Scripts: `dev`, `build`
(`tsc -b && vite build`), `lint` (`eslint .`), `test` (`vitest run`), `preview`. Deploy:
`firebase.json` hosting site `gemspot`, public `web/dist`, SPA rewrite → `/index.html`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Drift check (api) | `git diff --stat fdbc18f..HEAD -- api/src` | empty or reviewed |
| Drift check (docs) | `git diff --stat fdbc18f..HEAD -- docs/service-context` | empty or reviewed |
| Pin provenance hash | `git rev-parse --short HEAD` | a short SHA (use in README provenance) |
| Verify file set | `ls docs/service-context` | the 12 canonical files + redirect stub |
| Verify markers present | `grep -rl "service-context:auto:start" docs/service-context` | every generated doc |
| Verify no secrets | `grep -rniE "secret|password|token|key" docs/service-context` | only key NAMES, no values |
| API build sanity (optional, read-only) | `cd api && ./gradlew help -q` | exit 0 |
| Web lint sanity (optional, read-only) | `cd web && npm run lint` | exit 0 |

Do NOT run mutating commands. The gradle/npm commands above are optional read-only sanity
checks only.

## Scope

**In scope** (create/modify ONLY these):
- `docs/service-context/README.md` (create)
- `docs/service-context/API.md` (create — index only)
- `docs/service-context/HTTP.md` (create)
- `docs/service-context/GRPC.md` (create — Not Applicable stub)
- `docs/service-context/MESSAGING.md` (create — Not Applicable stub)
- `docs/service-context/DATA.md` (create)
- `docs/service-context/CACHE.md` (create — Not Applicable stub)
- `docs/service-context/CONFIG.md` (create)
- `docs/service-context/DEPENDENCIES.md` (create)
- `docs/service-context/OBSERVABILITY.md` (create)
- `docs/service-context/RUNBOOK.md` (create)
- `docs/service-context/WEB.md` (create — frontend context, monorepo addition)
- `docs/service-context/gemspot-api-auth.md` (modify — replace body with a short redirect
  stub pointing to HTTP.md + API.md; preserve no stale duplicate tables)

**Out of scope** (do NOT touch):
- Any file under `api/src`, `web/src`, `build.gradle.kts`, `package.json`, `application.yml`.
- `CONTEXT.md`, `docs/adr/*`, `docs/mvp`, `docs/v2`, `design/`.
- `keys/`, `.env`, `env.yaml` — never read out or reproduce secret values.
- App behavior, routes, schema — docs only.

## Git workflow

- Branch: `advisor/001-service-context-docs`
- Commit message: `BP-NA. [gemspot] add canonical service-context doc set`
- Do NOT push or open a PR unless explicitly told.

## Steps

Every generated doc wraps machine-derived content in markers so future regen never
clobbers human prose:
```
<!-- service-context:auto:start -->
... generated facts ...
<!-- service-context:auto:end -->
```

### Step 1: README.md
Create `docs/service-context/README.md`. Top, as a blockquote provenance line (use the SHA
from `git rev-parse --short HEAD`):
`> Generated from commit \`<hash>\`; facts grep-verified.`
Then a one-paragraph service overview (monorepo: Spring API + React web). Add a
`## Doc index` table listing all canonical docs (API, HTTP, GRPC, MESSAGING, DATA, CACHE,
CONFIG, DEPENDENCIES, OBSERVABILITY, RUNBOOK, WEB) with a one-line purpose each. Add
`## External links` (Confluence/Grafana — leave `TODO` placeholders if unknown; do NOT
invent URLs). Wrap the doc-index table + overview facts in auto markers.

**Verify**: `grep -c "service-context:auto:start" docs/service-context/README.md` → `1`;
`grep -q "^> Generated from commit" docs/service-context/README.md && echo ok` → `ok`.

### Step 2: API.md (index only)
Create `docs/service-context/API.md` as an **index doc only** — no endpoint detail. Inside
auto markers, add a `## Presence summary` table: Transport | Present? | Doc — HTTP ✅ HTTP.md,
gRPC ❌ GRPC.md, Messaging ❌ MESSAGING.md. One sentence: "Endpoint detail lives in HTTP.md."

**Verify**: `grep -q "## Presence summary" docs/service-context/API.md && echo ok` → `ok`.

### Step 3: HTTP.md
Create `docs/service-context/HTTP.md`. Inside auto markers, document every controller from
"Current state → HTTP" as a table: Controller | Base path | Endpoints (method+path) | Auth |
File. Include the security route matrix (permit-all / authenticated / ADMIN) and the
`GlobalExceptionHandler` error shape `{statusCode, message, error}`. Fold the `/auth`
endpoint table from `gemspot-api-auth.md` in here as the authoritative version.

**Verify**: `grep -c "Controller" docs/service-context/HTTP.md` → ≥ 11.

### Step 4: GRPC.md (Not Applicable stub)
Create with auto markers stating: "No gRPC. This service is HTTP-only REST (see HTTP.md).
No `.proto` files or gRPC server/client at commit `<hash>`." Keep short.

**Verify**: `grep -qi "no grpc\|not applicable\|HTTP-only" docs/service-context/GRPC.md && echo ok` → `ok`.

### Step 5: MESSAGING.md (Not Applicable stub)
Create with auto markers: "No message broker. No Kafka/Rabbit/SQS. Analytics `/events` are
persisted synchronously to the `events` DB table (see DATA.md)."

**Verify**: `grep -qi "no kafka\|not applicable\|no message" docs/service-context/MESSAGING.md && echo ok` → `ok`.

### Step 6: DATA.md
Create. Inside auto markers: DB engine (PostgreSQL), Liquibase-owns-DDL +
`ddl-auto: validate` + `globally_quoted_identifiers` note; an Entities table (Entity | Table |
Notes) from "Current state → DATA"; the repository list; the changelog file list. Reference
the pooler(:6543)/direct(:5432) split (detail in RUNBOOK/CONFIG).

**Verify**: `grep -c "places\|users\|refresh_tokens" docs/service-context/DATA.md` → ≥ 3.

### Step 7: CACHE.md (Not Applicable stub)
Create with auto markers: "No cache layer. No Redis/Dragonfly/Caffeine/Spring cache.
Reads hit PostgreSQL directly at commit `<hash>`."

**Verify**: `grep -qi "no cache\|not applicable" docs/service-context/CACHE.md && echo ok` → `ok`.

### Step 8: CONFIG.md
Create. Inside auto markers: a config-key table (Key | Source | Default/Notes) from
"Current state → CONFIG" — **key names only, never values**; an env-var NAME list; the
config classes (`SecurityConfig`, `CorsConfig`, `StorageConfig`, `JacksonConfig`). Add an
explicit note: "Secret values live in env/secret manager and must never be copied here."

**Verify**: `grep -niE "password=|secret=|[A-Za-z0-9]{20,}" docs/service-context/CONFIG.md` →
no real secret-looking values (key names like `JWT_SECRET` are fine; assigned values are not).

### Step 9: DEPENDENCIES.md
Create. Inside auto markers: outbound dependencies table (Dependency | Type | Used by |
File) — Google/Facebook OAuth via RestClient, Supabase S3 via AWS SDK, SMTP via
JavaMailSender; plus the key build starters/libs list with versions from "Current state →
DEPENDENCIES".

**Verify**: `grep -qi "Supabase\|OAuth\|SMTP" docs/service-context/DEPENDENCIES.md && echo ok` → `ok`.

### Step 10: OBSERVABILITY.md
Create. Inside auto markers: logging (Logstash JSON to stdout, `correlationId` MDC,
`RequestLoggingFilter`), metrics (Actuator health+prometheus, Micrometer tag
`application=gemspot-api`), error tracking (Sentry opt-in, no PII). Note this is where the
documented localStorage-token trade-off belongs (reference, not a fix).

**Verify**: `grep -qi "prometheus\|correlationId\|Sentry" docs/service-context/OBSERVABILITY.md && echo ok` → `ok`.

### Step 11: RUNBOOK.md
Create. Inside auto markers: build/run/test commands, Docker facts, the deploy workflow
(`.github/workflows/deploy-api.yml`, push to `master` touching `api/**`), and the ports
table (8080 / 6543 / 5432 / 1025). **Flag** the deploy-URL ambiguity: state that
`api/README.md` references both Cloud Run and `onrender.com` and that the live URL must be
confirmed by the maintainer — do NOT assert one.

**Verify**: `grep -qi "gradlew\|8080\|deploy-api.yml" docs/service-context/RUNBOOK.md && echo ok` → `ok`.

### Step 12: WEB.md (frontend)
Create. Inside auto markers: feature-sliced layout, the API seam (`VITE_API_URL` mock/real,
401→refresh→retry), routes table, zustand stores + persistence keys, TanStack Query config,
map stack, VITE_* env-var NAMES, and build/deploy (Vite → `web/dist` → Firebase Hosting).

**Verify**: `grep -qi "VITE_API_URL\|zustand\|firebase" docs/service-context/WEB.md && echo ok` → `ok`.

### Step 13: Redirect the legacy auth doc
Replace the body of `docs/service-context/gemspot-api-auth.md` with a short stub:
"Moved. The `/auth` HTTP surface is now documented in [HTTP.md](HTTP.md); transport
presence in [API.md](API.md). This file kept as a redirect." Do NOT leave duplicated
endpoint tables (they would drift).

**Verify**: `grep -qi "moved\|see HTTP.md\|redirect" docs/service-context/gemspot-api-auth.md && echo ok` → `ok`;
`test $(wc -l < docs/service-context/gemspot-api-auth.md) -lt 15 && echo small` → `small`.

### Step 14: Cross-link + final sweep
Ensure every doc links back to README (doc index). Run the no-secrets sweep.

**Verify**: `grep -rniE "BEGIN PRIVATE KEY|[A-Za-z0-9/+]{40,}=" docs/service-context` →
no matches (no leaked key material).

## Done criteria

ALL must hold:
- [ ] 12 canonical files exist: `ls docs/service-context` shows README, API, HTTP, GRPC,
      MESSAGING, DATA, CACHE, CONFIG, DEPENDENCIES, OBSERVABILITY, RUNBOOK, WEB (`.md`).
- [ ] `README.md` has a blockquote `> Generated from commit \`<hash>\`; facts grep-verified.`
- [ ] `README.md` has a `## Doc index` table and an `## External links` section.
- [ ] `API.md` contains `## Presence summary` inside auto markers and no endpoint detail.
- [ ] Every generated doc has exactly one `service-context:auto:start`/`:end` pair.
- [ ] `gemspot-api-auth.md` is a <15-line redirect stub (no duplicate endpoint tables).
- [ ] No secret VALUES anywhere: `grep -rniE "BEGIN PRIVATE KEY|[A-Za-z0-9/+]{40,}=" docs/service-context` → empty.
- [ ] No source/config files modified: `git status --porcelain` shows changes only under
      `docs/service-context/` (and `plans/README.md`).
- [ ] `plans/README.md` status row for 001 updated to DONE.

## STOP conditions

Stop and report (do not improvise) if:
- The drift check shows the cited controllers/entities/config moved or renamed since
  `fdbc18f` and the "Current state" facts no longer match the code.
- You cannot determine a fact without reading a secret value — document the key NAME and
  mark the value `TODO (in secret manager)` instead.
- A controller/entity exists in code that is NOT in this plan's lists (the surface grew) —
  add it, but note it in your report.
- The maintainer has not confirmed the live deploy URL — leave RUNBOOK's URL as a flagged
  ambiguity, do not pick one.

## Maintenance notes

- These docs are regenerated by editing ONLY inside the `service-context:auto` markers; the
  human prose outside markers is preserved. Re-run a docs refresh when controllers,
  entities, config keys, or the web API seam change.
- If gRPC, a message broker, or a cache is ever added, replace the corresponding Not
  Applicable stub with real content and update `API.md`'s Presence summary.
- A reviewer should scrutinize: no secret values leaked, presence summary matches reality,
  endpoint table in HTTP.md matches the security route matrix.
- Deferred: resolving the Cloud Run vs onrender.com deploy-URL ambiguity (maintainer call);
  any per-package doc split (would be ADR 0003).
