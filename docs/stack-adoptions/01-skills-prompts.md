# Skills & prompts adoption — AuraSmile OS

Mined from `P:\crazy-ai-stack\10-skills-prompts-core`. Goal: co-founder productivity on a Vite+React+TS+Tailwind SPA with Supabase Auth/RLS, sell funnel + live workstation — **without** rewriting product features or duplicating user-global Fable/Karpathy skills.

**Already present (user-global, do not reinstall):** `karpathy-guidelines`, Fable pack (`fable-scope-guard`, `fable-no-gold-plating`, …), Cursor built-ins (review-security, split-to-prs, …).

**Installed this pass (project-local):** see § Adopted installs below.

---

## Top adoptions (ranked)

### P0 — use next week

| # | Adoption | Source | Why AuraSmile | How to use next week |
| --- | --- | --- | --- | --- |
| 1 | **karpathy-guidelines** (project-local) | `andrej-karpathy-skills/skills/karpathy-guidelines/` | Stops agent sprawl across sell funnel / workstation / auth; matches “do not rewrite features” after security harden | Keep enabled in project `.cursor/skills`. Prompt: “follow karpathy-guidelines — surgical change only” on any App/clinicAuth-adjacent work |
| 2 | **grill-with-docs** | `mattpocock-skills/skills/engineering/grill-with-docs/` | Pan-India multi-clinic domain is jargon-heavy (FDI, RCT, paise, clinic vs org, chairside vs sell). Shared `CONTEXT.md` cuts misbuilds | Before next non-trivial feature: `/grill-with-docs` or “grill this against CONTEXT.md”. Create root `CONTEXT.md` lazily on first session |
| 3 | **emil-design-eng** | `emilkowalski-skills/skills/emil-design-eng/` | Sell funnel + workstation need crisp motion (DESIGN.md motion 5/10); kills `ease-in` enter / `transition: all` slop | On UI polish PRs: “review with emil-design-eng” — demand Before/After table; skip animating high-frequency chairside actions |
| 4 | **ce-plan** (invoke from stack; not full plugin) | `compound-engineering-plugin/.../skills/ce-plan/` | Shipping discipline for cross-cutting work (RLS + UI) without Spec-Kit ceremony | “Plan this like ce-plan” → write `docs/plans/<feature>.md` with files, risks, test scenarios; then implement. Pointers: `docs/stack-adoptions/skills/deferred-pointers.md` |
| 5 | **diagnose** (deferred install) | `mattpocock-skills/skills/engineering/diagnose/` | Auth/RLS and live workstation bugs need a pass/fail loop, not shotgun fixes | On next stubborn bug: “use diagnose — build feedback loop first” (test / curl / Playwright). Install skill when used twice |

### P1 — high value, schedule

| # | Adoption | Source | Why AuraSmile | How to use next week |
| --- | --- | --- | --- | --- |
| 6 | **tdd** | `mattpocock-skills/skills/engineering/tdd/` | Paise/INR, consent, odontogram — behavior must survive refactors | Vertical red→green on one billing or consent rule; do **not** write a bulk test suite first |
| 7 | **ce-compound** | `compound-engineering-plugin/.../skills/ce-compound/` | Security-harden lessons must compound for the next agent | After next incident/review: one short compound note under `docs/learnings/` |
| 8 | **DESIGN.md + design-md refresh** | Repo `DESIGN.md` + `stitch-skills/skills/design-md/` | Clinical navy system already exists; keep agents on-brand | Paste `DESIGN.md` into UI prompts. Re-run design-md **only** if Stitch MCP is available and screens change |
| 9 | **find-animation-opportunities** / **review-animations** | `emilkowalski-skills/skills/` | Audit sell funnel without animating odontogram/hot paths | One pass on marketing/sell screens only; leave workstation dense and snappy |

### P2 — optional / niche

| # | Adoption | Source | Why AuraSmile | How to use next week |
| --- | --- | --- | --- | --- |
| 10 | **taste-skill** (landing only) | `taste-skill/skills/taste-skill/` | Anti-slop for public marketing pages | Explicitly scope: “landing only; respect DESIGN.md clinical bans” |
| 11 | **prototype** (emil) | `emilkowalski-skills/skills/prototype/` | Compare 2–3 sell CTA layouts before committing | One prototype session for funnel CTA; switcher pattern |
| 12 | **product-demand-research** / **competitor-social-research** | `social-media-research-skills/skills/` | GTM for pan-India dental clinics | Marketing week only — not engineering default |

---

## Skip list (noise / duplicate / wrong fit)

| Package / skill | Reason to skip |
| --- | --- |
| **User Fable skills** (scope-guard, no-gold-plating, grounded-progress, …) | Already global; overlaps Karpathy simplicity — do not copy into project |
| **ai-engineering-hub** | Demo zoo (RAG, podcasts, agents) — not AuraSmile product path |
| **ai-stack-core** | Local OmniRoute gateway + `.env` — ops for free models, not product skills; **never copy secrets** |
| **architecture-as-code (CALM)** | Java/enterprise architecture-as-code — wrong stack for Vite SPA |
| **book-to-skill** | Meta converter; only if co-founders ingest a dental-ops book later |
| **spec-kit full CLI** | Heavy Spec-Driven process; mattpocock `grill-with-docs` + `ce-plan` cover 80% with less lock-in |
| **compound-engineering full plugin** (37 skills / 51 agents) | Install via Cursor marketplace later if wanted; cherry-pick ce-plan/debug/compound for now |
| **stitch react-components / remotion / shadcn-ui** | Assumes Stitch MCP + scripts that touch App entry; conflicts with “don’t edit App.tsx unless required” |
| **prompts-hub `system_prompts.md`** | Generic personas + dark-mode bias; conflicts with clinical DESIGN.md |
| **apple-design / brutalist / soft-skill (taste)** | Aesthetic packs fight clinical navy workstation |
| **social-media Scrapecreators / ad-library** | Needs API keys; marketing tooling, not core eng |
| **ce-dhh-rails-style / ce-test-xcode** | Wrong platform |
| **karpathy duplicate from stack into user skills** | Already at `~\.cursor\skills\karpathy-guidelines` — project copy is enough |

---

## Adopted installs (this pass)

| Skill | Path written | Status |
| --- | --- | --- |
| karpathy-guidelines | `P:\AuraSmile OS\.cursor\skills\karpathy-guidelines\SKILL.md` | **Adopted** (project-local copy; was user-global only) |
| grill-with-docs (+ CONTEXT/ADR formats) | `P:\AuraSmile OS\.cursor\skills\grill-with-docs\` | **Adopted** |
| emil-design-eng | `P:\AuraSmile OS\.cursor\skills\emil-design-eng\SKILL.md` | **Adopted** |
| ce-plan / tdd / diagnose / … | `docs/stack-adoptions/skills/deferred-pointers.md` | **Deferred** (pointers only) |

No edits to `App.tsx`, migrations, SellHomePage, PractoHomeDashboard, clinicAuth, or `package.json`.

---

## Next-week playbook (co-founder)

1. **Monday — domain:** Run grill-with-docs on “clinic vs organization vs dentist user” → start `CONTEXT.md`.
2. **Mid-week — feature:** For the next real feature, produce a ce-plan-style `docs/plans/…` then implement under karpathy-guidelines.
3. **UI pass:** One emil-design-eng review on sell funnel only; leave chairside motion minimal per DESIGN.md.
4. **Bug day:** Use diagnose loop before touching auth/RLS again.
5. **Friday — compound:** One short learning note if something non-obvious was fixed.
