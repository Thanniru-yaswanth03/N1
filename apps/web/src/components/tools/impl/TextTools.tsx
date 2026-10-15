'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/Button';

// ── 1. Word Counter ─────────────────────────────────────────────────────────
export function WordCounterTool() {
  const [text, setText] = useState(
    'N1 is a privacy-first, zero-cost temporary file and text sharing platform. It delivers rapid, client-side encryption and processing with no tracking or data hoarding.'
  );

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
    const charsWithSpaces = text.length;
    const charsWithoutSpaces = text.replace(/\s+/g, '').length;
    const sentences = trimmed ? (trimmed.match(/[^.!?]+[.!?]+(\s|$)/g) || [trimmed]).length : 0;
    const paragraphs = trimmed ? trimmed.split(/\n+/).filter(Boolean).length : 0;

    // Reading speed: ~200 wpm; Speaking speed: ~130 wpm
    const readingMinutes = Math.ceil(words.length / 200);
    const speakingMinutes = Math.ceil(words.length / 130);

    return {
      wordCount: words.length,
      charsWithSpaces,
      charsWithoutSpaces,
      sentences,
      paragraphs,
      readingMinutes: readingMinutes || 1,
      speakingMinutes: speakingMinutes || 1,
    };
  }, [text]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Words
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-purple-400 font-mono">
            {stats.wordCount}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Characters
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
            {stats.charsWithSpaces}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Sentences
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
            {stats.sentences}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <span className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
            Reading Time
          </span>
          <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
            ~{stats.readingMinutes}m
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-semibold">
          <span>INPUT TEXT</span>
          <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] font-mono">
            <span>No spaces: {stats.charsWithoutSpaces}</span>
            <span>Paragraphs: {stats.paragraphs}</span>
          </div>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or paste text to analyze..."
          className="w-full h-80 p-4 bg-transparent text-sm text-[var(--color-text-primary)] resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// ── 2. Character Counter ────────────────────────────────────────────────────
