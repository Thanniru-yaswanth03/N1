import path from 'node:path';
import fs from 'node:fs';
import { Types } from 'mongoose';
import {
  MAX_FILES_PER_DROP,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_DROP_SIZE_BYTES,
  MAX_TEXT_CHARACTERS,
  EXPIRY_DURATIONS_MS,
  ExpiryPreset,
  EXPIRY_PRESETS,
} from '@n1/shared';
import { env } from '../config/env.js';
import {
  generateDropCode,
  generateDeletionToken,
  hashToken,
  hashIp,
  hashPassword,
  verifyPassword,
  createUnlockToken,
  verifyUnlockToken,
  verifyDeletionToken,
  sanitizeFilename,
  validatePathSafety,
  isExtensionAllowed,
  hasDangerousDoubleExtension,
  isValidMimeForExtension,
  validateMagicBytes,
} from '../security/index.js';
import { IDropDocument } from '../models/drop.model.js';
import { IDropFileDocument } from '../models/drop-file.model.js';
import { dropRepository } from '../repositories/drop.repository.js';
import { dropFileRepository } from '../repositories/drop-file.repository.js';
import { storageService, StorageService } from './storage.service.js';

export class DropServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Array<{ field?: string; issue: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field?: string; issue: string }>
  ) {
    super(message);
    this.name = 'DropServiceError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface CreateDropParams {
  drop_type?: string;
  type?: string;
  expiry?: string;
  text_content?: string;
  textContent?: string;
  password?: string;
  burn_after_reading?: boolean | string;
  burnAfterReading?: boolean | string;
  max_views?: number | string;
  maxViews?: number | string;
  view_limit?: number | string;
  viewLimit?: number | string;
  clientIp?: string;
  files?: Express.Multer.File[];
}

export interface CreateDropResult {
  code: string;
  redirectUrl: string;
  shareUrl: string;
  expiresAt: string;
  deletionToken: string;
  ownerDeletionToken: string;
  dropType: 'text' | 'files';
  fileCount: number;
  totalSizeBytes: number;
  burnAfterReading: boolean;
  isPasswordProtected: boolean;
  viewLimit: number | null;
}

export interface PublicFileMeta {
  id: string;
  name: string;
  sizeBytes: number;
  extension: string;
  mimeType: string;
  downloadUrl: string;
}

export interface DropDetailsResult {
  code: string;
  status: 'ACTIVE' | 'PASSWORD_LOCKED' | 'EXPIRED' | 'BURNED' | 'VIEW_LIMIT_REACHED';
  dropType: 'text' | 'files';
  requiresPassword?: boolean;
  textContent?: string | null;
  totalSizeBytes?: number;
  fileCount?: number;
  files?: PublicFileMeta[];
  downloadZipUrl?: string;
  downloadAllUrl?: string;
  createdAt: string;
  expiresAt: string;
  viewCount?: number;
  maxViews?: number | null;
  burnAfterReading?: boolean;
  viewToken?: string;
  isOwner?: boolean;
}

export interface DropMetadataResult {
  code: string;
  status: 'ACTIVE' | 'PASSWORD_LOCKED' | 'EXPIRED' | 'VIEW_LIMIT_REACHED' | 'BURNED' | 'DELETED';
  dropType: 'text' | 'files';
  fileCount: number;
  totalSizeBytes: number;
  createdAt: string;
  expiresAt: string;
  burnAfterReading: boolean;
  requiresPassword: boolean;
  maxViews: number | null;
  viewCount: number;
  isExpired: boolean;
  isViewLimitReached: boolean;
}

export interface UnlockResult {
  accessToken: string;
  unlockToken: string;
  drop: DropDetailsResult;
}

export class DropService {
  constructor(
    private readonly storage: StorageService = storageService,
    private readonly dropRepo = dropRepository,
    private readonly dropFileRepo = dropFileRepository
  ) {}

