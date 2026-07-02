# Runbook

<!-- service-context:auto:start -->

## Build / run / test (api)

| Purpose | Command |
|---------|---------|
| Run dev | `cd api && ./gradlew bootRun` (starts on `:8080`) |
| Test | `cd api && ./gradlew test` (JUnit + Testcontainers Postgres) |
| Build jar | `cd api && ./gradlew bootJar` → `build/libs/*.jar` |

## Build / run / test (web)

| Purpose | Command |
|---------|---------|
| Dev server | `cd web && npm run dev` (`:5173`) |
| Build | `cd web && npm run build` (`tsc -b && vite build` → `web/dist`) |
| Lint | `cd web && npm run lint` |
| Test | `cd web && npm run test` (`vitest run`) |
| Preview | `cd web && npm run preview` (`:4173`) |

## Docker (api)

Multi-stage Dockerfile (Gradle/JDK 25 build → `eclipse-temurin:25-jre`), non-root user
uid 10001, `-XX:MaxRAMPercentage=75`, `EXPOSE 8080`.

## Ports

| Port | Use |
|------|-----|
| 8080 | API app (`PORT`) |
| 6543 | Postgres pooler (runtime) |
| 5432 | Postgres direct (migrations) |
| 1025 | MailHog (dev SMTP) |
| 5173 | web dev server |
| 4173 | web preview |

## Deploy

- **api**: `.github/workflows/deploy-api.yml` on push to `master` touching `api/**`.
  <!-- TODO: live URL ambiguous — api/README.md references both Cloud Run (service
  `gemspot-api`) and `https://gemspot-api.onrender.com`. Maintainer must confirm which is
  authoritative; do not treat either as truth. -->
- **web**: built to `web/dist`, deployed to Firebase Hosting (site `gemspot`, SPA rewrite
  → `/index.html`); see `firebase.json`.

## Operational checks

- Liveness: `GET /health` → `{"status":"ok"}`; `GET /actuator/health`.
- Metrics: `GET /actuator/prometheus`.
- Migrations run via Liquibase on boot (direct DB `:5432`).

**Confidence**: HIGH for commands/ports; deploy URL UNKNOWN (flagged).

<!-- service-context:auto:end -->
