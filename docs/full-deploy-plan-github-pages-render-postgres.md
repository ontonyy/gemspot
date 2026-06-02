# Full deploy plan: GitHub Pages (frontend) + Render (backend + PostgreSQL)

Этот файл описывает полный процесс деплоя стека:

- **Frontend**: React + TypeScript → GitHub Pages → `app.yourdomain.com`
- **Backend**: Node/NestJS (или Express) + TypeScript + Prisma → Render Web Service → `api.yourdomain.com`
- **Database**: PostgreSQL → Render Managed PostgreSQL

Репозиторий — один (monorepo).

```txt
your-project/
  frontend/   # React + TS (Vite/CRA)
  backend/    # NestJS или Express + TS + Prisma
  README.md
```

---

## 1. Backend: подготовка проекта

### 1.1. Скрипты в `backend/package.json`

Пример для NestJS:

```jsonc
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "prisma:migrate:deploy": "prisma migrate deploy"
  }
}
```

Пример для Express:

```jsonc
{
  "scripts": {
    "build": "tsc",
    "start": "ts-node src/index.ts",
    "start:dev": "ts-node-dev src/index.ts",
    "start:prod": "node dist/index.js",
    "prisma:migrate:deploy": "prisma migrate deploy"
  }
}
```

Убедись, что `start:prod` запускает уже собранный JS из `dist/`.

### 1.2. Prisma + PostgreSQL

`backend/prisma/schema.prisma`:

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

model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String
  role         UserRole    @default(client)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  profile        Profile?
  clientBookings Booking[] @relation("ClientBookings")
}