  /**
   * Orchestrates the secure creation of a Drop (text or files).
   */
  public async createDrop(params: CreateDropParams): Promise<CreateDropResult> {
    const rawFiles = params.files || [];

    try {
      // 1. Validate Drop Type
      const rawType = (params.drop_type || params.type || '').trim().toLowerCase();
      if (!rawType || (rawType !== 'text' && rawType !== 'files' && rawType !== 'file')) {
        throw new DropServiceError(
          400,
          'INVALID_DROP_TYPE',
          'Drop type must be either "text" or "files".'
        );
      }
      const isTextDrop = rawType === 'text';
      const dropType: 'text' | 'files' = isTextDrop ? 'text' : 'files';

      // 2. Validate Expiry
      const rawExpiry = (params.expiry || '').trim() as ExpiryPreset;
      if (!rawExpiry || !EXPIRY_PRESETS.includes(rawExpiry)) {
        throw new DropServiceError(
          400,
          'INVALID_EXPIRY',
          `Expiry preset must be one of: ${EXPIRY_PRESETS.join(', ')}.`
        );
      }
      const durationMs = EXPIRY_DURATIONS_MS[rawExpiry];
      const expiresAt = new Date(Date.now() + durationMs);

      // 3. Validate Optional Password
      let passwordHash: string | null = null;
      if (params.password !== undefined && params.password !== null) {
        const pass = String(params.password);
        if (pass.length > 0) {
          if (pass.length > 128) {
            throw new DropServiceError(
              400,
              'PASSWORD_TOO_LONG',
              'Password cannot exceed 128 characters.'
            );
          }
          passwordHash = await hashPassword(pass);
        }
      }

      // 4. Validate Optional View Limit
      let maxViews: number | null = null;
      const rawMaxViews = params.max_views ?? params.maxViews ?? params.view_limit ?? params.viewLimit;
      if (rawMaxViews !== undefined && rawMaxViews !== null && rawMaxViews !== '') {
        const parsedViews = Number(rawMaxViews);
        if (!Number.isInteger(parsedViews) || parsedViews < 1 || parsedViews > 100) {
          throw new DropServiceError(
            400,
            'INVALID_VIEW_LIMIT',
            'Maximum view limit must be an integer between 1 and 100.'
          );
        }
        maxViews = parsedViews;
      }

      // 5. Validate Optional Burn After Reading
      const rawBurn = params.burn_after_reading ?? params.burnAfterReading;
      const burnAfterReading = rawBurn === true || rawBurn === 'true' || rawBurn === '1';

      // 6. Type-Specific Validation
      let textContent: string | null = null;
      let totalSizeBytes = 0;

      if (isTextDrop) {
        if (rawFiles.length > 0) {
          throw new DropServiceError(
            400,
            'UNEXPECTED_FILES',
            'File uploads are not permitted for text drops.'
          );
        }

        const rawText = params.text_content ?? params.textContent ?? '';
        if (typeof rawText !== 'string' || rawText.trim().length === 0) {
          throw new DropServiceError(
            400,
            'EMPTY_TEXT_CONTENT',
            'Text content is required for text drops.'
          );
        }

        if (rawText.length > MAX_TEXT_CHARACTERS) {
          throw new DropServiceError(
            400,
            'TEXT_TOO_LONG',
            `Text content cannot exceed ${MAX_TEXT_CHARACTERS.toLocaleString()} characters.`
          );
        }

        textContent = rawText;
        totalSizeBytes = Buffer.byteLength(textContent, 'utf8');
      } else {
        // Files Drop Validation
        if (!rawFiles || rawFiles.length === 0) {
          throw new DropServiceError(
            400,
            'NO_FILES_PROVIDED',
            'At least one file is required for file drops.'
          );
        }

        if (rawFiles.length > MAX_FILES_PER_DROP) {
          throw new DropServiceError(
            400,
            'TOO_MANY_FILES',
            `Maximum ${MAX_FILES_PER_DROP} files allowed per drop.`
          );
        }

        // Validate individual file sizes and aggregate size
        for (const file of rawFiles) {
          if (!file.size || file.size === 0) {
            throw new DropServiceError(
              400,
              'EMPTY_FILE',
              `File '${file.originalname}' is empty (0 bytes). Empty files are not allowed.`
            );
          }
          if (file.size > MAX_FILE_SIZE_BYTES) {
            throw new DropServiceError(
              413,
              'FILE_TOO_LARGE',
              `File '${file.originalname}' exceeds the 50 MB maximum size limit.`
            );
          }
          totalSizeBytes += file.size;
        }

        if (totalSizeBytes > MAX_TOTAL_DROP_SIZE_BYTES) {
          throw new DropServiceError(
            413,
            'TOTAL_SIZE_EXCEEDED',
            'Total drop size exceeds the 200 MB aggregate maximum limit.'
          );
        }

        // Validate extensions, double-extensions, MIME types, and magic bytes for every file
        for (const file of rawFiles) {
          // Double-extension check
          if (hasDangerousDoubleExtension(file.originalname)) {
            throw new DropServiceError(
              400,
              'DANGEROUS_FILE_EXTENSION',
              `File '${file.originalname}' contains a dangerous double extension.`
            );
          }

          // Extension Whitelist check
          const sanitizedName = sanitizeFilename(file.originalname);
          const ext = path.extname(sanitizedName).replace(/^\./, '').toLowerCase();

          if (!ext || !isExtensionAllowed(ext)) {
            throw new DropServiceError(
              400,
              'INVALID_EXTENSION',
              `File extension '.${ext || 'unknown'}' is not allowed.`
            );
          }

          // MIME Type validation
          if (!isValidMimeForExtension(ext, file.mimetype)) {
            throw new DropServiceError(
              400,
              'INVALID_MIME_TYPE',
              `Declared MIME type '${file.mimetype}' is invalid for extension '.${ext}'.`
            );
          }

          // Magic-Byte binary header inspection
          const header = await this.storage.readHeaderBytes(file.path, 512);
          const magicResult = validateMagicBytes(header, ext);
          if (!magicResult.valid) {
            throw new DropServiceError(
              400,
              'INVALID_FILE_SIGNATURE',
              `File '${file.originalname}' content does not match authentic ${ext.toUpperCase()} binary signature.`
            );
          }
        }
      }

      // 7. Relocate files to private partitioned storage (if files drop)
      const storedFiles: Array<{
        originalName: string;
        storedName: string;
        storageKey: string;
        fileSizeBytes: number;
        checksum: string;
        mimeType: string;
        extension: string;
      }> = [];
      const storedAbsolutePaths: string[] = [];

      try {
        if (!isTextDrop) {
          for (const file of rawFiles) {
            const sanitizedName = sanitizeFilename(file.originalname);
            const ext = path.extname(sanitizedName).replace(/^\./, '').toLowerCase();

            const stored = await this.storage.storeFile(file.path, ext);
            storedAbsolutePaths.push(stored.absolutePath);

            storedFiles.push({
              originalName: sanitizedName,
              storedName: stored.storedName,
              storageKey: stored.storageKey,
              fileSizeBytes: stored.fileSizeBytes,
              checksum: stored.checksum,
              mimeType: file.mimetype,
              extension: ext,
            });
          }
        }

        // 8. Generate Cryptographically Secure Drop Code
        let code = generateDropCode();
        let collisionAttempts = 0;
        while (await this.dropRepo.findByCode(code)) {
          collisionAttempts++;
          if (collisionAttempts > 10) {
            throw new DropServiceError(
              500,
              'CODE_GENERATION_FAILED',
              'Failed to generate a unique short drop code.'
            );
          }
          code = generateDropCode();
        }

        // 9. Generate Owner Deletion Token
        const deletionToken = generateDeletionToken();
        const ownerDeleteTokenHash = hashToken(deletionToken);

        // 10. Hash Client IP for Privacy-Preserving Telemetry
        const ipHash = hashIp(params.clientIp || '127.0.0.1');

        // 11. Persist Drop Document (with resilient unique code collision retry)
        let dropDoc;
        let createAttempts = 0;
        while (!dropDoc) {
          try {
            dropDoc = await this.dropRepo.create({
              code,
              type: isTextDrop ? 'text' : 'file',
              textContent,
              totalSizeBytes,
              fileCount: isTextDrop ? 0 : rawFiles.length,
              createdAt: new Date(),
              expiresAt,
              isExpired: false,
              passwordHash,
              viewLimit: maxViews,
              viewCount: 0,
              burnAfterReading,
              ownerDeleteTokenHash,
              ipHash,
              status: 'active',
            });
          } catch (createErr: unknown) {
            const errWithCode = createErr as { code?: number };
            if (errWithCode?.code === 11000 && createAttempts < 5) {
              createAttempts++;
              code = generateDropCode();
              continue;
            }
            throw createErr;
          }
        }

        // 12. Persist DropFile Documents
        if (storedFiles.length > 0) {
          try {
            const dropFileDocs = storedFiles.map(f => ({
              dropId: dropDoc._id as Types.ObjectId,
              originalName: f.originalName,
              storedName: f.storedName,
              fileSizeBytes: f.fileSizeBytes,
              mimeType: f.mimeType,
              extension: f.extension,
              filePath: f.storageKey,
              checksum: f.checksum,
              createdAt: new Date(),
            }));
            await this.dropFileRepo.createMany(dropFileDocs);
          } catch (fileDbError) {
            // Rollback Drop document if file metadata creation fails
            await this.dropRepo.deleteById(dropDoc._id ? dropDoc._id.toString() : '');
            throw fileDbError;
          }
        }

        // 13. Return Safe Public Response Envelope
        return {
          code,
          redirectUrl: `/drop/success/${code}`,
          shareUrl: `${env.CLIENT_URL}/d/${code}`,
          expiresAt: expiresAt.toISOString(),
          deletionToken,
          ownerDeletionToken: deletionToken,
          dropType,
          fileCount: isTextDrop ? 0 : rawFiles.length,
          totalSizeBytes,
          burnAfterReading,
          isPasswordProtected: Boolean(passwordHash),
          viewLimit: maxViews,
        };
      } catch (storageOrDbError) {
        // Rollback any files moved to permanent storage
        if (storedAbsolutePaths.length > 0) {
          await this.storage.cleanupFiles(storedAbsolutePaths);
        }
        throw storageOrDbError;
      }
    } finally {
      // Always cleanup raw temporary upload files on disk
      if (rawFiles.length > 0) {
        await this.storage.cleanupFiles(rawFiles.map(f => f.path).filter(Boolean));
      }
    }
  }

