# Deferred skill pointers (AuraSmile)

Not installed as project Cursor skills (plugin weight / overlap). Invoke from the stack path, or ask the agent to install one next week.

| Skill | Source | When to pull in |
| --- | --- | --- |
| **ce-plan** | `P:\crazy-ai-stack\10-skills-prompts-core\compound-engineering-plugin\plugins\compound-engineering\skills\ce-plan\` | Multi-step feature spanning sell funnel + workstation + RLS — need a durable HOW plan before code |
| **ce-debug** | `...\skills\ce-debug\` | Auth/RLS or chairside bugs after a failed fix attempt |
| **ce-compound** | `...\skills\ce-compound\` | After a hard lesson (e.g. security harden) — write a reusable note so the next agent doesn't rediscover it |
| **tdd** | `P:\crazy-ai-stack\10-skills-prompts-core\mattpocock-skills\skills\engineering\tdd\` | Billing/paise math, consent, odontogram edge cases — vertical red→green slices |
| **diagnose** | `...\skills\engineering\diagnose\` | Flaky Supabase session, race in live workstation — build a fast pass/fail loop first |
| **spec-kit** | `P:\crazy-ai-stack\10-skills-prompts-core\spec-kit\` | Only if co-founders want full Spec-Driven CLI (`uv tool install specify-cli`) — heavier than grill-with-docs |
| **taste-skill** | `P:\crazy-ai-stack\10-skills-prompts-core\taste-skill\skills\taste-skill\` | Marketing/landing polish only; **do not** apply to clinical workstation (conflicts with `DESIGN.md`) |

## Installed instead (project-local)

See `P:\AuraSmile OS\.cursor\skills\`:

- `karpathy-guidelines` — surgical / anti-bloat defaults
- `grill-with-docs` — domain language + ADRs before big features
- `emil-design-eng` — motion/UI polish aligned with clinical density
