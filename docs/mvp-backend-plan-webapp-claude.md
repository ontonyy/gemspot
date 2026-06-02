# MVP backend implementation brief for Claude (web app, React + Node + PostgreSQL)

You are an AI engineer (Claude Code or similar) responsible for:
- reviewing this MVP backend plan;
- ensuring it is consistent and realistic;
- then generating a clean, implementation-ready backend in TypeScript.

Do NOT redesign the product. Respect the MVP scope and architecture.

---

## 1. Product and stack

The product is a **web app** (desktop + mobile web) with a map-oriented UI.

MVP flows:
- browse map
- filter categories
- open place details
- save items
- add a new place

Tech stack for backend:
- Runtime: Node.js
- Language: TypeScript
- Framework: NestJS (preferred) or Express
- ORM: Prisma
- Database: PostgreSQL (managed on Render)
- Hosting: Render Web Service (backend) + Render PostgreSQL

Frontend:
- React + TypeScript web app, hosted on GitHub Pages, talking to the backend via HTTPS.

---

## 2. Domain modules to implement for MVP

You must implement at minimum:

- `auth` — registration, login, refresh, logout, current user info
- `users` — user profile
- `places` — entities shown on the map (places, locations, or specialists)
- `categories` — categories/tags used for filtering places
- `saved` — saved/favorited places

These modules must support the MVP flows:
- browse map (places + filters)
- filter categories
- open place details
- save/unsave places
- add a new place

---

## 3. Data model (PostgreSQL via Prisma)

You should design a minimal Prisma schema with these tables/entities:

- `users`
- `profiles`
- `places`
- `categories`
- `place_categories` (many-to-many between places and categories)
- `saved_places`
- optional: `tokens` or `sessions` for refresh tokens if needed

Suggested core fields:

- `users`: id, email, passwordHash, role, createdAt, updatedAt
- `profiles`: userId, name fields, avatar, etc.
- `places`: id, title, description, latitude, longitude, address, status, createdAt, updatedAt
- `categories`: id, slug, label
- `place_categories`: id, placeId, categoryId
- `saved_places`: id, userId, placeId, createdAt

Enums:
- `UserRole` (e.g. `client`, `admin`)
- `PlaceStatus` (e.g. `active`, `inactive`, `draft`, or similar if needed)

You should design the Prisma schema so that it is easy to extend later.

---

## 4. API endpoints (must-have for MVP)

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

Users:
- `GET   /users/me`
- `PATCH /users/me`

Places:
- `GET   /places` — list places with filters (by category, search, etc.)
- `GET   /places/:id` — place details
- `POST  /places` — create a new place (for the add-a-place flow)
- `PATCH /places/:id` — update a place (if needed in MVP)

Categories:
- `GET   /categories` — list categories for filters

Saved:
- `GET   /saved` — list saved places for current user
- `POST  /saved` — save a place
- `DELETE /saved/:placeId` — unsave a place

Health:
- `GET /health` — basic health check (for Render monitoring and manual tests)

You may propose slight adjustments (e.g. body formats) but must keep the general structure.

---

## 5. DTO contracts (frontend ↔ backend)

You must not expose raw DB models to the frontend. Define DTOs in a `contracts` layer.

At minimum, define:

- `CurrentUserDto`
- `PlaceCardDto`
- `PlaceDetailsDto`
- `CategoryDto`
- `SavedPlaceDto`

Example expectations:

- `CurrentUserDto`:
  - `id`, `email`, optional profile fields (name, avatar, etc.)

- `PlaceCardDto` (for lists and map side panels):
  - `id`, `title`, `shortDescription`, coordinates, main category, optional thumbnail, flags (saved, featured, etc.)

- `PlaceDetailsDto` (for details screen):
  - everything from `PlaceCardDto` plus full description, all categories, additional info (contacts, links, etc.)

- `CategoryDto`:
  - `id`, `slug`, `label`

- `SavedPlaceDto`:
  - `id`, `placeId`, embedded `PlaceCardDto`

DTOs are the stable contract that the React frontend relies on.

---

## 6. Architecture and folder structure

Use a layered structure (NestJS example):

```txt
backend/
  src/
    main.ts
    app.module.ts
    config/
    contracts/
      dto/
      enums/
    common/
      guards/
      interceptors/
      filters/
      decorators/
      errors/
    infra/
      prisma/
        prisma.module.ts
        prisma.service.ts
    domain/
      users/
      places/
      categories/
      saved/
    application/
      users/
      places/
      categories/
      saved/
    api/
      auth/
      users/
      places/
      categories/
      saved/
      health/
```

Rules:
- `api` layer: controllers only, mapping HTTP ↔ application use cases.
- `application`: use cases and business logic.
- `domain`: entities and domain rules.
- `infra`: Prisma and external services.
- `contracts`: DTOs and enums shared with frontend.

---

## 7. Hosting and integration (Render + GitHub Pages)

You must prepare the backend so that it can be deployed on Render as a Web Service and consumed by a React frontend on GitHub Pages.

Assumptions:
- Backend hosted as Render Web Service at `https://api.yourdomain.com`.
- PostgreSQL as a managed database on Render.
- Frontend hosted on GitHub Pages at `https://app.yourdomain.com`.

Backend requirements:
- Read `DATABASE_URL` from environment.
- Read `PORT` from environment and listen on that port.
- Support CORS for `https://app.yourdomain.com`.

Environment variables (Render):
- `DATABASE_URL=postgres://user:password@host:5432/dbname`
- `NODE_ENV=production`
- `PORT` (provided by Render)
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN=https://app.yourdomain.com`

Frontend configuration:
- use `VITE_API_URL` (or similar) pointing to `https://api.yourdomain.com`.

---

## 8. Your tasks as Claude

1. Validate the domain model and endpoints.
   - Are tables and relations sufficient for MVP flows?
   - Are there any obvious missing fields or relations?

2. Design the Prisma schema.
   - Implement the described entities and relations.
   - Generate an initial migration.

3. Scaffold the backend project.
   - Create the folder structure.
   - Set up NestJS (or Express) with TypeScript.
   - Integrate Prisma.

4. Implement core modules and endpoints.
   - `auth`, `users`, `places`, `categories`, `saved`, `health`.
   - Use DTOs and proper validation.

5. Implement JWT-based auth.
   - Registration, login, refresh, logout.
   - Protect endpoints that need authentication (e.g. `saved`, `POST /places`).

6. Add basic error handling and logging.
   - Return clear error responses for common failure cases.

7. Prepare for deployment.
   - Ensure config can be fully driven by environment variables.
   - Expose a `/health` endpoint.

8. Provide a short README section for developers.
   - How to run locally.
   - How to run migrations.
   - What env vars are required.

---

## 9. Expected output format

Your response should include:

1. A concise validation of the plan (what works, what you adjusted).
2. The final Prisma schema for MVP.
3. The project structure (folders/files) you will generate.
4. The list of modules and endpoints implemented.
5. The list of environment variables and their meaning.
6. A short local run guide (commands + env examples).
7. Any remaining design/requirements gaps that should be clarified before further development.

Be concrete and implementation-focused. Avoid generic advice.
