# 02 — Product Manager Roadmap: Strategic Smart Building Dashboard

> **Project Code**: `20260414_Smart_Building_Dashboard`  
> **Created**: 2026-04-14  
> **Author**: Product Manager Agent (Stage 2)  
> **Status**: Ready for System Analyst Review  
> **Input Artifact**: `.artifacts/01-creator-vision.md`

---

## 1. Executive Summary

The Strategic Smart Building Dashboard is a unified web platform that consolidates fragmented building management systems — energy monitoring, environmental sensing, asset maintenance, and financial reporting — into a single responsive application. Targeting the Indonesian commercial real estate and hospitality market (~600 addressable buildings, $9M–$30M SAM), the product addresses a critical gap: no existing solution serves the full spectrum from CFO-level financial visibility to field technician mobile maintenance in one platform, localized for Indonesian currency (IDR), regulations, and green building certifications (Greenship). The MVP (Phase 1, Months 1–4) delivers real-time energy and environmental monitoring, asset health tracking, threshold-based alerting, spatial floor plan visualization, JWT-based RBAC authentication, and role-specific dashboards — all built on a modern stack (Next.js 14, Node.js/Express, PostgreSQL + TimescaleDB, MQTT) and deployable to 2–3 pilot buildings. Post-MVP phases introduce bidirectional device control, AI-driven predictive maintenance, ESG automation, and multi-property portfolio management, gated by validated pilot outcomes.

---

## 2. Stakeholder Analysis

### Persona-to-Feature Mapping

| Persona | Role in System | Primary MVP Value | Key MVP Features | Success Metric |
|---|---|---|---|---|
| **Budi Santoso** (CFO / Financial Decision Maker) | `financial_decision_maker` | Real-time energy cost visibility, eliminating 3-week reporting lag | Executive dashboard, energy cost projection in IDR, basic PDF export, anomaly highlights | Time-to-report < 5 min (from 3 weeks); cost variance visible within 5 min of data |
| **Rina Wijaya** (System Administrator) | `sys_admin` | Unified monitoring across siloed systems, alert management | Unified CME dashboard, real-time sensor data, SVG floor plan with sensor overlay, threshold alerts, alert history | Single-pane monitoring achieved; alert volume categorized; 80%+ weekly adoption |
| **Agus Pratama** (Technician) | `technician` | Mobile access to equipment status, predictive health indicators | Asset health G/Y/R view, equipment runtime counters, mobile-responsive floor plan, in-app alerts | Mobile session share > 20%; mean-time-to-respond baseline established |
| **Diana Lestari** (GM / Owner) | `financial_decision_maker` (shared role) | High-level operational summary, comfort insights | Executive summary dashboard, energy trend charts, basic comfort zone overview | Weekly login engagement; report export usage |

### Stakeholder Influence Matrix

| Stakeholder | Influence | Interest | Strategy |
|---|---|---|---|
| Financial Decision Maker (CFO/Owner) | High (budget authority) | High (ROI, compliance) | Manage closely — deliver visible IDR savings early |
| System Administrator | Medium (implementation gatekeeper) | High (daily user) | Keep satisfied — ensure setup is self-service, not consultant-dependent |
| Technician | Low (end user) | Medium (tool adoption) | Monitor — design for zero-training simplicity |
| IT Department (if separate) | Medium (infrastructure approval) | Medium (security, ops) | Keep informed — provide security documentation and deployment clarity |

---

## 3. Feature Roadmap

### Phase 1: MVP — Foundation & Validation (Months 1–4)

**Objective**: Deliver a deployable, production-ready monitoring platform to 2–3 pilot buildings that demonstrates measurable value (energy visibility, reduced alert response time).

| Module | Feature | Priority | Complexity | Sprint Target |
|---|---|---|---|---|
| **AUTH-01** | JWT Authentication (login, logout, token refresh) | Must | Medium | Sprint 1–2 |
| **AUTH-02** | RBAC with 3 roles (financial_decision_maker, sys_admin, technician) | Must | Medium | Sprint 1–2 |
| **AUTH-03** | User management (CRUD by sys_admin) | Must | Low | Sprint 2 |
| **PLAT-01** | Next.js 14 App Router shell with Tailwind CSS | Must | Medium | Sprint 1 |
| **PLAT-02** | Responsive layout (desktop + tablet + mobile breakpoints) | Must | Medium | Sprint 1–2 |
| **PLAT-03** | Dark/Light theme toggle | Should | Low | Sprint 7 |
| **PLAT-04** | Backend API (Node.js/Express, TypeScript) | Must | Medium | Sprint 1 |
| **PLAT-05** | PostgreSQL + TimescaleDB setup with migrations | Must | Medium | Sprint 1 |
| **DATA-01** | MQTT broker integration (subscribe to sensor topics) | Must | High | Sprint 2–3 |
| **DATA-02** | MQTT message parser + data normalization pipeline | Must | High | Sprint 2–3 |
| **DATA-03** | TimescaleDB hypertable for sensor time-series data | Must | Medium | Sprint 2 |
| **DATA-04** | Data retention policy (raw: 7d, 1-min avg: 90d, hourly: 2yr) | Must | Medium | Sprint 3 |
| **DATA-05** | REST API for time-series queries (range, aggregation, downsample) | Must | Medium | Sprint 3 |
| **ENERGY-01** | Real-time energy dashboard (kWh, Power Factor, Peak Load) | Must | High | Sprint 3–4 |
| **ENERGY-02** | Daily/weekly/monthly energy trend charts | Must | Medium | Sprint 4 |
| **ENERGY-03** | Basic billing projection in IDR (tariff × consumption) | Must | Medium | Sprint 5 |
| **ENV-01** | Environmental monitoring display (temperature, humidity, CO2/AQI) per zone | Must | Medium | Sprint 4 |
| **ENV-02** | Zone-based environmental status indicators | Must | Low | Sprint 4 |
| **ASSET-01** | Asset/equipment inventory (CRUD) | Must | Medium | Sprint 5 |
| **ASSET-02** | Asset health status with G/Y/R indicators | Must | Medium | Sprint 5 |
| **ASSET-03** | Runtime counters (genset hours, pump cycles, operating hours) | Must | Medium | Sprint 5–6 |
| **ASSET-04** | Fuel level monitoring (genset) | Must | Low | Sprint 5 |
| **SPATIAL-01** | SVG/PNG floor plan upload | Must | Medium | Sprint 6 |
| **SPATIAL-02** | Drag-and-drop sensor placement on floor plan | Must | High | Sprint 6 |
| **SPATIAL-03** | Click-to-inspect sensor detail from floor plan | Must | Medium | Sprint 6–7 |
| **ALERT-01** | Configurable threshold rules (per sensor type) | Must | Medium | Sprint 5 |
| **ALERT-02** | In-app notification system (bell icon, notification panel) | Must | Medium | Sprint 5–6 |
| **ALERT-03** | Email notification delivery | Must | Medium | Sprint 6 |
| **ALERT-04** | Alert history log with status tracking | Must | Low | Sprint 6 |
| **DASH-01** | Financial Decision Maker home dashboard | Must | High | Sprint 7 |
| **DASH-02** | System Admin home dashboard | Must | High | Sprint 7 |
| **DASH-03** | Technician home dashboard | Must | Medium | Sprint 7 |
| **REPORT-01** | Basic PDF export (energy summary, alert history) | Must | Medium | Sprint 7–8 |
| **MOBILE-01** | Mobile-responsive optimization pass | Must | Medium | Sprint 8 |
| **DEPLOY-01** | Docker containerization + docker-compose | Must | Medium | Sprint 8 |
| **DEPLOY-02** | Health check endpoint (/health) | Must | Low | Sprint 8 |
| **TEST-01** | Unit + integration test coverage (core modules) | Must | Medium | Sprint 7–8 |

