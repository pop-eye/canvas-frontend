import { X, ArrowRight, Zap, Plus } from "lucide-react"
import type { ConverterMatch } from "../../conduit/converters"

interface Props {
  fromLabel: string
  toLabel: string
  matches: ConverterMatch[]
  loading: boolean
  onInsert: (match: ConverterMatch) => void
  onDismiss: () => void
}

export function ConverterSuggestionBar({ fromLabel, toLabel, matches, loading, onInsert, onDismiss }: Props) {
  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      style={{
        background: "var(--panel)",
        border: "1px solid #F59E0B60",
        borderRadius: 4,
        padding: "10px 14px",
        minWidth: 340,
        maxWidth: 560,
        boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px #F59E0B20",
      }}
    >
      <div className="flex items-start gap-3">
        <Zap size={14} style={{ color: "#F59E0B", marginTop: 3, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ color: "#F59E0B", fontWeight: 600 }}>{fromLabel}</span>
            {" "}
            <ArrowRight size={10} style={{ display: "inline", verticalAlign: "middle" }} />
            {" "}
            <span style={{ color: "#F59E0B", fontWeight: 600 }}>{toLabel}</span>
            {" "}— converter required.{" "}
            {loading ? "Searching the catalog…" : matches.length > 0 ? "Insert one to bridge it:" : "No converter found in the catalog yet."}
          </div>

          {!loading && matches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onInsert(m)}
                  className="group"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 11, background: "#F59E0B15", border: "1px solid #F59E0B40",
                    borderRadius: 3, padding: "5px 10px", color: "#F59E0B", cursor: "pointer",
                    whiteSpace: "nowrap", transition: "background 0.15s", fontFamily: "'JetBrains Mono', monospace",
                  }}
                  title={m.exact ? "Exact protocol match" : "Same signal domain — verify it carries the exact format"}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B30")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B15")}
                >
                  <Plus size={11} />
                  {m.device.manufacturer} {m.device.model}
                  {!m.exact && <span style={{ opacity: 0.6, fontSize: 9 }}>~</span>}
                </button>
              ))}
            </div>
          )}

          {!loading && matches.length === 0 && (
            <div style={{ fontSize: 11, color: "var(--text-secondary)", opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>
              Build one with “Add device”, or it may arrive as the catalog grows.
            </div>
          )}
        </div>

        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 2, flexShrink: 0 }}
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
