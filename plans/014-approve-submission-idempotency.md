# Plan 014: Make submission approval idempotent and stop place-ID collisions

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 0ce116c..HEAD -- api/src/main/java/ee/gemspot/api/service/AdminService.java`
> If it changed, compare the "Current state" excerpt below against the live code before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (touches the write path that publishes a place; existing seeded IDs must keep working)
- **Depends on**: none
- **Category**: bug (data integrity)
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

`AdminService.approveSubmission()` has two defects that compound:

1. **No status guard.** Nothing checks that the submission is still `PENDING`. A double-click in
   the moderation panel, or any retry, runs the whole body again and publishes a *second* `Place`
   for the same submission.
2. **Derived, unchecked place ID.** The new place's ID is computed as
   `String.format("%02d", lastSort + 2)` from the last row's `sort`. `Place` uses an
   app-assigned `@Id`, so `placeRepo.save(place)` is a JPA **merge** — the code says so in its own
   comment. If that ID already exists (any deleted row, any place whose `id` is out of step with
   its `sort`, or two concurrent approvals), the save silently **overwrites a live place's** name,
   slug, coordinates and notes instead of failing. The slug gets a uniqueness loop; the ID gets
   none. The format also breaks past 99 places.

The failure is silent and destroys published data, which is why it is P1 despite needing an admin
to trigger it.

## Current state

`api/src/main/java/ee/gemspot/api/service/AdminService.java:116-176` (abridged — the parts that
matter):

```java
@Transactional
public ApproveResultDto approveSubmission(String id) {
    Submission sub = submissionRepo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "submission not found: " + id));

    // next zero-padded place id + sort (after the existing 01..10 set)
    List<Place> all = placeRepo.findAllByOrderBySortAsc();
    Place last = all.isEmpty() ? null : all.get(all.size() - 1);
    int nextSort = (last != null ? last.getSort() : -1) + 1;
    String nextId = String.format("%02d", nextSort + 1);

    // unique slug
    String slug = slugify(sub.getName());
    int n = 1;
    while (placeRepo.findBySlug(slug).isPresent()) {
        n += 1;
        slug = slugify(sub.getName()) + "-" + n;
    }

    Place place = new Place();
    place.setId(nextId);
    place.setSlug(slug);
    // ... name/lat/lng/status/note/sort set here ...
    place.setSort(nextSort);
    // app-assigned @Id → save() merges; use the returned managed instance for FKs.
    place = placeRepo.save(place);

    // ... PlaceCategory link, PlacePhoto rows copied from the submission ...

    sub.setStatus(SubmissionStatus.APPROVED);
    submissionRepo.save(sub);

    return new ApproveResultDto(place.getId(), place.getSlug());
}
```

The endpoint is `POST /admin/submissions/{id}/approve` —
`api/src/main/java/ee/gemspot/api/web/AdminController.java:58-62`, `ADMIN` role required
(`config/SecurityConfig.java`, `/admin/**` → `hasRole("ADMIN")`).

### Conventions to match

- Errors are raised as `ResponseStatusException(HttpStatus.X, "message")` — see the `findById`
  call above. `GlobalExceptionHandler` renders them into the Nest-compatible
  `{statusCode, message, error}` body. Use `HttpStatus.CONFLICT` for the re-approval case.
- Seeded place IDs are the zero-padded strings `01`..`10` (see
  `api/src/main/java/ee/gemspot/api/seed/DataSeeder.java`). **Preserve that format** — the ID is
  an internal key (the public key is the slug), but existing rows and seed data depend on it.
- Service tests: `api/src/test/java/ee/gemspot/api/service/AdminServiceTest.java` (Mockito) —
  it already covers the slug-disambiguation loop; model the new cases on it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build   | `cd api && ./gradlew build` | exit 0 |
| Tests   | `cd api && ./gradlew test`  | all pass |
| One test| `cd api && ./gradlew test --tests '*AdminServiceTest'` | pass |

## Scope

**In scope**:
- `api/src/main/java/ee/gemspot/api/service/AdminService.java` — `approveSubmission()` only.
- `api/src/test/java/ee/gemspot/api/service/AdminServiceTest.java`.
- `api/src/main/java/ee/gemspot/api/repository/PlaceRepository.java` — **only** if you need an
  `existsById` (it is inherited from `JpaRepository`, so most likely no change is needed).

**Out of scope**:
- `rejectSubmission()` — deliberately a single save; leave it alone.
- The `Place` entity's `@Id` strategy (`domain/Place.java`) — do not switch to UUID or a DB
  sequence. That is a migration-shaped change and is explicitly out of this plan.
- `api/src/main/java/ee/gemspot/api/seed/DataSeeder.java` — the seeded IDs must keep working
  unchanged; that is what constrains the fix.
- The admin web UI (`web/src/pages/admin/`) — the 409 response is handled in a later plan.
- Liquibase changelogs — this plan adds no DDL.

## Git workflow

- Branch: `advisor/014-approve-submission-idempotency`
- Commit message style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Reject non-PENDING submissions

At the top of `approveSubmission()`, immediately after the `findById(...).orElseThrow(...)`, add:

- If `sub.getStatus() != SubmissionStatus.PENDING`, throw
  `new ResponseStatusException(HttpStatus.CONFLICT, "submission is not pending: " + id)`.

Nothing else in the method changes in this step.

**Verify**: `cd api && ./gradlew build` → exit 0.

### Step 2: Guarantee the new place ID is free

Replace the single `String nextId = String.format("%02d", nextSort + 1);` with a loop that walks
forward until it finds an unused ID, mirroring the shape of the existing slug loop directly below
it:

- Start from the same candidate number (`nextSort + 1`).
- While `placeRepo.existsById(candidateId)` is true, increment the number and re-format.
- Keep `String.format("%02d", n)` — for n ≥ 100 `%02d` simply widens to three digits, which is
  fine; do not add a separate format branch.
- Bound the loop so it cannot spin forever: cap the number of attempts (e.g. 1000) and, if the cap
  is hit, throw `new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "could not allocate a place id")`.

Leave `nextSort` (the `sort` column) as it is — `sort` is an ordering hint, not a key, and
duplicates there are harmless.

Keep the existing comment explaining that `save()` merges, and add one line above the loop saying
why the existence check is required (app-assigned IDs make `save()` a silent overwrite).

**Verify**: `cd api && ./gradlew build` → exit 0.

### Step 3: Tests

Write the tests in the Test plan below.

**Verify**: `cd api && ./gradlew test --tests '*AdminServiceTest'` → pass, then
`cd api && ./gradlew test` → all pass.

## Test plan

In `api/src/test/java/ee/gemspot/api/service/AdminServiceTest.java`, following the existing
Mockito setup in that file:

1. **Re-approval is rejected** — a submission already `APPROVED`; assert `approveSubmission(id)`
   throws `ResponseStatusException` with `HttpStatus.CONFLICT`, and verify `placeRepo.save(...)`
   is never called. (This is the primary regression guard.)
2. **Rejected submissions cannot be approved** — same assertion for status `REJECTED`.
3. **Colliding place ID is skipped** — stub `placeRepo.existsById("11")` (or whatever the first
   candidate is for your fixture) to return `true` and the next one `false`; assert the saved
   `Place` carries the *second* ID and that the existing place is never passed to `save`.
4. **Happy path still works** — a `PENDING` submission produces one `Place` with the expected
   slug and a free ID; the submission ends `APPROVED`. If such a case already exists in the file,
   just confirm it still passes rather than duplicating it.

Do not add a Testcontainers integration test for this — the mock-level test proves the guard, and
the existing `api/src/test/java/ee/gemspot/api/integration/AdminSubmissionsListRegressionTest.java`
already covers the endpoint's wiring.

## STOP conditions

- The drift check shows `AdminService.java` changed and the excerpt no longer matches → STOP.
- `SubmissionStatus` has no `PENDING` constant, or submissions are created in some other initial
  state → STOP and report the actual state machine rather than guessing a guard.
- `Place.getId()` turns out not to be app-assigned (e.g. a `@GeneratedValue` appeared) → STOP;
  the whole ID-collision premise is then void.
- Making the ID loop work requires a schema change → STOP and report; this plan is explicitly
  migration-free.

## Done criteria

- `cd api && ./gradlew build` exits 0 and `cd api && ./gradlew test` passes.
- `AdminServiceTest` contains a test that fails if the `PENDING` guard is removed, and one that
  fails if the ID existence check is removed. Confirm this by temporarily reverting each guard,
  seeing the corresponding test fail, then restoring it.
- `grep -n 'existsById' api/src/main/java/ee/gemspot/api/service/AdminService.java` returns a hit
  inside `approveSubmission`.

## Maintenance note

The ID scheme stays "smallest free zero-padded integer", which keeps the seeded `01`..`10` rows
valid but is still a scan per approval — acceptable at this table size. If the place count ever
reaches the thousands, or approvals become concurrent enough to matter, move `Place` to a
generated ID behind a Liquibase migration; that is a separate, propose-tier change. Watch in
review for any new caller of `placeRepo.save()` that sets an ID by hand — it has the same
silent-merge hazard.
