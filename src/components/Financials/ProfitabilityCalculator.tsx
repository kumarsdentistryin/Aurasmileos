import React, { useState } from 'react';
import { calculateCaseProfitability, formatPaiseToInr, inrToPaise } from '../../domain/financials';
import { IndianRupee, TrendingUp, UserCheck } from 'lucide-react';

interface ProcedurePreset {
  name: string;
  defaultFeeInr: number;
  isVisiting: boolean;
  consultantShare: number;
  labFeeInr: number;
  consumablesInr: number;
}

const PROCEDURE_PRESETS: ProcedurePreset[] = [
  {
    name: 'Molar RCT + Monolithic Zirconia Crown',
    defaultFeeInr: 9500,
    isVisiting: true,
    consultantShare: 60,
    labFeeInr: 2200,
    consumablesInr: 650,
  },
  {
    name: 'Single Anterior Implant + Screw-Retained Crown',
    defaultFeeInr: 35000,
    isVisiting: true,
    consultantShare: 60,
    labFeeInr: 4500,
    consumablesInr: 8500,
  },
  {
    name: 'Surgical Impaction (Third Molar Exodontia)',
    defaultFeeInr: 6500,
    isVisiting: true,
    consultantShare: 60,
    labFeeInr: 0,
    consumablesInr: 750,
  },
  {
    name: 'Class II Nano-Hybrid Composite Restoration',
    defaultFeeInr: 2200,
    isVisiting: false,
    consultantShare: 0,
    labFeeInr: 0,
    consumablesInr: 350,
  },
  {
    name: 'Full Arch Ultrasonic Scaling & Polishing',
    defaultFeeInr: 1800,
    isVisiting: false,
    consultantShare: 0,
    labFeeInr: 0,
    consumablesInr: 200,
  },
];

