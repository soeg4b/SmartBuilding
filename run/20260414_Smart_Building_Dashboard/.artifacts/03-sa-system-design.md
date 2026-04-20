# 03 — System Analyst: System Design — Strategic Smart Building Dashboard

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Created**: 2026-04-14
> **Author**: System Analyst Agent (Stage 3)
> **Status**: Ready for UI/UX, Data, and Coder Review
> **Input Artifact**: `.artifacts/02-pm-roadmap.md`

---

## 1. System Design

### 1.1 Scope and Boundaries

**In Scope (MVP — Phase 1)**:
- Single-building real-time monitoring dashboard (expandable to 2–3 pilot buildings)
- Unidirectional data flow: IoT sensors → MQTT → Backend → Database → Frontend (no device control)
- Three user roles with RBAC: `financial_decision_maker`, `sys_admin`, `technician`
- Energy monitoring, environmental sensing, asset health, spatial floor plans, threshold-based alerting
- REST API for all data access; WebSocket for real-time push
- PDF export for energy summary and alert history reports
- Docker-based deployment (single-server topology for pilot)

**Out of Scope (deferred to Phase 2+)**:
- Bidirectional device control (BACnet/Modbus write commands)
- AI/ML predictive analytics
- No-code automation engine (IFTTT rules)
- 3D digital twin / BIM import
- Multi-tenant SaaS architecture
- ESG/Greenship automated scoring
- Public API / webhook system
- Mobile native app (web-responsive only)

### 1.2 Major Components and Responsibilities

| Component | Responsibility |
|---|---|
| **Next.js 14 Frontend** | Responsive SPA with SSR; role-based dashboards; data visualization; floor plan viewer; auth UI |
| **Express.js Backend API** | REST endpoints; JWT auth + RBAC middleware; business logic; PDF generation; email dispatch |
| **MQTT Subscriber Service** | Connects to broker; parses/validates messages; writes to TimescaleDB; triggers alert engine; broadcasts via WebSocket |
| **MQTT Broker (Mosquitto)** | Receives sensor data from IoT gateways; routes messages to subscriber service |
| **PostgreSQL** | Relational data: users, buildings, floors, zones, assets, alert rules, configurations |
| **TimescaleDB (PG extension)** | Time-series data: sensor_readings hypertable; continuous aggregates; compression; retention policies |
| **Redis** | Session caching; rate limiting counters; WebSocket adapter for horizontal scaling readiness; alert deduplication cache |
| **Socket.IO Gateway** | Real-time push of sensor data, alerts, and system events to connected frontend clients |
| **File Storage (Docker Volume)** | Floor plan SVG/PNG storage for MVP (migration path to MinIO/S3 in Phase 2) |

### 1.3 External Integrations

| Integration | Protocol | Direction | MVP Status |
|---|---|---|---|
| IoT Sensor Gateways | MQTT v5 | Inbound only | Required |
| SMTP Email Service | SMTP / API | Outbound | Required (alert emails) |
| DNS / Reverse Proxy (Nginx) | HTTP/HTTPS | Inbound | Required (production) |
| BACnet/Modbus Gateways | BACnet-IP / Modbus TCP | Bidirectional | Phase 2 (abstraction layer designed now) |
| Object Storage (MinIO/S3) | S3 API | Read/Write | Phase 2 (filesystem for MVP) |

### 1.4 Design Assumptions and Constraints

1. **Single-server deployment** for pilot (all services on one Docker host). HA deferred to Phase 2.
2. **MQTT is the sole IoT protocol** for MVP. All pilot sensors must publish via MQTT.
3. **Internet connectivity is reliable** at pilot sites. No offline-first requirements for MVP.
4. **Maximum 3 buildings, ~500 sensors total** for pilot scope. Schema supports multi-building from day 1.
5. **English-only UI** for MVP. Bahasa Indonesia localization in Phase 2.
6. **No SSO/SAML/OAuth** for MVP. Email + password JWT auth only.
7. **Floor plans are static** SVG/PNG files. No real-time CAD rendering.
8. **Single timezone** per building deployment. No cross-timezone aggregation in MVP.

---

## 2. Flow Diagrams (Text Spec)

### 2.1 Main Workflow: Sensor Data Ingestion → Dashboard Display

```
┌──────────┐    MQTT v5     ┌─────────────┐    Subscribe    ┌──────────────────┐
│ IoT      │───────────────▶│  Mosquitto   │───────────────▶│  MQTT Subscriber │
│ Sensors  │  QoS 1         │  Broker      │  Topic Filter  │  Service         │
└──────────┘                └─────────────┘                └────────┬─────────┘
                                                                    │
                                                    ┌───────────────┼───────────────┐
                                                    ▼               ▼               ▼
                                            ┌──────────────┐ ┌───────────┐ ┌──────────────┐
                                            │ Validate &   │ │ Alert     │ │ Socket.IO    │
                                            │ Normalize    │ │ Engine    │ │ Broadcast    │
                                            └──────┬───────┘ └─────┬─────┘ └──────┬───────┘
                                                   │               │              │
                                                   ▼               ▼              ▼
                                            ┌──────────────┐ ┌───────────┐ ┌──────────────┐
                                            │ TimescaleDB  │ │ Alert DB  │ │ Frontend     │
                                            │ (hypertable) │ │ + Email   │ │ (live update)│
                                            └──────────────┘ └───────────┘ └──────────────┘
```

**Sequence (per MQTT message)**:
1. IoT sensor publishes reading to Mosquitto broker on structured topic.
2. MQTT Subscriber Service receives message (QoS 1 — at least once delivery).
3. Message is validated against JSON schema (type, range, required fields).
4. Valid message is normalized (unit conversion, timestamp alignment to UTC).
5. **Parallel fan-out** (3 concurrent paths):
   - **Path A**: Batch-insert into TimescaleDB `sensor_readings` hypertable (batched every 1s or 100 messages).
   - **Path B**: Alert engine evaluates value against active threshold rules. If breached → create alert record → push in-app notification via Socket.IO → queue email if severity ≥ configured level.
   - **Path C**: Broadcast normalized reading to Socket.IO room for the relevant building/zone (frontend clients receive live updates).
6. Invalid messages are logged to `dead_letter_queue` table with error reason.

### 2.2 Authentication Flow

```
┌──────────┐   POST /api/auth/login    ┌──────────┐   Verify password   ┌──────────┐
│ Frontend │──────────────────────────▶│ Auth     │──────────────────▶│ PostgreSQL│
│          │◀──────────────────────────│ Controller│◀──────────────────│ (users)  │
│          │   { accessToken,          └──────────┘   bcrypt.compare   └──────────┘
│          │     refreshToken }
│          │
│          │   Authorization: Bearer <accessToken>
│          │──────────────────────────▶┌──────────┐
│          │                           │ RBAC     │── Check role permissions
│          │◀──────────────────────────│ Middleware│── 403 if insufficient
│          │   200 OK / 403 Forbidden  └──────────┘
│          │
│          │   POST /api/auth/refresh
│          │──────────────────────────▶┌──────────┐
│          │◀──────────────────────────│ Refresh  │── Validate refresh token
│          │   { new accessToken }     │ Handler  │── Issue new access token
└──────────┘                           └──────────┘
```

**Token Lifecycle**:
- Access token: 15 min expiry, stored in memory (JavaScript variable, not localStorage/sessionStorage).
- Refresh token: 7 day expiry, stored as `httpOnly`, `Secure`, `SameSite=Strict` cookie.
- On 401 response, frontend interceptor calls `/api/auth/refresh` transparently before retrying.
- On refresh failure, redirect to login page.

### 2.3 Alert Evaluation Flow

```
Incoming MQTT Reading
        │
        ▼
┌─────────────────────────┐
│ Load active alert rules │◀── Redis cache (TTL 60s) or DB fallback
│ for sensor_id/type      │
└────────────┬────────────┘
             │
        ┌────▼────┐
        │ For each │
        │  rule    │
        └────┬────┘
             │
    ┌────────▼────────┐     No
    │ value {op} threshold?│─────▶ Skip
    └────────┬────────┘
             │ Yes
    ┌────────▼────────┐     Already active (dedup)?
    │ Check dedup     │─────▶ Skip (within cooldown window)
    │ cache (Redis)   │
    └────────┬────────┘
             │ New alert
    ┌────────▼────────┐
    │ Create alert    │── Insert into `alerts` table
    │ record          │── Set dedup key in Redis (TTL = cooldown period)
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │ Fan-out         │── Socket.IO: emit to building room
    │ notifications   │── Email queue: if severity ≥ rule.email_threshold
    └─────────────────┘
```

### 2.4 Alternate and Exception Flows

| Scenario | Handling |
|---|---|
| **Invalid MQTT message** (malformed JSON, missing fields) | Log to `dead_letter_queue` with error reason. Do not store. Increment error counter metric. |
| **TimescaleDB write failure** | Retry 3× with exponential backoff (100ms, 500ms, 2s). If all fail, log to dead letter queue. MQTT subscriber does not crash. |
| **WebSocket client disconnects** | Socket.IO handles reconnection automatically (client-side). Missed messages are not replayed (client fetches latest on reconnect via REST). |
| **Stale sensor data** (no message for > 5 min) | Frontend marks sensor as "stale" with warning badge. Backend exposes `/api/sensors/:id/status` with `lastSeen` timestamp. |
| **Email delivery failure** | Retry 3× via job queue. Log failure. In-app notification is always the primary channel. |
| **Duplicate MQTT message** (QoS 1 retry) | Idempotent write: `ON CONFLICT (sensor_id, timestamp) DO NOTHING` on TimescaleDB insert. |
| **Rate limit exceeded** (auth endpoints) | Return 429 with `Retry-After` header. Rate limits: 5 login attempts per 15 min per IP. |

