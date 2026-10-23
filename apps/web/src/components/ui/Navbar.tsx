'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme, Theme } from '../theme-provider';
import { Button } from './Button';
import { cn } from '../../lib/utils';
import { RecentDropsDrawer } from '../drop/RecentDropsDrawer';
import { BrandLogo } from '../brand/BrandLogo';

export function Navbar() {
  const pathname = usePathname();

  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [recentDropsOpen, setRecentDropsOpen] = useState(false);

  // Close all drawers on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setThemeDropdownOpen(false);
    setRecentDropsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile navigation menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [mobileMenuOpen]);

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  // Dedicated fullscreen collaborative workspaces (e.g. Study Board canvas) have their own header
  if (pathname?.startsWith('/board/') && pathname !== '/board') {
    return null;
  }

  const navLinks: Array<{
    href: string;
    label: string;
    active?: boolean;
    disabled?: boolean;
  }> = [
    { href: '/drop', label: 'Drop', active: pathname === '/drop' || pathname?.startsWith('/drop/') || pathname?.startsWith('/d/') },
    { href: '/board', label: 'Study Board', active: pathname === '/board' || pathname?.startsWith('/board/') },
    { href: '/duel', label: 'Quably Duel', active: pathname === '/duel' || pathname?.startsWith('/duel/') },
    { href: '/tools', label: 'Tools', active: pathname === '/tools' || pathname?.startsWith('/tools/') },
  ];

  const themeOptions: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ),
    },
    {
      value: 'light',
      label: 'Light',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      value: 'system',
      label: 'System',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-3.5 px-4 pointer-events-none">
      <div className="w-full max-w-[1080px] h-[60px] px-4 sm:px-6 rounded-full border border-n1-border-subtle bg-n1-surface/75 backdrop-blur-md shadow-md flex items-center justify-between pointer-events-auto transition-all duration-300">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center text-decoration-none group">
          <BrandLogo size="md" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-n1-text-secondary">
          {navLinks.map(link =>
            link.disabled ? (
              <span
                key={link.label}
                className="text-n1-text-muted cursor-not-allowed select-none text-xs"
                title="Coming soon"
              >
                {link.label}
              </span>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  'transition-colors duration-150',
                  link.active ? 'text-n1-purple-light font-semibold' : 'hover:text-n1-text-primary'
                )}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Right Section: Command Palette + Recent Drops + Theme Selector + Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Global Search / Command Palette Trigger */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('n1:open-command-palette'))}
            aria-label="Open command palette search (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-n1-text-secondary hover:text-n1-text-primary rounded-full hover:bg-n1-surface-raised border border-n1-border-subtle transition-all duration-150 focus-ring"
            title="Quick Launcher (Ctrl+K)"
          >
            <svg className="w-3.5 h-3.5 text-n1-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden lg:inline text-[11px] text-n1-text-muted">Search</span>
            <kbd className="hidden lg:inline text-[10px] font-mono px-1 rounded bg-n1-surface border border-n1-border-subtle text-n1-text-muted">⌘K</kbd>
          </button>

          {/* Recent Drops Drawer Button */}
          <button
            type="button"
            onClick={() => setRecentDropsOpen(true)}
            aria-label="View recent drops stored on this device"
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-n1-text-secondary hover:text-n1-text-primary rounded-full hover:bg-n1-surface-raised border border-n1-border-subtle transition-all duration-150 focus-ring"
            title="My Recent Drops (Client-side)"
          >
            <span className="text-sm">⏱️</span>
            <span>Recent Drops</span>
          </button>

          {/* Theme Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              aria-label={`Current theme: ${theme}. Click to change theme.`}
              aria-expanded={themeDropdownOpen}
              className="p-2 text-n1-text-secondary hover:text-n1-text-primary rounded-full hover:bg-n1-surface-raised border border-n1-border-subtle transition-all duration-150 focus-ring"
            >
              {resolvedTheme === 'dark' ? (
                <svg
                  className="w-4 h-4 text-purple-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </button>

            {/* Dropdown Menu */}
            {themeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setThemeDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-32 rounded-xl bg-n1-surface-raised border border-n1-border shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                  {themeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setTheme(opt.value);
                        setThemeDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
                        theme === opt.value
                          ? 'text-n1-purple-light font-bold bg-n1-purple/10'
                          : 'text-n1-text-secondary hover:text-n1-text-primary hover:bg-n1-surface-overlay'
                      )}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                      {theme === opt.value && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-n1-purple" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Create Drop Action */}
          <Link href="/drop" className="hidden sm:inline-flex">
            <Button variant="primary" size="sm" className="rounded-full">
              Create Drop →
            </Button>
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2 text-n1-text-secondary hover:text-n1-text-primary rounded-full hover:bg-n1-surface-raised transition-colors focus-ring"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop overlay for dismissing drawer on outside click */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden pointer-events-auto"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="md:hidden fixed top-[76px] left-4 right-4 z-50 p-5 rounded-2xl bg-n1-surface-raised/95 backdrop-blur-xl border border-n1-border shadow-2xl pointer-events-auto animate-in slide-in-from-top-4 duration-200">
            <nav className="flex flex-col gap-3">
              {navLinks.map(link =>
                link.disabled ? (
                  <div
                    key={link.label}
                    className="px-3 py-2 text-sm text-n1-text-muted flex items-center justify-between"
                  >
                    <span>{link.label}</span>
                    <span className="text-[10px] bg-n1-surface px-2 py-0.5 rounded border border-n1-border-subtle">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                      link.active
                        ? 'bg-n1-purple/15 text-n1-purple-light'
                        : 'text-n1-text-secondary hover:text-n1-text-primary hover:bg-n1-surface'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              )}
              <div className="pt-2 border-t border-n1-border-subtle mt-1 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRecentDropsOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-n1-border text-n1-text-primary text-sm font-semibold hover:bg-n1-surface-raised transition-colors"
                >
                  <span>⏱️</span>
                  <span>My Recent Drops</span>
                </button>
                <Link
                  href="/drop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center py-2.5 rounded-xl bg-n1-purple text-white text-sm font-semibold hover:bg-n1-purple-light transition-colors"
                >
                  Create Drop →
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Client-Side Recent Drops Drawer */}
      <RecentDropsDrawer isOpen={recentDropsOpen} onClose={() => setRecentDropsOpen(false)} />
    </header>
  );
}
