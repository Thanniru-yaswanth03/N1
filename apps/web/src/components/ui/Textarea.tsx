'use client';

import React, { forwardRef, useId, useState } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCharCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      hint,
      showCharCount = false,
      maxLength,
      value,
      defaultValue,
      onChange,
      id: customId,
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const [currentLength, setCurrentLength] = useState<number>(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrentLength(e.target.value.length);
      onChange?.(e);
    };

    const isNearLimit = maxLength && currentLength >= maxLength * 0.9;
    const isAtLimit = maxLength && currentLength >= maxLength;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={id}
              className="text-xs font-semibold text-n1-text-secondary select-none"
            >
              {label}
              {required && <span className="text-n1-error ml-1">*</span>}
            </label>
          )}

          {showCharCount && maxLength && (
            <span
              className={cn(
                'text-xs font-mono select-none',
                isAtLimit
                  ? 'text-n1-error font-bold'
                  : isNearLimit
                    ? 'text-n1-warning font-semibold'
                    : 'text-n1-text-muted'
              )}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            'w-full bg-n1-surface-raised border border-n1-border text-n1-text-primary placeholder:text-n1-text-muted text-sm rounded-xl p-3.5 transition-all duration-200 focus-ring resize-y min-h-[96px]',
            'hover:border-n1-purple/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-n1-error focus-visible:ring-n1-error hover:border-n1-error',
            className
          )}
          {...props}
        />

        <div className="flex items-center justify-between min-h-[16px]">
          {error ? (
            <p id={errorId} className="text-xs font-medium text-n1-error flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </p>
          ) : hint ? (
            <p id={hintId} className="text-xs text-n1-text-muted">
              {hint}
            </p>
          ) : (
            <span />
          )}

          {showCharCount && !maxLength && (
            <span className="text-xs font-mono text-n1-text-muted ml-auto select-none">
              {currentLength} chars
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
