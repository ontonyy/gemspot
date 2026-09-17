# 5. Per-instance rate limiting on Cloud Run, with the ×N weakness accepted

Date: 2026-09-17

## Status

Accepted

## Context

The API had no throttling of any kind — `grep -rniE "ratelimit|bucket4j|resilience4j|throttle"` over `api/src` and `api/build.gradle.kts` returned nothing. Two surfaces are unauthenticated: `/auth/**` and `POST /events` (`SecurityConfig.java:60,66`). That leaves credential stuffing against a bcrypt verify — which on a small instance is also a CPU-exhaustion lever — unlimited account creation, unlimited guessing at the email-change token space where the token alone is the authority, and an anonymous writer who decides how large the `events` table gets.

The service runs on Cloud Run (`.github/workflows/deploy-api.yml`) and `docs/service-context/` lists CACHE as Not Applicable: there is no Redis, no Memorystore, no shared state of any kind in this stack. Cloud Run also scales horizontally, which is exactly what makes the choice awkward — any state held in the JVM is per-instance.

## Decision

Limit in-process: one `OncePerRequestFilter` (`RateLimitFilter`) holding fixed windows in a `ConcurrentHashMap`, keyed by client address and endpoint group, with the limits configurable under `app.rate-limit.*` and generous by default. No new dependency; the counter is about forty lines of `java.util.concurrent`.

Over the limit the filter writes `429` itself, in the `{statusCode, message, error}` shape `GlobalExceptionHandler` emits, plus `Retry-After` — a filter runs before the `DispatcherServlet`, so a `ResponseStatusException` would never reach the handler. This is the same reason `SecurityConfig` writes its own 401/403 bodies.

## Consequences

- **This is per-instance limiting, not global limiting, and the difference is the whole cost of the decision.** With N Cloud Run instances the effective budget is `N × configured`, and a client whose requests are spread across instances gets N times the allowance. It raises the cost of casual abuse and of a single-host script. It does not stop a distributed attempt, and it must not be described in a security review as though it did. The ceiling is restated as a `ponytail:` comment on the filter so it cannot be read as an oversight.
- The upgrade path is a shared counter (Memorystore/Redis) or an edge policy (Cloud Armor). Both were rejected here on *scope*, not on merit: Redis is a new hosted dependency and a new failure mode inserted into the auth path, and Cloud Armor is IaC this repository does not own. Neither rejection transfers once the service has real traffic or a real attack — revisit then, rather than defending the map.
- Bucket4j and resilience4j were rejected as a dependency for what a `ConcurrentHashMap` does; a JDBC-backed bucket was rejected because it puts a database write on every login attempt, which is the load the limiter exists to shed.
- `429` is a new status on public endpoints. `web/src/shared/api/authedFetch.ts` already reads any non-2xx body's `message`, so the SPA shows the sentence rather than a raw status line and does not auto-retry. The web client was therefore left unchanged. If a client is ever taught to respect `Retry-After`, the header is already there.
- Client identity comes from the **last** `X-Forwarded-For` entry, not the first. Cloud Run appends the observed caller to whatever arrived, so a forged header only pollutes the entries ahead of the real one. Reading the first entry — the common default — would make the limit bypassable with a header.
- Fixed windows, not a token bucket or sliding log: a client can send up to `2 × limit` across a window boundary. Accepted; the limits are generous enough that the burst is not the threat being defended against.
- Retention on the `events` table was deliberately **not** decided here (see `plans/031-abuse-controls.md`). The limiter caps the rate of growth; the table still grows without bound over time, and `EventsService.counts()` still loads it whole. Both remain open.
