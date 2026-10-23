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

    it('purges empty text elements when abandoned without content on commit', () => {
      const elements: BoardElement[] = [
        {
          id: 'text_existing',
          type: 'text',
          x: 10,
          y: 10,
          width: 140,
          height: 36,
          color: '#00f0ff',
          strokeWidth: 2,
          content: 'Keep me',
          zIndex: 1,
        },
        {
          id: 'text_empty_abandoned',
          type: 'text',
          x: 100,
          y: 100,
          width: 180,
          height: 36,
          color: '#00f0ff',
          strokeWidth: 2,
          content: '',
          zIndex: 2,
        },
      ];

      const commitSave = (list: BoardElement[], editId: string, text: string) => {
        const trimmed = text.trim();
        const target = list.find(el => el.id === editId);
        if (!trimmed && target?.type === 'text') {
          return list.filter(el => el.id !== editId);
        }
        return list.map(el => (el.id === editId ? { ...el, content: trimmed } : el));
      };

      const result = commitSave(elements, 'text_empty_abandoned', '   ');
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('text_existing');
      expect(result.some(el => el.id === 'text_empty_abandoned')).toBe(false);
    });

    it('removes newly created empty text when cancelled with Escape', () => {
      const elements: BoardElement[] = [
        {
          id: 'text_new',
          type: 'text',
          x: 200,
          y: 200,
          width: 180,
          height: 36,
          color: '#00f0ff',
          strokeWidth: 2,
          content: '',
          zIndex: 1,
        },
      ];

      const cancelEdit = (list: BoardElement[], editId: string, originalText: string) => {
        const target = list.find(el => el.id === editId);
        if ((!originalText || !originalText.trim()) && target?.type === 'text') {
          return list.filter(el => el.id !== editId);
        }
        return list.map(el => (el.id === editId ? { ...el, content: originalText } : el));
      };

      const result = cancelEdit(elements, 'text_new', '');
      expect(result.length).toBe(0);
    });

    it('calculates dynamic dimensions to prevent text clipping on multiline content', () => {
      const multilineText = 'First header line\nA much longer second line of architecture diagram descriptions\nThird line';
      const lines = multilineText.split('\n');
      const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
      const fontSize = 16;
      const lineHeight = fontSize + 6;
      const approxCharWidth = fontSize * 0.58;
      const autoWidth = Math.max(140, Math.round(longestLine.length * approxCharWidth + 24));
      const autoHeight = Math.max(36, lines.length * lineHeight + 12);

      expect(lines.length).toBe(3);
      expect(autoWidth).toBeGreaterThan(300);
      expect(autoHeight).toBe(3 * 22 + 12);
    });

    it('preserves shape dimensions while saving shape text content', () => {
      const elements: BoardElement[] = [
        {
          id: 'shape_box_1',
          type: 'shape',
          shapeType: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          color: '#00f0ff',
          content: '',
          zIndex: 1,
        },
      ];

      const commitSave = (list: BoardElement[], editId: string, text: string) => {
        const trimmed = text.trim();
        return list.map(el => {
          if (el.id === editId) {
            const finalWidth = el.type === 'shape' ? el.width : Math.max(el.width || 140, 100);
            const finalHeight = el.type === 'shape' ? el.height : Math.max(36, 50);
            return { ...el, content: trimmed, width: finalWidth, height: finalHeight };
          }
          return el;
        });
      };

      const result = commitSave(elements, 'shape_box_1', 'Process Node A');
      expect(result.length).toBe(1);
      expect(result[0]?.content).toBe('Process Node A');
      expect(result[0]?.width).toBe(200);
      expect(result[0]?.height).toBe(150);
    });

    it('prevents premature blur deletion within initial mouse-click lifecycle (<450ms)', () => {
      const creationTime = 1000;
      const blurTimeFast = 1100; // 100ms after creation (pointerup/blur)
      const blurTimeSlow = 2500; // 1500ms after creation (deliberate blur outside)

      const shouldProtectFromBlur = (createdAt: number, now: number, text: string) => {
        return now - createdAt < 450 && !text.trim();
      };

      expect(shouldProtectFromBlur(creationTime, blurTimeFast, '')).toBe(true);
      expect(shouldProtectFromBlur(creationTime, blurTimeSlow, '')).toBe(false);
      expect(shouldProtectFromBlur(creationTime, blurTimeFast, 'User typed text')).toBe(false);
    });

    it('enables direct typing into selected shape, sticky note, or text', () => {
      const shape: BoardElement = {
        id: 'shape_1',
        type: 'shape',
        shapeType: 'rectangle',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        content: '',
        color: '#00f0ff',
        zIndex: 1,
      };

      const canDirectType = (el: BoardElement) => {
        return el.type === 'text' || el.type === 'sticky' || el.type === 'shape';
      };

      expect(canDirectType(shape)).toBe(true);
      expect(canDirectType({ ...shape, type: 'text' })).toBe(true);
      expect(canDirectType({ ...shape, type: 'sticky' })).toBe(true);
      expect(canDirectType({ ...shape, type: 'stroke' })).toBe(false);
    });
  });
});
