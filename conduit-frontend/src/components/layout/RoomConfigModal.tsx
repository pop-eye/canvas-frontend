import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"

interface Props {
  open: boolean
  onClose: () => void
}

export function RoomConfigModal({ open, onClose }: Props) {
  const { roomConfig, setRoomConfig, roomConfig3D, setRoomConfig3D } = useCanvasStore()

  // 2D canvas room
  const [name, setName] = useState(roomConfig?.name ?? "")
  const [width, setWidth] = useState(String(roomConfig?.width_m ?? 20))
  const [depth, setDepth] = useState(String(roomConfig?.depth_m ?? 15))

  // 3D room extras
  const r3 = roomConfig3D
  const [height, setHeight] = useState(String(r3?.height_m ?? 5))
  const [ambientLux, setAmbientLux] = useState(String(r3?.ambient_lux ?? ""))
  const [screenW, setScreenW] = useState(String(r3?.screen_width_m ?? ""))
  const [screenH, setScreenH] = useState(String(r3?.screen_height_m ?? ""))

  function handleSave() {
    const w = parseFloat(width)
    const d = parseFloat(depth)
    if (!name.trim() || isNaN(w) || isNaN(d) || w <= 0 || d <= 0) return
    setRoomConfig({ name: name.trim(), width_m: w, depth_m: d })

    const h = parseFloat(height)
    const lux = parseFloat(ambientLux)
    const sw = parseFloat(screenW)
    const sh = parseFloat(screenH)
    setRoomConfig3D({
      width_m: w,
      depth_m: d,
      height_m: isNaN(h) || h <= 0 ? 5 : h,
      venueName: name.trim(),
      ambient_lux: isNaN(lux) || lux <= 0 ? undefined : lux,
      screen_width_m: isNaN(sw) || sw <= 0 ? undefined : sw,
      screen_height_m: isNaN(sh) || sh <= 0 ? undefined : sh,
    })
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

              {/* 3D height */}
              <Field label="Height (m)">
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
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

              {/* Separator */}
              <div
                className="text-[9px] uppercase tracking-[0.15em] pt-1 pb-0.5 font-semibold"
                style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
              >
                Projection Planning
              </div>

              {/* Ambient lux */}
              <Field label="Ambient Light (lux)">
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="e.g. 50 for dim room, 500 for office"
                  value={ambientLux}
                  onChange={(e) => setAmbientLux(e.target.value)}
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

              {/* Screen dimensions */}
              <div className="flex gap-3">
                <Field label="Screen Width (m)" className="flex-1">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    placeholder="e.g. 4"
                    value={screenW}
                    onChange={(e) => setScreenW(e.target.value)}
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
                <Field label="Screen Height (m)" className="flex-1">
                  <input
                    type="number"
                    min="0.1"
                    max="50"
                    step="0.1"
                    placeholder="e.g. 2.25"
                    value={screenH}
                    onChange={(e) => setScreenH(e.target.value)}
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
