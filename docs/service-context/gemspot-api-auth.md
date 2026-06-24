# Service context — gemspot-api auth & account surface

Scope: the `/auth` HTTP surface, its persistence, and the mail dependency. Source of
truth is the code (`AuthController`, `AuthService`, `SecurityConfig`); this doc is the
fast orientation for that subsystem.

## HTTP endpoints (`/auth`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/register` | public | Email+password signup → token pair (201). |
| POST | `/auth/login` | public | Password login → token pair. |
| POST | `/auth/refresh` | public | Rotate refresh token (D4 reuse detection). |
| POST | `/auth/oauth/google` | public | Google ID-token sign-in / link. |
| POST | `/auth/logout` | public | Stateless parity no-op. |
| GET  | `/auth/me` | authed | Current user view (`AuthUserDto`). |
| PATCH| `/auth/me` | authed | Update profile name + avatarUrl only. |
| POST | `/auth/password` | authed | Set/change local password; revokes all sessions, re-mints acting device. |
| POST | `/auth/logout-all` | authed | Revoke all refresh families. |
| POST | `/auth/email/change-request` | authed | Re-auth, reject taken email, issue token, mail link to NEW address. |
| POST | `/auth/email/verify` | **public** | Consume token (the secret): swap email, revoke all sessions. |

`SecurityConfig` lists the authed `/auth/*` matchers BEFORE the `/auth/**` permitAll
line; `/auth/email/verify` is intentionally public (the token in the emailed link is
the bearer of authority — clicked on any device/session).

## DTO: `AuthUserDto`

`{id, email, name, role, avatarUrl, provider, createdAt, hasPassword,
pendingEmail, pendingExpiresAt, emailChangeStatus}`.
Email-change derived state computed in `AuthService.dtoFor` from the latest active
token: `emailChangeStatus` = `none | pending | expired`.

## Persistence

- `users`, `profiles` — Prisma-ported tables, **camelCase quoted** columns.
- `refresh_tokens` (changelog 0002) — net-new, snake_case columns; family model backs
  reuse detection + session revoke.
- `email_change_tokens` (changelog **0003**) — net-new, snake_case columns:
  `token` (PK, opaque secret in the verify link), `user_id` (FK→users CASCADE),
  `new_email`, `used`, `expires_at`, `created_at`. One active (unused) row per user,
  enforced in the service (`deleteByUserId` before issuing). TTL 24h.

Liquibase owns DDL (`ddl-auto: validate`); `globally_quoted_identifiers: true`.

## Dependencies

- `spring-boot-starter-mail` — SMTP for the email-change verification link.

## Mail flow (verified email change)

1. `POST /auth/email/change-request` → re-auth (current pw for local accounts;
   OAuth-only via session) → reject if `newEmail` taken → `email_change_tokens` row
   issued (prior rows cleared) → `MailService.sendEmailChangeVerification(newEmail, link)`.
2. Link = `<app.web-url>/#/account/verify-email?token=<token>` (HashRouter SPA).
3. `MailService` sends a `SimpleMailMessage` AND always logs the link at INFO; send
   failure is caught + warned (never propagated) so the request never 500s when SMTP
   is down. Dev = MailHog (`localhost:1025`, no auth).
4. `POST /auth/email/verify` → validate unused + unexpired + still-unique → swap
   `User.email`, mark token used, `SessionService.revokeAll` → user re-authenticates.

## Config (env)

`SMTP_HOST/PORT/USER/PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`, `MAIL_FROM`, `WEB_URL`.
Dev defaults boot without real SMTP. Prod must inject SMTP creds + `WEB_URL`.
