'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  className,
  closeOnBackdropClick = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  // Handle client-side mount for createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle Escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Surface */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full rounded-2xl bg-n1-surface-raised border border-n1-border shadow-2xl z-10 overflow-hidden flex flex-col max-h-[90vh]',
          'animate-in zoom-in-95 duration-200',
          sizeStyles[size],
          className
        )}
      >
        {/* Header if title or description provided */}
        {(title || description) && (
          <div className="p-6 pb-4 border-b border-n1-border-subtle flex items-start justify-between gap-4">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-bold text-n1-text-primary tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-xs text-n1-text-secondary mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 -mr-1 -mt-1 text-n1-text-muted hover:text-n1-text-primary rounded-lg transition-colors focus-ring"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function ModalHeader({
  className,
  children,
  onClose,
}: {
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        'p-6 pb-4 border-b border-n1-border-subtle flex items-center justify-between gap-4',
        className
      )}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="p-1.5 -mr-1 -mt-1 text-n1-text-muted hover:text-n1-text-primary rounded-lg transition-colors focus-ring"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export function ModalFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'p-6 pt-4 border-t border-n1-border-subtle bg-n1-surface/50 flex items-center justify-end gap-3',
        className
      )}
    >
      {children}
    </div>
  );
}
