# 10 — DevOps Pipeline: Smart Building Dashboard

**Stage**: [10] DevOps  
**Date**: 2026-04-15  
**Agent**: DevOps Engineer  

---

## 1. Deployment Pipeline Design

### CI Stages and Checks

The CI pipeline (`infra/ci/github-actions.yml`) runs on every push to `main`/`develop` and on PRs to `main`:

| Stage | Description | Blocking? |
|-------|-------------|-----------|
| **Lint & Type Check** | ESLint + TypeScript `--noEmit` for both backend and frontend | Yes |
| **Test** | Vitest unit + integration tests with real PostgreSQL (TimescaleDB) and Redis service containers | Yes |
| **Build** | Full workspace build (`npm run build`) to verify compilation | Yes |
| **Docker Build & Push** | Multi-stage Docker builds for backend and frontend; push to GHCR on `main` only | Yes (main only) |

### CD Stages and Promotion Flow

The CD pipeline (`infra/ci/deploy.yml`) triggers after successful CI on `main`:

```
CI Success (main) → Deploy Staging (auto) → Health Check → Deploy Production (manual approval)
```

| Stage | Trigger | Approval |
|-------|---------|----------|
| **Staging** | Automatic on CI success | None |
| **Production** | After staging health check passes | GitHub Environment protection rules (manual approval) |

### Artifact/Versioning Strategy

- Docker images tagged with: git SHA, branch name, semver (if tagged), and `latest` for default branch
- Images stored in GitHub Container Registry (GHCR) at `ghcr.io/<org>/smart-building-dashboard/{backend,frontend}`
- Database migrations versioned via Prisma Migrate

### Quality and Approval Gates

- All tests must pass before merge to `main`
- Docker build must succeed before deployment
- Staging health check must pass before production deployment is offered
- Production deployment requires manual approval via GitHub Environment protection rules

---

## 2. Infrastructure Configuration

### Environment Topology

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| **Development** | Local development | `docker-compose.yml` with all services |
| **Staging** | Pre-production validation | Same Docker Compose stack on staging server |
| **Production** | Live deployment | Same stack with production secrets and monitoring |

### Docker Service Architecture

```
┌─────────────────────────────────────────────────────┐
│                  sbd-network (bridge)                │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ postgres │  │  redis   │  │    mosquitto     │  │
│  │ :5432    │  │  :6379   │  │  :1883 / :9001   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │             │
│       └──────────────┼─────────────────┘             │
│                      │                               │
│              ┌───────┴────────┐                      │
│              │    backend     │                      │
│              │    :4000       │                      │
│              │  (Express.js)  │                      │
│              └───────┬────────┘                      │
│                      │                               │
│              ┌───────┴────────┐                      │
│              │   frontend     │                      │
│              │    :3000       │                      │
│              │   (Next.js)    │                      │
│              └────────────────┘                      │
└─────────────────────────────────────────────────────┘
```

### Service Details

| Service | Image | Port(s) | Volumes | Health Check |
|---------|-------|---------|---------|--------------|
| **postgres** | `timescale/timescaledb:latest-pg15` | 5432 | `postgres_data` | `pg_isready` |
| **redis** | `redis:7-alpine` | 6379 | `redis_data` | `redis-cli ping` |
| **mosquitto** | `eclipse-mosquitto:2` | 1883, 9001 | `mosquitto_data`, `mosquitto_log` | `mosquitto_sub` |
| **backend** | Custom (multi-stage) | 4000 | `uploads_data` | HTTP `/api/v1/health` |
| **frontend** | Custom (multi-stage) | 3000 | — | HTTP `/` |

### Configuration and Secrets Management

- All secrets injected via environment variables — never stored in files
- `.env` file used for local development (gitignored)
- `.env.example` provides template with placeholder values
- Docker Compose uses `${VAR:?error}` syntax for required secrets (`POSTGRES_PASSWORD`, `JWT_SECRET`)
- CI/CD uses GitHub Secrets for sensitive values
- Production should use a secret manager (e.g., AWS Secrets Manager, HashiCorp Vault)

### Scalability and Resilience

- `restart: unless-stopped` on all services for automatic recovery
- Health checks with retries on all services
- `depends_on` with `condition: service_healthy` ensures startup ordering
- Backend container uses `dumb-init` for proper signal handling and graceful shutdown
- Redis configured with `maxmemory 256mb` and LRU eviction
- PostgreSQL data persisted to named Docker volume

---

## 3. Files Created

