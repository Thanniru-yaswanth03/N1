'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ToolDefinition } from '../../types/tool';
import { ToolIcon } from './ToolIcons';
import { ToolCard } from './ToolCard';
import { Badge } from '../ui/Badge';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { TOOLS } from '../../lib/tools-data';

interface ToolLayoutProps {
  tool: ToolDefinition;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ToolLayout({ tool, actions, children }: ToolLayoutProps) {
  // Track recently used tool in localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('n1_client_tools_recent_v1');
      const recents: string[] = stored ? JSON.parse(stored) : [];
      const updated = [tool.slug, ...recents.filter(s => s !== tool.slug)].slice(0, 10);
      localStorage.setItem('n1_client_tools_recent_v1', JSON.stringify(updated));
    } catch {
      // LocalStorage access may fail in private mode
    }
  }, [tool.slug]);

  // Find up to 3 related tools in the same category
  const relatedTools = TOOLS.filter(
    t => t.category === tool.category && t.slug !== tool.slug
  ).slice(0, 3);

  const categoryLabels: Record<string, string> = {
    developer: 'Developer',
    text: 'Text Utilities',
    calculator: 'Calculators',
    image: 'Image & PDF',
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumbs & Back Navigation ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Tools', href: '/tools' },
            {
              label: categoryLabels[tool.category] || tool.category,
              href: `/tools?category=${tool.category}`,
            },
            { label: tool.title },
          ]}
        />

        {/* Client-Side Privacy Pill */}
        <div className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>100% Client-Side • Zero Data Upload</span>
        </div>
      </div>

      {/* ── Tool Header ── */}
      <div className="relative rounded-2xl p-6 sm:p-8 mb-8 border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-lg overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shadow-inner">
              <ToolIcon name={tool.icon} className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                  {tool.title}
                </h1>
                <Badge variant="primary" size="sm">
                  {categoryLabels[tool.category] || tool.category}
                </Badge>
                {tool.badge && (
                  <Badge variant={tool.badge === 'Popular' ? 'gold' : 'outline'} size="sm">
                    {tool.badge}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
                {tool.description}
              </p>
            </div>
          </div>

          {/* Action buttons (Clear, Sample, Copy, etc.) */}
          {actions && (
            <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Tool Workspace ── */}
      <main className="mb-14">
        {children}
      </main>

      {/* ── Privacy Reassurance Footer ── */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]/60 p-4 sm:p-5 mb-12 flex flex-col sm:flex-row items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <span className="font-semibold text-[var(--color-text-primary)] block sm:inline mr-2">
            Local Security Guarantee:
          </span>
          This tool runs entirely in your browser using client-side JavaScript, Web Workers, and Canvas APIs. No text, credentials, keys, or image pixels are ever sent to our servers.
        </div>
      </div>

      {/* ── Related Tools ── */}
      {relatedTools.length > 0 && (
        <section className="pt-8 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              More {categoryLabels[tool.category] || tool.category}
            </h2>
            <Link
              href={`/tools?category=${tool.category}`}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {relatedTools.map(related => (
              <ToolCard key={related.slug} tool={related} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
