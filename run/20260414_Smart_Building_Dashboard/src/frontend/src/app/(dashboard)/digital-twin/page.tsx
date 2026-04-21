'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import {
  Box, Cpu, Thermometer, Droplets, Wind, Activity, Wifi,
  AlertTriangle, Eye, Layers, RotateCcw, ZoomIn,
  ChevronLeft, WifiOff, Zap, Shield, ArrowUpDown, Snowflake, Fan, Battery, FileBox,
  MapPin, Plus, Trash2, X, Camera, Sun, Flame, DoorOpen, Move,
  Gauge, Car, PackageSearch, CircleAlert, Waves, Plug, Timer,
} from 'lucide-react';
import { api, getAccessToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clsx } from 'clsx';

// ─── IoT Device Types & Helpers ─────────────────────────────────────────────

type IotDeviceType =
  | 'temperature' | 'humidity' | 'co2' | 'power' | 'light'
  | 'water' | 'motion' | 'door' | 'smoke' | 'camera'
  | 'escalator' | 'fire_alarm' | 'gas_leak' | 'machine_fault'
  | 'parking' | 'asset_tracker' | 'flood' | 'ups_battery'
  | 'generator' | 'voltage' | 'current' | 'pressure' | 'occupancy';

type IotCategory = 'mission_critical' | 'metering';

interface IotDevice {
  id: string;
  label: string;
  type: IotDeviceType;
  category: IotCategory;
  heartbeatSec: number;
  floorId: string;
  floorName: string;
  zoneId: string | null;
  zoneName: string | null;
  x: number;
  y: number;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdated: string;
  addedBy: string;
  addedAt: string;
}

interface IotCategoryMeta {
  label: string;
  description: string;
  defaultHeartbeatSec: number;
  color: string;
}

interface IotTypeCategoryEntry {
  category: IotCategory;
  heartbeatSec: number;
  label: string;
}

interface IotMeta {
  types: Record<string, { unit: string; binary: boolean }>;
  floors: { id: string; name: string; level: number }[];
  zones: { id: string; name: string; floorId: string; floorName: string }[];
  categories: Record<string, IotCategoryMeta>;
  typeCategoryMap: Record<string, IotTypeCategoryEntry>;
}

const IOT_TYPE_LABELS: Record<IotDeviceType, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  co2: 'CO\u2082',
  power: 'Power Meter',
  light: 'Light',
  water: 'Water Flow',
  motion: 'Motion (PIR)',
  door: 'Door Contact',
  smoke: 'Smoke Detector',
  camera: 'Camera',
  escalator: 'Escalator Sensor',
  fire_alarm: 'Fire Alarm',
  gas_leak: 'Gas Leak Detector',
  machine_fault: 'Machine Fault',
  parking: 'Parking Occupancy',
  asset_tracker: 'Asset Tracker',
  flood: 'Flood Sensor',
  ups_battery: 'UPS Battery',
  generator: 'Generator Fuel',
  voltage: 'Voltage',
  current: 'Current',
  pressure: 'Pressure',
  occupancy: 'Room Occupancy',
};

const IOT_CATEGORY_LABELS: Record<IotCategory, { label: string; color: string; icon: React.ElementType }> = {
  mission_critical: { label: 'Mission Critical', color: 'text-red-400', icon: CircleAlert },
  metering:         { label: 'Metering',         color: 'text-blue-400', icon: Gauge },
};

function iotIcon(type: IotDeviceType) {
  switch (type) {
    case 'temperature': return Thermometer;
    case 'humidity':    return Droplets;
    case 'co2':         return Wind;
    case 'power':       return Zap;
    case 'light':       return Sun;
    case 'water':       return Droplets;
    case 'motion':      return Activity;
    case 'door':        return DoorOpen;
    case 'smoke':       return Flame;
    case 'camera':      return Camera;
    case 'escalator':   return ArrowUpDown;
    case 'fire_alarm':  return Flame;
    case 'gas_leak':    return Wind;
    case 'machine_fault': return AlertTriangle;
    case 'parking':     return Car;
    case 'asset_tracker': return PackageSearch;
    case 'flood':       return Waves;
    case 'ups_battery': return Battery;
    case 'generator':   return Plug;
    case 'voltage':     return Zap;
    case 'current':     return Zap;
    case 'pressure':    return Gauge;
    case 'occupancy':   return Activity;
    default:            return MapPin;
  }
}

function iotStatusColor(status: string) {
  if (status === 'critical') return { bg: 'bg-red-500',    ring: 'ring-red-400/60',    text: 'text-red-300' };
  if (status === 'warning')  return { bg: 'bg-amber-500',  ring: 'ring-amber-400/60',  text: 'text-amber-300' };
  return                            { bg: 'bg-emerald-500', ring: 'ring-emerald-400/50', text: 'text-emerald-300' };
}

