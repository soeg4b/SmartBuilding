# 05 — Data Agent: Database Schema Design — Smart Building Dashboard

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Created**: 2026-04-14
> **Author**: Data Agent (Stage 5)
> **Status**: Ready for Coder Review
> **Input Artifact**: `.artifacts/03-sa-system-design.md`

---

## 1. Database Schema Design

### 1.1 Database Engine

- **Primary**: PostgreSQL 15+ with **TimescaleDB 2.x** extension
- **Caching**: Redis 7+ (session, rate limiting, alert dedup — not modeled here)
- **ORM**: Prisma 5+ for relational tables; `$queryRaw` for TimescaleDB-specific queries (hypertables, continuous aggregates, `time_bucket`)

### 1.2 Core Entities and Purpose

| Entity | Purpose | Volume Estimate |
|--------|---------|-----------------|
| `users` | Identity, authentication, RBAC | ~10–50 rows |
| `refresh_tokens` | JWT refresh token storage for session management | ~10–100 active |
| `buildings` | Top-level physical structure | 1–3 (pilot) |
| `floors` | Vertical division of buildings | ~5–15 per building |
| `zones` | Functional areas on a floor with comfort thresholds | ~3–10 per floor |
| `sensors` | IoT sensor registry with MQTT topic mapping | ~500 total (pilot) |
| `sensor_readings` | **TimescaleDB hypertable** — raw time-series data | ~2.9M rows/day |
| `equipment` | Physical asset inventory (gensets, pumps, AHUs) | ~25–100 |
| `equipment_sensors` | Many-to-many link: sensors → equipment | ~100–300 |
| `equipment_metrics` | **TimescaleDB hypertable** — runtime/fuel metrics | ~10K rows/day |
| `alert_rules` | Threshold-based alert configuration | ~20–100 |
| `alerts` | Triggered alert instances | ~50–500/day |
| `notifications` | Per-user in-app notifications | ~100–1000/day |
| `floor_plans` | Uploaded SVG/PNG floor plan metadata | ~5–15 |
| `sensor_placements` | Sensor (x,y) positions on floor plans | ~500 |
| `energy_tariffs` | PLN tariff configuration per building | ~1–5 per building |
| `audit_logs` | User action audit trail | ~500–5000/day |
| `dead_letter_queue` | Failed MQTT message storage for debugging | ~0–100/day |

### 1.3 Normalization Decisions

| Decision | Rationale |
|----------|-----------|
| Building → Floor → Zone hierarchy (3NF) | Clean hierarchical navigation; no data duplication |
| `sensors.building_id` denormalized (also derivable via zone → floor → building) | Avoids 3-table join for every building-scoped sensor query; critical hot path |
| Alert `operator` stored as string in `alerts` table (denormalized from `alert_rules`) | Allows alert to remain self-describing even if rule is deleted |
| `sensor_readings` has no FK on `building_id` | Derived via `sensor_id` join when needed; keeps hypertable lean for write throughput |
| `equipment.floor_id` and `equipment.zone_id` denormalized | Equipment can be relocated; direct FK avoids traversal |

### 1.4 Soft Delete Strategy

Soft deletes via `is_active` flag on:
- `users` — deactivated users retain audit trail
- `sensors` — deactivated sensors stop ingestion but historical data preserved
- `equipment` — decommissioned equipment retains maintenance history

Hard deletes:
- `dead_letter_queue` — periodically pruned
- `refresh_tokens` — expired tokens cleaned by cron
- `sensor_readings` — managed by TimescaleDB retention policies

---

## 2. Prisma Schema

The complete Prisma schema is in `src/database/schema.prisma`. Key design decisions:

### 2.1 Enum Definitions