**Total MVP Features**: 35 feature items across 8 modules.

### Phase 2: Intelligence & Control (Months 5–8)

| Module | Feature | Priority |
|---|---|---|
| **CTRL-01** | BACnet/Modbus gateway integration (bidirectional read/write) | Should |
| **CTRL-02** | Command execution with confirmation workflow | Should |
| **CTRL-03** | Command audit trail (who, what, when, result) | Should |
| **AUTO-01** | No-code IFTTT automation rule builder | Should |
| **AUTO-02** | Automation execution engine with scheduling | Should |
| **AUTO-03** | Automation audit log | Should |
| **3D-01** | Three.js digital twin renderer | Should |
| **3D-02** | BIM/IFC file import and parsing | Should |
| **3D-03** | 3D heatmap overlay (temperature, occupancy) | Should |
| **ESG-01** | LEED/Greenship automated score calculation | Should |
| **ESG-02** | Carbon footprint tracker (Scope 1 & 2 emissions) | Should |
| **ESG-03** | Water intensity metrics | Should |
| **PREDICT-01** | Statistical anomaly detection (z-score, moving average) | Should |
| **PREDICT-02** | Failure probability scoring per asset | Should |
| **COMFORT-01** | Comfort Score composite index | Should |
| **COMFORT-02** | Space utilization analytics | Should |
| **FIN-01** | Opex vs. Budget comparison dashboard | Should |
| **FIN-02** | Department-level cost breakdown | Should |
| **REPORT-02** | Scheduled report delivery (email, weekly/monthly) | Should |
| **ALERT-05** | Alert escalation rules and smart grouping | Should |
| **SPARE-01** | Spare parts inventory with low-stock alerts | Should |

### Phase 3: AI & Scale (Months 9–14)

| Module | Feature | Priority |
|---|---|---|
| **AI-01** | ML-based predictive maintenance (LSTM/Gradient Boosting) | Could |
| **AI-02** | What-If scenario simulation engine | Could |
| **AI-03** | Natural language dashboard query | Could |
| **MULTI-01** | Multi-property portfolio view | Could |
| **MULTI-02** | Cross-building benchmarking | Could |
| **MULTI-03** | Consolidated ESG reporting (portfolio level) | Could |
| **FIN-03** | Accounting system API integration (SAP, Oracle) | Could |
| **FIN-04** | Automated cost allocation engine | Could |
| **TENANT-01** | Multi-tenant SaaS architecture | Could |
| **TENANT-02** | White-label UI for SI partners | Could |
| **API-01** | Public API with API key management | Could |
| **API-02** | Webhook system for third-party integrations | Could |
| **PWA-01** | Progressive Web App with offline caching | Could |
| **L10N-01** | ASEAN market localization (Thailand, Malaysia, Vietnam) | Could |
| **SEC-01** | SOC 2 / ISO 27001 compliance preparation | Could |

---

## 4. Sprint Plan — Phase 1 MVP (8 Sprints × 2 Weeks)

### Sprint 1 (Weeks 1–2): Platform Foundation

**Goal**: Establish project scaffolding, CI/CD, database, authentication foundation.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| Initialize Next.js 14 App Router project with TypeScript + Tailwind CSS | PLAT-01 | Frontend | 3 |
| Set up Node.js/Express backend with TypeScript, project structure | PLAT-04 | Backend | 3 |
| PostgreSQL + TimescaleDB schema design and initial migration | PLAT-05 | Data | 5 |
| JWT authentication — registration, login, token refresh, logout endpoints | AUTH-01 | Backend | 5 |
| Frontend login page, auth context, protected route middleware | AUTH-01 | Frontend | 3 |
| Basic responsive layout shell (sidebar nav, header, main content area) | PLAT-02 | Frontend | 3 |
| Docker Compose for local dev (Postgres, TimescaleDB, API, Frontend) | — | DevOps | 2 |
| CI pipeline setup (lint, type-check, unit test scaffold) | — | DevOps | 2 |

**Acceptance Criteria**:
- [ ] User can register, log in, and receive a JWT token
- [ ] Protected API routes return 401 without valid token
- [ ] Next.js app renders with responsive sidebar layout
- [ ] PostgreSQL + TimescaleDB are running in Docker with initial schema
- [ ] CI pipeline runs lint + type-check on every push

**Sprint Capacity**: 26 points

---

### Sprint 2 (Weeks 3–4): RBAC + MQTT Foundation

**Goal**: Complete auth system with role-based access, begin MQTT data pipeline.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| RBAC middleware — role checking on API routes | AUTH-02 | Backend | 5 |
| RBAC frontend — conditional rendering based on user role | AUTH-02 | Frontend | 3 |
| User management CRUD (sys_admin only) — invite, edit, deactivate users | AUTH-03 | Backend | 3 |
| User management UI (sys_admin view) | AUTH-03 | Frontend | 3 |
| MQTT broker setup (Mosquitto in Docker) | DATA-01 | Backend | 3 |
| MQTT subscriber service — connect, subscribe to sensor topics | DATA-01 | Backend | 5 |
| MQTT message schema definition (topic naming, payload format) | DATA-02 | Data | 3 |
| Responsive layout refinements (mobile breakpoints, navigation) | PLAT-02 | Frontend | 2 |

**Acceptance Criteria**:
- [ ] `financial_decision_maker` cannot access sys_admin endpoints (403)
- [ ] `technician` can only view assigned assets and dashboards
- [ ] `sys_admin` can create, edit, and deactivate users via UI
- [ ] MQTT subscriber connects to Mosquitto and logs incoming messages
- [ ] MQTT topic schema documented (e.g., `building/{id}/floor/{id}/sensor/{type}/{id}`)
- [ ] Mobile navigation (hamburger menu) functional

**Sprint Capacity**: 27 points

---

### Sprint 3 (Weeks 5–6): Data Pipeline + Energy Monitoring Backend

**Goal**: Complete MQTT-to-TimescaleDB pipeline, build energy monitoring API.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| MQTT message parser — validate, normalize, and route messages by sensor type | DATA-02 | Backend | 5 |
| TimescaleDB hypertable creation for sensor readings | DATA-03 | Data | 3 |
| MQTT-to-DB writer service (batch insert, error handling, dead letter queue) | DATA-02 | Backend | 5 |
| Data retention policy — continuous aggregate for 1-min averages | DATA-04 | Data | 5 |
| REST API — query energy data (kWh, PF, Peak Load) by time range | DATA-05 | Backend | 3 |
| REST API — aggregation endpoints (hourly, daily, weekly, monthly) | DATA-05 | Backend | 3 |
| MQTT simulator — generate realistic energy + environmental sensor data | — | QA | 3 |

**Acceptance Criteria**:
- [ ] MQTT messages are parsed, validated, and stored in TimescaleDB hypertables
- [ ] Invalid messages are logged to dead letter queue (not silently dropped)
- [ ] API returns kWh, Power Factor, Peak Load for a given time range
- [ ] Aggregation endpoints return correct hourly/daily/weekly/monthly rollups
- [ ] Continuous aggregate policy runs automatically for 1-min averages
- [ ] MQTT simulator generates realistic data for 50+ sensors

**Sprint Capacity**: 27 points

---

### Sprint 4 (Weeks 7–8): Energy + Environmental Dashboards

