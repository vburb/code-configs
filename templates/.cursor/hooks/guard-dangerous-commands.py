#!/usr/bin/env python3
"""
Cursor beforeShellExecution hook: blocks or warns on dangerous shell commands.
"""

import json
import re
import sys

# Dangerous patterns with severity and reason
DANGEROUS_PATTERNS = [
    # Destructive file operations
    (r"rm\s+(-[rf]+\s+)*(/|~|\$HOME|\*)", "block", "Destructive rm on root/home/wildcard"),
    (r"rm\s+-rf\s+\.", "block", "Recursive delete in current directory"),
    (r">\s*/dev/sd[a-z]", "block", "Writing directly to disk device"),
    (r"mkfs\.", "block", "Formatting filesystem"),
    (r"dd\s+.*of=/dev/", "block", "dd writing to device"),
    # Database destructive operations
    (r"DROP\s+(DATABASE|TABLE|SCHEMA)", "block", "DROP statement"),
    (r"TRUNCATE\s+TABLE", "block", "TRUNCATE statement"),
    (r"DELETE\s+FROM\s+\w+\s*(;|$)", "warn", "DELETE without WHERE clause"),
    # Production/deployment risks
    (r"--force\s+push|push\s+.*--force|-f\s+origin\s+(main|master)", "warn", "Force push to main/master"),
    (r"kubectl\s+delete\s+.*--all", "block", "kubectl delete --all"),
    (r"terraform\s+destroy", "warn", "Terraform destroy"),
    # Credential exposure
    (r"curl.*(-u|--user)\s+\S+:\S+", "warn", "Credentials in curl command"),
    (r"echo\s+.*password", "warn", "Echoing password"),
    # System modification
    (r"chmod\s+777", "warn", "chmod 777 (world-writable)"),
    (r"chown\s+.*root", "warn", "Changing ownership to root"),
    (r"sudo\s+rm", "warn", "sudo rm"),
]

# Compile patterns
COMPILED_PATTERNS = [(re.compile(p, re.IGNORECASE), sev, reason) for p, sev, reason in DANGEROUS_PATTERNS]


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        output_allow()
        sys.exit(0)

    command = input_data.get("command", "")

    if not command:
        output_allow()
        sys.exit(0)

    for pattern, severity, reason in COMPILED_PATTERNS:
        if pattern.search(command):
            if severity == "block":
                output_deny(f"Blocked dangerous command: {reason}")
                sys.exit(2)
            elif severity == "warn":
                output_ask(f"Potentially dangerous: {reason}")
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
                "agent_message": f"Command blocked by safety hook: {reason}",
            }
        )
    )


def output_ask(reason: str) -> None:
    """Prompt user for confirmation."""
    print(
        json.dumps(
            {
                "permission": "ask",
                "user_message": f"⚠️ {reason}\nDo you want to proceed?",
            }
        )
    )


if __name__ == "__main__":
    main()
