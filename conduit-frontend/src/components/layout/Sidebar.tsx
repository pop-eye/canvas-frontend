import { EquipmentLibrary } from "../library/EquipmentLibrary"
import { useStats } from "../../hooks/useEquipment"

export function Sidebar() {
  const { data: stats } = useStats()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        className="px-4 py-3 border-b shrink-0 flex items-center justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="text-xs font-medium uppercase tracking-widest"
          style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Equipment Library
        </span>
        {stats && (
          <span
            className="text-xs"
            style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {stats.total} devices
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <EquipmentLibrary />
      </div>
    </div>
  )
}
