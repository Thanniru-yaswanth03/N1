'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'n1_onboarding_dismissed_v1';

export function FirstUseGuide() {
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsDismissed(false);
      }
    } catch {
      // In private mode or restricted environments, keep dismissed
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  if (isDismissed) return null;

  return (
    <div className="w-full max-w-[1080px] mx-auto mb-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-n1-purple/15 via-n1-surface-raised to-n1-surface border border-n1-purple/30 p-4 sm:p-5 shadow-lg backdrop-blur-sm">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss first-time guide"
          className="absolute top-3.5 right-3.5 text-xs text-n1-text-muted hover:text-n1-text-primary p-1.5 rounded-lg hover:bg-n1-surface transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">👋</span>
          <h2 className="text-sm font-bold text-n1-text-primary tracking-tight">
            Welcome to N1 — The Zero-Account Ephemeral Platform
          </h2>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-n1-purple/20 text-n1-purple-light font-semibold border border-n1-purple/30">
            First Visit
          </span>
        </div>

        <p className="text-xs text-n1-text-secondary leading-relaxed mb-4 max-w-2xl">
          N1 is built for speed and strict privacy. No logins, no tracking cookies, and no persistent profiles. Here is what you can do in seconds:
        </p>

        {/* 4 Pillars Quick Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            href="/drop"
            className="p-3 rounded-xl bg-n1-surface/75 hover:bg-n1-surface-raised border border-n1-border-subtle hover:border-[#6366F1]/40 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base group-hover:scale-110 transition-transform">📦</span>
              <span className="text-xs font-bold text-n1-text-primary">Ephemeral Drop</span>
            </div>
            <p className="text-[11px] text-n1-text-secondary leading-snug">
              Share encrypted files or text with self-destruct timers.
            </p>
          </Link>

          <Link
            href="/board"
            className="p-3 rounded-xl bg-n1-surface/75 hover:bg-n1-surface-raised border border-n1-border-subtle hover:border-[#06B6D4]/40 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base group-hover:scale-110 transition-transform">🎨</span>
              <span className="text-xs font-bold text-n1-text-primary">Study Board</span>
            </div>
            <p className="text-[11px] text-n1-text-secondary leading-snug">
              Spin up a real-time collaborative canvas with zero setup.
            </p>
          </Link>

          <Link
            href="/duel"
            className="p-3 rounded-xl bg-n1-surface/75 hover:bg-n1-surface-raised border border-n1-border-subtle hover:border-[#EC4899]/40 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base group-hover:scale-110 transition-transform">⚡</span>
              <span className="text-xs font-bold text-n1-text-primary">Quably Duel</span>
            </div>
            <p className="text-[11px] text-n1-text-secondary leading-snug">
              Instant peer matchmaking for competitive timed trivia.
            </p>
          </Link>

          <Link
            href="/tools"
            className="p-3 rounded-xl bg-n1-surface/75 hover:bg-n1-surface-raised border border-n1-border-subtle hover:border-[#10B981]/40 transition-all group"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base group-hover:scale-110 transition-transform">🛠️</span>
              <span className="text-xs font-bold text-n1-text-primary">31 Browser Tools</span>
            </div>
            <p className="text-[11px] text-n1-text-secondary leading-snug">
              Client-side formatters and utilities that never send data away.
            </p>
          </Link>
        </div>

        <div className="mt-4 pt-3 border-t border-n1-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-n1-text-muted">
          <span>Tip: Press <kbd className="font-mono bg-n1-surface px-1.5 py-0.5 rounded border border-n1-border text-n1-text-primary">Ctrl</kbd> + <kbd className="font-mono bg-n1-surface px-1.5 py-0.5 rounded border border-n1-border text-n1-text-primary">K</kbd> anywhere to open the Quick Launcher.</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="font-semibold text-n1-purple-light hover:underline self-end sm:self-auto"
          >
            Got it, dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
