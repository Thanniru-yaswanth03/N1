import mongoose from 'mongoose';
import { env } from '../config/env.js';

let isConnecting = false;

/**
 * Connect to MongoDB with environment-based URI and connection options.
 */
export async function connectDatabase(customUri?: string): Promise<typeof mongoose> {
  const uri = customUri || env.MONGODB_URI;

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    // Wait for in-flight connection attempt
    return new Promise((resolve, reject) => {
      mongoose.connection.once('connected', () => resolve(mongoose));
      mongoose.connection.once('error', err => reject(err));
    });
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true, // Ensure indexes are built in development/testing
    });

    mongoose.connection.on('error', async () => {
      try {
        const { metricsService } = await import('../services/metrics.service.js');
        metricsService.recordDatabaseError();
      } catch {
        // Safe fallback
      }
    });

    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    throw error;
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
  }
}

/**
 * Returns true if the MongoDB connection is open and active.
 */
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Returns the current connection state as a readable string.
 */
export function getDatabaseConnectionState():
  'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}

// Global Event Listeners for diagnostics & error handling
mongoose.connection.on('connected', () => {
  // Connected successfully
});

mongoose.connection.on('error', err => {
  // Connection error handled
  console.error('[MongoDB Error]:', err.message);
});

mongoose.connection.on('disconnected', () => {
  // Disconnected from MongoDB
});

/**
 * Registers process signal handlers for graceful shutdown.
 */
export function registerGracefulShutdown(serverCloseFn?: () => Promise<void> | void): void {
  const handleSignal = async (signal: string) => {
    try {
      console.log(`[MongoDB] Graceful shutdown initiated by ${signal}`);
      if (serverCloseFn) {
        await serverCloseFn();
      }
      await disconnectDatabase();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  };

  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));
}
