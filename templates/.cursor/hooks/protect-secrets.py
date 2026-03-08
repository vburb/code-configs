#!/usr/bin/env python3
"""
Cursor beforeReadFile hook: blocks reading of sensitive files.
Uses fail-closed behavior (if hook fails, read is blocked).
"""

import json
import re
import sys
from pathlib import Path

# Patterns for sensitive files/directories
BLOCKED_PATTERNS = [
    r"\.env$",
    r"\.env\.[a-z]+$",  # .env.local, .env.production, etc.
    r"\.pem$",
    r"\.key$",
    r"\.p12$",
    r"\.pfx$",
    r"\.jks$",
    r"id_rsa",
    r"id_ed25519",
    r"id_ecdsa",
    r"id_dsa",
    r"credentials\.json$",
    r"service[-_]?account.*\.json$",
    r"secrets?\.ya?ml$",
    r"secrets?\.json$",
    r"\.netrc$",
    r"\.npmrc$",
    r"\.pypirc$",
    r"/\.aws/",
    r"/\.ssh/",
    r"/\.gnupg/",
    r"/secrets?/",
    r"kubeconfig",
    r"\.kube/config",
]

# Compile patterns for performance
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in BLOCKED_PATTERNS]


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        output_deny("Invalid JSON input")
        sys.exit(0)

    file_path = input_data.get("file_path", "")

    if not file_path:
        output_allow()
        sys.exit(0)

    # Normalize path for pattern matching
    normalized = file_path.replace("\\", "/")

    for pattern in COMPILED_PATTERNS:
        if pattern.search(normalized):
            output_deny(f"Blocked: '{Path(file_path).name}' matches sensitive file pattern.\nThis file may contain secrets and should not be sent to the model.")
            sys.exit(0)

    output_allow()
    sys.exit(0)


def output_allow() -> None:
    print(json.dumps({"permission": "allow"}))


def output_deny(reason: str) -> None:
    print(
        json.dumps(
            {
                "permission": "deny",
                "user_message": reason,
            }
        )
    )


if __name__ == "__main__":
    main()
