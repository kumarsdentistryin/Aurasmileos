/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_WHATSAPP_PHONE_ID: string;
  readonly VITE_WHATSAPP_CLINIC_E164: string;
  readonly VITE_ABDM_CLIENT_ID: string;
  readonly VITE_ABDM_CLIENT_SECRET: string;
  readonly VITE_BOLNA_AGENT_ID: string;
  readonly VITE_BOLNA_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
