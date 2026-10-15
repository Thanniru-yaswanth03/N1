# N1 Operational Observability Architecture

**Product:** N1 Platform  
**Document:** Technical Observability & Privacy-Preserving Telemetry  
**Status:** Implemented & Production-Ready  
**Date:** September 30, 2026  

---

## 1. Overview & Privacy Principles

N1 enforces an uncompromised privacy policy:
- **Zero Invasive User Tracking:** No Google Analytics, no third-party tracking pixels, no user session recording, no fingerprinting.
- **Zero Personally Identifiable Telemetry:** IP addresses, file contents, passwords, and message payloads are **never** logged to metric endpoints or centralized log aggregators.
- **Purely Technical & Operational Metrics:** All observability is scoped exclusively to system health, resource saturation, network error rates, and capacity limits.

---

## 2. Metrics Architecture

Observability is implemented via the in-process `MetricsService` (`apps/api/src/services/metrics.service.ts`) and exposed over the standard health probe:
- `GET /health/metrics`
- `GET /api/v1/health/metrics`

### Metrics Data Schema

```json
{
  "success": true,
  "timestamp": "2026-09-30T13:45:00.000Z",
  "data": {
    "uptimeSeconds": 3600,
    "memory": {
      "heapUsedMB": 68.42,
      "heapTotalMB": 92.15,
      "rssMB": 128.5
    },
    "system": {
      "cpuCount": 8,
      "loadAverage": [0.15, 0.22, 0.18],
      "freeMemoryMB": 8192,
      "totalMemoryMB": 16384
    },
    "http": {
      "totalRequests": 12450,
      "totalErrors": 14,
      "errorRatePercent": 0.11,
      "statusCodes": {
        "2xx": 12400,
        "3xx": 36,
        "4xx": 12,
        "5xx": 2
      },
      "latency": {
        "count": 12450,
        "totalMs": 62250,
        "minMs": 1,
        "maxMs": 85,
        "avgMs": 5.0,
        "p95Ms": 14
      }
    },
    "websockets": {
      "totalConnections": 42,
      "board": {
        "activeRooms": 8,
        "connections": 22
      },
      "duel": {
        "activeMatches": 10,
        "queuedPlayers": 2,
        "connections": 20
      }
    },
    "drops": {
      "activeCount": 154
    },
    "errors": {
      "storageErrors": 0,
      "databaseErrors": 0
    }
  }
}
```

---

## 3. Metrics Tracking Dimensions

### 1. Request Latency & Throughput
- Measured via an Express response hook (`res.on('finish')`) calculating exact duration from request receipt to socket finish.
- Tracks `minMs`, `maxMs`, `avgMs`, and `p95Ms` (using a rolling ring buffer of 1,000 samples to prevent memory unboundedness).

### 2. Error Rates & Health Status
- Tracks HTTP status code distributions (2xx, 3xx, 4xx, 5xx).
- Computes real-time `errorRatePercent`.
- Any spike in 5xx errors or storage/database exceptions alerts operational monitors before user degradation occurs.

### 3. Real-Time WebSocket Capacity
- **Study Board:** Live active room count (`activeRooms`) and connected whiteboard peers (`connections`).
- **Quably Duel:** Live active duel room sessions (`activeMatches`), players currently waiting in the matchmaking queue (`queuedPlayers`), and total connected sockets (`connections`).

### 4. Ephemeral Storage & Database Health
- **Active Drops:** Live count of non-expired, active Drop documents in MongoDB (`countActive()`).
- **Storage Errors:** Physical disk I/O errors (e.g. disk full, permission failure, unlinking error).
- **Database Errors:** MongoDB driver connection failures, timeouts, or query rejections.

---

## 4. Alerting Thresholds & Operational Runbooks

| Metric | Normal Range | Warning Threshold | Critical Incident Action |
| :--- | :--- | :--- | :--- |
| **Error Rate** | < 1% | > 2% | Inspect server logs for 5xx exception causes |
| **P95 Latency** | < 50ms | > 200ms | Check MongoDB query plans and NVMe I/O wait |
| **Heap Memory** | < 250 MB | > 500 MB | Trigger GC inspection / check WebSocket leak |
| **Storage Errors** | 0 | >= 1 | Verify disk free space (`df -h`) and file permissions |
| **Database Errors**| 0 | >= 1 | Verify MongoDB replica set connectivity |
| **WS Connections** | 0 – 5,000 | > 5,000 | Consider horizontal scaling via Redis adapter (see scalability ADR) |

---

## 5. Security & Access Control

- The `/health/metrics` endpoint provides **anonymized technical aggregates only**.
- It does not expose file keys, user IDs, short codes, or secret tokens.
- For public cloud deployments, access to `/health/metrics` can be restricted to internal cluster IP ranges or protected behind standard reverse proxy basic auth while keeping `/health` open for load balancer probes.
