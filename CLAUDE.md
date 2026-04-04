# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Delivery aggregator platform ("Флагман") with four user roles: **CUSTOMER**, **COURIER**, **BUSINESS**, **ADMIN**. Couriers use a separate mobile app; the web frontend only shows them a download page.

## Development setup

### Prerequisites
- Node.js, PostgreSQL running on localhost:5432
- Copy `backend/.env.example` → `backend/.env` and adjust values

### Backend (port 3001)
```bash
cd backend
npm install
npm run db:migrate    # apply Prisma migrations
npm run db:seed       # seed demo data (see accounts below)
npm run dev           # node --watch (hot reload)
```

### Frontend (port 5173)
```bash
cd frontend
npm install
npm run dev           # Vite dev server with /api proxy → localhost:3001
```

### Database commands
```bash
cd backend
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:migrate    # create + apply a new migration
```

## Architecture

### Backend (`backend/src/`)
Express app with JWT auth and Prisma ORM (PostgreSQL).

- `index.js` — app entry point, mounts all routers
- `middleware/auth.js` — `verifyToken` (JWT decode + DB block-check → `req.user`) and `requireRole(...roles)` factory
- `routes/auth.js` — `POST /api/auth/register`, `POST /api/auth/login`
- `routes/business.js` — mounted at `/api`; public business/product listing + BUSINESS-only CRUD for their own business, products, trading points, and orders
- `routes/orders.js` — mounted at `/api/orders`; CUSTOMER creates/cancels orders; COURIER accepts and advances status (`CREATED → ACCEPTED → DELIVERING → DONE`)
- `routes/courier.js` — shift start/stop and courier's accepted orders
- `routes/admin.js` — stats, full user/business/order listing, block toggles (ADMIN role only)

**Auth flow**: JWT is signed on login/register with `{ id, email, role, name }`, expires in 7 days. Every protected request hits the DB to check `isBlocked`.

**ADMIN accounts** cannot be created through the API — they must be inserted directly into the database or added to `prisma/seed.js`.

### Frontend (`frontend/src/`)
React 18 + React Router v6 + Axios.

- `api/client.js` — axios instance with `baseURL: '/api'`; attaches `Authorization: Bearer <token>` from `localStorage`; clears token on 401
- `contexts/AuthContext.jsx` — `useAuth()` hook; stores `token`/`user` in `localStorage`
- `components/ProtectedRoute.jsx` — wraps routes with role check, redirects to `/login` if unauthenticated
- `App.jsx` — role-based routing: `/shops*` (CUSTOMER), `/courier` (COURIER, shows download page), `/business*` (BUSINESS), `/admin*` (ADMIN)

**Vite proxy**: all `/api` requests are proxied to `http://localhost:3001` (overridable via `VITE_API_PROXY_TARGET` env var).

### Data model (Prisma schema)
| Model | Key fields |
|---|---|
| `User` | `role` (ADMIN/COURIER/CUSTOMER/BUSINESS), `isBlocked` |
| `Business` | one-to-one with `User` (ownerId), has `products`, `orders`, `tradingPoints` |
| `Product` | belongs to one `Business` |
| `Order` | `status` enum, `customerId`, `courierId?`, `businessId` |
| `OrderItem` | join of `Order` × `Product` with `quantity` |
| `CourierShift` | one-to-one with `User` (courier), `isActive` |

Courier can only accept an order if their shift `isActive`. The accept endpoint uses `updateMany` on `status: 'CREATED'` for atomic race protection.

## Demo accounts (after seed)
| Email | Password | Role |
|---|---|---|
| pizza@demo.com | demo123 | BUSINESS |
| sushi@demo.com | demo123 | BUSINESS |
| courier@demo.com | demo123 | COURIER |
| customer@demo.com | demo123 | CUSTOMER |
