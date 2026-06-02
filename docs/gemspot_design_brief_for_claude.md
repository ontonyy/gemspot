# GemSpot — design brief for Claude Design

## Overview

GemSpot is a local discovery product for Tallinn focused on finding city spots and activities on a map: table tennis tables, basketball courts, football fields, scenic viewpoints, and seasonal places such as sakura spots. The product should not feel like a generic map clone; it should feel lighter, more curated, more playful, and more human-centered than a standard navigation app while still remaining clear and fast to use.[cite:57][cite:65]

This document is intended for a design-oriented AI agent that should explore multiple visual and UX directions, compare them, and propose the strongest candidate design systems for an MVP that will later be implemented with React on the frontend and Spring/Java on the backend. The goal is not to jump straight into final UI screens, but to first evaluate the best product directions, interaction patterns, map styling approaches, and admin patterns that fit the GemSpot concept.[cite:57][cite:60][cite:65]

## Design goal

The design should make users feel that GemSpot helps them discover places rather than merely navigate to coordinates. The map remains the primary stage, but the experience should reduce cognitive load through simple filters, strong category signals, clear cards, and contextual details that appear at the right moment.[cite:57][cite:60][cite:67]

The design should balance three qualities:
- Playful and approachable.
- Cartographically clear and usable.
- Technically realistic for React + Java/Spring implementation.[cite:57][cite:65]

## Product constraints

The first version is an MVP for Tallinn only, with 3–5 categories and a limited but curated content set. That means the design should optimize for focus, quick discovery, and repeated everyday use rather than for a huge taxonomy, enterprise data density, or a complex social network experience.[cite:44][cite:53]

The product will likely be used often on mobile, so mobile-first interaction patterns are important. On map-heavy mobile experiences, bottom sheets, thumb-friendly actions, and keeping the map as the main stage are especially effective, but bottom sheets should remain contextual and should not replace full-page flows for long or complex tasks.[cite:61][cite:67]

## Core design principles

Claude Design should use the following principles when exploring directions:

1. The map is the primary canvas, not a background decoration.[cite:57][cite:67]
2. The first interaction should reveal value within seconds through visible categories or featured spots, not through heavy onboarding.[cite:60][cite:64]
3. Controls must be simple and visible; gestures can enhance the experience but should not be the only way to interact.[cite:61][cite:67]
4. Discovery should feel guided, not cluttered, using clear hierarchy, focused actions, and contextual detail panels.[cite:60][cite:64]
5. The interface should look custom and brandable, not like a default Google Maps wrapper with random colors.[cite:57][cite:62][cite:65]

## Design directions to explore

Claude Design should produce at least three visual directions before recommending one. Each direction should include mood, palette, typography logic, map style logic, UI density, and expected implementation complexity.

### Direction A — Playful city guide

This direction leans into a friendly, semi-cartoon city discovery aesthetic. The map is softened with simplified land, water, park, and road styles; category icons are slightly illustrated; cards feel approachable and warm. This direction is likely strong for consumer appeal and memorability, but it must avoid becoming childish or sacrificing legibility.[cite:57][cite:62][cite:65]

Recommended characteristics:
- Warm or fresh palette.
- Rounded shapes, but not overly bubbly.
- Custom illustrated category markers.
- Slightly elevated cards and bottom sheets.
- Friendly but modern typography.

Best use case: a consumer-facing GemSpot brand that wants to feel distinct from formal map products.

### Direction B — Premium editorial city companion

This direction treats GemSpot as a curated urban guide. The map is minimal and elegant, with restrained color, sophisticated typography, strong photography, and a feeling closer to a city magazine or boutique guide than to a sports utility app. This could work especially well if scenic spots, seasonal spots, and curated collections are central to the brand.[cite:57][cite:60]

Recommended characteristics:
- Neutral base with one accent color.
- Larger imagery in cards and collection pages.
- Elegant typography and generous whitespace.
- Subtle map style with low-noise roads and landmarks.
- Fewer but more premium-feeling UI elements.

Best use case: a discovery product led by curation, aesthetics, and sharing.

### Direction C — Clean geo-product with playful accents

This direction is likely the best middle ground for MVP. The product keeps the clarity of a modern geo app, but adds selective brand personality through markers, accents, illustrations, and category chips. It avoids both sterile enterprise GIS visuals and overly decorative cartoon styling.[cite:57][cite:65]

Recommended characteristics:
- Clean neutral map style.
- Strong, differentiated category chips.
- Compact but readable cards.
- Minimal motion with clear transitions.
- Admin panel visually related but more utilitarian.

Best use case: fast MVP implementation with room to evolve into a stronger brand later.

## Recommended default direction

The strongest initial candidate is Direction C: clean geo-product with playful accents. It best supports usability, mobile clarity, MVP speed, and future growth while still allowing GemSpot to feel branded and distinct.[cite:57][cite:60][cite:67]

