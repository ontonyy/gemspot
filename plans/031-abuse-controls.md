# Plan 031: Per-instance rate limiting on the public auth and event endpoints

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- api/src/main/java/ee/gemspot/api/config api/src/main/java/ee/gemspot/api/web/GlobalExceptionHandler.java api/src/main/resources/application.yml`
> If anything changed, compare the "Current state" excerpts below against the live files; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (a too-tight limit locks out legitimate SPA bursts)
- **Depends on**: none. Executes the accepted proposal `plans/018-abuse-controls-auth-and-events.md`
- **Category**: security
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

`grep -rniE "ratelimit|bucket4j|resilience4j|throttle" api/src api/build.gradle.kts` returns
nothing. Two surfaces are unauthenticated and unbounded: `/auth/**`
(`SecurityConfig.java:66`) and `POST /events` (`SecurityConfig.java:60`). That allows unlimited
credential stuffing against a bcrypt verify (also a CPU-exhaustion lever on a small Cloud Run
instance), unlimited account creation, unlimited guessing at the email-change token space where
the token alone is the authority, and an anonymous writer who controls how large the `events`
table grows.

Proposal 018 was accepted on 2026-09-17 and left three questions open. This plan closes them.

## The three decisions

### 1. Mechanism — in-process fixed-window counters, no new dependency

**Decided**: a `OncePerRequestFilter` holding a `ConcurrentHashMap` of fixed windows, keyed by
client IP and endpoint group. State lives in the JVM.

**Rationale**: the service deploys to Cloud Run (`.github/workflows/deploy-api.yml`) and
`docs/service-context/` lists CACHE as Not Applicable — there is no Redis, Memorystore or any
shared cache tier in this stack. A shared store is a new hosted, paid dependency *and* a new
failure mode injected directly into the auth path. Cloud Armor is IaC this repository does not
own. In-process is the only option that does not enlarge the stack.

**Honest ceiling**: Cloud Run runs N instances, so the effective global limit is `N × configured`
and a client whose requests land on different instances gets N times the budget. This is
per-instance limiting, not global limiting. It raises the cost of casual abuse and of a single-host
credential-stuffing script; it does not stop a distributed attempt. The ceiling is stated in the
code (`ponytail:` comment in `RateLimitFilter`), in ADR 0005, and here.

**Rejected**: Bucket4j or resilience4j (a new dependency for ~40 lines of `ConcurrentHashMap`);
Redis/Memorystore (new hosted dependency, new auth-path failure mode, escalation); Bucket4j on a
JDBC backend (puts a write on the database for every login attempt — the exact load the limiter
exists to shed); Cloud Armor (repository owns no IaC).

### 2. Retention — deliberately out of scope, deferred to its own plan

**Decided**: this PR ships rate limiting only. No `event` table change, no Liquibase changeset, no
cleanup job.

**Rationale**: proposal 018's own "If accepted" section splits the work into two build plans
"because they have different blast radii". Rate limiting is application code with a rollback of
one filter; retention is a schema migration under `ddl-auto: validate` plus a scheduled delete,
and it needs a number — how long analytics data is worth keeping — that is a product call the
repository does not contain evidence for. Inventing a window here would be a guess wearing a
migration's clothes. Meanwhile the limiter on `POST /events` caps the *rate* of growth, which is
the half of the problem code can answer on its own.

**Left open, explicitly**: the `events` table still grows without bound over time, and
`EventsService.counts():38` still loads the whole table into memory for the admin dashboard.
Plan 023 (`api-whole-table-loads`) does **not** cover `EventsService` — checked. Both remain
unowned and should become a follow-up plan.

**Rejected**: bundling a 30/90/180-day retention changeset into this PR (unevidenced number,
schema blast radius, doubles the review surface); dropping server-side events for a client
analytics sink (removes the admin dashboard's data source — a product change, not a security fix).

### 3. Contract — 429 in the existing error shape, with `Retry-After`

**Decided**: `429` with body `{"statusCode":429,"message":"Too many requests …","error":"Too Many
Requests"}` and a `Retry-After` header carrying whole seconds until the window rolls.

**Rationale**: that is the exact `{statusCode, message, error}` shape
`GlobalExceptionHandler.bodyFor()` emits and that `SecurityConfig.write()` already duplicates for
its 401/403. The filter runs before the `DispatcherServlet`, so a `ResponseStatusException` would
never reach `GlobalExceptionHandler`; the filter writes the body itself, the same way
`SecurityConfig` does.

**SPA impact — none needed.** `web/src/shared/api/authedFetch.ts:35-42` reads any non-2xx body's
`message` (string or array) and raises `Error(message)` carrying `status`. A 429 therefore
surfaces as the sentence above rather than a raw status line, which is an acceptable degradation.
`Retry-After` is ignored by the client; the SPA does not auto-retry non-401s, so nothing loops.
**No `web/` source change in this PR** — it would not fix a break, so it is out of scope.

**Rejected**: RFC 7807 `application/problem+json` (a second error shape in one API); a bare 429
with no body (the SPA would render `429 ` with an empty statusText); retry-after as an HTTP-date.

## Current state

`api/src/main/java/ee/gemspot/api/config/SecurityConfig.java:60,66`:

```java
.requestMatchers(HttpMethod.POST, "/events").permitAll()
...
.requestMatchers("/auth/**").permitAll()
```

`api/src/main/java/ee/gemspot/api/common/RequestLoggingFilter.java:25-27` is the existing
`OncePerRequestFilter` precedent, `@Order(Ordered.HIGHEST_PRECEDENCE)`.

`api/src/main/java/ee/gemspot/api/web/GlobalExceptionHandler.java:60-66` is the body shape to
match. `api/build.gradle.kts` has no throttling dependency and gains none.

## Scope

**In scope**
- `api/src/main/java/ee/gemspot/api/common/RateLimitFilter.java` (new)
- `api/src/main/resources/application.yml` (a new `app.rate-limit` block)
- `api/src/test/java/ee/gemspot/api/integration/RateLimitTest.java` (new)
- `docs/adr/0005-per-instance-rate-limiting-on-cloud-run.md` (new)
- `plans/031-abuse-controls.md` (this file)
- `Engineering Vault/08 Decisions/personal-web-lessons.md` (one appended row)

**Out of scope** — do not touch
- `web/` source of any kind (see decision 3)
- any `api/src/main/resources/db/` changeset, `Event.java`, `EventsService.java` (decision 2)
- `SecurityConfig.java` — the filter sits in front of the security chain and needs no route change
- `.github/workflows/`, `plans/README.md`, `.claude/`, other plan files

## Steps

1. **Add `RateLimitFilter`.** `OncePerRequestFilter`, `@Order(Ordered.HIGHEST_PRECEDENCE + 10)` so
   it runs after `RequestLoggingFilter` (a 429 keeps its correlation id and access-log line) and
   before Spring Security's chain (order `-100`). Two groups: `/auth/**` and `POST /events`;
   everything else passes untouched. Client key = last `X-Forwarded-For` entry, else
   `getRemoteAddr()`. Fixed window per `(key, group)`. Over limit → write the 429 body and
   `Retry-After`, do not call the chain. Carry a `ponytail:` comment naming the per-instance
   ceiling and the upgrade path.
   *Verify*: `cd api && ./gradlew compileJava` → BUILD SUCCESSFUL.

2. **Configure it generously.** `app.rate-limit.{enabled,window-seconds,auth-per-minute,events-per-minute}`
   with env overrides. Defaults must not be reachable by a real SPA boot or by the test suite's own
   auth calls.
   *Verify*: `grep -A6 'rate-limit' api/src/main/resources/application.yml`.

3. **Prove it limits.** `RateLimitTest extends AbstractIntegrationTest` with
   `@TestPropertySource` lowering the limits, driving `POST /auth/login` past the threshold through
   the real `MockMvc` filter chain.
   *Verify*: `cd api && ./gradlew test --tests '*RateLimitTest'` → passing.

4. **ADR + vault row.** `docs/adr/0005-…` in the format of 0001-0004; one appended row on
   `Engineering Vault/08 Decisions/personal-web-lessons.md` citing branch
   `advisor/031-abuse-controls`.
   *Verify*: ADR number free across every worktree and branch —
   `git worktree list` then `ls <each>/docs/adr`, plus
   `for b in $(git branch --format='%(refname:short)'); do git ls-tree -r --name-only "$b" -- docs/adr/; done | sort -u`.

## Test plan

`RateLimitTest` must prove the filter is *wired*, not that a counter counts:

1. `authLimitTripsWith429AndRetryAfter` — fire `POST /auth/login` (bad credentials, so no bcrypt
   cost and no state) until over the configured limit from one client IP; assert the first N are
   not 429, the next is `429`, that `Retry-After` is present and parses to a positive integer, and
   that the body carries `statusCode: 429` and a non-empty `message`.
2. `differentClientIsUnaffected` — a second client key (different `X-Forwarded-For`) still gets a
   non-429 after the first client is blocked. Proves the key is per-client, not global.
3. `unlimitedPathNotAffected` — `GET /health` stays 200 after the auth bucket is exhausted. Proves
   the filter scopes to the two public groups and is not a blanket throttle.

Gates: `cd api && ./gradlew build test`, and `cd web && npm run lint && npm run test && npm run build`
to prove the SPA is untouched and unbroken.

## STOP conditions

- The drift check shows `SecurityConfig.java`, `GlobalExceptionHandler.java` or `application.yml`
  changed since `0ce116c`.
- Any pre-existing test fails *because of* the limiter (means the default limits are too tight —
  that is the lock-out risk landing in miniature; raise them, do not weaken the test).
- ADR `0005` turns out to be taken on any worktree or branch.
- The work starts to need a `db/changelog` entry — that means retention crept in; stop, it is
  decision 2's deferred follow-up.
- A shared cache/Redis dependency looks necessary to make a test pass — stop, that is the
  escalation proposal 018 named.

## Done criteria

- [ ] `RateLimitFilter` exists, is `@Component`-registered, adds no new Gradle dependency.
- [ ] Limits configurable via `app.rate-limit.*` and generous by default.
- [ ] 429 body matches `{statusCode, message, error}` and carries `Retry-After`.
- [ ] `RateLimitTest`'s three cases pass against the real filter chain.
- [ ] `cd api && ./gradlew build test` green.
- [ ] `cd web && npm run lint && npm run test && npm run build` green, `web/` unmodified.
- [ ] ADR 0005 written; one row appended to the vault index.
- [ ] Retention's deferral is recorded here, not silently omitted.
