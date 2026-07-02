# AGENTS.md — GemSpot

Monorepo: `api/` (Spring Boot 3.5.6, Java 25, Gradle) + `web/` (React 19 + Vite + TS).

## Orientation (read these first)

- **Service context pack**: [`docs/service-context/`](docs/service-context/README.md) —
  canonical split-transport docs (HTTP, DATA, CONFIG, DEPENDENCIES, OBSERVABILITY, RUNBOOK,
  WEB; gRPC/MESSAGING/CACHE are Not Applicable). Source of truth for the service surface.
- **Glossary / domain**: `CONTEXT.md` (root).
- **Decisions**: `docs/adr/`.

## Build / run / test

- api: `cd api && ./gradlew bootRun | test | bootJar` (port 8080).
- web: `cd web && npm run dev | build | lint | test` (dev 5173).
- Full details in [`docs/service-context/RUNBOOK.md`](docs/service-context/RUNBOOK.md).

## Conventions

- api layered: `web`(controllers) → `service` → `repository`, + `dto`/`domain`/`mapper`/
  `security`/`storage`/`config`/`seed`. Liquibase owns DDL (`ddl-auto: validate`).
- web feature-sliced: `app`/`features`/`shared`/`pages`/`widgets`/`entities`.
- Never commit secrets. Env var names only — values live in secret manager.
- Keep service-context docs current: edit only inside `<!-- service-context:auto -->`
  markers; preserve human prose.
