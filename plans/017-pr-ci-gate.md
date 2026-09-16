# Plan 017: Run the lint/test gates on pull requests, not only on deploy

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- .github/workflows`
> If anything changed, compare the "Current state" excerpts below against the live files; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (adds a workflow; touches no deploy step)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

The lint/test gates exist, but they only run inside the two deploy workflows, which trigger on
`push` to `master`. This repo works through pull requests (`git log` is a chain of merge commits:
`0ce116c`, `03bdc42`, …), so a PR is green **by absence of any check** — a broken test is
discovered during the deploy that follows the merge. For the web workflow the deploy is the same
job as the gate, so master sits briefly broken.

The `paths:` filters make it worse for cross-cutting PRs: a change touching both `api/` and `web/`
runs each suite only in its own deploy, and never both before merge.

One new workflow fixes this. The deploy workflows stay exactly as they are — keeping their gates is
correct defence in depth (a `workflow_dispatch` or a direct push must still be gated).

## Current state

`.github/workflows/deploy-web.yml:5-12`:

```yaml
on:
  push:
    branches: [master]
    paths:
      - 'web/**'
      - 'firebase.json'
      - '.github/workflows/deploy-web.yml'
  workflow_dispatch:
```

Its gate steps (lines 19-34) are the commands to mirror:

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json

      - run: npm ci
        working-directory: web

      # Gate: block the deploy on lint or test failures.
      - run: npm run lint
        working-directory: web

      - run: npm run test
        working-directory: web
```

`.github/workflows/deploy-api.yml:6-12` has the same `push`-only trigger, and its gate (lines
25-34) is:

```yaml
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '25'

      - name: Test
        run: ./gradlew test
        working-directory: api
```

Note: the API suite uses Testcontainers, which needs Docker — the `ubuntu-latest` runner has it, as
the existing comment in `deploy-api.yml` says.

There is no `pull_request`-triggered workflow anywhere: confirm with
`grep -rn 'pull_request' .github/workflows/` → no output.

### Conventions to match

- Workflows are plain GitHub Actions YAML in `.github/workflows/`, `ubuntu-latest`, pinned major
  action versions (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-java@v4`).
- Node 22 for web; Temurin Java 25 for api.
- Comments at the top of each workflow explain what it is for — write one in the same voice.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Web gate | `cd web && npm ci && npm run lint && npm run test && npm run build` | exit 0 |
| API gate | `cd api && ./gradlew test` | all pass (needs Docker for Testcontainers) |
| YAML sanity | `git diff --check` and re-reading the file | no whitespace errors |

## Scope

**In scope**:
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT modify):
- `.github/workflows/deploy-web.yml` and `.github/workflows/deploy-api.yml`. Do **not** remove
  their gate steps "because CI now covers it" — a `workflow_dispatch` deploy must stay gated.
  Do not change their triggers, their `paths:` filters, or anything about the deploy steps.
- Any repository setting (branch protection, required checks). Making the new workflow *required*
  is a GitHub settings change the operator makes; mention it in your report instead.
- `web/package.json` scripts and `api/build.gradle.kts` — this plan adds no new commands.

## Git workflow

- Branch: `advisor/017-pr-ci-gate`
- Commit message style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write the CI workflow

Create `.github/workflows/ci.yml` with:

- A header comment: this runs the same lint/test gates the deploy workflows run, but before merge;
  the deploy workflows keep their own gates for `workflow_dispatch` and direct pushes.
- Trigger:
  ```yaml
  on:
    pull_request:
    workflow_dispatch:
  ```
  No `paths:` filter — a PR should run both suites regardless of which directory it touches. That
  is the point.
- Two independent jobs so a web failure and an api failure are reported separately:
  - `web`: `actions/checkout@v4`, `actions/setup-node@v4` (node 22, npm cache with
    `cache-dependency-path: web/package-lock.json`), `npm ci`, then `npm run lint`,
    `npm run test`, `npm run build` — all with `working-directory: web`.
  - `api`: `actions/checkout@v4`, `actions/setup-java@v4` (temurin, `java-version: '25'`), then
    `./gradlew test` with `working-directory: api`.
- Copy the step shapes from the deploy workflows verbatim rather than inventing variants.

For the web `build` step, do **not** pass the deploy's `VITE_*` secrets — a PR build only needs to
compile. If `npm run build` fails without `VITE_API_URL`, that is information: the app is
documented to fall back to an in-app mock when it is unset, so a failure means something else is
wrong. Report it rather than wiring secrets into a PR-triggered workflow (PRs from forks cannot
read them anyway).

**Verify**: run the same commands locally — `cd web && npm ci && npm run lint && npm run test && npm run build`
→ exit 0, and `cd api && ./gradlew test` → all pass. If Docker is unavailable to you, run the web
half and say so explicitly in your report.

### Step 2: Confirm nothing else changed

**Verify**: `git status --porcelain` → shows only `.github/workflows/ci.yml` as added, and
`git diff --stat 0ce116c..HEAD -- .github/workflows/deploy-web.yml .github/workflows/deploy-api.yml`
→ empty.

## Test plan

There is nothing to unit-test here; the verification is that the exact commands in the workflow
pass locally (step 1) and that the two deploy workflows are byte-identical to before (step 2).

After the branch is pushed and a PR opened (operator's call, not yours), the check should appear on
the PR with both jobs. Note in your report that the operator still needs to mark `web` and `api` as
**required status checks** in the branch-protection settings for the gate to actually block a
merge — the workflow alone only reports.

## STOP conditions

- `grep -rn 'pull_request' .github/workflows/` already returns a hit → a CI workflow exists; STOP
  and report rather than adding a second one.
- `cd web && npm run build` fails without `VITE_API_URL` → STOP and report. Do not add secrets to a
  PR-triggered workflow to work around it.
- `./gradlew test` needs credentials or a network service beyond Docker-local Testcontainers →
  STOP and report; a PR job must not need deploy credentials.

## Done criteria

- `.github/workflows/ci.yml` exists, triggers on `pull_request`, and has exactly two jobs (`web`,
  `api`) with no `paths:` filter.
- The two deploy workflows are unchanged (`git diff` against `0ce116c` shows no hunks in them).
- Every command the workflow runs passes locally (or, where Docker is unavailable, the unavailable
  half is explicitly named in your report).

## Maintenance note

Two places now run the same gate commands, deliberately: `ci.yml` (before merge) and each deploy
workflow (before shipping). When a gate command changes — a new `typecheck` script, a formatter —
update both. If that duplication ever becomes annoying, the fix is a composite action, not deleting
the deploy-side gate. The operator must also mark the two jobs as required checks in branch
protection; until they do, this workflow reports but does not block.
