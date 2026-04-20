// =============================================================================
// Smart Building Dashboard — Standalone Demo Server
// No PostgreSQL, Redis, or MQTT required. Pure Node.js built-in modules only.
// Run: node demo-server.mjs
// =============================================================================

import http from 'node:http';
import crypto from 'node:crypto';

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
  { id: 'u1', email: 'admin@smartbuilding.com', name: 'Admin User', role: 'sys_admin', password: 'admin123', isActive: true, buildingId: 'b1', lastLoginAt: new Date().toISOString(), createdAt: '2026-01-01T00:00:00Z' },
  { id: 'u2', email: 'cfo@smartbuilding.com', name: 'CFO Executive', role: 'financial_decision_maker', password: 'cfo123', isActive: true, buildingId: 'b1', lastLoginAt: new Date().toISOString(), createdAt: '2026-01-15T00:00:00Z' },
  { id: 'u3', email: 'tech@smartbuilding.com', name: 'Technician Mike', role: 'technician', password: 'tech123', isActive: true, buildingId: 'b1', lastLoginAt: null, createdAt: '2026-02-01T00:00:00Z' },
];

const FLOORS = [
  { id: 'f1', buildingId: 'b1', name: 'Ground Floor', level: 0, sortOrder: 0 },
  { id: 'f2', buildingId: 'b1', name: '1st Floor', level: 1, sortOrder: 1 },
  { id: 'f3', buildingId: 'b1', name: '2nd Floor', level: 2, sortOrder: 2 },
  { id: 'f4', buildingId: 'b1', name: '3rd Floor', level: 3, sortOrder: 3 },
  { id: 'f5', buildingId: 'b1', name: '4th Floor (Roof)', level: 4, sortOrder: 4 },
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
    totalFloors: 5,
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
    const allowedRoles = ['sys_admin', 'financial_decision_maker', 'technician'];
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

  // Dashboard
  if (path === '/dashboard/executive') {
    if (!checkAccess(['sys_admin', 'financial_decision_maker'])(user)) return json(res, { error: { code: 'FORBIDDEN', message: 'Access denied' } }, 403);
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

  // 404
  return json(res, { error: { code: 'NOT_FOUND', message: `Route not found: ${method} ${path}` } }, 404);
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
  console.log('║     Smart Building Dashboard — Demo Server (Mock API)       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  API:     http://localhost:${PORT}                             ║`);
  console.log(`║  Health:  http://localhost:${PORT}/api/v1/health                ║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Login Accounts:                                            ║');
  console.log('║    admin@smartbuilding.com / admin123  → sys_admin           ║');
  console.log('║    cfo@smartbuilding.com   / cfo123    → executive           ║');
  console.log('║    tech@smartbuilding.com  / tech123   → technician          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
