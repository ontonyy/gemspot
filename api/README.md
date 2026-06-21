# GemSpot API

Spring Boot (Java 25 / Gradle) backend for GemSpot. Serves the frontend DTO
contract (`web/src/shared/api/types.ts`) consumed by the React app in `web/`.

Layered: `web` (controllers) → `service` (use cases) → `repository` (persistence),
with `mapper`, `dto`, `domain`, `security`, `storage`, `config`, `seed`.

## Run locally

```bash
./gradlew bootRun        # starts on :8080 (server.port: ${PORT:8080})
./gradlew test           # JUnit integration + service tests
./gradlew bootJar        # build runnable jar → build/libs/*.jar
```

Config in `src/main/resources/application.yml`. Schema managed by Liquibase
(`src/main/resources/db/changelog`). DB seed runs on boot.

## Deploy

`Dockerfile` (multi-stage Gradle build → Temurin JRE) is built and pushed to
Cloud Run by `.github/workflows/deploy-api.yml` on push to `master` touching
`api/**`. Live: `https://gemspot-api.onrender.com` → Cloud Run service `gemspot-api`.

## Legacy

The previous NestJS + Prisma backend is archived in `../legacy-nest/` (no longer
deployed). It defined the original DTO contract this service preserves.
