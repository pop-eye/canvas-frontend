import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"

interface Props {
  open: boolean
  onClose: () => void
}

export function RoomConfigModal({ open, onClose }: Props) {
  const { roomConfig, setRoomConfig } = useCanvasStore()

  const [name, setName] = useState(roomConfig?.name ?? "")
  const [width, setWidth] = useState(String(roomConfig?.width_m ?? 20))
  const [depth, setDepth] = useState(String(roomConfig?.depth_m ?? 15))

  function handleSave() {
    const w = parseFloat(width)
    const d = parseFloat(depth)
    if (!name.trim() || isNaN(w) || isNaN(d) || w <= 0 || d <= 0) return
    setRoomConfig({ name: name.trim(), width_m: w, depth_m: d })
    onClose()
  }

  function handleClear() {
    useCanvasStore.setState({ roomConfig: null })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 rounded-[4px] border shadow-2xl"
            style={{ background: "var(--panel)", borderColor: "var(--border)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-xs uppercase tracking-[0.15em] font-semibold"
                style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                Room Config
              </span>
              <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
                <X size={14} style={{ color: "var(--text-primary)" }} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <Field label="Venue / Room Name">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Main Auditorium"
                  className="w-full px-3 py-1.5 text-sm rounded-[2px] border outline-none focus:ring-1"
                  style={{
                    background: "var(--bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                  }}
                />
              </Field>
              <div className="flex gap-3">
                <Field label="Width (m)" className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="0.5"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-[2px] border outline-none focus:ring-1"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                    }}
                  />
                </Field>
                <Field label="Depth (m)" className="flex-1">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="0.5"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-[2px] border outline-none focus:ring-1"
                    style={{
                      background: "var(--bg)",
                      borderColor: "var(--border)",
                      color: "var(--text-primary)",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                    }}
                  />
                </Field>
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                Canvas grid: 1 square = 1m
              </p>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between px-5 py-3 border-t gap-2"
              style={{ borderColor: "var(--border)" }}
            >
              {roomConfig ? (
                <button
                  onClick={handleClear}
                  className="text-xs px-3 py-1.5 rounded-[2px] opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Clear Room
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="text-xs px-3 py-1.5 rounded-[2px] border transition-opacity opacity-60 hover:opacity-100"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="text-xs px-4 py-1.5 rounded-[2px] font-semibold transition-opacity hover:opacity-90"
                  style={{
                    background: "var(--accent)",
                    color: "#0A0C10",
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label
        className="block text-[10px] uppercase tracking-[0.12em] mb-1.5"
        style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
