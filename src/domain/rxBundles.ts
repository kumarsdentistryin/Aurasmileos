/**
 * 1-tap Indian dental Rx bundles — allergy-gated via interceptDrugAddition.
 */
import { MedicalAlert } from './types';
import {
  INDIAN_DENTAL_DRUG_MASTER,
  PrescribedDrug,
  interceptDrugAddition,
} from './prescription';

export type RxBundleId =
  | 'adult-pulpitis'
  | 'severe-infection'
  | 'post-extraction'
  | 'pedo-pain-3-5'
  | 'pedo-pain-6-10';

export type RxBundle = {
  id: RxBundleId;
  label: string;
  summary: string;
  /** brandName substrings to resolve from master list */
  brandKeys: string[];
  durationDays: number;
  diagnosisHint: string;
  adviceHint: string;
};

export const RX_BUNDLES: RxBundle[] = [
  {
    id: 'adult-pulpitis',
    label: 'Adult Acute Pulpitis Pack',
    summary: 'Amoxicillin 500mg TDS + Zerodol-SP BD + Pan-40 OD × 5 Days',
    brandKeys: ['Amoxil 500', 'Zerodol-SP', 'Pan 40'],
    durationDays: 5,
    diagnosisHint: 'Symptomatic irreversible pulpitis',
    adviceHint: 'Soft diet on treated side. Warm saline rinses from day 2. Review SOS.',
  },
  {
    id: 'severe-infection',
    label: 'Severe Infection / Abscess Pack',
    summary: 'Augmentin 625mg BD + Metrogyl 400mg TDS + Ketorol-DT SOS × 5 Days',
    brandKeys: ['Augmentin 625', 'Metrogyl 400', 'Ketorol-DT'],
    durationDays: 5,
    diagnosisHint: 'Acute odontogenic infection with abscess / swelling',
    adviceHint: 'No alcohol with Metrogyl. Cold compress externally. Emergency if fever rises.',
  },
  {
    id: 'post-extraction',
    label: 'Post-Extraction Pack',
    summary: 'Aceclofenac + Paracetamol BD + Betadine 2% Gargle × 3 Days',
    brandKeys: ['Zerodol-SP', 'Betadine Gargle'],
    durationDays: 3,
    diagnosisHint: 'Post-extraction care',
    adviceHint: 'No spitting / straw 24h. Soft diet. Betadine rinse after 24h.',
  },
  {
    id: 'pedo-pain-3-5',
    label: 'Pediatric Pain Pack · 3-5 yrs',
    summary: 'Syrup Ibugesic-Plus — age chip 3–5 yrs',
    brandKeys: ['Ibugesic Plus'],
    durationDays: 3,
    diagnosisHint: 'Pediatric dental pain (3–5 yrs)',
    adviceHint: 'Dose per body weight as labeled for 3–5 yrs. Soft diet. Parent supervision.',
  },
  {
    id: 'pedo-pain-6-10',
    label: 'Pediatric Pain Pack · 6-10 yrs',
    summary: 'Syrup Ibugesic-Plus — age chip 6–10 yrs',
    brandKeys: ['Ibugesic Plus'],
    durationDays: 3,
    diagnosisHint: 'Pediatric dental pain (6–10 yrs)',
    adviceHint: 'Dose per body weight as labeled for 6–10 yrs. Soft diet. Parent supervision.',
  },
];

/** Adult / infection / post-op packs shown as primary 1-tap chips. */
export const RX_ADULT_BUNDLES = RX_BUNDLES.filter(
  (b) => b.id === 'adult-pulpitis' || b.id === 'severe-infection' || b.id === 'post-extraction'
);

/** Pediatric age chips under one pack family. */
export const RX_PEDO_AGE_CHIPS = RX_BUNDLES.filter(
  (b) => b.id === 'pedo-pain-3-5' || b.id === 'pedo-pain-6-10'
);

function resolveBrand(key: string) {
  return INDIAN_DENTAL_DRUG_MASTER.find(
    (d) => d.brandName.includes(key) || key.includes(d.brandName.split(' ')[0])
  );
}

export type ApplyBundleResult =
  | { ok: true; drugs: PrescribedDrug[]; diagnosis: string; advice: string }
  | { ok: false; error: string; drugs: PrescribedDrug[] };

/**
 * Builds a full regimen from a bundle. Skips blocked drugs; fails if none apply.
 */
