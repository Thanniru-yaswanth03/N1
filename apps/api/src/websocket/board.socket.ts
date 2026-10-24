import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { boardRoomService } from '../services/board-room.service.js';
import { boardSocketClientMessageSchema } from '@n1/validation';
import {
  BoardElement,
  BoardTemplate,
  ConnectedBoardUser,
  BoardSocketClientMessage,
  BoardSocketServerMessage,
} from '@n1/shared';

const ANONYMOUS_NAMES = [
  'Anonymous Falcon',
  'Anonymous Lynx',
  'Anonymous Otter',
  'Anonymous Eagle',
  'Anonymous Fox',
  'Anonymous Panda',
  'Anonymous Badger',
  'Anonymous Hawk',
  'Anonymous Tiger',
  'Anonymous Wolf',
  'Anonymous Dolphin',
  'Anonymous Bear',
];

const ANONYMOUS_COLORS = [
  '#a855f7', // Purple
  '#38bdf8', // Cyan
  '#34d399', // Emerald
  '#fbbf24', // Gold
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
];

interface ClientSession {
  ws: WebSocket;
  userId: string;
  userName: string;
  userColor: string;
  roomCode: string | null;
  isCreator: boolean;
  role: 'admin' | 'participant';
  creatorToken: string | null;
  isAlive: boolean;
  messageCount: number;
  windowStart: number;
}

interface SessionWebSocket extends WebSocket {
  __session?: ClientSession;
}

export class BoardWebSocketManager {
  private wss: WebSocketServer | null = null;
  private roomClients = new Map<string, Set<ClientSession>>();
  private roomPermissions = new Map<string, boolean>();
  private roomAdmins = new Map<string, Set<string>>();
  private roomPresenters = new Map<string, string | null>();
  private saveDebounceTimers = new Map<string, NodeJS.Timeout>();
  private pendingElements = new Map<string, BoardElement[]>();

