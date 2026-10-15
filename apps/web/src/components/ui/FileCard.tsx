'use client';

import React from 'react';
import { formatBytes, cn } from '../../lib/utils';
import { Badge } from './Badge';

export interface FileCardProps {
  name: string;
  sizeBytes: number;
  mimeType?: string;
  status?: 'ready' | 'uploading' | 'error';
  progress?: number;
  onDownload?: () => void;
  onDelete?: () => void;
  className?: string;
}

function getFileIcon(extension: string) {
  const ext = extension.toLowerCase();

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
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

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    );
  }

  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'go', 'rs', 'html', 'css'].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    );
  }

  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) {
    return (
      <svg
        className="w-5 h-5 text-emerald-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
    );
  }

  if (['mp4', 'mkv', 'mov', 'webm'].includes(ext)) {
    return (
      <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    );
  }

  // Default document icon
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
}

export function FileCard({
  name,
  sizeBytes,
  status = 'ready',
  progress,
  onDownload,
  onDelete,
  className,
}: FileCardProps) {
  const extension = name.includes('.') ? name.split('.').pop() || 'FILE' : 'FILE';

  return (
    <div
      className={cn(
        'group relative flex items-center justify-between p-3.5 rounded-xl bg-n1-surface-raised border border-n1-border transition-all duration-150 hover:border-n1-purple/40 hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
        {/* File Type Icon container */}
        <div className="w-10 h-10 rounded-lg bg-n1-surface border border-n1-border-subtle flex items-center justify-center shrink-0">
          {getFileIcon(extension)}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold text-n1-text-primary truncate block"
              title={name}
            >
              {name}
            </span>
            <Badge variant="muted" size="sm" className="uppercase font-mono">
              {extension}
            </Badge>
          </div>

          <div className="flex items-center gap-2 mt-0.5 text-xs text-n1-text-muted">
            <span>{formatBytes(sizeBytes)}</span>
            {status === 'uploading' && (
              <span className="text-n1-purple-light font-medium">
                Uploading {progress !== undefined ? `${progress}%` : ''}
              </span>
            )}
            {status === 'error' && <span className="text-n1-error font-medium">Failed</span>}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onDownload && status === 'ready' && (
          <button
            type="button"
            onClick={onDownload}
            aria-label={`Download ${name}`}
            className="p-2 text-n1-text-secondary hover:text-n1-text-primary hover:bg-n1-surface rounded-lg transition-colors focus-ring"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Delete ${name}`}
            className="p-2 text-n1-text-muted hover:text-n1-error hover:bg-red-500/10 rounded-lg transition-colors focus-ring"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
