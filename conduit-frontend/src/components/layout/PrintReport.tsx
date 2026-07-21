import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Printer } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"
import { calcPowerSummary } from "../../utils/powerCalc"
import { deviceName, deviceMaxWatts } from "../../conduit/device"
import { categoryLabel } from "../../conduit/category"
import { signalLabel } from "../../conduit/signalType"

interface Props {
  open: boolean
  onClose: () => void
}

export function PrintReport({ open, onClose }: Props) {
  const { nodes, edges, roomConfig } = useCanvasStore()
  const reportRef = useRef<HTMLDivElement>(null)

  const powerSummary = calcPowerSummary(nodes)
  const now = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  function handlePrint() {
    window.print()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — hidden on print */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 no-print"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
          />

          {/* Report panel */}
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 inset-6 rounded-[4px] border overflow-y-auto shadow-2xl no-print-container"
            style={{ background: "#fff", borderColor: "#e5e7eb", color: "#111" }}
          >
            {/* Toolbar */}
            <div className="no-print sticky top-0 flex items-center justify-between px-6 py-3 border-b bg-white z-10" style={{ borderColor: "#e5e7eb" }}>
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Export Report
              </span>
              <div className="flex gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  <Printer size={12} />
                  Print / Save PDF
                </button>
                <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
                  <X size={16} className="text-gray-700" />
                </button>
              </div>
            </div>

            {/* Report body — this section prints */}
            <div
              id="print-report"
              ref={reportRef}
              className="px-12 py-10 max-w-3xl mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {/* Title */}
              <div className="mb-8">
                <div className="text-[10px] tracking-[0.2em] uppercase text-gray-400 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  CONDUIT · AV System Design
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {roomConfig?.name ?? "Untitled Rig"}
                </h1>
                {roomConfig && (
                  <p className="text-sm text-gray-500 mt-1">
                    Room: {roomConfig.width_m}m × {roomConfig.depth_m}m
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">{now}</p>
              </div>

              <HR />

              {/* Device list */}
              <Section title="Equipment List">
                {nodes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No devices on canvas.</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "#e5e7eb" }}>
                        <TH>Device</TH>
                        <TH>Manufacturer</TH>
                        <TH>Model</TH>
                        <TH>Category</TH>
                        <TH right>Draw (W)</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {nodes.map((n) => {
                        const d = n.data.device
                        const totalW = Math.round(deviceMaxWatts(d))
                        return (
                          <tr key={n.id} className="border-b" style={{ borderColor: "#f3f4f6" }}>
                            <td className="py-1.5 pr-4 font-medium text-gray-900">{n.data.label ?? deviceName(d)}</td>
                            <td className="py-1.5 pr-4 text-gray-600">{d.manufacturer}</td>
                            <td className="py-1.5 pr-4 text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{d.model}</td>
                            <td className="py-1.5 pr-4 text-gray-500">{categoryLabel(d.category)}</td>
                            <td className="py-1.5 text-right text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                              {totalW > 0 ? totalW : "—"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </Section>

              <HR />

              {/* Power summary */}
              <Section title="Power Summary">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600">Total load</span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {powerSummary.grandTotalWatts}W
                  </span>
                </div>
                {powerSummary.groups.map((group) => (
                  <div key={group.circuitRequired} className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                      <span>{group.circuitRequired}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {group.totalWatts}W / {group.limitWatts}W
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (group.totalWatts / group.limitWatts) * 100)}%`,
                          background: group.totalWatts > group.limitWatts
                            ? "#ef4444"
                            : group.totalWatts > group.limitWatts * 0.8
                              ? "#f59e0b"
                              : "#22c55e",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Section>

              <HR />

              {/* Signal connections */}
              <Section title="Signal Connections">
                {edges.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No connections defined.</p>
                ) : (
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "#e5e7eb" }}>
                        <TH>From</TH>
                        <TH>To</TH>
                        <TH>Signal Type</TH>
                        <TH>Status</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {edges.map((e) => {
                        const src = nodes.find((n) => n.id === e.source)
                        const tgt = nodes.find((n) => n.id === e.target)
                        const srcName = src?.data.label ?? (src ? deviceName(src.data.device) : e.source)
                        const tgtName = tgt?.data.label ?? (tgt ? deviceName(tgt.data.device) : e.target)
                        const d = e.data
                        return (
                          <tr key={e.id} className="border-b" style={{ borderColor: "#f3f4f6" }}>
                            <td className="py-1.5 pr-4 text-gray-700">{srcName}</td>
                            <td className="py-1.5 pr-4 text-gray-700">{tgtName}</td>
                            <td className="py-1.5 pr-4 text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                              {d?.signalType ? signalLabel(d.signalType) : "—"}
                            </td>
                            <td className="py-1.5 text-xs" style={{
                              color: !(d as import("../../types/canvas").ConnectionEdgeData)?.compatible
                                ? "#ef4444"
                                : (d as import("../../types/canvas").ConnectionEdgeData)?.warning
                                  ? "#f59e0b"
                                  : "#22c55e"
                            }}>
                              {!(d as import("../../types/canvas").ConnectionEdgeData)?.compatible
                                ? "error"
                                : (d as import("../../types/canvas").ConnectionEdgeData)?.warning
                                  ? "warning"
                                  : "ok"}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </Section>

              <div className="mt-12 pt-4 border-t text-[10px] text-gray-300" style={{ borderColor: "#e5e7eb", fontFamily: "'JetBrains Mono', monospace" }}>
                Generated by CONDUIT · {now}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400 mb-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function HR() {
  return <hr className="my-6" style={{ borderColor: "#e5e7eb" }} />
}

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 ${right ? "text-right" : "text-left"}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {children}
    </th>
  )
}
