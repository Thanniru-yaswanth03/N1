'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  // Normalize: if caller included 'Home' as the first element, avoid duplicate Home root link
  const effectiveItems =
    items[0]?.label.toLowerCase() === 'home' || items[0]?.href === '/'
      ? items.slice(1)
      : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-xs font-medium text-n1-text-secondary', className)}
    >
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        <li>
          <Link
            href="/"
            className="hover:text-n1-text-primary transition-colors flex items-center gap-1 focus-ring rounded"
          >
            <span className="text-sm">🏠</span>
            <span className="hidden xs:inline">Home</span>
          </Link>
        </li>
        {effectiveItems.map((item, index) => {
          const isLast = index === effectiveItems.length - 1 || item.active;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="text-n1-text-muted select-none" aria-hidden="true">
                /
              </span>
              {isLast || !item.href ? (
                <span
                  className="text-n1-text-primary font-semibold truncate max-w-[200px] sm:max-w-xs"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-n1-text-primary transition-colors truncate max-w-[150px] sm:max-w-none focus-ring rounded"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