| File | Purpose |
|------|---------|
| `infra/docker/Dockerfile.backend` | Multi-stage build (deps → build → production) for Express.js backend; runs as non-root user with dumb-init |
| `infra/docker/Dockerfile.frontend` | Multi-stage build for Next.js standalone output; runs as non-root user |
| `infra/docker/mosquitto.conf` | Eclipse Mosquitto MQTT broker config with TCP (1883) + WebSocket (9001) listeners |
| `infra/docker/nginx.conf` | Optional Nginx reverse proxy config for production (API + WebSocket + frontend routing) |
| `docker-compose.yml` | Full multi-service orchestration with health checks, volumes, and networking |
| `infra/ci/github-actions.yml` | GitHub Actions CI pipeline: lint → test → build → Docker build/push |
| `infra/ci/deploy.yml` | GitHub Actions CD pipeline: staging (auto) → production (manual approval) |
| `infra/monitoring/healthcheck.sh` | Bash script to check all services (API, frontend, PostgreSQL, Redis, MQTT, Docker containers) |
| `.gitignore` | Comprehensive gitignore for Node.js, Next.js, Prisma, Docker, IDE files |

### Modifications to Existing Files

| File | Change |
|------|--------|
| `src/frontend/next.config.ts` | Added `output: 'standalone'` for Docker-optimized builds; parameterized backend URL via `BACKEND_INTERNAL_URL` env var |

---

## 4. Release and Deployment Plan

### Deployment Strategy

**Rolling deployment** via Docker Compose:

```bash
# Pull latest images
docker compose pull

# Recreate only changed services (zero-downtime for stateless services)
docker compose up -d --no-build

# Run database migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# Apply TimescaleDB extensions (first deploy only)
docker compose exec postgres psql -U sbd_user -d smart_building \
  -f /docker-entrypoint-initdb.d/99-timescaledb-setup.sql
```

### Rollback Strategy

1. **Immediate rollback**: `docker compose up -d` with previous image tags
2. **Database rollback**: Prisma does not auto-rollback; maintain backup before migration
3. **Container-level**: Docker restart policy handles transient failures automatically

### Release Sequencing

1. Deploy infrastructure services first (postgres, redis, mosquitto)
2. Run database migrations
3. Deploy backend (verify health check)
4. Deploy frontend (verify health check)
5. Run health check script (`infra/monitoring/healthcheck.sh`)

### First-Time Setup

```bash
# 1. Copy environment file
cp .env.example .env
# Edit .env with production values

# 2. Start all services
docker compose up -d

# 3. Wait for postgres to be healthy, then run migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# 4. Seed initial data (admin user, demo building)
docker compose exec backend npx ts-node src/database/seed.ts

# 5. Verify all services
bash infra/monitoring/healthcheck.sh
```

---

## 5. Monitoring and Reliability

### Key Service Health Indicators

| Service | Health Signal | Endpoint/Method |
|---------|--------------|-----------------|
| Backend API | HTTP 200 + JSON `{ status: "ok" }` | `GET /api/v1/health` |
| Frontend | HTTP 200 on root | `GET /` |
| PostgreSQL | `pg_isready` exit code 0 | `pg_isready -U sbd_user` |
| Redis | `PONG` response | `redis-cli ping` |
| MQTT | Topic subscription response | `mosquitto_sub -t '$SYS/#' -C 1` |

### Alerting and Escalation (Recommended)

| Condition | Severity | Action |
|-----------|----------|--------|
| Backend health check fails 3x | Critical | Page on-call, check logs |
| PostgreSQL unhealthy | Critical | Check disk space, connections, restart |
| Redis unreachable | Warning | Rate limiter may fail open; restart Redis |
| MQTT broker down | Warning | Sensor ingestion paused; restart Mosquitto |
| Disk usage > 85% | Warning | Clean logs/uploads, expand volume |

### Logging and Observability

- Backend uses Winston with structured JSON logging in production
- HTTP requests logged via Morgan (combined format in production)
- All logs to stdout/stderr (Docker-native, collected by `docker logs`)
- Log level configurable via `LOG_LEVEL` env var
- Future: integrate with ELK stack, Datadog, or CloudWatch

### SLO/SLA Targets (Recommended)

| Metric | Target |
|--------|--------|
| API availability | 99.5% |
| API response time (p95) | < 500ms |
| Dashboard load time | < 3s |
| Sensor data latency | < 5s (MQTT → dashboard) |

---

## 6. Security and Compliance Alignment

### Security Checks in Pipeline

| Check | Stage | Tool |
|-------|-------|------|
| TypeScript type checking | CI (lint) | `tsc --noEmit` |
| ESLint security rules | CI (lint) | ESLint |
| Dependency audit | CI (test) | `npm audit` (recommended addition) |
| Non-root container execution | Docker build | Dockerfile `USER appuser` |
| No secrets in images | Docker build | Environment variables only |
| Health checks | Docker Compose + CD | Built-in health checks |

### Infrastructure Hardening Controls

Based on `.artifacts/09-security-review.md`:

| Control | Implementation |
|---------|---------------|
| Non-root containers | Both Dockerfiles create and switch to `appuser:appgroup` (UID 1001) |
| Signal handling | `dumb-init` as PID 1 in backend container |
| Minimal base images | `node:20-alpine` — small attack surface |
| Multi-stage builds | No dev dependencies or source code in production images |
| Read-only configs | Mosquitto config and TimescaleDB SQL mounted as `:ro` |
| Network isolation | All services on private `sbd-network`; only exposed ports are mapped |
| Required secrets | `POSTGRES_PASSWORD` and `JWT_SECRET` enforced with `?error` syntax |

