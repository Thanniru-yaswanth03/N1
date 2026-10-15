import mongoose, { Schema, Document, Model } from 'mongoose';
import { AuditLogSeverity } from '@n1/shared';

export interface IAuditLogDocument extends Document {
  eventType: string;
  severity: AuditLogSeverity;
  adminUser: string;
  targetId?: string;
  action: string;
  details?: Record<string, unknown>;
  ipHash?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['info', 'warn', 'security', 'critical'],
      default: 'info',
      index: true,
    },
    adminUser: {
      type: String,
      required: true,
      default: 'system',
      index: true,
    },
    targetId: {
      type: String,
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipHash: {
      type: String,
      default: '',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLogDocument> =
  (mongoose.models['AuditLog'] as Model<IAuditLogDocument>) ||
  mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);
