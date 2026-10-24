'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  RecentDropItem,
  getRecentDrops,
  removeRecentDrop,
  clearAllRecentDrops,
} from '../../lib/recent-drops';
import { Button } from '../ui/Button';

interface RecentDropsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecentDropsDrawer({ isOpen, onClose }: RecentDropsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [drops, setDrops] = useState<RecentDropItem[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadDrops = () => {
    setDrops(getRecentDrops());
  };

  useEffect(() => {
    loadDrops();

    const handleStorageChange = () => {
      loadDrops();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('n1_recent_drops_changed', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('n1_recent_drops_changed', handleStorageChange);
    };
  }, []);

  // Handle escape key and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleCopy = (code: string) => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/d/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleBurn = async (item: RecentDropItem) => {
    if (!item.ownerDeletionToken) {
      removeRecentDrop(item.code);
      return;
    }

    setDeletingCode(item.code);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')
          ? process.env.NEXT_PUBLIC_API_URL
          : typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
            ? 'https://n1-api.onrender.com'
            : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
      await fetch(`${apiBase}/api/drop/${item.code}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-deletion-token': item.ownerDeletionToken,
          'x-owner-token': item.ownerDeletionToken,
        },
      });
    } catch {
      // Ignore network errors, proceed to clear local record
    } finally {
      removeRecentDrop(item.code);
      setDeletingCode(null);
    }
  };

  const handleClearAll = () => {
    clearAllRecentDrops();
    setConfirmClearAll(false);
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="My Recent Drops"
      className="fixed inset-0 z-[100] overflow-hidden flex justify-end pointer-events-auto animate-fadeIn"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer pointer-events-auto"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md bg-n1-surface border-l border-n1-border shadow-2xl flex flex-col h-full z-10 pointer-events-auto animate-slideInRight">
        {/* Header */}
        <div className="p-5 border-b border-n1-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-n1-purple/15 text-n1-purple-light border border-n1-purple/30 flex items-center justify-center font-bold">
              ⏱️
            </div>
            <div>
              <h2 className="text-base font-bold text-n1-text-primary">My Recent Drops</h2>
              <p className="text-xs text-n1-text-muted">Client-side local device storage</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-n1-text-muted hover:text-n1-text-primary hover:bg-n1-surface-raised transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Privacy Callout Banner */}
        <div className="mx-4 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2">
          <span className="shrink-0 mt-0.5">🔒</span>
          <div>
            <span className="font-bold">100% Client-Side Privacy:</span> This history never leaves your
            browser. No account or server-side logging tracks these entries.
          </div>
        </div>

        {/* Drop List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drops.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-n1-surface-raised border border-n1-border flex items-center justify-center text-xl text-n1-text-muted">
                📭
              </div>
              <div className="text-sm font-semibold text-n1-text-primary">No Recent Drops</div>
              <p className="text-xs text-n1-text-muted max-w-xs">
                When you create a Drop on this device, its access code and deletion token will be stored
                here for easy recall until expired.
              </p>
            </div>
          ) : (
            drops.map(item => {
              const isExpired = new Date(item.expiresAt).getTime() <= Date.now();
              const createdDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.code}
                  className="p-4 rounded-xl bg-n1-surface-raised border border-n1-border hover:border-n1-purple/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/d/${item.code}`}
                        onClick={onClose}
                        className="font-mono font-bold text-base text-n1-purple-light hover:underline tracking-wider"
                      >
                        {item.code}
                      </Link>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-n1-surface border border-n1-border text-n1-text-secondary">
                        {item.dropType || 'drop'}
                      </span>
                    </div>

                    {isExpired ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Expired
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-n1-text-muted flex items-center justify-between font-mono">
                    <span>Created: {createdDate}</span>
                    <span>Expires: {new Date(item.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-n1-border-subtle">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopy(item.code)}
                      className="flex-1 text-xs py-1.5 h-auto cursor-pointer"
                    >
                      {copiedCode === item.code ? 'Copied!' : 'Copy Link'}
                    </Button>

                    {item.ownerDeletionToken ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleBurn(item)}
                        disabled={deletingCode === item.code}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs py-1.5 h-auto cursor-pointer"
                        title="Permanently burn Drop from server now"
                      >
                        {deletingCode === item.code ? 'Burning...' : 'Burn Now'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRecentDrop(item.code)}
                        className="text-n1-text-muted hover:text-rose-400 text-xs py-1.5 h-auto cursor-pointer"
                        title="Remove from history"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {drops.length > 0 && (
          <div className="p-4 border-t border-n1-border bg-n1-surface">
            {confirmClearAll ? (
              <div className="space-y-2">
                <p className="text-xs text-rose-400 text-center font-medium">
                  Clear all recent drops from this device?
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmClearAll(false)}
                    className="flex-1 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleClearAll}
                    className="flex-1 text-xs cursor-pointer"
                  >
                    Yes, Clear All
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setConfirmClearAll(true)}
                className="w-full text-xs text-n1-text-muted hover:text-rose-400 cursor-pointer"
              >
                Clear All Recent Drops
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
