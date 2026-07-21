import { useCanvasStore } from "../../store/canvasStore"
import { portColourHex } from "../../utils/portColour"
import { deviceName, deviceMaxWatts } from "../../conduit/device"

const RACK_WIDTH_MM = 482.6
const U_HEIGHT_PX = 22
const RACK_WIDTH_PX = 320
const U_PX = U_HEIGHT_PX

const RACK_CATEGORIES = new Set([
  "media-server", "network-switch", "network-router", "network-gateway",
  "video-switcher", "video-scaler", "video-converter", "video-matrix",
  "video-capture", "video-encoder", "video-decoder", "led-processor",
  "audio-processor", "audio-interface", "audio-amplifier", "audio-stagebox",
  "power-distribution", "ups", "intercom-matrix", "rf-distribution",
  "antenna-combiner", "lighting-dimmer", "lighting-node", "lighting-gateway",
])

export function RackView() {
  void RACK_WIDTH_MM
  const { nodes } = useCanvasStore()

  const rackDevices = nodes.filter(
    (n) =>
      n.data.device.form_factor === "rackmount" ||
      n.data.device.rack_units != null ||
      RACK_CATEGORIES.has(n.data.device.category)
  )

  const totalU = rackDevices.reduce((sum, n) => sum + (n.data.device.rack_units ?? 1), 0)
  const rackU = Math.max(totalU + 4, 12)
  const rackHeightPx = rackU * U_PX + 40

  let yOffset = 20

  return (
    <div className="flex-1 overflow-auto flex items-start justify-center p-8" style={{ background: "var(--bg)" }}>
      <div>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
          19&quot; Equipment Rack · {rackU}U
        </div>

        <svg width={RACK_WIDTH_PX + 60} height={rackHeightPx + 40} style={{ overflow: "visible" }}>
          {Array.from({ length: rackU }, (_, i) => (
            <text key={i} x={22} y={20 + i * U_PX + U_PX / 2 + 4} textAnchor="middle" fontSize={8} fill="#4A5060" fontFamily="JetBrains Mono, monospace">
              {rackU - i}
            </text>
          ))}

          <rect x={30} y={10} width={RACK_WIDTH_PX} height={rackHeightPx} fill="#111214" stroke="#2A2D35" strokeWidth={2} rx={3} />
          <rect x={30} y={10} width={16} height={rackHeightPx} fill="#1A1D22" stroke="#2A2D35" strokeWidth={1} />
          <rect x={30 + RACK_WIDTH_PX - 16} y={10} width={16} height={rackHeightPx} fill="#1A1D22" stroke="#2A2D35" strokeWidth={1} />

          {Array.from({ length: rackU + 1 }, (_, i) => (
            <line key={i} x1={30} y1={10 + i * U_PX} x2={30 + RACK_WIDTH_PX} y2={10 + i * U_PX} stroke="#2A2D35" strokeWidth={0.5} opacity={0.5} />
          ))}

          {rackDevices.map((node) => {
            const device = node.data.device
            const ru = device.rack_units ?? 1
            const deviceH = ru * U_PX - 2
            const deviceY = yOffset
            yOffset += ru * U_PX

            const label = node.data.label ?? deviceName(device)
            const allPorts = device.ports

            return (
              <g key={node.id}>
                <rect x={46} y={10 + deviceY} width={RACK_WIDTH_PX - 32} height={deviceH} fill="#1A1C20" stroke="#2A2D35" strokeWidth={1} rx={1} />
                <text x={58} y={10 + deviceY + deviceH / 2 + 4} fontSize={Math.min(11, deviceH * 0.5)} fill="#B8BCC8" fontFamily="DM Sans, sans-serif" fontWeight={500}>
                  {label}
                </text>
                {ru > 1 && (
                  <text x={58} y={10 + deviceY + deviceH / 2 + 17} fontSize={9} fill="#4A5060" fontFamily="JetBrains Mono, monospace">
                    {device.manufacturer} {device.model}
                  </text>
                )}
                {allPorts.slice(0, 12).map((port, i) => (
                  <circle key={port.id} cx={46 + RACK_WIDTH_PX - 32 - 12 - i * 14} cy={10 + deviceY + deviceH / 2} r={4} fill={portColourHex(port.signal_type)} opacity={0.8} />
                ))}
                {[46 + 4, 46 + RACK_WIDTH_PX - 32 - 4].map((sx, i) => (
                  <circle key={i} cx={sx} cy={10 + deviceY + deviceH / 2} r={3} fill="#0D0E12" stroke="#2A2D35" strokeWidth={1} />
                ))}
              </g>
            )
          })}

          {rackDevices.length === 0 && (
            <text x={30 + RACK_WIDTH_PX / 2} y={rackHeightPx / 2 + 10} textAnchor="middle" fontSize={11} fill="#4A5060" fontFamily="JetBrains Mono, monospace">
              No rack-mounted devices on canvas
            </text>
          )}
        </svg>

        {rackDevices.length > 0 && (
          <div className="mt-4 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
            <span>Total rack draw: </span>
            <span style={{ color: "var(--text-primary)" }}>
              {Math.round(rackDevices.reduce((sum, n) => sum + deviceMaxWatts(n.data.device), 0))}W
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
