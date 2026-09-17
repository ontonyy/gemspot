# Plan 015: Return 400, not 500, for malformed admin status input

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 0ce116c..HEAD -- api/src/main/java/ee/gemspot/api/dto api/src/main/java/ee/gemspot/api/web/AdminController.java api/src/main/java/ee/gemspot/api/service/AdminService.java`
> If any changed, compare the "Current state" excerpts below against the live code; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (rejects input that already fails today, just with a worse status code)
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Four admin inputs reach `Enum.valueOf(...)` or the database unvalidated, so a malformed request
returns a 500 with a stack trace (and a Sentry event) where a 400 with a usable message belongs:

- `GET /admin/submissions?status=pending` — lowercase, the casing the SPA uses elsewhere — throws
  `IllegalArgumentException` out of `SubmissionStatus.valueOf(status)`.
- `GET /admin/reports?status=...` — same defect.
- `PATCH /admin/places/{id}/status` and `PATCH /admin/reports/{id}/status` — their DTOs use
  `@Pattern` with no `@NotNull`, and Bean Validation treats `null` as valid, so a `{}` body walks
  straight into `PlaceStatus.valueOf(null)` → NPE → 500.

`ReportInputDto.reason` and `SubmissionInputDto.categoryId` have the same `@Pattern`-without-
`@NotNull` gap, which persists rows with a null discriminator that later renders as `null` in the
admin queue.

Nobody loses data here — the cost is alert noise, unreadable operator errors, and null rows that
need manual cleanup. Small, cheap, and it removes a class of defect rather than one instance.

## Current state

`api/src/main/java/ee/gemspot/api/web/AdminController.java:52-56, 80-89`:

```java
@GetMapping("/submissions")
public List<AdminSubmissionDto> submissions(
        @RequestParam(name = "status", required = false) String status) {
    return admin.listSubmissions(status);
}

@GetMapping("/reports")
public List<AdminReportDto> reports(
        @RequestParam(name = "status", required = false) String status) {
    return admin.listReports(status);
}

