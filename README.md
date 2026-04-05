# Флагман — агрегатор доставки

> Хакатон УМИР 2026 · команда Teronit

Платформа-агрегатор для служб доставки с четырьмя ролями: **покупатель**, **курьер**, **бизнес**, **администратор**.

**Production:**

- Frontend: [umirhack-teronit.netlify.app](https://umirhack-teronit.netlify.app/)
- Backend API: [umirhack-backend.onrender.com](https://umirhack-backend.onrender.com)

---

## Функциональность

### Покупатель (web)

- Регистрация и авторизация
- Просмотр списка заведений и их меню
- Добавление и сохранение адресов доставки (с выбором точки на карте)
- Создание заказа из товаров одного заведения
- Отслеживание статуса заказа в реальном времени
- Отмена заказа (пока статус `CREATED`)

### Бизнес (web)

- Регистрация и создание профиля организации
- Управление меню: добавление, редактирование, удаление позиций с ценами
- Управление торговыми точками
- Просмотр входящих заказов в реальном времени
- Полная изоляция данных между организациями

### Курьер (Android-приложение)

- Регистрация и авторизация
- Запуск и завершение смены
- Просмотр доступных заказов (автообновление каждые 2,5 с)
- До принятия: видна стоимость и точка отправки
- Принятие заказа (только 1 одновременно) — после принятия открывается адрес доставки и детали
- Смена статусов: `ACCEPTED → DELIVERING → DONE`
- История выполненных доставок и статистика заработка

### Администратор (web)

- Просмотр общей статистики (заказы, пользователи, выручка)
- Список пользователей с возможностью блокировки
- Список бизнесов с возможностью блокировки
- Просмотр всех заказов платформы

---

## Стек технологий

| Слой               | Технология                          |
| ------------------ | ----------------------------------- |
| Backend            | Node.js · Express · JWT             |
| База данных        | PostgreSQL                          |
| ORM                | Prisma                              |
| Frontend (web)     | React 18 · React Router v6 · Vite   |
| Мобильное (курьер) | Kotlin · Jetpack Compose · Retrofit |
| Авторизация        | JWT (7 дней)                        |
| Карты              | Leaflet (веб)                       |
| Деплой             | Docker · Netlify · Render           |

---

## Структура проекта

```
/
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point, монтирует роутеры
│   │   ├── middleware/auth.js    # verifyToken + requireRole
│   │   └── routes/
│   │       ├── auth.js           # /api/auth/*
│   │       ├── business.js       # /api/business/*, /api/products
│   │       ├── orders.js         # /api/orders/*
│   │       ├── courier.js        # /api/courier/*
│   │       ├── addresses.js      # /api/addresses/*
│   │       └── admin.js          # /api/admin/*
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   └── src/
│       ├── api/client.js         # Axios + Bearer token
│       ├── contexts/AuthContext.jsx
│       ├── components/
│       │   ├── ProtectedRoute.jsx
│       │   └── LeafletMap.jsx    # Выбор адреса на карте
│       └── pages/
│           ├── auth/             # Login, Register
│           ├── customer/         # BusinessList, Menu, MyOrders
│           ├── business/         # Dashboard, Products, BusinessSettings
│           └── admin/            # AdminDashboard, Users, Businesses, Orders
├── courier-android/              # Нативное Android-приложение (Kotlin)
│   └── app/
│       └── src/main/java/...    # Jetpack Compose экраны
└── docker-compose.yml
```

---

## Быстрый старт (Docker)

```bash
docker compose up -d --build
```

При старте бэкенд автоматически:

1. Дожидается готовности Postgres
2. Применяет схему (`prisma db push`)
3. Заполняет демо-данные (`node prisma/seed.js`)

| Сервис   | URL                          |
| -------- | ---------------------------- |
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:3001/health |

Повторный seed:

```bash
docker compose exec backend node prisma/seed.js
```

---

## Локальный запуск (без Docker)

### Требования

- Node.js ≥ 18
- PostgreSQL на `localhost:5432`

### Backend (порт 3001)

```bash
cd backend
cp .env.example .env       # задать DATABASE_URL и JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev                # hot reload через node --watch
```

### Frontend (порт 5173)

```bash
cd frontend
npm install
npm run dev                # /api → localhost:3001 (Vite proxy)
```

### Android-приложение

Откройте `courier-android/` в Android Studio и запустите на устройстве или эмуляторе. API endpoint задаётся на уровне сборки — по умолчанию указывает на production backend.

---

## Demo-аккаунты (после seed)

| Роль           | Email             | Пароль  |
| -------------- | ----------------- | ------- |
| Бизнес (пицца) | pizza@demo.com    | demo123 |
| Бизнес (суши)  | sushi@demo.com    | demo123 |
| Курьер         | courier@demo.com  | demo123 |
| Покупатель     | customer@demo.com | demo123 |

> Аккаунт ADMIN создаётся только через БД или `prisma/seed.js` — через API недоступен.

---

## Статусы заказа

```
CREATED → ACCEPTED → DELIVERING → DONE
CREATED → CANCELLED   (только покупатель, пока CREATED)
```

- Курьер принимает заказ атомарно (`updateMany` на `status: CREATED`) — защита от гонки
- Принять можно только при активной смене и при отсутствии другого активного заказа
- До принятия курьер видит только стоимость и точку отправки; адрес доставки раскрывается после принятия

---

## API

### Публичные

| Метод | Endpoint                   | Описание         |
| ----- | -------------------------- | ---------------- |
| POST  | /api/auth/register         | Регистрация      |
| POST  | /api/auth/login            | Вход             |
| GET   | /api/business              | Список заведений |
| GET   | /api/business/:id/products | Меню заведения   |

### BUSINESS

| Метод             | Endpoint                        | Описание             |
| ----------------- | ------------------------------- | -------------------- |
| GET/POST/PATCH    | /api/business/my                | Своё заведение       |
| GET/POST/DELETE   | /api/business/my/trading-points | Торговые точки       |
| GET               | /api/business/my/orders         | Входящие заказы      |
| POST/PATCH/DELETE | /api/products                   | Управление позициями |

### CUSTOMER

| Метод           | Endpoint               | Описание        |
| --------------- | ---------------------- | --------------- |
| POST            | /api/orders            | Создать заказ   |
| GET             | /api/orders/my         | Мои заказы      |
| POST            | /api/orders/:id/cancel | Отменить заказ  |
| GET/POST/DELETE | /api/addresses         | Адреса доставки |

### COURIER

| Метод | Endpoint                 | Описание         |
| ----- | ------------------------ | ---------------- |
| POST  | /api/courier/shift/start | Начать смену     |
| POST  | /api/courier/shift/stop  | Завершить смену  |
| GET   | /api/orders/available    | Доступные заказы |
| POST  | /api/orders/:id/accept   | Принять заказ    |
| PATCH | /api/orders/:id/status   | Обновить статус  |
| GET   | /api/courier/orders      | История доставок |

### ADMIN

| Метод | Endpoint                        | Описание                |
| ----- | ------------------------------- | ----------------------- |
| GET   | /api/admin/stats                | Статистика платформы    |
| GET   | /api/admin/users                | Список пользователей    |
| PATCH | /api/admin/users/:id/block      | Блокировка пользователя |
| GET   | /api/admin/businesses           | Список бизнесов         |
| PATCH | /api/admin/businesses/:id/block | Блокировка бизнеса      |
| GET   | /api/admin/orders               | Все заказы              |

---

## Модель данных

| Модель            | Ключевые поля                                                    |
| ----------------- | ---------------------------------------------------------------- |
| `User`            | `role` (ADMIN/COURIER/CUSTOMER/BUSINESS), `isBlocked`            |
| `Business`        | `ownerId`, `isBlocked`, продукты, заказы, торговые точки         |
| `TradingPoint`    | `businessId`, `name`, `address`                                  |
| `Product`         | `businessId`, `name`, `price`                                    |
| `Order`           | `status`, `customerId`, `courierId?`, `businessId`, `totalPrice` |
| `OrderItem`       | `orderId`, `productId`, `quantity`                               |
| `CourierShift`    | `courierId`, `isActive`                                          |
| `DeliveryAddress` | `customerId`, `address`                                          |

---

## Авторизация

JWT подписывается при логине/регистрации с полезной нагрузкой `{ id, email, role, name }`, срок действия — 7 дней. Каждый защищённый запрос проверяет флаг `isBlocked` в БД.

---

## Переменные окружения (`backend/.env`)

| Переменная     | Описание                         | Пример                                     |
| -------------- | -------------------------------- | ------------------------------------------ |
| `DATABASE_URL` | Строка подключения к PostgreSQL  | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET`   | Секрет для подписи JWT           | `change-me-in-production`                  |
| `PORT`         | Порт бэкенда (по умолчанию 3001) | `3001`                                     |