**Goal**: Build the primary monitoring dashboards with real-time data visualization.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| Energy monitoring dashboard — real-time kWh gauge, PF indicator, Peak Load | ENERGY-01 | Frontend | 8 |
| Energy trend charts — daily/weekly/monthly with date range selector | ENERGY-02 | Frontend | 5 |
| WebSocket/SSE setup for real-time dashboard updates | ENERGY-01 | Backend | 5 |
| Environmental monitoring dashboard — temp, humidity, CO2/AQI per zone | ENV-01 | Frontend | 5 |
| Zone status indicators (normal/warning/critical color coding) | ENV-02 | Frontend | 2 |
| REST API — environmental data endpoints (per zone, per sensor type) | ENV-01 | Backend | 3 |

**Acceptance Criteria**:
- [ ] Energy dashboard shows live kWh, Power Factor (%), and Peak Load (kW)
- [ ] Charts update in real-time (< 5 second latency from sensor to screen)
- [ ] User can select date range and view historical trends (line charts)
- [ ] Environmental dashboard shows temperature (°C), humidity (%), CO2 (ppm) per zone
- [ ] Zones show color-coded status: green (normal), yellow (warning), red (critical)
- [ ] All data visualizations are responsive on mobile (stacked layout)

**Sprint Capacity**: 28 points

---

### Sprint 5 (Weeks 9–10): Asset Health + Alerts Engine

**Goal**: Deliver asset management with health tracking and threshold-based alerting.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| Asset/equipment inventory — CRUD API (name, type, location, metadata) | ASSET-01 | Backend | 3 |
| Asset inventory UI — list, detail, create, edit views | ASSET-01 | Frontend | 5 |
| Asset health status — G/Y/R classification logic (threshold-based) | ASSET-02 | Backend | 3 |
| Asset health dashboard — visual G/Y/R cards with key metrics | ASSET-02 | Frontend | 5 |
| Runtime counters — genset hours, pump cycles, operating hours tracking | ASSET-03 | Backend | 3 |
| Fuel level monitoring for genset assets | ASSET-04 | Backend | 2 |
| Alert threshold configuration — CRUD API (sensor type, operator, value, severity) | ALERT-01 | Backend | 5 |
| Alert evaluation engine — check incoming data against thresholds, fire alerts | ALERT-01 | Backend | 5 |
| Billing projection endpoint — tariff rate × consumption = estimated bill in IDR | ENERGY-03 | Backend | 3 |

**Acceptance Criteria**:
- [ ] sys_admin can add, edit, and view equipment in asset inventory
- [ ] Each asset displays health status as Green (healthy), Yellow (warning), or Red (critical)
- [ ] Genset shows: running hours, fuel level, last service date
- [ ] Pump shows: cycle count, vibration status, operating hours
- [ ] sys_admin can configure alert thresholds (e.g., "Temperature > 30°C → Warning")
- [ ] Alert engine evaluates incoming MQTT data and generates alerts when thresholds are breached
- [ ] Billing projection shows estimated monthly cost in IDR based on current consumption rate

**Sprint Capacity**: 34 points

---

### Sprint 6 (Weeks 11–12): Spatial View + Notifications

**Goal**: Deliver interactive floor plan with sensor overlay, complete notification system.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| SVG/PNG floor plan upload API (file validation, storage) | SPATIAL-01 | Backend | 3 |
| Floor plan viewer component (pan, zoom, responsive) | SPATIAL-01 | Frontend | 5 |
| Drag-and-drop sensor placement on floor plan | SPATIAL-02 | Frontend | 8 |
| Sensor placement persistence (coordinates stored in DB) | SPATIAL-02 | Backend | 3 |
| Click-to-inspect — tap sensor on floor plan to view live data + details | SPATIAL-03 | Frontend | 5 |
| In-app notification bell + notification panel UI | ALERT-02 | Frontend | 5 |
| Notification persistence — store and query notifications | ALERT-02 | Backend | 3 |
| Email notification service (alert → email delivery via SMTP/SES) | ALERT-03 | Backend | 3 |
| Alert history log — filterable list of all past alerts | ALERT-04 | Frontend | 3 |

**Acceptance Criteria**:
- [ ] sys_admin can upload SVG or PNG floor plan files (max 10MB)
- [ ] Floor plan renders in the browser with pan and zoom controls
- [ ] sys_admin can drag sensor icons onto the floor plan and save positions
- [ ] Clicking a sensor on the floor plan opens a detail panel with live readings
- [ ] In-app notification bell shows unread count badge
- [ ] Notification panel shows recent alerts with severity, timestamp, and message
- [ ] Email notifications are sent within 60 seconds of threshold breach
- [ ] Alert history shows all alerts with filters (severity, date range, sensor type, status)

**Sprint Capacity**: 38 points

---

### Sprint 7 (Weeks 13–14): Role Dashboards + Reports + Polish

**Goal**: Build role-specific home dashboards, PDF reporting, visual polish.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| Financial Decision Maker dashboard — executive summary, energy cost, billing projection, anomaly highlights | DASH-01 | Frontend | 8 |
| System Admin dashboard — system health overview, active alerts, device connectivity status, recent events | DASH-02 | Frontend | 8 |
| Technician dashboard — assigned assets health, pending alerts, recent activity, quick-access floor plan | DASH-03 | Frontend | 5 |
| Dark/Light theme implementation | PLAT-03 | Frontend | 3 |
| PDF report generation — energy summary report | REPORT-01 | Backend | 5 |
| PDF report generation — alert history report | REPORT-01 | Backend | 3 |
| PDF download UI integration | REPORT-01 | Frontend | 2 |
| Unit tests for auth, RBAC, alert engine, data pipeline | TEST-01 | QA | 5 |

**Acceptance Criteria**:
- [ ] Financial Decision Maker sees: total energy cost (IDR), billing projection, energy trend, top anomalies
- [ ] System Admin sees: total sensors online/offline, active alert count by severity, recent 10 events, floor plan quick-link
- [ ] Technician sees: assigned assets with G/Y/R status, pending alerts (sorted by severity), quick-access to floor plans
- [ ] Each role is redirected to their respective dashboard after login
- [ ] Dark and light themes toggle smoothly, preference is persisted
- [ ] PDF exports generate correctly formatted reports (energy summary, alert history)
- [ ] Unit test coverage ≥ 60% for core modules (auth, alerts, data pipeline)

**Sprint Capacity**: 39 points

---

### Sprint 8 (Weeks 15–16): Mobile Polish + Deployment + UAT

**Goal**: Final mobile optimization, production deployment readiness, UAT with pilot users.

| Task | Feature ID | Owner Role | Est. Points |
|---|---|---|---|
| Mobile-responsive audit — fix all breakpoint issues across all pages | MOBILE-01 | Frontend | 5 |
| Touch-friendly controls — larger tap targets, swipe gestures for floor plan | MOBILE-01 | Frontend | 3 |
| Mobile performance optimization — lazy loading, image optimization | MOBILE-01 | Frontend | 3 |
| Production Docker setup — multi-stage builds, environment config | DEPLOY-01 | DevOps | 5 |
| Docker Compose production profile (Nginx reverse proxy, SSL termination) | DEPLOY-01 | DevOps | 3 |
| Health check endpoint (/health) with DB and MQTT connectivity status | DEPLOY-02 | Backend | 2 |
| Structured logging (JSON format) across all backend services | — | Backend | 3 |
| Integration tests — API endpoint testing with Supertest | TEST-01 | QA | 5 |
| Security hardening — CORS config, helmet headers, rate limiting, input sanitization | — | Backend | 5 |
| .env.example + deployment documentation | — | DevOps | 2 |
| User Acceptance Testing with pilot building stakeholders | — | QA | 5 |

