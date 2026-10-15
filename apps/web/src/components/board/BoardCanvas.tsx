'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { BoardElement, BoardPoint, BoardShapeType, ConnectedBoardUser } from '@n1/shared';
import { CanvasTool } from './BoardToolbar';

export interface BoardCanvasProps {
  elements: BoardElement[];
  setElements: React.Dispatch<React.SetStateAction<BoardElement[]>>;
  activeTool: CanvasTool;
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

export function BoardCanvas({
  elements,
  setElements,
  activeTool,
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

  // Pan offsets
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Multi-touch & pointer tracking
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDistRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(zoom);

  // Selection & Editing
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDraggingElement, setIsDraggingElement] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // In-place text/sticky editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Active drawing stroke / shape
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<BoardPoint[]>([]);
  const [drawStart, setDrawStart] = useState<BoardPoint>({ x: 0, y: 0 });

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

  // Keyboard listeners (Space for pan, Delete/Backspace to delete selected element)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingId) return; // Don't intercept when typing in note

      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        setElements(prev => {
          const next = prev.filter(el => el.id !== selectedId);
          onElementsChange?.(next);
          onHistoryPush?.(next);
          return next;
        });
        setSelectedId(null);
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
  }, [editingId, isSpacePressed, selectedId, setElements, onElementsChange, onHistoryPush]);

  // Main Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Clear
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background dot grid
    const gridSize = 24;
    const startX = Math.floor(-pan.x / zoom / gridSize) * gridSize - gridSize * 2;
    const startY = Math.floor(-pan.y / zoom / gridSize) * gridSize - gridSize * 2;
    const endX = startX + (width / zoom) + gridSize * 4;
    const endY = startY + (height / zoom) + gridSize * 4;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render elements by zIndex
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

          // Content
          if (el.content && el.id !== editingId) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${el.fontSize || 13}px sans-serif`;
            const lines = el.content.split('\n');
            lines.forEach((line, idx) => {
              ctx.fillText(line, 12, 28 + idx * 18);
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
              let x = cx + Math.cos(rot) * outerR;
              let y = cy + Math.sin(rot) * outerR;
              ctx.lineTo(x, y);
              rot += step;
              x = cx + Math.cos(rot) * innerR;
              y = cy + Math.sin(rot) * innerR;
              ctx.lineTo(x, y);
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

          if (el.content && el.id !== editingId) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${el.fontSize || 13}px ${el.fontFamily === 'mono' ? 'monospace' : 'sans-serif'}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const lines = el.content.split('\n');
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
          ctx.lineTo(w - headLength * Math.cos(angle - Math.PI / 6), h - headLength * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(w - headLength * Math.cos(angle + Math.PI / 6), h - headLength * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fillStyle = el.color || '#a855f7';
          ctx.fill();
          break;
        }

        case 'text': {
          if (el.content && el.id !== editingId) {
            ctx.fillStyle = el.color || '#ffffff';
            ctx.font = `${el.fontSize || 16}px ${el.fontFamily === 'mono' ? 'monospace' : 'sans-serif'}`;
            const lines = el.content.split('\n');
            lines.forEach((l, idx) => {
              ctx.fillText(l, 0, 16 + idx * 20);
            });
          }
          break;
        }
      }

      // Selection bounding box & handles
      if (el.id === selectedId) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-4, -4, el.width + 8, el.height + 8);
        ctx.setLineDash([]);

        // Handle points on corners
        ctx.fillStyle = '#ffffff';
        const handles = [
          [-4, -4],
          [el.width + 4, -4],
          [-4, el.height + 4],
          [el.width + 4, el.height + 4],
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillRect((hx || 0) - 3, (hy || 0) - 3, 6, 6);
        });
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

    // Render online peer cursors
    peerUsers.forEach(peer => {
      if (peer.cursor) {
        ctx.save();
        ctx.translate(peer.cursor.x, peer.cursor.y);

        // Pointer triangle
        ctx.fillStyle = peer.color || '#a855f7';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(12, 12);
        ctx.lineTo(4, 14);
        ctx.closePath();
        ctx.fill();

        // Name tag
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
    elements,
    pan,
    zoom,
    selectedId,
    editingId,
    isDrawing,
    currentPoints,
    drawStart,
    activeColor,
    activeTool,
    strokeWidth,
    peerUsers,
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

  // Mouse wheel zoom
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

  // Find element at world coordinate
  const findElementAt = (point: BoardPoint): BoardElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (!el) continue;

      if (el.type === 'stroke' && el.points) {
        // Distance check for stroke
        for (const p of el.points) {
          const dx = el.x + p.x - point.x;
          const dy = el.y + p.y - point.y;
          if (Math.sqrt(dx * dx + dy * dy) < 15) {
            return el;
          }
        }
      } else {
        const w = el.width || 40;
        const h = el.height || 40;
        if (
          point.x >= el.x &&
          point.x <= el.x + w &&
          point.y >= el.y &&
          point.y <= el.y + h
        ) {
          return el;
        }
      }
    }
    return null;
  };

  // Pointer Down Handler (Touch, Stylus + Mouse unified)
  const handlePointerDown = (e: React.PointerEvent) => {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom initialization
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

    // If clicking on in-place editor, ignore
    if (editingId) {
      saveEditing();
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
      const hit = findElementAt(world);
      if (hit) {
        setSelectedId(hit.id);
        setIsDraggingElement(true);
        setDragOffset({ x: world.x - hit.x, y: world.y - hit.y });
      } else {
        setSelectedId(null);
      }
      return;
    }

    // Eraser mode
    if (activeTool === 'eraser') {
      const hit = findElementAt(world);
      if (hit) {
        setElements(prev => {
          const next = prev.filter(el => el.id !== hit.id);
          onElementsChange?.(next);
          onHistoryPush?.(next);
          return next;
        });
      }
      return;
    }

    // Sticky Note creation
    if (activeTool === 'sticky') {
      const newSticky: BoardElement = {
        id: `sticky_${Date.now()}`,
        type: 'sticky',
        x: world.x - 90,
        y: world.y - 60,
        width: 180,
        height: 120,
        color: activeColor === '#ffffff' ? '#fbbf24' : activeColor,
        fillColor: `${activeColor}26`,
        strokeWidth: 2,
        content: 'New Note\nDouble click to edit',
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
      return;
    }

    // Text block creation
    if (activeTool === 'text') {
      const newText: BoardElement = {
        id: `text_${Date.now()}`,
        type: 'text',
        x: world.x,
        y: world.y,
        width: 160,
        height: 40,
        color: activeColor,
        strokeWidth: 2,
        content: 'Type text here...',
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
      setSelectedId(newText.id);
      setEditingId(newText.id);
      setEditingText(newText.content || '');
      return;
    }

    // Drawing shapes / strokes
    setIsDrawing(true);
    setDrawStart(world);
    setCurrentPoints([world]);
  };

  // Pointer Move Handler (Touch, Stylus + Mouse unified)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Two-finger pinch-to-zoom calculation
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

    if (isDraggingElement && selectedId) {
      setElements(prev =>
        prev.map(el => {
          if (el.id === selectedId) {
            return {
              ...el,
              x: world.x - dragOffset.x,
              y: world.y - dragOffset.y,
              updatedAt: Date.now(),
            };
          }
          return el;
        })
      );
      return;
    }

    if (isDrawing) {
      if (activeTool === 'pen' || activeTool === 'highlighter') {
        setCurrentPoints(prev => [...prev, world]);
      } else {
        setCurrentPoints([world]);
      }
    }
  };

  // Pointer Up Handler (Touch, Stylus + Mouse unified)
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

    if (isDraggingElement) {
      setIsDraggingElement(false);
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
    }

    setCurrentPoints([]);
  };

  // Double click to edit sticky note or shape text
  const handleDoubleClick = (e: React.MouseEvent) => {
    const world = screenToWorld(e.clientX, e.clientY);
    const hit = findElementAt(world);
    if (hit && (hit.type === 'sticky' || hit.type === 'shape' || hit.type === 'text')) {
      setEditingId(hit.id);
      setEditingText(hit.content || '');
    }
  };

  // Save inline text editing
  const saveEditing = () => {
    if (!editingId) return;
    setElements(prev => {
      const next = prev.map(el => {
        if (el.id === editingId) {
          return {
            ...el,
            content: editingText,
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
  };

  // Position of in-place editing textarea
  const editingElement = elements.find(el => el.id === editingId);
  const editingScreenPos = editingElement
    ? {
        left: editingElement.x * zoom + pan.x,
        top: editingElement.y * zoom + pan.y,
        width: Math.max(120, editingElement.width * zoom),
        height: Math.max(60, editingElement.height * zoom),
      }
    : null;

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
      className={`relative w-full h-full overflow-hidden select-none bg-[#09090f] ${
        activeTool === 'hand' || isSpacePressed
          ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
          : activeTool === 'select'
          ? isDraggingElement ? 'cursor-move' : 'cursor-default'
          : activeTool === 'pen' || activeTool === 'highlighter'
          ? 'cursor-crosshair'
          : 'cursor-crosshair'
      }`}
    >
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

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
                Pick a pen, shape, or sticky note from the toolbar below to sketch. All strokes sync anonymously with peers.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-left">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">1. Draw &amp; Sketch</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">Pen, highlighter, shapes, arrows &amp; notes</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">2. Share Room</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">Share room code, link, or scan QR code</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase block">3. Instant Export</span>
                <p className="text-[11px] text-[var(--color-text-muted)] leading-tight">Export anytime as PNG, vector SVG, or JSON</p>
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
            height: `${editingScreenPos.height}px`,
          }}
          className="z-50"
        >
          <textarea
            autoFocus
            value={editingText}
            onChange={e => setEditingText(e.target.value)}
            onBlur={saveEditing}
            onKeyDown={e => {
              if (e.key === 'Escape') saveEditing();
            }}
            className="w-full h-full p-2.5 rounded-lg border-2 border-cyan-400 bg-[#09090f]/95 text-white font-sans text-xs resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/30 shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
