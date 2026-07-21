import { EquipmentLibrary } from "../library/EquipmentLibrary"
import { useDeviceIndex } from "../../conduit/useDevices"
import { useCustomDeviceStore } from "../../conduit/customDevices"

export function Sidebar() {
  const { data } = useDeviceIndex()
  const customCount = useCustomDeviceStore((s) => s.entries.length)
  const catalogCount = data?.index.count ?? data?.index.devices.length
  const total = catalogCount != null ? catalogCount + customCount : undefined

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
          Device Library
        </span>
        {total != null && (
          <span className="text-xs" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
            {total} devices
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <EquipmentLibrary />
      </div>
    </div>
  )
}
