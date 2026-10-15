import { z } from 'zod';

export const boardTemplateSchema = z.enum([
  'blank',
  'mindmap',
  'flowchart',
  'dbms',
  'math',
  'project',
  'study',
  'brainstorm',
  'exam',
]);

export const createBoardRoomSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title must not be empty')
    .max(100, 'Title must not exceed 100 characters')
    .optional()
    .default('Study Session'),
  template: boardTemplateSchema.optional().default('blank'),
  expiresInHours: z
    .number()
    .int('Expiration hours must be an integer')
    .min(1, 'Minimum expiration is 1 hour')
    .max(168, 'Maximum expiration is 168 hours (7 days)')
    .optional()
    .default(24),
});

export const updateBoardElementsSchema = z.object({
  elements: z.array(z.any()),
});

export const boardElementSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['stroke', 'rectangle', 'circle', 'text', 'line', 'arrow']),
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
  color: z.string().max(50),
  strokeWidth: z.number().finite().min(1).max(100).optional(),
  fill: z.string().max(50).optional(),
  text: z.string().max(2000).optional(),
  points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).optional(),
  createdBy: z.string().max(100).optional(),
  updatedAt: z.string().optional(),
});

export const boardSocketClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('JOIN'),
    roomCode: z.string().trim().regex(/^[A-Z0-9]{6}$/i, 'Room code must be 6 alphanumeric characters'),
    userName: z.string().trim().min(1).max(50).optional(),
    userColor: z.string().trim().max(30).optional(),
  }),
  z.object({
    type: z.literal('CURSOR_MOVE'),
    x: z.number().finite(),
    y: z.number().finite(),
  }),
  z.object({
    type: z.literal('ELEMENTS_UPDATE'),
    elements: z.array(boardElementSchema).max(5000),
  }),
  z.object({
    type: z.literal('ELEMENT_CHANGE'),
    element: boardElementSchema,
    action: z.enum(['add', 'update', 'delete']),
  }),
  z.object({
    type: z.literal('CLEAR_BOARD'),
  }),
]);

export type CreateBoardRoomInput = z.infer<typeof createBoardRoomSchema>;
export type UpdateBoardElementsInput = z.infer<typeof updateBoardElementsSchema>;
export type BoardSocketClientMessageInput = z.infer<typeof boardSocketClientMessageSchema>;