export const ProfitabilityCalculator: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<ProcedurePreset>(PROCEDURE_PRESETS[0]);
  const [procedureName, setProcedureName] = useState<string>(selectedPreset.name);
  const [feeInr, setFeeInr] = useState<number>(selectedPreset.defaultFeeInr);
  const [isVisiting, setIsVisiting] = useState<boolean>(selectedPreset.isVisiting);
  const [consultantShare, setConsultantShare] = useState<number>(selectedPreset.consultantShare);
  const [labFeeInr, setLabFeeInr] = useState<number>(selectedPreset.labFeeInr);
  const [consumablesInr, setConsumablesInr] = useState<number>(selectedPreset.consumablesInr);

  const handleApplyPreset = (preset: ProcedurePreset) => {
    setSelectedPreset(preset);
    setProcedureName(preset.name);
    setFeeInr(preset.defaultFeeInr);
    setIsVisiting(preset.isVisiting);
    setConsultantShare(preset.consultantShare);
    setLabFeeInr(preset.labFeeInr);
    setConsumablesInr(preset.consumablesInr);
  };

  const calculation = calculateCaseProfitability({
    procedureName,
    grossFeePaise: inrToPaise(feeInr),
    isVisitingSpecialist: isVisiting,
    consultantSharePercentage: consultantShare,
    labFeePaise: inrToPaise(labFeeInr),
    materialsConsumableCostPaise: inrToPaise(consumablesInr),
    gstApplicablePercent: 0,
  });

  const getMarginBadgeClass = (marginPct: number) => {
    if (marginPct >= 40) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (marginPct >= 15) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="space-y-4">
      <div
        role="status"
        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700"
      >
        What-if margin calculator — presets are examples only; results are not saved to clinic books.
      </div>
      {/* Masthead */}
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 font-sans">
                Case-Level Contribution Margin & Specialist Commission Ledger
              </h2>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase">
                USAF Pure Integer Paise Math
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live case profitability: Profit = Gross Fee - (Specialist Share + Lab Fee + Consumables)
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-600">Quick Presets:</span>
          <select
            aria-label="Select Dental Procedure Preset"
            value={selectedPreset.name}
            onChange={(e) => {
              const found = PROCEDURE_PRESETS.find((p) => p.name === e.target.value);
              if (found) handleApplyPreset(found);
            }}
            className="text-xs font-medium bg-slate-100 border border-slate-300 rounded px-2.5 py-1 text-slate-900 focus:ring-1 focus:ring-blue-500"
          >
            {PROCEDURE_PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name} (₹{p.defaultFeeInr.toLocaleString('en-IN')})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Form Panel (7 cols) */}
        <div className="lg:col-span-7 surface-card p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Procedure Cost & Split Configuration
            </h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Procedure Name</label>
            <input
              type="text"
              value={procedureName}
              onChange={(e) => setProcedureName(e.target.value)}
              className="w-full text-xs p-2 rounded border border-slate-300 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Patient Procedure Fee (INR)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                <input
                  type="number"
                  step="100"
                  value={feeInr}
                  onChange={(e) => setFeeInr(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono font-bold pl-7 pr-3 py-2 rounded border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Doctor / Operator Model
              </label>
              <div className="flex rounded border border-slate-300 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsVisiting(true)}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    isVisiting ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Visiting Specialist
                </button>
                <button
                  type="button"
                  onClick={() => setIsVisiting(false)}
                  className={`flex-1 py-2 font-medium transition-colors ${
                    !isVisiting ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  In-House Doctor
                </button>
              </div>
            </div>
          </div>

          {/* Visiting Specialist Rev-Share Slider */}
          {isVisiting && (
            <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Visiting Consultant Share Ratio:</span>
                </span>
                <span className="font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                  {consultantShare}% Specialist / {100 - consultantShare}% Clinic
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={consultantShare}
                onChange={(e) => setConsultantShare(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span onClick={() => setConsultantShare(50)} className="cursor-pointer hover:text-blue-600">50/50</span>
                <span onClick={() => setConsultantShare(60)} className="cursor-pointer font-bold text-blue-700">60/40 (Standard)</span>
                <span onClick={() => setConsultantShare(70)} className="cursor-pointer hover:text-blue-600">70/30 (Surgical)</span>
                <span onClick={() => setConsultantShare(80)} className="cursor-pointer hover:text-blue-600">80/20</span>
              </div>
            </div>
          )}

          {/* Direct Costs: Lab & Consumables */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dental Lab Fee (Zirconia / PFM / Aligner)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                <input
                  type="number"
                  step="50"
                  value={labFeeInr}
                  onChange={(e) => setLabFeeInr(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono pl-7 pr-3 py-2 rounded border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consumables & Materials (Rotary files/LA/GP)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
                <input
                  type="number"
                  step="50"
                  value={consumablesInr}
                  onChange={(e) => setConsumablesInr(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs font-mono pl-7 pr-3 py-2 rounded border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Analytics Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="surface-card p-4 space-y-3">
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Profitability & Payout Breakdown</span>
              </h3>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${getMarginBadgeClass(calculation.profitMarginPercentage)}`}>
                {calculation.profitMarginPercentage}% Margin
              </span>
            </div>

            {/* Key Metric Highlights */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Gross Patient Billing:</span>
                <strong className="font-mono text-slate-900 font-bold">
                  {formatPaiseToInr(calculation.grossFeePaise)}
                </strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 text-blue-800">
                <span className="flex items-center gap-1">
                  <span>Specialist Consultant Payout:</span>
                  {isVisiting && <span className="text-[10px] text-blue-600">({consultantShare}%)</span>}
                </span>
                <strong className="font-mono font-semibold">
                  - {formatPaiseToInr(calculation.doctorConsultantPayoutPaise)}
                </strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 text-amber-800">
                <span>Dental Lab Expense:</span>
                <strong className="font-mono font-semibold">
                  - {formatPaiseToInr(calculation.labExpensePaise)}
                </strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 text-purple-800">
                <span>Direct Material Consumables:</span>
                <strong className="font-mono font-semibold">
                  - {formatPaiseToInr(calculation.consumablesExpensePaise)}
                </strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-500 font-medium">
                <span>Total Direct Procedure Cost:</span>
                <span className="font-mono">
                  {formatPaiseToInr(calculation.totalDirectCostPaise)}
                </span>
              </div>

              {/* Net Contribution Margin */}
              <div className="pt-2 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Net Clinic Contribution Margin
                  </div>
                  <div className="text-xs text-slate-400">Retained clinic revenue after all costs</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-mono font-black ${
                    calculation.netClinicContributionMarginPaise >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {formatPaiseToInr(calculation.netClinicContributionMarginPaise)}
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Bar Breakdown */}
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">Cost Distribution:</div>
              <div className="w-full h-3 rounded-full bg-slate-200 flex overflow-hidden">
                <div
                  style={{ width: `${(calculation.doctorConsultantPayoutPaise / (calculation.grossFeePaise || 1)) * 100}%` }}
                  className="bg-blue-600"
                  title="Doctor Payout"
                />
                <div
                  style={{ width: `${(calculation.labExpensePaise / (calculation.grossFeePaise || 1)) * 100}%` }}
                  className="bg-amber-500"
                  title="Lab Expense"
                />
                <div
                  style={{ width: `${(calculation.consumablesExpensePaise / (calculation.grossFeePaise || 1)) * 100}%` }}
                  className="bg-purple-600"
                  title="Material Consumables"
                />
                <div
                  style={{ width: `${Math.max(0, (calculation.netClinicContributionMarginPaise / (calculation.grossFeePaise || 1)) * 100)}%` }}
                  className="bg-emerald-500"
                  title="Net Clinic Profit"
                />
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-600 mt-2">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Doctor
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Lab
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span> Consumables
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clinic Margin
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
