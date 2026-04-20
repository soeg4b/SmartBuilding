# 12 — Support Playbook: Smart Building Dashboard

**Stage**: [12] Support  
**Date**: 2026-04-15  
**Agent**: Support Engineer  

---

## 1. Application Overview for Support

### System Summary

The Smart Building Dashboard is a real-time IoT monitoring platform for commercial buildings. It collects sensor data via MQTT, stores time-series readings in TimescaleDB, and presents role-based dashboards to three user types: Financial Decision Makers, System Administrators, and Technicians.

### Service Inventory

| Service | Container | Port | Technology | Purpose |
|---------|-----------|------|------------|---------|
| **Backend API** | `sbd-backend` | 4000 | Express.js + TypeScript | REST API, WebSocket, MQTT subscriber, alert engine |
| **Frontend** | `sbd-frontend` | 3000 | Next.js 14 (standalone) | Responsive web dashboard |
| **PostgreSQL + TimescaleDB** | `sbd-postgres` | 5432 | TimescaleDB on PG15 | Relational data + time-series hypertables |
| **Redis** | `sbd-redis` | 6379 | Redis 7 Alpine | Rate limiting, alert dedup cache, session caching |
| **MQTT Broker** | `sbd-mosquitto` | 1883 (TCP), 9001 (WS) | Eclipse Mosquitto 2 | IoT sensor message ingestion |

### Health Check Endpoints

| Service | Method | Endpoint/Command | Healthy Response |
|---------|--------|-------------------|------------------|
| Backend API | `GET` | `/api/v1/health` | `200 { "status": "ok", "uptime": <seconds> }` |
| Frontend | `GET` | `/` | HTTP 200 |
| PostgreSQL | CLI | `pg_isready -U sbd_user -d smart_building` | Exit code 0 |
| Redis | CLI | `redis-cli ping` | `PONG` |
| MQTT | CLI | `mosquitto_sub -t '$SYS/#' -C 1 -W 3` | Receives 1 message |

### Critical User Journeys

| # | Journey | Services Involved | Impact if Down |
|---|---------|-------------------|----------------|
| 1 | User login → dashboard load | Frontend → Backend → PostgreSQL | **Total outage** — no users can access system |
| 2 | Real-time sensor data display | MQTT → Backend → Socket.IO → Frontend | **Data staleness** — dashboards show stale readings |
| 3 | Alert triggering and notification | MQTT → Backend (alert engine) → PostgreSQL → Socket.IO | **Missed alerts** — critical conditions undetected |
| 4 | Energy consumption trends | Frontend → Backend → TimescaleDB | **Reporting failure** — no energy visibility |
| 5 | Equipment health monitoring | Frontend → Backend → PostgreSQL | **Maintenance risk** — health degradation undetected |
| 6 | Floor plan with live sensors | Frontend → Backend → PostgreSQL + Redis | **Spatial view unavailable** |

### Database and External Dependencies

| Dependency | Type | Connection String Env Var | Failure Impact |
|------------|------|--------------------------|----------------|
| PostgreSQL + TimescaleDB | Primary data store | `DATABASE_URL` | **Fatal** — all API requests fail |
| Redis | Cache & rate limiting | `REDIS_URL` | **Degraded** — rate limiter fails open, alert dedup disabled |
| Mosquitto MQTT | Message broker | `MQTT_BROKER_URL` | **Degraded** — no new sensor data ingested |
| SMTP (optional) | Email notifications | `SMTP_*` env vars | **Degraded** — email alerts fail, in-app alerts still work |

### Environment and Deployment Notes

- **Deployment model**: Docker Compose on a single host (pilot deployment: 2–3 buildings, ~500 sensors)
- **Network**: All containers on private `sbd-network` bridge network
- **Volumes**: `postgres_data`, `redis_data`, `mosquitto_data`, `mosquitto_log`, `uploads_data`
- **Restart policy**: `unless-stopped` on all containers
- **Container user**: Non-root (`appuser`, UID 1001) for backend and frontend
- **Signal handling**: Backend uses `dumb-init` as PID 1 for graceful shutdown
- **CI/CD**: GitHub Actions (CI: lint → test → build → Docker push; CD: staging auto → production manual approval)
- **Health check script**: `infra/monitoring/healthcheck.sh` — checks all 5 services + Docker container status

---

## 2. Severity Classification

### Severity Levels

| Severity | Name | Definition | Examples |
|----------|------|------------|----------|
| **P1** | Critical | Complete service outage or data loss. All users affected. Security breach. | Backend down, database unreachable, authentication broken, data corruption |
| **P2** | High | Major feature unavailable or severely degraded. Multiple users affected. | Dashboard not loading, alerts not triggering, MQTT ingestion halted, Socket.IO broadcast failure |
| **P3** | Medium | Single feature degraded or intermittent. Workaround exists. | Slow API responses, email notifications failing, Redis down (rate limiter fails open), single page errors |
| **P4** | Low | Minor issue, cosmetic defect, or enhancement request. | Incorrect label, UI alignment issue, log noise, documentation gap |

### Impact Assessment Criteria

| Factor | P1 | P2 | P3 | P4 |
|--------|----|----|----|----|
| Users affected | All | Many (>50%) | Some (<50%) | Few/None |
| Revenue impact | Direct loss | Indirect risk | Minimal | None |
| Data integrity | At risk | Safe | Safe | Safe |
| Safety systems | Alert system down | Degraded alerting | Alert delay | N/A |
| Workaround | None | Difficult | Available | Not needed |

### Response Time Expectations

| Severity | Acknowledge | First Update | Resolution Target |
|----------|-------------|--------------|-------------------|
| **P1** | 15 minutes | 30 minutes | 4 hours |
| **P2** | 30 minutes | 1 hour | 8 hours |
| **P3** | 2 hours | 4 hours | 48 hours (next business day) |
| **P4** | Next business day | 1 week | Next sprint |

### Escalation Triggers

| Condition | Action |
|-----------|--------|
| P1 not acknowledged in 15 min | Auto-escalate to L2 + Engineering Lead |
| P1 not resolved in 2 hours | Escalate to L3 + CTO/VP Engineering |
| P2 not resolved in 4 hours | Escalate to L2 |
| Any security breach detected | Immediate P1 + Security team notification |
| Data corruption suspected | Immediate P1 + halt all write operations |

---

## 3. Incident Runbooks

### 3.1 Backend API Not Responding

**Symptoms**: HTTP requests to `/api/v1/health` return non-200 or timeout. Frontend shows errors or blank pages.

**Severity**: P1

**Diagnosis Steps**:

