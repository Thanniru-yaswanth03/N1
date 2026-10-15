import { Router, Request, Response, NextFunction } from 'express';
import { createDuelRoomSchema, joinDuelRoomSchema } from '@n1/validation';
import { duelRoomService } from '../services/duel-room.service.js';

export const duelRouter = Router();

/**
 * POST /api/duel/rooms
 * Creates a new anonymous duel challenge room.
 */
duelRouter.post(
  '/rooms',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parseResult = createDuelRoomSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid duel room configuration',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { room, hostToken } = await duelRoomService.createRoom(parseResult.data);
      const summary = duelRoomService.toRoomSummary(room);

      res.status(201).json({
        success: true,
        data: {
          code: room.code,
          hostToken,
          hostPlayer: room.host,
          room: summary,
        },
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
 * GET /api/duel/rooms/:code
 * Retrieves duel room summary and status.
 */
duelRouter.get(
  '/rooms/:code',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROOM_CODE',
            message: 'Duel room code must be 6 alphanumeric characters',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const room = await duelRoomService.getRoom(code);
      if (!room) {
        res.status(404).json({
          success: false,
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'Duel room not found or has expired',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (room.isExpired || room.status === 'EXPIRED') {
        res.status(410).json({
          success: false,
          error: {
            code: 'ROOM_EXPIRED',
            message: 'This duel room has expired',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const summary = duelRoomService.toRoomSummary(room);
      res.status(200).json({
        success: true,
        data: {
          room: summary,
          host: {
            id: room.host.id,
            name: room.host.name,
            color: room.host.color,
          },
          opponent: room.opponent
            ? {
                id: room.opponent.id,
                name: room.opponent.name,
                color: room.opponent.color,
              }
            : null,
        },
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
 * POST /api/duel/rooms/:code/join
 * Joins a duel room as opponent.
 */
duelRouter.post(
  '/rooms/:code/join',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.params.code?.toUpperCase().trim();
      if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ROOM_CODE',
            message: 'Duel room code must be 6 alphanumeric characters',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const parseResult = joinDuelRoomSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid join parameters',
            details: parseResult.error.errors.map(e => ({
              field: e.path.join('.'),
              issue: e.message,
            })),
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const { room, opponent, token } = await duelRoomService.joinRoom(
        code,
        parseResult.data.playerName
      );

      res.status(200).json({
        success: true,
        data: {
          code: room.code,
          playerToken: token,
          player: opponent,
          room: duelRoomService.toRoomSummary(room),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.message === 'Room not found') {
        res.status(404).json({
          success: false,
          error: { code: 'ROOM_NOT_FOUND', message: error.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (error.message === 'Room has expired') {
        res.status(410).json({
          success: false,
          error: { code: 'ROOM_EXPIRED', message: error.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      if (error.message.includes('already in progress') || error.message.includes('completed')) {
        res.status(409).json({
          success: false,
          error: { code: 'ROOM_BUSY', message: error.message },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      next(err);
      return;
    }
  }
);
