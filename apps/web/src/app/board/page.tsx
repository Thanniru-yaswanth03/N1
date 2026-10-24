'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BoardTemplate, BOARD_TEMPLATES } from '@n1/shared';
import { createBoardRoom, getRecentBoards, LocalBoardRecord } from '../../lib/board-client';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

const EXPIRATION_OPTIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

export default function BoardHubPage() {
  const router = useRouter();

  // Create room state
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate>('blank');
  const [title, setTitle] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join room state
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Recent boards from localStorage
  const [recentBoards, setRecentBoards] = useState<LocalBoardRecord[]>([]);

  useEffect(() => {
    setRecentBoards(getRecentBoards());
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    try {
      const room = await createBoardRoom(
        title.trim() || 'Study Session',
        selectedTemplate,
        expiresInHours
      );
      const dest = room.creatorToken ? `/board/${room.code}?host=${encodeURIComponent(room.creatorToken)}` : `/board/${room.code}`;
      router.push(dest);
    } catch (err: unknown) {
      setCreateError((err as Error).message || 'Failed to create room');
      setIsCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.toUpperCase().trim();
    if (!clean || !/^[A-Z0-9]{6}$/.test(clean)) {
      setJoinError('Room code must be a 6-character code (e.g. X9K2LM)');
      return;
    }
    router.push(`/board/${clean}`);
  };

  return (
    <div className="min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 sm:space-y-10">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Board', active: true }]} className="mb-2 justify-center" />

      {/* ── Hero Section ── */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium tracking-wide uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>N1 Study Board • Anonymous Real-Time Canvas</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-n1-text-primary font-brand leading-tight">
          Collaborate Freely.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-200 bg-clip-text text-transparent">
            Vanishes Automatically.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-n1-text-secondary leading-relaxed">
          Spin up an anonymous shared whiteboard for group study, diagramming, math problem solving,
          or brainstorming. Zero sign-up required, real-time sync, and auto-expiring rooms.
        </p>
      </div>

      {/* ── Main Action Cards Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left: Create Room Form (8 cols) */}
        <div className="lg:col-span-8 p-5 sm:p-8 rounded-3xl border border-cyan-500/20 bg-n1-surface shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-n1-border-subtle">
            <div>
              <h2 className="text-lg font-bold text-n1-text-primary">Create a New Study Room</h2>
              <p className="text-xs text-n1-text-secondary mt-0.5">
                Choose a pre-built academic or workflow template to get started instantly
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
              Anonymous
            </span>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Room Title */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-n1-text-secondary">
                Board Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Systems Exam Review, CS50 Pset 4, Calculus Proofs"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl border border-n1-border bg-n1-surface-raised text-sm text-n1-text-primary placeholder-n1-text-muted focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            {/* Template Selection Grid */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-n1-text-secondary flex items-center justify-between">
                <span>Select Starter Template</span>
                <span className="text-[11px] font-mono text-n1-text-muted">
                  9 pre-designed layouts
                </span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {BOARD_TEMPLATES.map(t => {
                  const isSelected = selectedTemplate === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplate(t.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                          : 'border-n1-border-subtle bg-n1-surface-raised hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-n1-text-primary'}`}>
                          {t.name}
                        </span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-n1-text-muted line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expiration Duration Pills */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-n1-text-secondary">
                Room Expiration (Auto Self-Destruct)
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPIRATION_OPTIONS.map(opt => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setExpiresInHours(opt.hours)}
                    className={`px-3.5 py-1.5 text-xs font-mono rounded-xl border transition-all ${
                      expiresInHours === opt.hours
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'border-n1-border-subtle text-n1-text-secondary hover:bg-n1-surface-raised hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-n1-text-muted">
                All canvas data and sticky notes are permanently wiped when this timer expires.
              </p>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {createError}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isCreating}
              className="w-full justify-center bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20"
            >
              {isCreating ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Generating Shared Room...</span>
                </div>
              ) : (
                'Create Anonymous Study Board →'
              )}
            </Button>
          </form>
        </div>

        {/* Right: Join Room & Recent Boards (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Join Room Box */}
          <div className="p-5 sm:p-6 rounded-3xl border border-cyan-500/20 bg-n1-surface shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-n1-text-primary flex items-center gap-2">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1" />
              </svg>
              <span>Join via Room Code</span>
            </h3>

            <p className="text-xs text-n1-text-secondary">
              Enter a 6-character room code shared by a friend or study partner.
            </p>

            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="e.g. UH5JLG"
                value={joinCode}
                onChange={e => {
                  setJoinCode(e.target.value.toUpperCase());
                  if (joinError) setJoinError(null);
                }}
                maxLength={6}
                className="w-full px-4 py-2.5 text-center font-mono tracking-widest text-base font-bold rounded-xl border border-n1-border bg-n1-surface-raised text-cyan-300 placeholder-n1-text-muted focus:outline-none focus:border-cyan-400 transition-colors uppercase"
              />

              {joinError && (
                <p className="text-xs text-rose-400 text-center animate-fadeIn">{joinError}</p>
              )}

              <Button type="submit" variant="secondary" size="md" className="w-full justify-center">
                Enter Room →
              </Button>
            </form>
          </div>

          {/* Recent Boards (Client-side localStorage) */}
          <div className="p-5 sm:p-6 rounded-3xl border border-n1-border bg-n1-surface shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-n1-text-primary flex items-center gap-2">
                <span>⏱️</span>
                <span>Recent Boards</span>
              </h3>
              <span className="text-[10px] font-mono text-n1-text-muted">Local device</span>
            </div>

            {recentBoards.length === 0 ? (
              <div className="py-6 text-center text-xs text-n1-text-muted space-y-1">
                <p>No recent boards on this device.</p>
                <p className="text-[11px]">Created and joined rooms will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {recentBoards.map(rb => (
                  <button
                    key={rb.code}
                    type="button"
                    onClick={() => router.push(`/board/${rb.code}`)}
                    className="w-full p-2.5 rounded-xl border border-n1-border-subtle bg-n1-surface-raised hover:border-cyan-500/40 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="text-xs font-semibold text-n1-text-primary truncate group-hover:text-cyan-300 transition-colors">
                        {rb.title || 'Study Session'}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-400 font-bold mt-0.5">
                        #{rb.code}
                      </div>
                    </div>
                    <span className="text-xs text-n1-text-muted group-hover:text-white transition-colors">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