**Acceptance Criteria**:
- [ ] All pages render correctly on iPhone SE (375px) through desktop (1920px)
- [ ] Floor plan is usable on mobile (pinch-to-zoom, tap-to-inspect)
- [ ] `docker-compose up` starts entire stack (frontend, backend, DB, MQTT broker)
- [ ] `/health` endpoint returns status of all services (API, DB, MQTT)
- [ ] All API responses include structured JSON logs
- [ ] CORS restricts to allowed origins, Helmet headers applied, rate limiting on auth endpoints
- [ ] All inputs sanitized against XSS and SQL injection
- [ ] Integration tests cover all critical API paths (auth, sensors, alerts, assets)
- [ ] 2+ pilot building stakeholders complete UAT and provide feedback
- [ ] `.env.example` documents all required environment variables

**Sprint Capacity**: 41 points

---

## 5. User Stories — MVP Features (Complete)

### Authentication & Authorization

**US-AUTH-01**: As a **user**, I want to log in with my email and password so that I can securely access my building dashboard.
- **Acceptance Criteria**:
  - Login form validates email format and password (min 8 chars)
  - Successful login returns JWT access token (15-min expiry) and refresh token (7-day expiry)
  - Failed login shows descriptive error (invalid credentials, account deactivated)
  - JWT is stored securely (httpOnly cookie or secure storage)
  - After login, user is redirected to their role-specific home dashboard

**US-AUTH-02**: As a **user**, I want my session to refresh automatically so that I don't get logged out while actively using the dashboard.
- **Acceptance Criteria**:
  - Refresh token endpoint issues new access token without re-login
  - If refresh token is expired, user is redirected to login page
  - Token refresh happens transparently (no UI interruption)

**US-AUTH-03**: As a **sys_admin**, I want to manage user accounts so that I can control who has access to the building dashboard.
- **Acceptance Criteria**:
  - sys_admin can create new users with email, name, and role assignment
  - sys_admin can edit user details and change roles
  - sys_admin can deactivate (soft delete) a user account
  - sys_admin can view a list of all users with role and status filters
  - Non-sys_admin users cannot access user management

**US-AUTH-04**: As a **sys_admin**, I want to assign roles (financial_decision_maker, sys_admin, technician) to users so that each person sees only what they need.
- **Acceptance Criteria**:
  - Three roles are available: financial_decision_maker, sys_admin, technician
  - Role determines: visible menu items, accessible API endpoints, dashboard home view
  - Role changes take effect on next login (or token refresh)
  - At least one sys_admin must exist at all times (prevent last-admin removal)

### Energy Monitoring

**US-ENERGY-01**: As a **sys_admin**, I want to see real-time energy consumption (kWh) on the dashboard so that I can monitor building power usage at a glance.
- **Acceptance Criteria**:
  - Dashboard displays current total kWh consumption (updated in real-time, < 5s latency)
  - Gauge or numeric display shows current power draw in kW
  - Data is sourced from MQTT-connected energy meters
  - Stale data (> 5 min old) is indicated with a warning badge

**US-ENERGY-02**: As a **sys_admin**, I want to see Power Factor and Peak Load metrics so that I can identify power quality issues.
- **Acceptance Criteria**:
  - Power Factor displayed as percentage (0–100%) with color coding (green ≥ 85%, yellow 70–84%, red < 70%)
  - Peak Load (kW) shows the highest demand in the current period (day/week/month)
  - Peak Load timestamp is displayed ("Peak at 14:32 today")

**US-ENERGY-03**: As a **financial_decision_maker**, I want to view energy consumption trends (daily, weekly, monthly) so that I can identify usage patterns and optimization opportunities.
- **Acceptance Criteria**:
  - Line/bar charts show kWh consumption over selected time range
  - Selectable periods: last 24 hours, last 7 days, last 30 days, custom range
  - Chart supports comparison with previous period (overlay)
  - Data is aggregated appropriately (hourly for day view, daily for week/month view)

**US-ENERGY-04**: As a **financial_decision_maker**, I want to see a billing projection in IDR so that I can forecast monthly energy costs.
- **Acceptance Criteria**:
  - Shows estimated monthly bill based on: current consumption rate × configurable IDR tariff rate
  - Tariff rate is configurable by sys_admin (IDR per kWh)
  - Projection updates in real-time as consumption changes
  - Shows comparison: projected cost vs. last month actual

### Environmental Monitoring

**US-ENV-01**: As a **sys_admin**, I want to see temperature, humidity, and CO2/AQI levels for each zone so that I can ensure occupant comfort and safety.
- **Acceptance Criteria**:
  - Each zone displays: temperature (°C), humidity (%), CO2 (ppm)
  - Data updates in real-time from MQTT-connected sensors
  - Zone layout is displayed as a card grid or list (sortable by status)
  - AQI calculation from CO2 ppm is displayed with labels (Good, Moderate, Unhealthy)

**US-ENV-02**: As a **sys_admin**, I want to see visual indicators when environmental values are outside acceptable ranges so that I can quickly identify problem zones.
- **Acceptance Criteria**:
  - Green: temperature 20–26°C, humidity 40–60%, CO2 < 800 ppm
  - Yellow: temperature 26–30°C or 18–20°C, humidity 30–40% or 60–70%, CO2 800–1200 ppm
  - Red: temperature > 30°C or < 18°C, humidity < 30% or > 70%, CO2 > 1200 ppm
  - Thresholds are configurable by sys_admin
  - Problem zones sort to the top of the list

**US-ENV-03**: As a **technician**, I want to see environmental conditions on my mobile device so that I can verify conditions during my rounds.
- **Acceptance Criteria**:
  - Environmental dashboard is fully functional on mobile (375px+)
  - Cards stack vertically on mobile for easy scrolling
  - Current readings are clearly legible with large font sizes
  - Zone filter allows technician to view only their assigned zones

### Asset Health (CME)

**US-ASSET-01**: As a **sys_admin**, I want to maintain an inventory of all building equipment so that I have a central registry of assets.
- **Acceptance Criteria**:
  - CRUD operations: add, view, edit, deactivate equipment records
  - Fields: name, type (genset, pump, AHU, chiller, etc.), location (building, floor, zone), serial number, install date, last service date
  - Equipment types are predefined but extensible
  - Search and filter by type, location, health status

**US-ASSET-02**: As a **technician**, I want to see asset health status as Green/Yellow/Red indicators so that I can quickly identify equipment needing attention.
- **Acceptance Criteria**:
  - Green: all monitored parameters within normal range, no active alerts
  - Yellow: one or more parameters approaching threshold, or maintenance overdue within 7 days
  - Red: parameter threshold breached, or critical maintenance overdue
  - Health status card shows: asset name, type, location, G/Y/R indicator, key metric summary
  - Clicking a card opens detailed asset view with all parameters and history

**US-ASSET-03**: As a **technician**, I want to see genset runtime hours, fuel level, and pump cycle counts so that I can plan preventive maintenance.
- **Acceptance Criteria**:
  - Genset view: total running hours, hours since last service, fuel level (%), estimated fuel remaining (hours)
  - Pump view: total cycle count, vibration status (normal/elevated), operating hours
  - Runtime counters update from MQTT data
  - Visual bar/gauge for fuel level with low-fuel warning (< 20%)

