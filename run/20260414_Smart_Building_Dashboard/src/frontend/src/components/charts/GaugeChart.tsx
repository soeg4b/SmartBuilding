'use client';

import { useEffect, useRef, useState } from 'react';

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  zones?: { from: number; to: number; color: string }[];
  size?: number;
  className?: string;
}

const DEFAULT_ZONES = [
  { from: 0, to: 0.33, color: '#22c55e' },   // green
  { from: 0.33, to: 0.66, color: '#eab308' }, // yellow
  { from: 0.66, to: 1, color: '#ef4444' },    // red
];

export default function GaugeChart({
  value,
  min = 0,
  max = 100,
  label,
  unit,
  zones,
  size = 200,
  className = '',
}: GaugeChartProps) {
  const [animatedValue, setAnimatedValue] = useState(min);
  const prevValueRef = useRef(min);

  useEffect(() => {
    const clampedTarget = Math.min(Math.max(value, min), max);
    const startVal = prevValueRef.current;
    const startTime = performance.now();
    const duration = 600;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (clampedTarget - startVal) * eased;
      setAnimatedValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = clampedTarget;
      }
    }

    requestAnimationFrame(animate);
  }, [value, min, max]);

  const fraction = (animatedValue - min) / (max - min);
  const angle = -180 + fraction * 180; // -180 (left) to 0 (right)

  const cx = size / 2;
  const cy = size * 0.6;
  const radius = size * 0.4;
  const strokeWidth = size * 0.08;

  const colorZones = zones ?? DEFAULT_ZONES;

  function arcPath(startFrac: number, endFrac: number): string {
    const startAngle = Math.PI + startFrac * Math.PI;
    const endAngle = Math.PI + endFrac * Math.PI;
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const largeArc = endFrac - startFrac > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  }

  // Needle
  const needleAngle = Math.PI + fraction * Math.PI;
  const needleLength = radius * 0.85;
  const nx = cx + needleLength * Math.cos(needleAngle);
  const ny = cy + needleLength * Math.sin(needleAngle);

  // Get current color
  let currentColor = '#64748b';
  for (const zone of colorZones) {
    if (fraction >= zone.from && fraction <= zone.to) {
      currentColor = zone.color;
      break;
    }
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Background track */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Color zones */}
        {colorZones.map((zone, i) => (
          <path
            key={i}
            d={arcPath(zone.from, zone.to)}
            fill="none"
            stroke={zone.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.3}
          />
        ))}

        {/* Filled arc up to current value */}
        {fraction > 0.005 && (
          <path
            d={arcPath(0, Math.max(fraction, 0.01))}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#e2e8f0"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill="#e2e8f0" />

        {/* Min label */}
        <text
          x={cx - radius - strokeWidth / 2}
          y={cy + 14}
          textAnchor="middle"
          className="fill-slate-500 text-[10px]"
        >
          {min}
        </text>

        {/* Max label */}
        <text
          x={cx + radius + strokeWidth / 2}
          y={cy + 14}
          textAnchor="middle"
          className="fill-slate-500 text-[10px]"
        >
          {max}
        </text>
      </svg>

      {/* Value display */}
      <div className="text-center -mt-2">
        <span className="text-2xl font-bold text-slate-50">
          {Math.round(animatedValue)}
        </span>
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>
      {label && <p className="text-xs text-slate-400 mt-1">{label}</p>}
    </div>
  );
}
