# GemSpot — Статус MVP (весь проект)

> Карта-первый UGC-проект: «Spotter's Field Guide to Tallinn» — находить / сохранять /
> предлагать уличные споты (пинг-понг, баскетбол, футбол, теннис, падел, виды, сакура).
> Документ описывает **реальное состояние всего проекта** по состоянию репозитория,
> а не работу одной сессии. Источник истины = код. Дата: 2026-06-07.
>
> Стек: React + Vite (FSD, HashRouter, base `/gemspot/`) → GitHub Pages ·
> NestJS + Prisma + Postgres → Render. Web `v0.2.1`, backend `v0.1.0`.

---

## Корневая задача

Собрать рабочий MVP карты-гайда по спотам Таллина с двумя контурами:

1. **Фронтенд** работает автономно на mock-данных (демо без бэкенда) и плавно
   переключается на живой API без изменения кода вызовов — через «шов» (seam).
2. **Бэкенд** отдаёт ровно те DTO-формы, что уже определены фронтом
   (`web/src/shared/api/types.ts`) — контракт фиксирован, бэкенд подстраивается.

Главная сложность — не «написать фичи», а **связать два контура надёжно**:
переключение mock↔HTTP, graceful-деградация при недоступном сервере, холодный
старт free-тарифа Render (~50с), и ручные операции деплоя (секреты, пароль
админа, OAuth client id), которые нельзя проверить из репозитория.

---

## Что готово / частично / не готово

| Блок | Состояние | Где / примечание |
|---|---|---|
| Frontend — Explore (карта+кластеры+рейл+фильтр) | ✅ готово | `features/explore/*`, `widgets/map/SpotMap.tsx` |
| Фильтр категорий + Free (`?cat=`, `?free=1`) | ✅ готово | `Legend.tsx`, `useExploreList.ts` |
| Деталь спота + deep-link маршруты (Apple/Google) | ✅ готово | `features/place-detail/SpotDetail.tsx` |
| Share, Report-a-problem, Save/коллекция | ✅ готово | localStorage + server-merge при логине |
| Add-a-spot (submission → PENDING) | ✅ готово | `pages/AddSpot.tsx` |
| Guides (производные коллекции, без CMS) | ✅ готово | `Guides.tsx`, `GuideDetail.tsx` |
| Account menu + Auth UI (email login) | ✅ готово | `features/account/*`, `authStore` |
| Admin-панель (модерация/дашборд), role-gated | ✅ готово | `features/admin/*` |
| Landing / Home (Field Guide) + hero-карта | ✅ готово | `pages/Home.tsx`, `widgets/map/HeroMapCanvas.tsx` |
| Mobile (bottom sheet, mobile nav) | ✅ готово | `MobileExplore.tsx`, `widgets/nav/MobileNav.tsx` |
| Seam mock↔HTTP + graceful mock-fallback | ✅ готово | `shared/api/{placesApi,authApi}.ts` |
| Warmup бэкенда (`GET /health` на старте) | ✅ готово | `shared/api/warmup.ts` |
| Backend — REST API (все роуты, см. ниже) | ✅ готово | NestJS, слои api/application/domain/infra/contracts |
| Backend — Prisma schema + миграции + seed | ✅ готово | `0001_init`, `0002_user_oauth`; seed 7 кат / 10 спотов / admin |
| Backend — Google OAuth (verify через tokeninfo) | 🟡 код готов, не сконфигурирован | нужен `GOOGLE_CLIENT_ID` (backend) + `VITE_GOOGLE_CLIENT_ID` (web) — оба **не заданы** |
| Backend — тесты (Jest, mocked Prisma) | ✅ 38/38 | `backend/test/*.spec.ts` |
| Деплой бэкенда на Render (живой URL) | 🟡 НЕ ПРОВЕРЯЕМО из репо | `https://gemspot-api.onrender.com` — статус подтвердить вручную |
| Live-фронт на реальном API (флип seam) | 🟡 НЕ ПРОВЕРЯЕМО | нужен GitHub secret `VITE_API_URL` + перезапуск Pages |
| Пароль админа | 🔴 риск | `ADMIN_PASSWORD` не задан → дефолт `admin1234` |
| Фото-споты (object storage) | ❌ не готово | `uploads/` на эфемерной FS, теряется при redeploy |
| i18n / PWA / push-уведомления | ❌ backlog | не начато |

### Бэкенд-роуты (подтверждено сканом контроллеров)

