# 07 — QA Test Plan: Smart Building Dashboard

**Stage**: [7] QA  
**Date**: 2026-04-15  
**Agent**: QA Engineer  

---

## 1. Test Plan

### 1.1 Scope

**In Scope**:
- Backend API: 8 modules — auth, users, energy, environmental (sensors/zones), assets (equipment), spatial (buildings/floors/floor-plans), alerts (alert-rules/alerts/notifications), dashboard
- Frontend: 9 routes — login, dashboard (3 role variants), energy, environment, assets, assets/[id], floor-plans, alerts, settings
- Authentication & authorization: JWT lifecycle, RBAC for 3 roles
- Real-time: Socket.IO connection, room join/leave
- Database: Prisma ORM queries, TimescaleDB time-series data
- Input validation: Zod schemas on all API endpoints
- Error handling: global error handler, typed API errors
- Security: rate limiting, Helmet, CORS, SVG sanitization

**Out of Scope**:
- MQTT ingestion pipeline (acknowledged as not fully implemented — stub only)
- PWA/offline support (not implemented)
- Dark/light theme toggle (dark-only)
- Client-side caching (SWR/React Query deferred)
- Live WebSocket data display (infrastructure exists, not wired to UI)

### 1.2 Test Objectives

| Objective | Quality Gate |
|-----------|-------------|
| All critical user journeys pass | 100% pass rate on P0/P1 scenarios |
| API contracts match shared types | Zero type mismatch between backend response and `shared/types` |
| Auth flows secure and correct | Token refresh, expiry, RBAC enforcement verified |
| Input validation rejects bad data | All negative/boundary cases handled via Zod |
| Role-based access enforced | Each endpoint rejects unauthorized roles with 403 |
| Error responses follow consistent format | All errors return `{ error: { code, message } }` |
| Frontend renders correctly per role | Role-specific sidebar, dashboard, and data access |
| Alert lifecycle complete | trigger → acknowledge → resolve with state transitions |

### 1.3 Test Levels & Coverage Matrix

| Level | Tool | Target | Coverage Goal |
|-------|------|--------|---------------|
| Unit | Vitest | Services, utilities, validation schemas, React components | ≥ 80% line coverage |
| Integration | Supertest + Vitest | API endpoints, middleware chains, DB queries | All routes tested |
| E2E | Playwright | Critical user flows across 3 roles | 15+ scenario scripts |
| Security | Manual + OWASP ZAP | Auth, injection, XSS, CSRF, rate limiting | OWASP Top 10 checks |
| Performance | k6 / Artillery (recommended) | API response times under load | p95 < 500ms for reads |

### 1.4 Environment & Tooling

| Concern | Configuration |
|---------|---------------|
| Backend test DB | PostgreSQL test instance, Prisma migrate on test setup |
| Redis | Local Redis or `ioredis-mock` for rate limiter tests |
| MQTT | Mocked — not integration-tested (out of scope) |
| Frontend | Next.js dev server on port 3000, backend mock or running on 4000 |
| CI | GitHub Actions: `npm test` → Vitest, `npx playwright test` → E2E |
| Test data | Seed script at `src/database/seed.ts`; per-test factories recommended |

---

## 2. Code Quality Review

### 2.1 Code Structure Assessment

**Strengths**:
- Clean modular structure: each backend module has `routes → controller → service → validation`
- Shared types between frontend and backend in `src/shared/types/index.ts`
- Zod validation on all API inputs (body, query, params)
- Consistent error response format via `sendError()` utility
- Redis-backed sliding window rate limiter with proper headers
- Environment config validated with Zod at startup (fail-fast)
- SVG sanitization middleware for floor plan uploads

**Concerns**:

| File | Line(s) | Issue | Severity |
|------|---------|-------|----------|
| `src/backend/src/modules/auth/auth.service.ts` | 13–30 | Login does not differentiate between "user not found" and "user inactive" — both return same error. Correct from security perspective (prevents enumeration), but audit log should record the distinction. | Low |
| `src/backend/src/modules/spatial/spatial.routes.ts` | 28–32 | Multer `filename` uses `Math.random()` — not cryptographically secure. File name collisions are theoretically possible under high concurrency. Should use `crypto.randomUUID()`. | Low |
| `src/backend/src/modules/spatial/spatial.routes.ts` | 45–53 | SVG sanitization uses regex-based `<script>` stripping. This is brittle — obfuscated payloads can bypass regex. Consider using a library like `DOMPurify` (server-side with `jsdom`) or `sanitize-html`. | Medium |
| `src/backend/src/middleware/rateLimiter.ts` | 30–50 | Rate limiter silently falls through to `next()` if Redis pipeline returns null (line ~45). If Redis is down, rate limiting is disabled entirely — should log a warning at minimum. | Medium |
| `src/backend/src/modules/auth/auth.routes.ts` | 11 | `/auth/register` has no `authenticate` or `requireRole` middleware — any unauthenticated user can register. Coder plan says admin-only. **This is a security defect.** | **Critical** |
| `src/backend/src/server.ts` | 120–130 | Socket.IO `join:building` accepts any `buildingId` string without authentication or validation. A connected client can join any building room and receive data broadcasts. | High |
| `src/frontend/src/lib/api.ts` | 24–30 | `buildUrl()` uses `window.location.origin` — will fail during SSR (Next.js server-side rendering). Must guard with `typeof window !== 'undefined'`. | Medium |
| `src/backend/src/config/index.ts` | 10–11 | `.env` path is hardcoded relative (`../../../../.env`). Works in dev but fragile for Docker containers or CI. | Low |

### 2.2 Security Concerns