```bash
# 1. Check container status
docker ps --filter "name=sbd-backend"
docker logs sbd-backend --tail 100

# 2. Check if process is running inside container
docker exec sbd-backend ps aux

# 3. Check health endpoint directly
curl -v http://localhost:4000/api/v1/health

# 4. Check container resource usage
docker stats sbd-backend --no-stream

# 5. Check if dependencies are up
docker exec sbd-backend wget -qO- http://postgres:5432 2>&1 || true
docker exec sbd-backend wget -qO- http://redis:6379 2>&1 || true
```

**Resolution Steps**:

1. **Container crashed** → Restart: `docker compose restart backend`
2. **Out of memory** → Check `docker stats`, increase memory limit in docker-compose
3. **Database connection failed** → See Runbook 3.3
4. **Port conflict** → Check `docker logs sbd-backend` for `EADDRINUSE`; stop conflicting process
5. **Application error** → Check logs for stack trace; may need code fix and redeployment
6. **Stuck process** → Force restart: `docker compose stop backend && docker compose up -d backend`

**Validation**: `curl http://localhost:4000/api/v1/health` returns `200 { "status": "ok" }`

---

### 3.2 Frontend 502/504 Errors

**Symptoms**: Browser shows 502 Bad Gateway or 504 Gateway Timeout. Login page or dashboard fails to load.

**Severity**: P1 (if total outage), P2 (if intermittent)

**Diagnosis Steps**:

```bash
# 1. Check frontend container
docker ps --filter "name=sbd-frontend"
docker logs sbd-frontend --tail 100

# 2. Check if Next.js is serving
curl -v http://localhost:3000/

# 3. Check if backend is reachable from frontend
docker exec sbd-frontend wget -qO- http://backend:4000/api/v1/health

# 4. If using Nginx reverse proxy, check Nginx logs
docker logs sbd-nginx --tail 50 2>/dev/null || echo "No Nginx container"
```

**Resolution Steps**:

1. **Frontend container crashed** → `docker compose restart frontend`
2. **Next.js build error** → Check logs for build/runtime errors. Redeploy with `docker compose up -d --build frontend`
3. **Backend unreachable from frontend** → Verify `BACKEND_INTERNAL_URL` env var. Check `sbd-network` connectivity
4. **Nginx misconfigured** → Check `infra/docker/nginx.conf` upstream definitions
5. **Memory exhaustion** → `docker stats sbd-frontend --no-stream`. Increase container memory if needed

**Validation**: Browser loads login page at `http://localhost:3000/login`

---

### 3.3 Database Connection Pool Exhaustion

**Symptoms**: API returns 500 errors. Backend logs show "Can't reach database server" or "Too many connections" or Prisma connection timeout errors.

**Severity**: P1

**Diagnosis Steps**:

```bash
# 1. Check PostgreSQL container health
docker exec sbd-postgres pg_isready -U sbd_user -d smart_building

# 2. Check current connection count
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check max connections setting
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SHOW max_connections;"

# 4. Check connection states
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# 5. Check for long-running queries
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
      FROM pg_stat_activity
      WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
      ORDER BY duration DESC;"

# 6. Check backend logs for connection errors
docker logs sbd-backend --tail 200 | grep -i "database\|prisma\|connection"
```

**Resolution Steps**:

1. **Kill long-running queries**:
   ```bash
   docker exec sbd-postgres psql -U sbd_user -d smart_building \
     -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
         WHERE state = 'idle in transaction' AND query_start < now() - interval '10 minutes';"
   ```
2. **Restart backend** to release stale connections: `docker compose restart backend`
3. **Increase max connections** (if consistently near limit): Edit PostgreSQL config and restart
4. **Check Prisma connection pool**: Ensure `?connection_limit=<N>` in `DATABASE_URL` is set appropriately (default is 5 per Prisma instance; recommend 10–20 for production)
5. **PostgreSQL restart** as last resort: `docker compose restart postgres` (will briefly disrupt all services)

**Prevention**: Add `?connection_limit=15` to `DATABASE_URL` in docker-compose environment

---

### 3.4 Redis Memory Pressure

**Symptoms**: Rate limiter stops working (allows unlimited requests). Alert deduplication fails (duplicate alerts generated). Backend logs show Redis warnings.

**Severity**: P3

**Diagnosis Steps**:

```bash
# 1. Check Redis memory usage
docker exec sbd-redis redis-cli INFO memory | grep used_memory_human
docker exec sbd-redis redis-cli INFO memory | grep maxmemory

# 2. Check key count
docker exec sbd-redis redis-cli DBSIZE

# 3. Check eviction stats
docker exec sbd-redis redis-cli INFO stats | grep evicted_keys

# 4. Check largest keys
docker exec sbd-redis redis-cli --bigkeys

# 5. Check Redis container health
docker ps --filter "name=sbd-redis"
```

**Resolution Steps**:

1. **Redis unreachable** → `docker compose restart redis`
2. **Memory near maxmemory (256mb)** → Redis is configured with `allkeys-lru` eviction; old keys are auto-evicted. This is normal. Increase `maxmemory` if evictions are too aggressive:
   ```bash
   docker exec sbd-redis redis-cli CONFIG SET maxmemory 512mb
   ```
3. **Excessive keys** → Check for key leaks (rate limiter keys not expiring). Inspect with:
   ```bash
   docker exec sbd-redis redis-cli --scan --pattern "rate:*" | head -20
   docker exec sbd-redis redis-cli TTL "rate:<sample-key>"
   ```
4. **Full reset** (if corrupt): `docker compose stop redis && docker volume rm sbd_redis_data && docker compose up -d redis`

**Impact While Down**: Rate limiter fails open (all requests allowed), alert deduplication disabled (duplicate alerts possible). **Core API functionality is unaffected.**

---

### 3.5 MQTT Message Backlog

**Symptoms**: Sensor data on dashboard appears delayed or stale. Sensors show "stale" badge (no data for >5 minutes). Backend logs show MQTT reconnection attempts.

**Severity**: P2

**Diagnosis Steps**:

```bash
# 1. Check Mosquitto container
docker ps --filter "name=sbd-mosquitto"
docker logs sbd-mosquitto --tail 50

# 2. Test MQTT connectivity
docker exec sbd-mosquitto mosquitto_sub -t '$SYS/#' -C 1 -W 3

# 3. Check MQTT subscription count
docker exec sbd-mosquitto mosquitto_sub -t '$SYS/broker/subscriptions/count' -C 1 -W 5

# 4. Check backend MQTT client status
docker logs sbd-backend --tail 100 | grep -i "mqtt"

# 5. Check message throughput
docker exec sbd-mosquitto mosquitto_sub -t '$SYS/broker/messages/received' -C 1 -W 5

# 6. Check Mosquitto log file
docker exec sbd-mosquitto cat /mosquitto/log/mosquitto.log | tail -50
```

