'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Badge, Card } from '../components/ui';
import { FirstUseGuide } from '../components/onboarding/FirstUseGuide';

export default function HomePage() {
  const router = useRouter();
  const [quickCode, setQuickCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleQuickLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCode.toUpperCase().trim();
    if (!clean) {
      setCodeError('Please enter a 6-character Drop code');
      return;
    }
    if (!/^[A-Z0-9]{6}$/.test(clean)) {
      setCodeError('Code must be exactly 6 alphanumeric characters (e.g. 7K2M9X)');
      return;
    }
    router.push(`/d/${clean}`);
  };

  return (
    <div className="max-w-[1080px] mx-auto px-4 sm:px-6">
      {/* ── First-Time Onboarding Guide ── */}
      <FirstUseGuide />

      {/* ── Hero Section ── */}
      <section className="text-center pt-10 pb-12 md:pt-16 md:pb-20">
        {/* Eyebrow badge */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 mb-6">
          <Badge variant="primary" dot pulse>
            Anonymous • Zero-Account Platform
          </Badge>
          <Badge variant="gold">Self-Destructing by Design</Badge>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-n1-text-primary mb-6 leading-tight font-brand">
          Share without trace. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-n1-purple-light via-purple-300 to-n1-gold">
            Temporary by design.
          </span>
        </h1>

        <p className="max-w-2xl mx-auto text-base sm:text-lg text-n1-text-secondary leading-relaxed mb-8">
          N1 is an anonymous privacy platform engineered for friction-free file sharing, real-time
          study whiteboards, technical quiz duels, and offline developer tools. No accounts, no
          tracking cookies, no residual server logs.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
          <Link href="/drop" className="w-full sm:w-auto">
            <Button
              size="lg"
              variant="primary"
              className="w-full sm:w-auto shadow-lg shadow-n1-purple/20"
              rightIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              }
            >
              Create a Drop
            </Button>
          </Link>
          <Link href="/tools" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Developer Toolbox (31 Tools)
            </Button>
          </Link>
        </div>

        {/* Enter Drop Code Box */}
        <div className="max-w-md mx-auto p-4 sm:p-5 rounded-2xl bg-n1-surface-raised/80 border border-n1-border shadow-xl backdrop-blur-sm">
          <div className="text-xs font-semibold text-n1-text-secondary uppercase tracking-wider mb-2 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-n1-purple animate-pulse" />
            <span className="font-bold text-n1-text-primary">Enter Drop Code</span>
          </div>

          <form onSubmit={handleQuickLookup} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              id="homepage-drop-code-input"
              name="dropCode"
              aria-label="Enter 6-character Drop Code"
              type="text"
              placeholder="e.g. 7K2M9X"
              value={quickCode}
              onChange={e => {
                setQuickCode(e.target.value.toUpperCase());
                if (codeError) setCodeError(null);
              }}
              maxLength={6}
              autoComplete="off"
              spellCheck="false"
              className="w-full sm:flex-1 bg-n1-surface border border-n1-border rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest uppercase text-n1-purple-light font-bold placeholder-n1-text-muted focus:outline-none focus:border-n1-purple transition-colors"
            />
            <Button type="submit" variant="primary" size="md" className="w-full sm:w-auto shrink-0 font-bold">
              Open Drop →
            </Button>
          </form>

          {codeError && (
            <p className="text-xs text-rose-400 mt-2 text-center animate-fadeIn">{codeError}</p>
          )}
        </div>
      </section>

      {/* ── Four Live Modular Pillars ── */}
      <section id="capabilities" className="mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-n1-text-primary mb-2 font-brand">
            Platform Capabilities
          </h2>
          <p className="text-sm text-n1-text-secondary max-w-lg mx-auto">
            Four modular pillars engineered for zero-trace privacy and anonymous productivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pillar 1: N1 Drop */}
          <Link href="/drop" className="group text-decoration-none">
            <Card variant="raised" interactive className="p-6 h-full flex flex-col justify-between transition-all hover:border-n1-purple/50">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-n1-purple-dim text-n1-purple-light flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    ↓
                  </div>
                  <Badge variant="primary" size="sm">
                    Live • Ephemeral Sharing
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-n1-text-primary mb-2 group-hover:text-n1-purple-light transition-colors">
                  N1 Drop
                </h3>
                <p className="text-xs text-n1-text-secondary leading-relaxed mb-4">
                  Share up to 10 files (50 MB each, 200 MB total) or 10,000 characters of confidential text.
                  Includes auto-expiring presets (15m to 7d), Argon2id password protection, burn-after-reading,
                  and one-click ZIP download.
                </p>
              </div>
              <div className="text-xs text-n1-purple-light font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-2 border-t border-n1-border-subtle">
                <span>Launch Drop Creator</span>
                <span>→</span>
              </div>
            </Card>
          </Link>

          {/* Pillar 2: Offline Toolbox */}
          <Link href="/tools" className="group text-decoration-none">
            <Card variant="raised" interactive className="p-6 h-full flex flex-col justify-between transition-all hover:border-n1-gold/50">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-n1-gold-dim text-n1-gold flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    🛠
                  </div>
                  <Badge variant="gold" size="sm">
                    31 Offline Tools
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-n1-text-primary mb-2 group-hover:text-n1-gold transition-colors">
                  Developer Toolbox
                </h3>
                <p className="text-xs text-n1-text-secondary leading-relaxed mb-4">
                  31 privacy-centric utilities running 100% inside your browser runtime. Format JSON,
                  decode JWTs, test regular expressions, generate UUIDs, compute SHA-256 hashes, and
                  compress images with zero server uploads.
                </p>
              </div>
              <div className="text-xs text-n1-gold font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-2 border-t border-n1-border-subtle">
                <span>Browse All 31 Tools</span>
                <span>→</span>
              </div>
            </Card>
          </Link>

          {/* Pillar 3: Study Board */}
          <Link href="/board" className="group text-decoration-none">
            <Card variant="raised" interactive className="p-6 h-full flex flex-col justify-between transition-all hover:border-cyan-500/50">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    ☷
                  </div>
                  <Badge variant="primary" size="sm" className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30">
                    Real-Time Canvas
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-n1-text-primary mb-2 group-hover:text-cyan-400 transition-colors">
                  Study Board
                </h3>
                <p className="text-xs text-n1-text-secondary leading-relaxed mb-4">
                  Anonymous visual collaborative whiteboard with specialized academic templates for
                  Computer Science, ER Diagrams, Math, and Flowcharts. Real-time multi-user cursor sync
                  with auto-expiring ephemeral rooms.
                </p>
              </div>
              <div className="text-xs text-cyan-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-2 border-t border-n1-border-subtle">
                <span>Open Collaborative Board</span>
                <span>→</span>
              </div>
            </Card>
          </Link>

          {/* Pillar 4: Quably Duel */}
          <Link href="/duel" className="group text-decoration-none">
            <Card variant="raised" interactive className="p-6 h-full flex flex-col justify-between transition-all hover:border-indigo-500/50">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">
                    ⚡
                  </div>
                  <Badge variant="primary" size="sm">
                    1v1 Live Arena
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-n1-text-primary mb-2 group-hover:text-indigo-400 transition-colors">
                  Quably Duel
                </h3>
                <p className="text-xs text-n1-text-secondary leading-relaxed mb-4">
                  60-second real-time multiplayer skill arena. Synchronized clock, simultaneous
                  questions over WebSockets, live scoring, and instant rematches across 10 categories
                  including Python, SQL, JavaScript, and CS Fundamentals.
                </p>
              </div>
              <div className="text-xs text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform pt-2 border-t border-n1-border-subtle">
                <span>Enter Duel Arena</span>
                <span>→</span>
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* ── Privacy & Security Architecture Section ── */}
      <section className="mb-20">
        <Card variant="raised" className="p-8 sm:p-10 border-n1-border shadow-xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <Badge variant="gold" size="sm" className="mb-3">
              Zero-Retention Architecture
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-n1-text-primary font-brand">
              Built on Zero-Retention Principles
            </h2>
            <p className="text-xs sm:text-sm text-n1-text-secondary mt-2">
              Every design choice in N1 is made to protect your privacy and ensure no residual data remains.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle">
              <div className="w-8 h-8 rounded-lg bg-n1-purple/15 text-n1-purple-light flex items-center justify-center font-bold text-sm mb-3">
                1
              </div>
              <h3 className="text-sm font-bold text-n1-text-primary mb-1">Zero Accounts</h3>
              <p className="text-xs text-n1-text-secondary leading-relaxed">
                No registration, emails, passwords, or persistent profiles. You drop, share, and go.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold text-sm mb-3">
                2
              </div>
              <h3 className="text-sm font-bold text-n1-text-primary mb-1">Physical Disk Purge</h3>
              <p className="text-xs text-n1-text-secondary leading-relaxed">
                Files and metadata are irreversibly expunged the instant the countdown expires or view limit is reached.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-sm mb-3">
                3
              </div>
              <h3 className="text-sm font-bold text-n1-text-primary mb-1">Pure Browser Execution</h3>
              <p className="text-xs text-n1-text-secondary leading-relaxed">
                All 31 utilities in the Developer Toolbox run locally in your browser. No files or strings touch our servers.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-n1-surface border border-n1-border-subtle">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
                4
              </div>
              <h3 className="text-sm font-bold text-n1-text-primary mb-1">Argon2id Protection</h3>
              <p className="text-xs text-n1-text-secondary leading-relaxed">
                Optional passphrases use state-of-the-art Argon2id key derivation, preventing brute-force inspection.
              </p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}

