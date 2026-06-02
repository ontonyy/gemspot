# 05 · Data Model & API

The **GemSpot** domain on a **Java + Spring Boot + MySQL** backend. ⚠️ This supersedes the `Specialist / Service / Availability / Booking` entities **and** the Node/NestJS/Prisma stack in `mvp-backend-*.md` — those docs are a leftover marketplace template. Confirmed stack: **Spring Boot, Spring Data JPA / Hibernate, MySQL, Flyway, Spring Security + JWT, S3-compatible storage.** React consumes the REST endpoints below via view-ready DTOs.

---

## Entities

```
User            account (guest is anonymous = no row)
Profile         display name, avatar, locale
Place           an approved, live spot on the map
PlacePhoto      1–5 images per place
Category        the 7 (or 3–5 launch) categories — data-driven
Tag             utility tags (Free, Lights, Seasonal, …)
PlaceTag        place ↔ tag join
Favorite        user ↔ place save
Submission      a user-proposed new place (or edit) awaiting moderation
SubmissionPhoto images attached to a submission
Report          "inaccurate / gone" flag on a place
ModerationAction audit log of approve/reject/edit decisions
ShareEvent      a share of a place (also feeds analytics)
AnalyticsEvent  generic event stream (see Events)
Collection      curated list (DEFER — v2; schema reserved)
CollectionItem  (DEFER)
```

Relationships: `User 1:1 Profile` · `User 1:N Favorite` · `User 1:N Submission` · `Category 1:N Place` · `Place 1:N PlacePhoto` · `Place N:M Tag` · `Place 1:N Report` · `Submission 1:N SubmissionPhoto` · `Submission 1:N ModerationAction`.

### Enums (Java enums, stored as `VARCHAR` via `@Enumerated(EnumType.STRING)`)

```java
enum UserRole      { USER, MODERATOR, ADMIN }          // guest = no session
enum PlaceStatus   { DRAFT, PENDING, APPROVED, REJECTED, ARCHIVED }
enum ReportReason  { CLOSED, INACCURATE, DUPLICATE, INAPPROPRIATE, OTHER }
enum SubmissionType{ NEW_PLACE, EDIT }
```

---

## MySQL schema (Flyway DDL — core tables)

Use `CHAR(26)` ULIDs or `BINARY(16)` UUIDs for ids; `utf8mb4`; `InnoDB`. Denormalised counters on `place` keep card queries cheap.