**Resolution Steps**:

1. **Broker crashed** → `docker compose restart mosquitto`
2. **Backend lost MQTT connection** → `docker compose restart backend` (MQTT client auto-reconnects on startup)
3. **Message backlog** → Check if the backend subscriber is processing messages. Restart backend to re-subscribe
4. **IoT gateway disconnected** → Verify external sensor gateway connectivity. This is outside the dashboard scope
5. **Topic mismatch** → Verify `MQTT_TOPIC_PREFIX` env var matches IoT gateway publish topics

**Prevention**: Monitor Mosquitto `$SYS` topics for connection/message counts. Set up stale sensor alerting.

---

### 3.6 High Sensor Reading Latency

**Symptoms**: Dashboard data lags real-time by >10 seconds. Charts update slowly. Technicians report outdated readings.

**Severity**: P2

**Diagnosis Steps**:

```bash
# 1. Check backend API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/api/v1/health

# 2. Check TimescaleDB query performance
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT query, mean_exec_time, calls
      FROM pg_stat_statements
      ORDER BY mean_exec_time DESC LIMIT 10;"

# 3. Check hypertable chunk count
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT hypertable_name, count(*) as chunks
      FROM timescaledb_information.chunks
      GROUP BY hypertable_name;"

# 4. Check Socket.IO connections
# (Check backend logs for connected client count)
docker logs sbd-backend --tail 50 | grep -i "socket"

# 5. Check backend CPU/memory
docker stats sbd-backend --no-stream
```

**Resolution Steps**:

1. **Database slow queries** → Check for missing indexes or uncompressed old chunks. Run compression:
   ```sql
   SELECT compress_chunk(c) FROM show_chunks('sensor_readings', older_than => interval '7 days') c;
   ```
2. **Too many hypertable chunks** → Verify retention policy is active:
   ```sql
   SELECT * FROM timescaledb_information.jobs WHERE proc_name = 'policy_retention';
   ```
3. **Backend CPU saturated** → Check `docker stats`. Reduce concurrent MQTT message processing batch size or scale vertically
4. **Socket.IO broadcast flooding** → If too many clients, messages may queue. Check connected client count
5. **Network latency** → Check Docker network: `docker network inspect sbd-network`

---

### 3.7 JWT Token Issues (Mass Logout / Clock Skew)

**Symptoms**: Multiple users suddenly logged out. Token refresh fails across the board. 401 errors across all API calls.

**Severity**: P1 (if mass logout), P3 (if individual)

**Diagnosis Steps**:

```bash
# 1. Check backend JWT configuration
docker exec sbd-backend env | grep JWT

# 2. Check server time (clock skew)
docker exec sbd-backend date -u
docker exec sbd-postgres date -u
date -u
# All should be within 1-2 seconds of each other

# 3. Check if JWT_SECRET changed
# (If secret changed, ALL existing tokens become invalid)
docker logs sbd-backend --tail 50 | grep -i "jwt\|token\|auth"

# 4. Check refresh token table
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT COUNT(*), COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) as revoked
      FROM refresh_tokens
      WHERE expires_at > now();"

# 5. Check NTP sync on host
timedatectl status  # Linux
```

**Resolution Steps**:

1. **JWT_SECRET changed** → All users must re-login. This is expected. Ensure the old secret was not reverted
2. **Clock skew** → Sync clocks: `sudo ntpd -gq` or restart NTP service. Restart backend after sync
3. **Mass token revocation** → Check audit logs for bulk revocation. Verify no unauthorized access to DB
4. **Certificate/key rotation** → N/A for HS256, but ensure `JWT_SECRET` ≥ 32 characters
5. **Individual user token issue** → User should clear browser cookies and re-login

**Prevention**: Use NTP on all hosts. Never change `JWT_SECRET` without planning a maintenance window.

---

### 3.8 Alert Storm Handling (Too Many Alerts)

**Symptoms**: Hundreds or thousands of alerts generated in short time. Notification panel overwhelmed. Email inbox flooded. Database write throughput impacted.

**Severity**: P2

**Diagnosis Steps**:

```bash
# 1. Check recent alert count
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT severity, count(*)
      FROM alerts
      WHERE triggered_at > now() - interval '1 hour'
      GROUP BY severity ORDER BY count(*) DESC;"

# 2. Check which alert rules are firing
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT ar.name, ar.sensor_type, ar.threshold, count(a.id) as alert_count
      FROM alerts a JOIN alert_rules ar ON a.alert_rule_id = ar.id
      WHERE a.triggered_at > now() - interval '1 hour'
      GROUP BY ar.id, ar.name, ar.sensor_type, ar.threshold
      ORDER BY alert_count DESC LIMIT 10;"

# 3. Check Redis dedup cache status
docker exec sbd-redis redis-cli KEYS "alert:dedup:*" | wc -l

# 4. Check backend performance under alert load
docker stats sbd-backend --no-stream
```

**Resolution Steps**:

1. **Disable noisy alert rules temporarily**:
   ```bash
   # Via API (requires sys_admin JWT):
   curl -X PATCH http://localhost:4000/api/v1/alert-rules/<rule-id>/toggle \
     -H "Authorization: Bearer <token>"
   ```
   Or directly in DB:
   ```sql
   UPDATE alert_rules SET is_active = false WHERE id = '<rule-id>';
   ```

2. **Increase cooldown period** on frequently firing rules:
   ```sql
   UPDATE alert_rules SET cooldown_minutes = 60 WHERE id = '<rule-id>';
   ```

3. **Bulk-resolve stale alerts**:
   ```sql
   UPDATE alerts SET status = 'resolved', resolved_at = now()
   WHERE status = 'active' AND triggered_at < now() - interval '24 hours';
   ```

4. **Investigate root cause** — a sensor may be oscillating around a threshold. Adjust the threshold or add a dead-band offset

5. **Clean up notifications**:
   ```sql
   DELETE FROM notifications
   WHERE created_at < now() - interval '7 days' AND is_read = true;
   ```

**Prevention**: Set reasonable `cooldown_minutes` (minimum 5) on all alert rules. Monitor alert-per-hour metrics.

---

### 3.9 TimescaleDB Chunk Management

**Symptoms**: Database disk usage growing rapidly. Queries on `sensor_readings` becoming slow. Missing historical data.

**Severity**: P3

**Diagnosis Steps**:

