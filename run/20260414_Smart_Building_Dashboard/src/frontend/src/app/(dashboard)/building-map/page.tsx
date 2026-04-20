'use client';

import { useState, useEffect } from 'react';
import { Globe, Building2, MapPin, Navigation, ZoomIn, ZoomOut, Locate, Layers } from 'lucide-react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface BuildingGeo {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  totalFloors: number;
  totalArea: number;
  timezone: string;
}

// ---------------------------------------------------------------------------
// Landmarks around Jakarta Sudirman area
// ---------------------------------------------------------------------------
const LANDMARKS = [
  { name: 'Bundaran HI', x: 42, y: 32, type: 'landmark' },
  { name: 'Grand Indonesia', x: 38, y: 28, type: 'mall' },
  { name: 'Plaza Indonesia', x: 44, y: 26, type: 'mall' },
  { name: 'Pacific Place', x: 54, y: 58, type: 'mall' },
  { name: 'Ritz Carlton', x: 48, y: 38, type: 'hotel' },
  { name: 'BCA Tower', x: 56, y: 42, type: 'office' },
  { name: 'Wisma 46', x: 36, y: 48, type: 'office' },
  { name: 'Masjid Istiqlal', x: 62, y: 18, type: 'landmark' },
  { name: 'Monas', x: 55, y: 22, type: 'landmark' },
  { name: 'Senayan City', x: 32, y: 68, type: 'mall' },
  { name: 'GBK Stadium', x: 28, y: 72, type: 'landmark' },
  { name: 'Sudirman Station', x: 46, y: 55, type: 'transport' },
];

const STREETS = [
  // Jl. Sudirman (main road, diagonal-ish NW to SE)
  { x1: 30, y1: 15, x2: 55, y2: 82, name: 'Jl. Sudirman', major: true },
  // Jl. Thamrin
  { x1: 40, y1: 10, x2: 45, y2: 50, name: 'Jl. Thamrin', major: true },
  // Horizontal roads
  { x1: 15, y1: 30, x2: 80, y2: 30, name: '', major: false },
  { x1: 20, y1: 45, x2: 75, y2: 45, name: '', major: false },
  { x1: 18, y1: 60, x2: 78, y2: 60, name: '', major: false },
  { x1: 25, y1: 75, x2: 70, y2: 75, name: '', major: false },
  // Vertical side roads
  { x1: 30, y1: 20, x2: 30, y2: 80, name: '', major: false },
  { x1: 60, y1: 15, x2: 60, y2: 78, name: '', major: false },
  { x1: 70, y1: 25, x2: 70, y2: 70, name: '', major: false },
];

// ---------------------------------------------------------------------------
// SVG Constants
// ---------------------------------------------------------------------------
const MAP_W = 900;
const MAP_H = 600;
const BUILDING_X = 48;
const BUILDING_Y = 48;

function landmarkColor(type: string) {
  switch (type) {
    case 'landmark': return '#eab308';
    case 'mall': return '#a78bfa';
    case 'hotel': return '#f472b6';
    case 'office': return '#60a5fa';
    case 'transport': return '#34d399';
    default: return '#94a3b8';
  }
}

