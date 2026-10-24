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

export const boardElementTypeSchema = z.enum([
  'stroke',
  'shape',
  'text',
  'sticky',
  'line',
  'arrow',
  'rectangle',
  'circle',
]);

export const boardShapeTypeSchema = z.enum([
  'rectangle',
  'rounded-rectangle',
  'circle',
  'ellipse',
  'diamond',
  'cylinder',
  'star',
  'triangle',
]);

export const boardLineTypeSchema = z.enum([
  'straight',
  'arrow',
  'double-arrow',
  'elbow',
]);

export const boardElementSchema = z.object({
  id: z.string().min(1).max(100),
  type: boardElementTypeSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().finite().optional(),
  height: z.number().finite().optional(),
  rotation: z.number().finite().optional(),
  color: z.string().max(50),
  fillColor: z.string().max(50).optional(),
  fill: z.string().max(50).optional(),
  strokeWidth: z.number().finite().min(0).max(100).optional(),
  strokeType: z.enum(['solid', 'dashed']).optional(),
  content: z.string().max(5000).optional(),
  text: z.string().max(5000).optional(),
  fontSize: z.number().finite().optional(),
  fontFamily: z.enum(['sans', 'mono', 'handwritten']).optional(),
  points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).optional(),
  shapeType: boardShapeTypeSchema.optional(),
  lineType: boardLineTypeSchema.optional(),
  zIndex: z.number().finite().optional(),
  authorId: z.string().max(100).optional(),
  authorName: z.string().max(100).optional(),
  createdBy: z.string().max(100).optional(),
  updatedAt: z.union([z.number(), z.string()]).optional(),
});

export const boardSocketClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('JOIN'),
    roomCode: z.string().trim().regex(/^[A-Z0-9]{6}$/i, 'Room code must be 6 alphanumeric characters'),
    userName: z.string().trim().min(1).max(50).optional(),
    userColor: z.string().trim().max(30).optional(),
    creatorToken: z.string().trim().max(100).optional(),
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
  z.object({
    type: z.literal('LIVE_DRAW'),
    strokeId: z.string().min(1).max(100),
    points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).max(5000),
    color: z.string().max(50),
    strokeWidth: z.number().finite().min(1).max(100),
    isHighlighter: z.boolean().optional(),
    isFinished: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('VIEWPORT_SYNC'),
    panX: z.number().finite(),
    panY: z.number().finite(),
    zoom: z.number().finite().min(0.1).max(10),
  }),
  z.object({
    type: z.literal('ACTIVITY_BROADCAST'),
    action: z.string().min(1).max(100),
    details: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal('TOGGLE_PERMISSIONS'),
    allowParticipantEditing: z.boolean(),
  }),
]);

export type CreateBoardRoomInput = z.infer<typeof createBoardRoomSchema>;
export type UpdateBoardElementsInput = z.infer<typeof updateBoardElementsSchema>;
export type BoardSocketClientMessageInput = z.infer<typeof boardSocketClientMessageSchema>;
