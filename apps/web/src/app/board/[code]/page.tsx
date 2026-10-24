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
  getStoredCreatorToken,
} from '../../../lib/board-client';
import {
  exportBoardAsPng,
  exportBoardAsSvg,
  exportBoardAsJson,
} from '../../../lib/board-export';
import { BoardCanvas, RemoteLiveStroke } from '../../../components/board/BoardCanvas';
import { BoardToolbar, CanvasTool } from '../../../components/board/BoardToolbar';
import { BoardHeader } from '../../../components/board/BoardHeader';
import { ShareModal } from '../../../components/board/ShareModal';
import { Button } from '../../../components/ui/Button';

export default function StudyBoardRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params?.code as string) || '').toUpperCase().trim();

  // Room metadata & Role state
  const [room, setRoom] = useState<BoardRoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isCreator, setIsCreator] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<'admin' | 'participant'>('participant');
  const [allowParticipantEditing, setAllowParticipantEditing] = useState<boolean>(true);

  // Classroom / Presentation mode
  const [presenterUserId, setPresenterUserId] = useState<string | null>(null);
  const [isFollowingPresenter, setIsFollowingPresenter] = useState<boolean>(true);
  const [remoteViewport, setRemoteViewport] = useState<{ panX: number; panY: number; zoom: number } | null>(null);

  // Live streaming strokes & activity
  const [remoteLiveStrokes, setRemoteLiveStrokes] = useState<Map<string, RemoteLiveStroke>>(new Map());
  const [recentActivity, setRecentActivity] = useState<{
    userName: string;
    action: string;
    details?: string;
    timestamp: number;
  } | null>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Effective permission: Room Admins (and creator) can always edit. Participants edit when allowed.
  const isAdmin = userRole === 'admin' || isCreator;
  const canEdit = isAdmin || allowParticipantEditing;

  // 1. Initial Room Load via REST
  useEffect(() => {
    if (!roomCode) return;

    let mounted = true;
    setLoading(true);
    setLoadError(null);

    const storedToken = getStoredCreatorToken(roomCode);

    fetchBoardRoom(roomCode)
      .then(data => {
        if (!mounted) return;
        if (data.isExpired) {
          setIsExpired(true);
          setLoading(false);
          return;
        }

        setRoom(data);
        if (data.allowParticipantEditing !== undefined) {
          setAllowParticipantEditing(data.allowParticipantEditing);
        }
        if (data.isCreator || !!storedToken) {
          setIsCreator(true);
          setUserRole('admin');
        }
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
      onRoomState: (_roomData, initialElements, users, me, isCreatorFlag, allowEditing, role, presenterId) => {
        setElements(initialElements);
        setPeerUsers(users);
        setCurrentUser(me);
        setHistory([initialElements]);
        setHistoryIndex(0);
        historyIndexRef.current = 0;
        historyRef.current = [initialElements];
        if (allowEditing !== undefined) {
          setAllowParticipantEditing(allowEditing);
        }
        if (isCreatorFlag !== undefined) {
          setIsCreator(isCreatorFlag);
        }
        if (role) {
          setUserRole(role);
        } else if (isCreatorFlag || me?.role === 'admin' || me?.isOwner) {
          setUserRole('admin');
        }
        if (presenterId !== undefined) {
          setPresenterUserId(presenterId);
        }
      },
      onUserJoined: user => {
        setPeerUsers(prev => {
          if (prev.some(u => u.id === user.id)) return prev;
          return [...prev, user];
        });
        setRecentActivity({
          userName: user.name,
          action: 'joined the study room',
          timestamp: Date.now(),
        });
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
      },
      onUserLeft: userId => {
        setPeerUsers(prev => {
          const departing = prev.find(u => u.id === userId);
          if (departing) {
            setRecentActivity({
              userName: departing.name,
              action: 'left the study room',
              timestamp: Date.now(),
            });
            if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
            activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
          }
          return prev.filter(u => u.id !== userId);
        });
        if (presenterUserId === userId) {
          setPresenterUserId(null);
        }
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
      onLiveDrawChunk: chunk => {
        setRemoteLiveStrokes(prev => {
          const next = new Map(prev);
          if (chunk.isFinished) {
            next.delete(chunk.strokeId);
          } else {
            next.set(chunk.strokeId, {
              userId: chunk.userId,
              userName: chunk.userName,
              userColor: '#00f0ff',
              strokeId: chunk.strokeId,
              points: chunk.points,
              isHighlighter: Boolean(chunk.isHighlighter),
              color: chunk.color,
              strokeWidth: chunk.strokeWidth,
            });
          }
          return next;
        });
      },
      onViewportUpdate: vp => {
        if (isFollowingPresenter) {
          setRemoteViewport({ panX: vp.panX, panY: vp.panY, zoom: vp.zoom });
        }
      },
      onActivityIndicator: act => {
        setRecentActivity({ userName: act.userName, action: act.action, details: act.details, timestamp: act.timestamp });
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
      },
      onPermissionsUpdated: allowed => {
        setAllowParticipantEditing(allowed);
        setRecentActivity({
          userName: 'Admin',
          action: allowed ? 'unlocked participant editing' : 'locked editing to Admins only',
          timestamp: Date.now(),
        });
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
      },
      onRoleUpdated: update => {
        setPeerUsers(prev =>
          prev.map(u => (u.id === update.userId ? { ...u, role: update.role } : u))
        );
        if (currentUser?.id === update.userId) {
          setUserRole(update.role);
          setCurrentUser(prev => (prev ? { ...prev, role: update.role } : prev));
          setRecentActivity({
            userName: 'System',
            action:
              update.role === 'admin'
                ? 'You were promoted to Room Admin!'
                : 'Your admin privileges were revoked.',
            timestamp: Date.now(),
          });
          if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
          activityTimerRef.current = setTimeout(() => setRecentActivity(null), 5000);
        }
      },
      onPresentationState: state => {
        setPresenterUserId(state.presenterUserId);
      },
      onBoardCleared: () => {
        setElements([]);
        setHistory([[]]);
        setHistoryIndex(0);
        historyIndexRef.current = 0;
        historyRef.current = [[]];
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
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    };
  }, [roomCode, isExpired, loading, isFollowingPresenter, currentUser?.id, presenterUserId]);

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
    if (!canEdit) return;
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
  }, [roomCode, canEdit]);

  // Redo
  const handleRedo = useCallback(() => {
    if (!canEdit) return;
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
  }, [roomCode, canEdit]);

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
      if (!canEdit) return;
      socketRef.current?.sendElementsUpdate(nextElements);
    },
    [canEdit]
  );

  // Live drawing chunk streamer
  const handleLiveDrawChunk = useCallback(
    (
      strokeId: string,
      points: { x: number; y: number; pressure?: number }[],
      color: string,
      strokeWidth: number,
      isHighlighter?: boolean,
      isFinished?: boolean
    ) => {
      if (!canEdit) return;
      socketRef.current?.sendLiveDraw(
        strokeId,
        points.map(p => ({ x: p.x, y: p.y })),
        color,
        strokeWidth,
        isHighlighter,
        isFinished
      );
    },
    [canEdit]
  );

  // Viewport change streaming (broadcasts if current user is active presenter)
  const handleViewportChange = useCallback(
    (pan: { x: number; y: number }, z: number) => {
      if (presenterUserId === currentUser?.id) {
        socketRef.current?.sendViewportSync(pan.x, pan.y, z);
      }
    },
    [presenterUserId, currentUser?.id]
  );

  // Cursor broadcast
  const handleCursorMove = useCallback((x: number, y: number) => {
    socketRef.current?.sendCursor(x, y);
  }, []);

  // Clear board
  const handleClear = useCallback(() => {
    if (!canEdit) return;
    setElements([]);
    handleHistoryPush([]);
    socketRef.current?.sendClearBoard();
    socketRef.current?.sendActivityBroadcast('cleared the entire board');
    clearBoardElements(roomCode);
  }, [roomCode, handleHistoryPush, canEdit]);

  // Switch / Apply Template cleanly without merging/overlapping
  const handleSelectTemplate = useCallback(
    (t: BoardTemplate) => {
      if (!canEdit) return;
      const newItems = getTemplateElements(t);
      setElements(newItems);
      handleHistoryPush(newItems);
      socketRef.current?.sendElementsUpdate(newItems);
      socketRef.current?.sendActivityBroadcast(`applied ${t} template`);
      syncBoardElements(roomCode, newItems);
      setRoom(prev => (prev ? { ...prev, template: t } : null));
    },
    [roomCode, handleHistoryPush, canEdit]
  );

  // Classroom & Permission controls
  const handleTogglePermissions = useCallback(() => {
    if (!isAdmin) return;
    const next = !allowParticipantEditing;
    setAllowParticipantEditing(next);
    socketRef.current?.sendTogglePermissions(next);
  }, [isAdmin, allowParticipantEditing]);

  const handlePromoteUser = useCallback((userId: string) => {
    socketRef.current?.sendPromoteUser(userId);
  }, []);

  const handleRevokeAdmin = useCallback((userId: string) => {
    socketRef.current?.sendRevokeAdmin(userId);
  }, []);

  const handleStartPresenting = useCallback(() => {
    socketRef.current?.sendStartPresenting();
  }, []);

  const handleStopPresenting = useCallback(() => {
    socketRef.current?.sendStopPresenting();
  }, []);

  const handleToggleFollowPresenter = useCallback(() => {
    setIsFollowingPresenter(prev => !prev);
  }, []);

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
        isAdmin={isAdmin}
        isCreator={isCreator}
        presenterUserId={presenterUserId}
        isFollowingPresenter={isFollowingPresenter}
        onToggleFollowPresenter={handleToggleFollowPresenter}
        onStartPresenting={handleStartPresenting}
        onStopPresenting={handleStopPresenting}
        onPromoteUser={handlePromoteUser}
        onRevokeAdmin={handleRevokeAdmin}
        allowParticipantEditing={allowParticipantEditing}
        onToggleParticipantEditing={handleTogglePermissions}
        recentActivity={recentActivity}
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
          canEdit={canEdit}
          isCreator={isAdmin}
          remoteLiveStrokes={remoteLiveStrokes}
          onLiveDrawChunk={handleLiveDrawChunk}
          onViewportChange={handleViewportChange}
          externalViewport={
            isFollowingPresenter && remoteViewport && presenterUserId !== currentUser?.id
              ? { pan: { x: remoteViewport.panX, y: remoteViewport.panY }, zoom: remoteViewport.zoom }
              : null
          }
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
        canEdit={canEdit}
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
