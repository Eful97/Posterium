import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const packagePath = path.join(rootDir, "package.json")
const outputPath = path.join(rootDir, "src", "generated", "app-version.ts")

const rawPackage = await fs.readFile(packagePath, "utf-8")
const packageJson = JSON.parse(rawPackage)

if (!packageJson || typeof packageJson.version !== "string" || packageJson.version.trim() === "") {
  throw new Error("package.json version is missing")
}

const version = packageJson.version.trim()
const output = [`export const APP_VERSION = ${JSON.stringify(version)}`, ""].join("\n")

await fs.mkdir(path.dirname(outputPath), { recursive: true })
await fs.writeFile(outputPath, output)
