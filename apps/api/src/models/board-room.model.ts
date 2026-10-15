import mongoose, { Schema, Document, Model } from 'mongoose';
import { BoardTemplate, BoardElement } from '@n1/shared';

export interface IBoardRoomDocument extends Document {
  code: string;
  title: string;
  template: BoardTemplate;
  elements: BoardElement[];
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  lastActivityAt: Date;
}

const BoardRoomSchema = new Schema<IBoardRoomDocument>(
  {
    code: {
      type: String,
      required: [true, 'Room code is required'],
      trim: true,
      uppercase: true,
      minlength: [6, 'Room code must be 6 characters'],
      maxlength: [6, 'Room code must be 6 characters'],
      match: [/^[A-Z0-9]{6}$/, 'Room code must contain only uppercase alphanumeric characters'],
    },
    title: {
      type: String,
      required: [true, 'Room title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: 'Study Session',
    },
    template: {
      type: String,
      required: true,
      enum: [
        'blank',
        'mindmap',
        'flowchart',
        'dbms',
        'math',
        'project',
        'study',
        'brainstorm',
        'exam',
      ],
      default: 'blank',
    },
    elements: {
      type: Schema.Types.Mixed,
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'expiresAt is required'],
    },
    isExpired: {
      type: Boolean,
      default: false,
      required: true,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

// Indexes
BoardRoomSchema.index({ code: 1 }, { unique: true });
BoardRoomSchema.index({ expiresAt: 1 });
BoardRoomSchema.index({ isExpired: 1, expiresAt: 1 });

export const BoardRoomModel: Model<IBoardRoomDocument> =
  (mongoose.models.BoardRoom as Model<IBoardRoomDocument>) ||
  mongoose.model<IBoardRoomDocument>('BoardRoom', BoardRoomSchema);
