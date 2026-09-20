# 7. Clerk owns identity; roles and profiles stay in our database

Date: 2026-09-20

## Status

Accepted. Not yet implemented.

Supersedes [ADR 0002](0002-keep-custom-jwt-over-supabase-auth.md) (keep the custom JWT scheme)
and [ADR 0006](0006-refresh-token-in-httponly-cookie.md) (refresh token in an HttpOnly cookie).
0006 merged in `8afe993` hours before this decision and its mechanism is deleted by the work
this ADR authorises; its reasoning about where a durable credential may live still stands and is
the reason this ADR was even considered.

## Context

ADR 0002 ported a hand-rolled JWT scheme 1:1 into Spring Security, scoped explicitly to "in this
migration". That scheme is now ~938 lines we maintain: `AuthService` 538, `AuthController` 119,
`JwtService` 111, `SecurityConfig` 109, `JwtAuthFilter` 61 — plus `refresh_tokens` and
`email_change_tokens` tables, refresh rotation with family reuse detection, an email-change token
flow, and a still-open revoke-ordering race in that rotation.

Three facts made the trade different from the last time it was weighed:

- **`users` is empty.** No import, no password-hash migration, and the one thing our research
  could not verify — whether Clerk documents importing existing Google OAuth identities — never
  arises. The migration risk that would normally dominate this decision is zero.
- **Clerk has an official Java SDK.** `com.clerk:backend-api` v6.1.0 (2026-09-14, JDK 11+),
  carrying a JWKS verification helper. There is no official Spring Boot starter and Clerk's
  manual-verification docs carry no Java sample, so the filter is ours to write — but it is
  JWKS verification, not a protocol we invent.
- **It is free at our scale.** 50,000 monthly retained users on the free tier. MFA, SAML and
  removing Clerk branding are Pro ($25/mo) and we accept the badge for now.

## Decision

**Clerk is the identity provider. Our database keeps everything else.**

- **Session verification**: Clerk's short-lived session token is verified against JWKS in a
  Spring filter. Cross-origin, Clerk passes it as an `Authorization: Bearer` header from
  `useAuth().getToken()`, not a cookie.
- **Identity mapping**: `provider_identity(provider, subject, profile_id)` is the *only* table
  that knows Clerk exists. `profile` holds role and application data. One unique constraint on
  `(provider, subject)`.
- **Authorization stays ours.** A `CallerContext` is resolved once per request from the verified
  subject and passed to repository methods as a **required parameter**, so a query missing the
  subject predicate does not compile. Authorization failure is raised by the resolver as
  `ForbiddenException`, not returned by each handler.
- **Profile creation is lazy**, in the auth filter, inside one transaction; the `user.created`
  webhook is an idempotent warm-up, never the path of record.
- **Profile fields are denormalised** — email, display name, avatar — kept current by the
  `user.updated` webhook.
- **`user.deleted` anonymises**: the `provider_identity` row goes, the `profile` is kept with a
  `deleted_at` stamp and identifying fields nulled. Authored spots survive.
- **Admin seeding**: on `user.created` only, an email match against `ADMIN_EMAIL` sets role
  ADMIN. Never on `user.updated`.
- **Rip-out is one PR.** No coexistence flag, no Clerk-for-new-signups-only.
- **Frontend uses Clerk's prebuilt components** (`@clerk/react`, current name; `@clerk/clerk-react`
  is the legacy Core-2 package).

## Consequences

- **A vendor sits in the login path.** If Clerk is down, nobody signs in. Accepted: the
  alternative is 938 lines of our own auth in the same path, which has its own defect rate — the
  open revoke-ordering race is an example, and it dies with this decision.
- **`provider_identity` is the whole anti-lock-in story, and it is only free today.** Building it
  now costs one join; retrofitting it after every query has been written against a
  `clerk_user_id` column costs a refactor. Users and their hashes are exportable (dashboard CSV
  since 2024-10-23, `GetUserList` otherwise), so the lock-in that remains is in the session and
  authorization model — which is exactly what this ADR keeps in our database.
- **The `user.updated` webhook is load-bearing, not optional.** Without it the moderation queue
  and submission views must either call Clerk per row — re-creating the N+1 that plan 023 removed
  — or can name only the logged-in user.
- **Roles in our DB, not Clerk `publicMetadata`**, was chosen so "who are my admins" stays a SQL
  question and the authorization model survives a provider swap. Cost: one join per request and a
  profile row that must exist, which lazy creation guarantees.
- **The origin-unification work ADR 0006 needed is now optional.** Clerk cross-origin uses Bearer
  tokens, so a Firebase `/api/**` rewrite buys only the removal of a CORS preflight. It is
  demoted to a nice-to-have; fixing it to make 0006's cookie work would be config effort spent
  repairing a code path this ADR deletes.
- **Google users re-consent once** — no one is affected today, and this consequence expires the
  moment a real user exists. It is recorded because it becomes a migration blocker if this
  decision is revisited later with a populated `users` table.
- **`SameSite`/CSRF reasoning from ADR 0006 does not transfer.** A Bearer header is not
  CSRF-reachable, so the Origin allowlist guard 0006 added has no successor and needs none.

## Alternatives considered

- **Keep the custom scheme and merge plan 032** (the status quo ante). Zero vendor, zero
  migration, the cookie work already written and tested. Rejected because it keeps ~938 lines of
  auth — including refresh rotation and reuse detection — as our maintenance burden for a project
  with one maintainer, and because the durable credential stays inside our own origin.
  **This rejection is scoped to `users` being empty.** With real users carrying Google
  identities, the unverified social-identity import path would make this the stronger option
  again.
- **Supabase Auth.** We are already on Supabase Postgres and its users would live in our
  database, which answers the lock-in concern more directly than Clerk does. Rejected on the
  weakest prebuilt UI and organisation story of the three, and because ADR 0002 rejected it once
  already on grounds that still hold.
- **Auth0** — better documented for Spring Boot resource servers than Clerk, and rejected only on
  price and enterprise shape at this project's size. Revisit if Clerk's Java path proves thin.
- **Keycloak self-hosted** — zero vendor cost and the best Spring Security fit, rejected because
  operating it on Cloud Run is a worse burden than the auth code it replaces.
- **Roles in Clerk `publicMetadata`** — one fewer join and no local identity table, rejected
  because it makes the authorization model a vendor artifact.
- **Coexisting auth paths behind a flag** — rejected: it exists to protect live users, of which
  there are none, and two notions of "who is the caller" through `SecurityConfig` is where
  authorization bugs live.
