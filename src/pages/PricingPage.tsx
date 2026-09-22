import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
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
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');

  const mainTiers = PRICING_TIERS.filter((t) => t.id !== 'enterprise');
  const enterpriseTier = PRICING_TIERS.find((t) => t.id === 'enterprise');

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-5 py-14 sm:py-16">
        <div className="text-center sm:text-left">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand)]">
            Transparent Pricing
          </p>
          <h1 className="font-display max-w-2xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Simple pricing for modern dental clinics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Full operatory floor access included on all plans — no artificial chair gating, no per-doctor fees. Start with a{' '}
            {TRIAL_LENGTH_DAYS}-day free pilot, then select your growth tier.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center rounded-xl bg-slate-100 p-1.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setBillingCycle('annual')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Autopay
              <span className="ml-1.5 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Best Value (Save ~17%)
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
          </div>
        </div>

        {/* 3 Core Tiers Grid */}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {mainTiers.map((tier) => {
            const price =
              billingCycle === 'annual' ? tier.priceAnnualInr : tier.priceMonthlyInr;
            const period =
              billingCycle === 'annual' ? tier.periodAnnual : tier.periodMonthly;

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm transition-all hover:shadow-md ${
                  tier.popular
                    ? 'border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/20'
                    : 'border-slate-200'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-6 rounded-md bg-[var(--color-brand)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                    Most popular
                  </span>
                )}
                <h2 className="font-display text-xl font-bold text-slate-900">{tier.name}</h2>
                <p className="mt-1 text-[13px] font-medium text-slate-500">{tier.tagline}</p>

                <div className="mt-5">
                  <p className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
                    {price !== null ? formatInr(price) : 'Custom'}
                    <span className="text-sm font-semibold text-slate-500">{period}</span>
                  </p>
                  {billingCycle === 'annual' && tier.equivalentMonthlyInr && (
                    <p className="mt-1 text-[12px] font-medium text-emerald-700">
                      Effective {formatInr(tier.equivalentMonthlyInr)}/month · billed annually
                    </p>
                  )}
                  {billingCycle === 'monthly' && (
                    <p className="mt-1 text-[12px] text-slate-500">
                      Billed monthly · cancel anytime
                    </p>
                  )}
                </div>

                <div className="my-6 border-t border-slate-100" />

                <ul className="flex-1 space-y-3">
                  {tier.points.map((line) => (
                    <li key={line} className="flex gap-2.5 text-[13px] leading-snug text-slate-700">
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]"
                        strokeWidth={2.5}
                      />
                      {line}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`tactile-btn mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold active:scale-[0.97] transition-all shadow-xs ${
                    tier.popular
                      ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)]'
                      : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Start {TRIAL_LENGTH_DAYS}-day free pilot
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Enterprise Chain Card */}
        {enterpriseTier && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-md">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                <Sparkles className="w-3 h-3" />
                Multi-Branch Networks
              </div>
              <h3 className="font-display text-xl font-bold text-white mt-2">
                Enterprise Chain & Dental Hospital Networks
              </h3>
              <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                Centralized command center across multiple clinic branches, custom Practo/EHR data migration, custom PBX telephony, dedicated infrastructure, and prioritized account managers.
              </p>
            </div>
            <a
              href={SALES_CONTACT_HREF}
              target="_blank"
              rel="noreferrer"
              className="tactile-btn shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-900 hover:bg-slate-100 active:scale-[0.97]"
            >
              Talk to enterprise sales
              <ArrowRight className="h-4 w-4 text-slate-900" strokeWidth={2.5} />
            </a>
          </div>
        )}

        {/* Sandbox Callout */}
        <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Not ready for a live clinic?</h2>
            <p className="mt-1 text-[13px] text-slate-600">
              Open the free sandbox with sample Indian dental records — no credit card required.
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
          All prices are in INR for a single clinic entity. Taxes extra where applicable. Every tier includes access to all operatory chairs on your clinic floor with zero artificial chair gating. Start with a 14-day free pilot.
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
