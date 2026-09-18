import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { BrandMark } from '../components/Brand/BrandMark';
import { PublicShell } from '../components/Public/PublicShell';
import { Odontogram } from '../components/Odontogram/Odontogram';
import { ToothId, ToothState } from '../domain/types';
import {
  MARKETING_COMPARISON,
  MARKETING_SPECIALTIES,
  MARKETING_TRUST_BADGES,
} from './marketingCopy';

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Desk seats the patient',
    body: 'Walk-in or book, assign doctor + chair, WhatsApp confirm in one tap.',
  },
  {
    step: '2',
    title: 'Doctor treats — only theirs',
    body: 'FDI chart, notes, Rx, consent, and bill on the same tablet. No other doctor’s PHI.',
  },
  {
    step: '3',
    title: 'Owner sees the floor',
    body: 'Stock, consultants, and clinic ops — even with one chair and six visiting MDS.',
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      'One chair, five consultants. AuraSmile keeps each doctor’s queue private and the desk moving.',
    name: 'Dr. Ananya Rao',
    clinic: 'Indiranagar · Pedo + Endo',
  },
  {
    quote:
      'We left paper trays for FDI charting and UPI receipts. Staff unlock takes seconds between chairs.',
    name: 'Dr. Vikram Shetty',
    clinic: 'Mangaluru · Multi-specialty',
  },
  {
    quote:
      'Owner view of stock and visiting specialist payouts finally matches how Indian clinics actually run.',
    name: 'Dr. Meera Krishnan',
    clinic: 'Coimbatore · Solo chair chain',
  },
] as const;

const SEED_CHART: Record<number, ToothState> = {
  16: {
    toothId: 16,
    condition: 'CARIES',
    affectedSurfaces: ['O'],
    lastUpdated: '2026-09-18',
  },
  26: {
    toothId: 26,
    condition: 'COMPOSITE',
    affectedSurfaces: ['O'],
    lastUpdated: '2026-09-18',
  },
  46: {
    toothId: 46,
    condition: 'RCT',
    affectedSurfaces: [],
    lastUpdated: '2026-09-18',
  },
};

/**
 * AuraSmile OS marketing home — Soft Surgical Slate (matches /app, no dark flashbang).
 */
export const SellHomePage: React.FC = () => {
  const [chart, setChart] = useState<Record<number, ToothState>>(SEED_CHART);

  const handleUpdateTooth = useCallback((toothId: ToothId, next: ToothState) => {
    setChart((prev) => ({ ...prev, [toothId]: next }));
  }, []);

  const handleReset = useCallback(() => {
    setChart(SEED_CHART);
  }, []);

  return (
    <PublicShell>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:pb-12 sm:pt-16">
        <BrandMark showWordmark wordmarkSize="hero" size="w-12 h-12 sm:w-14 sm:h-14" />
        <h1 className="font-display mt-7 max-w-3xl text-[1.85rem] font-extrabold leading-[1.12] tracking-[-0.035em] text-slate-900 sm:text-4xl lg:text-[2.85rem]">
          The Sovereign Dental Operating System for Indian Multi-Specialty Clinics
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-lg">
          Desk seats the patient. Doctor treats — only theirs. Chart, history, Rx, consent, and bill
          on one tablet.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="tactile-btn inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3.5 text-sm font-bold text-white shadow-sm shadow-teal-900/10 hover:bg-[var(--color-brand-hover)] active:scale-[0.97]"
          >
            Create clinic
            <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
          <Link
            to="/app?demo=1&tab=operatory"
            className="tactile-btn inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
          >
            Try free sandbox demo
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-2">
          {MARKETING_TRUST_BADGES.map((badge) => (
            <li
              key={badge}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
            >
              {badge}
            </li>
          ))}
        </ul>
      </section>

      {/* Interactive workstation */}
      <section className="border-y border-slate-200 bg-[var(--color-canvas-deep)]">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
                Live preview
              </p>
              <h2 className="font-display mt-1 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                Tap a tooth. Chart without logging in.
              </h2>
            </div>
            <p className="max-w-sm text-[12px] leading-relaxed text-slate-500">
              Same FDI odontogram your doctors open in Treat — adult or Pedo, surfaces and
              conditions.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <Odontogram
              dentalChart={chart}
              onUpdateToothState={handleUpdateTooth}
              onResetChart={handleReset}
            />
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
          Multi-specialty
        </p>
        <h2 className="font-display mt-2 max-w-xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Built for the chairs on your floor
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {MARKETING_SPECIALTIES.map(({ icon: Icon, title, subtitle, body }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-100 bg-teal-50 text-[var(--color-brand)]">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800/70">
                    {subtitle}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
            Why clinics switch
          </p>
          <h2 className="font-display mt-2 max-w-xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Paper trays and generic PMS were never built for FDI chairs
          </h2>
          <div className="mt-10 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[36rem] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {MARKETING_COMPARISON.headers.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-bold text-slate-800 first:rounded-tl-xl last:rounded-tr-xl"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MARKETING_COMPARISON.rows.map((row) => (
                  <tr key={row[0]} className="border-b border-slate-100 last:border-0">
                    {row.map((cell, i) => (
                      <td
                        key={`${row[0]}-${i}`}
                        className={`px-4 py-3 ${
                          i === 0
                            ? 'font-semibold text-slate-800'
                            : i === 3
                              ? 'font-medium text-[var(--color-brand)]'
                              : 'text-slate-600'
                        }`}
                      >
                        {i > 0 && i < 3 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <X className="h-3.5 w-3.5 text-slate-300" strokeWidth={2} />
                            {cell}
                          </span>
                        ) : i === 3 ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Check
                              className="h-3.5 w-3.5 text-[var(--color-brand)]"
                              strokeWidth={2.5}
                            />
                            {cell}
                          </span>
                        ) : (
                          cell
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link
            to="/features"
            className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand)] hover:text-[var(--color-brand-hover)]"
          >
            See all features
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
          How it works
        </p>
        <h2 className="font-display mt-2 max-w-xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Desk → doctor → owner overview
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="relative">
              <span className="font-display text-4xl font-extrabold text-teal-100">{item.step}</span>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-slate-200 bg-white/70">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
            Clinics like yours
          </p>
          <h2 className="font-display mt-2 max-w-xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Built for Indian multi-specialty floors
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-[13px] leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-4 text-[12px]">
                  <div className="font-bold text-slate-900">{t.name}</div>
                  <div className="text-slate-500">{t.clinic}</div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Close CTA */}
      <section className="border-t border-slate-200 bg-[var(--color-canvas)] pb-24 sm:pb-0">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-14 sm:flex-row sm:items-center sm:justify-between sm:py-16">
          <div className="max-w-md">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              Start on your floor this week
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              14-day live pilot, then Starter ₹1,499 (1 chair) or Multi-Chair ₹2,999 (up to 3) —
              activated on invoice.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="tactile-btn inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-brand)] px-5 py-3.5 text-sm font-bold text-white hover:bg-[var(--color-brand-hover)] active:scale-[0.97]"
            >
              Create clinic
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            <Link
              to="/pricing"
              className="tactile-btn inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.97]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-6xl gap-2">
          <Link
            to="/signup"
            className="tactile-btn flex-1 inline-flex items-center justify-center rounded-lg bg-[var(--color-brand)] py-3 text-sm font-bold text-white active:scale-[0.97]"
          >
            Create clinic
          </Link>
          <Link
            to="/app?demo=1&tab=operatory"
            className="tactile-btn flex-1 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 active:scale-[0.97]"
          >
            Try demo
          </Link>
        </div>
      </div>
    </PublicShell>
  );
};