- `health`: `GET /health`
- `places`: `GET /places`, `GET /places/:slug`
- `categories`: `GET /categories`
- `guides`: `GET /guides`, `GET /guides/:id`
- `saved`: `GET /saved`, `POST /saved`, `POST /saved/merge`, `DELETE /saved/:placeId`
- `submissions`: `POST /submissions`, `GET /submissions/mine`
- `reports`: `POST /reports`, `GET /reports/mine`
- `uploads`: `POST /uploads`
- `events`: `POST /events`
- `auth`: `register`, `login`, `refresh`, `POST /auth/oauth/google`, `logout`, `GET /auth/me`
- `admin` (role-gated): `events`, `stats`, submissions queue + approve/reject,
  places + status patch, reports + status patch, users

---

## Изменения схемы БД

Prisma (Postgres). Модели: `User`, `Profile`, `Category`, `Place`, `PlaceCategory`,
`PlacePhoto`, `SavedPlace`, `Submission`, `SubmissionPhoto`, `Report`, `Event`.
Enum'ы: `UserRole`, `PlaceStatus`, `SubmissionStatus`, `ReportStatus`, `ReportReason`.

**Изменения (миграция `0002_user_oauth`):**
- `User.passwordHash` → nullable (OAuth-аккаунты без локального пароля).
- Добавлены `User.provider` + `User.providerId` (nullable) + `@@unique([provider, providerId])`.

`Place.id` — zero-padded строка (`"01".."10"`), чтобы байт-в-байт совпадать с
mock DTO. `Category.id` = строковый CategoryId (`tabletennis` и т.д.).

---

## Verification (реальные результаты)

Проверено прогоном в репозитории 2026-06-07:

- **web `npm run build`** — ✅ чисто (tsc + vite, ~1.5с). Единственное
  предупреждение: maplibre chunk > 500 kB (не ошибка).
- **web `npm test` (vitest)** — ✅ **5/5 pass** (geo-математика).
- **backend `npm test` (jest, mocked Prisma)** — ✅ **38/38 pass**, 5 suites
  (auth / saved-merge / submissions / admin-moderation / relative-time).

**НЕ проверяемо из репо (ручные операции / внешние аккаунты):**
- статус живого деплоя Render и доступность `https://gemspot-api.onrender.com`;
- задан ли GitHub secret `VITE_API_URL` и перезапущен ли Pages-воркфлоу;
- значение `ADMIN_PASSWORD` в Render;
- заданы ли `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`.

Эти пункты помечены как UNVERIFIED — не считать готовыми по факту кода.

---

## Что осталось / риски

1. **Флип live-фронта на реальный API** — задать repo secret
   `VITE_API_URL=https://gemspot-api.onrender.com`, перезапустить Pages. Код менять
   не нужно (seam). *Ручная операция.*
2. **🔴 Безопасность: пароль админа** — `ADMIN_PASSWORD` не задан → seed создаёт
   `admin@gemspot.ee` / `admin1234`. Задать реальный в Render до публичного запуска.
3. **Google OAuth не сконфигурирован** — код готов (verify через
   `oauth2.googleapis.com/tokeninfo`, проверка `aud` + `email_verified`), но
   `GOOGLE_CLIENT_ID` (backend) и `VITE_GOOGLE_CLIENT_ID` (web) не заданы → кнопка
   Google отключена, бэкенд отвечает «not configured». *Ручная операция.*
4. **Холодный старт Render free** ~50с после простоя. Смягчено `warmup.ts`
   (пинг `/health` на загрузке лендинга), но первая загрузка после сна медленная.
5. **Эфемерная FS** — фото из `uploads/` теряются при redeploy. Нужен object
   storage (S3/R2) до продакшна с реальными фото.
6. **Размер JS-бандла** — 1.44 MB (maplibre). Code-split не сделан (backlog).

---

## Как проверить за 60 секунд (критичные непроверяемые пункты)

```bash
# 1. Жив ли бэкенд (ожидать {"status":"ok"}; первый ответ может идти ~50с — cold start):
curl -s https://gemspot-api.onrender.com/health

# 2. Отдаёт ли данные (ожидать 7 категорий и 10 спотов):
curl -s https://gemspot-api.onrender.com/categories | grep -o '"id"' | wc -l
curl -s https://gemspot-api.onrender.com/places | grep -o '"slug"' | wc -l

# 3. Флипнут ли live-фронт на реальный API:
#    открыть https://ontonyy.github.io/gemspot/ → DevTools Network →
#    есть запросы на gemspot-api.onrender.com = real; их нет = всё ещё mock.

# 4. Пароль админа: НЕ admin1234? — проверить в Render Dashboard → env ADMIN_PASSWORD.
```
