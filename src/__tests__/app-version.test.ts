import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"
import { APP_VERSION } from "@/generated/app-version"

describe("app version", () => {
  it("derives from package.json major.minor with commit-count patch (auto version)", () => {
    const [major, minor] = packageJson.version.split(".")
    expect(APP_VERSION.startsWith(`${major}.${minor}.`)).toBe(true)
    // When git is unavailable version equals package.json, otherwise patch is numeric commit count
    if (APP_VERSION !== packageJson.version) {
      const patch = APP_VERSION.split(".")[2]
      expect(/^\d+$/.test(patch)).toBe(true)
    }
  })
})
