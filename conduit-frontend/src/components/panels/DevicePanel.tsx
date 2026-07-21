import type { ConduitDevice, Port } from "../../conduit/types"
import { signalColour, signalLabel, parseSignalType } from "../../conduit/signalType"
import { portQuantity, connectorLabel, portLabel } from "../../conduit/device"
import { Tooltip } from "../ui/Tooltip"
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react"

interface DevicePanelProps {
  device: ConduitDevice
}

const PANEL_SIDES = ["rear", "front", "left", "right", "top", "bottom"]

type Dir = "input" | "output" | "io"

function portDir(port: Port): Dir {
  if (port.direction === "in" || port.direction === "power-in") return "input"
  if (port.direction === "out" || port.direction === "power-out") return "output"
  return "io"
}

// An SVG connector shape inferred from connector type + signal protocol.
function ConnectorShape({ port, colour, size = 26 }: { port: Port; colour: string; size?: number }) {
  const conn = (port.connector_type ?? "").toLowerCase()
  const p = parseSignalType(port.signal_type)
  const proto = p.protocol ?? ""

  if (conn.startsWith("xlr")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <circle cx="12" cy="8" r="2" fill={colour} /><circle cx="8" cy="15" r="2" fill={colour} /><circle cx="16" cy="15" r="2" fill={colour} />
      </svg>
    )
  }
  if (conn === "bnc" || conn.includes("bnc") || proto === "sdi") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="4" fill={colour + "40"} stroke={colour} strokeWidth="1" />
        <circle cx="12" cy="12" r="1.5" fill={colour} />
      </svg>
    )
  }
  if (conn.startsWith("hdmi") || proto === "hdmi") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <polygon points="4,7 20,7 18,17 6,17" fill={colour + "18"} stroke={colour} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="9" y1="10" x2="9" y2="14" stroke={colour} strokeWidth="1" /><line x1="12" y1="10" x2="12" y2="14" stroke={colour} strokeWidth="1" /><line x1="15" y1="10" x2="15" y2="14" stroke={colour} strokeWidth="1" />
      </svg>
    )
  }
  if (conn.startsWith("displayport") || proto === "displayport") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M3,8 L18,8 Q21,8 21,12 L21,16 L3,16 Z" fill={colour + "18"} stroke={colour} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    )
  }
  if (conn.includes("rj45") || conn.includes("ethercon") || p.domain === "network" || ["dante", "artnet", "sacn", "aes67", "avb"].includes(proto)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect x="5" y="7" width="14" height="12" rx="1" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        {[7, 8.75, 10.5, 12.25, 14, 15.75].map((x, i) => (<line key={i} x1={x} y1="7" x2={x} y2="11" stroke={colour} strokeWidth="1" />))}
      </svg>
    )
  }
  if (conn.startsWith("db") || conn.startsWith("de-") || proto === "dmx512" || proto === "rs232" || proto === "rs485") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d="M3,9 Q3,6 12,6 Q21,6 21,9 L21,15 Q21,18 12,18 Q3,18 3,15 Z" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <circle cx="8" cy="11" r="1" fill={colour} /><circle cx="12" cy="11" r="1" fill={colour} /><circle cx="16" cy="11" r="1" fill={colour} />
      </svg>
    )
  }
  if (conn.startsWith("usb")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect x="7" y="7" width="10" height="10" rx="2" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <rect x="10" y="9" width="4" height="6" rx="1" fill={colour + "40"} />
      </svg>
    )
  }
  if (conn.startsWith("iec") || conn.includes("powercon") || conn.startsWith("nema") || p.domain === "power") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
        <line x1="12" y1="6" x2="12" y2="12" stroke={colour} strokeWidth="2" strokeLinecap="round" />
        <path d="M8,8 A6,6 0 1 0 16,8" fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="4" y="6" width="16" height="12" rx="2" fill={colour + "18"} stroke={colour} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3" fill={colour + "40"} stroke={colour} strokeWidth="1" /><circle cx="12" cy="12" r="1.2" fill={colour} />
    </svg>
  )
}

