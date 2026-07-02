# Dependencies

Outbound services + key build libraries. Build file: `api/build.gradle.kts`.

<!-- service-context:auto:start -->

## Outbound dependencies

| Dependency | Type | Used by | File |
|------------|------|---------|------|
| Google OAuth | HTTP (idToken verify) | login/oauth | `service/AuthService.java` (RestClient) |
| Facebook OAuth | HTTP (accessToken verify) | login/oauth | `service/AuthService.java` (RestClient) |
| Supabase Storage (S3-compatible) | HTTP (AWS SDK v2 S3) | photo uploads | `config/StorageConfig.java`, `storage/SupabaseStorageService.java` |
| SMTP (MailHog dev / prod SMTP) | mail | verified email change | `service/MailService.java` (JavaMailSender) |

OAuth tokens are sent from the SPA and verified server-side; no provider SDK.

## Key build libraries

| Library | Version | Role |
|---------|---------|------|
| spring-boot-starter-web / data-jpa / validation / security / mail / actuator | 3.5.6 | core |
| liquibase-core | (managed) | DDL migrations |
| postgresql | runtime | JDBC driver |
| jjwt (api/impl/jackson) | 0.12.6 | JWT HS256 sign/verify |
| micrometer-registry-prometheus | (managed) | metrics |
| sentry-spring-boot-starter-jakarta | 8.43.2 | error tracking (no-op if DSN unset) |
| logstash-logback-encoder | 8.0 | structured JSON logs |
| aws sdk v2 (s3) | 2.31.78 | Supabase storage |
| spring-boot-starter-test, testcontainers (postgresql) | (managed) | tests |

Runtime: Java 25, Spring Boot 3.5.6, Gradle 9.

**Web frontend deps** (`web/package.json`): React 19, react-router-dom 7, @tanstack/react-query 5,
zustand 5, maplibre-gl 5, supercluster 8, date-fns 4, Vite 8, vitest 4. See [WEB.md](WEB.md).

**Confidence**: HIGH (build files + client code grep-verified at `aad27f1`).

<!-- service-context:auto:end -->
