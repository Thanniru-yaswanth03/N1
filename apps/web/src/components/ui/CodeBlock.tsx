'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'text',
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  const lines = code.trim().split('\n');

  return (
    <div
      className={cn(
        'rounded-xl border border-n1-border bg-[#0b0b14] overflow-hidden text-left font-mono text-xs shadow-md',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-n1-surface-raised border-b border-n1-border-subtle select-none">
        <div className="flex items-center gap-2 text-n1-text-secondary">
          {/* Terminal dots decoration */}
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>

          {filename ? (
            <span className="font-semibold text-n1-text-primary text-[11px]">{filename}</span>
          ) : (
            <span className="uppercase text-[10px] tracking-wider text-n1-text-muted font-bold">
              {language}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code to clipboard"
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all focus-ring',
            copied
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              : 'text-n1-text-muted hover:text-n1-text-primary hover:bg-n1-surface-overlay'
          )}
        >
          {copied ? (
            <>
              <svg
                className="w-3.5 h-3.5 text-emerald-400"
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
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto text-n1-text-primary leading-relaxed">
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02]">
                  <td className="pr-4 text-right text-n1-text-muted select-none w-8 text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="whitespace-pre">{line || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
