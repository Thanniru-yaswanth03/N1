import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBlockedSourceDocument extends Document {
  ipHash: string;
  reason: string;
  blockedBy: string;
  blockedAt: Date;
  expiresAt: Date | null;
  isActive: boolean;
}

const BlockedSourceSchema = new Schema<IBlockedSourceDocument>(
  {
    ipHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    blockedBy: {
      type: String,
      required: true,
      default: 'admin',
    },
    blockedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

BlockedSourceSchema.index({ isActive: 1, expiresAt: 1 });

export const BlockedSource: Model<IBlockedSourceDocument> =
  (mongoose.models['BlockedSource'] as Model<IBlockedSourceDocument>) ||
  mongoose.model<IBlockedSourceDocument>('BlockedSource', BlockedSourceSchema);
