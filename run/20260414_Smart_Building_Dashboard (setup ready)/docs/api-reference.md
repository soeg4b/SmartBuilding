# API Reference

**Smart Building Dashboard — REST API v1**

Base URL: `/api/v1`

All endpoints (except `/auth/login` and `/auth/refresh`) require authentication via a `Bearer` token in the `Authorization` header.

---

## Table of Contents

- [Authentication](#authentication)
- [Common Patterns](#common-patterns)
- [Auth Module](#auth-module)
- [Users Module](#users-module)
- [Energy Module](#energy-module)
- [Environmental Module (Sensors & Zones)](#environmental-module)
- [Assets Module (Equipment)](#assets-module)
- [Spatial Module (Buildings, Floors, Floor Plans)](#spatial-module)
- [Alerts Module](#alerts-module)
- [Notifications](#notifications)
- [Dashboard Module](#dashboard-module)
- [Health Check](#health-check)
- [Error Codes](#error-codes)

---

## Authentication

The API uses JWT-based authentication with two tokens:

- **Access Token** — Short-lived (15 min), sent as `Authorization: Bearer <token>` header
- **Refresh Token** — Long-lived (7 days), set as `httpOnly` cookie by the server on login

### Token Lifecycle

1. Client calls `POST /auth/login` with credentials
2. Server returns `accessToken` in response body and sets `refreshToken` as httpOnly cookie
3. Client includes `Authorization: Bearer <accessToken>` on subsequent requests
4. On 401 (token expired), client calls `POST /auth/refresh` (browser auto-sends cookie)
5. Server returns a new `accessToken`
6. On refresh failure, client must re-login

### Roles

| Role | Value | Access Level |
|------|-------|-------------|
| Financial Decision Maker | `financial_decision_maker` | Executive dashboards, billing, energy trends |
| System Administrator | `sys_admin` | Full system access, user management, configuration |
| Technician | `technician` | Equipment health, alerts, floor plans (read-only config) |

---

## Common Patterns

### Success Response

```json
{
  "data": { ... }
}
```

### Paginated Response

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

Pagination query parameters:
- `page` — Page number (default: `1`, minimum: `1`)
- `limit` — Items per page (default: `20`, maximum: `100`)

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Date Format

All timestamps use ISO 8601 format in UTC: `2026-04-14T10:30:00Z`

---

## Auth Module

### POST `/auth/login`

Authenticate a user and receive access token.

- **Auth required**: No
- **Rate limit**: 5 requests per 15 minutes per IP

**Request Body:**

```json
{
  "email": "budi@example.com",
  "password": "securePassword123"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "budi@example.com",
      "name": "Budi Santoso",
      "role": "financial_decision_maker",
      "buildingId": "660e8400-e29b-41d4-a716-446655440001"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

The `refreshToken` is set as an httpOnly cookie (`sbd_refresh_token`).

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `INVALID_CREDENTIALS` | Email not found, wrong password, or user inactive |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many login attempts |

---

### POST `/auth/register`

Create a new user account. Restricted to `sys_admin` role.

- **Auth required**: Yes (Bearer token)
- **Roles**: `sys_admin`

**Request Body:**

```json
{
  "email": "rina@example.com",
  "name": "Rina Wijaya",
  "password": "tempPassword123",
  "role": "sys_admin",
  "buildingId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response 201 Created:**

```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "email": "rina@example.com",
    "name": "Rina Wijaya",
    "role": "sys_admin",
    "buildingId": "660e8400-e29b-41d4-a716-446655440001",
    "isActive": true,
    "createdAt": "2026-04-14T10:00:00Z"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | User is not `sys_admin` |
| 409 | `EMAIL_EXISTS` | Email already registered |
| 422 | `VALIDATION_ERROR` | Invalid request body |

---

### POST `/auth/refresh`

Refresh the access token using the httpOnly refresh cookie.

- **Auth required**: Cookie (refresh token)

**Request Body:** None (token is in the cookie)

**Response 200 OK:**

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `INVALID_REFRESH_TOKEN` | Token missing, expired, or revoked |

---

### POST `/auth/logout`

Invalidate the current refresh token.

- **Auth required**: Yes (Bearer token)

**Response 200 OK:**

```json
{
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

### GET `/auth/me`

Get the current authenticated user's profile.

- **Auth required**: Yes (Bearer token)
- **Roles**: Any

**Response 200 OK:**

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "budi@example.com",
    "name": "Budi Santoso",
    "role": "financial_decision_maker",
    "buildingId": "660e8400-e29b-41d4-a716-446655440001",
    "isActive": true,
    "createdAt": "2026-04-14T08:00:00Z",
    "updatedAt": "2026-04-14T08:00:00Z"
  }
}
```

---

## Users Module

All endpoints require `sys_admin` role.

### GET `/users`

List all users with pagination and filtering.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `role` | string | Filter by role |
| `buildingId` | UUID | Filter by building |
| `search` | string | Search by name or email |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "rina@example.com",
      "name": "Rina Wijaya",
      "role": "sys_admin",
      "buildingId": "uuid",
      "isActive": true,
      "createdAt": "2026-04-14T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

### POST `/users`

Create a new user.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Request Body:**

```json
{
  "email": "agus@example.com",
  "name": "Agus Pratama",
  "password": "securePassword123",
  "role": "technician",
  "buildingId": "uuid"
}
```

**Response 201 Created:** Returns the created user object.

---

### GET `/users/:id`

Get user details by ID.

- **Auth required**: Yes
- **Roles**: `sys_admin`

---

### PUT `/users/:id`

Update a user's information.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Request Body** (partial update):

```json
{
  "name": "Agus Pratama Updated",
  "role": "sys_admin",
  "isActive": false
}
```

---

### DELETE `/users/:id`

Soft-delete (deactivate) a user.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Response 204 No Content**

---

## Energy Module

### GET `/energy/consumption`

Get current energy consumption snapshot.

- **Auth required**: Yes
- **Roles**: Any

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildingId` | UUID | Yes | Building to query |

**Response 200 OK:**

```json
{
  "data": {
    "buildingId": "uuid",
    "currentKw": 385.2,
    "todayKwh": 4250.5,
    "powerFactor": 0.87,
    "peakKw": 420.3,
    "peakTimestamp": "2026-04-14T14:32:00Z",
    "updatedAt": "2026-04-14T10:30:00Z"
  }
}
```

---

### GET `/energy/trends`

Get historical energy consumption data with aggregation.

- **Auth required**: Yes
- **Roles**: Any

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildingId` | UUID | Yes | Building to query |
| `from` | ISO 8601 | Yes | Start date |
| `to` | ISO 8601 | Yes | End date |
| `interval` | string | No | Aggregation: `hourly`, `daily`, `weekly`, `monthly` (default: `daily`) |
| `compare` | string | No | Overlay comparison: `previous_period` |

**Response 200 OK:**

```json
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
      }
    ],
    "comparison": [],
    "summary": {
      "totalKwh": 8750.0,
      "avgPowerFactor": 0.86,
      "peakKw": 450.0,
      "peakTimestamp": "2026-04-10T14:32:00Z"
    }
  }
}
```

---

### GET `/energy/billing-projection`

Get projected monthly billing in Indonesian Rupiah (IDR).

- **Auth required**: Yes
- **Roles**: `financial_decision_maker`, `sys_admin`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildingId` | UUID | Yes | Building to query |
| `month` | string | No | Target month `YYYY-MM` (default: current month) |

**Response 200 OK:**

```json
{
  "data": {
    "buildingId": "uuid",
    "month": "2026-04",
    "consumedKwh": 4500.0,
    "projectedKwh": 9200.0,
    "tariffPerKwh": 1444.70,
    "projectedCostIdr": 13291240,
    "lastMonthActualIdr": 12850000,
    "variancePercent": 3.43,
    "daysElapsed": 14,
    "daysRemaining": 16,
    "updatedAt": "2026-04-14T10:30:00Z"
  }
}
```

---

### GET `/energy/tariffs`

Get configured energy tariff rates.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "buildingId": "uuid",
      "name": "PLN Tariff B-2/TR",
      "ratePerKwh": 1444.70,
      "currency": "IDR",
      "effectiveFrom": "2026-01-01T00:00:00Z",
      "isActive": true
    }
  ]
}
```

---

### POST `/energy/tariffs`

Create or update an energy tariff rate.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Request Body:**

```json
{
  "buildingId": "uuid",
  "name": "PLN Tariff B-2/TR",
  "ratePerKwh": 1500.00,
  "currency": "IDR",
  "effectiveFrom": "2026-05-01T00:00:00Z"
}
```

---

## Environmental Module

### GET `/sensors`

List all sensors with pagination and filtering.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `buildingId` | UUID | Filter by building |
| `zoneId` | UUID | Filter by zone |
| `type` | string | `temperature`, `humidity`, `co2`, `energy_meter`, `power_factor`, `fuel_level`, `vibration`, `runtime` |
| `status` | string | `online`, `offline`, `stale` |
| `page`, `limit` | number | Pagination |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Temp Sensor - Lobby",
      "type": "temperature",
      "unit": "°C",
      "status": "online",
      "lastValue": 24.5,
      "lastSeenAt": "2026-04-14T10:29:55Z",
      "zoneId": "uuid",
      "zoneName": "Lobby",
      "buildingId": "uuid"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 120, "totalPages": 6 }
}
```

---

### GET `/sensors/:id`

Get sensor details with latest reading.

- **Auth required**: Yes
- **Roles**: Any

---

### GET `/sensors/:id/readings`

Get sensor time-series data.

- **Auth required**: Yes
- **Roles**: Any

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `from` | ISO 8601 | Yes | Start timestamp |
| `to` | ISO 8601 | Yes | End timestamp |
| `interval` | string | No | Aggregation: `raw`, `1min`, `5min`, `15min`, `hourly` (default: `raw`) |

**Response 200 OK:**

```json
{
  "data": {
    "sensorId": "uuid",
    "sensorType": "temperature",
    "unit": "°C",
    "readings": [
      { "timestamp": "2026-04-14T09:00:00Z", "value": 24.1 },
      { "timestamp": "2026-04-14T09:00:15Z", "value": 24.2 }
    ]
  }
}
```

---

### GET `/zones`

List zones with current environmental status.

- **Auth required**: Yes
- **Roles**: Any

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `buildingId` | UUID | Filter by building |
| `floorId` | UUID | Filter by floor |
| `status` | string | `normal`, `warning`, `critical` |

**Response 200 OK:**

```json
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
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 12, "totalPages": 1 }
}
```

---

### GET `/zones/environmental-status`

Get a summary of environmental status across all zones.

- **Auth required**: Yes
- **Roles**: Any

---

## Assets Module

### GET `/equipment`

List equipment with pagination and filtering.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `buildingId` | UUID | Filter by building |
| `type` | string | `genset`, `pump`, `ahu`, `chiller`, `boiler`, `elevator`, `transformer` |
| `healthStatus` | string | `green`, `yellow`, `red` |
| `page`, `limit` | number | Pagination |

**Response 200 OK:**

```json
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
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 25, "totalPages": 2 }
}
```

---

### POST `/equipment`

Create a new equipment record.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Request Body:**

```json
{
  "name": "AHU #3 - Floor 2",
  "type": "ahu",
  "buildingId": "uuid",
  "floorId": "uuid",
  "zoneId": "uuid",
  "serialNumber": "AHU-2025-003",
  "manufacturer": "Daikin",
  "model": "FXMQ200PVE",
  "installDate": "2025-06-15"
}
```

**Response 201 Created:** Returns the created equipment object.

---

### GET `/equipment/:id`

Get equipment details including health status and linked sensors.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

---

### PUT `/equipment/:id`

Update an equipment record.

- **Auth required**: Yes
- **Roles**: `sys_admin`

---

### DELETE `/equipment/:id`

Soft-delete (deactivate) equipment.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Response 204 No Content**

---

### GET `/equipment/:id/sensors`

Get sensors linked to an equipment.

- **Auth required**: Yes
- **Roles**: Any

---

### GET `/equipment/:id/metrics`

Get equipment runtime metrics time-series.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `metricType` | string | `running_hours`, `cycle_count`, `fuel_level`, `operating_hours` |
| `from` | ISO 8601 | Start timestamp |
| `to` | ISO 8601 | End timestamp |

**Response 200 OK:**

```json
{
  "data": {
    "equipmentId": "uuid",
    "metricType": "running_hours",
    "series": [
      { "timestamp": "2026-04-14T00:00:00Z", "value": 4500 },
      { "timestamp": "2026-04-14T01:00:00Z", "value": 4501 }
    ]
  }
}
```

---

## Spatial Module

### GET `/buildings`

List all buildings accessible to the current user.

- **Auth required**: Yes
- **Roles**: Any

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Main Building",
      "address": "Jl. Sudirman No. 1, Jakarta",
      "city": "Jakarta",
      "timezone": "Asia/Jakarta",
      "floorCount": 5,
      "sensorCount": 120
    }
  ]
}
```

---

### GET `/buildings/:id`

Get building details with floor listing.

- **Auth required**: Yes
- **Roles**: Any

---

### GET `/floors`

List floors with optional building filter.

- **Auth required**: Yes
- **Roles**: Any

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `buildingId` | UUID | Filter by building |

---

### GET `/floor-plans`

List available floor plans.

- **Auth required**: Yes
- **Roles**: Any

---

### POST `/floor-plans`

Upload a floor plan file (SVG or PNG).

- **Auth required**: Yes
- **Roles**: `sys_admin`
- **Content-Type**: `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | SVG or PNG file (max 10 MB) |
| `buildingId` | UUID | Yes | Associated building |
| `floorId` | UUID | Yes | Associated floor |
| `label` | string | Yes | Display label |

**Response 201 Created:**

```json
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

---

### DELETE `/floor-plans/:id`

Delete a floor plan and its file.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Response 204 No Content**

---

### GET `/floor-plans/:id/placements`

Get sensor placements on a floor plan.

- **Auth required**: Yes
- **Roles**: Any

**Response 200 OK:**

```json
{
  "data": {
    "floorPlanId": "uuid",
    "placements": [
      {
        "sensorId": "uuid",
        "sensorName": "Temp Sensor - Lobby",
        "sensorType": "temperature",
        "x": 45.2,
        "y": 32.8,
        "rotation": 0,
        "lastValue": 24.5,
        "status": "online"
      }
    ]
  }
}
```

---

### POST `/floor-plans/:id/placements`

Batch update sensor placements on a floor plan.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Request Body:**

```json
{
  "placements": [
    {
      "sensorId": "uuid",
      "x": 45.2,
      "y": 32.8,
      "rotation": 0
    }
  ]
}
```

**Validation:**
- `x` and `y` must be between 0 and 100 (percentage of floor plan dimensions)
- `rotation` must be between 0 and 360 (degrees)

---

## Alerts Module

### GET `/alert-rules`

List configured alert rules.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "High Temperature Alert",
      "sensorType": "temperature",
      "sensorId": null,
      "buildingId": "uuid",
      "operator": ">",
      "threshold": 30.0,
      "severity": "warning",
      "cooldownMinutes": 15,
      "emailNotification": true,
      "emailRecipients": ["rina@example.com"],
      "isActive": true,
      "createdBy": "uuid",
      "createdAt": "2026-04-14T10:00:00Z"
    }
  ]
}
```

---

### POST `/alert-rules`

Create a new alert rule.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Request Body:**

```json
{
  "name": "High Temperature Alert",
  "sensorType": "temperature",
  "sensorId": null,
  "buildingId": "uuid",
  "operator": ">",
  "threshold": 30.0,
  "severity": "warning",
  "cooldownMinutes": 15,
  "emailNotification": true,
  "emailRecipients": ["rina@example.com"],
  "isActive": true
}
```

**Operator values**: `>`, `<`, `>=`, `<=`, `==`

**Severity values**: `info`, `warning`, `critical`

---

### GET `/alert-rules/:id`

Get alert rule details.

- **Auth required**: Yes
- **Roles**: `sys_admin`

---

### PUT `/alert-rules/:id`

Update an alert rule.

- **Auth required**: Yes
- **Roles**: `sys_admin`

---

### DELETE `/alert-rules/:id`

Delete an alert rule.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Response 204 No Content**

---

### GET `/alerts`

List triggered alerts with pagination and filtering.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `buildingId` | UUID | Filter by building |
| `severity` | string | `info`, `warning`, `critical` |
| `status` | string | `active`, `acknowledged`, `resolved` |
| `sensorType` | string | Filter by sensor type |
| `from` | ISO 8601 | Start timestamp |
| `to` | ISO 8601 | End timestamp |
| `page`, `limit` | number | Pagination |

**Response 200 OK:**

```json
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
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

---

### GET `/alerts/:id`

Get alert details.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

---

### PUT `/alerts/:id/acknowledge`

Acknowledge an active alert.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

**Request Body:**

```json
{
  "comment": "Investigating high temperature in lobby area"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "id": "uuid",
    "status": "acknowledged",
    "acknowledgedAt": "2026-04-14T10:20:00Z",
    "acknowledgedBy": "uuid",
    "comment": "Investigating high temperature in lobby area"
  }
}
```

---

### PUT `/alerts/:id/resolve`

Resolve an acknowledged alert.

- **Auth required**: Yes
- **Roles**: `sys_admin`, `technician`

**Request Body:**

```json
{
  "comment": "HVAC adjusted, temperature returning to normal"
}
```

**Response 200 OK:**

```json
{
  "data": {
    "id": "uuid",
    "status": "resolved",
    "resolvedAt": "2026-04-14T11:00:00Z",
    "resolvedBy": "uuid",
    "comment": "HVAC adjusted, temperature returning to normal"
  }
}
```

---

## Notifications

### GET `/notifications`

Get in-app notifications for the current user.

- **Auth required**: Yes
- **Roles**: Any

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page`, `limit` | number | Pagination |
| `unreadOnly` | boolean | Filter to unread only |

**Response 200 OK:**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "High Temperature Alert",
      "message": "Temperature exceeded 30.0°C in Lobby",
      "severity": "warning",
      "alertId": "uuid",
      "isRead": false,
      "createdAt": "2026-04-14T10:15:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

---

### PUT `/notifications/:id/read`

Mark a single notification as read.

- **Auth required**: Yes
- **Roles**: Any

**Response 200 OK**

---

### PUT `/notifications/read-all`

Mark all notifications as read for the current user.

- **Auth required**: Yes
- **Roles**: Any

**Response 200 OK**

---

## Dashboard Module

### GET `/dashboard/executive`

Financial decision maker executive dashboard summary.

- **Auth required**: Yes
- **Roles**: `financial_decision_maker`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildingId` | UUID | Yes | Building to summarize |

**Response 200 OK:**

```json
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
      { "date": "2026-04-09", "kwh": 1180 },
      { "date": "2026-04-10", "kwh": 1320 }
    ],
    "topAnomalies": [
      {
        "id": "uuid",
        "message": "Weekend energy spike: +35% above baseline",
        "severity": "warning",
        "timestamp": "2026-04-13T02:00:00Z"
      }
    ],
    "comfortOverview": {
      "zonesNormal": 10,
      "zonesWarning": 2,
      "zonesCritical": 0
    }
  }
}
```

---

### GET `/dashboard/sysadmin`

System administrator operational overview dashboard.

- **Auth required**: Yes
- **Roles**: `sys_admin`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildingId` | UUID | Yes | Building to summarize |