**US-ASSET-04**: As a **sys_admin**, I want to link assets to sensors so that health status is calculated from real sensor data.
- **Acceptance Criteria**:
  - sys_admin can associate one or more MQTT sensor topics with an asset
  - When sensor data arrives, it is evaluated against asset-specific thresholds
  - Asset health G/Y/R is recalculated when new data arrives
  - Unlinked assets show "No sensor data" status

### Spatial View (Floor Plan)

**US-SPATIAL-01**: As a **sys_admin**, I want to upload SVG or PNG floor plans so that I can create a visual map of my building.
- **Acceptance Criteria**:
  - Upload supports SVG and PNG formats (max 10MB per file)
  - Each floor plan is associated with a building and floor
  - Uploaded plans are stored securely and served via CDN/static path
  - Multiple floor plans can be uploaded (one per floor)
  - Floor plan can be replaced (new upload overwrites previous)

**US-SPATIAL-02**: As a **sys_admin**, I want to drag and drop sensor icons onto the floor plan so that I can map where sensors are physically located.
- **Acceptance Criteria**:
  - Sensor palette shows available (unplaced) sensors by type (temperature, humidity, energy meter, etc.)
  - Drag sensor from palette onto floor plan to place it
  - Sensor position (x, y coordinates as percentage of plan dimensions) is saved to DB
  - Placed sensors can be repositioned by dragging
  - Placed sensors can be removed (returned to palette)
  - Sensor icons are visually distinct by type (different icons/colors)

**US-SPATIAL-03**: As a **technician**, I want to tap a sensor on the floor plan to see its current readings so that I can inspect equipment without navigating away.
- **Acceptance Criteria**:
  - Tapping a sensor icon opens a popover/drawer with: sensor name, type, current value, unit, timestamp, health status
  - Popover shows mini-chart of last 1 hour of readings
  - "View Details" link navigates to full sensor/asset detail page
  - Works on both desktop (click) and mobile (tap)

### Alerts & Notifications

**US-ALERT-01**: As a **sys_admin**, I want to configure alert thresholds for sensors so that the system notifies me when values are abnormal.
- **Acceptance Criteria**:
  - Configuration UI: select sensor/sensor type → set operator (>, <, >=, <=, ==) → set value → set severity (info, warning, critical)
  - Multiple thresholds can be set per sensor
  - Thresholds can be enabled/disabled without deletion
  - Threshold changes take effect immediately (no restart required)

**US-ALERT-02**: As a **user**, I want to receive in-app notifications when alerts are triggered so that I am aware of issues without leaving the dashboard.
- **Acceptance Criteria**:
  - Bell icon in header shows count of unread notifications
  - Clicking bell opens notification panel with list of recent notifications
  - Each notification shows: severity icon (color), message, timestamp, source sensor/asset
  - Notifications can be marked as read (individually or all)
  - Real-time delivery (notification appears within 10 seconds of threshold breach)

**US-ALERT-03**: As a **sys_admin**, I want to receive email notifications for critical alerts so that I am informed even when not looking at the dashboard.
- **Acceptance Criteria**:
  - Email notifications are sent for alerts at configurable severity levels
  - Email contains: alert severity, sensor/asset name, current value, threshold value, timestamp
  - Email delivery within 60 seconds of alert generation
  - sys_admin can configure which email addresses receive alerts
  - Rate limiting prevents email flood (max 1 email per sensor per 15 minutes for same threshold)

**US-ALERT-04**: As a **sys_admin**, I want to view alert history so that I can review past incidents and identify recurring issues.
- **Acceptance Criteria**:
  - Alert history table shows: timestamp, severity, sensor/asset, value, threshold, status (active/acknowledged/resolved)
  - Filters: date range, severity, sensor type, status
  - Alerts can be acknowledged (with optional comment)
  - Export alert history as CSV
  - Pagination for large result sets

### Dashboards

**US-DASH-01**: As a **financial_decision_maker**, I want a home dashboard tailored to financial and executive metrics so that I get an instant overview of building performance.
- **Acceptance Criteria**:
  - Dashboard shows: total energy cost today (IDR), monthly billing projection (IDR), energy trend (last 7 days), top 5 anomalies/alerts
  - Key metrics displayed as large KPI cards at the top
  - Energy trend chart shows consumption vs. previous period
  - Anomaly section highlights unusual patterns (e.g., weekend energy spike)
  - Dashboard loads in < 3 seconds

**US-DASH-02**: As a **sys_admin**, I want a home dashboard showing system health and operational status so that I can manage the building infrastructure effectively.
- **Acceptance Criteria**:
  - Dashboard shows: total sensors (online/offline count), active alerts by severity (critical/warning/info), recent 10 events timeline, equipment health summary (X green, Y yellow, Z red)
  - Quick-action links: view floor plan, manage alerts, manage assets
  - Real-time updates (alerts and sensor counts update without refresh)
  - System connectivity status (MQTT broker status, DB status)

**US-DASH-03**: As a **technician**, I want a home dashboard focused on my assigned assets and pending tasks so that I know what needs my attention.
- **Acceptance Criteria**:
  - Dashboard shows: my assigned assets with G/Y/R status, pending alerts sorted by severity, recent activity log, quick-link to floor plan
  - Assets in Red status are highlighted at the top
  - Alerts show recommended action (e.g., "Check genset fuel level")
  - Dashboard is optimized for mobile viewing

### Reporting

**US-REPORT-01**: As a **financial_decision_maker**, I want to export an energy summary report as PDF so that I can share it in board meetings.
- **Acceptance Criteria**:
  - Report includes: date range, total kWh consumption, peak load, average power factor, cost in IDR, trend chart
  - Branded header with building name and report generation date
  - PDF renders correctly on print (A4 format)
  - Download button available on energy dashboard

**US-REPORT-02**: As a **sys_admin**, I want to export alert history as PDF so that I can document incidents for compliance.
- **Acceptance Criteria**:
  - Report includes: date range, alert count by severity, alert detail table (timestamp, sensor, value, threshold, status)
  - Filter selection applies to export (same filters as UI)
  - PDF renders correctly (landscape for wide tables)

### Mobile Web

**US-MOBILE-01**: As a **technician**, I want to use the dashboard on my smartphone so that I can monitor equipment during field rounds.
- **Acceptance Criteria**:
  - All pages render correctly on screens 375px and wider
  - Navigation uses hamburger menu on mobile (< 768px)
  - Charts resize appropriately (no horizontal scrolling)
  - Floor plan supports pinch-to-zoom and tap-to-inspect on touch devices
  - Page load time < 3 seconds on 4G connection

---

## 6. Dependency Map

### Feature Dependency Graph

```
PLAT-01 (Next.js Shell)
├── PLAT-02 (Responsive Layout)
│   └── MOBILE-01 (Mobile Polish)
├── All Frontend Features
│
PLAT-04 (Backend API)
├── AUTH-01 (JWT Auth)
│   ├── AUTH-02 (RBAC)
│   │   ├── AUTH-03 (User Management)
│   │   ├── DASH-01/02/03 (Role Dashboards)
│   │   └── All Protected Endpoints
│   └── All API Endpoints
│
PLAT-05 (PostgreSQL + TimescaleDB)
├── DATA-03 (Hypertables)
│   ├── DATA-04 (Retention Policy)
│   └── DATA-05 (Time-Series Query API)
│       ├── ENERGY-01 (Real-Time Energy)
│       ├── ENERGY-02 (Energy Trends)
│       ├── ENERGY-03 (Billing Projection)
│       ├── ENV-01 (Environmental Monitoring)
│       └── ASSET-03 (Runtime Counters)
│
DATA-01 (MQTT Broker)
├── DATA-02 (MQTT Parser + Normalizer)
│   ├── DATA-03 (Store to TimescaleDB)
│   └── ALERT-01 (Threshold Evaluation)
│       ├── ALERT-02 (In-App Notifications)
│       ├── ALERT-03 (Email Notifications)
│       └── ALERT-04 (Alert History)
│
ASSET-01 (Asset Inventory)
├── ASSET-02 (Health Status G/Y/R)
├── ASSET-03 (Runtime Counters)
├── ASSET-04 (Fuel Monitoring)
└── SPATIAL-02 (Sensor Placement)
    └── SPATIAL-03 (Click-to-Inspect)
│
SPATIAL-01 (Floor Plan Upload)
├── SPATIAL-02 (Drag-Drop Sensors)
│   └── SPATIAL-03 (Click-to-Inspect)
```

