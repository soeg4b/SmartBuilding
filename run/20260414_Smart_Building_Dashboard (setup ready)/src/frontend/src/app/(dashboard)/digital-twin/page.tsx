'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Cpu, Thermometer, Droplets, Wind, Activity, Wifi,
  AlertTriangle, Eye, Layers, RotateCcw, ZoomIn,
  ChevronLeft, WifiOff, Zap, Shield, ArrowUpDown, Snowflake, Fan, Battery,
} from 'lucide-react';
import { api } from '@/lib/api';
import { clsx } from 'clsx';

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

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DigitalTwinPage() {
  const [data, setData] = useState<DigitalTwinData | null>(null);
  const [liveReadings, setLiveReadings] = useState<LiveReadings | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');

  const fetchBuilding = useCallback(() => {
    api.get<{ data: DigitalTwinData }>('/digital-twin/building')
      .then(r => { setData(r.data); setLastSync(new Date().toISOString()); })
      .catch(() => {});
  }, []);

  const fetchLive = useCallback(() => {
    api.get<{ data: LiveReadings }>('/digital-twin/live-readings')
      .then(r => { setLiveReadings(r.data); setLastSync(new Date().toISOString()); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchBuilding();
    setLoading(false);
  }, [fetchBuilding]);

  // Poll live readings every 5 seconds
  useEffect(() => {
    fetchLive();
    const iv = setInterval(fetchLive, 5000);
    return () => clearInterval(iv);
  }, [fetchLive]);

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
            onClick={() => { fetchBuilding(); fetchLive(); }}
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
          {/* Background grid pattern */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

          <div className="relative w-full h-full flex items-center justify-center">
            <IsometricBuilding
              floors={data.floors}
              selectedFloor={selectedFloor}
              onSelectFloor={setSelectedFloor}
              exploded={exploded}
            />
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 flex gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Normal</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Warning</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
          </div>

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
    </div>
  );
}
