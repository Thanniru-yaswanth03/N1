'use client';

import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'raised' | 'overlay' | 'glass';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
  glow?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant = 'default', interactive = false, glow = false, children, ...props },
    ref
  ) => {
    const variantStyles: Record<CardVariant, string> = {
      default: 'bg-n1-surface border-n1-border-subtle shadow-sm',
      raised: 'bg-n1-surface-raised border-n1-border shadow-md',
      overlay: 'bg-n1-surface-overlay border-n1-border shadow-lg',
      glass: 'glass shadow-md',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border transition-all duration-200 overflow-hidden',
          variantStyles[variant],
          interactive &&
            'cursor-pointer hover:border-n1-purple/50 hover:-translate-y-0.5 hover:shadow-purple',
          glow && 'glow-purple',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6 pb-4 flex flex-col gap-1.5', className)} {...props}>
        {children}
      </div>
    );
  }
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-lg font-bold text-n1-text-primary tracking-tight leading-snug',
          className
        )}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-xs text-n1-text-secondary leading-relaxed', className)}
      {...props}
    >
      {children}
    </p>
  );
});
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'p-6 pt-4 border-t border-n1-border-subtle flex items-center justify-between gap-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardFooter.displayName = 'CardFooter';