### Critical Path

The critical path for MVP delivery is:

```
PLAT-01 → PLAT-04 → PLAT-05 → AUTH-01 → AUTH-02 → DATA-01 → DATA-02 → DATA-03 → DATA-05 → ENERGY-01 → DASH-01/02/03 → DEPLOY-01
```

**Critical path narrative**: Without the platform shell, backend, and database, nothing can be built. Authentication must exist before any protected feature. MQTT ingestion must work before any monitoring data is available. Energy monitoring is the first and highest-value data visualization. Role dashboards tie everything together. Deployment makes it real.

### Parallel Work Streams

| Stream | Sprint 1–2 | Sprint 3–4 | Sprint 5–6 | Sprint 7–8 |
|---|---|---|---|---|
| **Backend/Data** | Auth + MQTT setup | Data pipeline + Energy API | Asset + Alert engine | Reports + Security |
| **Frontend** | Layout + Login UI | Energy + Env dashboards | Asset + Spatial UI | Role dashboards + Mobile |
| **DevOps/QA** | Docker + CI | MQTT simulator | Notification infra | Deploy + UAT |

---

## 7. Technical Requirements Summary (for System Analyst)

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Framework** | Next.js 14 (App Router, TypeScript) | Server-side rendering for SEO, App Router for modern React patterns, TypeScript for type safety |
| **Styling** | Tailwind CSS + shadcn/ui components | Rapid UI development, consistent design system, dark/light theme support |
| **Charting** | Recharts or Chart.js (via react-chartjs-2) | Time-series visualization, responsive charts, good React integration |
| **Backend Runtime** | Node.js 20+ with Express (TypeScript) | Ecosystem maturity, MQTT library support, TypeScript consistency with frontend |
| **Database (Relational)** | PostgreSQL 16 | Users, assets, config, alert rules — standard relational data |
| **Database (Time-Series)** | TimescaleDB (PostgreSQL extension) | High-performance time-series ingestion and queries, compression, continuous aggregates |
| **ORM** | Prisma | Type-safe database access, migration management, good TypeScript DX |
| **IoT Protocol** | MQTT (via Mosquitto broker) | Industry standard for IoT sensor data, lightweight, pub/sub pattern |
| **MQTT Client** | mqtt.js (Node.js) | Mature, well-maintained, supports MQTT v5 |
| **Authentication** | JWT (access + refresh tokens) + bcrypt | Stateless auth, standard pattern, bcrypt for password hashing |
| **Real-Time (Frontend)** | WebSocket (Socket.IO) or Server-Sent Events | Push real-time sensor data to dashboard without polling |
| **PDF Generation** | Puppeteer or @react-pdf/renderer | Server-side PDF rendering for reports |
| **Email** | Nodemailer (SMTP) or AWS SES | Alert email delivery |
| **Containerization** | Docker + docker-compose | Consistent environments, easy deployment |
| **CI/CD** | GitHub Actions | Automated testing, linting, build verification |
| **Testing** | Vitest (unit), Supertest (API), Playwright (e2e) | Modern, fast test runners with good TypeScript support |

### Architecture Key Decisions (for System Analyst to validate)

1. **Monorepo vs. Polyrepo**: Recommend monorepo (single repo, shared types via `src/shared/`) for MVP simplicity.
2. **API Style**: REST API for MVP (simpler, well-understood). Evaluate GraphQL for Phase 2 if query complexity warrants it.
3. **Real-Time Strategy**: WebSocket (Socket.IO) for pushing sensor updates to frontend. Alternative: Server-Sent Events (simpler, one-directional). System Analyst should decide.
4. **MQTT Topic Structure**: Proposed: `{building_id}/{floor_id}/{sensor_type}/{sensor_id}` — System Analyst to finalize.
5. **Data Flow**: `Sensors → MQTT Broker → Node.js Subscriber → Validate/Normalize → TimescaleDB + Alert Engine + WebSocket Broadcast`.
6. **File Storage**: SVG/PNG floor plans stored on filesystem (Docker volume) for MVP. Move to object storage (S3/MinIO) in Phase 2.
7. **Multi-Building**: Schema must support multiple buildings from day 1 (building_id foreign key), even though MVP targets 1–3 buildings.

### Three Core User Roles

| Role | Slug | Permissions |
|---|---|---|
| **Financial Decision Maker** | `financial_decision_maker` | View executive dashboard, energy data, billing, reports. No asset management or system config. |
| **System Administrator** | `sys_admin` | Full access: user management, asset management, sensor configuration, alert rules, floor plan management, all dashboards. |
| **Technician** | `technician` | View assigned assets, asset health, floor plan (read-only), alerts. No system configuration or user management. |

### Non-Functional Requirements

| Requirement | Target | Notes |
|---|---|---|
| **Response Time** | API: < 200ms (p95), Dashboard load: < 3s | Optimize TimescaleDB queries with proper indexing |
| **Real-Time Latency** | < 5s sensor-to-screen | MQTT → Processing → WebSocket → UI |
| **Data Ingestion Rate** | 1,000+ messages/second per building | Batch inserts to TimescaleDB |
| **Concurrent Users** | 50+ per building | WebSocket connection management |
| **Uptime** | 99.5% (MVP pilot target) | Single-instance acceptable for pilot |
| **Data Retention** | Raw: 7 days, 1-min avg: 90 days, hourly: 2 years | TimescaleDB continuous aggregates + compression |
| **Security** | OWASP Top 10 compliance | Input sanitization, parameterized queries (Prisma), CORS, Helmet, rate limiting |
| **Browser Support** | Chrome 90+, Firefox 90+, Safari 15+, Edge 90+ | Mobile: Chrome Android, Safari iOS |
| **Accessibility** | WCAG 2.1 AA (basic compliance) | Keyboard navigation, color contrast, screen reader labels |

---

## 8. Risk Assessment

### Inherited Risks (from Creator Vision)

| Risk ID | Risk | PM Assessment | Mitigation Update |
|---|---|---|---|
| SR-1 | Scope creep across 10 modules | **HIGH** — Most likely risk. MVP already has 35 features across 8 modules. | Scope is locked per this document. Any additions go to Phase 2 backlog. PM has final authority on scope changes. Weekly scope review meetings. |
| SR-2 | Building protocol heterogeneity | **MEDIUM for MVP** — MVP is MQTT-only, deferring BACnet/Modbus to Phase 2. | MQTT-only simplifies MVP significantly. Ensure MQTT topic schema is flexible enough for future protocol adapters. |
| SR-3 | AI/ML overcommitment | **LOW for MVP** — No AI/ML in MVP. Rule-based thresholds only. | Risk is fully deferred. Phase 2 uses statistical methods (z-score). True ML in Phase 3 only with 6+ months of production data. |
| FR-1 | BIM/CAD file quality | **MEDIUM** — MVP uses SVG/PNG (simpler), but customer floor plan quality varies. | Provide sample SVG templates. Support both SVG and PNG (PNG as fallback). Document recommended SVG export settings. |
| FR-2 | Sensor data reliability | **HIGH** — Noisy/missing data is common in real deployments. | Implement stale-data indicators, data quality flags, and gap detection in Sprint 3–4. |
| FR-4 | Time-series data cost | **MEDIUM** — TimescaleDB compression + tiered retention mitigates this. | Implement retention policy in Sprint 3. Monitor storage growth during pilot. |

