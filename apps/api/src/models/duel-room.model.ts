import mongoose, { Schema, Document, Model } from 'mongoose';
import { IDuelRoom } from '@n1/shared';

export interface IDuelRoomDocument extends Document, Omit<IDuelRoom, '_id'> {}

const DuelPlayerAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    selectedOption: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
    timeSpentSeconds: { type: Number, required: true },
    scoreEarned: { type: Number, required: true },
  },
  { _id: false }
);

const DuelPlayerSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    isHost: { type: Boolean, required: true, default: false },
    score: { type: Number, required: true, default: 0 },
    currentQuestionIndex: { type: Number, required: true, default: 0 },
    answers: { type: [DuelPlayerAnswerSchema], default: [] },
    isFinished: { type: Boolean, required: true, default: false },
    connected: { type: Boolean, required: true, default: true },
  },
  { _id: false }
);

const DuelQuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    category: { type: String, required: true },
    difficulty: { type: String, required: true },
    question: { type: String, required: true },
    codeSnippet: { type: String, required: false },
    options: {
      type: [String],
      validate: {
        validator: (v: string[]) => v.length === 4,
        message: 'Questions must have exactly 4 options',
      },
      required: true,
    },
    correctOption: { type: Number, required: true, min: 0, max: 3 },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const DuelRoomSchema = new Schema<IDuelRoomDocument>(
  {
    code: {
      type: String,
      required: [true, 'Duel room code is required'],
      trim: true,
      uppercase: true,
      minlength: [6, 'Code must be 6 characters'],
      maxlength: [6, 'Code must be 6 characters'],
      match: [/^[A-Z0-9]{6}$/, 'Code must contain only uppercase alphanumeric characters'],
    },
    category: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    difficulty: {
      type: String,
      required: true,
      enum: ['easy', 'medium', 'hard', 'mixed'],
      default: 'medium',
    },
    questionCount: {
      type: Number,
      required: true,
      min: 3,
      max: 20,
      default: 10,
    },
    status: {
      type: String,
      required: true,
      enum: ['WAITING_FOR_OPPONENT', 'COUNTDOWN', 'IN_PROGRESS', 'FINISHED', 'EXPIRED'],
      default: 'WAITING_FOR_OPPONENT',
    },
    host: {
      type: DuelPlayerSchema,
      required: true,
    },
    opponent: {
      type: DuelPlayerSchema,
      default: null,
    },
    questions: {
      type: [DuelQuestionSchema],
      required: true,
    },
    matchDurationSeconds: {
      type: Number,
      required: true,
      default: 60,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endsAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes
DuelRoomSchema.index({ code: 1 }, { unique: true });
DuelRoomSchema.index({ expiresAt: 1, isExpired: 1 });
DuelRoomSchema.index({ status: 1, expiresAt: 1 });

export const DuelRoom: Model<IDuelRoomDocument> =
  (mongoose.models['DuelRoom'] as Model<IDuelRoomDocument>) ||
  mongoose.model<IDuelRoomDocument>('DuelRoom', DuelRoomSchema);