// ---------------------------------------------------------------------------
// Compass Rose
// ---------------------------------------------------------------------------
function CompassRose({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={28} fill="rgba(15,23,42,0.85)" stroke="#475569" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={22} fill="none" stroke="#334155" strokeWidth={0.5} />
      {/* N */}
      <polygon points={`${cx},${cy - 20} ${cx - 5},${cy - 4} ${cx},${cy - 8}`} fill="#ef4444" />
      <polygon points={`${cx},${cy - 20} ${cx + 5},${cy - 4} ${cx},${cy - 8}`} fill="#fca5a5" />
      {/* S */}
      <polygon points={`${cx},${cy + 20} ${cx - 5},${cy + 4} ${cx},${cy + 8}`} fill="#475569" />
      <polygon points={`${cx},${cy + 20} ${cx + 5},${cy + 4} ${cx},${cy + 8}`} fill="#64748b" />
      {/* E */}
      <polygon points={`${cx + 20},${cy} ${cx + 4},${cy - 5} ${cx + 8},${cy}`} fill="#475569" />
      <polygon points={`${cx + 20},${cy} ${cx + 4},${cy + 5} ${cx + 8},${cy}`} fill="#64748b" />
      {/* W */}
      <polygon points={`${cx - 20},${cy} ${cx - 4},${cy - 5} ${cx - 8},${cy}`} fill="#475569" />
      <polygon points={`${cx - 20},${cy} ${cx - 4},${cy + 5} ${cx - 8},${cy}`} fill="#64748b" />
      {/* Labels */}
      <text x={cx} y={cy - 30} fill="#ef4444" fontSize={10} fontWeight={700} textAnchor="middle">N</text>
      <text x={cx} y={cy + 38} fill="#94a3b8" fontSize={8} textAnchor="middle">S</text>
      <text x={cx + 33} y={cy + 3} fill="#94a3b8" fontSize={8} textAnchor="middle">E</text>
      <text x={cx - 33} y={cy + 3} fill="#94a3b8" fontSize={8} textAnchor="middle">W</text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Scale Bar
// ---------------------------------------------------------------------------
function ScaleBar({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width={120} height={24} rx={4} fill="rgba(15,23,42,0.85)" stroke="#334155" strokeWidth={0.5} />
      <line x1={x + 10} y1={y + 14} x2={x + 110} y2={y + 14} stroke="#94a3b8" strokeWidth={1.5} />
      <line x1={x + 10} y1={y + 10} x2={x + 10} y2={y + 18} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x + 60} y1={y + 10} x2={x + 60} y2={y + 18} stroke="#94a3b8" strokeWidth={1} />
      <line x1={x + 110} y1={y + 10} x2={x + 110} y2={y + 18} stroke="#94a3b8" strokeWidth={1} />
      <text x={x + 10} y={y + 9} fill="#94a3b8" fontSize={7} textAnchor="middle">0</text>
      <text x={x + 60} y={y + 9} fill="#94a3b8" fontSize={7} textAnchor="middle">250m</text>
      <text x={x + 110} y={y + 9} fill="#94a3b8" fontSize={7} textAnchor="middle">500m</text>
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main map SVG
// ---------------------------------------------------------------------------
function MapSVG({ building }: { building: BuildingGeo }) {
  const [hoveredLandmark, setHoveredLandmark] = useState<string | null>(null);

  const bx = (BUILDING_X / 100) * MAP_W;
  const by = (BUILDING_Y / 100) * MAP_H;

  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full h-auto rounded-lg" style={{ background: '#0c1222' }}>
      <defs>
        {/* Map background grid */}
        <pattern id="map-grid" width={30} height={30} patternUnits="userSpaceOnUse">
          <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(30,41,59,0.5)" strokeWidth={0.3} />
        </pattern>
        {/* Building glow */}
        <radialGradient id="building-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(59,130,246,0.3)" />
          <stop offset="100%" stopColor="rgba(59,130,246,0)" />
        </radialGradient>
        <filter id="map-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background */}
      <rect width={MAP_W} height={MAP_H} fill="url(#map-grid)" />

      {/* City blocks (subtle rectangles to suggest buildings) */}
      {Array.from({ length: 30 }, (_, i) => {
        const bkx = 50 + (i % 6) * 140 + ((Math.floor(i / 6) % 2) * 30);
        const bky = 40 + Math.floor(i / 6) * 110;
        const bkw = 40 + (i * 7 % 50);
        const bkh = 30 + (i * 11 % 40);
        return (
          <rect key={`block-${i}`} x={bkx} y={bky} width={bkw} height={bkh} rx={2}
            fill="rgba(30,41,59,0.3)" stroke="rgba(51,65,85,0.2)" strokeWidth={0.5} />
        );
      })}

      {/* Streets */}
      {STREETS.map((st, i) => (
        <g key={`st-${i}`}>
          <line
            x1={(st.x1 / 100) * MAP_W} y1={(st.y1 / 100) * MAP_H}
            x2={(st.x2 / 100) * MAP_W} y2={(st.y2 / 100) * MAP_H}
            stroke={st.major ? 'rgba(100,116,139,0.4)' : 'rgba(71,85,105,0.25)'}
            strokeWidth={st.major ? 3 : 1.5}
            strokeLinecap="round"
          />
          {st.name && (
            <text
              x={((st.x1 + st.x2) / 2 / 100) * MAP_W}
              y={((st.y1 + st.y2) / 2 / 100) * MAP_H - 6}
              fill="rgba(148,163,184,0.5)"
              fontSize={8}
              textAnchor="middle"
              transform={st.x1 !== st.x2 && st.y1 !== st.y2
                ? `rotate(${Math.atan2(
                    (st.y2 - st.y1) / 100 * MAP_H,
                    (st.x2 - st.x1) / 100 * MAP_W
                  ) * 180 / Math.PI}, ${((st.x1 + st.x2) / 2 / 100) * MAP_W}, ${((st.y1 + st.y2) / 2 / 100) * MAP_H})`
                : undefined}
            >
              {st.name}
            </text>
          )}
        </g>
      ))}

      {/* Landmarks */}
      {LANDMARKS.map((lm) => {
        const lx = (lm.x / 100) * MAP_W;
        const ly = (lm.y / 100) * MAP_H;
        const col = landmarkColor(lm.type);
        const isHovered = hoveredLandmark === lm.name;

        return (
          <g
            key={lm.name}
            onMouseEnter={() => setHoveredLandmark(lm.name)}
            onMouseLeave={() => setHoveredLandmark(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={lx} cy={ly} r={isHovered ? 6 : 4} fill={col} opacity={isHovered ? 1 : 0.7}
              stroke="#0c1222" strokeWidth={1.5} />
            <text
              x={lx} y={ly - 8}
              fill={col} fontSize={isHovered ? 9 : 7} fontWeight={isHovered ? 600 : 400}
              textAnchor="middle" opacity={isHovered ? 1 : 0.7}
            >
              {lm.name}
            </text>
            {isHovered && (
              <text x={lx} y={ly + 16} fill="#94a3b8" fontSize={7} textAnchor="middle">
                {lm.type.charAt(0).toUpperCase() + lm.type.slice(1)}
              </text>
            )}
          </g>
        );
      })}

      {/* Building marker — main feature */}
      <g>
        {/* Glow effect */}
        <circle cx={bx} cy={by} r={40} fill="url(#building-glow)" />
        {/* Pulse rings */}
        <circle cx={bx} cy={by} r={20} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.3}>
          <animate attributeName="r" from="14" to="35" dur="3s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="3s" repeatCount="indefinite" />
        </circle>
        <circle cx={bx} cy={by} r={20} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.3}>
          <animate attributeName="r" from="14" to="35" dur="3s" begin="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="3s" begin="1.5s" repeatCount="indefinite" />
        </circle>
        {/* Pin shadow */}
        <ellipse cx={bx} cy={by + 22} rx={10} ry={3} fill="rgba(0,0,0,0.3)" />
        {/* Pin body */}
        <path
          d={`M ${bx} ${by + 18} C ${bx - 14} ${by} ${bx - 14} ${by - 18} ${bx} ${by - 18} C ${bx + 14} ${by - 18} ${bx + 14} ${by} ${bx} ${by + 18} Z`}
          fill="#3b82f6"
          stroke="#1e40af"
          strokeWidth={1.5}
          filter="url(#map-glow)"
        />
        {/* Building icon inside pin */}
        <rect x={bx - 6} y={by - 14} width={12} height={14} rx={1} fill="#1e3a5f" stroke="#93c5fd" strokeWidth={0.8} />
        <rect x={bx - 4} y={by - 12} width={3} height={3} rx={0.5} fill="#93c5fd" opacity={0.7} />
        <rect x={bx + 1} y={by - 12} width={3} height={3} rx={0.5} fill="#93c5fd" opacity={0.7} />
        <rect x={bx - 4} y={by - 7} width={3} height={3} rx={0.5} fill="#93c5fd" opacity={0.7} />
        <rect x={bx + 1} y={by - 7} width={3} height={3} rx={0.5} fill="#93c5fd" opacity={0.7} />
        <rect x={bx - 2} y={by - 2} width={4} height={4} rx={0.5} fill="#60a5fa" />
        {/* Label */}
        <text x={bx} y={by - 26} fill="#e2e8f0" fontSize={12} fontWeight={700} textAnchor="middle"
          filter="url(#map-glow)">
          {building.name}
        </text>
      </g>

      {/* Compass Rose */}
      <CompassRose cx={MAP_W - 45} cy={50} />

      {/* Scale Bar */}
      <ScaleBar x={14} y={MAP_H - 36} />

      {/* Title bar */}
      <rect x={0} y={0} width={MAP_W} height={28} fill="rgba(12,18,34,0.92)" />
      <text x={14} y={18} fill="#94a3b8" fontSize={11} fontWeight={600} letterSpacing={1}>
        GEOSPATIAL VIEW — JAKARTA, INDONESIA
      </text>
      <text x={MAP_W - 14} y={18} fill="#475569" fontSize={9} textAnchor="end">
        {building.latitude.toFixed(4)}°S, {building.longitude.toFixed(4)}°E
      </text>

      {/* Landmark legend */}
      <rect x={MAP_W - 160} y={MAP_H - 110} width={150} height={100} rx={6} fill="rgba(12,18,34,0.9)" stroke="#334155" strokeWidth={0.5} />
      <text x={MAP_W - 150} y={MAP_H - 92} fill="#cbd5e1" fontSize={9} fontWeight={600}>NEARBY PLACES</text>
      {['landmark', 'mall', 'hotel', 'office', 'transport'].map((type, i) => (
        <g key={type}>
          <circle cx={MAP_W - 145} cy={MAP_H - 76 + i * 15} r={3.5} fill={landmarkColor(type)} opacity={0.8} />
          <text x={MAP_W - 137} y={MAP_H - 73 + i * 15} fill="#94a3b8" fontSize={8}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function BuildingMapPage() {
  const [building, setBuilding] = useState<BuildingGeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    api.get<{ data: BuildingGeo }>('/buildings/geospatial')
      .then((res) => setBuilding(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner size="lg" className="py-20" label="Loading building map..." />;
  if (error) return <div className="card text-red-400 text-center py-8">{error}</div>;
  if (!building) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-50">Building Map</h1>
        <p className="text-sm text-slate-400 mt-1">Geospatial view of {building.name} and surrounding area</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Info sidebar */}
        <div className="lg:w-72 flex-shrink-0 space-y-4">
          {/* Building info card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-200">Building Info</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-lg font-bold text-slate-50">{building.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{building.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Floors</p>
                  <p className="text-lg font-bold text-slate-100">{building.totalFloors}</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Total Area</p>
                  <p className="text-lg font-bold text-slate-100">{(building.totalArea).toLocaleString()} m²</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinates card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-red-400" />
              <h4 className="text-sm font-medium text-slate-300">Coordinates</h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Latitude</span>
                <span className="text-slate-200 font-mono">{building.latitude.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Longitude</span>
                <span className="text-slate-200 font-mono">{building.longitude.toFixed(4)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timezone</span>
                <span className="text-slate-200">{building.timezone}</span>
              </div>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="h-4 w-4 text-slate-400" />
              <h4 className="text-sm font-medium text-slate-300">View Controls</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <div className="flex-1 bg-slate-700 rounded-full h-1.5 relative">
                <div
                  className="absolute top-0 left-0 h-1.5 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${((zoomLevel - 50) / 150) * 100}%` }}
                />
              </div>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-xs text-slate-500 mt-1">{zoomLevel}%</p>
            <button
              onClick={() => setZoomLevel(100)}
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 transition-colors"
            >
              <Locate className="h-3.5 w-3.5" />
              Reset View
            </button>
          </div>

          {/* Landmarks quick list */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-4 w-4 text-slate-400" />
              <h4 className="text-sm font-medium text-slate-300">Nearby Places</h4>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {LANDMARKS.map((lm) => (
                <div key={lm.name} className="flex items-center gap-2 py-1">
                  <div className="h-2 w-2 rounded-full" style={{ background: landmarkColor(lm.type) }} />
                  <span className="text-xs text-slate-300">{lm.name}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{lm.type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map viewer */}
        <div className="flex-1">
          <div
            className="card p-0 overflow-hidden"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', transition: 'transform 0.3s ease' }}
          >
            <MapSVG building={building} />
          </div>
        </div>
      </div>
    </div>
  );
}
