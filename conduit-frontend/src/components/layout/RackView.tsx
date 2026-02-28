import { useCanvasStore } from "../../store/canvasStore"
import { portColourHex } from "../../utils/portColour"

const RACK_WIDTH_MM = 482.6
const U_HEIGHT_PX = 22
const RACK_WIDTH_PX = 320
const U_PX = U_HEIGHT_PX

export function RackView() {
  const { nodes } = useCanvasStore()

  const rackDevices = nodes.filter(
    (n) => n.data.record.metadata?.physical?.form_factor === "rackmount"
      || n.data.record.metadata?.physical?.rack_units
      || ["media_server", "networking", "power_distribution", "signal_processing", "video_processing", "audio_playback"].includes(n.data.record.category)
  )

  const totalU = rackDevices.reduce((sum, n) => sum + (n.data.record.metadata?.physical?.rack_units ?? 1), 0)
  const rackU = Math.max(totalU + 4, 12)
  const rackHeightPx = rackU * U_PX + 40

  let yOffset = 20 // top padding in rack

  return (
    <div
      className="flex-1 overflow-auto flex items-start justify-center p-8"
      style={{ background: "var(--bg)" }}
    >
      <div>
        {/* Rack header */}
        <div
          className="text-xs uppercase tracking-widest mb-3"
          style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          19&quot; Equipment Rack · {rackU}U
        </div>

        {/* Rack SVG */}
        <svg
          width={RACK_WIDTH_PX + 60}
          height={rackHeightPx + 40}
          style={{ overflow: "visible" }}
        >
          {/* Rail markers (left) */}
          {Array.from({ length: rackU }, (_, i) => (
            <text
              key={i}
              x={22}
              y={20 + i * U_PX + U_PX / 2 + 4}
              textAnchor="middle"
              fontSize={8}
              fill="#4A5060"
              fontFamily="JetBrains Mono, monospace"
            >
              {rackU - i}
            </text>
          ))}

          {/* Rack outline */}
          <rect
            x={30}
            y={10}
            width={RACK_WIDTH_PX}
            height={rackHeightPx}
            fill="#111214"
            stroke="#2A2D35"
            strokeWidth={2}
            rx={3}
          />

          {/* Rack rails */}
          <rect x={30} y={10} width={16} height={rackHeightPx} fill="#1A1D22" stroke="#2A2D35" strokeWidth={1} />
          <rect x={30 + RACK_WIDTH_PX - 16} y={10} width={16} height={rackHeightPx} fill="#1A1D22" stroke="#2A2D35" strokeWidth={1} />

          {/* U slot lines */}
          {Array.from({ length: rackU + 1 }, (_, i) => (
            <line
              key={i}
              x1={30}
              y1={10 + i * U_PX}
              x2={30 + RACK_WIDTH_PX}
              y2={10 + i * U_PX}
              stroke="#2A2D35"
              strokeWidth={0.5}
              opacity={0.5}
            />
          ))}

          {/* Devices */}
          {rackDevices.map((node) => {
            const record = node.data.record
            const ru = record.metadata?.physical?.rack_units ?? 1
            const deviceH = ru * U_PX - 2
            const y = 10 + yOffset
            const deviceY = yOffset
            yOffset += ru * U_PX

            const label = node.data.label ?? record.name
            const outputs = record.metadata?.connectivity?.outputs ?? []
            const inputs = record.metadata?.connectivity?.inputs ?? []
            const allPorts = [...inputs, ...outputs]

            return (
              <g key={node.id}>
                {/* Device body */}
                <rect
                  x={46}
                  y={10 + deviceY}
                  width={RACK_WIDTH_PX - 32}
                  height={deviceH}
                  fill="#1A1C20"
                  stroke="#2A2D35"
                  strokeWidth={1}
                  rx={1}
                />

                {/* Device name */}
                <text
                  x={58}
                  y={10 + deviceY + deviceH / 2 + 4}
                  fontSize={Math.min(11, deviceH * 0.5)}
                  fill="#B8BCC8"
                  fontFamily="DM Sans, sans-serif"
                  fontWeight={500}
                >
                  {label}
                </text>

                {/* Manufacturer + model */}
                {ru > 1 && (
                  <text
                    x={58}
                    y={10 + deviceY + deviceH / 2 + 17}
                    fontSize={9}
                    fill="#4A5060"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {record.manufacturer} {record.model}
                  </text>
                )}

                {/* Port indicators on right side */}
                {allPorts.slice(0, 12).map((port, i) => (
                  <circle
                    key={i}
                    cx={46 + RACK_WIDTH_PX - 32 - 12 - i * 14}
                    cy={10 + deviceY + deviceH / 2}
                    r={4}
                    fill={portColourHex(port.signal_type ?? "other")}
                    opacity={0.8}
                  />
                ))}

                {/* Screw holes */}
                {[46 + 4, 46 + RACK_WIDTH_PX - 32 - 4].map((sx, i) => (
                  <circle key={i} cx={sx} cy={10 + deviceY + deviceH / 2} r={3} fill="#0D0E12" stroke="#2A2D35" strokeWidth={1} />
                ))}
              </g>
            )
          })}

          {/* Empty U slots */}
          {rackDevices.length === 0 && (
            <text
              x={30 + RACK_WIDTH_PX / 2}
              y={rackHeightPx / 2 + 10}
              textAnchor="middle"
              fontSize={11}
              fill="#4A5060"
              fontFamily="JetBrains Mono, monospace"
            >
              No rack-mounted devices on canvas
            </text>
          )}
        </svg>

        {/* Power summary for rack */}
        {rackDevices.length > 0 && (
          <div className="mt-4 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
            <span>Total rack draw: </span>
            <span style={{ color: "var(--text-primary)" }}>
              {rackDevices.reduce((sum, n) => {
                const powerEntries = n.data.record.metadata?.power ?? []
                return sum + powerEntries.reduce((s: number, p: any) => s + (p.draw_watts ?? 0), 0)
              }, 0)}W
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
