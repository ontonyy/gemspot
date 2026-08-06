# 008 — Spot detail: explicit "Copy link" alongside Share

Priority: P3 · Effort: S · Risk: LOW · Depends on: 007 (soft — same panel area)

## Problem

Share button uses Web Share API with clipboard as silent fallback
(`SpotDetail.tsx:69-87`). Users want an explicit, discoverable "copy link" action so
the spot URL can be shared with anyone, regardless of `navigator.share` support.

## Current behavior

- `onShare`: `navigator.share({title, text, url})`; on unsupported/cancel → `navigator.clipboard.writeText(url)` + "Link copied" toast.
- URL shape: `${origin}${BASE_URL}#/spot/${slug}` — already shareable/deep-linkable.

## Fix direction

Options (pick 1, state choice in task note):
1. **Split into two actions**: keep Share icon (native sheet) + add a Copy-link icon button next to it in `fg-detail-top`. Simple, discoverable.
2. **Share menu**: Share button opens a small menu (like existing `fg-dir-menu` Directions pattern at `SpotDetail.tsx:162-175`): "Share…" (native) + "Copy link". Reuses established pattern, better on desktop where `navigator.share` is absent.

Recommended: option 2 — reuse `fg-dir-menu` pattern, consistent UX, one button. On desktop
without Web Share API, menu shows only "Copy link".

Keep `track('share', …)` analytics; add distinct param for copy (`{method:'copy'}`).

## Verify

- Desktop (no navigator.share): copy link works, toast shows, pasted URL opens the spot.
- Mobile/Safari: native share sheet still reachable.
- `npm run build` passes.

## Session block (fresh session, one block)

Branch: `BP-NA-gemspot-web-share-copy-link` off `master`. Parallelization: none.

Shared preamble:
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-share-copy-link (create off master)
Task anchor: plans/008-spot-detail-share-copy-link.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

Prompt 1: Use shared preamble. Read plans/008 plan. Read `SpotDetail.tsx` (onShare 69-87, dir-menu 162-180) + relevant `atoms.css` classes. Implement option 2 (share menu with native share + copy link) unless codebase reality argues for option 1 — if so, say why and switch.

Prompt 2: Verify: desktop copy path, toast, deep link works when pasted; build passes. Report changed files + choice rationale. Stop.
