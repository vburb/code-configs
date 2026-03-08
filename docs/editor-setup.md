# Editor Setup

Template configurations for VS Code, Cursor, and Claude Code live in the `templates/` directory. Copy the ones relevant to your editor into your project root.

## VS Code / Cursor

**Source:** `templates/vscode/settings.json` → copy to `.vscode/settings.json`

Configures Ruff as the Python formatter and linter with format-on-save enabled.

```json
{
    "[python]": {
        "editor.formatOnType": true,
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.formatOnSave": true,
        "editor.formatOnPaste": true,
        "editor.codeActionsOnSave": {
            "source.fixAll.ruff": "explicit",
            "source.organizeImports": "explicit"
        },
        "editor.showUnused": true
    },
    "ruff.enable": true,
    "ruff.lineLength": 180
}
```

**Required extension:** [Ruff](https://marketplace.visualstudio.com/items?itemName=charliermarsh.ruff) (`charliermarsh.ruff`)

> **Note:** Line length in `settings.json` controls the editor's display behavior. The authoritative line length is set in `pyproject.toml` under `[tool.ruff]` and is what the CLI and CI use.

## Cursor AI Config

**Source:** `templates/.cursor/` → copy to `.cursor/`

Includes:

| File/Directory | Purpose |
|----------------|---------|
| `cli-config.json` | Permissions, model defaults, allowed domains for web fetch |
| `hooks.json` | Automation hooks (see below) |
| `mcp.json` | MCP server connections (markitdown, context7) |
| `agents/` | Subagent definitions — code-simplifier, codebase-search, tech-docs-writer, technical-debt-manager |
| `commands/` | Slash commands — `/interview` for deep-dive implementation specs |
| `hooks/` | Python scripts that power the hooks |
| `skills/` | Skill definitions (e.g. LangChain docs router) |

### Hooks

Hooks run automatically during Cursor interactions:

| Trigger | Script | What It Does |
|---------|--------|--------------|
| After file edit | `format-python.py` | Runs `ruff format` + `ruff check --fix` on edited `.py` files |
| Before shell execution | `guard-dangerous-commands.py` | Blocks or warns on destructive commands (`rm -rf`, `git push --force`, etc.) |
| Before file read | `protect-secrets.py` | Prevents reading `.env`, credentials, and key files |
| Before prompt submit | `scan-prompt-secrets.py` | Blocks prompts that contain secrets or API keys |

## Claude Code Config

**Source:** `templates/.claude/` → copy to `.claude/`

Mirrors the Cursor config with equivalent hooks, agents, commands, and MCP server definitions. The Python hook scripts are identical — only the configuration file format differs (Claude uses `settings.json` instead of `hooks.json`).
