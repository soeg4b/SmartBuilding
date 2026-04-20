'use client';

import { useEffect, useRef, useState } from 'react';

interface ComfortGaugeProps {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}

export default function ComfortGauge({
  score,
  size = 120,
  label,
  className = '',
}: ComfortGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(score, 0), 100);
    const start = prevRef.current;
    const startTime = performance.now();
    const duration = 500;

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (clamped - start) * eased;
      setAnimatedScore(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevRef.current = clamped;
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  const fraction = animatedScore / 100;

  const cx = size / 2;
  const cy = size * 0.55;
  const radius = size * 0.38;
  const strokeWidth = size * 0.07;

  // Arc from π (left) to 0 (right)
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

  let color: string;
  let statusText: string;
  if (animatedScore > 80) {
    color = '#22c55e';
    statusText = 'Good';
  } else if (animatedScore > 60) {
    color = '#eab308';
    statusText = 'Fair';
  } else {
    color = '#ef4444';
    statusText = 'Poor';
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        {/* Background track */}
        <path
          d={arcPath(0, 1)}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {fraction > 0.005 && (
          <path
            d={arcPath(0, Math.max(fraction, 0.01))}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Score text */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-50 font-bold"
          fontSize={size * 0.18}
        >
          {Math.round(animatedScore)}
        </text>

        {/* Status label */}
        <text
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          fontSize={size * 0.09}
          fill={color}
        >
          {statusText}
        </text>
      </svg>
      {label && <p className="text-xs text-slate-400 mt-0.5 text-center">{label}</p>}
    </div>
  );
}