model Profile {
  id        String   @id @default(cuid())
  userId    String   @unique
  firstName String?
  lastName  String?
  phone     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Booking {
  id            String        @id @default(cuid())
  clientId      String
  startAt       DateTime
  endAt         DateTime
  status        BookingStatus @default(pending)

  client User @relation("ClientBookings", fields: [clientId], references: [id], onDelete: Cascade)
}
```

Локальная миграция (при наличии локального Postgres):

```bash
cd backend
npx prisma migrate dev --name init
```

### 1.3. Переменные окружения в backend

Локальный `backend/.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/app
PORT=4000
NODE_ENV=development
JWT_ACCESS_SECRET=dev_access_secret
JWT_REFRESH_SECRET=dev_refresh_secret
CORS_ORIGIN=http://localhost:5173
```

В коде:

- сервер слушает `process.env.PORT || 4000`;
- Prisma берёт `DATABASE_URL` из env;
- CORS использует `CORS_ORIGIN`.

---

## 2. Frontend: подготовка проекта

Предположим, используется Vite.

Структура:

```txt
frontend/
  src/
  index.html
  vite.config.ts
  package.json
```

### 2.1. Скрипты в `frontend/package.json`

```jsonc
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### 2.2. API URL через env

`frontend/src/apiClient.ts` (пример):

```ts
const API_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}
```

Локальный `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:4000
```

Локальный запуск:

```bash
# терминал 1
cd backend
npm run start:dev

# терминал 2
cd frontend
npm run dev
```

---

## 3. Создание PostgreSQL в Render

1. Зайди в [Render](https://render.com).
2. Нажми **New → PostgreSQL** (или Databases → New Database).
3. Выбери регион (лучше ближе к основной аудитории).
4. Задай имя БД, нажми создать.
5. На странице БД Render покажет:
   - **Internal Database URL**;
   - **External Database URL**.

Используй **Internal URL** для backend‑сервиса в том же регионе. Строка будет вида:

```text
postgres://user:password@internal-host:5432/dbname
```

Скопируй её — это твой `DATABASE_URL` для продакшена.

---

## 4. Деплой backend на Render

### 4.1. Создать Web Service

1. В Render нажми **New → Web Service**.
2. Выбери **Build and deploy from a Git repository**.
3. Подключи GitHub, выбери свой репозиторий.
4. Настройки сервиса:

- **Name**: `your-backend` (любое);
- **Region**: тот же, что у БД;
- **Branch**: `main` (или нужная ветка);
- **Root Directory**: `backend`;
- **Runtime**: Node 20;
- **Build Command** (пример):

  ```bash
  npm install && npm run build
  ```

  при желании можно добавить миграции:

  ```bash
  npm install && npx prisma migrate deploy && npm run build
  ```

- **Start Command**:

  ```bash
  npm run start:prod
  ```

### 4.2. Environment Variables (Render → Environment)

Добавь переменные окружения:

```text
DATABASE_URL=postgres://user:password@internal-host:5432/dbname
NODE_ENV=production
PORT=10000
JWT_ACCESS_SECRET=<сгенерированный_секрет>
JWT_REFRESH_SECRET=<сгенерированный_секрет>
CORS_ORIGIN=https://app.yourdomain.com
```

Сохрани настройки и дождись первого деплоя. После успешного деплоя Render даст URL:

```text
https://your-backend.onrender.com
```

### 4.3. Проверка backend

Сделай простой health‑эндпоинт (например, `GET /health` → `{ status: 'ok' }`).

Проверь:

```bash
curl https://your-backend.onrender.com/health
```

Если пришёл `status: 'ok'` — бэк работает.

---

## 5. Деплой frontend на GitHub Pages

### 5.1. Включить GitHub Pages

1. В репозитории на GitHub: **Settings → Pages**.
2. В разделе **Build and deployment** выбрать `GitHub Actions`.

### 5.2. GitHub Actions workflow

Создай файл `.github/workflows/frontend-pages.yml` в корне репо:

```yaml
name: Deploy frontend to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install and build
        working-directory: ./frontend
        env:
          VITE_API_URL: https://your-backend.onrender.com
        run: |
          npm install
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend/dist
```

Что делает этот workflow:

- на каждый push в `main`, если изменился `frontend/`,
- собирает фронт (`npm run build`),
- публикует `frontend/dist` в ветку `gh-pages`,
- GitHub Pages раздаёт содержимое `gh-pages`.

После первого успешного запуска зайди в Settings → Pages и увидишь публичный URL вида:

```text
https://username.github.io/repo-name/
```

Проверь, что сайт открывается и может обратиться к бэкенду (пока по `https://your-backend.onrender.com`).

---

## 6. Подключение своего домена

### 6.1. `api.yourdomain.com` → Render backend

1. В настройках твоего Web Service на Render открой **Custom Domains**.
2. Нажми **Add Custom Domain** и введи `api.yourdomain.com`.
3. Render покажет, какую DNS‑запись создать — обычно:

```text
api.yourdomain.com CNAME your-backend.onrender.com
```

4. У регистратора домена создай эту CNAME‑запись.
5. После обновления DNS бэк станет доступен по:

```text
https://api.yourdomain.com
```

6. Обнови переменные окружения:

- на Render: `CORS_ORIGIN=https://app.yourdomain.com` (если ещё не так);
- в GitHub Actions: использовать новый API URL.

### 6.2. `app.yourdomain.com` → GitHub Pages

1. В Settings → Pages в репозитории укажи **Custom domain**: `app.yourdomain.com`.
2. GitHub покажет, какой CNAME нужно создать:

```text
app.yourdomain.com CNAME username.github.io
```

3. У регистратора домена создай эту запись.
4. После пропагции DNS фронтенд будет доступен по:

```text
https://app.yourdomain.com
```

### 6.3. Обновление API URL для фронта

Теперь надо изменить `VITE_API_URL` в GitHub Actions workflow:

```yaml
env:
  VITE_API_URL: https://api.yourdomain.com
```

Запусти деплой (push в `main`) — фронт будет обращаться к новому API‑домену.

---

## 7. Локальная разработка после деплоя

Локальный сценарий остаётся прежним:

```bash
# backend
cd backend
npm run start:dev

# frontend
cd frontend
npm run dev
```

При этом:

- локальный фронт использует `VITE_API_URL=http://localhost:4000`;
- продакшен фронт на GitHub Pages использует `VITE_API_URL=https://api.yourdomain.com`.

---

## 8. Итоговая картина

- **Репозиторий**: один, с `frontend/` и `backend/`.
- **База**: PostgreSQL на Render, `DATABASE_URL` в env backend‑сервиса.
- **Backend**: Web Service на Render, билд из `backend`, работает на `https://api.yourdomain.com`.
- **Frontend**: сборка Vite в `frontend/dist`, деплой через GitHub Actions на GitHub Pages, домен `https://app.yourdomain.com`.
- **Связь**: фронт использует `VITE_API_URL=https://api.yourdomain.com`.

Следуя этому плану сверху вниз, ты получишь полностью задеплоенный стек с кастомными доменами.
