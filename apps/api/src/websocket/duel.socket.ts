import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  DuelCategory,
  DuelDifficulty,
  DuelPlayer,
  DuelSocketClientMessage,
  DuelSocketServerMessage,
} from '@n1/shared';
import { duelSocketClientMessageSchema } from '@n1/validation';
import { duelRoomService } from '../services/duel-room.service.js';
import { duelRoomRepository } from '../repositories/duel-room.repository.js';
import { IDuelRoomDocument } from '../models/duel-room.model.js';

interface DuelClientSession {
  ws: WebSocket;
  playerId: string;
  roomCode: string;
  isHost: boolean;
  isAlive: boolean;
}

interface SessionWebSocket extends WebSocket {
  __duelSession?: DuelClientSession;
}

interface QueuedPlayer {
  ws: SessionWebSocket;
  playerName: string;
  category: DuelCategory;
  difficulty: DuelDifficulty;
  joinedAt: number;
}

interface ActiveDuelRoomState {
  code: string;
  roomDoc: IDuelRoomDocument;
  hostWs: WebSocket | null;
  opponentWs: WebSocket | null;
  hostId: string;
  opponentId: string | null;
  secondsRemaining: number;
  matchTimer: NodeJS.Timeout | null;
  countdownTimer: NodeJS.Timeout | null;
  forfeitTimer: NodeJS.Timeout | null;
  matchStarted: boolean;
  matchFinished: boolean;
}

export class DuelWebSocketManager {
  private wss: WebSocketServer | null = null;
  private activeRooms = new Map<string, ActiveDuelRoomState>();
  private matchmakingQueue: QueuedPlayer[] = [];
  private clientMsgCounts = new Map<WebSocket, { count: number; resetAt: number }>();
  private readonly MAX_MSGS_PER_SEC = 60;

  init(server: HttpServer): WebSocketServer {
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (request: IncomingMessage, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (url.pathname === '/ws/duel') {
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
        const session = (client as SessionWebSocket).__duelSession;
        if (!session) return;
        if (session.isAlive === false) {
          client.terminate();
          return;
        }
        session.isAlive = false;
        try {
          client.ping();
        } catch {
          client.terminate();
        }
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(pingInterval);
    });

    return this.wss;
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage) {
    const sessionWs = ws as SessionWebSocket;
    sessionWs.on('pong', () => {
      if (sessionWs.__duelSession) {
        sessionWs.__duelSession.isAlive = true;
      }
    });

    // Extract roomCode and token from query string if available
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const queryRoomCode = url.searchParams.get('roomCode')?.toUpperCase().trim() || null;
    const queryToken = url.searchParams.get('token') || null;
    const queryPlayerName = url.searchParams.get('playerName') || undefined;

    if (queryRoomCode) {
      this.handleJoin(sessionWs, queryRoomCode, queryToken, queryPlayerName);
    }

    sessionWs.on('message', async (data: Buffer | string) => {
      // 1. Rate limiting check
      const now = Date.now();
      let rateRecord = this.clientMsgCounts.get(sessionWs);
      if (!rateRecord || now > rateRecord.resetAt) {
        rateRecord = { count: 1, resetAt: now + 1000 };
        this.clientMsgCounts.set(sessionWs, rateRecord);
      } else {
        rateRecord.count++;
        if (rateRecord.count > this.MAX_MSGS_PER_SEC) {
          this.sendToWs(sessionWs, {
            type: 'ERROR',
            message: 'Rate limit exceeded: too many socket requests',
          });
          return;
        }
      }

      // 2. Parse JSON
      let rawJson: unknown;
      try {
        rawJson = JSON.parse(data.toString());
      } catch {
        this.sendToWs(sessionWs, {
          type: 'ERROR',
          message: 'Malformed JSON payload',
        });
        return;
      }

      // 3. Schema validation
      const parseResult = duelSocketClientMessageSchema.safeParse(rawJson);
      if (!parseResult.success) {
        this.sendToWs(sessionWs, {
          type: 'ERROR',
          message: `Malformed message payload: ${parseResult.error.issues[0]?.message || 'Schema validation failed'}`,
        });
        return;
      }

      try {
        await this.handleClientMessage(sessionWs, parseResult.data as DuelSocketClientMessage);
      } catch (err) {
        this.sendToWs(sessionWs, {
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Internal error processing message',
        });
      }
    });

    sessionWs.on('close', () => {
      this.clientMsgCounts.delete(sessionWs);
      this.removeFromQueue(sessionWs);
      this.handleDisconnect(sessionWs);
    });

    sessionWs.on('error', () => {
      this.clientMsgCounts.delete(sessionWs);
      this.removeFromQueue(sessionWs);
      this.handleDisconnect(sessionWs);
    });
  }

