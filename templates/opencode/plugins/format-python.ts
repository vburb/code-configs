import type { Plugin } from "@opencode-ai/plugin"

/**
 * OpenCode plugin: runs ruff format on edited Python files.
 * Automatically formats Python files after Edit or Write tool usage.
 */
export const FormatPythonPlugin: Plugin = async ({ $ }) => {
  return {
    "tool.execute.after": async (input, output) => {
      // Only process Edit and Write tools
      if (input.tool !== "edit" && input.tool !== "write") {
        return
      }

      const filePath = output.args.filePath
      
      // Check if it's a Python file
      if (!filePath || !filePath.endsWith(".py")) {
        return
      }

      try {
        // Check if file exists
        const exists = await $`test -f ${filePath}`.quiet().nothrow()
        if (exists.exitCode !== 0) {
          return
        }

        // Run ruff check --fix first (lint + import sorting), then format
        await $`ruff check --fix ${filePath}`.quiet().nothrow().timeout(30000)
        await $`ruff format --line-length 180 ${filePath}`.quiet().nothrow().timeout(30000)
      } catch (error) {
        // ruff not installed or timeout, skip silently
      }
    },
  }
}
