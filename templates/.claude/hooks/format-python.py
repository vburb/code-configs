#!/usr/bin/env python3
"""
Claude Code PostToolUse hook (Edit|Write): runs ruff format on edited Python files.
"""

import json
import subprocess
import sys
from pathlib import Path


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    file_path = input_data.get("tool_input", {}).get("file_path", "")

    if not file_path.endswith(".py"):
        sys.exit(0)

    path = Path(file_path)
    if not path.exists():
        sys.exit(0)

    # Run ruff check --fix first (lint + import sorting), then format
    try:
        subprocess.run(
            ["ruff", "check", "--fix", str(path)],
            capture_output=True,
            timeout=30,
        )
        subprocess.run(
            ["ruff", "format", "--line-length", "180", str(path)],
            capture_output=True,
            timeout=30,
        )
    except FileNotFoundError:
        # ruff not installed, skip silently
        pass
    except subprocess.TimeoutExpired:
        pass

    sys.exit(0)


if __name__ == "__main__":
    main()
