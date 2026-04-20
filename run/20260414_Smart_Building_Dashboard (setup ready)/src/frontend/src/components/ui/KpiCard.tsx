'use client';

import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  className?: string;
}

export default function KpiCard({ title, value, subtitle, icon: Icon, trend, className }: KpiCardProps) {
  return (
    <div className={clsx('card flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Icon className="h-5 w-5 text-blue-400" />
          </div>
        )}
      </div>
      <div className="text-4xl font-bold text-slate-50 tracking-tight">{value}</div>
      <div className="flex items-center gap-2">
        {trend && (
          <span
            className={clsx(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              trend.value >= 0 ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
            )}
          >
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
        )}
        {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
      </div>
    </div>
  );
}
