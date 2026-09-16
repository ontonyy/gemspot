# Plan 024: Close the refresh-token rotation race that defeats reuse detection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- api/src/main/java/ee/gemspot/api/service/AuthService.java api/src/main/java/ee/gemspot/api/repository/RefreshTokenRepository.java`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED (touches the authentication hot path — a mistake logs everyone out)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

`AuthService.refresh()` implements refresh-token rotation with reuse detection (the "D4"
scheme documented in its own comment): each refresh token may be redeemed once; presenting
an already-used one revokes the whole token family. The check and the write are two
separate statements with no atomicity between them:

```
if (row.isUsed()) { revoke family; 401 }        // read
...
row.setUsed(true); refreshTokens.save(row);      // write
```

Two concurrent `POST /auth/refresh` calls carrying the same `jti` can both read
`used == false` before either writes. Both then rotate successfully and both receive a
valid new token pair in the same family — which is precisely the situation reuse
detection exists to catch. An attacker who has stolen a refresh token and races the
legitimate client wins a live session **and** leaves reuse detection silent.

This is not theoretical for this app: the web client's own `refreshSession` can be invoked
by multiple in-flight 401s, which is why it has dedup logic; any gap there, or a user with
two tabs, produces genuine concurrent refreshes.

The fix is a single conditional UPDATE — the database already gives us the atomicity.

## Current state

**`api/src/main/java/ee/gemspot/api/service/AuthService.java:275-307`**

```java
    /* D4 reuse detection. NOT @Transactional: the family-revoke delete must
       commit even though we then return 401 (a surrounding tx would roll it
       back). Derived delete runs in its own transaction. */
    public AuthResponseDto refresh(String refreshToken) {
        Claims claims;
        try {
            claims = jwt.parseRefresh(refreshToken);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        if (!"refresh".equals(claims.get("typ", String.class))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        String jti = claims.get("jti", String.class);
        RefreshToken row = jti != null ? refreshTokens.findByJti(jti).orElse(null) : null;
        if (row == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        if (row.isUsed()) {
            // Replay of an already-rotated token → revoke the whole family.
            refreshTokens.deleteByFamilyId(row.getFamilyId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        User user = users.findById(claims.getSubject()).orElse(null);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }

        // Rotate: mark presented jti used, issue a new pair in the SAME family.
        row.setUsed(true);
        refreshTokens.save(row);
        return session(user, row.getFamilyId());
    }
```

**`api/src/main/java/ee/gemspot/api/repository/RefreshTokenRepository.java`** (whole file)

```java
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByJti(String jti);
    List<RefreshToken> findByFamilyId(String familyId);
    List<RefreshToken> findByUserId(String userId);

    // Self-transactional: AuthService.refresh runs without a surrounding tx so the
    // family-revoke commits before the 401 is thrown (D4 reuse detection).
    @Transactional
    @Modifying
    void deleteByFamilyId(String familyId);

    @Transactional
    @Modifying
    void deleteByUserId(String userId);
}
```

Note the existing house pattern: modifying repository methods used by `refresh()` carry
`@Transactional` + `@Modifying` **on the repository method**, precisely because
`refresh()` itself is deliberately not transactional. Your new method must follow the
same pattern and the comment must say why.

**Existing test**: `api/src/test/java/ee/gemspot/api/integration/LoginRefreshRegressionTest.java`
already covers the login→refresh path — read it before writing new tests; extend it or add
a sibling in the same style.

**Schema note**: `used` is an existing column on the refresh-token table. This plan adds
**no** Liquibase changeset (`ddl-auto: validate` — a stray entity change would fail startup).

## Commands you will need

| Purpose        | Command                                                        | Expected on success |
|----------------|----------------------------------------------------------------|---------------------|
| Build + test   | `cd api && ./gradlew build test`                               | BUILD SUCCESSFUL    |
| Auth tests     | `cd api && ./gradlew test --tests '*AuthServiceTest' --tests '*LoginRefreshRegressionTest'` | pass |

## Scope

