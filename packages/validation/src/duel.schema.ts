import { z } from 'zod';

export const duelCategorySchema = z.enum([
  'python',
  'java',
  'javascript',
  'sql',
  'debugging',
  'aptitude',
  'logical-reasoning',
  'technical-trivia',
  'cs-fundamentals',
  'brain-puzzles',
]);

export const duelDifficultySchema = z.enum(['easy', 'medium', 'hard', 'mixed']);

export const createDuelRoomSchema = z.object({
  category: duelCategorySchema.optional().default('javascript'),
  difficulty: duelDifficultySchema.optional().default('medium'),
  questionCount: z
    .number()
    .int('Question count must be an integer')
    .min(5, 'Minimum 5 questions')
    .max(15, 'Maximum 15 questions')
    .optional()
    .default(10),
  hostName: z
    .string()
    .trim()
    .min(1, 'Host nickname must not be empty')
    .max(25, 'Host nickname must not exceed 25 characters')
    .optional()
    .default('Player 1'),
});

export const joinDuelRoomSchema = z.object({
  playerName: z
    .string()
    .trim()
    .min(1, 'Player nickname must not be empty')
    .max(25, 'Player nickname must not exceed 25 characters')
    .optional()
    .default('Player 2'),
});

export const submitDuelAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  selectedOption: z.number().int().min(0).max(3),
});

export const joinDuelMessageSchema = z.object({
  type: z.literal('JOIN_DUEL'),
  roomCode: z.string().min(1).max(20),
  playerName: z.string().max(25).optional(),
});

export const joinQueueMessageSchema = z.object({
  type: z.literal('JOIN_QUEUE'),
  category: duelCategorySchema.optional(),
  difficulty: duelDifficultySchema.optional(),
  playerName: z.string().max(25).optional(),
});

export const leaveQueueMessageSchema = z.object({
  type: z.literal('LEAVE_QUEUE'),
});

export const submitAnswerMessageSchema = z.object({
  type: z.literal('SUBMIT_ANSWER'),
  questionIndex: z.number().int().min(0),
  selectedOption: z.number().int().min(0).max(3),
});

export const requestRematchMessageSchema = z.object({
  type: z.literal('REQUEST_REMATCH'),
});

export const acceptRematchMessageSchema = z.object({
  type: z.literal('ACCEPT_REMATCH'),
});

export const duelSocketClientMessageSchema = z.discriminatedUnion('type', [
  joinDuelMessageSchema,
  joinQueueMessageSchema,
  leaveQueueMessageSchema,
  submitAnswerMessageSchema,
  requestRematchMessageSchema,
  acceptRematchMessageSchema,
]);

export type CreateDuelRoomInput = z.infer<typeof createDuelRoomSchema>;
export type JoinDuelRoomInput = z.infer<typeof joinDuelRoomSchema>;
export type SubmitDuelAnswerInput = z.infer<typeof submitDuelAnswerSchema>;
export type DuelSocketClientMessageInput = z.infer<typeof duelSocketClientMessageSchema>;

