// =============================================================================
// Smart Building Dashboard — Shared Types
// Shared between frontend and backend
// =============================================================================

// --- User & Auth ---

export type UserRole = 'financial_decision_maker' | 'sys_admin' | 'technician';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  buildingId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
}

// --- API Response ---

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// --- Sensor ---

export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'co2'
  | 'energy_meter'
  | 'power_factor'
  | 'fuel_level'
  | 'vibration'
  | 'runtime';

export type SensorStatus = 'online' | 'offline' | 'stale';

export type ReadingQuality = 'good' | 'suspect' | 'bad';

export interface SensorSummary {
  id: string;
  name: string;
  type: SensorType;
  unit: string;
  status: SensorStatus;
  lastSeenAt?: string | null;
  buildingId: string;
  zoneId?: string | null;
  isActive: boolean;
}

export interface SensorReading {
  timestamp: string;
  value: number;
  quality?: ReadingQuality;
}

// --- Equipment ---

export type EquipmentType =
  | 'genset'
  | 'pump'
  | 'ahu'
  | 'chiller'
  | 'boiler'
  | 'elevator'
  | 'transformer';

export type HealthStatus = 'green' | 'yellow' | 'red';

export type EquipmentMetricType =
  | 'running_hours'
  | 'cycle_count'
  | 'fuel_level'
  | 'operating_hours';

export interface EquipmentSummary {
  id: string;
  name: string;
  type: EquipmentType;
  serialNumber?: string | null;
  healthStatus: HealthStatus;
  isActive: boolean;
  location: {
    buildingId: string;
    buildingName: string;
    floorId?: string | null;
    floorName?: string | null;
    zoneId?: string | null;
    zoneName?: string | null;
  };
}

// --- Alert ---

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export type AlertOperator = '>' | '<' | '>=' | '<=' | '==';

export interface AlertSummary {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  sensorValue?: number | null;
  thresholdValue?: number | null;
  operator?: string | null;
  triggeredAt: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  buildingId: string;
  sensorId?: string | null;
}

// --- Building Hierarchy ---

export interface BuildingSummary {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  timezone: string;
  floorCount?: number;
  sensorCount?: number;
}

export interface FloorSummary {
  id: string;
  buildingId: string;
  name: string;
  level: number;
  sortOrder: number;
  zoneCount?: number;
}

export type ZoneType =
  | 'office'
  | 'corridor'
  | 'server_room'
  | 'conference_room'
  | 'lobby'
  | 'restroom'
  | 'storage'
  | 'mechanical'
  | 'parking'
  | 'other';

export interface ZoneSummary {
  id: string;
  floorId: string;
  name: string;
  type?: ZoneType | null;
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
  co2Max: number;
}

export interface ZoneEnvironmentalStatus {
  id: string;
  name: string;
  floorId: string;
  floorName: string;
  status: 'normal' | 'warning' | 'critical';
  readings: {
    temperature?: { value: number; unit: string; status: string };
    humidity?: { value: number; unit: string; status: string };
    co2?: { value: number; unit: string; status: string; aqiLabel?: string };
  };
  sensorCount: number;
  lastUpdated?: string | null;
}

// --- Notification ---

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity?: AlertSeverity | null;
  isRead: boolean;
  alertId?: string | null;
  createdAt: string;
}

// --- Floor Plan ---

export type FloorPlanFileType = 'svg' | 'png' | 'pdf' | 'dwg';

export interface FloorPlanSummary {
  id: string;
  buildingId: string;
  floorId: string;
  label?: string | null;
  fileType: FloorPlanFileType;
  fileSize?: number | null;
  createdAt: string;
}

export interface SensorPlacement {
  id: string;
  sensorId: string;
  x: number;
  y: number;
  rotation: number;
}

// --- Energy ---

export interface EnergyTrendPoint {
  timestamp: string;
  kwh: number;
  powerFactor?: number;
  peakKw?: number;
}

export interface BillingProjection {
  buildingId: string;
  month: string;
  consumedKwh: number;
  projectedKwh: number;
  tariffPerKwh: number;
  projectedCostIdr: number;
  lastMonthActualIdr?: number;
  variancePercent?: number;
  daysElapsed: number;
  daysRemaining: number;
  updatedAt: string;
}

// --- WebSocket Events ---

export interface WsSensorReading {
  sensorId: string;
  buildingId: string;
  zoneId?: string;
  type: SensorType;
  value: number;
  unit: string;
  quality: ReadingQuality;
  timestamp: string;
}

export interface WsAlertEvent {
  alert: AlertSummary;
  buildingId: string;
}

export interface WsSystemEvent {
  type: 'sensor_status_change' | 'equipment_health_change';
  entityId: string;
  buildingId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}