```
UserRole:     financial_decision_maker | sys_admin | technician
SensorType:   temperature | humidity | co2 | energy_meter | power_factor | fuel_level | vibration | runtime
SensorStatus: online | offline | stale
AlertOperator: > | < | >= | <= | ==  (mapped via @map)
AlertSeverity: info | warning | critical
AlertStatus:  active | acknowledged | resolved
EquipmentType: genset | pump | ahu | chiller | boiler | elevator | transformer
HealthStatus: green | yellow | red
ZoneType:     office | corridor | server_room | conference_room | lobby | restroom | storage | mechanical | parking | other
FloorPlanFileType: svg | png
ReadingQuality: good | suspect | bad
EquipmentMetricType: running_hours | cycle_count | fuel_level | operating_hours
```

### 2.2 Key Prisma Conventions

- **UUIDs everywhere**: All primary keys use `@id @default(uuid()) @db.Uuid`
- **Snake-case mapping**: All model fields use camelCase with `@map("snake_case")` for DB columns
- **Table mapping**: All models use `@@map("table_name")` for snake_case table names
- **Timestamps**: All temporal columns use `@db.Timestamptz()` for timezone-aware storage (UTC)
- **`@updatedAt`**: Applied on `updated_at` fields for automatic Prisma management
- **Cascade rules**: Parent deletion cascades to owned children (floors → zones, zones → sensors). Reference-only FKs use `SetNull`.

### 2.3 TimescaleDB Caveat

Prisma does NOT natively support:
- `create_hypertable()` — must be run via raw SQL migration
- Continuous aggregates — materialized views created via raw SQL
- Retention/compression policies — applied via raw SQL

See `src/database/migrations/timescaledb-setup.sql` for all TimescaleDB-specific SQL that must run AFTER `prisma migrate deploy`.

The `SensorReading` and `EquipmentMetric` models use composite `@@id` to represent the hypertable's composite primary key, enabling Prisma Client type generation.

---

## 3. ERD Specification

### 3.1 Entity Relationship Diagram (Textual)

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Building   │1──────N│    Floor     │1──────N│     Zone     │
│              │        │              │        │              │
│ id (PK)      │        │ id (PK)      │        │ id (PK)      │
│ name         │        │ building_id  │        │ floor_id     │
│ address      │        │ name         │        │ name         │
│ city         │        │ level        │        │ type         │
│ timezone     │        │ sort_order   │        │ temp_min/max │
└──────┬───────┘        └──────────────┘        │ humidity_min/│
       │                                        │ humidity_max │
       │                                        │ co2_max      │
       │                                        └──────┬───────┘
       │                                               │
       │ 1──N                                    1──N  │
       │                                               │
┌──────┴───────┐                                ┌──────┴───────┐
│     User     │                                │    Sensor    │
│              │                                │              │
│ id (PK)      │                                │ id (PK)      │
│ email        │                                │ building_id  │
│ password_hash│                                │ zone_id      │
│ name         │                                │ name         │
│ role (enum)  │                                │ type (enum)  │
│ building_id  │                                │ unit         │
│ is_active    │                                │ mqtt_topic   │
└──────┬───────┘                                │ status       │
       │                                        │ last_seen_at │
       │ 1──N                                   │ metadata     │
       │                                        │ is_active    │
┌──────┴───────┐                                └──┬───┬───┬───┘
│RefreshToken  │                                   │   │   │
│              │                         1──N ─────┘   │   │
│ id (PK)      │                                       │   │
│ user_id (FK) │                              ┌────────┘   └────────┐
│ token_hash   │                              │                     │
│ expires_at   │                    ┌─────────┴──────┐    ┌────────┴────────┐
│ revoked_at   │                    │ SensorReading  │    │EquipmentSensor │
└──────────────┘                    │ (HYPERTABLE)   │    │ (link table)   │
                                    │                │    │                │
                                    │ time (PK)      │    │ equipment_id   │
                                    │ sensor_id (PK) │    │ sensor_id      │
                                    │ value          │    │ role           │
                                    │ quality        │    └────────┬───────┘
                                    └────────────────┘             │
                                                                   │ N──1
                                                          ┌────────┴───────┐
                                                          │   Equipment    │
                                                          │                │
                                                          │ id (PK)        │
                                                          │ building_id    │
                                                          │ floor_id       │
                                                          │ zone_id        │
                                                          │ name           │
                                                          │ type (enum)    │
                                                          │ serial_number  │
                                                          │ health_status  │
                                                          │ is_active      │
                                                          └────────┬───────┘
                                                                   │ 1──N
                                                          ┌────────┴───────┐
                                                          │EquipmentMetric │
                                                          │ (HYPERTABLE)   │
                                                          │                │
                                                          │ time (PK)      │
                                                          │ equipment_id   │
                                                          │ metric_type    │
                                                          │ value          │
                                                          └────────────────┘

┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│  AlertRule   │1──────N│    Alert     │1──────N│ Notification │
│              │        │              │        │              │
│ id (PK)      │        │ id (PK)      │        │ id (PK)      │
│ building_id  │        │ alert_rule_id│        │ user_id      │
│ name         │        │ building_id  │        │ alert_id     │
│ sensor_type  │        │ sensor_id    │        │ title        │
│ sensor_id    │        │ severity     │        │ message      │
│ operator     │        │ status       │        │ severity     │
│ threshold    │        │ sensor_value │        │ is_read      │
│ severity     │        │ threshold_val│        └──────────────┘
│ cooldown_min │        │ operator     │
│ email_notif  │        │ message      │
│ email_recip  │        │ triggered_at │
│ is_active    │        │ ack_at/by    │
│ created_by   │        │ resolved_at  │
└──────────────┘        │ resolved_by  │
                        │ comment      │
                        └──────────────┘

┌──────────────┐        ┌──────────────┐
│  FloorPlan   │1──────N│SensorPlacement│
│              │        │              │
│ id (PK)      │        │ id (PK)      │
│ building_id  │        │ floor_plan_id│
│ floor_id     │        │ sensor_id    │
│ label        │        │ x (%)        │
│ file_type    │        │ y (%)        │
│ file_path    │        │ rotation     │
│ file_size    │        └──────────────┘
│ uploaded_by  │
└──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│EnergyTariff  │  │  AuditLog    │  │DeadLetterQueue│
│              │  │              │  │              │
│ id (PK)      │  │ id (BIGSERIAL)│  │ id (BIGSERIAL)│
│ building_id  │  │ user_id      │  │ topic        │
│ name         │  │ building_id  │  │ payload      │
│ rate_per_kwh │  │ action       │  │ error_reason │
│ currency     │  │ resource_type│  │ received_at  │
│ effective_from│  │ resource_id  │  └──────────────┘
│ effective_to │  │ details      │
│ created_by   │  │ ip_address   │
└──────────────┘  │ user_agent   │
                  └──────────────┘