```bash
# 1. Check hypertable size
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT hypertable_name,
      pg_size_pretty(hypertable_size(format('%I.%I', hypertable_schema, hypertable_name)::regclass))
      FROM timescaledb_information.hypertables;"

# 2. Check chunk count and size
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT hypertable_name, count(*) as chunks,
      pg_size_pretty(sum(total_bytes)) as total_size
      FROM timescaledb_information.chunks
      GROUP BY hypertable_name;"

# 3. Check retention policy status
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT * FROM timescaledb_information.jobs
      WHERE proc_name IN ('policy_retention', 'policy_compression');"

# 4. Check compression status
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT hypertable_name, is_compressed, count(*)
      FROM timescaledb_information.chunks
      GROUP BY hypertable_name, is_compressed;"

# 5. Check continuous aggregates
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "SELECT * FROM timescaledb_information.continuous_aggregates;"
```

**Resolution Steps**:

1. **Enable/fix retention policy** (raw data: 7 days, as per design):
   ```sql
   SELECT add_retention_policy('sensor_readings', INTERVAL '7 days', if_not_exists => true);
   SELECT add_retention_policy('equipment_metrics', INTERVAL '90 days', if_not_exists => true);
   ```

2. **Enable compression** (data older than 1 day):
   ```sql
   ALTER TABLE sensor_readings SET (
     timescaledb.compress,
     timescaledb.compress_segmentby = 'sensor_id',
     timescaledb.compress_orderby = 'time DESC'
   );
   SELECT add_compression_policy('sensor_readings', INTERVAL '1 day', if_not_exists => true);
   ```

3. **Manually compress old chunks**:
   ```sql
   SELECT compress_chunk(c) FROM show_chunks('sensor_readings', older_than => interval '1 day') c
   WHERE NOT is_compressed;
   ```

4. **Manually drop old chunks** (emergency disk space):
   ```sql
   SELECT drop_chunks('sensor_readings', older_than => interval '7 days');
   ```

5. **Refresh continuous aggregates**:
   ```sql
   CALL refresh_continuous_aggregate('sensor_readings_hourly', now() - interval '2 days', now());
   ```

**Data Retention Policy** (from design artifact):
- Raw readings: 7 days
- 1-minute averages: 90 days
- Hourly aggregates: 2 years

---

### 3.10 Disk Space Issues (Uploads, Logs, DB)

**Symptoms**: Services crashing with "No space left on device". Docker image pulls failing. Logs stop writing.

**Severity**: P1 (if causing outage), P2 (if approaching limit)

**Diagnosis Steps**:

```bash
# 1. Check host disk usage
df -h

# 2. Check Docker volume sizes
docker system df -v

# 3. Check specific volumes
docker run --rm -v sbd_postgres_data:/data alpine du -sh /data
docker run --rm -v sbd_uploads_data:/data alpine du -sh /data
docker run --rm -v sbd_mosquitto_log:/data alpine du -sh /data

# 4. Check Docker logs size
for container in sbd-postgres sbd-redis sbd-mosquitto sbd-backend sbd-frontend; do
  echo "$container: $(docker inspect $container --format='{{.LogPath}}' | xargs du -sh 2>/dev/null || echo 'N/A')"
done

# 5. Check for orphaned Docker resources
docker system df
```

**Resolution Steps**:

1. **Clean Docker resources**:
   ```bash
   docker system prune -f             # Remove stopped containers, dangling images, networks
   docker image prune -a -f           # Remove unused images (caution: re-download needed)
   ```

2. **Rotate Mosquitto logs**:
   ```bash
   docker exec sbd-mosquitto sh -c "truncate -s 0 /mosquitto/log/mosquitto.log"
   ```

3. **Truncate Docker container logs** (temporary fix):
   ```bash
   truncate -s 0 $(docker inspect sbd-backend --format='{{.LogPath}}')
   ```

4. **Configure Docker log rotation** (permanent fix in `/etc/docker/daemon.json`):
   ```json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "50m",
       "max-file": "3"
     }
   }
   ```

5. **Clean uploads directory** — remove orphaned floor plan files:
   ```bash
   docker exec sbd-backend ls -la /app/uploads/ | head -20
   ```

6. **Drop old TimescaleDB chunks** — see Runbook 3.9

7. **Clean old notifications and dead letter queue**:
   ```sql
   DELETE FROM notifications WHERE created_at < now() - interval '30 days';
   DELETE FROM dead_letter_queue WHERE created_at < now() - interval '7 days';
   ```

**Prevention**: Set Docker log rotation. Enable TimescaleDB retention policies. Monitor disk usage at 85% threshold.

---

## 4. Monitoring Checklist

### Health Check Endpoints

| Check | Command | Expected | Frequency |
|-------|---------|----------|-----------|
| Backend API health | `curl -sf http://localhost:4000/api/v1/health` | 200 + `"status":"ok"` | Every 30s |
| Frontend health | `curl -sf http://localhost:3000/` | 200 | Every 30s |
| PostgreSQL ready | `pg_isready -h localhost -p 5432 -U sbd_user` | Exit code 0 | Every 10s |
| Redis ping | `redis-cli -h localhost -p 6379 ping` | `PONG` | Every 10s |
| MQTT broker | `mosquitto_sub -h localhost -t '$SYS/#' -C 1 -W 3` | Receives message | Every 30s |
| Full health script | `bash infra/monitoring/healthcheck.sh` | 0 failures | Every 5 min |

### Key Metrics to Track

| Metric | Source | Warning Threshold | Critical Threshold |
|--------|--------|-------------------|-------------------|
| API response time (p95) | Backend logs / monitoring | > 500ms | > 2000ms |
| API error rate (5xx) | Backend logs | > 1% | > 5% |
| Active DB connections | `pg_stat_activity` | > 80% of max | > 95% of max |
| DB disk usage | `pg_database_size()` | > 70% disk | > 85% disk |
| Redis memory usage | `redis-cli INFO memory` | > 200MB (of 256MB) | > 240MB |
| MQTT messages/sec | `$SYS/broker/messages/received` | N/A (baseline dependent) | 0 for >5 min |
| Docker container restarts | `docker inspect --format='{{.RestartCount}}'` | > 2 in 1 hour | > 5 in 1 hour |
| Host disk usage | `df -h` | > 80% | > 90% |
| Host memory usage | `free -m` | > 80% | > 90% |
| Socket.IO connections | Backend logs | > 100 simultaneous | > 200 simultaneous |

### Log Locations and Search Patterns

