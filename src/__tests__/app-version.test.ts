import { describe, expect, it } from "vitest"
import packageJson from "../../package.json"
import { APP_VERSION } from "@/generated/app-version"

describe("app version", () => {
  it("is the package.json base with the commit count as patch", () => {
    const [major, minor] = packageJson.version.split(".")
    expect(APP_VERSION).toMatch(new RegExp(`^${major}\\.${minor}\\.\\d+$`))
    const patch = Number(APP_VERSION.split(".")[2])
    expect(patch).toBeGreaterThan(0)
  })
})
