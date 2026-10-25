'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BoardElement,
  BoardShapeType,
  BoardTemplate,
  ConnectedBoardUser,
  BoardChatMessage,
  getTemplateElements,
} from '@n1/shared';
import {
  fetchBoardRoom,
  connectBoardSocket,
  syncBoardElements,
  clearBoardElements,
  claimBoardHost,
  saveCreatorToken,
  BoardRoomDetail,
  BoardConnectionStatus,
  getStoredCreatorToken,
  isUserKickedLocally,
  markUserKicked,
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
import { BoardChatDrawer } from '../../../components/board/BoardChatDrawer';
import { ReactionOverlay, FloatingReactionItem } from '../../../components/board/ReactionOverlay';
import { Button } from '../../../components/ui/Button';

export default function StudyBoardRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomCode = ((params?.code as string) || '').toUpperCase().trim();

  // Read host/creator token from URL query params (e.g. ?host=cr_... or ?token=cr_...)
  useEffect(() => {
    if (!roomCode || !searchParams) return;
    const urlToken = searchParams.get('host') || searchParams.get('token') || searchParams.get('creatorToken');
    if (urlToken) {
      saveCreatorToken(roomCode, urlToken);
      setIsCreator(true);
      setUserRole('admin');
    }
  }, [roomCode, searchParams]);

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

  // Modals & Classroom Interactive Panels
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<BoardChatMessage[]>([]);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const chatOpenRef = useRef(chatOpen);
  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);

  // Raise hand & Reactions state
  const [handRaised, setHandRaised] = useState<boolean>(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);

  // Kicked modal notification
  const [kickedModalReason, setKickedModalReason] = useState<string | null>(null);

  // Auto-focus on Admin activity (drawings, notes, edits)
  const [autoFocusEnabled, setAutoFocusEnabled] = useState<boolean>(true);
  const [isUserExploring, setIsUserExploring] = useState<boolean>(false);
  const [adminFocusTarget, setAdminFocusTarget] = useState<{ x: number; y: number; timestamp: number } | null>(null);
  const userExploringTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effective permission: Room Admins (and creator) can always edit. Participants edit when allowed.
  const isAdmin = userRole === 'admin' || isCreator;
  const canEdit = isAdmin || allowParticipantEditing;

  const isAdminRef = useRef(isAdmin);
  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  // Stable refs to prevent tearing down WebSocket connections when UI state changes
  const isFollowingPresenterRef = useRef(isFollowingPresenter);
  useEffect(() => {
    isFollowingPresenterRef.current = isFollowingPresenter;
  }, [isFollowingPresenter]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const presenterUserIdRef = useRef(presenterUserId);
  useEffect(() => {
    presenterUserIdRef.current = presenterUserId;
  }, [presenterUserId]);

  const dbSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Room Load via REST
  useEffect(() => {
    if (!roomCode) return;

    if (isUserKickedLocally(roomCode)) {
      setKickedModalReason('You have been removed from this study room by an admin.');
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setLoadError(null);

    const storedToken = getStoredCreatorToken(roomCode);

    fetchBoardRoom(roomCode, storedToken)
      .then(data => {
        if (!mounted) return;
        if (data.isExpired) {
          setIsExpired(true);
          setLoading(false);
          return;
        }

        setRoom(data);
        if (data.messages && data.messages.length > 0) {
          setChatMessages(data.messages);
        }
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
        if (err.code === 'USER_KICKED' || isUserKickedLocally(roomCode)) {
          setKickedModalReason(err.message || 'You have been removed from this study room by an admin.');
          setLoading(false);
          return;
        }
        setLoadError((err as Error).message || 'Failed to load study room');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [roomCode]);

  // 2. Establish Real-Time WebSocket Connection
  useEffect(() => {
    const storedCreatorToken = getStoredCreatorToken(roomCode);

    const socket = connectBoardSocket(
      roomCode,
      {
        onRoomState: (_roomData, initialElements, users, me, isCreatorFlag, allowEditing, role, presenterId, recentMessages) => {
          setElements(prev => {
            if (prev.length === 0) return initialElements;
            // Smart reconciliation: never wipe local work if server state is empty or stale on reconnect
            const mergedMap = new Map<string, BoardElement>();
            for (const el of initialElements) mergedMap.set(el.id, el);
            for (const el of prev) {
              const serverEl = mergedMap.get(el.id);
              if (!serverEl || (el.updatedAt && (!serverEl.updatedAt || el.updatedAt >= serverEl.updatedAt))) {
                mergedMap.set(el.id, el);
              }
            }
            const merged = Array.from(mergedMap.values());
            // If local client had unpersisted elements, sync them to server
            if (merged.length > initialElements.length) {
              socketRef.current?.sendElementsUpdate(merged);
              syncBoardElements(roomCode, merged);
            }
            return merged;
          });

          setPeerUsers(users);
          setCurrentUser(me);
          setHistory([initialElements]);
          setHistoryIndex(0);
          historyIndexRef.current = 0;
          historyRef.current = [initialElements];
          if (allowEditing !== undefined) {
            setAllowParticipantEditing(allowEditing);
          }
          const hasLocalToken = Boolean(getStoredCreatorToken(roomCode));
          const effectiveIsCreator = isCreatorFlag || hasLocalToken || Boolean(me?.isOwner);
          setIsCreator(effectiveIsCreator);
          if (effectiveIsCreator) {
            setUserRole('admin');
          } else if (role) {
            setUserRole(role);
          } else if (me?.role === 'admin' || me?.isOwner) {
            setUserRole('admin');
          }
          if (presenterId !== undefined) {
            setPresenterUserId(presenterId);
          }
          if (recentMessages && recentMessages.length > 0) {
            setChatMessages(recentMessages);
          }
          if (me?.handRaised) {
            setHandRaised(true);
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
        if (presenterUserIdRef.current === userId) {
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
        if (!isAdminRef.current && nextElements.length > 0) {
          let latestEl = nextElements[0];
          for (const el of nextElements) {
            if ((el.updatedAt || 0) > (latestEl?.updatedAt || 0)) {
              latestEl = el;
            }
          }
          if (latestEl) {
            const centerX = latestEl.x + (latestEl.width || 120) / 2;
            const centerY = latestEl.y + (latestEl.height || 60) / 2;
            setAdminFocusTarget({ x: centerX, y: centerY, timestamp: Date.now() });
          }
        }
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
        if (!isAdminRef.current && action !== 'delete' && element) {
          const centerX = element.x + (element.width || 120) / 2;
          const centerY = element.y + (element.height || 60) / 2;
          setAdminFocusTarget({ x: centerX, y: centerY, timestamp: Date.now() });
        }
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

        // Real-time auto-focus on Admin live drawing
        if (!isAdminRef.current && chunk.points && chunk.points.length > 0) {
          const pt = chunk.points[chunk.points.length - 1] || chunk.points[0];
          if (pt) {
            setAdminFocusTarget({ x: pt.x, y: pt.y, timestamp: Date.now() });
          }
        }
      },
      onViewportUpdate: vp => {
        if (!isAdminRef.current) {
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
        if (currentUserRef.current?.id === update.userId) {
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
      onChatMessage: msg => {
        setChatMessages(prev => {
          const idIdx = prev.findIndex(m => m.id === msg.id);
          if (idIdx !== -1) {
            const next = [...prev];
            next[idIdx] = { ...msg, status: 'sent' };
            return next;
          }
          const optIdx = prev.findIndex(
            m => m.status === 'sending' && m.userId === msg.userId && m.text === msg.text
          );
          if (optIdx !== -1) {
            const next = [...prev];
            next[optIdx] = { ...msg, status: 'sent' };
            return next;
          }
          return [...prev, { ...msg, status: 'sent' }];
        });
        if (!chatOpenRef.current) {
          setUnreadMessageCount(c => c + 1);
        }
      },
      onHandState: state => {
        setPeerUsers(prev =>
          prev.map(u => (u.id === state.userId ? { ...u, handRaised: state.handRaised } : u))
        );
        if (currentUserRef.current?.id === state.userId) {
          setHandRaised(state.handRaised);
        }
      },
      onReactionBurst: rx => {
        const xPercent = 15 + Math.floor(Math.random() * 70);
        const item: FloatingReactionItem = {
          id: rx.id,
          emoji: rx.emoji,
          userName: rx.userName,
          xPercent,
        };
        setFloatingReactions(prev => [...prev, item]);
        setTimeout(() => {
          setFloatingReactions(prev => prev.filter(r => r.id !== rx.id));
        }, 2700);
      },
      onUserKicked: evt => {
        setPeerUsers(prev => prev.filter(u => u.id !== evt.userId));
        setRecentActivity({
          userName: 'System',
          action: `${evt.userName} was removed from the study room`,
          timestamp: Date.now(),
        });
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        activityTimerRef.current = setTimeout(() => setRecentActivity(null), 5000);
      },
      onKicked: reason => {
        const kickMsg = reason || 'You have been removed from this study session by an admin.';
        setKickedModalReason(kickMsg);
        markUserKicked(roomCode);
        socketRef.current?.disconnect();
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
      onHostClaimed: token => {
        if (token) saveCreatorToken(roomCode, token);
        setIsCreator(true);
        setUserRole('admin');
        setRecentActivity({
          userName: 'Host Authority',
          action: 'Host privileges verified and claimed 👑',
          timestamp: Date.now(),
        });
        if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
        activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
      },
      onError: msg => {
        setLoadError(msg);
      },
      onConnectionChange: connected => {
        setIsConnected(connected);
      },
      onConnectionStatusChange: status => {
        setConnectionStatus(status);
        setIsConnected(status === 'CONNECTED');
      },
    },
    undefined,
    storedCreatorToken
  );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      if (userExploringTimerRef.current) clearTimeout(userExploringTimerRef.current);
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
      // 1. Instant WebSocket broadcast to connected classroom peers
      socketRef.current?.sendElementsUpdate(nextElements);

      // 2. Debounced REST database persistence (within 800ms) for high durability
      if (dbSyncTimerRef.current) clearTimeout(dbSyncTimerRef.current);
      dbSyncTimerRef.current = setTimeout(() => {
        syncBoardElements(roomCode, nextElements);
      }, 800);
    },
    [canEdit, roomCode]
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

  // Viewport change streaming (broadcasts whenever admin or presenter pans or zooms)
  const handleViewportChange = useCallback(
    (pan: { x: number; y: number }, z: number) => {
      if (isAdmin || presenterUserId === currentUser?.id) {
        socketRef.current?.sendViewportSync(pan.x, pan.y, z);
      }
    },
    [isAdmin, presenterUserId, currentUser?.id]
  );

  // User manual exploration / scroll tracking
  const handleUserManualPan = useCallback(() => {
    if (isAdmin) return; // Room admins lead and don't get auto-focused
    setIsUserExploring(prev => (prev ? prev : true));

    if (userExploringTimerRef.current) {
      clearTimeout(userExploringTimerRef.current);
    }

    // After 7 seconds of inactivity (no scrolling/panning), auto-focus gently re-engages
    userExploringTimerRef.current = setTimeout(() => {
      setIsUserExploring(false);
    }, 7000);
  }, [isAdmin]);

  const handleSnapToAdmin = useCallback(() => {
    if (userExploringTimerRef.current) {
      clearTimeout(userExploringTimerRef.current);
    }
    setIsUserExploring(false);
    setAutoFocusEnabled(true);
  }, []);

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

  const handleKickUser = useCallback((userId: string) => {
    socketRef.current?.sendKickUser(userId);
    setRecentActivity({
      userName: 'Admin',
      action: 'removing participant from room...',
      timestamp: Date.now(),
    });
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
  }, []);

  const handleToggleRaiseHand = useCallback(() => {
    setHandRaised(prev => {
      const next = !prev;
      socketRef.current?.sendRaiseHand(next);
      return next;
    });
  }, []);

  const handleLowerHand = useCallback((userId?: string) => {
    socketRef.current?.sendLowerHand(userId);
    if (!userId || userId === currentUser?.id) {
      setHandRaised(false);
    }
  }, [currentUser?.id]);

  const handleLowerAllHands = useCallback(() => {
    socketRef.current?.sendLowerAllHands();
    setHandRaised(false);
    setRecentActivity({
      userName: 'Host',
      action: 'lowered all student hands ✋',
      timestamp: Date.now(),
    });
    if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
    activityTimerRef.current = setTimeout(() => setRecentActivity(null), 4000);
  }, []);

  const handleClaimHost = useCallback(async (token: string): Promise<boolean> => {
    try {
      const success = await claimBoardHost(roomCode, token);
      if (success) {
        socketRef.current?.sendClaimHost(token);
        setIsCreator(true);
        setUserRole('admin');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [roomCode]);

  const handleSendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const messageId = `msg_c_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: BoardChatMessage = {
      id: messageId,
      userId: currentUserRef.current?.id || 'me',
      userName: currentUserRef.current?.name || 'You',
      userColor: currentUserRef.current?.color || '#00f0ff',
      role: userRole,
      isOwner: isCreator,
      text: trimmed,
      timestamp: Date.now(),
      status: isConnected ? 'sending' : 'failed',
    };

    setChatMessages(prev => [...prev, optimisticMsg]);

    if (!isConnected) {
      return;
    }

    try {
      socketRef.current?.sendChatMessage(trimmed, messageId);
    } catch {
      setChatMessages(prev =>
        prev.map(m => (m.id === messageId ? { ...m, status: 'failed' } : m))
      );
    }
  }, [userRole, isCreator, isConnected]);

  const handleRetrySendMessage = useCallback((failedMsg: BoardChatMessage) => {
    setChatMessages(prev =>
      prev.map(m => (m.id === failedMsg.id ? { ...m, status: 'sending' } : m))
    );
    try {
      socketRef.current?.sendChatMessage(failedMsg.text, failedMsg.id);
    } catch {
      setChatMessages(prev =>
        prev.map(m => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
      );
    }
  }, []);

  const handleSendReaction = useCallback((emoji: string) => {
    socketRef.current?.sendReaction(emoji);
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

  // ── Render Kicked / Removed State ──
  if (kickedModalReason) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090f]">
        <div className="w-full max-w-md p-8 rounded-3xl border border-rose-500/30 bg-[#12121e] text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-3xl">
            🚫
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Access Denied</h1>
            <p className="text-xs text-rose-200/90 leading-relaxed font-semibold">
              {kickedModalReason}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              You were removed from this room by an admin and cannot re-enter.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] font-mono text-xs text-[var(--color-text-muted)]">
            Room Code: <span className="text-white font-bold">{roomCode}</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => router.replace('/board')}
            className="w-full justify-center bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
          >
            Return to Study Board Hub →
          </Button>
        </div>
      </div>
    );
  }

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
    <div className="fixed inset-0 z-40 w-full h-[100dvh] overflow-hidden bg-[#09090f] flex flex-col">
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
        creatorToken={getStoredCreatorToken(roomCode)}
        presenterUserId={presenterUserId}
        isFollowingPresenter={isFollowingPresenter}
        onToggleFollowPresenter={handleToggleFollowPresenter}
        onStartPresenting={handleStartPresenting}
        onStopPresenting={handleStopPresenting}
        onPromoteUser={handlePromoteUser}
        onRevokeAdmin={handleRevokeAdmin}
        onKickUser={handleKickUser}
        onLowerHand={handleLowerHand}
        onLowerAllHands={handleLowerAllHands}
        onClaimHost={handleClaimHost}
        onToggleChat={() => {
          setChatOpen(prev => !prev);
          setUnreadMessageCount(0);
        }}
        unreadMessageCount={unreadMessageCount}
        handRaised={handRaised}
        onToggleRaiseHand={handleToggleRaiseHand}
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
          className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 backdrop-blur-md shadow-xl animate-fadeIn max-w-[90vw] text-center"
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
      <main className="flex-1 w-full h-full pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
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
            !isAdmin && autoFocusEnabled && !isUserExploring && remoteViewport
              ? { pan: { x: remoteViewport.panX, y: remoteViewport.panY }, zoom: remoteViewport.zoom }
              : null
          }
          adminFocusTarget={adminFocusTarget}
          autoFocusEnabled={autoFocusEnabled}
          isUserExploring={isUserExploring}
          onUserManualPan={handleUserManualPan}
        />
      </main>

      {/* ── Participant Auto-Focus & Free Scroll Status Pill (Top HUD, Never Collides with Toolbar) ── */}
      {!isAdmin && (
        <div
          className={`fixed ${
            connectionStatus !== 'CONNECTED'
              ? 'top-[calc(6.5rem+env(safe-area-inset-top,0px))]'
              : 'top-[calc(4.25rem+env(safe-area-inset-top,0px))]'
          } left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200 select-none max-w-[94vw]`}
        >
          {isUserExploring ? (
            <div className="px-3.5 py-1.5 rounded-full bg-[#10101c]/95 border border-purple-500/40 text-purple-200 text-xs font-medium backdrop-blur-xl flex items-center gap-2 shadow-2xl">
              <span className="flex items-center gap-1.5 text-zinc-300 shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[11px] sm:text-xs">Free Scroll</span>
              </span>
              <span className="text-zinc-600">|</span>
              <button
                type="button"
                onClick={handleSnapToAdmin}
                className="px-2.5 py-0.5 rounded-full bg-purple-500/25 hover:bg-purple-500/40 text-purple-200 hover:text-white text-[11px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                title="Snap back to Admin's active changes"
              >
                <span>🎯 Snap to Admin</span>
              </button>
            </div>
          ) : autoFocusEnabled ? (
            <div className="px-3.5 py-1 rounded-full bg-[#10101c]/90 border border-emerald-500/30 text-emerald-300 text-xs font-medium backdrop-blur-md flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] sm:text-xs">🎯 Focusing on Admin</span>
              <button
                type="button"
                onClick={() => setIsUserExploring(true)}
                className="text-zinc-400 hover:text-zinc-200 text-[10px] sm:text-[11px] underline ml-1 cursor-pointer"
                title="Explore anywhere on canvas without auto-repositioning"
              >
                Explore
              </button>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-[#10101c]/90 border border-zinc-700 text-zinc-400 text-xs font-medium backdrop-blur-md flex items-center gap-2 shadow-lg">
              <span className="text-[11px] sm:text-xs">👁️ Free View</span>
              <button
                type="button"
                onClick={handleSnapToAdmin}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold ml-1 cursor-pointer"
              >
                Follow Admin
              </button>
            </div>
          )}
        </div>
      )}

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
        isCreator={isCreator}
        creatorToken={getStoredCreatorToken(roomCode)}
      />

      {/* ── Classroom Chat & Q&A Drawer ── */}
      <BoardChatDrawer
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        currentUser={currentUser}
        onSendMessage={handleSendMessage}
        onRetrySendMessage={handleRetrySendMessage}
        onSendReaction={handleSendReaction}
        handRaised={handRaised}
        onToggleRaiseHand={handleToggleRaiseHand}
        isAdmin={isAdmin}
        onKickUser={handleKickUser}
      />

      {/* ── Floating Reaction Bursts ── */}
      <ReactionOverlay reactions={floatingReactions} />
    </div>
  );
}
