'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BoardTemplate, ConnectedBoardUser, BOARD_TEMPLATES } from '@n1/shared';
import { BoardConnectionStatus } from '../../lib/board-client';
import { Button } from '../ui/Button';
import { ParticipantsModal } from './ParticipantsModal';

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
  isAdmin?: boolean;
  isCreator?: boolean;
  creatorToken?: string | null;
  presenterUserId?: string | null;
  isFollowingPresenter?: boolean;
  onToggleFollowPresenter?: () => void;
  onStartPresenting?: () => void;
  onStopPresenting?: () => void;
  onPromoteUser?: (userId: string) => void;
  onRevokeAdmin?: (userId: string) => void;
  onKickUser?: (userId: string) => void;
  onLowerHand?: (userId: string) => void;
  onLowerAllHands?: () => void;
  onClaimHost?: (token: string) => Promise<boolean>;
  onToggleChat?: () => void;
  unreadMessageCount?: number;
  handRaised?: boolean;
  onToggleRaiseHand?: () => void;
  allowParticipantEditing?: boolean;
  onToggleParticipantEditing?: (allowed: boolean) => void;
  recentActivity?: { action: string; details?: string; userName: string; timestamp: number } | null;
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
  isAdmin = false,
  isCreator = false,
  creatorToken = null,
  presenterUserId = null,
  isFollowingPresenter = true,
  onToggleFollowPresenter,
  onStartPresenting,
  onStopPresenting,
  onPromoteUser,
  onRevokeAdmin,
  onKickUser,
  onLowerHand,
  onLowerAllHands,
  onClaimHost,
  onToggleChat,
  unreadMessageCount = 0,
  handRaised = false,
  onToggleRaiseHand,
  allowParticipantEditing = true,
  onToggleParticipantEditing,
  recentActivity,
  onShare,
  onExportPng,
  onExportSvg,
  onExportJson,
  onClear,
  onSelectTemplate,
}: BoardHeaderProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedHostLink, setCopiedHostLink] = useState(false);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [hostMenuOpen, setHostMenuOpen] = useState(false);
  const [claimHostModalOpen, setClaimHostModalOpen] = useState(false);
  const [claimKeyInput, setClaimKeyInput] = useState('');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const headerRef = useRef<HTMLElement | null>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setHostMenuOpen(false);
        setMoreMenuOpen(false);
        setExportMenuOpen(false);
        setTemplateMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

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
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-40 h-[calc(3.5rem+env(safe-area-inset-top,0px))] pt-[env(safe-area-inset-top,0px)] px-2 sm:px-4 border-b border-[var(--color-border-subtle)] bg-[#09090f]/95 backdrop-blur-xl flex items-center justify-between gap-1 sm:gap-2 select-none w-full max-w-full overflow-hidden"
      >
        {/* ── Left: Back Link, Room Code Badge, Role Pill, Title ── */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink-0">
          <Link
            href="/board"
            aria-label="Back to Study Board Hub"
            className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-cyan-400 transition-colors shrink-0 p-1.5 rounded-xl hover:bg-white/5 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden md:inline font-medium">Hub</span>
          </Link>

          {/* Room Title (Tablet & Desktop) */}
          <span
            className="hidden md:inline-block text-xs sm:text-sm font-bold text-white max-w-[110px] lg:max-w-[170px] truncate"
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
            className="flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg font-mono text-[11px] sm:text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 active:scale-95 transition-all shrink-0 focus-ring"
          >
            <span>{roomCode}</span>
            {copiedCode ? (
              <span className="text-[10px] text-emerald-400 font-bold">✓</span>
            ) : (
              <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          {/* Role Badge (Desktop: full pill, Mobile: compact icon) */}
          {isCreator ? (
            <span
              title="Classroom Host (Super Admin)"
              className="px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0 inline-flex items-center gap-1"
            >
              <span>👑</span>
              <span className="hidden sm:inline">Host</span>
            </span>
          ) : isAdmin ? (
            <span
              title="Classroom Admin (Co-Host)"
              className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 inline-flex items-center gap-1"
            >
              <span>🛡️</span>
              <span className="hidden sm:inline">Admin</span>
            </span>
          ) : (
            <span
              title="Classroom Participant"
              className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-white/10 text-zinc-300 border border-white/15 shrink-0 inline-flex items-center gap-1"
            >
              <span>👤</span>
              <span className="hidden sm:inline">User</span>
            </span>
          )}

          {/* Live Presenter Pill */}
          {presenterUserId && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 animate-pulse">
              <span>📡 Live</span>
            </div>
          )}

          {/* Expiration Timer (Large screens) */}
          {timeRemaining && (
            <span
              className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono text-[var(--color-text-muted)] bg-white/5 px-2 py-0.5 rounded border border-white/10 shrink-0"
              title="Time until room expires"
            >
              ⏳ {timeRemaining}
            </span>
          )}
        </div>

        {/* ── Right: Controls, Actions, Chat, Users, and Overflow Menu ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Subtle Live Activity Banner (Desktop) */}
          {recentActivity && (
            <div className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-medium animate-fadeIn max-w-[240px] truncate shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="truncate">
                <strong className="text-white">{recentActivity.userName}</strong>: {recentActivity.action}
              </span>
            </div>
          )}

          {/* ── 👑 Host Controls Dropdown (Host & Admins) ── */}
          {(isAdmin || isCreator) ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setHostMenuOpen(prev => !prev);
                  setTemplateMenuOpen(false);
                  setExportMenuOpen(false);
                  setMoreMenuOpen(false);
                }}
                title="Room Host Controls & Classroom Ejection"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 text-amber-300 border border-amber-500/50 hover:border-amber-400 transition-all shadow-[0_0_12px_rgba(245,158,11,0.25)] shrink-0 active:scale-95 cursor-pointer min-h-[34px]"
              >
                <span>👑</span>
                <span className="hidden sm:inline">Host Controls</span>
                <svg
                  className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${hostMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {hostMenuOpen && (
                <div className="fixed top-14 right-2 sm:absolute sm:top-full sm:right-0 mt-2 p-2 rounded-2xl border border-amber-500/40 bg-[#121222] shadow-[0_10px_35px_rgba(0,0,0,0.85)] w-[280px] max-w-[calc(100vw-1rem)] z-50 space-y-2 animate-in fade-in zoom-in-95 duration-100 text-left">
                  <div className="px-2 py-1 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                        <span>👑</span>
                        <span>Host Command Center</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">Classroom Control &amp; Ejection</div>
                    </div>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                      Super Admin
                    </span>
                  </div>

                  <div className="space-y-1">
                    {/* Lock/Unlock Canvas Editing */}
                    {onToggleParticipantEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          onToggleParticipantEditing(!allowParticipantEditing);
                        }}
                        className="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between transition-all bg-white/[0.03] hover:bg-white/[0.08] text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span>{allowParticipantEditing ? '🔓' : '🔒'}</span>
                          <div className="text-left">
                            <div className="font-semibold">{allowParticipantEditing ? 'Lock Board Editing' : 'Unlock Board Editing'}</div>
                            <div className="text-[10px] text-zinc-400">
                              {allowParticipantEditing ? 'Restrict students to View-Only' : 'Allow all students to draw'}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${allowParticipantEditing ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {allowParticipantEditing ? 'Unlocked' : 'Locked'}
                        </span>
                      </button>
                    )}

                    {/* Presentation Mode Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setHostMenuOpen(false);
                        if (presenterUserId === currentUser?.id) {
                          onStopPresenting?.();
                        } else {
                          onStartPresenting?.();
                        }
                      }}
                      className="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between transition-all bg-white/[0.03] hover:bg-white/[0.08] text-white"
                    >
                      <div className="flex items-center gap-2">
                        <span>📡</span>
                        <div className="text-left">
                          <div className="font-semibold">{presenterUserId === currentUser?.id ? 'Stop Broadcast' : 'Broadcast Screen to All'}</div>
                          <div className="text-[10px] text-zinc-400">Lock all students to your view</div>
                        </div>
                      </div>
                      {presenterUserId === currentUser?.id && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold animate-pulse">
                          LIVE
                        </span>
                      )}
                    </button>

                    {/* Manage & Kick Participants */}
                    <button
                      type="button"
                      onClick={() => {
                        setHostMenuOpen(false);
                        setParticipantsModalOpen(true);
                      }}
                      className="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between transition-all bg-white/[0.03] hover:bg-white/[0.08] text-white"
                    >
                      <div className="flex items-center gap-2">
                        <span>👥</span>
                        <div className="text-left">
                          <div className="font-semibold">Manage &amp; Kick Participants</div>
                          <div className="text-[10px] text-zinc-400">Eject disruptive users, promote co-hosts</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-bold">
                        {connectedUsers.length} online
                      </span>
                    </button>

                    {/* Lower All Hands */}
                    {onLowerAllHands && (
                      <button
                        type="button"
                        onClick={() => {
                          onLowerAllHands();
                          setHostMenuOpen(false);
                        }}
                        className="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between transition-all bg-white/[0.03] hover:bg-white/[0.08] text-white"
                      >
                        <div className="flex items-center gap-2">
                          <span>✋</span>
                          <div className="text-left">
                            <div className="font-semibold">Lower All Raised Hands</div>
                            <div className="text-[10px] text-zinc-400">Clear all student question queues</div>
                          </div>
                        </div>
                      </button>
                    )}

                    {/* Clear Entire Board */}
                    <button
                      type="button"
                      onClick={() => {
                        setHostMenuOpen(false);
                        if (confirm('Clear the entire board? All student drawings and notes will be permanently erased.')) {
                          onClear();
                        }
                      }}
                      className="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-300"
                    >
                      <div className="flex items-center gap-2">
                        <span>🗑️</span>
                        <div className="text-left">
                          <div className="font-semibold text-rose-300">Authoritative Clear Board</div>
                          <div className="text-[10px] text-rose-300/70">Wipe canvas for all participants</div>
                        </div>
                      </div>
                    </button>

                    {/* Copy Host Link with Token */}
                    {creatorToken && (
                      <button
                        type="button"
                        onClick={() => {
                          const url = typeof window !== 'undefined' ? `${window.location.origin}/board/${roomCode}?host=${creatorToken}` : '';
                          if (url) navigator.clipboard.writeText(url);
                          setCopiedHostLink(true);
                          setTimeout(() => setCopiedHostLink(false), 2000);
                        }}
                        className="w-full px-2.5 py-2 text-xs rounded-xl flex items-center justify-between transition-all bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>🔑</span>
                          <div className="text-left truncate">
                            <div className="font-bold truncate">{copiedHostLink ? '✓ Copied Host Link!' : 'Copy Host Secret Link'}</div>
                            <div className="text-[10px] text-amber-200/70 truncate">Open on mobile for instant Host control</div>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : onClaimHost ? (
            <button
              type="button"
              onClick={() => setClaimHostModalOpen(true)}
              title="Are you the Host? Enter Host Key"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all shrink-0 cursor-pointer min-h-[34px]"
            >
              <span>🔑</span>
              <span>Claim Host</span>
            </button>
          ) : null}

          {/* Participants Button (Primary action on all viewports) */}
          <button
            type="button"
            onClick={() => {
              setParticipantsModalOpen(true);
              setMoreMenuOpen(false);
              setHostMenuOpen(false);
            }}
            title="Classroom Participants"
            aria-label={`Participants: ${connectedUsers.length} online`}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 active:scale-95 transition-all shrink-0 min-h-[34px]"
          >
            <span>👥</span>
            <span className="hidden sm:inline">Users</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-cyan-400 text-black font-bold">
              {connectedUsers.length}
            </span>
          </button>

          {/* Live Classroom Chat Button */}
          {onToggleChat && (
            <button
              type="button"
              onClick={() => {
                onToggleChat();
                setMoreMenuOpen(false);
                setHostMenuOpen(false);
              }}
              title="Open Classroom Chat &amp; Q&amp;A"
              aria-label="Classroom Chat"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 active:scale-95 transition-all shrink-0 relative min-h-[34px]"
            >
              <span>💬</span>
              <span className="hidden sm:inline">Chat</span>
              {(unreadMessageCount || 0) > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500 text-white font-bold animate-pulse shadow-sm">
                  {unreadMessageCount}
                </span>
              )}
            </button>
          )}

          {/* Desktop Raise Hand Button */}
          {onToggleRaiseHand && (
            <button
              type="button"
              onClick={onToggleRaiseHand}
              title={handRaised ? 'Lower your hand' : 'Raise hand to ask question'}
              aria-label={handRaised ? 'Lower Hand' : 'Raise Hand'}
              className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all shrink-0 min-h-[34px] ${
                handRaised
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm animate-pulse'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
              }`}
            >
              <span>✋</span>
              <span>{handRaised ? 'Raised' : 'Hand'}</span>
            </button>
          )}

          {/* Desktop Connection Status Indicator */}
          <div
            role="status"
            aria-label={`Connection status: ${connectionStatus}`}
            className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-wider uppercase border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shrink-0"
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
            <span className={getStatusColor().split(' ')[0]}>
              {connectionStatus}
            </span>
          </div>

          {/* Desktop Connected Online Peer Avatars */}
          <div className="hidden xl:flex items-center -space-x-1.5 pr-1">
            {connectedUsers.slice(0, 4).map(u => (
              <div
                key={u.id}
                title={`${u.name} (${u.isOwner ? '👑 Creator' : u.role === 'admin' ? '🛡️ Admin' : 'Participant'})${
                  u.id === currentUser?.id ? ' - You' : ''
                }`}
                style={{ backgroundColor: u.color }}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-black uppercase shadow-sm relative ${
                  u.isOwner
                    ? 'border-purple-400 ring-1 ring-purple-400/50'
                    : u.role === 'admin'
                    ? 'border-cyan-400 ring-1 ring-cyan-400/50'
                    : 'border-[#09090f]'
                }`}
              >
                {u.name.charAt(0)}
                {u.isOwner ? (
                  <span className="absolute -top-1.5 -right-1 text-[8px] leading-none">👑</span>
                ) : u.role === 'admin' ? (
                  <span className="absolute -top-1.5 -right-1 text-[8px] leading-none">🛡️</span>
                ) : null}
              </div>
            ))}
            {connectedUsers.length > 4 && (
              <div className="w-6 h-6 rounded-full border-2 border-[#09090f] bg-slate-800 text-[9px] font-mono text-white flex items-center justify-center">
                +{connectedUsers.length - 4}
              </div>
            )}
          </div>

          {/* Template Switcher (Desktop) */}
          <div className="relative hidden md:block">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTemplateMenuOpen(!templateMenuOpen);
                setExportMenuOpen(false);
                setHostMenuOpen(false);
              }}
              className="text-xs min-h-[34px]"
            >
              <span>Template</span>
              <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {templateMenuOpen && (
              <div className="absolute top-full right-0 mt-2 p-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[#12121e] shadow-2xl min-w-[200px] z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 text-left">
                <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)]">
                  Switch Template
                </div>
                {BOARD_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(t.id);
                      setTemplateMenuOpen(false);
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

          {/* Export Dropdown (Desktop) */}
          <div className="relative hidden sm:block">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setExportMenuOpen(!exportMenuOpen);
                setTemplateMenuOpen(false);
                setMoreMenuOpen(false);
                setHostMenuOpen(false);
              }}
              className="text-xs px-2.5 min-h-[34px]"
              aria-label="Export Board"
            >
              <svg className="w-3.5 h-3.5 mr-1 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Export</span>
              <svg className="w-2.5 h-2.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>

            {exportMenuOpen && (
              <div className="absolute top-full right-0 mt-2 p-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[#12121e] shadow-2xl min-w-[170px] z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100 text-left">
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
            className="hidden lg:inline-flex p-2 rounded-xl text-[var(--color-text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-ring shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>

          {/* Desktop Share Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={onShare}
            className="hidden sm:inline-flex bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs px-3 shadow-sm shadow-cyan-500/20 shrink-0 min-h-[34px]"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </Button>

          {/* ── Mobile More / Overflow Menu Button (Phone < sm) ── */}
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(!moreMenuOpen);
                setExportMenuOpen(false);
                setTemplateMenuOpen(false);
                setHostMenuOpen(false);
              }}
              aria-label="More actions & options"
              title="More actions"
              className={`p-2 rounded-xl border transition-all flex items-center justify-center min-w-[36px] min-h-[36px] active:scale-95 ${
                moreMenuOpen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {moreMenuOpen && (
              <div className="fixed top-14 right-2 p-2.5 rounded-2xl border border-white/10 bg-[#12121e]/98 backdrop-blur-xl shadow-2xl w-[270px] max-w-[calc(100vw-1rem)] z-50 space-y-2 animate-in fade-in zoom-in-95 duration-100 text-left max-h-[82vh] overflow-y-auto">
                <div className="px-1.5 py-1 border-b border-white/10 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Classroom Actions
                  </span>
                  {timeRemaining && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      ⏳ {timeRemaining}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {/* Share Room Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onShare();
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-between transition-colors active:scale-98"
                  >
                    <span className="flex items-center gap-2">
                      <span>🔗</span>
                      <span>Share Room &amp; QR</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold">{roomCode}</span>
                  </button>

                  {/* Raise / Lower Hand Toggle */}
                  {onToggleRaiseHand && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleRaiseHand();
                        setMoreMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-xs rounded-xl flex items-center justify-between transition-colors ${
                        handRaised
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : 'bg-white/5 hover:bg-white/10 text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>✋</span>
                        <span>{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
                      </span>
                      {handRaised && <span className="text-[10px] text-amber-300 font-mono">Active</span>}
                    </button>
                  )}

                  {/* Export Sub-actions */}
                  <div className="p-1.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 px-1.5">
                      Export Canvas
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onExportPng();
                        }}
                        className="py-1 px-1.5 text-center text-[11px] font-mono font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 transition-colors"
                      >
                        .PNG
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onExportSvg();
                        }}
                        className="py-1 px-1.5 text-center text-[11px] font-mono font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 transition-colors"
                      >
                        .SVG
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          onExportJson();
                        }}
                        className="py-1 px-1.5 text-center text-[11px] font-mono font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-cyan-300 transition-colors"
                      >
                        .JSON
                      </button>
                    </div>
                  </div>

                  {/* Template Picker Toggle */}
                  <div className="p-1.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 px-1.5">
                      Canvas Template
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {BOARD_TEMPLATES.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectTemplate(t.id);
                            setMoreMenuOpen(false);
                          }}
                          className={`px-2 py-1 text-[11px] rounded-lg text-left truncate transition-colors ${
                            template === t.id
                              ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40'
                              : 'bg-white/5 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Follow View Toggle (if presenter is active) */}
                  {presenterUserId && (
                    <button
                      type="button"
                      onClick={() => {
                        onToggleFollowPresenter?.();
                        setMoreMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-purple-500/20 text-purple-200 border border-purple-500/40 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span>📡</span>
                        <span>{isFollowingPresenter ? 'Unfollow Presenter' : 'Follow Presenter View'}</span>
                      </span>
                      <span className="text-[9px] bg-purple-400 text-black px-1 rounded font-bold">
                        {isFollowingPresenter ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  )}

                  {/* Claim Host (for participants) */}
                  {!isCreator && !isAdmin && onClaimHost && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        setClaimHostModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-2 hover:bg-amber-500/20 transition-colors"
                    >
                      <span>🔑</span>
                      <span>Claim Host Authority</span>
                    </button>
                  )}

                  {/* Clear Canvas */}
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      if (confirm('Clear the entire board? All student drawings and notes will be permanently erased.')) {
                        onClear();
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span>🗑️</span>
                      <span>Clear Canvas</span>
                    </span>
                    <span className="text-[10px] text-rose-300/60 font-mono">Wipe</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Participants & Permissions Modal */}
      <ParticipantsModal
        isOpen={participantsModalOpen}
        onClose={() => setParticipantsModalOpen(false)}
        roomCode={roomCode}
        roomTitle={roomTitle}
        connectionStatus={connectionStatus}
        connectedUsers={connectedUsers}
        currentUser={currentUser}
        isAdmin={isAdmin}
        isCreator={isCreator}
        creatorToken={creatorToken}
        presenterUserId={presenterUserId}
        isFollowingPresenter={isFollowingPresenter}
        onToggleFollowPresenter={onToggleFollowPresenter || (() => {})}
        onStartPresenting={onStartPresenting || (() => {})}
        onStopPresenting={onStopPresenting || (() => {})}
        onPromoteUser={onPromoteUser || (() => {})}
        onRevokeAdmin={onRevokeAdmin || (() => {})}
        onKickUser={onKickUser || (() => {})}
        onLowerHand={onLowerHand}
        onLowerAllHands={onLowerAllHands}
        allowParticipantEditing={allowParticipantEditing}
        onToggleParticipantEditing={onToggleParticipantEditing}
        onClaimHost={onClaimHost}
      />

      {/* Claim Host Modal */}
      {claimHostModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={e => {
            if (e.target === e.currentTarget) setClaimHostModalOpen(false);
          }}
        >
          <div className="w-full max-w-sm p-5 sm:p-6 rounded-3xl border border-amber-500/40 bg-[#121222] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
                👑
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Claim Host Authority</h3>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  Enter the room&apos;s Host Key to unlock Super Admin control
                </p>
              </div>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                if (!claimKeyInput.trim()) return;
                setIsClaiming(true);
                setClaimError(null);
                try {
                  const success = await onClaimHost?.(claimKeyInput.trim());
                  if (success) {
                    setClaimHostModalOpen(false);
                    setClaimKeyInput('');
                  } else {
                    setClaimError('Invalid Host Key. Please verify and try again.');
                  }
                } catch {
                  setClaimError('Failed to verify Host Key.');
                } finally {
                  setIsClaiming(false);
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Host Secret Key
                </label>
                <input
                  type="text"
                  placeholder="e.g. cr_..."
                  value={claimKeyInput}
                  onChange={e => setClaimKeyInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-500/30 bg-black/50 text-xs font-mono text-amber-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {claimError && (
                <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                  {claimError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimHostModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isClaiming || !claimKeyInput.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isClaiming ? 'Verifying...' : 'Claim Control →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
