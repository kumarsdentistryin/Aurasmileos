# Stack adoptions — UI / UX (`09-ui-ux-frontend`)

Mined from `P:\crazy-ai-stack\09-ui-ux-frontend` against `DESIGN.md`. Goal: borrow **small, high-ROI** patterns for AuraSmile’s clinical workstation + approved sell homepage — no structure/copy redesign of `SellHomePage.tsx`.

**Motion budget (source of truth):** DESIGN.md Motion 5/10 → snappy **150ms**, tactile press, zero motion sickness. No new animation npm deps (`framer-motion` not present; do not install).

---

## Ranked patterns → AuraSmile surfaces

| Pri | Pattern | Source kits | Lock screen | Sell home | Odontogram | Settings |
|-----|---------|-------------|-------------|-----------|------------|----------|
| **P0** | Shared motion tokens (150ms, tactile `scale(0.98)`, ease-out arrivals, `prefers-reduced-motion`) | impeccable `animate.md`, ui-ux-pro-max (`duration-timing`, `reduced-motion`, `motion-consistency`) | Unlock buttons / roster settle | CTA press only (no scroll theater) | Surface select feedback | Save / toggle press |
| **P0** | Structured skeleton / pulse placeholders (ban infinite circular spinners) | animate-ui `Skeleton`, ui-ux-pro-max `progressive-loading` / `loading-states`, DESIGN.md anti-pattern | Roster load | — (static approved page) | Condition switch / tooth fetch | Branding / staff lists |
| **P0** | Icon family consistency (Lucide clinical + one brand glyph for WhatsApp) | impeccable `polish.md` (icons), Penpot SVG discipline | Role icons | Existing Lucide set — polish only | Condition / action icons | Admin actions |
| **P1** | Dense panel chrome: 1px whisper borders, quiet elevation, navy signal accent | open-design **Cisco** / **BMW** (trust navy, sparse accent, engineered density) | Card sheet | Keep approved layout; borders already clinical | Canvas chrome | Form groups |
| **P1** | Semantic status color + non-color cue (icon/label) | ui-ux-pro-max `color-not-only`, DESIGN.md FDI palette | — | Trust copy only | FDI conditions | Alert badges |
| **P1** | Focus-visible rings (navy / teal, not purple glow) | ui-ux-pro-max a11y, open-design application focus states (swap purple→navy) | PIN / staff pick | CTAs / links | Tooth polygons | Inputs |
| **P2** | Mono for clinical numbers (FDI, mm, paise) already in DESIGN.md | ui-ux-pro-max “Dashboard Data” pairing idea — keep **JetBrains Mono**, not Fira | — | Pricing INR if shown | Working lengths | Staff IDs |
| **P2** | Optional sell polish: restrained number tick / bento density **without** glow | magicui `number-ticker`, `bento-grid` (recipe only) | — | Metrics row only if ever added — **do not redesign hero** | — | — |
| **P2** | Lenis smooth scroll | lenis | Avoid (operatory density) | Avoid for now (approved page; parallax risk) | Avoid | Avoid |

---

## Kits: borrow vs avoid

| Kit | Borrow | Avoid |
|-----|--------|-------|
| **impeccable** | Motion thesis: feedback / continuity only; 100–150ms press; exit faster than enter; `prefers-reduced-motion`; polish ≠ redesign | Focal “hero choreography”, bounce/elastic, layout-property animation |
| **ui-ux-pro-max** | 150–300ms micro-interactions; skeletons > spinners; 44px touch; Healthcare App anti-patterns (no neon, no purple AI gradients) | Soft spa neumorphism, claymorphism, glassmorphism stacks |
| **animate-ui** | Skeleton pulse pattern; idea of composable motion primitives | Pulling Motion/`framer`-backed packages into AuraSmile |
| **awesome-design-md** | Inspiration pointers (BMW precision, enterprise trust) | Copying remote brand fonts / Inter defaults |
| **open-design** | Cisco: navy trust + single signal accent; BMW: CSS variables, sparse blue, sharp engineering; Ant/application density ideas | `application` purple primary (`#9333EA`); dark cinematic Cisco as default clinical canvas (AuraSmile stays light surgical canvas) |
| **magicui** | Quiet recipes only: `number-ticker`, `bento-grid`, `marquee` (text), `dot-pattern` at whisper opacity | **Neon traps:** `neon-gradient-card`, `aurora-text`, `meteors`, `particles`, `border-beam`, `animated-beam`, `ripple`, `shimmer-button`, `warp-background`, glow/blur spectacle |
| **inspira-ui** | Registry patterns for dense dashboards (Nuxt — port ideas, not stack) | 3D / particle / scroll-hijack demos |
| **lenis** | Docs for when sell page ever needs WebGL-synced scroll | Workstation scrolling; sell homepage until product asks |
| **penpot** | SVG export hygiene for odontogram / icons | Full design-tool workflow in app runtime |

---

## Concrete CSS / Tailwind recipes (DESIGN.md-aligned)

### Motion tokens (shipped)

Implemented in `src/styles/motion.css`, imported from `src/index.css`.

```css
:root {
  --motion-duration-press: 100ms;
  --motion-duration: 150ms;
  --motion-duration-panel: 150ms;
  --motion-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --motion-press-scale: 0.98;
}
```

**Usage**

- Buttons / chips: `className="tactile-btn …"` (already widespread).
- Panel tab swaps: `className="workspace-panel"` (already on operatory shell).
- Color-only transitions: `className="motion-colors"`.
- Loading placeholders: `className="clinical-skeleton h-10 rounded-md"` (not `animate-spin`).

**Tailwind equivalents** (when not using utilities):

```txt
transition duration-150 ease-out
active:scale-[0.98]
hover:border-slate-300
focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A192F]
```

### Surfaces

```txt
bg-[#F8FAFC] text-[#0F172A]
bg-white border border-[#E2E8F0] rounded-lg shadow-sm shadow-slate-900/5
```

### Clinical alert badge

```txt
bg-[#FEF2F2] text-[#991B1B] border border-[#FCA5A5] text-xs font-semibold
```

### Reduced motion

Global rule in `motion.css` collapses spatial transforms / long loops; keep opacity/color feedback.

---

## This sprint adoption (done)

**Option A — shared motion tokens + tactile utilities**

| File | Change |
|------|--------|
| `src/styles/motion.css` | **New** — duration/easing tokens, `.tactile-btn`, `.workspace-panel`, `.motion-colors`, `.clinical-skeleton`, `.clinical-focus`, `prefers-reduced-motion` |
| `src/index.css` | Import motion sheet; remove duplicated keyframes/utilities now owned by `motion.css` |
| `docs/stack-adoptions/02-ui-ux.md` | This map |

No `package.json` changes. Sell homepage untouched.

---

## Next 3 UI wins (later sprint)

1. **P0 skeleton primitive** — tiny `src/components/ui/Skeleton.tsx` + replace StaffLockScreen “Loading roster…” text with structured roster placeholders.
2. **P0 WhatsApp icon consistency** — route CRM / WhatsAppDispatcher `MessageCircle` / `MessageSquare` through `WhatsAppIcon` (or a thin `ClinicalIcon` wrapper) without new deps.
3. **P1 odontogram press feedback** — apply `tactile-btn` / 150ms fill transition on surface polygons; keep FDI colors; add `prefers-reduced-motion` path on any SVG animation.
