E-commerce Order Processing API (ACID-Compliant)

A robust, transactional backend API built with Node.js, Express, PostgreSQL, and Docker.
Implements ACID-compliant transactions, row-level locking, and idempotent operations to ensure data integrity for e-commerce workflows.

Features

Dockerized app + PostgreSQL with health checks

Database schema via migrations

Automatic seeding for testing

ACID order creation with inventory locking

Rollback on failure

Idempotent order cancellation

Clean REST APIs

Tech Stack

Node.js + Express

PostgreSQL

node-pg-migrate

Docker & Docker Compose

Project Structure
ecommerce-order-api/
├── app/
│   └── index.js
├── db/
│   ├── migrations/
│   └── seeds/
│       └── 01_seed_data.sql
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── submission.json
├── package.json
└── README.md

Environment Variables

Create a local .env (do not commit):

API_PORT=3000
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ecommerce
DATABASE_URL=postgresql://postgres:postgres@db:5432/ecommerce

Run the Application
docker-compose up --build


Run migrations and seed data:

docker exec -it ecommerce_app npx node-pg-migrate up -m db/migrations
docker exec -i postgres_db psql -U postgres -d ecommerce < db/seeds/01_seed_data.sql

API Endpoints
Health

GET /health

{ "status": "ok", "db": "healthy" }

Products

GET /api/products

Create Order (Transactional)

POST /api/orders

{
  "userId": 1,
  "items": [
    { "productId": 1, "quantity": 1 }
  ]
}


Response:

{
  "orderId": 1,
  "status": "processing",
  "totalAmount": 75000
}

Get Order Details

GET /api/orders/:orderId

Cancel Order (Idempotent)

PUT /api/orders/:orderId/cancel

Transaction Guarantees

Uses BEGIN / COMMIT / ROLLBACK

Row-level locking with SELECT ... FOR UPDATE

Stock never goes negative

Failed operations rollback completely

Cancellation restores inventory exactly once

Submission Notes

.env is not committed

.env.example documents all required variables

submission.json maps to seeded data for automated testing

App runs with a single docker-compose up