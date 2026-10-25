'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BoardShapeType } from '@n1/shared';

export type CanvasTool =
  | 'select'
  | 'hand'
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'shape'
  | 'arrow'
  | 'text'
  | 'sticky';

export interface BoardToolbarProps {
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  activeShape: BoardShapeType;
  setActiveShape: (shape: BoardShapeType) => void;
  zoom: number;
  setZoom: (fn: (prev: number) => number) => void;
  resetZoom: () => void;
  onFitToScreen?: () => void;
  canEdit?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

const PALETTE = [
  { name: 'Cyan', hex: '#00f0ff' },
  { name: 'Sky Blue', hex: '#38bdf8' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Emerald', hex: '#34d399' },
  { name: 'Gold', hex: '#fbbf24' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Slate', hex: '#94a3b8' },
];

const SHAPES: Array<{ id: BoardShapeType; label: string; icon: string }> = [
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'rounded-rectangle', label: 'Rounded Rect', icon: '▢' },
  { id: 'circle', label: 'Circle', icon: '○' },
  { id: 'diamond', label: 'Diamond', icon: '◇' },
  { id: 'cylinder', label: 'Cylinder', icon: '⌸' },
  { id: 'triangle', label: 'Triangle', icon: '△' },
  { id: 'star', label: 'Star', icon: '☆' },
];

export function BoardToolbar({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  strokeWidth,
  setStrokeWidth,
  activeShape,
  setActiveShape,
  zoom,
  setZoom,
  resetZoom,
  onFitToScreen,
  canEdit = true,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: BoardToolbarProps) {
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [colorTrayOpen, setColorTrayOpen] = useState(false);
  const [customHex, setCustomHex] = useState(activeColor);
  const toolbarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setCustomHex(activeColor);
  }, [activeColor]);

  // If editing gets locked, reset active drawing tool to hand/select
  useEffect(() => {
    if (!canEdit && activeTool !== 'select' && activeTool !== 'hand') {
      setActiveTool('hand');
    }
  }, [canEdit, activeTool, setActiveTool]);

  // Click outside to dismiss popups
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setShapeMenuOpen(false);
        setColorTrayOpen(false);
      }
    }
    if (shapeMenuOpen || colorTrayOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [shapeMenuOpen, colorTrayOpen]);

  // When editing is locked (View-Only participant), render a clean, non-intrusive viewer dock
  if (!canEdit) {
    return (
      <aside
        ref={toolbarRef}
        aria-label="Viewer navigation controls"
        className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 select-none max-w-[96vw]"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl border border-white/10 bg-[#10101c]/95 backdrop-blur-xl shadow-2xl">
          {/* View Only Tag */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="hidden xs:inline">View Only</span>
          </div>

          <div className="w-[1px] h-5 bg-white/10 shrink-0" />

          {/* Pan Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('hand')}
            title="Pan / Swipe Tool (Drag canvas to navigate)"
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all min-h-[38px] ${
              activeTool === 'hand'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm">✋</span>
            <span className="text-xs font-semibold">Pan</span>
          </button>

          {/* Select Tool */}
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            title="Select Tool (Tap elements to inspect)"
            className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition-all min-h-[38px] ${
              activeTool === 'select'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm">↖</span>
            <span className="text-xs font-semibold">Select</span>
          </button>

          <div className="w-[1px] h-5 bg-white/10 shrink-0" />

          {/* Integrated Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 10) / 10))}
              title="Zoom Out (-)"
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-sm"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetZoom}
              title="Reset Zoom to 100%"
              className="px-2 py-1 rounded text-[11px] font-mono font-bold text-zinc-300 hover:text-white hover:bg-white/10"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(3.0, Math.round((z + 0.1) * 10) / 10))}
              title="Zoom In (+)"
              className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white flex items-center justify-center font-bold text-sm"
            >
              +
            </button>
            {onFitToScreen && (
              <button
                type="button"
                onClick={onFitToScreen}
                title="Fit to Screen"
                className="w-8 h-8 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-cyan-300 flex items-center justify-center text-xs ml-0.5 border-l border-white/10 pl-1"
              >
                ⛶
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* ── Main Centered Floating Tool Dock ── */}
      <aside
        ref={toolbarRef}
        aria-label="Drawing tools"
        className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[96vw] select-none"
      >
        {/* Expandable Color & Stroke Tray (Floating above toolbar) */}
        {colorTrayOpen && canEdit && (
          <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[calc(100vw-1.5rem)] max-w-sm sm:max-w-md p-3 rounded-2xl border border-cyan-500/30 bg-[#10101c]/95 backdrop-blur-xl shadow-2xl space-y-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Row 1: Presets + RGB Picker + Hex */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {PALETTE.map(p => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => {
                      setActiveColor(p.hex);
                      setCustomHex(p.hex);
                    }}
                    title={p.name}
                    aria-label={`Select color ${p.name}`}
                    style={{ backgroundColor: p.hex }}
                    className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full transition-transform cursor-pointer ${
                      activeColor.toLowerCase() === p.hex.toLowerCase()
                        ? 'scale-115 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#09090f]'
                        : 'opacity-80 hover:opacity-100 hover:scale-110'
                    }`}
                  />
                ))}
              </div>

              {/* RGB / Hex Picker */}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-2 py-1 shrink-0">
                <label
                  title="Open Color Wheel Dialog"
                  className="relative w-5 h-5 rounded-full cursor-pointer overflow-hidden transition-transform hover:scale-110 shrink-0 ring-1 ring-white/30 flex items-center justify-center"
                  style={{
                    background:
                      'conic-gradient(from 180deg at 50% 50%, #ff0000 0deg, #ffff00 60deg, #00ff00 120deg, #00ffff 180deg, #0000ff 240deg, #ff00ff 300deg, #ff0000 360deg)',
                  }}
                >
                  <input
                    type="color"
                    value={activeColor.startsWith('#') && activeColor.length === 7 ? activeColor : '#00f0ff'}
                    onChange={e => {
                      setActiveColor(e.target.value);
                      setCustomHex(e.target.value);
                    }}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                </label>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">#</span>
                <input
                  type="text"
                  maxLength={6}
                  value={customHex.replace('#', '')}
                  onChange={e => {
                    const clean = e.target.value.replace(/[^0-9a-fA-F]/g, '');
                    setCustomHex('#' + clean);
                    if (clean.length === 6 || clean.length === 3) {
                      setActiveColor('#' + clean);
                    }
                  }}
                  placeholder="00f0ff"
                  className="w-14 bg-transparent text-[11px] font-mono text-white outline-none uppercase font-semibold"
                />
                <div
                  style={{ backgroundColor: activeColor }}
                  className="w-3.5 h-3.5 rounded-full ring-1 ring-white/20 shrink-0"
                />
              </div>
            </div>

            {/* Row 2: Stroke Widths */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-[11px] font-mono text-zinc-400 font-semibold">Stroke Width</span>
              <div className="flex items-center gap-1.5">
                {[
                  { w: 2, label: 'Thin' },
                  { w: 4, label: 'Medium' },
                  { w: 8, label: 'Thick' },
                ].map(({ w, label }) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setStrokeWidth(w)}
                    title={`${label} (${w}px)`}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      strokeWidth === w
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <div
                      style={{ height: `${w}px` }}
                      className="w-3 rounded-full bg-current"
                    />
                    <span>{w}px</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MOBILE TOOLBAR (< sm screens): Compact 6-tool + Undo/Redo dock with NO horizontal overflow ── */}
        <div className="flex sm:hidden items-center gap-1 p-1 rounded-2xl border border-cyan-500/25 bg-[#10101c]/95 backdrop-blur-xl shadow-2xl">
          {/* 1. Navigate / Select Toggle */}
          <button
            type="button"
            onClick={() => setActiveTool(activeTool === 'select' ? 'hand' : 'select')}
            title={activeTool === 'select' ? 'Select Mode active (Tap to switch to Pan)' : 'Pan Mode active (Tap to switch to Select)'}
            aria-label="Toggle Select or Pan"
            className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
              activeTool === 'select' || activeTool === 'hand'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm leading-none">{activeTool === 'hand' ? '✋' : '↖'}</span>
            <span className="text-[9px] font-mono leading-none mt-0.5">{activeTool === 'hand' ? 'Pan' : 'Sel'}</span>
          </button>

          {/* 2. Draw Toggle (Pen / Highlighter) */}
          <button
            type="button"
            onClick={() => {
              if (activeTool === 'pen') {
                setActiveTool('highlighter');
              } else {
                setActiveTool('pen');
              }
            }}
            title={activeTool === 'pen' ? 'Pen active (Tap for Highlighter)' : 'Draw (Tap for Pen)'}
            aria-label="Toggle Draw Pen or Highlighter"
            className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
              activeTool === 'pen' || activeTool === 'highlighter'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm leading-none">{activeTool === 'highlighter' ? '🖍️' : '✏️'}</span>
            <span className="text-[9px] font-mono leading-none mt-0.5">{activeTool === 'highlighter' ? 'High' : 'Pen'}</span>
          </button>

          {/* 3. Shapes & Arrows Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShapeMenuOpen(!shapeMenuOpen);
                setColorTrayOpen(false);
              }}
              title="Shapes & Lines"
              aria-label="Open shapes menu"
              className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
                activeTool === 'shape' || activeTool === 'arrow' || shapeMenuOpen
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-sm leading-none">{activeTool === 'arrow' ? '➔' : (SHAPES.find(s => s.id === activeShape)?.icon || '▭')}</span>
              <span className="text-[9px] font-mono leading-none mt-0.5">Shape</span>
            </button>

            {shapeMenuOpen && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2.5 rounded-2xl border border-cyan-500/30 bg-[#12121e]/98 shadow-2xl w-[260px] z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-mono uppercase text-zinc-400 font-bold px-1 mb-1.5 flex items-center justify-between">
                  <span>Shapes & Connectors</span>
                  <button
                    type="button"
                    onClick={() => setShapeMenuOpen(false)}
                    className="text-zinc-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {/* Arrow Tool */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('arrow');
                      setShapeMenuOpen(false);
                    }}
                    className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                      activeTool === 'arrow'
                        ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base leading-none">➔</span>
                    <span className="text-[9px] mt-1">Arrow</span>
                  </button>

                  {/* 7 Shapes */}
                  {SHAPES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveShape(s.id);
                        setActiveTool('shape');
                        setShapeMenuOpen(false);
                      }}
                      className={`p-2 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                        activeTool === 'shape' && activeShape === s.id
                          ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-bold'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-base leading-none">{s.icon}</span>
                      <span className="text-[9px] mt-1 truncate max-w-full">{s.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Text & Sticky Notes Toggle */}
          <button
            type="button"
            onClick={() => {
              if (activeTool === 'text') {
                setActiveTool('sticky');
              } else {
                setActiveTool('text');
              }
            }}
            title={activeTool === 'text' ? 'Text active (Tap for Sticky Note)' : 'Text & Sticky Notes'}
            aria-label="Toggle Text or Sticky Note"
            className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
              activeTool === 'text'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                : activeTool === 'sticky'
                ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm leading-none font-bold">{activeTool === 'sticky' ? '📝' : 'T'}</span>
            <span className="text-[9px] font-mono leading-none mt-0.5">{activeTool === 'sticky' ? 'Note' : 'Text'}</span>
          </button>

          {/* 5. Eraser */}
          <button
            type="button"
            onClick={() => setActiveTool('eraser')}
            title="Eraser & Area Delete"
            aria-label="Eraser tool"
            className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
              activeTool === 'eraser'
                ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm shadow-rose-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm leading-none">🗑️</span>
            <span className="text-[9px] font-mono leading-none mt-0.5">Erase</span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 mx-0.5 shrink-0" />

          {/* 6. Color & Stroke Pill */}
          <button
            type="button"
            onClick={() => {
              setColorTrayOpen(!colorTrayOpen);
              setShapeMenuOpen(false);
            }}
            title="Color & Stroke Options"
            aria-label="Open color palette"
            className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center ${
              colorTrayOpen
                ? 'bg-cyan-500/25 border border-cyan-500/50 shadow-sm'
                : 'bg-white/5 border border-white/10 text-zinc-300'
            }`}
          >
            <span
              style={{ backgroundColor: activeColor }}
              className="w-4 h-4 rounded-full ring-1 ring-white/50 shadow-sm"
            />
            <span className="text-[9px] font-mono leading-none mt-0.5 text-zinc-300">{strokeWidth}px</span>
          </button>

          <div className="w-[1px] h-6 bg-white/10 mx-0.5 shrink-0" />

          {/* 7. History Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
              aria-label="Undo"
              className="w-8 h-10 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-20 flex items-center justify-center transition-colors"
            >
              ↶
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo"
              aria-label="Redo"
              className="w-8 h-10 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-20 flex items-center justify-center transition-colors"
            >
              ↷
            </button>
          </div>
        </div>

        {/* ── DESKTOP TOOLBAR (≥ sm screens): Full comprehensive dock ── */}
        <div className="hidden sm:flex items-center gap-1 p-1.5 rounded-2xl border border-cyan-500/20 bg-[#10101c]/95 backdrop-blur-xl shadow-2xl">
          {/* Group 1: Navigation / Selection */}
          <div className="flex items-center gap-0.5">
            {/* Select / Move */}
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              title="Select / Move (V)"
              aria-label="Select tool"
              aria-pressed={activeTool === 'select'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center ${
                activeTool === 'select'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </button>

            {/* Hand / Pan */}
            <button
              type="button"
              onClick={() => setActiveTool('hand')}
              title="Pan / Hand tool (H or Space+Drag)"
              aria-label="Pan tool"
              aria-pressed={activeTool === 'hand'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center ${
                activeTool === 'hand'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Group 2: Freehand Drawing */}
          <div className="flex items-center gap-0.5">
            {/* Freehand Pen */}
            <button
              type="button"
              onClick={() => setActiveTool('pen')}
              disabled={!canEdit}
              title={canEdit ? 'Freehand Pen (P)' : 'Editing locked by Teacher'}
              aria-label="Freehand Pen tool"
              aria-pressed={activeTool === 'pen'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                activeTool === 'pen'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>

            {/* Highlighter */}
            <button
              type="button"
              onClick={() => setActiveTool('highlighter')}
              disabled={!canEdit}
              title={canEdit ? 'Highlighter' : 'Editing locked by Teacher'}
              aria-label="Highlighter tool"
              aria-pressed={activeTool === 'highlighter'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                activeTool === 'highlighter'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Group 3: Structured Shapes & Lines */}
          <div className="flex items-center gap-0.5">
            {/* Shapes Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  if (!canEdit) return;
                  setActiveTool('shape');
                  setShapeMenuOpen(!shapeMenuOpen);
                  setColorTrayOpen(false);
                }}
                disabled={!canEdit}
                title={canEdit ? 'Shapes' : 'Editing locked by Teacher'}
                aria-label="Select shape"
                aria-pressed={activeTool === 'shape'}
                className={`p-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1 min-w-[42px] min-h-[36px] justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                  activeTool === 'shape'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                    : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-sm">
                  {SHAPES.find(s => s.id === activeShape)?.icon || '▭'}
                </span>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {shapeMenuOpen && canEdit && (
                <div className="absolute bottom-full mb-2 left-0 p-1.5 rounded-xl border border-cyan-500/20 bg-[#12121e] shadow-2xl min-w-[150px] space-y-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {SHAPES.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveShape(s.id);
                        setActiveTool('shape');
                        setShapeMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                        activeShape === s.id
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                          : 'text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Arrow / Line */}
            <button
              type="button"
              onClick={() => setActiveTool('arrow')}
              disabled={!canEdit}
              title={canEdit ? 'Arrow (A)' : 'Editing locked by Teacher'}
              aria-label="Arrow tool"
              aria-pressed={activeTool === 'arrow'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                activeTool === 'arrow'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Group 4: Text & Sticky Notes */}
          <div className="flex items-center gap-0.5">
            {/* Text */}
            <button
              type="button"
              onClick={() => setActiveTool('text')}
              disabled={!canEdit}
              title={canEdit ? 'Text (T) — Click canvas to write' : 'Editing locked by Teacher'}
              aria-label="Text tool"
              aria-pressed={activeTool === 'text'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                activeTool === 'text'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-400'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="font-serif font-black text-sm px-0.5">T</span>
            </button>

            {/* Sticky Note */}
            <button
              type="button"
              onClick={() => setActiveTool('sticky')}
              disabled={!canEdit}
              title={canEdit ? 'Add Sticky Note (N)' : 'Editing locked by Teacher'}
              aria-label="Sticky note tool"
              aria-pressed={activeTool === 'sticky'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed ${
                activeTool === 'sticky'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Group 5: Eraser & Style */}
          <div className="flex items-center gap-0.5">
            {/* Eraser / Area Delete */}
            <button
              type="button"
              onClick={() => setActiveTool('eraser')}
              disabled={!canEdit}
              title={canEdit ? 'Eraser & Area Delete (E)' : 'Editing locked by Teacher'}
              aria-label="Eraser & Area Delete tool"
              aria-pressed={activeTool === 'eraser'}
              className={`p-2 rounded-xl text-xs font-medium transition-all min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                activeTool === 'eraser'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Color Palette Toggle Pill */}
            <button
              type="button"
              onClick={() => {
                if (!canEdit) return;
                setColorTrayOpen(!colorTrayOpen);
                setShapeMenuOpen(false);
              }}
              disabled={!canEdit}
              title={canEdit ? 'Color & Stroke Options' : 'Editing locked by Teacher'}
              aria-label="Open color palette"
              aria-expanded={colorTrayOpen}
              className={`p-1.5 sm:px-2 rounded-xl border flex items-center gap-1.5 transition-all min-h-[36px] disabled:opacity-25 disabled:cursor-not-allowed ${
                colorTrayOpen
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-[var(--color-text-secondary)] hover:bg-white/10'
              }`}
            >
              <span
                style={{ backgroundColor: activeColor }}
                className="w-3.5 h-3.5 rounded-full ring-1 ring-white/40 shadow-sm"
              />
              <span className="text-[10px] font-mono hidden md:inline">
                {strokeWidth}px
              </span>
              <svg className={`w-2.5 h-2.5 transition-transform ${colorTrayOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="w-[1px] h-5 bg-white/10 mx-0.5 shrink-0" />

          {/* Group 6: History Undo / Redo */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              aria-label="Undo last drawing stroke"
              className="p-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent min-w-[34px] min-h-[36px] flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              aria-label="Redo last drawing stroke"
              className="p-2 rounded-xl text-xs text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:hover:bg-transparent min-w-[34px] min-h-[36px] flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Corner Zoom & Fit Control Dock (Bottom Left on Mobile, Bottom Right on Desktop) ── */}
      <div
        aria-label="Canvas Zoom and Fit Controls"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-3 sm:left-auto sm:right-6 sm:bottom-6 z-30 flex items-center gap-1 p-1 rounded-2xl border border-cyan-500/20 bg-[#10101c]/95 backdrop-blur-xl shadow-2xl text-[11px] font-mono text-[var(--color-text-muted)] select-none"
      >
        <button
          type="button"
          onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 10) / 10))}
          title="Zoom Out (-)"
          aria-label="Zoom Out"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-white/10 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
        >
          −
        </button>

        <button
          type="button"
          onClick={resetZoom}
          title="Reset Zoom to 100%"
          aria-label="Reset Zoom"
          className="px-2 py-1 rounded-lg hover:text-cyan-300 hover:bg-white/10 font-bold text-[10px] text-zinc-300 transition-colors cursor-pointer"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={() => setZoom(z => Math.min(3.0, Math.round((z + 0.1) * 10) / 10))}
          title="Zoom In (+)"
          aria-label="Zoom In"
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-white/10 hover:text-white flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
        >
          +
        </button>

        {onFitToScreen && (
          <button
            type="button"
            onClick={onFitToScreen}
            title="Fit Elements to Screen"
            aria-label="Fit elements to screen"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl hover:bg-white/10 hover:text-cyan-300 flex items-center justify-center transition-colors text-xs font-semibold ml-0.5 border-l border-white/10 pl-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}