  /**
   * Helper verifying whether a request is authorized for a protected drop.
   */
  public async checkAuthorization(
    drop: IDropDocument,
    options?: { unlockToken?: string; password?: string }
  ): Promise<boolean> {
    if (!drop.passwordHash) {
      return true;
    }

    if (options?.unlockToken) {
      if (verifyUnlockToken(options.unlockToken, drop.code, env.JWT_SECRET)) {
        return true;
      }
    }

    if (options?.password) {
      const isValid = await verifyPassword(options.password, drop.passwordHash);
      if (isValid) {
        return true;
      }
    }

    return false;
  }

  /**
   * Asserts that a drop is active, not expired, not burned, not deleted, and within view limits.
   */
  public assertDropActive(drop: IDropDocument): void {
    if (drop.status === 'deleted') {
      throw new DropServiceError(410, 'DROP_DELETED', 'This Drop was permanently deleted by its owner.');
    }
    if (drop.status === 'burned') {
      throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was burned after reading.');
    }
    if (drop.isExpired || drop.expiresAt <= new Date()) {
      throw new DropServiceError(410, 'DROP_EXPIRED', 'This Drop has expired.');
    }
    if (drop.viewLimit !== null && drop.viewCount >= drop.viewLimit) {
      throw new DropServiceError(
        410,
        'VIEW_LIMIT_REACHED',
        'This Drop has reached its maximum view limit and is no longer accessible.'
      );
    }
  }

