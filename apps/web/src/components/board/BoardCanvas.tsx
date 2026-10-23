'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BoardElement, BoardPoint, BoardShapeType, ConnectedBoardUser } from '@n1/shared';
import { CanvasTool } from './BoardToolbar';

export interface BoardCanvasProps {
  elements: BoardElement[];
  setElements: React.Dispatch<React.SetStateAction<BoardElement[]>>;
  activeTool: CanvasTool;
  setActiveTool?: (tool: CanvasTool) => void;
  activeColor: string;
  strokeWidth: number;
  activeShape: BoardShapeType;
  zoom: number;
  setZoom: (fn: (prev: number) => number) => void;
  peerUsers: ConnectedBoardUser[];
  onElementsChange?: (elements: BoardElement[]) => void;
  onCursorMove?: (x: number, y: number) => void;
  onHistoryPush?: (elements: BoardElement[]) => void;
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface HandleInfo {
  id: ResizeHandle;
  x: number;
  y: number;
  cursor: string;
}

// Word wrapping helper for canvas text rendering
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
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
      const metrics = ctx.measureText(testLine);
      if (metrics.width <= maxWidth) {
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

export function BoardCanvas({
  elements,
  setElements,
  activeTool,
  setActiveTool,
  activeColor,
  strokeWidth,
  activeShape,
  zoom,
  setZoom,
  peerUsers,
  onElementsChange,
  onCursorMove,
  onHistoryPush,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Pan offsets
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Multi-touch & pointer tracking
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(zoom);

  // Selection state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartMap, setDragStartMap] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Resizing state
  const [resizingHandle, setResizingHandle] = useState<ResizeHandle | null>(null);
  const [resizeOrigin, setResizeOrigin] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle | null>(null);

  // In-place text/sticky editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingOriginalText, setEditingOriginalText] = useState('');

  // Active drawing stroke / shape
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<BoardPoint[]>([]);
  const [drawStart, setDrawStart] = useState<BoardPoint>({ x: 0, y: 0 });

  // Area Eraser Box
  const [isAreaErasing, setIsAreaErasing] = useState(false);
  const [areaEraseBox, setAreaEraseBox] = useState<{ start: BoardPoint; current: BoardPoint } | null>(null);

  // Synchronize selectedId with selectedIds set
  useEffect(() => {
    if (selectedId) {
      setSelectedIds(prev => (prev.has(selectedId) ? prev : new Set([selectedId])));
    } else {
      setSelectedIds(new Set());
    }
  }, [selectedId]);

  // Convert screen coordinates to canvas world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number): BoardPoint => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: screenX, y: screenY };
      const rawX = screenX - rect.left;
      const rawY = screenY - rect.top;
      return {
        x: (rawX - pan.x) / zoom,
        y: (rawY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Get 8 resize handles for an element
  const getHandles = useCallback((el: BoardElement): HandleInfo[] => {
    const w = el.width || 40;
    const h = el.height || 40;
    const x = el.x;
    const y = el.y;

    return [
      { id: 'nw', x, y, cursor: 'nwse-resize' },
      { id: 'n', x: x + w / 2, y, cursor: 'ns-resize' },
      { id: 'ne', x: x + w, y, cursor: 'nesw-resize' },
      { id: 'e', x: x + w, y: y + h / 2, cursor: 'ew-resize' },
      { id: 'se', x: x + w, y: y + h, cursor: 'nwse-resize' },
      { id: 's', x: x + w / 2, y: y + h, cursor: 'ns-resize' },
      { id: 'sw', x, y: y + h, cursor: 'nesw-resize' },
      { id: 'w', x, y: y + h / 2, cursor: 'ew-resize' },
    ];
  }, []);

  // Find handle under world coordinate
  const findHandleAt = useCallback(
    (world: BoardPoint, el: BoardElement): HandleInfo | null => {
      const radius = 10 / zoom;
      const handles = getHandles(el);
      for (const h of handles) {
        if (Math.hypot(world.x - h.x, world.y - h.y) <= radius) {
          return h;
        }
      }
      return null;
    },
    [getHandles, zoom]
  );

  // Find element at world coordinate
  const findElementAt = useCallback(
    (point: BoardPoint): BoardElement | null => {
      const hitPadding = 8;
      for (let i = elements.length - 1; i >= 0; i--) {
        const el = elements[i];
        if (!el) continue;

        if (el.type === 'stroke' && el.points && el.points.length > 0) {
          for (const p of el.points) {
            const dx = el.x + p.x - point.x;
            const dy = el.y + p.y - point.y;
            if (Math.hypot(dx, dy) < 16) {
              return el;
            }
          }
        } else if (el.type === 'arrow' || el.type === 'line') {
          const minX = Math.min(el.x, el.x + el.width) - hitPadding;
          const maxX = Math.max(el.x, el.x + el.width) + hitPadding;
          const minY = Math.min(el.y, el.y + el.height) - hitPadding;
          const maxY = Math.max(el.y, el.y + el.height) + hitPadding;
          if (point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY) {
            return el;
          }
        } else {
          const w = Math.max(30, el.width || 40);
          const h = Math.max(24, el.height || 40);
          if (
            point.x >= el.x - hitPadding &&
            point.x <= el.x + w + hitPadding &&
            point.y >= el.y - hitPadding &&
            point.y <= el.y + h + hitPadding
          ) {
            return el;
          }
        }
      }
      return null;
    },
    [elements]
  );

  // Check if an element intersects a rectangular bounding box
  const isElementInBox = useCallback(
    (
      el: BoardElement,
      minX: number,
      minY: number,
      maxX: number,
      maxY: number
    ): boolean => {
      if (el.type === 'stroke' && el.points && el.points.length > 0) {
        for (const p of el.points) {
          const px = el.x + p.x;
          const py = el.y + p.y;
          if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
            return true;
          }
        }
        return el.x >= minX && el.x <= maxX && el.y >= minY && el.y <= maxY;
      } else {
        const w = el.width || 40;
        const h = el.height || 40;
        return (
          el.x <= maxX &&
          el.x + w >= minX &&
          el.y <= maxY &&
          el.y + h >= minY
        );
      }
    },
    []
  );

  // Start in-place editing on an element
  const startEditing = useCallback(
    (el: BoardElement, initialText?: string) => {
      setEditingId(el.id);
      setSelectedId(el.id);
      const textToUse = initialText !== undefined ? initialText : el.content || '';
      setEditingText(textToUse);
      setEditingOriginalText(el.content || '');
      setActiveTool?.('select');
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 30);
    },
    [setActiveTool]
  );

  // Save inline text editing
  const saveEditing = useCallback(() => {
    if (!editingId) return;

    setElements(prev => {
      const next = prev.map(el => {
        if (el.id === editingId) {
          const trimmed = editingText.trim();
          // If empty, keep placeholder content or leave blank with min dimensions
          return {
            ...el,
            content: trimmed,
            updatedAt: Date.now(),
          };
        }
        return el;
      });
      onElementsChange?.(next);
      onHistoryPush?.(next);
      return next;
    });

    setEditingId(null);
    setEditingText('');
    setEditingOriginalText('');
  }, [editingId, editingText, onElementsChange, onHistoryPush, setElements]);

  // Cancel inline text editing without saving
  const cancelEditing = useCallback(() => {
    if (!editingId) return;

    setElements(prev =>
      prev.map(el => {
        if (el.id === editingId) {
          return {
            ...el,
            content: editingOriginalText,
            updatedAt: Date.now(),
          };
        }
        return el;
      })
    );

    setEditingId(null);
    setEditingText('');
    setEditingOriginalText('');
  }, [editingId, editingOriginalText, setElements]);

  // Resize canvas to fill container with devicePixelRatio
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fit to screen calculation listener
  useEffect(() => {
    const handleFitToScreen = () => {
      if (elements.length === 0) {
        setPan({ x: 0, y: 0 });
        setZoom(() => 1.0);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      elements.forEach(el => {
        const x = el.x;
        const y = el.y;
        const w = el.width || 100;
        const h = el.height || 60;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + w);
        maxY = Math.max(maxY, y + h);
      });

      const dpr = window.devicePixelRatio || 1;
      const viewW = canvas.width / dpr;
      const viewH = canvas.height / dpr;
      const contentW = Math.max(100, maxX - minX);
      const contentH = Math.max(100, maxY - minY);
      const padding = 60;

      const scaleX = (viewW - padding * 2) / contentW;
      const scaleY = (viewH - padding * 2) / contentH;
      const nextZoom = Math.min(2.0, Math.max(0.25, Math.min(scaleX, scaleY)));

      const centerX = minX + contentW / 2;
      const centerY = minY + contentH / 2;
      const nextPanX = viewW / 2 - centerX * nextZoom;
      const nextPanY = viewH / 2 - centerY * nextZoom;

      setZoom(() => Math.round(nextZoom * 100) / 100);
      setPan({ x: nextPanX, y: nextPanY });
    };

    window.addEventListener('n1:board-fit-screen', handleFitToScreen);
    return () => window.removeEventListener('n1:board-fit-screen', handleFitToScreen);
  }, [elements, setZoom]);

  // Comprehensive keyboard listeners with text-input protection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        Boolean(editingId);

      // Keys handled when typing inside active in-place textarea
      if (editingId) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelEditing();
          return;
        }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) {
          e.preventDefault();
          saveEditing();
          return;
        }
        return;
      }

