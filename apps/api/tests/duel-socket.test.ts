import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { DuelRoom } from '../src/models/duel-room.model.js';
import { duelRoomService } from '../src/services/duel-room.service.js';
import { duelWebSocketManager } from '../src/websocket/duel.socket.js';

describe('N1 Phase 13: Quably Duel WebSocket Synchronization Tests', () => {
  let server: http.Server;
  let port: number;
  const activeSockets: WebSocket[] = [];

  beforeAll(async () => {
    await connectDatabase();
    await DuelRoom.deleteMany({});

    const app = createApp();
    server = http.createServer(app);
    duelWebSocketManager.init(server);

    await new Promise<void>(resolve => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          port = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const ws of activeSockets) {
      try {
        ws.terminate();
      } catch {
        // ignore
      }
    }
    await new Promise<void>(resolve => server.close(() => resolve()));
    await new Promise(r => setTimeout(r, 100));
    await DuelRoom.deleteMany({});
    await disconnectDatabase();
  });

  function waitForMessage(
    ws: WebSocket,
    type: string,
    timeoutMs: number = 3000
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for message type "${type}"`));
      }, timeoutMs);

      const listener = (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === type) {
            clearTimeout(timer);
            ws.off('message', listener);
            resolve(parsed);
          }
        } catch {
          // ignore
        }
      };

      ws.on('message', listener);
    });
  }

  it('synchronizes opponent join, countdown, match start, and answer scoring via WebSockets', async () => {
    const { room, hostToken } = await duelRoomService.createRoom({
      category: 'javascript',
      difficulty: 'easy',
      questionCount: 3,
      hostName: 'TestHost',
    });

    const hostWs = new WebSocket(`ws://localhost:${port}/ws/duel?roomCode=${room.code}&token=${hostToken}`);
    activeSockets.push(hostWs);

    const hostLobbyPromise = waitForMessage(hostWs, 'LOBBY_STATE');
    const initialHostMsg = await hostLobbyPromise;

    expect(initialHostMsg).toBeDefined();
    expect(initialHostMsg.room.code).toBe(room.code);
    expect(initialHostMsg.currentUser.isHost).toBe(true);

    // Opponent connects
    const oppWs = new WebSocket(`ws://localhost:${port}/ws/duel?roomCode=${room.code}&playerName=TestOpponent`);
    activeSockets.push(oppWs);

    const oppLobbyPromise = waitForMessage(oppWs, 'LOBBY_STATE');
    const hostOppJoinedPromise = waitForMessage(hostWs, 'OPPONENT_JOINED');
    const countdownTickPromise = waitForMessage(hostWs, 'COUNTDOWN_TICK');

    const [oppLobby, hostOppJoined, countdownTick] = await Promise.all([
      oppLobbyPromise,
      hostOppJoinedPromise,
      countdownTickPromise,
    ]);

    expect(oppLobby.currentUser.name).toBe('TestOpponent');
    expect(hostOppJoined.opponent.name).toBe('TestOpponent');
    expect(countdownTick.secondsRemaining).toBe(3);

    // Wait for match start
    const matchStartPromise = waitForMessage(hostWs, 'MATCH_START', 4500);
    const matchStartMsg = await matchStartPromise;
    expect(matchStartMsg).toBeDefined();
    expect(matchStartMsg.matchDurationSeconds).toBe(60);
    expect(matchStartMsg.questions.length).toBe(3);

    // Host submits answer for question 0
    const answerResultPromise = waitForMessage(hostWs, 'ANSWER_RESULT');
    hostWs.send(
      JSON.stringify({
        type: 'SUBMIT_ANSWER',
        questionIndex: 0,
        selectedOption: 0,
      })
    );

    const answerResult = await answerResultPromise;
    expect(answerResult.questionIndex).toBe(0);
    expect(typeof answerResult.isCorrect).toBe('boolean');
    expect(answerResult.nextQuestionIndex).toBe(1);

    hostWs.close();
    oppWs.close();
  });
});
