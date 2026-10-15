import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { DuelRoom } from '../src/models/duel-room.model.js';
import { duelWebSocketManager } from '../src/websocket/duel.socket.js';

describe('Task 3: Duel Real-Time Peer Matchmaking & Authoritative Game State', () => {
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
    timeoutMs: number = 4000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for message type "${type}" after ${timeoutMs}ms`));
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

  function createClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws/duel`);
      activeSockets.push(ws);
      ws.on('open', () => resolve(ws));
      ws.on('error', reject);
    });
  }

  it('matches two compatible queued players, creates secure room, and synchronizes match start', async () => {
    const playerA = await createClient();
    const playerB = await createClient();

    // Player A joins matchmaking queue
    const queueJoinedPromise = waitForMessage(playerA, 'QUEUE_JOINED');
    playerA.send(
      JSON.stringify({
        type: 'JOIN_QUEUE',
        category: 'javascript',
        difficulty: 'medium',
        playerName: 'Alice',
      })
    );
    const queueJoinedMsg = await queueJoinedPromise;
    expect(queueJoinedMsg.category).toBe('javascript');
    expect(queueJoinedMsg.position).toBe(1);

    // Player B joins the same category queue -> immediate match!
    const matchFoundA = waitForMessage(playerA, 'MATCH_FOUND');
    const matchFoundB = waitForMessage(playerB, 'MATCH_FOUND');

    playerB.send(
      JSON.stringify({
        type: 'JOIN_QUEUE',
        category: 'javascript',
        difficulty: 'medium',
        playerName: 'Bob',
      })
    );

    const [foundA, foundB] = await Promise.all([matchFoundA, matchFoundB]);
    expect(foundA.roomCode).toBeDefined();
    expect(foundB.roomCode).toBe(foundA.roomCode);
    expect(foundA.token).toBeDefined();
    expect(foundB.token).toBeDefined();
    expect(foundA.token).not.toBe(foundB.token);

    // Both players should automatically receive COUNTDOWN_TICK
    const countdownA = await waitForMessage(playerA, 'COUNTDOWN_TICK');
    expect(countdownA.secondsRemaining).toBe(3);

    // Both players receive synchronized MATCH_START
    const [startA, startB] = await Promise.all([
      waitForMessage(playerA, 'MATCH_START', 4500),
      waitForMessage(playerB, 'MATCH_START', 4500),
    ]);

    expect(startA.matchDurationSeconds).toBe(60);
    expect(startB.matchDurationSeconds).toBe(60);
    expect(startA.questions.length).toBe(10);
    expect(startB.questions.length).toBe(10);
    // Crucial security requirement: correctOption must NEVER be sent to client
    expect(startA.questions[0].correctOption).toBeUndefined();
    expect(startB.questions[0].correctOption).toBeUndefined();

    // Authoritative Answer Validation
    const answerResultA = waitForMessage(playerA, 'ANSWER_RESULT');
    const opponentProgressB = waitForMessage(playerB, 'PLAYER_PROGRESS');

    playerA.send(
      JSON.stringify({
        type: 'SUBMIT_ANSWER',
        questionIndex: 0,
        selectedOption: 1,
      })
    );

    const [resA, progB] = await Promise.all([answerResultA, opponentProgressB]);
    expect(resA.questionIndex).toBe(0);
    expect(typeof resA.isCorrect).toBe('boolean');
    expect(typeof resA.scoreEarned).toBe('number');
    expect(resA.nextQuestionIndex).toBe(1);
    expect(progB.currentQuestionIndex).toBe(1);

    // Prevent duplicate answer for the same question index
    const duplicateErrPromise = waitForMessage(playerA, 'ERROR');
    playerA.send(
      JSON.stringify({
        type: 'SUBMIT_ANSWER',
        questionIndex: 0, // already answered question 0!
        selectedOption: 2,
      })
    );
    const dupErr = await duplicateErrPromise;
    expect(dupErr.message).toMatch(/out of sync|invalid/i);

    // Prevent submitting invalid option (e.g., option index 99)
    const invalidOptionErrPromise = waitForMessage(playerA, 'ERROR');
    playerA.send(
      JSON.stringify({
        type: 'SUBMIT_ANSWER',
        questionIndex: 1,
        selectedOption: 99,
      })
    );
    const optErr = await invalidOptionErrPromise;
    expect(optErr.message).toMatch(/malformed message payload/i);

    // Clean up
    playerA.close();
    playerB.close();
  });

  it('rejects malicious or malformed client socket payloads', async () => {
    const ws = await createClient();

    // 1. Non-JSON string
    const jsonErrPromise = waitForMessage(ws, 'ERROR');
    ws.send('invalid json {[');
    const jsonErr = await jsonErrPromise;
    expect(jsonErr.message).toMatch(/malformed json/i);

    // 2. Missing required schema field
    const schemaErrPromise = waitForMessage(ws, 'ERROR');
    ws.send(JSON.stringify({ type: 'SUBMIT_ANSWER' })); // missing questionIndex and selectedOption
    const schemaErr = await schemaErrPromise;
    expect(schemaErr.message).toMatch(/malformed message payload/i);

    ws.close();
  });

  it('handles player disconnect during active match with grace period notification', async () => {
    const p1 = await createClient();
    const p2 = await createClient();

    const matchFound1 = waitForMessage(p1, 'MATCH_FOUND');
    const matchFound2 = waitForMessage(p2, 'MATCH_FOUND');

    p1.send(
      JSON.stringify({
        type: 'JOIN_QUEUE',
        category: 'python',
        difficulty: 'easy',
        playerName: 'Gwen',
      })
    );
    p2.send(
      JSON.stringify({
        type: 'JOIN_QUEUE',
        category: 'python',
        difficulty: 'easy',
        playerName: 'Miles',
      })
    );

    await Promise.all([matchFound1, matchFound2]);

    // Wait for match to start
    await Promise.all([
      waitForMessage(p1, 'MATCH_START', 4500),
      waitForMessage(p2, 'MATCH_START', 4500),
    ]);

    // Disconnect p2
    const disconnectNotice = waitForMessage(p1, 'OPPONENT_DISCONNECTED');
    p2.terminate();

    const discMsg = await disconnectNotice;
    expect(discMsg.gracePeriodSeconds).toBe(15);

    p1.close();
  });
});
