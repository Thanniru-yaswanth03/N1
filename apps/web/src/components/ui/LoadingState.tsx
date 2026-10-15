'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'purple' | 'gold' | 'white' | 'muted';

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: SpinnerSize;
  color?: SpinnerColor;
}

export function Spinner({ size = 'md', color = 'purple', className, ...props }: SpinnerProps) {
  const sizeStyles: Record<SpinnerSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const colorStyles: Record<SpinnerColor, string> = {
    purple: 'text-n1-purple',
    gold: 'text-n1-gold',
    white: 'text-white',
    muted: 'text-n1-text-muted',
  };

  return (
    <svg
      role="status"
      aria-label="Loading"
      className={cn('animate-spin shrink-0', sizeStyles[size], colorStyles[color], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export function Skeleton({
  width,
  height,
  circle = false,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-n1-surface-raised border border-n1-border-subtle animate-pulse',
        circle ? 'rounded-full' : 'rounded-lg',
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

export interface LoadingOverlayProps {
  message?: string;
  size?: SpinnerSize;
  className?: string;
}

export function LoadingOverlay({
  message = 'Loading...',
  size = 'lg',
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-n1-surface/60 backdrop-blur-sm border border-n1-border-subtle',
        className
      )}
    >
      <Spinner size={size} color="purple" />
      {message && <p className="mt-3 text-xs font-medium text-n1-text-secondary">{message}</p>}
    </div>
  );
}
