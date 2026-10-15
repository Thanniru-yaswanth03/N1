import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { BoardRoomModel } from '../src/models/board-room.model.js';
import { boardRoomService } from '../src/services/board-room.service.js';
import { boardWebSocketManager } from '../src/websocket/board.socket.js';
import { BoardElement } from '@n1/shared';

describe('N1 Phase 16: Study Board Real-Time WebSocket Synchronization', () => {
  let server: http.Server;
  let port: number;
  const activeSockets: WebSocket[] = [];

  beforeAll(async () => {
    await connectDatabase();
    await BoardRoomModel.deleteMany({ title: /SocketTest/i });

    const app = createApp();
    server = http.createServer(app);
    boardWebSocketManager.init(server);

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
    await BoardRoomModel.deleteMany({ title: /SocketTest/i });
    await disconnectDatabase();
  });

  function waitForMessage(
    ws: WebSocket,
    type: string,
    timeoutMs: number = 4000
  ): Promise<Record<string, any>> {
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

  it('handles two clients joining the same room and bidirectional drawing synchronization', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest Room 1',
      template: 'blank',
      expiresInHours: 2,
    });

    // Client A connects
    const wsA = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsA);

    await new Promise<void>(resolve => wsA.on('open', resolve));

    // Client A joins
    const statePromiseA = waitForMessage(wsA, 'ROOM_STATE');
    wsA.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Alice',
        userColor: '#a855f7',
      })
    );

    const stateA = await statePromiseA;
    expect(stateA.type).toBe('ROOM_STATE');
    expect(stateA.room.code).toBe(room.code);
    expect(stateA.currentUser.name).toBe('Alice');

    // Client B connects and joins
    const wsB = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsB);
    await new Promise<void>(resolve => wsB.on('open', resolve));

    const statePromiseB = waitForMessage(wsB, 'ROOM_STATE');
    const userJoinedPromiseA = waitForMessage(wsA, 'USER_JOINED');

    wsB.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Bob',
        userColor: '#38bdf8',
      })
    );

    const stateB = await statePromiseB;
    const userJoinedA = await userJoinedPromiseA;

    expect(stateB.type).toBe('ROOM_STATE');
    expect(stateB.currentUser.name).toBe('Bob');
    expect(userJoinedA.user.name).toBe('Bob');

    // Client A draws an element -> Client B receives it
    const strokeA: BoardElement = {
      id: 'stroke_alice_1',
      type: 'stroke',
      x: 10,
      y: 10,
      color: '#a855f7',
      strokeWidth: 3,
      points: [{ x: 10, y: 10 }, { x: 20, y: 25 }],
    };

    const syncPromiseB = waitForMessage(wsB, 'ELEMENT_SYNC');
    wsA.send(
      JSON.stringify({
        type: 'ELEMENT_CHANGE',
        action: 'add',
        element: strokeA,
      })
    );

    const receivedB = await syncPromiseB;
    expect(receivedB.type).toBe('ELEMENT_SYNC');
    expect(receivedB.element.id).toBe('stroke_alice_1');
    expect(receivedB.action).toBe('add');

    // Client B draws a rectangle -> Client A receives it
    const rectB: BoardElement = {
      id: 'rect_bob_1',
      type: 'rectangle',
      x: 100,
      y: 150,
      width: 80,
      height: 60,
      color: '#38bdf8',
    };

    const syncPromiseA = waitForMessage(wsA, 'ELEMENT_SYNC');
    wsB.send(
      JSON.stringify({
        type: 'ELEMENT_CHANGE',
        action: 'add',
        element: rectB,
      })
    );

    const receivedA = await syncPromiseA;
    expect(receivedA.type).toBe('ELEMENT_SYNC');
    expect(receivedA.element.id).toBe('rect_bob_1');

    // Client B clears board -> Client A receives BOARD_CLEARED
    const clearPromiseA = waitForMessage(wsA, 'BOARD_CLEARED');
    wsB.send(JSON.stringify({ type: 'CLEAR_BOARD' }));

    const clearedA = await clearPromiseA;
    expect(clearedA.type).toBe('BOARD_CLEARED');
  });

  it('rejects unauthorized message when client has not joined a room', async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(ws);
    await new Promise<void>(resolve => ws.on('open', resolve));

    const errorPromise = waitForMessage(ws, 'ERROR');

    // Send cursor move without joining
    ws.send(JSON.stringify({ type: 'CURSOR_MOVE', x: 100, y: 100 }));

    const errorMsg = await errorPromise;
    expect(errorMsg.type).toBe('ERROR');
    expect(errorMsg.message).toContain('Unauthorized');
  });

  it('rejects malformed socket payload and invalid schema data', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest Malformed',
      template: 'blank',
      expiresInHours: 2,
    });

    const ws = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(ws);
    await new Promise<void>(resolve => ws.on('open', resolve));

    // Join room
    await new Promise<void>(resolve => {
      ws.send(JSON.stringify({ type: 'JOIN', roomCode: room.code }));
      ws.once('message', () => resolve());
    });

    // 1. Send invalid non-JSON string
    const malformedPromise = waitForMessage(ws, 'ERROR');
    ws.send('not a valid json string');
    const malformedMsg = await malformedPromise;
    expect(malformedMsg.type).toBe('ERROR');

    // 2. Send schema violation (invalid element type)
    const schemaErrorPromise = waitForMessage(ws, 'ERROR');
    ws.send(
      JSON.stringify({
        type: 'ELEMENT_CHANGE',
        action: 'add',
        element: {
          id: 'bad_1',
          type: 'invalid_shape_type',
          x: 10,
          y: 20,
        },
      })
    );
    const schemaErrorMsg = await schemaErrorPromise;
    expect(schemaErrorMsg.type).toBe('ERROR');
    expect(schemaErrorMsg.message).toContain('Invalid socket payload');
  });

  it('handles client disconnect, notification to peers, and successful reconnect', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest Disconnect',
      template: 'blank',
      expiresInHours: 2,
    });

    const wsA = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsA);
    await new Promise<void>(resolve => wsA.on('open', resolve));
    await new Promise<void>(resolve => {
      wsA.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Alice' }));
      wsA.once('message', () => resolve());
    });

    const wsB = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsB);
    await new Promise<void>(resolve => wsB.on('open', resolve));
    await new Promise<void>(resolve => {
      wsB.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Bob' }));
      wsB.once('message', () => resolve());
    });

    // Client B disconnects -> Client A receives USER_LEFT
    const userLeftPromiseA = waitForMessage(wsA, 'USER_LEFT');
    wsB.close();

    const userLeftA = await userLeftPromiseA;
    expect(userLeftA.type).toBe('USER_LEFT');

    // Client B reconnects -> receives valid ROOM_STATE and Client A receives USER_JOINED
    const wsBReconnect = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsBReconnect);
    await new Promise<void>(resolve => wsBReconnect.on('open', resolve));

    const statePromiseB2 = waitForMessage(wsBReconnect, 'ROOM_STATE');
    const userJoinedPromiseA2 = waitForMessage(wsA, 'USER_JOINED');

    wsBReconnect.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'BobReconnected' }));

    const stateB2 = await statePromiseB2;
    const userJoinedA2 = await userJoinedPromiseA2;

    expect(stateB2.type).toBe('ROOM_STATE');
    expect(userJoinedA2.user.name).toBe('BobReconnected');
  });
});
