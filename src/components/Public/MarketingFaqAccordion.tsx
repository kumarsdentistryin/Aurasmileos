import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MARKETING_FAQS } from '../../pages/marketingCopy';

type FaqItem = { q: string; a: string };

export const MarketingFaqAccordion: React.FC<{
  items?: readonly FaqItem[];
  title?: string;
}> = ({ items = MARKETING_FAQS, title = 'Frequently asked questions' }) => {
  const [openId, setOpenId] = useState<string | null>(items[0]?.q ?? null);

  return (
    <section className="mt-16">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
        {items.map((item) => {
          const open = openId === item.q;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.q)}
                className="tactile-btn flex w-full items-center justify-between gap-3 py-4 text-left active:scale-[0.99]"
                aria-expanded={open}
              >
                <span className="font-display text-[15px] font-bold text-slate-900">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {open && (
                <p className="pb-4 text-[13px] leading-relaxed text-slate-600">{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
