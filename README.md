# Агрегатор службы доставки

MVP-система доставки еды: бизнес-кабинет, интерфейс курьера и витрина для покупателей.

## Технологии

| Слой | Технология |
|------|-----------|
| Backend | Node.js + Express |
| БД | PostgreSQL |
| ORM | Prisma |
| Frontend | React + Vite |
| Авторизация | JWT |

## Структура проекта

```
/
├── backend/
│   ├── src/
│   │   ├── index.js            # Entry point
│   │   ├── middleware/auth.js  # JWT verification
│   │   └── routes/
│   │       ├── auth.js         # POST /register, /login
│   │       ├── business.js     # GET/POST /business, /products
│   │       ├── orders.js       # GET/POST /orders
│   │       └── courier.js      # GET/POST /courier/shift
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── auth/           # Login, Register
│       │   ├── customer/       # BusinessList, Menu, MyOrders
│       │   ├── courier/        # ShiftControl, AvailableOrders, ActiveOrder
│       │   └── business/       # Dashboard, Products
│       ├── contexts/AuthContext.jsx
│       ├── api/client.js
│       └── components/
└── docker-compose.yml
```

## Быстрый старт (Docker)

```bash
# Поднять БД + бэкенд
docker-compose up -d

# Применить миграции и заполнить тестовыми данными
docker-compose exec backend npx prisma migrate dev --name init
docker-compose exec backend node prisma/seed.js

# Запустить фронтенд
cd frontend
npm install
npm run dev
```

Открыть: http://localhost:5173

## Локальный запуск (без Docker)

### 1. База данных

Нужен PostgreSQL. Создайте БД `delivery`.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Укажите DATABASE_URL и JWT_SECRET в .env

npm install
npx prisma migrate dev --name init
node prisma/seed.js
npm run dev
```

Backend запустится на http://localhost:3001

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Фронтенд запустится на http://localhost:5173 (запросы к API проксируются на :3001).

## Demo аккаунты (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| Бизнес (пицца) | pizza@demo.com | demo123 |
| Бизнес (суши) | sushi@demo.com | demo123 |
| Курьер | courier@demo.com | demo123 |
| Покупатель | customer@demo.com | demo123 |

## API

| Метод | Endpoint | Роль | Описание |
|-------|----------|------|----------|
| POST | /api/auth/register | — | Регистрация |
| POST | /api/auth/login | — | Вход |
| GET | /api/business | — | Список заведений |
| POST | /api/business | BUSINESS | Создать заведение |
| GET | /api/business/my | BUSINESS | Своё заведение |
| GET | /api/business/my/orders | BUSINESS | Заказы заведения |
| GET | /api/business/:id/products | — | Меню заведения |
| POST | /api/products | BUSINESS | Добавить позицию |
| DELETE | /api/products/:id | BUSINESS | Удалить позицию |
| POST | /api/orders | CUSTOMER | Создать заказ |
| GET | /api/orders/my | CUSTOMER | Мои заказы |
| GET | /api/orders/available | COURIER | Доступные заказы |
| POST | /api/orders/:id/accept | COURIER | Принять заказ |
| PATCH | /api/orders/:id/status | COURIER | Обновить статус |
| GET | /api/courier/shift | COURIER | Статус смены |
| POST | /api/courier/shift/start | COURIER | Начать смену |
| POST | /api/courier/shift/stop | COURIER | Завершить смену |
| GET | /api/courier/orders | COURIER | Мои доставки |
