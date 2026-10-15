'use client';

import React from 'react';
import { useToast, ToastItem } from '../../hooks/use-toast';
import { cn } from '../../lib/utils';

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: () => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const { title, description, variant = 'info' } = toast;

  const variantStyles = {
    info: 'border-n1-purple/40 bg-n1-surface-raised/95 text-n1-text-primary',
    success: 'border-n1-success/40 bg-n1-surface-raised/95 text-n1-text-primary',
    warning: 'border-n1-warning/40 bg-n1-surface-raised/95 text-n1-text-primary',
    error: 'border-n1-error/40 bg-n1-surface-raised/95 text-n1-text-primary',
  };

  const iconColors = {
    info: 'text-n1-purple',
    success: 'text-n1-success',
    warning: 'text-n1-warning',
    error: 'text-n1-error',
  };

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2',
        variantStyles[variant]
      )}
    >
      <div className={cn('mt-0.5 shrink-0', iconColors[variant])}>
        {variant === 'success' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {variant === 'error' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        {variant === 'warning' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        )}
        {variant === 'info' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold leading-tight">{title}</h4>
        {description && (
          <p className="mt-1 text-xs text-n1-text-secondary leading-normal">{description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close notification"
        className="shrink-0 p-1 -mr-1 -mt-1 text-n1-text-muted hover:text-n1-text-primary rounded-lg transition-colors focus-ring"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
