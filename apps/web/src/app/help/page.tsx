import React from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '../../components/ui';

export const metadata = {
  title: 'Help & Documentation | N1 Platform',
  description:
    'Comprehensive guide to N1 Drop, Study Board, Quably Duel, and Developer Toolbox. Zero accounts, auto-expiring ephemeral privacy.',
};

export default function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10 animate-fade-in text-n1-text-primary">
      {/* Header */}
      <div className="space-y-4 text-center sm:text-left">
        <div className="inline-flex items-center gap-2">
          <Badge variant="primary" dot pulse>
            Help &amp; Knowledge Base
          </Badge>
          <span className="text-xs text-n1-text-muted">Updated: 2026 Edition</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight font-brand">
          Platform Documentation
        </h1>
        <p className="text-base sm:text-lg text-n1-text-secondary leading-relaxed max-w-3xl">
          Everything you need to know about using N1 for private file exchange, collaborative study
          whiteboards, competitive quiz duels, and offline developer utilities.
        </p>
      </div>

      {/* Four Pillars Quick Jump */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a
          href="#pillar-drop"
          className="p-3.5 rounded-2xl border border-n1-border bg-n1-surface-raised hover:border-n1-purple/50 transition-all text-center group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📦</div>
          <div className="text-xs font-bold text-n1-text-primary">N1 Drop</div>
          <div className="text-[10px] text-n1-text-muted">Files &amp; Text</div>
        </a>
        <a
          href="#pillar-board"
          className="p-3.5 rounded-2xl border border-n1-border bg-n1-surface-raised hover:border-cyan-500/50 transition-all text-center group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🎨</div>
          <div className="text-xs font-bold text-n1-text-primary">Study Board</div>
          <div className="text-[10px] text-n1-text-muted">Live Canvas</div>
        </a>
        <a
          href="#pillar-duel"
          className="p-3.5 rounded-2xl border border-n1-border bg-n1-surface-raised hover:border-rose-500/50 transition-all text-center group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚡</div>
          <div className="text-xs font-bold text-n1-text-primary">Quably Duel</div>
          <div className="text-[10px] text-n1-text-muted">1v1 Battles</div>
        </a>
        <a
          href="#pillar-tools"
          className="p-3.5 rounded-2xl border border-n1-border bg-n1-surface-raised hover:border-amber-500/50 transition-all text-center group"
        >
          <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">🛠️</div>
          <div className="text-xs font-bold text-n1-text-primary">Toolbox</div>
          <div className="text-[10px] text-n1-text-muted">31 Utilities</div>
        </a>
      </div>

      <div className="space-y-8">
        {/* Pillar 1: N1 Drop */}
        <section id="pillar-drop">
          <Card variant="raised" className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-n1-purple/15 text-n1-purple-light flex items-center justify-center text-lg font-bold">
                📦
              </div>
              <div>
                <h2 className="text-xl font-bold text-n1-text-primary">1. N1 Drop — Ephemeral File &amp; Text Sharing</h2>
                <p className="text-xs text-n1-text-secondary">Zero-retention temporary sharing</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed pt-2 border-t border-n1-border-subtle">
              <p>
                N1 Drop lets you share confidential documents, binaries, or encrypted text without creating an
                account or leaving persistent records.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-n1-text-primary">Payload Capacities:</strong> Up to 10 files per drop (50 MB per file, 200 MB total aggregate size), or up to 10,000 characters of confidential formatted text.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Auto-Destruct Timers:</strong> Configure drops to self-destruct in 15 minutes, 1 hour, 6 hours, 24 hours, or 7 days. Once the timer expires, files are permanently deleted.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Argon2id Passphrase Protection:</strong> Optionally lock drops with a password. Passphrases are verified using server-side Argon2id key derivation.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Burn-After-Reading:</strong> Enable to purge the content immediately after the recipient opens or downloads it once.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Owner Deletion Token:</strong> When you create a Drop, save your cryptographic token to permanently destroy the Drop ahead of schedule at any time.
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/drop">
                  <Button variant="primary" size="sm">Create a Drop →</Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        {/* Pillar 2: Study Board */}
        <section id="pillar-board">
          <Card variant="raised" className="p-6 sm:p-8 space-y-4 border-cyan-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center text-lg font-bold">
                🎨
              </div>
              <div>
                <h2 className="text-xl font-bold text-n1-text-primary">2. Study Board — Collaborative Whiteboard</h2>
                <p className="text-xs text-n1-text-secondary">Real-time anonymous visual canvas</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed pt-2 border-t border-n1-border-subtle">
              <p>
                Study Board provides an instant visual canvas for group revision, technical problem-solving,
                math proofs, and system design.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-n1-text-primary">Drawing Tools:</strong> Freehand pen, highlighter, shapes (rectangles, diamonds, circles, cylinders, triangles), arrows, text blocks, and sticky notes.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Real-Time Sync:</strong> Multi-user cursor tracking and stroke synchronization over low-latency WebSockets with zero account login.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Starter Templates:</strong> Choose from blank, CS Data Structures, Flowcharts, Math Problem Solving, and ER Diagrams.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Instant Sharing:</strong> Share the 6-character room code, direct URL, or mobile QR code.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Export Options:</strong> Export boards at any time as high-resolution PNG, vector SVG, or structured JSON.
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/board">
                  <Button variant="primary" size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold">Launch Study Board →</Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        {/* Pillar 3: Quably Duel */}
        <section id="pillar-duel">
          <Card variant="raised" className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center text-lg font-bold">
                ⚡
              </div>
              <div>
                <h2 className="text-xl font-bold text-n1-text-primary">3. Quably Duel — 1v1 Skill Arena</h2>
                <p className="text-xs text-n1-text-secondary">Synchronized multiplayer speed quizzes</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed pt-2 border-t border-n1-border-subtle">
              <p>
                Quably Duel pairs two peers in a fast-paced 60-second synchronized technical competition.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-n1-text-primary">10 Categories:</strong> JavaScript, Python, SQL, React, Web Security, Git &amp; Linux, Algorithms, CS Fundamentals, CSS &amp; HTML, and DevOps.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Synchronized Clock:</strong> Both rivals answer simultaneous questions with an authoritative server clock.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Real-Time Scoring:</strong> Earn points based on answer accuracy and response velocity. Instant rematches are supported.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Two Match Modes:</strong> Queue up for random peer matchmaking or generate a custom room code to challenge a friend directly.
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/duel">
                  <Button variant="primary" size="sm">Enter Duel Arena →</Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        {/* Pillar 4: Developer Toolbox */}
        <section id="pillar-tools">
          <Card variant="raised" className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-lg font-bold">
                🛠️
              </div>
              <div>
                <h2 className="text-xl font-bold text-n1-text-primary">4. Developer Toolbox — 31 Offline Utilities</h2>
                <p className="text-xs text-n1-text-secondary">100% Client-side browser execution</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-n1-text-secondary leading-relaxed pt-2 border-t border-n1-border-subtle">
              <p>
                The N1 Toolbox provides 31 essential developer and mathematical utilities running completely inside your browser runtime.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-n1-text-primary">Developer Utilities:</strong> JSON Formatter/Validator, JWT Decoder, Regex Tester, UUID Generator, Hash Generator (SHA-256, MD5), Base64 Encoder/Decoder, URL Encoder, Unix Timestamp Converter.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Text Utilities:</strong> Markdown Previewer, Word/Char Counter, Lorem Ipsum Generator, Text Diff Checker, Case Converter.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Calculators:</strong> Percentage Calculator, Scientific Calculator, Loan/EMI Calculator, Time Zone Converter, Unit Converter.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Image &amp; Media:</strong> Image Compressor, Image Format Converter, SVG Optimizer, QR Code Generator, Color Palette Extractor.
                </li>
                <li>
                  <strong className="text-n1-text-primary">Offline &amp; Private:</strong> No payload or text is ever sent to our servers. All calculations and transformations happen in local memory.
                </li>
              </ul>
              <div className="pt-2">
                <Link href="/tools">
                  <Button variant="secondary" size="sm">Browse 31 Tools →</Button>
                </Link>
              </div>
            </div>
          </Card>
        </section>

        {/* Frequently Asked Questions */}
        <Card variant="raised" className="p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-n1-text-primary">Frequently Asked Questions</h2>
          <div className="space-y-4 divide-y divide-n1-border-subtle text-sm text-n1-text-secondary">
            <div className="pt-3 first:pt-0 space-y-1">
              <h3 className="font-semibold text-n1-text-primary">Do I need to create an account?</h3>
              <p>No. N1 has zero user accounts, zero passwords to remember, and zero identity tracking.</p>
            </div>
            <div className="pt-3 space-y-1">
              <h3 className="font-semibold text-n1-text-primary">Can anyone access my Drop?</h3>
              <p>Only people who have the 6-character access code or direct link can view the Drop. If you enabled passphrase protection, they also need the passphrase.</p>
            </div>
            <div className="pt-3 space-y-1">
              <h3 className="font-semibold text-n1-text-primary">Can expired content be recovered?</h3>
              <p>No. Once expired, all physical files are permanently deleted from disk by the background worker, ensuring zero retention.</p>
            </div>
            <div className="pt-3 space-y-1">
              <h3 className="font-semibold text-n1-text-primary">How do I access recent drops on my device?</h3>
              <p>Click &quot;Recent Drops&quot; in the navigation bar. Your device keeps an encrypted client-side list in localStorage so you can easily recall or burn drops you created.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
