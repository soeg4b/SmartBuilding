'use client';

import { clsx } from 'clsx';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'slate' | 'info' | 'warning' | 'critical' | 'normal' |
  'online' | 'offline' | 'stale' | 'active' | 'acknowledged' | 'resolved';

const variantStyles: Record<string, string> = {
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  normal: 'bg-green-500/10 text-green-400 border-green-500/20',
  online: 'bg-green-500/10 text-green-400 border-green-500/20',
  offline: 'bg-red-500/10 text-red-400 border-red-500/20',
  stale: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  active: 'bg-red-500/10 text-red-400 border-red-500/20',
  acknowledged: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
};

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  dot?: boolean;
  className?: string;
}

export default function StatusBadge({ variant, label, dot = false, className }: StatusBadgeProps) {
  const displayLabel = label ?? variant.charAt(0).toUpperCase() + variant.slice(1);
  const styles = variantStyles[variant] ?? variantStyles.slate;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border',
        styles,
        className
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', {
            'bg-green-400': ['green', 'normal', 'online', 'resolved'].includes(variant),
            'bg-yellow-400': ['yellow', 'warning', 'stale', 'acknowledged'].includes(variant),
            'bg-red-400': ['red', 'critical', 'offline', 'active'].includes(variant),
            'bg-blue-400': ['blue', 'info'].includes(variant),
            'bg-slate-400': variant === 'slate',
          })}
        />
      )}
      {displayLabel}
    </span>
  );
}
