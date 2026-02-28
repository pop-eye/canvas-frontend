import { useUIStore } from "../../store/uiStore"

export type ViewMode = "2d" | "split" | "3d" | "rack"

export function ViewToggle() {
  const { viewMode, setViewMode } = useUIStore()

  const buttons: { id: ViewMode; label: string; title: string }[] = [
    { id: "2d",    label: "2D",    title: "2D signal flow canvas" },
    { id: "split", label: "½",     title: "Split view (2D + 3D)" },
    { id: "3d",    label: "3D",    title: "3D spatial view" },
    { id: "rack",  label: "Rack",  title: "19\" rack diagram" },
  ]

  return (
    <div
      className="flex items-center rounded-[3px] overflow-hidden border"
      style={{ borderColor: "var(--border)" }}
    >
      {buttons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => setViewMode(btn.id)}
          title={btn.title}
          className="px-2.5 py-0.5 text-[11px] font-medium transition-colors"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: viewMode === btn.id ? "var(--accent)" : "transparent",
            color: viewMode === btn.id ? "#0A0C10" : "var(--text-secondary)",
            borderRight: btn.id !== "rack" ? "1px solid var(--border)" : undefined,
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}
