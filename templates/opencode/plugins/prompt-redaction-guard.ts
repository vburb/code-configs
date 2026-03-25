import type { Plugin } from "@opencode-ai/plugin"

type SecretPattern = {
  pattern: RegExp
  name: string
}

const SECRET_PATTERNS: SecretPattern[] = [
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: "OpenAI API key" },
  { pattern: /sk-proj-[a-zA-Z0-9\-_]{40,}/g, name: "OpenAI project API key" },
  { pattern: /sk-ant-[a-zA-Z0-9\-_]{40,}/g, name: "Anthropic API key" },
  { pattern: /AIza[0-9A-Za-z\-_]{35}/g, name: "Google API key" },
  { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS Access Key ID" },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: "GitHub Personal Access Token" },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: "GitHub OAuth Token" },
  {
    pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
    name: "GitHub PAT (fine-grained)",
  },
  { pattern: /glpat-[a-zA-Z0-9\-_]{20,}/g, name: "GitLab Personal Access Token" },
  {
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g,
    name: "Slack Token",
  },
  {
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9]{8}\/B[a-zA-Z0-9]{8,}\/[a-zA-Z0-9]{24}/g,
    name: "Slack Webhook",
  },
  { pattern: /sq0atp-[0-9A-Za-z\-_]{22}/g, name: "Square Access Token" },
  { pattern: /sq0csp-[0-9A-Za-z\-_]{43}/g, name: "Square OAuth Secret" },
  { pattern: /SG\.[a-zA-Z0-9]{22}\.[a-zA-Z0-9]{43}/g, name: "SendGrid API Key" },
  { pattern: /key-[a-zA-Z0-9]{32}/g, name: "Mailgun API Key" },
  { pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g, name: "Mailchimp API Key" },
  { pattern: /sk_live_[0-9a-zA-Z]{24,}/g, name: "Stripe Secret Key" },
  { pattern: /rk_live_[0-9a-zA-Z]{24,}/g, name: "Stripe Restricted Key" },
  { pattern: /AC[a-zA-Z0-9]{32}/g, name: "Twilio Account SID" },
  { pattern: /np_[a-z0-9]{36}/g, name: "npm token" },
  { pattern: /pypi-AgEIcHlwaS5vcmc[a-zA-Z0-9\-_]{50,}/g, name: "PyPI API Token" },
  {
    pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+/g,
    name: "Azure Connection String",
  },
  {
    pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@/g,
    name: "PostgreSQL connection string with password",
  },
  { pattern: /mysql:\/\/[^:]+:[^@]+@/g, name: "MySQL connection string with password" },
  {
    pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/g,
    name: "MongoDB connection string with password",
  },
  { pattern: /redis:\/\/:[^@]+@/g, name: "Redis connection string with password" },
  {
    pattern: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    name: "Private key",
  },
  { pattern: /-----BEGIN PGP PRIVATE KEY BLOCK-----/g, name: "PGP private key" },
  {
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+/g,
    name: "JWT token",
  },
  {
    pattern: /password\s*[=:]\s*['"][^'"]{8,}['"]/g,
    name: "Hardcoded password",
  },
  {
    pattern: /api[_-]?key\s*[=:]\s*['"][a-zA-Z0-9]{16,}['"]/g,
    name: "Generic API key",
  },
  {
    pattern: /secret\s*[=:]\s*['"][a-zA-Z0-9]{16,}['"]/g,
    name: "Generic secret",
  },
]

const redactText = (text: string, findings: Set<string>) => {
  let redacted = text

  for (const item of SECRET_PATTERNS) {
    item.pattern.lastIndex = 0
    if (!item.pattern.test(redacted)) {
      continue
    }

    findings.add(item.name)
    item.pattern.lastIndex = 0
    redacted = redacted.replace(item.pattern, `[REDACTED:${item.name}]`)
  }

  return redacted
}

const redactInPlace = (
  node: unknown,
  findings: Set<string>,
  visited: WeakSet<object>,
): unknown => {
  if (typeof node === "string") {
    return redactText(node, findings)
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = redactInPlace(node[i], findings, visited)
    }
    return node
  }

  if (node && typeof node === "object") {
    if (visited.has(node)) {
      return node
    }

    visited.add(node)
    const record = node as Record<string, unknown>
    for (const key of Object.keys(record)) {
      record[key] = redactInPlace(record[key], findings, visited)
    }
  }

  return node
}

const sanitize = (target: unknown) => {
  const findings = new Set<string>()
  redactInPlace(target, findings, new WeakSet<object>())
  return [...findings]
}

export const PromptSecretGuardPlugin: Plugin = async ({ client }) => {
  return {
    "chat.message": async (input, output) => {
      const findings = sanitize(output.parts)
      if (findings.length === 0) {
        return
      }

      await client.app.log({
        body: {
          service: "prompt-secret-guard",
          level: "warn",
          message: "Redacted secrets from outgoing chat parts",
          extra: {
            sessionID: input.sessionID,
            findings,
          },
        },
      })
    },
    "experimental.chat.messages.transform": async (_input, output) => {
      sanitize(output.messages)
    },
  }
}
