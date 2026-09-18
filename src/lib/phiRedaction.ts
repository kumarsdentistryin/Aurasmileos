/**
 * PHI redaction before LLM / voice / outbound automation hops.
 * Pattern inspired by dentalpin (ideas only — BSL; reimplemented).
 * Never send charts, odontograms, or consent pads to CRM satellites.
 */

const PHONE_RE = /(?:\+?91[\s-]?)?[6-9]\d{9}|\+?\d[\d\s\-()]{8,}\d/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
/** MRN-style tokens e.g. AS-BLR-0492 */
const MRN_RE = /\bAS-[A-Z]{2,5}-\d{3,6}\b/gi;
const NAMED_PATIENT_RE = /\b(?:patient|pt\.?)\s*[:=]\s*[A-Za-z][A-Za-z.'\s-]{1,40}/gi;

export type PhiRedactionMap = Record<string, string>;

export interface PhiRedactionResult {
  text: string;
  map: PhiRedactionMap;
  redactedCount: number;
}

function nextToken(kind: string, n: number): string {
  return `[${kind}_${n}]`;
}

/**
 * Strip phones, emails, MRNs, and "patient: Name" fragments.
 * Returns tokenized text + map for optional rehydration server-side only.
 */
export function redactPhiForLlm(input: string): PhiRedactionResult {
  const map: PhiRedactionMap = {};
  let n = 0;
  let text = input;

  const replaceAll = (re: RegExp, kind: string) => {
    text = text.replace(re, (match) => {
      n += 1;
      const token = nextToken(kind, n);
      map[token] = match;
      return token;
    });
  };

  replaceAll(EMAIL_RE, 'EMAIL');
  replaceAll(MRN_RE, 'MRN');
  replaceAll(PHONE_RE, 'PHONE');
  replaceAll(NAMED_PATIENT_RE, 'PATIENT');

  return { text, map, redactedCount: n };
}

/** True if string still looks like it contains raw phone/email/MRN. */
export function looksLikeRawPhi(text: string): boolean {
  return (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) ||
    /\bAS-[A-Z]{2,5}-\d{3,6}\b/i.test(text) ||
    /(?:\+?91[\s-]?)?[6-9]\d{9}|\+?\d[\d\s\-()]{8,}\d/.test(text)
  );
}
