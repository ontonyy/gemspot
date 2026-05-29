# Claude implementation brief: MVP backend + React integration

This document is a direct implementation brief for building the MVP backend and React integration layer.

## Goal

Build a production-oriented MVP backend with clean modules, PostgreSQL from day one, typed API contracts, and React-ready DTO responses.

## Recommended stack

- Backend runtime: Node.js
- Language: TypeScript
- Framework: NestJS preferred, Express/Fastify acceptable if modularized
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT access + refresh tokens
- Validation: Zod or class-validator
- API docs: Swagger / OpenAPI
- File storage: S3-compatible storage
- Frontend: React + TypeScript

## Architecture decision

Use a **modular monolith**.

Do not start with:
- microservices
- event bus complexity
- CQRS
- websocket-first architecture
- advanced billing logic

## MVP modules

Required modules:
- auth
- users
- profiles
- specialists
- services
- availability
- bookings
- admin
- files
- notifications (basic abstraction only)

## Suggested backend folder structure

```txt
src/
  main.ts
  app.module.ts
  common/
    guards/
    decorators/
    interceptors/
    filters/
    dto/
    types/
    utils/
  config/
  prisma/
    prisma.module.ts
    prisma.service.ts
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.module.ts
      dto/
    users/
      users.controller.ts
      users.service.ts
      users.module.ts
      dto/
    specialists/
      specialists.controller.ts
      specialists.service.ts
      specialists.module.ts
      dto/
    services/
    availability/
    bookings/
    admin/
    files/
    notifications/
```

## Database: yes, connect now

Connect PostgreSQL immediately.

Reason:
- the MVP already implies users, roles, schedules, bookings, statuses, and admin workflows;
- delaying DB integration creates throwaway mocks and slows down real feature delivery;
- Prisma migrations will keep schema changes manageable.

## Core roles

```txt
guest
client
specialist
admin
```

Optional later:
```txt
moderator
superadmin
```

## Core enums

### UserRole

```ts
export enum UserRole {
  CLIENT = 'client',
  SPECIALIST = 'specialist',
  ADMIN = 'admin',
}
```

### BookingStatus

```ts
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}
```

### SpecialistStatus

```ts
export enum SpecialistStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}
```

## Prisma schema draft

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  client
  specialist
  admin
}

enum BookingStatus {
  pending
  confirmed
  cancelled
  completed
  no_show
}

enum SpecialistStatus {
  draft
  pending_review
  active
  rejected
  suspended
}

model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String
  role         UserRole    @default(client)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  profile      Profile?
  specialist   Specialist?
  clientBookings Booking[] @relation("ClientBookings")
}

