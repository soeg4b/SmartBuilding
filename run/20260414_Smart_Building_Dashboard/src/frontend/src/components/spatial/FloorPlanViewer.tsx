'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Thermometer,
  Droplets,
  Wind,
  Zap,
  Eye,
  EyeOff,
  Layers,
} from 'lucide-react';
import type { SensorType } from '@smart-building/shared/types';
import { useRealtime } from '@/hooks/useRealtime';

interface SensorPin {
  id: string;
  sensorId: string;
  name: string;
  type: SensorType;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  unit: string;
}

interface FloorPlanViewerProps {
  buildingId: string;
  floorId: string;
  floorPlanUrl: string;
  sensors: SensorPin[];
  className?: string;
}

const SENSOR_TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  temperature: { icon: Thermometer, color: '#ef4444', label: 'Temperature' },
  humidity: { icon: Droplets, color: '#3b82f6', label: 'Humidity' },
  co2: { icon: Wind, color: '#a855f7', label: 'CO₂' },
  energy_meter: { icon: Zap, color: '#eab308', label: 'Energy' },
  power_factor: { icon: Zap, color: '#f97316', label: 'Power Factor' },
  fuel_level: { icon: Zap, color: '#14b8a6', label: 'Fuel Level' },
  vibration: { icon: Zap, color: '#ec4899', label: 'Vibration' },
  runtime: { icon: Zap, color: '#6366f1', label: 'Runtime' },
};

type LayerType = 'temperature' | 'humidity' | 'co2' | 'energy_meter';

const LAYER_OPTIONS: { type: LayerType; label: string }[] = [
  { type: 'temperature', label: 'Temperature' },
  { type: 'humidity', label: 'Humidity' },
  { type: 'co2', label: 'CO₂' },
  { type: 'energy_meter', label: 'Energy' },
];

export default function FloorPlanViewer({
  buildingId,
  floorId,
  floorPlanUrl,
  sensors,
  className = '',
}: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [activeLayers, setActiveLayers] = useState<Set<string>>(
    new Set(['temperature', 'humidity', 'co2', 'energy_meter'])
  );
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  const { sensorReadings } = useRealtime({ buildingId });

  const toggleLayer = (type: string) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const visibleSensors = sensors.filter((s) => activeLayers.has(s.type));

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-sensor-pin]') && !target.closest('[data-sensor-popover]')) {
        setSelectedSensor(null);
      }
      if (layerRef.current && !layerRef.current.contains(target)) {
        setShowLayers(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className={`card p-0 overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-200">Floor Plan</h3>
        <div className="flex items-center gap-2">
          {/* Layer toggle */}
          <div ref={layerRef} className="relative">
            <button
              onClick={() => setShowLayers(!showLayers)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Toggle layers"
            >
              <Layers className="h-4 w-4" />
            </button>
            {showLayers && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 min-w-[180px] z-20">
                {LAYER_OPTIONS.map((layer) => {
                  const active = activeLayers.has(layer.type);
                  const config = SENSOR_TYPE_CONFIG[layer.type];
                  return (
                    <button
                      key={layer.type}
                      onClick={() => toggleLayer(layer.type)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-600 transition-colors"
                    >
                      {active ? (
                        <Eye className="h-3.5 w-3.5 text-blue-400" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                      )}
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config?.color ?? '#64748b' }}
                      />
                      <span className={active ? 'text-slate-200' : 'text-slate-400'}>
                        {layer.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-400 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Floor plan area */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-slate-900"
        style={{ minHeight: 400 }}
      >
        <div
          className="relative origin-top-left transition-transform duration-200"
          style={{ transform: `scale(${zoom})`, width: '100%', aspectRatio: '16/10' }}
        >
          {/* Floor plan image */}
          <img
            src={floorPlanUrl}
            alt="Floor plan"
            className="w-full h-full object-contain"
            draggable={false}
          />

          {/* Sensor pins */}
          {visibleSensors.map((sensor) => {
            const config = SENSOR_TYPE_CONFIG[sensor.type] ?? {
              icon: Zap,
              color: '#64748b',
              label: sensor.type,
            };
            const reading = sensorReadings.get(sensor.sensorId);
            const isSelected = selectedSensor === sensor.id;
            const Icon = config.icon;

            return (
              <div
                key={sensor.id}
                data-sensor-pin
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${sensor.x}%`, top: `${sensor.y}%` }}
                onClick={() => setSelectedSensor(isSelected ? null : sensor.id)}
              >
                {/* Pulsing ring */}
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-30"
                  style={{
                    backgroundColor: config.color,
                    width: 28,
                    height: 28,
                    top: -6,
                    left: -6,
                  }}
                />
                {/* Pin */}
                <div
                  className="relative w-4 h-4 rounded-full border-2 flex items-center justify-center z-10 transition-transform group-hover:scale-125"
                  style={{
                    backgroundColor: config.color,
                    borderColor: config.color,
                  }}
                >
                  <Icon className="h-2.5 w-2.5 text-white" />
                </div>

                {/* Popover */}
                {isSelected && (
                  <div
                    data-sensor-popover
                    className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-3 bg-slate-700 border border-slate-600 rounded-lg shadow-xl p-3 min-w-[180px] animate-fadeIn"
                  >
                    <div className="text-xs font-semibold text-slate-200 mb-1">
                      {sensor.name}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{config.label}</div>
                    {reading ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-50">
                          {reading.value.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-400">{reading.unit}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">No reading</div>
                    )}
                    {reading?.timestamp && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(reading.timestamp).toLocaleTimeString()}
                      </div>
                    )}
                    {/* Arrow */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-slate-700 border-r border-b border-slate-600 rotate-45 -mt-1" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-slate-700 bg-slate-800/50">
        <span className="text-xs text-slate-400 font-medium">Legend:</span>
        {LAYER_OPTIONS.map((layer) => {
          const config = SENSOR_TYPE_CONFIG[layer.type];
          const active = activeLayers.has(layer.type);
          return (
            <div
              key={layer.type}
              className={`flex items-center gap-1.5 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: active ? config?.color : '#475569' }}
              />
              {layer.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
