#!/usr/bin/env python3
"""
Claude Code PreToolUse hook (Bash): runs Python typecheck and lint before git commit.
Blocks the commit if either check fails. Only runs for Python projects.
"""

import json
import os
import subprocess
import sys
from pathlib import Path


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(f"Invalid JSON input: {e}", file=sys.stderr)
        sys.exit(2)

    command = input_data.get("tool_input", {}).get("command", "")
    cwd = input_data.get("cwd", os.getcwd())

    if "git commit" not in command:
        sys.exit(0)

    project_root = Path(cwd)
    if not project_root.exists():
        print(f"Working directory not found: {cwd}", file=sys.stderr)
        sys.exit(2)

    # Run checks (configurable via env vars)
    typecheck_cmd = os.environ.get("PRECOMMIT_TYPECHECK_CMD")
    lint_cmd = os.environ.get("PRECOMMIT_LINT_CMD")

    if not typecheck_cmd or not lint_cmd:
        detected_typecheck, detected_lint = _detect_commands(project_root)
        typecheck_cmd = typecheck_cmd or detected_typecheck
        lint_cmd = lint_cmd or detected_lint

    if not typecheck_cmd and not lint_cmd:
        # No checks configured, allow commit
        sys.exit(0)

    errors: list[str] = []

    if typecheck_cmd:
        result = subprocess.run(
            typecheck_cmd,
            shell=True,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            errors.append(f"Typecheck failed:\n{result.stdout or result.stderr}")

    if lint_cmd:
        result = subprocess.run(
            lint_cmd,
            shell=True,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            errors.append(f"Lint failed:\n{result.stdout or result.stderr}")

    if errors:
        message = "Pre-commit checks failed. Commit blocked.\n\n" + "\n\n".join(errors)
        print(message, file=sys.stderr)
        sys.exit(2)

    sys.exit(0)


def _detect_commands(project_root: Path) -> tuple[str | None, str | None]:
    """Auto-detect Python typecheck and lint commands from project config."""
    typecheck_cmd: str | None = None
    lint_cmd: str | None = None

    has_python = bool(list(project_root.glob("*.py")))
    if not has_python:
        return (None, None)

    # Typecheck: prefer mypy if config exists, else pyright
    if (project_root / "mypy.ini").exists() or (project_root / "pyproject.toml").exists():
        typecheck_cmd = "python -m mypy ."
    else:
        typecheck_cmd = "python -m pyright ."

    # Lint: ruff
    lint_cmd = "ruff check ."

    return (typecheck_cmd, lint_cmd)


if __name__ == "__main__":
    main()
