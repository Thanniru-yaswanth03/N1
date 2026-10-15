'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { DuelCategory, DuelDifficulty, DUEL_CATEGORIES } from '@n1/shared';
import { createDuelRoom, DuelSocketClient } from '../../lib/duel-client';
import { Button } from '../../components/ui/Button';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';

export default function DuelHubPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<DuelCategory>('javascript');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DuelDifficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [playerName, setPlayerName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time matchmaking queue state
  const [isMatchmaking, setIsMatchmaking] = useState<boolean>(false);
  const [queueSeconds, setQueueSeconds] = useState<number>(0);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [matchFoundStatus, setMatchFoundStatus] = useState<string | null>(null);
  const queueClientRef = useRef<DuelSocketClient | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isMatchmaking) {
      interval = setInterval(() => {
        setQueueSeconds(s => s + 1);
      }, 1000);
    } else {
      setQueueSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMatchmaking]);

  const [hasCancelled, setHasCancelled] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      queueClientRef.current?.leaveQueue();
    };
  }, []);

  const handleStartMatchmaking = () => {
    setErrorMessage(null);
    setMatchFoundStatus(null);
    setHasCancelled(false);
    setIsMatchmaking(true);
    setQueueSeconds(0);

    const client = new DuelSocketClient({
      onQueueJoined: data => {
        setQueuePosition(data.position);
      },
      onMatchFound: data => {
        setMatchFoundStatus(`Match found against ${data.opponent.name}! Launching duel arena...`);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`duel_token_${data.roomCode}`, data.token);
          sessionStorage.setItem(`duel_name_${data.roomCode}`, playerName.trim() || 'Player');
        }
        setTimeout(() => {
          router.push(`/duel/${data.roomCode}`);
        }, 1200);
      },
      onError: msg => {
        setErrorMessage(msg);
        setIsMatchmaking(false);
      },
    });

    queueClientRef.current = client;
    client.joinQueue(selectedCategory, selectedDifficulty, playerName.trim() || undefined);
  };

  const handleCancelMatchmaking = () => {
    queueClientRef.current?.leaveQueue();
    queueClientRef.current = null;
    setIsMatchmaking(false);
    setMatchFoundStatus(null);
    setHasCancelled(true);
    setTimeout(() => setHasCancelled(false), 3500);
  };

  const handleCreateChallenge = async () => {
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const result = await createDuelRoom({
        category: selectedCategory,
        difficulty: selectedDifficulty,
        questionCount,
        hostName: playerName.trim() || undefined,
      });

      // Store host token in sessionStorage so host identity is preserved upon navigation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`duel_token_${result.code}`, result.hostToken);
        sessionStorage.setItem(`duel_name_${result.code}`, result.hostPlayer.name);
      }

      router.push(`/duel/${result.code}`);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create challenge room');
      setIsCreating(false);
    }
  };

  const handleJoinDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.toUpperCase().trim();
    if (clean.length === 6) {
      router.push(`/duel/${clean}`);
    } else {
      setErrorMessage('Room code must be exactly 6 characters');
    }
  };

  return (
    <div className="min-h-screen text-n1-text-primary py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10 animate-fade-in">
        <Breadcrumbs items={[{ label: 'Duel', active: true }]} className="mb-2 justify-center" />
        {/* Header Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-n1-purple/30 bg-n1-purple/10 text-n1-purple-light text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-n1-purple-light animate-ping" />
            N1 Quably Duel
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-n1-text-primary font-brand">
            Anonymous Multiplayer{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-n1-purple-light via-purple-300 to-n1-gold">
              Quiz Arena
            </span>
          </h1>
          <p className="text-n1-text-secondary text-base sm:text-lg">
            Create a live 1v1 challenge, share the link with a friend, and compete in a synchronized 60-second speed quiz with real-time scoring!
          </p>
        </div>

        {/* Quick Join Bar */}
        <div className="bg-n1-surface-raised border border-n1-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto shadow-xl">
          <div className="text-left w-full sm:w-auto">
            <div className="text-xs font-semibold text-n1-text-muted uppercase tracking-wider">
              Have a Challenge Code?
            </div>
            <div className="text-sm font-medium text-n1-text-primary">
              Join an existing duel room directly
            </div>
          </div>

          <form onSubmit={handleJoinDirect} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="e.g. 7K2M9X"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full sm:w-32 bg-n1-surface border border-n1-border rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest uppercase text-n1-purple-light font-bold focus:outline-none focus:border-n1-purple"
            />
            <Button type="submit" variant="secondary" size="sm" className="shrink-0">
              Join Duel
            </Button>
          </form>
        </div>

        {errorMessage && (
          <div className="max-w-2xl mx-auto p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm text-center">
            {errorMessage}
          </div>
        )}

        {/* Challenge Configurator */}
        <div className="bg-n1-surface border border-n1-border rounded-3xl p-6 sm:p-8 space-y-8 shadow-2xl backdrop-blur-sm">
          {/* Step 1: Select Category */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-n1-text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-n1-purple/15 text-n1-purple-light border border-n1-purple/30 flex items-center justify-center text-xs font-mono">
                  1
                </span>
                Choose Category
              </h2>
              <span className="text-xs text-n1-text-secondary">10 Competencies Available</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {DUEL_CATEGORIES.map(cat => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-28 ${
                      isSelected
                        ? 'bg-n1-purple/15 border-n1-purple ring-1 ring-n1-purple shadow-lg'
                        : 'bg-n1-surface-raised border-n1-border-subtle hover:border-n1-purple/40 hover:bg-n1-surface-overlay'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-n1-text-primary group-hover:text-n1-purple-light transition-colors">
                        {cat.name}
                      </div>
                      <p className="text-[11px] text-n1-text-muted line-clamp-2 mt-1 leading-snug">
                        {cat.shortDesc}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-n1-border-subtle text-[10px] font-mono text-n1-text-muted">
                      <span>60s match</span>
                      {isSelected && <span className="text-n1-purple-light font-bold">Selected</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 & 3: Difficulty & Question Count */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-n1-border-subtle">
            {/* Difficulty Selector */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-n1-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-n1-purple/15 text-n1-purple-light border border-n1-purple/30 flex items-center justify-center text-xs font-mono">
                  2
                </span>
                Difficulty
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['easy', 'medium', 'hard', 'mixed'] as DuelDifficulty[]).map(diff => {
                  const isSelected = selectedDifficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                        isSelected
                          ? 'bg-n1-purple border-n1-purple text-white shadow-md'
                          : 'bg-n1-surface-raised border-n1-border-subtle text-n1-text-secondary hover:text-n1-text-primary hover:bg-n1-surface-overlay'
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Count Selector */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-n1-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-n1-purple/15 text-n1-purple-light border border-n1-purple/30 flex items-center justify-center text-xs font-mono">
                  3
                </span>
                Question Count
              </label>
              <div className="flex items-center gap-2">
                {[3, 5, 10, 15, 20].map(cnt => {
                  const isSelected = questionCount === cnt;
                  return (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setQuestionCount(cnt)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                        isSelected
                          ? 'bg-n1-purple border-n1-purple text-white shadow-md'
                          : 'bg-n1-surface-raised border-n1-border-subtle text-n1-text-secondary hover:text-n1-text-primary hover:bg-n1-surface-overlay'
                      }`}
                    >
                      {cnt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nickname Input */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-n1-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-n1-purple/15 text-n1-purple-light border border-n1-purple/30 flex items-center justify-center text-xs font-mono">
                  4
                </span>
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. MasterCoder"
                maxLength={20}
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="w-full bg-n1-surface-raised border border-n1-border rounded-xl px-3 py-2 text-sm text-n1-text-primary focus:outline-none focus:border-n1-purple placeholder-n1-text-muted"
              />
            </div>
          </div>

          {/* Action CTA & Matchmaking Queue */}
          {hasCancelled && (
            <div className="pt-4 animate-fade-in">
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between text-sm text-rose-300">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    CANCELLED
                  </span>
                  <span>Matchmaking search was cancelled. You can queue up anytime or challenge a friend directly.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHasCancelled(false)}
                  className="text-xs text-rose-400 hover:text-rose-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {isMatchmaking ? (
            <div className="pt-6 border-t border-n1-border-subtle">
              <div className="bg-gradient-to-r from-n1-purple/20 via-purple-900/20 to-n1-purple/20 border border-n1-purple/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                <div className="flex items-center justify-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-n1-purple-light opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-n1-purple"></span>
                  </span>
                  <span className="text-base font-bold text-n1-text-primary">
                    {matchFoundStatus ? 'Match Confirmed!' : `Searching for an opponent in ${selectedCategory.toUpperCase()}...`}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                    matchFoundStatus
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 animate-pulse'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {matchFoundStatus ? 'MATCH FOUND' : 'WAITING'}
                  </span>
                </div>

                {matchFoundStatus ? (
                  <p className="text-sm text-emerald-400 font-medium animate-pulse">
                    {matchFoundStatus}
                  </p>
                ) : (
                  <div className="text-xs text-n1-text-muted flex items-center justify-center gap-6 font-mono">
                    <div>⏱️ Time in queue: <span className="text-n1-purple-light font-bold">{queueSeconds}s</span></div>
                    <div>🎯 Queue position: <span className="text-n1-purple-light font-bold">#{queuePosition}</span></div>
                  </div>
                )}

                {!matchFoundStatus && (
                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelMatchmaking}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
                    >
                      Cancel Search
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-6 border-t border-n1-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-n1-text-muted space-y-1 text-center sm:text-left">
                <div>⚡ 100% Anonymous & Zero Accounts Required</div>
                <div>Server-authoritative matchmaking · Synchronized 60-second timer</div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCreateChallenge}
                  disabled={isCreating}
                  className="w-full sm:w-auto px-5"
                >
                  {isCreating ? 'Generating Room...' : 'Create Challenge Room'}
                </Button>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartMatchmaking}
                  className="w-full sm:w-auto px-8 gap-2 shadow-lg shadow-n1-purple/30 font-bold bg-gradient-to-r from-n1-purple to-purple-600 hover:brightness-110"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Find Online Opponent
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
