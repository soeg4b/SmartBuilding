# 11 — Documentation: Smart Building Dashboard

**Stage**: [11] Documentation
**Date**: 2026-04-15
**Agent**: Technical Writer

---

## 1. Documentation Strategy

### Audience Segments

| Audience | Profile | Documentation Need |
|----------|---------|-------------------|
| **Developer (new team member)** | TypeScript fullstack engineer joining the project | Architecture overview, setup guide, API reference, code conventions |
| **DevOps / SRE** | Engineer responsible for deployment and operations | Deployment guide, Docker config, monitoring, troubleshooting |
| **System Administrator (end user)** | Building management professional using the dashboard | Feature overview, getting started, API usage for integrations |
| **Technical Evaluator** | Stakeholder assessing the platform for pilot deployment | README overview, architecture rationale, tech stack summary |

### Documentation Objectives

1. Enable a new developer to set up the project and run it locally within 15 minutes
2. Provide a complete API reference for all 40+ endpoints with request/response examples
3. Document the system architecture with component diagrams and data flow descriptions
4. Provide a production deployment playbook with troubleshooting guidance
5. Maintain consistency between documentation and actual source code

### Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `README.md` | ~320 | Project overview, quick start, env vars, API summary, project structure |
| `docs/api-reference.md` | ~850 | Full REST API reference with schemas and examples |
| `docs/architecture.md` | ~400 | System design, data flow, technology choices, ADRs |
| `docs/deployment-guide.md` | ~450 | Docker deployment, monitoring, backup, troubleshooting |

### Information Architecture

```
README.md (entry point)
├── Overview → Key Features → Architecture diagram
├── Tech Stack → Prerequisites
├── Quick Start (Docker + Local Dev)
├── Environment Variables (full reference)
├── API Endpoints (summary table → links to docs/)
├── Project Structure (file tree)
├── Testing instructions
└── Links to docs/

docs/
├── api-reference.md
│   ├── Authentication patterns (JWT + cookie)
│   ├── Common patterns (pagination, errors)
│   ├── 8 module sections with endpoint tables
│   ├── Request/response JSON examples
│   ├── Error codes reference
│   └── WebSocket events
├── architecture.md
│   ├── System overview + component diagram
│   ├── Data flow (ingestion, auth, alerting)
│   ├── Technology choice rationale
│   ├── Module structure (backend + frontend)
│   ├── Database architecture (Prisma + TimescaleDB)
│   ├── Security architecture
│   └── Design decision records (ADRs)
└── deployment-guide.md
    ├── Docker Compose service map
    ├── Environment configuration
    ├── Database setup (Prisma + TimescaleDB)
    ├── First-time setup walkthrough
    ├── Rolling deployment procedure
    ├── Monitoring + health checks
    ├── Nginx + TLS configuration
    ├── CI/CD pipeline overview
    ├── Backup & recovery procedures
    └── Troubleshooting (10 common issues)
```

---

## 2. README.md Summary

### Project Description

The README positions the Smart Building Dashboard as a "real-time IoT monitoring platform for commercial buildings" with a focus on the three user roles and the unified monitoring value proposition.

### Key Features Highlighted

- Role-based dashboards (Executive, SysAdmin, Technician)
- Real-time energy monitoring with IDR billing projection
- Environmental quality monitoring (temperature, humidity, CO₂)
- Asset health tracking with G/Y/R indicators
- Interactive floor plans with sensor placement
- Configurable threshold alerts with email notifications
- MQTT sensor data ingestion
- Socket.IO real-time updates
- JWT + RBAC security

### Quick Start Instructions

Two paths provided:
1. **Docker** (recommended) — 9-step guide from clone to running application
2. **Local development** — Individual service setup with hot-reloading

### Tech Stack Overview

Full technology table covering all layers: frontend (Next.js 14, Tailwind, Recharts), backend (Express, TypeScript), database (PostgreSQL + TimescaleDB + Prisma), caching (Redis), messaging (Mosquitto MQTT), real-time (Socket.IO), testing (Vitest, Playwright, Supertest), and infrastructure (Docker, GitHub Actions).

---

## 3. API Documentation Summary

### Endpoints Documented