| Component | Log Access | Key Search Patterns |
|-----------|-----------|---------------------|
| Backend API (all) | `docker logs sbd-backend` | — |
| HTTP requests | `docker logs sbd-backend \| grep "http"` | `"statusCode":500`, `"statusCode":401` |
| Auth events | `docker logs sbd-backend \| grep -i "auth\|login\|token"` | `INVALID_CREDENTIALS`, `TOKEN_EXPIRED` |
| MQTT events | `docker logs sbd-backend \| grep -i "mqtt"` | `MQTT.*disconnect`, `MQTT.*error` |
| Socket.IO | `docker logs sbd-backend \| grep -i "socket"` | `Socket.IO client connected/disconnected` |
| Rate limiting | `docker logs sbd-backend \| grep -i "rate"` | `Rate limit exceeded`, `Redis pipeline returned null` |
| Database errors | `docker logs sbd-backend \| grep -i "prisma\|database"` | `PrismaClientKnownRequestError`, `connection` |
| PostgreSQL | `docker logs sbd-postgres` | `FATAL`, `ERROR`, `too many connections` |
| Mosquitto | `docker logs sbd-mosquitto` | `error`, `New connection`, `Client disconnected` |
| Frontend | `docker logs sbd-frontend` | `Error`, `warn`, `500` |

### Alert Thresholds and Actions

| Condition | Severity | Action |
|-----------|----------|--------|
| Backend health check fails 3x consecutive | P1 | Page on-call, restart backend, check DB/Redis |
| PostgreSQL not ready | P1 | Page on-call, check disk space, check container |
| Redis unreachable for > 5 min | P3 | Restart Redis, check memory, note rate limiter degradation |
| MQTT broker down for > 5 min | P2 | Restart Mosquitto, verify IoT gateway connectivity |
| API error rate > 5% for 5 min | P2 | Check backend logs, check DB connections |
| Disk usage > 85% | P2 | Clean logs/images, run retention policies, expand volume |
| Container restart loop (>3 restarts in 10 min) | P1 | Check logs for crash reason, escalate if config issue |
| No MQTT messages for > 10 min (during business hours) | P2 | Check Mosquitto, check IoT gateways, check backend MQTT client |

---

## 5. Incident Response Template

### 5.1 Incident Report Format

```
===============================================================
INCIDENT REPORT
===============================================================

Incident ID:       INC-YYYYMMDD-NNN
Severity:          P1 / P2 / P3 / P4
Status:            Investigating / Identified / Mitigated / Resolved
Reported by:       [Name]
Reported at:       YYYY-MM-DD HH:MM UTC

----- SUMMARY -----
Title:             [Brief description of the incident]
Impact:            [What users/features are affected]
Duration:          [Start time] - [End time / ongoing]
Root Cause:        [Brief root cause or "Under investigation"]

----- TIMELINE -----
HH:MM UTC  — [Event/action]
HH:MM UTC  — [Event/action]
HH:MM UTC  — [Event/action]

----- AFFECTED SERVICES -----
- [ ] Backend API (sbd-backend)
- [ ] Frontend (sbd-frontend)
- [ ] PostgreSQL (sbd-postgres)
- [ ] Redis (sbd-redis)
- [ ] MQTT Broker (sbd-mosquitto)

----- RESOLUTION -----
Actions taken:     [List of actions]
Verified by:       [Name / automated check]
Verification time: YYYY-MM-DD HH:MM UTC

----- FOLLOW-UP -----
- [ ] Post-mortem scheduled
- [ ] Root cause fix deployed
- [ ] Monitoring gap addressed
- [ ] Documentation updated
===============================================================
```

### 5.2 Communication Templates

**Internal Escalation (Slack/Teams)**:
```
🔴 P1 INCIDENT — Smart Building Dashboard
Service: [affected service]
Impact: [user impact description]
Status: Investigating
Lead: [Name]
Bridge: [call link or channel]
ETA: Assessing
```

**Status Update (Internal)**:
```
🟡 UPDATE — INC-YYYYMMDD-NNN (P[1-4])
Status: [Investigating / Identified / Mitigated]
Finding: [what we know so far]
Next step: [current action being taken]
ETA: [estimated resolution time or "Assessing"]
```

**Resolution Notification (Internal)**:
```
🟢 RESOLVED — INC-YYYYMMDD-NNN (P[1-4])
Duration: [X hours Y minutes]
Root cause: [brief root cause]
Resolution: [what fixed it]
Follow-up: Post-mortem on [date]
```

**External User Communication (if applicable)**:
```
Subject: Service Disruption — Smart Building Dashboard

We are currently experiencing [degraded performance / an outage] with [affected feature].

Impact: [What users may notice]
Status: Our team is actively working on resolution.
ETA: [Estimated resolution time]

We will provide updates every [30 minutes / 1 hour].

Last updated: YYYY-MM-DD HH:MM UTC
```

### 5.3 Post-Mortem Format

```
===============================================================
POST-MORTEM: INC-YYYYMMDD-NNN
===============================================================

Date:              YYYY-MM-DD
Severity:          P[1-4]
Duration:          [Total time]
Author:            [Name]
Reviewers:         [Names]

----- EXECUTIVE SUMMARY -----
[2-3 sentence summary of what happened, impact, and resolution]

----- IMPACT -----
- Users affected: [count/percentage]
- Features affected: [list]
- Data impact: [none / some readings missed / etc.]
- Financial impact: [if applicable]

----- ROOT CAUSE -----
[Detailed technical explanation of what failed and why]

----- TIMELINE -----
HH:MM UTC  — [Trigger event]
HH:MM UTC  — [Detection]
HH:MM UTC  — [Response began]
HH:MM UTC  — [Root cause identified]
HH:MM UTC  — [Mitigation applied]
HH:MM UTC  — [Service restored]
HH:MM UTC  — [Verification complete]

----- WHAT WENT WELL -----
- [Positive aspects of response]

----- WHAT WENT WRONG -----
- [Detection gaps, communication delays, etc.]

----- ACTION ITEMS -----
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | [action description] | [name] | [date] | open |

----- LESSONS LEARNED -----
- [Key takeaways for the team]
===============================================================
```

---

## 6. Escalation Paths

### L1 → L2 → L3 Escalation Matrix

| Level | Role | Responsibilities | Escalation Criteria |
|-------|------|-------------------|---------------------|
| **L1 — Operations Support** | On-call engineer / support team | Run healthcheck script, check container status, restart services, follow runbooks | Cannot resolve with runbook within 30 min (P1) or 2 hours (P2) |
| **L2 — Engineering** | Backend/Frontend developers | Analyze logs, debug application code, apply hotfixes, tune database queries | Root cause is code bug, schema issue, or architectural limitation |
| **L3 — Infrastructure / Architecture** | DevOps lead, System Architect, DBA | Infrastructure changes, scaling decisions, database recovery, security incidents | Requires infra changes, data recovery, or cross-system coordination |

### Component Owner Mapping

