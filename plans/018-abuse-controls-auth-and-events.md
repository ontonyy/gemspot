# Proposal 018: Abuse controls for the public auth and event-ingress endpoints

> **Tier: propose.** This is a decision to make, not a task to execute. It needs a maintainer's
> call on the mechanism (in-process vs. shared state), on the event-table retention policy, and on
> the 429 contract before anyone writes code. Do not implement from this document; turn the chosen
> option into a build-tier plan first.
>
> **Escalation triggers**: multi-instance runtime state on Cloud Run (infrastructure), a likely
> retention/index migration on the `event` table (DB schema), and a new `429` status on public
> endpoints (public API contract change).

## Status

- **Priority**: P2
- **Effort**: M–L depending on the option chosen
- **Risk**: MED (a too-tight limit locks out legitimate SPA bursts)
- **Depends on**: none (but land plan 013 first — it removes the adjacent fail-open holes)
- **Category**: security / architecture
- **Planned at**: commit `0ce116c`, 2026-09-17

## The problem

The API has no throttling anywhere:
`grep -rniE "ratelimit|bucket4j|resilience4j|throttle" api/src api/build.gradle.kts` returns
nothing. Two public surfaces are therefore unbounded.

**1. The auth surface.** `api/src/main/java/ee/gemspot/api/config/SecurityConfig.java:66` is
`.requestMatchers("/auth/**").permitAll()`, covering `/auth/login`, `/auth/register`,
`/auth/refresh` and `/auth/email/verify`. That allows:
- unlimited credential stuffing against a bcrypt verify — which is also a CPU-exhaustion lever,
  since each attempt costs a deliberate amount of work on a small Cloud Run instance;
- unlimited account creation;
- brute force over the email-change token space, where the token alone is the authority
  (`AuthService.verifyEmailChange`, and `/auth/email/verify` is public by design — that decision
  stands, but it assumes the token cannot be guessed at volume).

**2. The event ingress.** `SecurityConfig.java:60` is
`.requestMatchers(HttpMethod.POST, "/events").permitAll()`, and
`api/src/main/java/ee/gemspot/api/service/EventsService.java:27-33` writes one row per request with
no auth and no cap. There is no retention policy. Worse, the admin read path loads the whole table:

```java
/** Grouped counts for the admin dashboard, ordered by count desc. */
public List<EventCountDto> counts() {
    Map<String, Long> grouped = new LinkedHashMap<>();
    for (Event e : eventRepo.findAll()) {          // EventsService.java:38
        grouped.merge(e.getName(), 1L, Long::sum);
    }
    ...
}
```

So an anonymous writer controls both how large that table gets and, transitively, whether the admin
dashboard OOMs. The `counts()` fix is trivial (a `group by` query) and could be carried by whichever
build plan comes out of this — but on its own it only raises the ceiling, it does not close the
ingress.

## What needs deciding

**a) Where the rate-limit state lives.** Cloud Run scales to multiple instances, so an in-process
bucket (Caffeine, Bucket4j local) gives each instance its own budget — the effective limit is
`N × configured`. Options:
  - *In-process, generous limits.* Simplest, no new infrastructure, accepts the ×N fuzziness.
    Adequate against casual abuse; weak against a distributed attempt.
  - *Shared store (Redis/Memorystore, or Bucket4j on a JDBC backend).* Accurate, but adds a hosted
    dependency and a failure mode to the auth path — and the service currently has no cache tier at
    all (`docs/service-context/` lists CACHE as Not Applicable). This is the escalation.
  - *Edge-level.* Cloud Armor / a load-balancer policy in front of Cloud Run. No application code,
    but it is IaC the repo does not currently own, and the workflows deploy straight to Cloud Run.

**b) Whether `/events` should stay anonymous at all.** Alternatives: keep it open with a tight
per-IP cap; require a session; or drop server-side event storage and use a client analytics sink.
Whatever is chosen, the table needs a retention policy (and an index supporting it) — that is the
DB-migration trigger.

**c) The response contract.** A new `429` on public endpoints is a contract change the SPA must
handle (today an unexpected status surfaces as a raw error string). If a `Retry-After` header is
part of it, the web client needs to respect it.

**d) The limits themselves.** Per-IP or per-account? What counts as a burst for a legitimate SPA
that fires several calls at boot? Getting this wrong locks out real users, which is why it is a
judgement call and not a default.

## Evidence

| What | Where |
|------|-------|
| No throttling dependency or filter anywhere | `api/build.gradle.kts`, `api/src` (grep, no hits) |
| `/auth/**` fully public | `api/src/main/java/ee/gemspot/api/config/SecurityConfig.java:66` |
| `POST /events` public | `api/src/main/java/ee/gemspot/api/config/SecurityConfig.java:60` |
| One unauthenticated row write per request | `api/src/main/java/ee/gemspot/api/service/EventsService.java:27-33` |
| Whole-table load for the dashboard counts | `api/src/main/java/ee/gemspot/api/service/EventsService.java:38` |
| Error body shape a 429 must match | `api/src/main/java/ee/gemspot/api/web/GlobalExceptionHandler.java` |

## Trade-offs, briefly

Doing nothing is survivable today — the service is small and unadvertised, and the auth design has
real mitigations (short access TTL, refresh-reuse detection). The risk is not theoretical, though:
the event table grows monotonically with zero authentication, so the first cost is likely a slow
database and an admin dashboard that stops loading, not a dramatic breach. That also makes it a
good forcing function to decide retention now, while the table is small enough that a migration is
cheap.

The cheapest credible first move is: in-process per-IP limits on the five auth paths plus
`POST /events`, generous enough that no real user notices, combined with the `counts()` `group by`
fix and an event retention window. That buys most of the protection with no new infrastructure, and
it can be tightened later. The accurate-but-heavier shared-store option only earns its keep if the
service starts seeing real traffic or a real attack.

## If accepted

Split into at least two build-tier plans, because they have different blast radii:
1. **Rate-limit filter + 429 contract** — a `OncePerRequestFilter`, the limit configuration, the
   `GlobalExceptionHandler`-shaped 429 body, web-client handling, and tests that assert the limit
   trips and that a normal session never does.
2. **Event ingress retention + counts query** — the `group by` query, a retention decision, and the
   Liquibase migration/index that implements it.

Each needs the usual: exact file paths, current-state excerpts, verification commands
(`cd api && ./gradlew test`, `cd web && npm run lint && npm run test && npm run build`), and STOP
conditions.
