import { describe, it, expect } from "vitest"
import {
  parseSignalType,
  protocolFamily,
  signalTier,
  sameProtocol,
  signalLabel,
  signalDomain,
} from "./signalType"

describe("parseSignalType", () => {
  it("splits domain/protocol/subtype", () => {
    expect(parseSignalType("video/hdmi/2.0")).toMatchObject({
      domain: "video", protocol: "hdmi", subtype: "2.0",
    })
  })
  it("handles two-segment types", () => {
    expect(parseSignalType("audio/dante")).toMatchObject({
      domain: "audio", protocol: "dante", subtype: null,
    })
  })
  it("joins deep subtypes", () => {
    expect(parseSignalType("audio/analogue/balanced").subtype).toBe("balanced")
    expect(parseSignalType("video/sync/analogue-bilevel")).toMatchObject({
      domain: "video", protocol: "sync", subtype: "analogue-bilevel",
    })
  })
  it("maps unknown domains to 'other' without throwing", () => {
    expect(parseSignalType("quantum/entangle/9000").domain).toBe("other")
    expect(signalDomain("")).toBe("other")
    expect(signalDomain(undefined)).toBe("other")
  })
})

describe("protocolFamily", () => {
  it("is domain/protocol", () => {
    expect(protocolFamily("video/hdmi/2.0")).toBe("video/hdmi")
    expect(protocolFamily("video/hdmi/1.4")).toBe("video/hdmi")
    expect(protocolFamily("network/ethernet/1g")).toBe("network/ethernet")
  })
})

describe("signalTier", () => {
  it("ranks numeric versions", () => {
    expect(signalTier("video/hdmi/2.0")).toBeGreaterThan(signalTier("video/hdmi/1.4")!)
  })
  it("ranks SDI rate tiers", () => {
    expect(signalTier("video/sdi/12g")).toBeGreaterThan(signalTier("video/sdi/3g")!)
    expect(signalTier("video/sdi/hd")).toBeGreaterThan(signalTier("video/sdi/sd")!)
  })
  it("ranks ethernet speeds", () => {
    expect(signalTier("network/ethernet/10g")).toBeGreaterThan(signalTier("network/ethernet/1g")!)
  })
  it("returns null for versionless types", () => {
    expect(signalTier("audio/dante")).toBeNull()
    expect(signalTier("video/hdmi")).toBeNull()
  })
})

describe("sameProtocol", () => {
  it("matches across versions", () => {
    expect(sameProtocol("video/hdmi/2.0", "video/hdmi/1.4")).toBe(true)
    expect(sameProtocol("video/hdmi", "video/sdi/3g")).toBe(false)
  })
})

describe("signalLabel", () => {
  it("produces human labels", () => {
    expect(signalLabel("video/hdmi/2.0")).toBe("HDMI 2.0")
    expect(signalLabel("audio/dante")).toBe("Dante")
    expect(signalLabel("control/rs232")).toBe("RS-232")
    expect(signalLabel("video/sdi/3g")).toBe("SDI 3G")
    expect(signalLabel("network/ethernet/1g")).toBe("Ethernet 1G")
  })
})
