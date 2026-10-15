import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { expirationService } from './services/expiration.service.js';
import { boardWebSocketManager } from './websocket/board.socket.js';
import { duelWebSocketManager } from './websocket/duel.socket.js';

const app = createApp();

async function bootstrap() {
  try {
    // Initialize MongoDB Connection
    const maskedUri = env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
    console.log(`[N1 API] Connecting to MongoDB at ${maskedUri}...`);
    await connectDatabase();
    console.log('[N1 API] MongoDB connected successfully.');

    // Start background self-destruct and expiration engine
    expirationService.start();
  } catch (error) {
    console.error('[N1 API] MongoDB initial connection failed:', error);
    // Proceed so server can report degraded health status
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[N1 API] Server running at ${env.API_URL} in ${env.NODE_ENV} mode`);
    console.log(
      `[N1 API] Health probe available at ${env.API_URL}/health and ${env.API_URL}/api/v1/health`
    );
  });

  // Attach real-time WebSocket server for Study Board rooms
  boardWebSocketManager.init(server);
  console.log('[N1 API] Study Board WebSocket server mounted at /ws/board');

  // Attach real-time WebSocket server for Quably Duel rooms
  duelWebSocketManager.init(server);
  console.log('[N1 API] Quably Duel WebSocket server mounted at /ws/duel');

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[N1 API] Received ${signal}. Shutting down gracefully...`);

    // Force exit after 5 seconds if connections linger
    const forceExitTimeout = setTimeout(() => {
      console.error('[N1 API] Forced shutdown due to timeout.');
      process.exit(1);
    }, 5000);

    try {
      // Stop background expiration worker
      expirationService.stop();

      server.close(async () => {
        console.log('[N1 API] HTTP server closed.');
        await disconnectDatabase();
        console.log('[N1 API] MongoDB disconnected.');
        clearTimeout(forceExitTimeout);
        process.exit(0);
      });
    } catch {
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  console.error('[N1 API] Fatal error during bootstrap:', err);
  process.exit(1);
});
