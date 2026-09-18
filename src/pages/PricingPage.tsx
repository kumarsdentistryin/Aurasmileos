import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { PublicShell } from '../components/Public/PublicShell';
import { MarketingFaqAccordion } from '../components/Public/MarketingFaqAccordion';
import { PRICING_TIERS, SALES_CONTACT_HREF, TRIAL_LENGTH_DAYS } from './marketingCopy';

function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

export const PricingPage: React.FC = () => {
  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
          Pricing
        </p>
        <h1 className="font-display max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Clinic license by chair — not per doctor login
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Monthly INR for one clinic entity. Unlimited staff seats on that license. Start with a{' '}
          {TRIAL_LENGTH_DAYS}-day live pilot, then we activate Starter or Multi-Chair on invoice
          (UPI / NEFT). Enterprise is custom.
        </p>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => {
            const isContact = tier.cta === 'contact';
            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
                  tier.popular
                    ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20'
                    : 'border-slate-200'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-5 rounded-md bg-[var(--color-brand)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-lg font-bold text-slate-900">{tier.name}</h2>
                <p className="mt-0.5 text-[12px] font-medium text-slate-500">{tier.tagline}</p>
                <p className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-900">
                  {isContact ? (
                    <span className="text-2xl">Custom</span>
                  ) : (
                    <>
                      {formatInr(tier.priceInr)}
                      <span className="text-sm font-semibold text-slate-500">{tier.period}</span>
                    </>
                  )}
                </p>
                {!isContact && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    From {formatInr(tier.priceInr)} list · activated after pilot
                  </p>
                )}
                <ul className="mt-6 flex-1 space-y-2.5">
                  {tier.points.map((line) => (
                    <li key={line} className="flex gap-2 text-[13px] leading-snug text-slate-700">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]"
                        strokeWidth={2.5}
                      />
                      {line}
                    </li>
                  ))}
                </ul>
                {isContact ? (
                  <a
                    href={SALES_CONTACT_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="tactile-btn mt-8 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-white active:scale-[0.97]"
                  >
                    Talk to sales
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </a>
                ) : (
                  <Link
                    to="/signup"
                    className={`tactile-btn mt-8 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold active:scale-[0.97] ${
                      tier.popular
                        ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]'
                        : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-white'
                    }`}
                  >
                    Start {TRIAL_LENGTH_DAYS}-day pilot
                    <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Not ready for a live clinic?</h2>
            <p className="mt-1 text-[13px] text-slate-600">
              Open the free sandbox with sample Indian records — no card required.
            </p>
          </div>
          <Link
            to="/app?demo=1&tab=operatory"
            className="tactile-btn inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
          >
            Try free sandbox demo
          </Link>
        </div>

        <p className="mt-8 max-w-2xl text-[12px] leading-relaxed text-slate-500">
          Prices are monthly INR for a single clinic entity. Taxes extra where applicable. Payment is
          invoice-activated during early access (no self-serve card checkout yet). Stock ledger is
          per tablet today. Multi-branch chain P&L remains roadmap — Enterprise is contact-only.
        </p>

        <MarketingFaqAccordion />

        <p className="mt-8 text-center text-[13px] text-slate-500">
          More detail in the{' '}
          <Link to="/faq" className="font-semibold text-[var(--color-brand)] hover:underline">
            full FAQ
          </Link>
          .
        </p>
      </div>
    </PublicShell>
  );
};