| Module | Endpoints | Notes |
|--------|-----------|-------|
| Auth | 5 | Login, register, refresh, logout, me |
| Users | 5 | CRUD + listing (sys_admin only) |
| Energy | 5 | Consumption, trends, billing, tariffs |
| Sensors | 3 | List, detail, readings time-series |
| Zones | 2 | List with environmental status |
| Equipment | 7 | CRUD, sensors, metrics |
| Buildings | 2 | List, detail |
| Floors | 1 | List with building filter |
| Floor Plans | 5 | Upload, delete, placements |
| Alert Rules | 5 | CRUD + enable/disable |
| Alerts | 4 | List, detail, acknowledge, resolve |
| Notifications | 3 | List, read, read-all |
| Dashboard | 3 | Executive, sysadmin, technician |
| Health | 1 | Health check |
| **Total** | **~51** | |

### Request/Response Examples

Full JSON examples provided for:
- Login flow (request + response + error cases)
- Energy trends with aggregation parameters
- Billing projection in IDR
- Zone environmental status with sensor readings
- Equipment list with health and metrics
- Alert creation and lifecycle (acknowledge → resolve)
- Floor plan upload + sensor placement
- All three dashboard endpoints

### Authentication Notes

- JWT Bearer token flow documented with token lifecycle diagram
- Three roles defined with access level descriptions
- Cookie-based refresh token mechanism explained
- Rate limiting tiers documented (5/15min auth, 100/15min general)

### Error Codes

- 11 HTTP status codes documented
- 12 application-specific error codes with descriptions
- Rate limit header documentation (X-RateLimit-* headers)
- WebSocket events documented (3 room events, 3 server push events)

---

## 4. Architecture Documentation Summary

### System Overview

Text-based component diagram showing all 7 services (Nginx, Next.js, Express, PostgreSQL+TimescaleDB, Redis, Mosquitto, IoT Gateway) with port assignments and relationships.

### Component Diagram Description

Each component's responsibility documented in a table. Includes the embedded Socket.IO server in Express and the MQTT subscriber service.

### Data Flow Narrative

Three flows documented with sequence descriptions:
1. **Sensor Data Ingestion**: IoT → MQTT → Validate → 3 parallel paths (store, alert, broadcast)
2. **Authentication**: Login → JWT → Refresh → Revocation
3. **Alert Evaluation**: Reading → Rule match → Dedup check → Alert create → Fan-out

### Technology Decision Records

7 ADRs documented:
- ADR-01: Socket.IO over SSE
- ADR-02: Monorepo with shared types
- ADR-03: REST for MVP
- ADR-04: Self-hosted Mosquitto
- ADR-05: TimescaleDB over InfluxDB
- ADR-06: Filesystem for floor plans
- ADR-07: Access token in memory

---

## 5. User Guides Summary

### Getting Started Flow

The README provides two setup paths (Docker and local development) with step-by-step commands. The deployment guide expands with production-specific configuration.

### Task-Based Instructions

| Task | Location |
|------|----------|
| Set up local development | README → Quick Start → Local Development |
| Deploy to production | docs/deployment-guide.md → First-Time Setup |
| Add a new user | docs/api-reference.md → Users Module → POST /users |
| Configure alert rules | docs/api-reference.md → Alerts Module → POST /alert-rules |
| Upload floor plans | docs/api-reference.md → Spatial Module → POST /floor-plans |
| Run tests | README → Testing |
| Monitor services | docs/deployment-guide.md → Monitoring & Health Checks |
| Backup database | docs/deployment-guide.md → Backup & Recovery |
| Troubleshoot issues | docs/deployment-guide.md → Troubleshooting |

### Common Issues and Troubleshooting

10 troubleshooting scenarios documented in the deployment guide:
1. Missing POSTGRES_PASSWORD
2. Backend cannot connect to PostgreSQL
3. Prisma migration failures
4. Frontend blank page / 502 errors
5. MQTT broker not receiving messages
6. Redis connection errors
7. Rate limiter not working
8. Socket.IO connection failures
9. Container disk space issues
10. Port already in use

---

## 6. Quality and Consistency Checklist

### Clarity and Readability

- [x] All documentation uses clear headings and table of contents
- [x] Code examples use proper syntax highlighting
- [x] JSON examples are complete and valid
- [x] Steps are numbered sequentially
- [x] Commands are copy-pasteable

### Terminology and Style Consistency

- [x] "Financial Decision Maker" used consistently (not "FDM" or "executive" alone)
- [x] "sys_admin" and "technician" match role enum values in code
- [x] Endpoint paths consistently include `/api/v1` prefix
- [x] UUID used consistently (not "ID" or "guid")
- [x] IDR (Indonesian Rupiah) used consistently for currency references

### Completeness and Gap Analysis

