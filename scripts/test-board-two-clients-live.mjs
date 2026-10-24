// scripts/test-board-two-clients-live.mjs
// Automated Two-Client End-to-End WebSocket Test for Real-Time Collaborative Study Board

const WebSocket = globalThis.WebSocket;

const BASE_WS_URL = process.env.API_WS_URL || 'wss://n1-api.onrender.com/ws/board';
const TEST_ROOM = process.env.TEST_ROOM || '7BTFYA';

console.log('--- N1 REAL-TIME COLLABORATIVE STUDY BOARD MULTI-CLIENT VERIFICATION ---');
console.log(`Connecting to: ${BASE_WS_URL}?room=${TEST_ROOM}`);

function createClient(name, color, token = '') {
  return new Promise((resolve, reject) => {
    const url = `${BASE_WS_URL}?room=${TEST_ROOM}&name=${encodeURIComponent(name)}&color=${encodeURIComponent(color)}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    const ws = new WebSocket(url);
    const messages = [];
    const eventResolvers = [];

    ws.onopen = () => {
      console.log(`[${name}] WebSocket OPEN`);
    };

    ws.onmessage = event => {
      try {
        const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
        messages.push(msg);
        console.log(`[${name}] RECV: ${msg.type}`, JSON.stringify(msg));
        // Notify any awaiting resolvers
        for (let i = eventResolvers.length - 1; i >= 0; i--) {
          const { filter, resolve: res } = eventResolvers[i];
          if (filter(msg)) {
            eventResolvers.splice(i, 1);
            res(msg);
          }
        }
      } catch (err) {
        console.error(`[${name}] Malformed message:`, event.data);
      }
    };

    ws.onerror = err => {
      console.error(`[${name}] Error:`, err?.message || err);
    };

    // Wait for initial ROOM_STATE
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for initial ROOM_STATE for ${name}`));
    }, 15000);

    const onInitialState = msg => {
      if (msg.type === 'ROOM_STATE') {
        clearTimeout(timeout);
        resolve({
          name,
          ws,
          messages,
          initialState: msg,
          waitForMessage(filter, timeoutMs = 10000) {
            return new Promise((res, rej) => {
              // Check past messages
              const existing = messages.find(filter);
              if (existing) return res(existing);

              const timer = setTimeout(() => {
                rej(new Error(`[${name}] Timeout waiting for message matching filter`));
              }, timeoutMs);

              eventResolvers.push({
                filter,
                resolve: m => {
                  clearTimeout(timer);
                  res(m);
                },
              });
            });
          },
          send(payload) {
            ws.send(JSON.stringify(payload));
          },
          close() {
            ws.close();
          },
        });
      }
    };

    eventResolvers.push({ filter: m => m.type === 'ROOM_STATE', resolve: onInitialState });
  });
}

