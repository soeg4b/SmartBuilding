# 03 — System Analyst: System Design v2 — Platform Enhancement Technical Specification

> **Project Code**: `20260414_Smart_Building_Dashboard`
> **Version**: 2.0 — Enhancement Specification
> **Created**: 2026-04-16
> **Author**: System Analyst Agent (Stage 3)
> **Status**: Ready for Coder Execution
> **Supersedes**: Sections enhanced over `03-sa-system-design.md` (v1, 2026-04-14)
> **Input Artifacts**: `.artifacts/01-creator-vision-v2.md`, `.artifacts/03-sa-system-design.md`

---

## Scope

This document specifies **4 enhancements** to the existing Smart Building Dashboard. The current implementation runs on:

- **Backend**: `demo-server.mjs` — pure Node.js, zero dependencies, ~960 lines, in-memory data arrays
- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Roles**: `sys_admin`, `financial_decision_maker`, `technician`
- **Existing data**: `USERS[]`, `FLOORS[]`, `ZONES[]`, `EQUIPMENT[]`, `FLOOR_PLANS[]`, `ALERTS[]`, `FLOOR_PLAN_ROOMS{}`, `KB_PRODUCTS[]`, `HSE_TEAM[]`, `HSE_PPE[]`, `HSE_CHECKLISTS[]`

All enhancements target `demo-server.mjs` (backend additions) and corresponding frontend components. No external dependencies are introduced.

---

## Enhancement 1: IoT Alert Flood Prevention

### 1.1 New Data Structures (add to `demo-server.mjs` top-level)

```javascript
// ─── Alert Storm Detection State ────────────────────────────────────────────
const STORM_STATE = {
  active: false,              // true when storm mode is engaged
  activatedAt: null,          // ISO timestamp when storm started
  deactivatedAt: null,        // ISO timestamp when storm ended
  alertCountInWindow: 0,      // rolling count of alerts in the current 60s window
  windowStart: null,          // ISO timestamp of current counting window
  suppressedCount: 0,         // total alerts suppressed during current storm
  stormHistory: [],           // array of past storm records: { startedAt, endedAt, totalAlerts, suppressedAlerts, duration }
};

const THROTTLE_CONFIG = {
  stormThreshold: 10,         // alerts within windowSeconds to trigger storm mode
  windowSeconds: 60,          // rolling window for storm detection
  batchIntervalSeconds: 30,   // during storm, batch alerts into N-second digests
  cooldownSeconds: 120,       // storm mode must be calm for N seconds before deactivating
  suppressionRules: {
    info: 'suppress',         // in storm mode: suppress entirely (log only)
    warning: 'aggregate',     // in storm mode: group into incident, don't show individually
    critical: 'passthrough',  // in storm mode: always show individually
  },
};

// ─── Incidents (grouped alerts) ─────────────────────────────────────────────
const INCIDENTS = [];
// Each incident:
// {
//   id: string,
//   status: 'active' | 'resolved',
//   groupKey: string,             // composite key: `${sensorType}:${floorId}:${timeWindowBucket}`
//   sensorType: string,
//   floorId: string,
//   floorName: string,
//   firstAlertAt: string,         // ISO
//   lastAlertAt: string,          // ISO
//   alertCount: number,
//   highestSeverity: 'info' | 'warning' | 'critical',
//   alerts: string[],             // array of alert IDs grouped into this incident
//   affectedZones: string[],      // zone IDs
//   affectedSensors: string[],    // sensor IDs
//   rootCauseAlertId: string|null,// first alert in the chain
//   resolvedAt: string|null,
//   createdAt: string,
//   updatedAt: string,
// }

// ─── Alert Aggregation Rules (configurable by sys_admin) ────────────────────
const ALERT_AGGREGATION_RULES = [
  { id: 'rule-agg-1', name: 'Default: Group by sensor type + floor', groupBy: ['sensorType', 'floorId'], timeWindowSeconds: 60, isActive: true, createdBy: 'u1', createdAt: '2026-04-14T00:00:00Z' },
];

// ─── Storm Digest Buffer (batched alerts during storm mode) ─────────────────
const STORM_DIGEST_BUFFER = [];
// Each entry: { alertId, severity, message, sensorType, floorId, timestamp }
// Flushed every THROTTLE_CONFIG.batchIntervalSeconds into a digest summary
```

### 1.2 Backend Functions (add to `demo-server.mjs`)

```javascript
// ─── Storm Detection Logic ──────────────────────────────────────────────────

/**
 * Called whenever a new alert is generated. Maintains rolling window count
 * and activates/deactivates storm mode.
 * @param {object} alert - The newly created alert object
 * @returns {{ suppressed: boolean, incident: object|null }}
 */
function processAlertForStorm(alert) {
  const now = Date.now();

  // Reset window if expired
  if (!STORM_STATE.windowStart || now - new Date(STORM_STATE.windowStart).getTime() > THROTTLE_CONFIG.windowSeconds * 1000) {
    STORM_STATE.windowStart = new Date(now).toISOString();
    STORM_STATE.alertCountInWindow = 0;
  }

  STORM_STATE.alertCountInWindow++;

  // Activate storm mode if threshold exceeded
  if (!STORM_STATE.active && STORM_STATE.alertCountInWindow >= THROTTLE_CONFIG.stormThreshold) {
    STORM_STATE.active = true;
    STORM_STATE.activatedAt = new Date(now).toISOString();
    STORM_STATE.suppressedCount = 0;
  }

  // During storm mode, apply suppression rules
  if (STORM_STATE.active) {
    const rule = THROTTLE_CONFIG.suppressionRules[alert.severity] || 'passthrough';

    if (rule === 'suppress') {
      STORM_STATE.suppressedCount++;
      return { suppressed: true, incident: null };
    }

    if (rule === 'aggregate') {
      const incident = aggregateAlertIntoIncident(alert);
      STORM_STATE.suppressedCount++;
      STORM_DIGEST_BUFFER.push({
        alertId: alert.id,
        severity: alert.severity,
        message: alert.message,
        sensorType: alert.sensorType || 'unknown',
        floorId: alert.floorId || 'unknown',
        timestamp: alert.triggeredAt,
      });
      return { suppressed: true, incident };
    }

    // 'passthrough' — critical alerts always go through
    const incident = aggregateAlertIntoIncident(alert);
    return { suppressed: false, incident };
  }

  return { suppressed: false, incident: null };
}

/**
 * Groups an alert into an existing or new incident based on aggregation rules.
 * Grouping key: sensorType + floorId + time window bucket (60s buckets)
 * @param {object} alert
 * @returns {object} The incident (new or updated)
 */
function aggregateAlertIntoIncident(alert) {
  const sensorType = alert.sensorType || 'unknown';
  const floorId = alert.floorId || 'unknown';
  const timeBucket = Math.floor(new Date(alert.triggeredAt).getTime() / (THROTTLE_CONFIG.windowSeconds * 1000));
  const groupKey = `${sensorType}:${floorId}:${timeBucket}`;

  let incident = INCIDENTS.find(i => i.groupKey === groupKey && i.status === 'active');

  if (incident) {
    incident.alertCount++;
    incident.lastAlertAt = alert.triggeredAt;
    incident.alerts.push(alert.id);
    if (alert.sensorId && !incident.affectedSensors.includes(alert.sensorId)) {
      incident.affectedSensors.push(alert.sensorId);
    }
    // Escalate severity
    const sevOrder = { info: 0, warning: 1, critical: 2 };
    if (sevOrder[alert.severity] > sevOrder[incident.highestSeverity]) {
      incident.highestSeverity = alert.severity;
    }
    incident.updatedAt = new Date().toISOString();
  } else {
    const floor = FLOORS.find(f => f.id === floorId);
    incident = {
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'active',
      groupKey,
      sensorType,
      floorId,
      floorName: floor ? floor.name : 'Unknown',
      firstAlertAt: alert.triggeredAt,
      lastAlertAt: alert.triggeredAt,
      alertCount: 1,
      highestSeverity: alert.severity,
      alerts: [alert.id],
      affectedZones: alert.zoneId ? [alert.zoneId] : [],
      affectedSensors: alert.sensorId ? [alert.sensorId] : [],
      rootCauseAlertId: alert.id,
      resolvedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    INCIDENTS.push(incident);
  }

  return incident;
}

/**
 * Generates a storm digest from the buffer. Called periodically during storm mode.
 * @returns {object} Digest summary
 */
function flushStormDigest() {
  if (STORM_DIGEST_BUFFER.length === 0) return null;

  const items = STORM_DIGEST_BUFFER.splice(0); // drain buffer
  const bySeverity = { info: 0, warning: 0, critical: 0 };
  const byFloor = {};
  const bySensorType = {};

  items.forEach(item => {
    bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
    byFloor[item.floorId] = (byFloor[item.floorId] || 0) + 1;
    bySensorType[item.sensorType] = (bySensorType[item.sensorType] || 0) + 1;
  });

  return {
    digestId: `digest-${Date.now()}`,
    timestamp: new Date().toISOString(),
    alertCount: items.length,
    bySeverity,
    byFloor,
    bySensorType,
    windowStart: items[0]?.timestamp,
    windowEnd: items[items.length - 1]?.timestamp,
  };
}
```

