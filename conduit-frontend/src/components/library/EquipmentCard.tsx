import { AlertTriangle } from "lucide-react"
import type { DeviceIndexEntry } from "../../conduit/source"
import { Badge, ConfidenceLevelBadge } from "../ui/Badge"
import { getCategoryIcon, categoryLabel } from "../../conduit/category"

interface EquipmentCardProps {
  entry: DeviceIndexEntry
}

export function EquipmentCard({ entry }: EquipmentCardProps) {
  const Icon = getCategoryIcon(entry.category)
  const name = [entry.manufacturer, entry.model].filter(Boolean).join(" ")
  const needsReview = entry.verified === false

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("device-id", entry.id)
    e.dataTransfer.effectAllowed = "copy"

    const el = document.createElement("div")
    el.textContent = name
    el.style.cssText = `
      position: fixed; top: -100px; left: -100px;
      background: #111214; color: #E8EAED; padding: 6px 10px;
      border: 1px solid #00D4CC; border-radius: 2px;
      font-family: 'DM Sans', sans-serif; font-size: 12px;
      pointer-events: none; white-space: nowrap;
    `
    document.body.appendChild(el)
    e.dataTransfer.setDragImage(el, 0, 0)
    setTimeout(() => document.body.removeChild(el), 0)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      data-device-id={entry.id}
      className="flex flex-col gap-1.5 px-3 py-2.5 rounded-[2px] cursor-grab active:cursor-grabbing transition-colors border-l-2 hover:bg-white/5"
      style={{ background: "var(--bg)", borderColor: needsReview ? "#F59E0B" : "transparent" }}
    >
      <div className="flex items-start gap-2">
        <div className="shrink-0 mt-0.5 opacity-60">
          <Icon size={13} style={{ color: "var(--text-secondary)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium leading-tight truncate" style={{ color: "var(--text-primary)" }}>
              {name}
            </span>
            {needsReview && <AlertTriangle size={11} className="text-amber-400 shrink-0" />}
          </div>
          <div
            className="text-[11px] truncate mt-0.5"
            style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {entry.manufacturer} · {entry.model}
            {entry.model_variant ? ` · ${entry.model_variant}` : ""}
          </div>
        </div>
        <ConfidenceLevelBadge level={entry.confidence} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge>{categoryLabel(entry.category)}</Badge>
        {entry.form_factor && <Badge variant="default">{entry.form_factor.replace(/-/g, " ")}</Badge>}
        {entry.port_count != null && (
          <span className="text-[10px] font-mono" style={{ color: "var(--text-secondary)" }}>
            {entry.port_count} ports
          </span>
        )}
      </div>
    </div>
  )
}