| # | Finding | Risk | Recommendation |
|---|---------|------|----------------|
| S1 | Open registration endpoint — no auth guard on `POST /auth/register` | Critical | Add `authenticate` + `requireRole('sys_admin')` middleware |
| S2 | Socket.IO rooms unprotected — no token verification on connection | High | Verify JWT in `io.use()` middleware before allowing `join:building` |
| S3 | SVG sanitization via regex is bypassable | Medium | Replace with `DOMPurify` + `jsdom` or reject SVG entirely |
| S4 | Rate limiter degrades open when Redis fails | Medium | Add fallback in-memory limiter or reject requests |
| S5 | No CSRF protection on cookie-based refresh | Medium | Add `SameSite=Strict` on refresh cookie and validate `Origin` header |
| S6 | JWT secret minimum 32 chars enforced at config level — good | Info | No action needed |
| S7 | Helmet and CORS properly configured | Info | No action needed |

### 2.3 Performance Concerns

| # | Finding | Impact |
|---|---------|--------|
| P1 | Dashboard endpoints (`/executive`, `/operations`, `/technician`) likely run multiple aggregation queries per request. No caching layer. | High latency under concurrent dashboard loads |
| P2 | `SensorReading` hypertable queries without explicit time range limits could scan large datasets | Slow responses, high DB load |
| P3 | No pagination on `GET /notifications` by default (need to verify query schema) | Unbounded result sets |
| P4 | No connection pooling configuration exposed for Prisma (relies on defaults) | May hit connection limits under load |

---

## 3. Validation Results Framework

### 3.1 Requirement-to-Test Traceability Map

| Requirement ID | Feature | Source Artifact | Test Level | Test Case IDs |
|----------------|---------|-----------------|------------|---------------|
| REQ-AUTH-01 | User login with email/password | 03-sa, 04-uiux | Unit, Integration, E2E | UT-AUTH-01..03, IT-AUTH-01..04, E2E-AUTH-01..03 |
| REQ-AUTH-02 | JWT access + refresh token lifecycle | 03-sa | Unit, Integration | UT-AUTH-04..06, IT-AUTH-05..08 |
| REQ-AUTH-03 | Role-based access control (3 roles) | 03-sa, 05-data | Integration | IT-RBAC-01..09 |
| REQ-AUTH-04 | User registration (admin only) | 03-sa | Integration | IT-AUTH-09..11 |
| REQ-ENERGY-01 | Energy consumption trends | 03-sa, 04-uiux | Integration, E2E | IT-ENERGY-01..03, E2E-ENERGY-01 |
| REQ-ENERGY-02 | Billing projection | 03-sa | Integration | IT-ENERGY-04..05 |
| REQ-ENV-01 | Sensor readings retrieval | 03-sa | Integration | IT-ENV-01..04 |
| REQ-ENV-02 | Zone environmental status | 03-sa, 04-uiux | Integration, E2E | IT-ENV-05..07, E2E-ENV-01 |
| REQ-ASSET-01 | Equipment CRUD | 03-sa | Integration | IT-ASSET-01..08 |
| REQ-ASSET-02 | Equipment health tracking | 03-sa | Integration | IT-ASSET-09..10 |
| REQ-ALERT-01 | Alert rule CRUD | 03-sa | Integration | IT-ALERT-01..06 |
| REQ-ALERT-02 | Alert lifecycle (trigger→ack→resolve) | 03-sa, 04-uiux | Integration, E2E | IT-ALERT-07..12, E2E-ALERT-01 |
| REQ-ALERT-03 | Notification management | 03-sa | Integration | IT-NOTIF-01..04 |
| REQ-DASH-01 | Role-based dashboard aggregation | 03-sa, 04-uiux | Integration, E2E | IT-DASH-01..04, E2E-DASH-01..03 |
| REQ-SPATIAL-01 | Building/floor listing | 03-sa | Integration | IT-SPATIAL-01..04 |
| REQ-SPATIAL-02 | Floor plan upload + sensor placement | 03-sa | Integration | IT-SPATIAL-05..08 |
| REQ-USER-01 | User management (admin) | 03-sa | Integration | IT-USER-01..06 |

### 3.2 Pass/Fail Criteria

- **Pass**: Response status matches expected, body shape matches shared types, state mutations verified in DB
- **Fail**: Unexpected status code, missing/wrong fields, unhandled exception, test timeout (> 10s for API, > 30s for E2E)

### 3.3 Defect Severity Model

| Severity | Definition | SLA |
|----------|-----------|-----|
| **Critical** | Data loss, security breach, total feature failure | Must fix before release |
| **High** | Major feature broken, significant UX regression | Must fix before release |
| **Medium** | Feature partially broken, workaround exists | Fix in next sprint |
| **Low** | Cosmetic, minor inconsistency, minor DX issue | Backlog |

---

## 4. Test Cases

### 4.1 Unit Tests (Vitest)

**Estimated count: ~85 test cases**

#### 4.1.1 Backend — Auth Service (`src/backend/src/modules/auth/auth.service.ts`)

| ID | Test Case | Target Function | Expected |
|----|-----------|-----------------|----------|
| UT-AUTH-01 | Login with valid credentials returns user + tokens | `AuthService.login()` | Returns `{ user, accessToken, refreshToken }` |
| UT-AUTH-02 | Login with wrong password throws INVALID_CREDENTIALS | `AuthService.login()` | Throws 401 |
| UT-AUTH-03 | Login with nonexistent email throws INVALID_CREDENTIALS | `AuthService.login()` | Throws 401 |
| UT-AUTH-04 | Login with inactive user throws INVALID_CREDENTIALS | `AuthService.login()` | Throws 401 |
| UT-AUTH-05 | Register with new email creates user | `AuthService.register()` | Returns user object |
| UT-AUTH-06 | Register with duplicate email throws EMAIL_EXISTS | `AuthService.register()` | Throws 409 |
| UT-AUTH-07 | Refresh with valid token returns new access token | `AuthService.refresh()` | Returns accessToken |
| UT-AUTH-08 | Refresh with expired token throws error | `AuthService.refresh()` | Throws 401 |
| UT-AUTH-09 | Refresh with revoked token throws error | `AuthService.refresh()` | Throws 401 |
| UT-AUTH-10 | Logout revokes all user refresh tokens | `AuthService.logout()` | Tokens marked revoked |
| UT-AUTH-11 | Password hashed with bcrypt (12 rounds) | `AuthService.register()` | bcrypt.compare returns true |

