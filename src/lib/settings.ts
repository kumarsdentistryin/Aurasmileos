/**
 * AuraSmile OS — client-safe settings registry.
 * Live keys via Vite env; graceful demo fallbacks when unset.
 */

function env(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : '';
}

export interface AuraSmileSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  whatsappPhoneId: string;
  whatsappClinicE164: string;
  abdmClientId: string;
  abdmClientSecret: string;
  bolnaAgentId: string;
  bolnaApiKey: string;
  mode: 'demo' | 'live';
}

export function loadSettings(): AuraSmileSettings {
  const rawUrl = env('VITE_SUPABASE_URL');
  const rawAnonKey = env('VITE_SUPABASE_ANON_KEY');
  const supabaseUrl =
    rawUrl && rawUrl.startsWith('http') ? rawUrl : 'https://axhmbluvfsylifsvachc.supabase.co';
  const supabaseAnonKey =
    rawAnonKey && rawAnonKey.length > 20
      ? rawAnonKey
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4aG1ibHV2ZnN5bGlmc3ZhY2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MzcyMTEsImV4cCI6MjEwNTIxMzIxMX0.Fy7FtXlzYFC9gMqUVL18WgmjvzyN9LSIJT3QrKgoxNI';
  const whatsappPhoneId = env('VITE_WHATSAPP_PHONE_ID');
  const abdmClientId = env('VITE_ABDM_CLIENT_ID');
  const abdmClientSecret = env('VITE_ABDM_CLIENT_SECRET');
  const bolnaAgentId = env('VITE_BOLNA_AGENT_ID');
  const bolnaApiKey = env('VITE_BOLNA_API_KEY');

  const hasLiveCore = Boolean(supabaseUrl && supabaseAnonKey);

  return {
    supabaseUrl,
    supabaseAnonKey,
    whatsappPhoneId,
    whatsappClinicE164: env('VITE_WHATSAPP_CLINIC_E164') || '918025201234',
    abdmClientId,
    abdmClientSecret,
    bolnaAgentId,
    bolnaApiKey,
    mode: hasLiveCore ? 'live' : 'demo',
  };
}

export const settings = loadSettings();

export function isWhatsAppCloudConfigured(): boolean {
  return Boolean(settings.whatsappPhoneId);
}

export function isBolnaConfigured(): boolean {
  return Boolean(settings.bolnaAgentId && settings.bolnaApiKey);
}

export function isAbdmSandboxConfigured(): boolean {
  return Boolean(settings.abdmClientId && settings.abdmClientSecret);
}

/** Prefer Cloud API when configured; otherwise wa.me deep link (demo-safe). */
export function buildPatientWhatsAppUrl(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/[^0-9]/g, '');
  if (isWhatsAppCloudConfigured()) {
    // Cloud send is server-side; UI still opens wa.me as doctor-facing fallback.
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
