import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ExternalLink, Pencil, RotateCcw } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"
import { useUIStore } from "../../store/uiStore"
import { ConfidenceBadge } from "../ui/Badge"
import { getCategoryIcon } from "../canvas/DeviceNode"
import { DevicePanel } from "../panels/DevicePanel"
import { PowerSummary } from "../panels/PowerSummary"
import { SignalReport } from "../panels/SignalReport"
import { DeviceAnalysis } from "../panels/DeviceAnalysis"
import { ProjectorAnalysisPanel } from "../panels/ProjectorAnalysisPanel"
import { CATEGORY_LABELS } from "../../types/api"
import { MountPosition } from "../../types/spatial"

const BASE_TABS = [
  { id: "panel", label: "Panel" },
  { id: "specs", label: "Specs" },
  { id: "power", label: "Power" },
  { id: "connections", label: "Connections" },
  { id: "position", label: "Position" },
  { id: "analysis", label: "Analysis" },
] as const

const THROW_TAB = { id: "throw", label: "Throw" } as const

export function Inspector() {
  const { nodes, selectedNodeId, selectNode, updateNodeLabel } = useCanvasStore()
  const { inspectorTab, setInspectorTab } = useUIStore()

  const [editingLabel, setEditingLabel] = useState(false)
  const [editValue, setEditValue] = useState("")
  const labelInputRef = useRef<HTMLInputElement>(null)

  const node = nodes.find((n) => n.id === selectedNodeId)
  const record = node?.data.record
  const label = node?.data.label ?? record?.name ?? ""

  const TABS = record?.category === "projection"
    ? [...BASE_TABS, THROW_TAB]
    : BASE_TABS

  useEffect(() => { if (!editingLabel) setEditValue(label) }, [label, editingLabel])
  useEffect(() => { if (editingLabel) labelInputRef.current?.select() }, [editingLabel])

  if (!node || !record) return null

  const CategoryIcon = getCategoryIcon(record.category)

  const commitLabel = () => {
    const val = editValue.trim()
    updateNodeLabel(node.id, val || record.name)
    setEditingLabel(false)
  }

  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div
        className="px-4 pt-3 pb-0 border-b shrink-0"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Top row: icon + name + actions */}
        <div className="flex items-start gap-2">
          <div
            className="shrink-0 mt-0.5 p-1.5 rounded-[2px]"
            style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
          >
            <CategoryIcon size={13} style={{ color: record.needs_review ? "#F59E0B" : "var(--accent)" }} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Editable name */}
            <div className="flex items-center gap-1 group/name">
              {editingLabel ? (
                <input
                  ref={labelInputRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitLabel()
                    if (e.key === "Escape") setEditingLabel(false)
                  }}
                  className="flex-1 bg-transparent border-b text-sm font-semibold outline-none"
                  style={{
                    color: "var(--text-primary)",
                    borderColor: "var(--accent)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
              ) : (
                <span
                  className="text-sm font-semibold leading-tight cursor-text"
                  style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}
                  onDoubleClick={() => setEditingLabel(true)}
                  title="Double-click to rename"
                >
                  {label}
                </span>
              )}
              {!editingLabel && (
                <button
                  onClick={() => setEditingLabel(true)}
                  className="opacity-0 group-hover/name:opacity-40 hover:!opacity-100 transition-opacity"
                >
                  <Pencil size={10} style={{ color: "var(--text-secondary)" }} />
                </button>
              )}
            </div>

            {/* Manufacturer · model · category */}
            <div
              className="text-[10px] mt-0.5 flex items-center gap-1"
              style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
            >
              <span>{record.manufacturer}</span>
              <span className="opacity-40">·</span>
              <span>{record.model}</span>
              <span className="opacity-40">·</span>
              <span style={{ color: "var(--text-secondary)" }}>{CATEGORY_LABELS[record.category]}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <ConfidenceBadge confidence={record.confidence} />
            {record.needs_review && (
              <span
                className="text-[9px] px-1 py-0.5 rounded-[1px]"
                style={{ background: "#F59E0B20", color: "#F59E0B", border: "1px solid #F59E0B40", fontFamily: "'JetBrains Mono', monospace" }}
              >
                REVIEW
              </span>
            )}
            {record.source_url && (
              <a
                href={record.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-50 hover:opacity-100 transition-opacity"
                title="View datasheet ↗"
              >
                <ExternalLink size={12} style={{ color: "var(--text-secondary)" }} />
              </a>
            )}
            <button
              onClick={() => selectNode(null)}
              className="opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={13} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Scraped date */}
        <div
          className="mt-1.5 mb-2 text-[9px]"
          style={{ color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}
        >
          scraped {new Date(record.scraped_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          &nbsp;·&nbsp;schema {record.schema_version}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-3 -mb-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setInspectorTab(tab.id)}
              className="px-3 py-1.5 text-xs border-b-2 transition-colors"
              style={{
                borderBottomColor: inspectorTab === tab.id ? "var(--accent)" : "transparent",
                color: inspectorTab === tab.id ? "var(--accent)" : "var(--text-secondary)",
                fontFamily: "'JetBrains Mono', monospace",
                background: "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={inspectorTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="h-full"
          >
            {inspectorTab === "panel" && <DevicePanel record={record} />}
            {inspectorTab === "specs" && <SpecsTab record={record} />}
            {inspectorTab === "power" && <PowerSummary />}
            {inspectorTab === "connections" && <SignalReport nodeId={selectedNodeId!} />}
            {inspectorTab === "position" && <PositionTab instanceId={node.data.instanceId} />}
            {inspectorTab === "analysis" && <DeviceAnalysis nodeId={selectedNodeId!} />}
            {inspectorTab === "throw" && <ProjectorAnalysisPanel nodeId={selectedNodeId!} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function SpecsTab({ record }: { record: import("../../types/api").EquipmentRecord }) {
  const m = record.metadata
  return (
    <div className="p-4 space-y-1" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>

      {/* Physical */}
      <Section label="Physical" defaultOpen>
        {m.physical.weight_kg !== undefined && <KV k="Weight" v={`${m.physical.weight_kg} kg`} />}
        {m.physical.dimensions_mm && (
          <KV k="Dimensions" v={`${m.physical.dimensions_mm.w} × ${m.physical.dimensions_mm.h} × ${m.physical.dimensions_mm.d} mm`} />
        )}
        {m.physical.rack_units && <KV k="Rack Units" v={`${m.physical.rack_units}U`} />}
        {m.physical.rack_depth_mm && <KV k="Rack Depth" v={`${m.physical.rack_depth_mm}mm`} />}
        {m.physical.form_factor && <KV k="Form Factor" v={m.physical.form_factor} />}
        {m.physical.mounting && <KV k="Mounting" v={m.physical.mounting} />}
        {m.physical.ip_rating && <KV k="IP Rating" v={m.physical.ip_rating} />}
        {m.physical.rigging_points && <KV k="Rigging Points" v={String(m.physical.rigging_points)} />}
        {m.physical.safe_working_load_kg && <KV k="SWL" v={`${m.physical.safe_working_load_kg} kg`} />}
      </Section>

      {/* Power */}
      {m.power?.length > 0 && (
        <Section label="Power" defaultOpen>
          {m.power.map((p, i) => (
            <div key={i} className={i > 0 ? "pt-2 mt-2 border-t" : ""} style={{ borderColor: "var(--border)" }}>
              {p.label && <div className="text-[10px] uppercase mb-1" style={{ color: "#F59E0B" }}>{p.label}</div>}
              <KV k="Draw" v={`${p.draw_watts}W${p.draw_watts_max ? ` / ${p.draw_watts_max}W max` : ""}`} />
              <KV k="Voltage" v={p.voltage} />
              {p.frequency_hz && <KV k="Frequency" v={p.frequency_hz} />}
              <KV k="Connector" v={p.connector_type} />
              <KV k="Circuit" v={p.circuit_required} />
              {p.inrush_current_a && <KV k="Inrush" v={`${p.inrush_current_a}A`} />}
              {p.poe_standard && <KV k="PoE" v={p.poe_standard} />}
            </div>
          ))}
        </Section>
      )}

      {/* Projection */}
      {m.projection && (
        <Section label="Projection">
          {m.projection.lumens && <KV k="Lumens" v={`${m.projection.lumens.toLocaleString()} lm`} />}
          {m.projection.resolution && <KV k="Resolution" v={m.projection.resolution} />}
          {(m.projection.throw_ratio_min || m.projection.throw_ratio_max) && (
            <KV k="Throw Ratio" v={
              m.projection.throw_ratio_min && m.projection.throw_ratio_max
                ? `${m.projection.throw_ratio_min}:1 – ${m.projection.throw_ratio_max}:1`
                : `${m.projection.throw_ratio_min ?? m.projection.throw_ratio_max}:1`
            } />
          )}
          {m.projection.lens_shift_v_percent !== undefined && <KV k="V Lens Shift" v={`${m.projection.lens_shift_v_percent}%`} />}
          {m.projection.lens_shift_h_percent !== undefined && <KV k="H Lens Shift" v={`${m.projection.lens_shift_h_percent}%`} />}
          {m.projection.contrast_ratio && <KV k="Contrast" v={m.projection.contrast_ratio} />}
          {m.projection.lamp_type && <KV k="Lamp Type" v={m.projection.lamp_type} />}
          {m.projection.lamp_hours && <KV k="Lamp Hours" v={`${m.projection.lamp_hours.toLocaleString()} hrs`} />}
        </Section>
      )}

      {/* Display */}
      {m.display && (
        <Section label="Display">
          {m.display.screen_size_inches && <KV k="Screen Size" v={`${m.display.screen_size_inches}"`} />}
          {m.display.resolution && <KV k="Resolution" v={m.display.resolution} />}
          {m.display.refresh_rate_hz && <KV k="Refresh Rate" v={`${m.display.refresh_rate_hz} Hz`} />}
          {m.display.brightness_nits && <KV k="Brightness" v={`${m.display.brightness_nits} nits`} />}
          {m.display.contrast_ratio && <KV k="Contrast" v={m.display.contrast_ratio} />}
          {m.display.panel_type && <KV k="Panel Type" v={m.display.panel_type} />}
        </Section>
      )}

      {/* Video */}
      {m.video && (
        <Section label="Video">
          {m.video.resolution && <KV k="Resolution" v={m.video.resolution} />}
          {m.video.refresh_rate_hz && <KV k="Refresh Rate" v={`${m.video.refresh_rate_hz} Hz`} />}
          {m.video.hdr !== undefined && <KV k="HDR" v={m.video.hdr ? "Yes" : "No"} />}
          {m.video.colour_space && <KV k="Colour Space" v={m.video.colour_space} />}
        </Section>
      )}

      {/* Audio */}
      {m.audio && (
        <Section label="Audio">
          {m.audio.frequency_response && <KV k="Frequency" v={m.audio.frequency_response} />}
          {m.audio.spl_db && <KV k="SPL" v={`${m.audio.spl_db} dB`} />}
          {m.audio.impedance_ohms && <KV k="Impedance" v={`${m.audio.impedance_ohms} Ω`} />}
          {m.audio.amplifier_class && <KV k="Amp Class" v={m.audio.amplifier_class} />}
          {m.audio.channels_in && <KV k="Ch. In" v={String(m.audio.channels_in)} />}
          {m.audio.channels_out && <KV k="Ch. Out" v={String(m.audio.channels_out)} />}
        </Section>
      )}

      {/* Lighting */}
      {m.lighting && (
        <Section label="Lighting">
          {m.lighting.dmx_channels && <KV k="DMX Channels" v={String(m.lighting.dmx_channels)} />}
          {m.lighting.beam_angle_degrees && <KV k="Beam Angle" v={`${m.lighting.beam_angle_degrees}°`} />}
          {m.lighting.cri && <KV k="CRI" v={String(m.lighting.cri)} />}
          {m.lighting.cct_k && <KV k="CCT" v={`${m.lighting.cct_k}K`} />}
          {m.lighting.gobo_slots && <KV k="Gobo Slots" v={String(m.lighting.gobo_slots)} />}
        </Section>
      )}

      {/* HDMI Cable */}
      {m.hdmi_cable && (
        <Section label="HDMI Cable">
          {m.hdmi_cable.length_m && <KV k="Length" v={`${m.hdmi_cable.length_m}m`} />}
          {m.hdmi_cable.version && <KV k="HDMI Version" v={m.hdmi_cable.version} />}
          {m.hdmi_cable.max_resolution && <KV k="Max Resolution" v={m.hdmi_cable.max_resolution} />}
          {m.hdmi_cable.max_refresh_hz && <KV k="Max Refresh" v={`${m.hdmi_cable.max_refresh_hz} Hz`} />}
          {m.hdmi_cable.supports_hdr !== undefined && <KV k="HDR" v={m.hdmi_cable.supports_hdr ? "Yes" : "No"} />}
          {m.hdmi_cable.supports_arc !== undefined && <KV k="ARC" v={m.hdmi_cable.supports_arc ? "Yes" : "No"} />}
          {m.hdmi_cable.supports_earc !== undefined && <KV k="eARC" v={m.hdmi_cable.supports_earc ? "Yes" : "No"} />}
        </Section>
      )}

      {/* Environment */}
      {(m.environment?.operating_temp_c || m.environment?.coverage_degrees || m.environment?.min_distance_m || m.environment?.max_distance_m) && (
        <Section label="Environment">
          {m.environment.operating_temp_c && (
            <KV k="Temp Range" v={`${m.environment.operating_temp_c.min}°C – ${m.environment.operating_temp_c.max}°C`} />
          )}
          {m.environment.coverage_degrees && <KV k="Coverage" v={`${m.environment.coverage_degrees}°`} />}
          {m.environment.min_distance_m && <KV k="Min Dist." v={`${m.environment.min_distance_m}m`} />}
          {m.environment.max_distance_m && <KV k="Max Dist." v={`${m.environment.max_distance_m}m`} />}
        </Section>
      )}

      {/* Signal Chain */}
      {m.signal_chain && (
        <Section label="Signal Chain">
          {m.signal_chain.is_matrix_router && (
            <KV k="Matrix" v={`${m.signal_chain.matrix_inputs}×${m.signal_chain.matrix_outputs}${m.signal_chain.routing_any_to_any ? " (any→any)" : ""}`} />
          )}
          {m.signal_chain.dante_enabled && (
            <KV k="Dante" v={`${m.signal_chain.dante_channels ?? "?"} ch${m.signal_chain.dante_latency_ms_options?.length ? ` · ${m.signal_chain.dante_latency_ms_options.join("/")}ms` : ""}`} />
          )}
          {m.signal_chain.daisy_chainable && (
            <KV k="Daisy Chain" v={m.signal_chain.daisy_chain_max_units ? `max ${m.signal_chain.daisy_chain_max_units} units` : "Yes"} />
          )}
          {m.signal_chain.poe_powered && <KV k="PoE Powered" v="Yes" />}
          {m.signal_chain.poe_provides && (
            <KV k="PoE Budget" v={m.signal_chain.poe_budget_watts ? `${m.signal_chain.poe_budget_watts}W` : "Yes"} />
          )}
          {m.signal_chain.artnet_universe_default !== undefined && (
            <KV k="Art-Net Universe" v={String(m.signal_chain.artnet_universe_default)} />
          )}
          {m.signal_chain.sacn_universe_default !== undefined && (
            <KV k="sACN Universe" v={String(m.signal_chain.sacn_universe_default)} />
          )}
          {m.signal_chain.osc_port && <KV k="OSC Port" v={String(m.signal_chain.osc_port)} />}
          {m.signal_chain.ip_control_port !== undefined && (
            <KV k="IP Control" v={`Port ${m.signal_chain.ip_control_port} (${m.signal_chain.ip_control_protocol ?? "TCP"})`} />
          )}
        </Section>
      )}

      {/* Network */}
      {m.connectivity?.network?.length > 0 && (
        <Section label="Network">
          {m.connectivity.network.map((n, i) => (
            <div key={i} className="text-[11px]" style={{ color: "var(--text-primary)" }}>{n}</div>
          ))}
        </Section>
      )}

      {/* Notes */}
      {m.notes && (
        <Section label="Notes">
          <div className="text-[11px] leading-relaxed" style={{ color: "var(--text-primary)" }}>{m.notes}</div>
        </Section>
      )}

      {/* Raw text */}
      {m.raw_text_excerpt && (
        <Section label="Raw Excerpt">
          <pre
            className="text-[10px] leading-relaxed whitespace-pre-wrap break-words p-2 rounded-[2px]"
            style={{ background: "var(--bg)", color: "var(--text-secondary)" }}
          >
            {m.raw_text_excerpt}
          </pre>
        </Section>
      )}
    </div>
  )
}

function Section({ label, children, defaultOpen = false }: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary
        className="flex items-center gap-2 py-1.5 cursor-pointer list-none select-none"
        style={{ color: "var(--text-secondary)" }}
      >
        <span
          className="text-[9px] uppercase tracking-[0.15em] font-semibold flex-1"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {label}
        </span>
        <span className="text-[10px] opacity-40 group-open:rotate-180 transition-transform inline-block">▾</span>
      </summary>
      <div className="pl-2 pb-2 space-y-1">
        {children}
      </div>
    </details>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[11px] shrink-0 w-28" style={{ color: "var(--text-secondary)" }}>{k}</span>
      <span className="text-[11px]" style={{ color: "var(--text-primary)" }}>{v}</span>
    </div>
  )
}

const MOUNT_OPTIONS: { value: MountPosition; label: string }[] = [
  { value: "floor", label: "Floor" },
  { value: "table", label: "Table / Desk" },
  { value: "rack", label: "Rack" },
  { value: "truss", label: "Truss / Flown" },
  { value: "freestanding", label: "Freestanding" },
  { value: "wall-front", label: "Wall (Front)" },
  { value: "wall-rear", label: "Wall (Rear)" },
  { value: "ceiling", label: "Ceiling" },
]

function PositionTab({ instanceId }: { instanceId: string }) {
  const { placements, setPlacement, initPlacement, nodes } = useCanvasStore()
  const placement = placements[instanceId]
  const node = nodes.find((n) => n.id === instanceId)

  if (!placement) {
    return (
      <div className="p-4 flex flex-col gap-3">
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          No 3D position assigned yet.
        </p>
        {node && (
          <button
            onClick={() => initPlacement(instanceId, node.data.record)}
            className="px-3 py-1.5 text-xs rounded-[2px] self-start"
            style={{ background: "var(--accent)", color: "#000", fontFamily: "'JetBrains Mono', monospace" }}
          >
            Assign Default Position
          </button>
        )}
      </div>
    )
  }

  const { position3d, rotation, mounted } = placement

  function setXYZ(axis: "x" | "y" | "z", raw: string) {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setPlacement(instanceId, { position3d: { ...position3d, [axis]: v } })
  }

  function setRotY(raw: string) {
    const v = parseFloat(raw)
    if (isNaN(v)) return
    setPlacement(instanceId, { rotation: { ...rotation, y: v } })
  }

  return (
    <div className="p-4 space-y-5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Mount */}
      <div className="space-y-1.5">
        <label className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-secondary)" }}>
          Mount Position
        </label>
        <select
          value={mounted}
          onChange={(e) => setPlacement(instanceId, { mounted: e.target.value as MountPosition })}
          className="w-full px-2 py-1.5 text-xs rounded-[2px] outline-none"
          style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          {MOUNT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* XYZ */}
      <div className="space-y-1.5">
        <label className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-secondary)" }}>
          Position (metres)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis) => (
            <div key={axis} className="flex flex-col gap-1">
              <span className="text-[9px] uppercase" style={{ color: "var(--text-secondary)" }}>{axis}</span>
              <input
                type="number"
                step="0.1"
                value={position3d[axis].toFixed(2)}
                onChange={(e) => setXYZ(axis, e.target.value)}
                className="w-full px-2 py-1 text-xs rounded-[2px] outline-none text-right"
                style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rotation Y */}
      <div className="space-y-1.5">
        <label className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--text-secondary)" }}>
          Rotation Y: {Math.round(rotation.y * (180 / Math.PI))}°
        </label>
        <input
          type="range"
          min={-Math.PI}
          max={Math.PI}
          step={0.01}
          value={rotation.y}
          onChange={(e) => setRotY(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Reset */}
      {node && (
        <button
          onClick={() => initPlacement(instanceId, node.data.record)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[2px] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          <RotateCcw size={11} />
          Reset to default
        </button>
      )}
    </div>
  )
}