#### 4.1.2 Backend — Validation Schemas

| ID | Test Case | Target File | Expected |
|----|-----------|-------------|----------|
| UT-VAL-01 | Login schema accepts valid email + password | `auth.validation.ts` | Parse success |
| UT-VAL-02 | Login schema rejects missing email | `auth.validation.ts` | Parse failure |
| UT-VAL-03 | Login schema rejects empty password | `auth.validation.ts` | Parse failure |
| UT-VAL-04 | Register schema requires name, role, email, password | `auth.validation.ts` | Parse success/failure |
| UT-VAL-05 | Register schema rejects invalid role | `auth.validation.ts` | Parse failure |
| UT-VAL-06 | Energy trends query schema validates date range | `energy.validation.ts` | Parse success/failure |
| UT-VAL-07 | Equipment creation requires name, type, buildingId | `assets.validation.ts` | Parse success/failure |
| UT-VAL-08 | Alert rule schema validates operator and threshold | `alerts.validation.ts` | Parse success/failure |
| UT-VAL-09 | UUID param schemas reject non-UUID strings | `*.validation.ts` | Parse failure |
| UT-VAL-10 | List query schemas coerce page/limit to numbers | `*.validation.ts` | Coerced values correct |

#### 4.1.3 Backend — Middleware

| ID | Test Case | Target File | Expected |
|----|-----------|-------------|----------|
| UT-MW-01 | `authenticate` passes with valid JWT | `middleware/auth.ts` | `req.user` populated, `next()` called |
| UT-MW-02 | `authenticate` rejects missing Authorization header | `middleware/auth.ts` | 401 response |
| UT-MW-03 | `authenticate` rejects expired JWT | `middleware/auth.ts` | 401 TOKEN_EXPIRED |
| UT-MW-04 | `authenticate` rejects malformed JWT | `middleware/auth.ts` | 401 INVALID_TOKEN |
| UT-MW-05 | `requireRole('sys_admin')` passes for sys_admin user | `middleware/rbac.ts` | `next()` called |
| UT-MW-06 | `requireRole('sys_admin')` rejects technician user | `middleware/rbac.ts` | 403 FORBIDDEN |
| UT-MW-07 | `requireRole` rejects unauthenticated request | `middleware/rbac.ts` | 401 UNAUTHORIZED |
| UT-MW-08 | `validate` middleware returns 400 on invalid body | `middleware/validate.ts` | 400 VALIDATION_ERROR |
| UT-MW-09 | `validate` replaces `req.body` with parsed data | `middleware/validate.ts` | Coerced values set |
| UT-MW-10 | `errorHandler` returns 500 with masked message in production | `middleware/errorHandler.ts` | Generic message, full log |
| UT-MW-11 | `errorHandler` returns detailed message in development | `middleware/errorHandler.ts` | Original message |
| UT-MW-12 | `rateLimiter` blocks after max requests | `middleware/rateLimiter.ts` | 429 response |
| UT-MW-13 | `rateLimiter` sets X-RateLimit-* headers | `middleware/rateLimiter.ts` | Headers present |

#### 4.1.4 Backend — Utility Functions

| ID | Test Case | Target File | Expected |
|----|-----------|-------------|----------|
| UT-UTIL-01 | `sendSuccess` returns `{ data }` with 200 | `utils/apiResponse.ts` | Correct shape |
| UT-UTIL-02 | `sendError` returns `{ error: { code, message } }` | `utils/apiResponse.ts` | Correct shape |
| UT-UTIL-03 | `sendPaginated` includes meta with total/pages | `utils/apiResponse.ts` | Correct pagination meta |
| UT-UTIL-04 | Pagination helper calculates skip/take from page/limit | `utils/pagination.ts` | Correct offset |

#### 4.1.5 Frontend — Components (Vitest + React Testing Library)

| ID | Test Case | Target Component | Expected |
|----|-----------|------------------|----------|
| UT-FE-01 | `KpiCard` renders value, label, trend indicator | `components/ui/KpiCard.tsx` | Text content visible |
| UT-FE-02 | `StatusBadge` renders correct color per status | `components/ui/StatusBadge.tsx` | CSS class matches status |
| UT-FE-03 | `LoadingSpinner` renders with optional label | `components/ui/LoadingSpinner.tsx` | Spinner + label present |
| UT-FE-04 | `AppSidebar` filters nav items by role (FDM) | `components/layout/AppSidebar.tsx` | Only FDM items shown |
| UT-FE-05 | `AppSidebar` filters nav items by role (technician) | `components/layout/AppSidebar.tsx` | Only tech items shown |
| UT-FE-06 | `ExecutiveDashboard` renders KPI cards | `components/dashboard/ExecutiveDashboard.tsx` | 4+ KPI cards rendered |
| UT-FE-07 | `SysAdminDashboard` renders sensor status section | `components/dashboard/SysAdminDashboard.tsx` | Section present |
| UT-FE-08 | `TechnicianDashboard` renders work queue | `components/dashboard/TechnicianDashboard.tsx` | Queue section present |

#### 4.1.6 Frontend — Auth Context

| ID | Test Case | Target | Expected |
|----|-----------|--------|----------|
| UT-FE-09 | `AuthProvider` sets user after successful login | `lib/auth.tsx` | `isAuthenticated: true`, user populated |
| UT-FE-10 | `AuthProvider` clears state after logout | `lib/auth.tsx` | `user: null`, `isAuthenticated: false` |
| UT-FE-11 | `api.get()` includes Bearer token in Authorization header | `lib/api.ts` | Header present |
| UT-FE-12 | `api` auto-refreshes on 401 response | `lib/api.ts` | Retry after refresh |

