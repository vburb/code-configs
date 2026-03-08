import type { Plugin } from "@opencode-ai/plugin"

/**
 * OpenCode plugin: scans prompts for leaked secrets before submission.
 * Blocks prompts that contain API keys, tokens, passwords, etc.
 */

// Secret patterns with names
const SECRET_PATTERNS: [RegExp, string][] = [
  // API Keys
  [/sk-[a-zA-Z0-9]{20,}/i, "OpenAI API key"],
  [/sk-proj-[a-zA-Z0-9\-_]{40,}/i, "OpenAI project API key"],
  [/sk-ant-[a-zA-Z0-9\-_]{40,}/i, "Anthropic API key"],
  [/AIza[0-9A-Za-z\-_]{35}/i, "Google API key"],
  [/AKIA[0-9A-Z]{16}/i, "AWS Access Key ID"],
  [/ghp_[a-zA-Z0-9]{30,40}/i, "GitHub Personal Access Token"],
  [/gho_[a-zA-Z0-9]{30,40}/i, "GitHub OAuth Token"],
  [/github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/i, "GitHub PAT (fine-grained)"],
  [/glpat-[a-zA-Z0-9\-_]{20,}/i, "GitLab Personal Access Token"],
  [/xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/i, "Slack Token"],
  [/https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9]{8}\/B[a-zA-Z0-9]{8,}\/[a-zA-Z0-9]{24}/i, "Slack Webhook"],
  [/sq0atp-[0-9A-Za-z\-_]{22}/i, "Square Access Token"],
  [/sq0csp-[0-9A-Za-z\-_]{43}/i, "Square OAuth Secret"],
  [/SG\.[a-zA-Z0-9]{22}\.[a-zA-Z0-9]{43}/i, "SendGrid API Key"],
  [/key-[a-zA-Z0-9]{32}/i, "Mailgun API Key"],
  [/[a-f0-9]{32}-us[0-9]{1,2}/i, "Mailchimp API Key"],
  [/sk_live_[0-9a-zA-Z]{24,}/i, "Stripe Secret Key"],
  [/rk_live_[0-9a-zA-Z]{24,}/i, "Stripe Restricted Key"],
  [/AC[a-zA-Z0-9]{32}/i, "Twilio Account SID"],
  [/np_[a-z0-9]{36}/i, "npm token"],
  [/pypi-AgEIcHlwaS5vcmc[a-zA-Z0-9\-_]{50,}/i, "PyPI API Token"],
  // Azure
  [/DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+/i, "Azure Connection String"],
  // Database connection strings
  [/postgres(ql)?:\/\/[^:]+:[^@]+@/i, "PostgreSQL connection string with password"],
  [/mysql:\/\/[^:]+:[^@]+@/i, "MySQL connection string with password"],
  [/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/i, "MongoDB connection string with password"],
  [/redis:\/\/:[^@]+@/i, "Redis connection string with password"],
  // Private keys
  [/-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/i, "Private key"],
  [/-----BEGIN PGP PRIVATE KEY BLOCK-----/i, "PGP private key"],
  // JWT with signature
  [/eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]+/i, "JWT token"],
  // Generic patterns (less specific, use with caution)
  [/password\s*[=:]\s*['"'][^'"']{8,}['"']/i, "Hardcoded password"],
  [/api[_-]?key\s*[=:]\s*['"'][a-zA-Z0-9]{16,}['"']/i, "Generic API key"],
  [/secret\s*[=:]\s*['"'][a-zA-Z0-9]{16,}['"']/i, "Generic secret"],
]

export const ScanPromptSecretsPlugin: Plugin = async () => {
  return {
    "tui.prompt.append": async (input, output) => {
      const prompt = output.prompt
      
      if (!prompt) {
        return
      }

      const foundSecrets: string[] = []

      for (const [pattern, name] of SECRET_PATTERNS) {
        if (pattern.test(prompt)) {
          foundSecrets.push(name)
        }
      }

      if (foundSecrets.length > 0) {
        const uniqueSecrets = [...new Set(foundSecrets)]
        const secretList = uniqueSecrets.map(s => `  - ${s}`).join("\n")
        
        throw new Error(
          `Potential secrets detected in prompt:\n${secretList}\n\nPlease remove sensitive data before submitting.`
        )
      }
    },
  }
}
