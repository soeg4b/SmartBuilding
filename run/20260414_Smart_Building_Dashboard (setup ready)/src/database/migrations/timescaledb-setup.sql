-- ============================================================================
-- TimescaleDB Setup Migration
-- Smart Building Dashboard
-- Run AFTER Prisma migrations have created base tables
-- ============================================================================

-- 1. Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================================================
-- 2. Convert sensor_readings to hypertable
-- ============================================================================
-- NOTE: Prisma creates sensor_readings as a regular table. This converts it
-- to a TimescaleDB hypertable partitioned by time with 1-day chunks.
-- The composite PK (sensor_id, time) is already set by Prisma.

SELECT create_hypertable(
  'sensor_readings',
  'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================================================
-- 3. Convert equipment_metrics to hypertable
-- ============================================================================

SELECT create_hypertable(
  'equipment_metrics',
  'time',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================================================
-- 4. Continuous Aggregates
-- ============================================================================

-- 4a. 1-minute aggregate for sensor_readings
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_1min
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 minute', time) AS bucket,
  sensor_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- 4b. 1-hour aggregate for sensor_readings
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_1hr
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  sensor_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- 4c. 1-day aggregate for sensor_readings
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_1day
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS bucket,
  sensor_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS sample_count
FROM sensor_readings
GROUP BY bucket, sensor_id
WITH NO DATA;

-- ============================================================================
-- 5. Continuous Aggregate Refresh Policies
-- ============================================================================

-- Refresh 1-min aggregate: covers the last 10 minutes, runs every 1 minute
SELECT add_continuous_aggregate_policy('sensor_readings_1min',
  start_offset    => INTERVAL '10 minutes',
  end_offset      => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists   => TRUE
);

-- Refresh 1-hr aggregate: covers the last 2 hours, runs every 30 minutes
SELECT add_continuous_aggregate_policy('sensor_readings_1hr',
  start_offset    => INTERVAL '2 hours',
  end_offset      => INTERVAL '30 minutes',
  schedule_interval => INTERVAL '30 minutes',
  if_not_exists   => TRUE
);

-- Refresh 1-day aggregate: covers the last 3 days, runs every 1 hour
SELECT add_continuous_aggregate_policy('sensor_readings_1day',
  start_offset    => INTERVAL '3 days',
  end_offset      => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists   => TRUE
);

-- ============================================================================
-- 6. Data Retention Policies
-- ============================================================================

-- Raw readings: keep 7 days
SELECT add_retention_policy('sensor_readings', INTERVAL '7 days', if_not_exists => TRUE);

-- 1-minute aggregates: keep 90 days
SELECT add_retention_policy('sensor_readings_1min', INTERVAL '90 days', if_not_exists => TRUE);

-- 1-hour aggregates: keep 2 years
SELECT add_retention_policy('sensor_readings_1hr', INTERVAL '2 years', if_not_exists => TRUE);

-- Daily aggregates: no retention (kept indefinitely)

-- Equipment metrics: keep 2 years raw
SELECT add_retention_policy('equipment_metrics', INTERVAL '2 years', if_not_exists => TRUE);

-- ============================================================================
-- 7. Compression Policies
-- ============================================================================

-- Compress sensor_readings chunks older than 2 days
ALTER TABLE sensor_readings SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'sensor_id',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('sensor_readings', INTERVAL '2 days', if_not_exists => TRUE);

-- Compress equipment_metrics chunks older than 7 days
ALTER TABLE equipment_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'equipment_id',
  timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('equipment_metrics', INTERVAL '7 days', if_not_exists => TRUE);

-- ============================================================================
-- 8. Additional Index for Idempotent Writes
-- ============================================================================
-- Used for ON CONFLICT (sensor_id, time) DO NOTHING on duplicate MQTT messages
-- The composite PK already serves this purpose, but this ensures the upsert pattern works.

-- NOTE: The unique constraint on (sensor_id, time) is already handled by the
-- Prisma @@id([sensorId, time]) definition. No additional unique index needed.

-- ============================================================================
-- 9. Indexes on Continuous Aggregates (for query performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_readings_1min_sensor_bucket
  ON sensor_readings_1min (sensor_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_readings_1hr_sensor_bucket
  ON sensor_readings_1hr (sensor_id, bucket DESC);

CREATE INDEX IF NOT EXISTS idx_readings_1day_sensor_bucket
  ON sensor_readings_1day (sensor_id, bucket DESC);
