'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Card,
  Button,
  Badge,
  Modal,
  Countdown,
  Breadcrumbs,
} from '../../../../components/ui';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { ShareSheet } from '../../../../components/share/ShareSheet';

interface StoredDropData {
  code: string;
  shareUrl?: string;
  expiresAt?: string;
  deletionToken?: string;
  ownerDeletionToken?: string;
  dropType?: string;
  fileCount?: number;
  totalSizeBytes?: number;
  burnAfterReading?: boolean;
  isPasswordProtected?: boolean;
  viewLimit?: number | null;
}

export default function DropSuccessPage() {
  const params = useParams();
  const rawCode = (params?.['code'] as string) || '';
  const code = rawCode.toUpperCase().trim();

  const [dropData, setDropData] = useState<StoredDropData | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [copiedDeletionToken, setCopiedDeletionToken] = useState(false);

  // QR & Share State
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Delete Drop State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  // Load from sessionStorage with fallback API lookup
  useEffect(() => {
    if (typeof window !== 'undefined' && code) {
      try {
        const stored = sessionStorage.getItem(`n1_drop_${code}`);
        if (stored) {
          setDropData(JSON.parse(stored));
          return;
        }
      } catch {
        // ignore storage read issues
      }

      // Fallback: fetch metadata from API if not in sessionStorage
      fetch(`${apiClient.getApiBaseUrl()}/api/drop/${code}`, {
        headers: { Accept: 'application/json' },
      })
        .then(res => res.json())
        .then(json => {
          if (json?.success && json?.data) {
            const d = json.data;
            setDropData({
              code: d.code,
              expiresAt: d.expiresAt,
              dropType: d.dropType,
              fileCount: d.fileCount,
              totalSizeBytes: d.totalSizeBytes,
              burnAfterReading: d.burnAfterReading,
              isPasswordProtected: d.requiresPassword,
              viewLimit: d.maxViews,
            });
          }
        })
        .catch(() => { });
    }
  }, [code]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const shareUrl = dropData?.shareUrl || `${origin}/d/${code}`;
  const deletionToken = dropData?.deletionToken || dropData?.ownerDeletionToken || '';
  const expiresAt = dropData?.expiresAt;

  // Render QR Code onto canvas
  useEffect(() => {
    if (qrCanvasRef.current && shareUrl) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        shareUrl,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#F0F0F8', // n1 text primary
            light: '#111118', // n1 surface card
          },
        },
        error => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [shareUrl]);

  const copyToClipboard = async (text: string, type: 'code' | 'url' | 'token') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else if (type === 'url') {
        setCopiedShareUrl(true);
        setTimeout(() => setCopiedShareUrl(false), 2000);
      } else if (type === 'token') {
        setCopiedDeletionToken(true);
        setTimeout(() => setCopiedDeletionToken(false), 2000);
      }
    } catch {
      // fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrCanvasRef.current) return;
    const pngUrl = qrCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `n1-drop-${code || 'qr'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteDrop = async () => {
    const tokenToUse = (deletionToken || manualToken).trim();
    if (!code || isDeleting || !tokenToUse) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient.deleteDrop(code, tokenToUse);
      setIsDeleted(true);
      setIsDeleteModalOpen(false);

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`n1_drop_${code}`);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setDeleteError(err.message);
      } else {
        setDeleteError('Failed to delete drop. Please verify your token or try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // State after manual deletion
  if (isDeleted) {
    return (
      <div className="max-w-[620px] mx-auto px-4 py-16">
        <Card variant="raised" className="p-8 sm:p-10 text-center border-n1-border shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-full bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>

          <div>
            <Badge variant="error" className="mb-2">
              Permanently Deleted
            </Badge>
            <h1 className="text-2xl font-bold text-n1-text-primary">
              Drop #{code} Has Been Destroyed
            </h1>
            <p className="text-sm text-n1-text-secondary mt-1 max-w-md mx-auto">
              All physical files and decrypted content have been permanently unlinked from storage. This drop can no longer be accessed.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/drop">
              <Button variant="primary" size="lg">
                Create a New Drop →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto px-4 py-8 sm:py-14 space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Drop', href: '/drop' },
          { label: 'Created', active: true },
        ]}
        className="mb-2 justify-center"
      />
      <Card variant="raised" className="p-6 sm:p-10 border-n1-border shadow-2xl relative overflow-hidden">
        {/* Ambient Top Glow Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-n1-purple via-n1-purple-light to-n1-gold" />

        <div className="text-center space-y-6">
          {/* Success Checkmark & Badges */}
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-full bg-n1-purple/15 text-n1-purple-light flex items-center justify-center mx-auto border border-n1-purple/30 shadow-[0_0_24px_rgba(124,58,237,0.25)]">
              <svg className="w-8 h-8 text-n1-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="inline-flex flex-wrap items-center justify-center gap-2">
              <Badge variant="primary" dot pulse>
                Active
              </Badge>
              {dropData?.burnAfterReading && <Badge variant="gold">Burn After Reading 🔥</Badge>}
              {dropData?.isPasswordProtected && <Badge variant="muted">Password Protected 🔒</Badge>}
              {dropData?.viewLimit && (
                <Badge variant="muted">
                  Max Views: {dropData.viewLimit}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-extrabold text-n1-text-primary tracking-tight font-brand">
              Drop Created Successfully!
            </h1>
            <p className="text-sm text-n1-text-secondary max-w-md mx-auto">
              Your confidential content is active and secured. Share the access code or link below.
            </p>
          </div>

          {/* Expiration Countdown Banner */}
          {expiresAt && (
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-n1-surface border border-n1-border">
              <svg className="w-4 h-4 text-n1-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-n1-text-secondary">Self-destructs in:</span>
              <Countdown targetDate={expiresAt} variant="badge" size="sm" />
            </div>
          )}

          {/* 1. Large 6-Character Short Code Display with Copy Button & Feedback */}
          <div className="p-4 sm:p-6 rounded-2xl bg-n1-surface border border-n1-border flex flex-col items-center justify-center gap-3 relative">
            <span className="text-xs font-semibold uppercase tracking-wider text-n1-text-muted">
              Drop Access Code
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4 w-full sm:w-auto">
              <span className="text-3xl sm:text-5xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-n1-purple-light via-purple-300 to-n1-gold select-all text-center">
                {code}
              </span>
              <Button
                variant={copiedCode ? 'subtle' : 'secondary'}
                size="sm"
                onClick={() => copyToClipboard(code, 'code')}
                className="gap-1.5 w-full sm:w-auto justify-center"
                aria-label="Copy Drop Code"
              >
                {copiedCode ? (
                  <>
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>Copy Code</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 2. Direct Shareable Link with Copy Button & Feedback */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="shareable-link-input" className="text-xs font-semibold text-n1-text-secondary select-none">
                Direct Sharing URL
              </label>
              {copiedShareUrl && (
                <span className="text-xs text-emerald-400 font-semibold animate-fadeIn">
                  ✓ Link copied to clipboard!
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="shareable-link-input"
                type="text"
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 bg-n1-surface border border-n1-border text-n1-text-primary text-xs rounded-xl px-4 py-3 font-mono select-all focus-ring"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={copiedShareUrl ? 'subtle' : 'secondary'}
                  onClick={() => copyToClipboard(shareUrl, 'url')}
                  className="flex-1 sm:flex-initial gap-1.5 justify-center"
                >
                  {copiedShareUrl ? (
                    <>
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Copy Link</span>
                    </>
                  )}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex-1 sm:flex-initial gap-1.5 font-semibold justify-center"
                  aria-label="Open Share Modal"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </Button>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="p-4 sm:p-5 rounded-2xl bg-n1-surface border border-n1-border flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-2 rounded-xl bg-n1-surface-raised border border-n1-border shrink-0">
                <canvas ref={qrCanvasRef} className="rounded-lg" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-n1-text-primary">
                  Mobile QR Code
                </h3>
                <p className="text-xs text-n1-text-secondary">
                  Scan with any smartphone camera to open and download this Drop instantly.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadQr}
                className="w-full sm:w-auto gap-1 text-xs"
              >
                <span>💾</span>
                <span>Download QR (.PNG)</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsQrModalOpen(true)}
                className="shrink-0 w-full sm:w-auto text-xs"
              >
                Enlarge QR Code
              </Button>
            </div>
          </div>

          {/* 3. Owner Deletion Token (Save this!) */}
          {deletionToken && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    Owner Deletion Token (Save this!)
                  </span>
                </div>
                {copiedDeletionToken && (
                  <span className="text-xs text-amber-300 font-semibold animate-fadeIn">
                    ✓ Token copied!
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                N1 stores no accounts. This token is your only proof of ownership to manually delete this Drop before its scheduled self-destruct time.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={deletionToken}
                  className="w-full bg-n1-surface-raised border border-amber-500/30 text-amber-200 text-xs rounded-lg px-3 py-2 font-mono select-all focus-ring"
                />
                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => copyToClipboard(deletionToken, 'token')}
                  className="shrink-0 text-xs"
                >
                  {copiedDeletionToken ? 'Copied!' : 'Copy Token'}
                </Button>
              </div>
            </div>
          )}

          {/* Primary Action Buttons: View Drop, Create Another Drop, Delete Drop */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-n1-border-subtle">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link href={`/d/${code}`} className="flex-1 sm:flex-initial">
                <Button variant="primary" size="md" className="w-full sm:w-auto">
                  View Drop →
                </Button>
              </Link>
              <Link href="/drop" className="flex-1 sm:flex-initial">
                <Button variant="secondary" size="md" className="w-full sm:w-auto">
                  Create Another Drop
                </Button>
              </Link>
            </div>

            <Button
              variant="danger"
              size="md"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full sm:w-auto gap-1.5"
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              Delete Drop
            </Button>
          </div>
        </div>
      </Card>

      {/* QR Code Enlarged Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Scan Drop QR Code"
        size="sm"
      >
        <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
          <div className="p-4 rounded-2xl bg-white text-black inline-block shadow-lg">
            <canvas
              ref={node => {
                if (node && shareUrl) {
                  QRCode.toCanvas(node, shareUrl, { width: 220, margin: 1 });
                }
              }}
            />
          </div>
          <p className="text-xs text-n1-text-secondary">
            Scan to view Drop #{code} directly on your mobile device.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setIsQrModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) setIsDeleteModalOpen(false);
        }}
        title="Confirm Drop Deletion"
        size="md"
      >
        <div className="space-y-4 text-left">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-rose-300 text-xs space-y-2">
            <p className="font-bold text-rose-200">
              Are you sure you want to permanently delete Drop #{code}?
            </p>
            <p>
              This action is immediate and irreversible. All physical files will be unlinked from disk and the text payload permanently purged from the database.
            </p>
          </div>

          {!deletionToken && (
            <div className="space-y-1.5">
              <label htmlFor="manual-token-input" className="text-xs font-semibold text-n1-text-secondary">
                Owner Deletion Token
              </label>
              <input
                id="manual-token-input"
                type="text"
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                placeholder="Enter 32-character owner deletion token..."
                className="w-full bg-n1-surface-raised border border-n1-border text-xs rounded-xl px-3 py-2.5 font-mono text-n1-text-primary focus-ring"
              />
              <p className="text-[11px] text-n1-text-muted">
                Required to verify you are the creator of this Drop.
              </p>
            </div>
          )}

          {deleteError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteDrop}
              isLoading={isDeleting}
              disabled={isDeleting || (!deletionToken && !manualToken.trim())}
            >
              Yes, Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>

      {/* ShareSheet Modal */}
      {isShareModalOpen && (
        <Modal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Share Drop"
          size="md"
        >
          <ShareSheet
            url={shareUrl}
            code={code}
            title={`Drop #${code}`}
            description="Confidential self-destructing drop."
            type="drop"
            isInline={true}
            onClose={() => setIsShareModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
}
