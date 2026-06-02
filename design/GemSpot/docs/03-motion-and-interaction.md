# 03 · Motion & Interaction Spec

Applies the **Emil Kowalski design-engineering** philosophy: animate with purpose, keep UI motion under 300ms, use strong custom easing, never animate keyboard-repeated actions, and honour `prefers-reduced-motion`. The prototype already follows most of this; this doc records the spec and flags what to refine for production.

---

## Motion tokens

```css
--ease-out:     cubic-bezier(0.23, 1, 0.32, 1);   /* enter/exit UI — the prototype default */
--ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);  /* on-screen movement */
--ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);   /* iOS-like sheets/drawers */
--ease-marker:  cubic-bezier(0.2, 0.7, 0.3, 1);   /* marker state changes */
```

Never `ease-in` on entering UI; never `transition: all` (name the properties); animate **only `transform` and `opacity`**.

## Duration table (what the prototype uses → keep)

| Element | Duration | Easing | Notes |
|---------|----------|--------|-------|
| Button / chip press (`scale .97`) | 140ms | ease-out | tactile "heard you" |
| Save toggle press | 140ms (scale .9) | ease-out | |
| Hover (bg/border/lift) | 140–160ms | ease-out / ease | |
| Popovers (user menu, cluster, directions) | 160ms | ease-out | from `translateY(-6px) scale(.97)` + opacity |
| Detail **panel** slide-in (desktop) | 260ms | ease-out | from `translateX(-12px)` + opacity |
| Detail **full-screen** (mobile) | 200ms | ease-out | fade |
| Modal (auth) | 240ms | ease-out | from `scale(.96) translateY(8px)` — **center origin** |
| Drawer (admin review) | 260ms | ease-out | from `translateX(30px)` |
| Bottom sheet height change | 300ms | ease-out (→ ease-drawer) | |
| Toast in | 300ms | ease-out | from `translateY(14px)` |
| Marker select (size/halo) | 180ms | ease-marker | |
| Success check pop | 400ms | ease-out | rare/first-time → delight OK |
| Admin bar fill | 500ms | ease-out | data viz, longer is fine |

## What animates, and why (the decision framework)

- **Press feedback** (buttons, chips, cards, markers): yes — confirms the tap. Sub-160ms.
- **Panel / sheet / drawer open-close**: yes — prevents a jarring spatial jump and preserves the map↔detail relationship.
- **Marker selection**: yes — ties the clicked pin to the opened card (spatial continuity, the core of a map UI).
- **Toast**: yes — a transient state change needs to announce itself.
- **Success screen**: yes — rare, first-time, motivating.
- **Filtering the list/map**: keep it near-instant. A subtle stagger (≤60ms) on rail rows is allowed; never block interaction.
- **Do NOT animate**: nothing here is keyboard-repeated, but if a command palette / keyboard shortcut is added later, it must **not** animate.

## Production refinements (Emil review of the prototype)

| Before (prototype) | After (production) | Why |
|---|---|---|
| Cluster & directions popovers use default `transform-origin: center` | Set origin to the trigger edge (top-center, since they open below the pin/button) | Popovers should scale **from** their anchor, not the middle |
| Auth modal scales from center | Keep center | Correct — modals are not anchored to a trigger |
| Bottom sheet snaps between heights via CSS height transition | Make it **drag-interactive** with a spring + velocity dismissal (`v > 0.11`) on mobile | A sheet you can only tap feels less alive; momentum + interruptibility is the point |
| Marker `saved` pip is a heart | Swap to a bookmark pip | Save-metaphor consistency (doc 07) |
| Filtering re-renders instantly | Add ≤60ms stagger on rail rows entering | Cascading reveal reads as intentional; keep it decorative, never blocking |
| Selected-marker → card link is visual only | On select, also gently recenter the map toward the pin (short ease-in-out) | Reinforces "this pin = this card" |
| `transition` on a few rules animates multiple props | Name `transform, opacity` explicitly | Cheaper, no surprise layout animation |

## Hardware & performance
- Animate `transform`/`opacity` only; never `top/left/width/height`.
- For drag (mobile sheet) use Motion's `useMotionValue`/`useSpring`, **not** `useState` per frame.
- CSS transitions (interruptible) for hover/press/toasts; springs for drag; avoid keyframes for rapidly-retriggered elements.
- `will-change: transform` only on elements that actually move.

## Reduced motion (mandatory)
The prototype ships:
```css
@media (prefers-reduced-motion: reduce){
  * { animation-duration:.01ms !important; transition-duration:.05ms !important; }
}
```
Keep, but refine in production: preserve **opacity/colour** transitions (they aid comprehension) and drop only **movement** (slide/scale/parallax/marker recenter). Sheet, panel, and drawer should appear instantly rather than slide.
