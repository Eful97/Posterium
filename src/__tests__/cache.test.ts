import { describe, it, expect, beforeEach } from "vitest"
import { cacheGet, cacheSet, cacheInvalidate, cacheClear, cacheGetStale } from "@/lib/cache"

describe("cache", () => {
  beforeEach(() => {
    cacheClear()
  })

  describe("cacheGet / cacheSet", () => {
    it("returns null for missing key", () => {
      expect(cacheGet("nonexistent")).toBeNull()
    })

    it("stores and retrieves a value", () => {
      cacheSet("key1", { foo: "bar" })
      expect(cacheGet("key1")).toEqual({ foo: "bar" })
    })

    it("stores different types", () => {
      cacheSet("str", "hello")
      cacheSet("num", 42)
      cacheSet("arr", [1, 2, 3])
      cacheSet("obj", { nested: true })

      expect(cacheGet("str")).toBe("hello")
      expect(cacheGet("num")).toBe(42)
      expect(cacheGet("arr")).toEqual([1, 2, 3])
      expect(cacheGet("obj")).toEqual({ nested: true })
    })

    it("overwrites existing key", () => {
      cacheSet("key", "first")
      cacheSet("key", "second")
      expect(cacheGet("key")).toBe("second")
    })

    it("respects custom TTL (expires quickly)", () => {
      cacheSet("ttl-key", "data", [], 1) // 1ms TTL
      // Wait for expiry
      const start = Date.now()
      while (Date.now() - start < 5) { /* busy wait */ }
      expect(cacheGet("ttl-key")).toBeNull()
    })
  })

  describe("cacheGetStale", () => {
    it("returns data with stale=false when fresh", () => {
      cacheSet("fresh", "data")
      const result = cacheGetStale("fresh")
      expect(result.data).toBe("data")
      expect(result.stale).toBe(false)
    })

    it("returns null with stale=false when missing", () => {
      const result = cacheGetStale("missing")
      expect(result.data).toBeNull()
      expect(result.stale).toBe(false)
    })

    it("returns data with stale=true when expired", () => {
      cacheSet("expired", "old-data", [], 1)
      const start = Date.now()
      while (Date.now() - start < 5) { /* busy wait */ }
      const result = cacheGetStale("expired")
      expect(result.data).toBe("old-data")
      expect(result.stale).toBe(true)
    })

    it("keeps expired data available for repeated stale reads", () => {
      cacheSet("expired-repeat", "old-data", [], 1)
      const start = Date.now()
      while (Date.now() - start < 5) {
        Date.now()
      }

      expect(cacheGetStale("expired-repeat")).toEqual({ data: "old-data", stale: true })
      expect(cacheGetStale("expired-repeat")).toEqual({ data: "old-data", stale: true })
    })
  })

  describe("cacheInvalidate", () => {
    it("removes entries with matching tag", () => {
      cacheSet("a", 1, ["tag1"])
      cacheSet("b", 2, ["tag2"])
      cacheSet("c", 3, ["tag1", "tag2"])

      cacheInvalidate("tag1")

      expect(cacheGet("a")).toBeNull()
      expect(cacheGet("b")).toBe(2)
      expect(cacheGet("c")).toBeNull()
    })

    it("does nothing when no entries match tag", () => {
      cacheSet("a", 1, ["tag1"])
      cacheInvalidate("nonexistent")
      expect(cacheGet("a")).toBe(1)
    })
  })

  describe("cacheClear", () => {
    it("removes all entries", () => {
      cacheSet("a", 1)
      cacheSet("b", 2)
      cacheClear()
      expect(cacheGet("a")).toBeNull()
      expect(cacheGet("b")).toBeNull()
    })
  })

  describe("cacheSet tags", () => {
    it("stores with empty tags by default", () => {
      cacheSet("no-tags", "data")
      // Should be retrievable
      expect(cacheGet("no-tags")).toBe("data")
    })

    it("invalidates by tag", () => {
      cacheSet("x", 1, ["refresh"])
      cacheSet("y", 2, ["static"])
      cacheInvalidate("refresh")
      expect(cacheGet("x")).toBeNull()
      expect(cacheGet("y")).toBe(2)
    })
  })
})
