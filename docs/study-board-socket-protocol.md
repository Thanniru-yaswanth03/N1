# Study Board Real-Time WebSocket Protocol Specification

**Path:** `/ws/board`  
**Protocol:** WebSocket (`ws://` / `wss://`)  
**Encoding:** UTF-8 JSON  
**Lifecycle:** Room-scoped anonymous multi-client state synchronization with periodic debounced MongoDB persistence.

---

## 1. Connection Handshake & Lifecycle

### Handshake Parameters (URL Query String)
- `room`: (Optional, 6 alphanumeric chars) — Automatically joins specified room upon connection.
- `name`: (Optional, max 50 chars) — Custom display handle (defaults to randomized animal alias, e.g. "Anonymous Falcon").

Example:
`ws://localhost:5000/ws/board?room=ABC123&name=Alice`

### Heartbeat / Ping-Pong
- **Server Ping Interval:** 30 seconds.
- **Client Action:** Browser WebSocket automatically responds with standard `pong` frame.
- **Timeout Policy:** If a client fails to reply to a ping before the next check, the socket is immediately terminated and cleaned up from room membership.

### Disconnect & Room Cleanup
- When a client disconnects or times out:
  1. Removed from active room subscriber set.
  2. `USER_LEFT` event broadcast to remaining peers in the room.
  3. If room client count reaches 0, any pending in-memory canvas strokes are flushed to MongoDB and memory data structures are purged.

---

## 2. Client-to-Server Message Schemas

All messages sent to the server must adhere to the `boardSocketClientMessageSchema` discriminated union.

### 2.1 `JOIN`
Requests membership in a room.
```json
{
  "type": "JOIN",
  "roomCode": "ABC123",
  "userName": "Alice",
  "userColor": "#a855f7"
}
```

### 2.2 `CURSOR_MOVE`
Broadcasts live cursor coordinates to other room participants.
```json
{
  "type": "CURSOR_MOVE",
  "x": 420.5,
  "y": 180.2
}
```

### 2.3 `ELEMENTS_UPDATE`
Updates the complete canvas elements array. Triggers debounced database save (2-second interval).
```json
{
  "type": "ELEMENTS_UPDATE",
  "elements": [
    {
      "id": "elem_1",
      "type": "rectangle",
      "x": 100,
      "y": 150,
      "width": 200,
      "height": 100,
      "color": "#a855f7"
    }
  ]
}
```

### 2.4 `ELEMENT_CHANGE`
Fine-grained atomic mutation of a single element (draw stroke, move shape, delete shape).
```json
{
  "type": "ELEMENT_CHANGE",
  "action": "add",
  "element": {
    "id": "stroke_99",
    "type": "stroke",
    "x": 50,
    "y": 50,
    "color": "#38bdf8",
    "strokeWidth": 3,
    "points": [{ "x": 50, "y": 50 }, { "x": 55, "y": 52 }]
  }
}
```

### 2.5 `CLEAR_BOARD`
Clears all drawing elements in the room and resets persistent storage.
```json
{
  "type": "CLEAR_BOARD"
}
```

---

## 3. Server-to-Client Message Schemas

### 3.1 `ROOM_STATE`
Sent immediately to a joining client with the complete board snapshot, member list, and assigned user metadata.
```json
{
  "type": "ROOM_STATE",
  "room": {
    "code": "ABC123",
    "title": "Calculus II",
    "template": "math",
    "elementCount": 12,
    "createdAt": "2026-09-30T10:00:00.000Z",
    "expiresAt": "2026-10-01T10:00:00.000Z",
    "isExpired": false
  },
  "elements": [...],
  "users": [
    { "id": "u_123", "name": "Anonymous Falcon", "color": "#a855f7" }
  ],
  "currentUser": { "id": "u_999", "name": "Alice", "color": "#38bdf8" }
}
```

### 3.2 `USER_JOINED` / `USER_LEFT`
Broadcast when peers connect or disconnect.
```json
{ "type": "USER_JOINED", "user": { "id": "u_888", "name": "Anonymous Lynx", "color": "#34d399" } }
{ "type": "USER_LEFT", "userId": "u_888" }
```

### 3.3 `USER_CURSOR`
Broadcasts remote peer cursor positions.
```json
{
  "type": "USER_CURSOR",
  "userId": "u_123",
  "userName": "Alice",
  "userColor": "#38bdf8",
  "x": 512,
  "y": 256
}
```

### 3.4 `ELEMENTS_SYNC` & `ELEMENT_SYNC`
Broadcasts element updates to all peers in the room (excluding original sender).

### 3.5 `BOARD_CLEARED`
Notifies all room participants that the canvas has been cleared.

### 3.6 `ROOM_EXPIRED`
Sent when a room's expiration time has elapsed. Disconnects client with code `4010`.

### 3.7 `ERROR`
Sent upon invalid payload, rate limit violation, or unauthorized operation.
```json
{ "type": "ERROR", "message": "Invalid socket payload: Room code must be 6 alphanumeric characters" }
```

---

## 4. Failure & Security Handling

1. **Unauthorized Access:** If a client sends events other than `JOIN` before joining a room, the server rejects the message with `{ type: "ERROR", message: "Unauthorized: must join a room first" }`.
2. **Expired Room Access:** Joining an expired room yields `{ type: "ROOM_EXPIRED" }` and closes with WebSocket code `4010`.
3. **Non-Existent Room:** Joining an invalid room yields `{ type: "ERROR", message: "Study room not found" }` and closes with WebSocket code `4004`.
4. **Flood Rate Limiting:** Enforces a hard ceiling of 60 messages per second per client connection. Sockets exceeding this limit receive rate limit errors and subsequent messages are discarded.
5. **Schema Validation:** Every inbound message is validated against Zod schemas. Malformed JSON or schema violations are caught and cleanly rejected without crashing the connection or server.
