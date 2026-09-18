import {
  Baby,
  Building2,
  ClipboardCheck,
  FileText,
  IndianRupee,
  LayoutGrid,
  Lock,
  MessageCircle,
  Shield,
  Smile,
  Stethoscope,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type MarketingFeature = {
  icon: LucideIcon;
  title: string;
  body: string;
};

export const MARKETING_FEATURES: MarketingFeature[] = [
  {
    icon: LayoutGrid,
    title: 'FDI odontogram',
    body: 'Surface charting for adult and Pedo — caries, fillings, RCT, crowns, implants.',
  },
  {
    icon: Shield,
    title: 'Doctor-only queue',
    body: 'Each dentist sees patients assigned to them. Desk sees the full day roster.',
  },
  {
    icon: ClipboardCheck,
    title: 'Notes, history, Rx, consent',
    body: 'Case notes, lifetime timeline, prescriptions, and signed consent on the same tablet.',
  },
  {
    icon: IndianRupee,
    title: 'UPI & GST receipts',
    body: 'Bill in integer paise, collect via UPI/cash/card, print letterhead receipts.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp from the desk',
    body: 'Open reminder and follow-up chats via wa.me from Today. Cloud auto-send is on the roadmap.',
  },
  {
    icon: FileText,
    title: 'Your clinic brand',
    body: 'Logo, phone, and tagline on workstation letterhead — not AuraSmile’s.',
  },
  {
    icon: Users,
    title: 'Multi-specialty roster',
    body: 'Pedo, Oral Surgery, Micro Endo, desk — invite staff and unlock by seat.',
  },
  {
    icon: Lock,
    title: 'Live clinic auth',
    body: 'Sign in, scoped membership, station unlock. Demo mode when you just want to look.',
  },
];

export const MARKETING_AUDIENCES = [
  {
    icon: Building2,
    title: 'Multi-specialty clinics',
    body: 'One front desk, several chairs — Pedo / Oral / Endo on the same floor.',
  },
  {
    icon: Stethoscope,
    title: 'Clinic owners & MDS leads',
    body: 'Own the roster, branding, and who can unlock each station.',
  },
  {
    icon: Users,
    title: 'Reception teams',
    body: 'Walk-in, book, assign specialty + chair — WhatsApp confirm from the queue.',
  },
] as const;

export const MARKETING_TRUST = [
  'Doctor-scoped patient lists (not clinic-wide PHI on every tablet)',
  'Staff unlock from your live roster — not a hardcoded demo list',
  'Money stored as integer paise — no float billing bugs',
  'Built for Indian clinics: WhatsApp-ready messaging, UPI receipts, GST letterhead',
] as const;

export const MARKETING_TRUST_BADGES = [
  'DCI · FDI 2-digit',
  'UPI · GST receipts',
  'DPDP-minded design',
  'Section 194J · 10% TDS',
] as const;

export const MARKETING_SPECIALTIES: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  body: string;
}[] = [
  {
    icon: Stethoscope,
    title: 'Endodontics',
    subtitle: 'Rotary RCT',
    body: 'Working lengths, canal notes, and crown handoff on the same chairside visit.',
  },
  {
    icon: Smile,
    title: 'Orthodontics',
    subtitle: 'Braces & aligners',
    body: 'Plan lines for aligner stages and recall dates without a separate spreadsheet.',
  },
  {
    icon: LayoutGrid,
    title: 'Implantology',
    subtitle: 'Torque & fixture logs',
    body: 'Fixture notes, consent, and follow-up osseointegration checks in one packet.',
  },
  {
    icon: Baby,
    title: 'Pediatric dentistry',
    subtitle: 'Deciduous chart',
    body: 'Flip to Pedo dentition — same FDI discipline parents and MDS expect.',
  },
];

export const MARKETING_COMPARISON = {
  headers: ['Capability', 'Paper files', 'Practo Ray-style', 'AuraSmile OS'],
  rows: [
    ['FDI surface odontogram', 'Sketch / stickers', 'Limited / add-on', 'Native adult + Pedo'],
    ['Doctor-only queue', 'Shared tray', 'Clinic-wide list', 'Assignment-scoped'],
    ['Consent + Rx + bill', '3 pads', 'Split modules', 'One handoff packet'],
    ['Integer paise billing', 'Mental math', 'Float risk', 'Paise ledger'],
    ['Follow-up queue', 'Diary', 'Reminders elsewhere', 'Today · Follow-ups'],
  ],
} as const;

