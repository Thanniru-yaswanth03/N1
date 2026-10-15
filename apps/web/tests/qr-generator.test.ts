import { describe, it, expect } from 'vitest';
import { getToolBySlug } from '../src/lib/tools-data';
import QRCode from 'qrcode';

describe('QR Code Generator Tool Specifications & Parity', () => {
  it('registers qr-code-generator in TOOLS catalog', () => {
    const tool = getToolBySlug('qr-code-generator');
    expect(tool).toBeDefined();
    expect(tool?.title).toBe('QR Code Generator');
    expect(tool?.slug).toBe('qr-code-generator');
    expect(tool?.category).toBe('image');
    expect(tool?.tags).toContain('qr');
    expect(tool?.tags).toContain('qr code');
    expect(tool?.tags).toContain('svg');
    expect(tool?.tags).toContain('png');
  });

  it('supports qr-generator as a backwards-compatible alias', () => {
    const tool = getToolBySlug('qr-generator');
    expect(tool).toBeDefined();
    expect(tool?.slug).toBe('qr-code-generator');
  });

  it('generates valid PNG Data URLs across error correction levels', async () => {
    const payload = 'https://n1.io/d/TEST12';
    const levels: Array<'L' | 'M' | 'Q' | 'H'> = ['L', 'M', 'Q', 'H'];

    for (const lvl of levels) {
      const dataUrl = await QRCode.toDataURL(payload, {
        errorCorrectionLevel: lvl,
        width: 320,
        margin: 2,
        color: { dark: '#F0F0F8', light: '#111118' },
      });
      expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
      expect(dataUrl.length).toBeGreaterThan(100);
    }
  });

  it('generates valid SVG vector strings with custom colors', async () => {
    const payload = 'WIFI:S:TestNet;T:WPA;P:Password123;;';
    const fg = '#C084FC';
    const bg = '#0F091E';

    const svg = await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      color: { dark: fg, light: bg },
    });

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>\n') || svg.endsWith('</svg>')).toBe(true);
    expect(svg.includes(fg)).toBe(true);
    expect(svg.includes(bg)).toBe(true);
  });
});
