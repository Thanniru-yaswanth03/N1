import { describe, it, expect } from 'vitest';
import {
  DropTypeSchema,
  ExpiryPresetSchema,
  ShortCodeParamSchema,
  DropUnlockSchema,
  DropCreateInputSchema,
  createAbuseReportSchema,
  updateAbuseReportSchema,
  blockSourceSchema,
  adminLoginSchema,
  boardTemplateSchema,
  createBoardRoomSchema,
  updateBoardElementsSchema,
  duelCategorySchema,
  duelDifficultySchema,
  createDuelRoomSchema,
  joinDuelRoomSchema,
  submitDuelAnswerSchema,
} from '../src/index.js';

describe('N1 Phase 15: Validation Schemas Unit Tests', () => {
  describe('1. Drop Creation & Management Schemas', () => {
    it('validates a correct text drop payload with 15m expiration', () => {
      const payload = {
        drop_type: 'text',
        text_content: 'Hello, this is confidential text content.',
        expiry: '15m',
        burn_after_reading: false,
      };

      const result = DropCreateInputSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('accepts all permitted expiration presets (15m, 1h, 6h, 24h, 7d)', () => {
      const validExpirations = ['15m', '1h', '6h', '24h', '7d'];
      for (const exp of validExpirations) {
        const result = ExpiryPresetSchema.safeParse(exp);
        expect(result.success).toBe(true);
      }
    });

    it('rejects unsupported expiration strings', () => {
      const invalidExpirations = ['2d', '30m', 'forever', '0', ''];
      for (const exp of invalidExpirations) {
        const result = ExpiryPresetSchema.safeParse(exp);
        expect(result.success).toBe(false);
      }
    });

    it('validates 6-character alphanumeric short code format', () => {
      expect(ShortCodeParamSchema.safeParse('8A3F9X').success).toBe(true);
      expect(ShortCodeParamSchema.safeParse('abc123').success).toBe(true);
      expect(ShortCodeParamSchema.safeParse('toolongcode').success).toBe(false);
      expect(ShortCodeParamSchema.safeParse('sh!rt').success).toBe(false);
      expect(ShortCodeParamSchema.safeParse('').success).toBe(false);
    });

    it('enforces character limit on text drops (<= 10,000 characters)', () => {
      const boundaryText = 'A'.repeat(10000);
      const validResult = DropCreateInputSchema.safeParse({
        drop_type: 'text',
        text_content: boundaryText,
        expiry: '1h',
      });
      expect(validResult.success).toBe(true);

      const oversizedText = 'A'.repeat(10001);
      const invalidResult = DropCreateInputSchema.safeParse({
        drop_type: 'text',
        text_content: oversizedText,
        expiry: '1h',
      });
      expect(invalidResult.success).toBe(false);
    });

    it('rejects empty or whitespace-only text content for text drops', () => {
      const emptyResult = DropCreateInputSchema.safeParse({
        drop_type: 'text',
        text_content: '   ',
        expiry: '1h',
      });
      expect(emptyResult.success).toBe(false);
    });

    it('validates file drop schema type', () => {
      const payload = {
        drop_type: 'files',
        expiry: '24h',
        max_views: 5,
        burn_after_reading: true,
      };

      const result = DropCreateInputSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates DropTypeSchema enum values', () => {
      expect(DropTypeSchema.safeParse('files').success).toBe(true);
      expect(DropTypeSchema.safeParse('text').success).toBe(true);
      expect(DropTypeSchema.safeParse('other').success).toBe(false);
    });

    it('rejects invalid view limit (0, negative, non-integer)', () => {
      const invalidLimits = [0, -1, 150];
      for (const limit of invalidLimits) {
        const result = DropCreateInputSchema.safeParse({
          drop_type: 'text',
          text_content: 'Testing invalid view limit',
          expiry: '1h',
          max_views: limit,
        });
        expect(result.success).toBe(false);
      }
    });

    it('validates optional password length constraints (min 1, max 128)', () => {
      const validPass = DropCreateInputSchema.safeParse({
        drop_type: 'text',
        text_content: 'Protected text',
        expiry: '1h',
        password: 'CorrectPassphrase123!',
      });
      expect(validPass.success).toBe(true);

      const longPass = DropCreateInputSchema.safeParse({
        drop_type: 'text',
        text_content: 'Protected text',
        expiry: '1h',
        password: 'A'.repeat(129),
      });
      expect(longPass.success).toBe(false);
    });

    it('validates DropUnlockSchema', () => {
      expect(DropUnlockSchema.safeParse({ password: 'valid-password' }).success).toBe(true);
      expect(DropUnlockSchema.safeParse({ password: '' }).success).toBe(false);
    });
  });

  describe('2. Abuse Reporting & Moderation Schemas', () => {
    it('accepts valid abuse report reasons (malware, phishing, copyright, etc.)', () => {
      const validReasons = [
        'malware',
        'phishing',
        'copyright',
        'illegal',
        'harassment',
        'spam',
        'other',
      ];

      for (const reason of validReasons) {
        const result = createAbuseReportSchema.safeParse({
          reason,
          description: `Detailed report for ${reason}`,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects unknown abuse report reasons', () => {
      const result = createAbuseReportSchema.safeParse({
        reason: 'unauthorized_reason',
        description: 'Testing unknown category',
      });
      expect(result.success).toBe(false);
    });

    it('validates updateAbuseReportSchema status transitions', () => {
      const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
      for (const status of validStatuses) {
        const result = updateAbuseReportSchema.safeParse({
          status,
          resolutionNotes: 'Handled by moderator',
        });
        expect(result.success).toBe(true);
      }

      expect(updateAbuseReportSchema.safeParse({ status: 'invalid_status' }).success).toBe(false);
    });

    it('validates blockSourceSchema parameters', () => {
      const validBlock = blockSourceSchema.safeParse({
        ipHash: 'a'.repeat(64),
        reason: 'Repeated DDoS attempts',
        durationHours: 24,
      });
      expect(validBlock.success).toBe(true);

      const invalidBlock = blockSourceSchema.safeParse({
        ipHash: '',
        reason: '',
      });
      expect(invalidBlock.success).toBe(false);
    });

    it('validates adminLoginSchema', () => {
      expect(adminLoginSchema.safeParse({ username: 'admin', password: 'secretpassword' }).success).toBe(true);
      expect(adminLoginSchema.safeParse({ username: '', password: '' }).success).toBe(false);
    });
  });

  describe('3. Study Board & Quably Duel Schemas', () => {
    it('validates boardTemplateSchema enum', () => {
      expect(boardTemplateSchema.safeParse('mindmap').success).toBe(true);
      expect(boardTemplateSchema.safeParse('flowchart').success).toBe(true);
      expect(boardTemplateSchema.safeParse('unknown').success).toBe(false);
    });

    it('validates createBoardRoomSchema', () => {
      const result = createBoardRoomSchema.safeParse({
        title: 'Algorithms Revision',
        template: 'mindmap',
        expiresInHours: 48,
      });
      expect(result.success).toBe(true);
    });

    it('validates updateBoardElementsSchema structure', () => {
      const payload = {
        elements: [{ id: 'el-1', type: 'rectangle', x: 100, y: 100 }],
      };
      const result = updateBoardElementsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('validates duelCategorySchema and duelDifficultySchema', () => {
      expect(duelCategorySchema.safeParse('javascript').success).toBe(true);
      expect(duelCategorySchema.safeParse('python').success).toBe(true);
      expect(duelCategorySchema.safeParse('invalid-cat').success).toBe(false);

      expect(duelDifficultySchema.safeParse('easy').success).toBe(true);
      expect(duelDifficultySchema.safeParse('mixed').success).toBe(true);
      expect(duelDifficultySchema.safeParse('expert').success).toBe(false);
    });

    it('validates createDuelRoomSchema', () => {
      const result = createDuelRoomSchema.safeParse({
        category: 'javascript',
        difficulty: 'medium',
        questionCount: 10,
        hostName: 'SpeedCoder',
      });
      expect(result.success).toBe(true);
    });

    it('validates joinDuelRoomSchema', () => {
      expect(joinDuelRoomSchema.safeParse({ playerName: 'ChallengerX' }).success).toBe(true);
      expect(joinDuelRoomSchema.safeParse({ playerName: '' }).success).toBe(false);
    });

    it('validates submitDuelAnswerSchema', () => {
      const result = submitDuelAnswerSchema.safeParse({
        questionIndex: 2,
        selectedOption: 3,
      });
      expect(result.success).toBe(true);

      const invalidOption = submitDuelAnswerSchema.safeParse({
        questionIndex: 2,
        selectedOption: 5, // max 3
      });
      expect(invalidOption.success).toBe(false);
    });
  });
});