---

## 3. High-Level Architecture

### 3.1 Architecture Style and Rationale

**Style**: Modular monolith (backend) + Next.js frontend, connected via REST + WebSocket.

**Rationale**: For an MVP targeting 2–3 buildings with a small team, a modular monolith avoids the operational overhead of microservices (service discovery, distributed tracing, inter-service communication) while keeping clear module boundaries for future extraction.

**Module boundaries inside the Express backend**:
```
src/backend/
├── modules/
│   ├── auth/          # JWT, RBAC, user management
│   ├── energy/        # Energy consumption, billing projection
│   ├── environmental/ # Temperature, humidity, CO2 readings
│   ├── assets/        # Equipment CRUD, health status, runtime
│   ├── spatial/       # Floor plans, sensor placement
│   ├── alerts/        # Rules, evaluation engine, notifications
│   ├── dashboard/     # Role-based aggregation endpoints
│   ├── reports/       # PDF generation
│   └── mqtt/          # MQTT subscriber, message parser, dead letter
├── middleware/        # Auth, RBAC, validation, error handler, rate limiter
├── shared/            # Types, utils, constants, DB client
├── websocket/         # Socket.IO setup, room management, event emitters
└── server.ts          # Express app bootstrap
```

### 3.2 Component Interaction Map

```
                                    ┌─────────────────────────┐
                                    │       Nginx             │
                                    │  (Reverse Proxy + SSL)  │
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

**Port Assignments**:
| Service | Port | Protocol |
|---|---|---|
| Nginx (proxy) | 80 / 443 | HTTP / HTTPS |
| Next.js Frontend | 3000 | HTTP |
| Express Backend API | 4000 | HTTP |
| Socket.IO | 4000 (shared with Express) | WS |
| PostgreSQL + TimescaleDB | 5432 | TCP |
| Redis | 6379 | TCP |
| Mosquitto MQTT | 1883 (plain), 8883 (TLS) | MQTT |
| Mosquitto WebSocket | 9001 | WS (optional, for browser MQTT debug) |

### 3.3 Architecture Decision Records (ADRs)

| ID | Decision | Choice | Rationale |
|---|---|---|---|
| ADR-01 | Real-time transport | **Socket.IO (WebSocket)** over SSE | Two-way communication needed: frontend must subscribe to specific building/floor rooms and send acknowledgment events. SSE is one-directional. Socket.IO provides built-in reconnection, room management, and fallback to long-polling. |
| ADR-02 | Repository structure | **Monorepo** with `src/shared/` | Shared TypeScript types between frontend and backend prevent drift. Simpler CI. MVP team is small (< 5 devs). |
| ADR-03 | API style | **REST** for MVP | Well-understood, cacheable, sufficient for MVP query patterns. GraphQL evaluated for Phase 2 if dashboard queries become complex. |
| ADR-04 | MQTT broker | **Self-hosted Mosquitto** in Docker | Free, lightweight, sufficient for 1,000 msg/s. Managed EMQX Cloud adds cost ($200+/mo) with no MVP benefit. Mosquitto config is version-controlled. |
| ADR-05 | File storage (floor plans) | **Docker volume (filesystem)** for MVP | Simple, no external dependency. Files served via Express static middleware. Migration path: add MinIO container in Phase 2, update upload service. |
| ADR-06 | Token storage | **Access token in memory, refresh token in httpOnly cookie** | Mitigates both XSS (access token not in storage) and CSRF (SameSite=Strict cookie). Access token passed via `Authorization` header. |
| ADR-07 | MQTT QoS | **QoS 1** (at least once) | Guaranteed delivery > raw speed for building monitoring. Duplicate handling via idempotent DB inserts (`ON CONFLICT DO NOTHING`). |
| ADR-08 | TimescaleDB chunk interval | **1 day** | Expected volume: ~500 sensors × 1 msg/15s = ~2.9M rows/day. 1-day chunks balance query performance and maintenance. |
| ADR-09 | Monitoring (MVP) | **Health check endpoint + structured JSON logging** | Prometheus/Grafana deferred to Phase 2. Structured logs enable future log aggregation. Health endpoint enables basic uptime monitoring. |
| ADR-10 | SVG sanitization | **DOMPurify server-side** | SVG files can contain embedded JavaScript (XSS vector). All uploaded SVGs are sanitized with DOMPurify before storage. PNG files validated via magic byte check. |

---

## 4. API Contract Specification

### 4.1 API Conventions

- **Base URL**: `/api/v1`
- **Content Type**: `application/json` (except file uploads: `multipart/form-data`)
- **Authentication**: `Authorization: Bearer <accessToken>` header on all protected routes
- **Pagination**: `?page=1&limit=20` → response includes `{ data: [], meta: { page, limit, total, totalPages } }`
- **Date format**: ISO 8601 (`2026-04-14T10:30:00Z`), all timestamps in UTC
- **Error response shape**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  }
}
```
- **HTTP Status Codes**: 200 (OK), 201 (Created), 204 (No Content), 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity), 429 (Too Many Requests), 500 (Internal Server Error)

### 4.2 Auth Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | Register new user (initial setup only) | None | — |
| POST | `/api/v1/auth/login` | Authenticate user, return tokens | None | — |
| POST | `/api/v1/auth/refresh` | Refresh access token | Cookie | — |
| POST | `/api/v1/auth/logout` | Invalidate refresh token | Bearer | Any |
| GET | `/api/v1/auth/me` | Get current user profile | Bearer | Any |

**POST `/api/v1/auth/login`**
```
Request:
{
  "email": "budi@example.com",
  "password": "securePassword123"
}

Response 200:
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "budi@example.com",
      "name": "Budi Santoso",
      "role": "financial_decision_maker",
      "buildingId": "uuid"
    },
    "accessToken": "eyJhbG..."
  }
}
// refreshToken set as httpOnly cookie
```

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/users` | List all users (paginated, filterable) | Bearer | sys_admin |
| POST | `/api/v1/users` | Create new user | Bearer | sys_admin |
| GET | `/api/v1/users/:id` | Get user details | Bearer | sys_admin |
| PUT | `/api/v1/users/:id` | Update user | Bearer | sys_admin |
| PATCH | `/api/v1/users/:id/status` | Activate/deactivate user | Bearer | sys_admin |

**POST `/api/v1/users`**
```
Request:
{
  "email": "rina@example.com",
  "name": "Rina Wijaya",
  "password": "tempPassword123",
  "role": "sys_admin",
  "buildingId": "uuid"
}

Response 201:
{
  "data": {
    "id": "uuid",
    "email": "rina@example.com",
    "name": "Rina Wijaya",
    "role": "sys_admin",
    "buildingId": "uuid",
    "isActive": true,
    "createdAt": "2026-04-14T10:00:00Z"
  }
}
```

### 4.3 Energy Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/energy/consumption` | Current energy consumption (real-time snapshot) | Bearer | Any |
| GET | `/api/v1/energy/trends` | Historical energy data with aggregation | Bearer | Any |
| GET | `/api/v1/energy/peak-load` | Peak load for selected period | Bearer | Any |
| GET | `/api/v1/energy/billing-projection` | Projected monthly billing in IDR | Bearer | financial_decision_maker, sys_admin |
| GET | `/api/v1/energy/tariffs` | Get configured energy tariffs | Bearer | sys_admin |
| PUT | `/api/v1/energy/tariffs` | Update energy tariff rates | Bearer | sys_admin |

**GET `/api/v1/energy/trends`**
```
Query params:
  ?buildingId=uuid
  &from=2026-04-07T00:00:00Z
  &to=2026-04-14T00:00:00Z
  &interval=daily          // hourly | daily | weekly | monthly
  &compare=previous_period // optional: overlay comparison

Response 200:
{
  "data": {
    "buildingId": "uuid",
    "interval": "daily",
    "series": [
      {
        "timestamp": "2026-04-07T00:00:00Z",
        "kwh": 1250.5,
        "powerFactor": 0.87,
        "peakKw": 420.3
      },
      ...
    ],
    "comparison": [  // present if compare param set
      {
        "timestamp": "2026-03-31T00:00:00Z",
        "kwh": 1310.2,
        "powerFactor": 0.85,
        "peakKw": 445.0
      },
      ...
    ],
    "summary": {
      "totalKwh": 8750.0,
      "avgPowerFactor": 0.86,
      "peakKw": 450.0,
      "peakTimestamp": "2026-04-10T14:32:00Z"
    }
  }
}
```

**GET `/api/v1/energy/billing-projection`**
```
Query params:
  ?buildingId=uuid
  &month=2026-04  // optional, defaults to current month

Response 200:
{
  "data": {
    "buildingId": "uuid",
    "month": "2026-04",
    "consumedKwh": 4500.0,
    "projectedKwh": 9200.0,
    "tariffPerKwh": 1444.70,          // IDR
    "projectedCostIdr": 13291240,      // IDR
    "lastMonthActualIdr": 12850000,    // IDR
    "variancePercent": 3.43,
    "daysElapsed": 14,
    "daysRemaining": 16,
    "updatedAt": "2026-04-14T10:30:00Z"
  }
}
```

