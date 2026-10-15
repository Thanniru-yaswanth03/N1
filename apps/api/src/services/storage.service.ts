import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import {
  generateStorageKey,
  validatePathSafety,
  GeneratedStorageKey,
} from '../security/sanitization.js';

export interface StoredFileResult {
  storageKey: string;
  storedName: string;
  absolutePath: string;
  fileSizeBytes: number;
  checksum: string;
}

export class StorageService {
  private readonly storageRoot: string;
  private readonly tempDir: string;

  constructor(customStorageRoot?: string) {
    this.storageRoot = customStorageRoot || this.resolveStorageRoot();
    this.tempDir = path.join(this.storageRoot, 'tmp');
    this.ensureDirectories();
  }

  /**
   * Resolves the canonical root directory for private drop storage.
   * Works across workspace root, apps/api directory, and absolute custom paths.
   */
  public resolveStorageRoot(): string {
    const configured = env.LOCAL_STORAGE_PATH;
    if (path.isAbsolute(configured)) {
      return configured;
    }

    const directPath = path.resolve(process.cwd(), configured);
    if (fs.existsSync(directPath)) {
      return directPath;
    }

    const twoUpPath = path.resolve(process.cwd(), '../../', configured);
    if (fs.existsSync(twoUpPath)) {
      return twoUpPath;
    }

    const oneUpPath = path.resolve(process.cwd(), '../', configured);
    if (fs.existsSync(oneUpPath)) {
      return oneUpPath;
    }

    return directPath;
  }

  /**
   * Returns the absolute storage root directory.
   */
  public getStorageRoot(): string {
    return this.storageRoot;
  }

  /**
   * Returns the directory used for temporary staging during multipart uploads.
   */
  public getTempDir(): string {
    return this.tempDir;
  }

  /**
   * Ensures the storage root and temporary upload directories exist.
   */
  public ensureDirectories(): void {
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Reads leading bytes of a file from disk to inspect binary signatures.
   */
  public async readHeaderBytes(filePath: string, length = 512): Promise<Buffer> {
    const stat = await fs.promises.stat(filePath);
    const bytesToRead = Math.min(stat.size, length);
    if (bytesToRead === 0) {
      return Buffer.alloc(0);
    }

    const fd = await fs.promises.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(bytesToRead);
      await fd.read(buffer, 0, bytesToRead, 0);
      return buffer;
    } finally {
      await fd.close();
    }
  }

  /**
   * Computes the SHA-256 checksum of a file on disk.
   */
  public async computeFileChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', err => reject(err));
    });
  }

  /**
   * Atomically relocates a staged temporary upload into permanent private partitioned storage.
   * Internal path: storage/drops/YYYY-MM/{uuid}.{ext}
   */
  public async storeFile(tempFilePath: string, extension: string): Promise<StoredFileResult> {
    const keyInfo: GeneratedStorageKey = generateStorageKey(extension);
    const destinationDir = validatePathSafety(this.storageRoot, keyInfo.folder);
    await fs.promises.mkdir(destinationDir, { recursive: true });

    const destinationPath = validatePathSafety(this.storageRoot, keyInfo.storageKey);

    // Compute checksum and size before or during move
    const [stat, checksum] = await Promise.all([
      fs.promises.stat(tempFilePath),
      this.computeFileChecksum(tempFilePath),
    ]);

    // Move file atomically
    await fs.promises.rename(tempFilePath, destinationPath);

    return {
      storageKey: keyInfo.storageKey,
      storedName: keyInfo.storedName,
      absolutePath: destinationPath,
      fileSizeBytes: stat.size,
      checksum,
    };
  }

  /**
   * Safely deletes a file from disk given its relative storage key or absolute path.
   */
  public async deleteFile(storageKeyOrPath: string): Promise<boolean> {
    try {
      const absPath = path.isAbsolute(storageKeyOrPath)
        ? storageKeyOrPath
        : validatePathSafety(this.storageRoot, storageKeyOrPath);

      if (fs.existsSync(absPath)) {
        await fs.promises.unlink(absPath);
        return true;
      }
      return false;
    } catch {
      const { metricsService } = await import('./metrics.service.js');
      metricsService.recordStorageError();
      return false;
    }
  }

  /**
   * Batch deletes multiple files from disk (e.g. on rollback).
   */
  public async cleanupFiles(pathsOrKeys: string[]): Promise<void> {
    await Promise.allSettled(pathsOrKeys.map(p => this.deleteFile(p)));
  }

  /**
   * Computes aggregate storage metrics without exposing absolute filesystem paths.
   */
  public async getStorageStats(): Promise<{
    totalSizeBytes: number;
    fileCount: number;
    rootPathMasked: string;
  }> {
    let totalSizeBytes = 0;
    let fileCount = 0;

    const traverse = async (dir: string): Promise<void> => {
      try {
        if (!fs.existsSync(dir)) return;
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await traverse(fullPath);
          } else if (entry.isFile()) {
            fileCount++;
            try {
              const stat = await fs.promises.stat(fullPath);
              totalSizeBytes += stat.size;
            } catch {
              // ignore deleted/locked file
            }
          }
        }
      } catch {
        // ignore directory read error
      }
    };

    await traverse(this.storageRoot);

    return {
      totalSizeBytes,
      fileCount,
      rootPathMasked: './storage/drops',
    };
  }
}

export const storageService = new StorageService();
