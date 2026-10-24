'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Button } from '../ui/Button';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
  isCreator?: boolean;
  creatorToken?: string | null;
}

export function ShareModal({ isOpen, onClose, roomCode, roomTitle, isCreator = false, creatorToken = null }: ShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedHostLink, setCopiedHostLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(true);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/board/${roomCode}`
    : `https://n1.dev/board/${roomCode}`;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setSupportsNativeShare(true);
    }
  }, []);

  // Generate QR code onto canvas
  useEffect(() => {
    if (isOpen && qrCanvasRef.current && shareUrl) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 180,
          margin: 1.5,
          color: {
            dark: '#002538',
            light: '#FFFFFF',
          },
        },
        err => {
          if (err) console.error('QR generation error:', err);
        }
      );
    }
  }, [isOpen, shareUrl]);

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(roomCode);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `N1 Study Board: ${roomTitle}`,
          text: `Join my anonymous real-time study session on N1 with room code ${roomCode}.`,
          url: shareUrl,
        });
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = () => {
    if (!qrCanvasRef.current) return;
    const pngUrl = qrCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `n1-board-${roomCode}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 pointer-events-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share Study Room"
    >
      <div
        className="w-full max-w-md p-5 sm:p-6 rounded-3xl border border-cyan-500/30 bg-[#0f0f1a] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 select-none text-left"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Share Study Room</h3>
              <p className="text-xs text-[var(--color-text-secondary)] truncate max-w-[240px]">{roomTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share modal"
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Room Code Badge */}
        <div className="p-3.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Room Code
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-cyan-300">
              {roomCode}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant={copiedCode ? 'primary' : 'secondary'}
            onClick={handleCopyCode}
            className="text-xs font-semibold"
          >
            {copiedCode ? '✓ Copied' : 'Copy Code'}
          </Button>
        </div>

        {/* Share Link Row */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--color-text-secondary)] block">
            Direct Room URL
          </label>
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black/40 border border-white/10">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-transparent px-2.5 py-1 text-xs text-cyan-200 font-mono select-all focus:outline-none truncate"
            />
            <Button
              type="button"
              size="sm"
              variant={copiedLink ? 'primary' : 'secondary'}
              onClick={handleCopyLink}
              className="shrink-0 text-xs px-3"
            >
              {copiedLink ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Host Secret Link for Room Owner */}
        {isCreator && creatorToken && (
          <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <span>👑</span>
                <span>Host Secret Link (Super Admin)</span>
              </span>
              <span className="text-[9px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                Keep Secret
              </span>
            </div>
            <p className="text-[11px] text-zinc-300">
              Open this link on your phone or other devices to instantly regain full Host authority and kicking powers.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${shareUrl}?host=${creatorToken}`}
                className="flex-1 bg-black/40 px-2.5 py-1 text-xs text-amber-200 font-mono select-all focus:outline-none truncate rounded-lg border border-amber-500/20"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${shareUrl}?host=${creatorToken}`);
                  setCopiedHostLink(true);
                  setTimeout(() => setCopiedHostLink(false), 2000);
                }}
                className="px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-all shadow-sm shrink-0"
              >
                {copiedHostLink ? 'Copied!' : 'Copy Host Link'}
              </button>
            </div>
          </div>
        )}

        {/* Native Share & QR Toggle Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {supportsNativeShare ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNativeShare}
              className="w-full text-xs font-bold py-2 bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center gap-1.5"
            >
              <span>📱</span>
              <span>Native Share</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleCopyLink}
              className="w-full text-xs font-bold py-2 bg-cyan-500 hover:bg-cyan-400 text-black flex items-center justify-center gap-1.5"
            >
              <span>🔗</span>
              <span>{copiedLink ? 'URL Copied' : 'Share Link'}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowQr(prev => !prev)}
            className="w-full text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
          >
            <span>📷</span>
            <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
          </Button>
        </div>

        {/* QR Code Canvas & Download */}
        {showQr && (
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2.5 animate-in fade-in duration-150">
            <div className="p-2 bg-white rounded-xl shadow-inner">
              <canvas ref={qrCanvasRef} className="block rounded-lg" />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadQr}
              className="text-xs flex items-center gap-1"
            >
              <span>💾</span>
              <span>Download QR (.PNG)</span>
            </Button>
          </div>
        )}

        {/* Privacy Note */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Zero Accounts Required
          </span>
          <span className="font-mono text-zinc-400">Ephemeral Sync</span>
        </div>
     </div>
    </div>,
    document.body
  );
}
