# AuraSmile OS — Supabase MCP & Agent Skills Integration Guide

This guide details the complete configuration for Supabase Model Context Protocol (MCP) and Agent Skills in **AuraSmile OS**.

---

## 1. Project Reference & Scope

* **Supabase Project Ref**: `axhmbluvfsylifsvachc`
* **Supabase Live URL**: `https://axhmbluvfsylifsvachc.supabase.co`
* **Features Enabled**: `docs, account, database, debugging, development, functions, branching`
* **Full Remote MCP URL**:
  ```
  https://mcp.supabase.com/mcp?project_ref=axhmbluvfsylifsvachc&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching
  ```

---

## 2. Configuration Files Synchronized

The MCP server has been registered across all active environments:

1. **Claude Code**: [`.mcp.json`](file:///p:/AuraSmile%20OS/.mcp.json)
2. **Antigravity IDE (Global)**: `c:\Users\Mr D Pradeep Kumar\.gemini\config\mcp_config.json`
3. **Workspace Discovery**: [`.agents/mcp_config.json`](file:///p:/AuraSmile%20OS/.agents/mcp_config.json)
4. **Workspace Plugin**: [`.agents/plugins/aurasmile-tools/mcp_config.json`](file:///p:/AuraSmile%20OS/.agents/plugins/aurasmile-tools/mcp_config.json)
5. **Cursor IDE**: [`.cursor/mcp.json`](file:///p:/AuraSmile%20OS/.cursor/mcp.json)

---

## 3. Installed Supabase Agent Skills

Installed via `npx skills add supabase/agent-skills`:

1. [`supabase`](file:///p:/AuraSmile%20OS/.agents/skills/supabase/SKILL.md): Comprehensive Supabase instructions for database queries, migrations, RLS policies, Auth, Edge functions, and storage.
2. [`supabase-postgres-best-practices`](file:///p:/AuraSmile%20OS/.agents/skills/supabase-postgres-best-practices/SKILL.md): Production SQL and PostgreSQL patterns, indexing, schema design, and security best practices.

*Also mirrored to [`.cursor/skills`](file:///p:/AuraSmile%20OS/.cursor/skills) for Cursor users.*

---

## 4. MCP Tools Available

Once authenticated via `claude /mcp`, 20 Supabase tools are active, including:
- `execute_sql`: Run queries directly on the database
- `get_project_url`, `get_publishable_keys`: Inspect project configuration
- `list_tables`, `get_schema`: Inspect table structures and schemas
- `get_advisors`: Performance, security, and schema recommendations
- `list_functions`, `list_migrations`: Edge functions and migration status
