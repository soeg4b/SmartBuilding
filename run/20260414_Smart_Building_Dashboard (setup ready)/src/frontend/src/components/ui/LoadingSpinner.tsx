'use client';

import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export default function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={clsx(
          'animate-spin rounded-full border-2 border-slate-600 border-t-blue-500',
          sizeMap[size]
        )}
      />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
}
