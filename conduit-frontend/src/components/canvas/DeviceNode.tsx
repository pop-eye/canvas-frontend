import { memo, useState, useRef, useEffect, useCallback } from "react"
import { NodeProps, Position } from "@xyflow/react"
import { Zap, AlertTriangle, Pencil } from "lucide-react"
import { DeviceNode as DeviceNodeType } from "../../types/canvas"
import { PortHandle } from "./PortHandle"
import { useCanvasStore } from "../../store/canvasStore"
import { getCategoryIcon, categoryColour } from "../../conduit/category"
import { deviceName, deviceInputs, deviceOutputs, deviceNeedsReview, devicePowerLabel } from "../../conduit/device"

// Re-exported for back-compat with modules that imported it from here.
export { getCategoryIcon } from "../../conduit/category"

export const DeviceNode = memo(function DeviceNode({ data, selected }: NodeProps<DeviceNodeType>) {
  const { device, label } = data
  const name = deviceName(device)
  const { selectedNodeId, updateNodeLabel } = useCanvasStore()
  const isSelected = selected || selectedNodeId === data.instanceId

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(label ?? name)
  const inputRef = useRef<HTMLInputElement>(null)

  const Icon = getCategoryIcon(device.category)
  const inputs = deviceInputs(device)
  const outputs = deviceOutputs(device)
  const needsReview = deviceNeedsReview(device)
  const powerLabel = devicePowerLabel(device)
  const catColour = categoryColour(device.category)

  const accentColour = needsReview ? "#F59E0B" : isSelected ? "var(--accent)" : "#2A2D35"

  const startEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setEditValue(label ?? name)
    setEditing(true)
  }, [label, name])

  const commitEdit = useCallback(() => {
    const val = editValue.trim()
    updateNodeLabel(data.instanceId, val || name)
    setEditing(false)
  }, [editValue, data.instanceId, name, updateNodeLabel])

  const onEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitEdit()
    if (e.key === "Escape") setEditing(false)
    e.stopPropagation()
  }, [commitEdit])

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])
  useEffect(() => { if (!editing) setEditValue(label ?? name) }, [label, name, editing])

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
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <Icon size={13} style={{ color: needsReview ? "#F59E0B" : catColour, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={onEditKeyDown}
              className="w-full bg-transparent outline-none border-b text-xs font-semibold"
              style={{ color: "var(--text-primary)", borderColor: "var(--accent)", fontFamily: "'DM Sans', sans-serif" }}
            />
          ) : (
            <div className="flex items-center gap-1 group/label cursor-text" onDoubleClick={startEdit} title="Double-click to rename">
              <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
                {label ?? name}
              </div>
              <Pencil size={9} className="opacity-0 group-hover/label:opacity-40 transition-opacity shrink-0" style={{ color: "var(--text-secondary)" }} />
            </div>
          )}
          <div className="text-[10px] truncate" style={{ color: "var(--text-secondary)" }}>
            {device.manufacturer} · {device.model}
          </div>
        </div>
        {needsReview && <AlertTriangle size={11} className="text-amber-400 shrink-0" />}
      </div>

      {/* Port zone */}
      {(inputs.length > 0 || outputs.length > 0) && (
        <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
          {/* Inputs column */}
          <div
            className="flex-1 py-1.5"
            style={{ borderRight: inputs.length > 0 && outputs.length > 0 ? "1px solid var(--border)" : "none" }}
          >
            {inputs.length > 0 && (
              <div className="px-2 pb-1 text-[9px] uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                Inputs
              </div>
            )}
            {inputs.map((port) => (
              <PortHandle key={`in-${port.id}`} port={port} role="in" position={Position.Left} />
            ))}
          </div>

          {/* Outputs column */}
          {outputs.length > 0 && (
            <div className="flex-1 py-1.5">
              <div className="px-2 pb-1 text-[9px] uppercase tracking-widest text-right" style={{ color: "var(--text-secondary)" }}>
                Outputs
              </div>
              {outputs.map((port) => (
                <PortHandle key={`out-${port.id}`} port={port} role="out" position={Position.Right} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Power footer */}
      <div className="px-3 py-1.5 text-[10px] flex items-center gap-1.5" style={{ color: powerLabel ? "var(--text-secondary)" : "#2A2D35" }}>
        <Zap size={9} style={{ color: powerLabel ? "#EF4444" : "#2A2D35", flexShrink: 0 }} />
        {powerLabel ? <span className="truncate">{powerLabel}</span> : <span>No power data</span>}
      </div>
    </div>
  )
})