  private removeFromQueue(ws: WebSocket) {
    this.matchmakingQueue = this.matchmakingQueue.filter(p => p.ws !== ws);
  }

  private async handleJoinQueue(
    ws: SessionWebSocket,
    category: DuelCategory = 'javascript',
    difficulty: DuelDifficulty = 'medium',
    playerName = 'Anonymous'
  ) {
    this.removeFromQueue(ws);

    // Look for a compatible opponent already in the queue
    const matchIndex = this.matchmakingQueue.findIndex(
      p =>
        p.ws.readyState === WebSocket.OPEN &&
        p.ws !== ws &&
        p.category === category
    );

    if (matchIndex !== -1) {
      const opponent = this.matchmakingQueue.splice(matchIndex, 1)[0];
      if (!opponent) return;

      const chosenCategory = category;
      const chosenDifficulty = difficulty !== 'mixed' ? difficulty : opponent.difficulty;

      try {
        const roomResult = await duelRoomService.createRoom({
          category: chosenCategory,
          difficulty: chosenDifficulty,
          questionCount: 10,
          hostName: opponent.playerName,
        });

        const joinResult = await duelRoomService.joinRoom(roomResult.room.code, playerName);

        // Notify both players with MATCH_FOUND and their respective auth tokens
        this.sendToWs(opponent.ws, {
          type: 'MATCH_FOUND',
          roomCode: roomResult.room.code,
          token: roomResult.hostToken,
          opponent: { name: playerName },
        });

        this.sendToWs(ws, {
          type: 'MATCH_FOUND',
          roomCode: roomResult.room.code,
          token: joinResult.opponent.id,
          opponent: { name: opponent.playerName },
        });

        // Automatically wire both connected sockets into the duel room
        await this.handleJoin(opponent.ws, roomResult.room.code, roomResult.hostToken, opponent.playerName);
        await this.handleJoin(ws, roomResult.room.code, joinResult.opponent.id, playerName);
      } catch (err) {
        this.sendToWs(ws, {
          type: 'ERROR',
          message: err instanceof Error ? err.message : 'Matchmaking room creation failed',
        });
        if (opponent.ws.readyState === WebSocket.OPEN) {
          this.sendToWs(opponent.ws, {
            type: 'ERROR',
            message: err instanceof Error ? err.message : 'Matchmaking room creation failed',
          });
        }
      }
    } else {
      this.matchmakingQueue.push({
        ws,
        playerName,
        category,
        difficulty,
        joinedAt: Date.now(),
      });

      this.sendToWs(ws, {
        type: 'QUEUE_JOINED',
        category,
        position: this.matchmakingQueue.length,
      });
    }
  }


