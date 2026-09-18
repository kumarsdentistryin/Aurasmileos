/**
 * Bolna-inspired voice receptionist integration stub for AuraSmile OS.
 *
 * Source pattern: crazy-ai-stack/18-healthtech-dental-os/bolna-ai-voice-receptionist
 * (MIT orchestration). No API keys, no live telephony — config shapes only.
 *
 * Production path (P1): Edge Function owns secrets; SPA only sees opaque session ids.
 * Tools MUST re-check clinic membership + doctor scope before any write (DPDP / RLS).
 */

export type VoiceTelephonyProvider = 'exotel' | 'plivo' | 'twilio';

export type VoiceAsrProvider = 'deepgram' | 'azure' | 'local';

export type VoiceLlmProvider = 'openai' | 'deepseek' | 'local';

export type VoiceTtsProvider = 'elevenlabs' | 'deepgram' | 'azure' | 'local';

/** Allowed receptionist actions — never charting / diagnosis. */
export type VoiceReceptionistTool =
  | 'check_availability'
  | 'book_appointment'
  | 'cancel_appointment'
  | 'reschedule_appointment'
  | 'clinic_hours'
  | 'transfer_to_human';

export interface VoiceReceptionistAgentConfig {
  agentName: string;
  /** Clinic-scoped welcome; avoid embedding patient PHI in prompts. */
  welcomeMessage: string;
  hangupAfterSilenceSec: number;
  telephony: VoiceTelephonyProvider;
  asr: VoiceAsrProvider;
  llm: VoiceLlmProvider;
  tts: VoiceTtsProvider;
  /** Language hint for Indian clinics (en-IN / hi-IN / kn-IN …). */
  language: string;
  enabledTools: VoiceReceptionistTool[];
}

export interface VoiceReceptionistSessionStub {
  sessionId: string;
  clinicId: string;
  status: 'stub_not_connected';
  config: VoiceReceptionistAgentConfig;
}

/** Sensible defaults for a Ballari / Indiranagar front desk — keys injected server-side later. */
export const DEFAULT_VOICE_RECEPTIONIST_CONFIG: VoiceReceptionistAgentConfig = {
  agentName: 'AuraSmile Front Desk',
  welcomeMessage:
    'Namaste, thank you for calling. I can help with appointment availability. How may I assist you?',
  hangupAfterSilenceSec: 30,
  telephony: 'exotel',
  asr: 'deepgram',
  llm: 'openai',
  tts: 'deepgram',
  language: 'en-IN',
  enabledTools: [
    'check_availability',
    'book_appointment',
    'cancel_appointment',
    'reschedule_appointment',
    'clinic_hours',
    'transfer_to_human',
  ],
};

/**
 * Creates a disconnected session stub. Real Bolna/Exotel wiring lives in a
 * server Edge Function — never put provider API keys in Vite env for production.
 */
export function createVoiceReceptionistSessionStub(
  clinicId: string,
  config: Partial<VoiceReceptionistAgentConfig> = {}
): VoiceReceptionistSessionStub {
  return {
    sessionId: `voice-stub-${clinicId}`,
    clinicId,
    status: 'stub_not_connected',
    config: { ...DEFAULT_VOICE_RECEPTIONIST_CONFIG, ...config },
  };
}
