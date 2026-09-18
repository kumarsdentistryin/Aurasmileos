import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { PublicShell } from '../components/Public/PublicShell';
import { MarketingFaqAccordion } from '../components/Public/MarketingFaqAccordion';
import {
  MARKETING_AUDIENCES,
  MARKETING_FEATURES,
  MARKETING_TRUST,
} from './marketingCopy';

export const FeaturesPage: React.FC = () => {
  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
          Features
        </p>
        <h1 className="font-display mb-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          What AuraSmile OS includes
        </h1>
        <p className="mb-12 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Clinical workstation for Indian multi-specialty clinics — desk queue through chairside
          chart, consent, Rx, and bill.
        </p>

        <div className="mb-16 grid gap-4 sm:grid-cols-2">
          {MARKETING_FEATURES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Icon
                className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-brand)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-display mb-1.5 text-lg font-bold text-slate-900">Built for</h2>
        <p className="mb-8 max-w-lg text-sm text-slate-500">
          Not a hospital mega-EHR. A clinic-first desk-to-doctor system.
        </p>
        <div className="mb-16 grid gap-4 sm:grid-cols-3">
          {MARKETING_AUDIENCES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Icon className="h-5 w-5 text-[var(--color-brand)]" strokeWidth={1.75} />
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[13px] leading-relaxed text-slate-600">{body}</p>
            </div>
          ))}
        </div>

        <h2 className="font-display mb-1.5 text-lg font-bold text-slate-900">Trust & control</h2>
        <p className="mb-6 max-w-lg text-sm text-slate-500">
          Owners keep the keys. Doctors keep their patients. Desk keeps the day moving.
        </p>
        <ul className="mb-12 max-w-2xl space-y-3">
          {MARKETING_TRUST.map((line) => (
            <li key={line} className="flex gap-3 text-[13px] leading-relaxed text-slate-700">
              <Check
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]"
                strokeWidth={2.5}
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="tactile-btn inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--color-brand-hover)] active:scale-[0.97]"
          >
            Create clinic
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <Link
            to="/app?demo=1&tab=operatory"
            className="tactile-btn inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
          >
            Try free sandbox demo
          </Link>
          <Link
            to="/pricing"
            className="tactile-btn inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
          >
            View pricing
          </Link>
        </div>

        <MarketingFaqAccordion title="Common questions" />
      </div>
    </PublicShell>
  );
};
