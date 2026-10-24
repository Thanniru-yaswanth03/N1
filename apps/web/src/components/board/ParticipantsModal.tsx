'use client';

import React from 'react';
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
  presenterUserId: string | null;
  isFollowingPresenter: boolean;
  onToggleFollowPresenter: () => void;
  onStartPresenting: () => void;
  onStopPresenting: () => void;
  onPromoteUser: (userId: string) => void;
  onRevokeAdmin: (userId: string) => void;
  onKickUser: (userId: string) => void;
  onLowerHand?: (userId: string) => void;
  allowParticipantEditing: boolean;
  onToggleParticipantEditing?: (allowed: boolean) => void;
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
  presenterUserId,
  isFollowingPresenter,
  onToggleFollowPresenter,
  onStartPresenting,
  onStopPresenting,
  onPromoteUser,
  onRevokeAdmin,
  onKickUser,
  onLowerHand,
  allowParticipantEditing,
  onToggleParticipantEditing,
}: ParticipantsModalProps) {
  const [confirmKickId, setConfirmKickId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const isCurrentPresenter = presenterUserId === currentUser?.id;
  const presenter = connectedUsers.find(u => u.id === presenterUserId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="participants-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-cyan-500/25 bg-[#0f0f1b] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-base">
              👥
            </div>
            <div>
              <h2 id="participants-title" className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Classroom Participants</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  {connectedUsers.length}
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
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Presentation Mode Status & Controls */}
        <div className="p-3 sm:p-4 bg-white/[0.015] border-b border-white/5 space-y-2.5">
          {presenterUserId ? (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shrink-0" />
                <span className="text-xs text-purple-200">
                  <strong className="text-white font-semibold">
                    {isCurrentPresenter ? 'You are' : `${presenter?.name || 'An admin'} is`}
                  </strong>{' '}
                  presenting the board
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {isCurrentPresenter ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={onStopPresenting}
                    className="text-xs py-1 px-2.5"
                  >
                    Stop Presenting
                  </Button>
                ) : (
                  <button
                    type="button"
                    onClick={onToggleFollowPresenter}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isFollowingPresenter
                        ? 'bg-purple-500/30 text-purple-200 border-purple-500/50'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
                    }`}
                  >
                    {isFollowingPresenter ? '👁️ Following Presenter' : '🎯 Follow View'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            isAdmin && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-xs text-cyan-200">
                  <span>Present live board to all students</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onStartPresenting}
                  className="text-xs py-1 px-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                >
                  📡 Start Presenting
                </Button>
              </div>
            )
          )}

          {/* Admin toggle for all participant editing */}
          {isAdmin && onToggleParticipantEditing && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
              <div>
                <div className="text-xs font-semibold text-white">Participant Editing Access</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  {allowParticipantEditing
                    ? 'All participants can edit notes and drawings'
                    : 'Only Room Admins can edit (View-only for participants)'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleParticipantEditing(!allowParticipantEditing)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  allowParticipantEditing
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                {allowParticipantEditing ? '🔓 Unlocked' : '🔒 Locked'}
              </button>
            </div>
          )}
        </div>

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] px-1">
            Online Users ({connectedUsers.length})
          </div>

          <div className="space-y-1.5">
            {connectedUsers.map(user => {
              const isUserSelf = user.id === currentUser?.id;
              const isUserAdmin = user.role === 'admin' || user.isOwner;
              const isUserOwner = user.isOwner || (isUserSelf && isCreator);
              const isUserPresenting = user.id === presenterUserId;

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors gap-2"
                >
                  {/* Left: Avatar + Name + Badges */}
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
                        {isUserPresenting && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/25 text-purple-300 border border-purple-500/40 animate-pulse">
                            📡 Presenting
                          </span>
                        )}
                        {user.handRaised && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-0.5">
                            ✋ Hand Raised
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isUserOwner ? (
                          <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                            👑 Room Creator
                          </span>
                        ) : isUserAdmin ? (
                          <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
                            🛡️ Room Admin
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                            👤 Participant
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (Promote / Revoke / Lower Hand / Kick User) */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Lower hand action for admins */}
                    {isAdmin && user.handRaised && (
                      <button
                        type="button"
                        onClick={() => onLowerHand?.(user.id)}
                        title="Lower student's hand"
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1"
                      >
                        ✋ Lower
                      </button>
                    )}

                    {/* Promote / Revoke Admin */}
                    {isAdmin && !isUserSelf && !isUserOwner && (
                      <>
                        {!isUserAdmin ? (
                          <button
                            type="button"
                            onClick={() => onPromoteUser(user.id)}
                            title={`Promote ${user.name} to Room Admin`}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-all flex items-center gap-1 shadow-sm"
                          >
                            <span>🛡️ Promote</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRevokeAdmin(user.id)}
                            title={`Revoke Room Admin rights from ${user.name}`}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all"
                          >
                            <span>Revoke</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Kick User Button with 2-step confirmation */}
                    {isAdmin && !isUserSelf && !isUserOwner && (!isUserAdmin || isCreator) && (
                      confirmKickId === user.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              onKickUser(user.id);
                              setConfirmKickId(null);
                            }}
                            title={`Confirm removing ${user.name}`}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
                          >
                            Confirm Kick
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmKickId(null)}
                            title="Cancel kick"
                            className="px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmKickId(user.id)}
                          title={`Remove ${user.name} from room`}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1"
                        >
                          <span>🚫 Kick</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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
            className="px-3 py-1 rounded-lg hover:bg-white/10 text-white font-medium text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