```sql
CREATE TABLE users (
  id            CHAR(26) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  provider      VARCHAR(20),               -- google|facebook|instagram|email
  role          VARCHAR(16) NOT NULL DEFAULT 'USER',
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE profiles (
  id         CHAR(26) PRIMARY KEY,
  user_id    CHAR(26) NOT NULL UNIQUE,
  name       VARCHAR(80) NOT NULL,
  avatar_url VARCHAR(512),
  locale     VARCHAR(8)  NOT NULL DEFAULT 'en',
  CONSTRAINT fk_profile_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id     VARCHAR(24) PRIMARY KEY,          -- 'scenic', 'sakura', …
  label  VARCHAR(40) NOT NULL,
  short  VARCHAR(24) NOT NULL,
  color  CHAR(7)     NOT NULL,             -- hex, drives marker + badge
  glyph  VARCHAR(24) NOT NULL,
  active TINYINT(1)  NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE places (
  id            CHAR(26) PRIMARY KEY,
  slug          VARCHAR(120) NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  category_id   VARCHAR(24)  NOT NULL,
  lat           DOUBLE       NOT NULL,
  lng           DOUBLE       NOT NULL,
  neighborhood  VARCHAR(80)  NOT NULL,
  note          TEXT         NOT NULL,
  is_free       TINYINT(1)   NOT NULL DEFAULT 1,
  status        VARCHAR(16)  NOT NULL DEFAULT 'APPROVED',
  saves_count   INT          NOT NULL DEFAULT 0,
  views_count   INT          NOT NULL DEFAULT 0,
  shares_count  INT          NOT NULL DEFAULT 0,
  verified_at   DATETIME,
  created_by_id CHAR(26),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_place_cat FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_place_cat_status (category_id, status),
  INDEX idx_place_geo (lat, lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE place_photos (
  id       CHAR(26) PRIMARY KEY,
  place_id CHAR(26) NOT NULL,
  url      VARCHAR(512) NOT NULL,
  width    INT, height INT,
  position INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_photo_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tags ( id VARCHAR(40) PRIMARY KEY, label VARCHAR(40) NOT NULL );
CREATE TABLE place_tags (
  place_id CHAR(26) NOT NULL, tag_id VARCHAR(40) NOT NULL,
  PRIMARY KEY (place_id, tag_id),
  CONSTRAINT fk_pt_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
  CONSTRAINT fk_pt_tag   FOREIGN KEY (tag_id)   REFERENCES tags(id)   ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE favorites (
  id         CHAR(26) PRIMARY KEY,
  user_id    CHAR(26) NOT NULL,
  place_id   CHAR(26) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fav (user_id, place_id),
  CONSTRAINT fk_fav_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_fav_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE submissions (
  id                   CHAR(26) PRIMARY KEY,
  type                 VARCHAR(16) NOT NULL DEFAULT 'NEW_PLACE',
  status               VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  name                 VARCHAR(120) NOT NULL,
  category_id          VARCHAR(24)  NOT NULL,
  lat                  DOUBLE NOT NULL, lng DOUBLE NOT NULL,
  neighborhood         VARCHAR(80),
  note                 TEXT,
  target_place_id      CHAR(26),                 -- set when type = EDIT
  submitted_by_id      CHAR(26),
  is_duplicate_suspect TINYINT(1) NOT NULL DEFAULT 0,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sub_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE submission_photos (
  id CHAR(26) PRIMARY KEY, submission_id CHAR(26) NOT NULL, url VARCHAR(512) NOT NULL,
  CONSTRAINT fk_sp_sub FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE moderation_actions (
  id            CHAR(26) PRIMARY KEY,
  submission_id CHAR(26) NOT NULL,
  moderator_id  CHAR(26) NOT NULL,
  decision      VARCHAR(16) NOT NULL,       -- approve|reject|edit
  reason        VARCHAR(255),
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ma_sub FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE reports (
  id         CHAR(26) PRIMARY KEY,
  place_id   CHAR(26) NOT NULL,
  user_id    CHAR(26),
  reason     VARCHAR(20) NOT NULL,
  detail     VARCHAR(500),
  resolved   TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rep_place FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE analytics_events (
  id         CHAR(26) PRIMARY KEY,
  name       VARCHAR(40) NOT NULL,
  user_id    CHAR(26),                       -- null = guest
  place_id   CHAR(26),
  category   VARCHAR(24),
  props      JSON,
  device     VARCHAR(40),
  locale     VARCHAR(8),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_evt (name, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### JPA entity sketch (one example — mirror for the rest)

```java
@Entity @Table(name = "places")
public class Place {
  @Id private String id;                 // ULID assigned in @PrePersist
  @Column(unique = true) private String slug;
  private String name;
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "category_id") private Category category;
  private double lat, lng;
  private String neighborhood;
  @Column(columnDefinition = "TEXT") private String note;
  private boolean isFree;
  @Enumerated(EnumType.STRING) private PlaceStatus status = PlaceStatus.APPROVED;
  private int savesCount, viewsCount, sharesCount;
  private LocalDateTime verifiedAt, createdAt, updatedAt;
  @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<PlacePhoto> photos = new ArrayList<>();
  @ManyToMany @JoinTable(name = "place_tags",
    joinColumns = @JoinColumn(name="place_id"),
    inverseJoinColumns = @JoinColumn(name="tag_id"))
  private Set<Tag> tags = new HashSet<>();
}
```

> **Geo queries:** for MVP, `?near=` distance can be a bounding-box pre-filter (`lat/lng BETWEEN`) + Haversine in the service layer, ordered by distance. If volume grows, move to MySQL spatial types (`POINT` + `SPATIAL INDEX`, `ST_Distance_Sphere`).

---

## Spring modules (package-by-feature, modular monolith)

`auth`, `users`, `places`, `categories`, `favorites`, `submissions`, `reports`, `moderation`(admin), `files`, `analytics`. Each: `*Controller` (REST) → `*Service` (business logic) → `*Repository` (Spring Data JPA). Business rules live in services (e.g. approve-submission creates a Place + writes a ModerationAction transactionally; favorite toggle updates `saves_count`). DTO mapping via MapStruct or hand-mapped — **never return JPA entities directly.**

## REST API

### auth (`AuthController`)
```
POST /auth/register            email+password
POST /auth/login               (demo: admin/admin → ADMIN role)
POST /auth/oauth/{provider}    google | facebook | instagram
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### places (public reads) (`PlaceController`)
```
GET  /places?cat=&bbox=&near=lat,lng&limit=     → PlaceCardDto[]   (status=APPROVED only)
GET  /places/{slug}                             → PlaceDetailDto
POST /places/{id}/view                          → increments views (or via event)
```