| Component | L1 (Operations) | L2 (Engineering) | L3 (Architecture) |
|-----------|-----------------|-------------------|-------------------|
| Backend API | Restart, log check | Code debug, hotfix | Scaling, redesign |
| Frontend | Restart, clear cache | React/Next.js debug | Build pipeline |
| PostgreSQL / TimescaleDB | Connections check, restart | Query optimization, schema | Replication, recovery |
| Redis | Restart, memory check | Key pattern analysis | Clustering |
| MQTT / Mosquitto | Restart, connectivity check | Message processing debug | Broker scaling |
| Authentication / JWT | Token validation check | Auth service debug | Security review |
| Socket.IO | Connection count check | Room/broadcast debug | Scalability (Redis adapter) |
| CI/CD Pipeline | Re-run failed jobs | Pipeline config fix | Infrastructure change |
| Docker / Infra | Container restart, disk check | Dockerfile changes | Host provisioning |

### External Dependencies

| Dependency | Contact Method | When to Contact |
|------------|---------------|-----------------|
| IoT Gateway / Sensors vendor | Vendor support portal/phone | MQTT messages not arriving from gateways |
| SMTP/Email provider | Provider support dashboard | Email alert delivery failures |
| DNS provider | Provider control panel | Domain resolution issues |
| TLS certificate authority | Provider dashboard | Certificate expiry or renewal issues |
| Docker Hub / GHCR | Status page | Image pull failures |

### Decision Authority

| Decision | Authority Level |
|----------|----------------|
| Restart individual container | L1 |
| Restart database | L1 (with notification to L2) |
| Deploy hotfix to staging | L2 |
| Deploy hotfix to production | L2 + L3 approval |
| Rollback production deployment | L2 |
| Modify database schema | L2 + L3 approval |
| Delete/drop production data | L3 only |
| Change JWT_SECRET (invalidates all sessions) | L3 only |

---

## 7. Operational Procedures

### 7.1 Deployment Checklist

```
PRE-DEPLOYMENT:
  [ ] All CI checks pass (lint, test, build)
  [ ] Docker images built and pushed to GHCR
  [ ] Staging deployment tested and health checks green
  [ ] Database migration reviewed (if any)
  [ ] `.env` changes documented and applied
  [ ] Team notified of deployment window

DEPLOYMENT:
  [ ] Pull latest images: docker compose pull
  [ ] Run database migrations:
      docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma
  [ ] Run TimescaleDB setup (first deploy only):
      docker compose exec postgres psql -U sbd_user -d smart_building \
        -f /docker-entrypoint-initdb.d/99-timescaledb-setup.sql
  [ ] Update services: docker compose up -d --no-build
  [ ] Wait 30 seconds for health checks
  [ ] Run: bash infra/monitoring/healthcheck.sh

POST-DEPLOYMENT:
  [ ] Verify login works (test account)
  [ ] Verify dashboard loads with data
  [ ] Check backend logs for errors: docker logs sbd-backend --tail 50
  [ ] Verify MQTT messages flowing (if applicable)
  [ ] Monitor for 15 minutes
  [ ] Notify team of successful deployment
```

### 7.2 Rollback Procedure

```bash
# 1. Identify the previous working image tags
docker compose images

# 2. Update docker-compose.yml or .env with previous image tags
# (Tag format: ghcr.io/<org>/smart-building-dashboard/backend:<git-sha>)

# 3. Roll back application containers
docker compose up -d --no-build backend frontend

# 4. Verify health
bash infra/monitoring/healthcheck.sh

# 5. If database migration was applied and must be reversed:
#    ⚠ Prisma does not auto-rollback. Options:
#    a) Restore from database backup taken before deployment
#    b) Write and apply a reverse migration manually
#    c) Contact L3 for database recovery

# 6. Notify team of rollback and reason
```

### 7.3 Database Migration Procedure

```bash
# 1. ALWAYS take a backup before migration
docker exec sbd-postgres pg_dump -U sbd_user -d smart_building > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Review pending migrations
docker compose exec backend npx prisma migrate status --schema=src/database/schema.prisma

# 3. Apply migrations
docker compose exec backend npx prisma migrate deploy --schema=src/database/schema.prisma

# 4. Verify migration
docker compose exec backend npx prisma migrate status --schema=src/database/schema.prisma

# 5. If TimescaleDB-specific changes, run setup SQL
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -f /docker-entrypoint-initdb.d/99-timescaledb-setup.sql

# 6. Verify application health
bash infra/monitoring/healthcheck.sh
```

### 7.4 User Account Management

**Create a new user** (requires `sys_admin` JWT):
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123",
    "name": "User Name",
    "role": "technician",
    "buildingId": "<building-uuid>"
  }'
```

**Deactivate a user**:
```bash
curl -X PATCH http://localhost:4000/api/v1/users/<user-id> \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'
```

**Reset a user's password** (via direct DB — no self-service password reset endpoint in MVP):
```bash
# Generate bcrypt hash (12 rounds)
docker compose exec backend node -e "
  const bcrypt = require('bcryptjs');
  bcrypt.hash('NewPassword123', 12).then(h => console.log(h));
"

# Update in database
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "UPDATE users SET password_hash = '<bcrypt-hash>' WHERE email = 'user@example.com';"

# Revoke existing refresh tokens (forces re-login)
docker exec sbd-postgres psql -U sbd_user -d smart_building \
  -c "UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');"
```

**List all users**:
```bash
curl http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer <admin-token>"
```

### 7.5 Adding New Buildings and Sensors

**Create a building** (via database — no admin API for buildings in MVP):
```sql
INSERT INTO buildings (id, name, address, city, timezone, latitude, longitude)
VALUES (
  gen_random_uuid(), 'New Building', '123 Street', 'Jakarta',
  'Asia/Jakarta', -6.2088, 106.8456
);
```

**Add floors and zones**:
```sql
-- Add floor
INSERT INTO floors (id, building_id, name, level, sort_order)
VALUES (gen_random_uuid(), '<building-id>', 'Ground Floor', 0, 1);

-- Add zone
INSERT INTO zones (id, floor_id, name, type, temp_min, temp_max, humidity_min, humidity_max, co2_max)
VALUES (gen_random_uuid(), '<floor-id>', 'Lobby', 'lobby', 20.0, 26.0, 30.0, 70.0, 1000.0);
```

**Register a sensor**:
```sql
INSERT INTO sensors (id, building_id, zone_id, name, type, unit, mqtt_topic, status, is_active)
VALUES (
  gen_random_uuid(), '<building-id>', '<zone-id>',
  'Lobby Temperature', 'temperature', '°C',
  'smartbuilding/<building-id>/sensor/temperature/lobby-01',
  'offline', true
);
```

### 7.6 Alert Rule Configuration

**Create alert rule** via API:
```bash
curl -X POST http://localhost:4000/api/v1/alert-rules \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High Temperature Alert",
    "buildingId": "<building-uuid>",
    "sensorType": "temperature",
    "operator": "gt",
    "threshold": 30.0,
    "severity": "warning",
    "cooldownMinutes": 15,
    "emailNotification": true,
    "emailRecipients": ["admin@example.com"],
    "isActive": true
  }'
