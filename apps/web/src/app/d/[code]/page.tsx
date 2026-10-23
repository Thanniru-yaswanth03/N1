'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  Countdown,
  CodeBlock,
  LoadingOverlay,
  ErrorState,
  Breadcrumbs,
} from '../../../components/ui';
import { formatBytes } from '../../../lib/utils';
import { submitAbuseReport } from '../../../lib/admin-client';
import { ExpiryUrgencyCard } from '../../../components/drop/ExpiryUrgencyCard';
import { apiClient } from '../../../lib/api-client';

interface PublicFileMeta {
  id: string;
  name: string;
  sizeBytes: number;
  extension: string;
  mimeType: string;
  downloadUrl: string;
}

interface DropData {
  code: string;
  status: string;
  dropType: 'text' | 'files';
  requiresPassword?: boolean;
  textContent?: string | null;
  totalSizeBytes?: number;
  fileCount?: number;
  files?: PublicFileMeta[];
  downloadZipUrl?: string;
  createdAt: string;
  expiresAt: string;
  viewCount?: number;
  maxViews?: number | null;
  burnAfterReading?: boolean;
}

interface PreviewState {
  isOpen: boolean;
  file: PublicFileMeta | null;
  type: 'image' | 'pdf' | 'text' | null;
  textContent?: string;
  isLoadingText?: boolean;
  textError?: string | null;
}

