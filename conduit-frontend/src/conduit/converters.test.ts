import { describe, it, expect } from "vitest"
import { pickBridgePorts } from "./converters"
import type { ConduitDevice } from "./types"

const converter: ConduitDevice = {
  schema_version: "conduit/v1",
  manufacturer: "Acme",
  model: "SDI-HDMI",
  category: "video-converter",
  ports: [
    { id: "sdi_in_1", label: "SDI In", signal_type: "video/sdi/3g", connector_type: "bnc", direction: "in" },
    { id: "hdmi_out_1", label: "HDMI Out", signal_type: "video/hdmi/2.0", connector_type: "hdmi-a", direction: "out" },
  ],
}

describe("pickBridgePorts", () => {
  it("selects the input carrying `from` and the output carrying `to`", () => {
    expect(pickBridgePorts(converter, "video/sdi", "video/hdmi")).toEqual({ inId: "sdi_in_1", outId: "hdmi_out_1" })
  })

  it("falls back to same-domain matching when the exact family is absent", () => {
    // Ask for a different video family; domain (video) still matches on both ends.
    expect(pickBridgePorts(converter, "video/dvi", "video/displayport")).toEqual({ inId: "sdi_in_1", outId: "hdmi_out_1" })
  })

  it("returns null when no port bridges the request", () => {
    expect(pickBridgePorts(converter, "audio/dante", "audio/aes67")).toBeNull()
  })
})
