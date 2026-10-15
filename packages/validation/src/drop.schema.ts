import { z } from 'zod';
import { EXPIRY_PRESETS, MAX_TEXT_CHARACTERS, SHORT_CODE_LENGTH } from '@n1/shared';

export const DropTypeSchema = z.enum(['files', 'text']);

export const ExpiryPresetSchema = z.enum(EXPIRY_PRESETS);

export const ShortCodeParamSchema = z
  .string()
  .trim()
  .length(SHORT_CODE_LENGTH, `Short code must be exactly ${SHORT_CODE_LENGTH} characters`)
  .regex(/^[A-Za-z0-9]+$/, 'Short code must be alphanumeric');

export const DropUnlockSchema = z.object({
  password: z.string().min(1, 'Password is required to unlock this drop'),
});

export const DropCreateInputSchema = z
  .object({
    drop_type: DropTypeSchema,
    expiry: ExpiryPresetSchema,
    text_content: z
      .string()
      .max(
        MAX_TEXT_CHARACTERS,
        `Text cannot exceed ${MAX_TEXT_CHARACTERS.toLocaleString()} characters`
      )
      .optional(),
    password: z.string().min(1).max(128).optional(),
    burn_after_reading: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .transform(val => val === true || val === 'true')
      .optional()
      .default(false),
    max_views: z
      .union([z.number().int().positive().max(100), z.string().regex(/^\d+$/).transform(Number)])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.drop_type === 'text') {
      if (!data.text_content || data.text_content.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Text content is required for text drops',
          path: ['text_content'],
        });
      }
    }
  });

export type DropCreateInput = z.infer<typeof DropCreateInputSchema>;
export type DropUnlockInput = z.infer<typeof DropUnlockSchema>;
