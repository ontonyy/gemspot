# Plan 002: Eliminate N+1 query patterns in list endpoints

> **Executor instructions**: Follow step by step. Run every Verify command and confirm the
> expected result before moving on. If a "STOP condition" occurs, stop and report. When
> done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat aad27f1..HEAD -- api/src/main/java/ee/gemspot/api/service api/src/main/java/ee/gemspot/api/domain`
> If any cited file changed, compare the "Current state" excerpts to live code; on mismatch STOP.

Working location:
  repo: gemspot
  base_branch: master
  branch: claude/plan-002-execution-1710a9
  worktree: /Users/ontony/Desktop/archivarius/codes/gemspot/.claude/worktrees/plan-002-execution-1710a9
  last_commit: dirty: api/src/main/java/ee/gemspot/api/repository/{PlaceRepository,ProfileRepository,SubmissionPhotoRepository}.java, api/src/main/java/ee/gemspot/api/service/{PlacesService,AdminService,SubmissionsService}.java, api/src/test/java/ee/gemspot/api/service/{PlacesServiceTest,AdminServiceTest,SubmissionsServiceTest}.java, api/src/test/java/ee/gemspot/api/integration/QueryCountRegressionTest.java, plans/README.md, plans/002-fix-n-plus-1-queries.md
  status: complete-uncommitted (steps 1-4 done)
  updated: 2026-08-07

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (touches query paths + entity fetch strategy; needs test coverage)
- **Depends on**: none (independent of 001)
- **Category**: perf
- **Planned at**: commit `aad27f1`, 2026-07-03

## Why this matters

Three list endpoints issue one query per row instead of batching. The worst is the **public
place catalog** (`GET /places`) — the most-hit endpoint — which lazily loads each place's
categories in a loop. `AdminService.listUsers()` runs one profile lookup per user, and
`SubmissionsService.listMine()` runs one photo lookup per submission. Row counts are small
today (≈10 seeded places), so this is not an outage — but it scales linearly with data and
concurrency, and the place-list path is on every map load. Batching removes the multiplier.

## Current state

**1. `api/src/main/java/ee/gemspot/api/service/PlacesService.java:31-40`** — public list; the
`.filter` and `mapper::toCard` both touch `p.getCategories()` (LAZY), one query per place:
```java
@Transactional(readOnly = true)
public List<PlaceCardDto> list(String cat) {
    List<Place> active = placeRepo.findByStatusOrderBySortAsc(PlaceStatus.ACTIVE);
    return active.stream()
            .filter(p -> cat == null || p.getCategories().stream()
                    .anyMatch(pc -> pc.getCategory().getId().equals(cat)))
            .map(mapper::toCard)
            .toList();
}
```
`Place.categories` is `@OneToMany(fetch = FetchType.LAZY)` (in `domain/Place.java`), and
`PlaceMapper.toCard()` also reads categories/photos.

**2. `api/src/main/java/ee/gemspot/api/service/AdminService.java:250-264`** — `listUsers()`:
```java
for (User u : rows) {
    String name = profileRepo.findByUserId(u.getId()).map(Profile::getName).orElse(null);
    ...
}
```

**3. `api/src/main/java/ee/gemspot/api/service/SubmissionsService.java:60-71`** — `listMine()`
→ `toDto()` runs `submissionPhotoRepository.findBySubmissionIdOrderBySortAsc(row.getId())`
per submission.

Repositories are Spring Data JPA (`api/.../repository`). Existing service tests live in
`api/src/test/java/ee/gemspot/api/...` (e.g. `AdminServiceTest.java`, `SavedServiceTest.java`).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Build | `cd api && ./gradlew build` | exit 0 |
| Test (all) | `cd api && ./gradlew test` | all pass |
| Test one class | `cd api && ./gradlew test --tests '*PlacesServiceTest'` | pass |
| Show SQL (manual check) | set `spring.jpa.properties.hibernate.generate_statistics=true` in a throwaway test profile | query count drops |

## Scope

**In scope**:
- `api/src/main/java/ee/gemspot/api/repository/PlaceRepository.java` (add a fetch-join query)
- `api/src/main/java/ee/gemspot/api/repository/ProfileRepository.java` (add `findByUserIdIn`)
- `api/src/main/java/ee/gemspot/api/repository/SubmissionPhotoRepository.java` (add `findBySubmissionIdInOrderBySortAsc`)
- `api/.../service/PlacesService.java`, `AdminService.java`, `SubmissionsService.java`
- Corresponding tests under `api/src/test/java/ee/gemspot/api/...`

**Out of scope** (do NOT touch):
- Response DTO shapes (`dto/*`) — clients depend on them byte-for-byte.
- Entity `@Id`/table mappings, Liquibase changelogs.
- Frontend.

## Git workflow

- Branch: `advisor/002-fix-n-plus-1-queries`
- Commit: `BP-NA. [gemspot] batch N+1 queries in list endpoints`
- No push/PR unless told.

## Steps

### Step 1: Batch place categories (highest value)
Add to `PlaceRepository` a query that eager-fetches categories in one round trip, e.g.:
```java
@Query("select distinct p from Place p left join fetch p.categories pc left join fetch pc.category where p.status = :status order by p.sort asc")
List<Place> findActiveWithCategories(@Param("status") PlaceStatus status);
```
Use it in `PlacesService.list()` instead of `findByStatusOrderBySortAsc`. Keep the same
filter/map logic. If `PlaceMapper.toCard()` also reads photos lazily, add a second fetch or a
separate batched photo load (verify by reading `mapper/PlaceMapper.java` first).

**Verify**: `cd api && ./gradlew test --tests '*PlacesServiceTest'` → pass; with
`generate_statistics` on, category loads no longer scale with place count.

### Step 2: Batch profile lookups in listUsers
Add `List<Profile> findByUserIdIn(Collection<String> userIds)` to `ProfileRepository`. In
`AdminService.listUsers()`, load all profiles once, build a `Map<userId, name>`, then map users.

**Verify**: `cd api && ./gradlew test --tests '*AdminServiceTest'` → pass.

### Step 3: Batch photo lookups in listMine
Add `List<SubmissionPhoto> findBySubmissionIdInOrderBySortAsc(Collection<String> ids)` to
`SubmissionPhotoRepository`. In `SubmissionsService.listMine()`, fetch all photos for the
user's submission ids once, group by submissionId, map without per-row queries. Keep `toDto`
usable for the single-row create path (`create()` still calls `toDto(saved)` — leave a
single-row overload or fetch path so create still works).

**Verify**: `cd api && ./gradlew test --tests '*SubmissionsServiceTest'` → pass.

### Step 4: Add regression tests asserting query counts
Using Hibernate `Statistics` (enable `generate_statistics`) or Testcontainers, assert the
query count for a multi-row list does not grow with row count (e.g. seed 3 places, assert
category queries ≤ constant). Model after existing integration tests
(`ContractIntegrationTest.java`).

**Verify**: `cd api && ./gradlew test` → all pass, new count-assertion tests included.

## Test plan

- `PlacesServiceTest` (create if absent): list with ≥3 places + categories → correct cards,
  bounded query count.
- Extend `AdminServiceTest`: listUsers with ≥3 users+profiles → names correct, one profile query.
- Extend `SubmissionsServiceTest`: listMine with ≥2 submissions each with photos → correct
  photoUrls, one photo query.
- Pattern reference: `api/src/test/java/ee/gemspot/api/.../AdminServiceTest.java`.

## Done criteria

- [x] `cd api && ./gradlew build` exits 0.
- [x] `cd api && ./gradlew test` passes; new tests for all three endpoints exist.
- [x] `GET /places`, admin users, and my-submissions responses are byte-identical to before
      (DTO shapes unchanged).
- [x] No changes outside the in-scope list (`git status`).
- [x] `plans/README.md` status row for 002 updated.

## STOP conditions

- `PlaceMapper.toCard()` reads relationships this plan didn't account for (e.g. photos) and a
  single fetch-join can't cover them without a cartesian blow-up — STOP and report; may need a
  `@BatchSize` / separate batched load instead of one big join.
- A fetch-join changes response ordering or duplicates rows — STOP; add `distinct` / revisit.
- Any DTO field would change — STOP (out of scope).

## Execution log

### Step 1 — done (2026-08-07)

- `PlaceRepository.findActiveWithCategories(PlaceStatus)` added: `@Query` fetch-joining
  `p.categories` and `pc.category`, `distinct`, ordered by `p.sort asc`.
- `PlacesService.list()` calls it instead of `findByStatusOrderBySortAsc`. Filter/map logic
  unchanged; `getBySlug` untouched.
- Confirmed (not re-derive): `PlaceMapper.toCard()` reads only categories (via
  `primaryCategory`) and `p.getTags()`; `tags` is `@JdbcTypeCode(SqlTypes.ARRAY)`, a scalar
  column, not a lazy collection. `photos` only in `toDetail()` (single-row path). No STOP
  condition hit — no cartesian risk from photos.
- `primaryCategory()` behavior on a zero-category place left as-is (still throws).
- No DTO, entity mapping, changelog, or frontend change.

Files changed:
- `api/src/main/java/ee/gemspot/api/repository/PlaceRepository.java`
- `api/src/main/java/ee/gemspot/api/service/PlacesService.java`
- `api/src/test/java/ee/gemspot/api/service/PlacesServiceTest.java` (new)

Verification: `cd api && ./gradlew test` → BUILD SUCCESSFUL, full suite green (unit +
Testcontainers integration). `ContractIntegrationTest` passing means the JPQL parses against a
real EntityManager and `GET /places` output is unchanged.

Residual risk:
- Query-count reduction is asserted structurally (one repo call, `findByStatusOrderBySortAsc`
  never called), not via Hibernate `Statistics`. Plan Step 4 still owed.
- Fetch-join + future pagination on `/places` remains unsafe (see Maintenance notes).

Environment note: Testcontainers tests need Docker running; without it 11 integration tests
fail on `DockerClientProviderStrategy` init, unrelated to source.

Next block input: Steps 2 + 3 — `ProfileRepository.findByUserIdIn` +
`AdminService.listUsers()`; `SubmissionPhotoRepository.findBySubmissionIdInOrderBySortAsc` +
`SubmissionsService.listMine()` (keep a single-row path for `create()`).

### Steps 2 + 3 — done (2026-08-07)

- `ProfileRepository.findByUserIdIn(Collection<String>)` added. `AdminService.listUsers()` now
  loads all profiles in one call after sorting and maps via a `Map<userId, name>`
  (`putIfAbsent`, null name preserved). Sort (createdAt desc) and `AdminUserDto` field order
  unchanged.
- `SubmissionPhotoRepository.findBySubmissionIdInOrderBySortAsc(Collection<String>)` added.
  `SubmissionsService.listMine()` filters by userId first, one batched photo load, groups by
  `photo.getSubmission().getId()` preserving sort asc; returns early on no rows (zero photo
  queries). `toDto(Submission)` single-row path kept for `create()`; new private
  `toDto(Submission, List<String>)` overload holds the shared DTO construction.
- `listMine()` gained `@Transactional(readOnly = true)` — photo→submission is a LAZY
  `@ManyToOne`; grouping reads only the proxy id, but the tx removes any out-of-session risk.
  Same precedent as `AdminService.listSubmissions()`. No DTO shape change.
- No DTO, entity mapping, changelog, or frontend change.

Files changed:
- `api/src/main/java/ee/gemspot/api/repository/ProfileRepository.java`
- `api/src/main/java/ee/gemspot/api/repository/SubmissionPhotoRepository.java`
- `api/src/main/java/ee/gemspot/api/service/AdminService.java`
- `api/src/main/java/ee/gemspot/api/service/SubmissionsService.java`
- `api/src/test/java/ee/gemspot/api/service/AdminServiceTest.java`
- `api/src/test/java/ee/gemspot/api/service/SubmissionsServiceTest.java`

Verification: `cd api && ./gradlew test` → BUILD SUCCESSFUL, full suite green including
`AdminSubmissionsListRegressionTest` (lazy photos outside a test transaction). New tests assert
one batched call and that the per-row finders are never invoked from the list paths.

Residual risk:
- Query counts still asserted structurally (Mockito call counts), not via Hibernate
  `Statistics`. Step 4 still owed for all three endpoints.
- Grouping relies on the LAZY `@ManyToOne` proxy returning its id without initialization; the
  read-only tx is the safety net if that assumption ever breaks.

Next block input: Step 4 — Hibernate `Statistics` (`generate_statistics`) query-count
regression tests for `/places`, admin users, and my-submissions; model on
`ContractIntegrationTest`.

### Step 4 — done (2026-08-07)

- `api/src/test/java/ee/gemspot/api/integration/QueryCountRegressionTest.java` (new): Hibernate
  `Statistics.getPrepareStatementCount()` around each service call. `SessionFactory` unwrapped
  from the injected `EntityManagerFactory`; `generate_statistics` enabled per-class via
  `@TestPropertySource` only — no shared `application*.yml` touched. Not `@Transactional`, so
  each call opens/closes its own session like a request does. Seeded rows are deleted in
  `@AfterEach` so seed-count tests stay stable.

Observed query counts (exact equality asserted, not an upper bound):

| Endpoint | Queries | Composition |
|---|---|---|
| `PlacesService.list(null)` over seeded ACTIVE places | 1 | one fetch-join (places + categories) |
| `AdminService.listUsers()` | 2 | user select + one batched profile select |
| `SubmissionsService.listMine(userId)` | 2 | submission select + one batched photo select |

Non-scaling is proved directly for the two seedable endpoints: admin users measured at 3 then 6
users (2 vs 5 with profiles) and `listMine` at 2 then 4 submissions (2-4 photos each); counts
are asserted equal across both sizes. `/places` uses the fixed seed set, so only the absolute
count of 1 is asserted there.

Files changed: `api/src/test/java/ee/gemspot/api/integration/QueryCountRegressionTest.java`.

Verification: `./gradlew test --rerun-tasks` and `./gradlew build` both BUILD SUCCESSFUL; the
new class reports 3 tests / 0 failures. `git diff --stat -- api/src/main/java/ee/gemspot/api/dto`
is empty — no DTO shape change.

Residual risk:
- `/places` non-scaling rests on the fetch-join shape, not a two-size measurement; a regression
  that reintroduces per-place loading would push the count above 1 and still fail, but a
  regression only visible at higher row counts would not be caught by seed data alone.
- Fetch-join + future pagination on `/places` stays unsafe — Hibernate paginates join-fetch
  results in memory. See Maintenance notes; `@EntityGraph` + `Slice` is the way out.
- Exact-equality asserts are intentionally brittle: an unrelated added query in these paths
  fails the test. That is the point, but it means the constants need a deliberate update, not
  a silent loosening.

## Maintenance notes

- If pagination is added to `/places` or admin lists, revisit — fetch-joins + pagination need
  care (Hibernate paginates in memory with join-fetch). Consider `@EntityGraph` + `Slice`.
- Reviewer: confirm no cartesian duplication (use `distinct` or `Set`), and that query counts
  are asserted, not assumed.
