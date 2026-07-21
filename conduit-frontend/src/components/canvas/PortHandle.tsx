import { Handle, Position } from "@xyflow/react"
import type { Port } from "../../conduit/types"
import { signalColour, signalLabel } from "../../conduit/signalType"
import { portHandleId, portQuantity, connectorLabel, type HandleRole } from "../../conduit/device"
import { Tooltip } from "../ui/Tooltip"

interface PortHandleProps {
  port: Port
  role: HandleRole
  position: Position
}

function PortTooltipContent({ port }: { port: Port }) {
  const rates = Array.isArray(port.sample_rate_hz) ? port.sample_rate_hz : port.sample_rate_hz != null ? [port.sample_rate_hz] : []
  const depths = Array.isArray(port.bit_depth) ? port.bit_depth : port.bit_depth != null ? [port.bit_depth] : []
  return (
    <div className="space-y-0.5 text-[10px]">
      <div style={{ color: signalColour(port.signal_type) }}>
        {signalLabel(port.signal_type)} · {port.signal_type}
      </div>
      <div>Direction: {port.direction}</div>
      {port.connector_type && <div>Connector: {connectorLabel(port.connector_type)}</div>}
      {port.label && <div>Label: {port.label}</div>}
      {port.panel_side && <div>Panel: {port.panel_side}</div>}
      {port.channel_count != null && <div>Channels: {port.channel_count}</div>}
      {port.impedance_ohm != null && <div>Impedance: {port.impedance_ohm}Ω</div>}
      {port.latency_ms != null && <div>Latency: {port.latency_ms}ms</div>}
      {port.hdcp_version && <div>HDCP: {port.hdcp_version}</div>}
      {rates.length > 0 && <div>Sample rate: {rates.join(", ")} Hz</div>}
      {depths.length > 0 && <div>Bit depth: {depths.join(", ")} bit</div>}
      {(port.signal_modes?.length ?? 0) > 0 && (
        <div>Modes: {port.signal_modes!.map((m) => signalLabel(m.signal_type)).join(", ")}</div>
      )}
    </div>
  )
}

export function PortHandle({ port, role, position }: PortHandleProps) {
  const handleId = portHandleId(port, role)
  const colour = signalColour(port.signal_type)
  const isOutput = role === "out"
  const qty = portQuantity(port)

  const label = [port.label || signalLabel(port.signal_type), qty > 1 ? `×${qty}` : null]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className="relative flex items-center my-0.5 px-2"
      style={{ flexDirection: isOutput ? "row-reverse" : "row", justifyContent: "flex-start" }}
    >
      <Tooltip content={<PortTooltipContent port={port} />} side={isOutput ? "right" : "left"}>
        <div className="flex items-center gap-1.5" style={{ flexDirection: isOutput ? "row-reverse" : "row" }}>
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colour, flexShrink: 0 }} />
          <span
            className="text-[10px] truncate"
            style={{ color: "var(--text-secondary)", maxWidth: 90, textAlign: isOutput ? "right" : "left" }}
          >
            {label}
          </span>
        </div>
      </Tooltip>

      <Handle
        type={isOutput ? "source" : "target"}
        position={position}
        id={handleId}
        style={{
          background: colour,
          width: 10,
          height: 10,
          border: "2px solid var(--panel)",
          borderRadius: "50%",
          cursor: "crosshair",
        }}
      />
    </div>
  )
}
