'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { DuelPlayer, DuelRoomSummary, DUEL_CATEGORIES } from '@n1/shared';
import { Button } from '../ui/Button';

interface DuelLobbyProps {
  room: DuelRoomSummary;
  players: DuelPlayer[];
  currentUser: DuelPlayer;
  countdownSeconds: number | null;
}

export function DuelLobby({ room, players, currentUser, countdownSeconds }: DuelLobbyProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const categoryMeta = DUEL_CATEGORIES.find(c => c.id === room.category);
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/duel/${room.code}` : '';

  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code', err));
    }
  }, [shareUrl]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const hostPlayer = players.find(p => p.isHost) || {
    id: 'host',
    name: room.hostName,
    color: '#6366f1',
    isHost: true,
  };
  const opponentPlayer = players.find(p => !p.isHost);

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-8">
      {/* Synchronized 3-2-1 Countdown Overlay */}
      {countdownSeconds !== null && countdownSeconds > 0 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="text-center space-y-4">
            <div className="text-xl sm:text-2xl font-bold uppercase tracking-widest text-indigo-400">
              Get Ready!
            </div>
            <div className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-300 via-pink-400 to-amber-300 animate-pulse drop-shadow-[0_0_35px_rgba(99,102,241,0.6)]">
              {countdownSeconds}
            </div>
            <p className="text-zinc-400 text-sm max-w-xs mx-auto">
              Synchronizing match arena... 60 seconds on the clock!
            </p>
          </div>
        </div>
      )}

      {/* Main Challenge Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
          Multiplayer Quiz Arena
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
          Challenge Lobby
        </h1>
        <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto">
          Share your room code or link. As soon as your opponent connects, a synchronized 60-second duel will initiate!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Match Configuration Card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-5">
            <h2 className="text-base font-bold text-zinc-200 uppercase tracking-wide text-xs text-zinc-400">
              Match Rules
            </h2>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-zinc-400 mb-1">Category</div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                      categoryMeta?.badgeColor || 'border-zinc-700 text-zinc-300 bg-zinc-800'
                    }`}
                  >
                    {categoryMeta?.name || room.category}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {categoryMeta?.shortDesc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
                <div>
                  <div className="text-xs text-zinc-400">Difficulty</div>
                  <div className="text-sm font-semibold capitalize text-zinc-200">
                    {room.difficulty}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Questions</div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {room.questionCount} Questions
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Timer</div>
                  <div className="text-sm font-semibold text-amber-400">60 Seconds</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-400">Scoring</div>
                  <div className="text-sm font-semibold text-emerald-400">100 + Speed Bonus</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Authoritative validation & zero data leaks
          </div>
        </div>

        {/* Center & Right Column: Players & Invitation */}
        <div className="md:col-span-2 space-y-6">
          {/* Head-to-Head Player Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Host Card */}
            <div className="bg-zinc-900/70 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden shadow-lg">
              <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase rounded-bl-lg">
                Host / Challenger
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-lg font-black shadow-md shadow-indigo-500/20">
                  {hostPlayer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-zinc-100 flex items-center gap-2">
                    {hostPlayer.name}
                    {currentUser.isHost && (
                      <span className="text-[11px] text-zinc-400 font-normal">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Ready in Lobby
                  </div>
                </div>
              </div>
            </div>

            {/* Opponent Card */}
            <div
              className={`rounded-2xl p-5 relative overflow-hidden transition-all shadow-lg ${
                opponentPlayer
                  ? 'bg-zinc-900/70 border border-pink-500/30'
                  : 'bg-zinc-900/40 border border-dashed border-zinc-700'
              }`}
            >
              <div className="absolute top-0 right-0 px-3 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase rounded-bl-lg">
                Opponent
              </div>

              {opponentPlayer ? (
                <div className="flex items-center gap-3 mt-1 animate-fade-in">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-lg font-black shadow-md shadow-pink-500/20">
                    {opponentPlayer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-zinc-100 flex items-center gap-2">
                      {opponentPlayer.name}
                      {!currentUser.isHost && (
                        <span className="text-[11px] text-zinc-400 font-normal">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Opponent Connected!
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 mt-1">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500">
                    <svg className="w-6 h-6 animate-spin text-zinc-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-400 text-sm">
                      Waiting for Opponent...
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Share link to challenge a friend
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Invitation Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Room Access Code
                </div>
                <div className="text-3xl font-black font-mono tracking-widest text-indigo-400 mt-1">
                  {room.code}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyCode}
                  className="gap-2 flex-1 sm:flex-initial justify-center"
                >
                  {copiedCode ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied Code!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Code
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowQr(!showQr)}
                  className="gap-1.5 flex-1 sm:flex-initial justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  {showQr ? 'Hide QR' : 'QR Code'}
                </Button>
              </div>
            </div>

            {/* Direct Link Input Box */}
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400">Direct Room Link</label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="w-full bg-zinc-950/80 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-zinc-300 focus:outline-none select-all"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0 gap-1.5 justify-center"
                >
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </div>

            {/* QR Code expansion */}
            {showQr && qrDataUrl && (
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center gap-3 animate-fade-in">
                <img
                  src={qrDataUrl}
                  alt="Room QR Code"
                  className="w-48 h-48 rounded-lg shadow-md border border-zinc-800 p-2 bg-white"
                />
                <p className="text-xs text-zinc-400">Scan with phone camera to instantly join</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
