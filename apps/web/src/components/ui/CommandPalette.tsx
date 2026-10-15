'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TOOLS } from '../../lib/tools-data';

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Pillar' | 'Tool' | 'Action' | 'Page';
  icon: string;
  href: string;
  keywords?: string[];
}

const STATIC_COMMANDS: CommandItem[] = [
  {
    id: 'drop',
    title: 'Create Drop',
    subtitle: 'Share encrypted or plain files & text with self-destruct',
    category: 'Pillar',
    icon: '📦',
    href: '/drop',
    keywords: ['upload', 'share', 'file', 'secret', 'send', 'burn'],
  },
  {
    id: 'board',
    title: 'Study Board',
    subtitle: 'Real-time collaborative whiteboard with zero account login',
    category: 'Pillar',
    icon: '🎨',
    href: '/board',
    keywords: ['whiteboard', 'canvas', 'draw', 'sketch', 'collaborate', 'realtime'],
  },
  {
    id: 'duel',
    title: 'Quably Duel',
    subtitle: 'Compete in head-to-head live quiz duels with instant peer matching',
    category: 'Pillar',
    icon: '⚡',
    href: '/duel',
    keywords: ['quiz', 'game', 'battle', 'trivia', 'peer', 'competitive'],
  },
  {
    id: 'tools',
    title: 'All Developer Tools',
    subtitle: 'Browse 31 instant client-side utilities running in your browser',
    category: 'Pillar',
    icon: '🛠️',
    href: '/tools',
    keywords: ['utilities', 'toolbox', 'developer', 'browser', 'offline'],
  },
  {
    id: 'privacy',
    title: 'Privacy Center',
    subtitle: 'Read our zero-data retention, anonymous architecture guarantee',
    category: 'Page',
    icon: '🛡️',
    href: '/privacy',
    keywords: ['security', 'terms', 'data', 'gdpr', 'policy', 'anonymous'],
  },
  {
    id: 'help',
    title: 'Help & Guide',
    subtitle: 'Quick documentation on Drops, Boards, Duels, and Browser Tools',
    category: 'Page',
    icon: '📖',
    href: '/help',
    keywords: ['docs', 'faq', 'guide', 'support', 'help', 'tutorial'],
  },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load client favorites and recents on mount
  useEffect(() => {
    try {
      const favs = localStorage.getItem('n1_client_tools_favs_v1');
      if (favs) setFavoriteSlugs(JSON.parse(favs));
      const recents = localStorage.getItem('n1_client_tools_recent_v1');
      if (recents) setRecentSlugs(JSON.parse(recents));
    } catch {
      // Ignored in strict storage mode
    }
  }, [isOpen]);

  // Global keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('n1:open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('n1:open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const toolCommands = useMemo<CommandItem[]>(() => {
    return TOOLS.map(t => ({
      id: `tool-${t.slug}`,
      title: t.title,
      subtitle: t.shortDescription,
      category: 'Tool',
      icon: '🔧',
      href: `/tools/${t.slug}`,
      keywords: t.tags,
    }));
  }, []);

  // Filter items based on query
  const filteredItems = useMemo<CommandItem[]>(() => {
    const cleanQuery = query.trim().toLowerCase();

    // Special case: 6-char drop code pattern
    const isDropCode = /^[a-zA-Z0-9]{6}$/.test(cleanQuery);
    const dropCodeItem: CommandItem[] = isDropCode
      ? [
          {
            id: `drop-code-${cleanQuery}`,
            title: `Open Drop: ${cleanQuery.toUpperCase()}`,
            subtitle: `Jump directly to drop recipient page /d/${cleanQuery.toUpperCase()}`,
            category: 'Action',
            icon: '🚀',
            href: `/d/${cleanQuery.toUpperCase()}`,
          },
        ]
      : [];

    if (!cleanQuery) {
      // Default view: Pillars, Favorites (if any), Recents, and Helpful pages
      const favorites = toolCommands.filter(t =>
        favoriteSlugs.includes(t.id.replace('tool-', ''))
      );
      return [...STATIC_COMMANDS, ...favorites.slice(0, 4)];
    }

    const matches = [...STATIC_COMMANDS, ...toolCommands].filter(item => {
      const matchTitle = item.title.toLowerCase().includes(cleanQuery);
      const matchSubtitle = item.subtitle.toLowerCase().includes(cleanQuery);
      const matchKeywords = item.keywords?.some(k => k.toLowerCase().includes(cleanQuery));
      return matchTitle || matchSubtitle || matchKeywords;
    });

    return [...dropCodeItem, ...matches];
  }, [query, toolCommands, favoriteSlugs]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  const handleSelect = (item: CommandItem) => {
    setIsOpen(false);
    if (item.category === 'Tool') {
      // Record in recent tools
      try {
        const slug = item.href.replace('/tools/', '');
        const updated = [slug, ...recentSlugs.filter(s => s !== slug)].slice(0, 10);
        localStorage.setItem('n1_client_tools_recent_v1', JSON.stringify(updated));
      } catch {
        // Ignored
      }
    }
    router.push(item.href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) {
        handleSelect(item);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-n1-surface-raised border border-n1-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-n1-border-subtle bg-n1-surface/60">
          <svg
            className="w-5 h-5 text-n1-text-muted mr-3 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, tool name, or 6-character Drop code..."
            className="w-full bg-transparent text-sm sm:text-base text-n1-text-primary placeholder:text-n1-text-muted focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-xs text-n1-text-muted hover:text-n1-text-primary px-2 py-1 rounded"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-n1-text-muted bg-n1-surface border border-n1-border-subtle rounded-md ml-2 shrink-0">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-transparent focus:outline-none"
        >
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-n1-text-secondary">No matching results found</p>
              <p className="text-xs text-n1-text-muted mt-1">
                Try searching for &quot;drop&quot;, &quot;json&quot;, &quot;board&quot;, &quot;qr&quot;, or enter a 6-character code.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-n1-purple/15 text-n1-text-primary border border-n1-purple/30'
                      : 'hover:bg-n1-surface text-n1-text-secondary border border-transparent'
                  }`}
                >
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate text-n1-text-primary">
                        {item.title}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-n1-surface border border-n1-border-subtle text-n1-text-muted shrink-0">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-n1-text-muted truncate mt-0.5">{item.subtitle}</p>
                  </div>
                  {isSelected && (
                    <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-n1-purple-light shrink-0">
                      ↵ Go
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-n1-surface/80 border-t border-n1-border-subtle flex items-center justify-between text-[11px] text-n1-text-muted">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-n1-surface px-1 py-0.5 rounded border border-n1-border-subtle">↑</kbd>{' '}
              <kbd className="font-mono bg-n1-surface px-1 py-0.5 rounded border border-n1-border-subtle">↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono bg-n1-surface px-1 py-0.5 rounded border border-n1-border-subtle">↵</kbd> select
            </span>
          </div>
          <span className="font-mono text-[10px] text-n1-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-n1-success animate-pulse" />
            100% Client-Side Privacy
          </span>
        </div>
      </div>
    </div>
  );
}
