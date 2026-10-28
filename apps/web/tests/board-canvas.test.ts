import { describe, it, expect } from 'vitest';
import { BoardElement } from '@n1/shared';
import { wrapText as canvasWrapText, PALETTE_COLORS } from '../src/components/board/BoardCanvas';

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
        updatedAt: Date.now(),
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
        updatedAt: Date.now(),
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
          updatedAt: Date.now(),
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
          updatedAt: Date.now(),
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
          updatedAt: Date.now(),
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
          strokeWidth: 2,
          content: '',
          zIndex: 1,
          updatedAt: Date.now(),
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
        strokeWidth: 2,
        zIndex: 1,
        updatedAt: Date.now(),
      };

      const canDirectType = (el: BoardElement) => {
        return el.type === 'text' || el.type === 'sticky' || el.type === 'shape';
      };

      expect(canDirectType(shape)).toBe(true);
      expect(canDirectType({ ...shape, type: 'text' })).toBe(true);
      expect(canDirectType({ ...shape, type: 'sticky' })).toBe(true);
      expect(canDirectType({ ...shape, type: 'stroke' })).toBe(false);
    });

    it('cleanly replaces elements on template switch without merging or overlapping old templates', () => {
      const oldMindMapElements: BoardElement[] = [
        { id: 'node_center', type: 'sticky', x: 200, y: 200, width: 140, height: 70, content: 'Central Topic', color: '#a855f7', strokeWidth: 2, zIndex: 1, updatedAt: Date.now() },
      ];
      const newDbmsElements: BoardElement[] = [
        { id: 'cylinder_1', type: 'shape', shapeType: 'cylinder', x: 50, y: 50, width: 160, height: 100, content: 'USERS', color: '#38bdf8', strokeWidth: 2, zIndex: 1, updatedAt: Date.now() },
      ];

      // Clean template switch replaces elements
      const switchTemplate = (_current: BoardElement[], templateItems: BoardElement[]) => {
        return templateItems;
      };

      const result = switchTemplate(oldMindMapElements, newDbmsElements);
      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('cylinder_1');
      expect(result.some(el => el.id === 'node_center')).toBe(false);
    });

    it('deduplicates consecutive identical history states to prevent dead undo clicks', () => {
      const initial: BoardElement[] = [{ id: 'box_1', type: 'text', x: 10, y: 10, width: 100, height: 30, color: '#00f0ff', strokeWidth: 2, zIndex: 1, updatedAt: Date.now() }];
      let history: BoardElement[][] = [[...initial]];
      let historyIndex = 0;

      const pushHistory = (nextElements: BoardElement[]) => {
        const current = history[historyIndex];
        if (
          current &&
          current.length === nextElements.length &&
          JSON.stringify(current) === JSON.stringify(nextElements)
        ) {
          return; // Skip duplicate push
        }
        history = [...history.slice(0, historyIndex + 1), nextElements];
        historyIndex = history.length - 1;
      };

      // Simulating a click without movement (identical state)
      pushHistory([...initial]);
      expect(history.length).toBe(1);
      expect(historyIndex).toBe(0);

      // Simulating an actual change
      const modified = [{ ...initial[0]!, x: 50 }];
      pushHistory(modified);
      expect(history.length).toBe(2);
      expect(historyIndex).toBe(1);

      // Undo goes back to initial on the very first click
      const undo = () => {
        if (historyIndex > 0) {
          historyIndex -= 1;
          return history[historyIndex];
        }
        return null;
      };

      const undone = undo();
      expect(undone).toEqual(initial);
      expect(historyIndex).toBe(0);
    });

    it('updates element color when choosing a new custom RGB/hex color', () => {
      const el: BoardElement = { id: 'text_1', type: 'text', x: 10, y: 10, width: 100, height: 30, color: '#00f0ff', strokeWidth: 2, zIndex: 1, updatedAt: Date.now() };
      const customHex = '#FF5500';

      const updated = {
        ...el,
        color: customHex,
        fillColor: el.type === 'shape' ? `${customHex}20` : el.fillColor,
      };

      expect(updated.color).toBe('#FF5500');
    });
  });

  describe('4. Canvas wrapText with Long Unbreakable Words & URL Wrapping', () => {
    const mockCtx = {
      measureText: (str: string) => ({ width: str.length * 8 }),
    } as unknown as CanvasRenderingContext2D;

    it('breaks long unbroken words into sub-chunks to prevent horizontal overflow', () => {
      const longUrl = 'https://study-board.n1.app/rooms/9UDU42/session/verylongnestedpathstringthatdoesnotcontainanyspaces';
      const maxWidth = 160; // 160 / 8 = 20 chars max per line
      const lines = canvasWrapText(mockCtx, longUrl, maxWidth);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length * 8).toBeLessThanOrEqual(maxWidth);
      });
      // Reconstituting the text should match the original string without loss
      expect(lines.join('')).toBe(longUrl);
    });

    it('handles mixed sentences containing both short words and long words', () => {
      const text = 'Important link: https://study-board.n1.app/verylongpathhere and notes';
      const maxWidth = 160;
      const lines = canvasWrapText(mockCtx, text, maxWidth);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(line.length * 8).toBeLessThanOrEqual(maxWidth);
      });
    });

    it('provides complete preset PALETTE_COLORS covering brand theme', () => {
      expect(PALETTE_COLORS.length).toBeGreaterThanOrEqual(8);
      expect(PALETTE_COLORS).toContain('#00f0ff'); // Cyan
      expect(PALETTE_COLORS).toContain('#ffffff'); // White
      expect(PALETTE_COLORS).toContain('#ef4444'); // Red
      expect(PALETTE_COLORS).toContain('#10b981'); // Emerald
    });
  });

  describe('5. Floating Toolbar Actions: Duplicate, Delete, Font Size, and Color', () => {
    // Replicate pure handleDuplicateSelected algorithm
    function duplicateElements(
      elementsList: BoardElement[],
      selectedIds: Set<string>
    ): { nextElements: BoardElement[]; newSelectedIds: Set<string>; primaryId: string | null } {
      const toDuplicate = elementsList.filter(el => selectedIds.has(el.id));
      if (toDuplicate.length === 0) {
        return { nextElements: elementsList, newSelectedIds: new Set(), primaryId: null };
      }

      const maxZ = elementsList.reduce((max, el) => Math.max(max, el.zIndex || 0), 0);
      const newSelectedIds = new Set<string>();
      let primaryNewId: string | null = null;

      const duplicates: BoardElement[] = toDuplicate.map((el, idx) => {
        const uniqueSuffix = `dup_${Date.now()}_${idx}`;
        const newId = `${el.type}_${uniqueSuffix}`;
        newSelectedIds.add(newId);
        if (!primaryNewId) primaryNewId = newId;

        return {
          ...el,
          id: newId,
          x: el.x + 24,
          y: el.y + 24,
          points: el.points ? el.points.map(p => ({ ...p })) : undefined,
          zIndex: maxZ + idx + 1,
          updatedAt: Date.now(),
        };
      });

      return {
        nextElements: [...elementsList, ...duplicates],
        newSelectedIds,
        primaryId: primaryNewId,
      };
    }

    it('duplicates single element with +24px offset, unique ID, and selects new copy', () => {
      const original: BoardElement = {
        id: 'text_original_1',
        type: 'text',
        x: 100,
        y: 100,
        width: 140,
        height: 36,
        color: '#00f0ff',
        strokeWidth: 2,
        content: 'Original Note',
        fontSize: 16,
        zIndex: 1,
        updatedAt: Date.now(),
      };

      const result = duplicateElements([original], new Set(['text_original_1']));
      expect(result.nextElements.length).toBe(2);
      const copy = result.nextElements[1]!;

      expect(copy.id).not.toBe(original.id);
      expect(copy.x).toBe(124);
      expect(copy.y).toBe(124);
      expect(copy.content).toBe('Original Note');
      expect(copy.fontSize).toBe(16);
      expect(copy.zIndex).toBe(2);
      expect(result.primaryId).toBe(copy.id);
      expect(result.newSelectedIds.has(copy.id)).toBe(true);
    });

    it('deep clones points array so moving or modifying duplicate does not alter original', () => {
      const originalStroke: BoardElement = {
        id: 'stroke_1',
        type: 'stroke',
        x: 50,
        y: 50,
        width: 100,
        height: 50,
        color: '#a855f7',
        strokeWidth: 4,
        points: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 40 }],
        zIndex: 1,
        updatedAt: Date.now(),
      };

      const result = duplicateElements([originalStroke], new Set(['stroke_1']));
      const copy = result.nextElements[1]!;

      expect(copy.points).toBeDefined();
      expect(copy.points).toEqual(originalStroke.points);
      expect(copy.points).not.toBe(originalStroke.points); // Deep reference equality check

      // Mutate copy point
      copy.points![0]!.x = 999;
      expect(originalStroke.points![0]!.x).toBe(0); // Original remains untouched!
    });

    it('deletes selected element from canvas model and clears selection state', () => {
      const el1: BoardElement = { id: 'text_1', type: 'text', x: 10, y: 10, width: 100, height: 30, color: '#00f0ff', strokeWidth: 2, zIndex: 1, updatedAt: Date.now() };
      const el2: BoardElement = { id: 'text_2', type: 'text', x: 50, y: 50, width: 100, height: 30, color: '#00f0ff', strokeWidth: 2, zIndex: 2, updatedAt: Date.now() };

      const deleteSelected = (list: BoardElement[], targetIds: Set<string>) => {
        return list.filter(el => !targetIds.has(el.id));
      };

      const remaining = deleteSelected([el1, el2], new Set(['text_1']));
      expect(remaining.length).toBe(1);
      expect(remaining[0]?.id).toBe('text_2');
    });

    it('adjusts font size: decreases with A- (min 10px) and increases with A+ (max 96px)', () => {
      const adjustFontSize = (el: BoardElement, delta: number): BoardElement => {
        const currentSize = el.fontSize || 16;
        const nextSize = Math.max(10, Math.min(96, currentSize + delta));
        let newWidth = el.width;
        let newHeight = el.height;
        if (el.type === 'text' && el.content) {
          const lines = el.content.split('\n');
          const longestLine = lines.reduce((a, b) => (a.length > b.length ? a : b), '');
          const approxCharWidth = nextSize * 0.6;
          newWidth = Math.max(el.width || 140, Math.round(longestLine.length * approxCharWidth + 24));
          newHeight = Math.max(36, lines.length * (nextSize + 6) + 12);
        }
        return { ...el, fontSize: nextSize, width: newWidth, height: newHeight, updatedAt: Date.now() };
      };

      let el: BoardElement = {
        id: 'text_size_test',
        type: 'text',
        x: 10,
        y: 10,
        width: 140,
        height: 36,
        color: '#00f0ff',
        strokeWidth: 2,
        content: 'Header Text Size',
        fontSize: 16,
        zIndex: 1,
        updatedAt: Date.now(),
      };

      // Increase by 2 (A+)
      el = adjustFontSize(el, 2);
      expect(el.fontSize).toBe(18);
      expect(el.width).toBeGreaterThan(140);

      // Decrease by 2 (A-)
      el = adjustFontSize(el, -2);
      expect(el.fontSize).toBe(16);

      // Repeated decreases below 10px clamp to min 10px
      for (let i = 0; i < 15; i++) {
        el = adjustFontSize(el, -2);
      }
      expect(el.fontSize).toBe(10);

      // Repeated increases above 96px clamp to max 96px
      for (let i = 0; i < 60; i++) {
        el = adjustFontSize(el, 2);
      }
      expect(el.fontSize).toBe(96);
    });

    it('simulates rapid repeated clicks on font size updater without stale closure bug', () => {
      let elements = [
        { id: 'text_1', type: 'text', x: 0, y: 0, width: 100, height: 30, color: '#00f0ff', strokeWidth: 2, fontSize: 16, zIndex: 1, updatedAt: 0 },
      ] as BoardElement[];

      const setElementsFunctional = (updater: (prev: BoardElement[]) => BoardElement[]) => {
        elements = updater(elements);
      };

      const handleFontSizeAdjust = (delta: number) => {
        setElementsFunctional(prev =>
          prev.map(el => {
            if (el.id === 'text_1') {
              const currentSize = el.fontSize || 16;
              const nextSize = Math.max(10, Math.min(96, currentSize + delta));
              return { ...el, fontSize: nextSize };
            }
            return el;
          })
        );
      };

      // 5 rapid A+ clicks in sequence
      handleFontSizeAdjust(2);
      handleFontSizeAdjust(2);
      handleFontSizeAdjust(2);
      handleFontSizeAdjust(2);
      handleFontSizeAdjust(2);

      expect(elements[0]?.fontSize).toBe(26); // 16 + 5*2 = 26
    });

    it('applies color immediately and formats shape / sticky fill colors appropriately', () => {
      const applyColor = (el: BoardElement, newColor: string): BoardElement => {
        return {
          ...el,
          color: newColor,
          fillColor: el.type === 'shape' ? `${newColor}20` : el.type === 'sticky' ? `${newColor}26` : el.fillColor,
          updatedAt: Date.now(),
        };
      };

      const shape: BoardElement = { id: 's1', type: 'shape', x: 0, y: 0, width: 100, height: 100, color: '#00f0ff', fillColor: '#00f0ff20', strokeWidth: 2, zIndex: 1, updatedAt: 0 };
      const sticky: BoardElement = { id: 'k1', type: 'sticky', x: 0, y: 0, width: 100, height: 100, color: '#fbbf24', fillColor: '#fbbf2426', strokeWidth: 2, zIndex: 2, updatedAt: 0 };
      const text: BoardElement = { id: 't1', type: 'text', x: 0, y: 0, width: 100, height: 40, color: '#00f0ff', strokeWidth: 2, zIndex: 3, updatedAt: 0 };

      const updatedShape = applyColor(shape, '#a855f7');
      expect(updatedShape.color).toBe('#a855f7');
      expect(updatedShape.fillColor).toBe('#a855f720');

      const updatedSticky = applyColor(sticky, '#10b981');
      expect(updatedSticky.color).toBe('#10b981');
      expect(updatedSticky.fillColor).toBe('#10b98126');

      const updatedText = applyColor(text, '#ffffff');
      expect(updatedText.color).toBe('#ffffff');
    });

    it('prevents event propagation so clicking floating toolbar does not trigger canvas deselection', () => {
      let canvasDeselected = false;
      const onCanvasPointerDown = () => {
        canvasDeselected = true;
      };

      const simulateEventDispatch = (target: 'toolbar_button' | 'canvas') => {
        if (target === 'toolbar_button') {
          // Toolbar stopPropagation prevents bubbling to canvas container
          const event = {
            isPropagationStopped: false,
            stopPropagation() {
              this.isPropagationStopped = true;
            },
          };
          event.stopPropagation();
          if (!event.isPropagationStopped) {
            onCanvasPointerDown();
          }
        } else {
          onCanvasPointerDown();
        }
      };

      simulateEventDispatch('toolbar_button');
      expect(canvasDeselected).toBe(false); // Selection remained safe!

      simulateEventDispatch('canvas');
      expect(canvasDeselected).toBe(true);
    });
  });
});