### 4.2 Integration Tests (Supertest + Vitest)

**Estimated count: ~75 test cases**

Test files go in `tests/integration/`. Each module gets its own test file.

#### 4.2.1 Auth Module (`tests/integration/auth.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-AUTH-01 | POST | `/api/v1/auth/login` | Valid credentials | 200 + user + accessToken + Set-Cookie (refreshToken) |
| IT-AUTH-02 | POST | `/api/v1/auth/login` | Wrong password | 401 INVALID_CREDENTIALS |
| IT-AUTH-03 | POST | `/api/v1/auth/login` | Nonexistent email | 401 INVALID_CREDENTIALS |
| IT-AUTH-04 | POST | `/api/v1/auth/login` | Inactive user | 401 INVALID_CREDENTIALS |
| IT-AUTH-05 | POST | `/api/v1/auth/login` | Missing email field | 400 VALIDATION_ERROR |
| IT-AUTH-06 | POST | `/api/v1/auth/refresh` | Valid refresh cookie | 200 + new accessToken |
| IT-AUTH-07 | POST | `/api/v1/auth/refresh` | Missing/expired cookie | 401 |
| IT-AUTH-08 | POST | `/api/v1/auth/logout` | Authenticated user | 200 + refresh token revoked |
| IT-AUTH-09 | POST | `/api/v1/auth/logout` | No auth header | 401 |
| IT-AUTH-10 | GET | `/api/v1/auth/me` | Valid token | 200 + user profile |
| IT-AUTH-11 | GET | `/api/v1/auth/me` | Expired token | 401 TOKEN_EXPIRED |

#### 4.2.2 Auth Registration — **Security Defect Regression** (`tests/integration/auth-register.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-AUTH-12 | POST | `/api/v1/auth/register` | Unauthenticated request | **Should return 401** (currently returns 200 — DEFECT S1) |
| IT-AUTH-13 | POST | `/api/v1/auth/register` | Authenticated as technician | **Should return 403** |
| IT-AUTH-14 | POST | `/api/v1/auth/register` | Authenticated as sys_admin, valid body | 201 + new user |
| IT-AUTH-15 | POST | `/api/v1/auth/register` | Duplicate email | 409 EMAIL_EXISTS |

#### 4.2.3 RBAC Enforcement (`tests/integration/rbac.test.ts`)

| ID | Method | Endpoint | Role Used | Expected |
|----|--------|----------|-----------|----------|
| IT-RBAC-01 | GET | `/api/v1/dashboard/executive` | sys_admin | 403 |
| IT-RBAC-02 | GET | `/api/v1/dashboard/executive` | financial_decision_maker | 200 |
| IT-RBAC-03 | GET | `/api/v1/dashboard/operations` | technician | 403 |
| IT-RBAC-04 | GET | `/api/v1/dashboard/operations` | sys_admin | 200 |
| IT-RBAC-05 | GET | `/api/v1/dashboard/technician` | financial_decision_maker | 403 |
| IT-RBAC-06 | GET | `/api/v1/dashboard/technician` | technician | 200 |
| IT-RBAC-07 | GET | `/api/v1/users` | technician | 403 |
| IT-RBAC-08 | POST | `/api/v1/equipment` | technician | 403 |
| IT-RBAC-09 | POST | `/api/v1/alert-rules` | technician | 403 |

#### 4.2.4 Energy Module (`tests/integration/energy.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-ENERGY-01 | GET | `/api/v1/energy/consumption` | Valid buildingId + date range | 200 + consumption data |
| IT-ENERGY-02 | GET | `/api/v1/energy/consumption` | Missing buildingId | 400 VALIDATION_ERROR |
| IT-ENERGY-03 | GET | `/api/v1/energy/trends` | Valid params | 200 + trend array |
| IT-ENERGY-04 | GET | `/api/v1/energy/billing-projection` | FDM role | 200 + projection data |
| IT-ENERGY-05 | GET | `/api/v1/energy/billing-projection` | Technician role | 403 |
| IT-ENERGY-06 | GET | `/api/v1/energy/peak-load` | Valid params | 200 + peak load data |
| IT-ENERGY-07 | GET | `/api/v1/energy/tariffs` | sys_admin | 200 + tariff data |
| IT-ENERGY-08 | GET | `/api/v1/energy/tariffs` | non-admin | 403 |
| IT-ENERGY-09 | PUT | `/api/v1/energy/tariffs` | sys_admin + valid body | 200 |

#### 4.2.5 Environmental Module (`tests/integration/environmental.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-ENV-01 | GET | `/api/v1/sensors` | sys_admin with buildingId filter | 200 + sensor array |
| IT-ENV-02 | GET | `/api/v1/sensors/:id` | Valid sensor UUID | 200 + sensor detail |
| IT-ENV-03 | GET | `/api/v1/sensors/:id` | Invalid UUID | 400 VALIDATION_ERROR |
| IT-ENV-04 | GET | `/api/v1/sensors/:id/readings` | With time range | 200 + readings array |
| IT-ENV-05 | GET | `/api/v1/zones` | With floorId filter | 200 + zone array |
| IT-ENV-06 | GET | `/api/v1/zones/:id` | Valid zone UUID | 200 + zone detail |
| IT-ENV-07 | GET | `/api/v1/zones/:id/readings` | With time range | 200 + zone readings |