### 4.4 Environmental Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/sensors` | List all sensors (paginated, filterable) | Bearer | sys_admin, technician |
| GET | `/api/v1/sensors/:id` | Get sensor details + latest reading | Bearer | Any |
| GET | `/api/v1/sensors/:id/readings` | Get sensor time-series data | Bearer | Any |
| GET | `/api/v1/zones` | List zones with current environmental status | Bearer | Any |
| GET | `/api/v1/zones/:id` | Get zone details with sensor readings | Bearer | Any |
| GET | `/api/v1/zones/:id/readings` | Get zone aggregate environmental readings | Bearer | Any |

**GET `/api/v1/zones`**
```
Query params:
  ?buildingId=uuid
  &floorId=uuid       // optional filter
  &status=warning     // optional: normal | warning | critical

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "Lobby - Ground Floor",
      "floorId": "uuid",
      "floorName": "Ground Floor",
      "status": "normal",
      "readings": {
        "temperature": { "value": 24.5, "unit": "°C", "status": "normal" },
        "humidity": { "value": 52, "unit": "%", "status": "normal" },
        "co2": { "value": 650, "unit": "ppm", "status": "normal", "aqiLabel": "Good" }
      },
      "sensorCount": 4,
      "lastUpdated": "2026-04-14T10:29:55Z"
    },
    ...
  ],
  "meta": { "page": 1, "limit": 20, "total": 12 }
}
```

**GET `/api/v1/sensors/:id/readings`**
```
Query params:
  ?from=2026-04-14T09:00:00Z
  &to=2026-04-14T10:00:00Z
  &interval=raw       // raw | 1min | 5min | 15min | hourly

Response 200:
{
  "data": {
    "sensorId": "uuid",
    "sensorType": "temperature",
    "unit": "°C",
    "readings": [
      { "timestamp": "2026-04-14T09:00:00Z", "value": 24.1 },
      { "timestamp": "2026-04-14T09:00:15Z", "value": 24.2 },
      ...
    ]
  }
}
```

### 4.5 Asset/CME Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/equipment` | List equipment (paginated, filterable) | Bearer | sys_admin, technician |
| POST | `/api/v1/equipment` | Create equipment record | Bearer | sys_admin |
| GET | `/api/v1/equipment/:id` | Get equipment details + health | Bearer | sys_admin, technician |
| PUT | `/api/v1/equipment/:id` | Update equipment record | Bearer | sys_admin |
| DELETE | `/api/v1/equipment/:id` | Soft-delete equipment | Bearer | sys_admin |
| GET | `/api/v1/equipment/:id/health` | Get health status + linked sensor data | Bearer | Any |
| GET | `/api/v1/equipment/:id/metrics` | Get runtime metrics time-series | Bearer | sys_admin, technician |
| POST | `/api/v1/equipment/:id/sensors` | Link sensor(s) to equipment | Bearer | sys_admin |
| DELETE | `/api/v1/equipment/:id/sensors/:sensorId` | Unlink sensor from equipment | Bearer | sys_admin |

**GET `/api/v1/equipment`**
```
Query params:
  ?buildingId=uuid
  &type=genset         // genset | pump | ahu | chiller | etc
  &healthStatus=red    // green | yellow | red
  &page=1&limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "name": "Genset #1 - Main Building",
      "type": "genset",
      "location": {
        "buildingId": "uuid",
        "buildingName": "Main Building",
        "floorId": "uuid",
        "floorName": "Basement",
        "zoneId": "uuid",
        "zoneName": "Generator Room"
      },
      "serialNumber": "GEN-2024-001",
      "installDate": "2024-01-15",
      "lastServiceDate": "2026-03-01",
      "healthStatus": "yellow",
      "metrics": {
        "runningHours": 4520,
        "hoursSinceService": 320,
        "fuelLevel": 45.0,
        "fuelUnit": "%"
      },
      "linkedSensorCount": 3,
      "isActive": true
    },
    ...
  ],
  "meta": { "page": 1, "limit": 20, "total": 25 }
}
```

### 4.6 Spatial Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/buildings` | List buildings | Bearer | Any |
| GET | `/api/v1/buildings/:id` | Get building details with floors | Bearer | Any |
| GET | `/api/v1/floors` | List floors (filterable by building) | Bearer | Any |
| GET | `/api/v1/floors/:id` | Get floor details with zones | Bearer | Any |
| GET | `/api/v1/floor-plans` | List floor plans | Bearer | Any |
| POST | `/api/v1/floor-plans` | Upload floor plan (multipart) | Bearer | sys_admin |
| PUT | `/api/v1/floor-plans/:id` | Replace floor plan file | Bearer | sys_admin |
| DELETE | `/api/v1/floor-plans/:id` | Delete floor plan | Bearer | sys_admin |
| GET | `/api/v1/floor-plans/:id/file` | Serve floor plan file | Bearer | Any |
| GET | `/api/v1/floor-plans/:id/sensors` | Get sensor placements for floor plan | Bearer | Any |
| PUT | `/api/v1/floor-plans/:id/sensors` | Batch update sensor placements | Bearer | sys_admin |

**PUT `/api/v1/floor-plans/:id/sensors`**
```
Request:
{
  "placements": [
    {
      "sensorId": "uuid",
      "x": 45.2,         // percentage of floor plan width (0–100)
      "y": 32.8,         // percentage of floor plan height (0–100)
      "rotation": 0       // degrees, optional
    },
    ...
  ]
}

Response 200:
{
  "data": {
    "floorPlanId": "uuid",
    "placementCount": 12,
    "placements": [ ... ]
  }
}
```

**POST `/api/v1/floor-plans`**
```
Request (multipart/form-data):
  file: <SVG or PNG file, max 10MB>
  buildingId: "uuid"
  floorId: "uuid"
  label: "Ground Floor - Main Building"

Response 201:
{
  "data": {
    "id": "uuid",
    "buildingId": "uuid",
    "floorId": "uuid",
    "label": "Ground Floor - Main Building",
    "fileType": "svg",
    "fileSize": 245000,
    "filePath": "/uploads/floor-plans/uuid.svg",
    "createdAt": "2026-04-14T10:00:00Z"
  }
}
```

### 4.7 Alert Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/alert-rules` | List alert rules | Bearer | sys_admin |
| POST | `/api/v1/alert-rules` | Create alert rule | Bearer | sys_admin |
| PUT | `/api/v1/alert-rules/:id` | Update alert rule | Bearer | sys_admin |
| PATCH | `/api/v1/alert-rules/:id/status` | Enable/disable rule | Bearer | sys_admin |
| DELETE | `/api/v1/alert-rules/:id` | Delete alert rule | Bearer | sys_admin |
| GET | `/api/v1/alerts` | List alerts (paginated, filterable) | Bearer | sys_admin, technician |
| GET | `/api/v1/alerts/:id` | Get alert details | Bearer | sys_admin, technician |
| PATCH | `/api/v1/alerts/:id/acknowledge` | Acknowledge alert | Bearer | sys_admin, technician |
| PATCH | `/api/v1/alerts/:id/resolve` | Resolve alert | Bearer | sys_admin, technician |
| GET | `/api/v1/notifications` | Get in-app notifications for current user | Bearer | Any |
| PATCH | `/api/v1/notifications/read` | Mark notifications as read | Bearer | Any |

**POST `/api/v1/alert-rules`**
```
Request:
{
  "name": "High Temperature Alert",
  "sensorType": "temperature",     // applies to all sensors of this type
  "sensorId": null,                 // or specific sensor UUID
  "buildingId": "uuid",
  "operator": ">",                  // >, <, >=, <=, ==
  "threshold": 30.0,
  "severity": "warning",           // info | warning | critical
  "cooldownMinutes": 15,           // suppress repeat alerts
  "emailNotification": true,
  "emailRecipients": ["rina@example.com"],
  "isActive": true
}

Response 201:
{
  "data": {
    "id": "uuid",
    "name": "High Temperature Alert",
    ...
    "createdAt": "2026-04-14T10:00:00Z",
    "createdBy": "uuid"
  }
}
```

**GET `/api/v1/alerts`**
```
Query params:
  ?buildingId=uuid
  &severity=critical           // info | warning | critical
  &status=active               // active | acknowledged | resolved
  &sensorType=temperature
  &from=2026-04-07T00:00:00Z
  &to=2026-04-14T00:00:00Z
  &page=1&limit=20

Response 200:
{
  "data": [
    {
      "id": "uuid",
      "ruleName": "High Temperature Alert",
      "severity": "warning",
      "status": "active",
      "sensorId": "uuid",
      "sensorName": "Temp Sensor - Lobby",
      "sensorType": "temperature",
      "currentValue": 31.2,
      "threshold": 30.0,
      "operator": ">",
      "unit": "°C",
      "message": "Temperature exceeded 30.0°C (current: 31.2°C)",
      "triggeredAt": "2026-04-14T10:15:00Z",
      "acknowledgedAt": null,
      "acknowledgedBy": null,
      "resolvedAt": null,
      "comment": null
    },
    ...
  ],
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

### 4.8 Dashboard Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/dashboard/executive` | Financial decision maker summary | Bearer | financial_decision_maker |
| GET | `/api/v1/dashboard/operations` | System admin operational overview | Bearer | sys_admin |
| GET | `/api/v1/dashboard/technician` | Technician task-focused summary | Bearer | technician |
| GET | `/api/v1/dashboard/summary` | Generic building summary (shared KPIs) | Bearer | Any |

