'use client';

import { useState, useEffect, useCallback } from 'react';
import { Layers, Map, Thermometer, Droplets, Wind, Wifi, WifiOff, AlertTriangle, Plus, Trash2, X, FileBox } from 'lucide-react';
import { api, ensureValidToken } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Floor {
  id: string;
  buildingId: string;
  name: string;
  level: number;
  sortOrder: number;
}

interface FloorPlan {
  id: string;
  buildingId: string;
  floorId: string;
  label?: string | null;
  fileType: 'svg' | 'png' | 'pdf' | 'dwg';
  fileSize?: number | null;
  createdAt: string;
  versions?: { version: number; uploadedAt: string; uploadedBy: string; changeNote: string }[];
}

interface DigitalTwinSource {
  name: string;
  fileType: 'dwg';
  fileSize: number;
  lastModified: string;
  fileUrl: string;
}

interface SensorPin {
  id: string;
  sensorId: string;
  x: number;
  y: number;
  rotation: number;
  sensor: {
    name: string;
    type: string;
    status: string;
    lastValue?: number | null;
    unit?: string;
  };
}

interface Room {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  temperature?: number;
  humidity?: number;
  co2?: number;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------
const ROOM_FILLS: Record<string, { bg: string; border: string; label: string }> = {
  office:       { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.45)',  label: '#93c5fd' },
  server_room:  { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.45)',   label: '#fca5a5' },
  lobby:        { bg: 'rgba(34,197,94,0.12)',    border: 'rgba(34,197,94,0.45)',   label: '#86efac' },
  meeting_room: { bg: 'rgba(168,85,247,0.12)',   border: 'rgba(168,85,247,0.45)',  label: '#d8b4fe' },
  cafeteria:    { bg: 'rgba(249,115,22,0.12)',   border: 'rgba(249,115,22,0.45)',  label: '#fdba74' },
  lab:          { bg: 'rgba(245,158,11,0.12)',   border: 'rgba(245,158,11,0.45)',  label: '#fcd34d' },
};

const defaultRoom = { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', label: '#94a3b8' };

function roomStyle(type: string) {
  return ROOM_FILLS[type] ?? defaultRoom;
}

function sensorColor(status: string) {
  if (status === 'online') return '#22c55e';
  if (status === 'offline') return '#ef4444';
  return '#eab308';
}

// ---------------------------------------------------------------------------
// Tooltip components (rendered inside the SVG)
// ---------------------------------------------------------------------------
function SensorTooltip({ pin, svgW, svgH }: { pin: SensorPin; svgW: number; svgH: number }) {
  const px = (pin.x / 100) * svgW;
  const py = (pin.y / 100) * svgH;
  const tipW = 180;
  const tipH = 92;
  let tx = px - tipW / 2;
  let ty = py - tipH - 14;
  if (tx < 4) tx = 4;
  if (tx + tipW > svgW - 4) tx = svgW - tipW - 4;
  if (ty < 4) ty = py + 18;

  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={tipW} height={tipH} rx={6} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      {ty < py && (
        <polygon points={`${px - 6},${ty + tipH} ${px},${ty + tipH + 8} ${px + 6},${ty + tipH}`} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      )}
      <text x={tx + 10} y={ty + 20} fill="#e2e8f0" fontSize={12} fontWeight={600}>{pin.sensor.name}</text>
      <text x={tx + 10} y={ty + 36} fill="#94a3b8" fontSize={10}>Type: {pin.sensor.type}</text>
      {pin.sensor.lastValue != null && (
        <text x={tx + 10} y={ty + 54} fill="#60a5fa" fontSize={11}>Value: {pin.sensor.lastValue} {pin.sensor.unit}</text>
      )}
      <circle cx={tx + 14} cy={ty + 74} r={4} fill={sensorColor(pin.sensor.status)} />
      <text x={tx + 24} y={ty + 78} fill={sensorColor(pin.sensor.status)} fontSize={10} fontWeight={500}>
        {pin.sensor.status.charAt(0).toUpperCase() + pin.sensor.status.slice(1)}
      </text>
    </g>
  );
}

function RoomTooltip({ room, svgW, svgH }: { room: Room; svgW: number; svgH: number }) {
  const cx = ((room.x + room.width / 2) / 100) * svgW;
  const cy = ((room.y + room.height / 2) / 100) * svgH;
  const tipW = 200;
  const tipH = 100;
  let tx = cx - tipW / 2;
  let ty = cy - tipH - 10;
  if (tx < 4) tx = 4;
  if (tx + tipW > svgW - 4) tx = svgW - tipW - 4;
  if (ty < 4) ty = cy + 20;

  const style = roomStyle(room.type);

  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={tipW} height={tipH} rx={6} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      <text x={tx + 10} y={ty + 20} fill="#e2e8f0" fontSize={12} fontWeight={600}>{room.name}</text>
      <text x={tx + 10} y={ty + 36} fill={style.label} fontSize={10}>
        {room.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </text>
      {room.temperature != null && (
        <text x={tx + 10} y={ty + 58} fill="#f87171" fontSize={11}>🌡 {room.temperature}°C</text>
      )}
      {room.humidity != null && (
        <text x={tx + 110} y={ty + 58} fill="#60a5fa" fontSize={11}>💧 {room.humidity}%</text>
      )}
      {room.co2 != null && (
        <text x={tx + 10} y={ty + 78} fill="#a78bfa" fontSize={11}>🌬 {room.co2} ppm</text>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// SVG Floor Plan Renderer
// ---------------------------------------------------------------------------
const SVG_W = 900;
const SVG_H = 560;

function FloorPlanSVG({
  rooms,
  sensors,
  floorName,
}: {
  rooms: Room[];
  sensors: SensorPin[];
  floorName: string;
}) {
  const [hoveredSensor, setHoveredSensor] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  const hoveredSensorData = sensors.find(s => s.id === hoveredSensor);
  const hoveredRoomData = rooms.find(r => r.id === hoveredRoom);

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-auto" style={{ background: '#0f172a' }}>
      {/* Blueprint grid patterns */}
      <defs>
        <pattern id="grid-sm" width={20} height={20} patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(51,65,85,0.25)" strokeWidth={0.5} />
        </pattern>
        <pattern id="grid-lg" width={100} height={100} patternUnits="userSpaceOnUse">
          <rect width={100} height={100} fill="url(#grid-sm)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(51,65,85,0.45)" strokeWidth={0.8} />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={SVG_W} height={SVG_H} fill="url(#grid-lg)" />

      {/* Outer building boundary */}
      <rect
        x={SVG_W * 0.03} y={SVG_H * 0.06}
        width={SVG_W * 0.94} height={SVG_H * 0.88}
        rx={3}
        fill="none"
        stroke="rgba(100,116,139,0.5)"
        strokeWidth={2}
        strokeDasharray="10 5"
      />

      {/* Title bar */}
      <rect x={0} y={0} width={SVG_W} height={28} fill="rgba(15,23,42,0.92)" />
      <text x={14} y={18} fill="#94a3b8" fontSize={11} fontWeight={600} letterSpacing={1}>
        {floorName.toUpperCase()} — FLOOR PLAN
      </text>
      <text x={SVG_W - 14} y={18} fill="#475569" fontSize={9} textAnchor="end">SCALE 1:100</text>

      {/* Rooms */}
      {rooms.map((room) => {
        const s = roomStyle(room.type);
        const rx = (room.x / 100) * SVG_W;
        const ry = (room.y / 100) * SVG_H;
        const rw = (room.width / 100) * SVG_W;
        const rh = (room.height / 100) * SVG_H;
        const isHovered = hoveredRoom === room.id;

        return (
          <g
            key={room.id}
            onMouseEnter={() => setHoveredRoom(room.id)}
            onMouseLeave={() => setHoveredRoom(null)}
            style={{ cursor: 'pointer' }}
          >
            <rect
              x={rx} y={ry} width={rw} height={rh} rx={2}
              fill={isHovered ? s.border : s.bg}
              stroke={s.border}
              strokeWidth={isHovered ? 2 : 1.2}
              opacity={isHovered ? 0.55 : 1}
            />
            {/* Door indicators — small breaks in the wall */}
            <rect x={rx + rw * 0.4} y={ry - 1.5} width={rw * 0.15} height={3} rx={1} fill="#0f172a" />
            {/* Room name */}
            <text
              x={rx + rw / 2} y={ry + rh / 2 - 6}
              fill={s.label} fontSize={rw > 100 ? 11 : 9} fontWeight={500}
              textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
            >
              {room.name}
            </text>
            {/* Room type */}
            <text
              x={rx + rw / 2} y={ry + rh / 2 + 10}
              fill={s.label} fontSize={8} opacity={0.55}
              textAnchor="middle" dominantBaseline="middle" pointerEvents="none"
            >
              {room.type.replace(/_/g, ' ')}
            </text>
            {/* Temp if space allows */}
            {room.temperature != null && rw > 80 && rh > 60 && (
              <text
                x={rx + rw / 2} y={ry + rh / 2 + 24}
                fill="#f87171" fontSize={9} textAnchor="middle" pointerEvents="none" opacity={0.75}
              >
                {room.temperature}°C
              </text>
            )}
          </g>
        );
      })}

      {/* Sensor pins */}
      {sensors.map((pin) => {
        const px = (pin.x / 100) * SVG_W;
        const py = (pin.y / 100) * SVG_H;
        const col = sensorColor(pin.sensor.status);
        const isHovered = hoveredSensor === pin.id;

        return (
          <g
            key={pin.id}
            onMouseEnter={() => setHoveredSensor(pin.id)}
            onMouseLeave={() => setHoveredSensor(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Pulse animation for online sensors */}
            {pin.sensor.status === 'online' && (
              <circle cx={px} cy={py} r={10} fill="none" stroke={col} strokeWidth={1} opacity={0.3}>
                <animate attributeName="r" from="5" to="14" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={px} cy={py} r={isHovered ? 7 : 5}
              fill={col} stroke="#0f172a" strokeWidth={2}
              filter={isHovered ? 'url(#glow)' : undefined}
            />
            <circle cx={px} cy={py} r={2} fill="#0f172a" />
          </g>
        );
      })}

      {/* Tooltips (rendered last so they appear on top) */}
      {hoveredSensorData && <SensorTooltip pin={hoveredSensorData} svgW={SVG_W} svgH={SVG_H} />}
      {hoveredRoomData && !hoveredSensorData && <RoomTooltip room={hoveredRoomData} svgW={SVG_W} svgH={SVG_H} />}

      {/* Legend box */}
      <rect x={SVG_W - 195} y={SVG_H - 152} width={185} height={142} rx={6} fill="rgba(15,23,42,0.92)" stroke="#334155" strokeWidth={1} />
      <text x={SVG_W - 185} y={SVG_H - 134} fill="#cbd5e1" fontSize={10} fontWeight={600}>LEGEND</text>
      {Object.entries(ROOM_FILLS).map(([type, style], i) => (
        <g key={type}>
          <rect x={SVG_W - 185} y={SVG_H - 120 + i * 17} width={12} height={12} rx={2} fill={style.bg} stroke={style.border} strokeWidth={1} />
          <text x={SVG_W - 168} y={SVG_H - 110 + i * 17} fill={style.label} fontSize={9}>
            {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </text>
        </g>
      ))}
      {/* Sensor status in legend */}
      <line x1={SVG_W - 185} y1={SVG_H - 120 + 6 * 17 - 2} x2={SVG_W - 16} y2={SVG_H - 120 + 6 * 17 - 2} stroke="#334155" strokeWidth={0.5} />
      {[
        { l: 'Online', c: '#22c55e' },
        { l: 'Offline', c: '#ef4444' },
        { l: 'Stale', c: '#eab308' },
      ].map((s, i) => (
        <g key={s.l}>
          <circle cx={SVG_W - 179 + i * 58} cy={SVG_H - 120 + 6 * 17 + 8} r={4} fill={s.c} stroke="#0f172a" strokeWidth={1.5} />
          <text x={SVG_W - 171 + i * 58} y={SVG_H - 120 + 6 * 17 + 12} fill="#94a3b8" fontSize={8}>{s.l}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function FloorPlansPage() {
  const { user } = useAuth();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [sensorPins, setSensorPins] = useState<SensorPin[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFloorId, setUploadFloorId] = useState('');
  const [uploadLabel, setUploadLabel] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dwgSource, setDwgSource] = useState<DigitalTwinSource | null>(null);
  const [dwgLoading, setDwgLoading] = useState(true);
  const [selectedPlanPreviewUrl, setSelectedPlanPreviewUrl] = useState<string | null>(null);
  const [selectedPlanPreviewLoading, setSelectedPlanPreviewLoading] = useState(false);

  const selectedPlan = floorPlans.find((p) => p.floorId === selectedFloorId);
  const selectedFloor = floors.find((f) => f.id === selectedFloorId);

  const isAdmin = user?.role === 'sys_admin';

  useEffect(() => {
    Promise.all([
      api.get<{ data: Floor[] }>('/floors'),
      api.get<{ data: FloorPlan[] }>('/floor-plans'),
    ])
      .then(([floorsRes, plansRes]) => {
        const sorted = floorsRes.data.sort((a, b) => a.sortOrder - b.sortOrder);
        setFloors(sorted);
        setFloorPlans(plansRes.data);
        if (sorted.length > 0) setSelectedFloorId(sorted[0].id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<{ data: DigitalTwinSource }>('/floor-plans/digital-twin/source')
      .then((res) => setDwgSource(res.data))
      .catch(() => setDwgSource(null))
      .finally(() => setDwgLoading(false));
  }, []);

  const loadFloorData = useCallback(async (planId: string) => {
    try {
      const [sensorsRes, roomsRes] = await Promise.all([
        api.get<{ data: SensorPin[] }>(`/floor-plans/${planId}/sensors`),
        api.get<{ data: Room[] }>(`/floor-plans/${planId}/rooms`),
      ]);
      setSensorPins(sensorsRes.data);
      setRooms(roomsRes.data);
    } catch {
      setSensorPins([]);
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedFloorId) return;
    const plan = floorPlans.find((p) => p.floorId === selectedFloorId);
    if (plan) {
      loadFloorData(plan.id);
    } else {
      setSensorPins([]);
      setRooms([]);
    }
  }, [selectedFloorId, floorPlans, loadFloorData]);

  useEffect(() => {
    let revokedUrl: string | null = null;
    const abortController = new AbortController();

    async function loadSelectedPlanFilePreview() {
      if (!selectedPlan) {
        setSelectedPlanPreviewUrl(null);
        return;
      }

      setSelectedPlanPreviewLoading(true);

      try {
        const token = await ensureValidToken();
        const response = await fetch(`/api/v1/floor-plans/${selectedPlan.id}/file`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to load floor plan preview file');
        }

        const fileBlob = await response.blob();
        revokedUrl = URL.createObjectURL(fileBlob);
        setSelectedPlanPreviewUrl(revokedUrl);
      } catch {
        setSelectedPlanPreviewUrl(null);
      } finally {
        setSelectedPlanPreviewLoading(false);
      }
    }

    loadSelectedPlanFilePreview();

    return () => {
      abortController.abort();
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [selectedPlan]);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading floor plans..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;

  const onlineCount = sensorPins.filter(s => s.sensor.status === 'online').length;
  const offlineCount = sensorPins.filter(s => s.sensor.status === 'offline').length;
  const staleCount = sensorPins.filter(s => s.sensor.status === 'stale').length;

  const handleUpload = async () => {
    if (!uploadFloorId || !uploadLabel || !uploadFile) return;

    const selectedUploadFloor = floors.find((f) => f.id === uploadFloorId);
    if (!selectedUploadFloor) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('buildingId', selectedUploadFloor.buildingId);
      formData.append('floorId', uploadFloorId);
      formData.append('label', uploadLabel);

      const res = await api.upload<{ data: FloorPlan }>('/floor-plans', formData);
      setFloorPlans((prev) => [...prev, res.data]);
      setShowUpload(false);
      setUploadFloorId('');
      setUploadLabel('');
      setUploadFile(null);
    } catch {}

    setUploading(false);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Delete this floor plan?')) return;
    setDeleting(planId);
    try {
      await api.delete(`/floor-plans/${planId}`);
      setFloorPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch {}
    setDeleting(null);
  };

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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Floor Plans</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-format floor plan viewer (SVG, PNG, PDF, DWG) with room &amp; sensor overlays</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Upload Floor Plan
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowUpload(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Upload Floor Plan</h2>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Floor</label>
                <select value={uploadFloorId} onChange={(e) => setUploadFloorId(e.target.value)} className="input-field w-full">
                  <option value="">Select floor...</option>
                  {floors.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Label</label>
                <input
                  type="text"
                  value={uploadLabel}
                  onChange={(e) => setUploadLabel(e.target.value)}
                  placeholder="e.g. 4th Floor Layout"
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Floor Plan File</label>
                <input
                  type="file"
                  accept=".svg,.png,.pdf,.dwg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="input-field w-full"
                />
                <p className="text-[11px] text-slate-500 mt-1">Accepted formats: SVG, PNG, PDF, DWG</p>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !uploadFloorId || !uploadLabel || !uploadFile}
                className="btn-primary w-full py-2 text-sm disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Floor selector sidebar */}
        <div className="lg:w-56 flex-shrink-0 space-y-4">
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-slate-400" />
              <h3 className="text-sm font-medium text-slate-300">Floors</h3>
            </div>
            <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
              {floors.map((floor) => {
                const hasPlan = floorPlans.some((p) => p.floorId === floor.id);
                const plan = floorPlans.find((p) => p.floorId === floor.id);
                const version = plan?.versions?.length || 0;
                return (
                  <div key={floor.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFloorId(floor.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-1 ${
                        selectedFloorId === floor.id
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span>{floor.name}</span>
                      <span className="flex items-center gap-1">
                        {version > 0 && (
                          <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">v{version}</span>
                        )}
                        {hasPlan && <Map className="h-3 w-3 opacity-50" />}
                      </span>
                    </button>
                    {isAdmin && plan && (
                      <button
                        onClick={() => handleDelete(plan.id)}
                        disabled={deleting === plan.id}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors flex-shrink-0"
                        title="Delete floor plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {floors.length === 0 && (
                <p className="text-xs text-slate-500 px-3 py-2">No floors available</p>
              )}
            </div>
          </div>

          {/* Room type legend card */}
          {selectedPlan && (
            <div className="card hidden lg:block">
              <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Room Types</h4>
              <div className="space-y-1.5">
                {Object.entries(ROOM_FILLS).map(([type, style]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm border"
                      style={{ background: style.bg, borderColor: style.border }}
                    />
                    <span className="text-xs" style={{ color: style.label }}>
                      {type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floor plan viewer */}
        <div className="flex-1">
          {selectedPlan && (
            <div className="card mb-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium text-slate-200">Uploaded Plan Source</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedPlan.fileType.toUpperCase()} · {selectedPlan.label ?? 'Unlabeled'}
                  </p>
                </div>
                {selectedPlanPreviewUrl && (
                  <a
                    href={selectedPlanPreviewUrl}
                    download={`${selectedPlan.label ?? selectedFloor?.name ?? 'floor-plan'}.${selectedPlan.fileType}`}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Download Source
                  </a>
                )}
              </div>

              <div className="mt-3 rounded-lg border border-slate-700 overflow-hidden bg-slate-900/70">
                {selectedPlanPreviewLoading ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
                    Loading floor plan preview...
                  </div>
                ) : selectedPlanPreviewUrl ? (
                  selectedPlan.fileType === 'png' ? (
                    <img
                      src={selectedPlanPreviewUrl}
                      alt="Floor plan source"
                      className="w-full h-[280px] object-contain"
                    />
                  ) : (
                    <object
                      data={selectedPlanPreviewUrl}
                      type={
                        selectedPlan.fileType === 'svg'
                          ? 'image/svg+xml'
                          : selectedPlan.fileType === 'pdf'
                            ? 'application/pdf'
                            : 'application/acad'
                      }
                      className="w-full h-[280px]"
                    >
                      <div className="h-[280px] flex items-center justify-center p-6 text-center">
                        <div>
                          <p className="text-sm text-slate-300">
                            Browser preview is not available for this {selectedPlan.fileType.toUpperCase()} file.
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Use Download Source to inspect the uploaded file.
                          </p>
                        </div>
                      </div>
                    </object>
                  )
                ) : (
                  <div className="h-[280px] flex items-center justify-center p-6 text-center">
                    <div>
                      <p className="text-sm text-slate-300">Failed to load source preview for this floor plan.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {dwgLoading ? (
            <div className="card mb-4 py-3 text-sm text-slate-400">Loading DWG digital twin source...</div>
          ) : dwgSource ? (
            <div className="card mb-4">
              <div className="flex flex-wrap items-center gap-3 justify-between">
                <div className="flex items-start gap-2.5">
                  <FileBox className="h-5 w-5 text-cyan-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Digital Twin CAD Source Loaded</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {dwgSource.name} · {formatBytes(dwgSource.fileSize)} · Updated {new Date(dwgSource.lastModified).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={dwgSource.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    Open DWG
                  </a>
                  <a
                    href={dwgSource.fileUrl}
                    download={dwgSource.name}
                    className="btn-primary text-xs py-1.5 px-3"
                  >
                    Download DWG
                  </a>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-slate-700 overflow-hidden bg-slate-900/70">
                <object
                  data={dwgSource.fileUrl}
                  type="application/acad"
                  className="w-full h-[280px]"
                >
                  <div className="h-[280px] flex items-center justify-center p-6 text-center">
                    <div>
                      <p className="text-sm text-slate-300">Browser preview for DWG is not supported in this environment.</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Use Open or Download to inspect Drawing4.dwg, while sensor overlays remain active below.
                      </p>
                    </div>
                  </div>
                </object>
              </div>
            </div>
          ) : (
            <div className="card mb-4 py-3 text-sm text-amber-400">
              Drawing4.dwg was not found by backend path discovery. Place it at workspace root and reload.
            </div>
          )}

          {/* Stats bar */}
          {selectedPlan && (
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Map className="h-3.5 w-3.5" />
                <span>{selectedFloor?.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <Wifi className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">{onlineCount} online</span>
              </div>
              {offlineCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <WifiOff className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-red-400">{offlineCount} offline</span>
                </div>
              )}
              {staleCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-yellow-400">{staleCount} stale</span>
                </div>
              )}
              <span className="text-[10px] text-slate-500 ml-auto">{rooms.length} rooms · {sensorPins.length} sensors</span>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            {!selectedPlan ? (
              <div className="flex flex-col items-center justify-center h-96">
                <Map className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500">
                  {selectedFloor ? `No floor plan uploaded for ${selectedFloor.name}` : 'Select a floor to view its plan'}
                </p>
              </div>
            ) : (
              <FloorPlanSVG rooms={rooms} sensors={sensorPins} floorName={selectedFloor?.name ?? ''} />
            )}
          </div>

          {/* Room conditions table */}
          {selectedPlan && rooms.length > 0 && (
            <div className="card mt-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Room Conditions</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Room</th>
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Type</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temp</span>
                      </th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-1"><Droplets className="h-3 w-3" /> Humidity</span>
                      </th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-1"><Wind className="h-3 w-3" /> CO₂</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map((room) => {
                      const s = roomStyle(room.type);
                      const tempWarn = room.temperature != null && room.temperature > 26;
                      const co2Warn = room.co2 != null && room.co2 > 800;
                      return (
                        <tr key={room.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="py-2 px-3 text-slate-200 font-medium">{room.name}</td>
                          <td className="py-2 px-3">
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-medium border"
                              style={{ color: s.label, background: s.bg, borderColor: s.border }}
                            >
                              {room.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className={`py-2 px-3 text-right ${tempWarn ? 'text-red-400' : 'text-slate-300'}`}>
                            {room.temperature != null ? `${room.temperature}°C` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {room.humidity != null ? `${room.humidity}%` : '—'}
                          </td>
                          <td className={`py-2 px-3 text-right ${co2Warn ? 'text-yellow-400' : 'text-slate-300'}`}>
                            {room.co2 != null ? `${room.co2} ppm` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