**In scope** (the only files you should modify):
- `api/src/main/java/ee/gemspot/api/repository/RefreshTokenRepository.java`
- `api/src/main/java/ee/gemspot/api/service/AuthService.java` — **only** the body of
  `refresh()`
- `api/src/test/java/ee/gemspot/api/service/AuthServiceTest.java` (extend)
- `api/src/test/java/ee/gemspot/api/integration/LoginRefreshRegressionTest.java` (extend)

**Out of scope** (do NOT touch, even though they look related):
- The refresh-token **entity**, the table, or any Liquibase changelog. The `used` column
  already exists; no migration.
- Token TTLs, JWT signing, `JwtService`, or the claims shape.
- The `login`, `register`, `logout`, or OAuth paths in `AuthService`.
- The web client's refresh dedup (`web/src/shared/store/authStore.ts`) — client-side
  dedup is a nicety; this plan fixes the server, which is the actual authority.
- Adding distributed locks, Redis, or any new infrastructure. The database row is the
  lock. If you are reaching for anything else, STOP.
- The deliberate non-`@Transactional`-ness of `refresh()`. Its comment explains why the
  family-revoke must commit independently. **Do not add `@Transactional` to `refresh()`** —
  doing so rolls back the revoke on the 401 and silently breaks reuse detection.

## Git workflow