**GET `/api/v1/dashboard/executive`**
```
Query params:
  ?buildingId=uuid

Response 200:
{
  "data": {
    "energyCostToday": { "value": 2150000, "currency": "IDR" },
    "billingProjection": {
      "projectedMonthly": 13291240,
      "lastMonthActual": 12850000,
      "variancePercent": 3.43,
      "currency": "IDR"
    },
    "energyTrend7d": [
      { "date": "2026-04-08", "kwh": 1250 },
      ...
    ],
    "topAnomalies": [
      {
        "id": "uuid",
        "message": "Weekend energy spike: +35% above baseline",
        "severity": "warning",
        "timestamp": "2026-04-13T02:00:00Z"
      },
      ...
    ],
    "comfortOverview": {
      "zonesNormal": 10,
      "zonesWarning": 2,
      "zonesCritical": 0
    }
  }
}
```

**GET `/api/v1/dashboard/operations`**
```
Response 200:
{
  "data": {
    "sensorStatus": {
      "total": 120,
      "online": 115,
      "offline": 3,
      "stale": 2
    },
    "alertSummary": {
      "critical": 1,
      "warning": 5,
      "info": 12,
      "activeTotal": 18
    },
    "equipmentHealth": {
      "green": 20,
      "yellow": 4,
      "red": 1
    },
    "recentEvents": [
      {
        "type": "alert",
        "message": "High CO2 in Conference Room B",
        "severity": "warning",
        "timestamp": "2026-04-14T10:15:00Z"
      },
      ...
    ],
    "mqttBrokerStatus": "connected",
    "dbStatus": "healthy",
    "lastDataIngestion": "2026-04-14T10:29:58Z"
  }
}
```

**GET `/api/v1/dashboard/technician`**
```
Response 200:
{
  "data": {
    "assignedAssets": [
      {
        "id": "uuid",
        "name": "Genset #1",
        "type": "genset",
        "healthStatus": "yellow",
        "keyMetric": "Fuel Level: 45%",
        "location": "Basement - Generator Room"
      },
      ...
    ],
    "pendingAlerts": [
      {
        "id": "uuid",
        "severity": "warning",
        "message": "Genset fuel level below 50%",
        "action": "Check genset fuel level",
        "timestamp": "2026-04-14T09:00:00Z"
      },
      ...
    ],
    "recentActivity": [
      {
        "type": "alert_acknowledged",
        "message": "Acknowledged: Pump vibration elevated",
        "timestamp": "2026-04-14T08:30:00Z"
      },
      ...
    ]
  }
}
```

### 4.9 Reports Module Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| POST | `/api/v1/reports/energy` | Generate energy summary PDF | Bearer | financial_decision_maker, sys_admin |
| POST | `/api/v1/reports/alerts` | Generate alert history PDF | Bearer | sys_admin |
| GET | `/api/v1/reports/:id/download` | Download generated PDF | Bearer | Owner of report |

**POST `/api/v1/reports/energy`**
```
Request:
{
  "buildingId": "uuid",
  "from": "2026-04-01T00:00:00Z",
  "to": "2026-04-14T23:59:59Z",
  "format": "pdf"
}

Response 202:
{
  "data": {
    "reportId": "uuid",
    "status": "generating",
    "estimatedSeconds": 15
  }
}
// Client polls or receives Socket.IO event when ready
```

### 4.10 System / Health Endpoints

| Method | Path | Purpose | Auth | Roles |
|---|---|---|---|---|
| GET | `/api/v1/health` | Health check (DB, MQTT, Redis) | None | — |
| GET | `/api/v1/health/detailed` | Detailed service status | Bearer | sys_admin |

**GET `/api/v1/health`**
```
Response 200:
{
  "status": "healthy",
  "timestamp": "2026-04-14T10:30:00Z",
  "services": {
    "database": "connected",
    "timescaledb": "connected",
    "mqtt": "connected",
    "redis": "connected"
  },
  "uptime": 86400
}
```

---

## 5. Use Cases and Data Flow

### 5.1 Use Cases by Actor

#### Financial Decision Maker (Budi / Diana)
| UC ID | Use Case | Input | Output |
|---|---|---|---|
| UC-FIN-01 | View executive dashboard | Login credentials | KPI cards, energy cost, billing projection, anomalies |
| UC-FIN-02 | View energy consumption trends | Date range selection | Line/bar charts with historical data |
| UC-FIN-03 | View billing projection | Building selection | Projected monthly cost in IDR vs. prior month |
| UC-FIN-04 | Export energy summary PDF | Date range, building | PDF file download |
| UC-FIN-05 | View comfort zone overview | Building selection | Zone status summary (normal/warning/critical counts) |

#### System Administrator (Rina)
| UC ID | Use Case | Input | Output |
|---|---|---|---|
| UC-ADM-01 | Manage users | User details (email, name, role) | CRUD operations confirmed |
| UC-ADM-02 | Monitor real-time energy | — (auto-updating) | Live kWh, PF, peak load gauges |
| UC-ADM-03 | Monitor environmental conditions | Building/floor selection | Zone cards with temp/humidity/CO2 |
| UC-ADM-04 | Manage equipment inventory | Equipment details | CRUD operations, asset list |
| UC-ADM-05 | Configure alert thresholds | Sensor type, operator, value, severity | Active alert rule |
| UC-ADM-06 | Upload floor plan | SVG/PNG file, building/floor | Floor plan displayed in viewer |
| UC-ADM-07 | Place sensors on floor plan | Drag-and-drop sensor icons | Sensor positions persisted |
| UC-ADM-08 | View operational dashboard | — | System health, alert counts, events |
| UC-ADM-09 | Review alert history | Filters (severity, date, type, status) | Filtered alert list |
| UC-ADM-10 | Configure energy tariff | IDR per kWh rate | Updated billing calculations |
| UC-ADM-11 | Export alert history PDF | Date range, filters | PDF file download |

#### Technician (Agus)
| UC ID | Use Case | Input | Output |
|---|---|---|---|
| UC-TEC-01 | View technician dashboard | Login | Assigned assets, pending alerts |
| UC-TEC-02 | View asset health status | Asset selection | G/Y/R indicator, runtime metrics |
| UC-TEC-03 | View floor plan with sensors | Floor selection | Interactive floor plan with live sensor data |
| UC-TEC-04 | Inspect sensor from floor plan | Tap sensor icon | Popover with live reading, mini chart |
| UC-TEC-05 | Acknowledge alert | Alert selection + optional comment | Alert marked as acknowledged |
| UC-TEC-06 | View equipment runtime metrics | Equipment selection | Running hours, cycles, fuel level |

### 5.2 Data Movement and Transformation

**Sensor Data Lifecycle**:
```
RAW DATA              NORMALIZED              STORED                AGGREGATED              SERVED
──────────            ──────────              ──────                ──────────              ──────
MQTT message    →     Validated JSON     →    sensor_readings  →    1-min continuous   →    REST API
{                     {                       (hypertable)          aggregate               (with interval
  topic: "...",         sensorId: uuid,       ├─ Raw: 7 days       ├─ 90 days              downsampling)
  payload: "..."        type: "temperature",  ├─ Compressed         │
}                       value: 24.5,          └─ Partitioned       hourly aggregate    →    Dashboard
                        unit: "°C",              (1-day chunks)     ├─ 2 years              charts
                        timestamp: ISO,                             └─ Compressed
                        buildingId: uuid,
                        floorId: uuid,
                        zoneId: uuid,
                        quality: "good"
                      }
```

**Data Retention Policy Implementation**:
| Tier | Retention | Storage | Method |
|---|---|---|---|
| Raw readings | 7 days | `sensor_readings` hypertable | TimescaleDB `drop_chunks` policy |
| 1-minute averages | 90 days | Continuous aggregate `sensor_readings_1min` | TimescaleDB continuous aggregate |
| Hourly averages | 2 years | Continuous aggregate `sensor_readings_1hr` | TimescaleDB continuous aggregate |
| Daily averages | Indefinite | Continuous aggregate `sensor_readings_1day` | TimescaleDB continuous aggregate |

### 5.3 Data Consistency Considerations

1. **Eventual consistency for real-time data**: WebSocket broadcasts arrive before DB write completes. Acceptable for monitoring dashboards.
2. **Strong consistency for configuration**: Alert rules, user roles, equipment records use standard PostgreSQL transactions.
3. **Idempotent writes**: Duplicate MQTT messages (QoS 1 retries) handled by `ON CONFLICT (sensor_id, timestamp) DO NOTHING`.
4. **Time synchronization**: All timestamps normalized to UTC on ingestion. Frontend converts to local timezone for display.
5. **Building-scoped queries**: All data queries include `building_id` parameter to prevent cross-building data leakage. Enforced at middleware level.

---

## 6. Authentication & Authorization

### 6.1 JWT Token Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TOKEN LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Login → access_token (15 min, in-memory) + refresh_token (7d, cookie)
│                                                                     │
│  API Request → Authorization: Bearer <access_token>                │
│    → JWT verify (signature + expiry)                               │
│    → Extract user { id, email, role, buildingId }                  │
│    → RBAC check (role vs. required roles for endpoint)             │
│    → Allow or 403                                                  │
│                                                                     │
│  Token Expired (401) → POST /api/v1/auth/refresh                  │
│    → Validate refresh_token from httpOnly cookie                   │
│    → Check refresh_token not revoked (DB/Redis lookup)             │
│    → Issue new access_token                                        │
│    → Retry original request (frontend interceptor)                 │
│                                                                     │
│  Logout → DELETE refresh_token from DB + clear cookie              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 JWT Payload Structure

```json
{
  "sub": "user-uuid",
  "email": "rina@example.com",
  "name": "Rina Wijaya",
  "role": "sys_admin",
  "buildingId": "building-uuid",
  "iat": 1744624200,
  "exp": 1744625100
}
```

### 6.3 RBAC Permission Matrix