  init(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/board') {
        this.wss?.handleUpgrade(request, socket, head, ws => {
          this.wss?.emit('connection', ws, request);
        });
      }
    });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    // Heartbeat check every 30 seconds
    const pingInterval = setInterval(() => {
      if (!this.wss) return;
      this.wss.clients.forEach(client => {
        const session = (client as SessionWebSocket).__session;
        if (!session) return;
        if (session.isAlive === false) {
          return client.terminate();
        }
        session.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(pingInterval);
    });

    return this.wss;
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const queryRoom = url.searchParams.get('room')?.toUpperCase().trim() || null;
    const queryName = url.searchParams.get('name')?.trim() || null;
    const queryToken = url.searchParams.get('token')?.trim() || null;

    const session: ClientSession = {
      ws,
      userId: `u_${Math.random().toString(36).substring(2, 9)}`,
      userName:
        queryName || ANONYMOUS_NAMES[Math.floor(Math.random() * ANONYMOUS_NAMES.length)]!,
      userColor:
        ANONYMOUS_COLORS[Math.floor(Math.random() * ANONYMOUS_COLORS.length)]!,
      roomCode: null,
      isCreator: false,
      role: 'participant',
      creatorToken: queryToken,
      isAlive: true,
      messageCount: 0,
      windowStart: Date.now(),
    };

    (ws as SessionWebSocket).__session = session;

    ws.on('pong', () => {
      session.isAlive = true;
    });

    ws.on('message', async (data: Buffer | string) => {
      // 1. Rate limiting: Max 120 messages per second per client for silky smooth live drawing
      const now = Date.now();
      if (now - session.windowStart > 1000) {
        session.windowStart = now;
        session.messageCount = 1;
      } else {
        session.messageCount++;
        if (session.messageCount > 120) {
          this.send(ws, {
            type: 'ERROR',
            message: 'Rate limit exceeded: too many socket messages',
          });
          return;
        }
      }

      // 2. Payload JSON Parsing & Zod Schema Validation
      let raw: unknown;
      try {
        raw = JSON.parse(data.toString());
      } catch {
        this.send(ws, {
          type: 'ERROR',
          message: 'Malformed JSON payload',
        });
        return;
      }

      const parseResult = boardSocketClientMessageSchema.safeParse(raw);
      if (!parseResult.success) {
        this.send(ws, {
          type: 'ERROR',
          message: 'Invalid socket payload: ' + parseResult.error.issues[0]?.message,
        });
        return;
      }

      const message = parseResult.data as BoardSocketClientMessage;

      // 3. Authorization: Client must be in a room to perform operations other than JOIN
      if (message.type !== 'JOIN' && !session.roomCode) {
        this.send(ws, {
          type: 'ERROR',
          message: 'Unauthorized: must join a room first',
        });
        return;
      }

      await this.handleClientMessage(session, message);
    });

    ws.on('close', () => {
      this.handleDisconnect(session);
    });

    // If query room was provided in handshake URL, join immediately
    if (queryRoom && /^[A-Z0-9]{6}$/.test(queryRoom)) {
      this.joinRoom(session, queryRoom, queryToken);
    }
  }

  private async joinRoom(session: ClientSession, roomCode: string, providedCreatorToken?: string | null) {
    // Leave previous room if joined
    if (session.roomCode) {
      this.leaveRoom(session);
    }

    const roomDetail = await boardRoomService.getRoom(roomCode);
    if (!roomDetail) {
      this.send(session.ws, {
        type: 'ERROR',
        message: 'Study room not found',
      });
      session.ws.close(4004, 'Room not found');
      return;
    }

    if (roomDetail.isExpired) {
      this.send(session.ws, {
        type: 'ROOM_EXPIRED',
      });
      session.ws.close(4010, 'Room expired');
      return;
    }

    // Verify creator status
    const tokenToTest = providedCreatorToken || session.creatorToken;
    const { isCreator, token } = await boardRoomService.verifyOrClaimCreator(roomCode, tokenToTest);
    session.isCreator = isCreator;
    session.creatorToken = token;

    if (!this.roomAdmins.has(roomCode)) {
      this.roomAdmins.set(roomCode, new Set());
    }
    const adminSet = this.roomAdmins.get(roomCode)!;
    if (isCreator) {
      adminSet.add(session.userId);
      session.role = 'admin';
    } else if (adminSet.has(session.userId)) {
      session.role = 'admin';
    } else {
      session.role = 'participant';
    }

    if (!this.roomPermissions.has(roomCode)) {
      this.roomPermissions.set(roomCode, roomDetail.allowParticipantEditing ?? true);
    }

    session.roomCode = roomCode;

    if (!this.roomClients.has(roomCode)) {
      this.roomClients.set(roomCode, new Set());
    }
    const clients = this.roomClients.get(roomCode)!;
    clients.add(session);

    const currentPresenter = this.roomPresenters.get(roomCode) || null;

    const currentUser: ConnectedBoardUser = {
      id: session.userId,
      name: session.userName,
      color: session.userColor,
      role: session.role,
      isOwner: session.isCreator,
      isPresenter: currentPresenter === session.userId,
    };

    const activeUsers: ConnectedBoardUser[] = Array.from(clients).map(c => ({
      id: c.userId,
      name: c.userName,
      color: c.userColor,
      role: c.role,
      isOwner: c.isCreator,
      isPresenter: currentPresenter === c.userId,
    }));

    // Send full room state to the newly joined client
    this.send(session.ws, {
      type: 'ROOM_STATE',
      room: {
        code: roomDetail.code,
        title: roomDetail.title,
        template: roomDetail.template as BoardTemplate,
        elementCount: (this.pendingElements.get(roomCode) || roomDetail.elements).length,
        allowParticipantEditing: this.roomPermissions.get(roomCode) ?? true,
        creatorToken: session.isCreator ? token : undefined,
        createdAt: roomDetail.createdAt,
        expiresAt: roomDetail.expiresAt,
        isExpired: roomDetail.isExpired,
      },
      elements: this.pendingElements.get(roomCode) || roomDetail.elements,
      users: activeUsers,
      currentUser,
      isCreator: session.isCreator,
      role: session.role,
      allowParticipantEditing: this.roomPermissions.get(roomCode) ?? true,
      presenterUserId: currentPresenter,
    });

    // Notify other peers in this room
    this.broadcastToRoom(
      roomCode,
      {
        type: 'USER_JOINED',
        user: currentUser,
      },
      session.userId
    );
  }

  private leaveRoom(session: ClientSession) {
    if (!session.roomCode) return;
    const roomCode = session.roomCode;
    const clients = this.roomClients.get(roomCode);
    if (clients) {
      if (this.roomPresenters.get(roomCode) === session.userId) {
        this.roomPresenters.set(roomCode, null);
        this.broadcastToRoom(roomCode, {
          type: 'PRESENTATION_STATE',
          presenterUserId: null,
        });
      }

      clients.delete(session);
      if (clients.size === 0) {
        this.roomClients.delete(roomCode);
        this.roomPermissions.delete(roomCode);
        this.roomAdmins.delete(roomCode);
        this.roomPresenters.delete(roomCode);
        // Flush any pending elements to database
        this.flushPendingElements(roomCode);
      } else {
        this.broadcastToRoom(roomCode, {
          type: 'USER_LEFT',
          userId: session.userId,
        });
      }
    }
    session.roomCode = null;
  }

  private handleDisconnect(session: ClientSession) {
    this.leaveRoom(session);
  }

  private async handleClientMessage(
    session: ClientSession,
    msg: BoardSocketClientMessage
  ) {
    const roomCode = session.roomCode;

    switch (msg.type) {
      case 'JOIN': {
        const token = msg.creatorToken || (msg as any).token;
        if (msg.userName) session.userName = msg.userName;
        if (msg.userColor) session.userColor = msg.userColor;
        if (token) session.creatorToken = token;
        await this.joinRoom(session, msg.roomCode.toUpperCase().trim(), token);
        break;
      }

      case 'CURSOR_MOVE': {
        if (!roomCode) return;
        this.broadcastToRoom(
          roomCode,
          {
            type: 'USER_CURSOR',
            userId: session.userId,
            userName: session.userName,
            userColor: session.userColor,
            x: msg.x,
            y: msg.y,
          },
          session.userId
        );
        break;
      }

      case 'PROMOTE_USER': {
        if (!roomCode) return;
        const isAdmin = session.role === 'admin' || session.isCreator;
        if (!isAdmin) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Only a Room Admin can promote participants.',
          });
          return;
        }

        const clients = this.roomClients.get(roomCode);
        const target = Array.from(clients || []).find(c => c.userId === msg.targetUserId);
        if (!target) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Participant not found in room.',
          });
          return;
        }

        target.role = 'admin';
        if (!this.roomAdmins.has(roomCode)) {
          this.roomAdmins.set(roomCode, new Set());
        }
        this.roomAdmins.get(roomCode)!.add(target.userId);

        // Notify entire room immediately
        this.broadcastToRoom(roomCode, {
          type: 'ROLE_UPDATED',
          userId: target.userId,
          role: 'admin',
          userName: target.userName,
        });

        this.broadcastToRoom(roomCode, {
          type: 'ACTIVITY_INDICATOR',
          userId: session.userId,
          userName: session.userName,
          action: `promoted ${target.userName} to Room Admin`,
          timestamp: Date.now(),
        });
        break;
      }

      case 'REVOKE_ADMIN': {
        if (!roomCode) return;
        const isAdmin = session.role === 'admin' || session.isCreator;
        if (!isAdmin) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Only a Room Admin can revoke admin privileges.',
          });
          return;
        }

        const clients = this.roomClients.get(roomCode);
        const target = Array.from(clients || []).find(c => c.userId === msg.targetUserId);
        if (!target) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Participant not found in room.',
          });
          return;
        }

        if (target.isCreator) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'The room creator cannot have their admin access revoked.',
          });
          return;
        }

        target.role = 'participant';
        this.roomAdmins.get(roomCode)?.delete(target.userId);

        // Notify entire room immediately
        this.broadcastToRoom(roomCode, {
          type: 'ROLE_UPDATED',
          userId: target.userId,
          role: 'participant',
          userName: target.userName,
        });

        this.broadcastToRoom(roomCode, {
          type: 'ACTIVITY_INDICATOR',
          userId: session.userId,
          userName: session.userName,
          action: `revoked admin access for ${target.userName}`,
          timestamp: Date.now(),
        });
        break;
      }

      case 'START_PRESENTING': {
        if (!roomCode) return;
        const isAdmin = session.role === 'admin' || session.isCreator;
        if (!isAdmin) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Only a Room Admin can start presenting.',
          });
          return;
        }

        this.roomPresenters.set(roomCode, session.userId);
        this.broadcastToRoom(roomCode, {
          type: 'PRESENTATION_STATE',
          presenterUserId: session.userId,
          presenterName: session.userName,
        });
        this.broadcastToRoom(roomCode, {
          type: 'ACTIVITY_INDICATOR',
          userId: session.userId,
          userName: session.userName,
          action: 'started presenting the board',
          timestamp: Date.now(),
        });
        break;
      }

      case 'STOP_PRESENTING': {
        if (!roomCode) return;
        this.roomPresenters.set(roomCode, null);
        this.broadcastToRoom(roomCode, {
          type: 'PRESENTATION_STATE',
          presenterUserId: null,
        });
        this.broadcastToRoom(roomCode, {
          type: 'ACTIVITY_INDICATOR',
          userId: session.userId,
          userName: session.userName,
          action: 'ended presentation mode',
          timestamp: Date.now(),
        });
        break;
      }

      case 'LIVE_DRAW': {
        if (!roomCode) return;
        const canEdit =
          session.role === 'admin' ||
          session.isCreator ||
          (this.roomPermissions.get(roomCode) ?? true);
        if (!canEdit) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Drawing is currently locked by a Room Admin.',
          });
          return;
        }

        // Broadcast active stroke chunks in real time
        this.broadcastToRoom(
          roomCode,
          {
            type: 'LIVE_DRAW_CHUNK',
            userId: session.userId,
            userName: session.userName,
            strokeId: msg.strokeId,
            points: msg.points,
            color: msg.color,
            strokeWidth: msg.strokeWidth,
            isHighlighter: msg.isHighlighter,
            isFinished: msg.isFinished,
          },
          session.userId
        );
        break;
      }

      case 'VIEWPORT_SYNC': {
        if (!roomCode) return;
        // Viewport sync from Admin/Presenter to participants
        this.broadcastToRoom(
          roomCode,
          {
            type: 'VIEWPORT_UPDATE',
            userId: session.userId,
            panX: msg.panX,
            panY: msg.panY,
            zoom: msg.zoom,
          },
          session.userId
        );
        break;
      }

      case 'ACTIVITY_BROADCAST': {
        if (!roomCode) return;
        this.broadcastToRoom(
          roomCode,
          {
            type: 'ACTIVITY_INDICATOR',
            userId: session.userId,
            userName: session.userName,
            action: msg.action,
            details: msg.details,
            timestamp: Date.now(),
          },
          session.userId
        );
        break;
      }

      case 'TOGGLE_PERMISSIONS': {
        if (!roomCode) return;
        const isAdmin = session.role === 'admin' || session.isCreator;
        if (!isAdmin) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Only a Room Admin can change editing permissions.',
          });
          return;
        }

        this.roomPermissions.set(roomCode, msg.allowParticipantEditing);
        await boardRoomService.updatePermissions(roomCode, msg.allowParticipantEditing);

        this.broadcastToRoom(roomCode, {
          type: 'PERMISSIONS_UPDATED',
          allowParticipantEditing: msg.allowParticipantEditing,
        });
        break;
      }

      case 'ELEMENTS_UPDATE': {
        if (!roomCode) return;
        const canEdit =
          session.role === 'admin' ||
          session.isCreator ||
          (this.roomPermissions.get(roomCode) ?? true);
        if (!canEdit) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Editing is locked by a Room Admin.',
          });
          return;
        }

        this.pendingElements.set(roomCode, msg.elements as BoardElement[]);
        this.scheduleDebouncedSave(roomCode, msg.elements as BoardElement[]);

        this.broadcastToRoom(
          roomCode,
          {
            type: 'ELEMENTS_SYNC',
            elements: msg.elements as BoardElement[],
          },
          session.userId
        );
        break;
      }

      case 'ELEMENT_CHANGE': {
        if (!roomCode) return;
        const canEdit =
          session.role === 'admin' ||
          session.isCreator ||
          (this.roomPermissions.get(roomCode) ?? true);
        if (!canEdit) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Editing is locked by a Room Admin.',
          });
          return;
        }

        this.broadcastToRoom(
          roomCode,
          {
            type: 'ELEMENT_SYNC',
            element: msg.element as BoardElement,
            action: msg.action,
          },
          session.userId
        );
        break;
      }

      case 'CLEAR_BOARD': {
        if (!roomCode) return;
        const canEdit =
          session.role === 'admin' ||
          session.isCreator ||
          (this.roomPermissions.get(roomCode) ?? true);
        if (!canEdit) {
          this.send(session.ws, {
            type: 'ERROR',
            message: 'Only authorized Room Admins can clear the board.',
          });
          return;
        }

        this.pendingElements.set(roomCode, []);
        await boardRoomService.clearElements(roomCode);

        this.broadcastToRoom(roomCode, {
          type: 'BOARD_CLEARED',
        });
        break;
      }

      case 'PING': {
        session.isAlive = true;
        this.send(session.ws, {
          type: 'PONG',
        });
        break;
      }
    }
  }

  private scheduleDebouncedSave(roomCode: string, elements: BoardElement[]) {
    const existing = this.saveDebounceTimers.get(roomCode);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      try {
        await boardRoomService.updateElements(roomCode, elements);
        this.saveDebounceTimers.delete(roomCode);
      } catch (err) {
        console.error(`[BoardSocket] Failed to persist elements for room ${roomCode}:`, err);
      }
    }, 2000); // 2 second debounce for database efficiency

    this.saveDebounceTimers.set(roomCode, timer);
  }

  private async flushPendingElements(roomCode: string) {
    const elements = this.pendingElements.get(roomCode);
    if (elements) {
      const timer = this.saveDebounceTimers.get(roomCode);
      if (timer) clearTimeout(timer);
      this.saveDebounceTimers.delete(roomCode);
      try {
        await boardRoomService.updateElements(roomCode, elements);
      } catch (err) {
        console.error(`[BoardSocket] Flush error for room ${roomCode}:`, err);
      }
      this.pendingElements.delete(roomCode);
    }
  }

  private broadcastToRoom(
    roomCode: string,
    message: BoardSocketServerMessage,
    excludeUserId?: string
  ) {
    const clients = this.roomClients.get(roomCode);
    if (!clients) return;

    const data = JSON.stringify(message);
    clients.forEach(client => {
      if (client.userId !== excludeUserId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    });
  }

  private send(ws: WebSocket, message: BoardSocketServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getMetrics(): { activeRooms: number; connectionCount: number } {
    let connectionCount = 0;
    this.roomClients.forEach(set => {
      connectionCount += set.size;
    });
    return {
      activeRooms: this.roomClients.size,
      connectionCount,
    };
  }
}

export const boardWebSocketManager = new BoardWebSocketManager();
