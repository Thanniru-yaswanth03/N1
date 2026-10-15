'use client';

import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      hint,
      options = [],
      children,
      id: customId,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-n1-text-secondary select-none">
            {label}
            {required && <span className="text-n1-error ml-1">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            className={cn(
              'w-full appearance-none bg-n1-surface-raised border border-n1-border text-n1-text-primary text-sm rounded-xl pl-4 pr-10 py-2.5 transition-all duration-200 focus-ring cursor-pointer',
              'hover:border-n1-purple/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-n1-error focus-visible:ring-n1-error hover:border-n1-error',
              className
            )}
            {...props}
          >
            {options.length > 0
              ? options.map(opt => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-n1-surface-raised text-n1-text-primary py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Custom Chevron Icon */}
          <div className="absolute right-3.5 text-n1-text-muted pointer-events-none flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {error && (
          <p
            id={errorId}
            className="text-xs font-medium text-n1-error flex items-center gap-1 mt-0.5"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {!error && hint && (
          <p id={hintId} className="text-xs text-n1-text-muted mt-0.5">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
