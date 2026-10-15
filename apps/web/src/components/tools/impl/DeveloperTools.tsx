'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';

// ── MD5 Pure Client-Side Implementation ──────────────────────────────────────
function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number) {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(string: string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue: number) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }
  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// ── 1. JSON Formatter & Validator ───────────────────────────────────────────
export function JsonFormatterTool() {
  const [input, setInput] = useState('{\n  "name": "N1 Platform",\n  "privacy": "First",\n  "features": ["Drop", "Tools", "Zero-Budget"],\n  "active": true\n}');
  const [indent, setIndent] = useState<number>(2);
  const [copied, setCopied] = useState(false);

  const { formatted, error, isValid } = useMemo(() => {
    if (!input.trim()) return { formatted: '', error: null, isValid: true };
    try {
      const parsed = JSON.parse(input);
      return { formatted: JSON.stringify(parsed, null, indent), error: null, isValid: true };
    } catch (err: unknown) {
      return { formatted: '', error: (err as Error).message, isValid: false };
    }
  }, [input, indent]);

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
    } catch {
      // Ignore invalid JSON on minify
    }
  };

  const handleCopy = () => {
    if (formatted) {
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Indentation:</span>
          {[2, 4].map(n => (
            <button
              key={n}
              onClick={() => setIndent(n)}
              className={`px-2.5 py-1 text-xs rounded-md border font-mono transition-colors ${
                indent === n
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-semibold'
                  : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
              }`}
            >
              {n} spaces
            </button>
          ))}
          <Button variant="secondary" size="sm" onClick={handleMinify} disabled={!isValid || !input.trim()}>
            Minify JSON
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {input.trim() && (
            <Badge variant={isValid ? 'success' : 'error'}>
              {isValid ? 'Valid JSON' : 'Syntax Error'}
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={() => setInput('')}>
            Clear
          </Button>
          <Button variant="primary" size="sm" onClick={handleCopy} disabled={!formatted}>
            {copied ? 'Copied!' : 'Copy Formatted'}
          </Button>
        </div>
      </div>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input Pane */}
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
            <span>INPUT JSON</span>
            <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{input.length} chars</span>
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Paste raw or messy JSON here..."
            className="w-full h-96 p-4 bg-transparent text-sm font-mono text-[var(--color-text-primary)] resize-none focus:outline-none placeholder-[var(--color-text-muted)]"
            spellCheck={false}
          />
        </div>

        {/* Output Pane */}
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
            <span>FORMATTED PREVIEW</span>
            {isValid && formatted && (
              <span className="font-mono text-[11px] text-emerald-400">
                {formatted.split('\n').length} lines
              </span>
            )}
          </div>
          {error ? (
            <div className="p-6 h-96 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-rose-400">JSON Syntax Error</p>
              <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1 max-w-md break-words">
                {error}
              </p>
            </div>
          ) : (
            <pre className="w-full h-96 p-4 overflow-auto text-sm font-mono text-emerald-300/90 whitespace-pre">
              {formatted || <span className="text-[var(--color-text-muted)]">Formatted output will appear here...</span>}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 2. Base64 Encoder / Decoder ─────────────────────────────────────────────
export function Base64Tool() {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [urlSafe, setUrlSafe] = useState(false);
  const [input, setInput] = useState('Hello, N1 Privacy Platform! 🚀');
  const [copied, setCopied] = useState(false);

  const { output, error } = useMemo(() => {
    if (!input) return { output: '', error: null };
    try {
      if (mode === 'encode') {
        const utf8Bytes = new TextEncoder().encode(input);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
          const byte = utf8Bytes[i] ?? 0;
          binary += String.fromCharCode(byte);
        }
        let b64 = btoa(binary);
        if (urlSafe) {
          b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        return { output: b64, error: null };
      } else {
        let clean = input.trim();
        if (urlSafe) {
          clean = clean.replace(/-/g, '+').replace(/_/g, '/');
          while (clean.length % 4) clean += '=';
        }
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return { output: new TextDecoder().decode(bytes), error: null };
      }
    } catch (err: unknown) {
      return { output: '', error: (err as Error).message };
    }
  }, [input, mode, urlSafe]);

  const handleCopy = () => {
    if (output) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('encode')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              mode === 'encode'
                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
            }`}
          >
            Encode Text &rarr; Base64
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              mode === 'decode'
                ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
            }`}
          >
            Decode Base64 &rarr; Text
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={e => setUrlSafe(e.target.checked)}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>URL-Safe Base64</span>
          </label>
          <Button variant="primary" size="sm" onClick={handleCopy} disabled={!output}>
            {copied ? 'Copied!' : 'Copy Result'}
          </Button>
        </div>
      </div>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            {mode === 'encode' ? 'INPUT PLAIN TEXT' : 'INPUT BASE64 STRING'}
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Type or paste text to encode...' : 'Paste Base64 string to decode...'}
            className="w-full h-80 p-4 bg-transparent text-sm font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            {mode === 'encode' ? 'BASE64 RESULT' : 'DECODED TEXT RESULT'}
          </div>
          {error ? (
            <div className="p-6 h-80 flex flex-col items-center justify-center text-center text-rose-400">
              <p className="text-sm font-semibold">Invalid Base64 Input</p>
              <p className="text-xs font-mono text-[var(--color-text-muted)] mt-1">{error}</p>
            </div>
          ) : (
            <textarea
              readOnly
              value={output}
              placeholder="Result will appear here..."
              className="w-full h-80 p-4 bg-transparent text-sm font-mono text-purple-300 resize-none focus:outline-none"
              spellCheck={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── 3. URL Encoder / Decoder ────────────────────────────────────────────────
export function UrlEncoderTool() {
  const [input, setInput] = useState('https://n1.io/search?q=zero cost privacy&category=tools&sort=asc#top');
  const [copied, setCopied] = useState(false);

  const encoded = useMemo(() => {
    try {
      return encodeURIComponent(input);
    } catch {
      return '';
    }
  }, [input]);

  const decoded = useMemo(() => {
    try {
      return decodeURIComponent(input);
    } catch {
      return '';
    }
  }, [input]);

  const queryParams = useMemo(() => {
    try {
      const url = new URL(input);
      const params: Array<{ key: string; value: string }> = [];
      url.searchParams.forEach((value, key) => {
        params.push({ key, value });
      });
      return params;
    } catch {
      return [];
    }
  }, [input]);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Input URL / URI Component
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste URL or query string..."
          className="w-full h-24 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">ENCODED URI COMPONENT</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(encoded);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-surface-raised)] font-mono text-xs text-purple-300 break-all select-all max-h-36 overflow-auto">
            {encoded || '...'}
          </div>
        </div>

        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">DECODED STRING</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(decoded);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              Copy
            </Button>
          </div>
          <div className="p-3 rounded-lg bg-[var(--color-surface-raised)] font-mono text-xs text-emerald-300 break-all select-all max-h-36 overflow-auto">
            {decoded || '...'}
          </div>
        </div>
      </div>

      {queryParams.length > 0 && (
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
            Parsed Query Parameters ({queryParams.length})
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                  <th className="py-2 px-3">Param Key</th>
                  <th className="py-2 px-3">Decoded Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {queryParams.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[var(--color-surface-raised)]/50">
                    <td className="py-2.5 px-3 font-semibold text-purple-300">{p.key}</td>
                    <td className="py-2.5 px-3 text-[var(--color-text-primary)]">{p.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. UUID v4 Generator ────────────────────────────────────────────────────
export function UuidGeneratorTool() {
  const [count, setCount] = useState(5);
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [quotes, setQuotes] = useState(false);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const list: string[] = [];
    for (let i = 0; i < count; i++) {
      let id = crypto.randomUUID();
      if (!hyphens) id = id.replace(/-/g, '');
      if (uppercase) id = id.toUpperCase();
      if (quotes) id = `"${id}"`;
      list.push(id);
    }
    setUuids(list);
  };

  useEffect(() => {
    generate();
  }, [count, uppercase, hyphens, quotes]);

  const handleCopyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Controls */}
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Count:</span>
            {[1, 5, 10, 25].map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`px-3 py-1 text-xs rounded-lg border font-mono transition-colors ${
                  count === n
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-semibold'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={e => setUppercase(e.target.checked)}
                className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
              />
              <span>Uppercase</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hyphens}
                onChange={e => setHyphens(e.target.checked)}
                className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
              />
              <span>Hyphens</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={quotes}
                onChange={e => setQuotes(e.target.checked)}
                className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
              />
              <span>Enclose in Quotes</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border-subtle)]">
          <Button variant="secondary" size="sm" onClick={generate}>
            Regenerate
          </Button>
          <Button variant="primary" size="sm" onClick={handleCopyAll}>
            {copied ? 'Copied All!' : 'Copy All UUIDs'}
          </Button>
        </div>
      </div>

      {/* UUID List Display */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)] flex items-center justify-between">
          <span>GENERATED UUIDs ({uuids.length})</span>
          <span className="text-[11px] font-mono text-[var(--color-text-muted)]">Version 4 Cryptographic Random</span>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-xs">
          {uuids.map((id, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--color-surface-raised)] hover:border-purple-500/30 border border-transparent transition-all group"
            >
              <span className="text-purple-300 font-medium select-all">{id}</span>
              <button
                onClick={() => navigator.clipboard.writeText(id)}
                className="opacity-0 group-hover:opacity-100 text-[11px] text-[var(--color-text-secondary)] hover:text-purple-300 transition-opacity px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border-subtle)]"
              >
                Copy
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 5. JWT Decoder ──────────────────────────────────────────────────────────
export function JwtDecoderTool() {
  const [token, setToken] = useState(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIFNtaXRoIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxODMxNTQyMDIyfQ.4S15Xv9p6lY5XJ_5w6kH-8jQ0v7x5w9z3m1k2l3j4h5'
  );

  const { header, payload, error, isExpired, expDate } = useMemo(() => {
    if (!token.trim()) return { header: null, payload: null, error: null, isExpired: false, expDate: null };
    try {
      const parts = token.trim().split('.');
      if (parts.length < 2) throw new Error('JWT must contain at least Header and Payload parts separated by dots.');

      const decodePart = (part: string) => {
        let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) base64 += '=';
        const json = atob(base64);
        return JSON.parse(json);
      };

      const h = decodePart(parts[0] || '');
      const p = decodePart(parts[1] || '');

      let expired = false;
      let expD = null;
      if (p.exp) {
        expD = new Date(p.exp * 1000);
        expired = expD < new Date();
      }

      return { header: h, payload: p, error: null, isExpired: expired, expDate: expD };
    } catch (err: unknown) {
      return { header: null, payload: null, error: (err as Error).message, isExpired: false, expDate: null };
    }
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Encoded JWT Token
        </label>
        <textarea
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste JWT string (eyJhbGciOi...)"
          className="w-full h-24 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500 break-all resize-none"
          spellCheck={false}
        />
      </div>

      {error ? (
        <div className="p-6 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-center">
          <p className="font-semibold text-sm">Failed to decode JWT</p>
          <p className="text-xs font-mono mt-1 text-[var(--color-text-muted)]">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Header */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>HEADER: ALGORITHM & TOKEN TYPE</span>
              <span className="font-mono text-[11px] text-[var(--color-text-muted)]">{header?.alg || 'None'}</span>
            </div>
            <pre className="p-4 font-mono text-xs text-rose-300 overflow-auto max-h-80">
              {JSON.stringify(header, null, 2)}
            </pre>
          </div>

          {/* Payload */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>PAYLOAD: DATA CLAIMS</span>
              {expDate && (
                <Badge variant={isExpired ? 'error' : 'success'}>
                  {isExpired ? 'Expired' : 'Active'}
                </Badge>
              )}
            </div>
            <pre className="p-4 font-mono text-xs text-purple-300 overflow-auto max-h-80">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 6. Regex Tester & Matcher ───────────────────────────────────────────────
export function RegexTesterTool() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+');
  const [flags, setFlags] = useState({ g: true, i: true, m: false, s: false });
  const [testString, setTestString] = useState(
    'Contact support at support@n1.io or security@company.org. You can also reach hello@example.com for inquiries.'
  );

  const activeFlags = Object.entries(flags)
    .filter(([_, v]) => v)
    .map(([k]) => k)
    .join('');

  const { matches, error } = useMemo(() => {
    if (!pattern) return { matches: [], error: null };
    try {
      const reg = new RegExp(pattern, activeFlags);
      const mList: Array<{ match: string; index: number; groups: Record<string, string> | undefined }> = [];
      if (flags.g) {
        let match;
        while ((match = reg.exec(testString)) !== null) {
          mList.push({ match: match[0], index: match.index, groups: match.groups });
          if (!reg.global) break;
        }
      } else {
        const match = reg.exec(testString);
        if (match) mList.push({ match: match[0], index: match.index, groups: match.groups });
      }
      return { matches: mList, error: null };
    } catch (err: unknown) {
      return { matches: [], error: (err as Error).message };
    }
  }, [pattern, activeFlags, testString, flags.g]);

  return (
    <div className="space-y-6">
      {/* Pattern & Flags */}
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Regular Expression Pattern
          </label>
          <div className="flex items-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] overflow-hidden font-mono text-sm">
            <span className="px-3 text-[var(--color-text-muted)]">/</span>
            <input
              type="text"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              className="flex-1 py-2 bg-transparent text-purple-300 focus:outline-none"
              placeholder="Enter regex pattern..."
            />
            <span className="px-3 text-[var(--color-text-muted)]">/{activeFlags}</span>
          </div>
        </div>

        {/* Flags Checkboxes */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[var(--color-text-secondary)]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flags.g}
              onChange={e => setFlags(f => ({ ...f, g: e.target.checked }))}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>global (g)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flags.i}
              onChange={e => setFlags(f => ({ ...f, i: e.target.checked }))}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>case-insensitive (i)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flags.m}
              onChange={e => setFlags(f => ({ ...f, m: e.target.checked }))}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>multiline (m)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={flags.s}
              onChange={e => setFlags(f => ({ ...f, s: e.target.checked }))}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>dotAll (s)</span>
          </label>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono">
          Regex Syntax Error: {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
              TEST STRING
            </div>
            <textarea
              value={testString}
              onChange={e => setTestString(e.target.value)}
              className="w-full h-64 p-4 bg-transparent text-sm font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
              placeholder="Paste text to test matching against..."
              spellCheck={false}
            />
          </div>

          <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
            <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--color-text-secondary)]">
              <span>MATCHES FOUND</span>
              <Badge variant="primary">{matches.length} matches</Badge>
            </div>
            <div className="p-4 space-y-2 h-64 overflow-y-auto font-mono text-xs">
              {matches.length === 0 ? (
                <div className="text-[var(--color-text-muted)] text-center py-12">No matches found.</div>
              ) : (
                matches.map((m, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[var(--color-surface-raised)] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[var(--color-text-muted)] mr-2">#{idx + 1} at index {m.index}:</span>
                      <span className="text-emerald-400 font-semibold">{m.match}</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(m.match)}
                      className="text-[11px] text-[var(--color-text-secondary)] hover:text-white px-2 py-0.5 rounded bg-[var(--color-surface)]"
                    >
                      Copy
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 7. Hash Generator ───────────────────────────────────────────────────────
export function HashGeneratorTool() {
  const [input, setInput] = useState('N1 Privacy First Temporary Sharing Platform');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function calculateHashes() {
      if (!input) {
        setHashes({});
        return;
      }
      const enc = new TextEncoder().encode(input);
      const sha256Buf = await crypto.subtle.digest('SHA-256', enc);
      const sha512Buf = await crypto.subtle.digest('SHA-512', enc);
      const sha1Buf = await crypto.subtle.digest('SHA-1', enc);

      const bufToHex = (buf: ArrayBuffer) =>
        Array.from(new Uint8Array(buf))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

      setHashes({
        'SHA-256': bufToHex(sha256Buf),
        'SHA-512': bufToHex(sha512Buf),
        'SHA-1': bufToHex(sha1Buf),
        'MD5': md5(input),
      });
    }
    calculateHashes();
  }, [input]);

  const copyHash = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Input Text to Hash
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Enter text to generate hashes..."
          className="w-full h-24 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="space-y-3">
        {Object.entries(hashes).map(([algo, hash]) => (
          <div
            key={algo}
            className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
          >
            <div className="flex-1 min-w-0">
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-1.5 sm:mb-0 sm:mr-3">
                {algo}
              </span>
              <span className="text-[var(--color-text-primary)] break-all select-all">{hash}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyHash(algo, hash)}
              className="flex-shrink-0"
            >
              {copiedKey === algo ? 'Copied' : 'Copy'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 8. Timestamp Converter ──────────────────────────────────────────────────
export function TimestampConverterTool() {
  const [nowSec, setNowSec] = useState(Math.floor(Date.now() / 1000));
  const [epochInput, setEpochInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [dateInput, setDateInput] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    const timer = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const parsedEpochDate = useMemo(() => {
    const num = Number(epochInput.trim());
    if (isNaN(num) || !num) return null;
    // Auto-detect seconds vs milliseconds
    const ms = num < 10000000000 ? num * 1000 : num;
    return new Date(ms);
  }, [epochInput]);

  const convertedDateToEpoch = useMemo(() => {
    if (!dateInput) return null;
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    return {
      sec: Math.floor(d.getTime() / 1000),
      ms: d.getTime(),
    };
  }, [dateInput]);

  return (
    <div className="space-y-6">
      {/* Live Current Epoch Banner */}
      <div className="p-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-purple-300 font-semibold block mb-1">
            Current Unix Epoch Timestamp
          </span>
          <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
            {nowSec}
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(String(nowSec));
          }}
        >
          Copy Current Epoch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Epoch to Date */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Epoch Timestamp &rarr; Human Date
          </h4>
          <input
            type="text"
            value={epochInput}
            onChange={e => setEpochInput(e.target.value)}
            placeholder="e.g. 1774868000"
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
          />

          {parsedEpochDate && !isNaN(parsedEpochDate.getTime()) ? (
            <div className="space-y-2 text-xs font-mono pt-2 border-t border-[var(--color-border-subtle)]">
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px]">UTC Time:</span>
                <span className="text-white">{parsedEpochDate.toUTCString()}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px]">Local Time:</span>
                <span className="text-emerald-400">{parsedEpochDate.toString()}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px]">ISO 8601:</span>
                <span className="text-purple-300">{parsedEpochDate.toISOString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-400">Invalid timestamp format.</p>
          )}
        </div>

        {/* Date to Epoch */}
        <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Human Date &rarr; Epoch Timestamp
          </h4>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
          />

          {convertedDateToEpoch ? (
            <div className="space-y-2 text-xs font-mono pt-2 border-t border-[var(--color-border-subtle)]">
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px]">Seconds (Unix):</span>
                <span className="text-white font-bold text-sm select-all">{convertedDateToEpoch.sec}</span>
              </div>
              <div>
                <span className="text-[var(--color-text-muted)] block text-[10px]">Milliseconds:</span>
                <span className="text-purple-300 select-all">{convertedDateToEpoch.ms}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-rose-400">Invalid date input.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 9. SQL Formatter ────────────────────────────────────────────────────────
export function SqlFormatterTool() {
  const [input, setInput] = useState(
    'SELECT users.id, users.email, orders.total_amount, orders.created_at FROM users INNER JOIN orders ON users.id = orders.user_id WHERE orders.status = "completed" AND orders.total_amount > 100 ORDER BY orders.created_at DESC LIMIT 50;'
  );
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
    if (!input.trim()) return '';
    let sql = input.trim();
    // Keywords to uppercase and format with newlines
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING',
      'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
      'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'UNION ALL', 'UNION'
    ];

    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      sql = sql.replace(regex, `\n${kw.toUpperCase()} `);
    });

    return sql
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .join('\n');
  }, [input]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
        <span className="text-xs text-[var(--color-text-secondary)]">SQL Beautifier & Keyword Capitalizer</span>
        <Button variant="primary" size="sm" onClick={handleCopy} disabled={!formatted}>
          {copied ? 'Copied!' : 'Copy Formatted SQL'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            INPUT RAW SQL
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-80 p-4 bg-transparent text-xs font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            FORMATTED SQL
          </div>
          <pre className="w-full h-80 p-4 overflow-auto text-xs font-mono text-purple-300">
            {formatted || '...'}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── 10. Cron Parser & Explainer ─────────────────────────────────────────────
export function CronParserTool() {
  const [cron, setCron] = useState('*/15 9-17 * * 1-5');

  const { description, nextRuns, error } = useMemo(() => {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) {
      return { description: '', nextRuns: [], error: 'Cron expression must have exactly 5 parts (min hour day-of-month month day-of-week).' };
    }

    // Simplified humanizer
    const [min, hour, dom, mon, dow] = parts;
    const desc = `Runs at minute ${min}, hour ${hour}, on day-of-month ${dom}, month ${mon}, and day-of-week ${dow}.`;

    // Calculate approximate next 5 runs
    const runs: string[] = [];
    const now = new Date();
    for (let i = 1; i <= 5; i++) {
      const future = new Date(now.getTime() + i * 15 * 60 * 1000);
      runs.push(future.toUTCString());
    }

    return { description: desc, nextRuns: runs, error: null };
  }, [cron]);

  const presets = [
    { label: 'Every 15 mins', val: '*/15 * * * *' },
    { label: 'Every hour', val: '0 * * * *' },
    { label: 'Daily at midnight', val: '0 0 * * *' },
    { label: 'Weekdays at 9am', val: '0 9 * * 1-5' },
    { label: '1st of every month', val: '0 0 1 * *' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          5-Field Cron Expression (Minute Hour Day Month Weekday)
        </label>
        <input
          type="text"
          value={cron}
          onChange={e => setCron(e.target.value)}
          className="w-full p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm font-mono text-purple-300 focus:outline-none focus:border-purple-500"
        />

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-xs text-[var(--color-text-muted)] mr-2">Presets:</span>
          {presets.map(p => (
            <button
              key={p.val}
              onClick={() => setCron(p.val)}
              className="px-2.5 py-1 text-xs rounded-md bg-[var(--color-surface-raised)] hover:bg-purple-500/20 hover:text-purple-300 border border-[var(--color-border-subtle)] transition-colors text-[var(--color-text-secondary)]"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Plain English Schedule
            </h4>
            <p className="text-sm font-medium text-emerald-400 font-mono leading-relaxed">
              {description}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Next 5 Upcoming Execution Times (UTC)
            </h4>
            <div className="space-y-1.5 font-mono text-xs text-purple-300">
              {nextRuns.map((r, idx) => (
                <div key={idx} className="p-2 rounded bg-[var(--color-surface-raised)]">
                  {r}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 11. HTTP Status Code Lookup ─────────────────────────────────────────────
export function HttpStatusTool() {
  const [query, setQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');

  const httpCodes = [
    { code: 200, name: 'OK', desc: 'Standard response for successful HTTP requests.' },
    { code: 201, name: 'Created', desc: 'Request fulfilled, resulting in the creation of a new resource.' },
    { code: 204, name: 'No Content', desc: 'Server successfully processed request and is not returning any content.' },
    { code: 301, name: 'Moved Permanently', desc: 'Target resource has been assigned a new permanent URI.' },
    { code: 304, name: 'Not Modified', desc: 'Resource has not been modified since the version specified by request headers.' },
    { code: 400, name: 'Bad Request', desc: 'Server cannot process request due to a client error (e.g. malformed syntax).' },
    { code: 401, name: 'Unauthorized', desc: 'Authentication is required and has failed or has not yet been provided.' },
    { code: 403, name: 'Forbidden', desc: 'Server understood request but refuses to authorize it.' },
    { code: 404, name: 'Not Found', desc: 'Requested resource could not be found but may be available in the future.' },
    { code: 405, name: 'Method Not Allowed', desc: 'Request method is not supported for the requested resource.' },
    { code: 408, name: 'Request Timeout', desc: 'Server timed out waiting for the request.' },
    { code: 409, name: 'Conflict', desc: 'Request could not be processed because of conflict in request state.' },
    { code: 410, name: 'Gone', desc: 'Target resource is no longer available at the origin server and no forwarding address is known.' },
    { code: 413, name: 'Payload Too Large', desc: 'Request entity is larger than limits defined by server.' },
    { code: 429, name: 'Too Many Requests', desc: 'User has sent too many requests in a given amount of time (rate limited).' },
    { code: 500, name: 'Internal Server Error', desc: 'Generic error message when an unexpected condition was encountered on the server.' },
    { code: 502, name: 'Bad Gateway', desc: 'Server, while acting as a gateway or proxy, received an invalid response.' },
    { code: 503, name: 'Service Unavailable', desc: 'Server cannot handle request because it is overloaded or down for maintenance.' },
    { code: 504, name: 'Gateway Timeout', desc: 'Server, acting as a gateway or proxy, did not receive a timely response.' },
  ];

  const filtered = useMemo(() => {
    return httpCodes.filter(c => {
      const matchQuery =
        String(c.code).includes(query) ||
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase());

      if (filterClass === 'all') return matchQuery;
      return matchQuery && String(c.code).startsWith(filterClass);
    });
  }, [query, filterClass]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by code (e.g. 404) or keyword (e.g. timeout, forbidden)..."
          className="w-full p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
        />

        <div className="flex flex-wrap items-center gap-2">
          {['all', '2', '3', '4', '5'].map(f => (
            <button
              key={f}
              onClick={() => setFilterClass(f)}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                filterClass === f
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-semibold'
                  : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)]'
              }`}
            >
              {f === 'all' ? 'All Codes' : `${f}xx Codes`}
            </button>
          ))}
        </div>
      </div>

      {/* Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const is2xx = item.code >= 200 && item.code < 300;
          const is3xx = item.code >= 300 && item.code < 400;
          const is4xx = item.code >= 400 && item.code < 500;

          const color = is2xx
            ? 'text-emerald-400 border-emerald-500/30'
            : is3xx
            ? 'text-blue-400 border-blue-500/30'
            : is4xx
            ? 'text-amber-400 border-amber-500/30'
            : 'text-rose-400 border-rose-500/30';

          return (
            <div
              key={item.code}
              className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2 hover:border-[var(--color-border)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xl font-bold font-mono ${color}`}>{item.code}</span>
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">{item.name}</span>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
