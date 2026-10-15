'use client';

import React from 'react';
import {
  JsonFormatterTool,
  Base64Tool,
  UrlEncoderTool,
  UuidGeneratorTool,
  JwtDecoderTool,
  RegexTesterTool,
  HashGeneratorTool,
  TimestampConverterTool,
  SqlFormatterTool,
  CronParserTool,
  HttpStatusTool,
} from './impl/DeveloperTools';

import {
  WordCounterTool,
  CharacterCounterTool,
  CaseConverterTool,
  DuplicateLinesTool,
  TextCleanerTool,
  TextDiffTool,
  MarkdownFormatterTool,
  SlugGeneratorTool,
} from './impl/TextTools';

import {
  GstCalculatorTool,
  EmiCalculatorTool,
  PercentageCalculatorTool,
  DiscountCalculatorTool,
  AgeCalculatorTool,
} from './impl/CalculatorTools';

import {
  JpgToPdfTool,
  ImageCompressorTool,
  ImageResizerTool,
  JpgToPngTool,
  QrGeneratorTool,
  WebpConverterTool,
  ImageMetadataTool,
} from './impl/ImagePdfTools';

interface ToolRunnerProps {
  slug: string;
}

export function ToolRunner({ slug }: ToolRunnerProps) {
  switch (slug) {
    // ── Developer Tools ───────────────────────────────────
    case 'json-formatter':
      return <JsonFormatterTool />;
    case 'base64':
      return <Base64Tool />;
    case 'url-encoder':
      return <UrlEncoderTool />;
    case 'uuid-generator':
      return <UuidGeneratorTool />;
    case 'jwt-decoder':
      return <JwtDecoderTool />;
    case 'regex-tester':
      return <RegexTesterTool />;
    case 'hash-generator':
      return <HashGeneratorTool />;
    case 'timestamp-converter':
      return <TimestampConverterTool />;
    case 'sql-formatter':
      return <SqlFormatterTool />;
    case 'cron-parser':
      return <CronParserTool />;
    case 'http-status':
      return <HttpStatusTool />;

    // ── Text Tools ────────────────────────────────────────
    case 'word-counter':
      return <WordCounterTool />;
    case 'character-counter':
      return <CharacterCounterTool />;
    case 'case-converter':
      return <CaseConverterTool />;
    case 'duplicate-lines':
      return <DuplicateLinesTool />;
    case 'text-cleaner':
      return <TextCleanerTool />;
    case 'text-diff':
      return <TextDiffTool />;
    case 'markdown-formatter':
      return <MarkdownFormatterTool />;
    case 'slug-generator':
      return <SlugGeneratorTool />;

    // ── Calculators ───────────────────────────────────────
    case 'gst-calculator':
      return <GstCalculatorTool />;
    case 'emi-calculator':
      return <EmiCalculatorTool />;
    case 'percentage-calculator':
      return <PercentageCalculatorTool />;
    case 'discount-calculator':
      return <DiscountCalculatorTool />;
    case 'age-calculator':
      return <AgeCalculatorTool />;

    // ── Image & PDF Tools ─────────────────────────────────
    case 'jpg-to-pdf':
      return <JpgToPdfTool />;
    case 'image-compressor':
      return <ImageCompressorTool />;
    case 'image-resizer':
      return <ImageResizerTool />;
    case 'jpg-to-png':
      return <JpgToPngTool />;
    case 'qr-code-generator':
    case 'qr-generator':
      return <QrGeneratorTool />;
    case 'webp-converter':
      return <WebpConverterTool />;
    case 'image-metadata':
      return <ImageMetadataTool />;

    default:
      return (
        <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
          Tool not implemented yet.
        </div>
      );
  }
}
