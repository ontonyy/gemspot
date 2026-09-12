# Plan 003: Validate latitude/longitude on submission input

> **Executor instructions**: Follow step by step. Run every Verify command. If a "STOP
> condition" occurs, stop and report. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat aad27f1..HEAD -- api/src/main/java/ee/gemspot/api/dto`
> If `SubmissionInputDto.java` changed, compare the excerpt below to live code; on mismatch STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (adds validation only; rejects previously-accepted invalid input)
- **Depends on**: none
- **Category**: bug (data integrity)
- **Planned at**: commit `aad27f1`, 2026-07-03

## Why this matters

`POST /submissions` accepts `lat`/`lng` as raw primitive `double` with no bounds. A client can
submit `lat=9999, lng=9999`; the row persists and, once approved, becomes a `Place` with an
off-planet coordinate that breaks map rendering and admin views and requires manual DB cleanup.
Valid ranges are lat `-90..90`, lng `-180..180`. Bean Validation already guards the other
fields in this DTO — coordinates were missed.

## Current state

`api/src/main/java/ee/gemspot/api/dto/SubmissionInputDto.java` (full file):
```java
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SubmissionInputDto(
        @NotBlank String name,
        @Pattern(regexp = "tabletennis|basketball|football|tennis|padel|scenic|sakura") String categoryId,
        double lat,
        double lng,
        @NotNull String note,
        @Min(0) Integer photoCount,
        @Size(max = 6) List<@NotNull String> photoUrls
) {}
```
The controller uses `@Valid` on the body (verify in `web/SubmissionsController.java`). Validation
failures already return the Nest-compatible `{statusCode, message, error}` shape via
`GlobalExceptionHandler`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Build | `cd api && ./gradlew build` | exit 0 |
| Test | `cd api && ./gradlew test` | all pass |
| Test one | `cd api && ./gradlew test --tests '*SubmissionsServiceTest'` | pass |

## Scope

**In scope**:
- `api/src/main/java/ee/gemspot/api/dto/SubmissionInputDto.java`
- Tests under `api/src/test/java/ee/gemspot/api/...` covering the new constraints.

**Out of scope**:
- Changing `double` to `Double` (would alter serialization/nullability contract) — keep primitive.
- Report/Event coordinate handling — see Maintenance notes (separate, only if they carry coords).
- Any DTO field rename or response shape change.

## Git workflow

- Branch: `advisor/003-validate-geo-coordinates`
- Commit: `BP-NA. [gemspot] validate lat/lng bounds on submission input`
- No push/PR unless told.

## Steps

### Step 1: Add range constraints
Add `@DecimalMin`/`@DecimalMax` (works on primitive double) to `lat` and `lng`:
```java
@DecimalMin("-90.0") @DecimalMax("90.0") double lat,
@DecimalMin("-180.0") @DecimalMax("180.0") double lng,
```
Import `jakarta.validation.constraints.DecimalMin` / `DecimalMax`.

**Verify**: `cd api && ./gradlew build` → exit 0.

### Step 2: Test rejection + acceptance
Add a test: a submission with `lat=9999` (or `lng=200`) is rejected with HTTP 400 and the
standard error shape; a valid Tallinn coordinate (≈`59.437, 24.745`) is accepted. If controller
validation is exercised via MockMvc/integration, model after an existing integration test
(`ContractIntegrationTest.java`); if the service layer is tested directly, model after
`SubmissionsServiceTest.java`.

**Verify**: `cd api && ./gradlew test` → all pass, new tests included.

## Test plan

- Invalid lat (`91`, `-91`, `9999`) → 400.
- Invalid lng (`181`, `-181`) → 400.
- Boundary valid (`90`, `-90`, `180`, `-180`) → accepted.
- Realistic Tallinn coord → accepted.

## Done criteria

- [ ] `cd api && ./gradlew build` exits 0.
- [ ] `cd api && ./gradlew test` passes; rejection + acceptance tests exist.
- [ ] Out-of-range coordinates return HTTP 400 with `{statusCode, message, error}`.
- [ ] No files changed outside scope (`git status`).
- [ ] `plans/README.md` status row for 003 updated.

## STOP conditions

- `@DecimalMin`/`@DecimalMax` does not fire on the primitive (framework quirk) — STOP; do NOT
  switch to `Double` without confirming the nullability/serialization contract with the DTO's
  consumers.
- `@Valid` is missing on the controller method — STOP and report (validation would silently not
  run; that is a separate finding, don't add `@Valid` blindly).

## Maintenance notes

- If reports (`ReportInput`) or analytics events ever carry coordinates, apply the same
  constraints there.
- Reviewer: confirm the error response shape is unchanged (still the Nest-compatible shape).
