import { X, ArrowRight, Zap } from "lucide-react"
import type { EquipmentRecord } from "../../types/api"

export interface ConverterSuggestion {
  converters: EquipmentRecord[]
  sourceProtocol: string
  targetProtocol: string
}

interface Props {
  suggestion: ConverterSuggestion
  onInsert: (converter: EquipmentRecord) => void
  onDismiss: () => void
}

export function ConverterSuggestionBar({ suggestion, onInsert, onDismiss }: Props) {
  const { converters, sourceProtocol, targetProtocol } = suggestion

  return (
    <div
      className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
      style={{
        background: "var(--panel)",
        border: "1px solid #F59E0B60",
        borderRadius: 6,
        padding: "10px 14px",
        minWidth: 320,
        maxWidth: 520,
        boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px #F59E0B20",
      }}
    >
      <div className="flex items-start gap-3">
        <Zap size={14} style={{ color: "#F59E0B", marginTop: 3, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            <span style={{ color: "#F59E0B", fontWeight: 600 }}>{sourceProtocol}</span>
            {" "}
            <ArrowRight size={10} style={{ display: "inline", verticalAlign: "middle" }} />
            {" "}
            <span style={{ color: "#F59E0B", fontWeight: 600 }}>{targetProtocol}</span>
            {" "}
            — converter required. Insert one below:
          </div>
          <div className="flex flex-wrap gap-2">
            {converters.slice(0, 3).map((c) => (
              <button
                key={c.id}
                onClick={() => onInsert(c)}
                style={{
                  fontSize: 11,
                  background: "#F59E0B15",
                  border: "1px solid #F59E0B40",
                  borderRadius: 4,
                  padding: "4px 10px",
                  color: "#F59E0B",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B30")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#F59E0B15")
                }
              >
                + {c.manufacturer} {c.model}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            padding: 2,
            flexShrink: 0,
          }}
          title="Dismiss"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}