async function runTwoClientVerification() {
  let clientA, clientB;
  try {
    console.log('\n[Phase 1] Connecting Client A (Admin/Creator)...');
    clientA = await createClient('Admin_Alice', '#00f0ff');
    console.log(`Client A joined as: role=${clientA.initialState.currentUser.role}, isCreator=${clientA.initialState.isCreator}`);

    console.log('\n[Phase 2] Connecting Client B (Participant)...');
    clientB = await createClient('Student_Bob', '#fbbf24');
    console.log(`Client B joined as: role=${clientB.initialState.currentUser.role}, isCreator=${clientB.initialState.isCreator}`);

    // Wait for Client A to see Client B join
    console.log('\n[Phase 3] Checking user presence synchronization...');
    const userJoinedEvent = await clientA.waitForMessage(m => m.type === 'USER_JOINED' && m.user.name === 'Student_Bob');
    console.log(`✓ Client A received USER_JOINED event for: ${userJoinedEvent.user.name}`);

    // Test Note Creation & Synchronization
    console.log('\n[Phase 4] Testing Board Content Synchronization (Admin creates notes)...');
    const testSticky = {
      id: `sticky_test_${Date.now()}`,
      type: 'sticky',
      x: 150,
      y: 200,
      width: 220,
      height: 140,
      color: '#fbbf24',
      content: 'Important Exam Notes: Newton Laws',
      fontSize: 14,
      zIndex: 1,
      updatedAt: Date.now(),
    };

    clientA.send({
      type: 'ELEMENTS_UPDATE',
      elements: [testSticky],
    });

    console.log('Client A sent ELEMENTS_UPDATE with sticky note.');
    const syncOnB = await clientB.waitForMessage(m => m.type === 'ELEMENTS_SYNC' && m.elements.some(el => el.id === testSticky.id));
    console.log(`✓ Client B received live ELEMENTS_SYNC! Element found: "${syncOnB.elements.find(el => el.id === testSticky.id).content}"`);

    // Test Live Drawing Synchronization
    console.log('\n[Phase 5] Testing Live Freehand Drawing Stream...');
    const strokeId = `stroke_${Date.now()}`;
    clientA.send({
      type: 'LIVE_DRAW',
      strokeId,
      points: [{ x: 100, y: 100 }, { x: 120, y: 130 }, { x: 150, y: 160 }],
      color: '#00f0ff',
      strokeWidth: 4,
      isFinished: false,
    });

    const drawChunk = await clientB.waitForMessage(m => m.type === 'LIVE_DRAW_CHUNK' && m.strokeId === strokeId);
    console.log(`✓ Client B received LIVE_DRAW_CHUNK with ${drawChunk.points.length} points!`);

    // Test Presentation Mode
    console.log('\n[Phase 6] Testing Classroom Presentation Mode & Viewport Sync...');
    clientA.send({ type: 'START_PRESENTING' });
    const presEvent = await clientB.waitForMessage(m => m.type === 'PRESENTATION_STATE' && m.presenterUserId === clientA.initialState.currentUser.id);
    console.log(`✓ Client B received PRESENTATION_STATE: Presenter is Alice (${presEvent.presenterUserId})`);

    clientA.send({ type: 'VIEWPORT_SYNC', panX: 450, panY: -200, zoom: 1.5 });
    const vpUpdate = await clientB.waitForMessage(m => m.type === 'VIEWPORT_UPDATE' && m.panX === 450 && m.zoom === 1.5);
    console.log(`✓ Client B received VIEWPORT_UPDATE: pan=(${vpUpdate.panX}, ${vpUpdate.panY}), zoom=${vpUpdate.zoom}`);

    // Test Promotion to Admin
    console.log('\n[Phase 7] Testing Permission Promotion: Admin promotes Student to Admin...');
    clientA.send({ type: 'PROMOTE_USER', targetUserId: clientB.initialState.currentUser.id });
    const roleEventOnB = await clientB.waitForMessage(m => m.type === 'ROLE_UPDATED' && m.userId === clientB.initialState.currentUser.id && m.role === 'admin');
    console.log(`✓ Client B received ROLE_UPDATED: role is now "${roleEventOnB.role}"!`);

    // Promoted student now creates a note and it syncs back to Admin!
    console.log('\n[Phase 8] Testing Promoted User Editing (Student adds diagram shape)...');
    const studentShape = {
      id: `shape_student_${Date.now()}`,
      type: 'shape',
      shapeType: 'circle',
      x: 350,
      y: 250,
      width: 120,
      height: 120,
      color: '#a855f7',
      zIndex: 2,
      updatedAt: Date.now(),
    };

    clientB.send({
      type: 'ELEMENTS_UPDATE',
      elements: [testSticky, studentShape],
    });

    const syncBackToA = await clientA.waitForMessage(m => m.type === 'ELEMENTS_SYNC' && m.elements.some(el => el.id === studentShape.id));
    console.log(`✓ Client A received live ELEMENTS_SYNC from newly promoted Client B! Elements count: ${syncBackToA.elements.length}`);

    // Cleanup & stop presenting
    clientA.send({ type: 'STOP_PRESENTING' });
    await clientB.waitForMessage(m => m.type === 'PRESENTATION_STATE' && m.presenterUserId === null);
    console.log('✓ Presentation ended cleanly.');

    console.log('\n=============================================================');
    console.log('🎉 ALL MULTI-CLIENT COLLABORATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('=============================================================');
  } catch (err) {
    console.error('\n❌ Test Failure:', err.message);
    process.exitCode = 1;
  } finally {
    if (clientA) clientA.close();
    if (clientB) clientB.close();
  }
}

runTwoClientVerification();
