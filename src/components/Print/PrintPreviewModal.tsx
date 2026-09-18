import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';

interface PrintPreviewModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Preview → Print for Rx, Consent, and any clinic document.
 * Uses `.print-sheet` + `@media print` so only the sheet prints.
 */
export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 print:p-0 print:static print:inset-auto"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 print:hidden"
        aria-label="Close print preview"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">{title}</h2>
            {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="tactile-btn inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="tactile-btn p-2 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 bg-slate-100/80 print:p-0 print:bg-white print:overflow-visible">
          <div className="print-sheet mx-auto bg-white border border-slate-200 rounded-lg shadow-sm p-6 md:p-8 print:border-0 print:shadow-none print:rounded-none print:p-0">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
