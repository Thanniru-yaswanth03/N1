'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BoardTemplate, ConnectedBoardUser, BOARD_TEMPLATES } from '@n1/shared';
import { BoardConnectionStatus } from '../../lib/board-client';
import { Button } from '../ui/Button';

export interface BoardHeaderProps {
  roomCode: string;
  roomTitle: string;
  template: BoardTemplate;
  expiresAt: string;
  isExpired: boolean;
  isConnected: boolean;
  connectionStatus?: BoardConnectionStatus;
  connectedUsers: ConnectedBoardUser[];
  currentUser: ConnectedBoardUser | null;
  onShare: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onClear: () => void;
  onSelectTemplate: (t: BoardTemplate) => void;
}

export function BoardHeader({
  roomCode,
  roomTitle,
  template,
  expiresAt,
  isExpired,
  isConnected,
  connectionStatus = isConnected ? 'CONNECTED' : 'DISCONNECTED',
  connectedUsers,
  currentUser,
  onShare,
  onExportPng,
  onExportSvg,
  onExportJson,
  onClear,
  onSelectTemplate,
}: BoardHeaderProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Live expiration countdown calculation
  useEffect(() => {
    if (!expiresAt || isExpired) {
      setTimeRemaining('Expired');
      return;
    }

    const updateCountdown = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeRemaining(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'CONNECTED':
        return 'text-emerald-400 bg-emerald-400';
      case 'CONNECTING':
        return 'text-amber-400 bg-amber-400';
      case 'RECONNECTING':
        return 'text-rose-400 bg-rose-400';
      default:
        return 'text-zinc-400 bg-zinc-500';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 px-2.5 sm:px-4 border-b border-[var(--color-border-subtle)] bg-[#09090f]/90 backdrop-blur-xl flex items-center justify-between gap-2 select-none">
      {/* ── Left: Back Link, Room Title, Code Badge, Connection Pill ── */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <Link
          href="/board"
          aria-label="Back to Study Board Hub"
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-cyan-400 transition-colors shrink-0 p-1 rounded-lg hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="hidden md:inline font-medium">Hub</span>
        </Link>

        {/* Room Title */}
        <span
          className="text-xs sm:text-sm font-bold text-white max-w-[90px] xs:max-w-[130px] sm:max-w-[200px] truncate"
          title={roomTitle}
        >
          {roomTitle}
        </span>

        {/* Room Code Badge with Copy */}
        <button
          type="button"
          onClick={copyCode}
          title="Click to copy Room Code"
          aria-label={`Room Code ${roomCode}. Click to copy.`}
          className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md font-mono text-[11px] sm:text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all shrink-0 focus-ring"
        >
          <span>{roomCode}</span>
          <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {copiedCode && <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>}
        </button>

        {/* Connection Status Indicator (Visible on ALL devices) */}
        <div
          role="status"
          aria-label={`Connection status: ${connectionStatus}`}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shrink-0"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              connectionStatus === 'CONNECTED'
                ? 'bg-emerald-400 animate-pulse'
                : connectionStatus === 'CONNECTING'
                ? 'bg-amber-400 animate-pulse'
                : connectionStatus === 'RECONNECTING'
                ? 'bg-rose-400 animate-pulse'
                : 'bg-zinc-500'
            }`}
          />
          <span className={`hidden sm:inline ${getStatusColor().split(' ')[0]}`}>
            {connectionStatus}
          </span>
          {/* Peer count badge on mobile */}
          <span className="sm:hidden text-zinc-300 font-mono text-[10px]">
            👥{connectedUsers.length}
          </span>
        </div>

        {/* Live Expiration Countdown (Desktop) */}
        {timeRemaining && (
          <div className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{timeRemaining}</span>
          </div>
        )}
      </div>

      {/* ── Right: Peers, Desktop Actions, Mobile More Menu, Share Button ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Connected Online Peer Avatars (Tablet / Desktop) */}
        <div className="hidden md:flex items-center -space-x-1.5 pr-1">
          {connectedUsers.slice(0, 4).map(u => (
            <div
              key={u.id}
              title={`${u.name}${u.id === currentUser?.id ? ' (You)' : ''}`}
              style={{ backgroundColor: u.color }}
              className="w-6 h-6 rounded-full border-2 border-[#09090f] flex items-center justify-center text-[10px] font-bold text-black uppercase shadow-sm"
            >
              {u.name.charAt(0)}
            </div>
          ))}
          {connectedUsers.length > 4 && (
            <div className="w-6 h-6 rounded-full border-2 border-[#09090f] bg-slate-800 text-[9px] font-mono text-white flex items-center justify-center">
              +{connectedUsers.length - 4}
            </div>
          )}
        </div>

        {/* Template Switcher (Desktop / Tablet) */}
        <div className="relative hidden sm:block">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTemplateMenuOpen(!templateMenuOpen);
              setExportMenuOpen(false);
            }}
            className="text-xs"
          >
            <span>Template</span>
            <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {templateMenuOpen && (
            <div className="absolute top-full right-0 mt-2 p-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[#12121e] shadow-2xl min-w-[200px] z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                Switch Template
              </div>
              {BOARD_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (confirm(`Load "${t.name}" template? This will append the template elements to your board.`)) {
                      onSelectTemplate(t.id);
                      setTemplateMenuOpen(false);
                    }
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors flex items-center justify-between ${
                    template === t.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{t.name}</span>
                  {template === t.id && <span className="text-cyan-400">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Dropdown (Available on Mobile & Desktop) */}
        <div className="relative">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setExportMenuOpen(!exportMenuOpen);
              setTemplateMenuOpen(false);
              setMoreMenuOpen(false);
            }}
            className="text-xs px-2 sm:px-3"
            aria-label="Export Board"
          >
            <svg className="w-3.5 h-3.5 sm:mr-1 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Export</span>
            <svg className="w-2.5 h-2.5 ml-1 hidden sm:inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {exportMenuOpen && (
            <div className="absolute top-full right-0 mt-2 p-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[#12121e] shadow-2xl min-w-[170px] z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  onExportPng();
                  setExportMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white flex items-center justify-between"
              >
                <span>Export as PNG</span>
                <span className="text-[10px] font-mono text-cyan-400">.png</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportSvg();
                  setExportMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white flex items-center justify-between"
              >
                <span>Export as SVG</span>
                <span className="text-[10px] font-mono text-cyan-400">.svg</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportJson();
                  setExportMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white flex items-center justify-between"
              >
                <span>Export as JSON</span>
                <span className="text-[10px] font-mono text-cyan-400">.json</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile More / Actions Menu (Templates & Clear) */}
        <div className="relative sm:hidden">
          <button
            type="button"
            onClick={() => {
              setMoreMenuOpen(!moreMenuOpen);
              setExportMenuOpen(false);
            }}
            aria-label="More actions"
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {moreMenuOpen && (
            <div className="absolute top-full right-0 mt-2 p-2 rounded-xl border border-[var(--color-border-subtle)] bg-[#12121e] shadow-2xl min-w-[190px] z-50 space-y-2 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] px-2">
                Board Actions
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setTemplateMenuOpen(true);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white flex items-center justify-between"
                >
                  <span>Templates ({BOARD_TEMPLATES.length})</span>
                  <span>📐</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    if (confirm('Clear the entire board? All anonymous collaborators will see this change.')) {
                      onClear();
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs text-left rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-between"
                >
                  <span>Clear Canvas</span>
                  <span>🗑️</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Clear Canvas Button (Desktop) */}
        <button
          type="button"
          onClick={() => {
            if (confirm('Clear the entire board? All anonymous collaborators will see this change.')) {
              onClear();
            }
          }}
          title="Clear Board Canvas"
          aria-label="Clear canvas"
          className="hidden sm:inline-flex p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-ring"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>

        {/* Share Button (Primary) */}
        <Button
          variant="primary"
          size="sm"
          onClick={onShare}
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-2.5 sm:px-3 shadow-sm shadow-cyan-500/20 shrink-0"
        >
          <svg className="w-3.5 h-3.5 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="hidden xs:inline">Share</span>
        </Button>
      </div>
    </header>
  );
}
