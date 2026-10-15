import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZipArchive } from 'archiver';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_DROP, ApiErrorResponse } from '@n1/shared';
import { createAbuseReportSchema } from '@n1/validation';
import {
  uploadRateLimiter,
  codeLookupRateLimiter,
  unlockRateLimiter,
  abuseReportRateLimiter,
  sanitizeFilename,
  checkBlockedSource,
  hashIp,
} from '../security/index.js';
import { storageService } from '../services/storage.service.js';
import { dropService, DropServiceError } from '../services/drop.service.js';
import { adminService } from '../services/admin.service.js';

export const dropRouter = Router();

// Configure Multer storage to stream files into secure temporary upload staging
const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageService.getTempDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const tempName = `staging_${Date.now()}_${crypto.randomUUID()}${ext}`;
    cb(null, tempName);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_DROP,
    fields: 20,
    fieldSize: 100 * 1024,
    parts: 40,
  },
});

/**
 * Middleware handling multipart upload parsing with specialized Multer error catching.
 * Dynamically bypasses Multer if content-type is JSON (for text drops).
 */
function handleUpload(req: Request, res: Response, next: NextFunction): void {
  if (req.is('multipart/form-data')) {
    // Clean up staging files if client terminates connection prematurely
    req.on('close', () => {
      if (!res.writableEnded) {
        const files = (req.files as Express.Multer.File[]) || [];
        if (files.length > 0) {
          storageService.cleanupFiles(files.map(f => f.path)).catch(() => {});
        }
      }
    });

    upload.any()(req, res, err => {
      if (err) {
        // Clean up any files that were already written to disk
        const files = (req.files as Express.Multer.File[]) || [];
        if (files.length > 0) {
          storageService.cleanupFiles(files.map(f => f.path)).catch(() => {});
        }

        if (err instanceof multer.MulterError) {
          let statusCode = 400;
          let code = 'UPLOAD_ERROR';
          let message = err.message;

          if (err.code === 'LIMIT_FILE_SIZE') {
            statusCode = 413;
            code = 'FILE_TOO_LARGE';
            message = 'File exceeds the 50 MB maximum size limit.';
          } else if (err.code === 'LIMIT_FILE_COUNT') {
            code = 'TOO_MANY_FILES';
            message = `Maximum ${MAX_FILES_PER_DROP} files allowed per drop.`;
          } else if (err.code === 'LIMIT_FIELD_COUNT') {
            code = 'TOO_MANY_FIELDS';
            message = 'Too many non-file fields in multipart request.';
          } else if (err.code === 'LIMIT_FIELD_VALUE') {
            code = 'FIELD_TOO_LARGE';
            message = 'Field content exceeds maximum allowed size (100KB).';
          } else if (err.code === 'LIMIT_PART_COUNT') {
            code = 'TOO_MANY_PARTS';
            message = 'Multipart request contains too many parts.';
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            code = 'UNEXPECTED_FILE';
            message = 'Unexpected file field encountered.';
          }

          const errorResponse: ApiErrorResponse = {
            success: false,
            error: { code, message },
            timestamp: new Date().toISOString(),
          };
          res.status(statusCode).json(errorResponse);
          return;
        }

        next(err);
        return;
      }
      next();
    });
  } else {
    // Non-multipart request (e.g. application/json text drop)
    next();
  }
}

/**
 * Extracts authorization tokens or passwords from headers or query parameters.
 */
function extractAuth(req: Request): { unlockToken?: string; password?: string } {
  const authHeader = req.headers.authorization;
  let unlockToken = req.headers['x-unlock-token'] as string | undefined;
  if (!unlockToken && authHeader?.startsWith('Bearer ')) {
    unlockToken = authHeader.slice(7).trim();
  }
  if (!unlockToken && typeof req.query['token'] === 'string') {
    unlockToken = req.query['token'];
  }

  const password =
    (req.headers['x-drop-password'] as string | undefined) ||
    (typeof req.query['password'] === 'string' ? req.query['password'] : undefined);

  return { unlockToken, password };
}

/**
 * Standardized service error responder.
 */
function handleServiceError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof DropServiceError) {
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(err.statusCode).json(errorResponse);
    return;
  }
  next(err);
}

/**
 * POST /
 * Creates a new text or files Drop.
 */
dropRouter.post(
  '/',
  checkBlockedSource,
  uploadRateLimiter,
  handleUpload,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp =
        (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ||
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const result = await dropService.createDrop({
        ...req.body,
        clientIp,
        files,
      });

      res.status(201).json({
        success: true,
        code: result.code,
        redirectUrl: result.redirectUrl,
        shareUrl: result.shareUrl,
        expiresAt: result.expiresAt,
        deletionToken: result.deletionToken,
        ownerDeletionToken: result.ownerDeletionToken,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      handleServiceError(err, res, next);
    }
  }
);

/**
 * POST /:code/unlock
 * Submits passphrase to unlock a password-protected drop and receive an access token.
 */
dropRouter.post(
  '/:code/unlock',
  unlockRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params['code'] as string;
      const password = req.body?.password;
      const result = await dropService.unlockDrop(code, password);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      handleServiceError(err, res, next);
    }
  }
);

