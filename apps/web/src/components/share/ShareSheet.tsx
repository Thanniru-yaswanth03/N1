'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '../ui/Button';

export interface ShareSheetProps {
  url: string;
  code?: string;
  title?: string;
  description?: string;
  type?: 'drop' | 'board' | 'duel' | 'general';
  isOpen?: boolean;
  onClose?: () => void;
  isInline?: boolean;
}

export function ShareSheet({
  url,
  code,
  title = 'Share N1 Link',
  description = 'Private, zero-account link.',
  type = 'general',
  isOpen = true,
  onClose,
  isInline = false,
}: ShareSheetProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !!navigator.share) {
      setSupportsNativeShare(true);
    }
  }, []);

  // Generate QR code when canvas is visible
  useEffect(() => {
    if ((showQr || isInline) && qrCanvasRef.current && url) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        url,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#1E1B4B',
            light: '#FFFFFF',
          },
        },
        err => {
          if (err) console.error('QR generation error:', err);
        }
      );
    }
  }, [showQr, isInline, url]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
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
    a.download = `n1-${type}-${code || 'qr'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const content = (
    <div className="space-y-4 text-left">
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-n1-text-primary tracking-tight">{title}</h3>
          <p className="text-xs text-n1-text-secondary mt-0.5">{description}</p>
        </div>
        {!isInline && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share sheet"
            className="p-1 rounded-lg text-n1-text-muted hover:text-n1-text-primary hover:bg-n1-surface transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Primary Link & Copy Row */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-n1-text-muted uppercase tracking-wider">
          Shareable Link
        </label>
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-n1-surface border border-n1-border">
          <input
            type="text"
            readOnly
            value={url}
            className="flex-1 bg-transparent px-2.5 py-1 text-xs text-n1-text-primary font-mono select-all focus:outline-none truncate"
          />
          <Button
            type="button"
            size="sm"
            variant={copiedLink ? 'primary' : 'secondary'}
            onClick={handleCopyLink}
            className="shrink-0 text-xs px-3 py-1.5"
          >
            {copiedLink ? '✓ Copied' : 'Copy Link'}
          </Button>
        </div>
      </div>

      {/* Code Display if Available */}
      {code && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-n1-surface-raised border border-n1-border-subtle">
          <div>
            <div className="text-[10px] uppercase font-mono text-n1-text-muted">Short Code</div>
            <div className="text-xl font-mono font-bold text-n1-purple-light tracking-widest mt-0.5">
              {code}
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleCopyCode}
            className="text-xs"
          >
            {copiedCode ? '✓ Copied' : 'Copy Code'}
          </Button>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {supportsNativeShare ? (
          <Button
            type="button"
            variant="primary"
            onClick={handleNativeShare}
            className="w-full text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
          >
            <span>📱</span>
            <span>Native Share</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={handleCopyLink}
            className="w-full text-xs font-semibold py-2 flex items-center justify-center gap-1.5"
          >
            <span>🔗</span>
            <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
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

      {/* QR Code Section (Expandable or always visible inline) */}
      {(showQr || isInline) && (
        <div className="p-4 rounded-xl bg-n1-surface border border-n1-border flex flex-col items-center justify-center gap-3 animate-in fade-in duration-150">
          <div className="p-2.5 bg-white rounded-xl shadow-inner">
            <canvas ref={qrCanvasRef} className="block rounded-lg" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDownloadQr}
              className="text-xs flex items-center gap-1"
            >
              <span>💾</span>
              <span>Download QR</span>
            </Button>
          </div>
        </div>
      )}

      {/* Zero Surveillance Notice */}
      <div className="pt-2 border-t border-n1-border-subtle flex items-center justify-between text-[10px] text-n1-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-n1-success" />
          Zero tracking cookies or referral scripts
        </span>
        <span className="font-mono">Clean URL</span>
      </div>
    </div>
  );

  if (isInline) {
    return (
      <div className="rounded-2xl bg-n1-surface-raised border border-n1-border p-5 shadow-lg">
        {content}
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share Sheet"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-n1-surface-raised border border-n1-border shadow-2xl p-6 animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
}
