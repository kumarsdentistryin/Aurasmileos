# Chosen stack for AuraSmile — executive pick

Mined from crazy-ai-stack folders `08`, `09`, `10`, `18`. Only items below are **in play**; everything else is deferred/skip per the four adoption briefs.

## Skills (agent productivity) — ADOPT NOW

| Skill | Path | Use |
|-------|------|-----|
| **karpathy-guidelines** | `.cursor/skills/karpathy-guidelines/` | Surgical edits; no feature sprawl |
| **grill-with-docs** | `.cursor/skills/grill-with-docs/` | Grill features against `CONTEXT.md` |
| **emil-design-eng** | `.cursor/skills/emil-design-eng/` | Sell/UI motion review only |

Skip: full Spec-Kit, compound-engineering plugin zoo, prompts-hub personas, Fable re-copy (already global).

## UI kits — ADOPT PRINCIPLES ONLY

| Adopt | Avoid |
|-------|-------|
| impeccable + ui-ux-pro-max motion (150ms, skeletons, reduced-motion) | magicui neon/aurora/meteors; Lenis on workstation; framer-motion install |
| Lucide + `WhatsAppIcon` | Random emoji / MessageCircle stand-ins |

Shipped: `src/styles/motion.css`, Skeleton, WhatsAppIcon routing, odontogram `.tooth-surface`.

## Dental OSS — ADOPT PATTERNS (not GPL/BSL binaries)

| Adopt | Source | Status |
|-------|--------|--------|
| YOLO `/detect` → normalized boxes + confidence | ai-dental-caries-detector | Domain adapter shipped |
| Filling > caries surface exclusivity | dental-charting-odontogram | Domain helper shipped |
| Pedo adult→deciduous FDI remap | dental-charting-odontogram | `fdi.ts` shipped |
| Bolna agent config stub (MIT) | bolna-ai-voice-receptionist | `voiceReceptionist.ts` stub |
| PHI redaction before LLM/voice | dentalpin (ideas only) | **Implementing** |
| State vs treatment taxonomy | apexo | **Implementing** |

**Do not** vendor GPL `best.pt` into SaaS; run inference as separate edge process. **Do not** fork BSL DentalPin.

## SaaS OSS — 90-day satellite stack

```text
AuraSmile ──events──► n8n ──► WhatsApp / ntfy / Lago / Twenty / Chatwoot
```

| Window | Systems |
|--------|---------|
| Days 0–30 | **n8n** + **ntfy** + event contract (`src/lib/integrations`) |
| Days 30–60 | **Lago** (SaaS invoices) + **Chatwoot** (owner support) |
| Days 60–90 | **Twenty** (funnel→CRM) + Plane (internal ops) |

Stay on **Supabase** (not Appwrite). Cal.com = patterns only for clinical queue.

## This sprint (code)

1. `CONTEXT.md` for grill-with-docs
2. PHI redaction helper + tests
3. Tooth condition taxonomy (`state` \| `treatment` \| `both`)
4. Live `emitIntegrationEvent` when `VITE_INTEGRATIONS_WEBHOOK_URL` set; emit on clinic create + funnel steps
5. Keep applying `supabase/migrations/20260916_security_harden.sql` on Supabase before live pilot
