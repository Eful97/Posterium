import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it } from "vitest"
import { CACHE_DIR } from "@/lib/data-dir"
import { diskCacheClear, diskCacheGet, diskCacheSet, hashKey } from "@/lib/disk-cache"

describe("disk cache", () => {
  const namespace = "vitest-disk-cache"

  beforeEach(() => {
    diskCacheClear(namespace)
  })

  it("expires entries using the write timestamp", () => {
    const key = "old-entry"
    diskCacheSet(namespace, key, Buffer.from("stale"))
    const filePath = path.join(CACHE_DIR, namespace, `${hashKey(key)}.dat`)
    const old = new Date(Date.now() - 60_000)
    fs.utimesSync(filePath, new Date(), old)

    const result = diskCacheGet(namespace, key, 1_000)

    expect(result).toBeNull()
  })
})
