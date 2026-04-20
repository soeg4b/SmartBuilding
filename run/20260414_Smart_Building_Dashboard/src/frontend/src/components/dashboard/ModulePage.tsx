'use client';

import { ReactNode } from 'react';
import { useVertical } from '@/lib/vertical';

interface ModulePageProps {
  title: string;
  subtitle: string;
  badge?: string;
  kpis: { label: string; value: string; delta?: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'cyan' }[];
  children?: ReactNode;
}

const toneClass: Record<string, string> = {
  green: 'text-emerald-400 bg-emerald-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  red: 'text-red-400 bg-red-500/10',
  blue: 'text-blue-400 bg-blue-500/10',
  cyan: 'text-cyan-400 bg-cyan-500/10',
};

export default function ModulePage({ title, subtitle, badge, kpis, children }: ModulePageProps) {
  const { definition } = useVertical();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] tracking-widest text-cyan-400 uppercase">
            {badge ?? definition.shortLabel} · INTEGRA
          </p>
          <h1 className="text-3xl font-bold text-slate-50 mt-1">{title}</h1>
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold">
          ● Live
        </span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="card">
            <div className="flex items-start justify-between">
              <p className="text-xs text-slate-400">{k.label}</p>
              {k.delta && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${toneClass[k.tone ?? 'green']}`}>
                  {k.delta}
                </span>
              )}
            </div>
            <p className={`mt-2 text-2xl font-extrabold ${toneClass[k.tone ?? 'blue'].split(' ')[0]}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}

export function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      <div className="mt-4 h-40 rounded-lg bg-gradient-to-br from-slate-700/40 to-slate-700/10 border border-dashed border-slate-600 flex items-center justify-center text-xs text-slate-500">
        Visualization placeholder · backend wiring next
      </div>
    </div>
  );
}
