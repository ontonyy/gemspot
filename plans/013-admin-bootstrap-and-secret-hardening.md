# Plan 013: Close three fail-open auth/bootstrap holes in the API

> **Executor instructions**: Follow this plan step by step. Run every Verify command and
> confirm the expected result before moving on. If a "STOP conditions" item occurs, stop and
> report — do not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 0ce116c..HEAD -- api/src/main/java/ee/gemspot/api/seed api/src/main/java/ee/gemspot/api/security/JwtService.java api/src/main/java/ee/gemspot/api/service/MailService.java`
> If any of those changed, compare the "Current state" excerpts below against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (config/bootstrap only; no request-path behaviour changes)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Three independent places fail *open* instead of *closed*:

1. `DataSeeder.seedAdmin()` runs on every boot and unconditionally promotes whatever account
   already owns `ADMIN_EMAIL` to `ADMIN`. `/auth/register` is public, so anyone who registers
   that address (or the hardcoded default `admin@gemspot.ee`, in any environment where
   `ADMIN_EMAIL` is unset or misspelled) becomes a full moderator on the next restart —
   including read access to every user's email via `GET /admin/users`.
2. `JwtService` falls back to the literal signing secrets `gemspot-dev-access-secret` /
   `gemspot-dev-refresh-secret`, which are published in this repository. If the Secret Manager
   wiring in `deploy-api.yml` is renamed or fails, the service boots happily and signs tokens
   anyone can forge — including an `ADMIN`-role access token.
3. `MailService` logs the email-change verification **link** at INFO in every environment. That
   link's token is the entire authority for `/auth/email/verify` (a deliberately public
   endpoint), so anyone with log-read access can take over an account's email address.

Each is a one-file change. Together they remove the three "everything is fine until one env var
is missing" paths in the auth surface.

## Current state

### 1. `api/src/main/java/ee/gemspot/api/seed/DataSeeder.java:148-157`

```java
// Upsert admin: existing → ensure ADMIN role; absent → create with hashed password + profile.
private void seedAdmin() {
    String email = envOr("ADMIN_EMAIL", "admin@gemspot.ee").toLowerCase();
    String password = envOr("ADMIN_PASSWORD", "admin1234");
    User existing = users.findByEmail(email).orElse(null);
    if (existing != null) {
        existing.setRole(UserRole.ADMIN);
        users.save(existing);
        return;
    }
    User user = new User();
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(password));
    user.setRole(UserRole.ADMIN);
    user = users.save(user);
    // ... Profile creation follows
}
```

`DataSeeder` is a plain `@Component implements ApplicationRunner` (see the class declaration at
line ~33) with no profile guard — it runs on every boot in every environment, including Cloud Run.

### 2. `api/src/main/java/ee/gemspot/api/security/JwtService.java:36-45`

```java
public JwtService(
        @Value("${JWT_SECRET:gemspot-dev-access-secret}") String accessSecret,
        @Value("${JWT_REFRESH_SECRET:gemspot-dev-refresh-secret}") String refreshSecret,
        @Value("${JWT_ACCESS_TTL:15m}") String accessTtl,
        @Value("${JWT_REFRESH_TTL:30d}") String refreshTtl) {
    this.accessKey = deriveKey(accessSecret);
    this.refreshKey = deriveKey(refreshSecret);
    this.accessTtl = parseTtl(accessTtl);
    this.refreshTtl = parseTtl(refreshTtl);
}
```

The TTL defaults are fine — keep them. Only the two secrets must lose their defaults.

### 3. `api/src/main/java/ee/gemspot/api/service/MailService.java:33-36`

```java
/** Send the email-change verification link to the NEW address. */
public void sendEmailChangeVerification(String toEmail, String link) {
    // Always surface the link for dev (MailHog / no SMTP).
    log.info("Email-change verification link for {}: {}", toEmail, link);
```

### Conventions to match

- Java 25 / Spring Boot 3.5.6, layered `web → service → repository`. Constructor injection only
  (no field `@Autowired`) — see `MailService`'s own constructor.
- Config values come in via `@Value` with an `application.yml` key or an env var name; secret
  *values* never appear in source or docs.
- Tests live in `api/src/test/java/ee/gemspot/api/{service,integration}`. Integration tests
  extend `AbstractIntegrationTest` — read
  `api/src/test/java/ee/gemspot/api/integration/AbstractIntegrationTest.java` before writing one,
  and model new service-level tests on
  `api/src/test/java/ee/gemspot/api/service/AuthServiceTest.java`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build   | `cd api && ./gradlew build` | exit 0 |
| Tests   | `cd api && ./gradlew test`  | all pass |
| One test| `cd api && ./gradlew test --tests '*DataSeederAdminTest'` | pass |

## Scope

**In scope** (the only files you may modify):
- `api/src/main/java/ee/gemspot/api/seed/DataSeeder.java`
- `api/src/main/java/ee/gemspot/api/security/JwtService.java`
- `api/src/main/java/ee/gemspot/api/service/MailService.java`
- `api/src/main/resources/application.yml` and/or the test properties file, **only** if a local
  default for `JWT_SECRET`/`JWT_REFRESH_SECRET` is needed to keep tests booting (step 2).
- New/updated tests under `api/src/test/java/ee/gemspot/api/`.

**Out of scope** (do NOT touch, even though they look related):
- `api/src/main/java/ee/gemspot/api/service/AuthService.java` — the token/refresh logic itself is
  correct; this plan only changes where the signing key comes from.
- `api/src/main/java/ee/gemspot/api/config/SecurityConfig.java` — no route rule changes here.
- `.github/workflows/deploy-api.yml` — it already supplies `JWT_SECRET`/`JWT_REFRESH_SECRET`.
  Do not edit it, and **never** print or copy a secret value from it into code, tests, or docs.
- The place/category seeding in `DataSeeder` (everything above `seedAdmin()`) — unchanged.

## Git workflow

- Branch: `advisor/013-admin-bootstrap-and-secret-hardening`
- One commit per step is fine. Message style matches `git log` in this repo:
  `BP-NA. [gemspot] <imperative summary>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Make admin seeding create-only

In `DataSeeder.seedAdmin()`, replace the promote-existing branch with a skip-and-log branch:

- If a user with that email already exists, do **not** change its role. Log a warning that names
  the email and says the admin seed was skipped because the address is already registered, then
  return.
- The create path (absent user) stays exactly as it is.
- Update the method's Javadoc-style comment on line 148 so it no longer says "existing → ensure
  ADMIN role".

Do not add a "promote only if the password hash matches" escape hatch — create-only is the
whole point.

**Verify**: `cd api && ./gradlew build` → exit 0.

### Step 2: Remove the JWT secret fallbacks

In `JwtService`'s constructor, change the two secret parameters to `@Value("${JWT_SECRET}")` and
`@Value("${JWT_REFRESH_SECRET}")` — no default after the colon, so an unset value fails startup
with a clear `IllegalArgumentException`. Leave the two TTL parameters untouched.

Then run the test suite. If tests now fail to start a context because the properties are missing,
supply them in the **test** configuration only (e.g. `api/src/test/resources/application.properties`
or the existing test properties file — find it with
`ls api/src/test/resources`), using an obviously-local value such as
`JWT_SECRET=local-test-access-secret`. Do not reintroduce a default in `JwtService`, and do not
put a value in `api/src/main/resources/application.yml` unless a `local`-profile-only file already
exists there (check `ls api/src/main/resources`), in which case it may go in that file.

**Verify**: `cd api && ./gradlew test` → all pass. Then confirm the fail-fast works:
`grep -n 'JWT_SECRET' api/src/main/java/ee/gemspot/api/security/JwtService.java` → the line shows
`${JWT_SECRET}` with no `:` default.

### Step 3: Gate the verification-link log behind a dev flag

In `MailService`, stop logging the link unconditionally. Add a constructor-injected boolean, e.g.
`@Value("${app.mail.log-links:false}") boolean logLinks`, and only emit the existing
`log.info(...)` when it is true. Keep the wording of the log message as-is. Add the key with a
`false` default to `api/src/main/resources/application.yml` under the existing `app.mail` block
(the `from` key already lives there — match its indentation and add a one-line comment saying it
is for local MailHog-less development only).

Do not change the email body, the subject, or the send call.

**Verify**: `cd api && ./gradlew build` → exit 0, and
`grep -n 'log.info' api/src/main/java/ee/gemspot/api/service/MailService.java` → the call sits
inside an `if (logLinks)`.

### Step 4: Tests

Write the tests described in the Test plan below, then run the full suite.

**Verify**: `cd api && ./gradlew test` → all pass.

## Test plan

Model new service-level tests on `api/src/test/java/ee/gemspot/api/service/AuthServiceTest.java`
(mock-based, JUnit 5 + Mockito). New file:
`api/src/test/java/ee/gemspot/api/seed/DataSeederAdminTest.java` (create the `seed` test package).

Cases:
1. **Existing account is not promoted** — `users.findByEmail(...)` returns a user whose role is
   `USER`; after `seedAdmin()` runs, verify `users.save(...)` was **never** called with an
   `ADMIN` role (or never called at all), and the user object's role is still `USER`. This is the
   regression this plan exists to prevent.
2. **Absent account is created as ADMIN** — `findByEmail` returns empty; verify a user is saved
   with `UserRole.ADMIN` and a hashed (not plaintext) password.

If `seedAdmin()` is private and not reachable from a test, invoke the public
`ApplicationRunner.run(...)` entry point with the repositories mocked, or make the method
package-private (`seedAdmin()` with no modifier) — package-private for testability is acceptable
here; do not make it `public`.

For `MailService`, a test is optional; if you write one, assert only that `mailSender.send(...)`
is still called. **Never** assert on the link's token value.

## STOP conditions

- The drift check shows any in-scope file changed since commit `0ce116c` and the excerpt above no
  longer matches → STOP and report.
- Removing the JWT defaults breaks more than the test context — e.g. `./gradlew bootRun` is part
  of a documented local flow that has no env file. Report what you found rather than adding a
  production default back.
- You find a place where a real secret *value* is committed in the repo → do NOT reproduce it in
  any file, commit, or report. Report the `file:line` and the key name only, and recommend
  rotation.
- `seedAdmin()` turns out to be relied upon by a test or a documented ops procedure for promoting
  an existing account → STOP and report; that is a policy decision, not yours.

## Done criteria

- `cd api && ./gradlew build` exits 0.
- `cd api && ./gradlew test` passes, including the new `DataSeederAdminTest`.
- `grep -n 'setRole(UserRole.ADMIN)' api/src/main/java/ee/gemspot/api/seed/DataSeeder.java` shows
  the role assignment only on the newly-created-user path.
- `grep -c 'gemspot-dev-.*-secret' api/src/main/java/ee/gemspot/api/security/JwtService.java` → `0`.
- No secret values appear in the diff.

## Maintenance note

After this lands, bootstrapping an admin in a fresh environment requires the `ADMIN_EMAIL`
address to be unregistered. If an environment already has a squatted admin address, promoting it
becomes a deliberate manual DB operation — that is the intended trade-off. Deploys must also now
supply `JWT_SECRET` and `JWT_REFRESH_SECRET` or the container will fail to start; that is a
fail-fast, and the deploy workflow already sets both. Watch in review for anyone re-adding a
`:default` to a secret `@Value`.