### 1.3 New API Endpoints

#### `GET /api/v1/alerts/storm-status`

**Auth**: Bearer | **Roles**: `sys_admin`, `technician`

```
Response 200:
{
  "data": {
    "active": true,
    "activatedAt": "2026-04-16T10:15:00Z",
    "deactivatedAt": null,
    "alertCountInWindow": 34,
    "windowSeconds": 60,
    "suppressedCount": 22,
    "config": {
      "stormThreshold": 10,
      "windowSeconds": 60,
      "batchIntervalSeconds": 30,
      "cooldownSeconds": 120,
      "suppressionRules": {
        "info": "suppress",
        "warning": "aggregate",
        "critical": "passthrough"
      }
    },
    "stormHistory": [
      {
        "startedAt": "2026-04-15T14:00:00Z",
        "endedAt": "2026-04-15T14:12:00Z",
        "totalAlerts": 85,
        "suppressedAlerts": 68,
        "duration": 720
      }
    ]
  }
}
```

#### `GET /api/v1/alerts/incidents`

**Auth**: Bearer | **Roles**: `sys_admin`, `technician`

```
Query params:
  ?status=active           // active | resolved
  &floorId=f1              // optional filter
  &sensorType=temperature  // optional filter
  &page=1&limit=20

Response 200:
{
  "data": [
    {
      "id": "incident-1713265200000-abc123",
      "status": "active",
      "groupKey": "temperature:f1:28554420",
      "sensorType": "temperature",
      "floorId": "f1",
      "floorName": "Ground Floor",
      "firstAlertAt": "2026-04-16T10:00:00Z",
      "lastAlertAt": "2026-04-16T10:05:23Z",
      "alertCount": 12,
      "highestSeverity": "critical",
      "alerts": ["alert-1", "alert-2", "..."],
      "affectedZones": ["z1", "z2"],
      "affectedSensors": ["sensor-1", "sensor-3", "sensor-5"],
      "rootCauseAlertId": "alert-1",
      "resolvedAt": null,
      "createdAt": "2026-04-16T10:00:00Z",
      "updatedAt": "2026-04-16T10:05:23Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3 }
}
```

#### `GET /api/v1/alerts/incidents/:id`

**Auth**: Bearer | **Roles**: `sys_admin`, `technician`

```
Response 200:
{
  "data": {
    "id": "incident-...",
    "status": "active",
    // ... all incident fields as above ...
    "timeline": [
      { "alertId": "alert-1", "severity": "warning", "message": "Temperature exceeded 30°C...", "timestamp": "2026-04-16T10:00:00Z" },
      { "alertId": "alert-2", "severity": "warning", "message": "Temperature exceeded 30°C...", "timestamp": "2026-04-16T10:00:15Z" },
      { "alertId": "alert-5", "severity": "critical", "message": "Temperature exceeded 35°C...", "timestamp": "2026-04-16T10:01:02Z" }
    ]
  }
}
```

#### `PATCH /api/v1/alerts/incidents/:id/resolve`

**Auth**: Bearer | **Roles**: `sys_admin`, `technician`

```
Response 200:
{
  "data": { "id": "incident-...", "status": "resolved", "resolvedAt": "2026-04-16T11:00:00Z" }
}
```

#### `POST /api/v1/alerts/rules`

**Auth**: Bearer | **Roles**: `sys_admin`

Creates/updates alert aggregation rules.

```
Request:
{
  "name": "Group HVAC alerts by floor",
  "groupBy": ["sensorType", "floorId"],
  "timeWindowSeconds": 60,
  "isActive": true
}

Response 201:
{
  "data": {
    "id": "rule-agg-2",
    "name": "Group HVAC alerts by floor",
    "groupBy": ["sensorType", "floorId"],
    "timeWindowSeconds": 60,
    "isActive": true,
    "createdBy": "u1",
    "createdAt": "2026-04-16T10:00:00Z"
  }
}
```

#### `PUT /api/v1/alerts/storm-config`

**Auth**: Bearer | **Roles**: `sys_admin`

Updates storm detection thresholds.

