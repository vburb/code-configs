#!/usr/bin/env python3
"""
Cursor beforeShellExecution hook: runs Python typecheck and lint before git commit.
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
        output_deny(f"Invalid JSON input: {e}")
        sys.exit(2)

    command = input_data.get("command", "")
    cwd = input_data.get("cwd", os.getcwd())

    if "git commit" not in command:
        output_allow()
        sys.exit(0)

    # Resolve cwd - may be relative to workspace
    workspace_roots = input_data.get("workspace_roots", [])
    if workspace_roots and not os.path.isabs(cwd):
        cwd = os.path.join(workspace_roots[0], cwd) if workspace_roots else cwd

    project_root = Path(cwd)
    if not project_root.exists():
        output_deny(f"Working directory not found: {cwd}")
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
        output_allow()
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
        output_deny("\n\n".join(errors))
        sys.exit(2)

    output_allow()
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


def output_allow() -> None:
    print(json.dumps({"permission": "allow"}))


def output_deny(reason: str) -> None:
    message = f"Pre-commit checks failed. Commit blocked.\n\n{reason}"
    print(
        json.dumps(
            {
                "permission": "deny",
                "user_message": message,
                "agent_message": f"Commit blocked: {reason[:200]}...",
            }
        )
    )


if __name__ == "__main__":
    main()
