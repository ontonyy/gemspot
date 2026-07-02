# HTTP — REST surface

Spring MVC REST controllers in `api/src/main/java/ee/gemspot/api/web`. All mounted at root
(no context-path). Port `8080` (`server.port: ${PORT:8080}`). Bearer JWT in `Authorization`.

<!-- service-context:auto:start -->

## Inbound REST controllers

| Controller | Base path | Endpoints (method path) | Auth | File |
|------------|-----------|-------------------------|------|------|
| AuthController | `/auth` | POST `/register` (201), POST `/login`, POST `/refresh`, POST `/oauth/google`, POST `/oauth/facebook`, GET `/me`, **PATCH `/me`**, **DELETE `/me`**, POST `/password`, POST `/logout-all`, POST `/email/change-request`, POST `/email/verify` | permit-all (token-gated per op internally) | `web/AuthController.java` |
| PlacesController | `/places` | GET `/` (`?cat=`), GET `/{slug}` | public | `web/PlacesController.java` |
| CategoriesController | `/categories` | GET `/` | public | `web/CategoriesController.java` |
| GuidesController | `/guides` | GET `/`, GET `/{id}` | public | `web/GuidesController.java` |
| EventsController | `/events` | **POST `/`** (202, anonymous analytics) | public | `web/EventsController.java` |
| SavedController | `/saved` | GET `/`, **POST `/`**, **POST `/merge`**, **DELETE `/{placeId}`** | authenticated | `web/SavedController.java` |
| SubmissionsController | `/submissions` | **POST `/`** (201), GET `/mine` | authenticated | `web/SubmissionsController.java` |
| ReportsController | `/reports` | **POST `/`** (201), GET `/mine` | authenticated | `web/ReportsController.java` |
| UploadsController | `/uploads` | **POST `/`** (201, multipart, 5MB, JPEG/PNG/WebP/GIF) | authenticated | `web/UploadsController.java` |
| AdminController | `/admin` | GET `/events`, GET `/stats`, GET `/submissions`, **POST `/submissions/{id}/approve`**, **POST `/submissions/{id}/reject`**, GET `/places`, **PATCH `/places/{id}/status`**, GET `/reports`, **PATCH `/reports/{id}/status`**, GET `/users` | ADMIN role | `web/AdminController.java` |
| HealthController | `/health` | GET `/` → `{"status":"ok"}` | public | `web/HealthController.java` |

**Mutating ops** are bolded above.

## Security route matrix (`config/SecurityConfig.java`)

- **permit-all**: `/places/**`, `/categories`, `/guides/**`, POST `/events`, `/auth/**`,
  `/actuator/health/**`, `/actuator/prometheus`.
- **authenticated**: `/saved/**`, `/submissions/**`, `/reports/**`, `/uploads`.
- **ADMIN**: `/admin/**`.
- Stateless JWT, CSRF off. `JwtAuthFilter` is non-throwing (invalid token → empty context,
  authz rules then reject).

## Error shape (`web/GlobalExceptionHandler.java`)

Nest-compatible: `{ statusCode, message, error }`. Validation failures: `message` is an
array of field errors; single failures: string. 401 via custom entry point, 403 via
access-denied handler.

## Outbound HTTP

- Google / Facebook OAuth token verification via Spring `RestClient` (`service/AuthService.java`).
- Supabase Storage (S3-compatible) via AWS SDK v2 (`config/StorageConfig.java`).
- Detail in [DEPENDENCIES.md](DEPENDENCIES.md).

**Confidence**: HIGH (controllers + route matrix grep-verified at `aad27f1`).

<!-- service-context:auto:end -->
