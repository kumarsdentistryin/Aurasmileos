import React from 'react';

type BrandMarkProps = {
  className?: string;
  /** Icon box size classes e.g. w-9 h-9 */
  size?: string;
  showWordmark?: boolean;
  /** dark = white wordmark for slate bars; light = ink wordmark */
  tone?: 'light' | 'dark';
  /** Larger display wordmark for marketing heroes */
  wordmarkSize?: 'nav' | 'hero';
};

/**
 * Unified AuraSmile OS emblem — tooth outline + clinical pulse.
 * Same mark on marketing and workstation.
 */
export const BrandMark: React.FC<BrandMarkProps> = ({
  className = '',
  size = 'w-9 h-9',
  showWordmark = false,
  tone = 'light',
  wordmarkSize = 'nav',
}) => {
  const word = tone === 'dark' ? 'text-white' : 'text-slate-900';
  const osTone = tone === 'dark' ? 'text-teal-200' : 'text-[var(--color-brand)]';
  const markClass =
    wordmarkSize === 'hero'
      ? 'font-[family-name:var(--font-display)] text-3xl sm:text-4xl font-extrabold tracking-[-0.04em]'
      : 'font-[family-name:var(--font-display)] text-[17px] font-extrabold tracking-tight';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`${size} rounded-xl bg-[var(--color-brand)] flex items-center justify-center shrink-0`}
        aria-hidden
      >
        <svg viewBox="0 0 32 32" className="w-[58%] h-[58%] text-white" fill="none">
          <path
            d="M16 4c-3.2 0-5.8 2.2-6.4 5.2-.5 2.4.2 5.1 1.2 8.2.7 2.2 1.5 4.4 2.2 6.1.4 1 .9 1.8 1.6 2.2.5.3 1.1.4 1.4.4s.9-.1 1.4-.4c.7-.4 1.2-1.2 1.6-2.2.7-1.7 1.5-3.9 2.2-6.1 1-3.1 1.7-5.8 1.2-8.2C21.8 6.2 19.2 4 16 4z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M7 15.5h4l2-4 3 8 2.5-5.5H25"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className={`${markClass} ${word}`}>
          AuraSmile{' '}
          <span className={osTone}>OS</span>
        </span>
      )}
    </span>
  );
};