**Response 200 OK:**

```json
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
      }
    ],
    "mqttBrokerStatus": "connected",
    "dbStatus": "healthy",
    "lastDataIngestion": "2026-04-14T10:29:58Z"
  }
}
```

---

### GET `/dashboard/technician`

Technician task-focused dashboard.

- **Auth required**: Yes
- **Roles**: `technician`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `buildingId` | UUID | Yes | Building to summarize |

**Response 200 OK:**

```json
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
      }
    ],
    "pendingAlerts": [
      {
        "id": "uuid",
        "message": "Vibration threshold exceeded on Pump #2",
        "severity": "warning",
        "triggeredAt": "2026-04-14T09:45:00Z"
      }
    ],
    "recentActivity": [
      {
        "type": "alert_acknowledged",
        "message": "You acknowledged: High temperature in Server Room",
        "timestamp": "2026-04-14T08:30:00Z"
      }
    ]
  }
}
```

---

## Health Check

### GET `/health`

Returns the API server health status. Does not require authentication.

**Response 200 OK:**

```json
{
  "status": "ok",
  "service": "smart-building-api",
  "timestamp": "2026-04-14T10:30:00Z",
  "uptime": 86400,
  "environment": "production"
}
```

---

## Error Codes

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | OK — Request succeeded |
| 201 | Created — Resource created successfully |
| 204 | No Content — Request succeeded, no body returned |
| 400 | Bad Request — Missing required parameters |
| 401 | Unauthorized — Missing or invalid authentication |
| 403 | Forbidden — Insufficient role permissions |
| 404 | Not Found — Resource does not exist |
| 409 | Conflict — Duplicate resource (e.g., email already exists) |
| 422 | Unprocessable Entity — Validation error |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal Server Error — Unexpected server failure |

