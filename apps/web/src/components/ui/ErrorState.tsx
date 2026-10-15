'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  details?: string;
  onRetry?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while processing your request.',
  details,
  onRetry,
  actionLabel,
  onAction,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-red-500/20 bg-red-500/[0.04]',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-n1-error shadow-sm mb-4">
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-base font-bold text-n1-text-primary tracking-tight">{title}</h3>
      <p className="text-xs text-n1-text-secondary mt-1.5 max-w-sm leading-relaxed">{message}</p>

      {details && (
        <div className="mt-4 w-full max-w-md">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-mono text-n1-text-muted hover:text-n1-text-secondary underline"
          >
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>
          {showDetails && (
            <div className="mt-2 p-3 rounded-lg bg-n1-surface-raised border border-n1-border text-left font-mono text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap">
              {details}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
