import React from 'react';

type QuickChipProps = {
  label: string;
  selected?: boolean;
  onClick: () => void;
  title?: string;
  muted?: boolean;
  disabled?: boolean;
};

/** Glove-friendly 1-tap clinical chip — Aegean select, matte idle. */
export const QuickChip: React.FC<QuickChipProps> = ({
  label,
  selected = false,
  onClick,
  title,
  muted = false,
  disabled = false,
}) => (
  <button
    type="button"
    title={title}
    disabled={disabled}
    onClick={onClick}
    className={`tactile-btn clinical-focus inline-flex items-center min-h-[40px] px-3 py-2 rounded-md border text-[12px] font-semibold motion-colors disabled:pointer-events-none disabled:opacity-40 ${
      selected
        ? 'bg-[var(--color-aegean)] text-white border-[var(--color-aegean)]'
        : muted
          ? 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
          : 'bg-[var(--color-surface)] text-slate-800 border-slate-200 hover:border-[var(--color-aegean)] hover:text-[var(--color-aegean)]'
    }`}
  >
    {label}
  </button>
);