- [x] All 51 API endpoints documented
- [x] All environment variables documented with defaults
- [x] Docker Compose service map documented
- [x] Database setup including TimescaleDB specifics
- [x] Authentication flow documented end-to-end
- [ ] Frontend component library documentation (deferred — no Storybook in MVP)
- [ ] MQTT topic structure specification (partially documented — stub implementation)
- [ ] Internationalization guide (English-only MVP)

### Update Triggers

Documentation should be updated when:
- New API endpoints are added
- Environment variables change
- Database schema is modified (Prisma migrations)
- Docker Compose services change
- Authentication/authorization rules change
- New user roles are introduced

---

## 7. Collaboration Handoff

### Review Notes

| Agent | Review Item |
|-------|-------------|
| **PM** | README accurately reflects MVP scope; feature list matches Phase 1 roadmap |
| **Coder** | API endpoints verified against `src/backend/src/modules/index.ts` route registrations; request/response schemas match controller implementations |
| **QA** | Test commands documented; testing section references correct frameworks and configuration files |
| **Security** | Security architecture accurately reflects JWT/RBAC implementation; known limitations acknowledged |
| **DevOps** | Deployment guide aligns with Docker Compose, CI/CD pipelines, and health check infrastructure |

### Open Questions

1. **MQTT Topic Specification**: The MQTT subscriber is stub-only. Full topic structure documentation deferred until ingestion pipeline is implemented.
2. **PDF Export API**: The PM roadmap mentions PDF export (REPORT-01), but no `/reports` endpoint was found in the codebase. Documentation does not include it.
3. **Contributing Guidelines**: `docs/contributing.md` was not created — no team contribution workflow was specified in prior artifacts.
4. **API Versioning Strategy**: Current API uses `/api/v1`. No versioning migration plan documented for future breaking changes.
5. **SMTP Configuration**: Email notification environment variables are commented out in `.env.example` as optional. Production email delivery setup not documented in detail.

### Next Documentation Actions

1. Add MQTT topic specification when ingestion pipeline is fully implemented
2. Create `docs/contributing.md` if open-source or multi-team contribution is planned
3. Add OpenAPI/Swagger specification for machine-readable API docs (Phase 2)
4. Add Storybook for frontend component documentation (Phase 2)

---

## 8. Handoff

- **Inputs consumed**:
  - `.artifacts/01-creator-vision.md` — Product vision, personas, business requirements
  - `.artifacts/02-pm-roadmap.md` — Feature roadmap, sprint plan, role definitions
  - `.artifacts/03-sa-system-design.md` — System architecture, API contracts, data flow diagrams
  - `.artifacts/04-uiux-design.md` — UI layout, design system, component specifications
  - `.artifacts/05-data-schema.md` — Database schema, entity relationships, TimescaleDB design
  - `.artifacts/06-coder-plan.md` — Implementation plan, file manifest, dependency list
  - `.artifacts/07-qa-test-plan.md` — Test strategy, code quality review, security findings
  - `.artifacts/08-tester-results.md` — Test files, coverage, bug reports
  - `.artifacts/09-security-review.md` — Vulnerability assessment, OWASP compliance, fixes applied
  - `.artifacts/10-devops-pipeline.md` — CI/CD pipelines, Docker configuration, monitoring
  - `src/**` — All source code (backend modules, frontend pages, shared types, database schema)
  - `.env.example` — Environment variable reference
  - `docker-compose.yml` — Service orchestration
  - `package.json` — Workspace configuration and scripts

- **Outputs produced**:
  - `.artifacts/11-documentation.md` — This document
  - `README.md` — Comprehensive project README (~320 lines)
  - `docs/api-reference.md` — Full REST API reference (~850 lines)
  - `docs/architecture.md` — System architecture documentation (~400 lines)
  - `docs/deployment-guide.md` — Deployment and operations guide (~450 lines)

- **Open questions**:
  1. MQTT topic structure spec deferred (ingestion pipeline is stub-only)
  2. PDF export endpoint not found in codebase — not documented
  3. Contributing guidelines not requested — not created
  4. SMTP/email delivery production setup requires environment-specific details
  5. TLS certificate provisioning left to deployment team

- **Go/No-Go**: **GO** — Support agent may proceed.
  - All four documentation files created with real content
  - API reference covers all 51 endpoints with examples
  - Architecture document covers system design, data flow, and security
  - Deployment guide includes first-time setup, monitoring, and troubleshooting
  - Documentation is aligned with source code and prior artifacts
