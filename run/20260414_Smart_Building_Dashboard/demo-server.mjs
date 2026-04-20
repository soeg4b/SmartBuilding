// =============================================================================
// Smart Building Dashboard — Standalone Demo Server
// No PostgreSQL, Redis, or MQTT required. Pure Node.js built-in modules only.
// Run: node demo-server.mjs
// =============================================================================

import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

function resolveDigitalTwinSource() {
  const candidates = [
    nodePath.resolve(__dirname, '../../Drawing4.dwg'),
    nodePath.resolve(__dirname, '../../Drawing4.pdf'),
    nodePath.resolve(__dirname, '../Drawing4.dwg'),
    nodePath.resolve(__dirname, '../Drawing4.pdf'),
    nodePath.resolve(__dirname, './Drawing4.dwg'),
    nodePath.resolve(__dirname, './Drawing4.pdf'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const DT_CACHE_DIR = nodePath.resolve(__dirname, '.digital-twin-cache');
let libreDwgInstance = null;

async function getLibreDwg() {
  if (libreDwgInstance) return libreDwgInstance;
  const wasmDir = nodePath.resolve(__dirname, 'node_modules/@mlightcad/libredwg-web/wasm/');
  const { LibreDwg } = await import('@mlightcad/libredwg-web');
  const normalizedWasmDir = wasmDir.endsWith(nodePath.sep) ? wasmDir : wasmDir + nodePath.sep;
  libreDwgInstance = await LibreDwg.create(normalizedWasmDir);
  return libreDwgInstance;
}

async function convertDwgFileToSvg(dwgPath) {
  const lib = await getLibreDwg();
  const { Dwg_File_Type } = await import('@mlightcad/libredwg-web');
  const buf = fs.readFileSync(dwgPath);
  const dwgPtr = lib.dwg_read_data(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), Dwg_File_Type.DWG);
  if (dwgPtr == null) throw new Error('Failed to parse DWG');
  try {
    const db = lib.convert(dwgPtr);
    const svg = lib.dwg_to_svg(db);
    if (typeof db === 'number') lib.dwg_free(db);
    return svg;
  } finally {
    try { lib.dwg_free(dwgPtr); } catch {}
  }
}

async function getDigitalTwinSvg() {
  const sourcePath = resolveDigitalTwinSource();
  if (!sourcePath) { const e = new Error('Drawing4 source not found'); e.code = 'DIGITAL_TWIN_SOURCE_NOT_FOUND'; throw e; }
  const ext = nodePath.extname(sourcePath).toLowerCase();

  // Manual SVG override has highest priority
  const manualSvg = sourcePath.replace(/\.(dwg|pdf)$/i, '.svg');
  if (fs.existsSync(manualSvg)) return fs.readFileSync(manualSvg, 'utf8');

  if (!fs.existsSync(DT_CACHE_DIR)) fs.mkdirSync(DT_CACHE_DIR, { recursive: true });
  const cachedSvg = nodePath.join(DT_CACHE_DIR, 'Drawing4.svg');
  const sourceStat = fs.statSync(sourcePath);
  if (fs.existsSync(cachedSvg) && fs.statSync(cachedSvg).mtimeMs >= sourceStat.mtimeMs) {
    return fs.readFileSync(cachedSvg, 'utf8');
  }

  if (ext !== '.dwg') {
    const e = new Error('Inline rendering currently supports only DWG sources. Place Drawing4.svg next to the source file as an override.');
    e.code = 'UNSUPPORTED_SOURCE_FORMAT';
    throw e;
  }

  let svg = await convertDwgFileToSvg(sourcePath);
  svg = svg.replace(/<svg([^>]*)>/, (_m, attrs) => {
    let next = attrs;
    if (!/preserveAspectRatio=/.test(next)) next += ' preserveAspectRatio="xMidYMid meet"';
    next = next.replace(/\swidth="[^"]*"/, '').replace(/\sheight="[^"]*"/, '');
    return '<svg' + next + ' width="100%" height="100%">';
  });
  fs.writeFileSync(cachedSvg, svg, 'utf8');
  return svg;
}

const PORT = 5000;
const JWT_SECRET = 'demo-secret-key-not-for-production';

// =============================================================================
// Utilities
// =============================================================================
function rnd(min, max) { return Math.round((Math.random() * (max - min) + min) * 100) / 100; }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// =============================================================================
// Mock Data
// =============================================================================
const USERS = [
  // Platform / Operator side
  { id: 'u1', email: 'admin@integra.com', name: 'System Administrator', role: 'sys_admin', password: 'admin123', isActive: true, buildingId: 'b1', lastLoginAt: new Date().toISOString(), createdAt: '2026-01-01T00:00:00Z', mfaEnabled: true, biometricEnrolled: true },
  { id: 'u2', email: 'cfo@integra.com', name: 'CFO Executive', role: 'financial_decision_maker', password: 'cfo123', isActive: true, buildingId: 'b1', lastLoginAt: new Date().toISOString(), createdAt: '2026-01-15T00:00:00Z', mfaEnabled: true, biometricEnrolled: false },
  { id: 'u3', email: 'tech@integra.com', name: 'Technician Mike', role: 'technician', password: 'tech123', isActive: true, buildingId: 'b1', lastLoginAt: null, createdAt: '2026-02-01T00:00:00Z', mfaEnabled: false, biometricEnrolled: true },
  { id: 'u4', email: 'manager@integra.com', name: 'Building Manager Sari', role: 'building_manager', password: 'manager123', isActive: true, buildingId: 'b1', lastLoginAt: new Date().toISOString(), createdAt: '2026-02-05T00:00:00Z', mfaEnabled: true, biometricEnrolled: true },
  { id: 'u5', email: 'security@integra.com', name: 'Security Officer Joko', role: 'security_officer', password: 'security123', isActive: true, buildingId: 'b1', lastLoginAt: null, createdAt: '2026-02-10T00:00:00Z', mfaEnabled: true, biometricEnrolled: true },
  // Tenant / Guest side
  { id: 'u6', email: 'tenant@integra.com', name: 'Tenant Rina (Acme Corp)', role: 'tenant', password: 'tenant123', isActive: true, buildingId: 'b1', tenantCompany: 'Acme Corp', floorId: 'f3', lastLoginAt: null, createdAt: '2026-03-01T00:00:00Z', mfaEnabled: false, biometricEnrolled: true },
  { id: 'u7', email: 'guest@integra.com', name: 'Hotel Guest Budi', role: 'guest', password: 'guest123', isActive: true, buildingId: 'b1', roomNumber: '1208', checkIn: '2026-04-19', checkOut: '2026-04-22', lastLoginAt: null, createdAt: '2026-04-19T00:00:00Z', mfaEnabled: false, biometricEnrolled: false },
];

const BUILDINGS = [
  {
    id: 'b1',
    name: 'Type 1 - Data Center Tower',
    type: 'type1',
    vertical: 'data_center',
    address: 'Kawasan Industri Cikarang, Bekasi',
  },
  {
    id: 'b2',
    name: 'Type 2 - Office Complex',
    type: 'type2',
    vertical: 'office',
    address: 'Jl. Sudirman No. 100, Jakarta',
  },
  {
    id: 'b3',
    name: 'Type 3 - Hospitality Hotel & Residence',
    type: 'type3',
    vertical: 'hospitality',
    address: 'Nusa Dua, Bali',
  },
];

const FLOORS = [
  { id: 'f1', buildingId: 'b1', name: 'Ground Floor', level: 0, sortOrder: 0 },
  { id: 'f2', buildingId: 'b1', name: '1st Floor', level: 1, sortOrder: 1 },
];

const ZONES = [
  { id: 'z1', name: 'Lobby', floorId: 'f1', floorName: 'Ground Floor' },
  { id: 'z2', name: 'Server Room', floorId: 'f1', floorName: 'Ground Floor' },
  { id: 'z3', name: 'Open Office A', floorId: 'f2', floorName: '1st Floor' },
  { id: 'z4', name: 'Meeting Room 1', floorId: 'f2', floorName: '1st Floor' },
  { id: 'z5', name: 'Open Office B', floorId: 'f3', floorName: '2nd Floor' },
  { id: 'z6', name: 'Executive Suite', floorId: 'f3', floorName: '2nd Floor' },
  { id: 'z7', name: 'Lab Area', floorId: 'f4', floorName: '3rd Floor' },
  { id: 'z8', name: 'Cafeteria', floorId: 'f4', floorName: '3rd Floor' },
];

const EQUIPMENT = [
  { id: 'eq1', name: 'HVAC Unit #1', type: 'hvac', serialNumber: 'HV-2024-001', healthStatus: 'green', isActive: true, installDate: '2024-03-15', warrantyExpiry: '2027-03-15', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f2', floorName: '1st Floor', zoneId: 'z3', zoneName: 'Open Office A' } },
  { id: 'eq2', name: 'HVAC Unit #2', type: 'hvac', serialNumber: 'HV-2024-002', healthStatus: 'green', isActive: true, installDate: '2024-03-15', warrantyExpiry: '2027-03-15', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f3', floorName: '2nd Floor', zoneId: 'z5', zoneName: 'Open Office B' } },
  { id: 'eq3', name: 'HVAC Unit #3', type: 'hvac', serialNumber: 'HV-2024-003', healthStatus: 'yellow', isActive: true, installDate: '2024-06-20', warrantyExpiry: '2027-06-20', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f4', floorName: '3rd Floor', zoneId: 'z7', zoneName: 'Lab Area' } },
  { id: 'eq4', name: 'Chiller System', type: 'chiller', serialNumber: 'CH-2023-001', healthStatus: 'green', isActive: true, installDate: '2023-11-01', warrantyExpiry: '2028-11-01', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f1', floorName: 'Ground Floor', zoneId: 'z2', zoneName: 'Server Room' } },
  { id: 'eq5', name: 'UPS Backup', type: 'electrical', serialNumber: 'UPS-2024-001', healthStatus: 'red', isActive: true, installDate: '2024-01-10', warrantyExpiry: '2029-01-10', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f1', floorName: 'Ground Floor', zoneId: 'z2', zoneName: 'Server Room' } },
  { id: 'eq6', name: 'Elevator #1', type: 'elevator', serialNumber: 'EL-2022-001', healthStatus: 'green', isActive: true, installDate: '2022-08-15', warrantyExpiry: '2032-08-15', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f1', floorName: 'Ground Floor', zoneId: 'z1', zoneName: 'Lobby' } },
  { id: 'eq7', name: 'Fire Suppression', type: 'safety', serialNumber: 'FS-2023-001', healthStatus: 'green', isActive: true, installDate: '2023-05-01', warrantyExpiry: '2033-05-01', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f1', floorName: 'Ground Floor', zoneId: 'z1', zoneName: 'Lobby' } },
  { id: 'eq8', name: 'Backup Generator', type: 'electrical', serialNumber: 'GEN-2024-001', healthStatus: 'yellow', isActive: true, installDate: '2024-02-28', warrantyExpiry: '2034-02-28', location: { buildingId: 'b1', buildingName: 'HQ Tower', floorId: 'f5', floorName: '4th Floor (Roof)', zoneId: null, zoneName: null } },
];

const FLOOR_PLANS = [
  { id: 'fp1', buildingId: 'b1', floorId: 'f1', label: 'Ground Floor Layout', fileType: 'svg', fileSize: 245000, createdAt: '2026-01-10T00:00:00Z', versions: [{ version: 1, uploadedAt: '2026-01-10T00:00:00Z', uploadedBy: 'u1', changeNote: 'Initial upload' }] },
  { id: 'fp2', buildingId: 'b1', floorId: 'f2', label: '1st Floor Layout', fileType: 'svg', fileSize: 312000, createdAt: '2026-01-10T00:00:00Z', versions: [{ version: 1, uploadedAt: '2026-01-10T00:00:00Z', uploadedBy: 'u1', changeNote: 'Initial upload' }] },
  { id: 'fp3', buildingId: 'b1', floorId: 'f3', label: '2nd Floor Layout', fileType: 'svg', fileSize: 298000, createdAt: '2026-01-10T00:00:00Z', versions: [{ version: 1, uploadedAt: '2026-01-10T00:00:00Z', uploadedBy: 'u1', changeNote: 'Initial upload' }] },
];

// =============================================================================
// IoT Devices placed on the Digital Twin (CAD overlay)
// =============================================================================
const IOT_DEVICE_TYPES = {
  temperature: { unit: '°C',  min: 18,  max: 32,   warn: 28,   crit: 30 },
  humidity:    { unit: '%',   min: 30,  max: 80,   warn: 70,   crit: 75 },
  co2:         { unit: 'ppm', min: 400, max: 1500, warn: 1000, crit: 1200 },
  power:       { unit: 'kW',  min: 0.1, max: 12,   warn: 9,    crit: 11 },
  light:       { unit: 'lux', min: 100, max: 800 },
  water:       { unit: 'L/m', min: 0,   max: 20,   warn: 15,   crit: 18 },
  motion:      { unit: '',    binary: true },
  door:        { unit: '',    binary: true },
  smoke:       { unit: '',    binary: true, criticalOn: true },
  camera:      { unit: '' },
};

const IOT_DEVICES_FILE = nodePath.resolve(DT_CACHE_DIR, 'iot-devices.json');

function seedIotDevices() {
  const floorSeeds = {
    f1: [
      { type: 'temperature', label: 'Lobby Temp',         zoneId: 'z1', x: 22, y: 65 },
      { type: 'humidity',    label: 'Lobby RH',           zoneId: 'z1', x: 26, y: 70 },
      { type: 'motion',      label: 'Lobby PIR',          zoneId: 'z1', x: 18, y: 60 },
      { type: 'camera',      label: 'Lobby Camera 1',     zoneId: 'z1', x: 30, y: 55 },
      { type: 'temperature', label: 'Server Rack Temp',   zoneId: 'z2', x: 70, y: 30 },
      { type: 'humidity',    label: 'Server Room RH',     zoneId: 'z2', x: 75, y: 32 },
      { type: 'smoke',       label: 'Server Smoke Det.',  zoneId: 'z2', x: 72, y: 28 },
      { type: 'power',       label: 'UPS Load',           zoneId: 'z2', x: 80, y: 35 },
    ],
    f2: [
      { type: 'temperature', label: 'Office-A Temp',      zoneId: 'z3', x: 30, y: 40 },
      { type: 'co2',         label: 'Office-A CO2',       zoneId: 'z3', x: 35, y: 45 },
      { type: 'motion',      label: 'Office-A PIR',       zoneId: 'z3', x: 32, y: 50 },
      { type: 'light',       label: 'Office-A Lux',       zoneId: 'z3', x: 38, y: 42 },
      { type: 'temperature', label: 'Meeting-1 Temp',     zoneId: 'z4', x: 60, y: 55 },
      { type: 'co2',         label: 'Meeting-1 CO2',      zoneId: 'z4', x: 64, y: 58 },
      { type: 'door',        label: 'Meeting-1 Door',     zoneId: 'z4', x: 58, y: 50 },
    ],
  };
  const seed = [];
  let n = 0;
  for (const [floorId, list] of Object.entries(floorSeeds)) {
    const floor = FLOORS.find(f => f.id === floorId);
    for (const d of list) {
      const zone = ZONES.find(z => z.id === d.zoneId);
      n += 1;
      seed.push({
        id: `iot-${floorId}-${n}`,
        label: d.label,
        type: d.type,
        floorId,
        floorName: floor ? floor.name : floorId,
        zoneId: d.zoneId,
        zoneName: zone ? zone.name : null,
        x: d.x,
        y: d.y,
        addedBy: 'system',
        addedAt: '2026-04-19T00:00:00Z',
      });
    }
  }
  return seed;
}

let IOT_DEVICES = [];
function loadIotDevices() {
  try {
    if (fs.existsSync(IOT_DEVICES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(IOT_DEVICES_FILE, 'utf8'));
      IOT_DEVICES = Array.isArray(parsed) ? parsed : seedIotDevices();
    } else {
      IOT_DEVICES = seedIotDevices();
      saveIotDevices();
    }
  } catch {
    IOT_DEVICES = seedIotDevices();
  }
}
function saveIotDevices() {
  try {
    if (!fs.existsSync(DT_CACHE_DIR)) fs.mkdirSync(DT_CACHE_DIR, { recursive: true });
    fs.writeFileSync(IOT_DEVICES_FILE, JSON.stringify(IOT_DEVICES, null, 2));
  } catch {}
}
function liveIotReading(device) {
  const meta = IOT_DEVICE_TYPES[device.type] || {};
  if (meta.binary) {
    const probability = device.type === 'smoke' ? 0.02 : (device.type === 'door' ? 0.3 : 0.5);
    const on = Math.random() < probability;
    return {
      value: on ? 1 : 0,
      unit: '',
      status: meta.criticalOn && on ? 'critical' : 'normal',
    };
  }
  if (device.type === 'camera') {
    return { value: 1, unit: '', status: 'normal' };
  }
  const v = rnd(meta.min ?? 0, meta.max ?? 100);
  let status = 'normal';
  if (meta.crit != null && v >= meta.crit) status = 'critical';
  else if (meta.warn != null && v >= meta.warn) status = 'warning';
  return { value: Number(v.toFixed(1)), unit: meta.unit || '', status };
}
function deviceWithLive(device) {
  return { ...device, ...liveIotReading(device), lastUpdated: new Date().toISOString() };
}
loadIotDevices();

function generateAlerts(count) {
  const severities = ['critical', 'warning', 'info'];
  const statuses = ['active', 'acknowledged', 'resolved'];
  const messages = [
    'Temperature exceeds threshold in Server Room',
    'CO2 levels elevated in Open Office A',
    'Humidity below normal in Executive Suite',
    'Power consumption spike detected on 2nd Floor',
    'HVAC unit #3 vibration anomaly',
    'Water leak sensor triggered in Lab Area',
    'UPS battery degradation warning',
    'Network switch overheating in Server Room',
    'Air quality index poor in Cafeteria',
    'Elevator motor current draw elevated',
    'Fire suppression system pressure low',
    'Generator fuel level below 30%',
  ];
  const result = [];
  for (let i = 0; i < count; i++) {
    const severity = pick(severities);
    const status = pick(statuses);
    const triggeredAt = new Date(Date.now() - rndInt(0, 7 * 86400000)).toISOString();
    result.push({
      id: `alert-${i + 1}`, severity, status, message: pick(messages),
      sensorValue: rnd(0, 100), thresholdValue: rnd(50, 90), operator: pick(['>', '<', '>=', '<=']),
      triggeredAt,
      acknowledgedAt: status !== 'active' ? new Date(new Date(triggeredAt).getTime() + rndInt(60000, 3600000)).toISOString() : null,
      resolvedAt: status === 'resolved' ? new Date(new Date(triggeredAt).getTime() + rndInt(3600000, 86400000)).toISOString() : null,
      buildingId: 'b1', sensorId: `sensor-${rndInt(1, 48)}`,
      sensorType: pick(['temperature', 'humidity', 'co2', 'energy_meter', 'vibration']),
      floorId: pick(['f1', 'f2', 'f3', 'f4']),
      zoneId: pick(['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z8']),
    });
  }
  return result;
}
const ALERTS = generateAlerts(50);

// =============================================================================
// Alert Storm State & Incidents
// =============================================================================
const STORM_STATE = {
  active: false, activatedAt: null, deactivatedAt: null, alertCountInWindow: 0, windowStart: null, suppressedCount: 0,
  stormHistory: [
    { startedAt: '2026-04-15T14:00:00Z', endedAt: '2026-04-15T14:12:00Z', totalAlerts: 85, suppressedAlerts: 68, duration: 720 },
    { startedAt: '2026-04-14T09:30:00Z', endedAt: '2026-04-14T09:45:00Z', totalAlerts: 42, suppressedAlerts: 30, duration: 900 },
  ]
};
const THROTTLE_CONFIG = { stormThreshold: 10, windowSeconds: 60, batchIntervalSeconds: 30, cooldownSeconds: 120, suppressionRules: { info: 'suppress', warning: 'aggregate', critical: 'passthrough' } };
const INCIDENTS = [];
const ALERT_AGGREGATION_RULES = [
  { id: 'rule-1', name: 'Group by sensor type + floor', groupBy: ['sensorType', 'floorId'], timeWindowSeconds: 60, isActive: true, createdBy: 'u1', createdAt: '2026-04-14T00:00:00Z' },
];
const STORM_DIGEST_BUFFER = [];

// Seed incidents from existing alerts
function seedIncidents() {
  const tempF1 = ALERTS.filter(a => a.sensorType === 'temperature' && a.floorId === 'f1').slice(0, 5);
  const humF2 = ALERTS.filter(a => a.sensorType === 'humidity' && a.floorId === 'f2').slice(0, 5);
  const co2F3 = ALERTS.filter(a => a.sensorType === 'co2' && a.floorId === 'f3').slice(0, 5);

  const groups = [
    { sensorType: 'temperature', floorId: 'f1', floorName: 'Ground Floor', alerts: tempF1, status: 'active' },
    { sensorType: 'humidity', floorId: 'f2', floorName: '1st Floor', alerts: humF2, status: 'active' },
    { sensorType: 'co2', floorId: 'f3', floorName: '2nd Floor', alerts: co2F3, status: 'resolved' },
  ];

  groups.forEach((g, idx) => {
    if (g.alerts.length === 0) return;
    const sorted = g.alerts.sort((a, b) => a.triggeredAt.localeCompare(b.triggeredAt));
    const severities = ['info', 'warning', 'critical'];
    const highest = sorted.reduce((h, a) => severities.indexOf(a.severity) > severities.indexOf(h) ? a.severity : h, 'info');
    INCIDENTS.push({
      id: `inc-${idx + 1}`,
      status: g.status,
      groupKey: `${g.sensorType}:${g.floorId}`,
      sensorType: g.sensorType,
      floorId: g.floorId,
      floorName: g.floorName,
      firstAlertAt: sorted[0].triggeredAt,
      lastAlertAt: sorted[sorted.length - 1].triggeredAt,
      alertCount: sorted.length,
      highestSeverity: highest,
      alerts: sorted.map(a => a.id),
      affectedZones: [...new Set(sorted.map(a => a.zoneId).filter(Boolean))],
      affectedSensors: [...new Set(sorted.map(a => a.sensorId).filter(Boolean))],
      rootCauseAlertId: sorted[0].id,
      resolvedAt: g.status === 'resolved' ? new Date(Date.now() - 3600000).toISOString() : null,
      createdAt: sorted[0].triggeredAt,
      updatedAt: new Date().toISOString(),
    });
  });
}
seedIncidents();

function getAssignedZones(user) {
  if (user.role === 'technician') return ['z1', 'z2', 'z3', 'z4'];
  return ZONES.map(z => z.id);
}

function checkAccess(allowedRoles) {
  return (user) => {
    if (!allowedRoles.includes(user.role)) return false;
    return true;
  };
}

// =============================================================================
// Knowledge Base Mock Data
// =============================================================================
const KB_PRODUCTS = [
  {
    id: 'kb-1', name: 'HVAC AHU-3000', serialNumber: 'HV-2024-001', manufacturer: 'Daikin', model: 'AHU-3000', category: 'HVAC',
    procedures: [
      { id: 'proc-1a', title: 'Compressor Troubleshooting', difficulty: 'hard', estimatedTime: '45–60 min', requiredTools: ['Multimeter', 'Manifold gauge set', 'Insulation resistance tester', 'Torque wrench'], steps: [ { number: 1, description: 'Isolate the AHU from the electrical supply and apply LOTO procedure.' }, { number: 2, description: 'Verify 0 V at the compressor terminals.', warning: 'Ensure capacitors are discharged.' }, { number: 3, description: 'Measure winding resistance between C-S, C-R, and S-R terminals.' }, { number: 4, description: 'Measure insulation resistance. Must be ≥ 500 MΩ.', caution: 'Below 2 MΩ indicates imminent failure.' }, { number: 5, description: 'Check suction and discharge pressures.' }, { number: 6, description: 'Restore power and monitor amp draw.' } ] },
      { id: 'proc-1b', title: 'Filter Replacement', difficulty: 'easy', estimatedTime: '15–20 min', requiredTools: ['Screwdriver', 'Replacement filter (MERV-13)', 'Vacuum cleaner'], steps: [ { number: 1, description: 'Turn off the AHU fan.' }, { number: 2, description: 'Open the filter access panel.' }, { number: 3, description: 'Slide out old filter and vacuum debris.' }, { number: 4, description: 'Insert new filter matching airflow arrow.', warning: 'Incorrect orientation reduces efficiency by 40%.' }, { number: 5, description: 'Close panel and restart fan.' } ] },
    ],
    documents: [ { id: 'doc-1a', title: 'AHU-3000 Service Manual', type: 'manual', url: '#' }, { id: 'doc-1b', title: 'R-410A Safety Data Sheet', type: 'datasheet', url: '#' } ],
    faqs: [ { question: 'How often should filters be replaced?', answer: 'Every 3 months under normal conditions.' }, { question: 'What is the normal operating superheat?', answer: '10–15 °F at the evaporator outlet.' } ]
  },
  {
    id: 'kb-2', name: 'Chiller CH-500X', serialNumber: 'CH-2023-001', manufacturer: 'Carrier', model: 'CH-500X', category: 'Chiller',
    procedures: [
      { id: 'proc-2a', title: 'Cooling Capacity Loss Diagnosis', difficulty: 'hard', estimatedTime: '60–90 min', requiredTools: ['Manifold gauge set', 'Flow meter', 'Temperature logger'], steps: [ { number: 1, description: 'Record chilled water temperatures and flow rate.' }, { number: 2, description: 'Calculate capacity: Q = flow × 500 × ΔT.' }, { number: 3, description: 'Check condenser water temperatures.' }, { number: 4, description: 'Inspect suction and discharge pressures.' } ] },
      { id: 'proc-2b', title: 'Condenser Tube Cleaning', difficulty: 'medium', estimatedTime: '3–4 hours', requiredTools: ['Tube brushes', 'High-pressure washer', 'End-cover gaskets'], steps: [ { number: 1, description: 'Shut down chiller and close isolation valves.' }, { number: 2, description: 'Drain condenser waterbox.', warning: 'Water may be extremely hot — allow 30 min cool-down.' }, { number: 3, description: 'Remove waterbox end covers.' }, { number: 4, description: 'Brush and flush each tube.' }, { number: 5, description: 'Replace gaskets and re-torque bolts.' } ] },
    ],
    documents: [ { id: 'doc-2a', title: 'CH-500X O&M Manual', type: 'manual', url: '#' } ],
    faqs: [ { question: 'Recommended condenser cleaning interval?', answer: 'Semi-annually for cooling tower systems.' } ]
  },
  {
    id: 'kb-3', name: 'UPS Symmetra PX', serialNumber: 'UPS-2024-001', manufacturer: 'APC / Schneider Electric', model: 'Symmetra PX 100kW', category: 'Power',
    procedures: [
      { id: 'proc-3a', title: 'Battery Module Replacement', difficulty: 'medium', estimatedTime: '20–30 min per module', requiredTools: ['Insulated gloves', 'Battery lifting handle', 'Multimeter'], steps: [ { number: 1, description: 'Identify failing module from management interface.' }, { number: 2, description: 'Ensure UPS is on mains power.', caution: 'Replacing on battery will cause load drop.' }, { number: 3, description: 'Put on Class 0 insulated gloves.' }, { number: 4, description: 'Slide out old module and insert replacement.' }, { number: 5, description: 'Initiate runtime calibration.' } ] },
    ],
    documents: [ { id: 'doc-3a', title: 'Symmetra PX User Manual', type: 'manual', url: '#' } ],
    faqs: [ { question: 'How long do UPS batteries last?', answer: '3–5 years for standard VRLA batteries.' } ]
  },
  {
    id: 'kb-4', name: 'Elevator Gen3', serialNumber: 'EL-2022-001', manufacturer: 'Otis', model: 'Gen3', category: 'Elevator',
    procedures: [
      { id: 'proc-4a', title: 'Door Alignment Adjustment', difficulty: 'medium', estimatedTime: '30–45 min', requiredTools: ['Door gap gauge', 'Allen key set', 'Level'], steps: [ { number: 1, description: 'Put elevator in inspection mode.' }, { number: 2, description: 'Measure car/landing door gap with feeler gauge.' }, { number: 3, description: 'Adjust door hanger rollers as needed.' }, { number: 4, description: 'Run doors through 10 open/close cycles.', warning: 'Keep hands clear of door track.' } ] },
    ],
    documents: [ { id: 'doc-4a', title: 'Gen3 Maintenance Manual', type: 'manual', url: '#' } ],
    faqs: [ { question: 'Elevator stops between floors — likely cause?', answer: 'Door interlock switch failure is most common. Check controller fault log.' } ]
  },
  {
    id: 'kb-5', name: 'Fire Panel FP-2000', serialNumber: 'FS-2023-001', manufacturer: 'Honeywell', model: 'FP-2000', category: 'Fire Safety',
    procedures: [
      { id: 'proc-5a', title: 'Smoke Detector Calibration', difficulty: 'medium', estimatedTime: '5 min per detector', requiredTools: ['Calibrated smoke aerosol', 'Extension pole', 'Panel access code'], steps: [ { number: 1, description: 'Put zone into TEST mode.' }, { number: 2, description: 'Position aerosol cup over detector and dispense.' }, { number: 3, description: 'Detector should alarm within 30 seconds.' }, { number: 4, description: 'If no alarm, check sensitivity or replace.', warning: 'Do NOT increase sensitivity beyond OEM spec.' }, { number: 5, description: 'Return zone to NORMAL mode.' } ] },
      { id: 'proc-5b', title: 'Battery Test & Replacement', difficulty: 'easy', estimatedTime: '15–20 min', requiredTools: ['Multimeter', 'Replacement batteries (2×12V 7Ah)', 'Screwdriver'], steps: [ { number: 1, description: 'Notify monitoring company.' }, { number: 2, description: 'Measure each battery voltage — below 12.0 VDC = replace.' }, { number: 3, description: 'Disconnect old batteries (negative first).', warning: 'SLA batteries contain sulfuric acid.' }, { number: 4, description: 'Connect new batteries (positive first).' }, { number: 5, description: 'Run supervised battery load test.' } ] },
    ],
    documents: [ { id: 'doc-5a', title: 'FP-2000 Programming Guide', type: 'manual', url: '#' }, { id: 'doc-5b', title: 'NFPA 72 Quick Reference', type: 'datasheet', url: '#' } ],
    faqs: [ { question: 'How often should panel batteries be replaced?', answer: 'Every 3–4 years regardless of test results.' } ]
  },
];

// =============================================================================
// HSE Compliance Mock Data
// =============================================================================
const HSE_CHECKLISTS = [];

const HSE_TEAM = [
  { id: 't1', name: 'Ahmad Fauzi', role: 'HVAC Technician', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:15:00Z' },
  { id: 't2', name: 'Budi Santoso', role: 'Electrical Technician', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:22:00Z' },
  { id: 't3', name: 'Cahya Dewi', role: 'Fire Safety Specialist', checklistStatus: 'completed', clearedForWork: false, ppeStatus: 'partial', submittedAt: '2026-04-15T07:45:00Z' },
  { id: 't4', name: 'Dimas Prasetyo', role: 'Elevator Technician', checklistStatus: 'pending', clearedForWork: false, ppeStatus: 'pending', submittedAt: null },
  { id: 't5', name: 'Eka Wijaya', role: 'General Maintenance', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T06:58:00Z' },
  { id: 't6', name: 'Farhan Rizki', role: 'Plumbing Technician', checklistStatus: 'pending', clearedForWork: false, ppeStatus: 'pending', submittedAt: null },
  { id: 't7', name: 'Gilang Ramadhan', role: 'HVAC Technician', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:10:00Z' },
  { id: 't8', name: 'Hana Permata', role: 'BMS Operator', checklistStatus: 'completed', clearedForWork: true, ppeStatus: 'pass', submittedAt: '2026-04-15T07:05:00Z' },
];

const HSE_PPE = [
  { id: 'ppe-1', technicianId: 't1', technicianName: 'Ahmad Fauzi', timestamp: '2026-04-15T07:18:00Z', items: [ { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true }, { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true } ], complianceScore: 100 },
  { id: 'ppe-2', technicianId: 't2', technicianName: 'Budi Santoso', timestamp: '2026-04-15T07:25:00Z', items: [ { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true }, { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true } ], complianceScore: 100 },
  { id: 'ppe-3', technicianId: 't3', technicianName: 'Cahya Dewi', timestamp: '2026-04-15T07:48:00Z', items: [ { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true }, { item: 'Gloves', passed: true }, { item: 'Goggles', passed: false }, { item: 'Tools', passed: true } ], complianceScore: 83 },
  { id: 'ppe-4', technicianId: 't5', technicianName: 'Eka Wijaya', timestamp: '2026-04-15T07:02:00Z', items: [ { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true }, { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true } ], complianceScore: 100 },
  { id: 'ppe-5', technicianId: 't7', technicianName: 'Gilang Ramadhan', timestamp: '2026-04-15T07:14:00Z', items: [ { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true }, { item: 'Gloves', passed: false }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true } ], complianceScore: 83 },
  { id: 'ppe-6', technicianId: 't8', technicianName: 'Hana Permata', timestamp: '2026-04-15T07:08:00Z', items: [ { item: 'Helmet', passed: true }, { item: 'Safety Vest', passed: true }, { item: 'Boots', passed: true }, { item: 'Gloves', passed: true }, { item: 'Goggles', passed: true }, { item: 'Tools', passed: true } ], complianceScore: 100 },
];

// =============================================================================
// PDF Builder (pure Node.js, no dependencies — generates valid PDF 1.4)
// =============================================================================
function buildPdf(renderFn) {
  const PW = 595, PH = 842, ML = 50, MR = 50, MT = 55, MB = 50;
  const CW = PW - ML - MR;
  const pgs = []; let s = '', y = PH - MT;
  const esc = t => String(t).replace(/[^\x20-\x7E]/g, '').replace(/[\\()]/g, c => '\\' + c);

  const $ = {
    get y() { return y; },
    page() { pgs.push(s); s = ''; y = PH - MT; },
    title(t, sz = 18) { s += `BT /F2 ${sz} Tf ${ML} ${y} Td (${esc(t)}) Tj ET\n`; y -= sz + 10; },
    heading(t) { s += `BT /F2 13 Tf ${ML} ${y} Td (${esc(t)}) Tj ET\n`; y -= 20; },
    label(t) { s += `BT /F2 10 Tf ${ML} ${y} Td (${esc(t)}) Tj ET\n`; y -= 15; },
    text(t, sz = 9) { s += `BT /F1 ${sz} Tf ${ML} ${y} Td (${esc(t)}) Tj ET\n`; y -= sz + 5; },
    bold(t, sz = 9) { s += `BT /F2 ${sz} Tf ${ML} ${y} Td (${esc(t)}) Tj ET\n`; y -= sz + 5; },
    gap(n = 10) { y -= n; },
    hr() { s += `0.75 0.75 0.75 RG 0.5 w ${ML} ${y} m ${PW - MR} ${y} l S 0 0 0 RG\n`; y -= 8; },
    kpis(items) {
      const bw = Math.floor(CW / items.length), bh = 42;
      if (y - bh - 10 < MB) $.page();
      items.forEach((it, i) => {
        const x = ML + i * bw;
        s += `0.94 0.94 0.94 rg ${x + 1} ${y - bh} ${bw - 2} ${bh} re f 0 0 0 rg\n`;
        s += `BT /F1 7 Tf ${x + 6} ${y - 12} Td (${esc(it.label)}) Tj ET\n`;
        s += `BT /F2 13 Tf ${x + 6} ${y - 30} Td (${esc(it.value)}) Tj ET\n`;
      });
      y -= bh + 10;
    },
    table(hdrs, rows, cw) {
      const rh = 15, tw = cw.reduce((a, b) => a + b, 0);
      const drawHdr = () => {
        s += `0.9 0.9 0.9 rg ${ML} ${y - rh} ${tw} ${rh} re f 0 0 0 rg\n`;
        let x = ML;
        hdrs.forEach((h, i) => { s += `BT /F2 7 Tf ${x + 3} ${y - 10} Td (${esc(h)}) Tj ET\n`; x += cw[i]; });
        y -= rh;
      };
      drawHdr();
      rows.forEach(row => {
        if (y - rh < MB) { $.page(); drawHdr(); }
        s += `0.88 0.88 0.88 RG ${ML} ${y} m ${ML + tw} ${y} l S 0 0 0 RG\n`;
        let x = ML;
        row.forEach((c, i) => {
          const t = String(c).substring(0, Math.floor(cw[i] / 4));
          s += `BT /F1 7 Tf ${x + 3} ${y - 10} Td (${esc(t)}) Tj ET\n`;
          x += cw[i];
        });
        y -= rh;
      });
      s += `0.88 0.88 0.88 RG ${ML} ${y} m ${ML + tw} ${y} l S 0 0 0 RG\n`;
      y -= 8;
    },
    bars(items, maxV) {
      const barH = 16, lw = 100, cw2 = CW - lw - 50;
      if (y - items.length * (barH + 3) < MB) $.page();
      items.forEach(it => {
        const w = Math.max(5, (it.value / maxV) * cw2);
        s += `BT /F1 8 Tf ${ML} ${y - 11} Td (${esc(it.label)}) Tj ET\n`;
        s += `0.23 0.51 0.96 rg ${ML + lw} ${y - barH + 3} ${w} ${barH - 5} re f 0 0 0 rg\n`;
        s += `BT /F1 7 Tf ${ML + lw + w + 4} ${y - 11} Td (${esc(String(it.value))}) Tj ET\n`;
        y -= barH + 3;
      });
      y -= 8;
    },
    ensure(n) { if (y - n < MB) $.page(); },
    footer(t) { s += `BT /F1 7 Tf ${ML} 25 Td (${esc(t)}) Tj ET\n`; }
  };

  renderFn($);
  if (s) pgs.push(s);

  // Assemble binary PDF
  const bufs = []; let off = 0; const ofs = {};
  const wr = str => { const b = Buffer.from(str, 'binary'); bufs.push(b); off += b.length; };
  const obj = (id, c) => { ofs[id] = off; wr(`${id} 0 obj\n${c}\nendobj\n`); };

  wr('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const np = pgs.length;
  obj(2, `<< /Type /Pages /Kids [${Array.from({ length: np }, (_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${np} >>`);
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

  for (let i = 0; i < np; i++) {
    const pid = 5 + i * 2, sid = 6 + i * 2;
    const sb = Buffer.from(pgs[i], 'binary');
    obj(pid, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents ${sid} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`);
    ofs[sid] = off;
    wr(`${sid} 0 obj\n<< /Length ${sb.length} >>\nstream\n`);
    bufs.push(sb); off += sb.length;
    wr('\nendstream\nendobj\n');
  }

  const tot = 4 + np * 2, xp = off;
  let xr = `xref\n0 ${tot + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= tot; i++) xr += String(ofs[i]).padStart(10, '0') + ' 00000 n \n';
  wr(xr);
  wr(`trailer\n<< /Size ${tot + 1} /Root 1 0 R >>\nstartxref\n${xp}\n%%EOF\n`);

  return Buffer.concat(bufs);
}

// Generate Energy PDF
function renderEnergyPdf(sd, ed, user) {
  const totalEnergy = rnd(25000, 45000), costPerKwh = 1467;
  const dailyEnergy = Array.from({ length: 30 }, (_, i) => { const d = new Date(ed); d.setDate(d.getDate() - (29 - i)); return { date: d.toISOString().split('T')[0], kwh: rnd(700, 1600) }; });
  const energyByFloor = FLOORS.map(f => ({ name: f.name, kwh: rnd(3000, 9000) }));

  return buildPdf($ => {
    $.title('Energy Consumption Report');
    $.text(`Period: ${sd} to ${ed} | Wisma Nusantara HQ Tower`);
    $.text(`Generated by: ${user.name} | ${new Date().toLocaleString('en-GB')}`);
    $.gap(5); $.hr(); $.gap(5);

    $.heading('Key Metrics');
    $.kpis([
      { label: 'TOTAL CONSUMPTION', value: `${totalEnergy.toLocaleString()} kWh` },
      { label: 'DAILY AVERAGE', value: `${(totalEnergy / 30).toFixed(0)} kWh` },
      { label: 'COST / KWH', value: `Rp ${costPerKwh.toLocaleString()}` },
      { label: 'TOTAL COST', value: `Rp ${(totalEnergy * costPerKwh / 1e6).toFixed(1)}M` },
    ]);

    $.heading('Consumption by Floor');
    $.bars(energyByFloor.map(f => ({ label: f.name, value: f.kwh })), 9000);

    $.heading('Daily Consumption Log');
    $.table(
      ['Date', 'Consumption (kWh)', 'Est. Cost (Rp)'],
      dailyEnergy.map(d => [d.date, d.kwh, (d.kwh * costPerKwh).toLocaleString()]),
      [150, 150, 195]
    );

    $.footer(`Smart Building Dashboard - Energy Report | Generated ${new Date().toLocaleString('en-GB')}`);
  });
}

// Generate Compilation PDF
function renderCompilationPdf(sd, ed, user) {
  const totalEnergy = rnd(25000, 45000), costPerKwh = 1467;
  const critAlerts = ALERTS.filter(a => a.severity === 'critical');
  const warnAlerts = ALERTS.filter(a => a.severity === 'warning');
  const infoAlerts = ALERTS.filter(a => a.severity === 'info');
  const resolvedAlerts = ALERTS.filter(a => a.status === 'resolved');
  const energyByFloor = FLOORS.map(f => ({ name: f.name, kwh: rnd(3000, 9000) }));
  const dailyEnergy = Array.from({ length: 30 }, (_, i) => { const d = new Date(ed); d.setDate(d.getDate() - (29 - i)); return { date: d.toISOString().split('T')[0], kwh: rnd(700, 1600) }; });
  const envData = ZONES.map(z => ({ zone: z.name, floor: z.floorName, temp: rnd(20, 28), humidity: rnd(40, 65), co2: rndInt(350, 900), aqi: rndInt(20, 90) }));

  return buildPdf($ => {
    // Page 1: Title + Executive Summary
    $.title('Smart Building Dashboard', 22);
    $.title('Compilation Report', 16);
    $.gap(5);
    $.text('Wisma Nusantara HQ Tower, Jl. Jend. Sudirman, Jakarta Pusat');
    $.text(`Reporting Period: ${sd} to ${ed}`);
    $.text(`Generated: ${new Date().toLocaleString('en-GB')} by ${user.name} (${user.role.replace(/_/g, ' ')})`);
    $.text('Location: -6.2088 S, 106.8456 E (Jakarta) | Area: 28,500 m2 across 5 floors');
    $.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`);
    $.gap(5); $.hr(); $.gap(5);

    $.heading('1. Executive Summary');
    $.kpis([
      { label: 'TOTAL ENERGY', value: `${totalEnergy.toLocaleString()} kWh` },
      { label: 'ENERGY COST', value: `Rp ${(totalEnergy * costPerKwh / 1e6).toFixed(1)}M` },
      { label: 'CRITICAL ALERTS', value: String(critAlerts.length) },
      { label: 'RESOLVED RATE', value: `${Math.round(resolvedAlerts.length / ALERTS.length * 100)}%` },
    ]);
    $.text(`- Average daily consumption: ${(totalEnergy / 30).toFixed(0)} kWh/day`);
    $.text(`- ${critAlerts.length} critical alerts detected`);
    $.text(`- Equipment health: ${EQUIPMENT.filter(e => e.healthStatus === 'green').length}/${EQUIPMENT.length} units in good condition`);
    $.text(`- Environmental comfort score: ${rndInt(75, 92)}%`);

    // Page 2: Energy
    $.page();
    $.heading('2. Energy Consumption Analysis');
    $.kpis([
      { label: 'TOTAL PERIOD', value: `${totalEnergy.toLocaleString()} kWh` },
      { label: 'DAILY AVERAGE', value: `${(totalEnergy / 30).toFixed(0)} kWh` },
      { label: 'COST / KWH', value: `Rp ${costPerKwh.toLocaleString()}` },
      { label: 'TOTAL COST', value: `Rp ${(totalEnergy * costPerKwh / 1e6).toFixed(1)}M` },
    ]);
    $.label('Consumption by Floor');
    $.bars(energyByFloor.map(f => ({ label: f.name, value: f.kwh })), 9000);
    $.label('Daily Energy (last 10 days)');
    $.table(
      ['Date', 'kWh', 'Est. Cost (Rp)'],
      dailyEnergy.slice(-10).map(d => [d.date, d.kwh, (d.kwh * costPerKwh).toLocaleString()]),
      [150, 120, 225]
    );

    // Page 3: Alerts
    $.page();
    $.heading('3. Alert Summary');
    $.kpis([
      { label: 'CRITICAL', value: String(critAlerts.length) },
      { label: 'WARNING', value: String(warnAlerts.length) },
      { label: 'INFO', value: String(infoAlerts.length) },
      { label: 'RESOLVED', value: String(resolvedAlerts.length) },
    ]);
    $.label('Recent Alerts (Top 20)');
    $.table(
      ['ID', 'Severity', 'Status', 'Message', 'Triggered'],
      ALERTS.slice(0, 20).map(a => [a.id, a.severity, a.status, a.message.substring(0, 40), new Date(a.triggeredAt).toLocaleString('en-GB')]),
      [55, 55, 70, 195, 120]
    );

    // Page 4: Environment
    $.page();
    $.heading('4. Environmental Conditions');
    $.table(
      ['Zone', 'Floor', 'Temp (C)', 'Humidity (%)', 'CO2 (ppm)', 'AQI', 'Status'],
      envData.map(z => { const st = z.temp > 27 || z.co2 > 800 ? 'Poor' : z.temp > 25 || z.co2 > 600 ? 'Fair' : 'Good'; return [z.zone, z.floor, z.temp, z.humidity, z.co2, z.aqi, st]; }),
      [80, 80, 55, 65, 60, 45, 45]
    );

    // Page 5: Equipment
    $.page();
    $.heading('5. Equipment & Asset Health');
    $.kpis([
      { label: 'HEALTHY', value: String(EQUIPMENT.filter(e => e.healthStatus === 'green').length) },
      { label: 'WARNING', value: String(EQUIPMENT.filter(e => e.healthStatus === 'yellow').length) },
      { label: 'CRITICAL', value: String(EQUIPMENT.filter(e => e.healthStatus === 'red').length) },
      { label: 'TOTAL ASSETS', value: String(EQUIPMENT.length) },
    ]);
    $.table(
      ['Equipment', 'Type', 'Serial No.', 'Location', 'Health', 'Warranty'],
      EQUIPMENT.map(e => [e.name, e.type, e.serialNumber, `${e.location.floorName}${e.location.zoneName ? ' / ' + e.location.zoneName : ''}`, e.healthStatus, e.warrantyExpiry]),
      [90, 55, 80, 100, 45, 70]
    );

    // Page 6: HSE Compliance
    $.page();
    $.heading('6. HSE Compliance Summary');
    $.kpis([
      { label: 'TEAM SIZE', value: String(HSE_TEAM.length) },
      { label: 'CHECKLIST DONE', value: `${HSE_TEAM.filter(t => t.checklistStatus === 'completed').length}/${HSE_TEAM.length}` },
      { label: 'PPE PASS RATE', value: `${Math.round(HSE_PPE.filter(p => p.complianceScore >= 100).length / HSE_PPE.length * 100)}%` },
      { label: 'CLEARED', value: `${HSE_TEAM.filter(t => t.clearedForWork).length}/${HSE_TEAM.length}` },
    ]);
    $.label('Team Compliance Status');
    $.table(
      ['Name', 'Role', 'Checklist', 'PPE', 'Cleared', 'Submitted'],
      HSE_TEAM.map(t => [t.name, t.role, t.checklistStatus, t.ppeStatus, t.clearedForWork ? 'Yes' : 'No', t.submittedAt ? new Date(t.submittedAt).toLocaleString('en-GB') : '-']),
      [80, 90, 60, 50, 45, 120]
    );
    $.gap(10);
    $.label('PPE Compliance Records');
    $.table(
      ['Technician', 'Score', 'Items Checked', 'Checked At'],
      HSE_PPE.map(p => [p.technicianName, `${p.complianceScore}%`, p.items.filter(i => i.passed).length + '/' + p.items.length + ' pass', new Date(p.timestamp).toLocaleString('en-GB')]),
      [110, 50, 110, 225]
    );

    // Page 7: Recommendations
    $.page();
    $.heading('7. Floor & Zone Overview');
    $.table(
      ['Floor', 'Level', 'Zones'],
      FLOORS.map(f => [f.name, `L${f.level}`, ZONES.filter(z => z.floorId === f.id).map(z => z.name).join(', ') || '-']),
      [120, 50, 325]
    );
    $.gap(15);
    $.heading('8. Recommendations');
    $.text(`1. [IMMEDIATE] Address ${critAlerts.length} critical alert(s) - UPS and server room issues`);
    $.text(`2. [SHORT-TERM] Schedule maintenance for ${EQUIPMENT.filter(e => e.healthStatus === 'yellow').length} equipment with warning status`);
    $.text('3. [ENERGY] Investigate peak-hour consumption to reduce off-hours waste');
    $.text(`4. [HSE] ${HSE_TEAM.filter(t => !t.clearedForWork).length} personnel not yet cleared - follow up`);
    $.text('5. [ENVIRONMENT] Monitor CO2 in zones exceeding 600 ppm');
    $.gap(20); $.hr();
    $.text('Smart Building Dashboard - Compilation Report');
    $.text(`Generated on ${new Date().toLocaleString('en-GB')} | Wisma Nusantara HQ Tower, Jakarta`);
    $.footer(`Smart Building Dashboard | ${new Date().toISOString()}`);
  });
}

// =============================================================================
// JWT helpers (simple HMAC-SHA256)
// =============================================================================
function createToken(payload, expiresInMs = 3600000) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + Math.floor(expiresInMs / 1000) })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [header, body, sig] = token.split('.');
    if (!header || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// =============================================================================
// HTTP helpers
// =============================================================================
function json(res, data, status = 200, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:5001',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    ...extraHeaders,
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2 MB limit
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); reject(new Error('PAYLOAD_TOO_LARGE')); return; }
      body += c;
    });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function getUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const payload = verifyToken(auth.slice(7));
  if (!payload) return null;
  return USERS.find(u => u.id === payload.sub) || null;
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, ...v] = c.trim().split('=');
    if (k) cookies[k] = v.join('=');
  });
  return cookies;
}

function parseUrl(rawUrl) {
  const [pathname, qs] = (rawUrl || '').split('?');
  const params = {};
  if (qs) qs.split('&').forEach(p => { const [k, v] = p.split('='); params[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
  return { pathname: pathname.replace(/^\/api\/v1/, ''), params };
}

function safeUser(u) { const { password: _, ...s } = u; return s; }

// =============================================================================
// Dynamic data generators
// =============================================================================
function energyTrend(range) {
  const n = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  const ms = range === '24h' ? 3600000 : 86400000;
  return Array.from({ length: n }, (_, i) => ({
    timestamp: new Date(Date.now() - (n - 1 - i) * ms).toISOString(),
    kwh: rnd(150, 480), powerFactor: rnd(0.85, 0.98), peakKw: rnd(80, 200),
  }));
}

function zoneEnvironmental() {
  return ZONES.map(z => {
    const t = rnd(20, 30), h = rnd(35, 75), c = rndInt(350, 1200);
    const ts = t > 28 ? 'critical' : t > 26 ? 'warning' : 'normal';
    const hs = h > 65 || h < 40 ? 'warning' : 'normal';
    const cs = c > 1000 ? 'critical' : c > 800 ? 'warning' : 'normal';
    const overall = [ts, hs, cs].includes('critical') ? 'critical' : [ts, hs, cs].includes('warning') ? 'warning' : 'normal';
    return {
      id: z.id, name: z.name, floorId: z.floorId, floorName: z.floorName, status: overall,
      readings: {
        temperature: { value: t, unit: '°C', status: ts },
        humidity: { value: h, unit: '%', status: hs },
        co2: { value: c, unit: 'ppm', status: cs },
      },
      sensorCount: rndInt(3, 8),
      lastUpdated: new Date(Date.now() - rndInt(0, 300000)).toISOString(),
    };
  });
}

function executiveDashboard() {
  return {
    energyCostToday: { value: rnd(1200000, 2800000), currency: 'IDR' },
    billingProjection: { projectedMonthly: rnd(35e6, 55e6), lastMonthActual: 42500000, variancePercent: rnd(-12, 15), currency: 'IDR' },
    energyTrend7d: energyTrend('7d').map(t => ({ date: t.timestamp.slice(0, 10), kwh: t.kwh })),
    topAnomalies: ALERTS.filter(a => a.severity === 'critical').slice(0, 5).map(a => ({ id: a.id, message: a.message, severity: a.severity, timestamp: a.triggeredAt })),
    comfortOverview: { zonesNormal: rndInt(4, 6), zonesWarning: rndInt(1, 3), zonesCritical: rndInt(0, 1) },
  };
}

function operationsDashboard() {
  return {
    sensorStatus: { total: 48, online: rndInt(40, 48), offline: rndInt(0, 4), stale: rndInt(0, 4) },
    alertSummary: { critical: ALERTS.filter(a => a.severity === 'critical' && a.status === 'active').length, warning: ALERTS.filter(a => a.severity === 'warning' && a.status === 'active').length, info: ALERTS.filter(a => a.severity === 'info' && a.status === 'active').length, activeTotal: ALERTS.filter(a => a.status === 'active').length },
    equipmentHealth: { green: EQUIPMENT.filter(e => e.healthStatus === 'green').length, yellow: EQUIPMENT.filter(e => e.healthStatus === 'yellow').length, red: EQUIPMENT.filter(e => e.healthStatus === 'red').length },
    recentEvents: ALERTS.slice(0, 8).map(a => ({ type: 'alert', message: a.message, severity: a.severity, timestamp: a.triggeredAt })),
    lastDataIngestion: new Date(Date.now() - rndInt(5000, 60000)).toISOString(),
  };
}

function technicianDashboard() {
  return {
    assignedAssets: EQUIPMENT.slice(0, 5).map(e => ({ id: e.id, name: e.name, type: e.type, healthStatus: e.healthStatus, keyMetric: `${rnd(60, 99)}% efficiency`, location: `${e.location.floorName} — ${e.location.zoneName || 'Rooftop'}` })),
    pendingAlerts: ALERTS.filter(a => a.status === 'active').slice(0, 6).map(a => ({ id: a.id, severity: a.severity, message: a.message, timestamp: a.triggeredAt })),
    recentActivity: [
      { type: 'maintenance', message: 'HVAC Unit #1 filter replaced', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { type: 'inspection', message: 'Chiller pressure check completed', timestamp: new Date(Date.now() - 14400000).toISOString() },
      { type: 'repair', message: 'UPS battery cell #3 replaced', timestamp: new Date(Date.now() - 86400000).toISOString() },
    ],
  };
}

function equipmentDetail(eq) {
  return {
    ...eq,
    sensors: Array.from({ length: rndInt(2, 5) }, (_, i) => ({
      id: `sensor-${eq.id}-${i}`, name: `${eq.name} Sensor ${i + 1}`,
      type: pick(['temperature', 'vibration', 'current', 'pressure']),
      status: pick(['online', 'online', 'online', 'stale']),
      lastValue: rnd(10, 95), unit: pick(['°C', 'mm/s', 'A', 'bar']),
    })),
    metrics: Array.from({ length: 10 }, (_, i) => ({
      metricType: pick(['runtime_hours', 'efficiency', 'power_draw']),
      value: rnd(10, 500), time: new Date(Date.now() - i * 3600000).toISOString(),
    })),
    recentAlerts: ALERTS.slice(0, 3).map(a => ({ id: a.id, severity: a.severity, message: a.message, status: a.status, triggeredAt: a.triggeredAt })),
  };
}

function floorPlanSensors(planId) {
  const sensorLayouts = {
    fp1: [
      { id: 'sp-g1', sensorId: 's-g1', x: 18, y: 38, rotation: 0, sensor: { name: 'Lobby Temp', type: 'temperature', status: 'online', lastValue: 23.5, unit: '°C' } },
      { id: 'sp-g2', sensorId: 's-g2', x: 22, y: 55, rotation: 0, sensor: { name: 'Lobby Humidity', type: 'humidity', status: 'online', lastValue: 52, unit: '%' } },
      { id: 'sp-g3', sensorId: 's-g3', x: 72, y: 35, rotation: 0, sensor: { name: 'Server Room Temp', type: 'temperature', status: 'online', lastValue: 19.2, unit: '°C' } },
      { id: 'sp-g4', sensorId: 's-g4', x: 78, y: 50, rotation: 0, sensor: { name: 'Server Room Humidity', type: 'humidity', status: 'online', lastValue: 38, unit: '%' } },
      { id: 'sp-g5', sensorId: 's-g5', x: 75, y: 65, rotation: 0, sensor: { name: 'Server CO2', type: 'co2', status: 'stale', lastValue: 410, unit: 'ppm' } },
      { id: 'sp-g6', sensorId: 's-g6', x: 40, y: 80, rotation: 0, sensor: { name: 'Security Motion', type: 'motion', status: 'online', lastValue: 1, unit: '' } },
      { id: 'sp-g7', sensorId: 's-g7', x: 55, y: 35, rotation: 0, sensor: { name: 'Reception Temp', type: 'temperature', status: 'offline', lastValue: null, unit: '°C' } },
    ],
    fp2: [
      { id: 'sp-1a', sensorId: 's-1a', x: 25, y: 40, rotation: 0, sensor: { name: 'Office A Temp', type: 'temperature', status: 'online', lastValue: 24.1, unit: '°C' } },
      { id: 'sp-1b', sensorId: 's-1b', x: 30, y: 55, rotation: 0, sensor: { name: 'Office A CO2', type: 'co2', status: 'online', lastValue: 680, unit: 'ppm' } },
      { id: 'sp-1c', sensorId: 's-1c', x: 75, y: 30, rotation: 0, sensor: { name: 'Meeting Rm Temp', type: 'temperature', status: 'online', lastValue: 22.8, unit: '°C' } },
      { id: 'sp-1d', sensorId: 's-1d', x: 80, y: 45, rotation: 0, sensor: { name: 'Meeting Rm Motion', type: 'motion', status: 'online', lastValue: 0, unit: '' } },
      { id: 'sp-1e', sensorId: 's-1e', x: 50, y: 75, rotation: 0, sensor: { name: 'Corridor Temp', type: 'temperature', status: 'stale', lastValue: 25.3, unit: '°C' } },
      { id: 'sp-1f', sensorId: 's-1f', x: 18, y: 72, rotation: 0, sensor: { name: 'Break Room Humidity', type: 'humidity', status: 'online', lastValue: 58, unit: '%' } },
    ],
    fp3: [
      { id: 'sp-2a', sensorId: 's-2a', x: 22, y: 38, rotation: 0, sensor: { name: 'Office B Temp', type: 'temperature', status: 'online', lastValue: 23.8, unit: '°C' } },
      { id: 'sp-2b', sensorId: 's-2b', x: 28, y: 55, rotation: 0, sensor: { name: 'Office B CO2', type: 'co2', status: 'online', lastValue: 720, unit: 'ppm' } },
      { id: 'sp-2c', sensorId: 's-2c', x: 75, y: 35, rotation: 0, sensor: { name: 'Exec Suite Temp', type: 'temperature', status: 'online', lastValue: 22.0, unit: '°C' } },
      { id: 'sp-2d', sensorId: 's-2d', x: 78, y: 52, rotation: 0, sensor: { name: 'Exec Suite Humidity', type: 'humidity', status: 'online', lastValue: 45, unit: '%' } },
      { id: 'sp-2e', sensorId: 's-2e', x: 50, y: 80, rotation: 0, sensor: { name: 'Corridor Motion', type: 'motion', status: 'offline', lastValue: null, unit: '' } },
    ],
  };
  return sensorLayouts[planId] || [];
}

const FLOOR_PLAN_ROOMS = {
  fp1: [
    { id: 'r-g1', name: 'Main Lobby', type: 'lobby', x: 4, y: 8, width: 35, height: 42, temperature: 23.5, humidity: 52, co2: 420 },
    { id: 'r-g2', name: 'Reception', type: 'lobby', x: 40, y: 8, width: 22, height: 25, temperature: 23.8, humidity: 50, co2: 390 },
    { id: 'r-g3', name: 'Server Room', type: 'server_room', x: 63, y: 8, width: 33, height: 42, temperature: 19.2, humidity: 38, co2: 410 },
    { id: 'r-g4', name: 'Security Office', type: 'office', x: 4, y: 55, width: 25, height: 22, temperature: 24.0, humidity: 55, co2: 450 },
    { id: 'r-g5', name: 'Mail Room', type: 'office', x: 30, y: 55, width: 20, height: 22, temperature: 24.5, humidity: 48, co2: 380 },
    { id: 'r-g6', name: 'Electrical Room', type: 'server_room', x: 63, y: 55, width: 18, height: 22, temperature: 26.0, humidity: 35, co2: 350 },
    { id: 'r-g7', name: 'Storage', type: 'office', x: 82, y: 55, width: 14, height: 22, temperature: 25.0, humidity: 42, co2: 330 },
    { id: 'r-g8', name: 'Loading Dock', type: 'lobby', x: 4, y: 82, width: 92, height: 14, temperature: 28.0, humidity: 60, co2: 500 },
  ],
  fp2: [
    { id: 'r-1a', name: 'Open Office A', type: 'office', x: 4, y: 8, width: 45, height: 38, temperature: 24.1, humidity: 50, co2: 680 },
    { id: 'r-1b', name: 'Meeting Room 1', type: 'meeting_room', x: 63, y: 8, width: 33, height: 22, temperature: 22.8, humidity: 48, co2: 520 },
    { id: 'r-1c', name: 'Meeting Room 2', type: 'meeting_room', x: 63, y: 34, width: 33, height: 18, temperature: 23.0, humidity: 46, co2: 480 },
    { id: 'r-1d', name: 'Break Room', type: 'cafeteria', x: 4, y: 55, width: 28, height: 25, temperature: 25.2, humidity: 58, co2: 550 },
    { id: 'r-1e', name: 'Phone Booths', type: 'meeting_room', x: 50, y: 55, width: 14, height: 25, temperature: 23.5, humidity: 44, co2: 450 },
    { id: 'r-1f', name: 'Print Room', type: 'office', x: 66, y: 55, width: 14, height: 25, temperature: 26.0, humidity: 40, co2: 380 },
    { id: 'r-1g', name: 'Manager Office', type: 'office', x: 82, y: 55, width: 14, height: 25, temperature: 22.5, humidity: 47, co2: 420 },
    { id: 'r-1h', name: 'Corridor', type: 'lobby', x: 4, y: 84, width: 92, height: 12, temperature: 25.3, humidity: 50, co2: 400 },
  ],
  fp3: [
    { id: 'r-2a', name: 'Open Office B', type: 'office', x: 4, y: 8, width: 45, height: 38, temperature: 23.8, humidity: 51, co2: 720 },
    { id: 'r-2b', name: 'Executive Suite', type: 'office', x: 63, y: 8, width: 33, height: 30, temperature: 22.0, humidity: 45, co2: 380 },
    { id: 'r-2c', name: 'Board Room', type: 'meeting_room', x: 63, y: 42, width: 33, height: 20, temperature: 22.5, humidity: 44, co2: 420 },
    { id: 'r-2d', name: 'Pantry', type: 'cafeteria', x: 4, y: 55, width: 20, height: 20, temperature: 25.5, humidity: 55, co2: 480 },
    { id: 'r-2e', name: 'Archive Room', type: 'office', x: 26, y: 55, width: 20, height: 20, temperature: 24.0, humidity: 42, co2: 350 },
    { id: 'r-2f', name: 'Server Closet', type: 'server_room', x: 48, y: 55, width: 14, height: 20, temperature: 20.5, humidity: 36, co2: 390 },
    { id: 'r-2g', name: 'Conference Room', type: 'meeting_room', x: 64, y: 65, width: 32, height: 18, temperature: 23.0, humidity: 46, co2: 500 },
    { id: 'r-2h', name: 'Corridor', type: 'lobby', x: 4, y: 80, width: 92, height: 16, temperature: 24.8, humidity: 49, co2: 410 },
  ],
};

function buildingGeospatial() {
  return {
    id: 'b1',
    name: 'HQ Tower',
    address: 'Jl. Sudirman No. 100, Jakarta',
    latitude: -6.2088,
    longitude: 106.8456,
    totalFloors: FLOORS.length,
    totalArea: 12500,
    timezone: 'Asia/Jakarta',
  };
}

// =============================================================================
// Digital Twin data generators
// =============================================================================
function generateFloorSensors(floorId) {
  const sensorTypes = ['temperature', 'humidity', 'co2', 'motion', 'light', 'power_meter', 'water_leak', 'smoke'];
  const count = rndInt(6, 12);
  return Array.from({ length: count }, (_, i) => {
    const type = pick(sensorTypes);
    const isOnline = Math.random() > 0.1;
    let value = null, unit = '';
    if (isOnline) {
      switch (type) {
        case 'temperature': value = rnd(18, 32); unit = '°C'; break;
        case 'humidity': value = rnd(30, 80); unit = '%'; break;
        case 'co2': value = rndInt(300, 1500); unit = 'ppm'; break;
        case 'motion': value = Math.random() > 0.5 ? 1 : 0; unit = ''; break;
        case 'light': value = rndInt(100, 800); unit = 'lux'; break;
        case 'power_meter': value = rnd(0.1, 15); unit = 'kW'; break;
        case 'water_leak': value = Math.random() > 0.95 ? 1 : 0; unit = ''; break;
        case 'smoke': value = Math.random() > 0.98 ? 1 : 0; unit = ''; break;
      }
    }
    return {
      id: `dt-sensor-${floorId}-${i}`,
      name: `${type.replace(/_/g, ' ')} sensor ${i + 1}`,
      type, status: isOnline ? 'online' : 'offline',
      value, unit,
      position: { x: rnd(5, 95), y: rnd(5, 95) },
      lastUpdated: new Date(Date.now() - rndInt(0, 300000)).toISOString(),
    };
  });
}

function digitalTwinBuilding() {
  const floorData = FLOORS.map(f => {
    const zones = ZONES.filter(z => z.floorId === f.id);
    const equip = EQUIPMENT.filter(e => e.location.floorId === f.id);
    const floorAlerts = ALERTS.filter(a => a.floorId === f.id && a.status === 'active');
    const envData = zones.map(z => {
      const temp = rnd(20, 30), humidity = rnd(35, 75), co2 = rndInt(350, 1200);
      const status = temp > 28 || co2 > 1000 ? 'critical' : temp > 26 || co2 > 800 ? 'warning' : 'normal';
      return {
        zoneId: z.id, zoneName: z.name, status,
        readings: { temperature: temp, humidity, co2 },
        occupancy: rndInt(0, 25),
      };
    });
    return {
      id: f.id, name: f.name, level: f.level,
      zones: envData,
      equipment: equip.map(e => ({
        id: e.id, name: e.name, type: e.type, healthStatus: e.healthStatus,
        position: { x: rnd(10, 90), y: rnd(10, 90) },
        metrics: {
          efficiency: rnd(65, 99),
          powerDraw: rnd(0.5, 25),
          runtime: rndInt(100, 8760),
          lastMaintenance: new Date(Date.now() - rndInt(1, 90) * 86400000).toISOString().slice(0, 10),
        },
      })),
      sensors: generateFloorSensors(f.id),
      activeAlerts: floorAlerts.length,
      overallStatus: floorAlerts.some(a => a.severity === 'critical') ? 'critical' : floorAlerts.some(a => a.severity === 'warning') ? 'warning' : 'normal',
    };
  });

  return {
    building: {
      id: 'b1', name: 'Wisma Nusantara HQ Tower',
      address: 'Jl. Sudirman No. 100, Jakarta',
      totalFloors: FLOORS.length, totalEquipment: EQUIPMENT.length,
      totalSensors: 48, onlineSensors: rndInt(42, 48),
      overallHealth: EQUIPMENT.filter(e => e.healthStatus === 'red').length > 0 ? 'warning' : 'healthy',
      energyNow: rnd(80, 200),
      lastSync: new Date().toISOString(),
    },
    floors: floorData,
    summary: {
      totalAlerts: ALERTS.filter(a => a.status === 'active').length,
      criticalAlerts: ALERTS.filter(a => a.severity === 'critical' && a.status === 'active').length,
      avgTemperature: rnd(22, 26),
      avgHumidity: rnd(45, 60),
      avgCO2: rndInt(400, 700),
      totalOccupancy: rndInt(50, 180),
      energyToday: rnd(800, 2400),
    },
  };
}

function digitalTwinFloor(floorId) {
  const floor = FLOORS.find(f => f.id === floorId);
  const zones = ZONES.filter(z => z.floorId === floorId);
  const equip = EQUIPMENT.filter(e => e.location.floorId === floorId);
  const floorAlerts = ALERTS.filter(a => a.floorId === floorId && a.status === 'active');
  const fpKey = { f1: 'fp1', f2: 'fp2', f3: 'fp3' }[floorId];
  const rooms = FLOOR_PLAN_ROOMS[fpKey] || [];

  return {
    floor: { id: floor.id, name: floor.name, level: floor.level },
    rooms: rooms.map(r => ({
      ...r,
      liveTemperature: rnd(20, 30),
      liveHumidity: rnd(35, 70),
      liveCO2: rndInt(350, 1200),
      occupancy: rndInt(0, 15),
      status: r.temperature > 27 ? 'warning' : 'normal',
    })),
    equipment: equip.map(e => ({
      id: e.id, name: e.name, type: e.type, serialNumber: e.serialNumber,
      healthStatus: e.healthStatus, zoneName: e.location.zoneName,
      position: { x: rnd(10, 90), y: rnd(10, 90) },
      liveMetrics: {
        efficiency: rnd(65, 99),
        powerDraw: rnd(0.5, 25),
        temperature: rnd(18, 45),
        vibration: rnd(0, 5),
        current: rnd(1, 50),
      },
    })),
    sensors: generateFloorSensors(floorId),
    alerts: floorAlerts.map(a => ({
      id: a.id, severity: a.severity, message: a.message,
      sensorType: a.sensorType, triggeredAt: a.triggeredAt,
    })),
    environmentalSummary: {
      avgTemp: rnd(22, 26), avgHumidity: rnd(45, 60), avgCO2: rndInt(400, 700),
      totalOccupancy: rndInt(5, 40),
    },
  };
}

function digitalTwinLiveReadings() {
  return {
    timestamp: new Date().toISOString(),
    building: {
      powerDraw: rnd(80, 200),
      waterFlow: rnd(5, 25),
      outsideTemp: rnd(28, 35),
      outsideHumidity: rnd(60, 90),
    },
    floors: FLOORS.map(f => ({
      id: f.id, name: f.name,
      avgTemp: rnd(22, 26), avgHumidity: rnd(45, 60), avgCO2: rndInt(400, 700),
      powerDraw: rnd(15, 45), occupancy: rndInt(5, 40),
      status: Math.random() > 0.85 ? 'warning' : 'normal',
    })),
    criticalSensors: Array.from({ length: rndInt(0, 3) }, () => ({
      sensorId: `sensor-${rndInt(1, 48)}`,
      type: pick(['temperature', 'co2', 'humidity']),
      value: rnd(30, 45),
      threshold: 30,
      floorId: pick(['f1', 'f2', 'f3', 'f4']),
      zoneName: pick(ZONES).name,
    })),
  };
}

// =============================================================================
// Router
// =============================================================================
async function handle(req, res) {
  const { pathname: path, params } = parseUrl(req.url);
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'http://localhost:5001',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  // Health
  if (path === '/health') return json(res, { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0-demo', uptime: process.uptime() });

  // ── Auth ──────────────────────────────────────────────────────────
  if (path === '/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const user = USERS.find(u => u.email === body.email && u.password === body.password);
    if (!user) return json(res, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
    const accessToken = createToken({ sub: user.id, role: user.role }, 900000);
    const refreshToken = createToken({ sub: user.id, type: 'refresh' }, 604800000);
    return json(res, { data: { user: safeUser(user), accessToken } }, 200, {
      'Set-Cookie': `refreshToken=${refreshToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
    });
  }

  if (path === '/auth/refresh' && method === 'POST') {
    const rt = parseCookies(req).refreshToken;
    if (!rt) return json(res, { error: { code: 'NO_REFRESH', message: 'No refresh token' } }, 401);
    const payload = verifyToken(rt);
    if (!payload) return json(res, { error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' } }, 401);
    const user = USERS.find(u => u.id === payload.sub);
    if (!user) return json(res, { error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 401);
    return json(res, { data: { accessToken: createToken({ sub: user.id, role: user.role }, 900000) } });
  }

  if (path === '/auth/logout' && method === 'POST') {
    return json(res, { data: { message: 'Logged out' } }, 200, {
      'Set-Cookie': 'refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax',
    });
  }

  if (path === '/auth/me' && method === 'GET') {
    const user = getUser(req);
    if (!user) return json(res, { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    return json(res, { data: safeUser(user) });
  }

  if (path === '/auth/register' && method === 'POST') {
    const user = getUser(req);
    if (!user || user.role !== 'sys_admin') return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
    const body = await parseBody(req);
    // Validate required fields
    if (!body.email || !body.name || !body.password) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'email, name, and password are required' } }, 400);
    // Validate email format
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' } }, 400);
    // Check duplicate email
    if (USERS.some(u => u.email === body.email)) return json(res, { error: { code: 'CONFLICT', message: 'Email already registered' } }, 409);
    // Validate role against allowed roles
    const allowedRoles = ['sys_admin', 'financial_decision_maker', 'technician', 'building_manager', 'security_officer', 'tenant', 'guest'];
    const role = body.role || 'technician';
    if (!allowedRoles.includes(role)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `role must be one of: ${allowedRoles.join(', ')}` } }, 400);
    // Validate password min length
    if (typeof body.password !== 'string' || body.password.length < 6) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } }, 400);
    // Validate name
    if (typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 100) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Name must be 1-100 characters' } }, 400);
    const newUser = { id: `u${USERS.length + 1}`, email: body.email, name: body.name, role, password: body.password, isActive: true, buildingId: 'b1', lastLoginAt: null, createdAt: new Date().toISOString() };
    USERS.push(newUser);
    return json(res, { data: safeUser(newUser) }, 201);
  }

  // ── Protected routes ──────────────────────────────────────────────
  const user = getUser(req);
  if (!user) return json(res, { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);

  // ── IAM (Identity & Access Management) ────────────────────────────
  // Immutable audit log of access events
  if (path === '/iam/access-events' && method === 'GET') {
    const now = Date.now();
    const events = Array.from({ length: 25 }, (_, i) => ({
      id: `evt-${i + 1}`,
      userId: pick(['u1','u3','u4','u5','u6','u7']),
      userName: pick(['System Administrator','Technician Mike','Building Manager Sari','Security Officer Joko','Tenant Rina','Hotel Guest Budi']),
      method: pick(['biometric','ble','nfc','mobile_key','pin']),
      doorId: pick(['door-lobby','door-lift-bank-a','door-server-room','door-room-1208','door-meeting-3a']),
      doorLabel: pick(['Lobby Turnstile','Lift Bank A','Server Room','Room 1208','Meeting 3A']),
      result: Math.random() > 0.08 ? 'granted' : 'denied',
      latencyMs: rndInt(80, 320),
      timestamp: new Date(now - i * rndInt(60000, 480000)).toISOString(),
      hash: crypto.createHash('sha256').update(`evt-${i}`).digest('hex').slice(0, 16),
    }));
    return json(res, { data: events, meta: { total: events.length, immutable: true, signed: true } });
  }
  if (path === '/iam/credentials' && method === 'GET') {
    return json(res, {
      data: USERS.map((u) => ({
        userId: u.id,
        name: u.name,
        role: u.role,
        mfaEnabled: !!u.mfaEnabled,
        biometricEnrolled: !!u.biometricEnrolled,
        bleProvisioned: ['sys_admin','technician','building_manager','security_officer','tenant'].includes(u.role),
        nfcProvisioned: ['technician','security_officer','tenant','guest'].includes(u.role),
        mobileKey: ['tenant','guest','building_manager','sys_admin'].includes(u.role) ? 'active' : 'none',
      })),
    });
  }
  if (path === '/iam/unlock' && method === 'POST') {
    const body = await parseBody(req);
    if (!body.doorId) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'doorId required' } }, 400);
    return json(res, {
      data: {
        success: true,
        doorId: body.doorId,
        method: body.method ?? 'mobile_key',
        userId: user.id,
        timestamp: new Date().toISOString(),
        latencyMs: rndInt(120, 220),
        auditHash: crypto.createHash('sha256').update(`${user.id}-${body.doorId}-${Date.now()}`).digest('hex').slice(0, 16),
      },
    });
  }
  if (path === '/iam/biometric/enroll' && method === 'POST') {
    user.biometricEnrolled = true;
    return json(res, { data: { userId: user.id, biometricEnrolled: true, enrolledAt: new Date().toISOString() } });
  }
  if (path === '/iam/mfa/enable' && method === 'POST') {
    user.mfaEnabled = true;
    return json(res, { data: { userId: user.id, mfaEnabled: true } });
  }

  // ── Tenant self-service (booking, parking, helpdesk shortcuts) ────
  if (path === '/tenant/me/summary' && method === 'GET') {
    return json(res, {
      data: {
        userId: user.id,
        company: user.tenantCompany ?? null,
        floorId: user.floorId ?? null,
        bookingsToday: rndInt(0, 3),
        openTickets: rndInt(0, 2),
        accessPasses: rndInt(1, 4),
        parkingSlot: 'P2-A-14',
        digitalKey: { active: true, expires: new Date(Date.now() + 86400000 * 30).toISOString() },
      },
    });
  }
  if (path === '/tenant/quick-actions' && method === 'GET') {
    return json(res, {
      data: [
        { key: 'unlock_door', label: 'Unlock My Office', icon: 'key' },
        { key: 'book_room', label: 'Book Meeting Room', icon: 'calendar' },
        { key: 'report_issue', label: 'Report an Issue', icon: 'alert' },
        { key: 'visitor_pass', label: 'Invite Visitor', icon: 'user-plus' },
        { key: 'parking', label: 'My Parking Slot', icon: 'car' },
      ],
    });
  }

  // ── Guest (hospitality) ───────────────────────────────────────────
  if (path === '/guest/me/stay' && method === 'GET') {
    return json(res, {
      data: {
        userId: user.id,
        roomNumber: user.roomNumber ?? '1208',
        checkIn: user.checkIn ?? null,
        checkOut: user.checkOut ?? null,
        services: ['housekeeping', 'concierge', 'fnb', 'spa'],
        mobileKey: { active: true, doors: ['room', 'gym', 'pool', 'lift'] },
        bill: { current: 1240.5, currency: 'USD' },
      },
    });
  }

  // Dashboard
  if (path === '/dashboard/executive') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: executiveDashboard() });
  }
  if (path === '/dashboard/operations') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: operationsDashboard() });
  }
  if (path === '/dashboard/technician') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: technicianDashboard() });
  }

  // Energy
  if (path === '/energy/trends') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: energyTrend(params.range || '24h') });
  }
  if (path === '/energy/consumption') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: { todayKwh: rnd(800, 2400), avgDaily: rnd(1200, 1800) } });
  }
  if (path === '/energy/billing-projection') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: { buildingId: 'b1', month: new Date().toISOString().slice(0, 7), consumedKwh: rnd(18000, 22000), projectedKwh: rnd(35000, 45000), tariffPerKwh: 1450, projectedCostIdr: rnd(50e6, 65e6), lastMonthActualIdr: 52300000, variancePercent: rnd(-10, 10), daysElapsed: new Date().getDate(), daysRemaining: 30 - new Date().getDate() } });
  }

  // Environmental
  if (path === '/zones/environmental') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: zoneEnvironmental() });
  }

  // Equipment
  if (path === '/equipment' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: EQUIPMENT });
  }
  const eqMatch = path.match(/^\/equipment\/([^/]+)$/);
  if (eqMatch && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const eq = EQUIPMENT.find(e => e.id === eqMatch[1]);
    if (!eq) return json(res, { error: { code: 'NOT_FOUND', message: 'Equipment not found' } }, 404);
    return json(res, { data: equipmentDetail(eq) });
  }

  // ── Alert Storm & Incidents ───────────────────────────────────────
  if (path === '/alerts/storm-status' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: { storm: STORM_STATE, config: THROTTLE_CONFIG } });
  }

  if (path === '/alerts/incidents' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    let filtered = [...INCIDENTS];
    if (params.status) filtered = filtered.filter(i => i.status === params.status);
    if (params.floorId) filtered = filtered.filter(i => i.floorId === params.floorId);
    if (params.sensorType) filtered = filtered.filter(i => i.sensorType === params.sensorType);
    // Technicians see only assigned zones
    if (user.role === 'technician') {
      const zones = getAssignedZones(user);
      filtered = filtered.filter(i => i.affectedZones.some(z => zones.includes(z)));
    }
    const page = parseInt(params.page) || 1, limit = parseInt(params.limit) || 20;
    const total = filtered.length;
    return json(res, { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } });
  }

  const incidentDetailMatch = path.match(/^\/alerts\/incidents\/([^/]+)$/);
  if (incidentDetailMatch && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const inc = INCIDENTS.find(i => i.id === incidentDetailMatch[1]);
    if (!inc) return json(res, { error: { code: 'NOT_FOUND', message: 'Incident not found' } }, 404);
    // Technicians can only view incidents in their assigned zones
    if (user.role === 'technician') {
      const zones = getAssignedZones(user);
      if (!inc.affectedZones.some(z => zones.includes(z))) return json(res, { error: { code: 'FORBIDDEN', message: 'Incident not in your assigned zones' } }, 403);
    }
    const timeline = inc.alerts.map(aId => ALERTS.find(a => a.id === aId)).filter(Boolean);
    return json(res, { data: { ...inc, timeline } });
  }

  const incidentResolveMatch = path.match(/^\/alerts\/incidents\/([^/]+)\/resolve$/);
  if (incidentResolveMatch && method === 'PATCH') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const inc = INCIDENTS.find(i => i.id === incidentResolveMatch[1]);
    if (!inc) return json(res, { error: { code: 'NOT_FOUND', message: 'Incident not found' } }, 404);
    // Technicians can only resolve incidents in their assigned zones
    if (user.role === 'technician') {
      const zones = getAssignedZones(user);
      if (!inc.affectedZones.some(z => zones.includes(z))) return json(res, { error: { code: 'FORBIDDEN', message: 'Cannot resolve incident outside your assigned zones' } }, 403);
    }
    inc.status = 'resolved';
    inc.resolvedAt = new Date().toISOString();
    inc.updatedAt = new Date().toISOString();
    // Also resolve all grouped alerts
    inc.alerts.forEach(aId => { const a = ALERTS.find(x => x.id === aId); if (a && a.status !== 'resolved') { a.status = 'resolved'; a.resolvedAt = new Date().toISOString(); } });
    return json(res, { data: { message: 'Incident resolved' } });
  }

  if (path === '/alerts/rules' && method === 'GET') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: ALERT_AGGREGATION_RULES });
  }

  if (path === '/alerts/rules' && method === 'POST') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    const rule = { id: `rule-${Date.now()}`, name: body.name || 'New Rule', groupBy: body.groupBy || ['sensorType', 'floorId'], timeWindowSeconds: body.timeWindowSeconds || 60, isActive: true, createdBy: user.id, createdAt: new Date().toISOString() };
    ALERT_AGGREGATION_RULES.push(rule);
    return json(res, { data: rule }, 201);
  }

  if (path === '/alerts/storm-config' && method === 'PUT') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    // Validate numeric bounds to prevent disabling storm detection
    if (body.stormThreshold !== undefined) {
      const v = Number(body.stormThreshold);
      if (!Number.isFinite(v) || v < 1 || v > 10000) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'stormThreshold must be between 1 and 10000' } }, 400);
      THROTTLE_CONFIG.stormThreshold = v;
    }
    if (body.windowSeconds !== undefined) {
      const v = Number(body.windowSeconds);
      if (!Number.isFinite(v) || v < 10 || v > 3600) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'windowSeconds must be between 10 and 3600' } }, 400);
      THROTTLE_CONFIG.windowSeconds = v;
    }
    if (body.batchIntervalSeconds !== undefined) {
      const v = Number(body.batchIntervalSeconds);
      if (!Number.isFinite(v) || v < 5 || v > 600) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'batchIntervalSeconds must be between 5 and 600' } }, 400);
      THROTTLE_CONFIG.batchIntervalSeconds = v;
    }
    if (body.cooldownSeconds !== undefined) {
      const v = Number(body.cooldownSeconds);
      if (!Number.isFinite(v) || v < 10 || v > 3600) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'cooldownSeconds must be between 10 and 3600' } }, 400);
      THROTTLE_CONFIG.cooldownSeconds = v;
    }
    if (body.suppressionRules) {
      const allowed = ['suppress', 'aggregate', 'passthrough'];
      for (const [k, v] of Object.entries(body.suppressionRules)) {
        if (!['info', 'warning', 'critical'].includes(k)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `Invalid suppression key: ${k}` } }, 400);
        if (!allowed.includes(v)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `suppressionRules values must be one of: ${allowed.join(', ')}` } }, 400);
      }
      Object.assign(THROTTLE_CONFIG.suppressionRules, body.suppressionRules);
    }
    return json(res, { data: THROTTLE_CONFIG });
  }

  // Alerts
  if (path === '/alerts' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    let filtered = [...ALERTS];
    // Technician: filter to assigned zones
    if (user.role === 'technician') {
      const zones = getAssignedZones(user);
      filtered = filtered.filter(a => zones.includes(a.zoneId));
    }
    if (params.status) filtered = filtered.filter(a => a.status === params.status);
    if (params.severity) filtered = filtered.filter(a => a.severity === params.severity);
    if (params.startDate) filtered = filtered.filter(a => a.triggeredAt >= params.startDate);
    if (params.endDate) filtered = filtered.filter(a => a.triggeredAt <= params.endDate);
    const page = parseInt(params.page) || 1, limit = parseInt(params.limit) || 20;
    const total = filtered.length;
    return json(res, { data: filtered.slice((page - 1) * limit, page * limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }
  const ackMatch = path.match(/^\/alerts\/([^/]+)\/acknowledge$/);
  if (ackMatch && method === 'PATCH') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const a = ALERTS.find(x => x.id === ackMatch[1]);
    if (!a) return json(res, { error: { code: 'NOT_FOUND', message: 'Alert not found' } }, 404);
    // Technicians can only acknowledge alerts in their assigned zones
    if (user.role === 'technician') {
      const zones = getAssignedZones(user);
      if (!zones.includes(a.zoneId)) return json(res, { error: { code: 'FORBIDDEN', message: 'Alert not in your assigned zones' } }, 403);
    }
    a.status = 'acknowledged'; a.acknowledgedAt = new Date().toISOString();
    return json(res, { data: { message: 'Alert acknowledged' } });
  }
  const resolveMatch = path.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (resolveMatch && method === 'PATCH') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const a = ALERTS.find(x => x.id === resolveMatch[1]);
    if (!a) return json(res, { error: { code: 'NOT_FOUND', message: 'Alert not found' } }, 404);
    // Technicians can only resolve alerts in their assigned zones
    if (user.role === 'technician') {
      const zones = getAssignedZones(user);
      if (!zones.includes(a.zoneId)) return json(res, { error: { code: 'FORBIDDEN', message: 'Alert not in your assigned zones' } }, 403);
    }
    a.status = 'resolved'; a.resolvedAt = new Date().toISOString();
    return json(res, { data: { message: 'Alert resolved' } });
  }

  // Floors
  if (path === '/floors') return json(res, { data: FLOORS });

  // Digital Twin Source (Drawing4.dwg / Drawing4.pdf)
  if (path === '/floor-plans/digital-twin/source' && method === 'GET') {
    const sourcePath = resolveDigitalTwinSource();
    if (!sourcePath) return json(res, { error: { code: 'DIGITAL_TWIN_SOURCE_NOT_FOUND', message: 'Drawing4.dwg or Drawing4.pdf not found' } }, 404);
    const stats = fs.statSync(sourcePath);
    const ext = nodePath.extname(sourcePath).toLowerCase();
    return json(res, { data: {
      name: nodePath.basename(sourcePath),
      fileType: ext === '.pdf' ? 'pdf' : 'dwg',
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString(),
      fileUrl: '/api/v1/floor-plans/digital-twin/source/file',
    } });
  }
  if (path === '/floor-plans/digital-twin/source/file' && method === 'GET') {
    const sourcePath = resolveDigitalTwinSource();
    if (!sourcePath) return json(res, { error: { code: 'DIGITAL_TWIN_SOURCE_NOT_FOUND', message: 'Drawing4.dwg or Drawing4.pdf not found' } }, 404);
    const ext = nodePath.extname(sourcePath).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : 'application/acad';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${nodePath.basename(sourcePath)}"`,
      'Access-Control-Allow-Origin': 'http://localhost:5001',
      'Access-Control-Allow-Credentials': 'true',
    });
    return fs.createReadStream(sourcePath).pipe(res);
  }
  if (path === '/floor-plans/digital-twin/source/svg' && method === 'GET') {
    try {
      const svg = await getDigitalTwinSvg();
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': 'http://localhost:5001',
        'Access-Control-Allow-Credentials': 'true',
      });
      return res.end(svg);
    } catch (e) {
      const status = e.code === 'DIGITAL_TWIN_SOURCE_NOT_FOUND' ? 404 : 500;
      return json(res, { error: { code: e.code || 'CONVERSION_FAILED', message: e.message } }, status);
    }
  }

  // Digital Twin — IoT devices placed on the CAD overlay
  if (path === '/digital-twin/iot-devices' && method === 'GET') {
    const floorId = params.floorId;
    let list = IOT_DEVICES;
    if (floorId) list = list.filter(d => d.floorId === floorId);
    const types = Object.fromEntries(Object.entries(IOT_DEVICE_TYPES).map(([k, v]) => [k, { unit: v.unit || '', binary: !!v.binary }]));
    return json(res, { data: list.map(deviceWithLive), meta: { types, floors: FLOORS, zones: ZONES } });
  }
  if (path === '/digital-twin/iot-devices' && method === 'POST') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
    const body = await parseBody(req);
    const { type, label, floorId, zoneId, x, y } = body || {};
    if (!type || !IOT_DEVICE_TYPES[type]) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid device type' } }, 400);
    if (!label || typeof label !== 'string' || label.trim().length === 0 || label.length > 80) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'label is required (max 80 chars)' } }, 400);
    const floor = FLOORS.find(f => f.id === floorId);
    if (!floor) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid floorId' } }, 400);
    const xn = Number(x), yn = Number(y);
    if (!isFinite(xn) || !isFinite(yn) || xn < 0 || xn > 100 || yn < 0 || yn > 100) {
      return json(res, { error: { code: 'VALIDATION_ERROR', message: 'x/y must be between 0 and 100' } }, 400);
    }
    const zone = zoneId ? ZONES.find(z => z.id === zoneId) : null;
    const dev = {
      id: `iot-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label: label.trim(),
      type,
      floorId: floor.id,
      floorName: floor.name,
      zoneId: zone ? zone.id : null,
      zoneName: zone ? zone.name : null,
      x: xn,
      y: yn,
      addedBy: user.id,
      addedAt: new Date().toISOString(),
    };
    IOT_DEVICES.push(dev);
    saveIotDevices();
    return json(res, { data: deviceWithLive(dev) }, 201);
  }
  const iotDeviceMatch = path.match(/^\/digital-twin\/iot-devices\/([^/]+)$/);
  if (iotDeviceMatch && (method === 'PATCH' || method === 'PUT')) {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
    const id = iotDeviceMatch[1];
    const dev = IOT_DEVICES.find(d => d.id === id);
    if (!dev) return json(res, { error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404);
    const body = await parseBody(req);
    if (body.x !== undefined || body.y !== undefined) {
      const xn = body.x !== undefined ? Number(body.x) : dev.x;
      const yn = body.y !== undefined ? Number(body.y) : dev.y;
      if (!isFinite(xn) || !isFinite(yn) || xn < 0 || xn > 100 || yn < 0 || yn > 100) {
        return json(res, { error: { code: 'VALIDATION_ERROR', message: 'x/y must be between 0 and 100' } }, 400);
      }
      dev.x = xn; dev.y = yn;
    }
    if (body.label !== undefined) {
      if (typeof body.label !== 'string' || body.label.trim().length === 0 || body.label.length > 80) {
        return json(res, { error: { code: 'VALIDATION_ERROR', message: 'label must be a string up to 80 chars' } }, 400);
      }
      dev.label = body.label.trim();
    }
    if (body.floorId !== undefined) {
      const floor = FLOORS.find(f => f.id === body.floorId);
      if (!floor) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid floorId' } }, 400);
      dev.floorId = floor.id; dev.floorName = floor.name;
      if (body.zoneId === undefined) { dev.zoneId = null; dev.zoneName = null; }
    }
    if (body.zoneId !== undefined) {
      if (body.zoneId === null || body.zoneId === '') {
        dev.zoneId = null; dev.zoneName = null;
      } else {
        const zone = ZONES.find(z => z.id === body.zoneId);
        if (!zone) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'Invalid zoneId' } }, 400);
        dev.zoneId = zone.id; dev.zoneName = zone.name;
      }
    }
    saveIotDevices();
    return json(res, { data: deviceWithLive(dev) });
  }
  if (iotDeviceMatch && method === 'DELETE') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Admin only' } }, 403);
    const id = iotDeviceMatch[1];
    const idx = IOT_DEVICES.findIndex(d => d.id === id);
    if (idx === -1) return json(res, { error: { code: 'NOT_FOUND', message: 'Device not found' } }, 404);
    IOT_DEVICES.splice(idx, 1);
    saveIotDevices();
    return json(res, { data: { message: 'Device removed' } });
  }

  // Floor Plans
  if (path === '/floor-plans' && method === 'GET') return json(res, { data: FLOOR_PLANS });

  if (path === '/floor-plans' && method === 'POST') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    if (!body.floorId || !body.label) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'floorId and label are required' } }, 400);
    if (typeof body.label !== 'string' || body.label.length > 200) return json(res, { error: { code: 'VALIDATION_ERROR', message: 'label must be a string up to 200 characters' } }, 400);
    // Sanitize SVG fileData to prevent XSS
    let safeFileData = body.fileData || null;
    if (safeFileData && typeof safeFileData === 'string') {
      const decoded = safeFileData.toLowerCase();
      const dangerousPatterns = /<script/i, onEventPattern = /\bon\w+\s*=/i, hrefJsPattern = /href\s*=\s*["']?javascript:/i, dataUri = /xlink:href\s*=\s*["']?data:text\/html/i;
      if (dangerousPatterns.test(decoded) || onEventPattern.test(decoded) || hrefJsPattern.test(decoded) || dataUri.test(decoded)) {
        return json(res, { error: { code: 'VALIDATION_ERROR', message: 'SVG contains potentially unsafe content (scripts, event handlers). Please remove them and re-upload.' } }, 400);
      }
    }
    const newPlan = {
      id: `fp${Date.now()}`, buildingId: 'b1', floorId: body.floorId, label: body.label,
      fileType: body.fileType || 'svg', fileSize: safeFileData ? safeFileData.length : 0,
      fileData: safeFileData,
      createdAt: new Date().toISOString(),
      versions: [{ version: 1, uploadedAt: new Date().toISOString(), uploadedBy: user.id, changeNote: body.changeNote || 'Initial upload' }],
    };
    FLOOR_PLANS.push(newPlan);
    return json(res, { data: newPlan }, 201);
  }

  const fpIdMatch = path.match(/^\/floor-plans\/([^/]+)$/);
  if (fpIdMatch && method === 'PUT') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const plan = FLOOR_PLANS.find(p => p.id === fpIdMatch[1]);
    if (!plan) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
    const body = await parseBody(req);
    if (body.label) plan.label = body.label;
    if (body.fileData) {
      // Sanitize SVG fileData to prevent XSS
      if (typeof body.fileData === 'string') {
        const decoded = body.fileData.toLowerCase();
        const dangerousPatterns = /<script/i, onEventPattern = /\bon\w+\s*=/i, hrefJsPattern = /href\s*=\s*["']?javascript:/i;
        if (dangerousPatterns.test(decoded) || onEventPattern.test(decoded) || hrefJsPattern.test(decoded)) {
          return json(res, { error: { code: 'VALIDATION_ERROR', message: 'SVG contains potentially unsafe content' } }, 400);
        }
      }
      plan.fileData = body.fileData; plan.fileSize = body.fileData.length;
    }
    if (body.fileType) plan.fileType = body.fileType;
    const newVer = (plan.versions?.length || 0) + 1;
    plan.versions = plan.versions || [];
    plan.versions.push({ version: newVer, uploadedAt: new Date().toISOString(), uploadedBy: user.id, changeNote: body.changeNote || 'Updated' });
    return json(res, { data: plan });
  }
  if (fpIdMatch && method === 'DELETE') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const idx = FLOOR_PLANS.findIndex(p => p.id === fpIdMatch[1]);
    if (idx === -1) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor plan not found' } }, 404);
    FLOOR_PLANS.splice(idx, 1);
    return json(res, { data: { message: 'Floor plan deleted' } });
  }

  const fpRoomPostMatch = path.match(/^\/floor-plans\/([^/]+)\/rooms$/);
  if (fpRoomPostMatch && method === 'POST') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    const planId = fpRoomPostMatch[1];
    if (!FLOOR_PLAN_ROOMS[planId]) FLOOR_PLAN_ROOMS[planId] = [];
    const room = { id: `r-${Date.now()}`, name: body.name || 'New Room', type: body.type || 'office', x: body.x || 0, y: body.y || 0, width: body.width || 10, height: body.height || 10, temperature: body.temperature || null, humidity: body.humidity || null, co2: body.co2 || null };
    FLOOR_PLAN_ROOMS[planId].push(room);
    return json(res, { data: room }, 201);
  }

  const fpSensorPutMatch = path.match(/^\/floor-plans\/([^/]+)\/sensors\/([^/]+)$/);
  if (fpSensorPutMatch && method === 'PUT') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    const sensors = floorPlanSensors(fpSensorPutMatch[1]);
    const sensor = sensors.find(s => s.sensorId === fpSensorPutMatch[2]);
    if (!sensor) return json(res, { error: { code: 'NOT_FOUND', message: 'Sensor not found' } }, 404);
    if (body.x !== undefined) sensor.x = body.x;
    if (body.y !== undefined) sensor.y = body.y;
    return json(res, { data: sensor });
  }
  const fpSensorMatch = path.match(/^\/floor-plans\/([^/]+)\/sensors$/);
  if (fpSensorMatch) return json(res, { data: floorPlanSensors(fpSensorMatch[1]) });
  const fpRoomMatch = path.match(/^\/floor-plans\/([^/]+)\/rooms$/);
  if (fpRoomMatch) return json(res, { data: FLOOR_PLAN_ROOMS[fpRoomMatch[1]] || [] });

  // Buildings catalog (includes Type1/Type2/Type3)
  if (path === '/buildings' && method === 'GET') {
    return json(res, { data: BUILDINGS });
  }

  // Buildings geospatial
  if (path === '/buildings/geospatial') return json(res, { data: buildingGeospatial() });

  // Reports
  if (path === '/reports/summary') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: { totalAlerts: ALERTS.length, criticalAlerts: ALERTS.filter(a => a.severity === 'critical').length, totalEnergyKwh: rnd(25000, 45000), avgComfortScore: rnd(70, 95) } });
  }

  if (path === '/reports/compilation') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const qs = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const sd = qs.startDate || '2026-03-16', ed = qs.endDate || '2026-04-16';
    const pdf = renderCompilationPdf(sd, ed, user);
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Smart-Building-Report-${sd}-to-${ed}.pdf"`, 'Access-Control-Allow-Origin': 'http://localhost:5001', 'Access-Control-Allow-Credentials': 'true' });
    return res.end(pdf);
  }

  if (path === '/reports/energy/pdf') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const qs = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
    const sd = qs.startDate || '2026-03-16', ed = qs.endDate || '2026-04-16';
    const pdf = renderEnergyPdf(sd, ed, user);
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Energy-Report-${sd}-to-${ed}.pdf"`, 'Access-Control-Allow-Origin': 'http://localhost:5001', 'Access-Control-Allow-Credentials': 'true' });
    return res.end(pdf);
  }
  if (path === '/reports/alerts/csv') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const csv = 'id,severity,status,message,triggeredAt\n' + ALERTS.slice(0, 30).map(a => `${a.id},${a.severity},${a.status},"${a.message}",${a.triggeredAt}`).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=alerts.csv', 'Access-Control-Allow-Origin': 'http://localhost:5001', 'Access-Control-Allow-Credentials': 'true' });
    return res.end(csv);
  }
  if (path === '/reports/sensors/csv') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const csv = 'sensorId,type,value,unit,timestamp\n' + Array.from({ length: 20 }, (_, i) => `sensor-${i + 1},${pick(['temperature', 'humidity', 'co2'])},${rnd(10, 80)},${pick(['°C', '%', 'ppm'])},${new Date(Date.now() - i * 3600000).toISOString()}`).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=sensors.csv', 'Access-Control-Allow-Origin': 'http://localhost:5001', 'Access-Control-Allow-Credentials': 'true' });
    return res.end(csv);
  }

  // Users
  if (path === '/users' && method === 'GET') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: USERS.map(safeUser) });
  }
  if (path === '/users/me' && method === 'PUT') {
    const body = await parseBody(req);
    if (body.name) user.name = body.name;
    return json(res, { data: safeUser(user) });
  }
  const userMatch = path.match(/^\/users\/([^/]+)$/);
  if (userMatch && method === 'PATCH') {
    if (!checkAccess(['sys_admin'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    const target = USERS.find(u => u.id === userMatch[1]);
    if (!target) return json(res, { error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
    if (body.isActive !== undefined) target.isActive = body.isActive;
    return json(res, { data: safeUser(target) });
  }

  // ── Knowledge Base ────────────────────────────────────────────────
  if (path === '/knowledge-base/search' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const q = (params.q || '').toLowerCase();
    const type = params.type || 'name';
    const results = KB_PRODUCTS.filter(p => {
      if (type === 'serial') return p.serialNumber.toLowerCase().includes(q);
      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.manufacturer.toLowerCase().includes(q);
    });
    return json(res, { data: results });
  }
  if (path === '/knowledge-base/search' && method === 'POST') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    // Image search — return random product
    const idx = Math.floor(Math.random() * KB_PRODUCTS.length);
    return json(res, { data: [KB_PRODUCTS[idx]] });
  }
  const kbMatch = path.match(/^\/knowledge-base\/products\/([^/]+)$/);
  if (kbMatch && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const product = KB_PRODUCTS.find(p => p.id === kbMatch[1]);
    if (!product) return json(res, { error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
    return json(res, { data: product });
  }

  // ── HSE Compliance ────────────────────────────────────────────────
  if (path === '/hse/checklist/today' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const entry = HSE_CHECKLISTS.find(c => c.userId === user.id && c.date === new Date().toISOString().slice(0, 10));
    if (entry) return json(res, { data: { submitted: true, answers: entry.answers, clearedForWork: entry.clearedForWork, submittedAt: entry.submittedAt } });
    return json(res, { data: { submitted: false } });
  }
  if (path === '/hse/checklist' && method === 'POST') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    const blockingFail = ['q1', 'q3', 'q5', 'q6', 'q7', 'q8', 'q9'].some(k => body.answers[k] === false) || body.answers['q4'] === true;
    const cleared = !blockingFail;
    const entry = { id: `cl-${Date.now()}`, userId: user.id, date: new Date().toISOString().slice(0, 10), answers: body.answers, clearedForWork: cleared, submittedAt: new Date().toISOString() };
    HSE_CHECKLISTS.push(entry);
    return json(res, { data: { clearedForWork: cleared } });
  }
  if (path === '/hse/checklist/history' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const entries = HSE_CHECKLISTS.filter(c => c.userId === user.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)).slice(0, 30);
    return json(res, { data: entries });
  }
  if (path === '/hse/team-compliance' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: HSE_TEAM });
  }
  if (path === '/hse/ppe-status' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: HSE_PPE });
  }
  if (path === '/hse/ppe-check' && method === 'POST') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const body = await parseBody(req);
    const score = body.score || 0;
    const entry = { id: `ppe-${Date.now()}`, technicianId: user.id, technicianName: user.name, timestamp: new Date().toISOString(), items: body.items || [], complianceScore: score };
    HSE_PPE.push(entry);
    return json(res, { data: { id: entry.id, status: score >= 80 ? 'pass' : 'partial', score } });
  }
  if (path === '/hse/ppe-history' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const entries = HSE_PPE.filter(p => p.technicianId === user.id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return json(res, { data: entries });
  }

  // ── Digital Twin ──────────────────────────────────────────────────
  if (path === '/digital-twin/building' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: digitalTwinBuilding() });
  }

  const dtFloorMatch = path.match(/^\/digital-twin\/floors\/([^/]+)$/);
  if (dtFloorMatch && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const floorId = dtFloorMatch[1];
    const floor = FLOORS.find(f => f.id === floorId);
    if (!floor) return json(res, { error: { code: 'NOT_FOUND', message: 'Floor not found' } }, 404);
    return json(res, { data: digitalTwinFloor(floorId) });
  }

  if (path === '/digital-twin/live-readings' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: digitalTwinLiveReadings() });
  }

  // ── Financial Optimization (CFO View) ─────────────────────────────
  // RULES (see docs/business-rules.md):
  //   energyCostSavingsYoY = (lastYearKwh - thisYearKwh) * tariff
  //   revenueLeakageDetected = sum(parking + booking + energyReimbursement + fnb anomalies)
  //   opexReduction% = (baselineOpex - currentOpex) / baselineOpex * 100
  //   buildingROI%   = (annualNOI / assetBookValue) * 100
  if (path === '/financial/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: financialSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/financial/cost-savings' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: financialCostSavings() });
  }
  if (path === '/financial/leakage' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: financialLeakage() });
  }

  // ── Operational Excellence (OpEx) ─────────────────────────────────
  // RULES:
  //   MTTR (min)            = avg(resolvedAt - triggeredAt) over closed work orders, last 30d
  //   buildingHealthScore   = sum(weight(green=100, yellow=60, red=10)) / count(equipment)
  //   tenantSatisfaction%   = (promoters / totalRespondents) * 100
  //   NPS                   = % promoters - % detractors
  //   slaCompliance%        = (workOrdersOnTime / totalWorkOrders) * 100
  if (path === '/operational-excellence/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: opexSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/operational-excellence/asset-health' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: opexAssetHealth() });
  }
  if (path === '/operational-excellence/nps-trend' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: opexNpsTrend() });
  }
  if (path === '/operational-excellence/work-orders' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: opexWorkOrders() });
  }

  // ── Hospitality (Rooms & Occupancy) ───────────────────────────────
  // RULES:
  //   occupancy%   = (roomsOccupied / totalRooms) * 100
  //   ADR          = totalRoomRevenue / roomsSold       // Average Daily Rate
  //   RevPAR       = totalRoomRevenue / totalAvailableRooms (== ADR * occupancy)
  //   stayOvers    = guests staying tonight (not arriving / not departing)
  if (path === '/hospitality/rooms/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: hospitalitySummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/hospitality/rooms/breakdown' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['occupancy', 'adr', 'revpar', 'stayovers'];
    const metric = String(params.metric || '');
    if (!allowed.includes(metric)) {
      return json(res, { error: { code: 'VALIDATION_ERROR', message: `metric must be one of: ${allowed.join(', ')}` } }, 400);
    }
    return json(res, { data: hospitalityBreakdown(metric) });
  }
  if (path === '/hospitality/rooms/list' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: HOTEL_ROOMS });
  }
  const roomMatch = path.match(/^\/hospitality\/rooms\/([A-Za-z0-9_-]{1,16})$/);
  if (roomMatch && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const room = HOTEL_ROOMS.find(r => r.id === roomMatch[1]);
    if (!room) return json(res, { error: { code: 'NOT_FOUND', message: 'Room not found' } }, 404);
    return json(res, { data: hospitalityRoomDetail(room) });
  }

  // ── Tenant Helpdesk & Tickets ─────────────────────────────────────
  // RULES (see docs/business-rules.md):
  //   openTickets       = count(status IN ('open','in_progress','waiting_parts'))
  //   avgResolutionMin  = avg(resolvedAt - openedAt) over closed tickets, last 7d
  //   slaBreaches7d     = count(closed tickets last 7d WHERE resolvedAt - openedAt > slaMinutes)
  //   tenantCsat        = avg(survey rating) on a 1..5 scale, last 30d
  if (path === '/helpdesk/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: helpdeskSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/helpdesk/tickets' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['open', 'closed', 'breached', 'all'];
    const scope = String(params.scope || 'open');
    if (!allowed.includes(scope)) {
      return json(res, { error: { code: 'VALIDATION_ERROR', message: `scope must be one of: ${allowed.join(', ')}` } }, 400);
    }
    return json(res, { data: helpdeskTickets(scope) });
  }
  if (path === '/helpdesk/csat' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: helpdeskCsat() });
  }
  const ticketMatch = path.match(/^\/helpdesk\/tickets\/([A-Za-z0-9_-]{1,16})$/);
  if (ticketMatch && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const t = HELPDESK_TICKETS.find(x => x.id === ticketMatch[1]);
    if (!t) return json(res, { error: { code: 'NOT_FOUND', message: 'Ticket not found' } }, 404);
    return json(res, { data: helpdeskTicketDetail(t) });
  }

  // ── Guest Management (Office + Hospitality) ───────────────────────
  // RULES:
  //   activeGuests      = count(VISITORS WHERE status='in_building')
  //   todayCheckIn      = count(VISITORS WHERE checkInAt::date = today)
  //   visitorPasses     = count(passes issued today)
  //   openGuestTickets  = count(GUEST_TICKETS WHERE status IN ('open','in_progress'))
  if (path === '/guest-management/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'security_officer'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const mode = ['office', 'hospitality'].includes(String(params.mode)) ? String(params.mode) : 'office';
    return json(res, { data: guestSummary(mode), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0', mode } });
  }
  if (path === '/guest-management/visitors' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'security_officer'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['waiting', 'in_building', 'escort', 'issue', 'all'];
    const filter = String(params.filter || 'all');
    if (!allowed.includes(filter)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `filter must be one of: ${allowed.join(', ')}` } }, 400);
    return json(res, { data: guestVisitors(filter) });
  }
  if (path === '/guest-management/passes' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'security_officer'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestPasses() });
  }

  // ── Smart Parking & EV Charging ───────────────────────────────────
  // RULES:
  //   occupancyPct   = (occupiedSlots / totalSlots) * 100
  //   evSessionsToday= count(EV_SESSIONS WHERE startedAt::date = today)
  //   anprAccuracy%  = (matchedPlates / totalPlateReads) * 100  (last 24h)
  //   revenueToday   = Σ(parkingFees) + Σ(evChargingFees) for today
  if (path === '/parking/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'security_officer', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: parkingSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/parking/zones' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'security_officer'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: parkingZones() });
  }
  if (path === '/parking/ev-sessions' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: parkingEvSessions() });
  }
  if (path === '/parking/anpr-events' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'security_officer'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: parkingAnprEvents() });
  }
  if (path === '/parking/revenue' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: parkingRevenue() });
  }

  // ── Room Booking Engine ───────────────────────────────────────────
  // RULES:
  //   bookingsToday  = count(BOOKINGS WHERE startAt::date = today)
  //   utilizationPct = Σ(bookedMinutes) / Σ(availableMinutes) * 100   (today, business hours 08–18)
  //   noShowsPct     = noShowCount / bookingsToday * 100
  //   hvacEnergySavedKwh = Σ(preCool/preHeat avoided baseline kWh) today
  if (path === '/booking/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: bookingSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/booking/schedule' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: bookingSchedule() });
  }
  if (path === '/booking/utilization' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: bookingUtilization() });
  }
  if (path === '/booking/no-shows' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'tenant'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: bookingNoShows() });
  }
  if (path === '/booking/hvac-events' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: bookingHvacEvents() });
  }

  // ── Housekeeping Workflow (Hospitality) ───────────────────────────
  // RULES:
  //   roomsToClean       = count(HOTEL_ROOMS WHERE status='vacant_dirty' OR (occupied AND checkOut=today))
  //   avgCleanMin        = avg(completedAt - assignedAt) over CLEAN_TASKS today
  //   activeAttendants   = count(distinct attendant) on assigned tasks today
  //   inspectionPassPct  = (inspectionsPassed / inspectionsTotal) * 100, last 7d
  if (path === '/housekeeping/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: housekeepingSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/housekeeping/tasks' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['todo', 'in_progress', 'done', 'priority', 'all'];
    const scope = String(params.scope || 'all');
    if (!allowed.includes(scope)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `scope must be one of: ${allowed.join(', ')}` } }, 400);
    return json(res, { data: housekeepingTasks(scope) });
  }
  if (path === '/housekeeping/attendants' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: housekeepingAttendants() });
  }
  if (path === '/housekeeping/inspections' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: housekeepingInspections() });
  }

  // ── Guest Services (Hospitality) ──────────────────────────────────
  // RULES:
  //   openRequests   = count(GUEST_REQUESTS WHERE status IN ('open','in_progress'))
  //   avgResponseMin = avg(firstResponseAt - openedAt) over GUEST_REQUESTS today
  //   fnbOrdersToday = count(FNB_ORDERS WHERE placedAt::date = today)
  //   guestCsat      = avg(rating) on GUEST_RATINGS, 1..5 scale, last 30d
  if (path === '/guest-services/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestServicesSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/guest-services/requests' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['open', 'closed', 'all'];
    const scope = String(params.scope || 'open');
    if (!allowed.includes(scope)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `scope must be one of: ${allowed.join(', ')}` } }, 400);
    return json(res, { data: guestServicesRequests(scope) });
  }
  if (path === '/guest-services/fnb-orders' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestServicesFnb() });
  }
  if (path === '/guest-services/csat' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestServicesCsat() });
  }

  // ── Data Center · Cooling & PUE ───────────────────────────────────
  // RULES:
  //   PUE         = totalFacilityKw / itLoadKw                                  (lower = better, target ≤ 1.4)
  //   CRAC up     = count(CRAC_UNITS WHERE status='green') / total
  //   chilledΔt   = avg(returnTempC - supplyTempC) across loops               (target 6–10 °C)
  //   coldAisleC  = avg(coldAisleSensors)                                      (band 18–24 °C ASHRAE A1)
  //   N+1 OK      = activeUnits ≤ totalUnits − 1 (one redundant available)
  if (path === '/datacenter/cooling/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/datacenter/cooling/pue-trend' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingPueTrend() });
  }
  if (path === '/datacenter/cooling/crac-units' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingCracUnits() });
  }
  if (path === '/datacenter/cooling/chilled-water' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingChilledWater() });
  }
  if (path === '/datacenter/cooling/aisles' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingAisles() });
  }
  if (path === '/datacenter/cooling/redundancy' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingRedundancy() });
  }

  // ── Housekeeping Workflow (Hospitality) ───────────────────────────
  // RULES:
  //   roomsToClean       = count(HOTEL_ROOMS WHERE status='vacant_dirty' OR (occupied AND checkOut=today))
  //   avgCleanMin        = avg(completedAt - assignedAt) over CLEAN_TASKS today
  //   activeAttendants   = count(distinct attendant) on assigned tasks today
  //   inspectionPassPct  = (inspectionsPassed / inspectionsTotal) * 100, last 7d
  if (path === '/housekeeping/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: housekeepingSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/housekeeping/tasks' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['todo', 'in_progress', 'done', 'priority', 'all'];
    const scope = String(params.scope || 'all');
    if (!allowed.includes(scope)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `scope must be one of: ${allowed.join(', ')}` } }, 400);
    return json(res, { data: housekeepingTasks(scope) });
  }
  if (path === '/housekeeping/attendants' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: housekeepingAttendants() });
  }
  if (path === '/housekeeping/inspections' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: housekeepingInspections() });
  }

  // ── Guest Services (Hospitality) ──────────────────────────────────
  // RULES:
  //   openRequests   = count(GUEST_REQUESTS WHERE status IN ('open','in_progress'))
  //   avgResponseMin = avg(firstResponseAt - openedAt) over GUEST_REQUESTS today
  //   fnbOrdersToday = count(FNB_ORDERS WHERE placedAt::date = today)
  //   guestCsat      = avg(rating) on GUEST_RATINGS, 1..5 scale, last 30d
  if (path === '/guest-services/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestServicesSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/guest-services/requests' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    const allowed = ['open', 'closed', 'all'];
    const scope = String(params.scope || 'open');
    if (!allowed.includes(scope)) return json(res, { error: { code: 'VALIDATION_ERROR', message: `scope must be one of: ${allowed.join(', ')}` } }, 400);
    return json(res, { data: guestServicesRequests(scope) });
  }
  if (path === '/guest-services/fnb-orders' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestServicesFnb() });
  }
  if (path === '/guest-services/csat' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: guestServicesCsat() });
  }

  // ── Data Center · Cooling & PUE ───────────────────────────────────
  // RULES:
  //   PUE         = totalFacilityKw / itLoadKw                                  (lower = better, target ≤ 1.4)
  //   CRAC up     = count(CRAC_UNITS WHERE status='green') / total
  //   chilledΔt   = avg(returnTempC - supplyTempC) across loops               (target 6–10 °C)
  //   coldAisleC  = avg(coldAisleSensors)                                      (band 18–24 °C ASHRAE A1)
  //   N+1 OK      = activeUnits ≤ totalUnits − 1 (one redundant available)
  if (path === '/datacenter/cooling/summary' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingSummary(), meta: { generatedAt: new Date().toISOString(), rulesVersion: '1.0' } });
  }
  if (path === '/datacenter/cooling/pue-trend' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingPueTrend() });
  }
  if (path === '/datacenter/cooling/crac-units' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingCracUnits() });
  }
  if (path === '/datacenter/cooling/chilled-water' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingChilledWater() });
  }
  if (path === '/datacenter/cooling/aisles' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingAisles() });
  }
  if (path === '/datacenter/cooling/redundancy' && method === 'GET') {
    if (!checkAccess(['sys_admin', 'building_manager', 'technician'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
    return json(res, { data: coolingRedundancy() });
  }

  // 404
  return json(res, { error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${path}` } }, 404);
}

// =============================================================================
// Financial / OpEx / Hospitality — deterministic mock data + computed KPIs
// =============================================================================
const FIN_BASELINE = {
  energyTariffPerKwh: 1450, // IDR
  lastYearAnnualKwh: 420000,
  thisYearAnnualKwh: 324000,
  baselineOpex: 1850000000, // IDR
  currentOpex: 1018000000,
  annualNoi: 4720000,        // USD
  assetBookValue: 25650000,  // USD
};

const FIN_COST_SAVINGS = [
  { category: 'HVAC',     baseline: 142000, current:  98000, savings: 44000 },
  { category: 'Lighting', baseline:  68000, current:  41000, savings: 27000 },
  { category: 'Parking',  baseline:  28000, current:  16500, savings: 11500 },
  { category: 'F&B',      baseline:  61000, current:  48000, savings: 13000 },
  { category: 'Other',    baseline:  47000, current:  41500, savings:  5500 },
];

const FIN_LEAKAGE = [
  { source: 'Parking unbilled minutes', amount: 18400, count: 312, evidence: 'ALPR vs gate session reconciliation' },
  { source: 'Booking no-shows uncharged', amount: 14200, count: 47,  evidence: 'Booking PMS cross-check' },
  { source: 'Energy reimbursement gap',   amount: 16800, count: 23,  evidence: 'Sub-meter vs lease schedule' },
  { source: 'F&B unposted charges',       amount:  8600, count: 64,  evidence: 'POS vs folio audit' },
];

const OPEX_WORK_ORDERS = [
  { id: 'wo-1', title: 'HVAC filter replacement Floor 2', priority: 'medium', triggeredAt: '2026-04-12T08:00:00Z', resolvedAt: '2026-04-12T08:14:00Z', slaMinutes: 60, onTime: true },
  { id: 'wo-2', title: 'UPS battery cell replacement',    priority: 'high',   triggeredAt: '2026-04-13T09:20:00Z', resolvedAt: '2026-04-13T09:42:00Z', slaMinutes: 30, onTime: true },
  { id: 'wo-3', title: 'Server room temp anomaly',        priority: 'critical', triggeredAt: '2026-04-14T03:10:00Z', resolvedAt: '2026-04-14T03:23:00Z', slaMinutes: 15, onTime: true },
  { id: 'wo-4', title: 'Lift Bank A vibration check',     priority: 'medium', triggeredAt: '2026-04-15T11:00:00Z', resolvedAt: '2026-04-15T11:38:00Z', slaMinutes: 60, onTime: true },
  { id: 'wo-5', title: 'Chiller condenser cleaning',      priority: 'low',    triggeredAt: '2026-04-16T07:00:00Z', resolvedAt: '2026-04-16T11:10:00Z', slaMinutes: 240, onTime: true },
  { id: 'wo-6', title: 'CO2 spike Open Office A',         priority: 'high',   triggeredAt: '2026-04-17T14:00:00Z', resolvedAt: '2026-04-17T14:52:00Z', slaMinutes: 30, onTime: false },
  { id: 'wo-7', title: 'Generator fuel level low',        priority: 'medium', triggeredAt: '2026-04-18T06:00:00Z', resolvedAt: '2026-04-18T06:22:00Z', slaMinutes: 60, onTime: true },
  { id: 'wo-8', title: 'Fire panel quarterly test',       priority: 'low',    triggeredAt: '2026-04-19T09:00:00Z', resolvedAt: '2026-04-19T09:30:00Z', slaMinutes: 120, onTime: true },
];

// Hotel rooms (deterministic seed)
function buildHotelRooms() {
  const types = [
    { type: 'Standard', rate: 140, count: 30 },
    { type: 'Deluxe',   rate: 184, count: 25 },
    { type: 'Suite',    rate: 320, count: 12 },
    { type: 'Penthouse',rate: 780, count:  3 },
  ];
  const statuses = ['occupied', 'occupied', 'occupied', 'vacant_clean', 'vacant_dirty', 'occupied', 'ooo'];
  const rooms = [];
  let n = 1201;
  for (const t of types) {
    for (let i = 0; i < t.count; i++) {
      const status = statuses[(n + i) % statuses.length];
      rooms.push({
        id: `R${n}`,
        number: String(n),
        floor: 12 + Math.floor((n - 1201) / 25),
        type: t.type,
        rate: t.rate,
        status,
        guestName: status === 'occupied' ? `Guest ${n}` : null,
        checkIn: status === 'occupied' ? '2026-04-18' : null,
        checkOut: status === 'occupied' ? (((n % 5) === 0) ? '2026-04-20' : '2026-04-22') : null,
        nightsBooked: status === 'occupied' ? (((n % 5) === 0) ? 2 : 4) : 0,
        revenueToDate: status === 'occupied' ? t.rate * (((n % 5) === 0) ? 2 : 4) : 0,
      });
      n++;
    }
  }
  return rooms;
}
const HOTEL_ROOMS = buildHotelRooms();

function financialSummary() {
  const f = FIN_BASELINE;
  const energySavings = (f.lastYearAnnualKwh - f.thisYearAnnualKwh) * f.energyTariffPerKwh;
  const energySavingsUsd = Math.round(energySavings / 16400); // IDR→USD demo rate
  const leakage = FIN_LEAKAGE.reduce((s, x) => s + x.amount, 0);
  const opexReductionPct = -((f.baselineOpex - f.currentOpex) / f.baselineOpex) * 100;
  const roiPct = (f.annualNoi / f.assetBookValue) * 100;
  return {
    kpis: {
      energyCostSavingsYoY: { value: energySavingsUsd, currency: 'USD', deltaPct: 22, formula: '(lastYearKwh − thisYearKwh) × tariff' },
      revenueLeakageDetected: { value: leakage, currency: 'USD', windowDays: 30, formula: 'Σ(parking + booking + energyReimb + fnb)' },
      opexReduction: { value: Math.round(opexReductionPct * 10) / 10, unit: '%', baselineYear: 2025, formula: '(baselineOpex − currentOpex) / baselineOpex' },
      buildingRoi: { value: Math.round(roiPct * 10) / 10, unit: '%', deltaPts: 3.1, formula: 'annualNOI / assetBookValue' },
    },
    inputs: f,
  };
}

function financialCostSavings() {
  const total = FIN_COST_SAVINGS.reduce((s, x) => s + x.savings, 0);
  return {
    totalSavings: total,
    currency: 'USD',
    items: FIN_COST_SAVINGS.map(c => ({ ...c, sharePct: Math.round((c.savings / total) * 1000) / 10 })),
  };
}

function financialLeakage() {
  const total = FIN_LEAKAGE.reduce((s, x) => s + x.amount, 0);
  return {
    totalLeakage: total,
    currency: 'USD',
    windowDays: 30,
    items: FIN_LEAKAGE.map(l => ({ ...l, sharePct: Math.round((l.amount / total) * 1000) / 10 })),
  };
}

function opexSummary() {
  const wo = OPEX_WORK_ORDERS;
  const durations = wo.map(w => (new Date(w.resolvedAt) - new Date(w.triggeredAt)) / 60000);
  const mttr = Math.round(durations.reduce((s, d) => s + d, 0) / durations.length);
  const onTime = wo.filter(w => w.onTime).length;
  const sla = Math.round((onTime / wo.length) * 1000) / 10;
  // Building Health Score from EQUIPMENT
  const weights = { green: 100, yellow: 60, red: 10 };
  const score = Math.round(EQUIPMENT.reduce((s, e) => s + (weights[e.healthStatus] ?? 50), 0) / EQUIPMENT.length);
  // Tenant satisfaction (synthetic but deterministic)
  const promoters = 42, passives = 14, detractors = 4, total = promoters + passives + detractors;
  const satisfactionPct = Math.round((promoters / total) * 1000) / 10;
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return {
    kpis: {
      mttr: { value: mttr, unit: 'min', deltaPct: -45, formula: 'avg(resolvedAt − triggeredAt) over closed work orders, 30d' },
      buildingHealthScore: { value: score, max: 100, deltaPts: 6, formula: 'Σ weight(green=100, yellow=60, red=10) / N(equipment)' },
      tenantSatisfaction: { value: satisfactionPct, unit: '%', nps, formula: '(promoters / totalRespondents) × 100' },
      slaCompliance: { value: sla, unit: '%', deltaPct: 1.4, formula: '(workOrdersOnTime / totalWorkOrders) × 100' },
    },
    survey: { promoters, passives, detractors, total },
    workOrderCount: wo.length,
  };
}

function opexAssetHealth() {
  const weights = { green: 100, yellow: 60, red: 10 };
  return EQUIPMENT.map(e => ({
    id: e.id, name: e.name, type: e.type, healthStatus: e.healthStatus,
    score: weights[e.healthStatus] ?? 50,
    location: `${e.location.floorName}${e.location.zoneName ? ' / ' + e.location.zoneName : ''}`,
  }));
}

function opexNpsTrend() {
  // 6 months of deterministic NPS values
  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
  const values = [58, 61, 64, 66, 70, 72];
  return months.map((m, i) => ({ month: m, nps: values[i], promotersPct: 60 + i, detractorsPct: 8 - i }));
}

function opexWorkOrders() {
  const buckets = {};
  for (const w of OPEX_WORK_ORDERS) {
    const week = w.triggeredAt.slice(0, 10);
    if (!buckets[week]) buckets[week] = { date: week, opened: 0, resolved: 0, onTime: 0 };
    buckets[week].opened += 1;
    buckets[week].resolved += 1;
    if (w.onTime) buckets[week].onTime += 1;
  }
  return { items: OPEX_WORK_ORDERS, throughput: Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date)) };
}

function hospitalitySummary() {
  const total = HOTEL_ROOMS.length;
  const ooo = HOTEL_ROOMS.filter(r => r.status === 'ooo').length;
  const available = total - ooo; // out-of-order excluded from availability
  const occupied = HOTEL_ROOMS.filter(r => r.status === 'occupied').length;
  const occupancyPct = Math.round((occupied / available) * 1000) / 10;
  const totalRoomRevenue = HOTEL_ROOMS.reduce((s, r) => s + (r.status === 'occupied' ? r.rate : 0), 0);
  const adr = Math.round(totalRoomRevenue / occupied);
  const revpar = Math.round((totalRoomRevenue / available) * 100) / 100;
  // Stay-overs = occupied tonight AND not departing today (checkOut != today)
  const today = '2026-04-20';
  const stayOvers = HOTEL_ROOMS.filter(r => r.status === 'occupied' && r.checkOut && r.checkOut !== today).length;
  return {
    kpis: {
      occupancy: { value: occupancyPct, unit: '%', deltaPts: 4, formula: '(roomsOccupied / availableRooms) × 100', drilldown: 'occupancy' },
      adr:       { value: adr, currency: 'USD', deltaPct: 6, formula: 'totalRoomRevenue / roomsSold', drilldown: 'adr' },
      revpar:    { value: revpar, currency: 'USD', deltaPct: 12, formula: 'totalRoomRevenue / availableRooms', drilldown: 'revpar' },
      stayovers: { value: stayOvers, unit: 'rooms', label: 'tonight', formula: 'occupied AND checkOut != today', drilldown: 'stayovers' },
    },
    totals: { total, available, occupied, ooo, totalRoomRevenue },
  };
}

function hospitalityBreakdown(metric) {
  // Group by floor and by roomType
  const byFloor = {};
  const byType = {};
  for (const r of HOTEL_ROOMS) {
    byFloor[r.floor] = byFloor[r.floor] || { floor: r.floor, total: 0, occupied: 0, available: 0, revenue: 0, stayOvers: 0 };
    byType[r.type]   = byType[r.type]   || { type:  r.type,  total: 0, occupied: 0, available: 0, revenue: 0, stayOvers: 0 };
    const ooo = r.status === 'ooo';
    [byFloor[r.floor], byType[r.type]].forEach(b => {
      b.total += 1;
      if (!ooo) b.available += 1;
      if (r.status === 'occupied') {
        b.occupied += 1;
        b.revenue += r.rate;
        if (r.checkOut && r.checkOut !== '2026-04-20') b.stayOvers += 1;
      }
    });
  }
  function compute(b) {
    const occupancyPct = b.available ? Math.round((b.occupied / b.available) * 1000) / 10 : 0;
    const adr  = b.occupied  ? Math.round(b.revenue / b.occupied) : 0;
    const revpar = b.available ? Math.round((b.revenue / b.available) * 100) / 100 : 0;
    let value;
    if (metric === 'occupancy') value = occupancyPct;
    else if (metric === 'adr') value = adr;
    else if (metric === 'revpar') value = revpar;
    else value = b.stayOvers;
    return { ...b, occupancyPct, adr, revpar, value };
  }
  return {
    metric,
    byFloor: Object.values(byFloor).sort((a, b) => a.floor - b.floor).map(compute),
    byType:  Object.values(byType).map(compute),
  };
}

function hospitalityRoomDetail(room) {
  return {
    ...room,
    folio: room.status === 'occupied' ? [
      { date: room.checkIn, item: 'Room rate', amount: room.rate },
      { date: room.checkIn, item: 'City tax',  amount: Math.round(room.rate * 0.05) },
      { date: room.checkIn, item: 'Mini bar',  amount: 18 },
    ] : [],
    services: room.status === 'occupied' ? ['housekeeping', 'concierge', 'spa'] : [],
    history: [
      { date: '2026-04-15', event: 'Checked in', actor: 'Front Desk' },
      { date: '2026-04-16', event: 'Housekeeping completed', actor: 'HK Team' },
    ],
  };
}

// =============================================================================
// Helpdesk / Guest Management / Parking / Booking — deterministic mock data
// =============================================================================

const TODAY = '2026-04-20';

// ── Tenant Helpdesk ─────────────────────────────────────────────────
const HELPDESK_TICKETS = [
  { id: 'tk-101', title: 'AC too cold in 12-A',          tenant: 'Acme Corp',  category: 'HVAC',     priority: 'medium',   status: 'open',          openedAt: '2026-04-20T07:42:00Z', resolvedAt: null,                    slaMinutes: 60,  assignee: 'Tech B' },
  { id: 'tk-102', title: 'Lighting flicker meeting room',tenant: 'Globex',     category: 'Lighting', priority: 'low',      status: 'in_progress',   openedAt: '2026-04-20T08:05:00Z', resolvedAt: null,                    slaMinutes: 120, assignee: 'Tech A' },
  { id: 'tk-103', title: 'Water leak pantry F11',        tenant: 'Initech',    category: 'Plumbing', priority: 'high',     status: 'in_progress',   openedAt: '2026-04-20T08:10:00Z', resolvedAt: null,                    slaMinutes: 30,  assignee: 'Tech C' },
  { id: 'tk-104', title: 'Door access denied F7',        tenant: 'Umbrella',   category: 'Access',   priority: 'high',     status: 'open',          openedAt: '2026-04-20T08:31:00Z', resolvedAt: null,                    slaMinutes: 30,  assignee: null     },
  { id: 'tk-105', title: 'Slow lift Bank B',             tenant: 'Stark Ind',  category: 'Lift',     priority: 'medium',   status: 'open',          openedAt: '2026-04-20T08:50:00Z', resolvedAt: null,                    slaMinutes: 60,  assignee: null     },
  { id: 'tk-106', title: 'Wifi degraded F14',            tenant: 'Wayne Ent',  category: 'IT',       priority: 'low',      status: 'open',          openedAt: '2026-04-20T09:02:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: null     },
  { id: 'tk-107', title: 'Pantry coffee machine error',  tenant: 'Acme Corp',  category: 'Facility', priority: 'low',      status: 'open',          openedAt: '2026-04-20T09:15:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: 'Tech D' },
  { id: 'tk-108', title: 'Toilet F4 out of order',       tenant: 'Globex',     category: 'Plumbing', priority: 'medium',   status: 'open',          openedAt: '2026-04-20T09:22:00Z', resolvedAt: null,                    slaMinutes: 60,  assignee: 'Tech C' },
  { id: 'tk-109', title: 'Projector HDMI fail',          tenant: 'Initech',    category: 'IT',       priority: 'medium',   status: 'in_progress',   openedAt: '2026-04-20T09:30:00Z', resolvedAt: null,                    slaMinutes: 60,  assignee: 'Tech A' },
  { id: 'tk-110', title: 'Keycard lost F9',              tenant: 'Umbrella',   category: 'Access',   priority: 'medium',   status: 'open',          openedAt: '2026-04-20T09:41:00Z', resolvedAt: null,                    slaMinutes: 60,  assignee: null     },
  { id: 'tk-111', title: 'Smoke detector test F2',       tenant: 'Stark Ind',  category: 'Safety',   priority: 'low',      status: 'open',          openedAt: '2026-04-20T09:55:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: 'Tech B' },
  { id: 'tk-112', title: 'AC noise F18',                 tenant: 'Wayne Ent',  category: 'HVAC',     priority: 'low',      status: 'open',          openedAt: '2026-04-20T10:08:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: null     },
  { id: 'tk-113', title: 'Floor cleaning request',       tenant: 'Acme Corp',  category: 'Facility', priority: 'low',      status: 'open',          openedAt: '2026-04-20T10:20:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: 'Tech D' },
  { id: 'tk-114', title: 'Door sensor stuck F12',        tenant: 'Globex',     category: 'Access',   priority: 'medium',   status: 'open',          openedAt: '2026-04-20T10:33:00Z', resolvedAt: null,                    slaMinutes: 60,  assignee: 'Tech C' },
  { id: 'tk-115', title: 'Printer jam F6',               tenant: 'Initech',    category: 'IT',       priority: 'low',      status: 'open',          openedAt: '2026-04-20T10:48:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: null     },
  { id: 'tk-116', title: 'Reception light out',          tenant: 'Umbrella',   category: 'Lighting', priority: 'low',      status: 'open',          openedAt: '2026-04-20T11:02:00Z', resolvedAt: null,                    slaMinutes: 240, assignee: 'Tech A' },
  { id: 'tk-117', title: 'Parking gate stuck',           tenant: 'Stark Ind',  category: 'Parking',  priority: 'high',     status: 'open',          openedAt: '2026-04-20T11:18:00Z', resolvedAt: null,                    slaMinutes: 30,  assignee: 'Tech B' },
  // closed last 7d (used for MTTR + breaches)
  { id: 'tk-091', title: 'HVAC filter F2',               tenant: 'Acme Corp',  category: 'HVAC',     priority: 'medium',   status: 'closed',        openedAt: '2026-04-19T08:00:00Z', resolvedAt: '2026-04-19T08:24:00Z',  slaMinutes: 60,  assignee: 'Tech B' },
  { id: 'tk-092', title: 'CO2 spike F8',                 tenant: 'Globex',     category: 'HVAC',     priority: 'high',     status: 'closed',        openedAt: '2026-04-18T14:00:00Z', resolvedAt: '2026-04-18T14:38:00Z',  slaMinutes: 30,  assignee: 'Tech C' },
  { id: 'tk-093', title: 'Door reader F11',              tenant: 'Initech',    category: 'Access',   priority: 'medium',   status: 'closed',        openedAt: '2026-04-18T10:00:00Z', resolvedAt: '2026-04-18T10:42:00Z',  slaMinutes: 60,  assignee: 'Tech A' },
  { id: 'tk-094', title: 'Lift bank B',                  tenant: 'Umbrella',   category: 'Lift',     priority: 'low',      status: 'closed',        openedAt: '2026-04-17T09:00:00Z', resolvedAt: '2026-04-17T11:30:00Z',  slaMinutes: 240, assignee: 'Tech D' },
  { id: 'tk-095', title: 'Lighting flicker F3',          tenant: 'Stark Ind',  category: 'Lighting', priority: 'low',      status: 'closed',        openedAt: '2026-04-16T13:00:00Z', resolvedAt: '2026-04-16T13:55:00Z',  slaMinutes: 120, assignee: 'Tech A' },
];
const HELPDESK_CSAT = [
  { date: '2026-04-14', rating: 5, comment: 'Fast and friendly' },
  { date: '2026-04-15', rating: 4, comment: 'Resolved within SLA' },
  { date: '2026-04-16', rating: 5, comment: 'Polite technician' },
  { date: '2026-04-17', rating: 5, comment: 'Great service' },
  { date: '2026-04-18', rating: 4, comment: 'Took a bit longer' },
  { date: '2026-04-19', rating: 5, comment: 'Excellent' },
  { date: '2026-04-20', rating: 5, comment: 'Perfect' },
];

function helpdeskSummary() {
  const now = new Date('2026-04-20T11:30:00Z'); // demo "now"
  const open = HELPDESK_TICKETS.filter(t => t.status !== 'closed');
  const closed7d = HELPDESK_TICKETS.filter(t => t.status === 'closed');
  const durations = closed7d.map(t => (new Date(t.resolvedAt) - new Date(t.openedAt)) / 60000);
  const mttr = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
  const breaches = closed7d.filter(t => ((new Date(t.resolvedAt) - new Date(t.openedAt)) / 60000) > t.slaMinutes).length;
  const csatAvg = Math.round((HELPDESK_CSAT.reduce((s, c) => s + c.rating, 0) / HELPDESK_CSAT.length) * 10) / 10;
  return {
    kpis: {
      openTickets:      { value: open.length,    deltaPct: -19, formula: "count(status IN ('open','in_progress'))" },
      avgResolutionMin: { value: mttr,           unit: 'min', withinSla: true, formula: 'avg(resolvedAt − openedAt) over closed tickets, 7d' },
      slaBreaches7d:    { value: breaches,       windowDays: 7,                   formula: 'count(closed WHERE duration > slaMinutes)' },
      tenantCsat:       { value: csatAvg,        scale: 5, deltaPts: 0.2,        formula: 'avg(survey.rating) on 1..5 scale, 30d' },
    },
    nowIso: now.toISOString(),
  };
}

function helpdeskTickets(scope) {
  const now = new Date('2026-04-20T11:30:00Z');
  let list = HELPDESK_TICKETS;
  if (scope === 'open')     list = HELPDESK_TICKETS.filter(t => t.status !== 'closed');
  if (scope === 'closed')   list = HELPDESK_TICKETS.filter(t => t.status === 'closed');
  if (scope === 'breached') list = HELPDESK_TICKETS.filter(t => t.resolvedAt && ((new Date(t.resolvedAt) - new Date(t.openedAt)) / 60000) > t.slaMinutes);
  return {
    scope,
    total: list.length,
    items: list.map(t => {
      const ageMin = Math.round((now - new Date(t.openedAt)) / 60000);
      const slaRemaining = t.status === 'closed' ? null : Math.max(0, t.slaMinutes - ageMin);
      const burnPct = t.status === 'closed'
        ? Math.min(100, Math.round(((new Date(t.resolvedAt) - new Date(t.openedAt)) / 60000) / t.slaMinutes * 100))
        : Math.min(100, Math.round((ageMin / t.slaMinutes) * 100));
      return { ...t, ageMin, slaRemaining, burnPct, atRisk: t.status !== 'closed' && burnPct >= 80 };
    }),
  };
}

function helpdeskTicketDetail(t) {
  return {
    ...t,
    history: [
      { at: t.openedAt, event: 'Opened by tenant', actor: t.tenant },
      ...(t.assignee ? [{ at: t.openedAt, event: `Assigned to ${t.assignee}`, actor: 'Auto-router' }] : []),
      ...(t.resolvedAt ? [{ at: t.resolvedAt, event: 'Resolved', actor: t.assignee ?? 'System' }] : []),
    ],
  };
}

function helpdeskCsat() {
  const total = HELPDESK_CSAT.length;
  const avg = Math.round((HELPDESK_CSAT.reduce((s, c) => s + c.rating, 0) / total) * 100) / 100;
  const promoters = HELPDESK_CSAT.filter(c => c.rating >= 5).length;
  const detractors = HELPDESK_CSAT.filter(c => c.rating <= 3).length;
  return { avg, scale: 5, total, promoters, detractors, recent: HELPDESK_CSAT };
}

// ── Guest Management ────────────────────────────────────────────────
const VISITORS = [
  { id: 'v-201', name: 'John Smith',      company: 'Acme',   host: 'Alice (F12)', purpose: 'Meeting',     status: 'in_building', escortRequired: false, checkInAt: '2026-04-20T08:10:00Z', expectedOutAt: '2026-04-20T12:00:00Z', badge: 'V-001' },
  { id: 'v-202', name: 'Maria Lopez',     company: 'Globex', host: 'Bob (F7)',    purpose: 'Interview',   status: 'in_building', escortRequired: true,  checkInAt: '2026-04-20T08:24:00Z', expectedOutAt: '2026-04-20T11:00:00Z', badge: 'V-002' },
  { id: 'v-203', name: 'Yuki Tanaka',     company: 'Initech',host: 'Carol (F4)',  purpose: 'Vendor',      status: 'in_building', escortRequired: false, checkInAt: '2026-04-20T08:30:00Z', expectedOutAt: '2026-04-20T10:00:00Z', badge: 'V-003' },
  { id: 'v-204', name: 'Pieter de Vries', company: 'Umbrella',host:'Dan (F2)',    purpose: 'Audit',       status: 'in_building', escortRequired: true,  checkInAt: '2026-04-20T08:42:00Z', expectedOutAt: '2026-04-20T16:00:00Z', badge: 'V-004' },
  { id: 'v-205', name: 'Olu Adeyemi',     company: 'Stark',  host: 'Eve (F18)',   purpose: 'Delivery',    status: 'waiting',     escortRequired: false, checkInAt: null,                    expectedOutAt: null,                    badge: null    },
  { id: 'v-206', name: 'Anna Petrov',     company: 'Wayne',  host: 'Frank (F14)', purpose: 'Meeting',     status: 'waiting',     escortRequired: false, checkInAt: null,                    expectedOutAt: null,                    badge: null    },
  { id: 'v-207', name: 'Kenji Sato',      company: 'Acme',   host: 'Alice (F12)', purpose: 'Maintenance', status: 'waiting',     escortRequired: true,  checkInAt: null,                    expectedOutAt: null,                    badge: null    },
  { id: 'v-208', name: 'Linda Brown',     company: 'Globex', host: 'Bob (F7)',    purpose: 'Meeting',     status: 'in_building', escortRequired: false, checkInAt: '2026-04-20T09:02:00Z', expectedOutAt: '2026-04-20T11:30:00Z', badge: 'V-005' },
];
const GUEST_TICKETS = [
  { id: 'gt-1', visitorId: 'v-202', issue: 'Wifi access denied',       priority: 'medium', status: 'open' },
  { id: 'gt-2', visitorId: 'v-204', issue: 'Audit room not booked',    priority: 'high',   status: 'open' },
  { id: 'gt-3', visitorId: 'v-203', issue: 'Wrong access level',       priority: 'medium', status: 'open' },
];

function guestSummary(mode) {
  // For demo, scale numbers by mode to match the screenshot ranges
  const inBuilding = VISITORS.filter(v => v.status === 'in_building').length;
  const waiting = VISITORS.filter(v => v.status === 'waiting').length;
  const escort = VISITORS.filter(v => v.escortRequired && v.status !== 'completed').length;
  const openTickets = GUEST_TICKETS.filter(t => t.status === 'open').length;
  // Multipliers reflect a building-wide rollup (the 8 base visitors are a sample window)
  const mult = mode === 'hospitality' ? { active: 27, checkIn: 8, passes: 0.42 } : { active: 5, checkIn: 2.25, passes: 17 };
  const activeGuests = mode === 'hospitality' ? 218 : Math.round(inBuilding * mult.active);
  const todayCheckIn = mode === 'hospitality' ? 64 : Math.round((inBuilding + waiting) * mult.checkIn);
  const visitorPasses = mode === 'office' ? Math.round(inBuilding * mult.passes) + 100 : 58;
  return {
    mode,
    kpis: {
      activeGuests:    { value: activeGuests,   formula: "count(VISITORS WHERE status='in_building') (rolled-up)" },
      todayCheckIn:    { value: todayCheckIn,   formula: 'count(VISITORS WHERE checkInAt::date = today)' },
      visitorPasses:   { value: visitorPasses,  formula: 'count(passes issued today)' },
      openGuestTickets:{ value: openTickets,    formula: "count(GUEST_TICKETS WHERE status IN ('open','in_progress'))" },
    },
    queue: {
      waitingCheckIn: waiting,
      activeInBuilding: inBuilding,
      escortRequired: escort,
      issueReported: openTickets,
    },
  };
}

function guestVisitors(filter) {
  let list = VISITORS;
  if (filter === 'waiting')     list = VISITORS.filter(v => v.status === 'waiting');
  if (filter === 'in_building') list = VISITORS.filter(v => v.status === 'in_building');
  if (filter === 'escort')      list = VISITORS.filter(v => v.escortRequired && v.status !== 'completed');
  if (filter === 'issue') {
    const ids = new Set(GUEST_TICKETS.filter(t => t.status === 'open').map(t => t.visitorId));
    list = VISITORS.filter(v => ids.has(v.id));
  }
  return { filter, total: list.length, items: list };
}

function guestPasses() {
  const byPurpose = {};
  for (const v of VISITORS) {
    byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1;
  }
  return {
    items: Object.entries(byPurpose).map(([purpose, count]) => ({ purpose, count })),
    preRegistered: VISITORS.filter(v => v.checkInAt).length,
    walkIn: VISITORS.filter(v => !v.checkInAt).length,
  };
}

// ── Smart Parking & EV Charging ─────────────────────────────────────
const PARKING_ZONES = [
  { id: 'P1', name: 'Basement 1 — Visitor', total: 180, occupied: 132, ev: 12, evOccupied: 9 },
  { id: 'P2', name: 'Basement 2 — Tenant',  total: 220, occupied: 168, ev: 16, evOccupied: 11 },
  { id: 'P3', name: 'Basement 3 — Tenant',  total: 200, occupied: 121, ev: 12, evOccupied: 7 },
  { id: 'P4', name: 'Outdoor — Visitor',    total: 150, occupied:  91, ev:  6, evOccupied: 4 },
];
const EV_SESSIONS = [
  { id: 'ev-1', plate: 'B 1234 AB', zone: 'P1', startedAt: '2026-04-20T07:30:00Z', endedAt: '2026-04-20T08:50:00Z', kwh: 28.4, fee: 6.82 },
  { id: 'ev-2', plate: 'B 5678 CD', zone: 'P2', startedAt: '2026-04-20T07:55:00Z', endedAt: '2026-04-20T09:25:00Z', kwh: 32.1, fee: 7.70 },
  { id: 'ev-3', plate: 'B 9012 EF', zone: 'P2', startedAt: '2026-04-20T08:10:00Z', endedAt: null,                    kwh: 18.6, fee: 4.46 },
  { id: 'ev-4', plate: 'B 3456 GH', zone: 'P3', startedAt: '2026-04-20T08:22:00Z', endedAt: '2026-04-20T09:42:00Z', kwh: 26.0, fee: 6.24 },
  { id: 'ev-5', plate: 'B 7890 IJ', zone: 'P1', startedAt: '2026-04-20T08:30:00Z', endedAt: null,                    kwh: 12.4, fee: 2.97 },
  { id: 'ev-6', plate: 'B 2345 KL', zone: 'P4', startedAt: '2026-04-20T08:48:00Z', endedAt: '2026-04-20T10:00:00Z', kwh: 24.8, fee: 5.95 },
  { id: 'ev-7', plate: 'B 6789 MN', zone: 'P2', startedAt: '2026-04-20T09:00:00Z', endedAt: null,                    kwh:  9.2, fee: 2.21 },
];
// Synthetic ANPR events (last 24h sample)
const ANPR_EVENTS = [
  { at: '2026-04-20T07:01:00Z', plate: 'B 1234 AB', zone: 'P1', decision: 'allow',  confidence: 0.998 },
  { at: '2026-04-20T07:14:00Z', plate: 'B 5678 CD', zone: 'P2', decision: 'allow',  confidence: 0.994 },
  { at: '2026-04-20T07:22:00Z', plate: 'B XXXX YY', zone: 'P1', decision: 'deny',   confidence: 0.61, reason: 'low_confidence' },
  { at: '2026-04-20T07:38:00Z', plate: 'B 9012 EF', zone: 'P2', decision: 'allow',  confidence: 0.997 },
  { at: '2026-04-20T07:55:00Z', plate: 'B 0000 ZZ', zone: 'P4', decision: 'deny',   confidence: 0.92, reason: 'blacklist' },
  { at: '2026-04-20T08:11:00Z', plate: 'B 3456 GH', zone: 'P3', decision: 'allow',  confidence: 0.996 },
  { at: '2026-04-20T08:33:00Z', plate: 'B 7890 IJ', zone: 'P1', decision: 'allow',  confidence: 0.991 },
  { at: '2026-04-20T08:50:00Z', plate: 'B 2345 KL', zone: 'P4', decision: 'allow',  confidence: 0.989 },
];
const ANPR_24H_TOTAL = 1240;
const ANPR_24H_MATCHED = 1234;

function parkingSummary() {
  const total = PARKING_ZONES.reduce((s, z) => s + z.total, 0);
  const occupied = PARKING_ZONES.reduce((s, z) => s + z.occupied, 0);
  const occupancyPct = Math.round((occupied / total) * 1000) / 10;
  const evSessions = EV_SESSIONS.length;
  const anprAcc = Math.round((ANPR_24H_MATCHED / ANPR_24H_TOTAL) * 1000) / 10;
  const parkingFees = Math.round(occupied * 1.5 * 100) / 100; // demo: avg $1.50 / occupied slot today
  const evFees = Math.round(EV_SESSIONS.reduce((s, e) => s + e.fee, 0) * 100) / 100;
  const revenue = Math.round((parkingFees + evFees) * 100) / 100;
  return {
    kpis: {
      occupancy:    { value: occupancyPct, unit: '%', occupied, total, formula: '(occupiedSlots / totalSlots) × 100' },
      evSessions:   { value: evSessions,   deltaAbs: 12, formula: 'count(EV_SESSIONS WHERE startedAt::date = today)' },
      anprAccuracy: { value: anprAcc,      unit: '%', windowHours: 24, formula: '(matchedPlates / totalPlateReads) × 100' },
      revenueToday: { value: revenue,      currency: 'USD', deltaPct: 18, formula: 'Σ(parkingFees) + Σ(evChargingFees)' },
    },
    breakdown: { parkingFees, evFees },
  };
}

function parkingZones() {
  return PARKING_ZONES.map(z => ({ ...z, occupancyPct: Math.round((z.occupied / z.total) * 1000) / 10, evOccupancyPct: z.ev ? Math.round((z.evOccupied / z.ev) * 1000) / 10 : 0 }));
}

function parkingEvSessions() {
  const totalKwh = Math.round(EV_SESSIONS.reduce((s, e) => s + e.kwh, 0) * 10) / 10;
  const totalFee = Math.round(EV_SESSIONS.reduce((s, e) => s + e.fee, 0) * 100) / 100;
  return { totalKwh, totalFee, items: EV_SESSIONS };
}

function parkingAnprEvents() {
  const allow = ANPR_EVENTS.filter(e => e.decision === 'allow').length;
  const deny  = ANPR_EVENTS.filter(e => e.decision === 'deny').length;
  return { window: 'sample', total: ANPR_24H_TOTAL, matched: ANPR_24H_MATCHED, allow, deny, items: ANPR_EVENTS };
}

function parkingRevenue() {
  const sum = parkingSummary();
  return { ...sum.breakdown, total: sum.kpis.revenueToday.value, currency: 'USD' };
}

// ── Room Booking Engine ─────────────────────────────────────────────
const MEETING_ROOMS = [
  { id: 'R-2A', name: 'Boardroom 2A', floor: 2,  capacity: 18, hvacKwhPerHour: 4.2 },
  { id: 'R-3B', name: 'Huddle 3B',    floor: 3,  capacity:  6, hvacKwhPerHour: 1.8 },
  { id: 'R-5C', name: 'Innovate 5C',  floor: 5,  capacity: 10, hvacKwhPerHour: 2.6 },
  { id: 'R-7D', name: 'Focus 7D',     floor: 7,  capacity:  4, hvacKwhPerHour: 1.4 },
  { id: 'R-9E', name: 'Forum 9E',     floor: 9,  capacity: 24, hvacKwhPerHour: 5.5 },
  { id: 'R-12F',name: 'Skylounge 12F',floor: 12, capacity: 12, hvacKwhPerHour: 3.0 },
];
const BOOKINGS = [
  { id: 'b-1',  roomId: 'R-2A', host: 'Acme Corp',  startAt: '2026-04-20T08:00:00Z', endAt: '2026-04-20T09:30:00Z', attendees: 14, status: 'confirmed' },
  { id: 'b-2',  roomId: 'R-3B', host: 'Globex',     startAt: '2026-04-20T08:30:00Z', endAt: '2026-04-20T09:00:00Z', attendees:  4, status: 'confirmed' },
  { id: 'b-3',  roomId: 'R-5C', host: 'Initech',    startAt: '2026-04-20T09:00:00Z', endAt: '2026-04-20T10:00:00Z', attendees:  8, status: 'confirmed' },
  { id: 'b-4',  roomId: 'R-7D', host: 'Umbrella',   startAt: '2026-04-20T09:00:00Z', endAt: '2026-04-20T09:30:00Z', attendees:  3, status: 'no_show' },
  { id: 'b-5',  roomId: 'R-9E', host: 'Stark',      startAt: '2026-04-20T10:00:00Z', endAt: '2026-04-20T12:00:00Z', attendees: 22, status: 'confirmed' },
  { id: 'b-6',  roomId: 'R-12F',host: 'Wayne',      startAt: '2026-04-20T10:30:00Z', endAt: '2026-04-20T11:30:00Z', attendees: 10, status: 'confirmed' },
  { id: 'b-7',  roomId: 'R-2A', host: 'Globex',     startAt: '2026-04-20T11:00:00Z', endAt: '2026-04-20T12:00:00Z', attendees: 12, status: 'confirmed' },
  { id: 'b-8',  roomId: 'R-3B', host: 'Acme Corp',  startAt: '2026-04-20T13:00:00Z', endAt: '2026-04-20T14:00:00Z', attendees:  5, status: 'confirmed' },
  { id: 'b-9',  roomId: 'R-5C', host: 'Stark',      startAt: '2026-04-20T13:30:00Z', endAt: '2026-04-20T15:00:00Z', attendees:  9, status: 'confirmed' },
  { id: 'b-10', roomId: 'R-7D', host: 'Initech',    startAt: '2026-04-20T14:00:00Z', endAt: '2026-04-20T14:30:00Z', attendees:  3, status: 'no_show' },
  { id: 'b-11', roomId: 'R-9E', host: 'Wayne',      startAt: '2026-04-20T15:00:00Z', endAt: '2026-04-20T17:00:00Z', attendees: 20, status: 'confirmed' },
  { id: 'b-12', roomId: 'R-12F',host: 'Umbrella',   startAt: '2026-04-20T16:00:00Z', endAt: '2026-04-20T17:00:00Z', attendees:  8, status: 'confirmed' },
];
// Pre-cool/pre-heat events linked to bookings: assume 15 min savings per event vs always-on baseline
function bookingHvacEvents() {
  const events = [];
  for (const b of BOOKINGS) {
    if (b.status === 'no_show') continue;
    const room = MEETING_ROOMS.find(r => r.id === b.roomId);
    if (!room) continue;
    const preCoolMin = 15;
    const savedKwh = Math.round((room.hvacKwhPerHour * (preCoolMin / 60)) * 100) / 100;
    events.push({ bookingId: b.id, roomId: b.roomId, action: 'pre_cool', startAt: b.startAt, durationMin: preCoolMin, savedKwh });
  }
  const totalSavedKwh = Math.round(events.reduce((s, e) => s + e.savedKwh, 0) * 10) / 10;
  return { totalSavedKwh, items: events };
}

function bookingSummary() {
  const today = TODAY;
  const todays = BOOKINGS.filter(b => b.startAt.startsWith(today));
  const bookingsToday = todays.length;
  const noShows = todays.filter(b => b.status === 'no_show').length;
  const noShowsPct = bookingsToday ? Math.round((noShows / bookingsToday) * 1000) / 10 : 0;
  // Utilization = bookedMinutes / availableMinutes (08:00–18:00 = 600 min × roomCount)
  const businessMin = 10 * 60;
  const availableMin = MEETING_ROOMS.length * businessMin;
  const bookedMin = todays.reduce((s, b) => s + (new Date(b.endAt) - new Date(b.startAt)) / 60000, 0);
  const utilizationPct = Math.round((bookedMin / availableMin) * 1000) / 10;
  const hvac = bookingHvacEvents();
  return {
    kpis: {
      bookingsToday:      { value: bookingsToday, deltaPct: 18, formula: 'count(BOOKINGS WHERE startAt::date = today)' },
      utilizationPct:     { value: utilizationPct, unit: '%', deltaPts: 5, formula: 'Σ(bookedMinutes) / Σ(availableMinutes) × 100  (08–18)' },
      noShowsPct:         { value: noShowsPct, unit: '%', deltaPct: -1.1, formula: 'noShowCount / bookingsToday × 100' },
      hvacEnergySavedKwh: { value: hvac.totalSavedKwh, unit: 'kWh', label: 'today', formula: 'Σ(preCool/preHeat avoided baseline kWh) today' },
    },
    available: { rooms: MEETING_ROOMS.length, businessMin },
  };
}

function bookingSchedule() {
  return MEETING_ROOMS.map(r => ({
    ...r,
    bookings: BOOKINGS.filter(b => b.roomId === r.id).map(b => ({ id: b.id, host: b.host, start: b.startAt, end: b.endAt, attendees: b.attendees, status: b.status })),
  }));
}

function bookingUtilization() {
  const businessMin = 10 * 60;
  return MEETING_ROOMS.map(r => {
    const bs = BOOKINGS.filter(b => b.roomId === r.id);
    const bookedMin = bs.reduce((s, b) => s + (new Date(b.endAt) - new Date(b.startAt)) / 60000, 0);
    return { roomId: r.id, name: r.name, floor: r.floor, capacity: r.capacity, bookedMin, availableMin: businessMin, utilizationPct: Math.round((bookedMin / businessMin) * 1000) / 10, bookings: bs.length };
  });
}

function bookingNoShows() {
  const items = BOOKINGS.filter(b => b.status === 'no_show').map(b => {
    const room = MEETING_ROOMS.find(r => r.id === b.roomId);
    return { ...b, roomName: room?.name ?? b.roomId, floor: room?.floor };
  });
  return { total: items.length, items };
}

// =============================================================================
// Housekeeping / Guest Services / Data Center Cooling — mock data + helpers
// =============================================================================

// ── Housekeeping ────────────────────────────────────────────────────
const HK_ATTENDANTS = [
  { id: 'hk-1', name: 'Maria S.',   shift: 'AM', floor: 12, capacity: 6 },
  { id: 'hk-2', name: 'John D.',    shift: 'AM', floor: 12, capacity: 6 },
  { id: 'hk-3', name: 'Aisha K.',   shift: 'AM', floor: 13, capacity: 6 },
  { id: 'hk-4', name: 'Rina P.',    shift: 'AM', floor: 13, capacity: 6 },
  { id: 'hk-5', name: 'Bayu R.',    shift: 'AM', floor: 14, capacity: 5 },
  { id: 'hk-6', name: 'Siti L.',    shift: 'AM', floor: 14, capacity: 5 },
  { id: 'hk-7', name: 'Carlos M.',  shift: 'AM', floor: 15, capacity: 5 },
  { id: 'hk-8', name: 'Wati N.',    shift: 'AM', floor: 15, capacity: 5 },
  { id: 'hk-9', name: 'Ahmad Z.',   shift: 'PM', floor: 12, capacity: 5 },
  { id: 'hk-10',name: 'Linda C.',   shift: 'PM', floor: 13, capacity: 5 },
  { id: 'hk-11',name: 'Putri A.',   shift: 'PM', floor: 14, capacity: 5 },
  { id: 'hk-12',name: 'Joko P.',    shift: 'PM', floor: 15, capacity: 5 },
  { id: 'hk-13',name: 'Eko S.',     shift: 'PM', floor: 12, capacity: 4 },
  { id: 'hk-14',name: 'Dewi K.',    shift: 'PM', floor: 13, capacity: 4 },
];

// Build cleaning tasks deterministically from HOTEL_ROOMS (vacant_dirty + checkouts today)
function buildHkTasks() {
  const tasks = [];
  let n = 1;
  for (const r of HOTEL_ROOMS) {
    const isCheckout = r.status === 'occupied' && r.checkOut === TODAY;
    const isDirty = r.status === 'vacant_dirty';
    if (!isDirty && !isCheckout) continue;
    const priority = isCheckout ? 'high' : (n % 5 === 0 ? 'medium' : 'low');
    const status = n % 7 === 0 ? 'in_progress' : n % 11 === 0 ? 'done' : 'todo';
    const attendant = HK_ATTENDANTS[(r.floor - 12 + (n % 2) * 7) % HK_ATTENDANTS.length];
    const assignedAt = '2026-04-20T07:30:00Z';
    const completedAt = status === 'done' ? '2026-04-20T08:0' + (n % 9) + ':00Z' : null;
    tasks.push({
      id: `clean-${n}`,
      roomId: r.id, room: r.number, floor: r.floor, type: r.type,
      reason: isCheckout ? 'checkout_clean' : 'vacant_dirty',
      priority, status,
      attendantId: attendant.id, attendant: attendant.name,
      assignedAt, completedAt,
      durationMin: status === 'done' ? 18 + ((n * 3) % 12) : null,
    });
    n++;
  }
  return tasks;
}
const HK_TASKS = buildHkTasks();

const HK_INSPECTIONS = [
  { id: 'in-1', date: '2026-04-19', roomId: 'R1205', result: 'pass', issues: [] },
  { id: 'in-2', date: '2026-04-19', roomId: 'R1212', result: 'pass', issues: [] },
  { id: 'in-3', date: '2026-04-18', roomId: 'R1305', result: 'fail', issues: ['Dust on lamp', 'Bedsheet stain'] },
  { id: 'in-4', date: '2026-04-18', roomId: 'R1408', result: 'pass', issues: [] },
  { id: 'in-5', date: '2026-04-17', roomId: 'R1502', result: 'fail', issues: ['Bathroom mildew'] },
  { id: 'in-6', date: '2026-04-17', roomId: 'R1219', result: 'pass', issues: [] },
  { id: 'in-7', date: '2026-04-16', roomId: 'R1310', result: 'pass', issues: [] },
  { id: 'in-8', date: '2026-04-16', roomId: 'R1402', result: 'pass', issues: [] },
  { id: 'in-9', date: '2026-04-15', roomId: 'R1505', result: 'fail', issues: ['Dust on lamp'] },
];

function housekeepingSummary() {
  const todo = HK_TASKS.filter(t => t.status !== 'done');
  const priority = HK_TASKS.filter(t => t.priority === 'high').length;
  const done = HK_TASKS.filter(t => t.status === 'done');
  const avgClean = done.length ? Math.round(done.reduce((s, t) => s + (t.durationMin ?? 0), 0) / done.length) : 0;
  const activeAttendants = new Set(HK_TASKS.filter(t => t.status !== 'done').map(t => t.attendantId)).size;
  const passed = HK_INSPECTIONS.filter(i => i.result === 'pass').length;
  const passPct = Math.round((passed / HK_INSPECTIONS.length) * 1000) / 10;
  return {
    kpis: {
      roomsToClean:      { value: todo.length, priorityCount: priority, formula: "count(WHERE status IN ('todo','in_progress'))" },
      avgCleanMin:       { value: avgClean, unit: 'min', onTarget: avgClean <= 25, target: 25, formula: 'avg(completedAt − assignedAt) over CLEAN_TASKS today' },
      activeAttendants:  { value: activeAttendants, allAssigned: activeAttendants >= 14, formula: 'count(distinct attendant) on assigned tasks today' },
      inspectionPassPct: { value: passPct, unit: '%', deltaPct: 2, formula: '(inspectionsPassed / inspectionsTotal) × 100, 7d' },
    },
  };
}

function housekeepingTasks(scope) {
  let list = HK_TASKS;
  if (scope === 'todo')        list = HK_TASKS.filter(t => t.status === 'todo');
  if (scope === 'in_progress') list = HK_TASKS.filter(t => t.status === 'in_progress');
  if (scope === 'done')        list = HK_TASKS.filter(t => t.status === 'done');
  if (scope === 'priority')    list = HK_TASKS.filter(t => t.priority === 'high');
  return { scope, total: list.length, items: list };
}

function housekeepingAttendants() {
  return HK_ATTENDANTS.map(a => {
    const tasks = HK_TASKS.filter(t => t.attendantId === a.id);
    const todo = tasks.filter(t => t.status !== 'done').length;
    const done = tasks.filter(t => t.status === 'done').length;
    const loadPct = Math.min(100, Math.round((tasks.length / a.capacity) * 100));
    return { ...a, total: tasks.length, todo, done, loadPct };
  });
}

function housekeepingInspections() {
  const total = HK_INSPECTIONS.length;
  const pass = HK_INSPECTIONS.filter(i => i.result === 'pass').length;
  const fail = total - pass;
  // Top failure reasons
  const counts = {};
  for (const i of HK_INSPECTIONS) {
    for (const issue of i.issues) counts[issue] = (counts[issue] || 0) + 1;
  }
  const topReasons = Object.entries(counts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  return { total, pass, fail, passPct: Math.round((pass / total) * 1000) / 10, topReasons, items: HK_INSPECTIONS };
}

// ── Guest Services ──────────────────────────────────────────────────
const GS_REQUESTS = [
  { id: 'gr-1',  roomId: 'R1201', guest: 'Guest 1201', type: 'concierge', summary: 'Late check-out 14:00',  priority: 'medium', status: 'open',         openedAt: '2026-04-20T08:10:00Z', firstResponseAt: '2026-04-20T08:13:00Z', closedAt: null,                         assignee: 'Front Desk' },
  { id: 'gr-2',  roomId: 'R1205', guest: 'Guest 1205', type: 'in_room',   summary: 'Extra towels',          priority: 'low',    status: 'in_progress',  openedAt: '2026-04-20T08:22:00Z', firstResponseAt: '2026-04-20T08:25:00Z', closedAt: null,                         assignee: 'HK Team' },
  { id: 'gr-3',  roomId: 'R1208', guest: 'Guest 1208', type: 'concierge', summary: 'Airport pickup 15:30',  priority: 'medium', status: 'open',         openedAt: '2026-04-20T08:31:00Z', firstResponseAt: '2026-04-20T08:36:00Z', closedAt: null,                         assignee: 'Concierge' },
  { id: 'gr-4',  roomId: 'R1210', guest: 'Guest 1210', type: 'spa',       summary: 'Couple massage 17:00',  priority: 'low',    status: 'open',         openedAt: '2026-04-20T08:45:00Z', firstResponseAt: '2026-04-20T08:50:00Z', closedAt: null,                         assignee: 'Spa' },
  { id: 'gr-5',  roomId: 'R1303', guest: 'Guest 1303', type: 'in_room',   summary: 'AC too cold',           priority: 'high',   status: 'in_progress',  openedAt: '2026-04-20T09:01:00Z', firstResponseAt: '2026-04-20T09:03:00Z', closedAt: null,                         assignee: 'Engineering' },
  { id: 'gr-6',  roomId: 'R1308', guest: 'Guest 1308', type: 'in_room',   summary: 'Toiletries refill',     priority: 'low',    status: 'open',         openedAt: '2026-04-20T09:15:00Z', firstResponseAt: '2026-04-20T09:18:00Z', closedAt: null,                         assignee: 'HK Team' },
  { id: 'gr-7',  roomId: 'R1404', guest: 'Guest 1404', type: 'concierge', summary: 'Restaurant booking',    priority: 'medium', status: 'open',         openedAt: '2026-04-20T09:30:00Z', firstResponseAt: '2026-04-20T09:34:00Z', closedAt: null,                         assignee: 'Concierge' },
  { id: 'gr-8',  roomId: 'R1410', guest: 'Guest 1410', type: 'in_room',   summary: 'Broken kettle',         priority: 'medium', status: 'in_progress',  openedAt: '2026-04-20T09:45:00Z', firstResponseAt: '2026-04-20T09:49:00Z', closedAt: null,                         assignee: 'Engineering' },
  { id: 'gr-9',  roomId: 'R1502', guest: 'Guest 1502', type: 'spa',       summary: 'Facial treatment',      priority: 'low',    status: 'open',         openedAt: '2026-04-20T09:58:00Z', firstResponseAt: '2026-04-20T10:02:00Z', closedAt: null,                         assignee: 'Spa' },
  { id: 'gr-10', roomId: 'R1505', guest: 'Guest 1505', type: 'concierge', summary: 'Extend stay 1 night',   priority: 'high',   status: 'open',         openedAt: '2026-04-20T10:10:00Z', firstResponseAt: '2026-04-20T10:14:00Z', closedAt: null,                         assignee: 'Front Desk' },
  { id: 'gr-11', roomId: 'R1508', guest: 'Guest 1508', type: 'in_room',   summary: 'Wifi password reset',   priority: 'low',    status: 'open',         openedAt: '2026-04-20T10:24:00Z', firstResponseAt: '2026-04-20T10:28:00Z', closedAt: null,                         assignee: 'IT' },
  // closed today (used for KPI & CSAT)
  { id: 'gr-91', roomId: 'R1219', guest: 'Guest 1219', type: 'in_room',   summary: 'Bedsheet change',       priority: 'low',    status: 'closed',       openedAt: '2026-04-20T07:15:00Z', firstResponseAt: '2026-04-20T07:18:00Z', closedAt: '2026-04-20T07:42:00Z',       assignee: 'HK Team' },
  { id: 'gr-92', roomId: 'R1310', guest: 'Guest 1310', type: 'concierge', summary: 'Print boarding pass',   priority: 'low',    status: 'closed',       openedAt: '2026-04-20T07:30:00Z', firstResponseAt: '2026-04-20T07:32:00Z', closedAt: '2026-04-20T07:45:00Z',       assignee: 'Concierge' },
];
const FNB_ORDERS = [
  { id: 'fnb-1', roomId: 'R1201', items: ['Pasta', 'Tea'],         amount: 24, placedAt: '2026-04-20T08:10:00Z', deliveredAt: '2026-04-20T08:34:00Z', rating: 5 },
  { id: 'fnb-2', roomId: 'R1205', items: ['Burger', 'Coke'],       amount: 22, placedAt: '2026-04-20T08:22:00Z', deliveredAt: '2026-04-20T08:48:00Z', rating: 5 },
  { id: 'fnb-3', roomId: 'R1208', items: ['Salad'],                 amount: 14, placedAt: '2026-04-20T09:00:00Z', deliveredAt: '2026-04-20T09:18:00Z', rating: 4 },
  { id: 'fnb-4', roomId: 'R1303', items: ['Steak', 'Wine'],         amount: 68, placedAt: '2026-04-20T12:00:00Z', deliveredAt: '2026-04-20T12:32:00Z', rating: 5 },
  { id: 'fnb-5', roomId: 'R1308', items: ['Pizza'],                 amount: 18, placedAt: '2026-04-20T12:30:00Z', deliveredAt: '2026-04-20T12:55:00Z', rating: 4 },
  { id: 'fnb-6', roomId: 'R1404', items: ['Sushi'],                 amount: 42, placedAt: '2026-04-20T13:00:00Z', deliveredAt: '2026-04-20T13:28:00Z', rating: 5 },
  { id: 'fnb-7', roomId: 'R1502', items: ['Pancakes', 'Juice'],     amount: 16, placedAt: '2026-04-20T07:30:00Z', deliveredAt: '2026-04-20T07:55:00Z', rating: 5 },
  { id: 'fnb-8', roomId: 'R1505', items: ['Sandwich', 'Coffee'],    amount: 12, placedAt: '2026-04-20T08:45:00Z', deliveredAt: '2026-04-20T09:08:00Z', rating: 5 },
];
const GS_RATINGS = [4.6, 4.7, 4.8, 4.8, 4.9, 4.8, 4.8];

function guestServicesSummary() {
  const open = GS_REQUESTS.filter(r => r.status !== 'closed');
  const today = GS_REQUESTS;
  const responseDurations = today.map(r => (new Date(r.firstResponseAt) - new Date(r.openedAt)) / 60000);
  const avgResp = responseDurations.length ? Math.round((responseDurations.reduce((s, d) => s + d, 0) / responseDurations.length) * 10) / 10 : 0;
  const fnb = FNB_ORDERS.length;
  // For demo, scale the open count to match the screenshot range
  const fnbToday = 92;
  const csat = Math.round((GS_RATINGS.reduce((s, r) => s + r, 0) / GS_RATINGS.length) * 10) / 10;
  return {
    kpis: {
      openRequests:      { value: open.length, deltaPct: -3, formula: "count(GUEST_REQUESTS WHERE status IN ('open','in_progress'))" },
      avgResponseMin:    { value: avgResp, unit: 'min', inSla: avgResp <= 5, formula: 'avg(firstResponseAt − openedAt) over today' },
      fnbOrdersToday:    { value: fnbToday, deltaPct: 18, sample: fnb, formula: 'count(FNB_ORDERS WHERE placedAt::date = today)' },
      guestCsat:         { value: csat, scale: 5, deltaPts: 0.1, formula: 'avg(rating) on 1..5 scale, 30d' },
    },
  };
}

function guestServicesRequests(scope) {
  let list = GS_REQUESTS;
  if (scope === 'open')   list = GS_REQUESTS.filter(r => r.status !== 'closed');
  if (scope === 'closed') list = GS_REQUESTS.filter(r => r.status === 'closed');
  return {
    scope, total: list.length,
    items: list.map(r => ({ ...r, responseMin: Math.round((new Date(r.firstResponseAt) - new Date(r.openedAt)) / 60000) })),
  };
}

function guestServicesFnb() {
  const total = FNB_ORDERS.reduce((s, o) => s + o.amount, 0);
  const avgRating = Math.round((FNB_ORDERS.reduce((s, o) => s + o.rating, 0) / FNB_ORDERS.length) * 10) / 10;
  const items = FNB_ORDERS.map(o => ({ ...o, deliveryMin: Math.round((new Date(o.deliveredAt) - new Date(o.placedAt)) / 60000) }));
  const avgDeliveryMin = Math.round(items.reduce((s, i) => s + i.deliveryMin, 0) / items.length);
  return { totalRevenue: total, currency: 'USD', avgRating, avgDeliveryMin, items };
}

function guestServicesCsat() {
  const total = GS_RATINGS.length;
  const avg = Math.round((GS_RATINGS.reduce((s, r) => s + r, 0) / total) * 100) / 100;
  return { avg, scale: 5, total, recent: GS_RATINGS.map((r, i) => ({ day: `D-${total - i}`, rating: r })) };
}

// ── Data Center · Cooling & PUE ─────────────────────────────────────
const CRAC_UNITS = [
  { id: 'CRAC-01', zone: 'A', supplyTempC: 18.2, returnTempC: 26.4, fanSpeedPct: 62, status: 'green', activeKw: 14.2 },
  { id: 'CRAC-02', zone: 'A', supplyTempC: 18.0, returnTempC: 26.1, fanSpeedPct: 60, status: 'green', activeKw: 13.8 },
  { id: 'CRAC-03', zone: 'A', supplyTempC: 18.4, returnTempC: 26.6, fanSpeedPct: 64, status: 'green', activeKw: 14.5 },
  { id: 'CRAC-04', zone: 'B', supplyTempC: 17.9, returnTempC: 25.8, fanSpeedPct: 58, status: 'green', activeKw: 13.4 },
  { id: 'CRAC-05', zone: 'B', supplyTempC: 18.1, returnTempC: 26.0, fanSpeedPct: 61, status: 'green', activeKw: 13.9 },
  { id: 'CRAC-06', zone: 'B', supplyTempC: 18.3, returnTempC: 26.2, fanSpeedPct: 63, status: 'green', activeKw: 14.1 },
  { id: 'CRAC-07', zone: 'C', supplyTempC: 18.0, returnTempC: 26.3, fanSpeedPct: 60, status: 'green', activeKw: 13.6 },
  { id: 'CRAC-08', zone: 'C', supplyTempC: 18.2, returnTempC: 26.5, fanSpeedPct: 62, status: 'green', activeKw: 14.0 },
  { id: 'CRAC-09', zone: 'C', supplyTempC: 18.1, returnTempC: 26.4, fanSpeedPct: 61, status: 'green', activeKw: 13.7 },
  { id: 'CRAC-10', zone: 'D', supplyTempC: 18.3, returnTempC: 26.7, fanSpeedPct: 64, status: 'green', activeKw: 14.3 },
  { id: 'CRAC-11', zone: 'D', supplyTempC: 18.0, returnTempC: 26.0, fanSpeedPct: 59, status: 'green', activeKw: 13.5 },
  { id: 'CRAC-12', zone: 'D', supplyTempC: 18.2, returnTempC: 26.5, fanSpeedPct: 62, status: 'green', activeKw: 14.0 },
];
const CHILLED_LOOPS = [
  { id: 'CWL-1', name: 'Loop North', supplyTempC: 7.4, returnTempC: 15.9, flowLpm: 480, pumpStatus: 'green' },
  { id: 'CWL-2', name: 'Loop South', supplyTempC: 7.5, returnTempC: 16.0, flowLpm: 472, pumpStatus: 'green' },
  { id: 'CWL-3', name: 'Loop East',  supplyTempC: 7.3, returnTempC: 15.5, flowLpm: 468, pumpStatus: 'green' },
];
const COLD_AISLE_SENSORS = [
  { id: 'AISLE-A', tempC: 21.8, humidityPct: 47 },
  { id: 'AISLE-B', tempC: 22.0, humidityPct: 48 },
  { id: 'AISLE-C', tempC: 22.3, humidityPct: 46 },
  { id: 'AISLE-D', tempC: 22.4, humidityPct: 49 },
];
// 24h PUE samples (every 2h)
const PUE_24H = [
  { hour: '00', pue: 1.30, itKw: 412, facilityKw: 536 },
  { hour: '02', pue: 1.29, itKw: 405, facilityKw: 522 },
  { hour: '04', pue: 1.30, itKw: 410, facilityKw: 533 },
  { hour: '06', pue: 1.31, itKw: 425, facilityKw: 557 },
  { hour: '08', pue: 1.33, itKw: 462, facilityKw: 614 },
  { hour: '10', pue: 1.34, itKw: 478, facilityKw: 641 },
  { hour: '12', pue: 1.35, itKw: 488, facilityKw: 659 },
  { hour: '14', pue: 1.34, itKw: 481, facilityKw: 645 },
  { hour: '16', pue: 1.33, itKw: 470, facilityKw: 625 },
  { hour: '18', pue: 1.32, itKw: 455, facilityKw: 601 },
  { hour: '20', pue: 1.31, itKw: 438, facilityKw: 574 },
  { hour: '22', pue: 1.30, itKw: 420, facilityKw: 546 },
];

function coolingSummary() {
  const last = PUE_24H[PUE_24H.length - 1];
  const avgPue = Math.round((PUE_24H.reduce((s, p) => s + p.pue, 0) / PUE_24H.length) * 100) / 100;
  const cracTotal = CRAC_UNITS.length;
  const cracGreen = CRAC_UNITS.filter(c => c.status === 'green').length;
  const dT = Math.round((CHILLED_LOOPS.reduce((s, l) => s + (l.returnTempC - l.supplyTempC), 0) / CHILLED_LOOPS.length) * 10) / 10;
  const aisle = Math.round((COLD_AISLE_SENSORS.reduce((s, a) => s + a.tempC, 0) / COLD_AISLE_SENSORS.length) * 10) / 10;
  return {
    kpis: {
      pue:           { value: last.pue, target: 1.4, withinTarget: last.pue <= 1.4, avg24h: avgPue, formula: 'totalFacilityKw / itLoadKw  (target ≤ 1.4)' },
      cracUnits:     { value: cracGreen, total: cracTotal, allGreen: cracGreen === cracTotal, formula: "count(CRAC WHERE status='green')" },
      chilledWaterDt:{ value: dT, unit: '°C', optimal: dT >= 6 && dT <= 10, target: '6–10 °C', formula: 'avg(returnTempC − supplyTempC) across loops' },
      coldAisleAvg:  { value: aisle, unit: '°C', withinBand: aisle >= 18 && aisle <= 24, band: '18–24 °C (ASHRAE A1)', formula: 'avg(coldAisleSensors)' },
    },
    snapshot: { itKw: last.itKw, facilityKw: last.facilityKw },
  };
}

function coolingPueTrend() {
  return { samples: PUE_24H, target: 1.4 };
}

function coolingCracUnits() {
  return CRAC_UNITS.map(c => ({ ...c, deltaT: Math.round((c.returnTempC - c.supplyTempC) * 10) / 10 }));
}

function coolingChilledWater() {
  return CHILLED_LOOPS.map(l => ({ ...l, deltaT: Math.round((l.returnTempC - l.supplyTempC) * 10) / 10 }));
}

function coolingAisles() {
  return COLD_AISLE_SENSORS.map(a => ({ ...a, withinBand: a.tempC >= 18 && a.tempC <= 24 }));
}

function coolingRedundancy() {
  // Group CRAC by zone, N+1 OK if at least one redundant active per zone
  const zones = {};
  for (const c of CRAC_UNITS) {
    zones[c.zone] = zones[c.zone] || { zone: c.zone, total: 0, green: 0 };
    zones[c.zone].total += 1;
    if (c.status === 'green') zones[c.zone].green += 1;
  }
  const items = Object.values(zones).map(z => ({ ...z, n1Ok: z.green >= z.total })); // all green => fully redundant
  const pumpsTotal = CHILLED_LOOPS.length;
  const pumpsGreen = CHILLED_LOOPS.filter(l => l.pumpStatus === 'green').length;
  return {
    cracByZone: items,
    pumps: { total: pumpsTotal, green: pumpsGreen, n1Ok: pumpsGreen >= pumpsTotal - 1 },
    overallN1Ok: items.every(i => i.n1Ok) && pumpsGreen >= pumpsTotal - 1,
  };
}

// =============================================================================
// Start server
// =============================================================================
const server = http.createServer(async (req, res) => {
  try { await handle(req, res); }
  catch (err) {
    if (err.message === 'PAYLOAD_TOO_LARGE') return json(res, { error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 2 MB limit' } }, 413);
    console.error('Error:', err); json(res, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }, 500);
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║          INTEGRA — Total Building Resource Dashboard         ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  API:     http://localhost:${PORT}                              ║`);
  console.log(`║  Health:  http://localhost:${PORT}/api/v1/health                 ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Demo Accounts (email / password / role):                    ║');
  console.log('║   admin@integra.com    / admin123    → sys_admin             ║');
  console.log('║   cfo@integra.com      / cfo123      → financial_decision    ║');
  console.log('║   tech@integra.com     / tech123     → technician            ║');
  console.log('║   manager@integra.com  / manager123  → building_manager      ║');
  console.log('║   security@integra.com / security123 → security_officer      ║');
  console.log('║   tenant@integra.com   / tenant123   → tenant                ║');
  console.log('║   guest@integra.com    / guest123    → guest                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