#### 4.2.6 Assets Module (`tests/integration/assets.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-ASSET-01 | GET | `/api/v1/equipment` | sys_admin | 200 + equipment list |
| IT-ASSET-02 | GET | `/api/v1/equipment` | financial_decision_maker | 403 |
| IT-ASSET-03 | POST | `/api/v1/equipment` | sys_admin + valid body | 201 + created equipment |
| IT-ASSET-04 | POST | `/api/v1/equipment` | Missing required fields | 400 VALIDATION_ERROR |
| IT-ASSET-05 | GET | `/api/v1/equipment/:id` | Valid equipment ID | 200 + equipment detail |
| IT-ASSET-06 | PUT | `/api/v1/equipment/:id` | sys_admin + update body | 200 + updated equipment |
| IT-ASSET-07 | DELETE | `/api/v1/equipment/:id` | sys_admin | 200 / 204 |
| IT-ASSET-08 | DELETE | `/api/v1/equipment/:id` | technician | 403 |
| IT-ASSET-09 | GET | `/api/v1/equipment/:id/health` | Any authenticated user | 200 + health data |
| IT-ASSET-10 | GET | `/api/v1/equipment/:id/metrics` | With time range query | 200 + metrics array |
| IT-ASSET-11 | POST | `/api/v1/equipment/:id/sensors` | sys_admin + sensor IDs | 200 + linked |

#### 4.2.7 Alerts Module (`tests/integration/alerts.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-ALERT-01 | GET | `/api/v1/alert-rules` | sys_admin | 200 + rules list |
| IT-ALERT-02 | GET | `/api/v1/alert-rules` | technician | 403 |
| IT-ALERT-03 | POST | `/api/v1/alert-rules` | sys_admin + valid body | 201 + created rule |
| IT-ALERT-04 | PUT | `/api/v1/alert-rules/:id` | sys_admin + update body | 200 + updated rule |
| IT-ALERT-05 | PATCH | `/api/v1/alert-rules/:id/status` | Toggle enabled/disabled | 200 + updated status |
| IT-ALERT-06 | DELETE | `/api/v1/alert-rules/:id` | sys_admin | 200/204 |
| IT-ALERT-07 | GET | `/api/v1/alerts` | sys_admin + status filter | 200 + filtered alerts |
| IT-ALERT-08 | GET | `/api/v1/alerts` | financial_decision_maker | 403 |
| IT-ALERT-09 | GET | `/api/v1/alerts/:id` | Valid alert ID | 200 + alert detail |
| IT-ALERT-10 | PATCH | `/api/v1/alerts/:id/acknowledge` | sys_admin/technician | 200 + acknowledgedAt set |
| IT-ALERT-11 | PATCH | `/api/v1/alerts/:id/acknowledge` | Already acknowledged alert | 400 or 409 |
| IT-ALERT-12 | PATCH | `/api/v1/alerts/:id/resolve` | After acknowledge | 200 + resolvedAt set |
| IT-ALERT-13 | PATCH | `/api/v1/alerts/:id/resolve` | Without prior acknowledge | Verify behavior (may allow or reject) |

#### 4.2.8 Notifications (`tests/integration/notifications.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-NOTIF-01 | GET | `/api/v1/notifications` | Authenticated user | 200 + notification list |
| IT-NOTIF-02 | GET | `/api/v1/notifications` | With pagination params | 200 + correct page |
| IT-NOTIF-03 | PATCH | `/api/v1/notifications/read` | Valid notification IDs | 200 + marked read |
| IT-NOTIF-04 | PATCH | `/api/v1/notifications/read` | Empty IDs array | 400 VALIDATION_ERROR |

#### 4.2.9 Dashboard Module (`tests/integration/dashboard.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-DASH-01 | GET | `/api/v1/dashboard/executive` | FDM role + buildingId | 200 + KPI data, energy summary, comfort overview |
| IT-DASH-02 | GET | `/api/v1/dashboard/operations` | sys_admin + buildingId | 200 + sensor counts, equipment health, events |
| IT-DASH-03 | GET | `/api/v1/dashboard/technician` | technician + buildingId | 200 + assigned assets, pending alerts |
| IT-DASH-04 | GET | `/api/v1/dashboard/summary` | Any authenticated | 200 + building summary |

#### 4.2.10 Spatial Module (`tests/integration/spatial.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-SPATIAL-01 | GET | `/api/v1/buildings` | Authenticated | 200 + building list |
| IT-SPATIAL-02 | GET | `/api/v1/buildings/:id` | Valid building UUID | 200 + building detail |
| IT-SPATIAL-03 | GET | `/api/v1/floors` | With buildingId filter | 200 + floor list |
| IT-SPATIAL-04 | GET | `/api/v1/floors/:id` | Valid floor UUID | 200 + floor detail |
| IT-SPATIAL-05 | GET | `/api/v1/floor-plans` | With buildingId/floorId | 200 + floor plan list |
| IT-SPATIAL-06 | POST | `/api/v1/floor-plans` | sys_admin + SVG upload | 201 + floor plan created |
| IT-SPATIAL-07 | POST | `/api/v1/floor-plans` | Upload non-SVG/PNG file | 400 |
| IT-SPATIAL-08 | PUT | `/api/v1/floor-plans/:id/sensors` | sys_admin + placement data | 200 + sensor placements updated |

#### 4.2.11 User Management (`tests/integration/users.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-USER-01 | GET | `/api/v1/users` | sys_admin | 200 + user list with pagination |
| IT-USER-02 | GET | `/api/v1/users` | technician | 403 |
| IT-USER-03 | POST | `/api/v1/users` | sys_admin + valid body | 201 + new user |
| IT-USER-04 | GET | `/api/v1/users/:id` | sys_admin + valid UUID | 200 + user detail |
| IT-USER-05 | PUT | `/api/v1/users/:id` | sys_admin + update body | 200 + updated user |
| IT-USER-06 | PATCH | `/api/v1/users/:id/status` | sys_admin + { isActive: false } | 200 + user deactivated |

#### 4.2.12 Health Check (`tests/integration/health.test.ts`)

| ID | Method | Endpoint | Scenario | Expected |
|----|--------|----------|----------|----------|
| IT-HEALTH-01 | GET | `/api/v1/health` | No auth required | 200 + `{ status: 'ok' }` |

### 4.3 E2E Tests (Playwright)

**Estimated count: ~20 scenario scripts**

Test files go in `tests/e2e/`. Each scenario covers a full user journey.