model Profile {
  id          String   @id @default(cuid())
  userId      String   @unique
  firstName   String?
  lastName    String?
  phone       String?
  avatarUrl   String?
  timezone    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Specialist {
  id            String            @id @default(cuid())
  userId         String            @unique
  displayName    String
  title          String?
  bio            String?
  shortBio       String?
  status         SpecialistStatus  @default(draft)
  isVerified     Boolean           @default(false)
  priceFrom      Int?
  currency       String            @default("EUR")
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  user           User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  services       Service[]
  slots          AvailabilitySlot[]
  bookings       Booking[]
}

model Service {
  id            String   @id @default(cuid())
  specialistId  String
  title         String
  description   String?
  durationMin   Int
  price         Int
  currency      String   @default("EUR")
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  specialist    Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
}

model AvailabilitySlot {
  id            String   @id @default(cuid())
  specialistId  String
  startAt       DateTime
  endAt         DateTime
  isBooked      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  specialist    Specialist @relation(fields: [specialistId], references: [id], onDelete: Cascade)
}

model Booking {
  id            String        @id @default(cuid())
  clientId      String
  specialistId  String
  serviceId     String
  startAt       DateTime
  endAt         DateTime
  status        BookingStatus @default(pending)
  notes         String?
  price         Int
  currency      String        @default("EUR")
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  client        User          @relation("ClientBookings", fields: [clientId], references: [id], onDelete: Cascade)
  specialist    Specialist    @relation(fields: [specialistId], references: [id], onDelete: Cascade)
  service       Service       @relation(fields: [serviceId], references: [id], onDelete: Restrict)
}
```

## Controllers to implement first

### AuthController

Routes:
```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

Responsibilities:
- register user
- authenticate user
- issue access/refresh tokens
- return current session user

### UsersController

Routes:
```txt
GET   /users/me
PATCH /users/me
GET   /users/:id
```

Responsibilities:
- get current user profile
- update base profile fields
- admin/public detail access depending on policy

### SpecialistsController

Routes:
```txt
GET   /specialists
GET   /specialists/:id
POST  /specialists
PATCH /specialists/:id
PATCH /specialists/:id/status
```

Responsibilities:
- list/filter specialists
- expose public specialist page
- create/edit specialist profile
- moderation/approval flow

### ServicesController

Routes:
```txt
GET    /services
POST   /services
PATCH  /services/:id
DELETE /services/:id
```

Responsibilities:
- CRUD for specialist services
- control title, duration, price, active state

### AvailabilityController

Routes:
```txt
GET    /availability/:specialistId
POST   /availability
PATCH  /availability/:slotId
DELETE /availability/:slotId
```

Responsibilities:
- return available slots
- let specialist manage schedule

### BookingsController

Routes:
```txt
GET   /bookings/me
GET   /bookings/:id
POST  /bookings
PATCH /bookings/:id/status
POST  /bookings/:id/cancel
```

Responsibilities:
- create bookings
- change statuses
- return booking history for client/specialist

### AdminController

Routes:
```txt
GET   /admin/users
GET   /admin/bookings
GET   /admin/specialists
PATCH /admin/users/:id/role
PATCH /admin/specialists/:id/approve
```

Responsibilities:
- admin tables
- moderation
- user role management

### FilesController

Routes:
```txt
POST   /files/upload
DELETE /files/:id
```

Responsibilities:
- upload avatars/documents
- return public or signed URLs

## Service-layer rules

Implement business logic in services, not controllers.

Examples:
- bookings service prevents double booking;
- availability service validates slot overlaps;
- auth service hashes passwords and signs tokens;
- specialists service enforces ownership + moderation status.

## Validation and authorization rules

Must have:
- DTO validation for every write endpoint
- role guard middleware/guards
- ownership checks
- centralized exception handling
- audit-friendly status updates

Examples:
- only `specialist` or `admin` may edit specialist profile;
- only booking participants or admin may view booking details;
- only admin may approve specialists.

## API response contract philosophy

Frontend should receive view-ready DTOs.
Do not expose raw Prisma entities directly.

### Example DTOs

```ts
export type CurrentUserDto = {
  id: string;
  email: string;
  role: 'client' | 'specialist' | 'admin';
  profile: {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    timezone?: string;
  } | null;
};

export type SpecialistCardDto = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  title?: string;
  shortBio?: string;
  tags: string[];
  priceFrom?: number;
  currency: string;
  isVerified: boolean;
};

export type SpecialistPublicDto = {
  id: string;
  displayName: string;
  title?: string;
  bio?: string;
  shortBio?: string;
  priceFrom?: number;
  currency: string;
  services: Array<{
    id: string;
    title: string;
    durationMin: number;
    price: number;
    currency: string;
  }>;
  availableSlots: Array<{
    id: string;
    startAt: string;
    endAt: string;
  }>;
};

export type BookingDto = {
  id: string;
  clientId: string;
  specialistId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  price: number;
  currency: string;
  notes?: string;
};
```

## React integration requirements

Frontend should be split into public and authenticated areas.

### Public React screens

- home / landing
- specialists catalog
- specialist public page
- login
- register

### Client React screens

- dashboard
- my bookings
- booking details
- profile settings

### Specialist React screens

- specialist dashboard
- schedule manager
- bookings list
- services manager
- specialist profile editor

### Admin React screens

- users table
- specialists moderation
- bookings overview
- filters and status actions

## Suggested React app structure

```txt
src/
  app/
    providers/
    router/
    store/
  pages/
  widgets/
  features/
  entities/
  shared/
    api/
    lib/
    ui/
    config/
```

## React API layer requirements

Implement typed API modules:

```txt
shared/api/http.ts
shared/api/auth.api.ts
shared/api/users.api.ts
shared/api/specialists.api.ts
shared/api/services.api.ts
shared/api/availability.api.ts
shared/api/bookings.api.ts
shared/api/admin.api.ts
```

`http.ts` should support:
- base URL
- bearer token injection
- 401 refresh flow
- retry once after refresh
- normalized error mapping

## Example frontend query hooks

```ts
export const useCurrentUser = () => {}
export const useSpecialistsList = () => {}
export const useSpecialist = (id: string) => {}
export const useAvailableSlots = (specialistId: string) => {}
export const useMyBookings = () => {}
export const useCreateBooking = () => {}
export const useUpdateProfile = () => {}
```

## Booking flow for MVP

1. client opens specialist page
2. frontend loads specialist details + slots
3. client selects service + slot
4. frontend sends `POST /bookings`
5. backend validates slot availability
6. backend creates booking and marks slot as booked
7. frontend shows booking confirmation state

## Backend task order

### Phase 1

- bootstrap NestJS project
- configure env module
- connect PostgreSQL
- setup Prisma
- create initial migration
- implement auth module
- implement users module
- implement specialists module
- implement bookings module

### Phase 2

- implement services module
- implement availability module
- implement upload/files module
- generate Swagger docs
- add seed data

### Phase 3

- implement admin module
- add moderation statuses
- add email notifications abstraction
- add tests for core booking flows

## Non-goals for first implementation

Do not implement yet:
- chat
- websocket notifications
- complex billing
- multi-language CMS
- advanced analytics
- recommendation engine
- calendar sync with Google/Apple
- microservices split

## Minimum environment variables

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
JWT_ACCESS_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
CORS_ORIGIN=http://localhost:5173
```

## Expected deliverable from Claude

Claude should generate:
- backend project structure
- Prisma schema
- NestJS modules
- DTOs
- guards/decorators for auth and roles
- Swagger setup
- basic React API client contracts
- seed script
- first migration-ready backend skeleton