  /**
   * Burns a drop immediately, setting its status to burned and purging storage files.
   */
  public async burnDrop(drop: IDropDocument): Promise<void> {
    await this.dropRepo.markAsBurned(drop._id.toString());
    if (drop.type === 'file') {
      const files = await this.dropFileRepo.findByDropId(drop._id);
      await this.storage.cleanupFiles(files.map(f => f.filePath));
    }
  }

  /**
   * Retrieves safe public metadata for a Drop without consuming views or incrementing counters.
   */
  public async getDropMetadata(code: string): Promise<DropMetadataResult> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    const drop = await this.dropRepo.findByCode(cleanCode);
    if (!drop) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    const isTextDrop = drop.type === 'text';
    const isExpired = drop.isExpired || drop.expiresAt <= new Date() || drop.status === 'expired';
    const isViewLimitReached = drop.viewLimit !== null && drop.viewCount >= drop.viewLimit;

    return {
      code: drop.code,
      status: isExpired
        ? 'EXPIRED'
        : isViewLimitReached
        ? 'VIEW_LIMIT_REACHED'
        : drop.status === 'burned'
        ? 'BURNED'
        : drop.status === 'deleted'
        ? 'DELETED'
        : Boolean(drop.passwordHash)
        ? 'PASSWORD_LOCKED'
        : 'ACTIVE',
      dropType: isTextDrop ? 'text' : 'files',
      fileCount: drop.fileCount,
      totalSizeBytes: drop.totalSizeBytes,
      createdAt: drop.createdAt.toISOString(),
      expiresAt: drop.expiresAt.toISOString(),
      burnAfterReading: drop.burnAfterReading,
      requiresPassword: Boolean(drop.passwordHash),
      maxViews: drop.viewLimit,
      viewCount: drop.viewCount,
      isExpired,
      isViewLimitReached,
    };
  }

  /**
   * Retrieves Drop metadata and unlocked content for a given code.
   * Supports session-aware access tokens so that active viewers, React Strict Mode,
   * and owner inspections do not consume multiple views or cause false expirations.
   */
  public async getDrop(
    code: string,
    options?: { unlockToken?: string; password?: string; ownerToken?: string; viewToken?: string }
  ): Promise<DropDetailsResult> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    const drop = await this.dropRepo.findByCode(cleanCode);
    if (!drop) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    const isTextDrop = drop.type === 'text';

    // 1. Check if caller is Drop owner (owner inspection does not consume views)
    let isOwner = false;
    if (options?.ownerToken) {
      isOwner = verifyDeletionToken(options.ownerToken, drop.ownerDeleteTokenHash);
    }

    // 2. Check if caller has an existing valid active view session token
    const tokenToCheck = options?.unlockToken || options?.viewToken;
    let isExistingSession = false;
    if (tokenToCheck) {
      isExistingSession = verifyUnlockToken(tokenToCheck, drop.code, env.JWT_SECRET);
    }

    // 3. Status and Expiration Checks
    if (drop.status === 'deleted') {
      throw new DropServiceError(410, 'DROP_DELETED', 'This Drop was permanently deleted by its owner.');
    }
    if (drop.status === 'burned') {
      throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was burned after reading.');
    }
    if (drop.isExpired || drop.expiresAt <= new Date()) {
      throw new DropServiceError(410, 'DROP_EXPIRED', 'This Drop has expired.');
    }

    // If new view attempt (not owner and no existing active session), enforce view limit
    if (!isOwner && !isExistingSession) {
      if (drop.viewLimit !== null && drop.viewCount >= drop.viewLimit) {
        throw new DropServiceError(
          410,
          'VIEW_LIMIT_REACHED',
          'This Drop has reached its maximum view limit and is no longer accessible.'
        );
      }
    }

    // Password Challenge Check (if protected and not owner)
    if (drop.passwordHash && !isOwner) {
      const isAuthorized = await this.checkAuthorization(drop, options);
      if (!isAuthorized) {
        // Return challenge metadata without revealing content or file links
        return {
          code: drop.code,
          status: 'PASSWORD_LOCKED',
          dropType: isTextDrop ? 'text' : 'files',
          requiresPassword: true,
          expiresAt: drop.expiresAt.toISOString(),
          createdAt: drop.createdAt.toISOString(),
          viewCount: drop.viewCount,
          maxViews: drop.viewLimit,
        };
      }
    }

    // Burn-After-Reading handling for text drops: atomic claim and burn
    if (drop.burnAfterReading && isTextDrop && !isOwner) {
      const burnedDrop = await this.dropRepo.atomicBurnTextDrop(drop._id.toString());
      if (!burnedDrop) {
        throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was already burned after reading.');
      }
      // Purge physical DB content
      await this.dropRepo.purgeDropContent(drop._id.toString(), true);
      return {
        code: drop.code,
        status: 'BURNED',
        dropType: 'text',
        textContent: burnedDrop.textContent,
        createdAt: drop.createdAt.toISOString(),
        expiresAt: drop.expiresAt.toISOString(),
        viewCount: 1,
        maxViews: drop.viewLimit,
        burnAfterReading: true,
      };
    }

    let activeSessionToken: string | undefined = tokenToCheck;
    let newViewCount = drop.viewCount;

    // Increment view count ONLY if this is a new viewer (not owner and not an existing session)
    if (!isOwner && !isExistingSession) {
      const viewResult = await this.dropRepo.atomicIncrementViewIfAllowed(
        drop._id.toString(),
        drop.viewLimit
      );
      if (!viewResult.allowed || !viewResult.drop) {
        throw new DropServiceError(
          410,
          'VIEW_LIMIT_REACHED',
          'This Drop has reached its maximum view limit and is no longer accessible.'
        );
      }
      newViewCount = viewResult.drop.viewCount;
      // Issue session token so subsequent refreshes/previews/downloads in this session do not re-increment or fail
      activeSessionToken = createUnlockToken(cleanCode, drop.expiresAt, env.JWT_SECRET);
    }

    if (isTextDrop) {
      return {
        code: drop.code,
        status: 'ACTIVE',
        dropType: 'text',
        textContent: drop.textContent,
        createdAt: drop.createdAt.toISOString(),
        expiresAt: drop.expiresAt.toISOString(),
        viewCount: newViewCount,
        maxViews: drop.viewLimit,
        burnAfterReading: drop.burnAfterReading,
        viewToken: activeSessionToken,
        isOwner,
      };
    }

    // File Drop: retrieve file metadata
    const fileDocs = await this.dropFileRepo.findByDropId(drop._id);
    const publicFiles: PublicFileMeta[] = fileDocs.map(f => ({
      id: f._id.toString(),
      name: f.originalName,
      sizeBytes: f.fileSizeBytes,
      extension: f.extension,
      mimeType: f.mimeType,
      downloadUrl: `/api/drop/${drop.code}/download/${f._id.toString()}`,
    }));

    return {
      code: drop.code,
      status: 'ACTIVE',
      dropType: 'files',
      totalSizeBytes: drop.totalSizeBytes,
      fileCount: drop.fileCount,
      files: publicFiles,
      downloadZipUrl: `/api/drop/${drop.code}/download-zip`,
      downloadAllUrl: `/api/drop/${drop.code}/download-zip`,
      createdAt: drop.createdAt.toISOString(),
      expiresAt: drop.expiresAt.toISOString(),
      viewCount: newViewCount,
      maxViews: drop.viewLimit,
      burnAfterReading: drop.burnAfterReading,
      viewToken: activeSessionToken,
      isOwner,
    };
  }

  /**
   * Submits a passphrase to unlock a password-protected Drop.
   */
  public async unlockDrop(code: string, password?: string): Promise<UnlockResult> {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    const drop = await this.dropRepo.findByCode(cleanCode);
    if (!drop) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    this.assertDropActive(drop);

    if (!drop.passwordHash) {
      throw new DropServiceError(
        400,
        'DROP_NOT_PASSWORD_PROTECTED',
        'This drop is not password-protected.'
      );
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      throw new DropServiceError(400, 'PASSWORD_REQUIRED', 'Passphrase is required to unlock this drop.');
    }

    const isValid = await verifyPassword(password, drop.passwordHash);
    if (!isValid) {
      throw new DropServiceError(401, 'INVALID_PASSWORD', 'The passphrase you entered is incorrect.');
    }

    const unlockToken = createUnlockToken(cleanCode, drop.expiresAt, env.JWT_SECRET);
    const dropPayload = await this.getDrop(cleanCode, { unlockToken });

    return {
      accessToken: unlockToken,
      unlockToken,
      drop: dropPayload,
    };
  }

  /**
   * Retrieves single file document and verified filesystem path for streaming download.
   */
  public async getFileForDownload(
    code: string,
    fileId: string,
    options?: { unlockToken?: string; password?: string; ownerToken?: string; viewToken?: string }
  ): Promise<{ drop: IDropDocument; fileDoc: IDropFileDocument; absolutePath: string }> {
    const cleanCode = (code || '').trim().toUpperCase();
    const drop = await this.dropRepo.findByCode(cleanCode);
    if (!drop) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    if (drop.status === 'deleted') {
      throw new DropServiceError(410, 'DROP_DELETED', 'This Drop was permanently deleted by its owner.');
    }
    if (drop.status === 'burned') {
      throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was burned after reading.');
    }
    if (drop.isExpired || drop.expiresAt <= new Date()) {
      throw new DropServiceError(410, 'DROP_EXPIRED', 'This Drop has expired.');
    }

    const tokenToCheck = options?.unlockToken || options?.viewToken;
    const hasValidToken = tokenToCheck ? verifyUnlockToken(tokenToCheck, drop.code, env.JWT_SECRET) : false;
    const isOwner = options?.ownerToken ? verifyDeletionToken(options.ownerToken, drop.ownerDeleteTokenHash) : false;

    if (drop.passwordHash) {
      const isAuthed = hasValidToken || isOwner || (options?.password && (await verifyPassword(options.password, drop.passwordHash)));
      if (!isAuthed) {
        throw new DropServiceError(401, 'UNAUTHORIZED', 'Password or unlock token required to download file.');
      }
    }

    // View-limit check: if view limit is reached, only authorized sessions (or owner) can download
    if (drop.viewLimit !== null && drop.viewCount >= drop.viewLimit) {
      if (!hasValidToken && !isOwner) {
        throw new DropServiceError(
          410,
          'VIEW_LIMIT_REACHED',
          'This Drop has reached its maximum view limit and is no longer accessible.'
        );
      }
    }

    if (!Types.ObjectId.isValid(fileId)) {
      throw new DropServiceError(404, 'FILE_NOT_FOUND', 'File not found.');
    }

    const fileDoc = await this.dropFileRepo.findById(fileId);
    if (!fileDoc || fileDoc.dropId.toString() !== drop._id.toString()) {
      throw new DropServiceError(404, 'FILE_NOT_FOUND', 'File does not belong to the requested Drop.');
    }

    const absPath = validatePathSafety(this.storage.getStorageRoot(), fileDoc.filePath);
    if (!fs.existsSync(absPath)) {
      throw new DropServiceError(404, 'FILE_NOT_FOUND', 'File content is missing from storage.');
    }

    // Burn after reading on file download: atomically claim burn so concurrent requests fail
    if (drop.burnAfterReading) {
      const burned = await this.dropRepo.atomicBurnFileDrop(drop._id.toString());
      if (!burned) {
        throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was already burned after reading.');
      }
    }

    return { drop, fileDoc, absolutePath: absPath };
  }

  /**
   * Retrieves all verified files and paths belonging to a Drop for dynamic ZIP generation.
   */
  public async getFilesForZip(
    code: string,
    options?: { unlockToken?: string; password?: string; ownerToken?: string; viewToken?: string }
  ): Promise<{ drop: IDropDocument; files: Array<{ fileDoc: IDropFileDocument; absolutePath: string }> }> {
    const cleanCode = (code || '').trim().toUpperCase();
    const drop = await this.dropRepo.findByCode(cleanCode);
    if (!drop) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    if (drop.type === 'text') {
      throw new DropServiceError(400, 'NOT_A_FILE_DROP', 'Text drops cannot be downloaded as a ZIP.');
    }

    if (drop.status === 'deleted') {
      throw new DropServiceError(410, 'DROP_DELETED', 'This Drop was permanently deleted by its owner.');
    }
    if (drop.status === 'burned') {
      throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was burned after reading.');
    }
    if (drop.isExpired || drop.expiresAt <= new Date()) {
      throw new DropServiceError(410, 'DROP_EXPIRED', 'This Drop has expired.');
    }

    const tokenToCheck = options?.unlockToken || options?.viewToken;
    const hasValidToken = tokenToCheck ? verifyUnlockToken(tokenToCheck, drop.code, env.JWT_SECRET) : false;
    const isOwner = options?.ownerToken ? verifyDeletionToken(options.ownerToken, drop.ownerDeleteTokenHash) : false;

    if (drop.passwordHash) {
      const isAuthed = hasValidToken || isOwner || (options?.password && (await verifyPassword(options.password, drop.passwordHash)));
      if (!isAuthed) {
        throw new DropServiceError(401, 'UNAUTHORIZED', 'Password or unlock token required to download files.');
      }
    }

    // View-limit check: if view limit is reached, only authorized sessions (or owner) can download
    if (drop.viewLimit !== null && drop.viewCount >= drop.viewLimit) {
      if (!hasValidToken && !isOwner) {
        throw new DropServiceError(
          410,
          'VIEW_LIMIT_REACHED',
          'This Drop has reached its maximum view limit and is no longer accessible.'
        );
      }
    }

    const fileDocs = await this.dropFileRepo.findByDropId(drop._id);
    if (!fileDocs || fileDocs.length === 0) {
      throw new DropServiceError(404, 'NO_FILES_FOUND', 'No files found for this drop.');
    }

    const filesWithPaths: Array<{ fileDoc: IDropFileDocument; absolutePath: string }> = [];
    for (const f of fileDocs) {
      const absPath = validatePathSafety(this.storage.getStorageRoot(), f.filePath);
      if (fs.existsSync(absPath)) {
        filesWithPaths.push({ fileDoc: f, absolutePath: absPath });
      }
    }

    if (filesWithPaths.length === 0) {
      throw new DropServiceError(404, 'NO_FILES_FOUND', 'All drop files are missing from storage.');
    }

    // Burn after reading on ZIP download: atomically claim burn so concurrent requests fail
    if (drop.burnAfterReading) {
      const burned = await this.dropRepo.atomicBurnFileDrop(drop._id.toString());
      if (!burned) {
        throw new DropServiceError(410, 'DROP_BURNED', 'This Drop was already burned after reading.');
      }
    }

    return { drop, files: filesWithPaths };
  }

  /**
   * Deletes a drop using the owner's deletion token.
   * Performs constant-time token verification and physically unlinks all files.
   */
  public async deleteDropByOwner(code: string, deletionToken: string): Promise<boolean> {
    if (typeof code !== 'string' || typeof deletionToken !== 'string') {
      throw new DropServiceError(400, 'INVALID_REQUEST', 'Code and deletion token must be valid strings.');
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanToken = deletionToken.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }
    if (!cleanToken) {
      throw new DropServiceError(401, 'INVALID_DELETION_TOKEN', 'Owner deletion token is required.');
    }

    const drop = await this.dropRepo.findByCode(cleanCode);
    if (!drop) {
      throw new DropServiceError(404, 'DROP_NOT_FOUND', 'Drop not found.');
    }

    if (drop.status === 'deleted') {
      throw new DropServiceError(410, 'DROP_DELETED', 'This Drop was already deleted.');
    }

    const isValid = verifyDeletionToken(cleanToken, drop.ownerDeleteTokenHash);
    if (!isValid) {
      throw new DropServiceError(401, 'INVALID_DELETION_TOKEN', 'The deletion token provided is invalid.');
    }

    // 1. Physically delete files from disk
    const files = await this.dropFileRepo.findByDropId(drop._id);
    for (const f of files) {
      await this.storage.deleteFile(f.filePath).catch(() => {});
    }

    // 2. Delete DropFile documents
    if (files.length > 0) {
      await this.dropFileRepo.deleteByDropId(drop._id);
    }

    // 3. Mark drop as deleted & clear text content
    await this.dropRepo.updateStatus(drop._id.toString(), 'deleted');
    await this.dropRepo.purgeDropContent(drop._id.toString(), true);

    return true;
  }
}

export const dropService = new DropService();
