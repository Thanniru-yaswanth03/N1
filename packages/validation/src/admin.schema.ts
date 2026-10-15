import { z } from 'zod';

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(256),
});

export const abuseReportReasonSchema = z.enum([
  'malware',
  'phishing',
  'copyright',
  'illegal',
  'harassment',
  'spam',
  'other',
]);

export const abuseReportStatusSchema = z.enum([
  'pending',
  'reviewed',
  'resolved',
  'dismissed',
]);

export const createAbuseReportSchema = z.object({
  reason: abuseReportReasonSchema,
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(1000, 'Description cannot exceed 1000 characters'),
});

export const updateAbuseReportSchema = z.object({
  status: abuseReportStatusSchema,
  resolutionNote: z.string().trim().max(500).optional(),
});

export const blockSourceSchema = z.object({
  ipHash: z.string().trim().min(8, 'Invalid IP hash format').max(128),
  reason: z.string().trim().min(3, 'Reason is required (min 3 chars)').max(255),
  durationHours: z.number().int().min(1).max(87600).optional(),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type CreateAbuseReportInput = z.infer<typeof createAbuseReportSchema>;
export type UpdateAbuseReportInput = z.infer<typeof updateAbuseReportSchema>;
export type BlockSourceInput = z.infer<typeof blockSourceSchema>;
