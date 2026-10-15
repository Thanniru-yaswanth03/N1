'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { TOOLS, TOOL_CATEGORIES } from '../../lib/tools-data';
import { ToolCategory } from '../../types/tool';
import { ToolCard } from '../../components/tools/ToolCard';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

function ToolsCatalogContent() {
  const searchParams = useSearchParams();
  const initialCategory = (searchParams?.get('category') as ToolCategory) || 'all';

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync category param if URL changes
  useEffect(() => {
    const cat = searchParams?.get('category');
    if (cat) {
      setActiveCategory(cat);
    }
  }, [searchParams]);

  // Load favorites & recents from localStorage
  useEffect(() => {
    try {
      // Primary key: n1_client_tools_favs_v1 (fallback to legacy n1_favorite_tools)
      const storedFavs =
        localStorage.getItem('n1_client_tools_favs_v1') ||
        localStorage.getItem('n1_favorite_tools');
      if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
      }

      const storedRecents = localStorage.getItem('n1_client_tools_recent_v1');
      if (storedRecents) {
        setRecentlyUsed(JSON.parse(storedRecents));
      }
    } catch {
      // LocalStorage access may fail in private mode
    }
  }, []);

  const toggleFavorite = (slug: string) => {
    setFavorites(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem('n1_client_tools_favs_v1', JSON.stringify(next));
        localStorage.setItem('n1_favorite_tools', JSON.stringify(next));
      } catch {
        // LocalStorage access may fail in private mode
      }
      return next;
    });
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let list = TOOLS.filter(tool => {
      const matchesCategory =
        activeCategory === 'all'
          ? true
          : activeCategory === 'favorites'
          ? favorites.includes(tool.slug)
          : activeCategory === 'recent'
          ? recentlyUsed.includes(tool.slug)
          : tool.category === activeCategory;

      if (!matchesCategory) return false;

      if (!q) return true;

      const inTitle = tool.title.toLowerCase().includes(q);
      const inDesc = tool.shortDescription.toLowerCase().includes(q);
      const inTags = tool.tags.some(t => t.toLowerCase().includes(q));

      return inTitle || inDesc || inTags;
    });

    if (activeCategory === 'recent') {
      list = [...list].sort(
        (a, b) => recentlyUsed.indexOf(a.slug) - recentlyUsed.indexOf(b.slug)
      );
    }

    return list;
  }, [searchQuery, activeCategory, favorites, recentlyUsed]);

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumbs ── */}
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Tools' }]} />
      </div>

      {/* ── Hero Header ── */}
      <div className="relative text-center mb-12 sm:mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-n1-purple/10 text-n1-purple-light border border-n1-purple/20 mb-4">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>31 Offline-First Browser Tools</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-n1-text-primary font-brand">
          Developer <span className="bg-gradient-to-r from-n1-purple-light via-purple-300 to-n1-gold bg-clip-text text-transparent">Toolbox</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-n1-text-secondary max-w-2xl mx-auto leading-relaxed">
          High-performance developer utilities, formatters, calculators, and image tools running 100% inside your browser. Zero server uploads. Pure privacy.
        </p>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="space-y-6 mb-10">
        {/* Search Bar */}
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-n1-text-muted">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools by name, tag, or function (e.g. JSON, JWT, PDF, EMI, QR)..."
            className="w-full pl-12 pr-14 py-3.5 rounded-2xl border border-n1-border bg-n1-surface text-sm text-n1-text-primary shadow-lg focus:outline-none focus:border-n1-purple focus:ring-2 focus:ring-n1-purple/20 transition-all placeholder-n1-text-muted"
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-n1-surface-raised border border-n1-border-subtle text-n1-text-muted">
              /
            </kbd>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
              activeCategory === 'all'
                ? 'border-n1-purple bg-n1-purple/15 text-n1-purple-light shadow-md'
                : 'border-n1-border-subtle bg-n1-surface text-n1-text-secondary hover:bg-n1-surface-raised'
            }`}
          >
            All Tools ({TOOLS.length})
          </button>

          {TOOL_CATEGORIES.map(cat => {
            const count = TOOLS.filter(t => t.category === cat.id).length;
            const active = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  active
                    ? 'border-n1-purple bg-n1-purple/15 text-n1-purple-light shadow-md'
                    : 'border-n1-border-subtle bg-n1-surface text-n1-text-secondary hover:bg-n1-surface-raised'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}

          <button
            onClick={() => setActiveCategory('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              activeCategory === 'favorites'
                ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-md'
                : 'border-n1-border-subtle bg-n1-surface text-n1-text-secondary hover:bg-n1-surface-raised'
            }`}
          >
            <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>Favorites ({favorites.length})</span>
          </button>

          {recentlyUsed.length > 0 && (
            <button
              onClick={() => setActiveCategory('recent')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                activeCategory === 'recent'
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-md'
                  : 'border-n1-border-subtle bg-n1-surface text-n1-text-secondary hover:bg-n1-surface-raised'
              }`}
            >
              <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Recent ({recentlyUsed.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tools Grid ── */}
      {filteredTools.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-n1-border-subtle bg-n1-surface max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-n1-purple/10 text-n1-purple-light flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-n1-text-primary">No tools found</h3>
          <p className="text-xs text-n1-text-secondary mt-1 mb-4">
            No matching tools for &ldquo;{searchQuery}&rdquo; in this category.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="text-xs text-n1-purple-light hover:underline font-medium"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredTools.map(tool => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              isFavorite={favorites.includes(tool.slug)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      {/* ── Category Quick Browse Section ── */}
      <div className="mt-20 pt-10 border-t border-n1-border-subtle">
        <h2 className="text-xl font-bold text-n1-text-primary mb-6 text-center font-brand">
          Browse by Category
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOOL_CATEGORIES.map(cat => {
            const count = TOOLS.filter(t => t.category === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                className="p-5 rounded-2xl border border-n1-border-subtle bg-n1-surface hover:border-n1-purple/40 text-left transition-all group"
              >
                <h3 className="text-sm font-semibold text-n1-text-primary group-hover:text-n1-purple-light transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-n1-text-secondary mt-1.5 line-clamp-2">
                  {cat.description}
                </p>
                <div className="mt-3 text-[11px] font-mono text-n1-purple-light font-medium">
                  {count} tools available &rarr;
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ToolsCatalogPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-n1-bg" />}>
      <ToolsCatalogContent />
    </React.Suspense>
  );
}
