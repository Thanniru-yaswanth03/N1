'use client';

import React from 'react';

export interface FloatingReactionItem {
  id: string;
  emoji: string;
  userName: string;
  xPercent: number; // 20 to 80%
}

export interface ReactionOverlayProps {
  reactions: FloatingReactionItem[];
}

export function ReactionOverlay({ reactions }: ReactionOverlayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {reactions.map(rx => (
        <div
          key={rx.id}
          style={{ left: `${rx.xPercent}%` }}
          className="absolute bottom-16 sm:bottom-24 -translate-x-1/2 flex flex-col items-center animate-reaction-float"
        >
          <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none transform transition-transform hover:scale-125">
            {rx.emoji}
          </span>
          <span className="mt-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-black/60 backdrop-blur-xs text-white/90 border border-white/10 shadow-sm truncate max-w-[100px]">
            {rx.userName}
          </span>
        </div>
      ))}
    </div>
  );
}
