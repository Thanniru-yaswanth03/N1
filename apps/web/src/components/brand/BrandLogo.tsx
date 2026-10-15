import React from 'react';
import { cn } from '../../lib/utils';

export type BrandPillar = 'core' | 'drop' | 'board' | 'duel' | 'tools';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  pillar?: BrandPillar;
  className?: string;
}

const sizeMap = {
  sm: { icon: 24, text: 'text-sm', badge: 'w-6 h-6 text-xs' },
  md: { icon: 32, text: 'text-lg sm:text-xl', badge: 'w-8 h-8 text-sm' },
  lg: { icon: 40, text: 'text-2xl', badge: 'w-10 h-10 text-base' },
  xl: { icon: 56, text: 'text-3xl sm:text-4xl', badge: 'w-14 h-14 text-xl' },
};

const pillarAccents: Record<BrandPillar, { color: string; border: string; label?: string }> = {
  core: { color: 'from-[#6366F1] to-[#8B5CF6]', border: 'border-[#6366F1]/30' },
  drop: { color: 'from-[#6366F1] to-[#4F46E5]', border: 'border-[#6366F1]/40', label: 'Drop' },
  board: { color: 'from-[#06B6D4] to-[#0EA5E9]', border: 'border-[#06B6D4]/40', label: 'Board' },
  duel: { color: 'from-[#EC4899] to-[#F43F5E]', border: 'border-[#EC4899]/40', label: 'Duel' },
  tools: { color: 'from-[#10B981] to-[#059669]', border: 'border-[#10B981]/40', label: 'Tools' },
};

export function BrandLogo({
  size = 'md',
  showText = true,
  pillar = 'core',
  className,
}: BrandLogoProps) {
  const currentSize = sizeMap[size];
  const accent = pillarAccents[pillar];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {/* N1 Monogram Emblem */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0F0C1B] to-[#1E1738] border shadow-sm transition-transform duration-200 group-hover:scale-105',
          accent.border,
          currentSize.badge
        )}
      >
        <svg
          width={currentSize.icon * 0.75}
          height={currentSize.icon * 0.75}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id="n1-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
            <linearGradient id="n1-accent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          {/* Stylized N */}
          <path
            d="M9 31V9L21 31V9"
            stroke="url(#n1-glow)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Stylized 1 with forward dynamic angle */}
          <path
            d="M26 14L30 10V31"
            stroke="url(#n1-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M25 31H35"
            stroke="url(#n1-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'font-brand font-black tracking-tight text-n1-text-primary transition-colors',
              currentSize.text
            )}
          >
            N1
          </span>
          {pillar !== 'core' && accent.label && (
            <span className="text-[11px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-n1-surface-raised border border-n1-border text-n1-text-secondary font-medium">
              {accent.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
