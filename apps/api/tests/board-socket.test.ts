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
    timeoutMs: number = 4000,
    predicate?: (msg: Record<string, any>) => boolean
  ): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for message type "${type}"`));
      }, timeoutMs);

      const listener = (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === type && (!predicate || predicate(parsed))) {
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

  it('broadcasts live drawing chunks chunk-by-chunk in real time', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest LiveDraw',
      template: 'blank',
      expiresInHours: 2,
    });

    // Creator connects with creatorToken
    const wsTeacher = new WebSocket(`ws://localhost:${port}/ws/board?token=${room.creatorToken}`);
    activeSockets.push(wsTeacher);
    await new Promise<void>(resolve => wsTeacher.on('open', resolve));

    const teacherStatePromise = waitForMessage(wsTeacher, 'ROOM_STATE');
    wsTeacher.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Teacher Alice',
        creatorToken: room.creatorToken,
      })
    );
    const teacherState = await teacherStatePromise;
    expect(teacherState.isCreator).toBe(true);

    // Student connects
    const wsStudent = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsStudent);
    await new Promise<void>(resolve => wsStudent.on('open', resolve));

    const studentStatePromise = waitForMessage(wsStudent, 'ROOM_STATE');
    wsStudent.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Student Bob',
      })
    );
    const studentState = await studentStatePromise;
    expect(studentState.isCreator).toBe(false);

    // Teacher streams an in-progress drawing stroke
    const chunkPromise = waitForMessage(wsStudent, 'LIVE_DRAW_CHUNK');
    wsTeacher.send(
      JSON.stringify({
        type: 'LIVE_DRAW',
        strokeId: 'stroke_live_99',
        points: [{ x: 50, y: 50 }, { x: 55, y: 55 }],
        color: '#00f0ff',
        strokeWidth: 4,
        isHighlighter: false,
        isFinished: false,
      })
    );

    const receivedChunk = await chunkPromise;
    expect(receivedChunk.type).toBe('LIVE_DRAW_CHUNK');
    expect(receivedChunk.strokeId).toBe('stroke_live_99');
    expect(receivedChunk.points).toHaveLength(2);
    expect(receivedChunk.isFinished).toBe(false);

    // Teacher completes the stroke
    const finishPromise = waitForMessage(wsStudent, 'LIVE_DRAW_CHUNK');
    wsTeacher.send(
      JSON.stringify({
        type: 'LIVE_DRAW',
        strokeId: 'stroke_live_99',
        points: [{ x: 60, y: 65 }],
        color: '#00f0ff',
        strokeWidth: 4,
        isFinished: true,
      })
    );

    const finishChunk = await finishPromise;
    expect(finishChunk.isFinished).toBe(true);
  });

  it('synchronizes classroom viewport in presentation mode and broadcasts activity indicators', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest Viewport',
      template: 'blank',
      expiresInHours: 2,
    });

    const wsTeacher = new WebSocket(`ws://localhost:${port}/ws/board?token=${room.creatorToken}`);
    activeSockets.push(wsTeacher);
    await new Promise<void>(resolve => wsTeacher.on('open', resolve));
    await new Promise<void>(resolve => {
      wsTeacher.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Teacher', creatorToken: room.creatorToken }));
      wsTeacher.once('message', () => resolve());
    });

    const wsStudent = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsStudent);
    await new Promise<void>(resolve => wsStudent.on('open', resolve));
    await new Promise<void>(resolve => {
      wsStudent.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Student' }));
      wsStudent.once('message', () => resolve());
    });

    // 1. Viewport sync
    const viewportPromise = waitForMessage(wsStudent, 'VIEWPORT_UPDATE');
    wsTeacher.send(
      JSON.stringify({
        type: 'VIEWPORT_SYNC',
        panX: 250,
        panY: -120,
        zoom: 1.4,
      })
    );

    const vpUpdate = await viewportPromise;
    expect(vpUpdate.type).toBe('VIEWPORT_UPDATE');
    expect(vpUpdate.panX).toBe(250);
    expect(vpUpdate.panY).toBe(-120);
    expect(vpUpdate.zoom).toBe(1.4);

    // 2. Activity indicator broadcast
    const activityPromise = waitForMessage(wsStudent, 'ACTIVITY_INDICATOR');
    wsTeacher.send(
      JSON.stringify({
        type: 'ACTIVITY_BROADCAST',
        action: 'updated Key Concepts',
        details: 'Added chapter 3 notes',
      })
    );

    const actIndicator = await activityPromise;
    expect(actIndicator.type).toBe('ACTIVITY_INDICATOR');
    expect(actIndicator.action).toBe('updated Key Concepts');
    expect(actIndicator.details).toBe('Added chapter 3 notes');
  });

  it('enforces teacher permissions: toggling locks and blocking unauthorized student edits', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest Permissions',
      template: 'blank',
      expiresInHours: 2,
    });

    const wsTeacher = new WebSocket(`ws://localhost:${port}/ws/board?token=${room.creatorToken}`);
    activeSockets.push(wsTeacher);
    await new Promise<void>(resolve => wsTeacher.on('open', resolve));
    await new Promise<void>(resolve => {
      wsTeacher.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Teacher', creatorToken: room.creatorToken }));
      wsTeacher.once('message', () => resolve());
    });

    const wsStudent = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsStudent);
    await new Promise<void>(resolve => wsStudent.on('open', resolve));
    await new Promise<void>(resolve => {
      wsStudent.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Student' }));
      wsStudent.once('message', () => resolve());
    });

    // Teacher locks participant editing
    const permPromise = waitForMessage(wsStudent, 'PERMISSIONS_UPDATED');
    wsTeacher.send(
      JSON.stringify({
        type: 'TOGGLE_PERMISSIONS',
        allowParticipantEditing: false,
      })
    );

    const permMsg = await permPromise;
    expect(permMsg.type).toBe('PERMISSIONS_UPDATED');
    expect(permMsg.allowParticipantEditing).toBe(false);

    // Student attempts unauthorized edit -> blocked by server
    const errorPromise = waitForMessage(wsStudent, 'ERROR');
    wsStudent.send(
      JSON.stringify({
        type: 'ELEMENT_CHANGE',
        action: 'add',
        element: {
          id: 'unauthorized_note_1',
          type: 'sticky',
          x: 100,
          y: 100,
          text: 'Hacked note',
          color: '#fbbf24',
        },
      })
    );

    const errorMsg = await errorPromise;
    expect(errorMsg.type).toBe('ERROR');
    expect(errorMsg.message).toContain('locked');
  });

  it('synchronizes sticky notes and rich shapes across participants without schema rejection', async () => {
    const room = await boardRoomService.createRoom({
      title: 'SocketTest StickyShapes',
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

    // Send sticky note element
    const stickyNote: BoardElement = {
      id: 'sticky_note_1',
      type: 'sticky',
      x: 120,
      y: 180,
      width: 200,
      height: 160,
      color: '#fbbf24',
      text: 'Remember to complete Homework #4 by Friday',
    };

    const stickyPromise = waitForMessage(wsB, 'ELEMENT_SYNC');
    wsA.send(
      JSON.stringify({
        type: 'ELEMENT_CHANGE',
        action: 'add',
        element: stickyNote,
      })
    );

    const receivedSticky = await stickyPromise;
    expect(receivedSticky.type).toBe('ELEMENT_SYNC');
    expect(receivedSticky.element.id).toBe('sticky_note_1');
    expect(receivedSticky.element.type).toBe('sticky');
    expect(receivedSticky.element.text).toContain('Homework #4');
  });

  it('strictly isolates rooms so actions in Room 1 never leak to Room 2', async () => {
    const room1 = await boardRoomService.createRoom({ title: 'Room One', template: 'blank' });
    const room2 = await boardRoomService.createRoom({ title: 'Room Two', template: 'blank' });

    const wsRoom1 = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsRoom1);
    await new Promise<void>(resolve => wsRoom1.on('open', resolve));
    await new Promise<void>(resolve => {
      wsRoom1.send(JSON.stringify({ type: 'JOIN', roomCode: room1.code, userName: 'UserRoom1' }));
      wsRoom1.once('message', () => resolve());
    });

    const wsRoom2 = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsRoom2);
    await new Promise<void>(resolve => wsRoom2.on('open', resolve));
    await new Promise<void>(resolve => {
      wsRoom2.send(JSON.stringify({ type: 'JOIN', roomCode: room2.code, userName: 'UserRoom2' }));
      wsRoom2.once('message', () => resolve());
    });

    let room2ReceivedLeak = false;
    wsRoom2.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ELEMENT_SYNC' || msg.type === 'LIVE_DRAW_CHUNK') {
          room2ReceivedLeak = true;
        }
      } catch {
        // ignore
      }
    });

    // Send action in Room 1
    wsRoom1.send(
      JSON.stringify({
        type: 'ELEMENT_CHANGE',
        action: 'add',
        element: {
          id: 'isolated_secret_elem',
          type: 'text',
          x: 10,
          y: 20,
          text: 'Private to Room 1',
          color: '#ffffff',
        },
      })
    );

    // Wait 500ms to verify Room 2 received no events
    await new Promise(r => setTimeout(r, 500));
    expect(room2ReceivedLeak).toBe(false);
  });

  it('allows an admin to promote a participant to admin and synchronizes role in real-time', async () => {
    const room = await boardRoomService.createRoom({ title: 'PromotionTest', template: 'blank' });

    // Creator connects
    const wsCreator = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsCreator);
    await new Promise<void>(resolve => wsCreator.on('open', resolve));

    const creatorStatePromise = waitForMessage(wsCreator, 'ROOM_STATE');
    wsCreator.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Teacher_Creator',
        creatorToken: room.creatorToken,
        token: room.creatorToken,
      })
    );
    const creatorState = await creatorStatePromise;
    expect(creatorState.isCreator).toBe(true);
    expect(creatorState.role).toBe('admin');

    // Participant connects
    const wsParticipant = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsParticipant);
    await new Promise<void>(resolve => wsParticipant.on('open', resolve));

    const participantStatePromise = waitForMessage(wsParticipant, 'ROOM_STATE');
    wsParticipant.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Student_Learner',
      })
    );
    const participantState = await participantStatePromise;
    expect(participantState.isCreator).toBe(false);
    expect(participantState.role).toBe('participant');

    const participantUserId = participantState.currentUser.id;

    // Creator promotes participant to admin
    const roleUpdatedOnParticipantPromise = waitForMessage(wsParticipant, 'ROLE_UPDATED');
    const roleUpdatedOnCreatorPromise = waitForMessage(wsCreator, 'ROLE_UPDATED');

    wsCreator.send(
      JSON.stringify({
        type: 'PROMOTE_USER',
        targetUserId: participantUserId,
      })
    );

    const roleMsgParticipant = await roleUpdatedOnParticipantPromise;
    const roleMsgCreator = await roleUpdatedOnCreatorPromise;

    expect(roleMsgParticipant.userId).toBe(participantUserId);
    expect(roleMsgParticipant.role).toBe('admin');
    expect(roleMsgCreator.userId).toBe(participantUserId);
    expect(roleMsgCreator.role).toBe('admin');

    // Now newly promoted participant can send element updates and they sync to creator
    const syncPromise = waitForMessage(wsCreator, 'ELEMENTS_SYNC');
    wsParticipant.send(
      JSON.stringify({
        type: 'ELEMENTS_UPDATE',
        elements: [
          {
            id: 'elem_by_promoted_student',
            type: 'sticky',
            x: 200,
            y: 200,
            text: 'I am now an admin and can collaborate!',
            color: '#38bdf8',
          },
        ],
      })
    );

    const syncMsg = await syncPromise;
    expect(syncMsg.elements.some((el: any) => el.id === 'elem_by_promoted_student')).toBe(true);

    // Creator revokes admin status
    const revokeParticipantPromise = waitForMessage(wsParticipant, 'ROLE_UPDATED');
    wsCreator.send(
      JSON.stringify({
        type: 'REVOKE_ADMIN',
        targetUserId: participantUserId,
      })
    );

    const revokedMsg = await revokeParticipantPromise;
    expect(revokedMsg.userId).toBe(participantUserId);
    expect(revokedMsg.role).toBe('participant');
  });

  it('handles presentation mode start and stop cleanly', async () => {
    const room = await boardRoomService.createRoom({ title: 'PresentationTest', template: 'blank' });

    const wsPresenter = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsPresenter);
    await new Promise<void>(resolve => wsPresenter.on('open', resolve));

    const presenterStatePromise = waitForMessage(wsPresenter, 'ROOM_STATE');
    wsPresenter.send(
      JSON.stringify({
        type: 'JOIN',
        roomCode: room.code,
        userName: 'Lead_Presenter',
        creatorToken: room.creatorToken,
        token: room.creatorToken,
      })
    );
    const presenterState = await presenterStatePromise;
    const presenterUserId = presenterState.currentUser.id;

    const wsAudience = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsAudience);
    await new Promise<void>(resolve => wsAudience.on('open', resolve));

    await new Promise<void>(resolve => {
      wsAudience.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Audience_Member' }));
      wsAudience.once('message', () => resolve());
    });

    // Start presenting
    const presStartPromise = waitForMessage(wsAudience, 'PRESENTATION_STATE');
    wsPresenter.send(JSON.stringify({ type: 'START_PRESENTING' }));

    const startMsg = await presStartPromise;
    expect(startMsg.presenterUserId).toBe(presenterUserId);

    // Stop presenting
    const presStopPromise = waitForMessage(wsAudience, 'PRESENTATION_STATE');
    wsPresenter.send(JSON.stringify({ type: 'STOP_PRESENTING' }));

    const stopMsg = await presStopPromise;
    expect(stopMsg.presenterUserId).toBeNull();
  });

  it('responds with PONG to application-level PING keepalive message', async () => {
    const room = await boardRoomService.createRoom({ title: 'PingTest', template: 'blank' });

    const ws = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(ws);
    await new Promise<void>(resolve => ws.on('open', resolve));

    await new Promise<void>(resolve => {
      ws.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'PingUser' }));
      ws.once('message', () => resolve());
    });

    const pongPromise = waitForMessage(ws, 'PONG');
    ws.send(JSON.stringify({ type: 'PING' }));

    const pong = await pongPromise;
    expect(pong.type).toBe('PONG');
  });

  it('broadcasts chat messages to participants and includes them in room state history', async () => {
    const room = await boardRoomService.createRoom({ title: 'ChatTest Room', template: 'blank' });

    // Client 1 (Teacher)
    const wsTeacher = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsTeacher);
    await new Promise<void>(resolve => wsTeacher.on('open', resolve));
    await new Promise<void>(resolve => {
      wsTeacher.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Teacher', creatorToken: room.creatorToken }));
      wsTeacher.once('message', () => resolve());
    });

    // Client 2 (Student)
    const wsStudent = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsStudent);
    await new Promise<void>(resolve => wsStudent.on('open', resolve));
    await new Promise<void>(resolve => {
      wsStudent.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Student_Bob' }));
      wsStudent.once('message', () => resolve());
    });

    // Student sends chat message
    const chatPromise = waitForMessage(wsTeacher, 'CHAT_BROADCAST');
    wsStudent.send(JSON.stringify({ type: 'CHAT_MESSAGE', text: 'Hello Teacher, is this on the exam?' }));

    const chatEvent = await chatPromise;
    expect(chatEvent.message.text).toBe('Hello Teacher, is this on the exam?');
    expect(chatEvent.message.userName).toBe('Student_Bob');

    // Client 3 joins late and verifies recentMessages in ROOM_STATE
    const wsLate = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsLate);
    await new Promise<void>(resolve => wsLate.on('open', resolve));

    const lateStatePromise = waitForMessage(wsLate, 'ROOM_STATE');
    wsLate.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Late_Student' }));

    const lateState = await lateStatePromise;
    expect(lateState.recentMessages).toBeDefined();
    expect(lateState.recentMessages.some((m: any) => m.text.includes('exam?'))).toBe(true);
  });

  it('handles raise hand, lower hand, and emoji reaction bursts', async () => {
    const room = await boardRoomService.createRoom({ title: 'ReactionTest Room', template: 'blank' });

    const wsTeacher = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsTeacher);
    await new Promise<void>(resolve => wsTeacher.on('open', resolve));
    await new Promise<void>(resolve => {
      wsTeacher.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Teacher_Sam', creatorToken: room.creatorToken }));
      wsTeacher.once('message', () => resolve());
    });

    const wsStudent = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsStudent);
    await new Promise<void>(resolve => wsStudent.on('open', resolve));
    let studentId = '';
    await new Promise<void>(resolve => {
      wsStudent.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Student_Maya' }));
      wsStudent.once('message', data => {
        const parsed = JSON.parse(data.toString());
        studentId = parsed.currentUser.id;
        resolve();
      });
    });

    // Student raises hand
    const handUpPromise = waitForMessage(wsTeacher, 'HAND_STATE');
    wsStudent.send(JSON.stringify({ type: 'RAISE_HAND', raised: true }));

    const handUp = await handUpPromise;
    expect(handUp.handRaised).toBe(true);
    expect(handUp.userId).toBe(studentId);

    // Teacher lowers student's hand
    const handDownPromise = waitForMessage(
      wsStudent,
      'HAND_STATE',
      4000,
      msg => msg.handRaised === false
    );
    wsTeacher.send(JSON.stringify({ type: 'LOWER_HAND', targetUserId: studentId }));

    const handDown = await handDownPromise;
    expect(handDown.handRaised).toBe(false);

    // Emoji reaction burst
    const reactionPromise = waitForMessage(wsTeacher, 'REACTION_BURST');
    wsStudent.send(JSON.stringify({ type: 'SEND_REACTION', emoji: '🎉' }));

    const reaction = await reactionPromise;
    expect(reaction.emoji).toBe('🎉');
    expect(reaction.userName).toBe('Student_Maya');
  });

  it('allows room admin to kick a disruptive participant and protects creator from being kicked', async () => {
    const room = await boardRoomService.createRoom({ title: 'KickTest Room', template: 'blank' });

    // Admin (Creator)
    const wsAdmin = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsAdmin);
    await new Promise<void>(resolve => wsAdmin.on('open', resolve));
    let adminId = '';
    await new Promise<void>(resolve => {
      wsAdmin.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Room_Creator', creatorToken: room.creatorToken }));
      wsAdmin.once('message', data => {
        adminId = JSON.parse(data.toString()).currentUser.id;
        resolve();
      });
    });

    // Disruptive participant
    const wsTroll = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsTroll);
    await new Promise<void>(resolve => wsTroll.on('open', resolve));
    let trollId = '';
    await new Promise<void>(resolve => {
      wsTroll.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Troll_User' }));
      wsTroll.once('message', data => {
        trollId = JSON.parse(data.toString()).currentUser.id;
        resolve();
      });
    });

    // Regular student observer
    const wsStudent = new WebSocket(`ws://localhost:${port}/ws/board`);
    activeSockets.push(wsStudent);
    await new Promise<void>(resolve => wsStudent.on('open', resolve));
    await new Promise<void>(resolve => {
      wsStudent.send(JSON.stringify({ type: 'JOIN', roomCode: room.code, userName: 'Observer_Student' }));
      wsStudent.once('message', () => resolve());
    });

    // Attempt 1: Participant tries to kick admin (should fail with ERROR)
    const trollKickErrPromise = waitForMessage(wsTroll, 'ERROR');
    wsTroll.send(JSON.stringify({ type: 'KICK_USER', targetUserId: adminId }));
    const err = await trollKickErrPromise;
    expect(err.message).toContain('Only a Room Admin');

    // Attempt 2: Admin kicks disruptive participant
    const kickedPromise = waitForMessage(wsTroll, 'KICKED');
    const userKickedPromise = waitForMessage(wsStudent, 'USER_KICKED');

    wsAdmin.send(JSON.stringify({ type: 'KICK_USER', targetUserId: trollId, reason: 'Spamming board' }));

    const kickedEvent = await kickedPromise;
    expect(kickedEvent.reason).toBe('Spamming board');

    const roomKickedEvent = await userKickedPromise;
    expect(roomKickedEvent.userId).toBe(trollId);
    expect(roomKickedEvent.userName).toBe('Troll_User');
  });
});
