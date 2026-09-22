/**
 * Clinic entitlement helpers (trial / paid soft paywall).
 * Wired after Supabase Auth loads clinic.plan + trial_ends_at.
 */

import type { DbClinic } from './supabase';

export type ClinicPlan = 'free_trial' | 'starter' | 'growth' | 'ai_voice' | 'pro';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'expired';
export type ClinicSubscriptionStatus = SubscriptionStatus;

export interface ClinicEntitlement {
  plan: ClinicPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
}

/** Safe default when billing columns are absent or clinic not loaded yet. */
export const OPEN_TRIAL_ENTITLEMENT: ClinicEntitlement = {
  plan: 'free_trial',
  subscriptionStatus: 'trialing',
  trialEndsAt: null,
};

/** Pilot length mirrored in marketingCopy.TRIAL_LENGTH_DAYS and DB RPC. */
export const DEFAULT_TRIAL_DAYS = 14;

export function clinicToEntitlement(
  clinic: Pick<DbClinic, 'plan' | 'subscription_status' | 'trial_ends_at'> | null | undefined
): ClinicEntitlement {
  if (!clinic) return { ...OPEN_TRIAL_ENTITLEMENT };
  const rawPlan = clinic.plan;
  const status = clinic.subscription_status;
  const plan: ClinicPlan =
    rawPlan === 'starter' ||
    rawPlan === 'growth' ||
    rawPlan === 'ai_voice' ||
    rawPlan === 'pro' ||
    rawPlan === 'free_trial'
      ? rawPlan
      : 'free_trial';

  return {
    plan,
    subscriptionStatus:
      status === 'active' ||
      status === 'past_due' ||
      status === 'expired' ||
      status === 'trialing'
        ? status
        : 'trialing',
    trialEndsAt: clinic.trial_ends_at ?? null,
  };
}

export function daysLeftInTrial(trialEndsAt: string | null, now = new Date()): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  const diff = end - now.getTime();
  return Math.ceil(diff / 86400000);
}

export function isClinicEntitled(e: ClinicEntitlement, now = new Date()): boolean {
  if (e.subscriptionStatus === 'active') return true;
  if (e.subscriptionStatus === 'trialing' || e.plan === 'free_trial') {
    if (!e.trialEndsAt) return true; // legacy rows before trial clock
    return new Date(e.trialEndsAt).getTime() > now.getTime();
  }
  return false;
}

/** Soft paywall: expired clinics stay read-only (never wipe charts mid-day). */
export function canWriteClinicData(e: ClinicEntitlement, now = new Date()): boolean {
  return isClinicEntitled(e, now);
}

/** Max operatory chairs allowed (all clinics receive access to all 3 operatories). */
export function maxChairsForPlan(_plan?: ClinicPlan | string | null | undefined): number {
  return 3;
}

export function clampChairCount(
  requested: number,
  plan?: ClinicPlan | string | null | undefined
): number {
  const max = maxChairsForPlan(plan);
  const n = Number.isFinite(requested) ? Math.floor(requested) : 3;
  return Math.min(max, Math.max(1, n));
}

/** Trial protection: Live AI Voice calls & outbound telephony are strictly locked unless clinic has paid active ai_voice plan */
export function canAccessAIVoice(e: ClinicEntitlement): boolean {
  return e.plan === 'ai_voice' && e.subscriptionStatus === 'active';
}

/** Growth features: Automated WhatsApp recall engine, GMB review booster, and patient re-engagement */
export function canAccessGrowthEngine(e: ClinicEntitlement): boolean {
  if (e.subscriptionStatus === 'active') {
    return e.plan === 'growth' || e.plan === 'ai_voice' || e.plan === 'pro';
  }
  // During trial, clinics can test native GMB review links, but automated cloud engines require upgrade
  return e.subscriptionStatus === 'trialing';
}

/** Core workstation: FDI odontogram, queues, materials auto-deduction, 60/40 splits, GST/UPI receipts */
export function canAccessCoreWorkstation(e: ClinicEntitlement, now = new Date()): boolean {
  return isClinicEntitled(e, now);
}
