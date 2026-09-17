# Plan 029: An explicit typecheck script, a shared .editorconfig, and an opt-in pre-commit hook

> **Executor instructions**: Follow this plan step by step. Run every Verify command and confirm
> the expected result before moving on. If a "STOP conditions" item occurs, stop and report — do
> not improvise. When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/package.json AGENTS.md`
> If anything changed, compare the "Current state" excerpts below against the live files; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW (adds one npm script, two new files, and doc lines; changes no source and no build)
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Nothing in this monorepo states its own formatting: there is no `.editorconfig`, no `.prettierrc`,
no Spotless, and no pre-commit hook. Consistency is convention-only, so the first thing a new editor
or a new agent does to a file is re-indent it, and that noise lands in the same diff as the change.

Worse for day-to-day work: there is no `typecheck` script. `tsc` runs only as the first half of
`npm run build` (`"build": "tsc -b && vite build"`), so the cheapest possible feedback — "does this
still typecheck?" — costs a full Vite bundle. `npm run lint` does not typecheck: ESLint's
`typescript-eslint` preset here is the non-type-checked `recommended`, so a genuine type error
passes lint and is only caught by a build or by CI.

This slice adds the three cheapest things that hold, and deliberately does **not** add a formatter.

## Current state

`web/package.json` scripts (lines 6-12):

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "preview": "vite preview"
  },
```

Confirm the absences before you start — each of these must produce **no output**:

```
ls .editorconfig .prettierrc* web/.prettierrc*   # → No such file (expected)
grep -rn 'spotless' api/build.gradle.kts
grep -rn 'husky\|lint-staged\|typecheck' web/package.json
ls .githooks 2>/dev/null
git config --get core.hooksPath
```

Observed indentation conventions (measured, do not guess):

- `api/**/*.java` and `api/*.gradle.kts` — 4 spaces, no tabs.
- `web/src/**/*.{ts,tsx}` — 2 spaces, no trailing semicolons (an ESLint/TS style the repo already
  follows consistently).
- `*.yml`, `*.json`, `*.md` — 2 spaces.

`.github/workflows/ci.yml` runs `npm ci && npm run lint && npm run test && npm run build` for web
and `./gradlew test` for api. Plan 017's maintenance note says that when a gate command changes,
both `ci.yml` and the deploy workflows must be updated. **This plan does not add a gate command to
CI** — see "Out of scope".

## Deliberate non-goals (read before you add anything)

**No Prettier.** `web/` already has ESLint, so adding Prettier means also adding the
`eslint-config-prettier` handshake or the two fight over the same rules — two new devDependencies
for a benefit that cannot even be verified here, because `prettier --check .` would fail on the
existing tree and fixing that means a repo-wide reformat. A reformat sweep is its own change (it
would bury every other diff in this PR). Shipping a `--check` command that is documented but known
to fail is precisely the defect this slice exists to avoid. Record it as follow-up.

**No Spotless.** Same reasoning on the `api/` side, plus a Gradle plugin change that must keep
`./gradlew build test` green.

`.editorconfig` covers what reviewers actually argue about (indent width, EOL, final newline,
trailing whitespace) with zero dependencies and zero build impact, and every mainstream editor
honours it.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck (new) | `cd web && npm run typecheck` | `TypeScript: No errors found`, exit 0 |
| Web gate | `cd web && npm run lint && npm run test && npm run build` | exit 0, 12 test files / 51 tests pass |
| API gate | `cd api && ./gradlew build test` | `BUILD SUCCESSFUL` (needs Docker for Testcontainers) |
| Hook, installed | `git config core.hooksPath` | `.githooks` |
| Hook, run directly | `.githooks/pre-commit` | exit 0 |

## Scope

**In scope** (create or modify only these):
- `.editorconfig` (create, repo root)
- `web/package.json` (add one script)
- `.githooks/pre-commit` (create, executable)
- `AGENTS.md` (document the new commands and the opt-in hook install)
- `plans/029-formatter-precommit-typecheck.md` (this file)

**Out of scope** (do NOT modify):
- Any source file. **Do not reformat anything.** `.editorconfig` applies to files as they are next
  edited; it is not a sweep.
- `web/package-lock.json` — this plan adds no dependency. If the lockfile changes, you installed
  something; undo it.
