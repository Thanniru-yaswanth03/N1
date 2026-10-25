'use client';

import React, { useState } from 'react';
import { ConnectedBoardUser } from '@n1/shared';
import { BoardConnectionStatus } from '../../lib/board-client';
import { Button } from '../ui/Button';

export interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
  connectionStatus: BoardConnectionStatus;
  connectedUsers: ConnectedBoardUser[];
  currentUser: ConnectedBoardUser | null;
  isAdmin: boolean;
  isCreator: boolean;
  creatorToken?: string | null;
  presenterUserId: string | null;
  isFollowingPresenter: boolean;
  onToggleFollowPresenter: () => void;
  onStartPresenting: () => void;
  onStopPresenting: () => void;
  onPromoteUser: (userId: string) => void;
  onRevokeAdmin: (userId: string) => void;
  onKickUser: (userId: string) => void;
  onLowerHand?: (userId: string) => void;
  onLowerAllHands?: () => void;
  allowParticipantEditing: boolean;
  onToggleParticipantEditing?: (allowed: boolean) => void;
  onClaimHost?: (token: string) => Promise<boolean>;
}

export function ParticipantsModal({
  isOpen,
  onClose,
  roomCode,
  roomTitle,
  connectionStatus,
  connectedUsers,
  currentUser,
  isAdmin,
  isCreator,
  creatorToken,
  presenterUserId,
  isFollowingPresenter,
  onToggleFollowPresenter,
  onStartPresenting,
  onStopPresenting,
  onPromoteUser,
  onRevokeAdmin,
  onKickUser,
  onLowerHand,
  onLowerAllHands,
  allowParticipantEditing,
  onToggleParticipantEditing,
  onClaimHost,
}: ParticipantsModalProps) {
  const [targetToKick, setTargetToKick] = useState<ConnectedBoardUser | null>(null);
  const [claimKeyInput, setClaimKeyInput] = useState('');
  const [claimMessage, setClaimMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen) return null;

  const isCurrentPresenter = presenterUserId === currentUser?.id;
  const presenter = connectedUsers.find(u => u.id === presenterUserId);

  // Group participants by authoritative hierarchy
  const hostUser = connectedUsers.find(u => u.isOwner) || (isCreator && currentUser ? currentUser : null);
  const coHostUsers = connectedUsers.filter(u => u.role === 'admin' && (!hostUser || u.id !== hostUser.id));
  const regularParticipants = connectedUsers.filter(
    u => u.role !== 'admin' && (!hostUser || u.id !== hostUser.id)
  );
  const raisedHandsCount = connectedUsers.filter(u => u.handRaised).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="participants-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl border border-cyan-500/30 bg-[#0c0c16] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-lg shadow-sm">
              👑
            </div>
            <div>
              <h2 id="participants-title" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Classroom Participants</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                  {connectedUsers.length} Online
                </span>
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[240px] sm:max-w-xs">
                Room <strong className="text-cyan-300 font-mono">{roomCode}</strong> • {roomTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close participants modal"
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Presentation & Editing Permissions Control Bar */}
        <div className="p-3 sm:p-4 bg-white/[0.015] border-b border-white/5 space-y-2.5">
          {presenterUserId ? (
            <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
                <span className="text-xs text-purple-200">
                  <strong className="text-white font-semibold">
                    {isCurrentPresenter ? 'You are' : `${presenter?.name || 'The Host'} is`}
                  </strong>{' '}
                  broadcasting the board live
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {isCurrentPresenter ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onStopPresenting}
                    className="text-xs py-1 px-3 font-bold"
                  >
                    Stop Broadcast
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleFollowPresenter}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      isFollowingPresenter
                        ? 'bg-purple-500/30 text-purple-200 border-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                    }`}
                  >
                    {isFollowingPresenter ? '👁️ Following Host' : '🎯 Follow View'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            isAdmin && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-xs text-cyan-200">
                  <span className="font-semibold text-white">Broadcast Screen to Students</span>
                  <p className="text-[11px] text-cyan-300/80">Lock all viewers to your viewport & zoom</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onStartPresenting}
                  className="text-xs py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold shrink-0"
                >
                  📡 Start Broadcast
                </Button>
              </div>
            )
          )}

          {/* Admin toggle for all participant editing */}
          {isAdmin && onToggleParticipantEditing && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Student Canvas Editing</span>
                  <span className={`text-[10px] font-mono px-1.5 rounded ${allowParticipantEditing ? 'text-emerald-300 bg-emerald-500/20' : 'text-amber-300 bg-amber-500/20'}`}>
                    {allowParticipantEditing ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  {allowParticipantEditing
                    ? 'All students can draw and add notes'
                    : 'Board is Read-Only for students (Only Admins draw)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleParticipantEditing(!allowParticipantEditing)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  allowParticipantEditing
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {allowParticipantEditing ? '🔓 Unlocked' : '🔒 Locked'}
              </button>
            </div>
          )}

          {/* Bulk Hand Lowering */}
          {isAdmin && raisedHandsCount > 0 && onLowerAllHands && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-xs text-amber-300 font-semibold flex items-center gap-1">
                <span>✋</span>
                <span>{raisedHandsCount} participant{raisedHandsCount > 1 ? 's have' : ' has'} raised hand</span>
              </span>
              <button
                type="button"
                onClick={onLowerAllHands}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition-all"
              >
                Lower All Hands
              </button>
            </div>
          )}
        </div>

        {/* Participant List with Authoritative Hierarchy */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {/* ── 1. SUPREME HOST SECTION ── */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold px-1 flex items-center gap-1">
              <span>👑</span>
              <span>Room Host & Super Admin</span>
            </div>

            {hostUser ? (
              <div className="p-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent space-y-2 shadow-lg shadow-amber-500/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      style={{ backgroundColor: hostUser.color || '#f59e0b' }}
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black text-black uppercase shrink-0 ring-2 ring-amber-400 shadow-md relative"
                    >
                      {hostUser.name.charAt(0)}
                      <span className="absolute -top-1.5 -right-1 text-xs">👑</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-white truncate">
                          {hostUser.name}
                        </span>
                        {hostUser.id === currentUser?.id && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-amber-400 text-black font-extrabold">
                            YOU (HOST)
                          </span>
                        )}
                        {hostUser.id === presenterUserId && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-500/50 animate-pulse">
                            📡 Live
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1 mt-0.5">
                        <span>Supreme Authority</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-[10px] text-zinc-400">Immune to Kick</span>
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase shrink-0">
                    Host
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl border border-dashed border-white/10 text-xs text-zinc-400 text-center">
                Room Host is offline. Enter Host Key below to claim authority.
              </div>
            )}
          </div>

          {/* ── 2. CO-HOSTS (ADMINS) SECTION ── */}
          {coHostUsers.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold px-1 flex items-center gap-1">
                <span>🛡️</span>
                <span>Co-Hosts & Classroom Admins ({coHostUsers.length})</span>
              </div>

              <div className="space-y-1.5">
                {coHostUsers.map(user => {
                  const isUserSelf = user.id === currentUser?.id;
                  const isUserPresenting = user.id === presenterUserId;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{ backgroundColor: user.color || '#00f0ff' }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-black uppercase shrink-0 ring-1 ring-cyan-400"
                        >
                          {user.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {user.name}
                            </span>
                            {isUserSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/10 text-zinc-300">
                                You
                              </span>
                            )}
                            {isUserPresenting && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40 animate-pulse">
                                📡 Presenting
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                            🛡️ Promoted Co-Host
                          </div>
                        </div>
                      </div>

                      {/* Co-Host Management (Host has supreme power) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCreator && !isUserSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() => onRevokeAdmin(user.id)}
                              title={`Revoke admin privileges from ${user.name}`}
                              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all"
                            >
                              Revoke
                            </button>
                            <button
                              type="button"
                              onClick={() => setTargetToKick(user)}
                              title={`Kick ${user.name} from room`}
                              className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 hover:border-rose-400 shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>🚫 Kick</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 3. REGULAR PARTICIPANTS SECTION ── */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] font-bold px-1 flex items-center justify-between">
              <span>👥 Students & Participants ({regularParticipants.length})</span>
            </div>

            {regularParticipants.length === 0 ? (
              <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] text-center text-xs text-zinc-500">
                No other participants currently in room. Share the room code to invite students.
              </div>
            ) : (
              <div className="space-y-1.5">
                {regularParticipants.map(user => {
                  const isUserSelf = user.id === currentUser?.id;

                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          style={{ backgroundColor: user.color || '#00f0ff' }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black uppercase shrink-0 ring-1 ring-white/20 shadow-sm"
                        >
                          {user.name.charAt(0)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-white truncate">
                              {user.name}
                            </span>
                            {isUserSelf && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-white/10 text-zinc-300">
                                You
                              </span>
                            )}
                            {user.handRaised && (
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-0.5">
                                ✋ Raised Hand
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            👤 Participant
                          </div>
                        </div>
                      </div>

                      {/* Participant Management Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {/* Lower hand action */}
                        {isAdmin && user.handRaised && onLowerHand && (
                          <button
                            type="button"
                            onClick={() => onLowerHand(user.id)}
                            title="Lower student's hand"
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1"
                          >
                            ✋ Lower
                          </button>
                        )}

                        {/* Promote to Co-Host (Admin) */}
                        {isAdmin && !isUserSelf && (
                          <button
                            type="button"
                            onClick={() => onPromoteUser(user.id)}
                            title={`Promote ${user.name} to Co-Host`}
                            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span>🛡️ Make Admin</span>
                          </button>
                        )}

                        {/* Kick User Button (Bold, Unmissable) */}
                        {isAdmin && !isUserSelf && (
                          <button
                            type="button"
                            onClick={() => setTargetToKick(user)}
                            title={`Remove ${user.name} from room`}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 hover:border-rose-400 shadow-sm transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <span>🚫 Kick</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 4. HOST KEY / CLAIM HOST CONTROLS ── */}
          {isCreator && creatorToken ? (
            <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <span>👑</span>
                  <span>Your Host Secret Key</span>
                </span>
                <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                  Keep Secret
                </span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Use this key or the Host Secret Link to regain Host authority on any device or browser.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={creatorToken}
                  className="flex-1 bg-black/50 px-2.5 py-1 text-xs text-amber-200 font-mono select-all focus:outline-none truncate rounded-xl border border-amber-500/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(creatorToken);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-3 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  {copiedKey ? '✓ Copied' : 'Copy Key'}
                </button>
              </div>
            </div>
          ) : !isCreator && onClaimHost ? (
            <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.02] space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>🔑</span>
                  <span>Are you the Classroom Host?</span>
                </span>
                <span className="text-[10px] text-zinc-400">Claim Authority</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Enter your Host Secret Key to unlock Host Controls and participant management.
              </p>
              <form
                onSubmit={async e => {
                  e.preventDefault();
                  if (!claimKeyInput.trim()) return;
                  setIsClaiming(true);
                  setClaimMessage(null);
                  try {
                    const success = await onClaimHost(claimKeyInput.trim());
                    if (success) {
                      setClaimMessage({ text: 'Host authority claimed successfully! 👑', error: false });
                      setClaimKeyInput('');
                    } else {
                      setClaimMessage({ text: 'Invalid Host Key. Please verify.', error: true });
                    }
                  } catch {
                    setClaimMessage({ text: 'Verification failed.', error: true });
                  } finally {
                    setIsClaiming(false);
                  }
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  placeholder="Paste Host Key (e.g. cr_...)"
                  value={claimKeyInput}
                  onChange={e => setClaimKeyInput(e.target.value)}
                  className="flex-1 bg-black/40 px-2.5 py-1 text-xs text-amber-200 font-mono rounded-xl border border-white/10 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={isClaiming || !claimKeyInput.trim()}
                  className="px-3 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isClaiming ? 'Verifying...' : 'Claim Host'}
                </button>
              </form>
              {claimMessage && (
                <div className={`text-[11px] font-semibold mt-1 ${claimMessage.error ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {claimMessage.text}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Kick Confirmation Dialog identifying target participant */}
        {targetToKick && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="kick-dialog-title"
            className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={e => {
              if (e.target === e.currentTarget) setTargetToKick(null);
            }}
          >
            <div className="w-full max-w-sm p-5 sm:p-6 rounded-3xl border border-rose-500/50 bg-[#141424] shadow-[0_20px_50px_rgba(244,63,94,0.25)] space-y-4 animate-in zoom-in-95 duration-150 text-left">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 text-xl shrink-0">
                  🚫
                </div>
                <div>
                  <h3 id="kick-dialog-title" className="text-sm font-bold text-white">
                    Remove Participant?
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Immediate expulsion from study room
                  </p>
                </div>
              </div>

              {/* Target Participant Identity */}
              <div className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center gap-2.5">
                <div
                  style={{ backgroundColor: targetToKick.color || '#00f0ff' }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-black uppercase shrink-0 ring-1 ring-white/20"
                >
                  {targetToKick.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{targetToKick.name}</div>
                  <div className="text-[10px] text-zinc-400 capitalize">
                    Role: {targetToKick.role === 'admin' ? '🛡️ Co-Host' : '👤 Participant'}
                  </div>
                </div>
              </div>

              <p className="text-xs text-rose-200/90 leading-relaxed">
                Are you sure you want to kick <strong>{targetToKick.name}</strong> from this study room?
                They will be disconnected immediately and permanently barred from re-entering.
              </p>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTargetToKick(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onKickUser(targetToKick.id);
                    setTargetToKick(null);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/40 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Confirm Kick</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-4 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-[var(--color-text-muted)]">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>Connection: {connectionStatus}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl hover:bg-white/10 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
