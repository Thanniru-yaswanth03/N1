import mongoose, { Schema, Document, Model } from 'mongoose';
import { AbuseReportReason, AbuseReportStatus } from '@n1/shared';

export interface IAbuseReportDocument extends Document {
  dropCode: string;
  reason: AbuseReportReason;
  description: string;
  reporterIpHash: string;
  status: AbuseReportStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

const AbuseReportSchema = new Schema<IAbuseReportDocument>(
  {
    dropCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ['malware', 'phishing', 'copyright', 'illegal', 'harassment', 'spam', 'other'],
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    reporterIpHash: {
      type: String,
      required: true,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
    resolutionNote: {
      type: String,
      default: null,
      maxlength: 500,
    },
    resolvedBy: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AbuseReportSchema.index({ status: 1, createdAt: -1 });

export const AbuseReport: Model<IAbuseReportDocument> =
  (mongoose.models['AbuseReport'] as Model<IAbuseReportDocument>) ||
  mongoose.model<IAbuseReportDocument>('AbuseReport', AbuseReportSchema);