### categories
```
GET  /categories                                → CategoryDto[]
```

### favorites (authed)
```
GET    /favorites                               → PlaceCardDto[]
POST   /favorites/{placeId}
DELETE /favorites/{placeId}
```

### submissions (authed)
```
POST /submissions    { type,name,categoryId,lat,lng,note,photoIds[] }  → PENDING
GET  /submissions/me                             → my submissions + status
```

### reports (authed or guest+captcha)
```
POST /reports        { placeId, reason, detail }
```

### moderation (role = ADMIN | MODERATOR)
```
GET   /admin/moderation/queue                    → SubmissionDto[] (PENDING)
GET   /admin/moderation/{id}                     → submission + dupe candidates
PATCH /admin/moderation/{id}/approve             → creates/updates Place, status=APPROVED
PATCH /admin/moderation/{id}/reject              { reason }
GET   /admin/places?status=&q=                   → admin place table
GET   /admin/stats                               → dashboard KPIs
```

### files (`FileController`)
```
POST /files/upload           multipart → { id, url }     (S3-compatible / MinIO in dev)
```

### analytics
```
POST /events                 { name, placeId?, category?, props? }   (fire-and-forget, 202)
```

---

## DTOs (TypeScript — the contract React codes against; mirror as Java records)

```ts
type CategoryDto = { id:string; label:string; short:string; color:string; glyph:string };

type PlaceCardDto = {
  id:string; slug:string; name:string; category:CategoryDto;
  neighborhood:string; distanceKm?:number;        // computed from ?near=
  savesCount:number; isFree:boolean;
  thumbUrl?:string; tags:string[]; isSaved?:boolean;  // NO rating
};

type PlaceDetailDto = PlaceCardDto & {
  lat:number; lng:number; note:string;
  photos:{ url:string }[]; viewsCount:number; sharesCount:number;
  contributor:{ name:string }; verifiedAt?:string;
  appleMapsUrl:string; googleMapsUrl:string;       // directions handoff
};

type SubmissionDto = {
  id:string; type:'new_place'|'edit'; name:string; category:CategoryDto;
  neighborhood?:string; note?:string; submittedBy:string; createdAt:string;
  photos:{ url:string }[]; isDuplicateSuspect:boolean; status:string;
};

type CurrentUserDto = { id:string; role:'user'|'moderator'|'admin'; profile:{ name:string; avatarUrl?:string } };
```

Java side, e.g. `public record PlaceCardDto(String id, String slug, String name, CategoryDto category, String neighborhood, Double distanceKm, int savesCount, boolean isFree, String thumbUrl, List<String> tags, Boolean isSaved) {}`.

> **No `rating` field anywhere in MVP** — reviews/ratings are post-MVP (doc 07). Social proof = `savesCount` + `distanceKm` + `verifiedAt`.

---

## Analytics events (instrument from day one)

`app_opened`, `map_opened`, `category_selected`, `filters_applied`, `pin_clicked`, `place_opened`, `place_saved`, `place_shared`, `route_opened`, `submission_started`, `submission_sent`, `submission_approved`, `submission_rejected`, `report_sent`, `signup_completed` (+ `collection_opened` when collections ship).

Attach dimensions: device, locale, viewed neighbourhood/category, guest-vs-authed, referrer. These power the admin dashboard KPIs (pending count, top categories by opens, view→save and view→share rates, approval rate, freshness %).

## Spring-specific notes
- **Security:** Spring Security, stateless JWT (access ~15min + refresh ~30d); `@PreAuthorize("hasRole('ADMIN')")` on moderation endpoints; ownership checks in services (a user edits only their own submissions).
- **Validation:** Bean Validation (`@Valid` + `@NotBlank/@Size`) on every write DTO; `@ControllerAdvice` for centralized error → normalized JSON error body.
- **Migrations:** Flyway (`V1__init.sql` = DDL above + seed categories + ~30 places from the prototype's `GEM_SPOTS`).
- **API docs:** springdoc-openapi (Swagger UI) so the React team has a live contract.
- **CORS:** allow the React origin; cookies for refresh token (httpOnly) or bearer in header.
