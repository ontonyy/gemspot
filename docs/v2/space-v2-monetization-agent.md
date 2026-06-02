# Space v2.0 Monetization and Reputation Spec

## Purpose
Define a v2.0 system for user reputation, premium subscription access, and curated hidden gem unlocks. This document is intended for implementation planning by an agent.

## Scope
- User points and reputation.
- Hidden gem content unlocking.
- Premium subscription tiers.
- Anti-abuse rules.
- Optional gamification extensions.

## Product Principles
- Reward quality contributions more than raw activity.
- Keep the core map product useful for free users.
- Use premium to improve discovery, not to fully lock content.
- Protect content quality with moderation and validation.

## Functional Requirements
### User Contributions
- Users can add new places.
- Approved contributions grant points.
- Points are granted only for valid or moderated contributions.
- Repeated or low-value actions should provide reduced rewards.

### Reputation System
- Track contribution score.
- Track trust score.
- Track discovery score.
- Track community score.
- Surface badges and ranks based on these values.

### Hidden Gems
- Admins create curated hidden gems.
- Hidden gems can be unlocked using points, daily rewards, or premium access.
- Hidden gems may be filtered by category, randomized across categories, or offered as themed collections.

### Subscription
- Free users receive limited hidden gem access.
- Premium users receive daily or weekly unlocks.
- Premium may include broader category access, higher unlock quotas, and priority access to new gems.
- Premium must not be the only path to meaningful product usage.

## Suggested Rules
- 1 approved place may grant 1 point as a baseline.
- Bonus points may be awarded for completeness, uniqueness, media, and confirmations.
- Points should only be finalized after moderation, duplicate checks, or trust validation.
- Daily caps should limit farming behavior.

## Abuse Prevention
- Detect duplicate submissions.
- Reject low-quality or spam content.
- Reduce repeated rewards for similar actions.
- Flag suspicious users for review.
- Keep premium benefits focused on convenience and enhanced discovery.

## Optional Features
- Daily streak rewards.
- Weekly missions.
- Category mastery progress.
- Seasonal rankings.
- Referral bonuses.
- Unlockable map layers.

## Implementation Notes
- This system should be treated as a separate v2.0 layer on top of the current map and places model.
- Data models should support multiple point sources and reward types.
- Access rules for hidden gems should be explicit and configurable.
- Subscription logic should be isolated from reputation logic.

## Open Questions
- Should points expire or accumulate forever?
- Should hidden gem unlocks be global or category-based?
- Should premium grant daily unlocks, a monthly quota, or both?
- Should reputation be visible publicly or partially hidden?
- Should subscriptions unlock all hidden gems or only a curated subset?

## Implementation Priority
1. Define point sources and moderation rules.
2. Define hidden gem access policies.
3. Add reputation fields to the data model.
4. Add subscription entitlements.
5. Add gamification only after the core system is stable.