  private async handleJoin(
    ws: SessionWebSocket,
    roomCode: string,
    token: string | null,
    playerName?: string
  ) {
    const room = await duelRoomService.getRoom(roomCode);
    if (!room) {
      this.sendToWs(ws, { type: 'ERROR', message: 'Room not found' });
      return;
    }

    if (room.isExpired || room.status === 'EXPIRED') {
      this.sendToWs(ws, { type: 'ERROR', message: 'Duel room has expired' });
      return;
    }

    let state = this.activeRooms.get(roomCode);
    if (!state) {
      state = {
        code: roomCode,
        roomDoc: room,
        hostWs: null,
        opponentWs: null,
        hostId: room.host.id,
        opponentId: room.opponent?.id || null,
        secondsRemaining: room.matchDurationSeconds || 60,
        matchTimer: null,
        countdownTimer: null,
        forfeitTimer: null,
        matchStarted: room.status === 'IN_PROGRESS',
        matchFinished: room.status === 'FINISHED',
      };
      this.activeRooms.set(roomCode, state);
    } else {
      // Keep state document fresh
      state.roomDoc = room;
    }

    let isHost = false;
    let playerId = token || '';

    // Check if connecting user is the host
    if (token === room.host.id || (!state.hostWs && !room.opponent && !token)) {
      isHost = true;
      playerId = room.host.id;
      state.hostWs = ws;
    } else if (room.opponent && token === room.opponent.id) {
      isHost = false;
      playerId = room.opponent.id;
      state.opponentWs = ws;
    } else if (!room.opponent && room.status === 'WAITING_FOR_OPPONENT') {
      // New opponent joining
      try {
        const joinResult = await duelRoomService.joinRoom(roomCode, playerName);
        isHost = false;
        playerId = joinResult.opponent.id;
        state.opponentId = playerId;
        state.opponentWs = ws;
        state.roomDoc = joinResult.room;
      } catch (joinErr: unknown) {
        this.sendToWs(ws, {
          type: 'ERROR',
          message: joinErr instanceof Error ? joinErr.message : 'Could not join room',
        });
        return;
      }
    } else if (room.opponent) {
      // Opponent reconnecting
      isHost = false;
      playerId = room.opponent.id;
      state.opponentWs = ws;
    }

    // Cancel forfeit timer if reconnecting
    if (state.forfeitTimer) {
      clearTimeout(state.forfeitTimer);
      state.forfeitTimer = null;
      this.broadcastToRoom(roomCode, { type: 'OPPONENT_RECONNECTED' });
    }

    // Update connection status in DB
    await duelRoomRepository.setPlayerConnected(roomCode, isHost, true);

    const currentPlayer: DuelPlayer = isHost ? state.roomDoc.host : state.roomDoc.opponent!;
    const players: DuelPlayer[] = [state.roomDoc.host];
    if (state.roomDoc.opponent) {
      players.push(state.roomDoc.opponent);
    }

    ws.__duelSession = {
      ws,
      playerId,
      roomCode,
      isHost,
      isAlive: true,
    };

    // Send LOBBY_STATE to the joining client
    this.sendToWs(ws, {
      type: 'LOBBY_STATE',
      room: duelRoomService.toRoomSummary(state.roomDoc),
      players,
      currentUser: currentPlayer,
    });

    // If opponent just joined or reconnected, inform host
    if (!isHost && state.hostWs && state.roomDoc.opponent) {
      this.sendToWs(state.hostWs, {
        type: 'OPPONENT_JOINED',
        opponent: state.roomDoc.opponent,
      });
    }

    // If both players are present and room is still WAITING_FOR_OPPONENT, initiate countdown!
    if (
      state.hostWs &&
      state.opponentWs &&
      state.roomDoc.status === 'WAITING_FOR_OPPONENT' &&
      !state.countdownTimer
    ) {
      this.startCountdown(roomCode);
    } else if (state.matchStarted && !state.matchFinished) {
      // Reconnection mid-match: send MATCH_START with current client questions
      const clientQuestions = duelRoomService.getClientQuestions(state.roomDoc);
      const endsAt = state.roomDoc.endsAt
        ? state.roomDoc.endsAt.toISOString()
        : new Date(Date.now() + state.secondsRemaining * 1000).toISOString();

      this.sendToWs(ws, {
        type: 'MATCH_START',
        matchDurationSeconds: state.secondsRemaining,
        questions: clientQuestions,
        endsAt,
      });
    } else if (state.matchFinished) {
      // If match finished, send results to reconnected user
      const results = duelRoomService.compileMatchResults(state.roomDoc);
      this.sendToWs(ws, { type: 'MATCH_FINISHED', results });
    }
  }

  private startCountdown(roomCode: string) {
    const state = this.activeRooms.get(roomCode);
    if (!state) return;

    duelRoomRepository.updateStatus(roomCode, 'COUNTDOWN');
    let countdown = 3;

    this.broadcastToRoom(roomCode, {
      type: 'COUNTDOWN_TICK',
      secondsRemaining: countdown,
    });

    state.countdownTimer = setInterval(async () => {
      countdown--;
      if (countdown > 0) {
        this.broadcastToRoom(roomCode, {
          type: 'COUNTDOWN_TICK',
          secondsRemaining: countdown,
        });
      } else {
        if (state.countdownTimer) {
          clearInterval(state.countdownTimer);
          state.countdownTimer = null;
        }
        await this.startMatch(roomCode);
      }
    }, 1000);
  }