The main reason is that a map-based product can become confusing if the visual style is too decorative. A restrained base map with expressive category markers, cards, illustrations, and curated content blocks gives enough personality without harming the primary task flow.[cite:57][cite:65]

## Map experience guidance

The map should be custom styled rather than left fully default. Designers working with map systems such as Mapbox typically customize layers, colors, labels, and iconography so the product feels cohesive and so important overlays remain readable.[cite:62][cite:65]

### What the map should emphasize
- Parks and green areas.
- Water and coastline.
- Neighborhood identity.
- Walkable urban texture.
- Category markers that are immediately distinguishable.[cite:57][cite:62]

### What the map should de-emphasize
- Excessively detailed roads when they are not needed.
- Noisy business labels.
- Too many default POIs.
- Dense visual clutter under custom markers.[cite:57][cite:65]

### Marker system
The marker system is one of the most important branded components. Claude Design should explore a marker family where every category is recognizable both by color and by icon shape. Markers should support at least three states: default, hover/selected, and saved/favorited.[cite:57][cite:65]

Possible marker logic:
- Table tennis: paddle/ping-pong cue.
- Basketball: hoop or ball cue.
- Football: pitch/ball cue.
- Scenic viewpoint: eye/sun/horizon cue.
- Sakura/seasonal: blossom cue.

The icons should be simple enough to render clearly at small sizes and to scale across web and mobile contexts.[cite:65][cite:67]

## Mobile UX patterns

Mobile design should treat the map as the stage and use bottom sheets for contextual details, short filters, and place previews. According to NN/g, bottom sheets work well for temporary contextual information, but should not be used as a replacement for long, complex flows; therefore place preview works well in a sheet, while full submission flows and richer content may require dedicated screens.[cite:61]

Claude Design should propose a mobile interaction model with:
- Bottom navigation or a very small set of top-level destinations.
- A collapsible bottom sheet for place results and place previews.
- Clear close and back behavior.
- Thumb-friendly actions for save, share, and route open.[cite:61][cite:67]

The main mobile states should include:
- Map default state.
- Category-selected state.
- Search or filter state.
- Place preview state.
- Expanded place details state.
- Add place flow.[cite:61][cite:67]

## Desktop UX patterns

Desktop can support a split-view approach: map on one side, results/details panel on the other. This pattern is common in map-heavy products because it preserves context while allowing deeper inspection of content.[cite:57][cite:74]

Claude Design should consider these desktop layouts:
- 60/40 map plus side panel.
- 70/30 map plus details drawer.
- Full map with floating panels only for simpler views.

For GemSpot, the likely best desktop default is a persistent left or right panel with category chips, search, and result cards, while the map occupies most of the viewport.[cite:57][cite:74]

## Information architecture

Claude Design should evaluate whether GemSpot works better as a map-first product or as a hybrid map + collections product. For MVP, the recommended IA is map-first, with collections as supporting discovery surfaces rather than separate product pillars.[cite:57][cite:60]

Suggested top-level areas:
- Explore map.
- Saved spots.
- Add a spot.
- Collections or guides.
- Profile.

Admin should remain separate from the consumer navigation structure.[cite:67]

## Key screen recommendations

The design exploration should include at minimum:
- Home / explore map.
- Category filtering state.
- Place preview card.
- Full place detail page or expanded panel.
- Add spot flow.
- Saved spots view.
- Collection / curated guide page.
- Light admin dashboard overview.
- Moderation queue.
- Place management page.[cite:57][cite:61][cite:66]

## Card design guidance

Place cards should communicate relevance in a few seconds. The hierarchy should generally be image first or icon first, then name, category, key tags, and primary action buttons. Cards should not become mini-webpages; long descriptions should remain secondary.[cite:57][cite:60]

Recommended card fields:
- Hero image or visual thumbnail.
- Name.
- Category.
- Neighborhood.
- 2–3 utility tags.
- Save/share buttons.
- “Open route” or “View details” action.
- Optional freshness indicator such as “verified recently”.

Claude Design should compare image-heavy cards versus utility-first compact cards and recommend which is better for each context.[cite:57][cite:60]

## Submission flow design

The “Add a spot” flow should feel lightweight and motivating. Users should not face a huge form all at once. Feature-discovery and progressive prompting patterns suggest that the interface should reveal only the next relevant step rather than every field from the start.[cite:64]

A strong lightweight flow could be:
1. Pick location on map.
2. Choose category.
3. Add title and short note.
4. Upload 1–3 photos.
5. Add optional tags.
6. Submit for review.[cite:64]

Claude Design should decide whether this flow is best as a stepper, modal sequence, or dedicated page flow. A dedicated flow is likely better than squeezing too much into a bottom sheet.[cite:61][cite:64]

## Admin design guidance

