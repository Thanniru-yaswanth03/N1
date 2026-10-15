'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { formatSeconds, cn } from '../../lib/utils';

export type CountdownVariant = 'badge' | 'timer' | 'compact';
export type CountdownSize = 'sm' | 'md' | 'lg';

export interface CountdownProps {
  targetDate?: Date | string | number;
  initialSeconds?: number;
  onExpire?: () => void;
  variant?: CountdownVariant;
  size?: CountdownSize;
  className?: string;
  showIcon?: boolean;
}

export function Countdown({
  targetDate,
  initialSeconds,
  onExpire,
  variant = 'badge',
  size = 'md',
  className,
  showIcon = true,
}: CountdownProps) {
  const [mounted, setMounted] = useState(false);

  // Compute total seconds remaining
  const calculateRemaining = useMemo(() => {
    return (): number => {
      if (initialSeconds !== undefined) {
        return Math.max(0, initialSeconds);
      }
      if (targetDate) {
        const targetTime = new Date(targetDate).getTime();
        const now = Date.now();
        return Math.max(0, Math.floor((targetTime - now) / 1000));
      }
      return 0;
    };
  }, [targetDate, initialSeconds]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(calculateRemaining);

  useEffect(() => {
    setMounted(true);
    setSecondsRemaining(calculateRemaining());

    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemaining, onExpire]);

  if (!mounted) {
    return (
      <span className={cn('inline-flex items-center font-mono opacity-50', className)}>--:--</span>
    );
  }

  const { days, hours, minutes, seconds, formatted } = formatSeconds(secondsRemaining);
  const isUrgent = secondsRemaining > 0 && secondsRemaining < 300; // < 5 mins
  const isExpired = secondsRemaining === 0;

  const clockIcon = (
    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  if (variant === 'timer') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-4 rounded-xl border font-mono select-none',
          isExpired
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : isUrgent
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
              : 'bg-n1-surface-raised border-n1-border text-n1-text-primary',
          className
        )}
      >
        {showIcon && <div className="text-n1-text-muted">{clockIcon}</div>}
        <div className="flex items-center gap-2">
          {days > 0 && (
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold">{days}</span>
              <span className="text-[10px] uppercase text-n1-text-muted">Days</span>
            </div>
          )}
          {days > 0 && <span className="text-n1-text-muted">:</span>}
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{hours.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase text-n1-text-muted">Hours</span>
          </div>
          <span className="text-n1-text-muted">:</span>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{minutes.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase text-n1-text-muted">Min</span>
          </div>
          <span className="text-n1-text-muted">:</span>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold">{seconds.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase text-n1-text-muted">Sec</span>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-mono font-medium',
          isExpired ? 'text-n1-error' : isUrgent ? 'text-n1-warning' : 'text-n1-text-secondary',
          className
        )}
      >
        {showIcon && clockIcon}
        <span>{isExpired ? 'Expired' : formatted}</span>
      </span>
    );
  }

  // Default: 'badge' variant
  const sizeStyles: Record<CountdownSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1',
    md: 'text-xs px-2.5 py-1 rounded-lg gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 rounded-xl gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium border select-none transition-colors duration-200',
        isExpired
          ? 'bg-red-500/10 border-red-500/30 text-red-400'
          : isUrgent
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
            : 'bg-n1-purple-dim border-n1-purple-border text-n1-purple-light',
        sizeStyles[size],
        className
      )}
    >
      {showIcon && clockIcon}
      <span>{isExpired ? 'Expired' : formatted}</span>
    </span>
  );
}
