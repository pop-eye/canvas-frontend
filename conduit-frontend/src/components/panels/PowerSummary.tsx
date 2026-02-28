import { useCanvasStore } from "../../store/canvasStore"
import { calcPowerSummary } from "../../utils/powerCalc"

export function PowerSummary() {
  const { nodes } = useCanvasStore()
  const { entries, groups, grandTotalWatts } = calcPowerSummary(nodes)

  if (nodes.length === 0) {
    return (
      <div
        className="p-4 text-center text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        No devices on canvas
      </div>
    )
  }

  return (
    <div
      className="p-4 space-y-4"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
    >
      {/* Grand total */}
      <div
        className="flex items-center justify-between p-3 rounded-[2px]"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--text-secondary)" }}>Total draw</span>
        <span
          className="text-base font-semibold"
          style={{ color: grandTotalWatts > 3000 ? "#EF4444" : "var(--text-primary)" }}
        >
          {grandTotalWatts}W
        </span>
      </div>

      {/* Per circuit group */}
      {groups.map((group) => {
        const pct = Math.min(group.totalWatts / group.limitWatts, 1)
        const barColour =
          pct < 0.7 ? "#10B981" : pct < 0.9 ? "#F59E0B" : "#EF4444"

        return (
          <div key={group.circuitRequired} className="space-y-2">
            <div className="flex items-center justify-between">
              <span style={{ color: "var(--text-secondary)" }}>{group.circuitRequired} circuit</span>
              <span style={{ color: "var(--text-primary)" }}>
                {group.totalWatts}W / {group.limitWatts}W
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct * 100}%`, background: barColour }}
              />
            </div>
            {group.devices.map((entry) => (
              <div key={entry.nodeId} className="flex justify-between pl-3 text-[10px]">
                <span className="truncate" style={{ color: "var(--text-secondary)", maxWidth: 200 }}>
                  {entry.name}
                </span>
                <span
                  style={{
                    color: entry.totalWatts > 3000 ? "#EF4444" : "var(--text-secondary)",
                  }}
                >
                  {entry.totalWatts}W
                </span>
              </div>
            ))}
          </div>
        )
      })}

      {/* All devices */}
      <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <div
          className="text-[9px] uppercase tracking-widest mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          All Devices
        </div>
        {entries.map((entry) => (
          <div key={entry.nodeId} className="flex justify-between py-0.5">
            <span className="truncate" style={{ color: "var(--text-primary)", maxWidth: 220 }}>
              {entry.name}
            </span>
            <span style={{ color: entry.totalWatts > 3000 ? "#EF4444" : "var(--text-secondary)" }}>
              {entry.totalWatts}W
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