- `api/build.gradle.kts` — no Spotless (see non-goals).
- `.github/workflows/*` — do not add `typecheck` to CI in this PR. `npm run build` already runs
  `tsc -b`, so CI's type coverage is unchanged; adding a redundant job is churn. If a later plan
  drops `build` from CI, that plan adds `typecheck`.
- `plans/README.md`, `.claude/`, other plan files, `docs/`.
- Any global git config. The hook is installed per-clone and per-developer, opt-in.

## Git workflow

- Branch: `advisor/029-formatter-precommit-typecheck`
- Commit message style, from `git log`: `BP-NA. [gemspot] <imperative summary>`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add the `typecheck` script

In `web/package.json`, add to `scripts`, after `"build"`:

```json
    "typecheck": "tsc -b --noEmit",
```

`-b` is required, not optional: `web/tsconfig.json` is a solution file (`"files": []` plus
references to `tsconfig.app.json` and `tsconfig.node.json`), so a plain `tsc --noEmit` checks
nothing. `--noEmit` keeps build mode from writing `.tsbuildinfo` or `dist` output.

**Verify**: `cd web && npm run typecheck` → `TypeScript: No errors found`, exit 0. Then
`git status --porcelain` → `web/package.json` modified and nothing else; in particular no
`*.tsbuildinfo` and no `web/dist` churn.

**Verify the script actually checks something** (do not skip — a `typecheck` that passes on a
broken file is worse than none): append `const _bad: number = 'x'` to any `web/src/**/*.ts` file,
re-run `npm run typecheck` → it must fail with `TS2322`. Then revert the file
(`git checkout -- <file>`) and re-run → passes.

### Step 2: Add the root `.editorconfig`

Create `.editorconfig` at the repo root with `root = true`, a `[*]` default (utf-8, lf,
`insert_final_newline`, `trim_trailing_whitespace`, 2-space indent), a `[*.{java,kts}]` override to 4
spaces, and a `[*.md]` override turning `trim_trailing_whitespace` off (two trailing spaces are a
hard line break in Markdown). These values come from the measurements in "Current state" — they
describe the tree as it is, they do not propose a new style.

**Verify**: the file describes reality, so spot-check it rather than trusting it. Pick one Java file
and one `.tsx` file and confirm their indent width matches what you wrote:

```
git ls-files '*.java' | head -40 | xargs grep -ho '^ \+' | awk '{print length}' | sort -n | uniq -c | head -3
git ls-files 'web/src' | grep -E '\.tsx?$' | head -40 | xargs grep -ho '^ \+' | awk '{print length}' | sort -n | uniq -c | head -3
```

The dominant widths must be multiples of 4 for Java and of 2 for TS. If not, the measurement wins —
change `.editorconfig`, not the source.

### Step 3: Add the opt-in pre-commit hook

Create `.githooks/pre-commit` (`chmod +x`). Requirements, all of them load-bearing:

- **Opt-in, never silent.** It lives in `.githooks/`, which git ignores until someone runs
  `git config core.hooksPath .githooks`. A hook that installs itself on `npm install` is a trap:
  it surprises whoever clones the repo next. Do not add husky or lint-staged for this.
- **Fast.** Web only (`npm run lint` + `npm run typecheck`, a few seconds). Do **not** run
  `npm run test` or `./gradlew` in a hook — CI covers those and a multi-minute pre-commit gets
  bypassed with `--no-verify` within a day, which is the same as not having it.
- **Scoped.** If the staged diff touches no `web/` file, exit 0 immediately. An api-only commit must
  not pay for a web check.
- **Escapable, and says so.** On failure, print that `git commit --no-verify` skips it.
- `set -e`, `#!/bin/sh`, no bashisms.

Use `git diff --cached --name-only --diff-filter=ACM` to decide whether `web/` is touched. Note that
the hook runs from the repo root, so `cd web` before the npm commands.

**Verify** (run all four — a hook that is documented but never executed is the defect this plan
exists to catch):
1. `.githooks/pre-commit` with nothing staged → exit 0, prints the "no web changes" line.
2. `git config core.hooksPath .githooks`, then `git config --get core.hooksPath` → `.githooks`.
3. Stage a web file (`git add web/package.json`) and run `.githooks/pre-commit` directly → runs
   lint + typecheck, exit 0. Time it; if it exceeds ~30s, say so in your report.
