import {
  BoardElement,
  BoardRoomSummary,
  BoardTemplate,
  BoardSocketClientMessage,
  BoardSocketServerMessage,
  ConnectedBoardUser,
} from '@n1/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface BoardRoomDetail {
  code: string;
  title: string;
  template: BoardTemplate;
  elements: BoardElement[];
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  timeRemainingSeconds: number;
}

export interface LocalBoardRecord {
  code: string;
  title: string;
  template: BoardTemplate;
  lastVisited: string;
}

/**
 * Creates a new Study Board room via REST API.
 */
export async function createBoardRoom(
  title: string = 'Study Session',
  template: BoardTemplate = 'blank',
  expiresInHours: number = 24
): Promise<BoardRoomSummary> {
  const res = await fetch(`${API_BASE}/api/board/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, template, expiresInHours }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to create Study Board room');
  }

  saveRecentBoard({
    code: json.data.code,
    title: json.data.title,
    template: json.data.template,
    lastVisited: new Date().toISOString(),
  });

  return json.data;
}

/**
 * Fetches an active room by code.
 */
export async function fetchBoardRoom(code: string): Promise<BoardRoomDetail> {
  const res = await fetch(`${API_BASE}/api/board/rooms/${code.toUpperCase().trim()}`);
  const json = await res.json();

  if (res.status === 410) {
    return {
      code: code.toUpperCase().trim(),
      title: 'Expired Room',
      template: 'blank',
      elements: [],
      createdAt: '',
      expiresAt: '',
      isExpired: true,
      timeRemainingSeconds: 0,
    };
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to load study room');
  }

  saveRecentBoard({
    code: json.data.code,
    title: json.data.title,
    template: json.data.template,
    lastVisited: new Date().toISOString(),
  });

  return json.data;
}

/**
 * Updates canvas elements via REST API (fallback for WebSockets).
 */
export async function syncBoardElements(code: string, elements: BoardElement[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/board/rooms/${code.toUpperCase().trim()}/elements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elements }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Clears canvas elements from a room.
 */
export async function clearBoardElements(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/board/rooms/${code.toUpperCase().trim()}/clear`, {
      method: 'POST',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Saves a board to localStorage recent list.
 */
export function saveRecentBoard(record: LocalBoardRecord): void {
  try {
    const existing = getRecentBoards();
    const filtered = existing.filter(b => b.code !== record.code);
    const updated = [record, ...filtered].slice(0, 10);
    localStorage.setItem('n1_recent_boards', JSON.stringify(updated));
  } catch {
    // LocalStorage may fail in private mode
  }
}

/**
 * Retrieves recent boards from localStorage.
 */
export function getRecentBoards(): LocalBoardRecord[] {
  try {
    const raw = localStorage.getItem('n1_recent_boards');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export type BoardConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';

/**
 * Real-time WebSocket connection helper.
 */
export interface BoardSocketCallbacks {
  onRoomState: (
    room: BoardRoomSummary,
    elements: BoardElement[],
    users: ConnectedBoardUser[],
    currentUser: ConnectedBoardUser
  ) => void;
  onUserJoined: (user: ConnectedBoardUser) => void;
  onUserLeft: (userId: string) => void;
  onUserCursor: (userId: string, userName: string, userColor: string, x: number, y: number) => void;
  onElementsSync: (elements: BoardElement[]) => void;
  onElementSync: (element: BoardElement, action: 'add' | 'update' | 'delete') => void;
  onBoardCleared: () => void;
  onRoomExpired: () => void;
  onError: (message: string) => void;
  onConnectionChange: (connected: boolean) => void;
  onConnectionStatusChange?: (status: BoardConnectionStatus) => void;
}

export function connectBoardSocket(
  roomCode: string,
  callbacks: BoardSocketCallbacks,
  userName?: string
): {
  sendCursor: (x: number, y: number) => void;
  sendElementsUpdate: (elements: BoardElement[]) => void;
  sendElementChange: (element: BoardElement, action: 'add' | 'update' | 'delete') => void;
  sendClearBoard: () => void;
  disconnect: () => void;
} {
  let ws: WebSocket | null = null;
  let isClosedManually = false;
  let hasConnectedOnce = false;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const wsUrl = (() => {
    try {
      const parsed = new URL(API_BASE);
      const isSecure = window.location.protocol === 'https:' || parsed.protocol === 'https:';
      const protocol = isSecure ? 'wss:' : 'ws:';
      const nameParam = userName ? `&name=${encodeURIComponent(userName)}` : '';
      return `${protocol}//${parsed.host}/ws/board?room=${roomCode.toUpperCase().trim()}${nameParam}`;
    } catch {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const cleanHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      const nameParam = userName ? `&name=${encodeURIComponent(userName)}` : '';
      return `${protocol}//${cleanHost}/ws/board?room=${roomCode.toUpperCase().trim()}${nameParam}`;
    }
  })();

  const connect = () => {
    try {
      callbacks.onConnectionStatusChange?.(hasConnectedOnce ? 'RECONNECTING' : 'CONNECTING');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        hasConnectedOnce = true;
        callbacks.onConnectionChange(true);
        callbacks.onConnectionStatusChange?.('CONNECTED');
      };

      ws.onmessage = event => {
        try {
          const msg = JSON.parse(event.data) as BoardSocketServerMessage;
          switch (msg.type) {
            case 'ROOM_STATE':
              callbacks.onRoomState(msg.room, msg.elements, msg.users, msg.currentUser);
              break;
            case 'USER_JOINED':
              callbacks.onUserJoined(msg.user);
              break;
            case 'USER_LEFT':
              callbacks.onUserLeft(msg.userId);
              break;
            case 'USER_CURSOR':
              callbacks.onUserCursor(msg.userId, msg.userName, msg.userColor, msg.x, msg.y);
              break;
            case 'ELEMENTS_SYNC':
              callbacks.onElementsSync(msg.elements);
              break;
            case 'ELEMENT_SYNC':
              callbacks.onElementSync(msg.element, msg.action);
              break;
            case 'BOARD_CLEARED':
              callbacks.onBoardCleared();
              break;
            case 'ROOM_EXPIRED':
              callbacks.onRoomExpired();
              break;
            case 'ERROR':
              callbacks.onError(msg.message);
              break;
          }
        } catch {
          // ignore malformed message
        }
      };

      ws.onclose = event => {
        callbacks.onConnectionChange(false);
        if (isClosedManually) {
          callbacks.onConnectionStatusChange?.('DISCONNECTED');
          return;
        }

        if (event.code === 4010) {
          callbacks.onConnectionStatusChange?.('DISCONNECTED');
          callbacks.onRoomExpired();
          return;
        }

        if (event.code !== 4004) {
          callbacks.onConnectionStatusChange?.('RECONNECTING');
          reconnectTimeout = setTimeout(connect, 2500);
        } else {
          callbacks.onConnectionStatusChange?.('DISCONNECTED');
        }
      };

      ws.onerror = () => {
        callbacks.onConnectionChange(false);
        callbacks.onConnectionStatusChange?.(hasConnectedOnce ? 'RECONNECTING' : 'DISCONNECTED');
      };
    } catch {
      callbacks.onConnectionChange(false);
      callbacks.onConnectionStatusChange?.('DISCONNECTED');
    }
  };

  connect();

  const send = (msg: BoardSocketClientMessage) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  return {
    sendCursor: (x: number, y: number) => {
      send({ type: 'CURSOR_MOVE', x, y });
    },
    sendElementsUpdate: (elements: BoardElement[]) => {
      send({ type: 'ELEMENTS_UPDATE', elements });
    },
    sendElementChange: (element: BoardElement, action: 'add' | 'update' | 'delete') => {
      send({ type: 'ELEMENT_CHANGE', element, action });
    },
    sendClearBoard: () => {
      send({ type: 'CLEAR_BOARD' });
    },
    disconnect: () => {
      isClosedManually = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    },
  };
}
