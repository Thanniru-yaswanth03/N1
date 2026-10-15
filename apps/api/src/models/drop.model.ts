import mongoose, { Schema, Document, Model } from 'mongoose';
import { DropModelType, DropModelStatus } from '@n1/shared';

export interface IDropDocument extends Document {
  code: string;
  type: DropModelType;
  textContent: string | null;
  totalSizeBytes: number;
  fileCount: number;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  passwordHash: string | null;
  viewLimit: number | null;
  viewCount: number;
  burnAfterReading: boolean;
  ownerDeleteTokenHash: string;
  ipHash: string;
  status: DropModelStatus;
}

const DropSchema = new Schema<IDropDocument>(
  {
    code: {
      type: String,
      required: [true, 'Drop code is required'],
      trim: true,
      uppercase: true,
      minlength: [6, 'Code must be 6 characters'],
      maxlength: [6, 'Code must be 6 characters'],
      match: [/^[A-Z0-9]{6}$/, 'Code must contain only uppercase alphanumeric characters'],
    },
    type: {
      type: String,
      required: [true, 'Drop type is required'],
      enum: {
        values: ['text', 'file'],
        message: 'Drop type must be either text or file',
      },
    },
    textContent: {
      type: String,
      default: null,
      maxlength: [10000, 'Text content cannot exceed 10,000 characters'],
    },
    totalSizeBytes: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Total size cannot be negative'],
      max: [209715200, 'Total size cannot exceed 200 MB (209,715,200 bytes)'],
    },
    fileCount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'File count cannot be negative'],
      max: [10, 'A drop cannot exceed 10 files'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
    },
    isExpired: {
      type: Boolean,
      default: false,
      required: true,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    viewLimit: {
      type: Number,
      default: null,
      min: [1, 'View limit must be at least 1'],
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, 'View count cannot be negative'],
      required: true,
    },
    burnAfterReading: {
      type: Boolean,
      default: false,
      required: true,
    },
    ownerDeleteTokenHash: {
      type: String,
      required: [true, 'Owner deletion token hash is required'],
      trim: true,
    },
    ipHash: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: {
        values: ['active', 'expired', 'burned', 'deleted'],
        message: 'Invalid status value',
      },
      default: 'active',
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes
// 1. Unique index on short code for fast O(1) lookups
DropSchema.index({ code: 1 }, { unique: true });

// 2. Expiration query index for finding pending expired drops in cleanup worker
DropSchema.index({ expiresAt: 1, isExpired: 1 });

// 3. Status and expiration query index
DropSchema.index({ status: 1, expiresAt: 1 });

// 4. Creation timestamp index for timeline queries
DropSchema.index({ createdAt: -1 });

export const Drop: Model<IDropDocument> =
  (mongoose.models['Drop'] as Model<IDropDocument>) ||
  mongoose.model<IDropDocument>('Drop', DropSchema);
