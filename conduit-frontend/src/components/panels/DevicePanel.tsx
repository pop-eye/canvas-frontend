import { EquipmentRecord, ConnectorPort, PanelSide } from "../../types/api"
import { portColourHex } from "../../utils/portColour"
import { Tooltip } from "../ui/Tooltip"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"

interface DevicePanelProps {
  record: EquipmentRecord
}

const PANEL_SIDES: PanelSide[] = ["rear", "front", "top", "bottom"]

interface PortWithDir {
  port: ConnectorPort
  direction: "input" | "output"
}

// Return an SVG connector shape appropriate for the protocol/connector type
function ConnectorShape({
  port,
  colour,
  size = 24,
}: {
  port: ConnectorPort
  colour: string
  size?: number
}) {
  const proto = (port.protocol ?? "").toLowerCase()
  const conn = (port.connector ?? "").toLowerCase()

  // XLR — circle with 3 dots
  if (proto.includes("xlr") || conn.includes("xlr")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <circle cx="12" cy="8" r="2" fill={colour} />
        <circle cx="8" cy="15" r="2" fill={colour} />
        <circle cx="16" cy="15" r="2" fill={colour} />
      </svg>
    )
  }
  // BNC / SDI — circular bayonet shape
  if (proto.includes("sdi") || conn.includes("bnc")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" fill={colour + "40"} stroke={colour} strokeWidth="1" />
        <circle cx="12" cy="12" r="1.5" fill={colour} />
        <line x1="12" y1="2" x2="12" y2="5" stroke={colour} strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="19" x2="12" y2="22" stroke={colour} strokeWidth="2" strokeLinecap="round" />
        <line x1="2" y1="12" x2="5" y2="12" stroke={colour} strokeWidth="2" strokeLinecap="round" />
        <line x1="19" y1="12" x2="22" y2="12" stroke={colour} strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  // HDMI — trapezoid
  if (proto.includes("hdmi")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon points="4,7 20,7 18,17 6,17" fill={colour + "18"} stroke={colour} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="9" y1="10" x2="9" y2="14" stroke={colour} strokeWidth="1" />
        <line x1="12" y1="10" x2="12" y2="14" stroke={colour} strokeWidth="1" />
        <line x1="15" y1="10" x2="15" y2="14" stroke={colour} strokeWidth="1" />
      </svg>
    )
  }
  // DisplayPort — similar to HDMI but asymmetric clip
  if (proto.includes("displayport") || proto.includes("dp")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M3,8 L18,8 Q21,8 21,12 L21,16 L3,16 Z" fill={colour + "18"} stroke={colour} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="8" y1="11" x2="8" y2="13" stroke={colour} strokeWidth="1" />
        <line x1="12" y1="11" x2="12" y2="13" stroke={colour} strokeWidth="1" />
        <line x1="16" y1="11" x2="16" y2="13" stroke={colour} strokeWidth="1" />
      </svg>
    )
  }
  // RJ45 / network / Dante — rectangular jack with 8 contacts
  if (
    proto.includes("dante") || proto.includes("rj45") ||
    conn.includes("rj45") || proto.includes("ethernet") ||
    proto.includes("network") || proto.includes("artnet") ||
    proto.includes("sacn") || proto.includes("avb")
  ) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect x="5" y="7" width="14" height="12" rx="1" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        {[7, 8.75, 10.5, 12.25, 14, 15.75].map((x, i) => (
          <line key={i} x1={x} y1="7" x2={x} y2="11" stroke={colour} strokeWidth="1" />
        ))}
      </svg>
    )
  }
  // DMX / RS-232 / RS-485 — D-sub shape  
  if (
    proto.includes("dmx") || proto.includes("rs-") || proto.includes("rs232") ||
    proto.includes("rs485") || conn.includes("d-sub") || conn.includes("db9")
  ) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M3,9 Q3,6 12,6 Q21,6 21,9 L21,15 Q21,18 12,18 Q3,18 3,15 Z" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <circle cx="8" cy="11" r="1" fill={colour} />
        <circle cx="12" cy="11" r="1" fill={colour} />
        <circle cx="16" cy="11" r="1" fill={colour} />
        <circle cx="10" cy="14" r="1" fill={colour} />
        <circle cx="14" cy="14" r="1" fill={colour} />
      </svg>
    )
  }
  // USB
  if (proto.includes("usb")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect x="7" y="7" width="10" height="10" rx="2" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <rect x="10" y="9" width="4" height="6" rx="1" fill={colour + "40"} />
      </svg>
    )
  }
  // Power / IEC / NEMA
  if (
    proto.includes("power") || proto.includes("iec") || proto.includes("nema") ||
    conn.includes("iec") || conn.includes("powercon")
  ) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <line x1="12" y1="6" x2="12" y2="12" stroke={colour} strokeWidth="2" strokeLinecap="round" />
        <path d="M8,8 A6,6 0 1 0 16,8" fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  // Default — generic port (square with dot)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" rx="2" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill={colour + "40"} stroke={colour} strokeWidth="1" />
      <circle cx="12" cy="12" r="1.2" fill={colour} />
    </svg>
  )
}

