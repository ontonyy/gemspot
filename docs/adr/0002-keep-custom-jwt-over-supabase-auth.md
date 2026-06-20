# 2. Keep custom JWT auth instead of Supabase Auth

Date: 2026-06-13

## Status

Accepted

## Context

The migration (ADR 0001) moves data and storage onto Supabase. Supabase ships a managed authentication service (GoTrue): hosted login, refresh-token rotation with reuse detection, server-side session revocation, OAuth providers, password reset, email verification, and auth-endpoint rate limiting. Adopting it would outsource auth security maintenance.

The existing auth is a custom stateless dual-token JWT scheme (JJWT-equivalent): access + refresh tokens, bcrypt password hashing, client-side logout, Google OAuth via id-token verification. It is small and covered by tests. Its gaps versus a managed service: no token revocation, no refresh-reuse detection, no built-in password-reset/email-verify, no auth rate limiting.

The migration's core safety property is that the frontend changes only `VITE_API_URL`. Adopting Supabase Auth would break that: token shape, the refresh flow, `authStore.ts` persistence, the `/auth/*` endpoints, and Google OAuth wiring would all be rewritten on the frontend — turning a backend swap into a frontend rewrite — and would couple authentication to Supabase as a vendor.

## Decision

Port the custom JWT scheme 1:1 to Spring Security + JJWT. Do not adopt Supabase Auth in this migration. Close the single most important gap by adding refresh-token reuse detection in the custom scheme: a `refresh_tokens` table (jti, family) where replay of a used refresh token revokes the whole family. This requires no frontend change — tokens remain opaque JWTs and the refresh flow shape is unchanged (plan decision D4).

## Consequences

- The "frontend changes only `VITE_API_URL`" cutover promise is preserved; auth needs no frontend work.
- Auth code (already tested) stays owned in-house; no vendor lock to Supabase auth.
- Remaining managed-auth features are deliberately deferred: no server-side revocation beyond refresh-family kill, no built-in password reset / email verification / MFA, no auth-endpoint rate limiting. These are acceptable at current scale.
- Refresh is no longer fully stateless — it now reads/writes the `refresh_tokens` table (a rare operation), the cost of reuse detection.
- If revocation / password-reset / MFA become required, Supabase Auth (or another IdP) should be adopted as its own deliberate project, not bundled into a re-platform where it would break the contract.

## Alternatives considered

- **Adopt Supabase Auth now.** More secure and more featured out of the box. Rejected: breaks the contract-preservation safety net, forces a concurrent frontend rewrite, and adds vendor lock — wrong trade during a runtime/data/host migration.
- **Custom JWT, no reuse detection (spec as-written).** Simpler, but leaves a stolen 30-day refresh token fully usable. Rejected in favour of adding reuse detection (D4) at low cost and no frontend impact.
