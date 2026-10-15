# Scalability & Matchmaking Architecture Analysis

**Product:** N1 Platform  
**Document:** Scalability Architecture & Matchmaking Strategy  
**Status:** Approved Architectural Decision Record (ADR)  
**Date:** September 30, 2026  

---

## 1. Context & Architectural Problem

N1 offers two real-time collaborative pillars:
1. **Study Board (`/ws/board`):** Synchronizes vector whiteboard elements, freehand strokes, shapes, and clear events between multiple connected peers within a transient room.
2. **Quably Duel (`/ws/duel`):** Pairs two anonymous participants by category and difficulty via a real-time matchmaking queue, synchronizing authoritative countdowns, questions, timers, and scoring.

In Phase 1, both features were implemented with **in-memory room and queue managers** inside the single Node.js API process (`apps/api/src/websocket/duel.socket.ts` and `apps/api/src/websocket/board.socket.ts`).

### The Architectural Question
Does the current deployment architecture require immediately provisioning:
- Redis / Redis Cluster
- A persistent matchmaking store (e.g., PostgreSQL / MongoDB queue)
- A cross-node Pub/Sub broker
- WebSocket connection coordination / sticky sessions
- Distributed locks (e.g., Redlock)

Or should N1 maintain its lightweight single-instance in-memory implementation for current production workloads?

---

## 2. Technical Evaluation: Current State vs. Distributed Needs

### A. Current Workload Profile & Deployment Topology
- **Deployment Topology:** N1 is currently packaged as a unified monorepo deployed on a high-efficiency single container / VPS host running Node.js with local MongoDB and local ephemeral NVMe storage.
- **Resource Characteristics:**
  - Memory consumption of 1,000 active Duel rooms is approximately ~12 MB of heap (each room holds metadata, 5 question IDs, 2 player state objects, and a 1-second interval timer).
  - Memory consumption of 1,000 active Board rooms with ~100 strokes each is approximately ~35 MB of heap.
  - Total Node.js heap overhead for concurrent real-time features under current scale is well below 150 MB.
- **State Ephemerality:**
  - Board rooms and Duel matches are intentionally **ephemeral**: once players disconnect or the 60-second duel finishes, the room state is garbage-collected.
  - Zero permanent game records or historical board saves are retained (by product privacy decree).

### B. Problems Introduced by Premature Distributed Infrastructure
Adding Redis and distributed locks immediately would introduce:
1. **Unnecessary Operational Complexity:**
   - Demands managing Redis clustering, failover, Sentinel/AOF persistence, and secure Redis connection pooling.
   - Increases cold-start latency and introduces a single point of failure between API nodes and the broker.
2. **Distributed Race Conditions & Lock Contention:**
   - Matchmaking requires atomic queue pops (`pop 2 candidates where category == X and difficulty == Y`). In a distributed Redis setup, this requires Redis Lua scripts or distributed locks, introducing network round-trip overhead (RTT) and failure modes for what is currently a single synchronous Node.js event-loop tick (`duelQueue.splice(...)`).
3. **Timer Drift & Split-Brain Room State:**
   - In-memory duel room timers run directly on the Node.js event loop with millisecond precision. With distributed workers, room ownership must be negotiated or synchronized via distributed cron/heartbeats.
4. **Violation of the "Zero-Unnecessary-Dependencies" Principle:**
   - Mandate: *"Do not add infrastructure merely for the sake of adding infrastructure."*

---

## 3. Architectural Decision

### Decision: Retain Single-Instance In-Memory Concurrency with Defined Multi-Node Migration Trigger

1. **Phase 2 Baseline:**
   - Duel matchmaking and active duel room sessions will remain **in-memory** within the Node.js process.
   - Study Board active room canvases and element histories will remain **in-memory** within the Node.js process.
   - The implementation provides sub-millisecond matchmaking latency, zero external network dependency, and atomic thread-safe queue operations within the JavaScript event loop.

2. **Single-Node Vertical Headroom:**
   - A single modern Node.js process can easily sustain **10,000+ concurrent WebSockets** with standard OS `ulimit -n` and Epoll tuning.
   - At 10,000 concurrent sockets (~5,000 concurrent duel matches or 2,500 active study boards), CPU utilization on an 8-core host is projected < 25%.

3. **Production Multi-Node Scaling Path (Trigger Threshold):**
   - **Trigger:** When active concurrent WebSockets exceed **5,000 simultaneous connections**, or when multi-region horizontal redundancy is mandated by high availability SLAs.
   - **Target Architecture:**
     - **Socket Layer:** Deploy an API gateway / reverse proxy (e.g., Traefik / Nginx / Cloudflare) with **Sticky Sessions** (IP hash or cookie-based) routing clients of the same room to the same worker instance, OR:
     - **Pub/Sub Broker:** Integrate `@socket.io/redis-adapter` or a lightweight Redis Pub/Sub adapter to broadcast Board element events across nodes.
     - **Matchmaker:** Migrate the queue to a Redis Sorted Set (`ZADD`/`ZRANGEBYSCORE`) with atomic Redis Lua transactions for pairing candidates.

---

## 4. Architectural Comparison Matrix

| Dimension | In-Memory (Current Phase 2) | Distributed (Redis + PubSub + Locks) |
| :--- | :--- | :--- |
| **Matchmaking Latency** | **< 0.1 ms** (In-memory array filter & splice) | 2 – 15 ms (Redis network RTT + Lua script) |
| **Operational Dependencies** | **None** (Self-contained in API runtime) | Redis 7.x, sentinel/cluster, connection pool |
| **State Consistency** | **Atomic** (JS single-threaded event loop) | Eventual / requires distributed locks |
| **Board Stroke Broadcast** | **Direct memory iteration** | Pub/Sub publish + cluster broadcast |
| **Host Capacity** | Up to ~10,000 active concurrent sockets | Millions across horizontal node cluster |
| **Failure Recovery** | Fast restart; transient rooms expunged | Re-attachment possible if room state in Redis |
| **Infrastructure Cost** | **$0 extra** | Cloud Redis instance / managed cluster ($) |

---

## 5. Security & Isolation in Single-Node Matchmaking

To ensure the in-memory queue is resilient against single-node resource exhaustion:
1. **Socket Rate Limiting:** Enforce a maximum of 5 matchmaking requests per minute per IP.
2. **Duplicate Entry Rejection:** A single socket ID or IP can only occupy one slot in the matchmaking queue at any given instant.
3. **Queue TTL / Stale Entry Purge:** Queued candidates who disconnect or whose waiting time exceeds 120 seconds are automatically evicted to prevent memory leaks.
4. **Memory Cap:** Enforce an upper bound of 10,000 queued candidates, returning a graceful `QUEUE_FULL` error rather than exhausting heap space.

---

## 6. Conclusion

For Phase 2, the single-instance in-memory queue and room manager is the **optimal engineering solution**. It minimizes latency, eliminates distributed failure modes, guarantees atomic matchmaking, and respects N1's zero-unnecessary-dependency architecture. The transition to Redis is thoroughly documented and will only be executed when traffic metrics substantiate the operational overhead.
