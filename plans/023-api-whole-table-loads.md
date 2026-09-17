# Plan 023: Replace whole-table loads with database counts and filters

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- api/src/main/java/ee/gemspot/api/service api/src/main/java/ee/gemspot/api/repository`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (behaviour-preserving; each change is a like-for-like query swap)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Five queries in the API load entire tables into JVM memory to compute something the
database could answer directly. `AdminStatsDto` — rendered on every admin dashboard load —
materialises every ACTIVE place, every PENDING submission and every OPEN report just to
call `.size()` on the lists. Worse, `SubmissionsService.listMine()` and
`ReportsService.listMine()` fetch **every row from every user** and then filter by
`userId` in a Java stream: two endpoints whose cost grows with total platform traffic
rather than with the calling user's own data.

Today the tables are small, so nothing is on fire. That is exactly when this is cheap to
fix: each site becomes a Spring Data derived query, the behaviour is identical, and the
endpoints stop degrading as the product grows. It also removes a latent correctness
footgun — a per-user list built by filtering an all-users fetch is one refactor away
from leaking other users' rows.

## Current state

**`api/src/main/java/ee/gemspot/api/service/AdminService.java:75-82`**

```java
    public AdminStatsDto stats() {
        long places = placeRepo.count();
        long activePlaces = placeRepo.findByStatusOrderBySortAsc(PlaceStatus.ACTIVE).size();
        long pendingSubmissions = submissionRepo.findByStatusOrderBySubmittedAtDesc(SubmissionStatus.PENDING).size();
        long openReports = reportRepo.findByStatusOrderByReportedAtDesc(ReportStatus.OPEN).size();
        long users = userRepo.count();
        return new AdminStatsDto(places, activePlaces, pendingSubmissions, openReports, users);
    }
