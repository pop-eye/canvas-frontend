import { describe, it, expect } from "vitest"
import { buildDeviceModel } from "../utils/deviceModel"
import { parseDevice } from "./schema"
import type { ConduitDevice } from "./types"

const modules = import.meta.glob("../data/sample-devices/**/*.json", { eager: true })
const devices = Object.values(modules)
  .map((m) => parseDevice((m as { default: unknown }).default))
  .filter((r): r is { ok: true; device: ConduitDevice } => r.ok)
  .map((r) => r.device)

describe("buildDeviceModel", () => {
  it("has fixtures", () => expect(devices.length).toBeGreaterThan(0))

  it.each(devices.map((d) => [`${d.manufacturer} ${d.model}`, d] as const))(
    "generates a valid model for %s",
    (_name, device) => {
      const model = buildDeviceModel(device)
      // Positive, finite bounding size.
      expect(model.size.every((n) => Number.isFinite(n) && n > 0)).toBe(true)
      // At least one body part.
      expect(model.parts.length).toBeGreaterThan(0)
      // Every part + port coordinate is finite.
      for (const p of model.parts) {
        expect(p.position.every(Number.isFinite)).toBe(true)
        expect(p.size.every((n) => Number.isFinite(n) && n > 0)).toBe(true)
      }
      for (const port of model.ports) {
        expect(port.position.every(Number.isFinite)).toBe(true)
        expect(port.size.every((n) => Number.isFinite(n) && n >= 0)).toBe(true)
      }
    }
  )

  it("places a port for every non-internal port on the device", () => {
    for (const device of devices) {
      const nonInternal = device.ports.filter((p) => p.panel_side !== "internal").length
      const model = buildDeviceModel(device)
      expect(model.ports.length).toBe(nonInternal)
    }
  })

  it("is deterministic", () => {
    const d = devices[0]
    expect(JSON.stringify(buildDeviceModel(d))).toBe(JSON.stringify(buildDeviceModel(d)))
  })
})
