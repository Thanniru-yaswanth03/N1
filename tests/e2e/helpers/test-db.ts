import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/n1_drop';
const STORAGE_ROOT = path.resolve(__dirname, '../../../storage/drops');

let isConnected = false;

export async function connectTestDb() {
  if (!isConnected && mongoose.connection.readyState !== 1) {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
  }
}

export async function disconnectTestDb() {
  if (isConnected && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

export async function getDropRecord(code: string) {
  await connectTestDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  return await db.collection('drops').findOne({ code: code.toUpperCase() });
}

export async function getDropFilesRecords(dropId: any) {
  await connectTestDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  const targetId = typeof dropId === 'string' ? new mongoose.Types.ObjectId(dropId) : dropId;
  let files = await db.collection('dropfiles').find({ dropId: targetId }).toArray();
  if (files.length === 0) {
    files = await db.collection('drop_files').find({ dropId: targetId }).toArray();
  }
  return files.map(f => ({
    ...f,
    id: f._id.toString(),
  }));
}

export function resolvePhysicalFilePath(filePath: string): string {
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(STORAGE_ROOT, filePath);
}

export function checkPhysicalFileExists(filePath: string): boolean {
  const fullPath = resolvePhysicalFilePath(filePath);
  return fs.existsSync(fullPath);
}

export async function forceExpireDrop(code: string) {
  await connectTestDb();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const drop = await db.collection('drops').findOne({ code: code.toUpperCase() });
  if (!drop) return null;

  // 1. Find all drop files and unlink them physically
  let files = await db.collection('dropfiles').find({ dropId: drop._id }).toArray();
  if (files.length === 0) {
    files = await db.collection('drop_files').find({ dropId: drop._id }).toArray();
  }
  for (const f of files) {
    try {
      const fullPath = resolvePhysicalFilePath(f.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch {
      // ignore
    }
  }

  // 2. Mark files as unlinked/deleted
  await db.collection('dropfiles').deleteMany({ dropId: drop._id });
  await db.collection('drop_files').deleteMany({ dropId: drop._id });

  // 3. Mark drop as expired with past expiresAt and purged text
  await db.collection('drops').updateOne(
    { _id: drop._id },
    {
      $set: {
        status: 'expired',
        isExpired: true,
        expiresAt: new Date(Date.now() - 3600000),
        textContent: null,
      },
    }
  );

  return drop;
}
