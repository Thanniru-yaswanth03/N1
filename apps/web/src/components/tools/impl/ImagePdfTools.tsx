'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Button } from '../../ui/Button';

// ── 1. JPG to PDF Converter ─────────────────────────────────────────────────
export function JpgToPdfTool() {
  const [images, setImages] = useState<Array<{ name: string; url: string; file: File; width: number; height: number }>>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4'>('fit');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setImages(prev => [
          ...prev,
          { name: file.name, url, file, width: img.naturalWidth, height: img.naturalHeight },
        ]);
      };
      img.src = url;
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsGenerating(true);

    try {
      // Build PDF in-memory using pure Client-Side Canvas & PDF writer
      const pdfParts: Uint8Array[] = [];
      const encoder = new TextEncoder();

      // For each image, draw on canvas and encode to JPEG bytes
      const processedPages: Array<{ width: number; height: number; jpegBytes: Uint8Array }> = [];

      for (const item of images) {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = item.url;
        await new Promise(r => { img.onload = r; });

        let w = img.naturalWidth || 800;
        let h = img.naturalHeight || 600;

        if (pageSize === 'a4') {
          // Standard A4 aspect: 595 x 842 pt
          w = 595;
          h = 842;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }

        const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9));
        if (blob) {
          const buf = await blob.arrayBuffer();
          processedPages.push({
            width: w,
            height: h,
            jpegBytes: new Uint8Array(buf),
          });
        }
      }

      // Construct Minimal Valid Multi-page PDF
      const objects: Array<{ offset: number; data: Uint8Array }> = [];
      let currentOffset = 0;

      const append = (str: string) => {
        const bytes = encoder.encode(str);
        pdfParts.push(bytes);
        currentOffset += bytes.length;
      };

      const appendBytes = (bytes: Uint8Array) => {
        pdfParts.push(bytes);
        currentOffset += bytes.length;
      };

      append('%PDF-1.4\n');

      const pageCount = processedPages.length;
      const catalogObjNum = 1;
      const pagesObjNum = 2;
      const firstPageObjNum = 3;

      // 1 0 obj: Catalog
      objects.push({ offset: currentOffset, data: new Uint8Array() });
      append(`${catalogObjNum} 0 obj\n<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>\nendobj\n`);

      // 2 0 obj: Pages
      const pageRefs = processedPages.map((_, i) => `${firstPageObjNum + i * 3} 0 R`).join(' ');
      objects.push({ offset: currentOffset, data: new Uint8Array() });
      append(`${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [ ${pageRefs} ] /Count ${pageCount} >>\nendobj\n`);

      for (let i = 0; i < pageCount; i++) {
        const p = processedPages[i];
        if (!p) continue;
        const pageObjNum = firstPageObjNum + i * 3;
        const contentObjNum = pageObjNum + 1;
        const imageObjNum = pageObjNum + 2;

        // Page Object
        objects.push({ offset: currentOffset, data: new Uint8Array() });
        append(
          `${pageObjNum} 0 obj\n<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${p.width} ${p.height}] ` +
          `/Resources << /XObject << /Im${i} ${imageObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`
        );

        // Content Stream
        const contentStream = `q ${p.width} 0 0 ${p.height} 0 0 cm /Im${i} Do Q`;
        objects.push({ offset: currentOffset, data: new Uint8Array() });
        append(
          `${contentObjNum} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
        );

        // Image Object
        objects.push({ offset: currentOffset, data: new Uint8Array() });
        append(
          `${imageObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`
        );
        appendBytes(p.jpegBytes);
        append('\nendstream\nendobj\n');
      }

      // XRef Table
      const xrefOffset = currentOffset;
      const totalObjs = objects.length + 1;
      append(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`);
      for (const obj of objects) {
        append(`${String(obj.offset).padStart(10, '0')} 00000 n \n`);
      }

      append(`trailer\n<< /Size ${totalObjs} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

      // Combine parts into Blob and download
      const finalPdfBlob = new Blob(pdfParts as BlobPart[], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(finalPdfBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `n1_document_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] hover:border-purple-500/50 bg-[var(--color-surface)] text-center transition-colors">
        <input
          type="file"
          id="jpg-upload"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />
        <label htmlFor="jpg-upload" className="cursor-pointer block">
          <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
            Click or drag JPG / PNG images here
          </span>
          <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
            Images will be assembled into a single multi-page PDF document client-side.
          </span>
        </label>
      </div>

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">Page Size:</span>
              <button
                onClick={() => setPageSize('fit')}
                className={`px-3 py-1 text-xs rounded-lg border font-mono transition-colors ${
                  pageSize === 'fit'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
                }`}
              >
                Fit to Image
              </button>
              <button
                onClick={() => setPageSize('a4')}
                className={`px-3 py-1 text-xs rounded-lg border font-mono transition-colors ${
                  pageSize === 'a4'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
                }`}
              >
                Standard A4
              </button>
            </div>

            <Button variant="primary" size="sm" onClick={generatePdf} disabled={isGenerating}>
              {isGenerating ? 'Building PDF...' : `Generate & Download PDF (${images.length} pages)`}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden group"
              >
                <img src={img.url} alt={img.name} className="w-full h-36 object-cover" />
                <div className="p-2.5 flex items-center justify-between text-xs">
                  <span className="truncate text-[11px] font-mono text-[var(--color-text-secondary)] max-w-[100px]">
                    Page {idx + 1}
                  </span>
                  <button
                    onClick={() => removeImage(idx)}
                    className="text-rose-400 hover:text-rose-300 text-xs px-1.5 py-0.5 rounded bg-rose-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. Image Compressor ─────────────────────────────────────────────────────
export function ImageCompressorTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [quality, setQuality] = useState<number>(0.75);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string>('');

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  useEffect(() => {
    if (!file || !preview) return;

    const img = new Image();
    img.src = preview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          blob => {
            if (blob) {
              setCompressedBlob(blob);
              setCompressedUrl(URL.createObjectURL(blob));
            }
          },
          'image/jpeg',
          quality
        );
      }
    };
  }, [file, preview, quality]);

  const downloadCompressed = () => {
    if (!compressedUrl || !file) return;
    const a = document.createElement('a');
    a.href = compressedUrl;
    a.download = `compressed_${file.name.replace(/\.[^.]+$/, '')}.jpg`;
    a.click();
  };

  const originalSize = file ? (file.size / 1024).toFixed(1) : '0';
  const compressedSize = compressedBlob ? (compressedBlob.size / 1024).toFixed(1) : '0';
  const savedPercent =
    file && compressedBlob && file.size > 0
      ? Math.max(0, Math.round(((file.size - compressedBlob.size) / file.size) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {!file ? (
        <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <input
            type="file"
            id="compress-upload"
            accept="image/*"
            onChange={handleSelect}
            className="hidden"
          />
          <label htmlFor="compress-upload" className="cursor-pointer block">
            <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
              Choose an image to compress
            </span>
            <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
              HTML5 Canvas Client-side compression with quality slider
            </span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                Compression Quality: {Math.round(quality * 100)}%
              </span>
              <Button variant="primary" size="sm" onClick={downloadCompressed}>
                Download Compressed Image
              </Button>
            </div>

            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={quality}
              onChange={e => setQuality(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />

            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs font-mono">
              <div className="p-3 rounded-lg bg-[var(--color-surface-raised)]">
                <span className="text-[var(--color-text-muted)] block text-[10px]">Original Size</span>
                <span className="text-white font-bold">{originalSize} KB</span>
              </div>
              <div className="p-3 rounded-lg bg-[var(--color-surface-raised)]">
                <span className="text-[var(--color-text-muted)] block text-[10px]">Compressed Size</span>
                <span className="text-emerald-400 font-bold">{compressedSize} KB</span>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-emerald-300 block text-[10px]">Reduction</span>
                <span className="text-emerald-400 font-bold">{savedPercent}% Smaller</span>
              </div>
            </div>
          </div>

          {/* Side-by-side preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">ORIGINAL</span>
              <img src={preview} alt="Original" className="w-full h-64 object-contain rounded-lg bg-black/40" />
            </div>
            <div className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-2">
              <span className="text-xs font-semibold text-emerald-400">COMPRESSED PREVIEW</span>
              <img src={compressedUrl} alt="Compressed" className="w-full h-64 object-contain rounded-lg bg-black/40" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. Image Resizer ────────────────────────────────────────────────────────
export function ImageResizerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [lockAspect, setLockAspect] = useState<boolean>(true);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreview(url);
      const img = new Image();
      img.onload = () => {
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      };
      img.src = url;
    }
  };

  const handleWidthChange = (w: number) => {
    setWidth(w);
    if (lockAspect && aspectRatio) {
      setHeight(Math.round(w / aspectRatio));
    }
  };

  const handleHeightChange = (h: number) => {
    setHeight(h);
    if (lockAspect && aspectRatio) {
      setWidth(Math.round(h * aspectRatio));
    }
  };

  const setScale = (pct: number) => {
    if (!preview) return;
    const img = new Image();
    img.src = preview;
    img.onload = () => {
      const w = Math.round((img.naturalWidth * pct) / 100);
      const h = Math.round((img.naturalHeight * pct) / 100);
      setWidth(w);
      setHeight(h);
    };
  };

  const downloadResized = () => {
    if (!preview || !file || width <= 0 || height <= 0) return;
    const img = new Image();
    img.src = preview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resized_${width}x${height}_${file.name}`;
            a.click();
            URL.revokeObjectURL(url);
          }
        }, file.type || 'image/png');
      }
    };
  };

  return (
    <div className="space-y-6">
      {!file ? (
        <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
          <input type="file" id="resize-upload" accept="image/*" onChange={handleSelect} className="hidden" />
          <label htmlFor="resize-upload" className="cursor-pointer block">
            <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
              Choose an image to resize
            </span>
          </label>
        </div>
      ) : (
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  Width (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={e => handleWidthChange(Number(e.target.value))}
                  className="w-28 p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] mb-1">
                  Height (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={e => handleHeightChange(Number(e.target.value))}
                  className="w-28 p-2 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-xs font-mono text-white"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)] mt-4 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={lockAspect}
                  onChange={e => setLockAspect(e.target.checked)}
                  className="rounded border-[var(--color-border)] text-purple-600 focus:ring-purple-500"
                />
                <span>Lock Aspect Ratio</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              {[25, 50, 75, 100].map(p => (
                <button
                  key={p}
                  onClick={() => setScale(p)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] hover:bg-purple-500/20"
                >
                  {p}%
                </button>
              ))}
            </div>

            <Button variant="primary" size="sm" onClick={downloadResized}>
              Download Resized
            </Button>
          </div>

          <div className="flex justify-center p-4 rounded-xl bg-black/30 border border-[var(--color-border-subtle)]">
            <img src={preview} alt="Preview" className="max-h-72 object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. JPG to PNG Converter ─────────────────────────────────────────────────
export function JpgToPngTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pngUrl, setPngUrl] = useState<string>('');

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (blob) {
              setPngUrl(URL.createObjectURL(blob));
            }
          }, 'image/png');
        }
      };
      img.src = url;
    }
  };

  const download = () => {
    if (!pngUrl || !file) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${file.name.replace(/\.[^.]+$/, '')}.png`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
        <input type="file" id="jpgpng-upload" accept="image/jpeg" onChange={handleSelect} className="hidden" />
        <label htmlFor="jpgpng-upload" className="cursor-pointer block">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
            Select a JPG image to convert to PNG
          </span>
          <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
            Lossless client-side conversion via browser Canvas
          </span>
        </label>
      </div>

      {pngUrl && (
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex flex-col items-center gap-4">
          <img src={pngUrl} alt="PNG output" className="max-h-64 object-contain rounded-lg" />
          <Button variant="primary" size="sm" onClick={download}>
            Download PNG File
          </Button>
        </div>
      )}
    </div>
  );
}

// ── 5. QR Code Generator ────────────────────────────────────────────────────
export function QrGeneratorTool() {
  const [text, setText] = useState('https://n1.io');
  const [size, setSize] = useState<number>(320);
  const [fgColor, setFgColor] = useState('#F0F0F8');
  const [bgColor, setBgColor] = useState('#111118');
  const [ecc, setEcc] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [frameStyle, setFrameStyle] = useState<'none' | 'badge' | 'card' | 'border'>('none');
  const [frameText, setFrameText] = useState('SCAN ME');
  const [qrUrl, setQrUrl] = useState('');
  const [svgString, setSvgString] = useState('');
  const [copiedType, setCopiedType] = useState<'svg' | 'url' | 'png' | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const COLOR_PRESETS = [
    { name: 'Dark Theme', fg: '#F0F0F8', bg: '#111118' },
    { name: 'Pure White', fg: '#111118', bg: '#FFFFFF' },
    { name: 'N1 Purple', fg: '#C084FC', bg: '#0F091E' },
    { name: 'Cyber Cyan', fg: '#22D3EE', bg: '#061318' },
    { name: 'Emerald', fg: '#34D399', bg: '#061611' },
    { name: 'Amber Gold', fg: '#FBBF24', bg: '#191204' },
  ];

  const PAYLOAD_TEMPLATES = [
    { label: 'URL', example: 'https://n1.io/drop' },
    { label: 'Wi-Fi', example: 'WIFI:S:MyNetwork;T:WPA;P:SecretPassword;;' },
    { label: 'Email', example: 'mailto:contact@n1.io?subject=Inquiry' },
    { label: 'Plain Text', example: 'Welcome to N1 anonymous drop platform.' },
  ];

  // Re-generate QR whenever parameters change
  useEffect(() => {
    if (!text.trim()) {
      setQrUrl('');
      setSvgString('');
      setRenderError(null);
      return;
    }

    setRenderError(null);

    // Generate PNG Data URL
    QRCode.toDataURL(text, {
      errorCorrectionLevel: ecc,
      margin: frameStyle === 'border' ? 3 : 2,
      width: size,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    })
      .then(url => {
        setQrUrl(url);
      })
      .catch(err => {
        setRenderError(err?.message || 'Failed to render QR Code. Payload may be too large for chosen error correction.');
      });

    // Generate SVG string
    QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: ecc,
      margin: frameStyle === 'border' ? 3 : 2,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    })
      .then(svg => {
        setSvgString(svg);
      })
      .catch(() => {});
  }, [text, size, fgColor, bgColor, ecc, frameStyle]);

  const handleDownloadPng = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `n1_qr_${size}px_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `n1_qr_vector_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySvg = async () => {
    if (!svgString) return;
    try {
      await navigator.clipboard.writeText(svgString);
      setCopiedType('svg');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Clipboard write fallback
    }
  };

  const handleCopyUrl = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('url');
      setTimeout(() => setCopiedType(null), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ── Left Configuration Column (7 cols) ── */}
      <div className="lg:col-span-7 space-y-6">
        {/* Payload Section */}
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Payload & Content
            </label>
            <div className="flex gap-2">
              {PAYLOAD_TEMPLATES.map(tpl => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => setText(tpl.example)}
                  className="px-2 py-0.5 text-[11px] rounded bg-[var(--color-surface-raised)] hover:bg-[var(--color-purple)]/20 hover:text-purple-300 border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter URL, Wi-Fi credentials, contact card, or plain text..."
              rows={4}
              maxLength={2048}
              className="w-full p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 font-mono transition-all"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="absolute top-2 right-2 p-1 text-xs text-[var(--color-text-muted)] hover:text-white rounded bg-[var(--color-surface)]/80"
                title="Clear input"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>{text.length} / 2048 characters</span>
            {text.startsWith('http://') || text.startsWith('https://') ? (
              <span className="text-emerald-400 flex items-center gap-1">✓ Valid URL structure</span>
            ) : text.startsWith('WIFI:') ? (
              <span className="text-amber-400">Wi-Fi configuration code</span>
            ) : (
              <span>Plain text payload</span>
            )}
          </div>
        </div>

        {/* Style & Frame Options */}
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-5 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Presentation Frame & Labels
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'none', label: 'Clean / None', desc: 'Raw QR code' },
              { id: 'badge', label: 'Top Badge', desc: 'Scan Me banner' },
              { id: 'card', label: 'Card Frame', desc: 'Elevated border' },
              { id: 'border', label: 'Minimalist', desc: 'Clean outline' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFrameStyle(f.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  frameStyle === f.id
                    ? 'border-purple-500 bg-purple-500/10 text-white ring-1 ring-purple-500'
                    : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:border-white/20'
                }`}
              >
                <div className="text-xs font-semibold">{f.label}</div>
                <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>

          {frameStyle === 'badge' && (
            <div className="pt-2">
              <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1">
                Badge Header Text
              </label>
              <input
                type="text"
                value={frameText}
                onChange={e => setFrameText(e.target.value)}
                maxLength={30}
                className="w-full sm:w-64 px-3 py-1.5 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* Color Palette Controls */}
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
              Color Customization
            </label>
            <div className="flex gap-1.5">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setFgColor(preset.fg);
                    setBgColor(preset.bg);
                  }}
                  className="w-5 h-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110"
                  style={{ background: `linear-gradient(135deg, ${preset.fg} 50%, ${preset.bg} 50%)` }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-[var(--color-text-primary)]">Foreground Color</span>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase">{fgColor}</span>
              </div>
              <input
                type="color"
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
            </div>

            <div className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] flex items-center justify-between">
              <div>
                <span className="block text-xs font-semibold text-[var(--color-text-primary)]">Background Color</span>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)] uppercase">{bgColor}</span>
              </div>
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
            </div>
          </div>
        </div>

        {/* Resolution & Error Correction */}
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
            Resolution & Error Correction
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-semibold text-[var(--color-text-muted)]">
                <span>Output Resolution</span>
                <span className="font-mono text-purple-400">{size} × {size} px</span>
              </div>
              <div className="flex gap-2">
                {[160, 256, 320, 512, 1024].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      size === s
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-semibold text-[var(--color-text-muted)]">
                <span>Error Correction</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {ecc === 'L' ? '~7% recovery' : ecc === 'M' ? '~15% recovery' : ecc === 'Q' ? '~25% recovery' : '~30% high'}
                </span>
              </div>
              <div className="flex gap-2">
                {(['L', 'M', 'Q', 'H'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setEcc(lvl)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      ecc === lvl
                        ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                        : 'border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Interactive Output Column (5 cols) ── */}
      <div className="lg:col-span-5 sticky top-24 space-y-6">
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-lg flex flex-col items-center justify-center">
          <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border-subtle)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Live Preview</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-mono border border-purple-500/20">
              {size}px · {ecc} Level
            </span>
          </div>

          {/* Render Error State */}
          {renderError && (
            <div className="w-full p-4 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <div className="font-bold mb-1">QR Generation Error</div>
              <div>{renderError}</div>
            </div>
          )}

          {/* QR Display with Frame */}
          {qrUrl ? (
            <div className="flex flex-col items-center my-2">
              {frameStyle === 'badge' && (
                <div
                  className="px-4 py-1 mb-2 rounded-full text-xs font-black tracking-wider uppercase shadow-sm"
                  style={{ backgroundColor: fgColor, color: bgColor }}
                >
                  {frameText || 'SCAN ME'}
                </div>
              )}

              <div
                className={`p-3 rounded-2xl transition-all ${
                  frameStyle === 'card'
                    ? 'border-2 border-purple-500/40 shadow-xl shadow-purple-500/5'
                    : frameStyle === 'border'
                    ? 'border border-white/20'
                    : ''
                }`}
                style={{ backgroundColor: bgColor }}
              >
                <img
                  src={qrUrl}
                  alt="Generated QR Code Preview"
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl select-none"
                />
              </div>

              {frameStyle === 'card' && (
                <span className="text-[11px] text-[var(--color-text-muted)] mt-2 font-mono">
                  Scan with any camera
                </span>
              )}
            </div>
          ) : (
            <div className="w-64 h-64 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] flex flex-col items-center justify-center p-6 text-center text-[var(--color-text-muted)]">
              <svg className="w-10 h-10 mb-2 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs font-semibold text-white/50">Awaiting Payload</span>
              <span className="text-[11px] mt-1">Enter a URL or text to generate your QR code</span>
            </div>
          )}

          {/* Export Action Buttons */}
          <div className="w-full mt-6 space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleDownloadPng}
                disabled={!qrUrl}
                className="w-full justify-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                PNG Image
              </Button>

              <Button
                variant="secondary"
                size="md"
                onClick={handleDownloadSvg}
                disabled={!svgString}
                className="w-full justify-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                SVG Vector
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySvg}
                disabled={!svgString}
                className="w-full justify-center text-xs"
              >
                {copiedType === 'svg' ? '✓ Copied SVG!' : 'Copy SVG Code'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyUrl}
                disabled={!text}
                className="w-full justify-center text-xs"
              >
                {copiedType === 'url' ? '✓ Copied URL!' : 'Copy Payload'}
              </Button>
            </div>
          </div>
        </div>

        {/* Security / Privacy Guarantee Callout */}
        <div className="p-4 rounded-xl border border-white/5 bg-[var(--color-surface-raised)]/50 text-xs text-[var(--color-text-muted)] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-white/80">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>100% Client-Side Generation</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Your QR code payload is rendered entirely in your browser canvas. No URLs, Wi-Fi credentials, or text are ever transmitted to any external server.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 6. WebP Converter ───────────────────────────────────────────────────────
export function WebpConverterTool() {
  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<'image/webp' | 'image/png' | 'image/jpeg'>('image/webp');
  const [quality, setQuality] = useState(0.85);
  const [outputUrl, setOutputUrl] = useState('');

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      convert(f, targetFormat, quality);
    }
  };

  const convert = (f: File, format: string, q: number) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          blob => {
            if (blob) {
              setOutputUrl(URL.createObjectURL(blob));
            }
          },
          format,
          q
        );
      }
    };
    img.src = url;
  };

  useEffect(() => {
    if (file) {
      convert(file, targetFormat, quality);
    }
  }, [targetFormat, quality]);

  const download = () => {
    if (!outputUrl || !file) return;
    const ext = targetFormat === 'image/webp' ? 'webp' : targetFormat === 'image/png' ? 'png' : 'jpg';
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = `converted_${file.name.replace(/\.[^.]+$/, '')}.${ext}`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
        <input type="file" id="webp-upload" accept="image/*" onChange={handleSelect} className="hidden" />
        <label htmlFor="webp-upload" className="cursor-pointer block">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
            Choose an image to convert
          </span>
          <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
            Convert PNG/JPG to WebP or WebP to PNG/JPG in browser
          </span>
        </label>
      </div>

      {file && (
        <div className="p-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--color-text-secondary)]">Target Format:</span>
              <button
                onClick={() => setTargetFormat('image/webp')}
                className={`px-3 py-1 text-xs rounded-lg border font-mono ${
                  targetFormat === 'image/webp'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
                }`}
              >
                WebP
              </button>
              <button
                onClick={() => setTargetFormat('image/png')}
                className={`px-3 py-1 text-xs rounded-lg border font-mono ${
                  targetFormat === 'image/png'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
                }`}
              >
                PNG
              </button>
              <button
                onClick={() => setTargetFormat('image/jpeg')}
                className={`px-3 py-1 text-xs rounded-lg border font-mono ${
                  targetFormat === 'image/jpeg'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'
                }`}
              >
                JPG
              </button>
            </div>

            {targetFormat !== 'image/png' && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--color-text-secondary)]">Quality:</span>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={quality}
                  onChange={e => setQuality(parseFloat(e.target.value))}
                  className="w-24 accent-purple-500"
                />
                <span className="font-mono text-purple-300">{Math.round(quality * 100)}%</span>
              </div>
            )}

            <Button variant="primary" size="sm" onClick={download}>
              Download Converted File
            </Button>
          </div>

          {outputUrl && (
            <div className="flex justify-center p-4 rounded-xl bg-black/40">
              <img src={outputUrl} alt="Converted" className="max-h-72 object-contain rounded-lg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── 7. Image Metadata & EXIF Viewer ─────────────────────────────────────────
export function ImageMetadataTool() {
  const [metadata, setMetadata] = useState<{
    name: string;
    size: string;
    type: string;
    width: number;
    height: number;
    aspectRatio: string;
    lastModified: string;
    exif: Record<string, string>;
  } | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;
    await new Promise(r => { img.onload = r; });

    // Read ArrayBuffer for EXIF
    const buf = await file.arrayBuffer();
    const view = new DataView(buf);
    const exifTags: Record<string, string> = {};

    try {
      // Simple EXIF tag scanner for JPEG
      if (view.getUint16(0, false) === 0xFFD8) {
        let offset = 2;
        while (offset < view.byteLength) {
          const marker = view.getUint16(offset, false);
          offset += 2;
          if (marker === 0xFFE1) {
            // APP1 marker (EXIF)
            view.getUint16(offset, false);
            const exifHeader = view.getUint32(offset + 2, false);
            if (exifHeader === 0x45786966) { // "Exif"
              exifTags['EXIF Status'] = 'EXIF Block Detected';
            }
            break;
          } else if ((marker & 0xFF00) !== 0xFF00) {
            break;
          } else {
            offset += view.getUint16(offset, false);
          }
        }
      }
    } catch {
      // EXIF parsing failure is non-fatal
    }

    setMetadata({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB (${file.size.toLocaleString()} bytes)`,
      type: file.type || 'Unknown',
      width: img.naturalWidth,
      height: img.naturalHeight,
      aspectRatio: `${(img.naturalWidth / img.naturalHeight).toFixed(2)} : 1`,
      lastModified: new Date(file.lastModified).toUTCString(),
      exif: exifTags,
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center">
        <input type="file" id="meta-upload" accept="image/*" onChange={handleFile} className="hidden" />
        <label htmlFor="meta-upload" className="cursor-pointer block">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] block">
            Upload an image to inspect technical metadata
          </span>
          <span className="text-xs text-[var(--color-text-muted)] mt-1 block">
            Inspect dimensions, MIME type, aspect ratio, byte size, and EXIF flags
          </span>
        </label>
      </div>

      {metadata && (
        <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
          <div className="px-5 py-3 bg-[var(--color-surface-raised)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-purple-300">
            TECHNICAL IMAGE METRICS
          </div>
          <div className="p-5 font-mono text-xs divide-y divide-[var(--color-border-subtle)]/40">
            {[
              ['File Name', metadata.name],
              ['MIME Type', metadata.type],
              ['File Size', metadata.size],
              ['Resolution', `${metadata.width} × ${metadata.height} pixels`],
              ['Aspect Ratio', metadata.aspectRatio],
              ['Last Modified', metadata.lastModified],
            ].map(([k, v]) => (
              <div key={k} className="py-2.5 flex items-center justify-between">
                <span className="text-[var(--color-text-muted)]">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
