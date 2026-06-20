# GemSpot Migration — Execution Plan (session blocks)

> Companion to `docs/mvp/rebrand.html` (v1.0 spec). This file = the **ready-to-run** plan: one block per fresh session, copy-paste prompts, with the 10 grill-session decisions (D1–D10) folded in. Spec is the base; decisions override where noted.
>
> Generated via `plan-task-orchestrator`. Runtime PKM: `engineering-task-memory-orchestrator`. Resumed sessions: `context-refresher` first. Communication: caveman ultra.

---

## Decisions (override spec)

| # | Decision | vs spec | Lands in |
|---|---|---|---|
| D1 | Full Spring/Java rewrite = strategic (target prod stack) | intent | all |
| D2 | Java 25 (LTS) | = spec | B1 |
| D3 | Custom JWT 1:1 port, not Supabase Auth | = spec | B5 |
| D4 | + refresh-token reuse detection (DB jti family) | **added** | B3, B5 |
| D5 | Secret Manager for real secrets (not plain env) | **changed** | B9 |
| D6 | + Testcontainers integration tests | **added** | B7 |
| D7 | min-instances=1 (not 0) | **changed** | B9 |
| D8 | Full observability: JSON logs + Sentry + Micrometer | **added** | B1, B7.5 |
| D9 | CI via GCP SA key (mitigated roles) | = spec | B10 |
| D10 | Supabase free tier, backup tripwire at first users | clarify | B9 |

## Spec/repo corrections

- **empiregranit cleanup (Phase 0): N/A** — not in repo (checked master + branch). Skip.
- `render.yaml` + Node `backend/` → delete in **B11** only, after Java green.
- ai-context note (`98 ai-context.md`) says Pages `/gemspot/` HashRouter → changes to Firebase root `/`. Update at B11.

## Operator prep (Track 1)

DONE ✅: GCP project+billing, Supabase project (eu-north-1), Firebase project, JWT secrets, ADMIN creds, GCP SA key JSON, Firebase SA JSON, Google OAuth client id.

**Still TODO** (before the block that needs it):
- [ ] **Sentry account + DSN** (free tier) → needed B7.5
- [ ] Grab Supabase **pooler :6543** + **direct :5432** strings + **S3 keys** + create **`place-photos`** bucket → needed B9
- [ ] Add role **Secret Manager Secret Accessor** to `github-deploy` SA + Cloud Run runtime SA → B9
- [ ] After B9 deploy: add `*.web.app` origin to Google OAuth client

## Dependency graph

```
YOU prep ......................................... ready by B9 / B7.5
CLAUDE: B0✓→B1→B2→B3→B4→B5→B6→B7→B7.5 →→ B8→B9*→B10→B11
                                                    ↑ B9 needs Supabase strings + Secret Manager
        (B3..B6 may overlap after B2; B7 needs B4+B5; B7.5 needs B1)
```
\* B9 = sync point with operator prep. Everything before = offline, no cloud.

---

## Shared preamble (paste once per block)

```text
Communication: caveman ultra.
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Base branch: fix/review-5-polish (= master + 1 polish commit)
Branch: BP-NA-gemspot-spring-cloudrun-migration
Worktree: /Users/ontony/Desktop/archivarius/codes/.worktrees/gemspot-migration
Task note: Engineering Vault/01 Projects/gemspot/11 Refactors/spring-cloudrun-migration.md
Spec: docs/mvp/rebrand.html  ·  Decisions: docs/mvp/rebrand-ready.md (D1-D10 override spec)

Before any code change: read the `Working location` block in the task note. If worktree set + path exists, cd into it and confirm `git branch --show-current` matches. If branch set but worktree missing, `git worktree add`. If block missing, ask which branch/worktree — do not silently spawn one. Do not commit unless I explicitly ask.

Use engineering-task-memory-orchestrator for runtime PKM. If resumed block, use context-refresher first, then continue; revalidate notes vs repo state, do not copy stale claims forward. Treat repo + spec as source of truth.

CONTRACT RULE (every backend block): Spring JSON must be byte-identical to Nest/mock. Frontend DTO contract (web/src/shared/api/types.ts) is the fixed point — never change field names/casing/status codes. Frontend changes only VITE_API_URL (+ vite base /gemspot/ → /).

At stop: write back last_commit, status, updated into Working location block; if dirty, list dirty paths. Durable notes = stable facts only (decision, changed files, evidence source, verification, residual risk). No process narration, raw tool output, raw diffs, logs, transcripts. Update primary task note first; secondary notes only if stable reusable context changed. Stop at this block's stop condition.
```