### Application Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `UNAUTHORIZED` | 401 | Missing or invalid Bearer token |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_TOKEN` | 401 | Malformed or tampered token |
| `INVALID_REFRESH_TOKEN` | 401 | Refresh token missing, expired, or revoked |
| `FORBIDDEN` | 403 | User role lacks permission for this action |
| `NOT_FOUND` | 404 | Requested resource not found |
| `EMAIL_EXISTS` | 409 | Email address already registered |
| `VALIDATION_ERROR` | 422 | Request body/params failed Zod validation |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests — retry after indicated time |
| `MISSING_BUILDING` | 400 | Required `buildingId` parameter not provided |
| `INTERNAL_ERROR` | 500 | Unexpected server error (details masked in production) |

### Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /auth/login` | 5 requests | 15 minutes (per IP) |
| All other endpoints | 100 requests | 15 minutes (per IP) |

When rate-limited, the response includes:
- `Retry-After` header with seconds until the limit resets
- `X-RateLimit-Limit` — Maximum requests allowed
- `X-RateLimit-Remaining` — Remaining requests in window
- `X-RateLimit-Reset` — Unix timestamp when the window resets

---

## WebSocket Events (Socket.IO)

The backend also provides real-time updates via Socket.IO on the same port as the API (`:4000`).

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: { token: '<accessToken>' }
});
```

Authentication is required — pass the JWT access token in `handshake.auth.token`.

### Room Subscription

```javascript
// Join a building room to receive its sensor data and alerts
socket.emit('join:building', '<buildingId>');

// Join a specific zone room
socket.emit('join:zone', '<zoneId>');

// Leave rooms
socket.emit('leave:building', '<buildingId>');
socket.emit('leave:zone', '<zoneId>');
```

Room IDs must be valid UUIDs. Invalid IDs are silently rejected.

### Events Received

| Event | Payload | Description |
|-------|---------|-------------|
| `sensor:reading` | `{ sensorId, value, timestamp }` | New sensor reading |
| `alert:new` | `{ alertId, severity, message }` | New alert triggered |
| `alert:updated` | `{ alertId, status }` | Alert acknowledged or resolved |
