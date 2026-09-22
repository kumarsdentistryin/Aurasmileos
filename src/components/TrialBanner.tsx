import React from 'react';

interface TrialBannerProps {
  mode: 'expired' | 'ending';
  daysLeft?: number | null;
  onUpgrade?: () => void;
}

/** Calm slate soft-lock / trial countdown — live clinics only (parent gates demo). */
export const TrialBanner: React.FC<TrialBannerProps> = ({ mode, daysLeft, onUpgrade }) => {
  if (mode === 'expired') {
    return (
      <div
        role="status"
        className="border-b border-red-200 bg-red-50 text-red-800 text-[12px] px-4 py-2 flex items-center justify-center gap-3"
      >
        <span>14-day pilot period ended — clinic is in read-only mode.</span>
        {onUpgrade && (
          <button
            type="button"
            onClick={onUpgrade}
            className="tactile-btn underline font-bold hover:text-red-950"
          >
            Activate Subscription (Razorpay / UPI) →
          </button>
        )}
      </div>
    );
  }

  const n = daysLeft ?? 0;
  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50/80 text-amber-900 text-[11px] px-4 py-1.5 flex items-center justify-center gap-2"
    >
      <span>Free pilot ends in {n} day{n === 1 ? '' : 's'}. No automatic charge.</span>
      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="tactile-btn font-bold text-teal-800 hover:text-teal-950 underline ml-1"
        >
          Choose Plan & Pay
        </button>
      )}
    </div>
  );
};
