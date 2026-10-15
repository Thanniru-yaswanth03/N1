'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatSeconds, cn } from '../../lib/utils';

export interface ExpiryUrgencyCardProps {
  createdAt?: string;
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export function ExpiryUrgencyCard({
  createdAt,
  expiresAt,
  onExpire,
  className,
}: ExpiryUrgencyCardProps) {
  const [mounted, setMounted] = useState(false);

  const targetMs = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const createdMs = useMemo(
    () => (createdAt ? new Date(createdAt).getTime() : targetMs - 3600000),
    [createdAt, targetMs]
  );
  const totalLifetimeMs = Math.max(1000, targetMs - createdMs);

  const computeRemaining = () => {
    const diff = targetMs - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [secondsRemaining, setSecondsRemaining] = useState<number>(computeRemaining);

  useEffect(() => {
    setMounted(true);
    setSecondsRemaining(computeRemaining());

    const interval = setInterval(() => {
      const rem = computeRemaining();
      setSecondsRemaining(rem);
      if (rem <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMs, onExpire]);

  if (!mounted) {
    return (
      <div className={cn('p-4 rounded-2xl bg-n1-surface-raised border border-n1-border', className)}>
        <div className="flex items-center justify-between text-xs text-n1-text-muted">
          <span>Loading expiry timeline...</span>
        </div>
      </div>
    );
  }

  const isExpired = secondsRemaining <= 0;
  const remainingMs = secondsRemaining * 1000;
  const percentRemaining = isExpired
    ? 0
    : Math.min(100, Math.max(1, Math.round((remainingMs / totalLifetimeMs) * 100)));

  // Urgency classification
  const isUrgent = !isExpired && secondsRemaining < 180; // under 3 minutes
  const isWarning = !isExpired && (secondsRemaining < 600 || percentRemaining <= 20); // under 10 minutes or <= 20%

  const { formatted, days, hours, minutes, seconds } = formatSeconds(secondsRemaining);

  let formattedTimeText = formatted;
  if (days > 0) {
    formattedTimeText = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formattedTimeText = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formattedTimeText = `${minutes}m ${seconds}s`;
  }

  // Tier color styling
  let statusBadge = {
    bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    label: 'Active & Stable',
    barColor: 'bg-gradient-to-r from-n1-purple to-emerald-400',
  };

  if (isExpired) {
    statusBadge = {
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      label: 'Expired • Purged',
      barColor: 'bg-rose-600',
    };
  } else if (isUrgent) {
    statusBadge = {
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      label: 'Expiring Imminently',
      barColor: 'bg-gradient-to-r from-amber-500 to-rose-500',
    };
  } else if (isWarning) {
    statusBadge = {
      bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      label: 'Expiring Soon',
      barColor: 'bg-gradient-to-r from-n1-purple to-amber-400',
    };
  }

  return (
    <div
      className={cn(
        'p-4 sm:p-5 rounded-2xl border transition-all duration-300 shadow-md space-y-3.5',
        isExpired
          ? 'bg-rose-950/20 border-rose-500/30'
          : isUrgent
            ? 'bg-rose-950/15 border-rose-500/40 ring-1 ring-rose-500/20'
            : isWarning
              ? 'bg-amber-950/15 border-amber-500/30'
              : 'bg-n1-surface-raised/90 border-n1-border',
        className
      )}
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {!isExpired && (
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  isUrgent ? 'bg-rose-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full h-3 w-3',
                isExpired ? 'bg-rose-500' : isUrgent ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
              )}
            />
          </span>

          <span className="text-xs font-bold uppercase tracking-wider text-n1-text-primary">
            {isExpired ? 'Drop Lifetime Expired' : 'Drop Lifetime Countdown'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2.5 py-0.5 rounded-full text-[11px] font-bold border uppercase tracking-wider font-mono',
              statusBadge.bg
            )}
          >
            {statusBadge.label}
          </span>
          {!isExpired && (
            <span className="text-xs font-mono text-n1-text-muted">
              ({percentRemaining}% remaining)
            </span>
          )}
        </div>
      </div>

      {/* Visual Lifetime Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={percentRemaining}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Drop lifetime remaining percentage"
        className="w-full bg-n1-surface border border-n1-border-subtle rounded-full h-3 overflow-hidden p-0.5"
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-linear shadow-sm',
            statusBadge.barColor
          )}
          style={{ width: `${percentRemaining}%` }}
        />
      </div>

      {/* Bottom Readout Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-n1-text-muted gap-2 pt-0.5">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-n1-text-secondary font-semibold">Remaining:</span>
          {isExpired ? (
            <span className="text-rose-400 font-bold">00:00:00 (Expunged from Server)</span>
          ) : (
            <span
              className={cn(
                'font-bold text-sm tracking-wide',
                isUrgent ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-n1-purple-light'
              )}
            >
              ⏱️ {formattedTimeText}
            </span>
          )}
        </div>

        <div className="font-mono text-[11px]">
          Scheduled Expunge:{' '}
          <span className="text-n1-text-primary font-medium">
            {new Date(expiresAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            at{' '}
            {new Date(expiresAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