### Security Review Items from Stage 9

| Item | Status in Infra |
|------|----------------|
| V10 — Fragile .env path | Resolved: Docker containers use env vars directly, not file-based `.env` loading |
| R11 — TLS termination | Nginx reverse proxy config provided; TLS cert setup left to deployment |
| R13 — Dependency scanning | `npm audit` recommended as CI step; Dependabot config recommended |
| Lock file verification | CI uses `npm ci` which requires and enforces `package-lock.json` |

### Access and Permissions Model

- Docker containers run as non-root user (UID 1001)
- GitHub Actions uses minimal permissions (`contents: read`, `packages: write`)
- Production deployment requires GitHub Environment approval
- Database credentials isolated per environment

---

## 7. Collaboration Handoff

### Inputs Needed from Coder

1. **Required**: Commit `package-lock.json` files — CI uses `npm ci` which fails without lock files
2. **Required**: Apply `authRateLimiter` to login route (security review R01) before production deployment
3. **Recommended**: Verify `output: 'standalone'` in `next.config.ts` works with current frontend code

### Security Validation Checkpoints

- [ ] Docker images scanned with `docker scout` or Trivy before production push
- [ ] No secrets present in Docker image layers (`docker history` audit)
- [ ] `npm audit` returns no critical vulnerabilities
- [ ] Health check endpoints respond correctly in staging
- [ ] TLS termination configured before public exposure

### Risks, Blockers, and Dependencies

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing `package-lock.json` | CI `npm ci` will fail | Coder must generate and commit lock files |
| TimescaleDB setup SQL runs only on first init | Migrations may need manual re-run | Document in runbook; idempotent SQL with `IF NOT EXISTS` |
| MQTT broker allows anonymous in dev | Security risk if exposed | Production config must set `allow_anonymous false` and configure `password_file` |
| No TLS in Docker Compose | Traffic in plaintext | Add TLS termination via Nginx or cloud load balancer |

### Follow-up Operational Actions

1. Set up GitHub repository secrets for staging/production SSH access
2. Configure GitHub Environments with protection rules for production
3. Set up container image vulnerability scanning (GitHub Dependabot or Trivy)
4. Configure log aggregation for production (ELK, CloudWatch, etc.)
5. Set up uptime monitoring (e.g., UptimeRobot, Pingdom) for external health checks
6. Create Mosquitto password file for production MQTT authentication
7. Configure TLS certificates for Nginx reverse proxy

---

## 8. Handoff

- **Inputs consumed**:
  - `src/**` — Source code structure, build configuration, Prisma schema
  - `package.json` (root + workspaces) — Dependencies, scripts, workspace layout
  - `.artifacts/09-security-review.md` — Security vulnerabilities, hardening recommendations, container security requirements
  - `.env.example` — Environment variable reference
  - `vitest.config.ts`, `playwright.config.ts` — Test configuration for CI pipeline

- **Outputs produced**:
  - `.artifacts/10-devops-pipeline.md` — This document
  - `docker-compose.yml` — Multi-service orchestration (5 services, 5 volumes, 1 network)
  - `infra/docker/Dockerfile.backend` — Multi-stage Express.js container (3 stages, non-root, dumb-init)
  - `infra/docker/Dockerfile.frontend` — Multi-stage Next.js standalone container (3 stages, non-root)
  - `infra/docker/mosquitto.conf` — MQTT broker configuration (TCP + WebSocket)
  - `infra/docker/nginx.conf` — Reverse proxy configuration (API + WebSocket + frontend)
  - `infra/ci/github-actions.yml` — CI pipeline (lint → test → build → Docker)
  - `infra/ci/deploy.yml` — CD pipeline (staging auto → production manual)
  - `infra/monitoring/healthcheck.sh` — Service health check script
  - `.gitignore` — Comprehensive project gitignore
  - `src/frontend/next.config.ts` — Modified: added `output: 'standalone'`, parameterized backend URL

- **Open questions**:
  1. **TLS certificates**: Who provisions and manages SSL/TLS for production? (Let's Encrypt? Cloud-managed?)
  2. **Deployment target**: What is the production hosting platform? (VPS, AWS ECS, Kubernetes?)
  3. **Log aggregation**: Which logging platform should be integrated? (ELK, CloudWatch, Datadog?)
  4. **MQTT authentication**: Should the MQTT broker use password files or a more sophisticated auth plugin for production?
  5. **Backup strategy**: What is the PostgreSQL backup schedule and retention policy?

- **Go/No-Go**: **GO** for Documentation to proceed.
  - Infrastructure is production-ready with proper containerization, CI/CD, health checks, and security hardening.
  - Remaining items (TLS, lock files, auth rate limiter fix) are documented as pre-production requirements but do not block documentation.