#### 4.3.1 Authentication Flows

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-AUTH-01 | Successful login | 1. Navigate to /login → 2. Enter valid email/password → 3. Click Login → 4. Verify redirect to /dashboard | Dashboard page visible, user menu shows name |
| E2E-AUTH-02 | Failed login | 1. Navigate to /login → 2. Enter invalid credentials → 3. Click Login | Error message displayed, stays on login page |
| E2E-AUTH-03 | Logout | 1. Login → 2. Click user menu → 3. Click Logout | Redirected to /login, cannot access /dashboard |
| E2E-AUTH-04 | Session expiry redirect | 1. Login → 2. Invalidate token → 3. Navigate to protected page | Redirected to /login |

#### 4.3.2 Dashboard — Role Variants

| ID | Scenario | Role | Acceptance Criteria |
|----|----------|------|---------------------|
| E2E-DASH-01 | Executive dashboard | financial_decision_maker | KPI cards (energy cost, savings, comfort), energy trend chart, billing projection visible |
| E2E-DASH-02 | SysAdmin dashboard | sys_admin | Sensor status counts, equipment health bar, recent events list visible |
| E2E-DASH-03 | Technician dashboard | technician | Assigned assets list, pending alerts count, recent activity visible |

#### 4.3.3 Energy Management

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-ENERGY-01 | View energy trends | 1. Login as FDM → 2. Navigate to /energy → 3. Verify chart renders → 4. Change date range → 5. Verify chart updates | Chart has data points, date range filter works |
| E2E-ENERGY-02 | Billing projection | 1. Login as FDM → 2. Navigate to /energy → 3. Scroll to billing section | Projected cost, comparison to previous month visible |

#### 4.3.4 Environmental Monitoring

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-ENV-01 | View zone status | 1. Login → 2. Navigate to /environment → 3. Verify zone cards display | Temperature, humidity, CO2 shown per zone with status color |

#### 4.3.5 Asset Management

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-ASSET-01 | Browse equipment | 1. Login as technician → 2. Navigate to /assets → 3. Verify equipment list | Equipment cards with health status badges, search works |
| E2E-ASSET-02 | View equipment detail | 1. Login → 2. Navigate to /assets → 3. Click equipment → 4. Verify detail page | Sensor list, metrics chart, recent alerts for that equipment |
| E2E-ASSET-03 | Search/filter equipment | 1. Navigate to /assets → 2. Type in search → 3. Apply filter by type | Filtered list updates correctly |

#### 4.3.6 Alert Management

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-ALERT-01 | Alert lifecycle | 1. Login as sys_admin → 2. /alerts → 3. Filter by "active" → 4. Click Acknowledge → 5. Filter by "acknowledged" → 6. Click Resolve → 7. Filter by "resolved" | Alert status transitions correctly, timestamps updated |
| E2E-ALERT-02 | Filter alerts | 1. /alerts → 2. Filter by severity (critical) → 3. Verify only critical alerts shown | Count matches filter |

#### 4.3.7 Floor Plans

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-FLOOR-01 | View floor plan | 1. Login → 2. /floor-plans → 3. Select building → 4. Select floor → 5. Verify plan view | Floor plan displayed (or placeholder), sensor pins visible |

#### 4.3.8 Settings

| ID | Scenario | Steps | Acceptance Criteria |
|----|----------|-------|---------------------|
| E2E-SETTINGS-01 | Update profile | 1. Login → 2. /settings → 3. Change name → 4. Save → 5. Verify header shows new name | Name persisted across page refresh |
| E2E-SETTINGS-02 | Admin user management | 1. Login as sys_admin → 2. /settings → 3. Click "Add User" → 4. Fill form → 5. Submit → 6. Verify new user in list | User created, appears in list |

#### 4.3.9 Responsive Design

| ID | Scenario | Viewport | Acceptance Criteria |
|----|----------|----------|---------------------|
| E2E-RESP-01 | Mobile navigation | 375×812 (iPhone) | Sidebar hidden, bottom nav visible, hamburger menu works |
| E2E-RESP-02 | Tablet layout | 768×1024 | Sidebar collapsed, content fills width |

### 4.4 Test Data Requirements

| Entity | Seed Quantity | Notes |
|--------|--------------|-------|
| Users | 3 (one per role) | Passwords known for test login |
| Buildings | 2 | One with full data, one sparse |
| Floors | 4 | Across both buildings |
| Zones | 8 | Mix of zone types |
| Sensors | 20 | All sensor types, mix of online/offline/stale |
| Sensor readings | 500+ | Time-series data for last 30 days |
| Equipment | 10 | All equipment types, mix of health statuses |
| Equipment metrics | 100+ | Historical metrics |
| Alert rules | 5 | Various operators and thresholds |
| Alerts | 15 | 5 active, 5 acknowledged, 5 resolved |
| Notifications | 20 | Mix of read/unread |
| Floor plans | 2 | SVG files |

---

## 5. Acceptance Criteria

### 5.1 Auth & Users

- [ ] Users can log in with email/password and receive JWT + httpOnly refresh cookie
- [ ] Invalid credentials return 401 with generic error message (no user enumeration)
- [ ] Access token expires in 15m; refresh token in 7d
- [ ] Token refresh returns new access token without requiring re-login
- [ ] Logout revokes refresh tokens server-side
- [ ] Only `sys_admin` can register new users (**currently broken — S1**)
- [ ] Only `sys_admin` can list/update/deactivate users
- [ ] Deactivated users cannot log in

### 5.2 Energy

- [ ] All authenticated users can view energy consumption and trends
- [ ] Only `financial_decision_maker` and `sys_admin` can view billing projections
- [ ] Only `sys_admin` can view/update tariffs
- [ ] Energy charts render with correct time-series data
- [ ] Date range filters correctly constrain returned data

### 5.3 Environmental

