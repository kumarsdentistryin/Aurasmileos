import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicShell } from '../components/Public/PublicShell';
import { MARKETING_FAQS } from './marketingCopy';

export const FaqPage: React.FC = () => {
  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
          FAQ
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Straight answers
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Privacy, WhatsApp, migration from Practo/Klinify, and offline chairside — what AuraSmile
          OS does today.
        </p>

        <div className="mt-12 max-w-2xl divide-y divide-slate-200 border-y border-slate-200">
          {MARKETING_FAQS.map((item) => (
            <div key={item.q} className="py-6">
              <h2 className="font-display text-[15px] font-bold text-slate-900">{item.q}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{item.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="tactile-btn inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--color-brand-hover)] active:scale-[0.97]"
          >
            Create clinic
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <Link
            to="/pricing"
            className="tactile-btn inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
          >
            View pricing
          </Link>
          <Link
            to="/app?demo=1&tab=operatory"
            className="tactile-btn inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
          >
            Try free sandbox
          </Link>
        </div>
      </div>
    </PublicShell>
  );
};
