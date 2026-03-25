import type { Plugin } from "@opencode-ai/plugin"
import { dirname, extname, resolve } from "node:path"

const PYTHON_EXTENSIONS = new Set([".py", ".pyi"])
const FILE_WRITE_TOOLS = new Set(["edit", "write"])
const DEDUPE_WINDOW_MS = 750

const resolveFilePath = (directory: string, pathValue: string) => {
  if (pathValue.startsWith("/")) {
    return pathValue
  }

  return resolve(directory, pathValue)
}

export const RuffAutoFixPlugin: Plugin = async ({ $, client, directory }) => {
  const recentRuns = new Map<string, number>()

  const maybeFormat = async (filePath: unknown) => {
    if (typeof filePath !== "string" || filePath.length === 0) {
      return
    }

    const absolutePath = resolveFilePath(directory, filePath)
    if (!PYTHON_EXTENSIONS.has(extname(absolutePath).toLowerCase())) {
      return
    }

    const now = Date.now()
    const lastRun = recentRuns.get(absolutePath)
    if (typeof lastRun === "number" && now - lastRun < DEDUPE_WINDOW_MS) {
      return
    }

    recentRuns.set(absolutePath, now)

    if (recentRuns.size > 512) {
      for (const [pathKey, timestamp] of recentRuns) {
        if (now - timestamp > DEDUPE_WINDOW_MS * 5) {
          recentRuns.delete(pathKey)
        }
      }
    }

    const checkResult = await $`ruff check --fix --exit-zero ${absolutePath}`
      .cwd(dirname(absolutePath))
      .quiet()
      .nothrow()

    if (checkResult.exitCode !== 0) {
      await client.app.log({
        body: {
          service: "ruff-auto-fix",
          level: "warn",
          message: "ruff check --fix failed",
          extra: {
            file: absolutePath,
            exitCode: checkResult.exitCode,
            stderr: checkResult.stderr.toString("utf8").trim(),
          },
        },
      })
      return
    }

    const formatResult = await $`ruff format ${absolutePath}`
      .cwd(dirname(absolutePath))
      .quiet()
      .nothrow()

    if (formatResult.exitCode !== 0) {
      await client.app.log({
        body: {
          service: "ruff-auto-fix",
          level: "warn",
          message: "ruff format failed",
          extra: {
            file: absolutePath,
            exitCode: formatResult.exitCode,
            stderr: formatResult.stderr.toString("utf8").trim(),
          },
        },
      })
    }
  }

  return {
    event: async ({ event }) => {
      if (event.type !== "file.edited") {
        return
      }

      await maybeFormat(event.properties?.file)
    },
    "tool.execute.after": async (input) => {
      if (!FILE_WRITE_TOOLS.has(input.tool)) {
        return
      }

      await maybeFormat(input.args?.filePath)
    },
  }
}