export function applyRxBundle(
  bundleId: RxBundleId,
  alerts: MedicalAlert[]
): ApplyBundleResult {
  const bundle = RX_BUNDLES.find((b) => b.id === bundleId);
  if (!bundle) return { ok: false, error: 'Unknown Rx bundle', drugs: [] };

  let drugs: PrescribedDrug[] = [];
  const errors: string[] = [];

  for (const key of bundle.brandKeys) {
    const master = resolveBrand(key);
    if (!master) {
      errors.push(`Drug not in master: ${key}`);
      continue;
    }
    const result = interceptDrugAddition(
      alerts,
      { ...master, durationDays: bundle.durationDays },
      drugs
    );
    if (!result.allowed) {
      errors.push(result.reason);
      continue;
    }
    drugs = [...drugs, result.drug];
  }

  if (drugs.length === 0) {
    return {
      ok: false,
      error: errors[0] || 'No drugs could be added (allergy block)',
      drugs: [],
    };
  }

  return {
    ok: true,
    drugs,
    diagnosis: bundle.diagnosisHint,
    advice: bundle.adviceHint,
  };
}

/** Formal WhatsApp post-care template — multi-locale, zero typing. */
export type PostCareLocale = 'en' | 'hi' | 'kn' | 'ta' | 'te';

export const POST_CARE_LOCALES: { id: PostCareLocale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'hi', label: 'Hindi' },
  { id: 'kn', label: 'Kannada' },
  { id: 'ta', label: 'Tamil' },
  { id: 'te', label: 'Telugu' },
];

function drugLine(d: PrescribedDrug, i: number): string {
  return `${i + 1}. ${d.brandName} ${d.strength} — ${d.frequency} × ${d.durationDays} days`;
}

export function buildPostCareWhatsAppMessage(input: {
  patientFirstName: string;
  clinicName: string;
  diagnosis: string;
  drugs: PrescribedDrug[];
  advice: string;
  locale?: PostCareLocale;
}): string {
  const locale = input.locale ?? 'en';
  const lines = input.drugs.map(drugLine);
  const name = input.patientFirstName;
  const clinic = input.clinicName;

  if (locale === 'hi') {
    return [
      `नमस्ते ${name} जी,`,
      '',
      `${clinic} से आपकी देखभाल सारांश:`,
      `निदान: ${input.diagnosis}`,
      '',
      'पर्ची (Rx):',
      ...lines,
      '',
      `सलाह: ${input.advice}`,
      '',
      'दर्द बढ़े या सूजन लौटे तो WhatsApp पर जवाब दें।',
      `— ${clinic}`,
    ].join('\n');
  }

  if (locale === 'kn') {
    return [
      `ನಮಸ್ಕಾರ ${name} ಅವರೇ,`,
      '',
      `${clinic} ನಿಂದ ನಿಮ್ಮ ಆರೈಕೆ ಸಾರಾಂಶ:`,
      `ರೋಗನಿರ್ಣಯ: ${input.diagnosis}`,
      '',
      'ಔಷಧಿ ಪಟ್ಟಿ:',
      ...lines,
      '',
      `ಸಲಹೆ: ${input.advice}`,
      '',
      'ನೋವು ಹೆಚ್ಚಾದರೆ ಅಥವಾ ಊತ ಮರಳಿದರೆ WhatsApp ನಲ್ಲಿ ಉತ್ತರಿಸಿ.',
      `— ${clinic}`,
    ].join('\n');
  }

  if (locale === 'ta') {
    return [
      `வணக்கம் ${name} அவர்களே,`,
      '',
      `${clinic} இலிருந்து உங்கள் பராமரிப்பு சுருக்கம்:`,
      `நோய் கண்டறிதல்: ${input.diagnosis}`,
      '',
      'மருந்து பட்டியல்:',
      ...lines,
      '',
      `அறிவுரை: ${input.advice}`,
      '',
      'வலி அதிகரித்தால் அல்லது வீக்கம் திரும்பினால் WhatsApp-ல் பதிலளிக்கவும்.',
      `— ${clinic}`,
    ].join('\n');
  }

  if (locale === 'te') {
    return [
      `నమస్కారం ${name} గారు,`,
      '',
      `${clinic} నుండి మీ సంరక్షణ సారాంశం:`,
      `నిర్ధారణ: ${input.diagnosis}`,
      '',
      'మందుల జాబితా:',
      ...lines,
      '',
      `సలహా: ${input.advice}`,
      '',
      'నొప్పి పెరిగితే లేదా వాపు తిరిగి వస్తే WhatsAppలో సమాధానం ఇవ్వండి.',
      `— ${clinic}`,
    ].join('\n');
  }

  return [
    `Namaste ${name} ji,`,
    '',
    `Your care summary from ${clinic}:`,
    `Diagnosis: ${input.diagnosis}`,
    '',
    'Prescription:',
    ...lines,
    '',
    `Advice: ${input.advice}`,
    '',
    'Reply on WhatsApp if pain increases or swelling returns.',
    `— ${clinic}`,
  ].join('\n');
}

