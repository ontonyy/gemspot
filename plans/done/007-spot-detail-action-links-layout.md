# 007 — Spot detail: "Open in full map" / "Report a problem" links layout

Priority: P3 · Effort: S · Risk: LOW · Depends on: —

## Problem

On `#/spot/<slug>` the two action links render visually crammed / on one line, hard to
notice and hard to distinguish: `Open in full map →Report a problem · outdated`.

## Where

- `web/src/features/place-detail/SpotDetail.tsx:143-149` — two `<button className="fg-report-link">` siblings.
- `.fg-report-link` styles in `web/src/shared/styles/atoms.css` — check display/margins; likely inline or insufficient vertical separation.

## Fix direction

Make each link its own clearly separated row (block display, vertical gap, comfortable
tap target ≥40px height on mobile). Optionally wrap both in a small "actions" container
with a top border/divider so they read as a footer section of the panel. Keep existing
visual language (fg-* classes, tokens.css vars) — style change only, no behavior change.

## Verify

- Desktop panel + mobile full-screen: two links on separate lines, visibly clickable.
- Icons align with text; no overlap with `fg-detail-bar` (Save/Directions bar).
- `npm run build` passes.

## STOP conditions

- Don't redesign the whole detail panel; touch only the two links + their container styles.

## Session block (fresh session, one block)

Branch: `BP-NA-gemspot-web-detail-action-links` off `master`. Parallelization: none.

Shared preamble:
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-detail-action-links (create off master)
Task anchor: plans/007-spot-detail-action-links-layout.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

Prompt 1: Use shared preamble. Read plans/007 plan. Inspect `SpotDetail.tsx:143-149` and `.fg-report-link` in `web/src/shared/styles/atoms.css`. Restyle so both links are separate, well-spaced rows with clear affordance. Surgical CSS/markup change only.

Prompt 2: Verify in dev server on desktop + mobile viewport (375px), run `npm run build`. Report changed files + before/after description. Stop.
