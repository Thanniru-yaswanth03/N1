import { Router, Request, Response, NextFunction } from 'express';
import { createBoardRoomSchema, updateBoardElementsSchema } from '@n1/validation';
import { boardRoomService } from '../services/board-room.service.js';
import { boardCreationRateLimiter } from '../security/rate-limiter.js';

export const boardRouter = Router();

/**
 * POST /api/board/rooms
 * Creates a new anonymous study board room.
 */
boardRouter.post(
  '/rooms',
  boardCreationRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = createBoardRoomSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid room configuration',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const room = await boardRoomService.createRoom(parseResult.data);

      res.status(201).json({
        success: true,
        data: room,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * GET /api/board/rooms/:code
 * Retrieves room metadata and canvas elements.
 */
boardRouter.get(
  '/rooms/:code',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Room code must be a 6-character alphanumeric string',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const room = await boardRoomService.getRoom(code);
      if (!room) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'Study room not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Authoritative kicked check for REST retrieval
      const clientId = (req.headers['x-client-id'] as string) || (req.query.clientId as string);
      if (clientId && room.kickedUserIds && room.kickedUserIds.includes(clientId)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'USER_KICKED',
            message: 'You have been removed from this study room by an admin.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (room.isExpired) {
        res.status(410).json({
          success: false,
          error: {
            code: 'ROOM_EXPIRED',
            message: 'This Study Board room has expired and its content was permanently deleted.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: room,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * PUT /api/board/rooms/:code/elements
 * Updates/syncs canvas elements (HTTP fallback for WebSockets).
 */
boardRouter.put(
  '/rooms/:code/elements',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Invalid room code format',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const clientId = (req.headers['x-client-id'] as string) || (req.query.clientId as string);
      if (clientId && (await boardRoomService.isUserKicked(code, [clientId]))) {
        res.status(403).json({
          success: false,
          error: {
            code: 'USER_KICKED',
            message: 'You have been removed from this room by an admin.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const parseResult = updateBoardElementsSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid canvas elements payload',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const success = await boardRoomService.updateElements(code, parseResult.data.elements);
      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ROOM_UNAVAILABLE',
            message: 'Room not found or expired',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { updated: true },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);

/**
 * POST /api/board/rooms/:code/clear
 * Clears canvas elements from an active room.
 */
boardRouter.post(
  '/rooms/:code/clear',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CODE',
            message: 'Invalid room code format',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const clientId = (req.headers['x-client-id'] as string) || (req.query.clientId as string);
      if (clientId && (await boardRoomService.isUserKicked(code, [clientId]))) {
        res.status(403).json({
          success: false,
          error: {
            code: 'USER_KICKED',
            message: 'You have been removed from this room by an admin.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const success = await boardRoomService.clearElements(code);
      if (!success) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ROOM_UNAVAILABLE',
            message: 'Room not found or expired',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: { cleared: true },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err) {
      next(err);
      return;
    }
  }
);