/**
 * GET /:code/download/:fileId
 * Streams an individual file binary.
 */
dropRouter.get(
  '/:code/download/:fileId',
  codeLookupRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params['code'] as string;
      const fileId = req.params['fileId'] as string;
      const auth = extractAuth(req);

      const { drop, fileDoc, absolutePath } = await dropService.getFileForDownload(code, fileId, auth);

      const isInline = req.query['inline'] === 'true' || req.query['preview'] === 'true';
      const dispositionType = isInline ? 'inline' : 'attachment';

      const safeOriginalName = sanitizeFilename(fileDoc.originalName);
      res.setHeader('Content-Type', fileDoc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', fileDoc.fileSizeBytes);
      res.setHeader(
        'Content-Disposition',
        `${dispositionType}; filename="${encodeURIComponent(safeOriginalName)}"; filename*=UTF-8''${encodeURIComponent(safeOriginalName)}`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

      const fileStream = fs.createReadStream(absolutePath);
      fileStream.on('error', (err: Error) => next(err));
      fileStream.pipe(res);

      req.on('close', () => {
        if (!res.writableEnded) {
          fileStream.destroy();
        }
      });

      if (drop.burnAfterReading) {
        res.on('finish', () => {
          storageService.deleteFile(fileDoc.filePath).catch(() => {});
        });
      }
    } catch (err: unknown) {
      handleServiceError(err, res, next);
    }
  }
);

/**
 * Handles dynamic streaming ZIP generation.
 */
async function handleZipDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawCode = req.params['code'];
    const code = typeof rawCode === 'string' ? rawCode : '';
    const auth = extractAuth(req);

    const { drop, files } = await dropService.getFilesForZip(code, auth);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${drop.code}_files.zip"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on('error', (err: Error) => next(err));
    archive.pipe(res);

    // Clean up archive if client disconnects midway
    req.on('close', () => {
      if (!res.writableEnded) {
        archive.destroy();
      }
    });

    for (const f of files) {
      // Prevent Zip Slip by ensuring file name is fully sanitized without traversal sequences
      const safeEntryName = sanitizeFilename(f.fileDoc.originalName);
      archive.file(f.absolutePath, { name: safeEntryName });
    }

    await archive.finalize();

    if (drop.burnAfterReading) {
      res.on('finish', () => {
        storageService.cleanupFiles(files.map(f => f.fileDoc.filePath)).catch(() => {});
      });
    }
  } catch (err: unknown) {
    handleServiceError(err, res, next);
  }
}

/**
 * GET /:code/download-zip
 * GET /:code/download-all
 * Streams all drop files packaged on-the-fly into a single ZIP archive.
 */
dropRouter.get('/:code/download-zip', codeLookupRateLimiter, handleZipDownload);
dropRouter.get('/:code/download-all', codeLookupRateLimiter, handleZipDownload);

/**
 * GET /:code
 * Retrieves Drop metadata and unlocked content.
 */
dropRouter.get(
  '/:code',
  codeLookupRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawCode = req.params['code'];
      const code = typeof rawCode === 'string' ? rawCode : '';
      const auth = extractAuth(req);

      const result = await dropService.getDrop(code, auth);

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      handleServiceError(err, res, next);
    }
  }
);

/**
 * DELETE /:code
 * Deletes a Drop using the owner deletion token.
 */
dropRouter.delete(
  '/:code',
  uploadRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawCode = req.params['code'];
      const code = typeof rawCode === 'string' ? rawCode : '';
      const rawToken =
        req.headers['x-deletion-token'] ??
        req.body?.deletionToken ??
        req.query['token'];

      if (rawToken !== undefined && rawToken !== null && typeof rawToken !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Owner deletion token must be a string.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      const deletionToken = typeof rawToken === 'string' ? rawToken : '';

      await dropService.deleteDropByOwner(code, deletionToken);

      res.status(200).json({
        success: true,
        message: 'Drop permanently deleted.',
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      handleServiceError(err, res, next);
    }
  }
);

/**
 * POST /:code/report
 * Submits an abuse report for a Drop.
 */
dropRouter.post(
  '/:code/report',
  abuseReportRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params['code']?.toUpperCase().trim();
      if (!code) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CODE', message: 'Drop code is required' },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const parseResult = createAbuseReportSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid abuse report payload',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const ipHash = hashIp(clientIp);

      await adminService.createAbuseReport(code, parseResult.data, ipHash);

      res.status(201).json({
        success: true,
        data: { message: 'Abuse report submitted. Thank you for helping keep N1 safe.' },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

