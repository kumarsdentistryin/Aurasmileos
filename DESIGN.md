# Design System: AuraSmile OS — Surgical Matte Standard

## 1. Visual Theme & Atmosphere
Calm, glare-free chairside UI for 5000K operatory lighting and gloved hands.
Inspired by Zeiss / Apple Health surgical consoles — matte surfaces, zero neon, zero fluorescent teal.

- **Density**: 7/10
- **Motion**: 5/10 (150ms tactile press only)
- **Typing**: Prefer 1–3 tap chips/macros over free-text (95% of charting)

## 2. Color Palette

### Surfaces
- **Clinical Workspace**: `#F8FAFC` → `#F1F5F9` (never pure glare white as page bg)
- **Card Surface**: `#FFFFFF` + 1px `#E2E8F0`
- **Marketing / Dark**: `#0B1320` (ambient glow ≤ 3–5% opacity)

### Brand Accents
- **Deep Medical Aegean**: `#0F4C81` (primary actions)
- **Surgical Slate Accent**: `#134E5E`
- **Muted Surgical Sage**: `#166534` / `#2E7D73` (success / WhatsApp calm)

### FDI Condition Colors (muted / natural)
| Condition | Fill / Dot | Outline |
|-----------|------------|---------|
| Sound enamel | `#FAF9F5` | `#94A3B8` |
| Caries | `#B91C1C` | muted terracotta |
| Composite | `#3B6998` | ceramic slate blue |
| Amalgam | `#475569` | — |
| Crown | `#B45309` | antique brass |
| RCT | `#166534` | deep forest |
| Extraction | `#9F1239` | — |
| Missing | `#64748B` | titanium grey |
| Implant | `#5B4B8A` | muted (not neon violet) |
| Fracture | `#C2410C` | — |

### Semantic CSS tokens
See `src/index.css` `:root` — use `var(--color-aegean)`, `var(--status-*)`.

## 3. Typography
- UI: `Plus Jakarta Sans`
- Clinical numbers: `JetBrains Mono`
- Banned: Inter defaults, emoji, neon glow text

## 4. Chairside Zero-Typing
- Chief complaint / findings / advice → QuickChips
- Diagnosis / Tx → condition-aware bundles
- Rx → pre-built Indian dental packs (allergy-gated)
- Post-care → 1-tap WhatsApp template

## 5. Anti-Patterns
- No neon cyan/teal gradients or pulse orbs
- No pure `#000000`
- No floating-point money (paise only)
- No circular infinite spinners
