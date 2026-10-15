'use client';

import React from 'react';
import Link from 'next/link';
import { ToolDefinition } from '../../types/tool';
import { ToolIcon } from './ToolIcons';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';

interface ToolCardProps {
  tool: ToolDefinition;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
  className?: string;
}

export function ToolCard({
  tool,
  isFavorite = false,
  onToggleFavorite,
  className,
}: ToolCardProps) {
  const categoryColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    developer: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(124,58,237,0.18)]',
    },
    text: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(59,130,246,0.18)]',
    },
    calculator: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(16,185,129,0.18)]',
    },
    image: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/25',
      glow: 'group-hover:shadow-[0_0_25px_rgba(245,158,11,0.18)]',
    },
  };

  const style = categoryColors[tool.category] || {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/25',
    glow: 'group-hover:shadow-[0_0_25px_rgba(124,58,237,0.18)]',
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl p-5 transition-all duration-300',
        'bg-n1-surface border border-n1-border-subtle hover:border-n1-border hover:shadow-xl',
        'hover:-translate-y-1',
        style.glow,
        className
      )}
    >
      {/* Top Header: Icon + Category + Favorite */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div
            className={cn(
              'flex items-center justify-center w-11 h-11 rounded-xl border transition-transform duration-300 group-hover:scale-105',
              style.bg,
              style.text,
              style.border
            )}
          >
            <ToolIcon name={tool.icon} className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-1.5">
            {tool.badge && (
              <Badge
                variant={
                  tool.badge === 'Popular'
                    ? 'gold'
                    : tool.badge === 'New'
                    ? 'primary'
                    : 'outline'
                }
                size="sm"
              >
                {tool.badge}
              </Badge>
            )}

            {onToggleFavorite && (
              <button
                type="button"
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(tool.slug);
                }}
                className={cn(
                  'p-1.5 rounded-lg border transition-colors duration-200',
                  isFavorite
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'border-transparent text-n1-text-muted hover:text-n1-text-secondary hover:bg-n1-surface-raised'
                )}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <svg
                  className="w-4 h-4"
                  fill={isFavorite ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Title and Short Description */}
        <Link href={`/tools/${tool.slug}`} className="block focus:outline-none">
          <h3 className="text-base font-semibold text-n1-text-primary group-hover:text-n1-purple-light transition-colors line-clamp-1">
            {tool.title}
          </h3>
          <p className="mt-1.5 text-xs text-n1-text-secondary line-clamp-2 leading-relaxed">
            {tool.shortDescription}
          </p>
        </Link>
      </div>

      {/* Footer Link Button */}
      <div className="mt-5 pt-3.5 border-t border-n1-border-subtle flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider uppercase text-n1-text-muted">
          {tool.category}
        </span>

        <Link
          href={`/tools/${tool.slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-n1-purple-light group-hover:text-purple-300 transition-colors"
        >
          <span>Open Tool</span>
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
