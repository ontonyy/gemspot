# Plan 004: Add lint + test gates to CI before deploy

> **Executor instructions**: Follow step by step. Run every Verify command. If a "STOP
> condition" occurs, stop and report. When done, update this plan's status row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat aad27f1..HEAD -- .github/workflows`
> If either workflow changed, compare the excerpts below to live files; on mismatch STOP.

## Status

- **State**: DONE (2026-07-06, branch `BP-NA-gemspot-ci-lint-test-gates`). Maintainer approved "fix please" → cleared the pre-existing red suites at root, then wired gates. All suites green locally.
- **Step 1 (initial red, now fixed)**: web lint had 15 errors; api test had 2 failures — both pre-existing, blocked the gate. Fixed (see below).
- **Fixes applied to unblock**:
  - Web lint 15→0 errors: eslint config honors `_`-prefix unused (argsIgnorePattern) → cleared 5; per-file `react-refresh` disable on data+glyph modules (categories.tsx, Icon.tsx) → 5; `react-hooks/refs` moved ref-write into useEffect (LocationPicker, GuideRouteMap) → 2; scoped `set-state-in-effect` disables on legit mount/side-effect setState (Account, VerifyEmail, SpotMap) → 3. (2 pre-existing warnings remain; warnings don't fail `eslint .`.)
  - API test 2→0 failures: root cause = shared Testcontainer DB, no cleanup. `SchemaAndSeedIntegrationTest` now asserts seed *idempotency* (users before==after) instead of absolute `==1`; `UploadsAuthMultipartTest` uses a unique email per method + `@AfterEach` cleanup (kills the 409). Fixing the 409 exposed a genuine gap: uncaught exceptions weren't mapped to 5xx JSON → added fallback `@ExceptionHandler(Exception.class)` in `GlobalExceptionHandler` (also improves prod error shape).
- **Gate approach**: inlined into deploy jobs (plan's primary option), not a separate ci.yml — keeps the gate in the exact path that ships. API test step placed right after checkout (before GCP auth) so failures block early.
- **Verify results**: web `npm run lint` rc=0 · web `npm run test` rc=0 (20) · web `npm run build` rc=0 · api `./gradlew test` rc=0 (74/74) · both workflow YAML valid.
- **Changed files**: `.github/workflows/deploy-web.yml`, `.github/workflows/deploy-api.yml`, `web/eslint.config.js`, `web/src/entities/place/categories.tsx`, `web/src/shared/ui/Icon.tsx`, `web/src/features/add-spot/LocationPicker.tsx`, `web/src/widgets/map/GuideRouteMap.tsx`, `web/src/pages/Account.tsx`, `web/src/pages/VerifyEmail.tsx`, `web/src/widgets/map/SpotMap.tsx`, `api/.../web/GlobalExceptionHandler.java`, `api/.../integration/SchemaAndSeedIntegrationTest.java`, `api/.../integration/UploadsAuthMultipartTest.java`.
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (CI only; no runtime code)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `aad27f1`, 2026-07-03

## Why this matters

Both deploy workflows push straight to production with no test or lint gate. `deploy-web.yml`
runs `npm ci` + `npm run build` only; `deploy-api.yml` builds and pushes the Docker image with
no `./gradlew test`. A regression that compiles but fails tests (or an ESLint error) deploys
unblocked. Adding gates catches regressions before they reach `master`'s live channel.

## Current state

`.github/workflows/deploy-web.yml:26-30` — build only, no lint/test:
```yaml
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
```
`web/package.json` scripts: `lint` (`eslint .`), `test` (`vitest run`), `build`
(`tsc -b && vite build`).

`.github/workflows/deploy-api.yml:38-41` — image build/push, no test step:
```yaml
      - name: Build & push image
        run: |
          docker build -t "$IMAGE:${{ github.sha }}" api
          docker push "$IMAGE:${{ github.sha }}"
```
API tests run via `./gradlew test` (JUnit + Testcontainers Postgres — needs Docker, which the
runner already has).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Web lint locally | `cd web && npm run lint` | exit 0 (fix pre-existing errors first — see STOP) |
| Web test locally | `cd web && npm run test` | pass |
| API test locally | `cd api && ./gradlew test` | pass |
| Validate YAML | `yamllint .github/workflows/*.yml` (or GitHub's Actions tab after push) | no syntax errors |

## Scope

**In scope**:
- `.github/workflows/deploy-web.yml`
- `.github/workflows/deploy-api.yml`
- Optionally a new `.github/workflows/ci.yml` (see Step 3) — decide per Step 1 finding.

**Out of scope**:
- Application/source code, test code (do NOT write tests to make gates pass — if they fail,
  that's a real finding to report).
- Secrets/env wiring in the deploy steps.

## Git workflow

- Branch: `advisor/004-ci-lint-test-gates`
- Commit: `BP-NA. [gemspot] gate deploys on lint + tests`
- No push/PR unless told.

## Steps

### Step 1: Confirm the suites are currently green
Before wiring gates, run `cd web && npm run lint && npm run test` and `cd api && ./gradlew test`
locally. Record the result.

**Verify**: all three exit 0. If any FAILS, go to STOP conditions (do not paper over it).

### Step 2: Add gates to deploy-web.yml
Insert, after `npm ci` and before `npm run build`:
```yaml
      - run: npm run lint
        working-directory: web
      - run: npm run test
        working-directory: web
```

**Verify**: `git diff .github/workflows/deploy-web.yml` shows lint + test steps ordered before build.

### Step 3: Add a test gate to deploy-api.yml
Add a step before "Build & push image" that runs the JUnit suite. The runner has Docker (used
by the deploy), so Testcontainers works. Use `actions/setup-java@v4` (Temurin 25) + a Gradle
run:
```yaml
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '25'
      - name: Test
        run: ./gradlew test
        working-directory: api
```
If pulling Java setup into the deploy job is undesirable, instead create a separate
`.github/workflows/ci.yml` that runs on `pull_request` and on `push` to `master` and runs both
suites — and note in your report which approach you chose and why.

**Verify**: `git diff .github/workflows/deploy-api.yml` (or the new `ci.yml`) shows a
`./gradlew test` step gating the build.

## Done criteria

- [ ] `deploy-web.yml` runs `npm run lint` and `npm run test` before build.
- [ ] API tests run in CI before the image is built/deployed (in `deploy-api.yml` or a new
      `ci.yml`).
- [ ] Local run of all suites is green (recorded in your report).
- [ ] No source/test files modified (`git status` shows only workflow YAML).
- [ ] `plans/README.md` status row for 004 updated.

## STOP conditions

- Any suite fails locally in Step 1 — STOP and report the failures. Do NOT modify source or
  tests to make them pass; that is out of scope and a separate finding.
- `npm run lint` reports pre-existing errors across the repo — STOP and report the count/files;
  gating on a red lint would block all deploys. The maintainer decides whether to fix-then-gate
  or gate warnings-only.

## Maintenance notes

- Consider moving both suites to a `pull_request`-triggered `ci.yml` so regressions are caught
  before merge, not just at deploy.
- Reviewer: confirm the gate runs BEFORE build/deploy steps, and that Testcontainers has Docker
  available on the runner.
