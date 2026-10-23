'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BoardElement,
  BoardShapeType,
  BoardTemplate,
  ConnectedBoardUser,
  getTemplateElements,
} from '@n1/shared';
import {
  fetchBoardRoom,
  connectBoardSocket,
  syncBoardElements,
  clearBoardElements,
  BoardRoomDetail,
  BoardConnectionStatus,
} from '../../../lib/board-client';
import {
  exportBoardAsPng,
  exportBoardAsSvg,
  exportBoardAsJson,
} from '../../../lib/board-export';
import { BoardCanvas } from '../../../components/board/BoardCanvas';
import { BoardToolbar, CanvasTool } from '../../../components/board/BoardToolbar';
import { BoardHeader } from '../../../components/board/BoardHeader';
import { ShareModal } from '../../../components/board/ShareModal';
import { Button } from '../../../components/ui/Button';

export default function StudyBoardRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params?.code as string) || '').toUpperCase().trim();

  // Room metadata
  const [room, setRoom] = useState<BoardRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Active canvas state
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [activeColor, setActiveColor] = useState<string>('#00f0ff');
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [activeShape, setActiveShape] = useState<BoardShapeType>('rectangle');
  const [zoom, setZoom] = useState<number>(1.0);

  // Undo / Redo history
  const [history, setHistory] = useState<BoardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyIndexRef = useRef<number>(-1);
  const historyRef = useRef<BoardElement[][]>([]);

  // Collaboration state
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<BoardConnectionStatus>('CONNECTING');
  const [peerUsers, setPeerUsers] = useState<ConnectedBoardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<ConnectedBoardUser | null>(null);
  const socketRef = useRef<ReturnType<typeof connectBoardSocket> | null>(null);

  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // 1. Initial Room Load via REST
  useEffect(() => {
    if (!roomCode) return;

    let mounted = true;
    setLoading(true);
    setLoadError(null);

    fetchBoardRoom(roomCode)
      .then(data => {
        if (!mounted) return;
        if (data.isExpired) {
          setIsExpired(true);
          setLoading(false);
          return;
        }

        setRoom(data);
        const initElems = data.elements || [];
        setElements(initElems);
        setHistory([initElems]);
        setHistoryIndex(0);
        historyIndexRef.current = 0;
        historyRef.current = [initElems];
        setLoading(false);
      })
      .catch(err => {
        if (!mounted) return;
        setLoadError((err as Error).message || 'Failed to load study room');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [roomCode]);

  // 2. Establish Real-Time WebSocket Connection
  useEffect(() => {
    if (!roomCode || isExpired || loading) return;

    const socket = connectBoardSocket(roomCode, {
      onRoomState: (_roomData, initialElements, users, me) => {
        setElements(initialElements);
        setPeerUsers(users);
        setCurrentUser(me);
        setHistory([initialElements]);
        setHistoryIndex(0);
      },
      onUserJoined: user => {
        setPeerUsers(prev => {
          if (prev.some(u => u.id === user.id)) return prev;
          return [...prev, user];
        });
      },
      onUserLeft: userId => {
        setPeerUsers(prev => prev.filter(u => u.id !== userId));
      },
      onUserCursor: (userId, _userName, _userColor, x, y) => {
        setPeerUsers(prev =>
          prev.map(u => {
            if (u.id === userId) {
              return { ...u, cursor: { x, y } };
            }
            return u;
          })
        );
      },
      onElementsSync: nextElements => {
        setElements(nextElements);
      },
      onElementSync: (element, action) => {
        setElements(prev => {
          if (action === 'delete') {
            return prev.filter(el => el.id !== element.id);
          } else if (action === 'update') {
            return prev.map(el => (el.id === element.id ? element : el));
          } else {
            return [...prev, element];
          }
        });
      },
      onBoardCleared: () => {
        setElements([]);
      },
      onRoomExpired: () => {
        setIsExpired(true);
      },
      onError: msg => {
        console.warn('[Board] Socket error:', msg);
      },
      onConnectionChange: connected => {
        setIsConnected(connected);
      },
      onConnectionStatusChange: status => {
        setConnectionStatus(status);
        setIsConnected(status === 'CONNECTED');
      },
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [roomCode, isExpired, loading]);

  // Push history state with deduplication to prevent dead undo clicks
  const handleHistoryPush = useCallback(
    (nextElements: BoardElement[]) => {
      const curIdx = historyIndexRef.current;
      const hist = historyRef.current;
      const current = hist[curIdx];

      // Avoid pushing consecutive identical states
      if (
        current &&
        current.length === nextElements.length &&
        JSON.stringify(current) === JSON.stringify(nextElements)
      ) {
        return;
      }

      const sliced = hist.slice(0, Math.max(0, curIdx + 1));
      const nextHist = [...sliced, nextElements];
      if (nextHist.length > 50) {
        nextHist.shift();
      }
      const nextIdx = nextHist.length - 1;
      historyRef.current = nextHist;
      historyIndexRef.current = nextIdx;
      setHistory(nextHist);
      setHistoryIndex(nextIdx);
    },
    []
  );

  // Undo
  const handleUndo = useCallback(() => {
    const curIdx = historyIndexRef.current;
    const hist = historyRef.current;
    if (curIdx > 0) {
      const prevIdx = curIdx - 1;
      const target = hist[prevIdx];
      if (target) {
        historyIndexRef.current = prevIdx;
        setHistoryIndex(prevIdx);
        setElements(target);
        socketRef.current?.sendElementsUpdate(target);
        syncBoardElements(roomCode, target);
      }
    }
  }, [roomCode]);

  // Redo
  const handleRedo = useCallback(() => {
    const curIdx = historyIndexRef.current;
    const hist = historyRef.current;
    if (curIdx < hist.length - 1) {
      const nextIdx = curIdx + 1;
      const target = hist[nextIdx];
      if (target) {
        historyIndexRef.current = nextIdx;
        setHistoryIndex(nextIdx);
        setElements(target);
        socketRef.current?.sendElementsUpdate(target);
        syncBoardElements(roomCode, target);
      }
    }
  }, [roomCode]);

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (modKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleUndo, handleRedo]);

  // Canvas change handler (syncs to peers & backup REST)
  const handleElementsChange = useCallback(
    (nextElements: BoardElement[]) => {
      socketRef.current?.sendElementsUpdate(nextElements);
    },
    []
  );

  // Cursor broadcast
  const handleCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.sendCursor(x, y);
  }, []);

  // Clear board
  const handleClear = useCallback(() => {
    setElements([]);
    handleHistoryPush([]);
    socketRef.current?.sendClearBoard();
    clearBoardElements(roomCode);
  }, [roomCode, handleHistoryPush]);

  // Switch / Apply Template cleanly without merging/overlapping
  const handleSelectTemplate = useCallback(
    (t: BoardTemplate) => {
      const newItems = getTemplateElements(t);
      setElements(newItems);
      handleHistoryPush(newItems);
      socketRef.current?.sendElementsUpdate(newItems);
      syncBoardElements(roomCode, newItems);
      setRoom(prev => (prev ? { ...prev, template: t } : null));
    },
    [roomCode, handleHistoryPush]
  );

  // ── Render Expired State ──
  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090f]">
        <div className="w-full max-w-md p-8 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">This Study Room Has Expired</h1>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              All canvas content, diagrams, formulas, and sticky notes have been permanently purged
              according to N1&apos;s zero-retention automated self-destruct policy.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] font-mono text-xs text-[var(--color-text-muted)]">
            Room Code: <span className="text-white font-bold">{roomCode}</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/board')}
            className="w-full justify-center"
          >
            Create a New Study Board →
          </Button>
        </div>
      </div>
    );
  }

  // ── Render Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-[var(--color-text-muted)]">
            Connecting to Study Room {roomCode}...
          </p>
        </div>
      </div>
    );
  }

  // ── Render Error State ──
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090f]">
        <div className="w-full max-w-md p-8 rounded-3xl border border-red-500/20 bg-[var(--color-surface)] text-center space-y-4">
          <h2 className="text-lg font-bold text-red-300">Room Not Found</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">{loadError}</p>
          <Link href="/board">
            <Button variant="secondary" size="md">
              Back to Study Board Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 w-screen h-screen overflow-hidden bg-[#09090f] flex flex-col">
      {/* ── Top Header ── */}
      <BoardHeader
        roomCode={roomCode}
        roomTitle={room?.title || 'Study Session'}
        template={room?.template || 'blank'}
        expiresAt={room?.expiresAt || ''}
        isExpired={isExpired}
        isConnected={isConnected}
        connectionStatus={connectionStatus}
        connectedUsers={peerUsers}
        currentUser={currentUser}
        onShare={() => setShareModalOpen(true)}
        onExportPng={() => exportBoardAsPng(elements, room?.title || roomCode)}
        onExportSvg={() => exportBoardAsSvg(elements, room?.title || roomCode)}
        onExportJson={() =>
          exportBoardAsJson(elements, {
            code: roomCode,
            title: room?.title || 'Study Session',
            template: room?.template || 'blank',
          })
        }
        onClear={handleClear}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Non-synchronized Connection Warning Banner */}
      {connectionStatus !== 'CONNECTED' && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-xl animate-fadeIn max-w-[90vw] text-center"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>
            {connectionStatus === 'CONNECTING'
              ? 'Connecting to real-time session...'
              : connectionStatus === 'RECONNECTING'
              ? 'Connection lost. Reconnecting canvas...'
              : 'Disconnected from real-time sync. Reconnecting...'}
          </span>
        </div>
      )}

      {/* ── Main Canvas Engine ── */}
      <main className="flex-1 w-full h-full pt-14">
        <BoardCanvas
          elements={elements}
          setElements={setElements}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          strokeWidth={strokeWidth}
          activeShape={activeShape}
          zoom={zoom}
          setZoom={setZoom}
          peerUsers={peerUsers.filter(u => u.id !== currentUser?.id)}
          onElementsChange={handleElementsChange}
          onCursorMove={handleCursorMove}
          onHistoryPush={handleHistoryPush}
        />
      </main>

      {/* ── Bottom Floating Toolbar ── */}
      <BoardToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        activeColor={activeColor}
        setActiveColor={setActiveColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        activeShape={activeShape}
        setActiveShape={setActiveShape}
        zoom={zoom}
        setZoom={setZoom}
        resetZoom={() => setZoom(1.0)}
        onFitToScreen={() => window.dispatchEvent(new CustomEvent('n1:board-fit-screen'))}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* ── Share Modal ── */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        roomCode={roomCode}
        roomTitle={room?.title || 'Study Session'}
      />
    </div>
  );
}
