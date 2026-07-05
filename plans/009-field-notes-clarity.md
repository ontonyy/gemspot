# 009 — Spot detail: "Field notes" facts unclear (Access/Free, Lit/No, Best/Day)

Priority: P2 · Effort: M · Risk: LOW · Depends on: —

## Problem

Field notes grid shows terse key/value pairs users can't decode:

```
Access   Lit   Best
Free     No    Day
```

"Best" (best time to visit) and abbreviated values ("Eve", "Dusk", "Apr") mean nothing
to a new user. Poor UX.

## Where

- Render: `web/src/features/place-detail/SpotDetail.tsx:127-132` (`fg-facts` / `fg-fact` k/v cells).
- Values: per-spot data in `web/src/shared/api/placesApi.ts` RAW dataset (`access`, `lit`, `best`), DTO `fieldNotes` in `web/src/shared/api/types.ts:89`.
- Values observed: access `Free|Paid|Booking`; lit `Yes|No`; best `Eve|Day|Dusk|Apr`.

## Fix direction

Frontend presentation-layer mapping — do NOT rewrite dataset or API:

1. Add a small label map in the detail feature (or `entities/place`):
   - keys: `Access` → "Access", `Lit` → "Lighting", `Best` → "Best time".
   - values: `Free` → "Free entry", `No` → "Not lit", `Yes` → "Lit at night", `Eve` → "Evenings", `Day` → "Daytime", `Dusk` → "Around dusk", `Apr` → "April (season)", `Paid` → "Paid", `Booking` → "Booking needed". Unknown values pass through unchanged.
2. Consider icons per fact (existing `Icon`/`Ic` set) + tooltip/`title` for extra context.
3. Keep the 3-column `fg-facts` layout unless longer labels break it — if they wrap badly, switch to stacked rows on narrow widths.

## Verify

- Multiple spots (ping-pong, scenic, sakura) show human-readable facts; no raw "Eve"/"Apr" visible.
- Unknown/new backend value renders as-is (no crash, no blank).
- `npm run build` + `npm run test` pass; add a small unit test for the mapping fn.

## STOP conditions

- Do not change API DTOs or backend enums — presentation mapping only.

## Session block (fresh session, one block)

Branch: `BP-NA-gemspot-web-field-notes-clarity` off `master`. Parallelization: none.

Shared preamble:
```text
Repo: /Users/ontony/Desktop/archivarius/codes/gemspot
Branch: BP-NA-gemspot-web-field-notes-clarity (create off master)
Task anchor: plans/009-field-notes-clarity.md
Communication: caveman ultra. Use engineering-task-memory-orchestrator.
Do not commit unless user asks. Repo state is source of truth.
```

Prompt 1: Use shared preamble. Read plans/009 plan. Enumerate ALL distinct `access`/`lit`/`best` values in `placesApi.ts` RAW dataset first (grep), then implement the mapping fn + updated render with unit test. Unknown values pass through.

Prompt 2: Verify per plan (several spots, test run, build). Report changed files, full value map used, verification result. Stop.