| Resource / Action | financial_decision_maker | sys_admin | technician |
|---|---|---|---|
| **Dashboard — Executive** | ✅ Read | ❌ | ❌ |
| **Dashboard — Operations** | ❌ | ✅ Read | ❌ |
| **Dashboard — Technician** | ❌ | ❌ | ✅ Read |
| **Dashboard — Summary** | ✅ Read | ✅ Read | ✅ Read |
| **Energy — Consumption/Trends** | ✅ Read | ✅ Read | ✅ Read |
| **Energy — Billing Projection** | ✅ Read | ✅ Read | ❌ |
| **Energy — Tariff Config** | ❌ | ✅ Read/Write | ❌ |
| **Environmental — Zones/Sensors** | ✅ Read | ✅ Read | ✅ Read (assigned zones) |
| **Equipment — CRUD** | ❌ | ✅ Full CRUD | ✅ Read only |
| **Equipment — Health/Metrics** | ❌ | ✅ Read | ✅ Read (assigned) |
| **Spatial — Floor Plans** | ❌ | ✅ Full CRUD + Upload | ✅ Read only |
| **Spatial — Sensor Placement** | ❌ | ✅ Read/Write | ✅ Read only |
| **Alert Rules — CRUD** | ❌ | ✅ Full CRUD | ❌ |
| **Alerts — View** | ❌ | ✅ Read all | ✅ Read (assigned) |
| **Alerts — Acknowledge/Resolve** | ❌ | ✅ | ✅ (assigned only) |
| **Notifications** | ✅ Own | ✅ Own | ✅ Own |
| **Users — CRUD** | ❌ | ✅ Full CRUD | ❌ |
| **Reports — Generate/Download** | ✅ Energy report | ✅ All reports | ❌ |
| **System — Health Check** | ❌ | ✅ Detailed | ❌ |

### 6.4 Middleware Chain

```
Request
  │
  ▼
[ rateLimiter ]      – IP-based rate limiting (auth: 5/15min, API: 100/min)
  │
  ▼
[ helmet ]           – Security headers (CSP, HSTS, X-Frame-Options, etc.)
  │
  ▼
[ cors ]             – Whitelist allowed origins
  │
  ▼
[ bodyParser ]       – JSON body parsing with 1MB limit
  │
  ▼
[ authenticate ]     – JWT verification, extract user to req.user
  │                     Skip for public routes (/health, /auth/login, /auth/register)
  ▼
[ authorize(roles) ] – Check req.user.role against allowed roles for route
  │                     Return 403 if insufficient
  ▼
[ buildingScope ]    – Inject req.user.buildingId into query filters
  │                     Prevent cross-building data access
  ▼
[ validateInput ]    – Zod schema validation for request body/query/params
  │                     Return 422 with field-level error details
  ▼
[ controller ]       – Business logic handler
  │
  ▼
[ errorHandler ]     – Global error handler: log error, return standardized error response
```

---

## 7. Real-time Communication

### 7.1 Socket.IO Architecture

Socket.IO is embedded in the Express server (shared HTTP server on port 4000). Redis adapter is configured for horizontal scaling readiness.

```
Client Connection Flow:
1. Frontend connects: io("wss://api.example.com", { auth: { token: accessToken } })
2. Server middleware validates JWT from auth handshake
3. Server joins client to rooms: `building:{buildingId}`, `role:{role}`, `user:{userId}`
4. Client subscribes to specific event channels
5. On disconnect, client auto-reconnects (Socket.IO built-in)
```

### 7.2 Socket.IO Event Catalog

#### Server → Client Events

| Event | Room Target | Payload | Trigger |
|---|---|---|---|
| `sensor:reading` | `building:{id}` | `{ sensorId, type, value, unit, timestamp, zoneId }` | Every MQTT message (throttled to 1/s per sensor) |
| `sensor:status` | `building:{id}` | `{ sensorId, status: "online"\|"stale"\|"offline", lastSeen }` | Sensor status change |
| `alert:new` | `building:{id}` | `{ alertId, severity, message, sensorId, value, threshold, timestamp }` | New alert triggered |
| `alert:updated` | `building:{id}` | `{ alertId, status, updatedBy, timestamp }` | Alert acknowledged/resolved |
| `notification:new` | `user:{id}` | `{ notificationId, title, message, severity, timestamp }` | Personal notification |
| `energy:summary` | `building:{id}` | `{ totalKwh, powerFactor, peakKw, timestamp }` | Every 5 seconds (aggregated) |
| `equipment:health` | `building:{id}` | `{ equipmentId, healthStatus, keyMetric, timestamp }` | Health status change |
| `system:status` | `building:{id}` | `{ mqtt: "connected", db: "healthy" }` | System status change |
| `report:ready` | `user:{id}` | `{ reportId, type, downloadUrl }` | PDF generation complete |

#### Client → Server Events

| Event | Payload | Purpose |
|---|---|---|
| `subscribe:zone` | `{ zoneId }` | Join zone-specific room for granular updates |
| `unsubscribe:zone` | `{ zoneId }` | Leave zone room |
| `subscribe:equipment` | `{ equipmentId }` | Join equipment-specific room |
| `notification:markRead` | `{ notificationIds: [] }` | Mark notifications as read |

### 7.3 Throttling Strategy

To prevent frontend overload from high-frequency sensor data:
- **Sensor readings**: Throttled to max 1 emit per sensor per second via server-side debounce.
- **Energy summary**: Aggregated and emitted every 5 seconds (not per-message).
- **Alerts**: Emitted immediately (no throttling — time-critical).
- **Equipment health**: Emitted only on status change (not periodic).

---

## 8. Database Schema Overview

### 8.1 Entity Relationship Summary

```
users ──┬── buildings (via building_id)
        │
buildings ──┬── floors ──┬── zones ──┬── sensors ──── sensor_readings (hypertable)
            │            │           │
            │            │           └── sensor_placements (on floor_plans)
            │            │
            │            └── floor_plans
            │
            ├── equipment ──┬── equipment_sensors (link table)
            │               └── equipment_metrics (hypertable)
            │
            ├── alert_rules
            ├── alerts ──── alert_notifications
            │
            ├── energy_tariffs
            │
            └── audit_logs
```

### 8.2 Key Tables

#### Core Identity & Access
```sql
-- users
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
name            VARCHAR(255) NOT NULL
role            VARCHAR(50) NOT NULL CHECK (role IN ('financial_decision_maker', 'sys_admin', 'technician'))
building_id     UUID REFERENCES buildings(id)
is_active       BOOLEAN DEFAULT true
last_login_at   TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- refresh_tokens
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
token_hash      VARCHAR(255) NOT NULL
expires_at      TIMESTAMPTZ NOT NULL
revoked_at      TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### Building Hierarchy
```sql
-- buildings
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(255) NOT NULL
address         TEXT
city            VARCHAR(100)
timezone        VARCHAR(50) DEFAULT 'Asia/Jakarta'
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- floors
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
name            VARCHAR(100) NOT NULL         -- e.g., "Ground Floor", "Basement"
level           INTEGER NOT NULL              -- e.g., 0, -1, 1, 2
sort_order      INTEGER DEFAULT 0
created_at      TIMESTAMPTZ DEFAULT NOW()

-- zones
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
floor_id        UUID REFERENCES floors(id) ON DELETE CASCADE
name            VARCHAR(100) NOT NULL         -- e.g., "Lobby", "Conference Room A"
type            VARCHAR(50)                   -- office | corridor | server_room | etc
temp_min        DECIMAL(5,2) DEFAULT 20.00    -- configurable comfort thresholds
temp_max        DECIMAL(5,2) DEFAULT 26.00
humidity_min    DECIMAL(5,2) DEFAULT 40.00
humidity_max    DECIMAL(5,2) DEFAULT 60.00
co2_max         INTEGER DEFAULT 800
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### Sensors & Time-Series
```sql
-- sensors
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
zone_id         UUID REFERENCES zones(id) ON DELETE SET NULL
name            VARCHAR(255) NOT NULL
type            VARCHAR(50) NOT NULL          -- temperature | humidity | co2 | energy_meter | power_factor | fuel_level | vibration | runtime
unit            VARCHAR(20) NOT NULL          -- °C | % | ppm | kWh | kW | L | Hz | hours
mqtt_topic      VARCHAR(500) NOT NULL UNIQUE
status          VARCHAR(20) DEFAULT 'offline' -- online | offline | stale
last_seen_at    TIMESTAMPTZ
metadata        JSONB DEFAULT '{}'            -- vendor, model, firmware, calibration info
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- sensor_readings (TimescaleDB hypertable)
-- Partitioned by time (1-day chunks)
time            TIMESTAMPTZ NOT NULL
sensor_id       UUID NOT NULL REFERENCES sensors(id)
value           DOUBLE PRECISION NOT NULL
quality         VARCHAR(10) DEFAULT 'good'    -- good | suspect | bad
-- PRIMARY KEY (sensor_id, time)  -- composite PK for hypertable
-- CREATE INDEX idx_readings_sensor_time ON sensor_readings (sensor_id, time DESC);

-- dead_letter_queue
id              BIGSERIAL PRIMARY KEY
topic           VARCHAR(500)
payload         TEXT
error_reason    VARCHAR(500)
received_at     TIMESTAMPTZ DEFAULT NOW()
```