```

### 3.2 Relationship Cardinality

| Relationship | Cardinality | Constraint | Cascade |
|---|---|---|---|
| Building → User | 1:N | Optional (user.building_id nullable) | SetNull |
| Building → Floor | 1:N | Required | Cascade |
| Floor → Zone | 1:N | Required | Cascade |
| Zone → Sensor | 1:N | Optional (sensor.zone_id nullable) | SetNull |
| Building → Sensor | 1:N | Required | Cascade |
| Sensor → SensorReading | 1:N | Required | Cascade |
| Sensor → EquipmentSensor | 1:N | Required | Cascade |
| Equipment → EquipmentSensor | 1:N | Required | Cascade |
| Equipment → EquipmentMetric | 1:N | Required | Cascade |
| Building → Equipment | 1:N | Required | Cascade |
| Building → AlertRule | 1:N | Required | Cascade |
| AlertRule → Alert | 1:N | Optional (alert.alert_rule_id nullable) | SetNull |
| Building → Alert | 1:N | Required | Cascade |
| Alert → Notification | 1:N | Optional (notification.alert_id nullable) | SetNull |
| User → Notification | 1:N | Required | Cascade |
| User → RefreshToken | 1:N | Required | Cascade |
| Building → FloorPlan | 1:N | Required | Cascade |
| Floor → FloorPlan | 1:N | Required | Cascade |
| FloorPlan → SensorPlacement | 1:N | Required | Cascade |
| Sensor → SensorPlacement | 1:N | Required | Cascade |
| Building → EnergyTariff | 1:N | Required | Cascade |
| User → AuditLog | 1:N | Optional | SetNull |

---

## 4. Query Optimization Plan

### 4.1 Critical Query Workloads

| Query Pattern | Frequency | Target Latency | Tables |
|---|---|---|---|
| Latest reading per sensor | Every 1s (Socket.IO) | < 5ms | `sensor_readings` |
| Sensor readings for time range | Per dashboard load | < 50ms | `sensor_readings`, continuous aggregates |
| Active alerts by building + severity | Every dashboard load | < 20ms | `alerts` |
| Zone status with latest readings | Every dashboard load | < 50ms | `zones`, `sensors`, `sensor_readings` |
| Equipment list with health | Per dashboard load | < 30ms | `equipment` |
| Notification feed (unread) | Per page load + WebSocket | < 20ms | `notifications` |
| Energy trends (hourly/daily) | Per chart render | < 100ms | `sensor_readings_1hr`, `sensor_readings_1day` |
| Billing projection | Per dashboard load | < 100ms | `sensor_readings`, `energy_tariffs` |
| Audit log by user/resource | On-demand | < 100ms | `audit_logs` |
| Alert rules for evaluation | Per MQTT message (cached) | < 1ms (Redis) | `alert_rules` |

### 4.2 Indexing Strategy

All indexes are defined in the Prisma schema (`@@index`, `@@unique`). Summary:

| Table | Index | Columns | Purpose |
|---|---|---|---|
| `users` | `idx_users_building_role` | `(building_id, role)` | List users by building and role |
| `users` | `idx_users_email` | `(email)` | Login lookup (also covered by UNIQUE) |
| `refresh_tokens` | `idx_refresh_tokens_user` | `(user_id)` | Find active tokens for user |
| `refresh_tokens` | `idx_refresh_tokens_hash` | `(token_hash)` | Validate refresh token |
| `floors` | `idx_floors_building_sort` | `(building_id, sort_order)` | Building floor listing |
| `zones` | `idx_zones_floor` | `(floor_id)` | Floor zone listing |
| `sensors` | `idx_sensors_building_type` | `(building_id, type)` | Dashboard sensor filtering |
| `sensors` | `idx_sensors_building_status` | `(building_id, status)` | Sensor health overview |
| `sensors` | `idx_sensors_mqtt_topic` | `(mqtt_topic)` | MQTT message routing |
| `sensor_readings` | `idx_readings_sensor_time` | `(sensor_id, time DESC)` | Primary time-series query |
| `equipment` | `idx_equipment_building_type_health` | `(building_id, type, health_status)` | Dashboard equipment filters |
| `equipment` | `idx_equipment_building_active` | `(building_id, is_active)` | Active equipment listing |
| `equipment_metrics` | `idx_equip_metrics_equip_time` | `(equipment_id, time DESC)` | Equipment metrics query |
| `alert_rules` | `idx_alert_rules_building_active` | `(building_id, is_active)` | Load rules for evaluation |
| `alert_rules` | `idx_alert_rules_type_active` | `(sensor_type, is_active)` | Match rules by sensor type |
| `alert_rules` | `idx_alert_rules_sensor_active` | `(sensor_id, is_active)` | Match rules by specific sensor |
| `alerts` | `idx_alerts_building_status_severity` | `(building_id, status, severity)` | Active alert dashboard queries |
| `alerts` | `idx_alerts_triggered_at` | `(triggered_at DESC)` | Alert history chronological |
| `alerts` | `idx_alerts_sensor_triggered` | `(sensor_id, triggered_at DESC)` | Sensor alert history |
| `notifications` | `idx_notifications_user_read` | `(user_id, is_read, created_at DESC)` | User notification feed |
| `floor_plans` | `idx_floor_plans_building_floor` | `(building_id, floor_id)` | Floor plan lookup |
| `sensor_placements` | `uq_placement_plan_sensor` | `(floor_plan_id, sensor_id)` UNIQUE | Prevent duplicate placement |
| `energy_tariffs` | `idx_tariffs_building_effective` | `(building_id, effective_from DESC)` | Current tariff lookup |
| `audit_logs` | `idx_audit_user` | `(user_id, created_at DESC)` | User audit trail |
| `audit_logs` | `idx_audit_resource` | `(resource_type, resource_id, created_at DESC)` | Resource audit trail |
| `audit_logs` | `idx_audit_building` | `(building_id, created_at DESC)` | Building-scoped audit |
| `dead_letter_queue` | `idx_dlq_received_at` | `(received_at DESC)` | Recent failures review |

### 4.3 Continuous Aggregate Indexes

Applied via `timescaledb-setup.sql`:

| View | Index | Purpose |
|---|---|---|
| `sensor_readings_1min` | `(sensor_id, bucket DESC)` | 1-min resolution queries |
| `sensor_readings_1hr` | `(sensor_id, bucket DESC)` | Hourly trend charts |
| `sensor_readings_1day` | `(sensor_id, bucket DESC)` | Daily/monthly trend charts |

### 4.4 Caching / Materialization Opportunities

| Data | Cache Layer | TTL | Invalidation |
|---|---|---|---|
| Active alert rules | Redis hash | 60s | On rule create/update/delete |
| Latest sensor reading per sensor | Redis hash | 15s | Overwritten on each MQTT message |
| User session (JWT payload) | In-memory (JWT) | 15 min | Token expiry |
| Building/floor/zone hierarchy | Redis | 5 min | On hierarchy config change |
| Energy tariff (current) | Redis | 10 min | On tariff update |

---

## 5. Data Integrity and Governance

### 5.1 Consistency and Validation Rules

| Rule | Implementation |
|---|---|
| User email uniqueness | UNIQUE constraint on `users.email` |
| MQTT topic uniqueness | UNIQUE constraint on `sensors.mqtt_topic` |
| Sensor placement uniqueness per floor plan | UNIQUE constraint `(floor_plan_id, sensor_id)` |
| Equipment-sensor link uniqueness | Composite PK `(equipment_id, sensor_id)` |
| Sensor reading idempotency | Composite PK `(sensor_id, time)` — `ON CONFLICT DO NOTHING` |
| Valid alert operators | PostgreSQL enum enforced via Prisma |
| Valid user roles | PostgreSQL enum enforced via Prisma |
| Zone comfort thresholds | Application-level validation (Zod); DB stores as decimal |
| Building-scoped data isolation | Middleware injects `building_id` filter; FK constraints ensure referential integrity |
| Tariff date non-overlap | Application-level check on create/update (set `effective_to` on previous tariff) |

### 5.2 Transaction Boundaries

| Operation | Isolation | Approach |
|---|---|---|
| User CRUD | Serializable | Prisma transaction for user + audit log |
| Alert rule CRUD | Read Committed | Prisma transaction + Redis cache invalidation |
| Alert creation + notification fan-out | Read Committed | Prisma transaction: insert alert → insert N notifications |
| Alert acknowledge/resolve | Read Committed | Single update with optimistic concurrency (check current status) |
| Sensor reading batch insert | Read Committed | Bulk `INSERT ... ON CONFLICT DO NOTHING` via `$queryRaw` |
| Equipment-sensor link update | Read Committed | Prisma transaction: delete old links → insert new |
| Sensor placement batch update | Read Committed | Prisma transaction: delete by floor_plan_id → insert all |
| Floor plan upload | Read Committed | Prisma transaction: create record + filesystem write (compensating delete on failure) |

### 5.3 Data Lifecycle

| Data | Retention | Method |
|---|---|---|
| Raw sensor readings | 7 days | TimescaleDB `add_retention_policy` |
| 1-minute aggregates | 90 days | TimescaleDB `add_retention_policy` |
| 1-hour aggregates | 2 years | TimescaleDB `add_retention_policy` |
| Daily aggregates | Indefinite | No retention policy |
| Equipment metrics | 2 years | TimescaleDB `add_retention_policy` |
| Expired refresh tokens | 7 days past expiry | Scheduled cleanup job (`DELETE WHERE expires_at < NOW() - INTERVAL '7 days'`) |
| Dead letter queue | 30 days | Scheduled cleanup job |
| Audit logs | Indefinite | No auto-deletion (regulatory compliance) |
| Alerts (resolved) | Indefinite | No auto-deletion (historical reporting) |
| Notifications (read) | 90 days | Scheduled cleanup job |

### 5.4 Backup and Recovery

| Aspect | Strategy |
|---|---|
| Backup method | `pg_dump` full database backup |
| Backup frequency | Daily at 02:00 UTC |
| Backup retention | 30 days rolling |
| Backup storage | Docker volume on separate disk (MVP); S3 in Phase 2 |
| Recovery RTO | < 1 hour (restore from latest backup) |
| Recovery RPO | 24 hours (daily backup granularity) |
| WAL archiving | Enabled for point-in-time recovery (Phase 2) |
| TimescaleDB-specific | Continuous aggregates rebuild automatically from raw data after restore |

---

## 6. Seed Data

### 6.1 Seed Script Location

`src/database/seed.ts` — executable via `npx prisma db seed`

### 6.2 Seed Data Summary

| Entity | Count | Details |
|---|---|---|
| Building | 1 | "Gedung Utama — Pilot Site" (Jakarta) |
| Users | 3 | One per role: Budi (financial), Rina (sys_admin), Agus (technician) |
| Floors | 3 | Basement (-1), Ground Floor (0), 1st Floor (1) |
| Zones | 6 | Generator Room, Pump Room, Lobby, Reception, Open Office, Conference Room A |
| Sensors | 50 | Distributed across all zones (temp, humidity, CO2, energy, fuel, vibration, runtime, power factor) |
| Equipment | 10 | 2 gensets, 2 pumps, 2 AHUs, 1 chiller, 1 transformer, 2 elevators |
| Equipment-Sensor links | ~11 | Gensets → fuel/vibration/runtime/temp; Pumps → vibration/runtime |
| Alert Rules | 6 | High temp, critical temp, high CO2, low fuel, high vibration, low humidity |
| Energy Tariff | 1 | PLN Standard I-3 @ IDR 1,444.70/kWh |

### 6.3 Default Credentials

| User | Email | Password | Role |
|---|---|---|---|
| Budi Santoso | budi@smartbuilding.id | Password123! | financial_decision_maker |
| Rina Wijaya | rina@smartbuilding.id | Password123! | sys_admin |
| Agus Prasetyo | agus@smartbuilding.id | Password123! | technician |

> **Security Note**: Change all passwords in production. The seed script uses bcrypt with cost factor 12.

---

## 7. Scalability Strategy

### 7.1 Growth Assumptions

| Metric | MVP (Pilot) | Phase 2 | Phase 3 |
|---|---|---|---|
| Buildings | 1–3 | 10–20 | 50+ |
| Sensors per building | ~150–200 | ~500 | ~1000 |
| Total sensors | ~500 | ~5,000 | ~50,000 |
| Messages/second | ~33 | ~333 | ~3,333 |
| Rows/day (sensor_readings) | ~2.9M | ~29M | ~290M |
| DB size (raw, before compression) | ~500 MB/day | ~5 GB/day | ~50 GB/day |
| DB size (compressed) | ~50 MB/day | ~500 MB/day | ~5 GB/day |

### 7.2 Bottleneck Risks

| Risk | Trigger | Mitigation |
|---|---|---|
| Write throughput saturation | > 5K msg/s sustained | Batch inserts (100 rows/batch), connection pooling (20 connections), consider PgBouncer |
| Read query latency on large datasets | > 100M rows in sensor_readings | Already mitigated by 7-day retention + continuous aggregates |
| Single-server PostgreSQL failure | Hardware fault | Phase 2: streaming replication with read replicas |
| Lock contention on hot tables | High concurrent alert creates | Alerts insert is append-only (no UPDATE contention); minimal risk |
| Redis memory pressure | > 10K cached sensor values | Each reading ~200 bytes; 10K = ~2MB — negligible |

### 7.3 Horizontal Scaling Path

| Phase | Strategy |
|---|---|
| MVP | Single PostgreSQL+TimescaleDB instance; connection pool = 20 |
| Phase 2 | Read replica for dashboard queries; PgBouncer for connection pooling |
| Phase 3 | TimescaleDB multi-node (distributed hypertables); partitioning by building_id |

### 7.4 Performance Monitoring Signals

| Signal | Threshold | Action |
|---|---|---|
| Chunk compression ratio | < 10:1 | Investigate data distribution |
| Insert latency p99 | > 50ms | Increase batch size or add connection pool |
| Query latency p95 on aggregates | > 200ms | Add indexes on continuous aggregates |
| Disk usage growth rate | > 2x projection | Check retention policy execution |
| Dead letter queue depth | > 1000/day | Investigate sensor data quality issues |

---

## 8. TimescaleDB Configuration

### 8.1 Hypertable Setup

| Table | Partition Column | Chunk Interval | Space Partitioning |
|---|---|---|---|
| `sensor_readings` | `time` | 1 day | None (single-node MVP) |
| `equipment_metrics` | `time` | 1 day | None |

### 8.2 Continuous Aggregates

| View | Source | Bucket | Refresh Interval | Retention |
|---|---|---|---|---|
| `sensor_readings_1min` | `sensor_readings` | 1 minute | Every 1 min (last 10 min) | 90 days |
| `sensor_readings_1hr` | `sensor_readings` | 1 hour | Every 30 min (last 2 hrs) | 2 years |
| `sensor_readings_1day` | `sensor_readings` | 1 day | Every 1 hr (last 3 days) | Indefinite |

### 8.3 Compression

| Table | Segment By | Order By | Compress After |
|---|---|---|---|
| `sensor_readings` | `sensor_id` | `time DESC` | 2 days |
| `equipment_metrics` | `equipment_id` | `time DESC` | 7 days |

### 8.4 Migration Execution Order

```bash
# 1. Run Prisma migrations (creates base tables)
npx prisma migrate deploy