- [ ] Sensor list supports filtering by buildingId, type, status
- [ ] Individual sensor detail returns readings with time-series data
- [ ] Zone environmental status shows temperature, humidity, CO2 with status
- [ ] Zone readings endpoint returns aggregated sensor data for the zone

### 5.4 Assets

- [ ] Only `sys_admin` and `technician` can view equipment
- [ ] Only `sys_admin` can create, update, and delete equipment
- [ ] Equipment detail shows linked sensors and metrics history
- [ ] Health status (green/yellow/red) calculated correctly
- [ ] Equipment search/filter works on the frontend

### 5.5 Alerts

- [ ] Only `sys_admin` can CRUD alert rules
- [ ] Only `sys_admin` and `technician` can view/manage alerts
- [ ] Alert lifecycle: active → acknowledged (with timestamp, userId) → resolved (with timestamp, userId, notes)
- [ ] Cannot acknowledge an already resolved alert
- [ ] Notifications created for triggered alerts
- [ ] Notifications mark-read works with bulk IDs

### 5.6 Dashboard

- [ ] Executive dashboard returns energy KPIs, cost summary, comfort index
- [ ] Operations dashboard returns sensor counts by status, equipment health distribution, recent events
- [ ] Technician dashboard returns assigned equipment, pending alerts, recent activity
- [ ] Dashboard data correctly scoped to the user's building

### 5.7 Spatial

- [ ] Building and floor listings return correct hierarchical data
- [ ] Floor plan upload accepts only SVG and PNG files
- [ ] SVG uploads are sanitized (script tags stripped)
- [ ] Sensor placements can be set on a floor plan
- [ ] Floor plan viewer displays sensor pins at correct coordinates

---

## 6. Non-Functional Testing

### 6.1 Performance

| Test | Method | Criteria |
|------|--------|----------|
| API response time — simple reads | Supertest timing | p95 < 200ms |
| API response time — dashboard aggregation | Supertest timing | p95 < 500ms |
| API response time — time-series queries | Supertest timing | p95 < 300ms with 30-day range |
| Concurrent user simulation | k6 / Artillery | 50 concurrent users, no 5xx errors |
| Frontend initial load (LCP) | Lighthouse CI | < 2.5s on 4G |
| Database query plan review | EXPLAIN ANALYZE | No sequential scans on indexed columns |

### 6.2 Security (OWASP Top 10)

| OWASP Category | Test | Status |
|----------------|------|--------|
| A01 — Broken Access Control | RBAC enforcement on all endpoints | Tests defined (IT-RBAC-*) |
| A01 — Broken Access Control | Open registration endpoint | **DEFECT S1 — must fix** |
| A01 — Broken Access Control | Socket.IO room access without auth | **DEFECT S2 — must fix** |
| A02 — Cryptographic Failures | JWT secret length (≥32 chars) | Enforced in config validation |
| A02 — Cryptographic Failures | Password hashing (bcrypt, 12 rounds) | Verified in code |
| A02 — Cryptographic Failures | Refresh token stored as hash (SHA-256) | Verified in code |
| A03 — Injection | SQL injection via Prisma (parameterized) | Low risk — Prisma ORM |
| A03 — Injection | XSS via SVG upload | **DEFECT S3 — regex sanitization weak** |
| A04 — Insecure Design | Rate limiting on login endpoint | Configured but verify `RATE_LIMIT_AUTH_MAX` is applied |
| A05 — Security Misconfiguration | Helmet headers enabled | Verified |
| A05 — Security Misconfiguration | CORS restricted to FRONTEND_URL | Verified |
| A05 — Security Misconfiguration | Error messages masked in production | Verified in errorHandler |
| A07 — Identity & Auth Failures | Token expiry enforced | Verified |
| A07 — Identity & Auth Failures | Inactive user cannot authenticate | Verified in login flow |
| A08 — Software & Data Integrity | No `dangerouslySetInnerHTML` in frontend | Verified per coder plan |
| A09 — Security Logging | Auth events logged | winston logger in place |

### 6.3 Accessibility

| Test | Method | Criteria |
|------|--------|----------|
| Keyboard navigation on login form | Manual / Playwright | Tab order correct, Enter submits |
| Color contrast (dark theme) | Lighthouse / axe-core | AA compliant (4.5:1 text, 3:1 UI) |
| ARIA labels on interactive elements | axe-core audit | No critical violations |
| Screen reader support on KPI cards | Manual VoiceOver/NVDA | Values read correctly |

---

## 7. Quality Gates

### 7.1 Coverage Targets

| Level | Target | Measurement |
|-------|--------|-------------|
| Unit test line coverage | ≥ 80% for backend services | Vitest `--coverage` with v8/istanbul |
| Unit test branch coverage | ≥ 70% for backend services | Vitest `--coverage` |
| Integration test route coverage | 100% of defined routes | Every route in `modules/index.ts` tested |
| E2E scenario coverage | All P0/P1 user journeys | Playwright test count ≥ 15 |
| Security defect resolution | 0 Critical/High open defects | Verified before release |

### 7.2 Pass Criteria

- All unit tests pass: 0 failures
- All integration tests pass: 0 failures
- All E2E tests pass: 0 failures (flaky retries allowed: max 2)
- No Critical or High severity defects open
- Security findings S1 and S2 resolved and regression-tested
- Performance: no endpoints exceed p95 thresholds

### 7.3 Release Blockers

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| S1 | Open registration endpoint (no auth) | Critical | **OPEN — blocks release** |
| S2 | Socket.IO rooms unprotected | High | **OPEN — blocks release** |
| S3 | SVG sanitization weak (regex-based) | Medium | Open — non-blocking with risk acceptance |
| S4 | Rate limiter fails open on Redis outage | Medium | Open — non-blocking |

---

## 8. QA Report

### 8.1 Summary of Findings

The Smart Building Dashboard backend and frontend are structurally well-organized with consistent patterns across all 8 modules. Code quality is generally high — Zod validation, Prisma ORM, typed API responses, and proper middleware chains are used throughout.