```

**Disable/enable alert rule**:
```bash
curl -X PATCH http://localhost:4000/api/v1/alert-rules/<rule-id>/toggle \
  -H "Authorization: Bearer <admin-token>"
```

### 7.7 Backup and Restore

**Database backup**:
```bash
# Full backup (includes TimescaleDB data)
docker exec sbd-postgres pg_dump -U sbd_user -d smart_building -Fc > \
  backup_$(date +%Y%m%d_%H%M%S).dump

# Schema-only backup
docker exec sbd-postgres pg_dump -U sbd_user -d smart_building --schema-only > \
  schema_$(date +%Y%m%d_%H%M%S).sql

# TimescaleDB-aware backup (recommended)
docker exec sbd-postgres pg_dump -U sbd_user -d smart_building \
  --format=directory --file=/tmp/backup
docker cp sbd-postgres:/tmp/backup ./backup_$(date +%Y%m%d)
```

**Database restore**:
```bash
# ⚠ This replaces all data — confirm before proceeding
docker exec -i sbd-postgres pg_restore -U sbd_user -d smart_building \
  --clean --if-exists < backup_file.dump
```

**Uploads backup**:
```bash
# Backup floor plan uploads
docker cp sbd-backend:/app/uploads ./uploads_backup_$(date +%Y%m%d)

# Restore
docker cp ./uploads_backup_20260414/. sbd-backend:/app/uploads/
```

**Recommended backup schedule**:
| Data | Frequency | Retention |
|------|-----------|-----------|
| Full database (pg_dump) | Daily at 02:00 UTC | 30 days |
| Uploads directory | Weekly | 90 days |
| Docker Compose + .env | On every change | In version control |

### 7.8 Log Rotation and Retention

**Docker container logs**:
Configure in `/etc/docker/daemon.json` (host-level):
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "3"
  }
}
```
Restart Docker daemon after change: `sudo systemctl restart docker`

**Mosquitto logs**:
```bash
# Manual rotation
docker exec sbd-mosquitto sh -c "cp /mosquitto/log/mosquitto.log /mosquitto/log/mosquitto.log.1 && truncate -s 0 /mosquitto/log/mosquitto.log"
```

**PostgreSQL logs**: Managed within container; pg_log files auto-rotated by PostgreSQL defaults.

**Application logs**: Backend logs via Winston to stdout (captured by Docker). No file-based logs to rotate.

**Retention policy**:
| Log Type | Retention |
|----------|-----------|
| Docker container logs | 150MB per container (3 × 50MB) |
| Mosquitto logs | Manual cleanup; recommend weekly |
| PostgreSQL WAL/logs | Managed by PG; monitor disk |
| Application audit logs (DB) | 90 days (manual cleanup) |

---

## 8. Performance Baselines

### API Response Time Targets

| Endpoint Category | p50 Target | p95 Target | p99 Target |
|-------------------|------------|------------|------------|
| Health check (`/api/v1/health`) | < 10ms | < 50ms | < 100ms |
| Authentication (login/refresh) | < 200ms | < 500ms | < 1000ms |
| Simple CRUD (list, get) | < 100ms | < 300ms | < 500ms |
| Dashboard aggregation | < 300ms | < 800ms | < 2000ms |
| Time-series queries (sensor readings) | < 200ms | < 500ms | < 1500ms |
| Floor plan with sensors | < 150ms | < 400ms | < 800ms |
| File upload (floor plan) | < 1000ms | < 3000ms | < 5000ms |

### Database Query Performance

| Query Type | Target | Notes |
|------------|--------|-------|
| User lookup by email | < 5ms | Indexed |
| Sensor readings (1 sensor, 24h) | < 50ms | TimescaleDB time-based index |
| Sensor readings (1 sensor, 7d) | < 200ms | May hit compressed chunks |
| Energy aggregation (building, 30d) | < 500ms | Continuous aggregate preferred |
| Alert rules for building | < 10ms | Indexed on building_id |
| Dashboard aggregate queries | < 300ms | Multiple queries; consider caching |

### MQTT Throughput Expectations

| Metric | Pilot Target | Notes |
|--------|-------------|-------|
| Sensors | ~500 | Across 2–3 buildings |
| Messages per second (sustained) | ~33 msg/s | 500 sensors × 1 reading/15s |
| Messages per second (peak) | ~100 msg/s | Burst during system startup |
| Message size (average) | ~200 bytes | JSON payload |
| Throughput | ~20 KB/s sustained | Well within Mosquitto capacity |

### Frontend Load Time Targets

| Page | First Contentful Paint | Largest Contentful Paint | Time to Interactive |
|------|----------------------|-------------------------|---------------------|
| Login | < 1.0s | < 1.5s | < 2.0s |
| Dashboard | < 1.5s | < 2.5s | < 3.0s |
| Energy page (with charts) | < 2.0s | < 3.0s | < 3.5s |
| Floor plan (with sensors) | < 2.0s | < 3.0s | < 3.5s |
| Alert list | < 1.0s | < 2.0s | < 2.5s |

---

## 9. Known Issues and Workarounds

### Issues from Testing (Tester Results — Artifact 08)

| # | Issue | Severity | Status | Workaround |
|---|-------|----------|--------|------------|
| BUG-002 | Rate limiter fails open without logging when Redis returns null | Medium | Partial fix — warning log added, but still allows requests through | Monitor Redis availability; restart Redis if down |
| BUG-004 | Dashboard controllers had inconsistent buildingId validation | Low | Fixed — null checks added | N/A (resolved) |

### Residual Security Risks (Security Review — Artifact 09)

| # | Risk | Severity | Status | Workaround / Mitigation |
|---|------|----------|--------|------------------------|
| V01 | SVG sanitization uses brittle regex — bypassable XSS | High | **Open** | Accept PNG only for floor plans until DOMPurify is integrated. Instruct admins to verify SVG files before upload |
| V05 | Socket.IO rooms not scoped to user's building assignment | Medium | **Open** | Acceptable for pilot (trusted users). Fix required before multi-tenant deployment |
| V07 | `authRateLimiter` not applied to login endpoint (general limiter only: 100/15min) | Medium | **Open — requires code fix** | General rate limiter provides some protection (100 req/15min per IP). Implement IP-based monitoring |
| V08 | MQTT messages not schema-validated before processing | Medium | **Open** (MQTT pipeline is stub) | MQTT pipeline is stub-only; not processing production data yet |
| V09 | Audit log model exists but never written to | Medium | **Open** | Manual audit via HTTP access logs (Morgan/Winston) |
| V11 | No refresh token rotation — stolen token reusable until expiry | Medium | **Open — requires code fix** | 7-day token expiry limits exposure window. Logout revokes tokens |

