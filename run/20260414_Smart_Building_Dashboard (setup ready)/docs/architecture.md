# Architecture

**Smart Building Dashboard — System Architecture Documentation**

---

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Style](#architecture-style)
- [Component Diagram](#component-diagram)
- [Data Flow](#data-flow)
- [Technology Choices](#technology-choices)
- [Module Structure](#module-structure)
- [Database Architecture](#database-architecture)
- [Authentication & Security](#authentication--security)
- [Real-Time Communication](#real-time-communication)
- [Design Decisions (ADRs)](#design-decisions)

---

## System Overview

The Smart Building Dashboard is a full-stack IoT monitoring platform that consolidates building management systems into a single responsive web application. It follows a **modular monolith** backend architecture connected to a **Next.js** frontend via REST APIs and WebSocket.

The platform serves three user personas:

1. **Financial Decision Makers** — Executive dashboards with energy cost visibility and billing projections
2. **System Administrators** — Unified sensor monitoring, alert management, and configuration
3. **Technicians** — Mobile-responsive equipment health tracking and alert workflows

### Scope (MVP)

- Single-building real-time monitoring (expandable to 2–3 pilot buildings)
- Unidirectional data flow: IoT sensors → Dashboard (no device control)
- Three user roles with RBAC
- Energy, environmental, asset, spatial, and alert modules
- REST API + WebSocket for real-time push
- Docker-based deployment

---

## Architecture Style

**Modular Monolith** — The backend is a single Express.js process organized into feature modules with clear boundaries.

**Rationale**: For an MVP targeting 2–3 buildings with a small team (<5 developers), a modular monolith avoids the operational overhead of microservices (service discovery, distributed tracing, inter-service communication) while keeping clear module boundaries for future extraction.

Each backend module follows a consistent internal structure:

```
modules/<feature>/
├── <feature>.routes.ts        # Express router with middleware
├── <feature>.controller.ts    # Request handling, response formatting
├── <feature>.service.ts       # Business logic, database queries
└── <feature>.validation.ts    # Zod schemas for input validation
```

---

## Component Diagram

```
                                    ┌─────────────────────────┐
                                    │       Nginx             │
                                    │  (Reverse Proxy + TLS)  │
                                    │       :80/:443          │
                                    └───────┬───────┬─────────┘
                                            │       │
                                  ┌─────────▼──┐ ┌──▼──────────┐
                                  │  Next.js   │ │  Express.js  │
                                  │  Frontend  │ │  Backend API │
                                  │  :3000     │ │  :4000       │
                                  │            │ │              │
                                  │ App Router │ │ REST API     │
                                  │ Tailwind   │ │ Socket.IO    │
                                  │ Recharts   │ │ MQTT Sub     │
                                  └─────┬──────┘ └──┬───┬───┬───┘
                                        │           │   │   │
                              ┌─────────┘    ┌──────┘   │   └──────┐
                              │              │          │          │
                    ┌─────────▼──────┐  ┌────▼─────┐ ┌─▼────┐ ┌───▼──────────┐
                    │  Socket.IO     │  │PostgreSQL│ │Redis │ │  Mosquitto   │
                    │  (embedded in  │  │ 15 +     │ │  7   │ │  MQTT Broker │
                    │   Express)     │  │TimescaleDB│ │:6379 │ │  :1883       │
                    └────────────────┘  │  :5432   │ │      │ │  :9001 (WS)  │
                                        └──────────┘ └──────┘ └──────────────┘
                                                                     ▲
                                                                     │ MQTT v5
                                                                     │ QoS 1
                                                              ┌──────┴───────┐
                                                              │  IoT Gateway │
                                                              │  (BMS/Sensors)│
                                                              └──────────────┘
```

### Port Assignments

| Service | Port | Protocol |
|---------|------|----------|
| Nginx (reverse proxy) | 80 / 443 | HTTP / HTTPS |
| Next.js Frontend | 3000 | HTTP |
| Express.js Backend API | 4000 | HTTP + WS |
| PostgreSQL + TimescaleDB | 5432 | TCP |
| Redis | 6379 | TCP |
| Mosquitto MQTT (TCP) | 1883 | MQTT |
| Mosquitto MQTT (WebSocket) | 9001 | WS |

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Next.js Frontend** | Responsive SPA with SSR; role-based dashboards; data visualization (Recharts); floor plan viewer; auth UI |
| **Express.js Backend** | REST endpoints; JWT auth + RBAC middleware; business logic; PDF generation; email dispatch |
| **MQTT Subscriber** | Connects to Mosquitto; parses/validates messages; writes to TimescaleDB; triggers alert engine; broadcasts via Socket.IO |
| **Mosquitto Broker** | Receives sensor data from IoT gateways; routes messages to subscriber service |
| **PostgreSQL** | Relational data: users, buildings, floors, zones, equipment, alert rules |
| **TimescaleDB** | Time-series data: `sensor_readings` hypertable; continuous aggregates; compression/retention policies |
| **Redis** | Rate limiting counters; alert deduplication cache; Socket.IO adapter for horizontal scaling readiness |
| **Socket.IO** | Real-time push of sensor data, alerts, and system events to connected frontend clients |
| **Nginx** | TLS termination, reverse proxy routing, WebSocket upgrade handling |

---

## Data Flow

### Sensor Data Ingestion

```
IoT Sensor → MQTT Broker → Backend Subscriber → 3 parallel paths:
                                                  ├─ TimescaleDB (store)
                                                  ├─ Alert Engine (evaluate)
                                                  └─ Socket.IO (broadcast)
```

**Detailed sequence per MQTT message:**

1. IoT sensor publishes a reading to Mosquitto on a structured topic (e.g., `building/<id>/sensor/<type>`)
2. Backend MQTT subscriber receives the message (QoS 1 — at least once delivery)
3. Message is validated against a JSON schema (type, range, required fields)
4. Valid message is normalized (unit conversion, timestamp alignment to UTC)
5. Three concurrent paths execute:
   - **Storage**: Batch-insert into TimescaleDB `sensor_readings` hypertable (batched every 1s or 100 messages)
   - **Alerting**: Alert engine evaluates value against active threshold rules. If breached → create alert → push notification via Socket.IO → queue email
   - **Broadcast**: Emit normalized reading to Socket.IO room for the building/zone
6. Invalid messages are logged to `dead_letter_queue` table

### Authentication Flow

```
Client                    Backend                 Database
  │                         │                        │
  │  POST /auth/login       │                        │
  ├────────────────────────►│  bcrypt.compare()      │
  │                         ├───────────────────────►│
  │                         │◄───────────────────────┤
  │  { accessToken }        │                        │
  │  + httpOnly cookie      │                        │
  │◄────────────────────────┤                        │
  │                         │                        │
  │  GET /api/v1/...        │                        │
  │  Authorization: Bearer  │  JWT verify            │
  ├────────────────────────►│  RBAC check            │
  │                         ├───────────────────────►│
  │  200 { data }           │                        │
  │◄────────────────────────┤                        │
  │                         │                        │
  │  POST /auth/refresh     │                        │
  │  (cookie auto-sent)     │  validate refresh      │
  ├────────────────────────►│  issue new access      │
  │  { new accessToken }    │                        │
  │◄────────────────────────┤                        │
```

**Token lifecycle:**
- Access token: 15 min expiry, stored in JavaScript closure (memory)
- Refresh token: 7 day expiry, stored as `httpOnly`, `Secure`, `SameSite=Strict` cookie
- On 401, frontend interceptor calls `/auth/refresh` before retrying
- On refresh failure, redirect to login page

### Alert Evaluation Flow

```
Incoming MQTT Reading
        │
        ▼
┌─────────────────────────┐
│ Load active alert rules │◄── Redis cache (TTL 60s) or DB fallback
│ for sensor type/id      │
└────────────┬────────────┘
             │
        For each rule:
             │
    ┌────────▼────────┐     No
    │ Value exceeds   │─────────► Skip
    │ threshold?      │
    └────────┬────────┘
             │ Yes
    ┌────────▼────────┐     Already active?
    │ Check dedup     │─────────► Skip (within cooldown window)
    │ cache (Redis)   │
    └────────┬────────┘
             │ New alert
    ┌────────▼────────┐
    │ Create alert    │
    │ + dedup key     │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │ Fan-out:        │
    │ • Socket.IO     │
    │ • Email queue   │
    └─────────────────┘
```

---

## Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Real-time transport | **Socket.IO** | Two-way communication for room subscriptions; built-in reconnection; fallback to long-polling |
| Repository structure | **Monorepo** (`src/shared/`) | Shared TypeScript types prevent frontend/backend drift; simpler CI |
| API style | **REST** | Well-understood, cacheable, sufficient for MVP query patterns |
| MQTT broker | **Self-hosted Mosquitto** | Free, lightweight, sufficient for 1,000 msg/s; Docker-native |
| Time-series database | **TimescaleDB** (PostgreSQL extension) | Familiar PostgreSQL interface; hypertables for high-volume writes; continuous aggregates for dashboards |
| ORM | **Prisma** | Type-safe queries; auto-generated client; schema-driven migrations |
| File storage | **Docker volume** (filesystem) | Simple for MVP; migration path to MinIO/S3 in Phase 2 |
| Token storage | **Access token in memory, refresh in httpOnly cookie** | Mitigates both XSS and CSRF |
| MQTT QoS | **QoS 1** (at least once) | Guaranteed delivery; duplicates handled by idempotent DB inserts |
| Monitoring | **Health check endpoint + structured JSON logging** | MVP-appropriate; Prometheus/Grafana deferred to Phase 2 |

---

## Module Structure

The backend is organized into 8 feature modules:

```
src/backend/src/
├── server.ts                # App bootstrap, Socket.IO, MQTT
├── config/
│   ├── index.ts             # Environment config (Zod-validated)
│   ├── database.ts          # Prisma client setup
│   ├── redis.ts             # ioredis client
│   ├── mqtt.ts              # MQTT client
│   └── logger.ts            # Winston logger
├── middleware/
│   ├── auth.ts              # JWT verification
│   ├── rbac.ts              # Role-based access control
│   ├── validate.ts          # Zod validation middleware
│   ├── rateLimiter.ts       # Redis-backed sliding window
│   └── errorHandler.ts      # Global error handler
├── modules/
│   ├── index.ts             # Route aggregator
│   ├── auth/                # Login, register, refresh, logout
│   ├── users/               # User CRUD (sys_admin only)
│   ├── energy/              # Consumption, trends, billing, tariffs
│   ├── environmental/       # Sensors and zones
│   ├── assets/              # Equipment CRUD, health, metrics
│   ├── spatial/             # Buildings, floors, floor plans
│   ├── alerts/              # Alert rules, alerts, notifications
│   └── dashboard/           # Role-based aggregation endpoints
└── utils/
    ├── apiResponse.ts       # Consistent response helpers
    └── pagination.ts        # Pagination utility
```

### Frontend Structure

```
src/frontend/src/
├── app/
│   ├── layout.tsx                    # Root layout (dark mode)
│   ├── globals.css                   # Tailwind directives
│   ├── login/page.tsx                # Login page
│   └── (dashboard)/                  # Auth-protected route group
│       ├── layout.tsx                # App shell (header, sidebar, bottom nav)
│       ├── dashboard/page.tsx        # Role-based dashboard router
│       ├── energy/page.tsx           # Energy management
│       ├── environment/page.tsx      # Environmental monitoring
│       ├── assets/page.tsx           # Equipment listing
│       ├── assets/[id]/page.tsx      # Equipment detail
│       ├── floor-plans/page.tsx      # Floor plan viewer
│       ├── alerts/page.tsx           # Alert management
│       └── settings/page.tsx         # Profile + user management
├── components/
│   ├── dashboard/                    # Executive, SysAdmin, Technician widgets
│   ├── layout/                       # AppHeader, AppSidebar, BottomNav
│   └── ui/                           # KpiCard, StatusBadge, LoadingSpinner
└── lib/
    ├── api.ts                        # Fetch-based API client with token refresh
    ├── auth.tsx                      # Auth context/provider
    └── socket.ts                     # Socket.IO client wrapper
```

---

## Database Architecture

### Engine Stack

- **PostgreSQL 15+** with **TimescaleDB 2.x** extension
- **Prisma 5** for ORM (standard queries)
- `$queryRaw` for TimescaleDB-specific operations (hypertables, `time_bucket`, continuous aggregates)

### Core Entities

```
Building (1) ──► Floor (N) ──► Zone (N) ──► Sensor (N)
                                               │
                              SensorReading (hypertable) ◄──┘
                                               │
Equipment (N) ◄── EquipmentSensor ──► Sensor   │
    │                                          │
    └──► EquipmentMetric (hypertable)          │
                                               │
AlertRule (N) ──► Alert (N) ──► Notification   │
                    │                          │
                    └──────── references ───────┘

User ──► RefreshToken
```

### Key Schema Details

| Entity | Storage | Volume Estimate |
|--------|---------|----------------|
| `users` | PostgreSQL | ~10–50 rows |
| `buildings` | PostgreSQL | 1–3 (pilot) |
| `floors` | PostgreSQL | ~5–15 per building |
| `zones` | PostgreSQL | ~3–10 per floor |
| `sensors` | PostgreSQL | ~500 total |
| `sensor_readings` | **TimescaleDB hypertable** | ~2.9M rows/day |
| `equipment` | PostgreSQL | ~25–100 |
| `equipment_metrics` | **TimescaleDB hypertable** | ~10K rows/day |
| `alert_rules` | PostgreSQL | ~20–100 |
| `alerts` | PostgreSQL | ~50–500/day |
| `notifications` | PostgreSQL | ~100–1000/day |

### TimescaleDB Configuration

- **Chunk interval**: 1 day (optimized for ~2.9M rows/day)
- **Retention policy**: Raw data 7 days; 1-min aggregates 90 days; hourly aggregates 2 years
- **Compression**: Enabled on chunks older than 7 days
- **Continuous aggregates**: Pre-computed 1-min and hourly averages

### Design Conventions

- All primary keys are UUIDs
- All timestamps use `timestamptz` (UTC storage)
- Soft deletes via `is_active` flag on users, sensors, and equipment
- Snake_case column names (Prisma `@map` for camelCase in code)
- Cascade deletes for parent-child relationships

The full schema is defined in `src/database/schema.prisma`. TimescaleDB-specific SQL is in `src/database/migrations/timescaledb-setup.sql`.

---

## Authentication & Security

### Token Security

| Aspect | Implementation |
|--------|---------------|
| Access token storage | JavaScript closure (memory) — not localStorage |
| Refresh token transport | httpOnly, Secure (production), SameSite=Strict cookie |
| Password hashing | bcrypt with 12 salt rounds |
| Refresh token storage | SHA-256 hash in database |
| JWT secret validation | Minimum 32 characters (Zod-enforced at startup) |

### API Security Layers

```
Request → Helmet → CORS → Body limit → Rate limiter → Auth → RBAC → Zod validation → Controller
```

1. **Helmet** — Security headers (CSP in production, X-Frame-Options, etc.)
2. **CORS** — Restricted to `FRONTEND_URL` with credentials
3. **Body size limit** — 1 MB max JSON body
4. **Rate limiting** — Redis-backed sliding window (100 req/15min general, 5 req/15min auth)
5. **JWT authentication** — Token verification on protected routes
6. **RBAC** — Role-based access control per endpoint
7. **Zod validation** — Request body, query params, and path params validation
8. **Error masking** — Production masks 500 error details

### Input Validation

All API inputs are validated via Zod schemas before reaching controllers. This includes:
- Request bodies (JSON payloads)
- Query parameters (pagination, filters, date ranges)
- Path parameters (UUID format validation)
- File uploads (extension whitelist, size limits)

### OWASP Compliance

| Control | Status |
|---------|--------|
| SQL injection | Mitigated — Prisma parameterized queries |
| XSS | Mitigated — React auto-escaping; JSON-only API |
| CSRF | Mitigated — SameSite=Strict cookie |
| Authentication failures | Mitigated — Rate limiting, non-enumerable errors |
| Broken access control | Enforced — RBAC on all routes |
| Security misconfiguration | Hardened — Helmet, env validation, non-root Docker |

---

## Real-Time Communication

### Socket.IO Architecture

Socket.IO is embedded in the Express.js server (shared port 4000).

```
Frontend ──► Socket.IO Client ──► Socket.IO Server ──► Room-based broadcast
                                        │
                                        ├── building:<uuid>  (building-level events)
                                        └── zone:<uuid>      (zone-level events)
```

### Connection Flow

1. Client connects with JWT in `handshake.auth.token`
2. Server-side middleware verifies JWT before allowing connection
3. Client emits `join:building` or `join:zone` with UUID
4. Server validates UUID format before joining room
5. Server broadcasts sensor readings and alerts to relevant rooms

### Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `join:building` | `buildingId: UUID` |
| Client → Server | `leave:building` | `buildingId: UUID` |
| Client → Server | `join:zone` | `zoneId: UUID` |
| Client → Server | `leave:zone` | `zoneId: UUID` |
| Server → Client | `sensor:reading` | `{ sensorId, value, timestamp }` |
| Server → Client | `alert:new` | `{ alertId, severity, message }` |
| Server → Client | `alert:updated` | `{ alertId, status }` |

---

## Design Decisions

### ADR-01: Socket.IO over SSE

**Decision**: Use Socket.IO for real-time communication instead of Server-Sent Events.

**Context**: The frontend needs to subscribe to specific building/floor rooms and send acknowledgment events.

**Rationale**: SSE is one-directional; Socket.IO provides two-way communication, built-in reconnection, room management, and fallback to long-polling.

### ADR-02: Monorepo with Shared Types

**Decision**: Use npm workspaces monorepo with `src/shared/` for TypeScript types.

**Rationale**: Shared types between frontend and backend prevent drift. Single CI pipeline. Small team makes monorepo manageable.

### ADR-03: REST for MVP (GraphQL Deferred)

**Decision**: REST API for all data access in MVP.

**Rationale**: Well-understood patterns, cacheable responses, and sufficient for current query patterns. GraphQL evaluated for Phase 2 if dashboard queries become complex.

### ADR-04: Self-hosted Mosquitto

**Decision**: Docker-containerized Mosquitto broker instead of managed MQTT service.

**Rationale**: Free, lightweight, sufficient for 1,000 msg/s. Managed EMQX Cloud adds unnecessary cost ($200+/mo) for pilot.

### ADR-05: TimescaleDB over InfluxDB

**Decision**: TimescaleDB (PostgreSQL extension) for time-series data instead of a dedicated TSDB.

**Rationale**: Single database engine; familiar SQL interface; Prisma can coexist; hypertables handle the expected write volume (~2.9M rows/day).

### ADR-06: Filesystem for Floor Plans (MVP)

**Decision**: Store uploaded floor plans on Docker volume instead of S3/MinIO.

**Rationale**: No external dependency for MVP. Files served via Express static middleware. Migration path: add MinIO container in Phase 2.

### ADR-07: Access Token in Memory

**Decision**: Store JWT access token in JavaScript closure, not localStorage.

**Rationale**: Prevents XSS-based token theft. Combined with httpOnly refresh cookie and SameSite=Strict, this provides defense in depth against both XSS and CSRF.