**2 critical/high issues** were found that must be resolved before testing begins:

1. **S1 (Critical)**: `POST /auth/register` is exposed without authentication. Any unauthenticated client can create admin accounts. The coder plan documents this as an admin-only operation, but the route file (`src/backend/src/modules/auth/auth.routes.ts` line 11) does not apply `authenticate` or `requireRole` middleware.

2. **S2 (High)**: Socket.IO connection handler (`src/backend/src/server.ts` lines ~120–130) allows any client to join building rooms without JWT verification. This means sensor data and alert broadcasts could leak to unauthorized clients.

### 8.2 Defect Categories

| Category | Count | Breakdown |
|----------|-------|-----------|
| Security | 5 | 1 Critical, 1 High, 2 Medium, 1 Info |
| Performance | 4 | All observations for optimization |
| Functionality | 0 | No functional defects found in code review |
| Code Quality | 2 | File naming collision risk, hardcoded .env path |

### 8.3 Coverage Gaps

- MQTT message ingestion pipeline is stubbed — no test coverage possible
- WebSocket event handlers for live sensor display not implemented — no E2E coverage
- Floor plan image rendering uses placeholder — limited E2E coverage
- Password change flow not implemented — cannot test
- No test infrastructure files exist yet (no `vitest.config.ts`, no `playwright.config.ts`)

### 8.4 Recommended Actions

| Priority | Action | Owner |
|----------|--------|-------|
| P0 | Fix S1: Add `authenticate` + `requireRole('sys_admin')` to `POST /auth/register` | Coder |
| P0 | Fix S2: Add JWT verification middleware to Socket.IO `connection` event | Coder |
| P1 | Set up test infrastructure: `vitest.config.ts`, `playwright.config.ts`, test helpers | Tester |
| P1 | Create test seed data matching §4.4 requirements | Tester |
| P2 | Replace SVG regex sanitization with DOMPurify (S3) | Coder |
| P2 | Add Redis failure fallback for rate limiter (S4) | Coder |
| P3 | Verify `RATE_LIMIT_AUTH_MAX` is applied specifically to auth routes | Tester |
| P3 | Add CSRF token for cookie-based refresh flow (S5) | Coder |

---

## 9. Collaboration Handoff

### 9.1 Test Scenarios for Tester (Stage 8)

The Tester should execute the following in order:

1. **Set up test infrastructure**:
   - Create `vitest.config.ts` in backend + frontend
   - Create `playwright.config.ts` in project root
   - Create test utility helpers (auth test helpers — login, get token, create seeded DB)
   - Run `src/database/seed.ts` to populate test data

2. **Execute unit tests** (§4.1): ~85 test cases across services, middleware, validation, components

3. **Execute integration tests** (§4.2): ~75 test cases covering all API endpoints

4. **Execute E2E tests** (§4.3): ~20 Playwright scenarios

5. **Verify security fixes**: Confirm S1 and S2 are fixed, then run regression tests IT-AUTH-12, IT-AUTH-13

### 9.2 Security Validation Touchpoints

Pass to Security agent (Stage 9):
- S1 fix verification (auth guard on register)
- S2 fix verification (Socket.IO auth middleware)
- S3 assessment (SVG sanitization adequacy)
- S5 assessment (CSRF protection for refresh cookie)
- Full OWASP scan with ZAP against running API
- JWT implementation review (secret rotation, algorithm hardcoding)

### 9.3 Open Questions

| # | Question | Decision Needed From |
|---|----------|---------------------|
| Q1 | Is `POST /auth/register` intentionally unprotected or is this a bug? The coder plan says admin-only, but the route has no auth middleware. | Coder / PM |
| Q2 | Should the alert lifecycle allow resolving without prior acknowledgment? | PM / System Analyst |
| Q3 | What is the expected behavior when `PUT /users/me` is called? The coder plan references it but users.routes.ts only has admin routes. Is profile update missing? | Coder |
| Q4 | Should Socket.IO authenticate on connection or on room join? | System Analyst |
| Q5 | Are there specific rate limits for auth endpoints (login/register) separate from the general limit? `RATE_LIMIT_AUTH_MAX=5` exists but may not be applied. | Coder |

### 9.4 Post-Release Monitoring Checks

- Monitor `POST /auth/register` for unauthorized access (should return 401 after fix)
- Monitor rate limiter Redis errors (structured log query: `"Rate limiter error"`)
- Track Socket.IO connection auth failures
- Monitor 5xx error rate on dashboard aggregation endpoints
- Alert on dead_letter_queue growth (failed MQTT messages)

---

## 10. Handoff

- **Inputs consumed**:
  - `.artifacts/06-coder-plan.md` — Implementation scope, file manifest, API endpoints, QA checklist, open questions
  - `src/backend/src/` — Full backend source inspection: server.ts, all module routes/controllers/services, middleware, config, utilities
  - `src/frontend/src/` — Frontend libs (api.ts, auth.tsx, socket.ts), component structure
  - `src/shared/types/index.ts` — Shared type definitions
  - `src/database/schema.prisma` — Database schema with all models and enums

- **Outputs produced**:
  - `.artifacts/07-qa-test-plan.md` — This document

- **Open questions**:
  1. Is `POST /auth/register` intentionally unprotected? (Critical security finding)
  2. Should alert resolution require prior acknowledgment?
  3. Is the `PUT /users/me` profile update endpoint missing from backend routes?
  4. Socket.IO authentication strategy — connection-level or room-level?
  5. Are auth-specific rate limits being applied to login/register?

- **Go/No-Go**: **CONDITIONAL GO** — Tester may proceed with test infrastructure setup and writing test cases. However, **S1 (open registration)** and **S2 (Socket.IO auth)** must be fixed by Coder before integration and E2E test execution can produce valid release-readiness results. Test cases IT-AUTH-12 and IT-AUTH-13 are written to verify the S1 fix.
