'use client';

import { ReactNode } from 'react';

const toneText: Record<string, string> = {
  green: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
};
const toneBadge: Record<string, string> = {
  green: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  red: 'bg-red-500/10 text-red-400',
  blue: 'bg-blue-500/10 text-blue-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
};

export interface KpiCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'cyan';
  formula?: string;
  onClick?: () => void;
  loading?: boolean;
}

export default function KpiCard({ label, value, delta, tone = 'blue', formula, onClick, loading }: KpiCardProps) {
  const clickable = typeof onClick === 'function';
  const Component: any = clickable ? 'button' : 'div';
  return (
    <Component
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      title={formula ? `Rule: ${formula}` : undefined}
      className={`card text-left w-full ${clickable ? 'cursor-pointer hover:border-cyan-500/40 hover:bg-slate-900/60 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-400">{label}</p>
        {delta && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${toneBadge[tone]}`}>{delta}</span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-extrabold ${toneText[tone]}`}>
        {loading ? <span className="inline-block w-20 h-6 bg-slate-700/50 rounded animate-pulse" /> : value}
      </p>
      {formula && (
        <p className="mt-2 text-[10px] text-slate-500 leading-snug">
          <span className="text-slate-400 font-semibold">Rule:</span> {formula}
        </p>
      )}
      {clickable && (
        <p className="mt-2 text-[10px] text-cyan-500/80">Click for breakdown →</p>
      )}
    </Component>
  );
}
