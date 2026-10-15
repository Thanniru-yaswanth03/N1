import os from 'os';
import { dropRepository } from '../repositories/drop.repository.js';
import { boardWebSocketManager } from '../websocket/board.socket.js';
import { duelWebSocketManager } from '../websocket/duel.socket.js';

export interface LatencyStats {
  count: number;
  totalMs: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p95Ms: number;
}

export interface SystemMetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  system: {
    cpuCount: number;
    loadAverage: number[];
    freeMemoryMB: number;
    totalMemoryMB: number;
  };
  http: {
    totalRequests: number;
    totalErrors: number;
    errorRatePercent: number;
    statusCodes: {
      '2xx': number;
      '3xx': number;
      '4xx': number;
      '5xx': number;
    };
    latency: LatencyStats;
  };
  websockets: {
    totalConnections: number;
    board: {
      activeRooms: number;
      connections: number;
    };
    duel: {
      activeMatches: number;
      queuedPlayers: number;
      connections: number;
    };
  };
  drops: {
    activeCount: number;
  };
  errors: {
    storageErrors: number;
    databaseErrors: number;
  };
}

export class MetricsService {
  private totalRequests = 0;
  private totalErrors = 0;
  private statusCodes = {
    '2xx': 0,
    '3xx': 0,
    '4xx': 0,
    '5xx': 0,
  };
  private recentLatencies: number[] = [];
  private readonly MAX_LATENCY_SAMPLES = 1000;
  private minLatency = Infinity;
  private maxLatency = 0;
  private totalLatency = 0;

  private storageErrors = 0;
  private databaseErrors = 0;

  recordRequest(durationMs: number, statusCode: number): void {
    this.totalRequests++;

    if (statusCode >= 200 && statusCode < 300) {
      this.statusCodes['2xx']++;
    } else if (statusCode >= 300 && statusCode < 400) {
      this.statusCodes['3xx']++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.statusCodes['4xx']++;
      this.totalErrors++;
    } else if (statusCode >= 500) {
      this.statusCodes['5xx']++;
      this.totalErrors++;
    }

    this.totalLatency += durationMs;
    if (durationMs < this.minLatency) this.minLatency = durationMs;
    if (durationMs > this.maxLatency) this.maxLatency = durationMs;

    this.recentLatencies.push(durationMs);
    if (this.recentLatencies.length > this.MAX_LATENCY_SAMPLES) {
      this.recentLatencies.shift();
    }
  }

  recordStorageError(): void {
    this.storageErrors++;
  }

  recordDatabaseError(): void {
    this.databaseErrors++;
  }

  private calculateP95(): number {
    if (this.recentLatencies.length === 0) return 0;
    const sorted = [...this.recentLatencies].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(index, sorted.length - 1)] ?? 0;
  }

  async getMetricsSnapshot(): Promise<SystemMetricsSnapshot> {
    const mem = process.memoryUsage();
    const boardMetrics = boardWebSocketManager.getMetrics();
    const duelMetrics = duelWebSocketManager.getMetrics();

    let activeDrops = 0;
    try {
      activeDrops = await dropRepository.countActive();
    } catch {
      // In degraded/isolated DB conditions, fallback safely to 0
    }

    const avgMs =
      this.totalRequests > 0
        ? Math.round((this.totalLatency / this.totalRequests) * 100) / 100
        : 0;

    const errorRatePercent =
      this.totalRequests > 0
        ? Math.round((this.totalErrors / this.totalRequests) * 10000) / 100
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      },
      system: {
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg(),
        freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
        totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      },
      http: {
        totalRequests: this.totalRequests,
        totalErrors: this.totalErrors,
        errorRatePercent,
        statusCodes: { ...this.statusCodes },
        latency: {
          count: this.totalRequests,
          totalMs: Math.round(this.totalLatency),
          minMs: this.minLatency === Infinity ? 0 : this.minLatency,
          maxMs: this.maxLatency,
          avgMs,
          p95Ms: this.calculateP95(),
        },
      },
      websockets: {
        totalConnections: boardMetrics.connectionCount + duelMetrics.connectionCount,
        board: {
          activeRooms: boardMetrics.activeRooms,
          connections: boardMetrics.connectionCount,
        },
        duel: {
          activeMatches: duelMetrics.activeMatches,
          queuedPlayers: duelMetrics.queuedPlayers,
          connections: duelMetrics.connectionCount,
        },
      },
      drops: {
        activeCount: activeDrops,
      },
      errors: {
        storageErrors: this.storageErrors,
        databaseErrors: this.databaseErrors,
      },
    };
  }
}

export const metricsService = new MetricsService();
