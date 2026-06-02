# 07 · Locked UX Decisions

These decisions came out of the UX audit and your answers, and are **baked into the prototype**. They look like small details but each fixes a real usability or scope risk. Don't silently revert them during the rebuild — if you change one, change it on purpose.

---

### 1. No ratings / stars in MVP
Ratings are post-MVP (they depend on reviews, which you scoped to a later version). Social proof is **save count + distance + "Approved" badge**. There is no `rating` field in the data model. → *Removes a fake-precision element and a whole reviews subsystem from MVP.*

### 2. One save metaphor: bookmark, everywhere
No hearts, no separate "like". A single bookmark control on cards, detail, and markers; it pairs with the "Saved" destination. → *The original mixed heart + bookmark, which made "what's saved?" ambiguous.*

### 3. One filter system: category chips + "All"
Category chips are the only filter for MVP, with a leading **All** chip to reset. The separate "sliders/advanced filters" button is deferred to v2. → *The original had two competing filter systems.*

### 4. Marker clustering is required, not optional
At city zoom, nearby pins cluster into a count pill; de-cluster / open list on interaction. → *Without it, Old Town pins (multiple scenic spots) pile into an unreadable stack — the #1 map risk.*

### 5. Add-a-spot is a linear 4-step flow with map-click pin
Location → Category → Details → Review, one concern per step. Pin is placed by **clicking the map** (not "drag the whole map under a fixed pin"). Next is disabled until the step is valid. → *The original showed two steps active at once and had no photo step or validation.*

### 6. Submissions go to PENDING, never instantly live
The success screen says "Sent for review / Pending review" and explains a local reviewer checks it. Approval happens in the admin moderation queue. → *Matches your moderation model; sets correct expectations and protects content quality.*

### 7. Directions hand off to Apple / Google Maps
The Directions button opens a provider menu with deep links — GemSpot does **not** build in-app turn-by-turn navigation. → *Per your answer; keeps GemSpot a discovery layer, not a nav app.*

### 8. Viewing is public; only actions require login
Browse, filter, open spots, and per-spot pages are all public and SEO-indexable. Login is required only for **save, add, /saved, /admin**. Auth uses social (Google/Facebook/Instagram) + email; gated actions queue and resume after login. → *Public viewing is the growth/SEO lever.*

### 9. Saved is one flat list (no collections in MVP)
A single distance-sorted list, shown as a filtered map view on desktop, with inline remove. Collections/guides are deferred (schema reserved). → *Per your answer.*

### 10. Distance is shown and is the default sort
Cards show distance; the product sells proximity, so distance is surfaced, not implied. Falls back to curation when location is denied. → *The original sold "nearby" but never displayed distance.*

### 11. Critical states are MVP scope, not polish
Location permission (+ denied / out-of-region), empty filter, empty saved, search no-match, submit→pending, and report-sent all exist as designed states. → *For a map + UGC product these states ARE the product.*

### 12. Admin is a separate desktop, utilitarian surface
Brand-connected but data-first (sidebar + tables + review drawer), not the playful consumer UI. Role-gated. Moderation is a desktop job. → *Per the design brief.*

### 13. Tallinn only at launch
City is fixed to Tallinn; "out of region" is a real designed state, and "bring GemSpot to your city" is a waitlist surface, not a feature. → *Per your answer.*

---

**If product priorities change**, the most likely reversals to discuss explicitly: turning on ratings (needs reviews + moderation), adding collections (needs the reserved schema + a real IA decision), and enabling the advanced filter panel. Each is a deliberate scope expansion, not a default.
