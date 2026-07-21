import { useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Printer, Download } from "lucide-react"
import { useCanvasStore } from "../../store/canvasStore"
import { usePricingStore } from "../../store/pricingStore"
import { calcPowerSummary } from "../../utils/powerCalc"
import { buildBOM, buildCableSchedule, toCSV, downloadCSV } from "../../utils/bom"

interface Props {
  open: boolean
  onClose: () => void
}

export function PrintReport({ open, onClose }: Props) {
  const { nodes, edges, roomConfig, placements } = useCanvasStore()
  const { currency, prices, setPrice, setCurrency } = usePricingStore()
  const reportRef = useRef<HTMLDivElement>(null)

  const bom = buildBOM(nodes)
  const cables = buildCableSchedule(nodes, edges, placements)
  const power = calcPowerSummary(nodes)

  const totalUnits = bom.reduce((s, l) => s + l.qty, 0)
  const anyPriced = bom.some((l) => prices[l.key] != null)
  const grandCost = bom.reduce((s, l) => s + (prices[l.key] ?? 0) * l.qty, 0)

  const now = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  const rigSlug = (roomConfig?.name ?? "conduit-rig").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

  function exportBOM() {
    const headers = ["Qty", "Manufacturer", "Model", "Category", "Unit W", "Total W", `Unit Price (${currency})`, `Line Total (${currency})`]
    const rows = bom.map((l) => [
      l.qty, l.manufacturer, l.model, l.category, l.unitWatts, l.totalWatts,
      prices[l.key] ?? "", prices[l.key] != null ? (prices[l.key] * l.qty).toFixed(2) : "",
    ])
    downloadCSV(`${rigSlug}-bom.csv`, toCSV(headers, rows))
  }

  function exportCables() {
    const headers = ["Cable", "From Device", "From Port", "To Device", "To Port", "Signal", "Connector (out)", "Connector (in)", "Est. Length m", "Max m", "Over"]
    const rows = cables.map((c) => [
      c.cableId, c.fromDevice, c.fromPort, c.toDevice, c.toPort, c.signal,
      c.connectorFrom, c.connectorTo, c.lengthM ?? "", c.maxLengthM ?? "", c.exceeded ? "YES" : "",
    ])
    downloadCSV(`${rigSlug}-cable-schedule.csv`, toCSV(headers, rows))
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 no-print"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
          />
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 inset-6 rounded-[4px] border overflow-y-auto shadow-2xl no-print-container"
            style={{ background: "#fff", borderColor: "#e5e7eb", color: "#111" }}
          >
            {/* Toolbar */}
            <div className="no-print sticky top-0 flex items-center justify-between px-6 py-3 border-b bg-white z-10" style={{ borderColor: "#e5e7eb" }}>
              <span className="text-xs font-semibold tracking-widest uppercase text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                Export Report
              </span>
              <div className="flex gap-2">
                <ToolBtn onClick={exportBOM} icon={<Download size={12} />} label="BOM .csv" />
                <ToolBtn onClick={exportCables} icon={<Download size={12} />} label="Cables .csv" />
                <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-black text-white hover:bg-gray-800 transition-colors">
                  <Printer size={12} /> Print / Save PDF
                </button>
                <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
                  <X size={16} className="text-gray-700" />
                </button>
              </div>
            </div>

            {/* Report body */}
            <div id="print-report" ref={reportRef} className="px-12 py-10 max-w-4xl mx-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <div className="mb-8">
                <div className="text-[10px] tracking-[0.2em] uppercase text-gray-400 mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  CONDUIT · AV System Design
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">{roomConfig?.name ?? "Untitled Rig"}</h1>
                {roomConfig && <p className="text-sm text-gray-500 mt-1">Room: {roomConfig.width_m}m × {roomConfig.depth_m}m</p>}
                <p className="text-xs text-gray-400 mt-0.5">{now}</p>
              </div>

              <HR />

              {/* Bill of materials */}
              <Section
                title="Bill of Materials"
                right={
                  <label className="no-print text-[11px] text-gray-400 flex items-center gap-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Currency
                    <input value={currency} onChange={(e) => setCurrency(e.target.value.slice(0, 3))} className="w-10 border rounded px-1 py-0.5 text-center text-gray-700" style={{ borderColor: "#e5e7eb" }} />
                  </label>
                }
              >
                {bom.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No devices on canvas.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <thead>
                        <tr className="border-b" style={{ borderColor: "#e5e7eb" }}>
                          <TH right>Qty</TH><TH>Manufacturer</TH><TH>Model</TH><TH>Category</TH>
                          <TH right>Total W</TH><TH right>Unit {currency}</TH><TH right>Line {currency}</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.map((l) => {
                          const price = prices[l.key]
                          return (
                            <tr key={l.key} className="border-b" style={{ borderColor: "#f3f4f6" }}>
                              <td className="py-1.5 pr-3 text-right font-medium text-gray-900">{l.qty}</td>
                              <td className="py-1.5 pr-3 text-gray-700">{l.manufacturer}</td>
                              <td className="py-1.5 pr-3 text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{l.model}</td>
                              <td className="py-1.5 pr-3 text-gray-500">{l.category}</td>
                              <td className="py-1.5 pr-3 text-right text-gray-700" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{l.totalWatts || "—"}</td>
                              <td className="py-1.5 pr-3 text-right">
                                <input
                                  type="number" min="0" step="0.01"
                                  value={price ?? ""}
                                  onChange={(e) => setPrice(l.key, e.target.value === "" ? undefined : parseFloat(e.target.value))}
                                  placeholder="—"
                                  className="w-20 text-right border rounded px-1 py-0.5 text-gray-700 print:border-0"
                                  style={{ borderColor: "#e5e7eb", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                                />
                              </td>
                              <td className="py-1.5 text-right text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                                {price != null ? (price * l.qty).toFixed(2) : "—"}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2" style={{ borderColor: "#e5e7eb" }}>
                          <td className="py-2 pr-3 text-right font-semibold text-gray-900">{totalUnits}</td>
                          <td className="py-2 pr-3 text-xs text-gray-400" colSpan={3}>{bom.length} line item{bom.length !== 1 ? "s" : ""}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{power.grandTotalWatts}</td>
                          <td />
                          <td className="py-2 text-right font-semibold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                            {anyPriced ? `${currency}${grandCost.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Section>

              <HR />

              {/* Power summary */}
              <Section title="Power Summary">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-600">Total load</span>
                  <span className="font-semibold text-gray-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{power.grandTotalWatts}W</span>
                </div>
                {power.groups.map((group) => (
                  <div key={group.circuitRequired} className="mb-2">
                    <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                      <span>{group.circuitRequired}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{group.totalWatts}W / {group.limitWatts}W</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (group.totalWatts / group.limitWatts) * 100)}%`,
                        background: group.totalWatts > group.limitWatts ? "#ef4444" : group.totalWatts > group.limitWatts * 0.8 ? "#f59e0b" : "#22c55e",
                      }} />
                    </div>
                  </div>
                ))}
              </Section>

              <HR />

              {/* Cable schedule */}
              <Section title={`Cable Schedule${cables.length ? ` · ${cables.length}` : ""}`}>
                {cables.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No connections defined.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse" style={{ fontVariantNumeric: "tabular-nums" }}>
                      <thead>
                        <tr className="border-b" style={{ borderColor: "#e5e7eb" }}>
                          <TH>Cable</TH><TH>From</TH><TH>To</TH><TH>Signal</TH><TH>Connectors</TH><TH right>Length</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {cables.map((c) => (
                          <tr key={c.cableId} className="border-b align-top" style={{ borderColor: "#f3f4f6" }}>
                            <td className="py-1.5 pr-3 text-gray-500" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{c.cableId}</td>
                            <td className="py-1.5 pr-3 text-gray-700">{c.fromDevice}<span className="text-gray-400 text-xs"> · {c.fromPort}</span></td>
                            <td className="py-1.5 pr-3 text-gray-700">{c.toDevice}<span className="text-gray-400 text-xs"> · {c.toPort}</span></td>
                            <td className="py-1.5 pr-3 text-gray-600" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{c.signal}</td>
                            <td className="py-1.5 pr-3 text-gray-500 text-xs">{c.connectorFrom} → {c.connectorTo}</td>
                            <td className="py-1.5 text-right" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: c.exceeded ? "#ef4444" : "#374151" }}>
                              {c.lengthM != null ? `~${c.lengthM}m` : "—"}
                              {c.maxLengthM != null && <span className="text-gray-400"> / {c.maxLengthM}m</span>}
                              {c.exceeded && <span className="text-red-500"> ⚠</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[10px] text-gray-400 mt-2">Lengths estimated from 3D placement (straight-line) — set positions in the Inspector's Position tab for accuracy.</p>
                  </div>
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

function ToolBtn({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border text-gray-700 hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb" }}>
      {icon} {label}
    </button>
  )
}

function Section({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{title}</h2>
        {right}
      </div>
      {children}
    </div>
  )
}

function HR() {
  return <hr className="my-6" style={{ borderColor: "#e5e7eb" }} />
}

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 ${right ? "text-right pr-3" : "text-left pr-3"}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {children}
    </th>
  )
}
