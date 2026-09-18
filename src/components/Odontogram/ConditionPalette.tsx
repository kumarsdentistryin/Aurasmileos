import React from 'react';
import { ToothCondition } from '../../domain/types';
import { conditionTaxonomyKind } from '../../domain/toothTaxonomy';

interface ConditionPaletteProps {
  selectedCondition: ToothCondition;
  onSelectCondition: (cond: ToothCondition) => void;
}

interface ConditionItem {
  id: ToothCondition;
  label: string;
  shortLabel: string;
  /** Inline muted anatomical swatch */
  swatch: string;
  description: string;
}

export const CONDITION_ITEMS: ConditionItem[] = [
  {
    id: 'SOUND',
    label: 'Sound / Healthy',
    shortLabel: 'Sound',
    swatch: '#FAF9F5',
    description: 'Intact natural tooth structure without pathology',
  },
  {
    id: 'CARIES',
    label: 'Caries / Decay',
    shortLabel: 'Caries',
    swatch: '#B91C1C',
    description: 'Active enamel or dentinal cavitation',
  },
  {
    id: 'COMPOSITE',
    label: 'Composite Filling',
    shortLabel: 'Composite',
    swatch: '#3B6998',
    description: 'Resin tooth-colored restoration',
  },
  {
    id: 'AMALGAM',
    label: 'Amalgam Restoration',
    shortLabel: 'Amalgam',
    swatch: '#475569',
    description: 'Silver dental amalgam filling',
  },
  {
    id: 'CROWN',
    label: 'Crown / Cap',
    shortLabel: 'Crown',
    swatch: '#B45309',
    description: 'Full-coverage monolithic zirconia, PFM, or ceramic crown',
  },
  {
    id: 'RCT',
    label: 'Root Canal (RCT)',
    shortLabel: 'RCT',
    swatch: '#166534',
    description: 'Endodontically treated and obturated canals',
  },
  {
    id: 'EXTRACTION_INDICATED',
    label: 'Extraction Indicated',
    shortLabel: 'Extract',
    swatch: '#9F1239',
    description: 'Grossly decayed or unrestorable tooth marked for exodontia',
  },
  {
    id: 'MISSING',
    label: 'Missing / Extracted',
    shortLabel: 'Missing',
    swatch: '#64748B',
    description: 'Edentulous space or previously extracted unit',
  },
  {
    id: 'IMPLANT',
    label: 'Dental Implant',
    shortLabel: 'Implant',
    swatch: '#5B4B8A',
    description: 'Endosseous titanium implant fixture',
  },
  {
    id: 'FRACTURE',
    label: 'Tooth Fracture',
    shortLabel: 'Fracture',
    swatch: '#C2410C',
    description: 'Traumatic Ellis Class I/II/III crown-root fracture',
  },
];

/**
 * Wrapping condition toolstrip — glove-sized chips, swatch always visible.
 */
export const ConditionPalette: React.FC<ConditionPaletteProps> = ({
  selectedCondition,
  onSelectCondition,
}) => {
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        Condition
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CONDITION_ITEMS.map((item) => {
          const isSelected = selectedCondition === item.id;
          const kind = conditionTaxonomyKind(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCondition(item.id)}
              title={`${item.description} · ${kind}`}
              className={`tactile-btn inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-semibold whitespace-nowrap motion-colors ${
                isSelected
                  ? 'border-[var(--color-brand)] bg-teal-50 text-slate-900 ring-2 ring-[var(--color-brand)]/25'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-slate-400/40"
                style={{ backgroundColor: item.swatch }}
              />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
