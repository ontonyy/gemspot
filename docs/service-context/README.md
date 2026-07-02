# Service context — GemSpot

> Generated from commit `aad27f1`; facts grep-verified.

GemSpot is a monorepo with two deployables: a **Spring Boot REST API** (`api/`, Java 25,
Gradle) and a **React 19 + Vite web frontend** (`web/`, feature-sliced TypeScript). The API
serves the DTO contract the web app consumes; the web app is a static SPA deployed to
Firebase Hosting. These docs are the fast, durable orientation for the whole service —
source of truth is the code; the vault only links here.

<!-- service-context:auto:start -->

## Responsibilities

- **api/** — auth (custom dual-token JWT, Google/Facebook OAuth), places/categories/guides
  read surface, user submissions + reports moderation, photo uploads to Supabase storage,
  anonymous analytics events, admin panel. PostgreSQL via JPA + Liquibase.
- **web/** — map-first discovery UI (maplibre-gl), explore rail, place detail, add-spot
  flow, saved spots, account/auth, admin screens. Talks to the API through a mock/real seam.

## Doc index

| Doc | Purpose |
|-----|---------|
| [API.md](API.md) | Index only — transport presence summary |
| [HTTP.md](HTTP.md) | REST controllers, base paths, auth matrix, error shape |
| [GRPC.md](GRPC.md) | gRPC — Not Applicable (HTTP-only) |
| [MESSAGING.md](MESSAGING.md) | Brokers — Not Applicable (no Kafka/Rabbit/SQS) |
| [DATA.md](DATA.md) | PostgreSQL entities, repositories, Liquibase migrations |
| [CACHE.md](CACHE.md) | Cache — Not Applicable (no Redis/Caffeine) |
| [CONFIG.md](CONFIG.md) | Config keys, profiles, env-var names, config classes |
| [DEPENDENCIES.md](DEPENDENCIES.md) | Outbound deps (OAuth, S3, SMTP), build libs |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Logs, metrics, error tracking |
| [RUNBOOK.md](RUNBOOK.md) | Build/run/test, Docker, ports, deploy |
| [WEB.md](WEB.md) | React frontend: layout, API seam, routes, state, map |

## External links

- Confluence: <!-- TODO: link if known -->
- Grafana / dashboards: <!-- TODO: link if known -->
- Live API URL: see [RUNBOOK.md](RUNBOOK.md) — ambiguous in source (Cloud Run vs onrender), unconfirmed.

**Evidence summary**: derived from `api/` (Spring controllers, domain, config) and `web/`
(feature-sliced source) at commit `aad27f1`. Per-doc confidence noted in each file.

<!-- service-context:auto:end -->
