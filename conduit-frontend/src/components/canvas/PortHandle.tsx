import { Handle, Position } from "@xyflow/react"
import { ConnectorPort } from "../../types/api"
import { portColourHex } from "../../utils/portColour"
import { Tooltip } from "../ui/Tooltip"

interface PortHandleProps {
  port: ConnectorPort
  direction: "input" | "output"
  index: number
  position: Position
}

function PortTooltipContent({ port }: { port: ConnectorPort }) {
  return (
    <div className="space-y-0.5 text-[10px]">
      <div style={{ color: portColourHex(port.signal_type) }}>
        {port.protocol}{port.version ? ` ${port.version}` : ""} · {port.signal_type}
      </div>
      {port.connector && (
        <div>Connector: {port.connector}</div>
      )}
      {port.label && (
        <div>Label: {port.label}</div>
      )}
      {port.max_cable_distance_m && (
        <div>Max cable: {port.max_cable_distance_m}m</div>
      )}
      {port.latency_ms && (
        <div>Latency: {port.latency_ms}ms</div>
      )}
      {port.sample_rates_hz?.length && (
        <div>Sample rates: {port.sample_rates_hz.join(", ")} Hz</div>
      )}
      {port.bit_depths?.length && (
        <div>Bit depth: {port.bit_depths.join(", ")} bit</div>
      )}
      {port.hdcp_version && (
        <div>HDCP: {port.hdcp_version}</div>
      )}
    </div>
  )
}

export function PortHandle({ port, direction, index, position }: PortHandleProps) {
  const handleId = `${direction}-${port.protocol.replace(/\s+/g, "_")}-${index}`
  const colour = portColourHex(port.signal_type)
  const isOutput = direction === "output"

  const label = [
    port.label || port.protocol,
    port.version ? port.version : null,
    port.quantity > 1 ? `×${port.quantity}` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className="relative flex items-center my-0.5 px-2"
      style={{
        flexDirection: isOutput ? "row-reverse" : "row",
        justifyContent: isOutput ? "flex-start" : "flex-start",
      }}
    >
      <Tooltip content={<PortTooltipContent port={port} />} side={isOutput ? "right" : "left"}>
        <div
          className="flex items-center gap-1.5"
          style={{ flexDirection: isOutput ? "row-reverse" : "row" }}
        >
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: colour, flexShrink: 0 }}
          />
          <span
            className="text-[10px] truncate"
            style={{
              color: "var(--text-secondary)",
              maxWidth: 90,
              textAlign: isOutput ? "right" : "left",
            }}
          >
            {label}
          </span>
        </div>
      </Tooltip>

      <Handle
        type={direction === "input" ? "target" : "source"}
        position={position}
        id={handleId}
        style={{
          background: colour,
          width: 10,
          height: 10,
          border: `2px solid var(--panel)`,
          borderRadius: "50%",
          cursor: "crosshair",
        }}
      />
    </div>
  )
}
