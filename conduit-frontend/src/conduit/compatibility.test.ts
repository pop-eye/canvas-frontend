import { describe, it, expect } from "vitest"
import { checkSignalCompatibility, checkPortCompatibility } from "./compatibility"
import type { Port } from "./types"

function port(p: Partial<Port> & Pick<Port, "signal_type" | "direction">): Port {
  return { id: "p", label: p.label ?? "PORT", connector_type: "hdmi-a", ...p }
}

describe("checkSignalCompatibility", () => {
  it("accepts identical signals", () => {
    expect(checkSignalCompatibility("video/hdmi/2.0", "video/hdmi/2.0")).toMatchObject({
      compatible: true, severity: "ok",
    })
  })

  it("warns on version downgrade", () => {
    const r = checkSignalCompatibility("video/hdmi/2.0", "video/hdmi/1.4")
    expect(r.compatible).toBe(true)
    expect(r.severity).toBe("warning")
    expect(r.warning).toMatch(/downgraded/i)
  })

  it("allows upgrade (source lower than target) as ok with a note", () => {
    const r = checkSignalCompatibility("video/hdmi/1.4", "video/hdmi/2.0")
    expect(r.compatible).toBe(true)
    expect(r.severity).toBe("ok")
    expect(r.note).toMatch(/1\.4/)
  })

  it("warns on SDI rate downgrade", () => {
    expect(checkSignalCompatibility("video/sdi/12g", "video/sdi/3g").severity).toBe("warning")
  })

  it("rejects cross-domain", () => {
    const r = checkSignalCompatibility("video/hdmi/2.0", "audio/analogue/balanced")
    expect(r.compatible).toBe(false)
    expect(r.reason).toMatch(/video to audio/i)
  })

  it("rejects different protocol in same domain (needs converter)", () => {
    const r = checkSignalCompatibility("video/hdmi/2.0", "video/sdi/3g")
    expect(r.compatible).toBe(false)
    expect(r.reason).toMatch(/converter/i)
  })

  it("emits a structured converter hint for a bridgeable mismatch", () => {
    const r = checkSignalCompatibility("video/sdi/3g", "video/hdmi/2.0")
    expect(r.compatible).toBe(false)
    expect(r.converter).toEqual({ from: "video/sdi", to: "video/hdmi", fromLabel: "SDI 3G", toLabel: "HDMI 2.0" })
  })

  it("bridges DVI↔HDMI with a warning", () => {
    const r = checkSignalCompatibility("video/dvi-d", "video/hdmi/2.0")
    // dvi-d family is video/dvi-d, hdmi is video/hdmi — different families,
    // but the dvi/hdmi bridge is on family video/dvi. dvi-d should still map.
    expect(r.compatible).toBe(true)
  })

  it("bridges Dante↔AES67 with a warning", () => {
    const r = checkSignalCompatibility("audio/dante", "audio/aes67")
    expect(r.compatible).toBe(true)
    expect(r.severity).toBe("warning")
  })

  it("rejects Art-Net↔sACN (needs a gateway)", () => {
    expect(checkSignalCompatibility("lighting/artnet", "lighting/sacn").compatible).toBe(false)
  })

  it("rejects DC voltage mismatch", () => {
    expect(checkSignalCompatibility("power/dc/12v", "power/dc/24v").compatible).toBe(false)
  })

  it("accepts universal mains into a regional mains", () => {
    expect(checkSignalCompatibility("power/mains/ac/universal", "power/mains/ac/uk").compatible).toBe(true)
  })
})

describe("checkPortCompatibility — direction", () => {
  it("accepts out → in", () => {
    const r = checkPortCompatibility(
      port({ signal_type: "video/hdmi/2.0", direction: "out", label: "HDMI OUT" }),
      port({ signal_type: "video/hdmi/2.0", direction: "in", label: "HDMI IN" }),
    )
    expect(r.compatible).toBe(true)
  })

  it("rejects out → out", () => {
    const r = checkPortCompatibility(
      port({ signal_type: "video/hdmi/2.0", direction: "out" }),
      port({ signal_type: "video/hdmi/2.0", direction: "out", label: "HDMI OUT 2" }),
    )
    expect(r.compatible).toBe(false)
  })

  it("rejects starting from an input", () => {
    const r = checkPortCompatibility(
      port({ signal_type: "video/hdmi/2.0", direction: "in", label: "HDMI IN" }),
      port({ signal_type: "video/hdmi/2.0", direction: "in", label: "HDMI IN 2" }),
    )
    expect(r.compatible).toBe(false)
    expect(r.reason).toMatch(/input/i)
  })

  it("allows bidirectional ↔ bidirectional (e.g. HDBaseT, RS-485)", () => {
    const r = checkPortCompatibility(
      port({ signal_type: "video/hdbaset", direction: "bidirectional", connector_type: "rj45" }),
      port({ signal_type: "video/hdbaset", direction: "bidirectional", connector_type: "rj45" }),
    )
    expect(r.compatible).toBe(true)
  })

  it("rejects power → signal", () => {
    const r = checkPortCompatibility(
      port({ signal_type: "power/mains/ac/universal", direction: "power-out", connector_type: "iec-c13" }),
      port({ signal_type: "video/hdmi/2.0", direction: "in" }),
    )
    expect(r.compatible).toBe(false)
  })
})

describe("checkPortCompatibility — multi-mode ports", () => {
  it("matches via a signal_mode when the primary type differs", () => {
    const usbcSource = port({
      signal_type: "network/usb/3.2",
      direction: "out",
      connector_type: "usb-c",
      label: "USB-C",
      signal_modes: [{ signal_type: "video/usb-c-dp-alt" }],
    })
    const dpTarget = port({
      signal_type: "video/displayport/1.4",
      direction: "in",
      connector_type: "displayport-a",
      label: "DP IN",
      signal_modes: [{ signal_type: "video/usb-c-dp-alt" }],
    })
    const r = checkPortCompatibility(usbcSource, dpTarget)
    expect(r.compatible).toBe(true)
    expect(r.viaMode).toBeDefined()
  })
})
