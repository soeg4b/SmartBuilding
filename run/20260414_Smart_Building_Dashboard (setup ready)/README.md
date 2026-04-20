# Smart Building Dashboard

**Real-time IoT monitoring platform for commercial buildings** — unified energy management, environmental sensing, asset health tracking, and role-based dashboards in a single responsive web application.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-UNLICENSED-red)]()

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
  - [Docker (Recommended)](#docker-recommended)
  - [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

The Smart Building Dashboard consolidates fragmented building management systems — energy monitoring, environmental sensing, asset maintenance, and financial reporting — into a single responsive web application. It targets commercial buildings and smart hotels in Southeast Asia, providing tailored views for three user roles:

| Role | Focus |
|------|-------|
| **Financial Decision Maker** | Energy cost visibility, billing projections in IDR, anomaly highlights |
| **System Administrator** | Unified sensor monitoring, alert management, floor plan visualization |
| **Technician** | Equipment health tracking, mobile-responsive interface, alert acknowledgement |

The platform ingests IoT sensor data via MQTT, stores time-series readings in TimescaleDB, and pushes real-time updates to connected clients via Socket.IO.

---

## Key Features

- **Role-based dashboards** — Executive, SysAdmin, and Technician views with tailored KPIs
- **Real-time energy monitoring** — kWh consumption, power factor, peak load, billing projection in IDR
- **Environmental quality** — Temperature, humidity, CO₂/AQI per zone with threshold alerting
- **Asset health tracking** — Equipment inventory with Green/Yellow/Red health indicators and runtime metrics
- **Interactive floor plans** — SVG/PNG floor plan upload with drag-and-drop sensor placement
- **Configurable alerts** — Threshold-based rules with in-app notifications and email delivery
- **MQTT integration** — Sensor data ingestion via Mosquitto MQTT broker (QoS 1)
- **Real-time updates** — Socket.IO pushes live sensor data and alerts to connected dashboards
- **JWT authentication** — Access token in memory + httpOnly refresh cookie for security
- **RBAC authorization** — Three-tier role system with per-endpoint access control
- **Dark theme** — Optimized for control room and low-light environments

---

## Architecture

```
                                 ┌─────────────────────────┐
                                 │       Nginx             │
                                 │  (Reverse Proxy + TLS)  │
                                 └───────┬───────┬─────────┘
                                         │       │
                               ┌─────────▼──┐ ┌──▼──────────┐
                               │  Next.js   │ │  Express.js  │
                               │  Frontend  │ │  Backend API │
                               │  :3000     │ │  :4000       │
                               └─────┬──────┘ └──┬───┬───┬───┘
                                     │           │   │   │
                           ┌─────────┘    ┌──────┘   │   └──────┐
                           │              │          │          │
                 ┌─────────▼──────┐  ┌────▼─────┐ ┌─▼────┐ ┌───▼──────────┐
                 │  Socket.IO     │  │PostgreSQL│ │Redis │ │  Mosquitto   │
                 │  (embedded in  │  │+Timescale│ │:6379 │ │  MQTT Broker │
                 │   Express)     │  │  :5432   │ │      │ │  :1883       │
                 └────────────────┘  └──────────┘ └──────┘ └──────────────┘
                                                                  ▲
                                                                  │ MQTT
                                                           ┌──────┴───────┐
                                                           │  IoT Gateway │
                                                           │  (BMS/Sensors)│
                                                           └──────────────┘
```

**Data Flow**: IoT sensors → MQTT broker → Backend subscriber → TimescaleDB + Alert engine + Socket.IO broadcast → Frontend dashboards

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Node.js 18+, Express.js, TypeScript |
| Database | PostgreSQL 15 + TimescaleDB 2.x (time-series) |
| Cache | Redis 7 (rate limiting, session caching, alert dedup) |
| Messaging | Eclipse Mosquitto MQTT broker (QoS 1) |
| Real-time | Socket.IO (WebSocket with fallback) |
| ORM | Prisma 5 |
| Auth | JWT (jsonwebtoken) + bcrypt password hashing |
| Charts | Recharts |
| Validation | Zod |
| Testing | Vitest (unit/integration), Playwright (E2E), Supertest (API) |
| CI/CD | GitHub Actions |
| Containerization | Docker + Docker Compose |

---

## Prerequisites

- **Node.js** 18.0.0 or higher
- **Docker** and **Docker Compose** (for containerized setup)
- **PostgreSQL** 15+ with **TimescaleDB** extension (if running locally)
- **Redis** 7+ (if running locally)
- **Eclipse Mosquitto** MQTT broker (if running locally)

---

## Quick Start

### Docker (Recommended)

The fastest way to get the entire stack running:

```bash
# 1. Clone the repository
git clone <repository-url>
cd run/20260414_Smart_Building_Dashboard

# 2. Create environment file
cp .env.example .env

# 3. Edit .env — set required secrets
#    - POSTGRES_PASSWORD (required)
#    - JWT_SECRET (minimum 32 characters, required)
nano .env

# 4. Start all services
docker compose up -d

# 5. Wait for services to become healthy (~30 seconds)
docker compose ps

# 6. Run database migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# 7. Seed initial data (creates admin user and demo building)
docker compose exec backend npx ts-node src/database/seed.ts

# 8. Verify all services
bash infra/monitoring/healthcheck.sh

# 9. Access the application
#    Frontend: http://localhost:3000
#    Backend API: http://localhost:4000/api/v1/health
```

### Local Development

For development with hot-reloading:

```bash
# 1. Install dependencies (from project root)
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your local database, Redis, and MQTT connection details

# 3. Start infrastructure services (PostgreSQL, Redis, Mosquitto)
docker compose up -d postgres redis mosquitto

# 4. Generate Prisma client
npm run db:generate

# 5. Run database migrations
npm run db:migrate

# 6. Apply TimescaleDB-specific setup
psql -U sbd_user -d smart_building -f src/database/migrations/timescaledb-setup.sql

# 7. Seed initial data
npm run db:seed

# 8. Start development servers (backend + frontend)
npm run dev

# Backend runs on http://localhost:4000
# Frontend runs on http://localhost:3000
```

**Individual workspace commands:**

```bash
# Backend only
npm run dev:backend

# Frontend only
npm run dev:frontend

# Prisma Studio (database GUI)
npm run db:studio
```

---

## Environment Variables

All configuration is managed via environment variables. See [`.env.example`](.env.example) for the full template.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |
| `PORT` | No | `4000` | Backend API port |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend URL (for CORS configuration) |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (minimum 32 characters) |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token TTL |
| `MQTT_BROKER_URL` | No | `mqtt://localhost:1883` | MQTT broker connection URL |
| `MQTT_CLIENT_ID` | No | `smart-building-backend` | MQTT client identifier |
| `MQTT_TOPIC_PREFIX` | No | `building/` | Base topic prefix for MQTT subscriptions |
| `UPLOAD_DIR` | No | `./uploads` | Directory for floor plan file uploads |
| `MAX_FILE_SIZE` | No | `10485760` | Maximum upload file size in bytes (10 MB) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window (general) |
| `RATE_LIMIT_AUTH_MAX` | No | `5` | Max auth attempts per window |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `LOG_FORMAT` | No | `json` | Log format: `json`, `pretty` |

**Docker-specific variables** (used by `docker-compose.yml`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `POSTGRES_PASSWORD` | **Yes** | — | PostgreSQL password |
| `POSTGRES_DB` | No | `smart_building` | Database name |
| `POSTGRES_USER` | No | `sbd_user` | Database user |
| `POSTGRES_PORT` | No | `5432` | PostgreSQL host port |
| `REDIS_PORT` | No | `6379` | Redis host port |
| `MQTT_PORT` | No | `1883` | MQTT TCP host port |
| `MQTT_WS_PORT` | No | `9001` | MQTT WebSocket host port |
| `BACKEND_PORT` | No | `4000` | Backend host port |
| `FRONTEND_PORT` | No | `3000` | Frontend host port |

---

## API Endpoints

All API endpoints are prefixed with `/api/v1`. Endpoints (except login and refresh) require a `Bearer` token in the `Authorization` header.

| Module | Method | Path | Auth | Role Restriction |
|--------|--------|------|------|-----------------|
| **Auth** | POST | `/auth/login` | No | — |
| | POST | `/auth/register` | Yes | `sys_admin` |
| | POST | `/auth/refresh` | Cookie | — |
| | POST | `/auth/logout` | Yes | Any |
| | GET | `/auth/me` | Yes | Any |
| **Users** | GET | `/users` | Yes | `sys_admin` |
| | POST | `/users` | Yes | `sys_admin` |
| | GET | `/users/:id` | Yes | `sys_admin` |
| | PUT | `/users/:id` | Yes | `sys_admin` |
| | DELETE | `/users/:id` | Yes | `sys_admin` |
| **Energy** | GET | `/energy/consumption` | Yes | Any |
| | GET | `/energy/trends` | Yes | Any |
| | GET | `/energy/billing-projection` | Yes | `financial_decision_maker`, `sys_admin` |
| | GET | `/energy/tariffs` | Yes | `sys_admin` |
| | POST | `/energy/tariffs` | Yes | `sys_admin` |
| **Sensors** | GET | `/sensors` | Yes | `sys_admin`, `technician` |
| | GET | `/sensors/:id` | Yes | Any |
| | GET | `/sensors/:id/readings` | Yes | Any |
| **Zones** | GET | `/zones` | Yes | Any |
| | GET | `/zones/environmental-status` | Yes | Any |
| **Equipment** | GET | `/equipment` | Yes | `sys_admin`, `technician` |
| | POST | `/equipment` | Yes | `sys_admin` |
| | GET | `/equipment/:id` | Yes | `sys_admin`, `technician` |
| | PUT | `/equipment/:id` | Yes | `sys_admin` |
| | DELETE | `/equipment/:id` | Yes | `sys_admin` |
| | GET | `/equipment/:id/sensors` | Yes | Any |
| | GET | `/equipment/:id/metrics` | Yes | `sys_admin`, `technician` |
| **Buildings** | GET | `/buildings` | Yes | Any |
| | GET | `/buildings/:id` | Yes | Any |
| **Floors** | GET | `/floors` | Yes | Any |
| **Floor Plans** | GET | `/floor-plans` | Yes | Any |
| | POST | `/floor-plans` | Yes | `sys_admin` |
| | GET | `/floor-plans/:id` | Yes | Any |
| | DELETE | `/floor-plans/:id` | Yes | `sys_admin` |
| | GET | `/floor-plans/:id/placements` | Yes | Any |
| | POST | `/floor-plans/:id/placements` | Yes | `sys_admin` |
| **Alert Rules** | GET | `/alert-rules` | Yes | `sys_admin` |
| | POST | `/alert-rules` | Yes | `sys_admin` |
| | GET | `/alert-rules/:id` | Yes | `sys_admin` |
| | PUT | `/alert-rules/:id` | Yes | `sys_admin` |
| | DELETE | `/alert-rules/:id` | Yes | `sys_admin` |
| **Alerts** | GET | `/alerts` | Yes | `sys_admin`, `technician` |
| | GET | `/alerts/:id` | Yes | `sys_admin`, `technician` |
| | PUT | `/alerts/:id/acknowledge` | Yes | `sys_admin`, `technician` |
| | PUT | `/alerts/:id/resolve` | Yes | `sys_admin`, `technician` |
| **Notifications** | GET | `/notifications` | Yes | Any |
| | PUT | `/notifications/:id/read` | Yes | Any |
| | PUT | `/notifications/read-all` | Yes | Any |
| **Dashboard** | GET | `/dashboard/executive` | Yes | `financial_decision_maker` |
| | GET | `/dashboard/sysadmin` | Yes | `sys_admin` |
| | GET | `/dashboard/technician` | Yes | `technician` |
| **Health** | GET | `/health` | No | — |

For full request/response schemas and examples, see [docs/api-reference.md](docs/api-reference.md).

---

## Project Structure

```
20260414_Smart_Building_Dashboard/
├── .artifacts/              # Agent pipeline artifacts (internal)
├── src/
│   ├── frontend/            # Next.js 14 frontend application
│   │   ├── src/
│   │   │   ├── app/         # App Router pages and layouts
│   │   │   │   ├── login/           # Login page
│   │   │   │   └── (dashboard)/     # Dashboard route group (auth-protected)
│   │   │   ├── components/  # React components
│   │   │   │   ├── dashboard/       # Role-specific dashboard widgets
│   │   │   │   ├── layout/          # AppHeader, AppSidebar, BottomNav
│   │   │   │   └── ui/              # Shared UI (KpiCard, StatusBadge, etc.)
│   │   │   └── lib/         # API client, auth context, socket wrapper
│   │   └── tailwind.config.ts
│   ├── backend/             # Express.js backend API
│   │   └── src/
│   │       ├── server.ts            # App bootstrap + Socket.IO + MQTT
│   │       ├── config/              # Database, Redis, MQTT, logger config
│   │       ├── middleware/          # Auth, RBAC, rate limiter, validation
│   │       ├── modules/             # Feature modules
│   │       │   ├── auth/            # Authentication (login, register, refresh)
│   │       │   ├── users/           # User management (CRUD)
│   │       │   ├── energy/          # Energy consumption, trends, billing
│   │       │   ├── environmental/   # Sensors and zones
│   │       │   ├── assets/          # Equipment CRUD and health
│   │       │   ├── spatial/         # Buildings, floors, floor plans
│   │       │   ├── alerts/          # Alert rules, alerts, notifications
│   │       │   └── dashboard/       # Role-based dashboard aggregation
│   │       └── utils/               # Response helpers, pagination
│   ├── shared/              # Shared TypeScript types between frontend/backend
│   │   └── types/index.ts
│   └── database/            # Database schema and migrations
│       ├── schema.prisma            # Prisma schema (all models)
│       ├── seed.ts                  # Database seeding script
│       └── migrations/
│           └── timescaledb-setup.sql  # TimescaleDB hypertables and aggregates
├── tests/                   # Test suites
│   ├── unit/                # Vitest unit tests
│   ├── integration/         # Supertest API integration tests
│   └── e2e/                 # Playwright end-to-end tests
├── infra/                   # Infrastructure configuration
│   ├── docker/              # Dockerfiles and service configs
│   ├── ci/                  # GitHub Actions CI/CD pipelines
│   └── monitoring/          # Health check scripts
├── docs/                    # Documentation
├── docker-compose.yml       # Multi-service orchestration
├── package.json             # Root workspace configuration
├── vitest.config.ts         # Vitest test configuration
├── playwright.config.ts     # Playwright E2E configuration
└── .env.example             # Environment variable template
```

---

## Testing

The project uses three levels of testing:

### Unit Tests (Vitest)

Tests service logic, middleware, and validation schemas with mocked dependencies.

```bash
# Run all unit tests
npx vitest run tests/unit

# Run with coverage
npx vitest run --coverage

# Watch mode
npx vitest tests/unit
```

### Integration Tests (Supertest + Vitest)

Tests API endpoints with mocked service layer — no running database required.

```bash
# Run all integration tests
npx vitest run tests/integration
```

### End-to-End Tests (Playwright)

Tests complete user flows through the browser. Requires the full stack to be running.

```bash
# Prerequisites: start frontend (port 3000) and backend (port 4000)
npm run dev

# Run E2E tests
npx playwright test

# Run with UI mode
npx playwright test --ui
```

### Run All Tests

```bash
# Unit + integration tests
npm test

# Full suite (unit + integration + E2E)
npm test && npx playwright test
```

**Test coverage targets:**
- Unit: ≥80% line coverage
- Integration: All API routes covered
- E2E: 15+ critical user flow scenarios

---

## Deployment

For detailed deployment instructions, see [docs/deployment-guide.md](docs/deployment-guide.md).

### Production Deployment (Docker Compose)

```bash
# 1. Configure production environment
cp .env.example .env
# Set production values: strong JWT_SECRET, POSTGRES_PASSWORD, NODE_ENV=production

# 2. Build and start services
docker compose up -d --build

# 3. Run migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# 4. Seed initial admin user
docker compose exec backend npx ts-node src/database/seed.ts

# 5. Verify deployment
bash infra/monitoring/healthcheck.sh
```

### CI/CD Pipeline

The project includes GitHub Actions workflows:

- **CI** (`infra/ci/github-actions.yml`): Lint → Type Check → Test → Build → Docker Build/Push
- **CD** (`infra/ci/deploy.yml`): Staging (automatic) → Production (manual approval)

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/api-reference.md](docs/api-reference.md) | Full REST API reference with request/response examples |
| [docs/architecture.md](docs/architecture.md) | System architecture, data flow, and design decisions |
| [docs/deployment-guide.md](docs/deployment-guide.md) | Docker deployment, configuration, and troubleshooting |

---

## License

UNLICENSED — Proprietary software. All rights reserved.
