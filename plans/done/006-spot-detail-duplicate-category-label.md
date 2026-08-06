# 006 — Spot detail: duplicate category label

Priority: P2 · Effort: S · Risk: LOW · Depends on: —

## Problem

On `#/spot/<slug>` (e.g. `politseiaia-ping-pong`) the category label renders twice:
"Table tennis Table tennis".

## Root cause (confirmed in source)

`web/src/features/place-detail/SpotDetail.tsx`:

- Line 92–93: when the spot has **no photos**, the hero `<Photo … glyph large label={p.category.label} />` renders the category label inside the hero placeholder.
- Line 98: `<span className="fg-detail-cattag">…{p.category.label}</span>` renders the same label as the category tag overlay.

Both are absolutely positioned in `.fg-detail-hero`, so the two labels appear side by side / stacked.

## Fix direction

Keep exactly one label. Recommended: keep the `fg-detail-cattag` chip (it has the glyph + colored styling), and stop passing `label` to the hero `Photo` in the detail view (or render the glyph-only placeholder without text). Check `web/src/entities/place/Photo.tsx` to see how `label` is used — other call sites (RailCard, Saved, Guides) may legitimately need it, so change only the detail call site, not the `Photo` component.

## Verify

- `cd web && npm run dev`, open a photo-less spot (`#/spot/politseiaia-ping-pong`): label appears once.
- Open a spot WITH photos: cattag still renders once, hero photo unaffected.
- Rail cards / Saved / Guides placeholders unchanged.
- `npm run build` passes.

## STOP conditions

- If `Photo` label is load-bearing for accessibility (alt text), replace with `aria-label`, don't just delete.
- If duplication is not reproducible, stop and re-inspect live DOM before editing.

## Session block (fresh session, one block)

Branch: `BP-NA-gemspot-web-dup-category-label` off `master`. Parallelization: none.

Shared preamble:
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-dup-category-label (create off master)
Task anchor: plans/006-spot-detail-duplicate-category-label.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

Prompt 1: Use shared preamble. Read plans/006 plan fully. Read `web/src/features/place-detail/SpotDetail.tsx` and `web/src/entities/place/Photo.tsx`. Confirm root cause (hero Photo label + cattag double render for photo-less spots). Implement minimal fix at the detail call site only.

Prompt 2: Verify per plan (dev server, photo-less + photo spot, `npm run build`). Report changed files + verification result. Stop.