function PortBlock({ port }: { port: Port }) {
  const colour = signalColour(port.signal_type)
  const dir = portDir(port)
  const qty = portQuantity(port)
  const display = portLabel(port)

  const tooltip = (
    <div className="space-y-1">
      <div className="font-semibold" style={{ color: colour }}>{display}</div>
      <div style={{ color: "#9CA3AF" }}>
        {dir === "input" ? "↓ INPUT" : dir === "output" ? "↑ OUTPUT" : "↔ BIDIRECTIONAL"} · {signalLabel(port.signal_type)}
      </div>
      {port.connector_type && <div>Connector: {connectorLabel(port.connector_type)}</div>}
      {qty > 1 && <div>Qty: ×{qty}</div>}
      {port.panel_side && <div>Panel: {port.panel_side}</div>}
      {port.channel_count != null && <div>Channels: {port.channel_count}</div>}
      {port.latency_ms != null && <div>Latency: {port.latency_ms}ms</div>}
      {port.hdcp_version && <div>HDCP: {port.hdcp_version}</div>}
    </div>
  )

  return (
    <Tooltip content={tooltip} side="top">
      <div className="flex flex-col items-center gap-1 cursor-default select-none" style={{ minWidth: 40 }}>
        {qty > 1 && (
          <div className="text-[8px] px-1 rounded-[1px] leading-tight" style={{ background: colour + "20", color: colour, fontFamily: "'JetBrains Mono', monospace", border: `1px solid ${colour}40` }}>
            ×{qty}
          </div>
        )}
        <div className="rounded-[1px] p-0.5 transition-all hover:scale-110" style={{ background: colour + "08", outline: `1px solid ${colour}30` }}>
          <ConnectorShape port={port} colour={colour} size={26} />
        </div>
        <div style={{ color: colour + "99" }}>
          {dir === "input" ? <ArrowDownLeft size={8} /> : dir === "output" ? <ArrowUpRight size={8} /> : <ArrowLeftRight size={8} />}
        </div>
        <div className="text-center leading-tight" style={{ color: colour + "CC", fontSize: 8, fontFamily: "'JetBrains Mono', monospace", maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {display}
        </div>
      </div>
    </Tooltip>
  )
}

export function DevicePanel({ device }: DevicePanelProps) {
  const ports = device.ports ?? []

  const grouped = new Map<string, Port[]>()
  for (const port of ports) {
    const side = port.panel_side ?? "unspecified"
    if (!grouped.has(side)) grouped.set(side, [])
    grouped.get(side)!.push(port)
  }
  for (const [, list] of grouped) {
    list.sort((a, b) => {
      const ai = a.panel_position ?? 999
      const bi = b.panel_position ?? 999
      return ai !== bi ? ai - bi : a.signal_type.localeCompare(b.signal_type)
    })
  }

  const orderedFaces = [
    ...PANEL_SIDES.filter((s) => grouped.has(s)),
    ...(grouped.has("internal") ? ["internal"] : []),
    ...(grouped.has("unspecified") ? ["unspecified"] : []),
  ]

  const protocols = device.protocols ?? []
  const control = device.control

  if (orderedFaces.length === 0) {
    return (
      <div className="p-6 text-center" style={{ color: "var(--text-secondary)", fontSize: 12 }}>
        No port layout data available for this device
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {orderedFaces.map((side) => {
        const facePorts = grouped.get(side)!
        const inputs = facePorts.filter((p) => portDir(p) === "input")
        const io = facePorts.filter((p) => portDir(p) === "io")
        const outputs = facePorts.filter((p) => portDir(p) === "output")

        return (
          <div key={side}>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                {side === "unspecified" ? "PORTS" : `${side.toUpperCase()} PANEL`}
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              <div className="flex gap-2 text-[8px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                {inputs.length > 0 && <span>↓ {inputs.length} IN</span>}
                {io.length > 0 && <span>↔ {io.length} IO</span>}
                {outputs.length > 0 && <span>↑ {outputs.length} OUT</span>}
              </div>
            </div>

            <div className="rounded-[2px] overflow-x-auto" style={{ background: "#080909", border: "2px solid #1A1C1F", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.03)" }}>
              <div className="flex justify-between px-2 pt-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
              </div>
              <div className="flex flex-wrap gap-3 px-4 py-3 min-h-[72px] items-end">
                {inputs.map((p) => <PortBlock key={p.id} port={p} />)}
                {io.map((p) => <PortBlock key={p.id} port={p} />)}
                {(inputs.length > 0 || io.length > 0) && outputs.length > 0 && (
                  <div className="self-stretch w-px my-1" style={{ background: "#2A2D35" }} />
                )}
                {outputs.map((p) => <PortBlock key={p.id} port={p} />)}
              </div>
              <div className="flex justify-between px-2 pb-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
                <div className="w-2 h-2 rounded-full" style={{ background: "#1A1C1F", boxShadow: "inset 0 1px 1px rgba(0,0,0,0.8)" }} />
              </div>
            </div>
          </div>
        )
      })}

      {/* Protocols & control */}
      {(protocols.length > 0 || control) && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-[9px] uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
              PROTOCOLS &amp; CONTROL
            </div>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {protocols.map((p, i) => (
              <span key={i} className="px-2 py-0.5 rounded-[2px] text-[10px]" style={{ background: "#3B82F620", color: "#3B82F6", border: "1px solid #3B82F630", fontFamily: "'JetBrains Mono', monospace" }} title={p.transport}>
                {p.name}{p.version ? ` ${p.version}` : ""}
              </span>
            ))}
            {control && Object.entries({
              "Web UI": control.web_ui, "REST API": control.rest_api, SNMP: control.snmp,
              "Dante Controller": control.dante_controller, RDM: control.rdm_addressable, NFC: control.nfc,
            }).filter(([, v]) => v).map(([label]) => (
              <span key={label} className="px-2 py-0.5 rounded-[2px] text-[10px]" style={{ background: "#8B5CF620", color: "#8B5CF6", border: "1px solid #8B5CF630", fontFamily: "'JetBrains Mono', monospace" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