function formatIotValue(d: IotDevice) {
  const binaryTypes: IotDeviceType[] = ['motion', 'door', 'smoke', 'fire_alarm', 'escalator', 'machine_fault', 'asset_tracker', 'flood'];
  if (binaryTypes.includes(d.type)) {
    if (d.type === 'door')           return d.value ? 'OPEN'     : 'CLOSED';
    if (d.type === 'smoke')          return d.value ? 'ALARM'    : 'CLEAR';
    if (d.type === 'fire_alarm')     return d.value ? 'ALARM'    : 'CLEAR';
    if (d.type === 'escalator')      return d.value ? 'FAULT'    : 'OK';
    if (d.type === 'machine_fault')  return d.value ? 'FAULT'    : 'OK';
    if (d.type === 'asset_tracker')  return d.value ? 'MOVED'    : 'STATIC';
    if (d.type === 'flood')          return d.value ? 'FLOOD!'   : 'DRY';
    return d.value ? 'DETECTED' : 'IDLE';
  }
  if (d.type === 'camera') return 'Live';
  return `${d.value}${d.unit ? ' ' + d.unit : ''}`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface Position { x: number; y: number; }

interface ZoneEnv {
  zoneId: string;
  zoneName: string;
  status: 'normal' | 'warning' | 'critical';
  readings: { temperature: number; humidity: number; co2: number };
  occupancy: number;
}

interface EquipmentMetrics {
  efficiency: number;
  powerDraw: number;
  runtime: number;
  lastMaintenance: string;
}

interface FloorEquipment {
  id: string;
  name: string;
  type: string;
  healthStatus: 'green' | 'yellow' | 'red';
  position: Position;
  metrics: EquipmentMetrics;
}

interface FloorSensor {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  value: number | null;
  unit: string;
  position: Position;
  lastUpdated: string;
}

interface FloorData {
  id: string;
  name: string;
  level: number;
  zones: ZoneEnv[];
  equipment: FloorEquipment[];
  sensors: FloorSensor[];
  activeAlerts: number;
  overallStatus: 'normal' | 'warning' | 'critical';
}

interface BuildingInfo {
  id: string;
  name: string;
  address: string;
  totalFloors: number;
  totalEquipment: number;
  totalSensors: number;
  onlineSensors: number;
  overallHealth: string;
  energyNow: number;
  lastSync: string;
}

interface Summary {
  totalAlerts: number;
  criticalAlerts: number;
  avgTemperature: number;
  avgHumidity: number;
  avgCO2: number;
  totalOccupancy: number;
  energyToday: number;
}

interface DigitalTwinData {
  building: BuildingInfo;
  floors: FloorData[];
  summary: Summary;
}

interface FloorDetailRoom {
  id: string;
  name: string;
  type: string;
  x: number; y: number; width: number; height: number;
  liveTemperature: number;
  liveHumidity: number;
  liveCO2: number;
  occupancy: number;
  status: 'normal' | 'warning';
}

interface FloorDetailEquipment {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  healthStatus: 'green' | 'yellow' | 'red';
  zoneName: string | null;
  position: Position;
  liveMetrics: {
    efficiency: number;
    powerDraw: number;
    temperature: number;
    vibration: number;
    current: number;
  };
}

interface FloorDetailAlert {
  id: string;
  severity: string;
  message: string;
  sensorType: string;
  triggeredAt: string;
}

interface FloorDetailData {
  floor: { id: string; name: string; level: number };
  rooms: FloorDetailRoom[];
  equipment: FloorDetailEquipment[];
  sensors: FloorSensor[];
  alerts: FloorDetailAlert[];
  environmentalSummary: {
    avgTemp: number; avgHumidity: number; avgCO2: number; totalOccupancy: number;
  };
}

interface LiveReadings {
  timestamp: string;
  building: { powerDraw: number; waterFlow: number; outsideTemp: number; outsideHumidity: number };
  floors: { id: string; name: string; avgTemp: number; avgHumidity: number; avgCO2: number; powerDraw: number; occupancy: number; status: string }[];
  criticalSensors: { sensorId: string; type: string; value: number; threshold: number; floorId: string; zoneName: string }[];
}

interface DigitalTwinSource {
  name: string;
  fileType: 'dwg' | 'pdf';
  fileSize: number;
  lastModified: string;
  fileUrl: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusColor = (s: string) =>
  s === 'critical' || s === 'red' ? 'text-red-400' :
  s === 'warning' || s === 'yellow' ? 'text-amber-400' : 'text-emerald-400';

const statusBg = (s: string) =>
  s === 'critical' || s === 'red' ? 'bg-red-500/20 border-red-500/30' :
  s === 'warning' || s === 'yellow' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-emerald-500/20 border-emerald-500/30';

const statusGlow = (s: string) =>
  s === 'critical' || s === 'red' ? 'shadow-red-500/20 shadow-lg' :
  s === 'warning' || s === 'yellow' ? 'shadow-amber-500/20 shadow-lg' : 'shadow-green-500/20 shadow-lg';

const healthDot = (h: string) =>
  h === 'red' ? 'bg-red-500' : h === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500';

function equipIcon(type: string) {
  switch (type) {
    case 'hvac': return Fan;
    case 'chiller': return Snowflake;
    case 'electrical': return Zap;
    case 'elevator': return ArrowUpDown;
    case 'safety': return Shield;
    default: return Battery;
  }
}

function timeSince(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ─── Isometric Building SVG ─────────────────────────────────────────────────

function IsometricBuilding({
  floors, selectedFloor, onSelectFloor, exploded,
}: {
  floors: FloorData[];
  selectedFloor: string | null;
  onSelectFloor: (id: string | null) => void;
  exploded: boolean;
}) {
  const svgW = 600, svgH = 500;
  const floorW = 280, floorH = 40, floorD = 60;
  const baseX = svgW / 2;
  const baseY = svgH - 60;
  const gap = exploded ? 90 : 55;

  // Isometric transform helpers
  const isoX = (x: number, y: number) => x - y * 0.5;
  const isoY = (x: number, y: number) => (x + y) * 0.3;

  const sorted = [...floors].sort((a, b) => a.level - b.level);

  const floorFill = (s: string) =>
    s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#22c55e';

  const floorFillDark = (s: string) =>
    s === 'critical' ? '#991b1b' : s === 'warning' ? '#92400e' : '#166534';

  const floorFillSide = (s: string) =>
    s === 'critical' ? '#dc2626' : s === 'warning' ? '#d97706' : '#16a34a';

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full" style={{ maxHeight: '100%' }}>
      <defs>
        <filter id="glow-red">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
        </filter>
        <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx={baseX} cy={baseY + 15} rx={180} ry={30} fill="#0f172a" opacity={0.6} />

      {sorted.map((floor, idx) => {
        const cy = baseY - idx * gap;
        const isSelected = selectedFloor === floor.id;
        const hasCritical = floor.overallStatus === 'critical';

        // Isometric floor slab: top face + right face + front face
        const hw = floorW / 2;
        const hd = floorD / 2;
        const fh = floorH;

        // Top face (parallelogram) 
        const topPts = [
          `${baseX},${cy - hd * 0.6}`,
          `${baseX + hw},${cy + hd * 0.2}`,
          `${baseX},${cy + hd * 0.6 + fh * 0.15}`,
          `${baseX - hw},${cy + hd * 0.2}`,
        ].join(' ');

        // Front face
        const frontPts = [
          `${baseX - hw},${cy + hd * 0.2}`,
          `${baseX},${cy + hd * 0.6 + fh * 0.15}`,
          `${baseX},${cy + hd * 0.6 + fh * 0.15 + fh * 0.5}`,
          `${baseX - hw},${cy + hd * 0.2 + fh * 0.5}`,
        ].join(' ');

        // Right face
        const rightPts = [
          `${baseX},${cy + hd * 0.6 + fh * 0.15}`,
          `${baseX + hw},${cy + hd * 0.2}`,
          `${baseX + hw},${cy + hd * 0.2 + fh * 0.5}`,
          `${baseX},${cy + hd * 0.6 + fh * 0.15 + fh * 0.5}`,
        ].join(' ');

        return (
          <g
            key={floor.id}
            className="cursor-pointer transition-all duration-300"
            onClick={() => onSelectFloor(isSelected ? null : floor.id)}
            style={{ transform: isSelected ? 'translateY(-4px)' : undefined }}
          >
            {/* Critical pulse animation */}
            {hasCritical && (
              <polygon
                points={topPts}
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
                filter="url(#glow-red)"
                opacity={0.6}
              >
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
              </polygon>
            )}

            {/* Front face */}
            <polygon
              points={frontPts}
              fill={floorFillDark(floor.overallStatus)}
              stroke="#1e293b"
              strokeWidth={1}
              opacity={isSelected ? 1 : 0.85}
            />
            {/* Right face */}
            <polygon
              points={rightPts}
              fill={floorFillSide(floor.overallStatus)}
              stroke="#1e293b"
              strokeWidth={1}
              opacity={isSelected ? 1 : 0.85}
            />
            {/* Top face */}
            <polygon
              points={topPts}
              fill={floorFill(floor.overallStatus)}
              stroke={isSelected ? '#fff' : '#1e293b'}
              strokeWidth={isSelected ? 2 : 1}
              opacity={isSelected ? 1 : 0.75}
              filter="url(#shadow)"
            />

            {/* Equipment dots on top face */}
            {floor.equipment.slice(0, 6).map((eq, ei) => {
              const eqX = baseX + (eq.position.x - 50) * (hw / 60);
              const eqY = cy - hd * 0.1 + (eq.position.y - 50) * (hd / 120);
              return (
                <circle
                  key={eq.id}
                  cx={eqX}
                  cy={eqY}
                  r={4}
                  fill={eq.healthStatus === 'red' ? '#ef4444' : eq.healthStatus === 'yellow' ? '#f59e0b' : '#22c55e'}
                  stroke="#0f172a"
                  strokeWidth={1}
                >
                  {eq.healthStatus === 'red' && (
                    <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
                  )}
                </circle>
              );
            })}

            {/* Floor label */}
            <text
              x={baseX}
              y={cy + 3}
              textAnchor="middle"
              fill="#fff"
              fontSize={11}
              fontWeight={isSelected ? 700 : 500}
              className="pointer-events-none select-none"
            >
              {floor.name}
            </text>

            {/* Alert badge */}
            {floor.activeAlerts > 0 && (
              <g>
                <circle cx={baseX + hw - 15} cy={cy - hd * 0.3} r={9} fill="#ef4444" stroke="#0f172a" strokeWidth={1.5}>
                  <animate attributeName="r" values="8;10;8" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x={baseX + hw - 15} y={cy - hd * 0.3 + 4} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700} className="pointer-events-none">
                  {floor.activeAlerts}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Building label */}
      <text x={baseX} y={25} textAnchor="middle" fill="#94a3b8" fontSize={13} fontWeight={600}>
        Wisma Nusantara HQ Tower
      </text>
      <text x={baseX} y={42} textAnchor="middle" fill="#64748b" fontSize={10}>
        Digital Twin — Live View
      </text>
    </svg>
  );
}

// ─── Building Overview Panel ────────────────────────────────────────────────

function BuildingOverview({
  data, liveReadings, onSelectFloor,
}: {
  data: DigitalTwinData;
  liveReadings: LiveReadings | null;
  onSelectFloor: (id: string) => void;
}) {
  const { building, summary } = data;
  const healthCounts = { green: 0, yellow: 0, red: 0 };
  data.floors.forEach(f => f.equipment.forEach(e => {
    healthCounts[e.healthStatus] = (healthCounts[e.healthStatus] || 0) + 1;
  }));

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard icon={Wifi} label="Sensors" value={`${building.onlineSensors}/${building.totalSensors}`} sub="online" color="text-blue-400" />
        <KpiCard icon={Zap} label="Power" value={`${liveReadings?.building.powerDraw.toFixed(1) ?? building.energyNow.toFixed(1)} kW`} sub="current draw" color="text-amber-400" />
        <KpiCard icon={Activity} label="Occupancy" value={`${summary.totalOccupancy}`} sub="people" color="text-emerald-400" />
        <KpiCard icon={Thermometer} label="Avg Temp" value={`${summary.avgTemperature.toFixed(1)}°C`} sub="building avg" color="text-rose-400" />
      </div>

      {/* Alerts Summary */}
      <div className={clsx('rounded-xl p-3 border', summary.criticalAlerts > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/60 border-slate-700/50')}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className={clsx('h-4 w-4', summary.criticalAlerts > 0 ? 'text-red-400' : 'text-slate-400')} />
          <span className="text-sm font-medium text-slate-200">Active Alerts</span>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-red-400">{summary.criticalAlerts} critical</span>
          <span className="text-amber-400">{summary.totalAlerts - summary.criticalAlerts} other</span>
        </div>
      </div>

      {/* Equipment Health */}
      <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-200">Equipment Health</span>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {healthCounts.green} healthy</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {healthCounts.yellow} warning</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {healthCounts.red} critical</span>
        </div>
      </div>

      {/* Environmental */}
      <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-3">
        <h4 className="text-sm font-medium text-slate-200 mb-2">Environment</h4>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div><Thermometer className="h-3.5 w-3.5 mx-auto text-rose-400 mb-0.5" /><span className="text-slate-200">{summary.avgTemperature.toFixed(1)}°C</span></div>
          <div><Droplets className="h-3.5 w-3.5 mx-auto text-blue-400 mb-0.5" /><span className="text-slate-200">{summary.avgHumidity.toFixed(0)}%</span></div>
          <div><Wind className="h-3.5 w-3.5 mx-auto text-teal-400 mb-0.5" /><span className="text-slate-200">{summary.avgCO2} ppm</span></div>
        </div>
      </div>

      {/* Floor List */}
      <div className="space-y-1.5">
        <h4 className="text-sm font-medium text-slate-200">Floors</h4>
        {data.floors.sort((a, b) => b.level - a.level).map(fl => (
          <button
            key={fl.id}
            onClick={() => onSelectFloor(fl.id)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all',
              'bg-slate-800/40 border border-slate-700/40 hover:bg-slate-700/60 hover:border-slate-600/60'
            )}
          >
            <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', healthDot(fl.overallStatus === 'critical' ? 'red' : fl.overallStatus === 'warning' ? 'yellow' : 'green'))} />
            <span className="text-sm text-slate-200 flex-1">{fl.name}</span>
            <span className="text-xs text-slate-500">{fl.equipment.length} equip</span>
            {fl.activeAlerts > 0 && <span className="text-xs text-red-400 font-medium">{fl.activeAlerts} alerts</span>}
            <ZoomIn className="h-3.5 w-3.5 text-slate-500" />
          </button>
        ))}
      </div>

      {/* Live Readings - Critical Sensors */}
      {liveReadings && liveReadings.criticalSensors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <h4 className="text-sm font-medium text-red-400 mb-2">Critical Sensors</h4>
          {liveReadings.criticalSensors.map((cs, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-t border-red-500/10 first:border-0">
              <span className="text-slate-300">{cs.type} @ {cs.zoneName}</span>
              <span className="text-red-400 font-mono">{cs.value.toFixed(1)} (threshold: {cs.threshold})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Floor Detail Panel ─────────────────────────────────────────────────────

function FloorDetail({
  floorId, onBack,
}: {
  floorId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<FloorDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: FloorDetailData }>(`/digital-twin/floors/${floorId}`)
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [floorId]);

  if (loading) return <div className="flex items-center justify-center h-40"><RotateCcw className="h-5 w-5 text-slate-400 animate-spin" /></div>;
  if (!data) return <div className="text-sm text-slate-400 p-4">Failed to load floor data</div>;

  const { floor, rooms, equipment, sensors, alerts, environmentalSummary: env } = data;

  return (
    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-600 transition text-slate-300">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-100">{floor.name}</h3>
          <p className="text-xs text-slate-400">Level {floor.level} — Digital Twin View</p>
        </div>
      </div>

      {/* Env Summary */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat icon={Thermometer} value={`${env.avgTemp.toFixed(1)}°`} label="Temp" color="text-rose-400" />
        <MiniStat icon={Droplets} value={`${env.avgHumidity.toFixed(0)}%`} label="Humid" color="text-blue-400" />
        <MiniStat icon={Wind} value={`${env.avgCO2}`} label="CO2" color="text-teal-400" />
        <MiniStat icon={Activity} value={`${env.totalOccupancy}`} label="People" color="text-emerald-400" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <h4 className="text-xs font-semibold text-red-400 mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Active Alerts</h4>
          {alerts.map(a => (
            <div key={a.id} className="text-xs py-1 border-t border-red-500/10 first:border-0 flex items-start gap-2">
              <span className={clsx('mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0', a.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500')} />
              <span className="text-slate-300 flex-1">{a.message}</span>
              <span className="text-slate-500 flex-shrink-0">{timeSince(a.triggeredAt)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Zone / Room Cards */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Rooms ({rooms.length})</h4>
        <div className="grid grid-cols-1 gap-2 max-h-52 overflow-y-auto pr-1">
          {rooms.map(r => (
            <div key={r.id} className={clsx('px-3 py-2 rounded-lg border text-xs', statusBg(r.status))}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-slate-200">{r.name}</span>
                <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full', r.status === 'warning' ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/30 text-emerald-300')}>{r.status}</span>
              </div>
              <div className="flex gap-3 text-slate-400">
                <span>{r.liveTemperature.toFixed(1)}°C</span>
                <span>{r.liveHumidity.toFixed(0)}%</span>
                <span>{r.liveCO2} ppm</span>
                <span>{r.occupancy} ppl</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Equipment ({equipment.length})</h4>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {equipment.map(eq => {
            const Icon = equipIcon(eq.type);
            return (
              <div key={eq.id} className={clsx('flex items-start gap-2.5 px-3 py-2 rounded-lg border bg-slate-800/60 border-slate-700/50', statusGlow(eq.healthStatus))}>
                <div className={clsx('mt-0.5 p-1.5 rounded-lg', eq.healthStatus === 'red' ? 'bg-red-500/20' : eq.healthStatus === 'yellow' ? 'bg-amber-500/20' : 'bg-emerald-500/20')}>
                  <Icon className={clsx('h-3.5 w-3.5', statusColor(eq.healthStatus))} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-200 truncate">{eq.name}</span>
                    <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', healthDot(eq.healthStatus))} />
                  </div>
                  <div className="text-[10px] text-slate-500">{eq.zoneName ?? 'N/A'} · {eq.serialNumber}</div>
                  <div className="flex gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{eq.liveMetrics.efficiency.toFixed(1)}% eff</span>
                    <span>{eq.liveMetrics.powerDraw.toFixed(1)} kW</span>
                    <span>{eq.liveMetrics.temperature.toFixed(1)}°C</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sensors */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2">Sensors ({sensors.length})</h4>
        <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
          {sensors.map(s => (
            <div key={s.id} className={clsx('px-2 py-1.5 rounded-lg border text-[10px]',
              s.status === 'online' ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-800/30 border-slate-700/30 opacity-60'
            )}>
              <div className="flex items-center gap-1 mb-0.5">
                {s.status === 'online' ? <Wifi className="h-2.5 w-2.5 text-emerald-400" /> : <WifiOff className="h-2.5 w-2.5 text-slate-500" />}
                <span className="text-slate-300 truncate">{s.name}</span>
              </div>
              <span className="text-slate-400 font-mono">{s.value !== null ? `${s.value}${s.unit ? ` ${s.unit}` : ''}` : '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Small Components ──────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={clsx('h-4 w-4', color)} />
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-100">{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label, color }: { icon: React.ElementType; value: string; label: string; color: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
      <Icon className={clsx('h-3.5 w-3.5 mx-auto mb-0.5', color)} />
      <div className="text-sm font-semibold text-slate-100">{value}</div>
      <div className="text-[9px] text-slate-500">{label}</div>
    </div>
  );
}

// ─── Memoized SVG container ─────────────────────────────────────────────────
// The CAD SVG has ~2,400 elements (183 KB). Without memoization the entire
// SVG tree is re-diffed every time the parent state changes (polling fires
// every 5–30 seconds, drag events 60×/s). React.memo keeps the SVG stable
// across parent re-renders so it is parsed/inserted only when sourceSvg
// itself changes.
const CadSvgLayer = memo(function CadSvgLayer({ svg }: { svg: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center pointer-events-none [&>svg]:w-full [&>svg]:h-full [&_path]:!stroke-slate-200 [&_line]:!stroke-slate-200 [&_circle]:!stroke-slate-200 [&_path]:!fill-none [&_circle]:!fill-none"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DigitalTwinPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'sys_admin';
  const [data, setData] = useState<DigitalTwinData | null>(null);
  const [liveReadings, setLiveReadings] = useState<LiveReadings | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');
  const [digitalTwinSource, setDigitalTwinSource] = useState<DigitalTwinSource | null>(null);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [showSourcePreview, setShowSourcePreview] = useState(false);
  const [sourceSvg, setSourceSvg] = useState<string | null>(null);
  const [svgError, setSvgError] = useState<{ code: string; message: string } | null>(null);
  const [svgLoading, setSvgLoading] = useState(true);
  const [showCadView, setShowCadView] = useState(true);

  // IoT overlay state
  const [iotDevices, setIotDevices] = useState<IotDevice[]>([]);
  const [iotMeta, setIotMeta] = useState<IotMeta | null>(null);
  const [iotFloorFilter, setIotFloorFilter] = useState<string>('all');
  const [showIotOverlay, setShowIotOverlay] = useState(true);
  const [placeMode, setPlaceMode] = useState(false);
  const [editLayout, setEditLayout] = useState(false);
  const [pendingPlacement, setPendingPlacement] = useState<{ x: number; y: number } | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<IotDevice | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [positionNotice, setPositionNotice] = useState<string | null>(null);
  const positionNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cadAreaRef = useRef<HTMLDivElement>(null);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unit = units[0];
    for (let i = 1; i < units.length && value >= 1024; i += 1) {
      value /= 1024;
      unit = units[i];
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const fetchBuilding = useCallback(() => {
    api.get<{ data: DigitalTwinData }>('/digital-twin/building')
      .then(r => { setData(r.data); setLastSync(new Date().toISOString()); })
      .catch(() => {});
  }, []);

  // Skip state updates when polled payload is identical (avoids re-rendering
  // the heavy CAD SVG / IoT overlay every poll tick).
  const liveReadingsHashRef = useRef<string>('');
  const fetchLive = useCallback(() => {
    api.get<{ data: LiveReadings }>('/digital-twin/live-readings')
      .then(r => {
        const hash = JSON.stringify(r.data);
        if (hash === liveReadingsHashRef.current) return;
        liveReadingsHashRef.current = hash;
        setLiveReadings(r.data);
        setLastSync(new Date().toISOString());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBuilding();
    api.get<{ data: DigitalTwinSource }>('/floor-plans/digital-twin/source')
      .then(r => setDigitalTwinSource(r.data))
      .catch(() => setDigitalTwinSource(null))
      .finally(() => setSourceLoading(false));

    setSvgLoading(true);
    setSvgError(null);
    const token = getAccessToken();
    fetch('/api/v1/floor-plans/digital-twin/source/svg', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: 'include',
    })
      .then(async (r) => {
        if (r.ok) {
          const text = await r.text();
          setSourceSvg(text);
        } else {
          let payload: any = null;
          try { payload = await r.json(); } catch {}
          setSvgError({
            code: payload?.error?.code || `HTTP_${r.status}`,
            message: payload?.error?.message || 'Failed to render drawing as SVG',
          });
          setSourceSvg(null);
        }
      })
      .catch((e) => setSvgError({ code: 'NETWORK', message: e?.message || 'Network error' }))
      .finally(() => setSvgLoading(false));
    setLoading(false);
  }, [fetchBuilding]);

  // Poll live readings every 15s (was 5s — values rarely change that fast)
  useEffect(() => {
    fetchLive();
    const iv = setInterval(fetchLive, 15000);
    return () => clearInterval(iv);
  }, [fetchLive]);

  // IoT devices fetch + polling for live values.
  // Device list itself rarely changes; only readings do. Skip state updates
  // when payload is identical to avoid forcing the SVG/overlay to re-render.
  const iotHashRef = useRef<string>('');
  const fetchIot = useCallback(() => {
    api.get<{ data: IotDevice[]; meta: IotMeta }>('/digital-twin/iot-devices')
      .then(r => {
        const hash = JSON.stringify(r.data);
        if (hash !== iotHashRef.current) {
          iotHashRef.current = hash;
          setIotDevices(r.data);
        }
        setIotMeta(prev => prev ? prev : r.meta);
      })
      .catch(() => {});
  }, []);
  // Pause polling while actively dragging or when tab is hidden
  useEffect(() => {
    fetchIot();
    if (draggingId) return; // skip poll interval while dragging
    let iv: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (iv) return;
      iv = setInterval(fetchIot, 30000); // was 5s
    };
    const stop = () => {
      if (iv) { clearInterval(iv); iv = null; }
    };
    const onVis = () => {
      if (document.hidden) stop();
      else { fetchIot(); start(); }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchIot, draggingId]);

  useEffect(() => () => {
    if (positionNoticeTimerRef.current) {
      clearTimeout(positionNoticeTimerRef.current);
    }
  }, []);

  const handleCadClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placeMode || !cadAreaRef.current) return;
    const rect = cadAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPlacement({
      x: Math.max(0, Math.min(100, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100, Number(y.toFixed(2)))),
    });
  }, [placeMode]);

  const createDevice = useCallback(async (input: { type: IotDeviceType; label: string; floorId: string; zoneId: string | null; x: number; y: number; category: IotCategory; heartbeatSec: number }) => {
    try {
      const res = await api.post<{ data: IotDevice }>('/digital-twin/iot-devices', input);
      setIotDevices(prev => [...prev, res.data]);
      setPendingPlacement(null);
      setPlaceMode(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to add IoT device');
    }
  }, []);

  const removeDevice = useCallback(async (id: string) => {
    if (!confirm('Remove this IoT device?')) return;
    try {
      await api.delete(`/digital-twin/iot-devices/${id}`);
      setIotDevices(prev => prev.filter(d => d.id !== id));
      setSelectedDevice(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove device');
    }
  }, []);

  // Drag handler for repositioning markers in edit mode
  // Uses window-level listeners for reliable cross-browser drag-and-drop
  const beginDrag = useCallback((e: React.PointerEvent<HTMLDivElement>, device: IotDevice) => {
    if (!editLayout || !cadAreaRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(device.id);
    setSelectedDevice(null); // close popover while dragging
    const area = cadAreaRef.current;
    let lastX = device.x;
    let lastY = device.y;
    const onMove = (ev: MouseEvent | PointerEvent) => {
      ev.preventDefault();
      const rect = area.getBoundingClientRect();
      const nx = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const ny = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      lastX = Number(nx.toFixed(2));
      lastY = Number(ny.toFixed(2));
      setIotDevices(prev => prev.map(d => d.id === device.id ? { ...d, x: lastX, y: lastY } : d));
    };
    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setDraggingId(null);
      if (lastX === device.x && lastY === device.y) return; // no move
      try {
        const res = await api.patch<{ data: IotDevice }>(`/digital-twin/iot-devices/${device.id}`, { x: lastX, y: lastY });
        setIotDevices(prev => prev.map(d => d.id === device.id ? { ...d, ...res.data } : d));
        setPositionNotice(`\u2713 Position saved — ${res.data.label}`);
        if (positionNoticeTimerRef.current) clearTimeout(positionNoticeTimerRef.current);
        positionNoticeTimerRef.current = setTimeout(() => setPositionNotice(null), 2000);
      } catch (err: any) {
        alert(err?.message || 'Failed to save new position');
        fetchIot();
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [editLayout, fetchIot]);

  const visibleDevices = useMemo(
    () => iotDevices.filter(d => iotFloorFilter === 'all' || d.floorId === iotFloorFilter),
    [iotDevices, iotFloorFilter]
  );

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <RotateCcw className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <p>Failed to load Digital Twin data</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Box className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Digital Twin</h1>
            <p className="text-xs text-slate-400">Interactive building visualization with live IoT data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Last sync: {timeSince(lastSync)}
            </span>
          )}
          <button
            onClick={() => setExploded(e => !e)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              exploded
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:bg-slate-600/60'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            {exploded ? 'Collapse' : 'Explode'} View
          </button>
          <button
            onClick={() => { fetchBuilding(); fetchLive(); fetchIot(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:bg-slate-600/60 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex gap-4 h-[calc(100vh-11rem)]">
        {/* Left: Isometric View */}
        <div className="flex-[7] bg-slate-900/80 backdrop-blur border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Source plan card */}
          <div className="absolute top-4 right-4 z-20 w-[340px] max-w-[45%] bg-slate-900/85 backdrop-blur rounded-xl border border-slate-700/60 p-3">
            <div className="flex items-start gap-2.5">
              <FileBox className="h-4 w-4 text-cyan-400 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-100">Drawing Source</p>
                {sourceLoading ? (
                  <p className="text-[11px] text-slate-500 mt-0.5">Checking Drawing4 source...</p>
                ) : digitalTwinSource ? (
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {digitalTwinSource.name} · {formatBytes(digitalTwinSource.fileSize)}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-400 mt-0.5">Drawing4.dwg/pdf not detected</p>
                )}
              </div>
            </div>
          {digitalTwinSource && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowCadView((v) => !v)}
                  className="px-2 py-1 rounded-md text-[11px] border border-cyan-600 text-cyan-300 hover:bg-cyan-700/30"
                >
                  {showCadView ? 'Show 3D Model' : 'Show CAD Drawing'}
                </button>
                <button
                  onClick={() => setShowSourcePreview((v) => !v)}
                  className="px-2 py-1 rounded-md text-[11px] border border-slate-600 text-slate-300 hover:bg-slate-700/60"
                >
                  {showSourcePreview ? 'Hide Source File' : 'Show Source File'}
                </button>
                <a
                  href={digitalTwinSource.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded-md text-[11px] border border-slate-600 text-slate-300 hover:bg-slate-700/60"
                >
                  Open
                </a>
              </div>
            )}
          </div>

          {showSourcePreview && digitalTwinSource && (
            <div className="absolute left-4 right-4 top-20 h-[38%] z-10 rounded-xl border border-slate-700 overflow-hidden bg-slate-950/90">
              <object
                data={digitalTwinSource.fileUrl}
                type={digitalTwinSource.fileType === 'pdf' ? 'application/pdf' : 'application/acad'}
                className="w-full h-full"
              >
                <div className="h-full flex items-center justify-center text-center p-4">
                  <div>
                    <p className="text-sm text-slate-300">
                      Browser preview is not available for this {digitalTwinSource.fileType.toUpperCase()} file.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Use Open to inspect the original drawing source.</p>
                  </div>
                </div>
              </object>
            </div>
          )}

          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

          <div
            ref={cadAreaRef}
            onClick={handleCadClick}
            className={clsx(
              'relative w-full h-full flex items-center justify-center',
              placeMode && 'cursor-crosshair',
              editLayout && !placeMode && 'ring-2 ring-cyan-500/30 rounded-lg',
            )}
          >
            {showCadView ? (
              svgLoading ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <RotateCcw className="h-5 w-5 animate-spin" />
                  <span className="text-xs">Rendering CAD drawing...</span>
                </div>
              ) : sourceSvg ? (
                <CadSvgLayer svg={sourceSvg} />
              ) : (
                <div className="max-w-md text-center px-6">
                  <p className="text-sm text-amber-300 font-medium mb-1">CAD render unavailable</p>
                  <p className="text-xs text-slate-400 mb-3">
                    {svgError?.message || 'Could not convert the drawing to SVG. Place a Drawing4.svg next to Drawing4.dwg as an override if the issue persists.'}
                  </p>
                  <button
                    onClick={() => setShowCadView(false)}
                    className="px-3 py-1.5 rounded-md text-xs border border-slate-600 text-slate-200 hover:bg-slate-700/60"
                  >
                    Show 3D Model Instead
                  </button>
                </div>
              )
            ) : (
              <IsometricBuilding
                floors={data.floors}
                selectedFloor={selectedFloor}
                onSelectFloor={setSelectedFloor}
                exploded={exploded}
              />
            )}

            {/* IoT Markers Overlay */}
            {showIotOverlay && showCadView && visibleDevices.map((d) => {
              const Icon = iotIcon(d.type);
              const c = iotStatusColor(d.status);
              const draggable = editLayout && isAdmin;
              const isMC = d.category === 'mission_critical';
              return (
                <div
                  key={d.id}
                  onPointerDown={(e) => draggable && beginDrag(e, d)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!editLayout) setSelectedDevice(d);
                  }}
                  className={clsx(
                    'absolute -translate-x-1/2 -translate-y-1/2 z-20 group select-none',
                    'h-7 w-7 rounded-full flex items-center justify-center text-white shadow-lg transition-transform',
                    c.bg,
                    isMC ? 'ring-[3px] ring-red-400/70' : 'ring-2 ring-blue-400/50',
                    d.status === 'critical' && draggingId !== d.id && 'animate-pulse',
                    draggable
                      ? (draggingId === d.id ? 'cursor-grabbing scale-125 ring-4 ring-cyan-300/70' : 'cursor-grab hover:scale-110 ring-cyan-300/40')
                      : 'hover:scale-110 cursor-pointer',
                  )}
                  style={{ left: `${d.x}%`, top: `${d.y}%`, touchAction: 'none' }}
                  title={draggable ? `Drag to move — ${d.label}` : `[${isMC ? 'MC' : 'MTR'}] ${d.label} — ${formatIotValue(d)} (${d.heartbeatSec}s)`}
                >
                  <Icon className="h-3.5 w-3.5 pointer-events-none" />
                </div>
              );
            })}

            {/* Pending placement marker */}
            {pendingPlacement && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                style={{ left: `${pendingPlacement.x}%`, top: `${pendingPlacement.y}%` }}
              >
                <div className="h-8 w-8 rounded-full bg-cyan-500/40 ring-2 ring-cyan-300 animate-pulse flex items-center justify-center">
                  <Plus className="h-4 w-4 text-white" />
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-[10px] text-slate-400">
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Warning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            </div>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-red-400/70" /> Mission Critical</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full border-2 border-blue-400/50" /> Metering</span>
            </div>
          </div>

          {/* IoT Toolbar */}
          <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 bg-slate-900/85 backdrop-blur border border-slate-700/60 rounded-xl px-3 py-2">
            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[11px] text-slate-300 font-medium">IoT</span>
            <span className="text-[10px] text-slate-500">{visibleDevices.length} devices</span>
            <select
              value={iotFloorFilter}
              onChange={(e) => setIotFloorFilter(e.target.value)}
              className="text-[11px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200"
            >
              <option value="all">All floors</option>
              {iotMeta?.floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button
              onClick={() => setShowIotOverlay(v => !v)}
              className={clsx('text-[11px] px-2 py-0.5 rounded border', showIotOverlay ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-400')}
              title="Toggle IoT overlay"
            >
              {showIotOverlay ? 'Visible' : 'Hidden'}
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => { setEditLayout(v => !v); setPlaceMode(false); setPendingPlacement(null); }}
                  className={clsx(
                    'text-[11px] px-2 py-0.5 rounded border flex items-center gap-1',
                    editLayout
                      ? 'bg-cyan-500/30 border-cyan-400/50 text-cyan-100'
                      : 'bg-slate-800 border-slate-700 text-slate-300',
                  )}
                  title={editLayout ? 'Exit layout edit' : 'Edit layout (drag markers)'}
                >
                  <Move className="h-3 w-3" />
                  {editLayout ? 'Done' : 'Edit Layout'}
                </button>
                <button
                  onClick={() => { setPlaceMode(v => !v); setPendingPlacement(null); setEditLayout(false); }}
                  className={clsx(
                    'text-[11px] px-2 py-0.5 rounded border flex items-center gap-1',
                    placeMode
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-200'
                      : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
                  )}
                  title={placeMode ? 'Cancel placement' : 'Add IoT device'}
                >
                  {placeMode ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {placeMode ? 'Cancel' : 'Add Device'}
                </button>
              </>
            )}
          </div>

          {placeMode && !pendingPlacement && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-cyan-600/90 text-white text-xs font-medium shadow-lg flex items-center gap-1.5">
              <Move className="h-3.5 w-3.5" />
              Click on the drawing to place a new IoT device
            </div>
          )}

          {editLayout && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-cyan-600/90 text-white text-xs font-medium shadow-lg flex items-center gap-1.5">
              <Move className="h-3.5 w-3.5" />
              Drag any marker to reposition. Click Done when finished.
            </div>
          )}

          {/* Building Stats Overlay */}
          <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur rounded-xl border border-slate-700/50 p-3 text-xs space-y-1">
            <div className="text-slate-300 font-medium">{data.building.name}</div>
            <div className="text-slate-500">{data.building.address}</div>
            <div className="flex gap-3 mt-1.5 text-slate-400">
              <span>{data.building.totalFloors} floors</span>
              <span>{data.building.totalEquipment} equipment</span>
              <span className={data.building.overallHealth === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}>{data.building.overallHealth}</span>
            </div>
          </div>

          {/* Click hint */}
          {!selectedFloor && (
            <div className="absolute bottom-4 right-4 text-[10px] text-slate-500 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Click a floor to see details
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-[3] bg-slate-800/40 backdrop-blur border border-slate-700/50 rounded-2xl p-4">
          {selectedFloor ? (
            <FloorDetail floorId={selectedFloor} onBack={() => setSelectedFloor(null)} />
          ) : (
            <BuildingOverview data={data} liveReadings={liveReadings} onSelectFloor={setSelectedFloor} />
          )}
        </div>
      </div>

      {/* IoT Device Popover */}
      {selectedDevice && (
        <IotDevicePopover
          device={selectedDevice}
          isAdmin={isAdmin}
          onClose={() => setSelectedDevice(null)}
          onDelete={() => removeDevice(selectedDevice.id)}
        />
      )}

      {/* Place IoT Modal */}
      {pendingPlacement && iotMeta && (
        <IotPlaceModal
          position={pendingPlacement}
          meta={iotMeta}
          defaultFloorId={iotFloorFilter !== 'all' ? iotFloorFilter : (iotMeta.floors[0]?.id || '')}
          onCancel={() => setPendingPlacement(null)}
          onSubmit={createDevice}
        />
      )}

      {positionNotice && (
        <div className="fixed top-20 right-6 z-50 px-3 py-2 rounded-lg border border-emerald-400/40 bg-emerald-500/20 text-emerald-100 text-xs shadow-lg">
          {positionNotice}
        </div>
      )}
    </div>
  );
}


// ─── IoT Device Popover ─────────────────────────────────────────────────────

function IotDevicePopover({
  device, isAdmin, onClose, onDelete,
}: {
  device: IotDevice;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: () => void;
}) {
  const Icon = iotIcon(device.type);
  const c = iotStatusColor(device.status);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto bg-slate-900/95 backdrop-blur border border-slate-700/60 rounded-2xl shadow-2xl w-[360px] max-w-[90vw] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={clsx('h-10 w-10 rounded-xl flex items-center justify-center text-white', c.bg)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-100 truncate">{device.label}</p>
              <span className={clsx('text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800', c.text)}>{device.status}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {IOT_TYPE_LABELS[device.type]} · {device.floorName}{device.zoneName ? ` / ${device.zoneName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="bg-slate-800/60 rounded-lg p-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Live Reading</div>
            <div className={clsx('text-base font-bold mt-0.5', c.text)}>{formatIotValue(device)}</div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Category</div>
            <div className={clsx('text-xs font-semibold mt-0.5', device.category === 'mission_critical' ? 'text-red-300' : 'text-blue-300')}>
              {device.category === 'mission_critical' ? 'Mission Critical' : 'Metering'}
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-lg p-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Heartbeat</div>
            <div className="text-slate-200 font-mono text-xs mt-0.5 flex items-center gap-1">
              <Timer className="h-3 w-3 text-slate-400" />
              {device.heartbeatSec}s
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
          <div>ID: <span className="text-slate-300 font-mono">{device.id}</span></div>
          <div>Updated: <span className="text-slate-300">{new Date(device.lastUpdated).toLocaleTimeString()}</span></div>
          <div>Added by: <span className="text-slate-300">{device.addedBy}</span> on {new Date(device.addedAt).toLocaleDateString()}</div>
        </div>

        {isAdmin && (
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 hover:bg-red-500/25"
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IoT Place Modal ────────────────────────────────────────────────────────

function IotPlaceModal({
  position, meta, defaultFloorId, onCancel, onSubmit,
}: {
  position: { x: number; y: number };
  meta: IotMeta;
  defaultFloorId: string;
  onCancel: () => void;
  onSubmit: (input: { type: IotDeviceType; label: string; floorId: string; zoneId: string | null; x: number; y: number; category: IotCategory; heartbeatSec: number }) => void;
}) {
  const [type, setType] = useState<IotDeviceType>('temperature');
  const [label, setLabel] = useState('');
  const [floorId, setFloorId] = useState(defaultFloorId);
  const [zoneId, setZoneId] = useState<string>('');
  const [category, setCategory] = useState<IotCategory>('metering');
  const [heartbeatSec, setHeartbeatSec] = useState<number>(30);
  const typeKeys = Object.keys(meta.types) as IotDeviceType[];
  const zonesForFloor = meta.zones.filter(z => z.floorId === floorId);

  // Group types by their default category for the dropdown
  const mcTypes = typeKeys.filter(k => meta.typeCategoryMap?.[k]?.category === 'mission_critical');
  const mtrTypes = typeKeys.filter(k => meta.typeCategoryMap?.[k]?.category !== 'mission_critical');

  // When type changes, auto-set defaults from typeCategoryMap
  const handleTypeChange = (newType: IotDeviceType) => {
    setType(newType);
    const mapping = meta.typeCategoryMap?.[newType];
    if (mapping) {
      setCategory(mapping.category as IotCategory);
      setHeartbeatSec(mapping.heartbeatSec);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" /> Place IoT Device
          </h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-800 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-[11px] text-slate-500 mb-3">
          Position: <span className="text-slate-300 font-mono">x={position.x.toFixed(1)} · y={position.y.toFixed(1)}</span> (% of drawing area)
        </div>

        <div className="space-y-3">
          {/* Device Type — grouped by category */}
          <label className="block">
            <span className="text-xs text-slate-400">Device Type</span>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as IotDeviceType)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100"
            >
              {mcTypes.length > 0 && (
                <optgroup label="\u26A0 Mission Critical">
                  {mcTypes.map((k) => (
                    <option key={k} value={k}>{IOT_TYPE_LABELS[k] || k} {meta.types[k]?.unit ? `(${meta.types[k].unit})` : ''}</option>
                  ))}
                </optgroup>
              )}
              {mtrTypes.length > 0 && (
                <optgroup label="\u{1F4CA} Metering">
                  {mtrTypes.map((k) => (
                    <option key={k} value={k}>{IOT_TYPE_LABELS[k] || k} {meta.types[k]?.unit ? `(${meta.types[k].unit})` : ''}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-400">Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Lobby Temp Sensor"
              maxLength={80}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100"
            />
          </label>

          {/* Category */}
          <div>
            <span className="text-xs text-slate-400">Sensor Category</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setCategory('mission_critical'); if (heartbeatSec > 10) setHeartbeatSec(5); }}
                className={clsx(
                  'px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all',
                  category === 'mission_critical'
                    ? 'bg-red-500/20 border-red-500/50 text-red-200 ring-1 ring-red-400/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700',
                )}
              >
                <CircleAlert className="h-3.5 w-3.5" />
                Mission Critical
              </button>
              <button
                type="button"
                onClick={() => { setCategory('metering'); if (heartbeatSec < 15) setHeartbeatSec(30); }}
                className={clsx(
                  'px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all',
                  category === 'metering'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 ring-1 ring-blue-400/30'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700',
                )}
              >
                <Gauge className="h-3.5 w-3.5" />
                Metering
              </button>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              {category === 'mission_critical'
                ? 'Real-time alert — immediate response required when triggered'
                : 'Periodic measurement — for analytics, dashboards & reporting'}
            </p>
          </div>

          {/* Heartbeat */}
          <label className="block">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Timer className="h-3 w-3" /> Heartbeat Interval (seconds)</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number" min={1} max={3600} step={1}
                value={heartbeatSec}
                onChange={(e) => setHeartbeatSec(Math.max(1, Math.min(3600, Number(e.target.value) || 1)))}
                className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100 font-mono"
              />
              <div className="flex gap-1">
                {(category === 'mission_critical' ? [2, 3, 5, 10] : [15, 30, 60, 300]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setHeartbeatSec(v)}
                    className={clsx(
                      'px-2 py-1 rounded text-[10px] border',
                      heartbeatSec === v ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700',
                    )}
                  >
                    {v}s
                  </button>
                ))}
              </div>
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-slate-400">Floor</span>
            <select
              value={floorId}
              onChange={(e) => { setFloorId(e.target.value); setZoneId(''); }}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100"
            >
              {meta.floors.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-slate-400">Zone (optional)</span>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="">— None —</option>
              {zonesForFloor.map(z => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-300 bg-slate-800 border border-slate-700 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (!label.trim()) { alert('Label is required'); return; }
              onSubmit({ type, label: label.trim(), floorId, zoneId: zoneId || null, x: position.x, y: position.y, category, heartbeatSec });
            }}
            className="px-3 py-1.5 rounded-lg text-xs text-white bg-cyan-600 hover:bg-cyan-500 flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Place Device
          </button>
        </div>
      </div>
    </div>
  );
}