  private async startMatch(roomCode: string) {
    const state = this.activeRooms.get(roomCode);
    if (!state) return;

    const startedAt = new Date();
    const durationSeconds = state.roomDoc.matchDurationSeconds || 60;
    const endsAt = new Date(startedAt.getTime() + durationSeconds * 1000);

    const updatedRoom = await duelRoomRepository.updateStatus(
      roomCode,
      'IN_PROGRESS',
      startedAt,
      endsAt
    );
    if (updatedRoom) {
      state.roomDoc = updatedRoom;
    }

    state.matchStarted = true;
    state.secondsRemaining = durationSeconds;

    const clientQuestions = duelRoomService.getClientQuestions(state.roomDoc);

    this.broadcastToRoom(roomCode, {
      type: 'MATCH_START',
      matchDurationSeconds: durationSeconds,
      questions: clientQuestions,
      endsAt: endsAt.toISOString(),
    });

    // Start authoritative synchronized 60-second timer
    state.matchTimer = setInterval(async () => {
      state.secondsRemaining--;

      if (state.secondsRemaining <= 0) {
        if (state.matchTimer) {
          clearInterval(state.matchTimer);
          state.matchTimer = null;
        }
        await this.finishMatch(roomCode);
      }
    }, 1000);
  }

  private async finishMatch(roomCode: string) {
    const state = this.activeRooms.get(roomCode);
    if (!state || state.matchFinished) return;

    if (state.matchTimer) {
      clearInterval(state.matchTimer);
      state.matchTimer = null;
    }
    if (state.forfeitTimer) {
      clearTimeout(state.forfeitTimer);
      state.forfeitTimer = null;
    }

    state.matchFinished = true;

    // Fetch latest fresh room document from database
    const latestDoc = (await duelRoomService.getRoom(roomCode)) || state.roomDoc;
    await duelRoomRepository.updateStatus(roomCode, 'FINISHED');
    latestDoc.status = 'FINISHED';
    state.roomDoc = latestDoc;

    const results = duelRoomService.compileMatchResults(latestDoc);
    this.broadcastToRoom(roomCode, {
      type: 'MATCH_FINISHED',
      results,
    });
  }

  private async handleClientMessage(
    ws: SessionWebSocket,
    message: DuelSocketClientMessage
  ) {
    const session = ws.__duelSession;

    switch (message.type) {
      case 'JOIN_QUEUE': {
        await this.handleJoinQueue(
          ws,
          message.category || 'javascript',
          message.difficulty || 'medium',
          message.playerName || 'Anonymous'
        );
        break;
      }

      case 'LEAVE_QUEUE': {
        this.removeFromQueue(ws);
        break;
      }

      case 'JOIN_DUEL': {
        await this.handleJoin(ws, message.roomCode.toUpperCase().trim(), null, message.playerName);
        break;
      }

      case 'SUBMIT_ANSWER': {
        if (!session) {
          this.sendToWs(ws, { type: 'ERROR', message: 'Not connected to a duel room' });
          return;
        }

        const state = this.activeRooms.get(session.roomCode);
        if (!state || !state.matchStarted || state.matchFinished) {
          this.sendToWs(ws, { type: 'ERROR', message: 'Match is not in progress' });
          return;
        }

        if (state.secondsRemaining <= 0) {
          this.sendToWs(ws, { type: 'ERROR', message: 'Time has expired' });
          return;
        }

        try {
          const evalResult = await duelRoomService.evaluateAnswer(
            state.roomDoc,
            session.playerId,
            message.questionIndex,
            message.selectedOption,
            state.secondsRemaining
          );

          state.roomDoc = evalResult.room;

          // Send result to the answering player
          this.sendToWs(ws, {
            type: 'ANSWER_RESULT',
            questionIndex: message.questionIndex,
            selectedOption: message.selectedOption,
            isCorrect: evalResult.isCorrect,
            scoreEarned: evalResult.scoreEarned,
            totalScore: evalResult.totalScore,
            nextQuestionIndex: evalResult.nextQuestionIndex,
          });

          // Broadcast opponent progress to other player
          const otherWs = session.isHost ? state.opponentWs : state.hostWs;
          if (otherWs) {
            this.sendToWs(otherWs, {
              type: 'PLAYER_PROGRESS',
              playerId: session.playerId,
              score: evalResult.totalScore,
              currentQuestionIndex: evalResult.nextQuestionIndex,
              isFinished: evalResult.isFinished,
            });
          }

          // Check if both players have finished all questions early
          const hostFinished = state.roomDoc.host.isFinished;
          const oppFinished = state.roomDoc.opponent?.isFinished ?? false;
          if (hostFinished && oppFinished) {
            await this.finishMatch(session.roomCode);
          }
        } catch (err: unknown) {
          this.sendToWs(ws, {
            type: 'ERROR',
            message: err instanceof Error ? err.message : 'Error processing answer',
          });
        }
        break;
      }

      case 'REQUEST_REMATCH': {
        if (!session) return;
        const state = this.activeRooms.get(session.roomCode);
        if (!state) return;

        const otherWs = session.isHost ? state.opponentWs : state.hostWs;
        if (otherWs) {
          this.sendToWs(otherWs, {
            type: 'REMATCH_OFFERED',
            fromPlayerId: session.playerId,
          });
        }
        break;
      }

      case 'ACCEPT_REMATCH': {
        if (!session) return;
        const state = this.activeRooms.get(session.roomCode);
        if (!state) return;

        try {
          const { room: newRoom } = await duelRoomService.createRematch(state.roomDoc);
          this.broadcastToRoom(session.roomCode, {
            type: 'REMATCH_ACCEPTED',
            nextRoomCode: newRoom.code,
          });
        } catch (err: unknown) {
          this.sendToWs(ws, {
            type: 'ERROR',
            message: err instanceof Error ? err.message : 'Failed to generate rematch',
          });
        }
        break;
      }
    }
  }

