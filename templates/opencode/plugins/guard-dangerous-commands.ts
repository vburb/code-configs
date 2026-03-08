import type { Plugin } from "@opencode-ai/plugin"

/**
 * OpenCode plugin: blocks or warns on dangerous shell commands.
 * Protects against destructive operations before they execute.
 */

// Dangerous patterns with severity and reason
const DANGEROUS_PATTERNS: [RegExp, "block" | "warn", string][] = [
  // Destructive file operations
  [/rm\s+(-[rf]+\s+)*(\/|~|\$HOME|\*)/i, "block", "Destructive rm on root/home/wildcard"],
  [/rm\s+-rf\s+\./i, "block", "Recursive delete in current directory"],
  [/>\s*\/dev\/sd[a-z]/i, "block", "Writing directly to disk device"],
  [/mkfs\./i, "block", "Formatting filesystem"],
  [/dd\s+.*of=\/dev\//i, "block", "dd writing to device"],
  // Database destructive operations
  [/DROP\s+(DATABASE|TABLE|SCHEMA)/i, "block", "DROP statement"],
  [/TRUNCATE\s+TABLE/i, "block", "TRUNCATE statement"],
  [/DELETE\s+FROM\s+\w+\s*(;|$)/i, "warn", "DELETE without WHERE clause"],
  // Production/deployment risks
  [/--force\s+push|push\s+.*--force|-f\s+origin\s+(main|master)/i, "warn", "Force push to main/master"],
  [/kubectl\s+delete\s+.*--all/i, "block", "kubectl delete --all"],
  [/terraform\s+destroy/i, "warn", "Terraform destroy"],
  // Credential exposure
  [/curl.*(-u|--user)\s+\S+:\S+/i, "warn", "Credentials in curl command"],
  [/echo\s+.*password/i, "warn", "Echoing password"],
  // System modification
  [/chmod\s+777/i, "warn", "chmod 777 (world-writable)"],
  [/chown\s+.*root/i, "warn", "Changing ownership to root"],
  [/sudo\s+rm/i, "warn", "sudo rm"],
]

export const GuardDangerousCommandsPlugin: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      // Only process bash/shell commands
      if (input.tool !== "bash" && input.tool !== "shell") {
        return
      }

      const command = output.args.command
      
      if (!command) {
        return
      }

      for (const [pattern, severity, reason] of DANGEROUS_PATTERNS) {
        if (pattern.test(command)) {
          if (severity === "block") {
            throw new Error(`Blocked dangerous command: ${reason}`)
          } else if (severity === "warn") {
            // OpenCode uses permission system for warnings
            output.permission = {
              decision: "ask",
              reason: `Potentially dangerous: ${reason}`,
            }
            return
          }
        }
      }
    },
  }
}
