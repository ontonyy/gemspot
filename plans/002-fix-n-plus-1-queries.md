# Plan 002: Eliminate N+1 query patterns in list endpoints

> **Executor instructions**: Follow step by step. Run every Verify command and confirm the
> expected result before moving on. If a "STOP condition" occurs, stop and report. When
> done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat aad27f1..HEAD -- api/src/main/java/ee/gemspot/api/service api/src/main/java/ee/gemspot/api/domain`
> If any cited file changed, compare the "Current state" excerpts to live code; on mismatch STOP.

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

- [ ] `cd api && ./gradlew build` exits 0.
- [ ] `cd api && ./gradlew test` passes; new tests for all three endpoints exist.
- [ ] `GET /places`, admin users, and my-submissions responses are byte-identical to before
      (DTO shapes unchanged).
- [ ] No changes outside the in-scope list (`git status`).
- [ ] `plans/README.md` status row for 002 updated.

## STOP conditions

- `PlaceMapper.toCard()` reads relationships this plan didn't account for (e.g. photos) and a
  single fetch-join can't cover them without a cartesian blow-up — STOP and report; may need a
  `@BatchSize` / separate batched load instead of one big join.
- A fetch-join changes response ordering or duplicates rows — STOP; add `distinct` / revisit.
- Any DTO field would change — STOP (out of scope).

## Maintenance notes

- If pagination is added to `/places` or admin lists, revisit — fetch-joins + pagination need
  care (Hibernate paginates in memory with join-fetch). Consider `@EntityGraph` + `Slice`.
- Reviewer: confirm no cartesian duplication (use `distinct` or `Set`), and that query counts
  are asserted, not assumed.
