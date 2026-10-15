'use client';

import React, { useState, useRef, useMemo, ChangeEvent, DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ProgressBar,
  Breadcrumbs,
} from '../../components/ui';
import { formatBytes } from '../../lib/utils';
import { apiClient, ApiError } from '../../lib/api-client';
import { saveRecentDrop } from '../../lib/recent-drops';

const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_TOTAL_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB
const MAX_TEXT_LENGTH = 10000;

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip'
];

type ExpiryOption = '15m' | '1h' | '6h' | '24h' | '7d';

const EXPIRY_PRESETS: Array<{ value: ExpiryOption; label: string; desc: string }> = [
  { value: '15m', label: '15m', desc: '15 Minutes' },
  { value: '1h', label: '1h', desc: '1 Hour (Recommended)' },
  { value: '6h', label: '6h', desc: '6 Hours' },
  { value: '24h', label: '24h', desc: '24 Hours' },
  { value: '7d', label: '7d', desc: '7 Days' },
];

function getFileExtension(filename: string): string {
  if (!filename.includes('.')) return '';
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getFileIcon(extension: string) {
  const ext = extension.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (['zip'].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    );
  }
  if (['pdf'].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 text-n1-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default function CreateDropPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');

  // File Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  // Text Drop State
  const [textContent, setTextContent] = useState('');

  // Drop Security & Options
  const [expiry, setExpiry] = useState<ExpiryOption>('1h');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [viewLimitOption, setViewLimitOption] = useState<'none' | '1' | '2' | '5' | '10' | 'custom'>('none');
  const [customViewLimit, setCustomViewLimit] = useState('');
  const [burnAfterReading, setBurnAfterReading] = useState(false);

  // Submission & Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Computed File Stats
  const totalSizeBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + f.size, 0);
  }, [files]);

  const hasOversizedFiles = useMemo(() => {
    return files.some(f => f.size > MAX_FILE_SIZE_BYTES);
  }, [files]);

  const isTotalSizeExceeded = totalSizeBytes > MAX_TOTAL_SIZE_BYTES;
  const isFileCountExceeded = files.length > MAX_FILES;

  // Text Stats
  const textLength = textContent.length;
  const isTextEmpty = textContent.trim().length === 0;
  const isTextOverLimit = textLength > MAX_TEXT_LENGTH;

  // Live Character Counter Color States
  // normal below 8000 | warning at 8000+ | error at 9500+
  const charCounterColorClass = useMemo(() => {
    if (textLength >= 9500) {
      return 'text-rose-400 font-bold';
    }
    if (textLength >= 8000) {
      return 'text-amber-400 font-semibold';
    }
    return 'text-n1-text-muted';
  }, [textLength]);

  // Validation Guard for Submit Button
  const isFormValid = useMemo(() => {
    if (isSubmitting) return false;

    if (activeTab === 'files') {
      if (files.length === 0) return false;
      if (isFileCountExceeded) return false;
      if (isTotalSizeExceeded) return false;
      if (hasOversizedFiles) return false;
    } else {
      if (isTextEmpty) return false;
      if (isTextOverLimit) return false;
    }

    if (isPasswordProtected && password.trim().length === 0) {
      return false;
    }

    if (viewLimitOption === 'custom') {
      const parsed = parseInt(customViewLimit, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 100) return false;
    }

    return true;
  }, [
    isSubmitting,
    activeTab,
    files.length,
    isFileCountExceeded,
    isTotalSizeExceeded,
    hasOversizedFiles,
    isTextEmpty,
    isTextOverLimit,
    isPasswordProtected,
    password,
    viewLimitOption,
    customViewLimit,
  ]);

  // Handle Drag & Drop Events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addCandidateFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Handle Native File Picker
  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addCandidateFiles(Array.from(e.target.files));
      // Reset input value so re-selecting same file triggers onChange
      e.target.value = '';
    }
  };

  // Add Files with Duplicate Detection (name + size) & Extension Whitelist Check
  const addCandidateFiles = (newFiles: File[]) => {
    setDuplicateNotice(null);
    setErrorMessage(null);

    const existingKeys = new Set(files.map(f => `${f.name.toLowerCase()}__${f.size}`));
    const duplicates: string[] = [];
    const invalidExts: string[] = [];
    const validToAdd: File[] = [];

    for (const file of newFiles) {
      const ext = getFileExtension(file.name);
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        invalidExts.push(file.name);
        continue;
      }

      const key = `${file.name.toLowerCase()}__${file.size}`;
      if (existingKeys.has(key)) {
        duplicates.push(file.name);
      } else {
        existingKeys.add(key);
        validToAdd.push(file);
      }
    }

    if (duplicates.length > 0) {
      setDuplicateNotice(
        `Duplicate file detected: "${duplicates.join(', ')}" was already added.`
      );
    }

    if (invalidExts.length > 0) {
      setErrorMessage(
        `Unsupported extension in: "${invalidExts.join(', ')}". Allowed formats: ${ALLOWED_EXTENSIONS.map(e => '.' + e).join(', ')}`
      );
    }

    if (validToAdd.length > 0) {
      setFiles(prev => [...prev, ...validToAdd]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setDuplicateNotice(null);
  };

  // Submit Handler
  const handleCreateDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setErrorMessage(null);
    setIsSubmitting(true);
    setUploadProgress(0);
    setStatusMessage('Preparing Drop...');

    try {
      let resolvedViewLimit: number | null = null;
      if (viewLimitOption === 'custom') {
        const parsed = parseInt(customViewLimit, 10);
        resolvedViewLimit = isNaN(parsed) ? null : parsed;
      } else if (viewLimitOption !== 'none') {
        resolvedViewLimit = parseInt(viewLimitOption, 10);
      }

      let response;

      if (activeTab === 'files') {
        const formData = new FormData();
        formData.append('type', 'files');
        formData.append('expiry', expiry);
        files.forEach(f => formData.append('files', f));

        if (isPasswordProtected && password) {
          formData.append('password', password);
        }
        if (burnAfterReading) {
          formData.append('burn_after_reading', 'true');
        }
        if (resolvedViewLimit !== null) {
          formData.append('max_views', String(resolvedViewLimit));
        }

        setStatusMessage('Encrypting and uploading files...');
        response = await apiClient.createDrop(formData, percent => {
          setUploadProgress(percent);
          if (percent < 100) {
            setStatusMessage(`Uploading files... ${percent}%`);
          } else {
            setStatusMessage('Finalizing Drop and generating secure code...');
          }
        });
      } else {
        const payload: Record<string, unknown> = {
          type: 'text',
          text_content: textContent,
          expiry,
          burn_after_reading: burnAfterReading,
        };

        if (isPasswordProtected && password) {
          payload['password'] = password;
        }
        if (resolvedViewLimit !== null) {
          payload['max_views'] = resolvedViewLimit;
        }

        setStatusMessage('Creating confidential text drop...');
        response = await apiClient.createDrop(payload, percent => {
          setUploadProgress(percent);
        });
      }

      // Store in sessionStorage so success screen can display token safely
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`n1_drop_${response.code}`, JSON.stringify(response));
        } catch {
          // ignore storage quota errors
        }

        // Store in client-side Recent Drops history
        saveRecentDrop({
          code: response.code,
          createdAt: new Date().toISOString(),
          expiresAt: response.expiresAt,
          ownerDeletionToken: response.ownerDeletionToken,
          dropType: activeTab,
          fileCount: activeTab === 'files' ? files.length : undefined,
        });
      }

      // Redirect to success screen
      router.push(`/drop/success/${response.code}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setUploadProgress(0);
      setStatusMessage('');

      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('An unexpected error occurred while creating your Drop. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: 'Drop', active: true }]} className="mb-6 justify-center" />
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <Badge variant="primary" dot pulse>
            Temporary • Zero-Retention
          </Badge>
          <Badge variant="gold">Self-Destructing</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-n1-text-primary tracking-tight font-brand mb-2">
          Create an Anonymous Drop
        </h1>
        <p className="text-sm text-n1-text-secondary max-w-lg mx-auto">
          Share files or private text without leaving a trace. Content is securely held, then permanently purged forever upon expiration.
        </p>
      </div>

      <Card variant="raised" className="p-5 sm:p-7 backdrop-blur-sm border-n1-border shadow-xl">
        <form onSubmit={handleCreateDrop} className="space-y-6">
          {/* 1. Files / Text Tab Switcher */}
          <Tabs
            value={activeTab}
            onValueChange={val => {
              setActiveTab(val as 'files' | 'text');
              setErrorMessage(null);
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-n1-text-muted">
                Content Type
              </span>
              <TabsList className="bg-n1-surface">
                <TabsTrigger
                  value="files"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  }
                >
                  Files Drop {files.length > 0 && `(${files.length})`}
                </TabsTrigger>
                <TabsTrigger
                  value="text"
                  icon={
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                >
                  Text Drop {textLength > 0 && `(${textLength})`}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: FILES */}
            <TabsContent value="files" className="space-y-4">
              {/* Drag and Drop Upload Area */}
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 select-none ${isDragging
                    ? 'border-n1-purple bg-n1-purple/10 scale-[1.01] shadow-purple'
                    : 'border-n1-border bg-n1-surface/60 hover:bg-n1-surface hover:border-n1-purple/50'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  id="drop-file-input"
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-200 ${isDragging ? 'bg-n1-purple text-white scale-110' : 'bg-n1-purple/15 text-n1-purple-light'
                    }`}>
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>

                  <div>
                    <p className="text-base font-semibold text-n1-text-primary">
                      {isDragging ? 'Release to drop files here' : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-xs text-n1-text-secondary mt-1">
                      Up to 10 files • 50 MB per file • 200 MB total max
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                    {['PDF', 'PNG', 'JPG', 'WEBP', 'DOCX', 'XLSX', 'PPTX', 'TXT', 'ZIP'].map(tag => (
                      <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-n1-surface-raised border border-n1-border text-n1-text-muted">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duplicate Notice Banner */}
              {duplicateNotice && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-fadeIn">
                  <svg className="w-4 h-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{duplicateNotice}</span>
                </div>
              )}

              {/* Selected Files List & Aggregate Size */}
              {files.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs text-n1-text-secondary px-1">
                    <span className="font-semibold text-n1-text-primary">
                      {files.length} {files.length === 1 ? 'file' : 'files'} attached
                    </span>
                    <span className={`font-mono ${isTotalSizeExceeded ? 'text-n1-error font-bold' : ''}`}>
                      {formatBytes(totalSizeBytes)} / 200 MB
                    </span>
                  </div>

                  {/* Aggregate Size Progress Meter */}
                  <div className="w-full h-1.5 rounded-full bg-n1-surface overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isTotalSizeExceeded
                          ? 'bg-rose-500'
                          : totalSizeBytes > 150 * 1024 * 1024
                            ? 'bg-amber-400'
                            : 'bg-n1-purple'
                        }`}
                      style={{ width: `${Math.min(100, (totalSizeBytes / MAX_TOTAL_SIZE_BYTES) * 100)}%` }}
                    />
                  </div>

                  {/* File List Items */}
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {files.map((file, idx) => {
                      const ext = getFileExtension(file.name);
                      const isOversized = file.size > MAX_FILE_SIZE_BYTES;

                      return (
                        <div
                          key={`${file.name}-${file.size}-${idx}`}
                          className={`flex items-center justify-between p-3 rounded-xl bg-n1-surface-raised border transition-all duration-150 ${isOversized
                              ? 'border-red-500/50 bg-red-500/5'
                              : 'border-n1-border hover:border-n1-purple/40'
                            }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                            <div className="w-9 h-9 rounded-lg bg-n1-surface border border-n1-border flex items-center justify-center shrink-0">
                              {getFileIcon(ext)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-n1-text-primary truncate block" title={file.name}>
                                  {file.name}
                                </span>
                                <Badge variant="muted" size="sm" className="font-mono uppercase text-[10px]">
                                  {ext || 'FILE'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-n1-text-muted mt-0.5 font-mono">
                                <span>{formatBytes(file.size)}</span>
                                {isOversized && (
                                  <span className="text-rose-400 font-semibold">Exceeds 50 MB limit!</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            aria-label={`Remove ${file.name}`}
                            className="p-1.5 text-n1-text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors focus-ring"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: TEXT */}
            <TabsContent value="text" className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="text-drop-content" className="text-xs font-semibold text-n1-text-secondary select-none">
                    Confidential Text Payload
                  </label>
                  {/* Live Character Counter with Dynamic Color States */}
                  <span className={`text-xs font-mono select-none ${charCounterColorClass}`}>
                    {textLength.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
                  </span>
                </div>

                <textarea
                  id="text-drop-content"
                  rows={8}
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  placeholder="Paste or type confidential notes, credentials, private keys, or code snippets here..."
                  disabled={isSubmitting}
                  className={`w-full bg-n1-surface-raised border text-n1-text-primary placeholder:text-n1-text-muted text-sm rounded-xl p-4 transition-all duration-200 focus-ring font-mono leading-relaxed resize-y min-h-[180px] ${isTextOverLimit
                      ? 'border-rose-500 focus-visible:ring-rose-500'
                      : 'border-n1-border hover:border-n1-purple/50 focus-visible:ring-n1-purple'
                    }`}
                />

                {isTextOverLimit && (
                  <p className="text-xs text-rose-400 font-medium">
                    Text exceeds the 10,000 character limit. Please shorten your content.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* 15. Expiration Pills (15m, 1h, 6h, 24h, 7d) */}
          <div className="space-y-2 pt-2 border-t border-n1-border-subtle">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-n1-text-secondary flex items-center gap-1.5 select-none">
                <svg className="w-3.5 h-3.5 text-n1-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Auto-Destruct Timer
              </label>
              <span className="text-[11px] text-n1-text-muted">
                {EXPIRY_PRESETS.find(p => p.value === expiry)?.desc}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {EXPIRY_PRESETS.map(preset => {
                const isSelected = expiry === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setExpiry(preset.value)}
                    className={`py-2 px-1 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all duration-150 focus-ring text-center ${isSelected
                        ? 'bg-n1-purple text-white border-n1-purple shadow-sm shadow-purple-500/20'
                        : 'bg-n1-surface-raised border-n1-border text-n1-text-secondary hover:text-n1-text-primary hover:border-n1-purple/40'
                      }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security & Access Controls Accordion / Section */}
          <div className="space-y-3 pt-2 border-t border-n1-border-subtle">
            <span className="text-xs font-semibold uppercase tracking-wider text-n1-text-muted block">
              Security & Access Options
            </span>

            {/* 16. Password Protection Toggle */}
            <div className="p-3.5 rounded-xl bg-n1-surface border border-n1-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-n1-purple/15 text-n1-purple-light flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <label htmlFor="password-toggle" className="text-sm font-semibold text-n1-text-primary cursor-pointer select-none">
                      Passphrase Protection
                    </label>
                    <p className="text-xs text-n1-text-secondary">Require passphrase to decrypt & download</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    id="password-toggle"
                    type="checkbox"
                    checked={isPasswordProtected}
                    onChange={e => setIsPasswordProtected(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-n1-surface-raised peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-n1-purple" />
                </label>
              </div>

              {isPasswordProtected && (
                <div className="pt-2 animate-fadeIn">
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter a secret passphrase (up to 128 characters)..."
                      maxLength={128}
                      className="w-full bg-n1-surface-raised border border-n1-border text-n1-text-primary placeholder:text-n1-text-muted text-sm rounded-xl pl-4 pr-10 py-2.5 transition-all duration-200 focus-ring hover:border-n1-purple/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
                      className="absolute right-3 text-n1-text-muted hover:text-n1-text-primary p-1 focus-ring rounded"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 17. View Limit Selector & 18. Burn After Reading */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* View Limit */}
              <div className="p-3.5 rounded-xl bg-n1-surface border border-n1-border space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-n1-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <label htmlFor="view-limit-select" className="text-xs font-semibold text-n1-text-primary">
                    Max View Limit
                  </label>
                </div>

                <select
                  id="view-limit-select"
                  value={viewLimitOption}
                  onChange={e => setViewLimitOption(e.target.value as typeof viewLimitOption)}
                  className="w-full bg-n1-surface-raised border border-n1-border text-n1-text-primary text-xs rounded-lg px-3 py-2 focus-ring"
                >
                  <option value="none">Unlimited views</option>
                  <option value="1">1 view (Auto-expire after 1 view)</option>
                  <option value="2">2 views</option>
                  <option value="5">5 views</option>
                  <option value="10">10 views</option>
                  <option value="custom">Custom view limit...</option>
                </select>

                {viewLimitOption === 'custom' && (
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={customViewLimit}
                    onChange={e => setCustomViewLimit(e.target.value)}
                    placeholder="Enter limit (1 - 100)"
                    className="w-full bg-n1-surface-raised border border-n1-border text-n1-text-primary text-xs rounded-lg px-3 py-1.5 focus-ring font-mono"
                  />
                )}
              </div>

              {/* Burn After Reading */}
              <div className="p-3.5 rounded-xl bg-n1-surface border border-n1-border flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔥</span>
                    <div>
                      <label htmlFor="burn-toggle" className="text-xs font-semibold text-n1-text-primary cursor-pointer select-none">
                        Burn After Reading
                      </label>
                      <p className="text-[11px] text-n1-text-secondary leading-tight mt-0.5">
                        Destroys content immediately upon first access
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      id="burn-toggle"
                      type="checkbox"
                      checked={burnAfterReading}
                      onChange={e => setBurnAfterReading(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-n1-surface-raised peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* 19. Upload Progress Bar (when in flight) */}
          {isSubmitting && (
            <div className="space-y-2 p-4 rounded-xl bg-n1-surface border border-n1-purple/30 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-n1-purple-light flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-n1-purple animate-ping" />
                  {statusMessage || 'Processing upload...'}
                </span>
                <span className="font-mono text-n1-text-primary font-bold">{uploadProgress}%</span>
              </div>
              <ProgressBar value={uploadProgress} max={100} variant="primary" />
            </div>
          )}

          {/* 20. Error States */}
          {errorMessage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-rose-200">Drop Creation Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                aria-label="Dismiss error"
                className="text-rose-400 hover:text-rose-200"
              >
                ✕
              </button>
            </div>
          )}

          {/* 14. Submit Button (Disabled above limits, 21. Loading state) */}
          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
              variant="primary"
              disabled={!isFormValid || isSubmitting}
              isLoading={isSubmitting}
              className="w-full text-base font-semibold shadow-lg shadow-purple-500/20"
              leftIcon={
                !isSubmitting ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                ) : undefined
              }
            >
              {isSubmitting
                ? 'Creating Secure Drop...'
                : activeTab === 'files'
                  ? `Create Drop (${files.length} ${files.length === 1 ? 'file' : 'files'})`
                  : 'Create Text Drop'}
            </Button>

            {/* Validation Helper when disabled */}
            {!isFormValid && !isSubmitting && (
              <p className="text-center text-[11px] text-n1-text-muted mt-2">
                {activeTab === 'files'
                  ? files.length === 0
                    ? 'Attach at least one file to create a Drop.'
                    : isFileCountExceeded
                      ? 'Maximum of 10 files exceeded.'
                      : hasOversizedFiles
                        ? 'One or more files exceed the 50 MB limit.'
                        : isTotalSizeExceeded
                          ? 'Total file size exceeds the 200 MB limit.'
                          : isPasswordProtected && !password
                            ? 'Enter a passphrase to protect your drop.'
                            : 'Check your options to enable submission.'
                  : isTextEmpty
                    ? 'Type or paste text to enable creation.'
                    : isTextOverLimit
                      ? 'Shorten your text to below 10,000 characters.'
                      : isPasswordProtected && !password
                        ? 'Enter a passphrase to protect your drop.'
                        : ''}
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