export function CharacterCounterTool() {
  const [text, setText] = useState('Password123! With Special #Symbols and Spaces.');

  const metrics = useMemo(() => {
    let letters = 0;
    let digits = 0;
    let spaces = 0;
    let punctuation = 0;
    let specials = 0;

    for (const char of text) {
      if (/[a-zA-Z]/.test(char)) letters++;
      else if (/[0-9]/.test(char)) digits++;
      else if (/\s/.test(char)) spaces++;
      else if (/[.,/#!$%^&*;:{}=\-_`~()]/.test(char)) punctuation++;
      else specials++;
    }

    const utf8Bytes = new TextEncoder().encode(text).length;

    return {
      total: text.length,
      letters,
      digits,
      spaces,
      punctuation,
      specials,
      utf8Bytes,
    };
  }, [text]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Chars', val: metrics.total, color: 'text-purple-400' },
          { label: 'Letters', val: metrics.letters, color: 'text-blue-400' },
          { label: 'Digits', val: metrics.digits, color: 'text-emerald-400' },
          { label: 'Spaces', val: metrics.spaces, color: 'text-amber-400' },
          { label: 'Punctuation', val: metrics.punctuation, color: 'text-pink-400' },
          { label: 'UTF-8 Bytes', val: metrics.utf8Bytes, color: 'text-white' },
        ].map(m => (
          <div key={m.label} className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
            <span className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
              {m.label}
            </span>
            <span className={`text-xl sm:text-2xl font-bold font-mono ${m.color}`}>
              {m.val}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type or paste text to count characters..."
          className="w-full h-72 p-4 bg-transparent text-sm font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

// ── 3. Case Converter ───────────────────────────────────────────────────────
export function CaseConverterTool() {
  const [text, setText] = useState('the quick BROWN fox jumps OVER the Lazy Dog');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const conversions = useMemo(() => {
    const raw = text.trim();
    if (!raw) return {};

    const words = raw.split(/[\s_-]+/).filter(Boolean);

    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    const title = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const sentence = raw
      .toLowerCase()
      .replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());

    const camel = words
      .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join('');

    const pascal = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');

    const snake = words.map(w => w.toLowerCase()).join('_');
    const constant = words.map(w => w.toUpperCase()).join('_');
    const kebab = words.map(w => w.toLowerCase()).join('-');
    const dot = words.map(w => w.toLowerCase()).join('.');

    return {
      'UPPERCASE': upper,
      'lowercase': lower,
      'Title Case': title,
      'Sentence case': sentence,
      'camelCase': camel,
      'PascalCase': pascal,
      'snake_case': snake,
      'CONSTANT_CASE': constant,
      'kebab-case': kebab,
      'dot.case': dot,
    };
  }, [text]);

  const copyVal = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Input Text
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Enter text to convert case..."
          className="w-full h-24 p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {Object.entries(conversions).map(([name, result]) => (
          <div
            key={name}
            className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                {name}
              </span>
              <button
                onClick={() => copyVal(name, result)}
                className="text-xs text-[var(--color-text-secondary)] hover:text-white px-2 py-0.5 rounded bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)]"
              >
                {copiedKey === name ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs font-mono text-[var(--color-text-primary)] break-all select-all pt-1">
              {result}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 4. Duplicate Line Remover ───────────────────────────────────────────────
export function DuplicateLinesTool() {
  const [input, setInput] = useState('apple\nbanana\norange\napple\nbanana\ngrape\nwatermelon\norange');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [sortAlphabetical, setSortAlphabetical] = useState(false);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [copied, setCopied] = useState(false);

  const { output, originalCount, uniqueCount } = useMemo(() => {
    let lines = input.split('\n');
    const orig = lines.length;

    if (trimWhitespace) {
      lines = lines.map(l => l.trim()).filter(Boolean);
    }

    const seen = new Set<string>();
    const unique: string[] = [];

    for (const line of lines) {
      const key = caseSensitive ? line : line.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(line);
      }
    }

    if (sortAlphabetical) {
      unique.sort((a, b) => a.localeCompare(b));
    }

    return {
      output: unique.join('\n'),
      originalCount: orig,
      uniqueCount: unique.length,
    };
  }, [input, caseSensitive, sortAlphabetical, trimWhitespace]);

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={e => setCaseSensitive(e.target.checked)}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>Case Sensitive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sortAlphabetical}
              onChange={e => setSortAlphabetical(e.target.checked)}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>Sort A-Z</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trimWhitespace}
              onChange={e => setTrimWhitespace(e.target.checked)}
              className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
            />
            <span>Trim Whitespace</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[var(--color-text-muted)]">
            Removed {originalCount - uniqueCount} duplicates
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(output);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? 'Copied!' : 'Copy Unique Lines'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            INPUT LIST ({originalCount} lines)
          </div>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-80 p-4 bg-transparent text-xs font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-emerald-400">
            DEDUPLICATED OUTPUT ({uniqueCount} lines)
          </div>
          <textarea
            readOnly
            value={output}
            className="w-full h-80 p-4 bg-transparent text-xs font-mono text-emerald-300 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

// ── 5. Text Cleaner ─────────────────────────────────────────────────────────
export function TextCleanerTool() {
  const [text, setText] = useState(
    '<p>Hello <b>World</b>!   Here is   an example with extra    spaces.\n\n\nAnd multiple blank lines with emojis 😊🔥!</p>'
  );
  const [stripHtml, setStripHtml] = useState(true);
  const [normalizeSpaces, setNormalizeSpaces] = useState(true);
  const [removeBlankLines, setRemoveBlankLines] = useState(true);
  const [removeEmojis, setRemoveEmojis] = useState(false);
  const [straightQuotes, setStraightQuotes] = useState(true);

  const cleaned = useMemo(() => {
    let res = text;
    if (stripHtml) {
      res = res.replace(/<[^>]*>?/gm, '');
    }
    if (straightQuotes) {
      res = res.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    }
    if (removeEmojis) {
      res = res.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    }
    if (normalizeSpaces) {
      res = res.replace(/[ \t]+/g, ' ');
    }
    if (removeBlankLines) {
      res = res.split('\n').filter(l => l.trim().length > 0).join('\n');
    }
    return res;
  }, [text, stripHtml, normalizeSpaces, removeBlankLines, removeEmojis, straightQuotes]);

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex flex-wrap items-center gap-4 text-xs text-[var(--color-text-secondary)]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={stripHtml}
            onChange={e => setStripHtml(e.target.checked)}
            className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
          />
          <span>Strip HTML Tags</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={normalizeSpaces}
            onChange={e => setNormalizeSpaces(e.target.checked)}
            className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
          />
          <span>Normalize Whitespace</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={removeBlankLines}
            onChange={e => setRemoveBlankLines(e.target.checked)}
            className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
          />
          <span>Remove Blank Lines</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={straightQuotes}
            onChange={e => setStraightQuotes(e.target.checked)}
            className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
          />
          <span>Straight Quotes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={removeEmojis}
            onChange={e => setRemoveEmojis(e.target.checked)}
            className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
          />
          <span>Remove Emojis</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            RAW TEXT
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-80 p-4 bg-transparent text-xs font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
          />
        </div>

        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span>CLEANED TEXT</span>
            <button
              onClick={() => navigator.clipboard.writeText(cleaned)}
              className="text-[11px] text-[var(--color-text-secondary)] hover:text-white"
            >
              Copy
            </button>
          </div>
          <textarea
            readOnly
            value={cleaned}
            className="w-full h-80 p-4 bg-transparent text-xs font-mono text-emerald-300 resize-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── 6. Text Diff Checker ────────────────────────────────────────────────────
export function TextDiffTool() {
  const [original, setOriginal] = useState(
    'The quick brown fox jumps over the lazy dog.\nN1 is a private platform.\nVersion 1.0.0.'
  );
  const [modified, setModified] = useState(
    'The fast brown fox jumps over the sleepy dog.\nN1 is a zero-budget private platform.\nVersion 2.0.0.'
  );

  const diffLines = useMemo(() => {
    const origLines = original.split('\n');
    const modLines = modified.split('\n');
    const max = Math.max(origLines.length, modLines.length);
    const result: Array<{ type: 'same' | 'added' | 'removed' | 'modified'; orig?: string; mod?: string; num: number }> = [];

    for (let i = 0; i < max; i++) {
      const o = origLines[i];
      const m = modLines[i];
      if (o === m) {
        result.push({ type: 'same', orig: o, mod: m, num: i + 1 });
      } else if (o !== undefined && m === undefined) {
        result.push({ type: 'removed', orig: o, num: i + 1 });
      } else if (o === undefined && m !== undefined) {
        result.push({ type: 'added', mod: m, num: i + 1 });
      } else {
        result.push({ type: 'modified', orig: o, mod: m, num: i + 1 });
      }
    }
    return result;
  }, [original, modified]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            ORIGINAL TEXT
          </div>
          <textarea
            value={original}
            onChange={e => setOriginal(e.target.value)}
            className="w-full h-48 p-4 bg-transparent text-xs font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
          />
        </div>

        <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
            MODIFIED TEXT
          </div>
          <textarea
            value={modified}
            onChange={e => setModified(e.target.value)}
            className="w-full h-48 p-4 bg-transparent text-xs font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
          />
        </div>
      </div>

      {/* Visual Diff View */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)] flex items-center justify-between">
          <span>LINE-BY-LINE COMPARISON</span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-emerald-400">+ Additions</span>
            <span className="text-rose-400">- Removals</span>
          </div>
        </div>

        <div className="p-3 font-mono text-xs divide-y divide-[var(--color-border-subtle)]/40 max-h-96 overflow-y-auto">
          {diffLines.map(line => (
            <div key={line.num} className="py-1 flex items-start gap-3">
              <span className="w-8 text-[var(--color-text-muted)] select-none text-right">{line.num}</span>
              {line.type === 'same' && (
                <div className="text-[var(--color-text-secondary)] pl-2">{line.orig}</div>
              )}
              {line.type === 'modified' && (
                <div className="flex-1 space-y-1">
                  <div className="p-1 rounded bg-rose-500/15 text-rose-300 border-l-2 border-rose-500 pl-2">
                    - {line.orig}
                  </div>
                  <div className="p-1 rounded bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-500 pl-2">
                    + {line.mod}
                  </div>
                </div>
              )}
              {line.type === 'removed' && (
                <div className="flex-1 p-1 rounded bg-rose-500/15 text-rose-300 border-l-2 border-rose-500 pl-2">
                  - {line.orig}
                </div>
              )}
              {line.type === 'added' && (
                <div className="flex-1 p-1 rounded bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-500 pl-2">
                  + {line.mod}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 7. Markdown Formatter & Preview ─────────────────────────────────────────
export function MarkdownFormatterTool() {
  const [md, setMd] = useState(
    '# N1 Privacy Platform\n\n> Zero cost, privacy-first temporary text and file sharing.\n\n## Core Features\n\n- **Client-Side Encryption**\n- *Ephemeral Drops*\n- Reusable ToolCard & ToolLayout components\n\n```json\n{\n  "status": "ready",\n  "tools": 31\n}\n```\n'
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)]">
          MARKDOWN SOURCE
        </div>
        <textarea
          value={md}
          onChange={e => setMd(e.target.value)}
          className="w-full h-96 p-4 bg-transparent text-xs font-mono text-[var(--color-text-primary)] resize-none focus:outline-none"
        />
      </div>

      <div className="flex flex-col rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-4 py-2.5 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-purple-400">
          RENDERED HTML PREVIEW
        </div>
        <div className="w-full h-96 p-6 overflow-auto text-sm text-[var(--color-text-primary)] space-y-3 prose prose-invert">
          <div dangerouslySetInnerHTML={{
            __html: md
              .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mb-2">$1</h1>')
              .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-purple-300 mt-4 mb-2">$1</h2>')
              .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium text-white mb-2">$1</h3>')
              .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-purple-500 pl-3 italic text-[var(--color-text-secondary)]">$1</blockquote>')
              .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-white">$1</strong>')
              .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
              .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-xs text-[var(--color-text-secondary)]">$1</li>')
              .replace(/```([\s\S]*?)```/gim, '<pre class="p-3 rounded-lg bg-[var(--color-surface-raised)] font-mono text-xs text-purple-300 overflow-auto">$1</pre>')
              .replace(/\n$/gim, '<br />')
          }} />
        </div>
      </div>
    </div>
  );
}

// ── 8. URL Slug Generator ───────────────────────────────────────────────────
export function SlugGeneratorTool() {
  const [title, setTitle] = useState('N1: Privacy-First Ephemeral Sharing & Modern Developer Toolbox 2026!');
  const [separator, setSeparator] = useState<'-' | '_'>('-');
  const [copied, setCopied] = useState(false);

  const slug = useMemo(() => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, separator)
      .replace(/^-+|-+$/g, '');
  }, [title, separator]);

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Input Title or Heading
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter title to generate slug..."
          className="w-full p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-purple-500"
        />

        <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
          <span className="font-medium">Separator:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="sep"
              checked={separator === '-'}
              onChange={() => setSeparator('-')}
              className="text-purple-600 focus:ring-purple-500"
            />
            <span>Hyphen ( - )</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="sep"
              checked={separator === '_'}
              onChange={() => setSeparator('_')}
              className="text-purple-600 focus:ring-purple-500"
            />
            <span>Underscore ( _ )</span>
          </label>
        </div>
      </div>

      <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider block mb-1">
            Generated URL Slug
          </span>
          <span className="text-base sm:text-lg font-mono font-bold text-white break-all select-all">
            {slug || '...'}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(slug);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          disabled={!slug}
        >
          {copied ? 'Copied' : 'Copy Slug'}
        </Button>
      </div>
    </div>
  );
}
