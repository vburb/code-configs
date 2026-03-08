# Claude Code Configuration

Claude Code uses **two separate files** for configuration. Pay attention to where each one goes — they live in different locations.

**[Claude Code Documentation](https://code.claude.com/docs/en)**

## File Placement

```
<root>/
├── .mcp.json (`.claude.json` if at user root)    ← MCP server definitions (project-level)
└── .claude/
    ├── settings.json          ← Permissions, hooks, behavior settings (shared with team)
    ├── settings.local.json    ← Personal overrides (gitignored, not committed)
    ├── agents/                ← Subagent definitions
    │   ├── code-simplifier.md
    │   ├── codebase-search.md
    │   ├── tech-docs-writer.md
    │   └── technical-debt-manager.md
    ├── commands/              ← Slash commands (/interview)
    │   └── interview.md
    └── hooks/                 ← Python scripts that power the hooks
        ├── format-python.py
        ├── guard-dangerous-commands.py
        ├── pre-commit.py
        ├── protect-secrets.py
        └── scan-prompt-secrets.py
```

### What goes where

| Template File | Copy To | Purpose |
|---------------|---------|---------|
| `.claude.json` | `<project-root>/.mcp.json` | MCP server definitions (markitdown, context7) |
| `settings.json` | `<project-root>/.claude/settings.json` | Permissions (allow/deny/ask), hooks, `effortLevel` |
| `agents/*.md` | `<project-root>/.claude/agents/` | Custom subagent definitions |
| `commands/*.md` | `<project-root>/.claude/commands/` | Custom slash commands |
| `hooks/*.py` | `<project-root>/.claude/hooks/` | Hook scripts |

### Important: MCP config lives outside `.claude/`

The MCP server config is **not** inside `.claude/`. At the project level it goes at `<root>/.mcp.json`. At the user level it goes at `~/.claude.json`. This is different from Cursor where MCP config is at `.cursor/mcp.json`.

## Setup

1. Copy the directory and MCP config:
   ```bash
   cp -r templates/.claude .claude
   cp templates/.claude/.claude.json .mcp.json
   ```

2. Update `.mcp.json` — replace `YOUR-API-KEY-HERE` with your actual Context7 API key (or remove that server). If you plan to commit `.mcp.json` (project scope), **use environment variables instead of hardcoding secrets** — see [MCP and environment variables in project scope](#mcp-and-environment-variables-in-project-scope) below.

3. Update hook paths in `.claude/settings.json` — replace `{USER-NAME}` with your macOS username in all hook command paths, or change them to use relative paths from the project root.

## Configuration Scopes

Claude Code uses a **scope system** that determines where settings apply and who they affect. The same features (settings, agents, MCP servers, `CLAUDE.md` memory files) can be configured at different scopes, and more specific scopes override broader ones.

### Scope overview

| Scope | Location | Who it affects | Shared with team? |
|-------|----------|----------------|-------------------|
| **Managed** | Server-managed, MDM/plist, or system-level `managed-settings.json` | All users on the machine | Yes (deployed by IT) |
| **User** | `~/.claude/` directory | You, across all projects | No |
| **Project** | `.claude/` in the repo root | All collaborators on this repo | Yes (committed to git) |
| **Local** | `.claude/*.local.*` files | You, in this repo only | No (gitignored) |

### Precedence (highest → lowest)

1. **Managed** — cannot be overridden by anything below
2. **CLI arguments** — temporary session overrides (`--model`, `--append-system-prompt`, etc.)
3. **Local** (`.claude/settings.local.json`) — overrides project and user
4. **Project** (`.claude/settings.json`) — overrides user
5. **User** (`~/.claude/settings.json`) — applies when nothing more specific is set

If the same permission is *allowed* in user settings but *denied* in project settings, the project deny wins.

### What lives at each scope

| Feature | User location | Project location | Local location |
|---------|---------------|------------------|----------------|
| **Settings** | `~/.claude/settings.json` | `.claude/settings.json` | `.claude/settings.local.json` |
| **Subagents** | `~/.claude/agents/` | `.claude/agents/` | — |
| **MCP servers** | `~/.claude.json` | `.mcp.json` (repo root) | `~/.claude.json` (per-project) |
| **Memory files** | `~/.claude/CLAUDE.md` | `CLAUDE.md` or `.claude/CLAUDE.md` | `CLAUDE.local.md` |

### When to use each scope

**User scope** (`~/.claude/`) — personal preferences that follow you everywhere:
- Permissions you always want (e.g., allow `Bash(git diff *)`)
- Agents and hooks you use across all projects
- API keys stored securely in `~/.claude.json`

**Project scope** (`.claude/` in repo) — team-shared standards committed to git:
- Permission allow/deny rules the whole team should follow
- Hooks for formatting, secret scanning, dangerous-command guards
- Subagent definitions the team uses
- MCP servers everyone needs (in `.mcp.json` at repo root — use `${VAR}` syntax for secrets, never hardcode API keys in a committed file)

**Local scope** (`.claude/*.local.*`) — personal overrides for *this* repo only:
- Testing a hook before proposing it to the team
- Machine-specific paths (e.g., different Python location)
- Experimental permission changes you don't want to commit

**Managed scope** (system-level) — organizational policies that can't be overridden:
- Security rules enforced company-wide
- Compliance requirements (e.g., deny all `WebFetch`)
- Standardized configs deployed by IT via MDM or `managed-settings.json`

### Practical example

A common setup uses multiple scopes together:

```
~/.claude/
├── settings.json          ← Your global allow/deny defaults
├── agents/                ← Personal agents available everywhere
└── CLAUDE.md              ← Global memory/instructions

<project-root>/
├── .mcp.json              ← Team MCP servers (markitdown, context7)
├── CLAUDE.md              ← Project-specific instructions
└── .claude/
    ├── settings.json      ← Team permissions, hooks (committed)
    ├── settings.local.json← Your personal overrides (gitignored)
    ├── agents/            ← Team subagents (committed)
    ├── commands/          ← Team slash commands (committed)
    └── hooks/             ← Hook scripts (committed)
```

Project-level deny rules **override** user-level allow rules, so a team can enforce guardrails even if an individual's user config is more permissive.

### MCP and environment variables in project scope

Because `.mcp.json` is committed to git, **never hardcode API keys or secrets in it**. Claude Code supports environment variable expansion so you can reference secrets that each developer sets in their own shell environment.

**Supported syntax:**

- `${VAR}` — expands to the value of `VAR`; fails if unset
- `${VAR:-default}` — expands to `VAR` if set, otherwise uses `default`

**Where expansion works:** `command`, `args`, `env`, `url`, and `headers` fields.

**Example** — a team-shared `.mcp.json` that keeps secrets out of git:

```json
{
  "mcpServers": {
    "markitdown": {
      "type": "stdio",
      "command": "uvx",
      "args": ["markitdown-mcp"]
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "${CONTEXT7_API_KEY}"
      }
    }
  }
}
```

Each developer exports the key in their shell (e.g., in `~/.zshrc`):

```bash
export CONTEXT7_API_KEY="sk-..."
```

If a required variable is not set and has no default, Claude Code will fail to parse the config — so missing keys surface immediately rather than silently leaking empty values.

For servers that only *you* use or that contain credentials you don't want to share at all, add them at **local scope** (stored in `~/.claude.json`) instead of project scope. See the [Claude Code MCP docs](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json) for full details.

## Notes

- Permission rules evaluate in order: **deny > ask > allow**. Deny always wins.
- Claude Code's permission syntax differs from Cursor — uses `Bash()` not `Shell()`, `Edit()` not `Write()`, and `WebFetch(domain:example.com)` with a `domain:` prefix.
- MCP tool permissions use double-underscore format: `mcp__server__tool` (not `Mcp(server:tool)`).
- Hook paths in `settings.json` must be absolute (Claude Code doesn't support relative hook paths the same way Cursor does).

## References

- [Claude Code Permissions](https://code.claude.com/docs/en/permissions)
- [Claude Code Settings](https://code.claude.com/docs/en/settings)
- [Claude Code Hooks](https://code.claude.com/docs/en/hooks-guide)