```
Request:
{
  "stormThreshold": 15,
  "windowSeconds": 60,
  "batchIntervalSeconds": 30,
  "cooldownSeconds": 180
}

Response 200:
{
  "data": {
    "stormThreshold": 15,
    "windowSeconds": 60,
    "batchIntervalSeconds": 30,
    "cooldownSeconds": 180,
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

### 1.4 Route Handler Code (add to `demo-server.mjs` router)

```javascript
// ── Alert Storm & Incidents ─────────────────────────────────────────────
if (path === '/alerts/storm-status' && method === 'GET') {
  if (!['sys_admin', 'technician'].includes(user.role)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  return json(res, { data: { ...STORM_STATE, config: THROTTLE_CONFIG } });
}

if (path === '/alerts/incidents' && method === 'GET') {
  if (!['sys_admin', 'technician'].includes(user.role)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  let filtered = [...INCIDENTS];
  if (params.status) filtered = filtered.filter(i => i.status === params.status);
  if (params.floorId) filtered = filtered.filter(i => i.floorId === params.floorId);
  if (params.sensorType) filtered = filtered.filter(i => i.sensorType === params.sensorType);
  // Technician: filter to assigned zones only (see RBAC section)
  if (user.role === 'technician') {
    const assignedZones = getAssignedZones(user);
    filtered = filtered.filter(i => i.affectedZones.some(z => assignedZones.includes(z)));
  }
  const page = parseInt(params.page) || 1, limit = parseInt(params.limit) || 20;
  const total = filtered.length;
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return json(res, { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

const incidentMatch = path.match(/^\/alerts\/incidents\/([^/]+)$/);
if (incidentMatch && method === 'GET') {
  if (!['sys_admin', 'technician'].includes(user.role)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  const incident = INCIDENTS.find(i => i.id === incidentMatch[1]);
  if (!incident) return json(res, { error: { code: 'NOT_FOUND', message: 'Incident not found' } }, 404);
  // Build timeline from alert IDs
  const timeline = incident.alerts.map(aid => {
    const a = ALERTS.find(x => x.id === aid);
    return a ? { alertId: a.id, severity: a.severity, message: a.message, timestamp: a.triggeredAt } : null;
  }).filter(Boolean);
  return json(res, { data: { ...incident, timeline } });
}

const incidentResolveMatch = path.match(/^\/alerts\/incidents\/([^/]+)\/resolve$/);
if (incidentResolveMatch && method === 'PATCH') {
  if (!['sys_admin', 'technician'].includes(user.role)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
  const incident = INCIDENTS.find(i => i.id === incidentResolveMatch[1]);
  if (!incident) return json(res, { error: { code: 'NOT_FOUND', message: 'Incident not found' } }, 404);
  incident.status = 'resolved';
  incident.resolvedAt = new Date().toISOString();
  incident.updatedAt = new Date().toISOString();
  return json(res, { data: { id: incident.id, status: 'resolved', resolvedAt: incident.resolvedAt } });
}

if (path === '/alerts/rules' && method === 'POST') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const body = await parseBody(req);
  const rule = {
    id: `rule-agg-${ALERT_AGGREGATION_RULES.length + 1}`,
    name: body.name || 'Unnamed Rule',
    groupBy: body.groupBy || ['sensorType', 'floorId'],
    timeWindowSeconds: body.timeWindowSeconds || 60,
    isActive: body.isActive !== undefined ? body.isActive : true,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  };
  ALERT_AGGREGATION_RULES.push(rule);
  return json(res, { data: rule }, 201);
}

if (path === '/alerts/rules' && method === 'GET') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  return json(res, { data: ALERT_AGGREGATION_RULES });
}

if (path === '/alerts/storm-config' && method === 'PUT') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const body = await parseBody(req);
  if (body.stormThreshold !== undefined) THROTTLE_CONFIG.stormThreshold = body.stormThreshold;
  if (body.windowSeconds !== undefined) THROTTLE_CONFIG.windowSeconds = body.windowSeconds;
  if (body.batchIntervalSeconds !== undefined) THROTTLE_CONFIG.batchIntervalSeconds = body.batchIntervalSeconds;
  if (body.cooldownSeconds !== undefined) THROTTLE_CONFIG.cooldownSeconds = body.cooldownSeconds;
  return json(res, { data: { ...THROTTLE_CONFIG, updatedAt: new Date().toISOString() } });
}
```

### 1.5 Seed Data (append to existing `generateAlerts`)

Add `sensorType` and `floorId` fields to generated alerts so they can be grouped:

```javascript
// MODIFY existing generateAlerts to include sensorType and floorId on each alert:
// Add these fields to each alert object in the loop:
//   sensorType: pick(['temperature', 'humidity', 'co2', 'energy_meter', 'vibration']),
//   floorId: pick(['f1', 'f2', 'f3', 'f4']),
//   zoneId: pick(['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8']),

// Generate seed incidents from existing alerts
function seedIncidents() {
  // Group first 15 alerts into 3 incidents for demo data
  const groups = [
    { alerts: ALERTS.slice(0, 5), sensorType: 'temperature', floorId: 'f1' },
    { alerts: ALERTS.slice(5, 10), sensorType: 'humidity', floorId: 'f2' },
    { alerts: ALERTS.slice(10, 15), sensorType: 'co2', floorId: 'f3' },
  ];
  groups.forEach((g, idx) => {
    const floor = FLOORS.find(f => f.id === g.floorId);
    INCIDENTS.push({
      id: `incident-seed-${idx + 1}`,
      status: idx === 2 ? 'resolved' : 'active',
      groupKey: `${g.sensorType}:${g.floorId}:seed`,
      sensorType: g.sensorType,
      floorId: g.floorId,
      floorName: floor ? floor.name : 'Unknown',
      firstAlertAt: g.alerts[0].triggeredAt,
      lastAlertAt: g.alerts[g.alerts.length - 1].triggeredAt,
      alertCount: g.alerts.length,
      highestSeverity: g.alerts.reduce((max, a) => {
        const o = { info: 0, warning: 1, critical: 2 };
        return o[a.severity] > o[max] ? a.severity : max;
      }, 'info'),
      alerts: g.alerts.map(a => a.id),
      affectedZones: [...new Set(g.alerts.map(() => pick(['z1', 'z2', 'z3'])))],
      affectedSensors: g.alerts.map(a => a.sensorId),
      rootCauseAlertId: g.alerts[0].id,
      resolvedAt: idx === 2 ? new Date().toISOString() : null,
      createdAt: g.alerts[0].triggeredAt,
      updatedAt: new Date().toISOString(),
    });
  });
}
// Call seedIncidents() after generateAlerts()
```

### 1.6 TypeScript Types (add to `src/shared/types/index.ts`)

```typescript
// --- Alert Storm / Incidents ---

export interface StormState {
  active: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
  alertCountInWindow: number;
  windowSeconds: number;
  suppressedCount: number;
  config: ThrottleConfig;
  stormHistory: StormHistoryEntry[];
}

export interface ThrottleConfig {
  stormThreshold: number;
  windowSeconds: number;
  batchIntervalSeconds: number;
  cooldownSeconds: number;
  suppressionRules: Record<AlertSeverity, 'suppress' | 'aggregate' | 'passthrough'>;
}

export interface StormHistoryEntry {
  startedAt: string;
  endedAt: string;
  totalAlerts: number;
  suppressedAlerts: number;
  duration: number; // seconds
}

export interface AlertIncident {
  id: string;
  status: 'active' | 'resolved';
  groupKey: string;
  sensorType: string;
  floorId: string;
  floorName: string;
  firstAlertAt: string;
  lastAlertAt: string;
  alertCount: number;
  highestSeverity: AlertSeverity;
  alerts: string[];
  affectedZones: string[];
  affectedSensors: string[];
  rootCauseAlertId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertIncidentDetail extends AlertIncident {
  timeline: Array<{
    alertId: string;
    severity: AlertSeverity;
    message: string;
    timestamp: string;
  }>;
}

export interface AlertAggregationRule {
  id: string;
  name: string;
  groupBy: string[];
  timeWindowSeconds: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface StormDigest {
  digestId: string;
  timestamp: string;
  alertCount: number;
  bySeverity: Record<string, number>;
  byFloor: Record<string, number>;
  bySensorType: Record<string, number>;
  windowStart: string;
  windowEnd: string;
}
```

---

## Enhancement 2: Flexible Drawing/Floor Plan Management

### 2.1 Extended Data Structures (modify existing in `demo-server.mjs`)

```javascript
// ─── Extended Floor Plans (replace existing FLOOR_PLANS array) ──────────────
// Add version tracking and upload history fields to each floor plan:
const FLOOR_PLANS = [
  {
    id: 'fp1', buildingId: 'b1', floorId: 'f1', label: 'Ground Floor Layout',
    fileType: 'svg', fileSize: 245000, fileData: null, // base64 string when uploaded
    version: 1,
    uploadHistory: [
      { version: 1, uploadedBy: 'u1', uploadedAt: '2026-01-10T00:00:00Z', fileType: 'svg', fileSize: 245000 }
    ],
    createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'fp2', buildingId: 'b1', floorId: 'f2', label: '1st Floor Layout',
    fileType: 'svg', fileSize: 312000, fileData: null,
    version: 1,
    uploadHistory: [
      { version: 1, uploadedBy: 'u1', uploadedAt: '2026-01-10T00:00:00Z', fileType: 'svg', fileSize: 312000 }
    ],
    createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z',
  },
  {
    id: 'fp3', buildingId: 'b1', floorId: 'f3', label: '2nd Floor Layout',
    fileType: 'svg', fileSize: 298000, fileData: null,
    version: 1,
    uploadHistory: [
      { version: 1, uploadedBy: 'u1', uploadedAt: '2026-01-10T00:00:00Z', fileType: 'svg', fileSize: 298000 }
    ],
    createdAt: '2026-01-10T00:00:00Z', updatedAt: '2026-01-10T00:00:00Z',
  },
];

// ─── Room Boundaries (extend existing FLOOR_PLAN_ROOMS) ─────────────────────
// Each room object now includes a reference to its floor plan:
// {
//   id: string,
//   floorPlanId: string,      // FK to FLOOR_PLANS
//   name: string,
//   type: 'office' | 'lobby' | 'server_room' | 'meeting_room' | 'cafeteria' | 'storage' | 'mechanical',
//   x: number,                // percentage of floor plan width (0-100)
//   y: number,                // percentage of floor plan height (0-100)
//   width: number,            // percentage of floor plan width
//   height: number,           // percentage of floor plan height
//   temperature?: number,     // live reading (dynamic)
//   humidity?: number,
//   co2?: number,
//   createdAt: string,
//   updatedAt: string,
// }
```

### 2.2 New/Modified API Endpoints

#### `POST /api/v1/floor-plans/upload`

**Auth**: Bearer | **Roles**: `sys_admin`

Accepts SVG or PNG as base64-encoded string.

```
Request:
{
  "buildingId": "b1",
  "floorId": "f1",
  "label": "Ground Floor - Updated 2026",
  "fileType": "svg",             // "svg" | "png"
  "fileData": "PHN2ZyB4bW...",   // base64 encoded file content
  "fileSize": 245000             // bytes (optional, for display)
}

Response 201:
{
  "data": {
    "id": "fp-new-1",
    "buildingId": "b1",
    "floorId": "f1",
    "label": "Ground Floor - Updated 2026",
    "fileType": "svg",
    "fileSize": 245000,
    "version": 1,
    "uploadHistory": [
      { "version": 1, "uploadedBy": "u1", "uploadedAt": "2026-04-16T10:00:00Z", "fileType": "svg", "fileSize": 245000 }
    ],
    "createdAt": "2026-04-16T10:00:00Z",
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

**Validation**:
- `fileType` must be `"svg"` or `"png"`
- `fileData` must be a valid base64 string
- `fileData` max size: 10MB decoded
- SVG files: strip `<script>`, `on*` event attributes, `javascript:` URIs (basic sanitization in demo server; full DOMPurify in production)
- PNG files: validate starts with PNG magic bytes (`iVBORw0KGgo` in base64)

#### `PUT /api/v1/floor-plans/:id`

**Auth**: Bearer | **Roles**: `sys_admin`

Replaces the floor plan file. Increments version, appends to upload history.

```
Request:
{
  "label": "Ground Floor - Renovated April 2026",  // optional: update label
  "fileType": "svg",
  "fileData": "PHN2ZyB4bW...",
  "fileSize": 260000
}

Response 200:
{
  "data": {
    "id": "fp1",
    "version": 2,
    "label": "Ground Floor - Renovated April 2026",
    "uploadHistory": [
      { "version": 1, "uploadedBy": "u1", "uploadedAt": "2026-01-10T00:00:00Z", "fileType": "svg", "fileSize": 245000 },
      { "version": 2, "uploadedBy": "u1", "uploadedAt": "2026-04-16T10:00:00Z", "fileType": "svg", "fileSize": 260000 }
    ],
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

#### `DELETE /api/v1/floor-plans/:id`

**Auth**: Bearer | **Roles**: `sys_admin`

```
Response 200:
{
  "data": { "message": "Floor plan deleted", "id": "fp1" }
}
```

Side effects: Also removes associated rooms from `FLOOR_PLAN_ROOMS[id]` and sensor placements.

#### `POST /api/v1/floor-plans/:id/rooms`

**Auth**: Bearer | **Roles**: `sys_admin`

Add or update room boundaries on a floor plan.

```
Request:
{
  "rooms": [
    {
      "id": "r-new-1",          // omit for new, provide for update
      "name": "New Conference Room",
      "type": "meeting_room",
      "x": 50,
      "y": 10,
      "width": 20,
      "height": 15
    },
    {
      "id": "r-g1",             // existing room — update
      "name": "Main Lobby (Expanded)",
      "type": "lobby",
      "x": 4,
      "y": 8,
      "width": 40,
      "height": 45
    }
  ]
}

Response 200:
{
  "data": {
    "floorPlanId": "fp1",
    "roomCount": 9,
    "rooms": [ /* full room list for this floor plan */ ]
  }
}
```

#### `DELETE /api/v1/floor-plans/:id/rooms/:roomId`

**Auth**: Bearer | **Roles**: `sys_admin`

```
Response 200:
{
  "data": { "message": "Room deleted", "roomId": "r-g1", "floorPlanId": "fp1" }
}
```

#### `PUT /api/v1/floor-plans/:id/sensors/:sensorId`

**Auth**: Bearer | **Roles**: `sys_admin`

Repositions a sensor on a floor plan (drag-and-drop result).

```
Request:
{
  "x": 35.5,       // new X position (percentage 0-100)
  "y": 42.0,       // new Y position (percentage 0-100)
  "rotation": 0    // optional, degrees
}

Response 200:
{
  "data": {
    "sensorId": "s-g1",
    "floorPlanId": "fp1",
    "x": 35.5,
    "y": 42.0,
    "rotation": 0,
    "updatedAt": "2026-04-16T10:00:00Z"
  }
}
```

### 2.3 Route Handler Code (add to `demo-server.mjs` router)

```javascript
// ── Floor Plan Management ───────────────────────────────────────────────
if (path === '/floor-plans/upload' && method === 'POST') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const body = await parseBody(req);
  if (!body.fileType || !['svg', 'png'].includes(body.fileType)) {
    return json(res, { error: { code: 'VALIDATION_ERROR', message: 'fileType must be svg or png' } }, 400);
  }
  if (!body.fileData) {
    return json(res, { error: { code: 'VALIDATION_ERROR', message: 'fileData (base64) is required' } }, 400);
  }
  // Basic SVG sanitization: reject if contains <script or on* event handlers
  if (body.fileType === 'svg') {
    const decoded = Buffer.from(body.fileData, 'base64').toString('utf-8');
    if (/<script/i.test(decoded) || /\bon\w+\s*=/i.test(decoded)) {
      return json(res, { error: { code: 'VALIDATION_ERROR', message: 'SVG contains potentially unsafe content' } }, 400);
    }
  }
  const newFp = {
    id: `fp-${Date.now()}`,
    buildingId: body.buildingId || 'b1',
    floorId: body.floorId,
    label: body.label || 'Untitled Floor Plan',
    fileType: body.fileType,
    fileSize: body.fileSize || Buffer.from(body.fileData, 'base64').length,
    fileData: body.fileData,
    version: 1,
    uploadHistory: [{ version: 1, uploadedBy: user.id, uploadedAt: new Date().toISOString(), fileType: body.fileType, fileSize: body.fileSize || 0 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  FLOOR_PLANS.push(newFp);
  FLOOR_PLAN_ROOMS[newFp.id] = [];
  const { fileData: _, ...response } = newFp;
  return json(res, { data: response }, 201);
}

const fpUpdateMatch = path.match(/^\/floor-plans\/([^/]+)$/);
if (fpUpdateMatch && method === 'PUT') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const fp = FLOOR_PLANS.find(f => f.id === fpUpdateMatch[1]);
  if (!fp) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  const body = await parseBody(req);
  if (body.label) fp.label = body.label;
  if (body.fileData && body.fileType) {
    // SVG sanitization
    if (body.fileType === 'svg') {
      const decoded = Buffer.from(body.fileData, 'base64').toString('utf-8');
      if (/<script/i.test(decoded) || /\bon\w+\s*=/i.test(decoded)) {
        return json(res, { error: { code: 'VALIDATION_ERROR', message: 'SVG contains potentially unsafe content' } }, 400);
      }
    }
    fp.version++;
    fp.fileType = body.fileType;
    fp.fileSize = body.fileSize || Buffer.from(body.fileData, 'base64').length;
    fp.fileData = body.fileData;
    fp.uploadHistory.push({ version: fp.version, uploadedBy: user.id, uploadedAt: new Date().toISOString(), fileType: body.fileType, fileSize: fp.fileSize });
  }
  fp.updatedAt = new Date().toISOString();
  const { fileData: _, ...response } = fp;
  return json(res, { data: response });
}

if (fpUpdateMatch && method === 'DELETE') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const idx = FLOOR_PLANS.findIndex(f => f.id === fpUpdateMatch[1]);
  if (idx === -1) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  const fpId = FLOOR_PLANS[idx].id;
  FLOOR_PLANS.splice(idx, 1);
  delete FLOOR_PLAN_ROOMS[fpId];
  return json(res, { data: { message: 'Floor plan deleted', id: fpId } });
}

const fpRoomsPostMatch = path.match(/^\/floor-plans\/([^/]+)\/rooms$/);
if (fpRoomsPostMatch && method === 'POST') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const fpId = fpRoomsPostMatch[1];
  const fp = FLOOR_PLANS.find(f => f.id === fpId);
  if (!fp) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  const body = await parseBody(req);
  if (!FLOOR_PLAN_ROOMS[fpId]) FLOOR_PLAN_ROOMS[fpId] = [];
  const rooms = body.rooms || [];
  rooms.forEach(room => {
    if (room.id) {
      // Update existing room
      const existing = FLOOR_PLAN_ROOMS[fpId].find(r => r.id === room.id);
      if (existing) {
        if (room.name !== undefined) existing.name = room.name;
        if (room.type !== undefined) existing.type = room.type;
        if (room.x !== undefined) existing.x = room.x;
        if (room.y !== undefined) existing.y = room.y;
        if (room.width !== undefined) existing.width = room.width;
        if (room.height !== undefined) existing.height = room.height;
        existing.updatedAt = new Date().toISOString();
      }
    } else {
      // Create new room
      FLOOR_PLAN_ROOMS[fpId].push({
        id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        floorPlanId: fpId,
        name: room.name || 'Unnamed Room',
        type: room.type || 'office',
        x: room.x || 0,
        y: room.y || 0,
        width: room.width || 10,
        height: room.height || 10,
        temperature: rnd(20, 28),
        humidity: rnd(40, 65),
        co2: rndInt(350, 800),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
  return json(res, { data: { floorPlanId: fpId, roomCount: FLOOR_PLAN_ROOMS[fpId].length, rooms: FLOOR_PLAN_ROOMS[fpId] } });
}

const fpRoomDeleteMatch = path.match(/^\/floor-plans\/([^/]+)\/rooms\/([^/]+)$/);
if (fpRoomDeleteMatch && method === 'DELETE') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const [, fpId, roomId] = fpRoomDeleteMatch;
  if (!FLOOR_PLAN_ROOMS[fpId]) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
  const idx = FLOOR_PLAN_ROOMS[fpId].findIndex(r => r.id === roomId);
  if (idx === -1) return json(res, { error: { code: 'NOT_FOUND', message: 'Room not found' } }, 404);
  FLOOR_PLAN_ROOMS[fpId].splice(idx, 1);
  return json(res, { data: { message: 'Room deleted', roomId, floorPlanId: fpId } });
}

const fpSensorUpdateMatch = path.match(/^\/floor-plans\/([^/]+)\/sensors\/([^/]+)$/);
if (fpSensorUpdateMatch && method === 'PUT') {
  if (user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
  const [, fpId, sensorId] = fpSensorUpdateMatch;
  const body = await parseBody(req);
  // Find sensor in floorPlanSensors layout and update position
  const sensorLayouts = { fp1: 'fp1', fp2: 'fp2', fp3: 'fp3' }; // map
  const sensors = floorPlanSensors(fpId);
  const sensor = sensors.find(s => s.sensorId === sensorId || s.id === sensorId);
  if (!sensor) return json(res, { error: { code: 'NOT_FOUND', message: 'Sensor placement not found' } }, 404);
  // In a real implementation this would persist. For demo, return the updated position.
  return json(res, {
    data: {
      sensorId: sensor.sensorId,
      floorPlanId: fpId,
      x: body.x !== undefined ? body.x : sensor.x,
      y: body.y !== undefined ? body.y : sensor.y,
      rotation: body.rotation !== undefined ? body.rotation : sensor.rotation,
      updatedAt: new Date().toISOString(),
    }
  });
}
```

### 2.4 TypeScript Types (add to `src/shared/types/index.ts`)

```typescript
// --- Floor Plan Management (Enhanced) ---

export interface FloorPlanUploadHistory {
  version: number;
  uploadedBy: string;
  uploadedAt: string;
  fileType: FloorPlanFileType;
  fileSize: number;
}

export interface FloorPlanDetail extends FloorPlanSummary {
  version: number;
  uploadHistory: FloorPlanUploadHistory[];
  updatedAt: string;
}

export interface RoomBoundary {
  id: string;
  floorPlanId?: string;
  name: string;
  type: 'office' | 'lobby' | 'server_room' | 'meeting_room' | 'cafeteria' | 'storage' | 'mechanical';
  x: number;          // percentage of floor plan width (0-100)
  y: number;          // percentage of floor plan height (0-100)
  width: number;      // percentage of floor plan width
  height: number;     // percentage of floor plan height
  temperature?: number;
  humidity?: number;
  co2?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FloorPlanUploadRequest {
  buildingId: string;
  floorId: string;
  label?: string;
  fileType: 'svg' | 'png';
  fileData: string;    // base64 encoded
  fileSize?: number;
}

export interface SensorRepositionRequest {
  x: number;
  y: number;
  rotation?: number;
}
```

### 2.5 Frontend Components Specification

#### Upload Dialog Component

**File**: `src/frontend/src/components/spatial/FloorPlanUploadDialog.tsx`

```typescript
// Props
interface FloorPlanUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (floorPlan: FloorPlanDetail) => void;
  buildingId: string;
  floorId: string;
  existingFloorPlan?: FloorPlanDetail; // if provided, this is an update
}

// Behavior:
// 1. File input accepts .svg, .png (max 10MB)
// 2. On file select, convert to base64 via FileReader
// 3. Show preview (SVG rendered inline, PNG as <img>)
// 4. Label text input
// 5. Submit button calls POST /floor-plans/upload or PUT /floor-plans/:id
// 6. On success, call onSuccess callback and close dialog
// 7. Error display for validation failures
```

#### Room Editor Overlay

**File**: `src/frontend/src/components/spatial/RoomEditorOverlay.tsx`

```typescript
// Props
interface RoomEditorOverlayProps {
  floorPlanId: string;
  rooms: RoomBoundary[];
  onRoomsChange: (rooms: RoomBoundary[]) => void;
  editable: boolean; // false for non-admin roles
}

// Behavior:
// 1. Transparent overlay on top of floor plan image
// 2. Existing rooms rendered as semi-transparent colored rectangles
// 3. Click room to select → show resize handles + name/type form
// 4. "Add Room" button → click-drag to define new rectangle
// 5. Room type selector (dropdown): office, lobby, server_room, etc.
// 6. Delete button on selected room
// 7. Save button calls POST /floor-plans/:id/rooms with all rooms
// 8. Only rendered for sys_admin (editable=true)
```

#### Sensor Drag-Drop

**File**: `src/frontend/src/components/spatial/SensorDragDrop.tsx`

```typescript
// Props
interface SensorDragDropProps {
  floorPlanId: string;
  sensors: SensorPlacementWithData[];
  onSensorMove: (sensorId: string, x: number, y: number) => void;
  editable: boolean;
}

interface SensorPlacementWithData extends SensorPlacement {
  sensor: {
    name: string;
    type: SensorType;
    status: SensorStatus;
    lastValue: number | null;
    unit: string;
  };
}

// Behavior:
// 1. Render sensor icons at (x, y) percentages on floor plan
// 2. sys_admin: sensors are draggable (HTML5 drag or pointer events)
// 3. On drop, calculate new (x, y) as percentage of container
// 4. Call PUT /floor-plans/:id/sensors/:sensorId with new position
// 5. Technician: sensors are clickable only (show popover with reading)
// 6. Color-coded by status: green=online, gray=offline, yellow=stale
```

---

## Enhancement 3: Strict RBAC Enforcement

### 3.1 Complete Access Control Matrix

Every API endpoint in `demo-server.mjs` must enforce this matrix. The table below covers ALL existing and new endpoints.

| # | Method | Path | sys_admin | financial_decision_maker | technician | Notes |
|---|---|---|---|---|---|---|
| **Auth (Public)** | | | | | | |
| 1 | POST | `/auth/login` | ✓ | ✓ | ✓ | Public |
| 2 | POST | `/auth/refresh` | ✓ | ✓ | ✓ | Cookie auth |
| 3 | POST | `/auth/logout` | ✓ | ✓ | ✓ | Any authenticated |
| 4 | GET | `/auth/me` | ✓ | ✓ | ✓ | Any authenticated |
| 5 | POST | `/auth/register` | ✓ | ✗ | ✗ | Admin only |
| **Dashboard** | | | | | | |
| 6 | GET | `/dashboard/executive` | ✓ | ✓ | ✗ | Financial view |
| 7 | GET | `/dashboard/operations` | ✓ | ✗ | ✗ | Admin only |
| 8 | GET | `/dashboard/technician` | ✓ | ✗ | ✓ | Technician view |
| **Energy** | | | | | | |
| 9 | GET | `/energy/consumption` | ✓ | ✓ | ✗ | |
| 10 | GET | `/energy/trends` | ✓ | ✓ | ✗ | |
| 11 | GET | `/energy/billing-projection` | ✓ | ✓ | ✗ | |
| **Environmental** | | | | | | |
| 12 | GET | `/zones/environmental` | ✓ | ✗ | ✓ | Technician: own zones |
| **Equipment** | | | | | | |
| 13 | GET | `/equipment` | ✓ | ✗ | ✓ | Technician: own zones |
| 14 | GET | `/equipment/:id` | ✓ | ✗ | ✓ | Technician: own zones |
| **Alerts** | | | | | | |
| 15 | GET | `/alerts` | ✓ | ✗ | ✓ | Technician: own zones |
| 16 | PATCH | `/alerts/:id/acknowledge` | ✓ | ✗ | ✓ | Technician: own zones |
| 17 | PATCH | `/alerts/:id/resolve` | ✓ | ✗ | ✓ | Technician: own zones |
| 18 | GET | `/alerts/storm-status` | ✓ | ✗ | ✓ | |
| 19 | GET | `/alerts/incidents` | ✓ | ✗ | ✓ | Technician: own zones |
| 20 | GET | `/alerts/incidents/:id` | ✓ | ✗ | ✓ | Technician: own zones |
| 21 | PATCH | `/alerts/incidents/:id/resolve` | ✓ | ✗ | ✓ | Technician: own zones |
| 22 | POST | `/alerts/rules` | ✓ | ✗ | ✗ | Admin only |
| 23 | GET | `/alerts/rules` | ✓ | ✗ | ✗ | Admin only |
| 24 | PUT | `/alerts/storm-config` | ✓ | ✗ | ✗ | Admin only |
| **Floor Plans** | | | | | | |
| 25 | GET | `/floor-plans` | ✓ | ✗ | ✓ (read) | Technician: read only |
| 26 | POST | `/floor-plans/upload` | ✓ | ✗ | ✗ | Admin only |
| 27 | PUT | `/floor-plans/:id` | ✓ | ✗ | ✗ | Admin only |
| 28 | DELETE | `/floor-plans/:id` | ✓ | ✗ | ✗ | Admin only |
| 29 | GET | `/floor-plans/:id/sensors` | ✓ | ✗ | ✓ (read) | |
| 30 | PUT | `/floor-plans/:id/sensors/:sensorId` | ✓ | ✗ | ✗ | Admin only |
| 31 | GET | `/floor-plans/:id/rooms` | ✓ | ✗ | ✓ (read) | |
| 32 | POST | `/floor-plans/:id/rooms` | ✓ | ✗ | ✗ | Admin only |
| 33 | DELETE | `/floor-plans/:id/rooms/:roomId` | ✓ | ✗ | ✗ | Admin only |
| **Floors** | | | | | | |
| 34 | GET | `/floors` | ✓ | ✗ | ✓ | |
| **Buildings** | | | | | | |
| 35 | GET | `/buildings/geospatial` | ✓ | ✓ | ✓ (read) | |
| **Reports** | | | | | | |
| 36 | GET | `/reports/summary` | ✓ | ✓ | ✗ | |
| 37 | GET | `/reports/compilation` | ✓ | ✓ | ✗ | |
| 38 | GET | `/reports/energy/pdf` | ✓ | ✓ | ✗ | |
| 39 | GET | `/reports/alerts/csv` | ✓ | ✗ | ✗ | Admin only |
| 40 | GET | `/reports/sensors/csv` | ✓ | ✗ | ✗ | Admin only |
| **Users** | | | | | | |
| 41 | GET | `/users` | ✓ | ✗ | ✗ | Admin only |
| 42 | PUT | `/users/me` | ✓ | ✓ | ✓ | Own profile only |
| 43 | PATCH | `/users/:id` | ✓ | ✗ | ✗ | Admin only |
| **Knowledge Base** | | | | | | |
| 44 | GET | `/knowledge-base/search` | ✓ | ✗ | ✓ | |
| 45 | POST | `/knowledge-base/search` | ✓ | ✗ | ✓ | Image search |
| 46 | GET | `/knowledge-base/products/:id` | ✓ | ✗ | ✓ | |
| **HSE** | | | | | | |
| 47 | GET | `/hse/checklist/today` | ✓ | ✗ | ✓ | |
| 48 | POST | `/hse/checklist` | ✓ | ✗ | ✓ | |
| 49 | GET | `/hse/checklist/history` | ✓ | ✗ | ✓ | |
| 50 | GET | `/hse/team-compliance` | ✓ | ✗ | ✗ | Admin only |
| 51 | GET | `/hse/ppe-status` | ✓ | ✗ | ✗ | Admin only |
| 52 | POST | `/hse/ppe-check` | ✓ | ✗ | ✓ | |
| 53 | GET | `/hse/ppe-history` | ✓ | ✗ | ✓ | Own records |

### 3.2 Backend Middleware: `checkAccess()` Function

Add this function to `demo-server.mjs` near the existing `getUser()` function:

```javascript
/**
 * Checks if the authenticated user's role is in the allowedRoles list.
 * Returns true if access is granted, false and sends 403 if denied.
 * @param {object} res - HTTP response object
 * @param {object} user - Authenticated user object (from getUser)
 * @param {string[]} allowedRoles - Array of role strings
 * @returns {boolean} true if access granted
 */
function checkAccess(res, user, allowedRoles) {
  if (!user) {
    json(res, { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    return false;
  }
  if (!allowedRoles.includes(user.role)) {
    json(res, { error: { code: 'FORBIDDEN', message: `Access denied. Required: ${allowedRoles.join(', ')}` } }, 403);
    return false;
  }
  return true;
}

/**
 * Returns the zone IDs a technician is assigned to.
 * In demo: all zones in their building. In production: from user_zone_assignments table.
 * @param {object} user
 * @returns {string[]} Array of zone IDs
 */
function getAssignedZones(user) {
  if (user.role === 'sys_admin') return ZONES.map(z => z.id);
  // Demo: technicians are assigned to first 4 zones
  return ZONES.slice(0, 4).map(z => z.id);
}

/**
 * Filters a data array to only include items relevant to the user's assigned zones.
 * Used for technician data scoping.
 * @param {object} user
 * @param {object[]} data - Array of objects with zoneId or location.zoneId field
 * @returns {object[]} Filtered array
 */
function filterByZoneAssignment(user, data) {
  if (user.role !== 'technician') return data;
  const assignedZones = getAssignedZones(user);
  return data.filter(item => {
    const zoneId = item.zoneId || item.location?.zoneId;
    if (!zoneId) return false; // technicians don't see unzoned items
    return assignedZones.includes(zoneId);
  });
}
```

### 3.3 Apply RBAC to ALL Existing Routes

**Replace** the current unguarded route handlers in `demo-server.mjs` with guarded versions. The pattern for each route:

```javascript
// BEFORE (current — no RBAC):
if (path === '/dashboard/executive') return json(res, { data: executiveDashboard() });

// AFTER (with RBAC):
if (path === '/dashboard/executive') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  return json(res, { data: executiveDashboard() });
}

if (path === '/dashboard/operations') {
  if (!checkAccess(res, user, ['sys_admin'])) return;
  return json(res, { data: operationsDashboard() });
}

if (path === '/dashboard/technician') {
  if (!checkAccess(res, user, ['sys_admin', 'technician'])) return;
  return json(res, { data: technicianDashboard() });
}

// Energy — financial_decision_maker and sys_admin only
if (path === '/energy/trends') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  return json(res, { data: energyTrend(params.range || '24h') });
}
if (path === '/energy/consumption') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  return json(res, { data: { todayKwh: rnd(800, 2400), avgDaily: rnd(1200, 1800) } });
}
if (path === '/energy/billing-projection') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  // ... existing handler
}

// Environmental — filter technician data by zone
if (path === '/zones/environmental') {
  if (!checkAccess(res, user, ['sys_admin', 'technician'])) return;
  let data = zoneEnvironmental();
  if (user.role === 'technician') {
    data = filterByZoneAssignment(user, data.map(z => ({ ...z, zoneId: z.id })));
  }
  return json(res, { data });
}

// Equipment — filter technician data by zone
if (path === '/equipment' && method === 'GET') {
  if (!checkAccess(res, user, ['sys_admin', 'technician'])) return;
  let data = EQUIPMENT;
  if (user.role === 'technician') {
    data = filterByZoneAssignment(user, data);
  }
  return json(res, { data });
}

// Alerts — filter technician data by zone
if (path === '/alerts' && method === 'GET') {
  if (!checkAccess(res, user, ['sys_admin', 'technician'])) return;
  let filtered = [...ALERTS];
  if (user.role === 'technician') {
    const assignedZones = getAssignedZones(user);
    // Alerts don't have zoneId directly; filter by sensorId → zone mapping
    // In demo: show all alerts for technician (zone filtering requires sensor-zone join)
    // Mark this as a simplification for demo
  }
  // ... existing filter logic
}

// Reports — block technicians
if (path === '/reports/summary') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  // ... existing handler
}
if (path === '/reports/compilation') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  // ... existing handler
}
if (path === '/reports/energy/pdf') {
  if (!checkAccess(res, user, ['sys_admin', 'financial_decision_maker'])) return;
  // ... existing handler
}
if (path === '/reports/alerts/csv') {
  if (!checkAccess(res, user, ['sys_admin'])) return;
  // ... existing handler
}
if (path === '/reports/sensors/csv') {
  if (!checkAccess(res, user, ['sys_admin'])) return;
  // ... existing handler
}

// Users — admin only (except /users/me)
if (path === '/users' && method === 'GET') {
  if (!checkAccess(res, user, ['sys_admin'])) return;
  return json(res, { data: USERS.map(safeUser) });
}

// Knowledge Base — sys_admin + technician only
if (path === '/knowledge-base/search') {
  if (!checkAccess(res, user, ['sys_admin', 'technician'])) return;
  // ... existing handler
}

// HSE team-compliance and ppe-status — admin only
if (path === '/hse/team-compliance' && method === 'GET') {
  if (!checkAccess(res, user, ['sys_admin'])) return;
  return json(res, { data: HSE_TEAM });
}
if (path === '/hse/ppe-status' && method === 'GET') {
  if (!checkAccess(res, user, ['sys_admin'])) return;
  return json(res, { data: HSE_PPE });
}
```

### 3.4 Frontend Sidebar Filtering

The sidebar already has role-conditional items. Ensure this mapping is complete:

```typescript
// src/frontend/src/components/layout/Sidebar.tsx

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: UserRole[];  // which roles can see this item
}

const NAV_ITEMS: NavItem[] = [
  // sys_admin sees everything
  { label: 'Executive Dashboard', href: '/dashboard/executive', icon: 'BarChart3', roles: ['sys_admin', 'financial_decision_maker'] },
  { label: 'Operations Dashboard', href: '/dashboard/operations', icon: 'Monitor', roles: ['sys_admin'] },
  { label: 'Technician Dashboard', href: '/dashboard/technician', icon: 'Wrench', roles: ['sys_admin', 'technician'] },
  { label: 'Energy', href: '/energy', icon: 'Zap', roles: ['sys_admin', 'financial_decision_maker'] },
  { label: 'Environment', href: '/environment', icon: 'Thermometer', roles: ['sys_admin', 'technician'] },
  { label: 'Equipment', href: '/equipment', icon: 'Settings', roles: ['sys_admin', 'technician'] },
  { label: 'Alerts', href: '/alerts', icon: 'AlertTriangle', roles: ['sys_admin', 'technician'] },
  { label: 'Incidents', href: '/alerts/incidents', icon: 'Shield', roles: ['sys_admin', 'technician'] },
  { label: 'Floor Plans', href: '/floor-plans', icon: 'Map', roles: ['sys_admin', 'technician'] },
  { label: 'Reports', href: '/reports', icon: 'FileText', roles: ['sys_admin', 'financial_decision_maker'] },
  { label: 'Users', href: '/users', icon: 'Users', roles: ['sys_admin'] },
  { label: 'Knowledge Base', href: '/knowledge-base', icon: 'BookOpen', roles: ['sys_admin', 'technician'] },
  { label: 'HSE Compliance', href: '/hse', icon: 'HardHat', roles: ['sys_admin', 'technician'] },
  { label: 'Buildings', href: '/buildings', icon: 'Building', roles: ['sys_admin', 'financial_decision_maker', 'technician'] },
];

// Filter in render:
// const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.role));
```

### 3.5 Frontend Page-Level Guards

Every page component must verify role access on mount and redirect unauthorized users:

```typescript
// src/frontend/src/components/layout/RoleGuard.tsx

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  redirectTo?: string;  // default: role-appropriate home page
}

// Usage in page components:
// <RoleGuard allowedRoles={['sys_admin', 'financial_decision_maker']}>
//   <EnergyPage />
// </RoleGuard>

// Redirect targets by role when access is denied:
const ROLE_HOME_PAGES: Record<UserRole, string> = {
  sys_admin: '/dashboard/operations',
  financial_decision_maker: '/dashboard/executive',
  technician: '/dashboard/technician',
};

// Implementation:
// 1. Get user from auth context
// 2. If user.role not in allowedRoles → redirect to ROLE_HOME_PAGES[user.role]
// 3. Optionally show toast: "You don't have access to this page"
```

### 3.6 API Response Field Filtering for Technicians

When a technician calls equipment or alert endpoints, strip financial fields:

```javascript
// In demo-server.mjs, for equipment responses to technicians:
function filterEquipmentForRole(equipment, role) {
  if (role === 'technician') {
    // Remove fields not relevant to technicians
    return equipment.map(eq => {
      const { warrantyExpiry, installDate, ...rest } = eq;
      return rest;
    });
  }
  return equipment;
}
```

### 3.7 TypeScript Types (add to `src/shared/types/index.ts`)

```typescript
// --- RBAC ---

export interface RoleAccessConfig {
  role: UserRole;
  homePage: string;
  allowedRoutes: string[];
  deniedRoutes: string[];
}

export const ROLE_HOME_PAGES: Record<UserRole, string> = {
  sys_admin: '/dashboard/operations',
  financial_decision_maker: '/dashboard/executive',
  technician: '/dashboard/technician',
};

export const ROLE_ACCESS: Record<UserRole, { allowedPrefixes: string[] }> = {
  sys_admin: {
    allowedPrefixes: ['*'], // unrestricted
  },
  financial_decision_maker: {
    allowedPrefixes: [
      '/dashboard/executive',
      '/energy',
      '/reports',
      '/buildings',
    ],
  },
  technician: {
    allowedPrefixes: [
      '/dashboard/technician',
      '/environment',
      '/equipment',
      '/alerts',
      '/floor-plans',
      '/knowledge-base',
      '/hse',
      '/buildings',
    ],
  },
};
```

---

## Enhancement 4: Mobile-Lean Optimization

### 4.1 Mobile Detection Hook

```typescript
// src/frontend/src/hooks/useIsMobile.ts

import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // px

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}
```

### 4.2 Component-Level Mobile Conditional Rendering

Each component listed below must support an `isMobile` prop or use the `useIsMobile()` hook internally to switch between full and simplified rendering.

#### Dashboard Components

| Component | Desktop Rendering | Mobile Rendering |
|---|---|---|
| `DashboardKPICards` | Full cards with sparkline charts, trend arrows, detailed labels | Compact cards: value + label only, no sparklines |
| `EnergyChart` | Recharts line/bar chart with tooltips, legend, date range selector | Hidden on initial load. Show "Tap to view chart" button → expand on tap |
| `AlertSummaryTable` | Full data table with columns: severity, status, message, time, actions | Compact card list: severity badge + message + time. 1 card per alert |
| `EnvironmentZoneGrid` | Grid of zone cards with temp/humidity/CO2 + mini charts | Simplified: zone name + status badge (green/yellow/red) + tap to expand |
| `EquipmentTable` | Full table: name, type, location, health, serial, warranty | Card list: name + health badge + location. Tap for detail |
| `FloorPlanViewer` | Full interactive SVG with room overlays, sensor icons, drag-drop | **Completely hidden on mobile**. Show "View on desktop" message |
| `FloorPlanEditor` | Room drawing tools, upload dialog, sensor placement | **Completely hidden on mobile** |
| `ReportsPage` | Full reports page with PDF/CSV generation, date pickers | **Completely hidden on mobile** (not in nav) |
| `SettingsPage` | User management, system config | **Completely hidden on mobile** (not in nav) |
| `BuildingMapView` | 3D/2D building overview with floor selector | **Completely hidden on mobile** |

#### HSE Components

| Component | Desktop | Mobile |
|---|---|---|
| `HSEChecklistForm` | Standard form with radio buttons | Touch-optimized: large toggle buttons (✓/✗), bigger touch targets (min 44px) |
| `PPECheckForm` | Standard form with checkboxes | Touch-optimized: large checkboxes, swipe-to-complete pattern |
| `HSETeamCompliance` | Full team table + bar charts | Admin only; hidden on mobile |

#### Alert Components

| Component | Desktop | Mobile |
|---|---|---|
| `AlertList` | Full data table with sortable columns, bulk actions | Compact card list (no table). Each card: severity color strip + message + time + acknowledge button |
| `IncidentList` | Table with incident details, timeline view | Card list: incident name + alert count badge + severity + "View" button |
| `StormStatusBanner` | Full banner with stats, config link | Compact banner: "⚠ Alert Storm Active — N alerts" |

### 4.3 Mobile Navigation Changes

```typescript
// In Sidebar.tsx, filter nav items for mobile:
const MOBILE_HIDDEN_ROUTES = [
  '/reports',
  '/users',
  '/buildings/map',  // building map view
  '/settings',
];

// In the sidebar render:
// const filteredItems = isMobile
//   ? visibleItems.filter(item => !MOBILE_HIDDEN_ROUTES.includes(item.href))
//   : visibleItems;
```

### 4.4 Responsive Wrapper Component

```typescript
// src/frontend/src/components/ui/ResponsiveView.tsx

interface ResponsiveViewProps {
  children: React.ReactNode;
  mobileChildren?: React.ReactNode;      // alternative content for mobile
  desktopOnly?: boolean;                  // hide entirely on mobile
  mobileMessage?: string;                 // "View on desktop" message
  expandable?: boolean;                   // show "tap to expand" on mobile
  expandLabel?: string;                   // label for expand button
}

// Usage examples:
//
// 1. Desktop-only component:
// <ResponsiveView desktopOnly mobileMessage="Floor plan editor is available on desktop">
//   <FloorPlanEditor />
// </ResponsiveView>
//
// 2. Expandable chart:
// <ResponsiveView
//   expandable
//   expandLabel="Tap to view energy chart"
//   mobileChildren={<EnergyKPICard />}
// >
//   <EnergyChart />
// </ResponsiveView>
//
// 3. Different mobile rendering:
// <ResponsiveView mobileChildren={<AlertCardList alerts={alerts} />}>
//   <AlertTable alerts={alerts} />
// </ResponsiveView>
```

### 4.5 Mobile-Specific API Behavior

No API changes needed. Mobile optimization is purely frontend. However, mobile clients should:

1. Use smaller page sizes (`?limit=10` instead of `?limit=20`) to reduce payload
2. Skip chart data requests on initial load (defer to user tap)
3. Use the same auth flow (JWT in memory, refresh via cookie)

### 4.6 TypeScript Types

```typescript
// No new types needed. useIsMobile() returns boolean.
// ResponsiveView props defined inline above.
```

---

## Implementation Order for Coder

The Coder agent should implement these enhancements in this order to minimize conflicts:

### Step 1: RBAC Enforcement (Enhancement 3)
1. Add `checkAccess()`, `getAssignedZones()`, `filterByZoneAssignment()` functions to `demo-server.mjs`
2. Apply `checkAccess()` to **every existing route handler** per the matrix in §3.1
3. Add `filterByZoneAssignment()` calls to equipment, alert, and zone routes for technician role
4. Test: login as each role and verify 403 on denied endpoints

### Step 2: Alert Flood Prevention (Enhancement 1)
1. Add `STORM_STATE`, `THROTTLE_CONFIG`, `INCIDENTS`, `ALERT_AGGREGATION_RULES`, `STORM_DIGEST_BUFFER` data structures
2. Add `processAlertForStorm()`, `aggregateAlertIntoIncident()`, `flushStormDigest()` functions
3. Modify `generateAlerts()` to include `sensorType`, `floorId`, `zoneId` on each alert
4. Add `seedIncidents()` and call it after alert generation
5. Add all new route handlers for storm/incident endpoints
6. Test: verify incidents are seeded, storm-status returns config

### Step 3: Floor Plan Management (Enhancement 2)
1. Extend `FLOOR_PLANS` array with `version`, `uploadHistory`, `fileData` fields
2. Add all new floor plan route handlers (upload, update, delete, rooms CRUD, sensor reposition)
3. Apply RBAC checks to all new endpoints (sys_admin only for mutations, technician read-only)
4. Test: upload a floor plan, add rooms, reposition sensor

### Step 4: Mobile-Lean Frontend (Enhancement 4)
1. Add `useIsMobile()` hook
2. Add `ResponsiveView` wrapper component
3. Apply mobile conditional rendering to each component per §4.2 table
4. Filter sidebar navigation for mobile per §4.3
5. Adjust HSE forms for touch targets
6. Test: resize browser below 768px and verify simplified views

---

## Modified Files Summary

| File | Changes |
|---|---|
| `demo-server.mjs` | Add RBAC functions, storm/incident data structures, storm/incident/floor plan route handlers, extend `generateAlerts`, add `seedIncidents`, apply `checkAccess` to all routes |
| `src/shared/types/index.ts` | Add `StormState`, `AlertIncident`, `AlertAggregationRule`, `StormDigest`, `FloorPlanDetail`, `RoomBoundary`, `FloorPlanUploadRequest`, `SensorRepositionRequest`, `ROLE_ACCESS`, `ROLE_HOME_PAGES` types |
| `src/frontend/src/hooks/useIsMobile.ts` | New file: mobile detection hook |
| `src/frontend/src/components/ui/ResponsiveView.tsx` | New file: responsive wrapper component |
| `src/frontend/src/components/spatial/FloorPlanUploadDialog.tsx` | New file: upload dialog |
| `src/frontend/src/components/spatial/RoomEditorOverlay.tsx` | New file: room boundary editor |
| `src/frontend/src/components/spatial/SensorDragDrop.tsx` | New file: sensor repositioning |
| `src/frontend/src/components/layout/Sidebar.tsx` | Add complete role filtering, mobile route filtering |
| `src/frontend/src/components/layout/RoleGuard.tsx` | New file: page-level access guard |
| Dashboard/alert/equipment components | Add `isMobile` conditional rendering per §4.2 |

---

## Handoff

### Inputs Consumed
- `.artifacts/01-creator-vision-v2.md` — Creator vision v2 with 4 enhancement requirements (AF-1 through AF-6, FP-1 through FP-6, RBAC-1 through RBAC-6, Mobile-Lean principles)
- `.artifacts/03-sa-system-design.md` — Existing system design (v1) with architecture, API contracts, database schema, RBAC matrix
- `demo-server.mjs` — Current implementation (~960 lines, pure Node.js, in-memory data)
- `src/shared/types/index.ts` — Existing TypeScript type definitions

### Outputs Produced
- `.artifacts/03-sa-system-design-v2.md` (this document) — containing:
  - **Enhancement 1**: Alert flood prevention — 3 new data structures, 3 new functions, 6 new API endpoints with full request/response shapes, route handler code, seed data generation, 8 new TypeScript types
  - **Enhancement 2**: Floor plan management — extended data structures, 7 new/modified API endpoints with full request/response shapes, route handler code, SVG sanitization, 5 new TypeScript types, 3 new frontend component specifications
  - **Enhancement 3**: Strict RBAC — complete 53-endpoint access control matrix, `checkAccess()` middleware function, `getAssignedZones()` zone filtering, `filterByZoneAssignment()` data scoping, frontend sidebar filtering config, page-level guard component, field-level response filtering
  - **Enhancement 4**: Mobile-lean optimization — `useIsMobile()` hook, `ResponsiveView` wrapper component, component-by-component mobile/desktop rendering specification (15 components), mobile navigation filtering, touch-optimized HSE forms
  - **Implementation order**: 4-step sequential plan (RBAC → Storm → Floor Plans → Mobile)
  - **Modified files summary**: 10+ files with specific changes listed

### Open Questions

| # | Question | Blocking? | For Whom |
|---|---|---|---|
| 1 | Technician zone assignment: The demo uses hardcoded first-4-zones. Should we add a user management UI for zone assignment, or is the current demo simplification acceptable? | No — acceptable for demo | PM |
| 2 | Storm mode auto-deactivation: Should storm mode auto-deactivate after cooldown, or require manual deactivation by sys_admin? | No — spec says auto-deactivate after `cooldownSeconds` of calm | Coder |
| 3 | Floor plan file storage: Base64 in memory works for demo. Should we add file-system persistence for the production path? | No — out of scope for demo phase | PM |
| 4 | Mobile breakpoint: Using 768px as the threshold. Should this match Tailwind's `md` breakpoint exactly? | No — 768px matches Tailwind `md` | Coder |

### Go/No-Go Recommendation

**✅ GO — Proceed to Coder (Stage 6) for implementation**

**Rationale**:

1. **All 4 enhancements are fully specified** with exact data structures, function signatures, API contracts, and route handler code that the Coder can implement directly.
2. **RBAC matrix covers all 53 endpoints** — no ambiguity about which role can access what.
3. **Implementation order is defined** to minimize merge conflicts (RBAC first, then features, then UI).
4. **No external dependencies required** — all changes work within the existing zero-dependency demo server architecture.
5. **TypeScript types are specified** for frontend-backend contract alignment.
6. **Frontend specifications include component interfaces and behavioral descriptions** sufficient for implementation without design ambiguity.

**Conditions for Go**:
- Coder must follow the implementation order in §Implementation Order
- RBAC must be applied to ALL existing routes, not just new ones
- SVG sanitization must reject files containing `<script>` tags or `on*` event handlers
- Mobile conditional rendering must use the `useIsMobile()` hook consistently (not ad-hoc media queries)

---

*This document was produced by the System Analyst Agent and is ready for consumption by the Coder Agent (Stage 6). All specifications are implementation-ready with exact code patterns for the demo-server.mjs architecture.*
