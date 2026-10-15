'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type ProgressVariant = 'primary' | 'gold' | 'success' | 'error';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
}

export function ProgressBar({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  indeterminate = false,
  className,
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variantStyles: Record<ProgressVariant, string> = {
    primary:
      'bg-gradient-to-r from-n1-purple to-n1-purple-light shadow-[0_0_12px_rgba(124,58,237,0.35)]',
    gold: 'bg-gradient-to-r from-amber-500 to-n1-gold shadow-[0_0_12px_rgba(245,197,24,0.3)]',
    success:
      'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.3)]',
    error: 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
  };

  const sizeStyles: Record<ProgressSize, string> = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)} {...props}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs font-medium text-n1-text-secondary">
          <span>{label || 'Progress'}</span>
          <span>{indeterminate ? 'Processing...' : `${Math.round(percentage)}%`}</span>
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={max}
        className={cn(
          'w-full bg-n1-surface-raised border border-n1-border-subtle rounded-full overflow-hidden relative',
          sizeStyles[size]
        )}
      >
        {indeterminate ? (
          <div
            className={cn(
              'h-full w-1/3 rounded-full animate-[indeterminate_1.5s_infinite_ease-in-out]',
              variantStyles[variant]
            )}
            style={{
              animation: 'indeterminate 1.5s infinite ease-in-out',
            }}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variantStyles[variant]
            )}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(150%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </div>
  );
}
