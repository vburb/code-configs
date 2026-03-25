import type { Plugin } from "@opencode-ai/plugin"

type Severity = "block" | "warn"

type DangerousPattern = {
  regex: RegExp
  severity: Severity
  reason: string
}

const DANGEROUS_PATTERNS: DangerousPattern[] = [
  // Destructive file operations
  {
    regex: /rm\s+(-[rf]+\s+)*(\/|~|\$HOME|\*)/i,
    severity: "block",
    reason: "Destructive rm on root/home/wildcard",
  },
  {
    regex: /rm\s+-rf\s+\./i,
    severity: "block",
    reason: "Recursive delete in current directory",
  },
  {
    regex: />\s*\/dev\/sd[a-z]/i,
    severity: "block",
    reason: "Writing directly to disk device",
  },
  {
    regex: /mkfs\./i,
    severity: "block",
    reason: "Formatting filesystem",
  },
  {
    regex: /dd\s+.*of=\/dev\//i,
    severity: "block",
    reason: "dd writing to device",
  },

  // Database destructive operations
  {
    regex: /DROP\s+(DATABASE|TABLE|SCHEMA)/i,
    severity: "block",
    reason: "DROP statement",
  },
  {
    regex: /TRUNCATE\s+TABLE/i,
    severity: "block",
    reason: "TRUNCATE statement",
  },
  {
    regex: /DELETE\s+FROM\s+\w+\s*(;|$)/i,
    severity: "warn",
    reason: "DELETE without WHERE clause",
  },

  // Production/deployment risks
  {
    regex: /--force\s+push|push\s+.*--force|-f\s+origin\s+(main|master)/i,
    severity: "warn",
    reason: "Force push to main/master",
  },
  {
    regex: /kubectl\s+delete\s+.*--all/i,
    severity: "block",
    reason: "kubectl delete --all",
  },
  {
    regex: /terraform\s+destroy/i,
    severity: "warn",
    reason: "Terraform destroy",
  },

  // Credential exposure
  {
    regex: /curl.*(-u|--user)\s+\S+:\S+/i,
    severity: "warn",
    reason: "Credentials in curl command",
  },
  {
    regex: /echo\s+.*password/i,
    severity: "warn",
    reason: "Echoing password",
  },

  // System modification
  {
    regex: /chmod\s+777/i,
    severity: "warn",
    reason: "chmod 777 (world-writable)",
  },
  {
    regex: /chown\s+.*root/i,
    severity: "warn",
    reason: "Changing ownership to root",
  },
  {
    regex: /sudo\s+rm/i,
    severity: "warn",
    reason: "sudo rm",
  },
]

const escapeForSingleQuotes = (value: string) => value.replace(/'/g, `'"'"'`)

const commandFromArgs = (args: unknown) => {
  if (!args || typeof args !== "object") {
    return undefined
  }

  const command = (args as { command?: unknown }).command
  if (typeof command !== "string") {
    return undefined
  }

  return command
}

export const BashDangerGuardPlugin: Plugin = async ({ client }) => {
  return {
    "tool.execute.before": async (input, output) => {
      if (input.tool !== "bash") {
        return
      }

      const command = commandFromArgs(output.args)
      if (!command || command.trim().length === 0) {
        return
      }

      const matches = DANGEROUS_PATTERNS.filter(({ regex }) => regex.test(command))
      if (matches.length === 0) {
        return
      }

      const blockedMatch = matches.find(({ severity }) => severity === "block")
      const reasons = matches.map(({ severity, reason }) => `${severity}: ${reason}`)

      await client.app.log({
        body: {
          service: "bash-danger-guard",
          level: "warn",
          message: blockedMatch
            ? "Blocked dangerous bash command"
            : "Potentially dangerous bash command",
          extra: {
            command,
            reasons,
          },
        },
      })

      if (blockedMatch) {
        throw new Error(
          `[bash-danger-guard] Blocked command: ${blockedMatch.reason}.` +
            ` Matched command: ${command}`,
        )
      }

      const warningLine = `[bash-danger-guard] WARNING: ${reasons.join("; ")}`
      output.args.command =
        `printf '%s\\n' '${escapeForSingleQuotes(warningLine)}' >&2; ` +
        command
    },
  }
}
