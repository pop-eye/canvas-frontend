import { describe, it, expect } from "vitest"
import { buildBOM, buildCableSchedule, toCSV } from "./bom"
import type { DeviceNode, ConnectionEdge } from "../types/canvas"
import type { ConduitDevice } from "../conduit/types"
import type { DevicePlacement } from "../types/spatial"

function device(mfr: string, model: string, watts: number, ports: ConduitDevice["ports"] = []): ConduitDevice {
  return { schema_version: "conduit/v1", manufacturer: mfr, model, category: "display", power: { max_wattage: watts }, ports }
}

function node(id: string, deviceId: string, d: ConduitDevice): DeviceNode {
  return { id, type: "device", position: { x: 0, y: 0 }, data: { device: d, deviceId, instanceId: id } }
}

describe("buildBOM", () => {
  it("aggregates identical devices by quantity and sums power", () => {
    const d = device("LG", "QNED70A", 120)
    const bom = buildBOM([node("1", "lg/q", d), node("2", "lg/q", d), node("3", "acme/x", device("Acme", "X", 50))])
    expect(bom).toHaveLength(2)
    const lg = bom.find((l) => l.model === "QNED70A")!
    expect(lg.qty).toBe(2)
    expect(lg.totalWatts).toBe(240)
    expect(lg.unitWatts).toBe(120)
  })
})

describe("buildCableSchedule", () => {
  it("numbers cables and resolves from/to ports and length", () => {
    const src = device("Acme", "Cam", 20, [{ id: "out1", label: "SDI OUT", signal_type: "video/hdmi/2.0", connector_type: "hdmi-a", direction: "out" }])
    const dst = device("Acme", "Mon", 60, [{ id: "in1", label: "HDMI IN", signal_type: "video/hdmi/2.0", connector_type: "hdmi-a", direction: "in" }])
    const nodes = [node("a", "acme/cam", src), node("b", "acme/mon", dst)]
    const edges: ConnectionEdge[] = [{
      id: "e1", type: "connection", source: "a", target: "b",
      data: { sourcePortId: "out1", targetPortId: "in1", signalType: "video/hdmi/2.0", severity: "ok", compatible: true },
    }]
    const placements: Record<string, DevicePlacement> = {
      a: { instanceId: "a", position3d: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, mounted: "floor" },
      b: { instanceId: "b", position3d: { x: 3, y: 0, z: 4 }, rotation: { x: 0, y: 0, z: 0 }, mounted: "floor" },
    }
    const cables = buildCableSchedule(nodes, edges, placements)
    expect(cables).toHaveLength(1)
    const c = cables[0]
    expect(c.cableId).toBe("C001")
    expect(c.fromPort).toBe("SDI OUT")
    expect(c.toPort).toBe("HDMI IN")
    expect(c.signal).toBe("HDMI 2.0")
    expect(c.lengthM).toBeCloseTo(5, 1)
    expect(c.exceeded).toBe(false) // 5m < HDMI ~15m
  })
})

describe("toCSV", () => {
  it("escapes commas, quotes and newlines", () => {
    const csv = toCSV(["A", "B"], [["plain", 'has,comma'], ['he said "hi"', "line\nbreak"]])
    expect(csv).toBe('A,B\r\nplain,"has,comma"\r\n"he said ""hi""","line\nbreak"')
  })
})
