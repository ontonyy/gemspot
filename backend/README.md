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

Plus `auth` (register/login/refresh/logout/me), `saved` (list/add/remove/merge),
`uploads`, `events` (analytics ingest), and a role-gated `admin` module
(stats / submissions queue + approve-reject / places + status / reports / users).

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

## Tests

```bash
npm test          # jest — unit suite over services with a mocked Prisma
npm run test:watch
```

No database required: `test/prisma-mock.ts` stubs `PrismaService` (each model
method is a `jest.fn()`; `$transaction` runs the callback against the same mock).
Covers auth (register/login/refresh/me, bcrypt-never-plaintext), saved
(list/add/merge/remove), submissions (create PENDING, listMine), admin
moderation flips (approve PENDING→ACTIVE place, reject, place/report status,
404 paths), and the relative-time helper. CI-green with no Postgres.

## Env vars

| Var                  | Meaning                                              |
|----------------------|------------------------------------------------------|
| `DATABASE_URL`       | Postgres connection string                           |
| `PORT`               | Listen port (Render injects this; default 4000)      |
| `CORS_ORIGIN`        | Comma-separated allowed origins; unset = reflect all |
| `NODE_ENV`           | `development` / `production`                         |
| `JWT_SECRET`         | Access-token signing secret (long random in prod)    |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret (long random in prod)   |
| `JWT_ACCESS_TTL`     | Access token lifetime (default `15m`)                |
| `JWT_REFRESH_TTL`    | Refresh token lifetime (default `30d`)              |
| `ADMIN_EMAIL`        | Seeded admin login (default `admin@gemspot.ee`)     |
| `ADMIN_PASSWORD`     | Seeded admin password (set in prod; dev `admin1234`) |

## Deploy to Render

Config lives in `render.yaml` (repo root) — a Blueprint that provisions managed
Postgres + a Node web service.

1. Render Dashboard → **New → Blueprint** → select this repo. Render reads
   `render.yaml`, creates `gemspot-db` + `gemspot-api`.
2. Set the `ADMIN_PASSWORD` env var on the service (marked `sync: false`).
3. Build runs `npm ci --include=dev → prisma generate → prisma migrate deploy →
   db:seed → nest build` (migrate + seed are idempotent). Start = `node dist/main.js`.
   Health check = `/health`.
4. `JWT_SECRET` / `JWT_REFRESH_SECRET` are generated once by Render and stable.
   `CORS_ORIGIN` is pinned to `https://ontonyy.github.io`.
5. Once live, copy the API URL (e.g. `https://gemspot-api.onrender.com`) into the
   GitHub repo secret **`VITE_API_URL`**, then re-run the Pages deploy workflow —
   the frontend build flips its seam mock → real with no code change.

> Free-plan caveats: the web service sleeps after inactivity (cold starts ~30s),
> and the filesystem is ephemeral (uploaded photos under `uploads/` are lost on
> redeploy — move to object storage before relying on user photos).

## Frontend integration

Set `VITE_API_URL=http://localhost:4000` in `web/.env` (local) or the
`VITE_API_URL` GitHub secret (prod). The web app's `placesApi`/`authApi`/
`adminApi` pick the HTTP client when `VITE_API_URL` is set, else fall back to the
in-app mock — zero call-site changes.
