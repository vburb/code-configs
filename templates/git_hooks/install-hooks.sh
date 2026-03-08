#!/usr/bin/env bash
# Installs git hooks from templates/git_hooks/ into .git/hooks/.
# Run from the project root: bash templates/git_hooks/install-hooks.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$(git rev-parse --show-toplevel)/.git/hooks"

HOOKS=(pre-commit pre-push)

for hook in "${HOOKS[@]}"; do
    src="$SCRIPT_DIR/$hook"
    dest="$HOOKS_DIR/$hook"

    if [[ ! -f "$src" ]]; then
        echo "[install-hooks] WARNING: $src not found — skipping."
        continue
    fi

    cp "$src" "$dest"
    chmod +x "$dest"
    echo "[install-hooks] Installed $hook → $dest"
done

echo "[install-hooks] Done."