---

# WORKSTREAM A — Backend (offline, no cloud)

## Block 0 — Repo cleanup + task note — ✅ DONE

Worktree created off `fix/review-5-polish`; spec copied in; task note + decisions written; empiregranit N/A; Node files deferred to B11. Status: ready for B1.

---

## Block 1 — Spring scaffold + config + logging (Phase 1 + D2 + D8-logging)
Parallelization: `none`. Read: spec §Phase 1, `backend/` (Node layout to mirror).

**Prompt 1.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Init Spring Boot 3.5.x in backend/ alongside the existing Node files (Node removed only at B11). Gradle Kotlin DSL, Java 25 toolchain (JavaLanguageVersion.of(25)), Gradle 9.x wrapper. Deps per spec §Phase 1 table: web, data-jpa, validation, security, liquibase-core, postgresql, jjwt-{api,impl,jackson}:0.12.x, spring-security-crypto, awssdk:s3, actuator, spring-boot-starter-test. Plus D8: structured JSON logging (logstash-logback-encoder or Spring's structured logging) to stdout. Package skeleton ee.gemspot.api.{web,service,dto,domain,repository,mapper,security,storage,common,config}.
```

**Prompt 1.2**
```text
Use shared preamble.
Config classes (spec §Phase 1): SecurityConfig (stateless, CSRF off, route rules stub), CorsConfig (origin from CORS_ORIGIN env, allowCredentials=true), JacksonConfig (FAIL_ON_UNKNOWN_PROPERTIES=false). D8 logging: JSON to stdout + request/error logging filter with a correlation id (MDC). No /api context-path — controllers at root. Verify ./gradlew build compiles. Report build result.
```
Stop: `./gradlew build` green on scaffold, JSON logging emits. Handoff: changed files, build status, logging config note.

---

## Block 2 — Endpoint inventory + controller stubs (Phase 2)
Parallelization: `read-only subagent wave` (33 routes, independent groups). Read: spec §Phase 2 table, `web/src/shared/api/types.ts`, Nest controllers.

**Prompt 2.1** — main orchestration
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Main agent, read-only inventory wave. Justified: 33 routes across ~11 controllers, independent. Spawn up to 5 read-only subagents (each names engineering-task-memory-orchestrator, read-only, no edits, compact summary ≤8 bullets) to map Nest controllers → spec §Phase 2 routes, grouped:
- A: Places/Categories/Guides/Health
- B: Auth (register/login/refresh/oauth/logout/me)
- C: Saved/Submissions/Reports
- D: Uploads/Events
- E: Admin (11 routes)
Each returns: route, method, status code, access level, request+response DTO shape from web/src/shared/api/types.ts. Merge into one controller-stub plan; flag status-code overrides (202 events, 201 register, 200 login/refresh/oauth/logout/saved POSTs). Append plan to task note. Stop.
```

**Prompt 2.2**
```text
Use shared preamble.
Create all 11 controller classes (Health, Places, Categories, Guides, Events, Auth, Saved, Submissions, Reports, Uploads, Admin) with correct @RequestMapping paths, @ResponseStatus overrides, method sigs returning stub DTOs (Java records). Root-mounted, no /api. /health → {"status":"ok"} plain controller (not Actuator). ./gradlew build green.
```
Stop: all controllers stubbed, build green, routes match table. Handoff: controller list + status-code map.

---

## Block 3 — JPA entities + Liquibase + refresh_tokens table (Phase 3 + D4)
Parallelization: `none` (changelog is shared mutable; serialize). Read: spec §Phase 3, `backend/prisma/schema.prisma`, `backend/prisma/migrations/0001_init/migration.sql`.

**Prompt 3.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Port 11 Prisma models → JPA entities (domain/) + Spring Data repos (repository/) per spec §Phase 3 crosswalk. Preserve exact table/column names (@@map snake_case). 3 gotchas: (1) tags text[] → @JdbcTypeCode(SqlTypes.ARRAY) @Column(columnDefinition="text[]") List<String>; (2) Event.props jsonb → @JdbcTypeCode(SqlTypes.JSON) Map; (3) Place/Category app-assigned String @Id, NO @GeneratedValue; UUID entities @GeneratedValue(UUID) or assign in code. Enums @Enumerated(STRING), wire values stay uppercased.
D4: add NEW entity RefreshToken + table refresh_tokens (jti PK/unique, user_id FK, family_id, used boolean, expires_at, created_at). Not in Prisma schema — net-new.
```

**Prompt 3.2**
```text
Use shared preamble.
Liquibase changelog: db.changelog-master.xml + 0001-init.xml translated from backend/prisma/migrations/0001_init/migration.sql (port the SQL, don't reverse-engineer). All enum types, tables w/ @@map names, FKs w/ documented onDelete, unique constraints/indexes. + 0002-refresh-tokens.xml for D4 table. JPA ddl-auto: validate (Liquibase owns DDL). Placeholders: spring.liquibase.url=:5432, spring.datasource.url=:6543. Validate entities against changelog via a local Postgres or Testcontainer. Report.
```
Stop: entities + repos + 2 changelogs done, Hibernate validates clean. Handoff: entity/table crosswalk confirmed, gotcha + refresh_tokens handling.

---

## Block 4 — Services & mappers (Phase 4)
Parallelization: `code-edit subagent wave` (disjoint service files, justified after B3). Read: spec §Phase 4, Nest `application/*/*.service.ts`, `place.mapper.ts`, `relative-time.ts`.

**Prompt 4.1** — main orchestration
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Main agent, code-edit wave. Justified: 4 disjoint service groups, structural context known (B3). Spawn workers, STRICT disjoint ownership, each names engineering-task-memory-orchestrator, edits only its files, no unassigned edits, adapts to other workers' changes, returns compact summary (changed files, behavior, checks, blockers):
- Worker A: PlacesService + PlaceMapper (filter status=ACTIVE +optional cat, order by sort; slug→404; build appleMapsUrl/googleMapsUrl from lat/lng; {url:""} photo placeholder when none — byte-identical to place.mapper.ts) + CategoriesService (all by sort; color=cssvar, glyph=id).
- Worker B: GuidesService (derived, no table; one guide per category ≥2 spots + prepended "Free to play" coverCategory:scenic; getById resolves slugs vs live places; mirror buildGuides()) + common/RelativeTime (port relative-time.ts).
- Worker C: SavedService (place-id list in sort order; add upsert-if-exists; merge insert valid+new skip unknown/dupe never-error; remove=deleteAll) + SubmissionsService (create PENDING + photo rows, photoCount ?? urls.length; listMine newest-first) + ReportsService (front↔DB reason maps closed↔CLOSED; reportedAt "just now"; listMine RelativeTime).
- Worker D: AdminService (5-count stats; approveSubmission @Transactional: padded next id last.sort+1 padStart(2,'0'), unique-slug loop, create ACTIVE Place + flip APPROVED, 404 missing; reject; setPlaceStatus; setReportStatus + enum→front map) + EventsService (track insert; counts group-by name desc via @Query).
Main: check integration, wire controllers→services, ./gradlew build. One durable handoff. Stop.
```
Stop: all services ported, controllers wired, build green. Handoff: service list, @Transactional points, slugify/padding notes.

---

## Block 5 — Auth: Spring Security + JWT + OAuth + reuse detection (Phase 5 + D3 + D4)
Parallelization: `none` (integrated security surface). Read: spec §Phase 5, Nest auth files (`*.controller.ts`, `*.service.ts`, guards, `jwt` config).

**Prompt 5.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Port stateless dual-token auth (spec §Phase 5). JwtService (JJWT 0.12): access {sub,email,role} JWT_SECRET 15m; refresh {sub,typ:"refresh",jti,fam} JWT_REFRESH_SECRET 30d. BCryptPasswordEncoder(10). JwtAuthFilter (OncePerRequestFilter). AuthResponseDto={user:{id,email,name,role},accessToken,refreshToken} — EXACT shape, no renames. Role mapping: grant ROLE_+claims.role authority; wire value stays bare ADMIN/CLIENT.
D4 reuse detection: on /auth/refresh — verify jti row exists + used=false → mark used → issue new pair same family_id. If presented jti is used=true → delete entire family (revoke session) → 401. Logout may mark family used. Tokens stay opaque JWT to frontend; refresh flow shape UNCHANGED — frontend untouched.
```

**Prompt 5.2**
```text
Use shared preamble.
SecurityConfig route rules (spec §Phase 5): permitAll /health,/places/**,/categories,/guides/**,/auth/** (except /auth/me),POST /events; authenticated /auth/me,/saved/**,/submissions/**,/reports/**,/uploads; hasRole(ADMIN) /admin/**. Port Google OAuth (oauthGoogle): verify id_token via tokeninfo with RestClient, check aud==GOOGLE_CLIENT_ID + email_verified, link-by-email (existing gains provider link; new email → OAuth-only acct null password); unset GOOGLE_CLIENT_ID → 401 "not configured". @RestControllerAdvice: validation→400, NotFound→404, Conflict→409, Unauthorized→401. Validation crosswalk class-validator→Jakarta on record DTOs (@Email,@Size,@Pattern/@ValueOfEnum,@NotNull,@Min,@Size max). Build green.
```
Stop: auth wired, gating correct, OAuth ported, reuse detection works, exception advice in place. Handoff: token claims/TTL, role-mapping, reuse-detection note.

---

## Block 6 — Supabase Storage adapter (Phase 6)
Parallelization: `none`. Read: spec §Phase 6, Nest `storage.service.ts`, UploadsController.

**Prompt 6.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Spec §Phase 6: keep StorageService interface (StoredFile save(file)). Impl SupabaseStorageService via awssdk v2 S3Client → SUPABASE_S3_ENDPOINT (https://<proj>.supabase.co/storage/v1/s3), region eu-north-1, path-style, Supabase S3 keys (env/secret). Upload {uuid}.{ext}; return public URL https://<proj>.supabase.co/storage/v1/object/public/place-photos/{name}. UploadsController validation unchanged: field "file", max 5MB, mime {jpeg,png,webp,gif}, returns {url}. Delete old static /uploads serving path + ASSET_BASE_URL. Build green.
```
Stop: storage adapter done, uploads return {url}, no local-disk path. Handoff: bucket name, env vars needed.

---

## Block 7 — Seed + tests (mocked + Testcontainers) (Phase 7 + D6)
Parallelization: `none` (seed→tests dependency). Read: spec §Phase 7, Nest `prisma/seed.ts`, 33 Jest specs, `placesApi.ts` RAW.

**Prompt 7.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Port prisma/seed.ts → idempotent ApplicationRunner: upsert 7 categories, 10 places (exact RAW: slugs, coords, tags, notes, field-note cells), admin from ADMIN_EMAIL/ADMIN_PASSWORD. verifiedLabel→verifiedAt: seed 8 verified places ISO timestamps matching placesApi.ts RAW; leave Löwenruh pitch + Pirita padel UNSET (hidden-badge fallback). Mapper passes through as verifiedAt. Idempotent = safe every boot.
```

**Prompt 7.2**
```text
Use shared preamble.
Port 33 Jest tests → JUnit 5 + Mockito, mocked Spring Data repos (@Mock + @InjectMocks), NO database: AuthServiceTest (real JwtService + reuse-detection cases), SavedServiceTest, SubmissionsServiceTest, AdminServiceTest, + RelativeTimeTest (boundaries). Cover exact cases in spec §Phase 7 table. ./gradlew test green no DB. Report pass count vs 33+1+reuse target.
```

**Prompt 7.3** — D6 Testcontainers
```text
Use shared preamble.
D6: add Testcontainers (postgres) integration layer. ~5-8 @SpringBootTest tests against real Postgres:
1. Liquibase changelog applies + Hibernate ddl-auto validate passes (catches text[]/jsonb/enum/@Id mapping gotchas).
2. Seed runs idempotently (run twice → same row counts).
3. MockMvc exact-JSON contract assertions on riskiest endpoints: GET /places (10 ACTIVE, ids 01..10, no rating), GET /places/{slug} (note/photos/verifiedAt/fieldNotes/maps urls), auth round-trip (register 201→login 200→me→refresh rotate→reused-refresh 401), admin approve (PENDING→ACTIVE padded id).
./gradlew test green (mocked + integration). Report.
```
Stop: seed idempotent, all tests green (mocked + Testcontainers). Handoff: test counts, integration coverage, seed verifiedAt note. **Workstream A core done.**

---

## Block 7.5 — Observability: Sentry + Micrometer (D8)
Parallelization: `none`. Read: this file D8, spec §Phase 1 (actuator).

**Prompt 7.5.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
D8 observability. Add sentry-spring-boot-starter; DSN from SENTRY_DSN env (Secret Manager at B9); capture unhandled exceptions + 5xx, tag release/environment. Add Micrometer + actuator prometheus endpoint (/actuator/prometheus); expose JVM, http server, hikari metrics. Keep /health plain. Confirm local boot: Sentry no-ops without DSN, /actuator/prometheus serves metrics. ./gradlew build green. Note SENTRY_DSN as new secret for B9.
```
Stop: Sentry wired (no-op w/o DSN), metrics endpoint live, build green. Handoff: SENTRY_DSN secret needed, metrics endpoint path.

---

# WORKSTREAM B — Infra

## Block 8 — Containerize (Phase 8)
Parallelization: `none`. Read: spec §Phase 8.

**Prompt 8.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
backend/Dockerfile multi-stage (spec §Phase 8): FROM gradle:9-jdk25 build (gradle bootJar --no-daemon) → FROM eclipse-temurin:25-jre runtime, COPY jar, ENV PORT=8080, ENTRYPOINT java -jar app.jar. application.yml server.port: ${PORT:8080}. /health for Cloud Run startup probe. Build image locally, run container, curl /health → {"status":"ok"}. Keep image lean (cold start). Report image size.
```
Stop: image builds, container serves /health locally. Handoff: image size, cold-start note.

---

## Block 9 — Supabase + Secret Manager + Cloud Run + Firebase (Phase 9 + D5 + D7 + D10)
Parallelization: `none` (sequential infra + secrets). **Needs operator prep + CLIs + credentials — confirm before running.**

**Prompt 9.1** — Supabase
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Spec §9.1: create public place-photos bucket + S3 keys (if not done). Grab pooler :6543 (app) + direct :5432 (migrations) strings. Footgun: app→:6543 with hikari.maximum-pool-size≈5 + ?prepareThreshold=0 (disable Hibernate stmt caching); Liquibase→:5432. spring.liquibase.url=:5432, spring.datasource.url=:6543. Run Liquibase against :5432, then boot seed. Verify tables + 10 places + refresh_tokens present. D10: free tier, no backups now — note tripwire (first real users → pg_dump cron or Pro). Watch free-tier auto-pause.
```

**Prompt 9.2** — Secret Manager + Cloud Run + Firebase
```text
Use shared preamble.
D5 Secret Manager: create secrets JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL(:6543), DATABASE_MIGRATION_URL(:5432), SUPABASE_S3_SECRET_KEY, ADMIN_PASSWORD, SENTRY_DSN. Grant Secret Manager Secret Accessor to github-deploy SA + Cloud Run runtime SA. Plain env (non-secret): CORS_ORIGIN, JWT_ACCESS_TTL=15m, JWT_REFRESH_TTL=30d, SUPABASE_BUCKET=place-photos, SUPABASE_S3_ENDPOINT, SUPABASE_S3_ACCESS_KEY, GOOGLE_CLIENT_ID.
Spec §9.2: gcloud enable run+artifactregistry; create gemspot docker repo europe-north1; builds submit backend; run deploy gemspot-api --region europe-north1 --allow-unauthenticated --port 8080 --min-instances 1 (D7) --set-secrets (D5 list) --set-env-vars (plain list). Record *.run.app URL.
Spec §9.3: firebase.json (public web/dist, SPA rewrite **→/index.html). Flip vite.config.ts base /gemspot/→/. Build VITE_API_URL=<run-url> npm --prefix web run build. firebase deploy --only hosting → *.web.app. Set Cloud Run CORS_ORIGIN to web.app origin. Add web.app to Google OAuth client origins.
```
Stop: live *.run.app + *.web.app, secrets in Secret Manager, min-instances=1, CORS wired. Handoff: both URLs, secrets created (names only), env set.

---

# WORKSTREAM C — CI/CD

## Block 10 — GitHub Actions (Phase 10 + D9)
Parallelization: `none`. Read: spec §Phase 10.

**Prompt 10.1**
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Spec §Phase 10: two path-filtered workflows. deploy-api.yml (paths backend/**): auth via GCP_SA_KEY secret (D9) → gcloud builds submit → gcloud run deploy (preserve --min-instances 1, --set-secrets, --set-env-vars). deploy-web.yml (paths web/**): npm ci && npm run build (VITE_API_URL secret) → FirebaseExtended/action-hosting-deploy w/ FIREBASE_SERVICE_ACCOUNT. Delete old deploy.yml (Pages). List GitHub secrets: GCP_PROJECT, GCP_SA_KEY, FIREBASE_SERVICE_ACCOUNT, VITE_API_URL. App runtime secrets stay in Secret Manager, NOT repo. D9 mitigation note: SA key minimal roles, rotate.
```
Stop: 2 workflows committed, old Pages workflow gone, secrets documented. Handoff: workflow paths, secret list.

---

# WORKSTREAM D — Cutover

## Block 11 — Verify, cutover, rollback (Phase 11)
Parallelization: `read-only subagent wave` for checklist (13 independent checks). Read: spec §verification checklist + §cutover.

**Prompt 11.1** — verify wave
```text
Use shared preamble. Use engineering-task-memory-orchestrator.
Main agent, read-only verification wave vs live *.run.app + *.web.app. Spawn read-only subagents to run the API contract checklist (spec acceptance gate), grouped:
- A: /health, /categories (7, order tabletennis→sakura), /places (10 ACTIVE 01..10, no rating), /places/{slug} (full detail shape)
- B: /guides ("Free to play" first, ≥2 spots), POST /events 202
- C: auth round-trip register 201/login 200/me/refresh rotate/bad-refresh 401/reused-refresh 401; gating unauth 401
- D: saved cross-device + merge union
- E: submission lifecycle PENDING→approve→public ACTIVE padded id
- F: upload {url} persists after redeploy + admin gating 403/200
Each returns pass/fail + evidence. Merge → acceptance report. Run end-to-end: local web build at run URL works zero frontend code changes. Append report to task note. Stop.
```

**Prompt 11.2** — cutover
```text
Use shared preamble.
Only after checklist all-green. D10/no-data: Render held seed-only (confirmed no real data) → skip pg_dump. Retire Nest (spec §cutover): delete Render web service + Render Postgres, old Pages workflow, backend/ Node files (prisma/, nest-cli.json, jest.config.js, tsconfig.json, .node-version, package*.json, src/, test/, dist/, node_modules/, uploads/), render.yaml. Update 98 ai-context.md: Pages /gemspot/ → Firebase root /. Tag cutover commit v0.3.0. Document rollback: pre-deletion = revert VITE_API_URL + Pages redeploy; post-deletion = redeploy tagged Nest commit. Keep Render short bake before pulling.
```
Stop: checklist green, Nest retired, tagged, rollback documented. Handoff: task note status=merged, final URLs, rollback procedure.

---

## Carry-forward gotchas (quick ref)

- Contract = test oracle every backend block. `withMockFallback` masks read cold starts only.
- Status codes: 202 events, 201 register, 200 login/refresh/oauth/logout/saved POSTs.
- Pooler: app→:6543 `?prepareThreshold=0` pool≈5; Liquibase→:5432.
- Hibernate: tags text[] ARRAY; Event.props jsonb JSON; Place/Category app-assigned String @Id no @GeneratedValue.
- ddl-auto: validate — Liquibase owns DDL.
- No /api prefix; /health → {"status":"ok"}.
- verifiedAt: 8 ISO, Löwenruh pitch + Pirita padel unset.
- Role: grant ROLE_<role>; wire value bare ADMIN/CLIENT.
- D4: refresh reuse → kill family. D5: Secret Manager. D7: min-instances=1. D8: JSON logs+Sentry+Micrometer.
