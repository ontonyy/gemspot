# Plan 027: Keyboard access for map markers, cluster pills and the photo carousel

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 0ce116c..HEAD -- web/src/widgets/map/SpotMap.tsx web/src/features/place-detail/SpotDetail.tsx web/src/shared/styles/atoms.css`
> If an in-scope file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding. A moved line number
> is not a STOP — re-locate the code. A structurally different component is.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (markup + CSS; no data flow, no API surface)
- **Depends on**: plan 021 (jsdom + Testing Library harness)
- **Category**: accessibility
- **Planned at**: commit `0ce116c`, 2026-09-17

## Why this matters

Three interactive controls in the app are non-elements: bare `div`s and `<i>`s with
`onClick`. They are not in the tab order, do not respond to Enter/Space, have no
accessible name, and show no focus ring.

- **Photo carousel dots** (`SpotDetail.tsx`) — `<i onClick>`. There is **no other path**
  to photos 2..n. A keyboard or screen-reader user cannot browse a spot's photos at all.
  This is the serious one and the cheapest fix.
- **Map markers and cluster pills** (`SpotMap.tsx`) — partly mitigated: the rail list
  reaches the same spots by keyboard. Still worth fixing, and the fix is the same shape.

The correct fix is also the smallest: render a real `<button>`. A native button is
tabbable, fires `click` on Enter *and* Space, and a `click` from the keyboard bubbles to
the existing `el.addEventListener('click', …)` on the maplibre marker element — so the
map's selection wiring needs no change at all.

## Current state

`web/src/features/place-detail/SpotDetail.tsx` (~142-148):

```tsx
{hasPhotos && photos.length > 1 && (
  <div className="fg-detail-dots">
    {photos.map((_, i) => (
      <i key={i} data-on={i === shot} onClick={() => setShot(i)} />
    ))}
  </div>
)}
```

`web/src/widgets/map/SpotMap.tsx` — `SpotPin` (~89-106) wraps its disc in
`<div className="fg-pinbtn">`; `ClusterPill` (~119-130) renders
`<div className="fg-cluster" …>`. Neither is exported. `updateMarkers` attaches the
click handler to the maplibre marker host element, not to these nodes.

`web/src/shared/styles/atoms.css` — `.fg-detail-dots i` (394-397), `.fg-pinbtn` (273),
`.fg-cluster` (192-203). No global `:focus-visible` rule exists anywhere in the styles.

## Scope

In scope:

- `web/src/widgets/map/SpotMap.tsx`
- `web/src/features/place-detail/SpotDetail.tsx`
- `web/src/features/place-detail/SpotDetail.test.tsx`
- `web/src/widgets/map/SpotMap.markers.test.tsx` (new)
- `web/src/shared/styles/atoms.css`
- `plans/027-map-and-carousel-keyboard-access.md`

Out of scope — do not touch:

- `plans/README.md`, any other plan file, `.claude/`, `api/`
- the maplibre worker plumbing (`maplibreWorker.ts`, `maplibre.worker.ts`), `buildStyle.ts`
- any other component with `div onClick` (separate finding, separate plan)
- global focus-ring rules for the whole app — only the three controls touched here

## Steps

### 1. Carousel dots become buttons

In `SpotDetail.tsx`, replace each `<i>` with:

```tsx
<button
  key={i}
  type="button"
  data-on={i === shot}
  aria-label={`Show photo ${i + 1} of ${photos.length}`}
  aria-current={i === shot}
  onClick={() => setShot(i)}