  private handleDisconnect(ws: SessionWebSocket) {
    const session = ws.__duelSession;
    if (!session) return;

    const state = this.activeRooms.get(session.roomCode);
    if (!state) return;

    if (session.isHost) {
      state.hostWs = null;
    } else {
      state.opponentWs = null;
    }

    duelRoomRepository.setPlayerConnected(session.roomCode, session.isHost, false).catch(() => {});

    // If match is active, initiate a 15-second forfeit timer
    if (state.matchStarted && !state.matchFinished) {
      const remainingWs = session.isHost ? state.opponentWs : state.hostWs;
      if (remainingWs) {
        this.sendToWs(remainingWs, {
          type: 'OPPONENT_DISCONNECTED',
          gracePeriodSeconds: 15,
        });

        if (!state.forfeitTimer) {
          state.forfeitTimer = setTimeout(async () => {
            if (state.matchFinished) return;
            const winnerId = session.isHost ? state.opponentId || '' : state.hostId;
            this.broadcastToRoom(session.roomCode, {
              type: 'OPPONENT_FORFEITED',
              winnerId,
            });
            await this.finishMatch(session.roomCode);
          }, 15000);
        }
      }
    }
  }

  private broadcastToRoom(roomCode: string, message: DuelSocketServerMessage) {
    const state = this.activeRooms.get(roomCode);
    if (!state) return;

    if (state.hostWs && state.hostWs.readyState === WebSocket.OPEN) {
      this.sendToWs(state.hostWs, message);
    }
    if (state.opponentWs && state.opponentWs.readyState === WebSocket.OPEN) {
      this.sendToWs(state.opponentWs, message);
    }
  }

  private sendToWs(ws: WebSocket, message: DuelSocketServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getMetrics(): { activeMatches: number; queuedPlayers: number; connectionCount: number } {
    let connectionCount = this.matchmakingQueue.length;
    this.activeRooms.forEach(room => {
      if (room.hostWs && room.hostWs.readyState === WebSocket.OPEN) connectionCount++;
      if (room.opponentWs && room.opponentWs.readyState === WebSocket.OPEN) connectionCount++;
    });
    return {
      activeMatches: this.activeRooms.size,
      queuedPlayers: this.matchmakingQueue.length,
      connectionCount,
    };
  }
}

export const duelWebSocketManager = new DuelWebSocketManager();