function PortBlock({ pd, index }: { pd: PortWithDir; index: number }) {
  const { port, direction } = pd
  const colour = portColourHex(port.signal_type)
  const displayLabel = port.label || `${port.protocol}${port.version ? ` ${port.version}` : ""}`

  const tooltipContent = (
    <div className="space-y-1">
      <div className="font-semibold" style={{ color: colour }}>
        {displayLabel}
      </div>
      <div style={{ color: "#9CA3AF" }}>
        {direction === "input" ? "↓ INPUT" : "↑ OUTPUT"} · {port.signal_type.toUpperCase()}
      </div>
      {port.connector && <div>Connector: {port.connector}</div>}
      {port.quantity > 1 && <div>Qty: ×{port.quantity}</div>}
      {port.panel_side && <div>Panel: {port.panel_side}</div>}
      {port.max_cable_distance_m !== undefined && <div>Max cable: {port.max_cable_distance_m}m</div>}
      {port.latency_ms !== undefined && <div>Latency: {port.latency_ms}ms</div>}
      {port.hdcp_version && <div>HDCP: {port.hdcp_version}</div>}
      {port.sample_rates_hz?.length ? <div>Sample rates: {port.sample_rates_hz.join(", ")} Hz</div> : null}
      {port.bit_depths?.length ? <div>Bit depth: {port.bit_depths.join(", ")} bit</div> : null}
    </div>
  )

  return (
    <Tooltip content={tooltipContent} side="top">
      <div className="flex flex-col items-center gap-1 cursor-default select-none" style={{ minWidth: 40 }}>
        {/* Quantity badge */}
        {port.quantity > 1 && (
          <div
            className="text-[8px] px-1 rounded-[1px] leading-tight"
            style={{
              background: colour + "20",
              color: colour,
              fontFamily: "'JetBrains Mono', monospace",
              border: `1px solid ${colour}40`,
            }}
          >
            ×{port.quantity}
          </div>
        )}

        {/* Connector shape */}
        <div
          className="rounded-[1px] p-0.5 transition-all hover:scale-110"
          style={{
            background: colour + "08",
            outline: `1px solid ${colour}30`,
          }}
        >
          <ConnectorShape port={port} colour={colour} size={26} />
        </div>

        {/* Direction arrow */}
        <div style={{ color: colour + "99" }}>
          {direction === "input"
            ? <ArrowDownLeft size={8} />
            : <ArrowUpRight size={8} />
          }
        </div>

        {/* Label */}
        <div
          className="text-center leading-tight"
          style={{
            color: colour + "CC",
            fontSize: 8,
            fontFamily: "'JetBrains Mono', monospace",
            maxWidth: 40,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayLabel}
        </div>

        {/* Index in panel */}
        {port.position_index !== undefined && (
          <div
            className="text-[7px]"
            style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}
          >
            #{index + 1}
          </div>
        )}
      </div>
    </Tooltip>
  )
}