### New PM-Identified Risks

| Risk ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| PM-R01 | **Sprint velocity overestimation** — 8 sprints may not be sufficient for 35 features with a small team | Medium | High | Buffer Sprint 8 as polish/spillover. Identify cut candidates: PLAT-03 (dark theme) and REPORT-01 (PDF) can slip to post-MVP without blocking pilot. |
| PM-R02 | **MQTT simulator fidelity** — testing with simulated data may not reveal issues that appear with real hardware | Medium | Medium | Engage pilot customer's BMS vendor by Sprint 4 to get real MQTT feeds. Parallel-run simulator and real data. |
| PM-R03 | **Floor plan drag-drop complexity** — interactive SVG manipulation with coordinate persistence is a high-complexity frontend feature | Medium | Medium | Allocate 8 points (largest single feature). Consider using an existing library (e.g., react-dnd, Konva.js). If behind schedule, simplify to coordinate input form (non-drag-drop). |
| PM-R04 | **Pilot customer availability** — pilot building may not have MQTT-ready sensors, causing integration delays | Medium | High | Pre-qualify pilot site by Sprint 2: confirm MQTT broker, sensor inventory, and network access. Have backup pilot site identified. |
| PM-R05 | **Email deliverability** — alert emails may be flagged as spam or blocked by corporate firewalls | Low | Medium | Use authenticated SMTP (SPF, DKIM). Provide in-app notifications as primary channel; email is supplementary. |
| PM-R06 | **Single point of failure** — MVP architecture has single instances of all services (no redundancy) | Medium | Medium | Acceptable for pilot (99.5% SLA). Document HA upgrade path for Phase 2. Implement health checks and alerting on service failures. |

### Risk Heat Map

```
              IMPACT
         Low    Medium    High
  High │       │ PM-R01  │ SR-1   │
  Med  │ PM-R05│ SR-2    │ PM-R04 │
  Low  │       │ FR-1    │        │
       └───────┴─────────┴────────┘
        LIKELIHOOD
```

---

## 9. Success Criteria — Measurable KPIs

### Phase 1 (MVP) — Months 1–4

| KPI | Target | Measurement Method |
|---|---|---|
| MVP feature completion | 100% of Must-have features delivered | Sprint burndown tracking |
| Pilot buildings onboarded | ≥ 2 buildings | Deployment count |
| Sensor data ingestion | ≥ 100 sensors streaming data | MQTT topic count in production |
| Dashboard real-time latency | < 5 seconds sensor-to-screen | Timestamp comparison (MQTT publish → UI render) |
| API response time (p95) | < 200ms | Backend monitoring/logging |
| User adoption (pilot) | ≥ 70% of target users active weekly | Login analytics |
| Unit + integration test coverage | ≥ 60% | Coverage reports |
| System uptime | ≥ 99% during pilot | Health check monitoring |
| UAT feedback score | ≥ 7/10 satisfaction | Pilot user survey |
| Energy visibility time-to-value | < 1 day from deployment to first insights | Onboarding tracking |

### Phase 2 — Months 5–8

| KPI | Target | Measurement Method |
|---|---|---|
| Buildings onboarded | 10–15 | Customer count |
| Bidirectional control adoption | ≥ 50% of buildings using device control | Feature usage analytics |
| ESG report generation | < 1 minute per building | Time-to-report measurement |
| Alert-to-action time (MTTR) | 30% reduction vs. Phase 1 baseline | Alert → acknowledgment timestamp delta |
| Automation rules created | ≥ 20 active rules across customers | Rule count in production |
| Monthly Active Users | 100–150 | Login analytics |
| ARR | $150K–$500K | Revenue tracking |

### Phase 3 — Months 9–14

| KPI | Target | Measurement Method |
|---|---|---|
| Buildings onboarded | 30+ | Customer count |
| Energy savings delivered | 20–30% reduction (demonstrated per customer) | Pre/post consumption comparison |
| Unplanned downtime reduction | 40% decrease vs. pre-deployment | Incident log analysis |
| Predictive maintenance accuracy | ≥ 70% true positive rate | Prediction → outcome tracking |
| Partner channel revenue share | ≥ 30% pipeline from SI partners | CRM tracking |
| Monthly Active Users | 500+ | Login analytics |
| ARR | $1M–$3M | Revenue tracking |

---

## 10. Milestone Timeline

### Visual Timeline (Phase 1 — MVP)

```
MONTH 1                    MONTH 2                    MONTH 3                    MONTH 4
├─ Sprint 1 ─┤├─ Sprint 2 ─┤├─ Sprint 3 ─┤├─ Sprint 4 ─┤├─ Sprint 5 ─┤├─ Sprint 6 ─┤├─ Sprint 7 ─┤├─ Sprint 8 ─┤
│             │             │             │             │             │             │             │             │
▼ M1          ▼ M2          ▼ M3          ▼ M4          ▼ M5          ▼ M6          ▼ M7          ▼ M8
Platform      Auth          Data          Monitoring    Assets +      Spatial +     Dashboards    Deploy +
Foundation    Complete      Pipeline      Dashboards    Alerts        Notifications + Reports     UAT
              + RBAC        Online        Live          Engine        Complete      Complete      PILOT GO
│             │             │             │             │             │             │             │
│             ├── GATE 1 ───┤             ├── GATE 2 ───┤             │             ├── GATE 3 ───┤
│             │ Auth works  │             │ Data flows  │             │             │ Feature     │
│             │ RBAC tested │             │ end-to-end  │             │             │ complete    │
│             │             │             │ Charts live │             │             │ UAT passed  │
```

### Decision Gates

| Gate | Timing | Criteria | Decision |
|---|---|---|---|
| **Gate 1: Auth & Foundation** | End of Sprint 2 (Week 4) | Auth + RBAC functional, MQTT connected, CI pipeline running | Proceed to data pipeline. If auth is incomplete, Sprint 3 absorbs spillover. |
| **Gate 2: Data Pipeline Validated** | End of Sprint 4 (Week 8) | MQTT → TimescaleDB pipeline operational, energy + env dashboards rendering real-time data | Proceed to asset/alert/spatial features. If pipeline is unstable, pause new features and fix. |
| **Gate 3: Feature Complete + UAT** | End of Sprint 7 (Week 14) | All Must-have features implemented, unit test coverage ≥ 60%, no critical bugs | Sprint 8 is deploy + polish. If features are incomplete, cut PLAT-03 (dark theme) and REPORT-01 (PDF) to Phase 2. |
| **Gate 4: Pilot Launch** | End of Sprint 8 (Week 16) | UAT passed, Docker deployment working, ≥ 2 buildings ready, stakeholder sign-off | Deploy to production pilot. If not ready, extend by 2 weeks (1 buffer sprint). |

### Full Program Timeline

