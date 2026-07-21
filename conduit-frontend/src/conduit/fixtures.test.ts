import { describe, it, expect } from "vitest"
import { parseDevice } from "./schema"
import { checkPortCompatibility } from "./compatibility"
import { signalDomain } from "./signalType"
import type { ConduitDevice } from "./types"

// All real device profiles pulled from the conduit-open-standard repo.
const modules = import.meta.glob("../data/sample-devices/**/*.json", { eager: true })
const fixtures = Object.entries(modules).map(([path, mod]) => ({
  path,
  // JSON modules expose the object as default.
  raw: (mod as { default: unknown }).default,
}))

describe("sample device fixtures", () => {
  it("finds fixtures", () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it.each(fixtures)("validates $path", ({ raw }) => {
    const r = parseDevice(raw)
    expect(r.ok, r.ok ? "" : r.error).toBe(true)
  })

  it("every port has a resolvable signal domain", () => {
    for (const { raw } of fixtures) {
      const r = parseDevice(raw)
      if (!r.ok) continue
      for (const port of r.device.ports) {
        expect(signalDomain(port.signal_type)).toBeTruthy()
      }
    }
  })

  it("compatibility engine never throws across all real port pairings", () => {
    const devices: ConduitDevice[] = fixtures
      .map((f) => parseDevice(f.raw))
      .filter((r): r is { ok: true; device: ConduitDevice } => r.ok)
      .map((r) => r.device)

    const allPorts = devices.flatMap((d) => d.ports)
    let pairs = 0
    for (const a of allPorts) {
      for (const b of allPorts) {
        expect(() => checkPortCompatibility(a, b)).not.toThrow()
        pairs++
      }
    }
    expect(pairs).toBeGreaterThan(0)
  })
})
