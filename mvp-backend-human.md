# MVP backend для проекта

Этот документ описывает простой и реалистичный backend для MVP: что запускать первым, какие контроллеры нужны, нужна ли база сразу, и что React будет получать с API.

## Главная идея

Для MVP backend должен быть **не сложным, а расширяемым**. Лучший старт — один API-сервис с понятной модульной структурой, PostgreSQL с первого дня и JWT-аутентификацией.

Рекомендуемый стек:
- Node.js + TypeScript
- NestJS **или** Express/Fastify с модульной структурой
- PostgreSQL
- Prisma ORM
- JWT auth
- React на фронтенде

Почему база уже сейчас:
- появятся пользователи, роли, записи, статусы, история;
- без БД быстро начнётся хаос в моках и JSON-файлах;
- PostgreSQL + Prisma дают быстрый старт и нормальную миграцию схемы.

## Архитектура MVP

Минимальная структура backend:
- `auth` — логин, регистрация, refresh token, роли;
- `users` — профиль пользователя;
- `specialists` или `experts` — публичные карточки специалистов/профилей;
- `services` — типы услуг или форматы консультаций;
- `bookings` — создание и управление записями;
- `availability` — доступные слоты/расписание;
- `payments` — заглушка или базовая интеграция позже;
- `admin` — управление контентом, пользователями, модерацией;
- `files` — аватары, документы, изображения;
- `notifications` — email / Telegram / in-app позже.

## Нужно ли подключать БД уже?

Да, для MVP базу лучше подключить **сразу**.

Когда можно не подключать БД:
- только если делаешь сверхкороткий clickable prototype;
- если backend ещё не нужен и React показывает чисто статические экраны.

Во всех остальных случаях база нужна сразу, потому что MVP почти наверняка включает:
- аккаунты;
- роли;
- записи/бронирования;
- статусы заявок;
- админку;
- контент, который должен редактироваться.

## Роли пользователей

Базовые роли:
- `guest` — неавторизованный пользователь;
- `client` — обычный клиент;
- `specialist` — специалист/эксперт;
- `admin` — администратор.

Иногда полезно добавить:
- `moderator` — если будет ручная проверка анкет;
- `superadmin` — если проект вырастет.

Для MVP обычно достаточно `client`, `specialist`, `admin`.

## Основные сущности БД

Минимальные таблицы:
- `users`
- `profiles`
- `specialists`
- `services`
- `availability_slots`
- `bookings`
- `payments`
- `files`
- `notifications`
- `admin_notes`

### Пример связей

- `users` 1:1 `profiles`
- `users` 1:0..1 `specialists`
- `specialists` 1:N `services`
- `specialists` 1:N `availability_slots`
- `users` 1:N `bookings` как клиент
- `specialists` 1:N `bookings` как исполнитель

## Контроллеры для MVP

### 1. AuthController

Методы:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

Что делает:
- регистрация;
- вход;
- получение текущего пользователя;
- обновление access token.

### 2. UsersController

Методы:
- `GET /users/me`
- `PATCH /users/me`
- `GET /users/:id`

Что делает:
- отдаёт профиль;
- обновляет имя, контакты, timezone, avatar.

### 3. SpecialistsController

Методы:
- `GET /specialists`
- `GET /specialists/:id`
- `POST /specialists`
- `PATCH /specialists/:id`
- `PATCH /specialists/:id/status`

Что делает:
- список специалистов;
- фильтрация;
- публичная карточка;
- создание/редактирование анкеты;
- модерация статуса.

### 4. ServicesController

Методы:
- `GET /services`
- `POST /services`
- `PATCH /services/:id`
- `DELETE /services/:id`

Что делает:
- хранит типы консультаций/услуг;
- цену, длительность, формат, описание.

### 5. AvailabilityController

Методы:
- `GET /availability/:specialistId`
- `POST /availability`
- `PATCH /availability/:slotId`
- `DELETE /availability/:slotId`

Что делает:
- отдаёт свободные окна;
- позволяет специалисту настроить график.

### 6. BookingsController

