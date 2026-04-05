# Флагман — агрегатор доставки

Платформа доставки еды с четырьмя ролями: **покупатель**, **курьер**, **бизнес**, **администратор**.

**Production:**
- Frontend: [umirhack-teronit.netlify.app](https://umirhack-teronit.netlify.app/)
- Backend: [umirhack-backend.onrender.com](https://umirhack-backend.onrender.com)

## Стек

| Слой        | Технология        |
| ----------- | ----------------- |
| Backend     | Node.js + Express |
| БД          | PostgreSQL        |
| ORM         | Prisma            |
| Frontend    | React 18 + Vite   |
| Авторизация | JWT (7 дней)      |

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
│       ├── components/ProtectedRoute.jsx
│       ├── App.jsx               # Role-based routing
│       └── pages/
│           ├── auth/             # Login, Register
│           ├── customer/         # BusinessList, Menu, MyOrders
│           ├── courier/          # ShiftControl, AvailableOrders, ActiveOrder
│           ├── business/         # Dashboard, Products, BusinessSettings
│           └── admin/            # AdminDashboard, Users, Businesses, Orders
└── docker-compose.yml
```

## Быстрый старт (Docker)

```bash
docker compose up -d --build
```

При старте бэкенд автоматически:
1. Дожидается готовности Postgres
2. Применяет миграции (`prisma db push`)
3. Заполняет демо-данные (`node prisma/seed.js`)

| Сервис   | URL                         |
| -------- | --------------------------- |
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:3001/health |

Повторное заполнение демо-данных:

```bash
docker compose exec backend node prisma/seed.js
```

## Локальный запуск (без Docker)

### Backend

```bash
cd backend
cp .env.example .env          # задать DATABASE_URL и JWT_SECRET
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # порт 3001, hot reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # порт 5173, /api → localhost:3001
```

## Demo-аккаунты (после seed)

| Роль           | Email             | Пароль  |
| -------------- | ----------------- | ------- |
| Бизнес (пицца) | pizza@demo.com    | demo123 |
| Бизнес (суши)  | sushi@demo.com    | demo123 |
| Курьер         | courier@demo.com  | demo123 |
| Покупатель     | customer@demo.com | demo123 |

> Аккаунты ADMIN создаются только через БД или `prisma/seed.js`.

## Статусы заказа

```
CREATED → ACCEPTED → DELIVERING → DONE
CREATED → CANCELLED  (только покупатель, пока статус CREATED)
```

Курьер может принять заказ только при активной смене и отсутствии другого активного заказа.

## API

### Публичные

| Метод | Endpoint                    | Описание         |
| ----- | --------------------------- | ---------------- |
| POST  | /api/auth/register          | Регистрация      |
| POST  | /api/auth/login             | Вход             |
| GET   | /api/business               | Список заведений |
| GET   | /api/business/:id/products  | Меню заведения   |

### BUSINESS

| Метод          | Endpoint                        | Описание               |
| -------------- | ------------------------------- | ---------------------- |
| GET/POST/PATCH | /api/business/my                | Своё заведение         |
| GET/POST/DELETE| /api/business/my/trading-points | Торговые точки         |
| GET            | /api/business/my/orders         | Входящие заказы        |
| POST/PATCH/DELETE | /api/products               | Управление позициями   |

### CUSTOMER

| Метод | Endpoint               | Описание       |
| ----- | ---------------------- | -------------- |
| POST  | /api/orders            | Создать заказ  |
| GET   | /api/orders/my         | Мои заказы     |
| POST  | /api/orders/:id/cancel | Отменить заказ |

### COURIER

| Метод | Endpoint                  | Описание            |
| ----- | ------------------------- | ------------------- |
| POST  | /api/courier/shift/start  | Начать смену        |
| POST  | /api/courier/shift/stop   | Завершить смену     |
| GET   | /api/orders/available     | Доступные заказы    |
| POST  | /api/orders/:id/accept    | Принять заказ       |
| PATCH | /api/orders/:id/status    | Обновить статус     |
| GET   | /api/courier/orders       | Мои доставки        |

### ADMIN

| Метод | Endpoint               | Описание                     |
| ----- | ---------------------- | ---------------------------- |
| GET   | /api/admin/stats       | Статистика                   |
| GET   | /api/admin/users       | Список пользователей         |
| PATCH | /api/admin/users/:id/block | Блокировка пользователя  |
| GET   | /api/admin/businesses  | Список бизнесов              |
| GET   | /api/admin/orders      | Все заказы                   |
