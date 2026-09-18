import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from '../Brand/BrandMark';

/**
 * Shared public funnel chrome — Soft Surgical Slate · Deep Surgical Teal.
 * Same tokens as /app workstation (no dark marketing flashbang).
 */
export const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-canvas)] text-[var(--color-ink-primary)] antialiased">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 70% 45% at 12% 0%, rgba(15,118,110,0.07) 0%, transparent 55%), linear-gradient(180deg, #F1F5F9 0%, transparent 42%)',
        }}
      />

      <header className="relative z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="inline-flex" aria-label="AuraSmile OS home">
            <BrandMark showWordmark />
          </Link>
          <nav className="flex items-center gap-0.5 text-[13px] sm:gap-1">
            <Link to="/features" className="px-2 py-1.5 text-slate-500 hover:text-slate-900">
              Features
            </Link>
            <Link to="/pricing" className="px-2 py-1.5 text-slate-500 hover:text-slate-900">
              Pricing
            </Link>
            <Link
              to="/faq"
              className="hidden px-2 py-1.5 text-slate-500 hover:text-slate-900 sm:inline"
            >
              FAQ
            </Link>
            <Link to="/login" className="px-2 py-1.5 text-slate-500 hover:text-slate-900">
              Log in
            </Link>
            <Link
              to="/signup"
              className="tactile-btn ml-1 inline-flex items-center gap-1.5 rounded-md bg-[var(--color-brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-brand-hover)] active:scale-[0.97]"
            >
              Create clinic
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>

      <footer className="relative z-10 border-t border-slate-200 bg-white/90 py-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-5 text-[11px] text-slate-500 sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <BrandMark size="w-7 h-7" />
            <span>
              <strong className="text-slate-800">AuraSmile OS</strong> · clinical OS for dental
              clinics
            </span>
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <Link to="/features" className="hover:text-slate-800">
              Features
            </Link>
            <Link to="/pricing" className="hover:text-slate-800">
              Pricing
            </Link>
            <Link to="/faq" className="hover:text-slate-800">
              FAQ
            </Link>
            <Link to="/signup" className="hover:text-slate-800">
              Create clinic
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