Методы:
- `GET /bookings/me`
- `GET /bookings/:id`
- `POST /bookings`
- `PATCH /bookings/:id/status`
- `POST /bookings/:id/cancel`

Что делает:
- создание записи;
- изменение статуса;
- история клиента и специалиста.

Статусы:
- `pending`
- `confirmed`
- `cancelled`
- `completed`
- `no_show`

### 7. AdminController

Методы:
- `GET /admin/users`
- `GET /admin/bookings`
- `GET /admin/specialists`
- `PATCH /admin/users/:id/role`
- `PATCH /admin/specialists/:id/approve`

Что делает:
- административные списки;
- модерация;
- ручное управление ролями и статусами.

### 8. FilesController

Методы:
- `POST /files/upload`
- `DELETE /files/:id`

Для MVP можно хранить файлы:
- в S3-compatible storage;
- или локально, если это dev-этап.

## Что React должен получать от backend

React не должен знать внутреннюю логику сервера. Он должен получать готовые DTO.

### Основные данные для UI

1. Авторизация
- текущий пользователь;
- роль;
- токены/сессия;
- флаг onboarding completed.

2. Главная страница / каталог
- список специалистов;
- категории;
- фильтры;
- минимальные карточки.

3. Публичная страница специалиста
- bio;
- специализация;
- стоимость;
- доступные слоты;
- отзывы позже.

4. Личный кабинет клиента
- мои записи;
- upcoming / past;
- профиль;
- избранное позже.

5. Кабинет специалиста
- своё расписание;
- входящие записи;
- статусы;
- редактирование анкеты.

6. Админка
- пользователи;
- специалисты;
- заявки;
- статусы и фильтры.

## Пример DTO для React

### SpecialistCardDto

```ts
export type SpecialistCardDto = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  title: string;
  shortBio: string;
  tags: string[];
  priceFrom?: number;
  currency: string;
  rating?: number;
  isVerified: boolean;
};
```

### BookingDto

```ts
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

## Функционал React по модулям

### Публичная часть
- landing / home;
- каталог;
- карточка специалиста;
- логин / регистрация.

### Client app
- dashboard;
- список записей;
- создание записи;
- редактирование профиля.

### Specialist app
- dashboard;
- календарь;
- управление слотами;
- управление услугами;
- редактирование профиля.

### Admin app
- таблицы пользователей;
- таблицы записей;
- модерация специалистов.

## Рекомендуемая структура React

```txt
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
  api/
```

Пример:
- `entities/user`
- `entities/booking`
- `entities/specialist`
- `features/auth/login`
- `features/booking/create-booking`
- `widgets/header`
- `widgets/sidebar`
- `shared/ui`
- `shared/lib`

## API client для React

Что нужно сразу:
- один `apiClient` с baseURL;
- автоматическая подстановка access token;
- interceptor для 401 и refresh;
- типизированные функции по модулям.

Пример модулей:
- `authApi`
- `usersApi`
- `specialistsApi`
- `bookingsApi`
- `availabilityApi`
- `adminApi`

## Что можно отложить после MVP

Не обязательно делать в первой версии:
- WebSocket;
- полноценный чат;
- сложную RBAC-систему;
- payments в полном виде;
- аналитику в real-time;
- рекомендательную систему;
- микросервисы.

## Что важно не переусложнить

Не делать сразу:
- микросервисную архитектуру;
- CQRS/event sourcing;
- отдельный BFF без причины;
- слишком много ролей и статусов;
- 20 таблиц ради теории.

## Практический план запуска

### Этап 1
- поднять backend;
- подключить PostgreSQL;
- настроить Prisma;
- создать auth, users, specialists, bookings.

### Этап 2
- добавить availability и services;
- подключить file upload;
- собрать личные кабинеты.

### Этап 3
- добавить admin endpoints;
- ввести модерацию;
- добавить уведомления.

## Рекомендуемый вывод

Для MVP нужен **обычный монолитный backend** с хорошей модульной структурой.

Оптимальная формула:
- один backend-сервис;
- PostgreSQL сразу;
- Prisma;
- JWT auth;
- React получает готовые DTO;
- 6–8 контроллеров достаточно на старт.
