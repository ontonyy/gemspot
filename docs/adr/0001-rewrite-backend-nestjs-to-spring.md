# 1. Rewrite backend NestJS → Spring Boot

Date: 2026-06-13

## Status

Accepted

## Context

The GemSpot backend is a working NestJS 10 (Node/TypeScript) app on Render: Prisma 5, custom JWT auth, 33 passing Jest tests, local-disk file storage. It serves a typed DTO contract the React SPA depends on.

Two real operational pains exist: Render's free disk is ephemeral (uploaded photos vanish on redeploy), and the Node service has cold-start latency on the free tier. Both are fixable without changing language — move uploads to Supabase Storage and re-host the existing Node container.

So the rewrite is not bug-driven. The driver is strategic: the owner wants the long-term stack to be JVM/Spring for a production-ready app — current, well-supported, aligned with the broader engineering environment — rather than continue investing in the Node/Nest implementation.

## Decision

Rewrite the backend in Spring Boot 3.5 / Java 25, replacing NestJS in place in the same monorepo. The frontend's typed DTO contract is held as the fixed point: the new Java API must serve byte-identical JSON to the Nest API and mock, so the React app changes only `VITE_API_URL`. The migration also moves data and photos to Supabase, hosting to Cloud Run + Firebase — these ride along with the rewrite, not the reverse.

## Consequences

- Significant up-front cost: full backend re-implementation (entities, services, auth, storage, tests) versus a few days to patch storage + host on the existing Node app.
- The DTO contract becomes the test oracle for every backend block; correctness is judged against byte-identical JSON, not feature parity in the abstract.
- Long-term: JVM/Spring stack, broader library ecosystem, alignment with target production environment.
- Risk concentrated below the service layer (JPA mappings, Liquibase schema, real SQL) — addressed by adding a Testcontainers integration layer (see plan decision D6), since the ported mocked-repository tests cannot catch mapping/schema drift.
- The two original pains (ephemeral photos, cold start) are resolved as side effects: Supabase Storage is durable; `min-instances=1` removes JVM cold-start hangs (D7).

## Alternatives considered

- **Keep NestJS, fix only the pains** (Supabase Storage + re-host). Cheapest, days not weeks. Rejected: does not advance the strategic stack goal, which is the actual driver.
- **Rewrite but adopt managed pieces** (e.g. Supabase Auth). Rejected for auth — see ADR 0002.
