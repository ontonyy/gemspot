# Config

`api/src/main/resources/application.yml` + `@Configuration` classes in `config/`. Secret
values live in env / secret manager and must **never** be copied here — only key names.

<!-- service-context:auto:start -->

## application.yml keys (names only)

| Key | Source / default | Notes |
|-----|------------------|-------|
| `spring.application.name` | `gemspot-api` | |
| `spring.datasource.url` | `${DATABASE_URL}` | pooler `:6543`, `prepareThreshold=0` |
| `spring.jpa.hibernate.ddl-auto` | `validate` | Liquibase owns DDL |
| `spring.jpa.properties.hibernate.globally_quoted_identifiers` | `true` | case-sensitive cols |
| `spring.mail.*` | `${SMTP_*}` | dev default MailHog `localhost:1025` |
| `spring.liquibase.*` | separate migration DB URL | direct `:5432` |
| `server.port` | `${PORT:8080}` | |
| `management.endpoints.web.exposure.include` | `health,prometheus` | |
| `management.metrics.tags.application` | `gemspot-api` | |
| `sentry.dsn` | `${SENTRY_DSN:}` | no-op if empty |
| `sentry.send-default-pii` | `false` | |
| `app.cors.origin` | `${CORS_ORIGIN:http://localhost:5173}` | comma-separated |
| `app.mail.from` | `${MAIL_FROM:no-reply@gemspot.local}` | |
| `app.web-url` | `${WEB_URL:http://localhost:5173}` | SPA base for email links |
| `supabase.s3.*` | endpoint/region `eu-north-1`/bucket `place-photos` | keys from env |

## Env var NAMES (values in secret manager — never reproduce)

`DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_MIGRATION_URL`,
`DATABASE_MIGRATION_USER`, `DATABASE_MIGRATION_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`, `SENTRY_DSN`,
`SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `CORS_ORIGIN`, `MAIL_FROM`, `WEB_URL`,
`SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_ACCESS_KEY`,
`SUPABASE_S3_SECRET_KEY`, `SUPABASE_BUCKET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`JWT_ACCESS_TTL` (15m), `JWT_REFRESH_TTL` (30d), `PORT`.

## Config classes

- `config/SecurityConfig.java` — JWT, stateless, CSRF off, route matrix, 401/403 handlers.
- `config/CorsConfig.java` — origins from `CORS_ORIGIN`, credentials enabled.
- `config/StorageConfig.java` — AWS S3 client → Supabase Storage (path-style).
- `config/JacksonConfig.java` — lenient deserialization (ignore unknown props).

**Confidence**: HIGH (keys grep-verified at `aad27f1`; secret values intentionally omitted).

<!-- service-context:auto:end -->
