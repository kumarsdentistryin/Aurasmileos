/** Pure onboarding helpers (no Supabase). */

export const MIN_PASSWORD_LENGTH = 10;

/** Build a short unique branch code from a clinic name. */
export function buildBranchCode(name: string, now = Date.now()): string {
  const letters = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 6)
    .toUpperCase();
  return `${letters || 'CLINIC'}-${String(now).slice(-4)}`;
}

export function isPasswordValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
