import React, { useMemo, useState } from 'react';
import {
  BolnaCallLog,
  BolnaCallSentiment,
  CrmWhatsAppTemplate,
  LeadSource,
  PipelineStage,
  TreatmentPlanOpportunity,
  calculatePipelineValuePaise,
  formatCrmWhatsAppMessage,
  getDueFollowUpsCount,
} from '../../domain/crm';
import { MOCK_BOLNA_CALLS, MOCK_OPPORTUNITIES } from '../../data/mockCrmData';
import { formatPaiseToInr } from '../../domain/financials';
import {
  ArrowRight,
  CalendarClock,
  IndianRupee,
  KanbanSquare,
  PhoneCall,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';

/** Clinic board clock aligned with mock CRM seed dates (IST clinic day). */
const CLINIC_AS_OF_DATE = '2026-09-15';

/** High-ticket threshold: ₹40,000 → 4,000,000 paise */
const HIGH_TICKET_PAISE = 4000000;

const STAGE_ORDER: PipelineStage[] = [
  'NEW_INQUIRY',
  'CONSULT_BOOKED',
  'TREATMENT_PRESENTED',
  'IN_TREATMENT',
  'RECALL_DUE',
  'COMPLETED',
];

interface BoardColumnDef {
  stage: PipelineStage;
  title: string;
  subtitle: string;
  pillClass: string;
  headerAccent: string;
}

const BOARD_COLUMNS: BoardColumnDef[] = [
  {
    stage: 'NEW_INQUIRY',
    title: 'New Leads',
    subtitle: 'Instagram · Maps · Bolna AI',
    pillClass: 'bg-sky-50 text-sky-800 border-sky-200',
    headerAccent: 'border-t-sky-500',
  },
  {
    stage: 'CONSULT_BOOKED',
    title: 'Consult Booked',
    subtitle: 'Chair reserved',
    pillClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    headerAccent: 'border-t-indigo-500',
  },
  {
    stage: 'TREATMENT_PRESENTED',
    title: 'Plan Presented',
    subtitle: 'High revenue priority',
    pillClass: 'bg-amber-50 text-amber-900 border-amber-200',
    headerAccent: 'border-t-amber-500',
  },
  {
    stage: 'IN_TREATMENT',
    title: 'Active Treatment',
    subtitle: 'Chairside in progress',
    pillClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    headerAccent: 'border-t-emerald-500',
  },
  {
    stage: 'RECALL_DUE',
    title: '6-Month Recall',
    subtitle: 'Hygiene / review due',
    pillClass: 'bg-rose-50 text-rose-800 border-rose-200',
    headerAccent: 'border-t-rose-500',
  },
];

const SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM_AD: 'Instagram',
  GOOGLE_MAPS: 'Google Maps',
  WALK_IN: 'Walk-in',
  BOLNA_AI_RECEPTIONIST: 'Bolna AI Call',
  DOCTOR_REFERRAL: 'Doctor Referral',
  PRACTO: 'Practo',
};

function nextStage(stage: PipelineStage): PipelineStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

function whatsappTemplateForStage(stage: PipelineStage): CrmWhatsAppTemplate {
  if (stage === 'TREATMENT_PRESENTED') return 'QUOTE';
  if (stage === 'RECALL_DUE') return 'RECALL';
  return 'FOLLOWUP';
}

function isFollowUpDue(opp: TreatmentPlanOpportunity): boolean {
  return opp.stage !== 'COMPLETED' && opp.nextFollowUpDate <= CLINIC_AS_OF_DATE;
}

