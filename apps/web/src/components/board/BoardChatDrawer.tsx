'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BoardChatMessage, ConnectedBoardUser } from '@n1/shared';

export interface BoardChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: BoardChatMessage[];
  currentUser: ConnectedBoardUser | null;
  onSendMessage: (text: string) => void;
  onRetrySendMessage?: (msg: BoardChatMessage) => void;
  onSendReaction: (emoji: string) => void;
  handRaised: boolean;
  onToggleRaiseHand: () => void;
  isAdmin?: boolean;
  onKickUser?: (userId: string) => void;
}

const QUICK_REACTIONS = ['👏', '👍', '❤️', '💡', '🔥', '🎉', '😂', '🙌'];

export function BoardChatDrawer({
  isOpen,
  onClose,
  messages,
  currentUser,
  onSendMessage,
  onRetrySendMessage,
  onSendReaction,
  handRaised,
  onToggleRaiseHand,
  isAdmin = false,
  onKickUser,
}: BoardChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input when drawer opens
  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Classroom Chat and Q&A"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:w-[380px] md:w-[420px] h-full bg-[#0d0d18] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 select-none">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-sm">
              💬
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Classroom Chat & Q&A</span>
                <span className="px-2 py-0.2 rounded-full text-[11px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold">
                  {messages.length}
                </span>
              </h2>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                Live messages and quick questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Raise Hand Button in Chat Header */}
            <button
              type="button"
              onClick={onToggleRaiseHand}
              title={handRaised ? 'Lower your hand' : 'Raise hand to ask question'}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
                handRaised
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 shadow-sm animate-pulse'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-300 border-white/10'
              }`}
            >
              <span>✋</span>
              <span className="hidden xs:inline">{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Emoji Reaction Bar (Zoom-style) */}
        <div className="px-3 py-2 border-b border-white/5 bg-white/[0.015] flex items-center justify-between gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] shrink-0">
            Reactions:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => onSendReaction(emoji)}
                title={`React with ${emoji}`}
                className="w-8 h-8 rounded-lg hover:bg-white/10 active:scale-125 transition-transform flex items-center justify-center text-base"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 select-text">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--color-text-muted)] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
                💬
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-white">No messages yet</div>
                <p className="text-xs max-w-xs">
                  Ask a question, share notes, or send reactions to interact with teacher and peers.
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-2">
                {QUICK_REACTIONS.slice(0, 4).map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onSendReaction(emoji)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm border border-white/10 active:scale-110 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => {
              const isSelf = msg.userId === currentUser?.id;
              const isOwner = msg.isOwner;
              const isAuthorAdmin = msg.role === 'admin' || isOwner;

              const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isSelf ? 'flex-row-reverse' : ''}`}
                >
                  {/* User Avatar */}
                  <div
                    style={{ backgroundColor: msg.userColor || '#00f0ff' }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black uppercase shrink-0 ring-1 ring-white/20 shadow-sm mt-0.5"
                    title={msg.userName}
                  >
                    {msg.userName.charAt(0)}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[82%] rounded-2xl p-2.5 text-xs shadow-md space-y-1 ${
                      isSelf
                        ? 'bg-cyan-600/25 border border-cyan-500/40 text-cyan-50 rounded-tr-none'
                        : isAuthorAdmin
                        ? 'bg-purple-950/40 border border-purple-500/40 text-purple-100 rounded-tl-none'
                        : 'bg-white/5 border border-white/10 text-zinc-200 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 justify-between">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-semibold text-white truncate text-[11px]">
                          {msg.userName}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/20 px-1 rounded">
                            You
                          </span>
                        )}
                        {isOwner ? (
                          <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/40 shadow-xs">
                            👑 Host
                          </span>
                        ) : msg.role === 'admin' ? (
                          <span className="text-[9px] font-bold text-cyan-300 bg-cyan-500/20 px-1 rounded border border-cyan-500/30">
                            🛡️ Co-Host
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && !isSelf && !isOwner && onKickUser && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${msg.userName} from this study room?`)) {
                                onKickUser(msg.userId);
                              }
                            }}
                            title={`Kick ${msg.userName}`}
                            className="text-[9px] text-rose-400 hover:text-white px-1.5 py-0.5 rounded bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 transition-all font-semibold"
                          >
                            🚫 Kick
                          </button>
                        )}
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {timeStr}
                        </span>
                      </div>
                    </div>

                    <div className="whitespace-pre-wrap break-words leading-relaxed">
                      {msg.text}
                    </div>

                    {/* Status indicator for sending/sent/failed */}
                    {isSelf && msg.status && (
                      <div className="flex items-center justify-end gap-1 text-[9px] pt-0.5">
                        {msg.status === 'sending' && (
                          <span className="text-cyan-300/70 flex items-center gap-1 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            sending...
                          </span>
                        )}
                        {msg.status === 'failed' && (
                          <div className="flex items-center gap-1.5 text-rose-300 font-medium">
                            <span>⚠️ Failed</span>
                            {onRetrySendMessage && (
                              <button
                                type="button"
                                onClick={() => onRetrySendMessage(msg)}
                                className="underline hover:text-white font-bold cursor-pointer"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        )}
                        {msg.status === 'sent' && (
                          <span className="text-cyan-400/60 font-mono" title="Sent">
                            ✓
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-white/10 bg-white/[0.02] flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or question..."
            maxLength={1000}
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            title="Send Message (Enter)"
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-black font-bold text-xs transition-all flex items-center justify-center shrink-0 shadow-sm"
          >
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
