import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"
import { APP_VERSION } from "@/generated/app-version"

describe("app version", () => {
  it("equals package.json version (manual bump 1.0.10 -> 1.0.11)", () => {
    expect(APP_VERSION).toBe(packageJson.version)
  })
})