- Branch: `advisor/024-refresh-token-rotation-race`
- Commit style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
  (e.g. `BP-NA. [gemspot] make refresh-token rotation atomic`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add an atomic claim method to the repository

Add to `RefreshTokenRepository`, following the file's existing `@Transactional @Modifying`
pattern and commenting *why* it is self-transactional:

```java
    /**
     * Atomically claim an unused token: marks it used only if it is still unused,
     * returning the number of rows changed (1 = this caller won the rotation,
     * 0 = another request already rotated it, or it doesn't exist).
     * Self-transactional for the same reason as deleteByFamilyId: AuthService.refresh
     * runs without a surrounding transaction.
     */
    @Transactional
    @Modifying
    @Query("update RefreshToken t set t.used = true where t.jti = :jti and t.used = false")
    int markUsedIfUnused(@Param("jti") String jti);
```

Confirm the JPQL entity/field names against
`api/src/main/java/ee/gemspot/api/domain/RefreshToken.java` — the entity name must match
what you write after `update`, and the properties must be exactly `jti` and `used`. Import
`org.springframework.data.jpa.repository.Query` and
`org.springframework.data.repository.query.Param` (see `PlaceRepository.java` for the
house style of a `@Query` with `@Param`).

**Verify**: `cd api && ./gradlew build test` → BUILD SUCCESSFUL. (A malformed JPQL query
fails at context startup, which the integration tests exercise.)

### Step 2: Rotate through the atomic claim

In `AuthService.refresh()`, replace the check-then-act. The new order:

1. Parse and validate the token, look up `row` by `jti`, and 401 if absent — **unchanged**.
2. Keep the existing `if (row.isUsed())` fast path: it is still correct, still revokes the
   family, and keeps the common replay case cheap. It is now an optimisation, not the
   guarantee.
3. Look up the `User` — unchanged (do this before claiming, so a missing user doesn't
   burn the token).
4. Replace `row.setUsed(true); refreshTokens.save(row);` with the atomic claim:

```java
        // Atomic claim: only one concurrent request can flip used false -> true.
        // A 0-row result means another request rotated this jti first — that is a
        // reuse, so revoke the family and reject, same as the fast path above.
        if (refreshTokens.markUsedIfUnused(jti) == 0) {
            refreshTokens.deleteByFamilyId(row.getFamilyId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token");
        }
        return session(user, row.getFamilyId());
```

Keep `row.getFamilyId()` as the family passed to `session(...)` — the rotation must stay
in the same family, exactly as today.

Because the update bypasses the persistence context, the in-memory `row` object is now
stale. Do not read `row.isUsed()` after the claim, and do not `save(row)` anywhere in this
method afterwards — a later `save` would write the stale entity back and undo the claim.

**Verify**: `cd api && ./gradlew test --tests '*AuthServiceTest' --tests '*LoginRefreshRegressionTest'`
→ all pass. `grep -n "setUsed" api/src/main/java/ee/gemspot/api/service/AuthService.java`
→ no match inside `refresh()`.

### Step 3: Full gate

**Verify**: `cd api && ./gradlew build test` → BUILD SUCCESSFUL, no test removed or skipped.

## Test plan

Model new tests on `api/src/test/java/ee/gemspot/api/integration/LoginRefreshRegressionTest.java`
(integration style, real context) and `AuthServiceTest.java` (unit/service style). Cases:

1. **Happy path unchanged** — login, refresh once, the new access token works and the new
   refresh token is in the same family. (Likely already covered; confirm, don't duplicate.)
2. **Sequential replay still revokes** — refresh with token T (succeeds), refresh with T
   again → 401, and the whole family is gone (assert `findByFamilyId(family)` is empty).
   This proves the fast path survived the refactor.
3. **Concurrent rotation — the regression this plan fixes.** Fire two `refresh()` calls
   with the *same* refresh token from two threads (an `ExecutorService` with a
   `CountDownLatch` so both start together). Assert: **exactly one** succeeds and the other
   throws 401. A both-succeed outcome is the bug. Because this is a race, also assert the
   deterministic consequence — after both settle, the family has been revoked.
   If the test harness uses a single shared in-memory transaction that makes true
   concurrency unobservable, say so in the PR and fall back to asserting the repository
   method's contract directly (`markUsedIfUnused` returns 1 then 0 for the same jti) —
   that is the load-bearing guarantee.
4. **`markUsedIfUnused` on an unknown jti returns 0** — guards against a future rewrite
   that treats "not found" as success.

Verification: `cd api && ./gradlew build test` → BUILD SUCCESSFUL with the new tests passing.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "markUsedIfUnused" api/src/main/java/ee/gemspot/api/repository/RefreshTokenRepository.java`
      returns a match
- [ ] `grep -n "setUsed" api/src/main/java/ee/gemspot/api/service/AuthService.java` returns
      no match inside `refresh()`
- [ ] `grep -n "@Transactional" api/src/main/java/ee/gemspot/api/service/AuthService.java`
      shows **no** `@Transactional` on `refresh()`
- [ ] `cd api && ./gradlew build test` → BUILD SUCCESSFUL
- [ ] A test exists asserting exactly one of two concurrent rotations of the same jti
      succeeds (or, per the fallback above, that `markUsedIfUnused` returns 1 then 0)
- [ ] No file under `api/src/main/resources/db/` (Liquibase) modified
- [ ] `git status --porcelain` lists no modified file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `RefreshToken`'s properties are not named `jti` / `used`, so the JPQL above is wrong.
- The context fails to start with a JPQL parse error you cannot fix by correcting names.
- Any existing auth test fails after step 2 — that means a behaviour change this plan did
  not intend. Report the failing assertion; do not "fix" the test to match.
- You conclude `refresh()` needs `@Transactional` — it must not have it (see Scope), and
  if the atomic claim seems to require it, the design is wrong; report instead.
- You are about to introduce a lock, a queue, a cache, or any new dependency.
- The concurrency test is flaky (passes and fails across runs). Report it rather than
  landing a flaky test — the fallback assertion in the test plan is the stable alternative.

## Maintenance notes

- The `used` flag is now authoritative only via `markUsedIfUnused`. Any future code that
  flips `used` by loading the entity and calling `save()` reintroduces this exact race —
  that is the thing to watch for in review of any later change to `AuthService`.
- The early `if (row.isUsed())` check is now a fast path, not the security boundary.
  Deleting it is safe; weakening the atomic claim is not. Say so in a code comment if it
  isn't already clear from the one added in step 2.
- A reviewer should scrutinise: (a) no `@Transactional` crept onto `refresh()`, (b) the
  stale `row` is not saved after the claim, (c) both the 0-row path and the fast path
  revoke the family, so reuse detection behaves identically whichever one catches it.
- Deliberately deferred: used tokens are never pruned, so the refresh-token table grows
  without bound. A cleanup job / TTL sweep is worth doing, and is out of scope here.
