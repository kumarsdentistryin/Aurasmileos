import React from 'react';

interface TrialBannerProps {
  mode: 'expired' | 'ending';
  daysLeft?: number | null;
}

/** Calm slate soft-lock / trial countdown — live clinics only (parent gates demo). */
export const TrialBanner: React.FC<TrialBannerProps> = ({ mode, daysLeft }) => {
  if (mode === 'expired') {
    return (
      <div
        role="status"
        className="border-b border-slate-200 bg-slate-100 text-slate-700 text-[12px] px-4 py-2 text-center"
      >
        Pilot ended — read-only. Contact AuraSmile to continue.
      </div>
    );
  }

  const n = daysLeft ?? 0;
  return (
    <div
      role="status"
      className="border-b border-slate-100 bg-slate-50 text-slate-500 text-[11px] px-4 py-1.5 text-center"
    >
      Pilot ends in {n} day{n === 1 ? '' : 's'}
    </div>
  );
};
