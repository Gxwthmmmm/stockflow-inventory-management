# StockFlow

A multi-tenant SaaS inventory management MVP built for the Wexa AI Systems Software Developer Intern assessment.

## Features
- Email/password signup and login (bcrypt password hashing, JWT authentication).
- Organization created atomically at signup; one owner per organization for this MVP.
- Organization-scoped product CRUD and per-organization SKU uniqueness.
- Dashboard: product count, total units, low-stock count and watchlist.
- Product search by name or SKU.
- Organization-level default low-stock threshold and optional product override.
- Responsive React + TypeScript interface.

## Stack
React, TypeScript, Vite, Node.js, Express, PostgreSQL, Zod, JWT, bcryptjs.

## Run locally
Requirements: Node.js 20+ and PostgreSQL.

1. Create a PostgreSQL database named stockflow_db.
2. Run backend/src/db/schema.sql against that database.
3. In backend, copy .env.example to .env and set DATABASE_URL and a random JWT_SECRET of at least 32 characters.
4. Run: npm install && npm run dev (from backend).
5. In frontend, run: npm install && npm run dev.
6. Open the Vite URL (normally http://localhost:5173).

API health check: GET http://localhost:5000/api/health

## API
POST /api/auth/signup { email, password, organizationName }
POST /api/auth/login { email, password }
GET /api/auth/me
GET /api/dashboard
GET /api/products?search=
POST /api/products
GET /api/products/:id
PATCH /api/products/:id
DELETE /api/products/:id
GET /api/settings
PATCH /api/settings { default_low_stock_threshold }

Protected routes require Authorization: Bearer <token>.

## Tenant isolation
The organization ID is derived exclusively from the verified JWT. Product and settings queries scope every read/write by that organization ID; client-provided organization IDs are never trusted. A composite unique constraint enforces SKU uniqueness per organization. Signup uses a transaction to create the organization, user, and settings atomically.

## Deployment
render.yaml is provided as a Render blueprint starting point. Create the services and managed database, then set the API FRONTEND_URL and frontend VITE_API_URL values using the deployed service URLs. Deployment requires connecting/authorizing a hosting account; no hosting credentials are stored in this repository.

## Explicitly out of scope
Multi-warehouse, variants, categories, product images, suppliers, purchase orders, order management, integrations, billing, staff accounts, password reset, imports, and detailed stock movement history.