**TimescaleDB Setup**:
```sql
SELECT create_hypertable('sensor_readings', 'time', chunk_time_interval => INTERVAL '1 day');

-- Continuous aggregates
CREATE MATERIALIZED VIEW sensor_readings_1min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  sensor_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, sensor_id;

CREATE MATERIALIZED VIEW sensor_readings_1hr
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  sensor_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, sensor_id;

CREATE MATERIALIZED VIEW sensor_readings_1day
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS bucket,
  sensor_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, sensor_id;

-- Retention policies
SELECT add_retention_policy('sensor_readings', INTERVAL '7 days');
SELECT add_retention_policy('sensor_readings_1min', INTERVAL '90 days');
SELECT add_retention_policy('sensor_readings_1hr', INTERVAL '2 years');

-- Compression
ALTER TABLE sensor_readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'sensor_id',
  timescaledb.compress_orderby = 'time DESC'
);
SELECT add_compression_policy('sensor_readings', INTERVAL '2 days');
```

#### Equipment & Metrics
```sql
-- equipment
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
floor_id        UUID REFERENCES floors(id) ON DELETE SET NULL
zone_id         UUID REFERENCES zones(id) ON DELETE SET NULL
name            VARCHAR(255) NOT NULL
type            VARCHAR(50) NOT NULL          -- genset | pump | ahu | chiller | boiler | elevator | transformer
serial_number   VARCHAR(100)
manufacturer    VARCHAR(255)
model           VARCHAR(255)
install_date    DATE
last_service_date DATE
next_service_date DATE
health_status   VARCHAR(10) DEFAULT 'green'   -- green | yellow | red
metadata        JSONB DEFAULT '{}'            -- type-specific fields
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- equipment_sensors (link sensors to equipment)
equipment_id    UUID REFERENCES equipment(id) ON DELETE CASCADE
sensor_id       UUID REFERENCES sensors(id) ON DELETE CASCADE
role            VARCHAR(50)                   -- e.g., "fuel_level", "exhaust_temp", "vibration"
PRIMARY KEY (equipment_id, sensor_id)

-- equipment_metrics (TimescaleDB hypertable for runtime tracking)
time            TIMESTAMPTZ NOT NULL
equipment_id    UUID NOT NULL REFERENCES equipment(id)
metric_type     VARCHAR(50) NOT NULL          -- running_hours | cycle_count | fuel_level | operating_hours
value           DOUBLE PRECISION NOT NULL
-- SELECT create_hypertable('equipment_metrics', 'time', chunk_time_interval => INTERVAL '1 day');
```

#### Alerts & Notifications
```sql
-- alert_rules
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
name            VARCHAR(255) NOT NULL
sensor_type     VARCHAR(50)                   -- applies to all sensors of this type
sensor_id       UUID REFERENCES sensors(id) ON DELETE CASCADE  -- or specific sensor
operator        VARCHAR(5) NOT NULL           -- > | < | >= | <= | ==
threshold       DOUBLE PRECISION NOT NULL
severity        VARCHAR(20) NOT NULL          -- info | warning | critical
cooldown_minutes INTEGER DEFAULT 15
email_notification BOOLEAN DEFAULT false
email_recipients JSONB DEFAULT '[]'
is_active       BOOLEAN DEFAULT true
created_by      UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- alerts
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
alert_rule_id   UUID REFERENCES alert_rules(id) ON DELETE SET NULL
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
sensor_id       UUID REFERENCES sensors(id) ON DELETE SET NULL
severity        VARCHAR(20) NOT NULL
status          VARCHAR(20) DEFAULT 'active'  -- active | acknowledged | resolved
sensor_value    DOUBLE PRECISION
threshold_value DOUBLE PRECISION
operator        VARCHAR(5)
message         TEXT NOT NULL
triggered_at    TIMESTAMPTZ DEFAULT NOW()
acknowledged_at TIMESTAMPTZ
acknowledged_by UUID REFERENCES users(id)
resolved_at     TIMESTAMPTZ
resolved_by     UUID REFERENCES users(id)
comment         TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()

-- notifications (in-app)
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id         UUID REFERENCES users(id) ON DELETE CASCADE
alert_id        UUID REFERENCES alerts(id) ON DELETE SET NULL
title           VARCHAR(255) NOT NULL
message         TEXT NOT NULL
severity        VARCHAR(20)
is_read         BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### Spatial
```sql
-- floor_plans
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
floor_id        UUID REFERENCES floors(id) ON DELETE CASCADE
label           VARCHAR(255)
file_type       VARCHAR(10) NOT NULL          -- svg | png
file_path       VARCHAR(500) NOT NULL
file_size       INTEGER                       -- bytes
uploaded_by     UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- sensor_placements
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
floor_plan_id   UUID REFERENCES floor_plans(id) ON DELETE CASCADE
sensor_id       UUID REFERENCES sensors(id) ON DELETE CASCADE
x               DECIMAL(6,3) NOT NULL         -- percentage 0–100
y               DECIMAL(6,3) NOT NULL         -- percentage 0–100
rotation        INTEGER DEFAULT 0             -- degrees
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE (floor_plan_id, sensor_id)
```

#### Configuration & Audit
```sql
-- energy_tariffs
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
name            VARCHAR(100) NOT NULL         -- e.g., "PLN Standard", "Peak", "Off-Peak"
rate_per_kwh    DECIMAL(12,2) NOT NULL        -- IDR per kWh
currency        VARCHAR(3) DEFAULT 'IDR'
effective_from  DATE NOT NULL
effective_to    DATE                          -- NULL = currently active
created_by      UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()

-- automation_rules (Phase 2 placeholder — schema defined now)
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
building_id     UUID REFERENCES buildings(id) ON DELETE CASCADE
name            VARCHAR(255) NOT NULL
trigger_type    VARCHAR(50)                   -- sensor_threshold | schedule | time_of_day
trigger_config  JSONB NOT NULL
action_type     VARCHAR(50)                   -- send_notification | log_event
action_config   JSONB NOT NULL
is_active       BOOLEAN DEFAULT false
created_by      UUID REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()

-- audit_logs
id              BIGSERIAL PRIMARY KEY
user_id         UUID REFERENCES users(id) ON DELETE SET NULL
action          VARCHAR(100) NOT NULL         -- e.g., "user.created", "alert_rule.updated", "equipment.deleted"
resource_type   VARCHAR(50) NOT NULL
resource_id     UUID
details         JSONB                         -- change diff / metadata
ip_address      INET
user_agent      VARCHAR(500)
created_at      TIMESTAMPTZ DEFAULT NOW()
-- CREATE INDEX idx_audit_user ON audit_logs(user_id, created_at DESC);
-- CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id, created_at DESC);
```

### 8.3 Indexing Strategy

| Table | Index | Purpose |
|---|---|---|
| `sensor_readings` | `(sensor_id, time DESC)` | Primary query pattern |
| `sensor_readings` | Hypertable auto-indexes on `time` | Chunk exclusion |
| `sensors` | `(building_id, type)` | Filter sensors by building and type |
| `sensors` | `(mqtt_topic)` UNIQUE | MQTT message routing |
| `equipment` | `(building_id, type, health_status)` | Dashboard filters |
| `alerts` | `(building_id, status, severity)` | Active alerts query |
| `alerts` | `(triggered_at DESC)` | Alert history chronological |
| `notifications` | `(user_id, is_read, created_at DESC)` | User notification feed |
| `audit_logs` | `(user_id, created_at DESC)` | User audit trail |
| `audit_logs` | `(resource_type, resource_id)` | Resource audit trail |

---

## 9. Integration Points

### 9.1 MQTT Topic Structure

**Convention**: `smartbuilding/{building_id}/{floor_id}/{zone_id}/{sensor_type}/{sensor_id}`

| Topic Pattern | Example | Payload |
|---|---|---|
| `smartbuilding/{bid}/{fid}/{zid}/temperature/{sid}` | `smartbuilding/bld-001/fl-01/zn-lobby/temperature/sen-t-001` | `{ "value": 24.5, "unit": "°C", "ts": "2026-04-14T10:30:00Z", "quality": "good" }` |
| `smartbuilding/{bid}/{fid}/{zid}/humidity/{sid}` | `smartbuilding/bld-001/fl-01/zn-lobby/humidity/sen-h-001` | `{ "value": 52.0, "unit": "%", "ts": "...", "quality": "good" }` |
| `smartbuilding/{bid}/{fid}/{zid}/co2/{sid}` | `smartbuilding/bld-001/fl-01/zn-server/co2/sen-c-001` | `{ "value": 780, "unit": "ppm", "ts": "...", "quality": "good" }` |
| `smartbuilding/{bid}/{fid}/{zid}/energy_meter/{sid}` | `smartbuilding/bld-001/fl-01/zn-main/energy_meter/sen-e-001` | `{ "value": 42.5, "unit": "kWh", "ts": "...", "powerFactor": 0.87, "peakKw": 15.2, "quality": "good" }` |
| `smartbuilding/{bid}/{fid}/{zid}/fuel_level/{sid}` | `smartbuilding/bld-001/fl-b1/zn-gen/fuel_level/sen-f-001` | `{ "value": 45.0, "unit": "%", "ts": "...", "quality": "good" }` |
| `smartbuilding/{bid}/{fid}/{zid}/vibration/{sid}` | `smartbuilding/bld-001/fl-b1/zn-pump/vibration/sen-v-001` | `{ "value": 2.3, "unit": "mm/s", "ts": "...", "quality": "good" }` |
| `smartbuilding/{bid}/{fid}/{zid}/runtime/{sid}` | `smartbuilding/bld-001/fl-b1/zn-gen/runtime/sen-r-001` | `{ "value": 4520, "unit": "hours", "ts": "...", "quality": "good" }` |
| `smartbuilding/{bid}/status` | `smartbuilding/bld-001/status` | `{ "gateway": "online", "sensorCount": 120, "ts": "..." }` — gateway heartbeat |

**MQTT Payload JSON Schema**:
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["value", "unit", "ts"],
  "properties": {
    "value": { "type": "number" },
    "unit": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "quality": { "type": "string", "enum": ["good", "suspect", "bad"], "default": "good" },
    "powerFactor": { "type": "number", "minimum": 0, "maximum": 1 },
    "peakKw": { "type": "number" }
  }
}
```

