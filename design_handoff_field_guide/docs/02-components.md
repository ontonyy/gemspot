# 02 · Component Spec & State Inventory

Maps each prototype component to a production React component, lists its props/data, and — most importantly — the **states it must handle**. The prototype implements the happy path plus the critical empty/permission/pending states; this doc is the checklist so none are dropped in the rebuild.

Suggested structure (FSD-ish, per the brief): `entities/`, `features/`, `widgets/`, `shared/ui/`, `pages/`.

---

## Component inventory

| Prototype (`lib/…`) | Production component | Layer | Key props |
|---------------------|----------------------|-------|-----------|
| `Logo` | `<Logo>` | shared/ui | `size`, `onClick` |
| `TopBar` | `<AppHeader>` | widgets | derives from auth + route |
| `MobileNav` | `<MobileTabBar>` | widgets | active route, saved count |
| `UserMenu` | `<UserMenu>` | features/auth | `user` |
| `FilterBar` / chips | `<CategoryFilter>` | features/explore | `categories`, `active`, `onChange` |
| `SpotCard` (rail) | `<SpotListItem>` | entities/place | `place`, `onSelect`, `saved` |
| `SpotCard` (featured) | `<SpotCardLarge>` | entities/place | `place` |
| `WebMap` | `<SpotMap>` | widgets/map | `places`, `selectedId`, `onSelect`, `pinMode` |
| marker / cluster | `<SpotMarker>` / `<ClusterMarker>` | entities/place | `place` / `members`, `state` |
| `SpotDetail` | `<SpotDetail>` (panel + page variants) | features/place-detail | `placeId`, `variant` |
| `LoginModal` | `<AuthDialog>` | features/auth | `open`, `onSuccess` |
| `LocationPrompt` | `<LocationPermission>` | features/geo | `onAllow/onDeny` |
| `EmptyFilter` | `<EmptyState kind="filter">` | shared/ui | `category` |
| `Saved` | `<SavedPage>` | pages | — |
| `AddSpot` | `<AddSpotFlow>` | features/submission | stepper state |
| `Admin` + drawer | `<AdminModeration>` | pages/admin | role-gated |
| `Toaster` | `<Toaster>` | shared/ui | global |
| `Photo` | `<PlacePhoto>` | shared/ui | `src`, `category` (fallback tint) |

---

## State matrix (MVP-required, not optional)

### Map (`<SpotMap>`)
- **loading** — skeleton/blur over map while tiles + places load.
- **ready** — markers + clusters.
- **empty** (filter yields nothing) — map stays, rail shows `EmptyState`.
- **error** — tiles fail / offline → retry affordance, keep last good view.
- **geo states** — see Location below.
- Clustering at city zoom; de-cluster on zoom-in.

### Location permission (`<LocationPermission>`)
- **unasked** → prompt (prototype shows this on first Explore visit).
- **granted** → show "my location" dot, distance sort active.
- **denied** → hide dot, sort falls back to saves/curation, show a subtle "enable location" affordance.
- **unavailable / out-of-region** (user not in Tallinn) → city-default view + a note. (City is Tallinn-only at launch.)

### Spot list / rail
- **loading** → 4–6 row skeletons matching `SpotListItem` shape (not a spinner).
- **populated** → sorted by distance (granted) or curation (denied).
- **empty (filter)** → `EmptyState` with "widen area" + "add a {category} spot".
- **empty (search)** → no-match copy + clear.

### Spot detail (`<SpotDetail>`)
- **loading** → hero skeleton + text lines.
- **loaded** → hero photos, category, name, contributor + "Approved" badge, note, quick facts, photo strip, Save + Directions.
- **photo load error** → fall back to category-tint `PlacePhoto`.
- **reported/removed** → if a place got archived, show "no longer available".
- Two render variants: **panel** (in-explore, has its own URL `/spot/:id`) and **full page** (cold load / mobile).
- **Directions** opens a provider menu → Apple Maps / Google Maps deep link (handoff, not in-app routing).

### Saved (`<SavedPage>`)
- **signed out** → auth gate (prototype shows this).
- **empty** → "Nothing saved yet" + Explore CTA.
- **populated** → same split (rail + map of saved only); inline bookmark removes with undo toast.

### Add-a-spot (`<AddSpotFlow>`)
- **signed out** → auth gate ("a local reviewer checks every spot").
- **Step 1 Location** — click map to drop/drag pin OR use current location; **Next disabled until a pin exists**.
- **Step 2 Category** — single select; required.
- **Step 3 Details** — name (required), note, 1–3 photos (upload progress + fail/retry).
- **Step 4 Review** — summary + moderation notice.
- **submitting** → button busy state.
- **submit error** → inline retry.
- **success** → "Sent for review / **Pending review**" confirmation (not "live now").

### Auth (`<AuthDialog>`)
- social (Google/Facebook/Instagram) + email login/register.
- **error** (bad credentials) inline. (Demo: `admin`/`admin` → admin role.)
- gates queue the original action and resume it on success (prototype: `requireAuth` → `pendingAction`).

### Admin moderation (`<AdminModeration>`)
- **not admin** → access-denied gate.
- queue table → review drawer → approve/reject → row leaves queue + toast.
- **queue empty** state.
- duplicate-suspicion flag surfaced in row + drawer.

---

## Form rules (taste skill)
- Label **above** input. Helper/optional hint inline with label. Error **below**, in danger colour.
- No placeholder-as-label. Placeholders are examples only.
- Focus = accent border + 3px 12% accent ring. All inputs ≥44px tall (touch).
- Buttons: text on one line; primary label ≤3 words; verify contrast (white text only on accent/dark).

## Accessibility checklist
- Marker contrast over every map surface (the white ring guarantees it).
- All gesture actions (sheet expand, marker select, save) have a visible control alternative.
- Keyboard: focusable markers + list rows, visible focus rings, Esc closes panel/modal/drawer.
- Tap targets ≥44px. Hover effects gated behind `(hover:hover)`.