```
2026
APR         MAY         JUN         JUL         AUG         SEP         OCT         NOV         DEC
├─── Phase 1: MVP ──────────────────────┤├──── Phase 2: Intelligence & Control ─────────────────┤
│ S1  S2  S3  S4  S5  S6  S7  S8  │    │ S9  S10  S11  S12  S13  S14  S15  S16  │
│                              ▲ PILOT  │                                    ▲ v2.0│
│                              │ LAUNCH │                                    │     │
                                                                                   
2027
JAN         FEB         MAR         APR         MAY         JUN
├──────── Phase 3: AI & Scale ──────────────────────────────────┤
│ S17  S18  S19  S20  S21  S22  S23  S24  S25  S26  S27  S28  │
│                                                         ▲ v3.0│
```

---

## 11. Collaboration Plan

### Inputs Needed from System Analyst (Stage 3)

1. **Architecture Decision Records (ADRs)**: Validate or override recommendations on WebSocket vs. SSE, monorepo, REST vs. GraphQL.
2. **Database Schema Design**: Define complete schema for users, buildings, floors, zones, sensors, assets, alerts, notifications with proper indexing.
3. **MQTT Topic Schema**: Finalize topic naming convention, message payload format (JSON schema), and QoS levels.
4. **TimescaleDB Design**: Hypertable partitioning strategy, continuous aggregate definitions, compression policy, retention policy implementation.
5. **Authentication Flow**: Detailed JWT token flow (access/refresh), token storage strategy, middleware chain.
6. **API Contract**: OpenAPI/Swagger specification for all MVP endpoints.
7. **Deployment Architecture**: Single-server vs. multi-service Docker topology for pilot.
8. **Security Architecture**: Input validation strategy, CORS policy, rate limiting rules, encryption at rest/in transit.

### Inputs Needed from Other Agents

| Agent | Input Needed |
|---|---|
| **UI/UX (Stage 4)** | Wireframes for all 3 role dashboards, floor plan interaction design, mobile navigation patterns, component library selection |
| **Data (Stage 5)** | Complete database migration files, seed data for demo/testing, TimescaleDB setup scripts |
| **Coder (Stage 6)** | Implementation of this sprint plan, adherence to feature priorities, flagging scope risks early |
| **QA (Stage 7)** | Test plan covering all acceptance criteria from user stories, MQTT simulator for integration testing |
| **Security (Stage 9)** | Review of auth implementation, input sanitization coverage, OWASP compliance check |
| **DevOps (Stage 10)** | Docker production configs, CI/CD pipeline, monitoring setup, deployment runbook |

### Decision Log (Pending Leadership Review)

| ID | Decision | Status | Owner |
|---|---|---|---|
| D-01 | MVP UI language: English only (Bahasa Indonesia in Phase 2) | **Proposed** | PM |
| D-02 | Pilot pricing: Free for 90 days, then $1,500/building/month | **Needs Validation** | Creator/Business |
| D-03 | MQTT broker: Self-hosted Mosquitto (cost control) vs. EMQX Cloud (managed) | **Needs SA Input** | System Analyst |
| D-04 | Floor plan storage: Local filesystem (MVP) vs. MinIO from day 1 | **Needs SA Input** | System Analyst |
| D-05 | Real-time transport: WebSocket (Socket.IO) vs. Server-Sent Events | **Needs SA Input** | System Analyst |
| D-06 | Pilot site selection: Confirm 2 buildings by end of Sprint 2 | **Action Required** | Creator/Business |
| D-07 | Data retention policy (7d raw / 90d 1-min / 2yr hourly) validation with pilot customer | **Action Required** | PM |

---

## 12. Handoff

### Inputs Consumed
- `.artifacts/01-creator-vision.md` — Complete product vision including:
  - Problem statement and value proposition for 4 stakeholder personas
  - Market analysis with TAM/SAM/SOM for Indonesian market
  - Competitor landscape (6 competitors mapped)
  - MoSCoW feature prioritization (10 Must, 8 Should, 6 Could, 5 Won't)
  - 3-phase scaling roadmap with decision gates
  - Risk register (10 risks with mitigations)
  - Success metrics across product, business, and impact dimensions
  - Technology stack recommendations
  - Guidance for Product Manager

### Outputs Produced
- `.artifacts/02-pm-roadmap.md` (this document) — containing:
  - Executive summary and stakeholder analysis
  - Detailed feature roadmap across 3 phases (35 MVP features, 21 Phase 2, 15 Phase 3)
  - Complete sprint plan for Phase 1 (8 sprints × 2 weeks, with capacity and acceptance criteria)
  - 25+ detailed user stories with acceptance criteria for all MVP features
  - Feature dependency map with critical path identification
  - Technical requirements summary for System Analyst
  - Risk assessment (6 inherited + 6 new PM risks)
  - Measurable success criteria / KPIs per phase
  - Milestone timeline with 4 decision gates
  - Collaboration plan with inputs needed from all downstream agents

### Open Questions for System Analyst

1. **WebSocket vs. SSE**: Which real-time transport to use for pushing sensor data to dashboards? WebSocket (bidirectional, Socket.IO) vs. SSE (simpler, one-way)? Need SA recommendation based on scalability and complexity trade-offs.
2. **MQTT QoS Level**: Should sensor data use QoS 0 (at most once, fastest) or QoS 1 (at least once, guaranteed)? Trade-off: performance vs. data completeness.
3. **TimescaleDB Partitioning**: Partition hypertables by time interval (1 day? 1 week?) and by building_id? SA to determine optimal chunk interval based on expected data volume.
4. **Session/Token Storage**: HttpOnly cookies (CSRF protection needed) vs. localStorage (XSS risk)? SA to define secure token storage strategy.
5. **File Upload Size/Type Validation**: Server-side validation strategy for SVG uploads (SVG can contain scripts — XSS vector). SA to define sanitization approach.
6. **Multi-Building Schema**: How to structure the schema to support multi-building from day 1 without over-engineering? Building → Floor → Zone → Sensor hierarchy — SA to validate.
7. **MQTT Broker Deployment**: Self-hosted Mosquitto (in Docker Compose) vs. managed EMQX Cloud? Cost vs. operational complexity trade-off.
8. **Monitoring in MVP**: What level of observability is required for pilot? Basic health checks only, or structured logging + metrics (Prometheus/Grafana)?

### Go/No-Go Recommendation

**✅ GO — Proceed to System Analyst (Stage 3)**

**Rationale**:

1. **Scope is defined and locked**: 35 MVP features across 8 modules, decomposed into 8 two-week sprints with clear acceptance criteria. Phase 2+ features are explicitly deferred.
2. **Critical path is identified**: Platform → Auth → MQTT → Data Pipeline → Monitoring → Dashboards → Deploy. No circular dependencies.
3. **Risks are manageable**: Highest risks (scope creep, velocity overestimation) have mitigation strategies. Sprint 8 provides buffer. Cut candidates identified (dark theme, PDF export).
4. **Technology stack is validated**: Next.js 14 + Express + PostgreSQL/TimescaleDB + MQTT is proven and well-supported. No exotic dependencies.
5. **MVP is deployable**: Docker Compose deployment, health checks, and structured logging enable production readiness in 16 weeks.
6. **Pilot value proposition is clear**: Real-time energy monitoring with IDR billing projection provides measurable ROI within the first week of deployment.

**Conditions for Go**:
- System Analyst must resolve the 8 open technical questions listed above before coding begins
- At least 1 pilot building must be confirmed with MQTT-ready sensors by Sprint 2
- MVP scope freeze at Sprint 2 Gate 1 — no new Must-have features after Week 4

---

*This document was produced by the Product Manager Agent and is ready for consumption by the System Analyst Agent (Stage 3). Sprint plan and user stories should be validated against actual team capacity during the SA phase.*
