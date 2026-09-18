import { describe, expect, it } from 'vitest';
import {
  canWriteClinicData,
  clampChairCount,
  clinicToEntitlement,
  daysLeftInTrial,
  isClinicEntitled,
  maxChairsForPlan,
  OPEN_TRIAL_ENTITLEMENT,
  type ClinicEntitlement,
} from '../entitlements';

describe('entitlements', () => {
  const active: ClinicEntitlement = {
    plan: 'starter',
    subscriptionStatus: 'active',
    trialEndsAt: null,
  };

  const trialing: ClinicEntitlement = {
    plan: 'free_trial',
    subscriptionStatus: 'trialing',
    trialEndsAt: new Date(Date.now() + 3 * 86400000).toISOString(),
  };

  const expired: ClinicEntitlement = {
    plan: 'free_trial',
    subscriptionStatus: 'expired',
    trialEndsAt: new Date(Date.now() - 86400000).toISOString(),
  };

  it('allows active paid clinics', () => {
    expect(isClinicEntitled(active)).toBe(true);
    expect(canWriteClinicData(active)).toBe(true);
  });

  it('allows open trials', () => {
    expect(isClinicEntitled(trialing)).toBe(true);
    expect(canWriteClinicData(trialing)).toBe(true);
    expect(daysLeftInTrial(trialing.trialEndsAt)).toBeGreaterThanOrEqual(2);
  });

  it('blocks expired trials as read-only', () => {
    expect(isClinicEntitled(expired)).toBe(false);
    expect(canWriteClinicData(expired)).toBe(false);
  });

  it('treats trial with null end as still entitled', () => {
    expect(
      isClinicEntitled({
        plan: 'free_trial',
        subscriptionStatus: 'trialing',
        trialEndsAt: null,
      })
    ).toBe(true);
  });

  it('maps missing billing columns to open trial (writable)', () => {
    expect(clinicToEntitlement({})).toEqual(OPEN_TRIAL_ENTITLEMENT);
    expect(clinicToEntitlement(undefined)).toEqual(OPEN_TRIAL_ENTITLEMENT);
    expect(canWriteClinicData(clinicToEntitlement({}))).toBe(true);
  });

  it('maps clinic row fields into entitlement', () => {
    const e = clinicToEntitlement({
      plan: 'pro',
      subscription_status: 'active',
      trial_ends_at: null,
    });
    expect(e).toEqual({
      plan: 'pro',
      subscriptionStatus: 'active',
      trialEndsAt: null,
    });
    expect(canWriteClinicData(e)).toBe(true);
  });

  it('blocks past_due and expired subscription status', () => {
    expect(
      canWriteClinicData({
        plan: 'starter',
        subscriptionStatus: 'past_due',
        trialEndsAt: null,
      })
    ).toBe(false);
  });

  it('clamps chairs by plan band', () => {
    expect(maxChairsForPlan('starter')).toBe(1);
    expect(maxChairsForPlan('pro')).toBe(3);
    expect(maxChairsForPlan('free_trial')).toBe(3);
    expect(clampChairCount(5, 'starter')).toBe(1);
    expect(clampChairCount(0, 'pro')).toBe(1);
    expect(clampChairCount(2, 'pro')).toBe(2);
  });
});