# 2. Run TimescaleDB setup (hypertables, aggregates, policies)
psql $DATABASE_URL -f src/database/migrations/timescaledb-setup.sql

# 3. Seed development data
npx prisma db seed
```

---

## 9. Collaboration Handoff

### 9.1 Inputs Needed from Coder

| Item | Purpose |
|---|---|
| Prisma Client usage patterns | Validate that the schema supports all query patterns efficiently |
| Batch insert implementation for `sensor_readings` | Use `$queryRaw` with `INSERT ... ON CONFLICT DO NOTHING` for idempotent writes |
| `time_bucket()` query wrappers | Use `$queryRaw` for TimescaleDB-specific aggregate queries |
| Alert evaluation query | Load rules from Redis cache; fall back to `alert_rules` table |
| Cleanup jobs | Implement scheduled jobs for expired tokens, old notifications, DLQ pruning |

### 9.2 Operational Prerequisites for DevOps

| Item | Detail |
|---|---|
| PostgreSQL + TimescaleDB Docker image | Use `timescale/timescaledb:latest-pg15` |
| Database initialization | Run `timescaledb-setup.sql` after Prisma migrate in Docker entrypoint |
| Connection pool sizing | `pool_size = 20` in DATABASE_URL; consider PgBouncer for > 50 connections |
| Backup cron | `pg_dump --format=custom` daily to backup volume |
| Monitoring | Track: active connections, replication lag (Phase 2), chunk count, compression ratio |
| Environment variables | `DATABASE_URL=postgresql://user:pass@host:5432/smartbuilding?schema=public` |

