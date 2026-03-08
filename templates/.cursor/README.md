# Cursor IDE Configuration

Copy this entire directory to your project root as `.cursor/`.

**[Cursor Documentation](https://cursor.com/docs)**

```
.cursor/
├── cli-config.json       → Permissions (allow/deny), model defaults, web fetch allowlist
├── mcp.json              → MCP server connections
├── hooks.json            → Automation hooks (triggers for the scripts in hooks/)
├── hooks/                → Python scripts that power the hooks
│   ├── format-python.py
│   ├── guard-dangerous-commands.py
│   ├── pre-commit.py
│   ├── protect-secrets.py
│   └── scan-prompt-secrets.py
├── agents/               → Subagent definitions (code-simplifier, codebase-search, etc.)
├── commands/             → Slash commands (/interview)
└── skills/               → Skill definitions (e.g. langchain-docs-router)
```

## Where Each File Goes

All files belong in `<project-root>/.cursor/` — Cursor reads them from there automatically.

| File | Purpose | Scope |
|------|---------|-------|
| `cli-config.json` | Agent permissions (allow/deny lists for shell, read, write, web fetch, MCP) | Project-level — can also set globally at `~/.cursor/cli-config.json` |
| `mcp.json` | MCP server definitions (markitdown, context7, etc.) | Project-level — can also set globally at `~/.cursor/mcp.json` |
| `hooks.json` | Maps hook triggers to scripts (e.g. "after file edit → run ruff") | Project-level |
| `hooks/*.py` | The actual hook scripts referenced by `hooks.json` | Project-level — paths in `hooks.json` are relative to `.cursor/` |
| `agents/*.md` | Custom subagent definitions available in agent mode | Project-level |
| `commands/*.md` | Custom slash commands (e.g. `/interview`) | Project-level |
| `skills/*/SKILL.md` | Skill definitions for specialized knowledge/workflows | Project-level |

## Setup

1. Copy the directory:
2. Update `mcp.json` — replace `YOUR-API-KEY-HERE` with your actual Context7 API key (or remove that server if you don't use it). If you plan to commit `mcp.json`, **use environment variable interpolation instead of hardcoding secrets** — see [MCP config interpolation](#mcp-config-interpolation) below.
3. Review `cli-config.json` — adjust the allow/deny permissions for your project's needs.

## Configuration Scopes

Cursor supports **project-level** and **global (user-level)** configuration. Project-level settings live in `<project-root>/.cursor/` and are committed to git for team sharing. Global settings live in `~/.cursor/` and apply across all your projects.

### Scope overview

| Scope | Location | Who it affects | Shared with team? |
|-------|----------|----------------|-------------------|
| **Team** | Cursor dashboard (Team/Enterprise plans) | All team members | Yes (managed by admins) |
| **Project** | `.cursor/` in the repo root | All collaborators on this repo | Yes (committed to git) |
| **Global (User)** | `~/.cursor/` in home directory | You, across all projects | No |

### What lives at each scope

| Feature | Project location | Global location |
|---------|------------------|-----------------|
| **Permissions** | `.cursor/cli-config.json` | `~/.cursor/cli-config.json` |
| **MCP servers** | `.cursor/mcp.json` | `~/.cursor/mcp.json` |
| **Hooks** | `.cursor/hooks.json` | — |
| **Rules** | `.cursor/rules/` | Cursor Settings → Rules |
| **Agents** | `.cursor/agents/` | — |
| **Agent instructions** | `AGENTS.md` (repo root or subdirectories) | — |

### When to use each scope

**Project scope** (`.cursor/` in repo) — team-shared config committed to git:
- Permissions the whole team should follow
- MCP servers everyone needs (use `${env:NAME}` for secrets — never hardcode API keys)
- Hooks for formatting and safety
- Rules for coding standards and architecture decisions
- Subagent and skill definitions

**Global scope** (`~/.cursor/`) — personal settings across all projects:
- Your baseline permissions (e.g., allow `Shell(git)`)
- MCP servers you use everywhere (personal API keys stay local)
- User rules for preferred communication style

**Team scope** (dashboard) — organization-wide standards (Team/Enterprise):
- Enforced rules that team members cannot disable
- Applied with highest precedence (Team Rules → Project Rules → User Rules)

### Rules and AGENTS.md

In addition to `.cursor/` config files, Cursor supports two other ways to provide agent instructions:

- **`.cursor/rules/`** — structured rule files (`.md` or `.mdc`) with optional frontmatter for `description`, `globs`, and `alwaysApply`. Rules can be always-on, agent-decided, file-pattern-scoped, or manually invoked via `@rule-name`.
- **`AGENTS.md`** — a plain markdown file at the repo root (or in subdirectories) for straightforward agent instructions without metadata. Nested `AGENTS.md` files combine with parent directories, with more specific instructions taking precedence.

See the [Cursor Rules docs](https://cursor.com/docs/context/rules) for details.

## MCP Config Interpolation

Because `.cursor/mcp.json` is committed to git, if you have it at project level, **never hardcode API keys or secrets in it**. Cursor supports config interpolation so you can reference secrets that each developer sets in their own shell environment.

**Supported syntax:**

| Variable | Description |
|----------|-------------|
| `${env:NAME}` | Environment variable (e.g., `${env:API_KEY}`) |
| `${workspaceFolder}` | Project root (the folder containing `.cursor/mcp.json`) |
| `${workspaceFolderBasename}` | Name of the project root folder |
| `${userHome}` | Path to your home directory |
| `${pathSeparator}` or `${/}` | OS path separator |

**Where interpolation works:** `command`, `args`, `env`, `url`, and `headers` fields.

**Example** — a team-shared `mcp.json` that keeps secrets out of git:

```json
{
  "mcpServers": {
    "markitdown": {
      "type": "stdio",
      "command": "uvx",
      "args": ["markitdown-mcp"]
    },
    "context7": {
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}"
      }
    }
  }
}
```

Each developer exports the key in their shell (e.g., in `~/.zshrc`):

```bash
export CONTEXT7_API_KEY="sk-..."
```

For stdio servers, you can also use `envFile` to load variables from a `.env` file (remote servers don't support `envFile` — use `${env:NAME}` instead):

```json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "envFile": "${workspaceFolder}/.env"
    }
  }
}
```

See the [Cursor MCP docs](https://cursor.com/docs/context/mcp#config-interpolation) for full details.

## Notes

- `cli-config.json` permissions are **best-effort** — Cursor's docs note that bypasses are possible (e.g. command chaining). The hooks in `hooks/` provide a stronger safety layer.
- Deny rules take precedence over allow rules.
- Cursor's permission syntax differs from Claude Code — uses `Shell()` not `Bash()`, `Write()` not `Edit()`, and `Mcp(server:tool)` not `mcp__server__tool`.
- MCP servers can also be configured through the Cursor UI: `Cmd+,` → Tools & MCP.
- Cursor must be restarted after changing `mcp.json`.
- Hook script paths in `hooks.json` are relative to the `.cursor/` directory.

## References

- [Cursor Permissions Docs](https://cursor.com/docs/cli/reference/permissions)
- [Cursor MCP Docs](https://cursor.com/docs/context/mcp)
- [Cursor Rules Docs](https://cursor.com/docs/context/rules)
- [Cursor Hooks Docs](https://cursor.com/docs/agent/hooks)
- [Cursor Agent Security](https://cursor.com/docs/agent/security)
