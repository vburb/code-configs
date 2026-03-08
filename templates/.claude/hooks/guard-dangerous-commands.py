#!/usr/bin/env python3
"""
Claude Code PreToolUse hook (Bash): blocks or warns on dangerous shell commands.
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
        sys.exit(0)

    command = input_data.get("tool_input", {}).get("command", "")

    if not command:
        sys.exit(0)

    for pattern, severity, reason in COMPILED_PATTERNS:
        if pattern.search(command):
            if severity == "block":
                print(f"Blocked dangerous command: {reason}", file=sys.stderr)
                sys.exit(2)
            elif severity == "warn":
                print(
                    json.dumps(
                        {
                            "hookSpecificOutput": {
                                "permissionDecision": "ask",
                                "permissionDecisionReason": f"Potentially dangerous: {reason}",
                            }
                        }
                    )
                )
                sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
