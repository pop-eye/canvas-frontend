import { memo, useState, useRef, useEffect, useCallback } from "react"
import { NodeProps, Position } from "@xyflow/react"
import {
  Monitor, Projector, Volume2, Lightbulb, Server, Network,
  Zap, Move, Radio, Cpu, Cable, Plug, HelpCircle, AlertTriangle, Pencil, LucideIcon
} from "lucide-react"
import { DeviceNode as DeviceNodeType } from "../../types/canvas"
import { EquipmentCategory } from "../../types/api"
import { PortHandle } from "./PortHandle"
import { useCanvasStore } from "../../store/canvasStore"

const ICON_MAP: Record<EquipmentCategory, LucideIcon> = {
  projection: Projector,
  display: Monitor,
  audio_amplified: Volume2,
  audio_passive: Volume2,
  lighting: Lightbulb,
  media_server: Server,
  networking: Network,
  power_distribution: Zap,
  rigging: Move,
  sensor_tracking: Radio,
  control: Cpu,
  cable_signal: Cable,
  cable_hdmi: Plug,
  other: HelpCircle,
}

export function getCategoryIcon(category: EquipmentCategory): LucideIcon {
  return ICON_MAP[category] ?? HelpCircle
}

export const DeviceNode = memo(function DeviceNode({ data, selected }: NodeProps<DeviceNodeType>) {
  const { record, label } = data
  const m = record.metadata
  const { selectedNodeId, updateNodeLabel } = useCanvasStore()
  const isSelected = selected || selectedNodeId === data.instanceId

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label ?? record.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const Icon = getCategoryIcon(record.category)
  const inputs = m.connectivity?.inputs ?? []
  const outputs = m.connectivity?.outputs ?? []
  const powerSpec = m.power?.[0]

  const accentColour = record.needs_review ? "#F59E0B" : isSelected ? "var(--accent)" : "#2A2D35"

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(label ?? record.name)
    setEditing(true)
  }, [label, record.name])

  const commitEdit = useCallback(() => {
    const val = editValue.trim()
    updateNodeLabel(data.instanceId, val || record.name)
    setEditing(false)
  }, [editValue, data.instanceId, record.name, updateNodeLabel])

  const onEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit()
    if (e.key === "Escape") setEditing(false)
    e.stopPropagation()
  }, [commitEdit])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  // Sync editValue when label changes externally
  useEffect(() => {
    if (!editing) setEditValue(label ?? record.name)
  }, [label, record.name, editing])

  return (
    <div
      className="rounded-[2px] overflow-visible group"
      style={{
        width: 300,
        background: "var(--panel)",
        border: `1px solid ${accentColour}`,
        borderLeft: `3px solid ${accentColour}`,
        boxShadow: isSelected
          ? `0 0 0 1px ${accentColour}40, 0 8px 32px rgba(0,0,0,0.6)`
          : "0 4px 24px rgba(0,0,0,0.4)",
        fontFamily: "'JetBrains Mono', monospace",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Icon
          size={13}
          style={{ color: record.needs_review ? "#F59E0B" : "var(--accent)", flexShrink: 0 }}
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onEditKeyDown}
              className="w-full bg-transparent outline-none border-b text-xs font-semibold"
              style={{
                color: "var(--text-primary)",
                borderColor: "var(--accent)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          ) : (
            <div
              className="flex items-center gap-1 group/label cursor-text"
              onDoubleClick={startEdit}
              title="Double-click to rename"
            >
              <div
                className="text-xs font-semibold truncate"
                style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}
              >
                {label ?? record.name}
              </div>
              <Pencil
                size={9}
                className="opacity-0 group-hover/label:opacity-40 transition-opacity shrink-0"
                style={{ color: "var(--text-secondary)" }}
              />
            </div>
          )}
          <div
            className="text-[10px] truncate"
            style={{ color: "var(--text-secondary)" }}
          >
            {record.manufacturer} · {record.model}
          </div>
        </div>
        {record.needs_review && (
          <AlertTriangle size={11} className="text-amber-400 shrink-0" />
        )}
      </div>

      {/* Port zone */}
      {(inputs.length > 0 || outputs.length > 0) && (
        <div
          className="flex"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* Inputs column */}
          <div
            className="flex-1 py-1.5"
            style={{ borderRight: inputs.length > 0 && outputs.length > 0 ? "1px solid var(--border)" : "none" }}
          >
            {inputs.length > 0 && (
              <div
                className="px-2 pb-1 text-[9px] uppercase tracking-widest"
                style={{ color: "var(--text-secondary)" }}
              >
                Inputs
              </div>
            )}
            {inputs.map((port, idx) => (
              <PortHandle
                key={`in-${idx}`}
                port={port}
                direction="input"
                index={idx}
                position={Position.Left}
              />
            ))}
          </div>

          {/* Outputs column */}
          {outputs.length > 0 && (
            <div className="flex-1 py-1.5">
              <div
                className="px-2 pb-1 text-[9px] uppercase tracking-widest text-right"
                style={{ color: "var(--text-secondary)" }}
              >
                Outputs
              </div>
              {outputs.map((port, idx) => (
                <PortHandle
                  key={`out-${idx}`}
                  port={port}
                  direction="output"
                  index={idx}
                  position={Position.Right}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Power footer */}
      <div
        className="px-3 py-1.5 text-[10px] flex items-center gap-1.5"
        style={{ color: powerSpec ? "var(--text-secondary)" : "#2A2D35" }}
      >
        <Zap size={9} style={{ color: powerSpec ? "#EF4444" : "#2A2D35", flexShrink: 0 }} />
        {powerSpec ? (
          <span className="truncate">
            {powerSpec.draw_watts}W · {powerSpec.connector_type} · {powerSpec.circuit_required}
          </span>
        ) : (
          <span>No power data</span>
        )}
      </div>
    </div>
  )
})