**Subscriber Wildcard**: Backend subscribes to `smartbuilding/#` and routes to the appropriate handler based on topic parsing.

**QoS**: All sensor topics use QoS 1. Gateway status topics use QoS 1 with retained flag.

### 9.2 BACnet/Modbus Gateway Abstraction (Phase 2 Preparation)

For MVP, only MQTT is supported. However, the data ingestion layer is designed with an abstraction interface to accommodate BACnet/Modbus gateways in Phase 2:

```typescript
// src/backend/modules/mqtt/interfaces/data-source.interface.ts
interface IDataSourceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  subscribe(topics: string[]): Promise<void>;
  onMessage(handler: (message: NormalizedReading) => void): void;
}

// MVP: MqttAdapter implements IDataSourceAdapter
// Phase 2: BacnetAdapter, ModbusAdapter implement IDataSourceAdapter
```

This abstraction allows new protocol adapters to be added without modifying the downstream data pipeline (validation → storage → alerts → WebSocket).

### 9.3 External Notification Services

| Service | Protocol | Configuration | Purpose |
|---|---|---|---|
| SMTP Server | SMTP (TLS) | Host, port, credentials via env vars | Alert email delivery |
| (Phase 2) SMS Gateway | REST API | API key via env vars | Critical alert SMS |
| (Phase 2) Push Notifications | FCM/APNs | Service account keys | Mobile push |

