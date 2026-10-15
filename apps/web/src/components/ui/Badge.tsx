'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  'primary' | 'gold' | 'success' | 'error' | 'warning' | 'muted' | 'outline';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({
  className,
  variant = 'primary',
  size = 'md',
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    primary: 'bg-n1-purple-dim text-n1-purple-light border-n1-purple-border',
    gold: 'bg-n1-gold-dim text-n1-gold border-n1-gold/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    error: 'bg-red-500/10 text-red-400 border-red-500/25',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    muted: 'bg-n1-surface-overlay text-n1-text-secondary border-n1-border-subtle',
    outline: 'bg-transparent text-n1-text-secondary border-n1-border',
  };

  const dotColors: Record<BadgeVariant, string> = {
    primary: 'bg-n1-purple-light',
    gold: 'bg-n1-gold',
    success: 'bg-emerald-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    muted: 'bg-n1-text-muted',
    outline: 'bg-n1-text-secondary',
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border font-sans select-none whitespace-nowrap',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={cn(
                'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                dotColors[variant]
              )}
            />
          )}
          <span
            className={cn('relative inline-flex rounded-full h-1.5 w-1.5', dotColors[variant])}
          />
        </span>
      )}
      {children}
    </span>
  );
}