```

Note `places` and `users` already use `count()` correctly — the pattern to copy is right
there in the same method.

**`api/src/main/java/ee/gemspot/api/service/SubmissionsService.java:61-64`**

```java
    /** PENDING submissions for the signed-in user — survives reload (server-backed). */
    public List<SubmissionDto> listMine(String userId) {
        List<Submission> mine = submissionRepository.findAllByOrderBySubmittedAtDesc().stream()
                .filter(r -> userId.equals(r.getUserId()))
                .collect(Collectors.toList());
```

The rest of that method (the batched photo-URL fetch) is **correct and must be preserved
exactly** — only the source of `mine` changes.

**`api/src/main/java/ee/gemspot/api/service/ReportsService.java:70-72`**

```java
    /** OPEN reports for the signed-in user — survives reload (server-backed). */
    public List<ReportDto> listMine(String userId) {
        return reportRepository.findAllByOrderByReportedAtDesc().stream()
                .filter(r -> userId.equals(r.getUserId()))
                .map(r -> new ReportDto( ... ))
```

**Repositories as they exist today:**

```java
// api/src/main/java/ee/gemspot/api/repository/SubmissionRepository.java
public interface SubmissionRepository extends JpaRepository<Submission, String> {
    List<Submission> findByStatusOrderBySubmittedAtDesc(SubmissionStatus status);
    List<Submission> findAllByOrderBySubmittedAtDesc();
}

// api/src/main/java/ee/gemspot/api/repository/ReportRepository.java
public interface ReportRepository extends JpaRepository<Report, String> {
    List<Report> findByStatusOrderByReportedAtDesc(ReportStatus status);
    List<Report> findAllByOrderByReportedAtDesc();
}
```

**Conventions to match**: repositories are Spring Data JPA interfaces with derived query
methods; a hand-written `@Query` is used only where a fetch-join is needed (see
`PlaceRepository.findByStatusWithCategories` for the house style of documenting *why*).
Everything here is expressible as a derived method — no `@Query` should be needed.
Liquibase owns DDL and `ddl-auto` is `validate`: **this plan adds no columns and no
migration.** Adding an index is out of scope (see Maintenance notes).

## Commands you will need

| Purpose        | Command                                      | Expected on success |
|----------------|----------------------------------------------|---------------------|
| Build + test   | `cd api && ./gradlew build test`             | BUILD SUCCESSFUL    |
| Tests only     | `cd api && ./gradlew test`                   | BUILD SUCCESSFUL    |
| One test class | `cd api && ./gradlew test --tests '*AdminServiceTest'` | passes    |

## Scope

**In scope** (the only files you should modify):
- `api/src/main/java/ee/gemspot/api/repository/PlaceRepository.java`
- `api/src/main/java/ee/gemspot/api/repository/SubmissionRepository.java`
- `api/src/main/java/ee/gemspot/api/repository/ReportRepository.java`
- `api/src/main/java/ee/gemspot/api/service/AdminService.java`
- `api/src/main/java/ee/gemspot/api/service/SubmissionsService.java`
- `api/src/main/java/ee/gemspot/api/service/ReportsService.java`
- `api/src/test/java/ee/gemspot/api/service/SubmissionsServiceTest.java` (extend)
- `api/src/test/java/ee/gemspot/api/service/AdminServiceTest.java` (extend)
- `api/src/test/java/ee/gemspot/api/integration/NPlusOneQueryCountTest.java` (extend)

**Out of scope** (do NOT touch, even though they look related):
- **Any DTO, controller, or response shape.** `AdminStatsDto`, `SubmissionDto` and
  `ReportDto` keep their exact fields and values. This is invisible to clients.
- Adding pagination to any endpoint. Real improvement, different plan, and it *would*
  change the API contract.
- `PlaceRepository.findByStatusWithCategories` and the `GET /places` path — already
  optimised by an earlier plan; leave it alone.
- Any Liquibase changelog / database index. No schema change belongs in this plan.
- The photo-batching logic already in `SubmissionsService.listMine()` — preserve it
  verbatim.
- `AdminService.listSubmissions()` — it genuinely needs the rows.

## Git workflow

- Branch: `advisor/023-api-whole-table-loads`
- Commit style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
  (e.g. `BP-NA. [gemspot] count and filter in the database, not in memory`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the derived query methods

Add to the repositories (matching the existing method-naming style in each file):

```java
// PlaceRepository
long countByStatus(PlaceStatus status);

// SubmissionRepository
long countByStatus(SubmissionStatus status);
List<Submission> findByUserIdOrderBySubmittedAtDesc(String userId);

// ReportRepository
long countByStatus(ReportStatus status);
List<Report> findByUserIdOrderByReportedAtDesc(String userId);
```

Before writing these, confirm the field names on the entities: open
`api/src/main/java/ee/gemspot/api/domain/Submission.java` and `Report.java` and check the
property is exactly `userId` and the timestamps are exactly `submittedAt` / `reportedAt`.
Spring Data derives these method names from the entity properties — a mismatch fails at
application startup, not at compile time.

**Verify**: `cd api && ./gradlew build test` → BUILD SUCCESSFUL. (Spring Data validates
derived query names when the context starts, which the integration tests do — a typo
here surfaces as a context-load failure, so a green build is the real check.)

### Step 2: Use the counts in `AdminService.stats()`

Rewrite the three `.size()` lines to use the new count methods. The other two lines
(`placeRepo.count()`, `userRepo.count()`) stay as they are.

```java
    public AdminStatsDto stats() {
        long places = placeRepo.count();
        long activePlaces = placeRepo.countByStatus(PlaceStatus.ACTIVE);
        long pendingSubmissions = submissionRepo.countByStatus(SubmissionStatus.PENDING);
        long openReports = reportRepo.countByStatus(ReportStatus.OPEN);
        long users = userRepo.count();
        return new AdminStatsDto(places, activePlaces, pendingSubmissions, openReports, users);
    }
```

**Verify**: `cd api && ./gradlew test --tests '*AdminServiceTest'` → passes.

### Step 3: Filter by user in the database

In `SubmissionsService.listMine(String userId)`, replace the fetch-all-then-stream-filter
with the derived query, keeping the rest of the method **byte-for-byte identical**:

```java
        List<Submission> mine = submissionRepository.findByUserIdOrderBySubmittedAtDesc(userId);
```

In `ReportsService.listMine(String userId)`, likewise start from
`reportRepository.findByUserIdOrderByReportedAtDesc(userId)` and drop only the
`.filter(r -> userId.equals(r.getUserId()))` stage. Every `.map(...)` and the DTO
construction stay exactly as they are.

Watch the null case: the old filter was `userId.equals(r.getUserId())`, which excluded
rows whose `userId` is null. A derived `findByUserId(userId)` with a non-null argument
also excludes nulls, so behaviour matches. If `listMine` can ever be called with a null
`userId`, the old code would have thrown an NPE — confirm the callers in
`api/src/main/java/ee/gemspot/api/web/` always pass an authenticated principal's id, and
if any can pass null, STOP and report rather than changing the contract.

**Verify**: `cd api && ./gradlew test --tests '*SubmissionsServiceTest'` → passes.
`grep -rn "findAllByOrderBySubmittedAtDesc()\|findAllByOrderByReportedAtDesc()" api/src/main/java/ee/gemspot/api/service/` →
only `AdminService.listSubmissions()`'s use of `findAllByOrderBySubmittedAtDesc()` remains
(the admin queue legitimately lists everyone's submissions).

### Step 4: Full gate

**Verify**: `cd api && ./gradlew build test` → BUILD SUCCESSFUL, no test removed or skipped.

## Test plan

- **`SubmissionsServiceTest`** — add a case: two users each with submissions; assert
  `listMine(userA)` returns only user A's rows, in `submittedAt` descending order, and
  that the photo URLs still come back attached (the batching must survive the change).
- **`ReportsService`** — there is no `ReportsServiceTest` today. Add the equivalent case
  wherever the existing suite most naturally covers reports; if that means creating
  `api/src/test/java/ee/gemspot/api/service/ReportsServiceTest.java`, model it structurally
  on `SubmissionsServiceTest.java`.
- **`AdminServiceTest`** — add/extend a case asserting `stats()` returns the same counts
  as before for a seeded fixture (one active + one inactive place, one pending + one
  approved submission, one open + one resolved report).
- **`NPlusOneQueryCountTest`** — this suite already asserts query counts for list
  endpoints. Add an assertion that the admin stats path issues a bounded number of
  queries (5) rather than materialising rows. If its harness cannot express that without
  restructuring, skip this bullet and say so in the PR — do not rebuild the harness.
- Verification: `cd api && ./gradlew build test` → BUILD SUCCESSFUL with the new tests passing.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "\.size()" api/src/main/java/ee/gemspot/api/service/AdminService.java` shows
      no `.size()` inside `stats()`
- [ ] `grep -n "countByStatus" api/src/main/java/ee/gemspot/api/service/AdminService.java`
      returns three matches
- [ ] `grep -rn "filter(r -> userId.equals" api/src/main/java/ee/gemspot/api/service/`
      returns no matches
- [ ] `cd api && ./gradlew build test` → BUILD SUCCESSFUL
- [ ] No file under `api/src/main/resources/db/` (Liquibase) modified
- [ ] No DTO or controller file modified (`git status --porcelain`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- An entity property is not named `userId`, `submittedAt` or `reportedAt`, so the derived
  method names above are wrong — report the actual names rather than guessing a `@Query`.
- The application context fails to start because a derived query name can't be resolved,
  and the fix is not a rename.
- Any caller of `listMine` can pass a null `userId`.
- A test asserts on the *number of rows loaded* in a way the change alters — that would
  mean a behaviour difference this plan claims not to have; report it.
- A step's verification fails twice after a reasonable fix attempt.
- You conclude an index is needed. Report the column; do not add a Liquibase changeset.

## Maintenance notes

- `submissions.user_id` and `reports.user_id` now carry real query load. If either table
  grows past a few hundred thousand rows, an index on those columns is the next step —
  deliberately deferred here because it is a schema migration and belongs in its own
  change with a reviewed Liquibase changeset.
- A reviewer should scrutinise: (a) that `SubmissionsService.listMine`'s photo-batching
  block is unchanged, (b) that ordering is preserved (`...OrderBySubmittedAtDesc`), since
  the web UI renders these lists in submission order, (c) that no DTO field changed.
- If pagination is ever added to `listMine` or the admin queue, these derived methods are
  the right place to take a `Pageable` — unlike the fetch-join in
  `PlaceRepository.findByStatusWithCategories`, which explicitly must not be paginated.
