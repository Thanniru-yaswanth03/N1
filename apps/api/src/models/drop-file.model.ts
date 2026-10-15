import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDropFileDocument extends Document {
  dropId: Types.ObjectId;
  originalName: string;
  storedName: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  filePath: string;
  checksum: string;
  createdAt: Date;
}

const DropFileSchema = new Schema<IDropFileDocument>(
  {
    dropId: {
      type: Schema.Types.ObjectId,
      ref: 'Drop',
      required: [true, 'Associated Drop ID is required'],
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    storedName: {
      type: String,
      required: [true, 'Stored filename is required'],
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [1, 'File size must be at least 1 byte'],
      max: [52428800, 'Individual file size cannot exceed 50 MB (52,428,800 bytes)'],
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
    },
    extension: {
      type: String,
      required: [true, 'File extension is required'],
      trim: true,
      lowercase: true,
    },
    filePath: {
      type: String,
      required: [true, 'File storage path is required'],
      trim: true,
    },
    checksum: {
      type: String,
      required: [true, 'Checksum SHA-256 is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

// Indexes
// 1. Foreign key lookup index on dropId
DropFileSchema.index({ dropId: 1 });

// 2. Unique index on storedName
DropFileSchema.index({ storedName: 1 }, { unique: true });

export const DropFile: Model<IDropFileDocument> =
  (mongoose.models['DropFile'] as Model<IDropFileDocument>) ||
  mongoose.model<IDropFileDocument>('DropFile', DropFileSchema);
