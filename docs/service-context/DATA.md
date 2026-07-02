# Data

PostgreSQL. Liquibase owns DDL (`api/src/main/resources/db/changelog`); Hibernate runs in
`validate` mode. `globally_quoted_identifiers: true` — columns are case-sensitive quoted
identifiers (Prisma-legacy). Entities in `api/src/main/java/ee/gemspot/api/domain`,
repositories in `.../repository`.

<!-- service-context:auto:start -->

## Entities → tables

| Entity | Table | Notes |
|--------|-------|-------|
| User | `users` | email unique; passwordHash nullable (OAuth-only); provider/providerId; role enum (CLIENT/ADMIN) |
| Profile | `profiles` | userId unique FK; name, avatarUrl |
| Category | `categories` | id app-assigned string; slug unique; label, cssvar, sort |
| Place | `places` | id app-assigned string ("01".."10"); slug unique; lat/lng; status enum (ACTIVE/INACTIVE/DRAFT); savesCount/viewsCount/sharesCount; tags text[]; links jsonb |
| PlacePhoto | `place_photos` | placeId FK ON CASCADE; url, sort |
| PlaceCategory | `place_categories` | placeId FK, categoryId FK, primary bool |
| SavedPlace | `saved_places` | userId FK, placeId FK |
| Submission | `submissions` | userId nullable FK ON SET NULL; categoryId, lat/lng, note, photoCount; status enum (PENDING/APPROVED/REJECTED) |
| SubmissionPhoto | `submission_photos` | submissionId FK ON CASCADE; url, sort |
| Report | `reports` | userId/placeId nullable FK ON SET NULL; placeSlug/placeName denorm; reason enum (CLOSED/WRONG_LOCATION/NOT_FREE/OTHER); status enum (OPEN/RESOLVED/DISMISSED) |
| Event | `events` | name (indexed), props jsonb nullable, placeId nullable |
| RefreshToken | `refresh_tokens` | jti PK; user_id, family_id, used bool, expires_at — refresh-reuse detection |
| EmailChangeToken | `email_change_tokens` | token PK (UUID, secret); user_id, new_email, used, expires_at |

## Repositories

13 Spring Data JPA repositories in `repository/`: User, Profile, Place, PlacePhoto,
PlaceCategory, SavedPlace, Submission, SubmissionPhoto, Report, RefreshToken,
EmailChangeToken, Category, Event.

## Migrations (Liquibase)

- `db/changelog/0001-init.xml` — enums (UserRole, PlaceStatus, SubmissionStatus,
  ReportStatus, ReportReason) + core tables.
- `db/changelog/0002-refresh-tokens.xml` — refresh_tokens (reuse detection).
- `db/changelog/0003-email-change-tokens.xml` — verified email-change flow.
- Master: `db/changelog/db.changelog-master.xml`.

## Connection topology

Runtime uses Supabase transaction pooler at `:6543` (`prepareThreshold=0`); Liquibase
migrations connect to a separate direct DB URL (`:5432`). See [CONFIG.md](CONFIG.md),
[RUNBOOK.md](RUNBOOK.md).

**Confidence**: HIGH (entities/repositories/changelogs grep-verified at `aad27f1`).

<!-- service-context:auto:end -->