@PatchMapping("/places/{id}/status")
public AdminPlaceDto setPlaceStatus(@PathVariable String id, @Valid @RequestBody SetPlaceStatusDto body) {
    return admin.setPlaceStatus(id, body.status());
}
```

`api/src/main/java/ee/gemspot/api/service/AdminService.java:88-91`:

```java
public List<AdminSubmissionDto> listSubmissions(String status) {
    List<Submission> rows = status != null
            ? submissionRepo.findByStatusOrderBySubmittedAtDesc(SubmissionStatus.valueOf(status))
            : submissionRepo.findAllByOrderBySubmittedAtDesc();
```

`AdminService.java:223` has the identical shape with `ReportStatus.valueOf(status)`.

The two DTOs, in full:

```java
// api/src/main/java/ee/gemspot/api/dto/SetPlaceStatusDto.java
public record SetPlaceStatusDto(@Pattern(regexp = "ACTIVE|INACTIVE|DRAFT") String status) {}

// api/src/main/java/ee/gemspot/api/dto/SetReportStatusDto.java
public record SetReportStatusDto(@Pattern(regexp = "OPEN|RESOLVED|DISMISSED") String status) {}
```

### Conventions to match

- DTO validation is Jakarta Bean Validation annotations on record components — see
  `api/src/main/java/ee/gemspot/api/dto/SubmissionInputDto.java`, which already combines
  `@NotBlank`, `@Pattern`, `@Min` and `@Size`. That file is the exemplar; match its style.
- Validation failures already render as the Nest-compatible `{statusCode, message, error}` body
  via `GlobalExceptionHandler` — you do not need to add any error mapping.
- Controllers stay thin: parse/validate, delegate to the service.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build   | `cd api && ./gradlew build` | exit 0 |
| Tests   | `cd api && ./gradlew test`  | all pass |

## Scope

**In scope**:
- `api/src/main/java/ee/gemspot/api/web/AdminController.java` — the two `status` request params.
- `api/src/main/java/ee/gemspot/api/dto/SetPlaceStatusDto.java`
- `api/src/main/java/ee/gemspot/api/dto/SetReportStatusDto.java`
- `api/src/main/java/ee/gemspot/api/dto/ReportInputDto.java`
- `api/src/main/java/ee/gemspot/api/dto/SubmissionInputDto.java`
- Tests under `api/src/test/java/ee/gemspot/api/`.

**Out of scope**:
- `AdminService`'s method signatures — keep them taking `String` unless step 1 makes the enum
  binding the natural fit; in that case change only the two list methods, nothing else.
- `GlobalExceptionHandler` — it already produces the right body shape.
- Any change to the *accepted* value sets. Do not add, rename, or remove an enum constant.
- The web client — the SPA already sends uppercase in the paths that work today.

## Git workflow

- Branch: `advisor/015-admin-input-validation-400s`
- Commit message style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Bind the admin list filters as enums

In `AdminController`, change the two `status` parameters from `String` to their enum types —
`SubmissionStatus` for `/submissions`, `ReportStatus` for `/reports` — keeping
`@RequestParam(name = "status", required = false)`. Spring's converter then returns a 400 for an
unknown value instead of letting `valueOf` blow up in the service.

Update `AdminService.listSubmissions` / `listReports` to accept the enum type and drop the
`valueOf(...)` call (the `status != null` branch stays). Adjust any other caller the compiler
points at.

If, and only if, changing the service signatures ripples into more than the two controller call
sites and their tests, keep the `String` signatures instead and add
`@Pattern(regexp = "PENDING|APPROVED|REJECTED")` (and the matching set for reports — read the enum
files under `api/src/main/java/ee/gemspot/api/domain/` for the exact constants) to the controller
params, adding `@Validated` on the controller class if it is not already there. Pick one approach;
do not do both.

**Verify**: `cd api && ./gradlew build` → exit 0.

### Step 2: Close the @Pattern-without-@NotNull gaps

Add `@NotNull` alongside the existing `@Pattern` on:
- `SetPlaceStatusDto.status`
- `SetReportStatusDto.status`
- `ReportInputDto.reason`
- `SubmissionInputDto.categoryId`

Do not change the regexes. Do not add `@NotBlank` where `@NotNull` is what is meant (these are
enum-like tokens, and the `@Pattern` already excludes the empty string).

**Verify**: `cd api && ./gradlew build` → exit 0 and
`grep -n 'NotNull' api/src/main/java/ee/gemspot/api/dto/SetPlaceStatusDto.java` → one hit.

### Step 3: Tests

Write the tests in the Test plan below.

**Verify**: `cd api && ./gradlew test` → all pass.

## Test plan

Model on `api/src/test/java/ee/gemspot/api/integration/SubmissionGeoValidationTest.java` — it is
the existing example of "malformed input returns 400" against the real HTTP stack, and it extends
`AbstractIntegrationTest`. Add cases in a new or existing integration test:

1. `GET /admin/submissions?status=pending` (lowercase) as an admin → **400**, not 500.
2. `GET /admin/reports?status=bogus` as an admin → **400**.
3. `PATCH /admin/places/{id}/status` with body `{}` → **400**.
4. `PATCH /admin/reports/{id}/status` with body `{}` → **400**.
5. A valid uppercase filter still returns 200 with the expected rows — confirm the existing
   admin-list tests still pass rather than writing a new one.

You will need an admin token; copy the auth setup from the existing admin integration test
`api/src/test/java/ee/gemspot/api/integration/AdminSubmissionsListRegressionTest.java`.

## STOP conditions

- The drift check shows an in-scope file changed and the excerpts no longer match → STOP.
- Adding `@NotNull` to `SubmissionInputDto.categoryId` breaks an existing green test, meaning a
  null category is intentionally supported → STOP and report; do not delete the test.
- The enum constants differ from what this plan assumes → read the actual enum and use those
  values; if the set is surprising (e.g. lowercase constants), STOP and report.
- Integration tests cannot run in your environment (no Docker for Testcontainers) → run the unit
  suite, say so explicitly in your report, and do not silently skip the coverage.

## Done criteria

- `cd api && ./gradlew build` exits 0 and `cd api && ./gradlew test` passes.
- The four new 400-expecting tests pass and fail if you revert the corresponding annotation or
  binding change.
- `grep -n 'valueOf(status)' api/src/main/java/ee/gemspot/api/service/AdminService.java` returns
  nothing (step 1 taken as the enum-binding route) — or, if you took the `@Pattern` route, the two
  params carry a `@Pattern` and the class carries `@Validated`.

## Maintenance note

The rule this establishes: `@Pattern` never stands alone on a required field, because Bean
Validation passes `null`. Watch for that in review on every new DTO. If more request params turn
into enums later, binding them as the enum type (rather than `String` + `valueOf`) keeps the 400
behaviour automatic.