export default function ViewDropPage() {
  const params = useParams();
  const rawCode = (params?.['code'] as string) || '';
  const code = rawCode.toUpperCase().trim();

  const [isLoading, setIsLoading] = useState(true);
  const [drop, setDrop] = useState<DropData | null>(null);

  // Authentication & Passphrase
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);

  // Expiration & Errors
  const [isExpired, setIsExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState<'EXPIRED' | 'VIEW_LIMIT_REACHED' | 'DESTROYED'>('EXPIRED');
  const [expiredExplanation, setExpiredExplanation] = useState<string>(
    'All associated files and encrypted text have been automatically deleted from our servers.'
  );
  const [errorStatus, setErrorStatus] = useState<{
    code: string;
    message: string;
    statusCode: number;
  } | null>(null);

  // UI States
  const [copiedText, setCopiedText] = useState(false);

  // Previews
  const [previewState, setPreviewState] = useState<PreviewState>({
    isOpen: false,
    file: null,
    type: null,
  });

  // Burn-After-Reading Confirmation
  const [burnPrompt, setBurnPrompt] = useState<{
    isOpen: boolean;
    action: () => void;
    title: string;
    description: string;
  }>({
    isOpen: false,
    action: () => {},
    title: '',
    description: '',
  });

  // Abuse Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('other');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [reportErrorMessage, setReportErrorMessage] = useState<string | null>(null);

  const handleReportAbuse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    setReportErrorMessage(null);
    try {
      await submitAbuseReport(code, {
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setReportSuccessMessage('Thank you. Your report has been submitted to moderators for security review.');
      setReportDescription('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit report';
      setReportErrorMessage(msg);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const fetchDrop = useCallback(
    async (token?: string) => {
      setIsLoading(true);
      setErrorStatus(null);
      setUnlockError(null);

      try {
        const headers: Record<string, string> = { Accept: 'application/json' };
        const activeToken = token || unlockToken;
        if (activeToken) {
          headers['Authorization'] = `Bearer ${activeToken}`;
        }

        const res = await fetch(`/api/drop/${code}`, { headers });
        const json = await res.json().catch(() => null);

        if (res.status === 410) {
          setIsExpired(true);
          const errCode = json?.error?.code;
          if (errCode === 'VIEW_LIMIT_REACHED') {
            setExpiredReason('VIEW_LIMIT_REACHED');
            setExpiredExplanation(json?.error?.message || 'This Drop has reached its maximum view limit and has been automatically deleted.');
          } else if (errCode === 'DROP_BURNED' || errCode === 'DROP_DELETED') {
            setExpiredReason('DESTROYED');
            setExpiredExplanation(json?.error?.message || 'This Drop was burned after reading or permanently deleted by its creator.');
          } else {
            setExpiredReason('EXPIRED');
            setExpiredExplanation(json?.error?.message || 'This Drop exceeded its lifetime and was purged by the automatic expiration engine.');
          }
          setIsLoading(false);
          return;
        }

        if (res.status === 404) {
          setErrorStatus({
            code: 'DROP_NOT_FOUND',
            message: 'Drop not found. Please verify the 6-character access code.',
            statusCode: 404,
          });
          setIsLoading(false);
          return;
        }

        if (!res.ok || !json?.success) {
          setErrorStatus({
            code: json?.error?.code || 'FETCH_ERROR',
            message: json?.error?.message || 'Failed to retrieve Drop content.',
            statusCode: res.status,
          });
          setIsLoading(false);
          return;
        }

        // Check if expiresAt in the past
        if (json.data?.expiresAt && new Date(json.data.expiresAt).getTime() <= Date.now()) {
          setIsExpired(true);
          setIsLoading(false);
          return;
        }

        setDrop(json.data);
      } catch {
        setErrorStatus({
          code: 'NETWORK_ERROR',
          message: 'Unable to reach the N1 server. Please verify your internet connection.',
          statusCode: 500,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [code, unlockToken]
  );

  useEffect(() => {
    if (code) {
      fetchDrop();
    }
  }, [code, fetchDrop]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword || isUnlocking) return;

    setIsUnlocking(true);
    setUnlockError(null);

    try {
      const res = await fetch(`/api/drop/${code}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: unlockPassword }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 410) {
        setIsExpired(true);
        if (json?.error?.message) {
          setExpiredExplanation(json.error.message);
        }
        return;
      }

      if (!res.ok || !json?.success) {
        setUnlockError(json?.error?.message || 'Invalid passphrase. Please try again.');
        return;
      }

      // Successful unlock
      const token = json.data?.accessToken || json.data?.unlockToken;
      if (token) {
        setUnlockToken(token);
      }

      if (json.data?.drop) {
        setDrop(json.data.drop);
      } else {
        await fetchDrop(token);
      }
    } catch {
      setUnlockError('Network error during unlock. Please check connection and try again.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const copyTextToClipboard = async () => {
    if (!drop?.textContent) return;
    try {
      await navigator.clipboard.writeText(drop.textContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // fallback
    }
  };

  const getDownloadUrl = (file: PublicFileMeta, inline = false): string => {
    const params = new URLSearchParams();
    if (inline) params.set('inline', 'true');
    if (unlockToken) params.set('token', unlockToken);
    const queryString = params.toString();
    const rawUrl = file.downloadUrl;
    const base = apiClient.getApiBaseUrl();
    const fullUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    return `${fullUrl}${queryString ? `?${queryString}` : ''}`;
  };

  const getZipUrl = (): string => {
    if (!drop?.downloadZipUrl) return '';
    const rawUrl = drop.downloadZipUrl;
    const base = apiClient.getApiBaseUrl();
    const fullUrl = rawUrl.startsWith('http')
      ? rawUrl
      : `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    return unlockToken
      ? `${fullUrl}?token=${encodeURIComponent(unlockToken)}`
      : fullUrl;
  };

  // Determine preview capability by file extension
  const getFileType = (ext: string): 'image' | 'pdf' | 'text' | 'other' => {
    const clean = ext.toLowerCase().replace(/^\./, '');
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(clean)) return 'image';
    if (clean === 'pdf') return 'pdf';
    if (
      [
        'txt',
        'json',
        'js',
        'ts',
        'jsx',
        'tsx',
        'html',
        'css',
        'py',
        'md',
        'csv',
        'xml',
        'yaml',
        'yml',
        'sh',
        'sql',
      ].includes(clean)
    ) {
      return 'text';
    }
    return 'other';
  };

  const handlePreview = async (file: PublicFileMeta) => {
    const type = getFileType(file.extension);
    if (type === 'other') return;

    const performPreview = async () => {
      if (type === 'image' || type === 'pdf') {
        setPreviewState({
          isOpen: true,
          file,
          type,
        });
      } else if (type === 'text') {
        setPreviewState({
          isOpen: true,
          file,
          type,
          isLoadingText: true,
          textError: null,
        });

        try {
          const streamUrl = getDownloadUrl(file, true);
          const headers: Record<string, string> = {};
          if (unlockToken) {
            headers['Authorization'] = `Bearer ${unlockToken}`;
          }
          const res = await fetch(streamUrl, { headers });
          if (!res.ok) {
            throw new Error(`Failed to load text (status ${res.status})`);
          }
          const text = await res.text();
          setPreviewState(prev => ({
            ...prev,
            textContent: text,
            isLoadingText: false,
          }));
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to load text preview.';
          setPreviewState(prev => ({
            ...prev,
            isLoadingText: false,
            textError: message,
          }));
        }
      }
    };

    // If burn-after-reading is active, warn before downloading/previewing
    if (drop?.burnAfterReading) {
      setBurnPrompt({
        isOpen: true,
        title: 'Preview Burn-After-Reading File?',
        description: `This file is set to burn upon reading. Opening a preview will cause '${file.name}' to be permanently deleted on the server immediately. Proceed?`,
        action: () => {
          setBurnPrompt(prev => ({ ...prev, isOpen: false }));
          performPreview();
        },
      });
    } else {
      performPreview();
    }
  };

  const handleDownloadFile = (file: PublicFileMeta) => {
    const directDownload = () => {
      const link = document.createElement('a');
      link.href = getDownloadUrl(file, false);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (drop?.burnAfterReading) {
      setBurnPrompt({
        isOpen: true,
        title: 'Download Burn-After-Reading File?',
        description: `Downloading '${file.name}' will trigger immediate destruction of this Drop on the server. You will not be able to re-download it.`,
        action: () => {
          setBurnPrompt(prev => ({ ...prev, isOpen: false }));
          directDownload();
        },
      });
    } else {
      directDownload();
    }
  };

  const handleDownloadZip = () => {
    const directZip = () => {
      const link = document.createElement('a');
      link.href = getZipUrl();
      link.download = `${code}_files.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (drop?.burnAfterReading) {
      setBurnPrompt({
        isOpen: true,
        title: 'Download All Files (.ZIP)?',
        description:
          'Downloading the complete ZIP archive will trigger immediate burn-after-reading destruction of this Drop on the server.',
        action: () => {
          setBurnPrompt(prev => ({ ...prev, isOpen: false }));
          directZip();
        },
      });
    } else {
      directZip();
    }
  };

  // Compute text statistics
  const textStats = useMemo(() => {
    if (!drop?.textContent) return null;
    const charCount = drop.textContent.length;
    const wordCount = drop.textContent.trim().split(/\s+/).filter(Boolean).length;
    const lineCount = drop.textContent.split('\n').length;
    return { charCount, wordCount, lineCount };
  }, [drop?.textContent]);

  // Loading Screen
  if (isLoading) {
    return (
      <div className="max-w-[640px] mx-auto px-4 py-20">
        <Breadcrumbs items={[{ label: 'Drop', href: '/drop' }, { label: 'Loading', active: true }]} className="mb-6 justify-center" />
        <LoadingOverlay message="Decrypting confidential drop payload..." />
      </div>
    );
  }

  // 1. Expired / Destroyed / View-Limit State Screen
  if (isExpired) {
    const isViewLimit = expiredReason === 'VIEW_LIMIT_REACHED';
    const isDestroyed = expiredReason === 'DESTROYED';

    return (
      <div className="max-w-[580px] mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Drop', href: '/drop' }, { label: 'Details', active: true }]} className="mb-6" />
        <Card
          variant="raised"
          className="p-8 sm:p-10 text-center border-amber-500/30 bg-amber-500/5 space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-n1-gold to-rose-500" />

          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-[0_0_24px_rgba(245,197,24,0.15)]">
            {isDestroyed ? (
              <span className="text-2xl">🔥</span>
            ) : isViewLimit ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Badge variant="muted" size="sm" className="font-mono">
                DROP: #{code}
              </Badge>
              {isViewLimit ? (
                <Badge variant="error" size="sm">
                  VIEW LIMIT REACHED
                </Badge>
              ) : isDestroyed ? (
                <Badge variant="error" size="sm">
                  DESTROYED
                </Badge>
              ) : (
                <Badge variant="gold" size="sm">
                  EXPIRED
                </Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-n1-text-primary tracking-tight font-brand">
              This Drop has expired.
            </h1>
            <p className="text-sm font-semibold text-rose-400">
              {isViewLimit
                ? 'View limit reached.'
                : isDestroyed
                ? 'This Drop has been destroyed.'
                : 'Expiration time elapsed.'}
            </p>
            <p className="text-sm text-n1-text-secondary max-w-md mx-auto leading-relaxed">
              {expiredExplanation}
            </p>
            <p className="text-xs text-n1-text-muted max-w-sm mx-auto">
              N1 automatically purges all expired physical files and decrypted payload data to
              ensure zero residue.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link href="/drop">
              <Button variant="primary" size="lg">
                Create a new Drop →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // 2. Error / Not Found State Screen
  if (errorStatus) {
    const isNotFound = errorStatus.code === 'DROP_NOT_FOUND';
    return (
      <div className="max-w-[580px] mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Drop', href: '/drop' }, { label: 'Not Found', active: true }]} className="mb-6" />
        {isNotFound ? (
          <Card variant="raised" className="p-8 sm:p-10 text-center border-n1-border bg-n1-surface-raised space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-n1-surface-overlay text-n1-text-muted flex items-center justify-center mx-auto border border-n1-border">
              <span className="text-3xl">🔍</span>
            </div>
            <div className="space-y-2">
              <Badge variant="muted" size="sm" className="mb-1">
                NOT FOUND
              </Badge>
              <h1 className="text-2xl font-bold text-n1-text-primary tracking-tight">
                Drop Not Found
              </h1>
              <p className="text-sm text-n1-text-secondary max-w-md mx-auto">
                No active Drop exists with code #{code}. It may have expired, reached its view limit, or the code was mistyped. Please verify the 6-character access code.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link href="/">
                <Button variant="secondary" size="md">
                  Home Code Lookup
                </Button>
              </Link>
              <Link href="/drop">
                <Button variant="primary" size="md">
                  Create a Drop →
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <ErrorState
            title="Error Retrieving Drop"
            message={errorStatus.message}
            actionLabel="Create a new Drop"
            onAction={() => {
              window.location.href = '/drop';
            }}
          />
        )}
      </div>
    );
  }

  // 3. Password Challenge State
  if (drop && drop.status === 'PASSWORD_LOCKED') {
    return (
      <div className="max-w-[520px] mx-auto px-4 py-12">
        <Breadcrumbs items={[{ label: 'Drop', href: '/drop' }, { label: 'Unlock', active: true }]} className="mb-6" />
        <Card variant="raised" className="p-7 sm:p-9 border-n1-border shadow-2xl relative">
          <form onSubmit={handleUnlock} className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-n1-purple/15 text-n1-purple-light flex items-center justify-center mx-auto border border-n1-purple/30 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Badge variant="muted" size="sm" className="font-mono">
                  DROP: #{code}
                </Badge>
                <Badge variant="warning" size="sm">
                  PASSWORD REQUIRED
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-n1-text-primary tracking-tight">
                Passphrase Required
              </h1>
              <p className="text-xs text-n1-text-secondary mt-1 max-w-sm mx-auto">
                The uploader protected this Drop with an end-to-end passphrase. Enter it below to
                unlock and decrypt the content.
              </p>
            </div>

            {unlockError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left animate-fadeIn">
                {unlockError}
              </div>
            )}

            <div className="text-left space-y-1.5">
              <label
                htmlFor="passphrase-input"
                className="text-xs font-semibold text-n1-text-secondary"
              >
                Passphrase
              </label>
              <div className="relative">
                <input
                  id="passphrase-input"
                  type={showPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={e => setUnlockPassword(e.target.value)}
                  placeholder="Enter passphrase..."
                  autoFocus
                  className="w-full bg-n1-surface-raised border border-n1-border text-n1-text-primary text-sm rounded-xl pl-4 pr-11 py-3 focus-ring hover:border-n1-purple/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-n1-text-muted hover:text-n1-text-primary transition-colors p-1"
                  aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.75}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isUnlocking}
              disabled={!unlockPassword.trim() || isUnlocking}
              className="w-full"
            >
              Unlock Drop Content
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Helper icons per extension
  const renderFileIcon = (ext: string) => {
    const type = getFileType(ext);
    if (type === 'image') {
      return (
        <svg
          className="w-5 h-5 text-purple-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (type === 'pdf') {
      return (
        <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
    if (type === 'text') {
      return (
        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext.toLowerCase())) {
      return (
        <svg
          className="w-5 h-5 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.75}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-5 h-5 text-n1-text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  };

  // 4. Active / Unlocked Drop Experience
  const remainingMs = drop?.expiresAt ? new Date(drop.expiresAt).getTime() - Date.now() : Infinity;
  const isImminent = remainingMs < 3 * 60 * 1000;
  const isSoon = remainingMs < 10 * 60 * 1000;

  return (
    <div className="max-w-[780px] mx-auto px-4 py-8 sm:py-12 space-y-6">
      <Breadcrumbs items={[{ label: 'Drop', href: '/drop' }, { label: 'Details', active: true }]} className="mb-2" />
      <Card variant="raised" className="p-6 sm:p-8 border-n1-border shadow-2xl space-y-6 relative">
        {/* Top Drop Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-n1-border-subtle">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-2xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-n1-purple-light via-purple-300 to-n1-gold">
                DROP #{code}
              </span>

              {isImminent ? (
                <Badge variant="error" size="sm" dot pulse>
                  EXPIRING IMMINENTLY
                </Badge>
              ) : isSoon ? (
                <Badge variant="warning" size="sm" dot>
                  EXPIRING SOON
                </Badge>
              ) : (
                <Badge variant="primary" size="sm" dot pulse>
                  ACTIVE
                </Badge>
              )}

              {drop?.burnAfterReading && (
                <Badge variant="gold" size="sm">
                  Burn After Reading 🔥
                </Badge>
              )}

              {drop?.maxViews && (
                <Badge variant="muted" size="sm">
                  Views: {drop.viewCount || 1} / {drop.maxViews}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-n1-text-secondary">
              {drop?.createdAt && (
                <span>
                  Created:{' '}
                  <strong className="text-n1-text-primary font-medium">
                    {new Date(drop.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </strong>
                </span>
              )}

              {drop?.expiresAt && (
                <div className="flex items-center gap-1.5">
                  <span>Expires in:</span>
                  <Countdown
                    targetDate={drop.expiresAt}
                    onExpire={() => setIsExpired(true)}
                    variant="badge"
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>

          <Link href="/drop" className="shrink-0">
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              + Create Another Drop
            </Button>
          </Link>
        </div>

        {/* Visual Expiry Urgency Card */}
        {drop?.expiresAt && (
          <ExpiryUrgencyCard
            createdAt={drop.createdAt}
            expiresAt={drop.expiresAt}
            onExpire={() => setIsExpired(true)}
          />
        )}

        {/* Burn-After-Reading Alert Banner */}
        {drop?.burnAfterReading && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-left">
            <span className="text-xl shrink-0 mt-0.5">🔥</span>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-amber-300 uppercase tracking-wide">
                Burn-After-Reading Active
              </p>
              <p className="text-amber-200/90 leading-relaxed">
                {drop.dropType === 'text'
                  ? 'This confidential text drop has self-destructed on the server. Copy or save your text now; once you close or reload this window, it cannot be retrieved again.'
                  : 'Downloading files from this drop will permanently destroy them on the server immediately. Make sure to download or save your files now.'}
              </p>
            </div>
          </div>
        )}

        {/* View Limit Warning */}
        {drop?.maxViews && drop.viewCount && drop.viewCount >= drop.maxViews && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-2.5 text-xs text-purple-300 text-left">
            <svg
              className="w-4 h-4 shrink-0 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              Final view accessed. This Drop has reached its view limit ({drop.maxViews}) and will
              deactivate after this session.
            </span>
          </div>
        )}

        {/* A. TEXT DROP VIEW */}
        {drop?.dropType === 'text' && (
          <div className="space-y-3.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-n1-text-secondary uppercase tracking-wider">
                  Decrypted Text Payload
                </span>
                {textStats && (
                  <span className="text-[11px] text-n1-text-muted">
                    ({textStats.charCount.toLocaleString()} chars ·{' '}
                    {textStats.wordCount.toLocaleString()} words)
                  </span>
                )}
              </div>

              <Button
                variant={copiedText ? 'subtle' : 'secondary'}
                size="sm"
                onClick={copyTextToClipboard}
                className="gap-1.5"
                aria-label="Copy text to clipboard"
              >
                {copiedText ? (
                  <>
                    <svg
                      className="w-4 h-4 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-emerald-400 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Copy Text</span>
                  </>
                )}
              </Button>
            </div>

            {/* Monospace scrollable container with word wrapping */}
            <div className="relative rounded-2xl border border-n1-border bg-[#0a0a12] p-5 shadow-inner">
              <pre className="font-mono text-sm text-n1-text-primary whitespace-pre-wrap break-words leading-relaxed select-all max-h-[500px] overflow-y-auto">
                {drop.textContent}
              </pre>
            </div>
          </div>
        )}

        {/* B. FILE DROP VIEW */}
        {drop?.dropType === 'files' && (
          <div className="space-y-4 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <span className="text-xs font-bold text-n1-text-secondary uppercase tracking-wider">
                  Files ({drop.fileCount || drop.files?.length || 0})
                </span>
                <span className="text-xs text-n1-text-muted ml-2">
                  Total payload: {formatBytes(drop.totalSizeBytes || 0)}
                </span>
              </div>

              {drop.downloadZipUrl && (drop.files?.length || 0) > 0 && (
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleDownloadZip}
                  className="gap-1.5 self-start sm:self-auto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download All (.ZIP)</span>
                </Button>
              )}
            </div>

            {/* File Cards List */}
            <div className="space-y-2.5">
              {drop.files?.map(file => {
                const previewType = getFileType(file.extension);
                const supportsPreview = previewType !== 'other';

                return (
                  <div
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-xl bg-n1-surface-raised border border-n1-border hover:border-n1-purple/40 transition-all gap-3"
                  >
                    {/* Icon, Filename, Size, Extension */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-n1-surface border border-n1-border flex items-center justify-center shrink-0">
                        {renderFileIcon(file.extension)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className="text-sm font-semibold text-n1-text-primary truncate"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <Badge
                            variant="muted"
                            size="sm"
                            className="uppercase font-mono text-[10px] shrink-0"
                          >
                            {file.extension || 'FILE'}
                          </Badge>
                        </div>
                        <p className="text-xs text-n1-text-muted font-mono">
                          {formatBytes(file.sizeBytes)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Preview & Download */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {supportsPreview && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePreview(file)}
                          className="gap-1.5 text-xs"
                          aria-label={`Preview ${file.name}`}
                        >
                          <svg
                            className="w-3.5 h-3.5 text-n1-purple-light"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>Preview</span>
                        </Button>
                      )}

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownloadFile(file)}
                        className="gap-1.5 text-xs"
                        aria-label={`Download ${file.name}`}
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span>Download</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Subtle Privacy & Report Footer */}
      <div className="flex items-center justify-between text-xs text-n1-text-muted px-2 py-1">
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Zero-Retention Ephemeral Storage
        </span>

        <button
          type="button"
          onClick={() => {
            setIsReportModalOpen(true);
            setReportSuccessMessage(null);
            setReportErrorMessage(null);
          }}
          className="text-n1-text-muted hover:text-rose-400 transition-colors flex items-center gap-1 text-[11px] font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
          <span>Report Abuse</span>
        </button>
      </div>

      {/* 5. PREVIEW MODAL */}
      <Modal
        isOpen={previewState.isOpen}
        onClose={() => setPreviewState({ isOpen: false, file: null, type: null })}
        title={previewState.file ? `Preview: ${previewState.file.name}` : 'File Preview'}
        size={previewState.type === 'pdf' ? 'lg' : 'md'}
      >
        <div className="space-y-4">
          {/* Image Preview */}
          {previewState.type === 'image' && previewState.file && (
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#08080d] border border-n1-border overflow-hidden">
              <img
                src={getDownloadUrl(previewState.file, true)}
                alt={previewState.file.name}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-md"
              />
            </div>
          )}

          {/* PDF Preview */}
          {previewState.type === 'pdf' && previewState.file && (
            <div className="rounded-xl border border-n1-border overflow-hidden bg-[#08080d]">
              <iframe
                src={getDownloadUrl(previewState.file, true)}
                title={previewState.file.name}
                className="w-full h-[65vh] rounded-lg border-0"
              />
            </div>
          )}

          {/* Text / Code Preview */}
          {previewState.type === 'text' && previewState.file && (
            <div className="space-y-3">
              {previewState.isLoadingText ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-n1-purple border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-n1-text-secondary">Loading text contents...</span>
                </div>
              ) : previewState.textError ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {previewState.textError}
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto">
                  <CodeBlock
                    code={previewState.textContent || ''}
                    filename={previewState.file.name}
                    language={previewState.file.extension}
                    showLineNumbers
                  />
                </div>
              )}
            </div>
          )}

          {/* Modal Footer Controls */}
          {previewState.file && (
            <div className="flex items-center justify-between pt-3 border-t border-n1-border-subtle">
              <span className="text-xs text-n1-text-muted font-mono">
                {formatBytes(previewState.file.sizeBytes)}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPreviewState({ isOpen: false, file: null, type: null })}
                >
                  Close
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (previewState.file) handleDownloadFile(previewState.file);
                  }}
                  className="gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>Download</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 6. BURN-AFTER-READING CONFIRMATION MODAL */}
      <Modal
        isOpen={burnPrompt.isOpen}
        onClose={() => setBurnPrompt(prev => ({ ...prev, isOpen: false }))}
        title={burnPrompt.title}
        size="sm"
      >
        <div className="space-y-4 text-left">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <p className="font-bold text-amber-300">⚠️ Permanent Self-Destruction Warning</p>
            <p className="leading-relaxed">{burnPrompt.description}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBurnPrompt(prev => ({ ...prev, isOpen: false }))}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={burnPrompt.action}>
              Confirm & Self-Destruct
            </Button>
          </div>
        </div>
      </Modal>

      {/* 7. REPORT ABUSE MODAL */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title={`Report Drop: ${code}`}
        size="sm"
      >
        {reportSuccessMessage ? (
          <div className="space-y-4 text-left">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
              <p className="font-bold text-emerald-400">✓ Report Received</p>
              <p>{reportSuccessMessage}</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsReportModalOpen(false);
                  setReportSuccessMessage(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReportAbuse} className="space-y-4 text-left text-xs">
            <p className="text-n1-text-secondary leading-relaxed">
              If this Drop violates N1 policies, Indian cyber laws, or contains malicious payloads, submit a report for moderation review.
            </p>

            {reportErrorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {reportErrorMessage}
              </div>
            )}

            <div>
              <label className="block font-medium text-n1-text-secondary mb-1.5">
                Reason for Report
              </label>
              <Select
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                options={[
                  { value: 'malware', label: 'Malware / Ransomware / Virus' },
                  { value: 'phishing', label: 'Phishing / Fraud' },
                  { value: 'copyright', label: 'Copyright / Piracy Infringement' },
                  { value: 'illegal', label: 'Illegal / Dangerous Content' },
                  { value: 'harassment', label: 'Harassment / Doxxing' },
                  { value: 'spam', label: 'Automated Spam / Abuse' },
                  { value: 'other', label: 'Other Security Policy Violation' },
                ]}
              />
            </div>

            <div>
              <label className="block font-medium text-n1-text-secondary mb-1.5">
                Additional Details (Optional)
              </label>
              <Input
                value={reportDescription}
                onChange={e => setReportDescription(e.target.value)}
                placeholder="Describe why this content is abusive..."
                maxLength={500}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-n1-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsReportModalOpen(false)}
                disabled={isSubmittingReport}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
