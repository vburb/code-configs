# Git Hooks

Two hooks are provided. Both are **warn-and-skip** when ruff is missing,
so they won't block collaborators who haven't installed it yet.

## Prerequisites

Both hooks require [ruff](https://docs.astral.sh/ruff/). If ruff is not
installed the hooks will warn and exit cleanly (non-blocking), but no checks
will run.

```bash
pip install ruff        # pip
uv add ruff --dev       # uv
brew install ruff       # macOS Homebrew
```

## Installation

**One-liner** (from your project root):
```bash
bash templates/git_hooks/install-hooks.sh
```

**Or manually:**
```bash
cp templates/git_hooks/pre-commit  .git/hooks/pre-commit
cp templates/git_hooks/pre-push    .git/hooks/pre-push
chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

---

## `pre-commit`

Runs before every `git commit`. Checks **staged `.py` files only**
(fast — only touches what's changing).

| Check | Tool | Auto-fix? |
|-------|------|-----------|
| Format | `ruff format --check` | No — prints fix command |
| Lint | `ruff check` | No — prints fix command |

**Skip for one commit:**
```bash
SKIP_RUFF=1 git commit -m "wip: quick save"
```

---

## `pre-push`

Runs before every `git push`. Checks the **entire repo** to validate the full
committed state (does NOT auto-fix — prints instructions instead).

| Check | Tool | Auto-fix? |
|-------|------|-----------|
| Format | `ruff format --check .` | No — prints fix command |
| Lint | `ruff check .` | No — prints fix command |

**Skip ruff:**
```bash
SKIP_RUFF=1 git push   # emergency escape hatch
```

---

## Uninstallation

To remove a hook, delete it from `.git/hooks/`:

```bash
rm .git/hooks/pre-commit   # remove pre-commit hook
rm .git/hooks/pre-push     # remove pre-push hook
```

This is safe — it only removes the hook scripts, not any Git data or history.
Hooks can always be reinstalled later by copying the templates back.

---

## Customization

- **Change what files are linted:** edit the `grep -E '\.py$'` pattern in `pre-commit`.
- **Add mypy:** insert `mypy .` after the ruff checks in `pre-push`.
- **Add pytest:** add a pytest block to `pre-push` if you want tests to run before pushing.
- **Use a different config:** hooks pick up `ruff.toml` or `pyproject.toml` from
  your project root automatically — no changes needed in the hook scripts.