function sentimentStyles(sentiment: BolnaCallSentiment): {
  label: string;
  className: string;
} {
  if (sentiment === 'POSITIVE') {
    return {
      label: 'Positive',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (sentiment === 'URGENT_PAIN') {
    return {
      label: 'Urgent Pain',
      className: 'bg-rose-50 text-rose-800 border-rose-200',
    };
  }
  return {
    label: 'Neutral',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function buildWaUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export const DentalPipelineCRM: React.FC = () => {
  const [opportunities, setOpportunities] =
    useState<TreatmentPlanOpportunity[]>(MOCK_OPPORTUNITIES);
  const [bolnaCalls, setBolnaCalls] = useState<BolnaCallLog[]>(MOCK_BOLNA_CALLS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSeen, setDrawerSeen] = useState(false);
  const [convertFlashId, setConvertFlashId] = useState<string | null>(null);

  const pipelineValuePaise = useMemo(
    () => calculatePipelineValuePaise(opportunities),
    [opportunities]
  );

  const highTicketCount = useMemo(
    () =>
      opportunities.filter(
        (o) =>
          o.stage !== 'COMPLETED' && o.estimatedValuePaise > HIGH_TICKET_PAISE
      ).length,
    [opportunities]
  );

  const followUpsDue = useMemo(
    () => getDueFollowUpsCount(opportunities, CLINIC_AS_OF_DATE),
    [opportunities]
  );

  const bolnaUnreadCount = useMemo(() => {
    if (drawerSeen) return 0;
    return bolnaCalls.filter((c) => !c.isConvertedToAppointment).length;
  }, [bolnaCalls, drawerSeen]);

  const openDrawer = () => {
    setDrawerOpen(true);
    setDrawerSeen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const handleAdvanceStage = (oppId: string) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id !== oppId) return opp;
        const advanced = nextStage(opp.stage);
        if (!advanced) return opp;
        return {
          ...opp,
          stage: advanced,
          lastContactDate: CLINIC_AS_OF_DATE,
          notes:
            advanced === 'COMPLETED'
              ? `${opp.notes} · Closed via CRM advance on ${CLINIC_AS_OF_DATE}.`
              : opp.notes,
        };
      })
    );
  };

  const handleConvertCallToAppointment = (call: BolnaCallLog) => {
    if (call.isConvertedToAppointment) return;

    const alreadyInPipeline = opportunities.some(
      (o) =>
        o.phone.replace(/[^0-9]/g, '') === call.callerPhone.replace(/[^0-9]/g, '') &&
        o.stage !== 'COMPLETED'
    );

    setBolnaCalls((prev) =>
      prev.map((c) =>
        c.id === call.id ? { ...c, isConvertedToAppointment: true } : c
      )
    );

    if (!alreadyInPipeline) {
      const newOpp: TreatmentPlanOpportunity = {
        id: `CRM-OPP-BOLNA-${Date.now()}`,
        patientName: call.callerName,
        phone: call.callerPhone,
        source: 'BOLNA_AI_RECEPTIONIST',
        procedureName:
          call.sentiment === 'URGENT_PAIN'
            ? 'Urgent Pain Consult (AI-triaged)'
            : 'General Consultation (Bolna AI booked)',
        estimatedValuePaise: call.sentiment === 'URGENT_PAIN' ? 350000 : 150000,
        stage: 'CONSULT_BOOKED',
        notes: `Converted from Bolna call ${call.id}. AI summary: ${call.aiSummary}`,
        lastContactDate: CLINIC_AS_OF_DATE,
        nextFollowUpDate: '2026-09-16',
        assignedDoctor: 'Dr. Vikram Rao, MDS',
      };
      setOpportunities((prev) => [newOpp, ...prev]);
      setConvertFlashId(newOpp.id);
      window.setTimeout(() => setConvertFlashId(null), 1800);
    }

    setDrawerOpen(false);
  };

  return (
    <div className="space-y-4 -mx-1 sm:mx-0">
      <div
        role="status"
        className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-950"
      >
        Demo data — not synced
      </div>
      {/* Masthead */}
      <div className="surface-card p-4 flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#0A192F] flex items-center justify-center text-cyan-300">
            <KanbanSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Patient CRM & Treatment Pipeline
              </h2>
              <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-semibold">
                Demo pipeline
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track inquiries → consult → presented plans → active care → recall. Integer paise
              pipeline math · Bolna AI receptionist intake.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openDrawer}
          className="tactile-btn relative inline-flex items-center gap-2 bg-[#0A192F] hover:bg-[#132337] text-white text-xs font-semibold px-3 py-2 rounded-md transition-colors"
        >
          <PhoneCall className="w-3.5 h-3.5 text-cyan-300" />
          <span>Bolna AI Calls</span>
          {bolnaUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              {bolnaUnreadCount}
            </span>
          )}
        </button>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Active Pipeline Value
            </span>
            <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            {formatPaiseToInr(pipelineValuePaise, false)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Open stages · paise-safe total</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              High-Ticket Plans
            </span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">{highTicketCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Cases &gt; ₹40,000 estimated</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-lg p-3.5 ring-1 ring-amber-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-amber-800 uppercase tracking-wide">
              Follow-Ups Due Today
            </span>
            <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-amber-900 font-mono">{followUpsDue}</span>
            <span className="text-[10px] font-semibold uppercase bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
              Action needed
            </span>
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">Clinic day {CLINIC_AS_OF_DATE}</p>
        </div>

        <button
          type="button"
          onClick={openDrawer}
          className="text-left bg-white border border-slate-200 rounded-lg p-3.5 hover:border-cyan-300 hover:bg-slate-50/80 transition-all tactile-btn"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              Bolna AI Transcriptions
            </span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900 font-mono">{bolnaCalls.length}</span>
            {!drawerSeen && bolnaUnreadCount > 0 && (
              <span className="text-[10px] font-bold uppercase bg-rose-500 text-white px-1.5 py-0.5 rounded">
                {bolnaUnreadCount} unread
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Voice receptionist intake · open drawer</p>
        </button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-max lg:min-w-0 lg:grid lg:grid-cols-5">
          {BOARD_COLUMNS.map((col) => {
            const cards = opportunities.filter((o) => o.stage === col.stage);
            const columnValue = cards.reduce((sum, c) => sum + c.estimatedValuePaise, 0);

            return (
              <div
                key={col.stage}
                className={`w-[260px] lg:w-auto flex flex-col bg-slate-100/80 border border-slate-200 rounded-lg overflow-hidden border-t-2 ${col.headerAccent}`}
              >
                <div className="px-3 py-2.5 bg-white/90 border-b border-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800">{col.title}</h3>
                    <span
                      className={`text-[10px] font-mono font-semibold border px-1.5 py-0.5 rounded ${col.pillClass}`}
                    >
                      {cards.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">{col.subtitle}</p>
                  <p className="text-[10px] font-mono text-slate-600 mt-1">
                    {formatPaiseToInr(columnValue, false)}
                  </p>
                </div>

                <div className="flex-1 p-2 space-y-2 min-h-[280px] max-h-[560px] overflow-y-auto">
                  {cards.length === 0 && (
                    <div className="text-[11px] text-slate-400 text-center py-8 border border-dashed border-slate-300 rounded-md bg-white/40">
                      No cards in this stage
                    </div>
                  )}

                  {cards.map((opp) => {
                    const due = isFollowUpDue(opp);
                    const advanced = nextStage(opp.stage);
                    const template = whatsappTemplateForStage(opp.stage);
                    const waMessage = formatCrmWhatsAppMessage(opp, template);
                    const waUrl = buildWaUrl(opp.phone, waMessage);
                    const isFlash = convertFlashId === opp.id;

                    return (
                      <article
                        key={opp.id}
                        className={`bg-white border rounded-md p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow ${
                          isFlash
                            ? 'border-cyan-400 ring-2 ring-cyan-200'
                            : due
                              ? 'border-amber-300'
                              : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">
                              {opp.patientName}
                            </h4>
                            <p className="text-[11px] font-mono text-slate-500 truncate">
                              {opp.phone}
                            </p>
                          </div>
                          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded">
                            {SOURCE_LABELS[opp.source]}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-snug mb-2 line-clamp-2">
                          {opp.procedureName}
                        </p>

                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-sm font-bold text-emerald-700 font-mono">
                            {formatPaiseToInr(opp.estimatedValuePaise, false)}
                          </span>
                          {opp.estimatedValuePaise > HIGH_TICKET_PAISE && (
                            <span className="text-[9px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">
                              High ticket
                            </span>
                          )}
                        </div>

                        <div
                          className={`flex items-center gap-1.5 text-[10px] mb-2.5 ${
                            due ? 'text-amber-800 font-semibold' : 'text-slate-500'
                          }`}
                        >
                          <CalendarClock className="w-3 h-3 shrink-0" />
                          <span>
                            Follow-up {opp.nextFollowUpDate}
                            {due ? ' · Due' : ''}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-400 mb-2.5 line-clamp-2">
                          {opp.assignedDoctor}
                        </p>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={!advanced}
                            onClick={() => handleAdvanceStage(opp.id)}
                            className="tactile-btn flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded-md bg-[#0A192F] text-white hover:bg-[#132337] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title={
                              advanced
                                ? `Advance to ${advanced.replace(/_/g, ' ')}`
                                : 'Already completed'
                            }
                          >
                            <span>{advanced === 'COMPLETED' ? 'Complete' : 'Advance Stage'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tactile-btn inline-flex items-center justify-center w-9 h-8 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="Open WhatsApp with stage-aware message"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed strip (out of main board columns per Twenty-style focus) */}
      {opportunities.some((o) => o.stage === 'COMPLETED') && (
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <h3 className="text-xs font-bold text-slate-700 mb-2">Completed</h3>
          <div className="flex flex-wrap gap-2">
            {opportunities
              .filter((o) => o.stage === 'COMPLETED')
              .map((o) => (
                <span
                  key={o.id}
                  className="text-[11px] bg-slate-50 border border-slate-200 text-slate-600 px-2 py-1 rounded"
                >
                  {o.patientName} · {formatPaiseToInr(o.estimatedValuePaise, false)}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Bolna AI Slide-over Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40 transition-opacity"
            aria-label="Close Bolna drawer backdrop"
            onClick={closeDrawer}
          />
          <aside className="relative w-full max-w-md h-full bg-white border-l border-slate-200 shadow-xl flex flex-col animate-[slideInRight_200ms_ease-out]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-[#0A192F] text-white">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-cyan-300" />
                <div>
                  <h3 className="text-sm font-bold">Bolna AI Voice Receptionist</h3>
                  <p className="text-[10px] text-slate-300">
                    Inbound transcripts · sentiment · 1-click chair convert
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="tactile-btn p-1.5 rounded-md hover:bg-white/10 text-slate-200"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
              {bolnaCalls.map((call) => {
                const sentiment = sentimentStyles(call.sentiment);
                return (
                  <div
                    key={call.id}
                    className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-2.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{call.callerName}</h4>
                        <p className="text-[11px] font-mono text-slate-500">{call.callerPhone}</p>
                      </div>
                      <span
                        className={`text-[10px] font-semibold border px-1.5 py-0.5 rounded ${sentiment.className}`}
                      >
                        {sentiment.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                      <span className="font-mono">{call.timestamp}</span>
                      <span>·</span>
                      <span>Audio {formatDuration(call.audioDurationSec)}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">{call.id}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-md p-2.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                        AI transcript summary
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">{call.aiSummary}</p>
                    </div>

                    {call.sentiment === 'POSITIVE' && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Positive — patient exploring treatment / EMI options
                      </p>
                    )}
                    {call.sentiment === 'URGENT_PAIN' && (
                      <p className="text-[11px] text-rose-700 font-medium">
                        Urgent pain triage — prioritize chair assignment
                      </p>
                    )}

                    <button
                      type="button"
                      disabled={call.isConvertedToAppointment}
                      onClick={() => handleConvertCallToAppointment(call)}
                      className="tactile-btn w-full text-xs font-semibold py-2 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
                    >
                      {call.isConvertedToAppointment
                        ? 'Already in pipeline / converted'
                        : 'Convert to Chair Appointment'}
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.85; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
