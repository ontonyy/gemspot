# MVP backend plan for web app (human version)

Этот документ описывает, что должно быть сделано по backend для MVP веб‑приложения и как это всё подключено к фронтенду и инфраструктуре.

## 1. Общая картина

Стек:
- Frontend: React + TypeScript, web app (desktop + mobile web)
- Backend: Node.js + TypeScript (NestJS или Express)
- ORM: Prisma
- Database: PostgreSQL (на Render)
- Hosting:
  - Backend API → Render Web Service (`api.yourdomain.com`)
  - Frontend → GitHub Pages (`app.yourdomain.com`)

Связи:
- React‑фронт (GitHub Pages) обращается к Backend API по HTTPS (`https://api.yourdomain.com`).
- Backend API общается с PostgreSQL через Prisma и строку подключения `DATABASE_URL`.

## 2. Что должно быть реализовано в backend для MVP

### 2.1. Доменные модули

Минимальный набор модулей для MVP:

- `auth` — регистрация, логин, refresh, logout, текущий пользователь
- `users` — профиль пользователя
- `places`/`specialists` — сущности, которые отображаются на карте (в зависимости от твоего кейса)
- `categories`/`tags` — категории/фильтры для карты
- `saved` — сохранённые места/избранное
- `add-place` — добавление нового места

Это соответствует MVP‑флоу на фронте:
- browse map
- filter categories
- open place details
- save items
- add a new place

### 2.2. Основные сущности и таблицы в БД

Минимальный набор таблиц в PostgreSQL:

- `users` — пользователи
- `profiles` — доп. данные профиля (имя, аватар, etc.)
- `places` — места/точки на карте (или специалисты, если это люди)
- `categories` — категории/типы мест
- `place_categories` — связь many‑to‑many между местами и категориями
- `saved_places` — сохранённые пользователем места
- `sessions` или `tokens` — при необходимости хранить refresh‑токены

Базовые поля:
- `users`: id, email, passwordHash, role, createdAt, updatedAt
- `places`: id, title, description, latitude, longitude, address, status, createdAt, updatedAt
- `categories`: id, slug, name
- `saved_places`: id, userId, placeId, createdAt

### 2.3. Ключевые API‑эндпоинты

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

Users:
- `GET   /users/me`
- `PATCH /users/me`

Places (то, что на карте):
- `GET   /places` — список мест с возможностью фильтрации
- `GET   /places/:id` — детали места
- `POST  /places` — создать новое место (для add-a-place)
- `PATCH /places/:id` — обновить место (если это нужно в MVP)

Categories/Filters:
- `GET /categories` — список категорий для фильтров

Saved:
- `GET   /saved` — список сохранённых мест
- `POST  /saved` — добавить место в сохранённые
- `DELETE /saved/:placeId` — удалить из сохранённых

Health/Service:
- `GET /health` — статус сервера (для проверки Render)

Все эндпоинты должны возвращать **DTO** (view‑модели), а не сырые записи из БД.

### 2.4. DTO, которые фронт ожидает от backend

Примеры важных DTO:

- `CurrentUserDto` — id, email, basic profile
- `PlaceCardDto` — данные карточки для списка/карты
- `PlaceDetailsDto` — данные для экрана деталки
- `CategoryDto` — id, slug, label
- `SavedPlaceDto` — id, placeId, placeCard внутри

Важно: DTO — это стабильный контракт между фронтом и бэком. Если backend потом будет переписан на другой стек (например, Java), именно эти DTO должны остаться такими же.

---

## 3. Архитектура backend (на уровне папок и слоёв)

Рекомендуемая структура (NestJS‑пример):

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

Принципы:
- `api` слой — только контроллеры/роуты, мапят HTTP → use cases.
- `application` — бизнес‑логика use case’ов (создать место, сохранить место, получить список и т.п.).
- `domain` — сущности, доменные правила.
- `infra` — Prisma, доступ к БД.
- `contracts` — DTO, enum’ы, типы для обмена с фронтом.

---

## 4. Хостинг и подключение

### 4.1. Backend на Render

Backend разворачивается как Render Web Service:
- Source: GitHub repo
- Root Directory: `backend`
- Build command: `npm install && npm run build`
- Start command: `npm run start:prod`

Environment variables на Render:
- `DATABASE_URL` — строка подключения к PostgreSQL (Render Managed PostgreSQL)
- `NODE_ENV=production`
- `PORT` — Render задаёт порт, приложение должно читать `process.env.PORT`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — секреты для токенов
- `CORS_ORIGIN=https://app.yourdomain.com` — для фронта

### 4.2. PostgreSQL на Render

PostgreSQL — отдельный ресурс на Render:
- создаётся через интерфейс Render (New → PostgreSQL)
- даёт `Internal Database URL`, которая используется как `DATABASE_URL` в backend
- Prisma использует `DATABASE_URL` в `schema.prisma`

### 4.3. Frontend на GitHub Pages

Frontend собирается (`npm run build` в `frontend`) и выкладывается на GitHub Pages через GitHub Actions.

Переменная окружения для фронта:
- `VITE_API_URL` (или аналог) = `https://api.yourdomain.com`

Фронт отправляет запросы к Backend API через этот base URL.

---

## 5. Что обязательно должно быть готово перед стартом разработки

1. **Список эндпоинтов и DTO** зафиксирован (как минимум на уровне текста).
2. **Простая ER‑диаграмма** или список таблиц/сущностей (users, places, categories, saved_places).
3. Решено, какие действия доступны в MVP (кто может добавлять места, нужны ли роли и т.п.).
4. Определено, какие поля обязательны при добавлении нового места.
5. Решены основные статусные вещи (например, нужен ли статус модерации для мест, или всё публикуется сразу).
6. Понятно, какие фильтры будут на карте (по категориям, по статусу и т.п.).

Когда всё это зафиксировано, backend можно смело отдавать в работу/Claude Code, а фронт — использовать API контракт для интеграции.
