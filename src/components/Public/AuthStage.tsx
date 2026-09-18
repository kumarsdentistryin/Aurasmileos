import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { BrandMark } from '../Brand/BrandMark';

type AuthStageProps = {
  children: React.ReactNode;
  panelLine?: string;
  /** Optional funnel steps shown on the brand plane (e.g. signup). */
  funnelSteps?: readonly string[];
  activeFunnelStep?: number;
};

const PANEL_POINTS = [
  'Doctor-scoped treat queue',
  'Chart · history · Rx · consent · bill',
  'Follow-ups on Today',
] as const;

/**
 * Auth stage for /login and /signup — brand plane + form.
 */
export const AuthStage: React.FC<AuthStageProps> = ({
  children,
  panelLine = 'Desk seats the patient. Doctor treats — only theirs.',
  funnelSteps,
  activeFunnelStep = 0,
}) => {
  return (
    <div className="grid min-h-[calc(100vh-8.5rem)] lg:grid-cols-2">
      <aside
        className="relative flex flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 sm:py-12 lg:min-h-full"
        style={{
          background: 'linear-gradient(155deg, #0F766E 0%, #115E59 42%, #0F172A 100%)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 50% at 20% 10%, rgba(255,255,255,0.18) 0%, transparent 55%)',
          }}
        />
        <div className="relative z-10">
          <BrandMark showWordmark tone="dark" size="w-11 h-11" wordmarkSize="hero" />
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-teal-50/90 sm:mt-8">
            {panelLine}
          </p>
          {funnelSteps && funnelSteps.length > 0 ? (
            <ol className="mt-8 space-y-3">
              {funnelSteps.map((label, i) => {
                const active = i === activeFunnelStep;
                const done = i < activeFunnelStep;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        active
                          ? 'bg-white text-teal-900'
                          : done
                            ? 'bg-teal-400/30 text-white'
                            : 'bg-white/10 text-teal-100/70'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`text-[13px] font-medium ${
                        active ? 'text-white' : 'text-teal-100/75'
                      }`}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <ul className="mt-6 hidden space-y-2 sm:block">
              {PANEL_POINTS.map((line) => (
                <li
                  key={line}
                  className="flex items-center gap-2 text-[12px] font-medium text-teal-100/85"
                >
                  <span className="h-1 w-1 rounded-full bg-teal-200" />
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="relative z-10 mt-8 text-[11px] font-medium uppercase tracking-[0.16em] text-teal-200/70 lg:mt-0">
          Clinical workstation · India clinics
        </p>
      </aside>

      <div className="flex items-center justify-center bg-[var(--color-canvas)] px-4 py-10 sm:px-8 sm:py-14">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

/** Shared field chrome for auth forms */
export const authInputClass =
  'mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30';

export const authLabelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500';

export const authPrimaryBtnClass =
  'tactile-btn w-full rounded-lg bg-[var(--color-brand)] py-3 text-sm font-bold text-white hover:bg-[var(--color-brand-hover)] active:scale-[0.97] disabled:opacity-50';

type AuthPasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  id?: string;
  name?: string;
};

/** Password field with eye toggle to show / hide. */
export const AuthPasswordInput: React.FC<AuthPasswordInputProps> = ({
  value,
  onChange,
  autoComplete = 'current-password',
  required,
  minLength,
  id,
  name,
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1.5">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`${authInputClass} mt-0 pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]/30"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="h-4 w-4" strokeWidth={2} />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={2} />
        )}
      </button>
    </div>
  );
};