4. Confirm it actually fires on a real commit path without making a commit:
   `git commit --dry-run` does **not** run hooks, so instead break a staged web file, run the hook,
   confirm non-zero exit, then restore the file.

**Leave the repo with the hook installed or not, whichever the operator's clone already was** —
record which in your report. Installing `core.hooksPath` changes only `.git/config`, which is not
part of the commit.

### Step 4: Document it in AGENTS.md

`AGENTS.md` is the orientation doc and its "Build / run / test" section currently reads
`web: cd web && npm run dev | build | lint | test`. Add `typecheck` to that list, and add a short
"Formatting / hooks" bullet under Conventions covering:

- `.editorconfig` is the only formatting config; there is no Prettier or Spotless, so **do not
  reformat files you did not otherwise change**.
- The one-line opt-in hook install: `git config core.hooksPath .githooks`, what it runs, and that
  `--no-verify` skips it.

Keep it to a few lines in the doc's existing terse voice. Do not restate this plan there.

**Verify**: every command quoted in AGENTS.md must have been executed in a previous step, and every
path it names must resolve — check each with `ls`.

### Step 5: Full gate

**Verify**: `cd web && npm run lint && npm run test && npm run build` → exit 0 with 12 test files /
51 tests passing, and `cd api && ./gradlew build test` → `BUILD SUCCESSFUL`. Then
`git status --porcelain` lists exactly the five in-scope paths and nothing else.

## Test plan

There is no product behaviour to unit-test; the whole deliverable is commands, so the test is that
each one was actually run:

| Claim made by the deliverable | How it is tested |
|---|---|
| `npm run typecheck` passes | Step 1, run |
| `npm run typecheck` catches a real type error | Step 1, deliberate `TS2322` then revert |
| `.editorconfig` matches the tree | Step 2, indent-width measurement |
| The hook exits 0 with no web changes | Step 3 verify 1 |
| The hook installs with one command | Step 3 verify 2 |
| The hook passes on a clean web tree, quickly | Step 3 verify 3 |
| The hook fails on broken web code | Step 3 verify 4 |
| Nothing regressed | Step 5, both gates |

The web suite must still report **51 tests across 12 files**. A different number means something
outside this plan's scope moved — investigate before continuing.

## STOP conditions

- `npm run typecheck` fails on the unmodified tree → STOP and report. There is a pre-existing type
  error; fixing it is a separate change and must not be smuggled in here.
- Adding the script changes `web/package-lock.json`, or `npm` wants to install anything → STOP.
  This plan adds no dependency.
- The pre-commit hook takes more than ~30s on a clean tree → STOP and report rather than shipping
  it. A slow hook is worse than no hook.
- Either gate (`web` or `api`) is red *before* you start → STOP; you are not on the expected base.
- You find yourself reformatting a source file for any reason → STOP. That is the one thing this
  plan forbids.
- A formatter (`prettier --check`, Spotless) turns out to be in scope after all in your judgement →
  STOP and report it as follow-up work instead. Do not add it here.

## Done criteria

- `web/package.json` has a `typecheck` script; `npm run typecheck` passes and demonstrably fails on
  an injected type error.
- `.editorconfig` exists at the root, is `root = true`, and its indent rules match the measured
  tree (4 for Java and Gradle Kotlin, 2 elsewhere).
- `.githooks/pre-commit` exists, is executable, is opt-in, exits 0 on a non-web commit, and was run
  in all four states from step 3.
- `AGENTS.md` names `typecheck` and the hook install line, and every command it quotes has been
  executed successfully.
- Both gates green; `git status --porcelain` shows only the five in-scope paths; no source file was
  reformatted.

## Follow-up (explicitly NOT this plan)

1. **Prettier for `web/`** — needs `prettier` + `eslint-config-prettier`, a `.prettierrc`, and a
   one-commit repo-wide `prettier --write` sweep landed on its own so it buries nothing.
2. **Spotless for `api/`** — same shape: plugin + config + a separate `spotlessApply` sweep commit,
   verified against `./gradlew build test`.
3. Once (1) and (2) exist, extend `.githooks/pre-commit` to a staged-files format check and add the
   format check to `.github/workflows/ci.yml` — and update plan 017's deploy workflows too, per its
   maintenance note.