The admin panel should not copy the playful consumer interface too literally. It should feel connected to the brand, but more efficient, data-first, and operational. Good admin design centers on hierarchy, clarity, grouped controls, and decision speed rather than decorative personality.[cite:60][cite:66]

### Admin areas to design
- Overview dashboard.
- Places list.
- Place detail editor.
- Moderation queue.
- User activity overview.
- Analytics dashboards.[cite:66]

### Admin KPIs to surface
- New users.
- Pending submissions.
- Top categories.
- Top places by opens.
- Top places by saves.
- Top places by shares.
- Reports by reason.
- Approval rate.
- Active contributors.[cite:48][cite:54][cite:66]

### Admin layout recommendation
A web admin dashboard is more appropriate than a mobile admin experience for the primary moderation workflow. Admin interfaces generally benefit from wider layouts, table/list views, filters, and side-by-side detail inspection rather than mobile-first stacking.[cite:63][cite:66]

Recommended admin layout:
- Left sidebar navigation.
- Main content area with summary cards and tables.
- Filter toolbar.
- Detail drawer or detail page.
- Clear moderation actions at the top of review screens.[cite:66]

## Motion and interaction

Motion should help orientation rather than decorate the UI. In map products, transitions matter because users can easily lose spatial context; panels, cards, and marker selections should animate in ways that preserve continuity.[cite:57][cite:60]

Recommended motion principles:
- Use smooth panel expansion and collapse.
- Animate marker state changes subtly.
- Keep timing short and functional.
- Avoid excessive floating or bouncing effects.
- Preserve visible connection between selected marker and opened card.[cite:57][cite:61]

## Accessibility and usability

Map interfaces require special care for accessibility. Designers should ensure sufficient contrast, keyboard-navigable controls where relevant, visible focus states, readable map overlays, and non-gesture alternatives for key actions.[cite:65][cite:67]

Claude Design should explicitly evaluate:
- Contrast of map markers over all map surfaces.
- Label readability on mobile outdoors.
- Large enough tap targets.
- Clear back/close behavior.
- Whether every gesture interaction also has a visible control alternative.[cite:61][cite:65][cite:67]

## Design system expectations

Claude Design should produce a lightweight design system proposal that is realistic for a React application and later reusable across both the consumer product and the admin panel. The system should include tokens, component states, marker logic, icon logic, spacing rules, and responsive behavior.[cite:57][cite:65]

Required design system outputs:
- Color palette options.
- Typography pairing options.
- Category marker system.
- Button, chip, card, and bottom sheet styles.
- Admin data table and moderation components.
- Light and dark mode recommendation, even if dark mode is postponed from first release.[cite:57][cite:65][cite:66]

## Technical feasibility for React + Spring/Java

The design should remain implementation-aware. Designers should avoid interactions that require highly custom map rendering unless they create clear product value, and they should think in reusable frontend components that map well to React architecture and API-driven content from a Spring backend.[cite:65]

Design proposals should indicate where the frontend likely needs:
- Map provider styling and custom markers.
- Reusable card and sheet components.
- Event-driven UI states.
- Admin table and moderation components.
- Clear API-backed content boundaries for places, categories, users, and analytics.[cite:65][cite:66]

## What Claude Design should deliver

The next design exploration should ideally deliver the following:

### 1. Three concept directions
Each with:
- mood description;
- palette;
- typography;
- marker style;
- map style logic;
- card style;
- target user feeling;
- complexity and tradeoffs.[cite:57][cite:62][cite:65]

### 2. Recommended direction
A short argument for which direction best balances:
- consumer appeal;
- usability;
- brand distinctiveness;
- implementation realism for MVP.[cite:57][cite:60]

### 3. Screen set
Low- to mid-fidelity recommendations for:
- mobile explore flow;
- desktop map flow;
- add spot flow;
- saved spots;
- admin dashboard;
- moderation queue.[cite:61][cite:66][cite:67]

### 4. Component system draft
At minimum:
- markers;
- category chips;
- place cards;
- bottom sheets;
- modal or stepper patterns;
- admin tables;
- moderation action bars.[cite:57][cite:61][cite:66]

### 5. Implementation notes
A short section describing which parts are easy, medium, and hard to implement in a React frontend with a Java/Spring backend.[cite:65][cite:66]

## Final recommendation

The design exploration should begin from the assumption that GemSpot is not a heavy GIS tool and not a generic travel app. It is a local city discovery product with a map-first experience, a light community layer, and a curated visual identity. Therefore the best design starting point is likely a clean geo-product foundation with playful brand accents, mobile-first map behavior, contextual bottom sheets, and a more utilitarian but related admin system.[cite:57][cite:61][cite:66][cite:67]

The design work should focus first on marker language, map styling, card hierarchy, and explore flow, because these are the parts that most strongly define the product’s usability and uniqueness. Once that direction is chosen, React componentization and Spring-backed data modeling will become much easier to structure consistently.[cite:57][cite:65]