**Email Configuration (.env)**:
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=alerts@smartbuilding.id
SMTP_PASS=<encrypted>
SMTP_FROM=alerts@smartbuilding.id
SMTP_FROM_NAME=Smart Building Dashboard
```

---

## 10. Non-Functional Requirements

### 10.1 Performance Targets

| Metric | Target | Implementation Strategy |
|---|---|---|
| API response time (p95) | < 200ms | Database indexing, query optimization, Redis caching for hot paths |
| Dashboard initial load | < 3s | Next.js SSR, code splitting, lazy loading, image optimization |
| Sensor-to-screen latency | < 5s | MQTT QoS 1 → direct Socket.IO broadcast (parallel to DB write) |
| Data ingestion rate | 1,000+ msg/s per building | Batch inserts (100 rows per insert), connection pooling |
| Concurrent WebSocket connections | 50+ per building | Socket.IO with Redis adapter, connection pooling |
| PDF generation | < 30s | Server-side rendering with Puppeteer, async generation with status polling |

### 10.2 Scalability Approach

**MVP (Single-server pilot)**:
- All services on one Docker host (4+ CPU, 16GB+ RAM)
- PostgreSQL connection pool: 20 connections
- Single Mosquitto instance (handles 10K+ concurrent connections)
- Socket.IO with in-memory adapter

**Phase 2 Scale-out Path**:
- Redis adapter for Socket.IO (multi-instance WebSocket)
- Read replicas for PostgreSQL (dashboard queries)
- MQTT bridge for multi-broker setup
- CDN for static assets and floor plan files
- Horizontal API scaling behind load balancer

### 10.3 Security Requirements

| Category | Requirement | Implementation |
|---|---|---|
| **Authentication** | JWT with short-lived access tokens | 15-min access, 7-day refresh, bcrypt password hashing (cost factor 12) |
| **Authorization** | Role-based access control (3 roles) | Middleware checks on every route; building-scoped data isolation |
| **Transport** | TLS everywhere | Nginx SSL termination; MQTT TLS (port 8883); no unencrypted traffic in production |
| **Input validation** | Validate all inputs server-side | Zod schemas for API inputs; parameterized queries via Prisma (SQL injection prevention) |
| **XSS prevention** | Sanitize all user inputs + SVG uploads | DOMPurify for SVG sanitization; React auto-escapes JSX; CSP headers |
| **CSRF protection** | SameSite cookies + per-request tokens | SameSite=Strict on refresh token cookie; access token in Authorization header |
| **Rate limiting** | Throttle auth and API endpoints | express-rate-limit: 5 login/15min/IP, 100 API/min/user |
| **Security headers** | OWASP recommended headers | Helmet.js: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy |
| **Audit logging** | Track all mutations | Audit log table for user actions; MQTT message logging |
| **Data isolation** | Building-scoped access | `buildingScope` middleware injects building_id filter on all queries |
| **Password policy** | Minimum requirements | Min 8 chars, complexity validation via Zod |
| **Dependency security** | No known vulnerabilities | `npm audit` in CI pipeline; Dependabot alerts |

### 10.4 Reliability & Availability

| Requirement | Target | Approach |
|---|---|---|
| Uptime | 99.5% (pilot) | Single-instance with health checks; manual recovery |
| Data durability | No data loss for stored readings | PostgreSQL WAL; MQTT QoS 1; dead letter queue for failed writes |
| Graceful degradation | Dashboard usable if MQTT disconnects | Cached data shown with "stale" indicator; REST API still serves historical data |
| Backup | Daily database backup | `pg_dump` cron job to backup volume |

---

## 11. Technical Specifications

### 11.1 Functional Requirement Mapping

| PM Feature ID | System Component(s) | API Endpoints | DB Tables |
|---|---|---|---|
| AUTH-01 | Auth module, middleware | `/auth/login`, `/auth/refresh`, `/auth/logout` | `users`, `refresh_tokens` |
| AUTH-02 | RBAC middleware | (integrated into all endpoints) | `users.role` |
| AUTH-03 | Auth module (user CRUD) | `/users/*` | `users` |
| PLAT-01 | Next.js frontend shell | — | — |
| PLAT-02 | Frontend layout components | — | — |
| DATA-01 | MQTT subscriber service | — | `sensors` |
| DATA-02 | MQTT message parser | — | `dead_letter_queue` |
| DATA-03 | TimescaleDB hypertable | — | `sensor_readings` |
| DATA-04 | Retention policies | — | Continuous aggregates |
| DATA-05 | Time-series query service | `/sensors/:id/readings` | `sensor_readings`, aggregates |
| ENERGY-01 | Energy module + WebSocket | `/energy/consumption`, `sensor:reading` event | `sensor_readings` |
| ENERGY-02 | Energy module | `/energy/trends` | `sensor_readings_1hr`, `_1day` |
| ENERGY-03 | Energy module | `/energy/billing-projection` | `energy_tariffs`, `sensor_readings` |
| ENV-01 | Environmental module | `/zones/*`, `/sensors/*` | `zones`, `sensors`, `sensor_readings` |
| ENV-02 | Zone status logic | `/zones` (includes status) | `zones` (thresholds) |
| ASSET-01 | Asset module | `/equipment/*` | `equipment` |
| ASSET-02 | Asset health service | `/equipment/:id/health` | `equipment`, `equipment_sensors`, `alert_rules` |
| ASSET-03 | Equipment metrics | `/equipment/:id/metrics` | `equipment_metrics` |
| ASSET-04 | Equipment metrics (fuel) | `/equipment/:id/metrics` | `equipment_metrics` |
| SPATIAL-01 | Spatial module + file upload | `/floor-plans` (POST) | `floor_plans` |
| SPATIAL-02 | Spatial module | `/floor-plans/:id/sensors` (PUT) | `sensor_placements` |
| SPATIAL-03 | Frontend + sensor API | `/sensors/:id` (GET) | `sensors`, `sensor_readings` |
| ALERT-01 | Alert module | `/alert-rules/*` | `alert_rules` |
| ALERT-02 | Notification service + WebSocket | `/notifications`, `notification:new` event | `notifications` |
| ALERT-03 | Email service | (triggered by alert engine) | `alert_rules.email_recipients` |
| ALERT-04 | Alert module | `/alerts` (GET, filters) | `alerts` |
| DASH-01 | Dashboard module | `/dashboard/executive` | Multiple (aggregation) |
| DASH-02 | Dashboard module | `/dashboard/operations` | Multiple (aggregation) |
| DASH-03 | Dashboard module | `/dashboard/technician` | Multiple (aggregation) |
| REPORT-01 | Reports module | `/reports/energy`, `/reports/alerts` | `sensor_readings`, `alerts` |

### 11.2 Non-Functional Requirement Mapping

| Requirement | Target | Validation Method |
|---|---|---|
| API latency p95 < 200ms | Load test with 50 concurrent users | Supertest + artillery load test |
| Dashboard load < 3s | Lighthouse performance audit | CI-integrated Lighthouse check |
| Sensor-to-screen < 5s | End-to-end timestamp comparison | MQTT simulator with timestamp assertions |
| Data ingestion 1K msg/s | MQTT load test | mosquitto_pub stress test |
| 60% test coverage | Line coverage for core modules | Vitest coverage report in CI |
| OWASP Top 10 compliance | Security review checklist | Stage 9 Security agent review |
| WCAG 2.1 AA (basic) | Lighthouse accessibility audit | CI-integrated Lighthouse check |

### 11.3 Acceptance and Validation Checkpoints

| Gate | Checkpoint | Validation |
|---|---|---|
| Gate 1 (Sprint 2) | Auth + RBAC functional | Login → JWT → protected endpoint returns 200; wrong role returns 403 |
| Gate 2 (Sprint 4) | Data pipeline end-to-end | MQTT publish → TimescaleDB row exists → WebSocket client receives event → chart renders |
| Gate 3 (Sprint 7) | Feature complete | All 35 features demonstrable; 60% test coverage; no P1 bugs |
| Gate 4 (Sprint 8) | Pilot ready | `docker-compose up` starts all services; health check green; UAT passed |

---

## 12. Collaboration Handoff

### 12.1 Clarifications Needed from PM

| # | Question | Impact |
|---|---|---|
| 1 | **Technician asset assignment**: How are assets assigned to technicians? Manual sys_admin assignment via user management, or all equipment visible to all technicians? | Affects user-equipment relationship schema and technician dashboard query |
| 2 | **Multi-building user access**: Can a user have access to multiple buildings, or strictly one building per user? | Affects `users.building_id` cardinality (FK vs. join table) |
| 3 | **Alert email rate limiting scope**: PM says "max 1 email per sensor per 15 minutes for same threshold." Is this per-recipient or global? | Affects dedup cache key design |
| 4 | **Initial user creation**: Who creates the first sys_admin? Is there a bootstrap/seed process, or does `/auth/register` allow the first user registration? | Affects deployment and seeding process |

### 12.2 Implementation Inputs for Coder

1. **Module structure**: Follow the modular monolith layout in Section 3.1. Each module has its own `controller.ts`, `service.ts`, `routes.ts`, `validators.ts`.
2. **API conventions**: All endpoints under `/api/v1/`. Use Zod for validation. Follow error response shape from Section 4.1.
3. **MQTT subscriber**: Runs as a background service within the Express process (not a separate microservice). Uses the `IDataSourceAdapter` interface for future extensibility.
4. **Socket.IO**: Embedded in Express server. Use rooms for building-scoped broadcasting. Authenticate via JWT in handshake.
5. **Database**: Use Prisma for relational tables. Use raw SQL (via Prisma `$queryRaw`) for TimescaleDB-specific features (hypertables, continuous aggregates, retention policies).
6. **File uploads**: Use `multer` middleware. SVG files sanitized with `isomorphic-dompurify`. PNG validated via magic bytes. Store in `/uploads/floor-plans/` directory.
7. **Shared types**: Put TypeScript interfaces shared between frontend and backend in `src/shared/types/`.

### 12.3 Data Model Inputs for Data Agent

1. **Full schema** defined in Section 8.2. Create Prisma schema for relational tables; raw SQL migration files for TimescaleDB hypertables and continuous aggregates.
2. **Seed data**: Create seed for 1 demo building, 3 floors, 6 zones, 50 sensors, 10 equipment items, 3 users (one per role), sample alert rules, 1 energy tariff.
3. **Indexes**: Follow indexing strategy in Section 8.3.
4. **TimescaleDB setup**: Hypertable creation, continuous aggregates, retention policies, compression policies — all in Section 8.2 SQL blocks.

### 12.4 UI Flow Inputs for UI/UX Agent

1. **Three role-based home dashboards** with distinct layouts (Section 4.8 response shapes define available data).
2. **Navigation structure**: Sidebar with role-conditional menu items. Mobile: hamburger collapse.
3. **Floor plan interaction**: Pan/zoom viewer, drag-and-drop sensor placement (sys_admin), click-to-inspect popover (all roles).
4. **Real-time updates**: Charts and KPI cards update without page refresh (Socket.IO events listed in Section 7.2).
5. **Alert notification**: Bell icon in header showing unread count. Notification drawer with list of alerts.
6. **Color coding**: G/Y/R for equipment health; green/yellow/red for environmental zone status (thresholds in Section 8.2 `zones` table).
7. **Theme**: Dark/Light toggle. User preference persisted (localStorage).

### 12.5 Test Focus Areas for QA

1. **Auth & RBAC**: Test all 3 roles against all endpoints — verify 200 for allowed, 403 for denied.
2. **Data pipeline**: MQTT message → DB insert → WebSocket delivery. Test with valid, invalid, and duplicate messages.
3. **Alert engine**: Threshold evaluation accuracy. Cooldown deduplication. Email dispatch timing.
4. **Building scope isolation**: Users must not access data from other buildings.
5. **Input validation**: Fuzz test all API inputs (XSS payloads, SQL injection, oversized payloads, boundary values).
6. **SVG sanitization**: Upload SVG with embedded `<script>` tags — verify they are stripped.
7. **Performance**: API latency under load (50 concurrent users), WebSocket broadcast latency.

### 12.6 Risks and Follow-up Actions

| Risk | Severity | Follow-up |
|---|---|---|
| TimescaleDB continuous aggregates add operational complexity | Medium | Ensure Data agent tests aggregate correctness. Provide fallback: use raw queries with `time_bucket()` if continuous aggregates are problematic. |
| SVG upload XSS vector | High | Implement DOMPurify sanitization. QA must test with malicious SVG payloads. |
| Socket.IO memory usage with many sensors broadcasting | Medium | Implement throttling (1 emit/sensor/second). Monitor memory during load test. |
| 35 features in 8 sprints is ambitious | High | Cut candidates if behind: PLAT-03 (dark theme), REPORT-01 (PDF export). Both are non-blocking for pilot value. |
| Prisma lacks native TimescaleDB support | Low | Use Prisma for relational tables, `$queryRaw` for time-series queries. Not a blocker, just requires two query patterns. |

---

## 13. Handoff

### Inputs Consumed
- `.artifacts/02-pm-roadmap.md` — Complete PM roadmap including:
  - 35 MVP feature items across 8 modules (AUTH, PLAT, DATA, ENERGY, ENV, ASSET, SPATIAL, ALERT, DASH, REPORT, MOBILE, DEPLOY, TEST)
  - 8-sprint plan with acceptance criteria and capacity estimates
  - 25+ detailed user stories with acceptance criteria
  - Feature dependency map with critical path
  - Technical requirements with stack recommendations and architecture decision requests
  - 8 open technical questions for System Analyst resolution
  - Risk register (12 risks)

### Outputs Produced
- `.artifacts/03-sa-system-design.md` (this document) — containing:
  - System architecture with 9 major components and their responsibilities
  - 10 Architecture Decision Records (ADRs) resolving all PM open questions
  - Complete REST API contract: 45+ endpoints across 10 modules with request/response shapes
  - Socket.IO event catalog: 10 server→client events, 4 client→server events
  - Data flow architecture: MQTT → validation → parallel fan-out (DB + alerts + WebSocket)
  - JWT authentication flow with RBAC permission matrix (3 roles × 20 resource/action combinations)
  - Full database schema: 18 tables with column definitions, indexes, and TimescaleDB setup SQL
  - MQTT topic structure with JSON schema and QoS policy
  - Non-functional requirements with targets and validation methods
  - Traceability matrix: every PM feature mapped to components, endpoints, and tables
  - Handoff inputs for Coder, Data, UI/UX, and QA agents

### Open Questions

| # | Question | Blocking? | For Whom |
|---|---|---|---|
| 1 | Technician-to-asset assignment method (manual vs. all-visible) | No — defaulting to "all visible, filtered by building" for MVP. Can add assignment in Phase 2. | PM |
| 2 | Multi-building user access (single building FK vs. many-to-many) | No — using single `building_id` FK for MVP. Multi-building access table for Phase 2. | PM |
| 3 | Bootstrap process for first sys_admin user | No — will implement a DB seed command (`npm run db:seed`) for initial admin. `/auth/register` endpoint restricted to sys_admin role after first user exists. | Coder |
| 4 | Pilot site MQTT readiness confirmation | Yes — blocks Sprint 3+ integration testing. Need confirmation by end of Sprint 2. | PM / Creator |

### Go/No-Go Recommendation

**✅ GO — Proceed to UI/UX (Stage 4), Data (Stage 5), and Coder (Stage 6)**

**Rationale**:

1. **All PM open questions resolved**: ADRs 01–10 address all 8 technical decisions requested by PM (WebSocket vs. SSE, MQTT QoS, TimescaleDB partitioning, token storage, SVG sanitization, multi-building schema, broker choice, monitoring level).
2. **API contract is complete and actionable**: 45+ endpoints with method, path, request/response shapes, and auth requirements — sufficient for parallel frontend and backend development.
3. **Database schema is fully specified**: 18 tables with column types, constraints, indexes, and TimescaleDB-specific SQL — Data agent can begin migration files immediately.
4. **Real-time architecture is defined**: Socket.IO event catalog with room structure and throttling strategy — frontend can implement live updates from Sprint 4.
5. **Security architecture is comprehensive**: JWT flow, RBAC matrix, middleware chain, SVG sanitization, input validation, rate limiting — meets OWASP Top 10 requirements.
6. **Traceability is maintained**: Every PM feature ID maps to specific components, endpoints, and tables — no gaps between requirements and design.
7. **Scalability path is documented**: MVP is intentionally simple (modular monolith, single-server), with clear Phase 2 scale-out steps identified.

**Conditions for Go**:
- Pilot site MQTT readiness must be confirmed by end of Sprint 2 (Open Question #4)
- Coder agent must follow module structure and API conventions defined in this document
- Data agent must implement TimescaleDB setup SQL exactly as specified (hypertables, continuous aggregates, retention policies)
- QA agent must include SVG XSS sanitization testing and building-scope isolation testing

---

*This document was produced by the System Analyst Agent and is ready for consumption by UI/UX (Stage 4), Data (Stage 5), and Coder (Stage 6) agents. All technical decisions are final for MVP scope unless overridden by PM with justification.*
