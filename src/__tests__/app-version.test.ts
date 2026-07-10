import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"
import { APP_VERSION } from "@/generated/app-version"

describe("app version", () => {
  it("matches package.json when the generated version file is current", () => {
    expect(APP_VERSION).toBe(packageJson.version)
  })
})
