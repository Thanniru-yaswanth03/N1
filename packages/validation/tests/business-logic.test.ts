import { describe, it, expect } from 'vitest';
import {
  calculateDuelReward,
  calculateReferralReward,
  checkDropEligibility,
  checkClaimEligibility,
  validateReferralCode,
} from '@n1/shared';

describe('N1 Unit Tests: Business Logic, Reward Calculations, and Eligibility Logic', () => {
  describe('1. Duel Reward Calculations', () => {
    it('returns zero points when answer is incorrect regardless of time or streak', () => {
      const reward = calculateDuelReward({
        basePoints: 100,
        timeElapsedMs: 1000,
        timeLimitMs: 10000,
        streakCount: 5,
        isCorrect: false,
      });

      expect(reward.isCorrect).toBe(false);
      expect(reward.totalReward).toBe(0);
      expect(reward.basePoints).toBe(0);
      expect(reward.timeBonus).toBe(0);
      expect(reward.streakMultiplier).toBe(1.0);
    });

    it('calculates full base points and high time bonus for lightning fast correct answers', () => {
      const reward = calculateDuelReward({
        basePoints: 100,
        timeElapsedMs: 500,
        timeLimitMs: 10000,
        streakCount: 1,
        isCorrect: true,
      });

      expect(reward.isCorrect).toBe(true);
      expect(reward.basePoints).toBe(100);
      // remainingFraction is 9500 / 10000 = 0.95, timeBonus is round(0.95 * 50) = 48
      expect(reward.timeBonus).toBeGreaterThanOrEqual(45);
      expect(reward.streakMultiplier).toBe(1.0);
      expect(reward.totalReward).toBe(100 + reward.timeBonus);
    });

    it('applies 1.25x streak multiplier for 2 consecutive correct answers', () => {
      const reward = calculateDuelReward({
        basePoints: 100,
        timeElapsedMs: 5000,
        timeLimitMs: 10000,
        streakCount: 2,
        isCorrect: true,
      });

      expect(reward.streakMultiplier).toBe(1.25);
      const expectedTotal = Math.round((100 + reward.timeBonus) * 1.25);
      expect(reward.totalReward).toBe(expectedTotal);
    });

    it('applies 1.5x streak multiplier for 3 or 4 consecutive correct answers', () => {
      const reward3 = calculateDuelReward({
        basePoints: 100,
        timeElapsedMs: 5000,
        timeLimitMs: 10000,
        streakCount: 3,
        isCorrect: true,
      });
      const reward4 = calculateDuelReward({
        basePoints: 100,
        timeElapsedMs: 5000,
        timeLimitMs: 10000,
        streakCount: 4,
        isCorrect: true,
      });

      expect(reward3.streakMultiplier).toBe(1.5);
      expect(reward4.streakMultiplier).toBe(1.5);
    });

    it('applies maximum 2.0x streak multiplier for 5+ streaks', () => {
      const reward = calculateDuelReward({
        basePoints: 100,
        timeElapsedMs: 0,
        timeLimitMs: 10000,
        streakCount: 7,
        isCorrect: true,
      });

      expect(reward.streakMultiplier).toBe(2.0);
      expect(reward.timeBonus).toBe(50);
      expect(reward.totalReward).toBe((100 + 50) * 2); // 300 points
    });
  });

  describe('2. Referral Rewards & Tier Calculations', () => {
    it('returns BRONZE tier for low referral counts (< 3)', () => {
      const tier0 = calculateReferralReward(0);
      expect(tier0.tier).toBe('BRONZE');
      expect(tier0.bonusPoints).toBe(0);
      expect(tier0.nextTierRemaining).toBe(3);

      const tier2 = calculateReferralReward(2);
      expect(tier2.tier).toBe('BRONZE');
      expect(tier2.bonusPoints).toBe(100);
      expect(tier2.nextTierRemaining).toBe(1);
    });

    it('returns SILVER tier for 3 - 9 referrals', () => {
      const tier3 = calculateReferralReward(3);
      expect(tier3.tier).toBe('SILVER');
      expect(tier3.bonusPoints).toBe(300);
      expect(tier3.badge).toBe('Community Contributor');
      expect(tier3.nextTierRemaining).toBe(7);
    });

    it('returns GOLD tier for 10 - 24 referrals', () => {
      const tier10 = calculateReferralReward(10);
      expect(tier10.tier).toBe('GOLD');
      expect(tier10.bonusPoints).toBe(1000);
      expect(tier10.badge).toBe('Power Sharer');
      expect(tier10.nextTierRemaining).toBe(15);
    });

    it('returns PLATINUM tier for 25+ referrals with 0 remaining to next tier', () => {
      const tier25 = calculateReferralReward(30);
      expect(tier25.tier).toBe('PLATINUM');
      expect(tier25.bonusPoints).toBe(2500);
      expect(tier25.badge).toBe('Drop Ambassador');
      expect(tier25.nextTierRemaining).toBe(0);
    });
  });

  describe('3. Drop Access & View Eligibility Logic', () => {
    it('marks active unexpired drop within view limits as eligible', () => {
      const result = checkDropEligibility({
        status: 'active',
        expiresAt: new Date(Date.now() + 3600000),
        maxViews: 5,
        viewCount: 2,
      });

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('rejects eligibility when drop status is deleted or burned', () => {
      const deletedRes = checkDropEligibility({
        status: 'deleted',
        expiresAt: new Date(Date.now() + 3600000),
      });
      expect(deletedRes.eligible).toBe(false);
      expect(deletedRes.reason).toBe('DELETED');

      const burnedRes = checkDropEligibility({
        status: 'burned',
        expiresAt: new Date(Date.now() + 3600000),
      });
      expect(burnedRes.eligible).toBe(false);
      expect(burnedRes.reason).toBe('BURNED');
    });

    it('rejects eligibility when drop expiration date is in the past', () => {
      const expiredRes = checkDropEligibility({
        status: 'active',
        expiresAt: new Date(Date.now() - 5000),
      });
      expect(expiredRes.eligible).toBe(false);
      expect(expiredRes.reason).toBe('EXPIRED');
    });

    it('rejects eligibility when view limit has been exhausted', () => {
      const limitReachedRes = checkDropEligibility({
        status: 'active',
        expiresAt: new Date(Date.now() + 3600000),
        maxViews: 2,
        viewCount: 2,
      });
      expect(limitReachedRes.eligible).toBe(false);
      expect(limitReachedRes.reason).toBe('VIEW_LIMIT_REACHED');
    });
  });

  describe('4. Single-Use Burn Claim Eligibility Logic', () => {
    it('permits claiming an active unexpired burn-after-reading drop', () => {
      const res = checkClaimEligibility({
        dropStatus: 'active',
        burnAfterReading: true,
        alreadyClaimed: false,
        isExpired: false,
      });
      expect(res.canClaim).toBe(true);
    });

    it('rejects claiming if the drop was already claimed or burned', () => {
      const res = checkClaimEligibility({
        dropStatus: 'burned',
        burnAfterReading: true,
        alreadyClaimed: true,
        isExpired: false,
      });
      expect(res.canClaim).toBe(false);
      expect(res.reason).toBe('ALREADY_CLAIMED');
    });

    it('rejects claiming if the drop is not configured for burn-after-reading', () => {
      const res = checkClaimEligibility({
        dropStatus: 'active',
        burnAfterReading: false,
        alreadyClaimed: false,
        isExpired: false,
      });
      expect(res.canClaim).toBe(false);
      expect(res.reason).toBe('NOT_A_BURN_DROP');
    });

    it('rejects claiming if the drop has expired', () => {
      const res = checkClaimEligibility({
        dropStatus: 'expired',
        burnAfterReading: true,
        alreadyClaimed: false,
        isExpired: true,
      });
      expect(res.canClaim).toBe(false);
      expect(res.reason).toBe('DROP_EXPIRED');
    });
  });

  describe('5. Referral Code Validation Logic', () => {
    it('validates and normalizes legitimate 6-character referral codes', () => {
      const res = validateReferralCode({ referralCode: 'ab12cd' });
      expect(res.valid).toBe(true);
      expect(res.normalizedCode).toBe('AB12CD');
    });

    it('rejects malformed or invalid character length referral codes', () => {
      expect(validateReferralCode({ referralCode: '' }).valid).toBe(false);
      expect(validateReferralCode({ referralCode: 'SHORT' }).valid).toBe(false);
      expect(validateReferralCode({ referralCode: 'TOOLONG123' }).valid).toBe(false);
      expect(validateReferralCode({ referralCode: 'INV@L!' }).valid).toBe(false);
    });

    it('strictly prevents self-referrals when referral matches current drop', () => {
      const res = validateReferralCode({
        referralCode: 'SELF01',
        currentDropCode: 'self01',
      });
      expect(res.valid).toBe(false);
      expect(res.error).toBe('SELF_REFERRAL');
    });
  });
});