export const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo chair clinic license',
    priceInr: 1499,
    period: '/month',
    popular: false,
    dbPlan: 'starter' as const,
    maxChairs: 1,
    cta: 'signup' as const,
    points: [
      'Clinic license · 1 operatory chair',
      'Unlimited staff logins (owner + desk + doctors)',
      'Desk queue + doctor Treat',
      'FDI chart, notes, Rx, consent, GST/UPI bill',
      'Clinic branding · Labs · Sterile',
    ],
  },
  {
    id: 'pro',
    name: 'Multi-Chair',
    tagline: 'Up to 3 chairs · one clinic',
    priceInr: 2999,
    period: '/month',
    popular: true,
    dbPlan: 'pro' as const,
    maxChairs: 3,
    cta: 'signup' as const,
    points: [
      'Clinic license · up to 3 chairs',
      'Unlimited staff logins',
      'Multi-specialty roster + doctor-scoped queues',
      'Follow-ups · stock ledger (this device) · dues',
      'Staff invites & unlock',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Chain',
    tagline: 'Multi-branch · custom',
    priceInr: 5999,
    period: '/month',
    popular: false,
    dbPlan: 'pro' as const,
    maxChairs: null as number | null,
    cta: 'contact' as const,
    points: [
      'Custom chair / branch packaging',
      'Priority onboarding by AuraSmile',
      'Owner Clinic ops across locations (roadmap)',
      'Invoiced annually or monthly',
      'Talk to us before checkout',
    ],
  },
] as const;

/** Free pilot length after create-clinic (days). */
export const TRIAL_LENGTH_DAYS = 14;

/** Override with VITE_SALES_WHATSAPP=9198xxxxxxxx (digits only). Falls back to mailto. */
const salesWhatsAppDigits = (import.meta.env.VITE_SALES_WHATSAPP as string | undefined)?.replace(
  /\D/g,
  ''
);

export const SALES_CONTACT_HREF = salesWhatsAppDigits
  ? `https://wa.me/${salesWhatsAppDigits}?text=${encodeURIComponent(
      'Namaste — I want AuraSmile OS Enterprise / Multi-Chair pricing for my clinic.'
    )}`
  : 'mailto:hello@aurasmile.clinic?subject=' +
    encodeURIComponent('AuraSmile OS — Enterprise / Multi-Chair pricing');

export const MARKETING_FAQS = [
  {
    q: 'Is this a full PMS / hospital EHR?',
    a: 'No. AuraSmile OS is the clinical workstation: desk queue, doctor treat, chart, history, consent, Rx, bill, and follow-ups. Labs, cash sheet, and deep multi-branch P&L continue to expand.',
  },
  {
    q: 'Do you charge per doctor / per login?',
    a: 'No. Price is a clinic license by chair band (1 chair or up to 3). Staff logins (owner, desk, visiting doctors) are unlimited on that license. Enterprise / multi-branch is custom — contact us.',
  },
  {
    q: 'Can we try before paying?',
    a: 'Yes. Sandbox demo needs no card. Creating a live clinic starts a 14-day writable pilot; after that the clinic goes read-only until we activate Starter or Multi-Chair on invoice.',
  },
  {
    q: 'How does doctor privacy work?',
    a: 'Reception assigns the patient to a doctor seat. That doctor’s tablet shows only their queue. Front desk keeps the full day view. Clinic owners who treat can also open Clinic settings.',
  },
  {
    q: 'How do you handle data privacy & DPDP Act 2023?',
    a: 'Clinic data stays under your membership. Access is authenticated and can be revoked. We design for Indian DPDP expectations — purpose-limited clinical use, no selling patient lists. Formal DPDP documentation expands with paid plans.',
  },
  {
    q: 'Do you send automated WhatsApp reminders?',
    a: 'Today you open wa.me reminder and follow-up chats from Today in one tap. WhatsApp Cloud API auto-dispatch is on the roadmap — not sold as live yet.',
  },
  {
    q: 'Can we migrate from Practo / Klinify?',
    a: 'Yes for a guided pilot: export CSV/Excel patient basics (name, phone, MRN notes) and we map into AuraSmile patients. Full chart history migration is assisted case-by-case — start with active recall patients first.',
  },
  {
    q: 'What if the internet drops mid-operatory?',
    a: 'Chairside chart, notes, Rx, and receipts write to the device first, then sync when the clinic is live and online. You can finish the visit without freezing the tablet.',
  },
  {
    q: 'Is billing really live?',
    a: 'Chairside GST/UPI receipts are live (print + cloud when linked). Daily cash sheet and advances are still maturing. Stock is a per-tablet ledger today — not multi-device ERP.',
  },
  {
    q: 'Who owns the patient data?',
    a: 'Your clinic. Letterhead and branding stay yours. Revoke a staff seat and PHI access ends for that member.',
  },
] as const;