      // If user is typing in another input/modal, do not intercept
      if (isInput) return;

      // Spacebar for hand pan
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
        return;
      }

      // Enter key: edit selected text/sticky/shape
      if (e.key === 'Enter' && selectedId) {
        const selectedEl = elements.find(el => el.id === selectedId);
        if (
          selectedEl &&
          (selectedEl.type === 'text' ||
            selectedEl.type === 'sticky' ||
            selectedEl.type === 'shape')
        ) {
          e.preventDefault();
          startEditing(selectedEl);
          return;
        }
      }

      // Direct typing into selected text element
      if (
        selectedId &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key !== ' '
      ) {
        const selectedEl = elements.find(el => el.id === selectedId);
        if (selectedEl && selectedEl.type === 'text') {
          e.preventDefault();
          startEditing(selectedEl, e.key);
          return;
        }
      }

      // Escape: deselect or return to select tool
      if (e.key === 'Escape') {
        if (selectedId) {
          setSelectedId(null);
          setSelectedIds(new Set());
        } else if (activeTool !== 'select') {
          setActiveTool?.('select');
        }
        return;
      }

      // Delete / Backspace: delete selected elements safely
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        setElements(prev => {
          const next = prev.filter(el => !selectedIds.has(el.id));
          onElementsChange?.(next);
          onHistoryPush?.(next);
          return next;
        });
        setSelectedId(null);
        setSelectedIds(new Set());
        return;
      }

      // Ctrl/Cmd + D: Duplicate selected elements
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D') && selectedId) {
        e.preventDefault();
        const elToDup = elements.find(el => el.id === selectedId);
        if (elToDup) {
          const dup: BoardElement = {
            ...elToDup,
            id: `${elToDup.type}_${Date.now()}`,
            x: elToDup.x + 28,
            y: elToDup.y + 28,
            zIndex: elements.length + 1,
            updatedAt: Date.now(),
          };
          setElements(prev => {
            const next = [...prev, dup];
            onElementsChange?.(next);
            onHistoryPush?.(next);
            return next;
          });
          setSelectedId(dup.id);
          setSelectedIds(new Set([dup.id]));
        }
        return;
      }

      // Ctrl/Cmd + A: Select all elements
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = new Set(elements.map(el => el.id));
        setSelectedIds(allIds);
        if (elements.length > 0 && elements[0]) {
          setSelectedId(elements[0].id);
        }
        return;
      }

      // Single-key tool switches
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'v') setActiveTool?.('select');
        else if (key === 'h') setActiveTool?.('hand');
        else if (key === 'p') setActiveTool?.('pen');
        else if (key === 'e') setActiveTool?.('eraser');
        else if (key === 't') setActiveTool?.('text');
        else if (key === 'n') setActiveTool?.('sticky');
        else if (key === 'a') setActiveTool?.('arrow');
        else if (key === 's') setActiveTool?.('shape');
        else if (key === 'f') {
          window.dispatchEvent(new CustomEvent('n1:board-fit-screen'));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeTool,
    cancelEditing,
    editingId,
    elements,
    isSpacePressed,
    onElementsChange,
    onHistoryPush,
    saveEditing,
    selectedId,
    selectedIds,
    setActiveTool,
    setElements,
    startEditing,
  ]);

  // Main Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Clear background
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw subtle dark dot grid
    const gridSize = 24;
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize - gridSize * 2;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize - gridSize * 2;
    const endX = startX + width / zoom + gridSize * 4;
    const endY = startY + height / zoom + gridSize * 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Sort elements by zIndex
    const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

    sorted.forEach(el => {
      ctx.save();
      ctx.translate(el.x, el.y);

      ctx.strokeStyle = el.color || '#a855f7';
      ctx.fillStyle = el.fillColor || 'transparent';
      ctx.lineWidth = el.strokeWidth || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (el.type) {
        case 'stroke': {
          if (el.points && el.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(el.points[0]?.x || 0, el.points[0]?.y || 0);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i]?.x || 0, el.points[i]?.y || 0);
            }
            ctx.stroke();
          }
          break;
        }

        case 'sticky': {
          // Sticky note container
          ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 4;

          ctx.fillStyle = el.fillColor || 'rgba(251, 191, 36, 0.2)';
          ctx.strokeStyle = el.color || '#fbbf24';
          ctx.beginPath();
          ctx.roundRect(0, 0, el.width, el.height, 10);
          ctx.fill();
          ctx.shadowColor = 'transparent';
          ctx.stroke();

          // Sticky Pin
          ctx.fillStyle = el.color;
          ctx.beginPath();
          ctx.arc(el.width / 2, 10, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Sticky Content (only when not editing)
          if (el.id !== editingId) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${el.fontSize || 13}px sans-serif`;
            const content = el.content || 'Double click to edit';
            const lines = wrapText(ctx, content, el.width - 24);
            lines.slice(0, 8).forEach((line, idx) => {
              ctx.fillText(line, 12, 30 + idx * 18);
            });
          }
          break;
        }

        case 'shape': {
          const w = el.width;
          const h = el.height;
          ctx.beginPath();

          if (el.shapeType === 'rounded-rectangle') {
            ctx.roundRect(0, 0, w, h, 8);
          } else if (el.shapeType === 'circle' || el.shapeType === 'ellipse') {
            ctx.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
          } else if (el.shapeType === 'diamond') {
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w, h / 2);
            ctx.lineTo(w / 2, h);
            ctx.lineTo(0, h / 2);
            ctx.closePath();
          } else if (el.shapeType === 'triangle') {
            ctx.moveTo(w / 2, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
          } else if (el.shapeType === 'cylinder') {
            const cap = 14;
            ctx.ellipse(w / 2, cap / 2, w / 2, cap / 2, 0, 0, Math.PI * 2);
            ctx.moveTo(0, cap / 2);
            ctx.lineTo(0, h - cap / 2);
            ctx.ellipse(w / 2, h - cap / 2, w / 2, cap / 2, 0, 0, Math.PI);
            ctx.lineTo(w, cap / 2);
          } else if (el.shapeType === 'star') {
            const spikes = 5;
            const outerR = Math.min(w, h) / 2;
            const innerR = outerR / 2;
            let rot = (Math.PI / 2) * 3;
            const cx = w / 2;
            const cy = h / 2;
            const step = Math.PI / spikes;
            ctx.moveTo(cx, cy - outerR);
            for (let i = 0; i < spikes; i++) {
              let sx = cx + Math.cos(rot) * outerR;
              let sy = cy + Math.sin(rot) * outerR;
              ctx.lineTo(sx, sy);
              rot += step;
              sx = cx + Math.cos(rot) * innerR;
              sy = cy + Math.sin(rot) * innerR;
              ctx.lineTo(sx, sy);
              rot += step;
            }
            ctx.closePath();
          } else {
            ctx.rect(0, 0, w, h);
          }

          if (el.fillColor && el.fillColor !== 'transparent') {
            ctx.fill();
          }
          ctx.stroke();

          // Shape Center Text
          if (el.content && el.id !== editingId) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${el.fontSize || 13}px ${
              el.fontFamily === 'mono' ? 'monospace' : 'sans-serif'
            }`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lines = wrapText(ctx, el.content, w - 16);
            const startY = h / 2 - ((lines.length - 1) * 16) / 2;
            lines.forEach((l, idx) => {
              ctx.fillText(l, w / 2, startY + idx * 16);
            });
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          }
          break;
        }

        case 'arrow':
        case 'line': {
          const w = el.width;
          const h = el.height;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(w, h);
          ctx.stroke();

          const angle = Math.atan2(h, w);
          const headLength = 12;
          ctx.beginPath();
          ctx.moveTo(w, h);
          ctx.lineTo(
            w - headLength * Math.cos(angle - Math.PI / 6),
            h - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            w - headLength * Math.cos(angle + Math.PI / 6),
            h - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = el.color || '#a855f7';
          ctx.fill();
          break;
        }

        case 'text': {
          // Render text content if not currently being edited in DOM textarea
          if (el.id !== editingId) {
            const hasContent = Boolean(el.content && el.content.trim().length > 0);
            const fontSize = el.fontSize || 16;
            const fontFam = el.fontFamily === 'mono' ? 'monospace' : 'sans-serif';
            const lineHeight = fontSize + 6;

            if (hasContent) {
              ctx.fillStyle = el.color || '#00f0ff';
              ctx.font = `${fontSize}px ${fontFam}`;
              const lines = wrapText(ctx, el.content || '', Math.max(120, el.width));
              lines.forEach((l, idx) => {
                ctx.fillText(l, 0, fontSize + idx * lineHeight);
              });
            } else {
              // Empty text element placeholder (ensures user always sees and can click/edit it)
              ctx.fillStyle = 'rgba(100, 116, 139, 0.7)';
              ctx.font = `italic ${fontSize}px ${fontFam}`;
              ctx.fillText('Type text here...', 0, fontSize);

              // Subtle dotted guide box when unselected & empty
              if (el.id !== selectedId) {
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(-2, -2, el.width + 4, el.height + 4);
                ctx.setLineDash([]);
              }
            }
          }
          break;
        }
      }

      // Selection bounding box & 8 functional resize handles
      if (selectedIds.has(el.id)) {
        const isSingleSelected = selectedIds.size === 1;
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5 / zoom;
        ctx.setLineDash([4 / zoom, 4 / zoom]);
        ctx.strokeRect(-4, -4, el.width + 8, el.height + 8);
        ctx.setLineDash([]);

        if (isSingleSelected) {
          // Render 8 Resize Handles on corners and edges
          const handles = [
            { x: -4, y: -4 },
            { x: el.width / 2, y: -4 },
            { x: el.width + 4, y: -4 },
            { x: el.width + 4, y: el.height / 2 },
            { x: el.width + 4, y: el.height + 4 },
            { x: el.width / 2, y: el.height + 4 },
            { x: -4, y: el.height + 4 },
            { x: -4, y: el.height / 2 },
          ];

          const handleRadius = 4 / zoom;
          handles.forEach(h => {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(h.x - handleRadius, h.y - handleRadius, handleRadius * 2, handleRadius * 2);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 1.5 / zoom;
            ctx.strokeRect(h.x - handleRadius, h.y - handleRadius, handleRadius * 2, handleRadius * 2);
          });
        }
      }

      ctx.restore();
    });

    // Render in-progress drawing preview
    if (isDrawing) {
      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeTool === 'highlighter' ? 14 : strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'highlighter') {
        ctx.globalAlpha = 0.35;
      }

      if (activeTool === 'pen' || activeTool === 'highlighter') {
        if (currentPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(currentPoints[0]?.x || 0, currentPoints[0]?.y || 0);
          for (let i = 1; i < currentPoints.length; i++) {
            ctx.lineTo(currentPoints[i]?.x || 0, currentPoints[i]?.y || 0);
          }
          ctx.stroke();
        }
      } else if (activeTool === 'shape') {
        const lastPoint = currentPoints[currentPoints.length - 1] || drawStart;
        const w = lastPoint.x - drawStart.x;
        const h = lastPoint.y - drawStart.y;
        ctx.strokeRect(drawStart.x, drawStart.y, w, h);
      } else if (activeTool === 'arrow') {
        const lastPoint = currentPoints[currentPoints.length - 1] || drawStart;
        ctx.beginPath();
        ctx.moveTo(drawStart.x, drawStart.y);
        ctx.lineTo(lastPoint.x, lastPoint.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Render in-progress area eraser marquee box
    if (isAreaErasing && areaEraseBox) {
      const bx = Math.min(areaEraseBox.start.x, areaEraseBox.current.x);
      const by = Math.min(areaEraseBox.start.y, areaEraseBox.current.y);
      const bw = Math.abs(areaEraseBox.current.x - areaEraseBox.start.x);
      const bh = Math.abs(areaEraseBox.current.y - areaEraseBox.start.y);

      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.18)';
      ctx.fillRect(bx, by, bw, bh);

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5 / zoom;
      ctx.setLineDash([6 / zoom, 4 / zoom]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      const toDeleteCount = elements.filter(el => isElementInBox(el, bx, by, bx + bw, by + bh)).length;
      if (toDeleteCount > 0 && (bw > 15 || bh > 15)) {
        ctx.fillStyle = '#f43f5e';
        const label = `🗑️ Delete ${toDeleteCount} ${toDeleteCount === 1 ? 'item' : 'items'}`;
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(label).width;
        const tagX = bx + bw - textWidth - 14;
        const tagY = by + bh + 4;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, textWidth + 14, 20, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, tagX + 7, tagY + 14);
      }
      ctx.restore();
    }

    // Render online peer cursors
    peerUsers.forEach(peer => {
      if (peer.cursor) {
        ctx.save();
        ctx.translate(peer.cursor.x, peer.cursor.y);

        ctx.fillStyle = peer.color || '#a855f7';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 12);
        ctx.lineTo(4, 14);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = peer.color || '#a855f7';
        ctx.beginPath();
        ctx.roundRect(10, 12, peer.name.length * 6.5 + 8, 18, 4);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(peer.name, 14, 25);

        ctx.restore();
      }
    });

    ctx.restore();
  }, [
    activeColor,
    activeTool,
    areaEraseBox,
    currentPoints,
    drawStart,
    editingId,
    elements,
    isAreaErasing,
    isDrawing,
    isElementInBox,
    pan,
    peerUsers,
    selectedIds,
    strokeWidth,
    zoom,
  ]);

  // Request Animation Frame Render Loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Mouse wheel zoom & pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      setZoom(prev => Math.min(3.0, Math.max(0.25, prev * zoomFactor)));
    } else {
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // Pointer Down Handler
  const handlePointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom
    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 && p1) {
        initialPinchDistRef.current = Math.hypot(p0.x - p1.x, p0.y - p1.y);
        initialZoomRef.current = zoom;
        setIsDrawing(false);
        setIsPanning(false);
        return;
      }
    }

    try {
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch (_err) {
      void _err;
    }

    // If currently editing text and clicked outside editor, commit changes cleanly
    if (editingId) {
      saveEditing();
      return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    // Pan mode (Hand tool, Space pressed, or Middle mouse click)
    if (activeTool === 'hand' || isSpacePressed || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Select mode
    if (activeTool === 'select') {
      // 1. Check if clicking on one of the 8 resize handles of the currently selected element
      if (selectedId) {
        const selectedEl = elements.find(el => el.id === selectedId);
        if (selectedEl) {
          const handle = findHandleAt(world, selectedEl);
          if (handle) {
            setResizingHandle(handle.id);
            setResizeOrigin({
              x: selectedEl.x,
              y: selectedEl.y,
              width: selectedEl.width,
              height: selectedEl.height,
              startX: world.x,
              startY: world.y,
            });
            return;
          }
        }
      }

      // 2. Check if clicking on an element
      const hit = findElementAt(world);
      if (hit) {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          // Toggle in multi-selection
          setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(hit.id)) {
              next.delete(hit.id);
            } else {
              next.add(hit.id);
            }
            return next;
          });
          setSelectedId(hit.id);
        } else {
          // Single selection
          setSelectedId(hit.id);
          setSelectedIds(new Set([hit.id]));
        }

        // Prepare drag map for single or multi-element drag
        setIsDraggingElement(true);
        setDragOffset({ x: world.x - hit.x, y: world.y - hit.y });
        const startMap = new Map<string, { x: number; y: number }>();
        elements.forEach(el => {
          if (el.id === hit.id || selectedIds.has(el.id)) {
            startMap.set(el.id, { x: el.x, y: el.y });
          }
        });
        setDragStartMap(startMap);
      } else {
        // Clicked on empty canvas -> deselect
        setSelectedId(null);
        setSelectedIds(new Set());
      }
      return;
    }

    // Eraser mode
    if (activeTool === 'eraser') {
      setIsAreaErasing(true);
      setAreaEraseBox({ start: world, current: world });
      return;
    }

    // Text block creation
    if (activeTool === 'text') {
      // If clicking directly on an existing text/sticky element, select & edit it instead of creating duplicates
      const hit = findElementAt(world);
      if (hit && (hit.type === 'text' || hit.type === 'sticky')) {
        startEditing(hit);
        return;
      }

      // Check nearby text elements to avoid accidental overlapping cascade
      const targetX = Math.round(world.x);
      let targetY = Math.round(world.y);
      const isNearby = elements.some(
        el => el.type === 'text' && Math.hypot(el.x - targetX, el.y - targetY) < 28
      );
      if (isNearby) {
        targetY += 36;
      }

      const newText: BoardElement = {
        id: `text_${Date.now()}`,
        type: 'text',
        x: targetX,
        y: targetY,
        width: 180,
        height: 44,
        color: activeColor,
        strokeWidth: 2,
        content: '',
        fontSize: 16,
        fontFamily: 'sans',
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
      };

      setElements(prev => {
        const next = [...prev, newText];
        onElementsChange?.(next);
        onHistoryPush?.(next);
        return next;
      });

      // Select and immediately enter editing mode
      setSelectedId(newText.id);
      setSelectedIds(new Set([newText.id]));
      startEditing(newText, '');
      return;
    }

    // Sticky Note creation
    if (activeTool === 'sticky') {
      const hit = findElementAt(world);
      if (hit && hit.type === 'sticky') {
        startEditing(hit);
        return;
      }

      const newSticky: BoardElement = {
        id: `sticky_${Date.now()}`,
        type: 'sticky',
        x: Math.round(world.x - 90),
        y: Math.round(world.y - 60),
        width: 180,
        height: 120,
        color: activeColor === '#ffffff' ? '#fbbf24' : activeColor,
        fillColor: `${activeColor}26`,
        strokeWidth: 2,
        content: 'New Note',
        fontSize: 13,
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
      };

      setElements(prev => {
        const next = [...prev, newSticky];
        onElementsChange?.(next);
        onHistoryPush?.(next);
        return next;
      });

      setSelectedId(newSticky.id);
      setSelectedIds(new Set([newSticky.id]));
      startEditing(newSticky);
      return;
    }

    // Drawing shapes / strokes
    setIsDrawing(true);
    setDrawStart(world);
    setCurrentPoints([world]);
  };

  // Pointer Move Handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch-to-zoom calculation
    if (activePointersRef.current.size === 2 && initialPinchDistRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const p0 = pts[0];
      const p1 = pts[1];
      if (p0 && p1) {
        const currentDist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
        const factor = currentDist / initialPinchDistRef.current;
        setZoom(() =>
          Math.min(3.0, Math.max(0.25, Math.round(initialZoomRef.current * factor * 100) / 100))
        );
        return;
      }
    }

    const world = screenToWorld(e.clientX, e.clientY);
    onCursorMove?.(world.x, world.y);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (isAreaErasing && areaEraseBox) {
      setAreaEraseBox(prev => (prev ? { start: prev.start, current: world } : null));
      return;
    }

    // Resizing active element via handles
    if (resizingHandle && resizeOrigin && selectedId) {
      const dx = world.x - resizeOrigin.startX;
      const dy = world.y - resizeOrigin.startY;

      let nextX = resizeOrigin.x;
      let nextY = resizeOrigin.y;
      let nextW = resizeOrigin.width;
      let nextH = resizeOrigin.height;

      const minW = 40;
      const minH = 24;

      if (resizingHandle.includes('e')) {
        nextW = Math.max(minW, resizeOrigin.width + dx);
      }
      if (resizingHandle.includes('s')) {
        nextH = Math.max(minH, resizeOrigin.height + dy);
      }
      if (resizingHandle.includes('w')) {
        const potentialW = resizeOrigin.width - dx;
        if (potentialW >= minW) {
          nextW = potentialW;
          nextX = resizeOrigin.x + dx;
        } else {
          nextW = minW;
          nextX = resizeOrigin.x + (resizeOrigin.width - minW);
        }
      }
      if (resizingHandle.includes('n')) {
        const potentialH = resizeOrigin.height - dy;
        if (potentialH >= minH) {
          nextH = potentialH;
          nextY = resizeOrigin.y + dy;
        } else {
          nextH = minH;
          nextY = resizeOrigin.y + (resizeOrigin.height - minH);
        }
      }

      setElements(prev =>
        prev.map(el =>
          el.id === selectedId
            ? { ...el, x: Math.round(nextX), y: Math.round(nextY), width: Math.round(nextW), height: Math.round(nextH), updatedAt: Date.now() }
            : el
        )
      );
      return;
    }

    // Dragging elements
    if (isDraggingElement && selectedId) {
      const mainStart = dragStartMap.get(selectedId);
      if (mainStart) {
        const newMainX = world.x - dragOffset.x;
        const newMainY = world.y - dragOffset.y;
        const deltaX = newMainX - mainStart.x;
        const deltaY = newMainY - mainStart.y;

        setElements(prev =>
          prev.map(el => {
            const elStart = dragStartMap.get(el.id);
            if (elStart) {
              return {
                ...el,
                x: Math.round(elStart.x + deltaX),
                y: Math.round(elStart.y + deltaY),
                updatedAt: Date.now(),
              };
            }
            return el;
          })
        );
      }
      return;
    }

    // Hover check for resize handles in select mode
    if (activeTool === 'select' && selectedId && !isDrawing && !isDraggingElement) {
      const selectedEl = elements.find(el => el.id === selectedId);
      if (selectedEl) {
        const handle = findHandleAt(world, selectedEl);
        setHoveredHandle(handle ? handle.id : null);
      }
    } else {
      if (hoveredHandle) setHoveredHandle(null);
    }

    // Drawing
    if (isDrawing) {
      if (activeTool === 'pen' || activeTool === 'highlighter') {
        setCurrentPoints(prev => [...prev, world]);
      } else {
        setCurrentPoints([world]);
      }
    }
  };

  // Pointer Up Handler
  const handlePointerUp = (e: React.PointerEvent) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      initialPinchDistRef.current = null;
    }

    try {
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    } catch (_err) {
      void _err;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isAreaErasing && areaEraseBox) {
      setIsAreaErasing(false);
      const minX = Math.min(areaEraseBox.start.x, areaEraseBox.current.x);
      const maxX = Math.max(areaEraseBox.start.x, areaEraseBox.current.x);
      const minY = Math.min(areaEraseBox.start.y, areaEraseBox.current.y);
      const maxY = Math.max(areaEraseBox.start.y, areaEraseBox.current.y);
      const boxW = maxX - minX;
      const boxH = maxY - minY;
      setAreaEraseBox(null);

      if (boxW > 8 || boxH > 8) {
        const toDelete = elements.filter(el => isElementInBox(el, minX, minY, maxX, maxY));
        if (toDelete.length > 0) {
          const deleteIds = new Set(toDelete.map(el => el.id));
          const next = elements.filter(el => !deleteIds.has(el.id));
          setElements(next);
          onElementsChange?.(next);
          onHistoryPush?.(next);
          setSelectedId(null);
          setSelectedIds(new Set());
        }
      } else {
        const world = screenToWorld(e.clientX, e.clientY);
        const hit = findElementAt(world);
        if (hit) {
          const next = elements.filter(el => el.id !== hit.id);
          setElements(next);
          onElementsChange?.(next);
          onHistoryPush?.(next);
          setSelectedId(null);
          setSelectedIds(new Set());
        }
      }
      return;
    }

    if (resizingHandle) {
      setResizingHandle(null);
      setResizeOrigin(null);
      onElementsChange?.(elements);
      onHistoryPush?.(elements);
      return;
    }

    if (isDraggingElement) {
      setIsDraggingElement(false);
      setDragStartMap(new Map());
      onElementsChange?.(elements);
      onHistoryPush?.(elements);
      return;
    }

    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      if (currentPoints.length > 1) {
        const minX = Math.min(...currentPoints.map(p => p.x));
        const minY = Math.min(...currentPoints.map(p => p.y));
        const relativePoints = currentPoints.map(p => ({
          x: p.x - minX,
          y: p.y - minY,
        }));

        const newStroke: BoardElement = {
          id: `stroke_${Date.now()}`,
          type: 'stroke',
          x: minX,
          y: minY,
          width: Math.max(...relativePoints.map(p => p.x)),
          height: Math.max(...relativePoints.map(p => p.y)),
          color: activeColor,
          strokeWidth: activeTool === 'highlighter' ? 14 : strokeWidth,
          points: relativePoints,
          zIndex: elements.length + 1,
          updatedAt: Date.now(),
        };

        setElements(prev => {
          const next = [...prev, newStroke];
          onElementsChange?.(next);
          onHistoryPush?.(next);
          return next;
        });
      }
    } else if (activeTool === 'shape') {
      const endPoint = currentPoints[currentPoints.length - 1] || drawStart;
      const x = Math.min(drawStart.x, endPoint.x);
      const y = Math.min(drawStart.y, endPoint.y);
      const width = Math.max(30, Math.abs(endPoint.x - drawStart.x));
      const height = Math.max(30, Math.abs(endPoint.y - drawStart.y));

      const newShape: BoardElement = {
        id: `shape_${Date.now()}`,
        type: 'shape',
        shapeType: activeShape,
        x,
        y,
        width,
        height,
        color: activeColor,
        fillColor: `${activeColor}20`,
        strokeWidth,
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
      };

      setElements(prev => {
        const next = [...prev, newShape];
        onElementsChange?.(next);
        onHistoryPush?.(next);
        return next;
      });
      setSelectedId(newShape.id);
      setSelectedIds(new Set([newShape.id]));
      setActiveTool?.('select');
    } else if (activeTool === 'arrow') {
      const endPoint = currentPoints[currentPoints.length - 1] || drawStart;
      const width = endPoint.x - drawStart.x;
      const height = endPoint.y - drawStart.y;

      const newArrow: BoardElement = {
        id: `arrow_${Date.now()}`,
        type: 'arrow',
        lineType: 'arrow',
        x: drawStart.x,
        y: drawStart.y,
        width,
        height,
        color: activeColor,
        strokeWidth,
        zIndex: elements.length + 1,
        updatedAt: Date.now(),
      };

      setElements(prev => {
        const next = [...prev, newArrow];
        onElementsChange?.(next);
        onHistoryPush?.(next);
        return next;
      });
      setSelectedId(newArrow.id);
      setSelectedIds(new Set([newArrow.id]));
      setActiveTool?.('select');
    }

    setCurrentPoints([]);
  };

  // Double click to edit text, sticky notes, or shapes
  const handleDoubleClick = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = findElementAt(world);
    if (hit && (hit.type === 'text' || hit.type === 'sticky' || hit.type === 'shape')) {
      startEditing(hit);
    }
  };

  // Position and bounds of in-place editing textarea in screen space
  const editingElement = elements.find(el => el.id === editingId);
  const editingScreenPos = editingElement
    ? {
        left: editingElement.x * zoom + pan.x,
        top: editingElement.y * zoom + pan.y,
        width: Math.max(180, (editingElement.width || 180) * zoom),
        height: Math.max(56, (editingElement.height || 48) * zoom),
      }
    : null;

  // Selected element for contextual action pill
  const selectedElement = elements.find(el => el.id === selectedId);

  // Dynamic cursor style calculation
  const getCanvasCursor = () => {
    if (isPanning || isSpacePressed || activeTool === 'hand') {
      return isPanning ? 'cursor-grabbing' : 'cursor-grab';
    }
    if (resizingHandle) {
      if (resizingHandle === 'nw' || resizingHandle === 'se') return 'cursor-nwse-resize';
      if (resizingHandle === 'ne' || resizingHandle === 'sw') return 'cursor-nesw-resize';
      if (resizingHandle === 'n' || resizingHandle === 's') return 'cursor-ns-resize';
      return 'cursor-ew-resize';
    }
    if (hoveredHandle) {
      if (hoveredHandle === 'nw' || hoveredHandle === 'se') return 'cursor-nwse-resize';
      if (hoveredHandle === 'ne' || hoveredHandle === 'sw') return 'cursor-nesw-resize';
      if (hoveredHandle === 'n' || hoveredHandle === 's') return 'cursor-ns-resize';
      return 'cursor-ew-resize';
    }
    if (activeTool === 'select') {
      return isDraggingElement ? 'cursor-move' : 'cursor-default';
    }
    if (activeTool === 'text') return 'cursor-text';
    if (activeTool === 'eraser') return 'cursor-crosshair';
    return 'cursor-crosshair';
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: 'none' }}
      className={`relative w-full h-full overflow-hidden select-none bg-[#09090f] ${getCanvasCursor()}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {/* Floating Eraser Area Delete Helper Banner */}
      {activeTool === 'eraser' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold backdrop-blur-md flex items-center gap-2 shadow-lg">
            <span>🗑️ Area Eraser</span>
            <span className="text-[11px] text-zinc-400 font-normal hidden sm:inline">
              • Click or drag a box across any text or diagram to delete (Undo with Ctrl+Z)
            </span>
          </div>
        </div>
      )}

      {/* Floating Contextual Element Action Pill */}
      {selectedId && !isDraggingElement && !editingId && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 rounded-2xl bg-[#10101c]/95 border border-cyan-500/30 text-cyan-300 text-xs font-semibold backdrop-blur-xl flex items-center gap-2 shadow-2xl">
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 font-mono text-[11px]">
              {selectedIds.size > 1
                ? `${selectedIds.size} items`
                : selectedElement?.type === 'text'
                ? 'Text Block'
                : selectedElement?.type === 'sticky'
                ? 'Sticky Note'
                : selectedElement?.type === 'shape'
                ? 'Shape'
                : 'Selected'}
            </span>

            {/* Edit Text Button (Available for text, sticky, shape) */}
            {selectedElement &&
              (selectedElement.type === 'text' ||
                selectedElement.type === 'sticky' ||
                selectedElement.type === 'shape') && (
                <button
                  type="button"
                  onClick={() => startEditing(selectedElement)}
                  className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>✏️ Edit</span>
                  <span className="text-[10px] text-cyan-400/80 font-normal hidden sm:inline">(Enter)</span>
                </button>
              )}

            {/* Font Size Adjusters for text & sticky */}
            {selectedElement && (selectedElement.type === 'text' || selectedElement.type === 'sticky') && (
              <div className="flex items-center gap-1 px-1 border-l border-white/10">
                <button
                  type="button"
                  title="Smaller text"
                  onClick={() => {
                    const currentSize = selectedElement.fontSize || 16;
                    const nextSize = Math.max(10, currentSize - 2);
                    setElements(prev =>
                      prev.map(el => (el.id === selectedId ? { ...el, fontSize: nextSize } : el))
                    );
                    onElementsChange?.(elements);
                  }}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs"
                >
                  A-
                </button>
                <span className="text-[10px] font-mono text-zinc-400 w-5 text-center">
                  {selectedElement.fontSize || 16}
                </span>
                <button
                  type="button"
                  title="Larger text"
                  onClick={() => {
                    const currentSize = selectedElement.fontSize || 16;
                    const nextSize = Math.min(48, currentSize + 2);
                    setElements(prev =>
                      prev.map(el => (el.id === selectedId ? { ...el, fontSize: nextSize } : el))
                    );
                    onElementsChange?.(elements);
                  }}
                  className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-xs"
                >
                  A+
                </button>
              </div>
            )}

            {/* Duplicate button */}
            <button
              type="button"
              onClick={() => {
                if (selectedElement) {
                  const dup: BoardElement = {
                    ...selectedElement,
                    id: `${selectedElement.type}_${Date.now()}`,
                    x: selectedElement.x + 28,
                    y: selectedElement.y + 28,
                    zIndex: elements.length + 1,
                    updatedAt: Date.now(),
                  };
                  setElements(prev => {
                    const next = [...prev, dup];
                    onElementsChange?.(next);
                    onHistoryPush?.(next);
                    return next;
                  });
                  setSelectedId(dup.id);
                  setSelectedIds(new Set([dup.id]));
                }
              }}
              className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>📋 Duplicate</span>
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => {
                setElements(prev => {
                  const next = prev.filter(el => !selectedIds.has(el.id));
                  onElementsChange?.(next);
                  onHistoryPush?.(next);
                  return next;
                });
                setSelectedId(null);
                setSelectedIds(new Set());
              }}
              className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              🗑️ Delete
            </button>

            {/* Deselect */}
            <button
              type="button"
              onClick={() => {
                setSelectedId(null);
                setSelectedIds(new Set());
              }}
              className="text-zinc-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Empty State Onboarding Overlay */}
      {elements.length === 0 && !isDrawing && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-10 select-none animate-in fade-in duration-300">
          <div className="max-w-md w-full p-5 sm:p-7 rounded-3xl border border-cyan-500/20 bg-[#09090f]/90 backdrop-blur-xl text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 text-xl shadow-inner">
              🎨
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-brand">Collaborative Canvas Ready</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                Pick a text box, sticky note, shape, or pen from the toolbar below. Double click any text to edit inline.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-left">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">1. Click Text (T)</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">Click anywhere to type text without overlapping</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">2. Double Click</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">Double click or press Enter to edit any note</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">3. Resize &amp; Drag</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">Drag handles to resize or reposition</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-place Text/Sticky Note Editing Overlay */}
      {editingElement && editingScreenPos && (
        <div
          style={{
            position: 'absolute',
            left: `${editingScreenPos.left}px`,
            top: `${editingScreenPos.top}px`,
            width: `${editingScreenPos.width}px`,
            minHeight: `${editingScreenPos.height}px`,
          }}
          className="z-50 flex flex-col pointer-events-auto"
        >
          {/* Header Action Strip */}
          <div className="flex items-center justify-between pb-1 px-1 text-[11px] font-medium text-cyan-300 select-none">
            <span className="bg-[#10101c]/90 px-2 py-0.5 rounded-md border border-cyan-500/30 text-[10px] shadow">
              ✏️ Editing • Enter to save • Esc to cancel
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  saveEditing();
                }}
                className="px-2 py-0.5 rounded-md bg-cyan-500 text-black font-bold text-[10px] hover:bg-cyan-400 cursor-pointer shadow"
              >
                ✓ Done
              </button>
              <button
                type="button"
                onMouseDown={e => {
                  e.preventDefault();
                  cancelEditing();
                }}
                className="px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 hover:text-white text-[10px] cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            autoFocus
            value={editingText}
            placeholder="Type your text here..."
            onChange={e => {
              setEditingText(e.target.value);
              // Auto-grow height with content
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${Math.max(50, textareaRef.current.scrollHeight)}px`;
              }
            }}
            onBlur={saveEditing}
            className="w-full flex-1 p-2 rounded-xl border-2 border-cyan-400 bg-[#09090f]/95 text-white font-sans text-sm resize-none focus:outline-none focus:ring-4 focus:ring-cyan-500/30 shadow-2xl leading-relaxed"
            style={{
              fontSize: `${Math.max(12, (editingElement.fontSize || 16) * zoom)}px`,
              color: editingElement.color || '#00f0ff',
              minHeight: `${editingScreenPos.height}px`,
            }}
          />
        </div>
      )}
    </div>
  );
}
