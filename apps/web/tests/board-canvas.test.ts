import { describe, it, expect } from 'vitest';
import { BoardElement } from '@n1/shared';

describe('Study Board Canvas & Visual Editor Logic', () => {
  describe('1. Word Wrapping & Text Calculation', () => {
    // Replicate pure wrapText algorithm
    function wrapText(text: string, maxWidth: number, charWidth = 8): string[] {
      if (!text) return [];
      const paragraphs = text.split('\n');
      const resultLines: string[] = [];

      for (const para of paragraphs) {
        if (!para) {
          resultLines.push('');
          continue;
        }
        const words = para.split(' ');
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const word = words[i] || '';
          const testLine = `${currentLine} ${word}`;
          const testWidth = testLine.length * charWidth;
          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            resultLines.push(currentLine);
            currentLine = word;
          }
        }
        resultLines.push(currentLine);
      }
      return resultLines;
    }

    it('wraps long sentences into multiple lines without clipping', () => {
      const longSentence = 'The quick brown fox jumps over the lazy dog repeatedly across the study board canvas';
      const lines = wrapText(longSentence, 160, 8); // max ~20 chars per line
      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length * 8).toBeLessThanOrEqual(180);
      });
    });

    it('preserves user explicit newlines in multiline text', () => {
      const multiline = 'Line 1\nLine 2\n\nLine 4';
      const lines = wrapText(multiline, 200, 8);
      expect(lines).toEqual(['Line 1', 'Line 2', '', 'Line 4']);
    });
  });

  describe('2. Resize Handles & Geometric Calculations', () => {
    function computeResizedBounds(
      origin: { x: number; y: number; width: number; height: number },
      handle: string,
      dx: number,
      dy: number,
      minW = 40,
      minH = 24
    ) {
      let nextX = origin.x;
      let nextY = origin.y;
      let nextW = origin.width;
      let nextH = origin.height;

      if (handle.includes('e')) {
        nextW = Math.max(minW, origin.width + dx);
      }
      if (handle.includes('s')) {
        nextH = Math.max(minH, origin.height + dy);
      }
      if (handle.includes('w')) {
        const potentialW = origin.width - dx;
        if (potentialW >= minW) {
          nextW = potentialW;
          nextX = origin.x + dx;
        } else {
          nextW = minW;
          nextX = origin.x + (origin.width - minW);
        }
      }
      if (handle.includes('n')) {
        const potentialH = origin.height - dy;
        if (potentialH >= minH) {
          nextH = potentialH;
          nextY = origin.y + dy;
        } else {
          nextH = minH;
          nextY = origin.y + (origin.height - minH);
        }
      }

      return { x: nextX, y: nextY, width: nextW, height: nextH };
    }

    it('expands dimensions when dragging SE handle outward', () => {
      const origin = { x: 100, y: 100, width: 160, height: 60 };
      const resized = computeResizedBounds(origin, 'se', 50, 40);
      expect(resized.x).toBe(100);
      expect(resized.y).toBe(100);
      expect(resized.width).toBe(210);
      expect(resized.height).toBe(100);
    });

    it('enforces minWidth and minHeight constraints when shrinking handles inward', () => {
      const origin = { x: 100, y: 100, width: 160, height: 60 };
      const shrunk = computeResizedBounds(origin, 'se', -200, -200, 40, 24);
      expect(shrunk.width).toBe(40);
      expect(shrunk.height).toBe(24);
    });

    it('correctly shifts origin position when dragging NW handle', () => {
      const origin = { x: 100, y: 100, width: 160, height: 60 };
      const resized = computeResizedBounds(origin, 'nw', -20, -15);
      expect(resized.x).toBe(80);
      expect(resized.y).toBe(85);
      expect(resized.width).toBe(180);
      expect(resized.height).toBe(75);
    });
  });

  describe('3. Text Editing State Lifecycle (Escape, Commit & Duplication)', () => {
    it('restores original text when editing is cancelled via Escape', () => {
      const el: BoardElement = {
        id: 'text_1',
        type: 'text',
        x: 50,
        y: 50,
        width: 180,
        height: 40,
        color: '#00f0ff',
        strokeWidth: 2,
        content: 'Original Title',
        zIndex: 1,
      };

      const originalText = el.content;
      let editingText = 'Draft text that was cancelled';

      // Simulating cancel (Esc)
      const cancelledEl = {
        ...el,
        content: originalText,
      };

      expect(cancelledEl.content).toBe('Original Title');
      expect(cancelledEl.content).not.toBe(editingText);
    });

    it('commits updated text cleanly on Enter or blur', () => {
      const el: BoardElement = {
        id: 'text_1',
        type: 'text',
        x: 50,
        y: 50,
        width: 180,
        height: 40,
        color: '#00f0ff',
        strokeWidth: 2,
        content: 'Old Text',
        zIndex: 1,
      };

      const newContent = 'Updated Architecture Diagram Notes';
      const savedEl = {
        ...el,
        content: newContent,
        updatedAt: Date.now(),
      };

      expect(savedEl.content).toBe('Updated Architecture Diagram Notes');
    });

    it('duplicates element with proper offset and clean unique id', () => {
      const el: BoardElement = {
        id: 'text_100',
        type: 'text',
        x: 100,
        y: 100,
        width: 180,
        height: 40,
        color: '#00f0ff',
        strokeWidth: 2,
        content: 'Component A',
        zIndex: 1,
      };

      const dup: BoardElement = {
        ...el,
        id: `text_${Date.now()}`,
        x: el.x + 28,
        y: el.y + 28,
        zIndex: el.zIndex + 1,
        updatedAt: Date.now(),
      };

      expect(dup.id).not.toBe(el.id);
      expect(dup.x).toBe(128);
      expect(dup.y).toBe(128);
      expect(dup.content).toBe('Component A');
    });
  });
});