### 9.3 Migration and Rollout Risks

| Risk | Impact | Mitigation |
|---|---|---|
| TimescaleDB extension not available | Hypertables fail to create | Use `timescale/timescaledb` Docker image; verify extension with `SELECT extversion FROM pg_extension WHERE extname='timescaledb'` |
| Large migration on populated DB | Table locks during ALTER | Run during maintenance window; use `CREATE INDEX CONCURRENTLY` for large tables |
| Continuous aggregate refresh lag | Dashboard shows stale trends | Monitor refresh policy execution; manual refresh available via `CALL refresh_continuous_aggregate(...)` |
| Schema drift between Prisma and raw SQL | Inconsistent state | Always run Prisma migrate first, then TimescaleDB SQL; include both in CI |

---

## 10. Handoff

### Inputs Consumed
- `.artifacts/03-sa-system-design.md` — Complete system design including:
  - 18 table definitions with column types and constraints
  - TimescaleDB hypertable, continuous aggregate, retention, and compression SQL
  - Indexing strategy for all critical query patterns
  - RBAC model with 3 roles
  - MQTT topic structure and payload schema
  - API contract with 45+ endpoints

### Outputs Produced
- `.artifacts/05-data-schema.md` (this document)
- `src/database/schema.prisma` — Complete Prisma schema with 18 models, 12 enums, all indexes and relations
- `src/database/migrations/timescaledb-setup.sql` — TimescaleDB hypertable creation, continuous aggregates, retention policies, compression policies
- `src/database/seed.ts` — Development seed script (1 building, 3 users, 3 floors, 6 zones, 50 sensors, 10 equipment, 6 alert rules, 1 energy tariff)