### Performance Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No caching layer on dashboard endpoints | Higher DB load under concurrent access | Dashboard queries are fast with indexes; add Redis caching if p95 > 500ms |
| Prisma default connection pool (5 connections) | May exhaust under load | Set `?connection_limit=15` in `DATABASE_URL` |
| No client-side data caching (SWR/React Query) | Frontend refetches on every navigation | Acceptable for MVP; add SWR in Phase 2 |
| No pagination on notifications by default | Unbounded result sets for heavy alert users | Query schema supports pagination; ensure clients use it |
| Single-server Docker deployment | No horizontal scaling or HA | Acceptable for pilot (2–3 buildings). Scale in Phase 2 |

### Temporary Workarounds

| Scenario | Workaround | Permanent Fix |
|----------|------------|---------------|
| User forgot password | Admin resets via DB (see Section 7.4) | Implement self-service password reset endpoint |
| Need to add building/floor/zone | Direct SQL insert (see Section 7.5) | Build admin CRUD API for spatial entities |
| PDF reports not working | Manual export from browser (print to PDF) | Verify PDFKit endpoint implementation |
| MQTT data not appearing | Check MQTT topic prefix matches gateway config | Full MQTT ingestion pipeline implementation |
| SVG upload rejected as unsafe | Convert SVG to PNG before upload | Integrate DOMPurify for proper SVG sanitization |
| Alert email not sent | Verify SMTP environment variables are set | Implement email delivery retry queue with monitoring |

---

## 10. Pre-Production Checklist

Before going live, the following items must be verified:

### Critical (Must Be Done)

- [ ] `package-lock.json` committed for all 3 workspaces (root, backend, frontend)
- [ ] `authRateLimiter` applied to `POST /auth/login` route (Security R01)
- [ ] TLS/HTTPS configured via Nginx reverse proxy or cloud load balancer
- [ ] Production `JWT_SECRET` set (≥32 chars, cryptographically random)
- [ ] Production `POSTGRES_PASSWORD` set (strong, unique)
- [ ] MQTT broker configured with `allow_anonymous false` + password file for production
- [ ] Database seed run (initial admin user, demo building for pilot)
- [ ] Healthcheck script passes all checks: `bash infra/monitoring/healthcheck.sh`
- [ ] Docker log rotation configured on host
- [ ] TimescaleDB retention and compression policies applied

### Recommended (Should Be Done)

- [ ] Refresh token rotation implemented (Security R04)
- [ ] SVG sanitization replaced with DOMPurify or SVG uploads disabled (Security R02)
- [ ] Horizontal access control for buildingId (verify user assignment)
- [ ] `npm audit` returns no critical vulnerabilities
- [ ] External uptime monitoring configured (e.g., UptimeRobot)
- [ ] Automated daily database backups configured
- [ ] Audit log writes implemented for security events
- [ ] Docker image vulnerability scanning (Trivy or `docker scout`)

---

## 11. Handoff

- **Inputs consumed**:
  - `.artifacts/01-creator-vision.md` — Product vision, business objectives, success metrics, stakeholder roles
  - `.artifacts/02-pm-roadmap.md` — MVP feature scope, sprint plan, user roles, acceptance criteria
  - `.artifacts/03-sa-system-design.md` — System architecture, component responsibilities, data flows, API contracts, error handling, design assumptions
  - `.artifacts/04-uiux-design.md` — Design system, layout architecture, role-based UI, interaction flows
  - `.artifacts/05-data-schema.md` — Database schema (Prisma), entity relationships, TimescaleDB hypertables, retention policies, volume estimates
  - `.artifacts/06-coder-plan.md` — Implementation plan, file manifest, API endpoint list, dependency list
  - `.artifacts/07-qa-test-plan.md` — Test strategy, code quality review, security concerns, defect severity model
  - `.artifacts/08-tester-results.md` — Test suite (196 tests), bug reports (BUG-001 fixed, BUG-002 open, BUG-004 open), edge case findings
  - `.artifacts/09-security-review.md` — 13 vulnerabilities assessed, OWASP control evaluation, 4 fixes applied, remediation plan with 4 critical items
  - `.artifacts/10-devops-pipeline.md` — CI/CD pipeline, Docker Compose (5 services), Dockerfiles, health check script, deployment/rollback procedures
  - `.artifacts/11-documentation.md` — README, API reference (51 endpoints), architecture docs, deployment guide

- **Outputs produced**:
  - `.artifacts/12-support-playbook.md` — This document (comprehensive operations support playbook)

- **Pipeline Status**: **COMPLETE** — All 12 stages of the multi-agent pipeline have been executed.

- **Production Readiness Assessment**: **CONDITIONAL GO**

  The Smart Building Dashboard is architecturally sound, well-documented, and tested for pilot deployment to 2–3 buildings with ~500 sensors. The following assessment applies:

  | Area | Status | Notes |
  |------|--------|-------|
  | Core functionality | ✅ Ready | Auth, dashboards, energy, environment, assets, alerts, floor plans |
  | Infrastructure | ✅ Ready | Docker Compose, CI/CD, health checks, monitoring script |
  | Testing | ✅ Ready | 196 tests across unit/integration/E2E |
  | Documentation | ✅ Ready | README, API reference, architecture, deployment guide |
  | Security | ⚠️ Conditional | 4 open remediation items (R01–R04); R01 and R03 are critical before release |
  | MQTT pipeline | ⚠️ Stub | Data ingestion is stub-only; must be wired for production sensor data |
  | Observability | ⚠️ Basic | Structured logging in place; external monitoring not yet configured |

  **Go conditions** (must be met before production traffic):
  1. Apply `authRateLimiter` to login endpoint (5 min fix)
  2. Commit `package-lock.json` files (5 min fix)
  3. Configure TLS/HTTPS termination
  4. Set production secrets (`JWT_SECRET`, `POSTGRES_PASSWORD`)
  5. Configure MQTT broker authentication for production
  6. Run database seed with initial admin user

- **Remaining Items for Team**:
  1. **Coder**: Apply `authRateLimiter` to login route; commit lock files; implement refresh token rotation; replace SVG regex sanitization
  2. **DevOps**: Configure TLS certificates; set up external uptime monitoring; configure automated database backups; configure Docker log rotation on production host
  3. **Security**: Implement horizontal access control (buildingId scoping per user); implement audit log writes; schedule penetration test post-pilot
  4. **Product**: Complete MQTT ingestion pipeline for production sensor connectivity; plan Phase 2 features (device control, AI, ESG)
  5. **Support**: Set up on-call rotation; configure alerting channels (Slack/Teams/PagerDuty); establish baseline metrics during pilot ramp-up
