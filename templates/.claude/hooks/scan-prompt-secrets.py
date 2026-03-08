#!/usr/bin/env python3
"""
Claude Code UserPromptSubmit hook: scans prompts for leaked secrets before submission.
Blocks prompts that contain API keys, tokens, passwords, etc.
"""

import json
import re
import sys

# Secret patterns with names
SECRET_PATTERNS = [
    # API Keys
    (r"sk-[a-zA-Z0-9]{20,}", "OpenAI API key"),
    (r"sk-proj-[a-zA-Z0-9\-_]{40,}", "OpenAI project API key"),
    (r"sk-ant-[a-zA-Z0-9\-_]{40,}", "Anthropic API key"),
    (r"AIza[0-9A-Za-z\-_]{35}", "Google API key"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
    (r"gho_[a-zA-Z0-9]{36}", "GitHub OAuth Token"),
    (r"github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}", "GitHub PAT (fine-grained)"),
    (r"glpat-[a-zA-Z0-9\-_]{20,}", "GitLab Personal Access Token"),
    (r"xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}", "Slack Token"),
    (r"https://hooks\.slack\.com/services/T[a-zA-Z0-9]{8}/B[a-zA-Z0-9]{8,}/[a-zA-Z0-9]{24}", "Slack Webhook"),
    (r"sq0atp-[0-9A-Za-z\-_]{22}", "Square Access Token"),
    (r"sq0csp-[0-9A-Za-z\-_]{43}", "Square OAuth Secret"),
    (r"SG\.[a-zA-Z0-9]{22}\.[a-zA-Z0-9]{43}", "SendGrid API Key"),
    (r"key-[a-zA-Z0-9]{32}", "Mailgun API Key"),
    (r"[a-f0-9]{32}-us[0-9]{1,2}", "Mailchimp API Key"),
    (r"sk_live_[0-9a-zA-Z]{24,}", "Stripe Secret Key"),
    (r"rk_live_[0-9a-zA-Z]{24,}", "Stripe Restricted Key"),
    (r"AC[a-zA-Z0-9]{32}", "Twilio Account SID"),
    (r"np_[a-z0-9]{36}", "npm token"),
    (r"pypi-AgEIcHlwaS5vcmc[a-zA-Z0-9\-_]{50,}", "PyPI API Token"),
    # Azure (removed overly broad base64 pattern)
    (r"DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+", "Azure Connection String"),
    # Database connection strings
    (r"postgres(ql)?://[^:]+:[^@]+@", "PostgreSQL connection string with password"),
    (r"mysql://[^:]+:[^@]+@", "MySQL connection string with password"),
    (r"mongodb(\+srv)?://[^:]+:[^@]+@", "MongoDB connection string with password"),
    (r"redis://:[^@]+@", "Redis connection string with password"),
    # Private keys
    (r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "Private key"),
    (r"-----BEGIN PGP PRIVATE KEY BLOCK-----", "PGP private key"),
    # JWT with signature
    (r"eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+", "JWT token"),
    # Generic patterns (less specific, use with caution)
    (r"password\s*[=:]\s*['\"][^'\"]{8,}['\"]", "Hardcoded password"),
    (r"api[_-]?key\s*[=:]\s*['\"][a-zA-Z0-9]{16,}['\"]", "Generic API key"),
    (r"secret\s*[=:]\s*['\"][a-zA-Z0-9]{16,}['\"]", "Generic secret"),
]

# Compile patterns
COMPILED_PATTERNS = [(re.compile(p, re.IGNORECASE), name) for p, name in SECRET_PATTERNS]


def main() -> None:
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    prompt = input_data.get("prompt", "")

    if not prompt:
        sys.exit(0)

    found_secrets: list[str] = []

    for pattern, name in COMPILED_PATTERNS:
        if pattern.search(prompt):
            found_secrets.append(name)

    if found_secrets:
        unique_secrets = list(set(found_secrets))
        secret_list = "\n  - ".join(unique_secrets)
        print(
            f"Potential secrets detected in prompt:\n  - {secret_list}\n\nPlease remove sensitive data before submitting.",
            file=sys.stderr,
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
