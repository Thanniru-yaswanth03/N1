'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-ring select-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-n1-purple text-white hover:bg-n1-purple-light shadow-sm hover:shadow-purple border border-transparent',
      secondary:
        'bg-n1-surface-raised text-n1-text-primary border border-n1-border hover:bg-n1-surface-overlay hover:border-n1-purple/40',
      subtle:
        'bg-n1-purple-dim text-n1-purple-light border border-n1-purple-border hover:bg-n1-purple/20',
      ghost:
        'bg-transparent text-n1-text-secondary hover:bg-n1-surface-raised hover:text-n1-text-primary border border-transparent',
      danger: 'bg-n1-error text-white hover:bg-red-600 shadow-sm border border-transparent',
      gold: 'bg-n1-gold text-[#09090F] font-semibold hover:bg-n1-gold-light shadow-sm border border-transparent',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5 font-medium',
      md: 'text-sm px-4 py-2.5 rounded-xl gap-2 font-medium',
      lg: 'text-base px-6 py-3 rounded-xl gap-2.5 font-semibold',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