/>
```

Verify: `cd web && npx tsc --noEmit` (or the build in step 5) reports no error.

### 2. Map pin and cluster pill become buttons

In `SpotMap.tsx`:

- `SpotPin`: `<div className="fg-pinbtn">` → `<button type="button" className="fg-pinbtn" aria-label={name}>`.
- `ClusterPill`: needs the count for its label, so `<div className="fg-cluster" …>` →
  `<button type="button" className="fg-cluster" data-active data-dim aria-label={`Zoom in to ${count} spots`}>`.
- Export both components (`export function SpotPin` / `export function ClusterPill`) so
  they are testable without a WebGL map. Nothing else imports them.

Leave `updateMarkers` alone: the keyboard-generated `click` bubbles from the button to
the marker host element that already carries the listener.

### 3. CSS — keep the look, add a focus ring

In `web/src/shared/styles/atoms.css`:

- Retarget `.fg-detail-dots i` → `.fg-detail-dots button` (both rules, including the
  `[data-on="true"]` one) and add a button reset: `padding:0;appearance:none;`.
- `.fg-pinbtn` and `.fg-cluster` need `border:none`/keep their own border,
  `background:none` where the element had none, `padding:0` for the pin, `font:inherit`,
  `color:inherit`, so a browser default button style cannot leak into the map.
  `.fg-cluster` already sets its own `background`, `border`, `padding` — keep those
  declarations and only add what a button resets away (`font:inherit`, `color:inherit`).
- Add a visible focus ring for the three controls only:

```css
.fg-detail-dots button:focus-visible,.fg-pinbtn:focus-visible,.fg-cluster:focus-visible{
  outline:2px solid var(--ink);outline-offset:2px;}
```

Verify: `cd web && npm run build` succeeds; the pill/pin/dot rules still match.

### 4. Tests that exercise the keyboard, not the attribute

`SpotDetail.test.tsx` — add a case with a place carrying two photos:

- render, `await userEvent.tab()` repeatedly (or `userEvent.tab()` until focused) to
  reach the second dot, press `{Enter}`, assert the hero `<img>`/`Photo` now shows
  photo 2's url. Add a second case doing the same with `{ }` (Space).
- Assert the accessible names are present (`getByRole('button', { name: 'Show photo 2 of 2' })`).

`SpotMap.markers.test.tsx` (new) — render `SpotPin` and `ClusterPill` inside a wrapper
`div` that carries an `onClick` spy, mirroring the maplibre marker host:

- `userEvent.tab()` focuses the button; `userEvent.keyboard('{Enter}')` and `'{ }'` each
  fire the wrapper's handler — this is what proves the map wiring still works from the
  keyboard.
- Assert accessible names: pin → the spot name, pill → `Zoom in to 7 spots`.

Verify: `cd web && npm run test` — all previous tests still pass, new ones pass.

### 5. Gate

```
cd web && npm run lint && npm run test && npm run build
```

## Test plan

| Case | Proves |
|---|---|
| Tab reaches carousel dot 2 | dot is in the tab order |
| Enter on dot 2 changes the hero photo | the whole journey, not an attribute |
| Space on dot 2 changes the hero photo | Space works (a `div` with `role=button` would not) |
| Dot accessible name `Show photo 2 of 2` | screen-reader usable |
| Tab reaches `SpotPin`; Enter/Space fires the host handler | map selection works by keyboard |
| Tab reaches `ClusterPill`; Enter/Space fires the host handler | cluster expansion works by keyboard |

Baseline before this plan: 10 files / 42 tests, all green.

## STOP conditions

- `SpotPin`/`ClusterPill` no longer exist or no longer render the markup above
  (structural rewrite since planning) — stop and report.
- Making the pin a `<button>` changes marker positioning in the build (maplibre anchors
  the *host* element, not our node, so it should not) — stop rather than restyle the map.
- The gate fails for a reason outside the in-scope files — stop and report.
- Any fix appears to require touching an out-of-scope file — stop and report.

## Done criteria

- [ ] Carousel dots, map pins and cluster pills are real `<button>` elements with
      `type="button"` and an accessible name.
- [ ] Each is reachable by Tab and operable by both Enter and Space.
- [ ] A visible `:focus-visible` ring exists for all three; the resting visual design is
      unchanged.
- [ ] New tests drive the keyboard (`tab()` / `keyboard()`) and assert the *effect*.
- [ ] `cd web && npm run lint && npm run test && npm run build` all pass; the 42
      pre-existing tests still pass.