export function DevicePanel({ record }: DevicePanelProps) {
  const m = record.metadata
  const inputs = m.connectivity?.inputs ?? []
  const outputs = m.connectivity?.outputs ?? []

  const all: PortWithDir[] = [
    ...inputs.map((p) => ({ port: p, direction: "input" as const })),
    ...outputs.map((p) => ({ port: p, direction: "output" as const })),
  ]

  // Group by panel_side
  const grouped = new Map<string, PortWithDir[]>()
  for (const pd of all) {
    const side = pd.port.panel_side ?? "unspecified"
    if (!grouped.has(side)) grouped.set(side, [])
    grouped.get(side)!.push(pd)
  }

  // Sort within each face by position_index then signal_type
  for (const [, ports] of grouped) {
    ports.sort((a, b) => {
      const ai = a.port.position_index ?? 999
      const bi = b.port.position_index ?? 999
      return ai !== bi ? ai - bi : a.port.signal_type.localeCompare(b.port.signal_type)
    })
  }

  const orderedFaces = [
    ...PANEL_SIDES.filter((s) => grouped.has(s)),
    ...(grouped.has("unspecified") ? ["unspecified"] : []),
  ]

  // Network / control as plain text lists (not connectors)
  const network = m.connectivity?.network ?? []
  const control = m.connectivity?.control ?? []

  if (orderedFaces.length === 0 && network.length === 0 && control.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        No port layout data available for this device
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {orderedFaces.map((side) => {
        const ports = grouped.get(side)!
        const inputPorts = ports.filter((p) => p.direction === "input")
        const outputPorts = ports.filter((p) => p.direction === "output")

        return (
          <div key={side}>
            {/* Face label */}
            <div
              className="flex items-center gap-2 mb-2"
            >
              <div
                className="text-[9px] uppercase tracking-[0.2em] font-semibold"
                style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {side === "unspecified" ? "PORTS" : `${side.toUpperCase()} PANEL`}
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <div className="flex gap-2 text-[8px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                {inputPorts.length > 0 && <span>↓ {inputPorts.length} IN</span>}
                {outputPorts.length > 0 && <span>↑ {outputPorts.length} OUT</span>}
              </div>
            </div>

            {/* Faceplate */}
            <div
              className="rounded-[2px] overflow-x-auto"
              style={{
                background: "#080909",
                border: "2px solid #1A1C1F",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.03)",
              }}
            >
              {/* Screw holes — decorative */}
              <div className="flex justify-between px-2 pt-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
              </div>

              {/* Ports row */}
              <div className="flex flex-wrap gap-3 px-4 py-3 min-h-[72px] items-end">
                {/* Input ports first, then output ports — visually separated */}
                {inputPorts.length > 0 && outputPorts.length > 0 ? (
                  <>
                    {inputPorts.map((pd, i) => <PortBlock key={`in-${i}`} pd={pd} index={i} />)}
                    {/* Divider */}
                    <div className="self-stretch w-px my-1" style={{ background: "#2A2D35" }} />
                    {outputPorts.map((pd, i) => <PortBlock key={`out-${i}`} pd={pd} index={i} />)}
                  </>
                ) : (
                  ports.map((pd, i) => <PortBlock key={i} pd={pd} index={i} />)
                )}
              </div>

              {/* Bottom screw holes */}
              <div className="flex justify-between px-2 pb-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
              </div>
            </div>
          </div>
        )
      })}

      {/* Network / control protocols */}
      {(network.length > 0 || control.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="text-[9px] uppercase tracking-[0.2em] font-semibold"
              style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              NETWORK &amp; CONTROL
            </div>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {network.map((n, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-[2px] text-[10px]"
                style={{
                  background: "#3B82F620",
                  color: "#3B82F6",
                  border: "1px solid #3B82F630",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {n}
              </span>
            ))}
            {control.map((c, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-[2px] text-[10px]"
                style={{
                  background: "#8B5CF620",
                  color: "#8B5CF6",
                  border: "1px solid #8B5CF630",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
