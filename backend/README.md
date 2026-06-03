# GemSpot backend

NestJS + Prisma + PostgreSQL. Serves the **existing frontend DTO contract**
(`web/src/shared/api/types.ts`) byte-identical to the mock `placesApi`, so the
web app can swap `mockPlacesApi` → `httpPlacesApi` with no call-site changes.

Layered: `api` (controllers) → `application` (use cases + mappers) → `infra`
(Prisma) → `contracts` (DTOs shared with the frontend). Schema is plan-faithful
(`docs/mvp-backend-plan-webapp-claude.md`): users/profiles/places/categories/
place_categories/place_photos/saved_places/submissions/submission_photos/reports.

## Endpoints (consumed by the frontend seam)

| Method | Path             | Returns                                  |
|--------|------------------|------------------------------------------|
| GET    | `/health`        | `{ status: 'ok' }`                       |
| GET    | `/places?cat=`   | `PlaceCardDto[]`                         |
| GET    | `/places/:slug`  | `PlaceDetailDto`                         |
| GET    | `/categories`    | `CategoryDto[]`                          |
| GET    | `/guides`        | `GuideDto[]`                             |
| GET    | `/guides/:id`    | `{ guide: GuideDto; spots: PlaceCardDto[] }` |
| POST   | `/submissions`   | `SubmissionDto`                          |
| POST   | `/reports`       | `ReportDto`                              |

> `auth` / `users` / `saved` tables exist in the schema but are not yet wired —
> the frontend seam consumes no auth in the MVP. Deferred to a later block.

## Local run

```bash
# 1. Postgres (Docker example)
docker run -d --name gemspot-pg \
  -e POSTGRES_USER=gemspot -e POSTGRES_PASSWORD=gemspot -e POSTGRES_DB=gemspot \
  -p 5433:5432 postgres:16-alpine

# 2. env
cp .env.example .env   # DATABASE_URL already points at the Docker DB above

# 3. install + schema + seed
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init   # or: npm run db:push
npm run db:seed

# 4. run
npm run start:dev        # http://localhost:4000
curl localhost:4000/health
curl localhost:4000/places | jq
```

## Env vars

| Var                  | Meaning                                              |
|----------------------|------------------------------------------------------|
| `DATABASE_URL`       | Postgres connection string                           |
| `PORT`               | Listen port (Render injects this; default 4000)      |
| `CORS_ORIGIN`        | Comma-separated allowed origins; unset = reflect all |
| `NODE_ENV`           | `development` / `production`                         |
| `JWT_ACCESS_SECRET`  | Reserved (auth not yet wired)                        |
| `JWT_REFRESH_SECRET` | Reserved (auth not yet wired)                        |

## Frontend integration

Set `VITE_API_URL=http://localhost:4000` in `web/.env`. The web app's
`placesApi.ts` picks `httpPlacesApi` when `VITE_API_URL` is set, else falls back
to `mockPlacesApi`.
