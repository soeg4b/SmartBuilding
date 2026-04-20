# Deployment Guide

**Smart Building Dashboard — Deployment & Operations**

---

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Service Architecture](#service-architecture)
- [First-Time Setup](#first-time-setup)
- [Updating & Rolling Deployment](#updating--rolling-deployment)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [CI/CD Pipeline](#cicd-pipeline)
- [Backup & Recovery](#backup--recovery)
- [Troubleshooting](#troubleshooting)

---

## Docker Deployment

The entire stack is orchestrated via Docker Compose with 5 services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `timescale/timescaledb:latest-pg15` | 5432 | PostgreSQL + TimescaleDB |
| `redis` | `redis:7-alpine` | 6379 | Caching, rate limiting |
| `mosquitto` | `eclipse-mosquitto:2` | 1883, 9001 | MQTT broker |
| `backend` | Custom (multi-stage) | 4000 | Express.js API |
| `frontend` | Custom (multi-stage) | 3000 | Next.js application |

### Docker Compose Service Map

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
│              └───────┬────────┘                      │
│                      │                               │
│              ┌───────┴────────┐                      │
│              │   frontend     │                      │
│              │    :3000       │                      │
│              └────────────────┘                      │
└─────────────────────────────────────────────────────┘
```

All services communicate on the private `sbd-network` bridge network. Only mapped ports are externally accessible.

---

## Environment Configuration

### Required Variables

These must be set before starting the stack:

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password | `strong-random-password-here` |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `your-very-long-jwt-secret-at-least-32-characters` |

### Configuration File

```bash
# Copy the template
cp .env.example .env

# Edit with your values
nano .env
```

### Production-Critical Settings

```env
# Application
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://your-domain.com

# Database
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=smart_building
POSTGRES_USER=sbd_user

# JWT (minimum 32 characters for secret)
JWT_SECRET=<cryptographically-random-string-min-32-chars>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for `POSTGRES_PASSWORD`
- Generate `JWT_SECRET` with: `openssl rand -base64 48`
- In production, consider a secret manager (AWS Secrets Manager, HashiCorp Vault)

---

## Database Setup

### Prisma Migrations

The database schema is managed by Prisma Migrate:

```bash
# Run migrations (applies all pending migrations)
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma
```

### TimescaleDB Extensions

TimescaleDB-specific features (hypertables, continuous aggregates, retention policies) are applied via a separate SQL file that runs automatically on first container startup:

```
src/database/migrations/timescaledb-setup.sql
```

This file is mounted read-only into the PostgreSQL container and runs via `docker-entrypoint-initdb.d/`. It is idempotent (uses `IF NOT EXISTS`).

If you need to reapply manually:

```bash
docker compose exec postgres psql -U sbd_user -d smart_building \
  -f /docker-entrypoint-initdb.d/99-timescaledb-setup.sql
```

### Database Seeding

Seed the database with initial data (admin user, demo building):

```bash
docker compose exec backend npx ts-node src/database/seed.ts
```

### Prisma Studio

For visual database exploration during development:

```bash
npm run db:studio
# Opens browser at http://localhost:5555
```

---

## Service Architecture

### Container Details

#### PostgreSQL + TimescaleDB

- **Image**: `timescale/timescaledb:latest-pg15`
- **Health check**: `pg_isready` every 10s
- **Volume**: `postgres_data` (persistent)
- **Config**: Max connections and memory tuning via PostgreSQL defaults
- **Start period**: 30s (allows time for initialization)

#### Redis

- **Image**: `redis:7-alpine`
- **Config**: `appendonly yes`, `maxmemory 256mb`, LRU eviction
- **Health check**: `redis-cli ping` every 10s
- **Volume**: `redis_data` (persistent)

#### Mosquitto MQTT Broker

- **Image**: `eclipse-mosquitto:2`
- **Listeners**: TCP on 1883, WebSocket on 9001
- **Config**: `infra/docker/mosquitto.conf` (mounted read-only)
- **Health check**: `mosquitto_sub` topic subscription test
- **Volume**: `mosquitto_data`, `mosquitto_log`
- **Security**: `allow_anonymous true` for development; set `allow_anonymous false` + `password_file` for production

#### Backend (Express.js)

- **Dockerfile**: `infra/docker/Dockerfile.backend` (3-stage build)
- **Runs as**: Non-root user (`appuser`, UID 1001)
- **PID 1**: `dumb-init` for proper signal handling
- **Health check**: HTTP GET `http://localhost:4000/api/v1/health`
- **Depends on**: postgres (healthy), redis (healthy), mosquitto (started)
- **Volume**: `uploads_data` for floor plan files

#### Frontend (Next.js)

- **Dockerfile**: `infra/docker/Dockerfile.frontend` (3-stage build)
- **Build mode**: `output: 'standalone'` for optimized Docker images
- **Runs as**: Non-root user
- **Health check**: HTTP GET `http://localhost:3000/`
- **Depends on**: backend (healthy)

### Named Volumes

| Volume | Service | Purpose |
|--------|---------|---------|
| `postgres_data` | postgres | Database files |
| `redis_data` | redis | Redis persistence |
| `mosquitto_data` | mosquitto | Broker persistence |
| `mosquitto_log` | mosquitto | Broker logs |
| `uploads_data` | backend | Floor plan files |

---

## First-Time Setup

Complete setup for a fresh deployment:

```bash
# 1. Clone the repository
git clone <repository-url>
cd run/20260414_Smart_Building_Dashboard

# 2. Create and configure environment
cp .env.example .env
nano .env
# Set POSTGRES_PASSWORD and JWT_SECRET (required)

# 3. Start all services
docker compose up -d

# 4. Wait for health checks to pass (~30-60 seconds)
docker compose ps
# All services should show "healthy" status

# 5. Run Prisma migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# 6. Seed initial data
docker compose exec backend npx ts-node src/database/seed.ts

# 7. Verify all services
bash infra/monitoring/healthcheck.sh

# 8. Access the application
# Frontend: http://localhost:3000
# API:      http://localhost:4000/api/v1/health
```

---

## Updating & Rolling Deployment

### Standard Update

```bash
# Pull latest code
git pull origin main

# Rebuild and restart changed services (zero-downtime for stateless services)
docker compose up -d --build

# Run any new database migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# Verify
bash infra/monitoring/healthcheck.sh
```

### Rollback

If an update causes issues:

```bash
# Option 1: Revert to previous code and rebuild
git checkout <previous-commit>
docker compose up -d --build

# Option 2: Use specific image tags (if using registry)
# Edit docker-compose.yml or override file with previous image tags
docker compose up -d
```

**Important**: Prisma does not auto-rollback database migrations. Always backup the database before running migrations in production.

### Update Sequence

1. Deploy infrastructure services first (postgres, redis, mosquitto) — usually unchanged
2. Run database migrations
3. Deploy backend (verify health check passes)
4. Deploy frontend (verify health check passes)
5. Run full health check

---

## Monitoring & Health Checks

### Health Check Endpoints

| Service | Method | Endpoint | Expected |
|---------|--------|----------|----------|
| Backend API | HTTP GET | `http://localhost:4000/api/v1/health` | `{ "status": "ok" }` |
| Frontend | HTTP GET | `http://localhost:3000/` | HTTP 200 |
| PostgreSQL | CLI | `pg_isready -U sbd_user` | Exit code 0 |
| Redis | CLI | `redis-cli ping` | `PONG` |
| MQTT | CLI | `mosquitto_sub -t '$SYS/#' -C 1` | Receives message |

### Health Check Script

A comprehensive health check script is provided:

```bash
bash infra/monitoring/healthcheck.sh
```

This checks all 5 services and reports their status.

### Docker Container Health

```bash
# Check container status and health
docker compose ps

# View container logs
docker compose logs backend --tail 100 -f
docker compose logs frontend --tail 100 -f

# View all service logs
docker compose logs --tail 50 -f
```

### Logging

- Backend uses **Winston** with structured JSON logging in production
- HTTP requests logged via **Morgan** (combined format)
- All logs output to stdout/stderr (Docker-native, collected by `docker logs`)
- Log level configurable via `LOG_LEVEL` environment variable (`debug`, `info`, `warn`, `error`)

### Recommended Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Backend health check fails 3× | Critical | Check logs, restart container |
| PostgreSQL unhealthy | Critical | Check disk space, connections, restart |
| Redis unreachable | Warning | Rate limiter may fail open; restart Redis |
| MQTT broker down | Warning | Sensor ingestion paused; restart Mosquitto |
| Disk usage > 85% | Warning | Clean logs/uploads, expand volume |

### SLO Targets

| Metric | Target |
|--------|--------|
| API availability | 99.5% |
| API response time (p95) | < 500ms |
| Dashboard load time | < 3 seconds |
| Sensor data latency (MQTT → dashboard) | < 5 seconds |

---

## Nginx Reverse Proxy

An Nginx configuration is provided at `infra/docker/nginx.conf` for production use:

```nginx
# Key routing rules:
# /api/*        → backend:4000 (API requests)
# /socket.io/*  → backend:4000 (WebSocket upgrade)
# /uploads/*    → backend:4000 (Static files)
# /*            → frontend:3000 (Next.js pages)
```

### TLS Setup

For production, you need TLS certificates. Options:

1. **Let's Encrypt** with certbot (free, automated renewal)
2. **Cloud load balancer** (AWS ALB, Cloudflare) with managed certificates
3. **Self-managed** certificates

Example with Let's Encrypt:

```bash
# Install certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Update nginx.conf to reference:
# ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

---

## CI/CD Pipeline

### Continuous Integration

The CI pipeline (`infra/ci/github-actions.yml`) runs on every push and PR:

```
Push/PR → Lint & Type Check → Test (with PostgreSQL + Redis) → Build → Docker Build & Push
```

| Stage | Description | Required |
|-------|-------------|----------|
| Lint & Type Check | ESLint + TypeScript `--noEmit` | Blocking |
| Test | Vitest with PostgreSQL/Redis service containers | Blocking |
| Build | Full workspace `npm run build` | Blocking |
| Docker Build & Push | Multi-stage builds → GHCR (main only) | Blocking |

### Continuous Deployment

The CD pipeline (`infra/ci/deploy.yml`) triggers on successful CI on `main`:

```
CI Success → Deploy Staging (auto) → Health Check → Deploy Production (manual approval)
```

Production deployment requires manual approval via GitHub Environment protection rules.

### Required GitHub Secrets

| Secret | Purpose |
|--------|---------|
| `STAGING_HOST` | Staging server SSH hostname |
| `STAGING_SSH_KEY` | Staging server SSH private key |
| `PRODUCTION_HOST` | Production server SSH hostname |
| `PRODUCTION_SSH_KEY` | Production server SSH private key |
| `POSTGRES_PASSWORD` | Database password for deployment |
| `JWT_SECRET` | JWT signing secret for deployment |

---

## Backup & Recovery

### Database Backup

```bash
# Create a compressed backup
docker compose exec postgres pg_dump -U sbd_user -d smart_building -Fc > backup_$(date +%Y%m%d).dump

# Restore from backup
docker compose exec -T postgres pg_restore -U sbd_user -d smart_building --clean < backup_20260414.dump
```

### Automated Backup (Recommended)

Add a cron job for regular backups:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/project && docker compose exec -T postgres pg_dump -U sbd_user -d smart_building -Fc > /backups/sbd_$(date +\%Y\%m\%d).dump
```

### Floor Plan Files

Floor plan uploads are stored in the `uploads_data` Docker volume:

```bash
# Backup uploads
docker cp sbd-backend:/app/uploads ./uploads_backup

# Restore uploads
docker cp ./uploads_backup/. sbd-backend:/app/uploads/
```

---

## Troubleshooting

### Common Issues

#### 1. "POSTGRES_PASSWORD is required" error

The `docker-compose.yml` requires `POSTGRES_PASSWORD` to be set.

```bash
# Ensure .env file exists and has the variable
cat .env | grep POSTGRES_PASSWORD
# If missing, add it:
echo "POSTGRES_PASSWORD=your-secure-password" >> .env
```

#### 2. Backend cannot connect to PostgreSQL

```bash
# Check if postgres is healthy
docker compose ps postgres

# Check postgres logs
docker compose logs postgres --tail 50

# Verify connection manually
docker compose exec postgres psql -U sbd_user -d smart_building -c "SELECT 1"
```

#### 3. Prisma migration fails

```bash
# Check current migration status
docker compose exec backend npx prisma migrate status --schema=src/database/schema.prisma

# Reset database (DESTRUCTIVE — development only)
docker compose exec backend npx prisma migrate reset --schema=src/database/schema.prisma
```

#### 4. Frontend shows blank page or 502

```bash
# Check frontend logs
docker compose logs frontend --tail 50

# Verify backend is reachable from frontend container
docker compose exec frontend wget -qO- http://backend:4000/api/v1/health
```

#### 5. MQTT broker not receiving messages

```bash
# Check mosquitto logs
docker compose logs mosquitto --tail 50

# Test MQTT connectivity
docker compose exec mosquitto mosquitto_sub -t "building/#" -v

# From another terminal, publish a test message
docker compose exec mosquitto mosquitto_pub -t "building/test/sensor/temperature" -m '{"value":24.5}'
```

#### 6. Redis connection errors

```bash
# Check Redis status
docker compose exec redis redis-cli ping
# Expected: PONG

# Check memory usage
docker compose exec redis redis-cli info memory
```

#### 7. Rate limiter not working

If the rate limiter silently fails open (allows all requests), Redis may be unreachable:

```bash
# Check Redis connectivity from backend
docker compose exec backend sh -c "wget -qO- http://localhost:4000/api/v1/health"

# Check backend logs for rate limiter warnings
docker compose logs backend | grep "Rate limiter"
```

#### 8. Socket.IO connections failing

```bash
# Check if WebSocket upgrade is working
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  http://localhost:4000/socket.io/?EIO=4&transport=websocket

# Check backend logs for Socket.IO events
docker compose logs backend | grep "Socket.IO"
```

#### 9. Container runs out of disk space

```bash
# Check Docker disk usage
docker system df

# Clean unused images and containers
docker system prune -f

# Clean all unused volumes (WARNING: removes data)
# docker volume prune
```

#### 10. Port already in use

```bash
# Find what's using the port (Linux/Mac)
lsof -i :4000
# or (Windows)
netstat -ano | findstr :4000

# Change port mappings in .env
BACKEND_PORT=4001
FRONTEND_PORT=3001
```

### Log Analysis

```bash
# Search for errors in backend logs
docker compose logs backend --since 1h | grep -i error

# Follow logs in real-time
docker compose logs -f --tail 0

# Export logs to file
docker compose logs backend > backend.log 2>&1
```

### Container Recovery

```bash
# Restart a specific service
docker compose restart backend

# Recreate a service (pulls latest config)
docker compose up -d --force-recreate backend

# Full stack restart
docker compose down
docker compose up -d
```