### Open Questions

| # | Question | Blocking? | For Whom |
|---|---|---|---|
| 1 | Should `audit_logs` also be a TimescaleDB hypertable for automatic chunk management at scale? | No — regular table sufficient for MVP volume | Coder/DevOps |
| 2 | Should equipment metrics continuous aggregates be created (similar to sensor_readings)? | No — low volume; raw queries sufficient for MVP | Coder |
| 3 | Is `building_id` on `audit_logs` needed, or is user-scoped auditing sufficient? | No — added for building-scoped admin views | Coder |
| 4 | Confirm alert rule `operator` enum mapping: Prisma uses `gt`, `lt`, etc. mapped to `>`, `<` via `@map`. Coder should use enum values in application code. | No — documented in schema | Coder |
| 5 | Confirm if `automation_rules` table (Phase 2 placeholder from SA design) should be included in Prisma schema now. | No — deferred; not in schema to keep MVP clean | PM |

### Go/No-Go Recommendation

**✅ GO — Proceed to Coder (Stage 6)**

**Rationale**:
1. **Schema is complete and actionable**: 18 Prisma models with all relationships, constraints, indexes, and enums — ready for `prisma migrate dev`.
2. **TimescaleDB setup is fully scripted**: Hypertable creation, 3 continuous aggregates with refresh policies, retention policies (7d/90d/2y), and compression — ready to execute.
3. **Seed data covers all entities**: Development-ready seed script with realistic demo data for 1 building, 50 sensors, 10 equipment with linked sensors.
4. **Query optimization is pre-planned**: 25+ indexes aligned to API contract query patterns; continuous aggregate indexes for time-series dashboards.
5. **Data lifecycle is defined**: Clear retention, backup, and cleanup strategies for all data tiers.
6. **Traceability maintained**: Every entity maps back to SA-defined tables; every index maps to a documented query pattern.

**Conditions for Go**:
- Coder must use `$queryRaw` for all TimescaleDB-specific queries (hypertable inserts with `ON CONFLICT`, `time_bucket()` aggregations)
- DevOps must use `timescale/timescaledb:latest-pg15` Docker image
- Migration execution order must be: Prisma migrate → TimescaleDB SQL → Seed

---

*This document was produced by the Data Agent and is ready for consumption by the Coder (Stage 6). The Prisma schema and TimescaleDB migration are production-ready for MVP scope.*
