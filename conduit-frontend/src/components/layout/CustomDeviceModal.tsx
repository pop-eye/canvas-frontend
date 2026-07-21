import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Trash2, Download } from "lucide-react"
import { useCustomDeviceStore } from "../../conduit/customDevices"
import { parseDevice } from "../../conduit/schema"
import { useUIStore } from "../../store/uiStore"
import { ALL_CATEGORIES, categoryLabel } from "../../conduit/category"
import { signalLabel } from "../../conduit/signalType"
import type { ConduitDevice, Port, PortDirection } from "../../conduit/types"
import {
  SIGNAL_TYPE_SUGGESTIONS, CONNECTOR_SUGGESTIONS, PORT_DIRECTIONS,
  PANEL_SIDES, FORM_FACTORS, POWER_CONNECTORS,
} from "../../conduit/vocab"

interface Props {
  open: boolean
  onClose: () => void
}

interface PortRow {
  label: string
  direction: PortDirection
  signal_type: string
  connector_type: string
  count: string
  panel_side: string
}

const emptyPort = (): PortRow => ({ label: "", direction: "in", signal_type: "", connector_type: "", count: "1", panel_side: "rear" })

const today = () => new Date().toISOString().slice(0, 10)

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "")
}

export function CustomDeviceModal({ open, onClose }: Props) {
  const addCustomDevice = useCustomDeviceStore((s) => s.addCustomDevice)
  const addToast = useUIStore((s) => s.addToast)

  const [manufacturer, setManufacturer] = useState("")
  const [model, setModel] = useState("")
  const [variant, setVariant] = useState("")
  const [category, setCategory] = useState<string>("other")
  const [formFactor, setFormFactor] = useState<string>("")
  const [description, setDescription] = useState("")
  const [w, setW] = useState(""); const [h, setH] = useState(""); const [d, setD] = useState("")
  const [weight, setWeight] = useState(""); const [rackU, setRackU] = useState("")
  const [maxW, setMaxW] = useState(""); const [voltage, setVoltage] = useState(""); const [powerConn, setPowerConn] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [ports, setPorts] = useState<PortRow[]>([emptyPort()])
  const [errors, setErrors] = useState<string[]>([])

  if (!open) return null

  const setPort = (i: number, patch: Partial<PortRow>) =>
    setPorts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const addPort = () => setPorts((ps) => [...ps, emptyPort()])
  const removePort = (i: number) => setPorts((ps) => ps.filter((_, j) => j !== i))

  function reset() {
    setManufacturer(""); setModel(""); setVariant(""); setCategory("other"); setFormFactor(""); setDescription("")
    setW(""); setH(""); setD(""); setWeight(""); setRackU(""); setMaxW(""); setVoltage(""); setPowerConn("")
    setSourceUrl(""); setPorts([emptyPort()]); setErrors([])
  }

  function build(): { device: ConduitDevice } | { errors: string[] } {
    const errs: string[] = []
    if (!manufacturer.trim()) errs.push("Manufacturer is required")
    if (!model.trim()) errs.push("Model is required")
    const validPorts = ports.filter((p) => p.signal_type.trim())
    if (validPorts.length === 0) errs.push("Add at least one port with a signal type")
    validPorts.forEach((p, i) => {
      if (!p.connector_type.trim()) errs.push(`Port ${i + 1}: connector is required`)
    })
    if (errs.length) return { errors: errs }

    const num = (s: string) => (s.trim() ? Number(s) : undefined)
    const dims = w || h || d ? { width_mm: num(w), height_mm: num(h), depth_mm: num(d) } : undefined
    const power = maxW || voltage || powerConn
      ? { max_wattage: num(maxW), voltage_v: num(voltage), connector_type: powerConn || undefined }
      : undefined

    const builtPorts: Port[] = validPorts.map((p, i) => {
      const id = `${slug(p.label || signalLabel(p.signal_type)) || "port"}_${i + 1}`.replace(/[^a-z0-9_-]/g, "")
      return {
        id,
        label: p.label.trim() || signalLabel(p.signal_type),
        signal_type: p.signal_type.trim(),
        connector_type: p.connector_type.trim(),
        direction: p.direction,
        count: Math.max(1, Number(p.count) || 1),
        ...(p.panel_side ? { panel_side: p.panel_side as Port["panel_side"] } : {}),
      }
    })

    const device: ConduitDevice = {
      schema_version: "conduit/v1",
      manufacturer: manufacturer.trim(),
      model: model.trim(),
      ...(variant.trim() ? { model_variant: variant.trim() } : {}),
      category: category as ConduitDevice["category"],
      ...(formFactor ? { form_factor: formFactor as ConduitDevice["form_factor"] } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(dims ? { dimensions: dims } : {}),
      ...(weight.trim() ? { weight_kg: Number(weight) } : {}),
      ...(rackU.trim() ? { rack_units: Number(rackU) } : {}),
      ...(power ? { power } : {}),
      ports: builtPorts,
      ...(sourceUrl.trim() ? { sources: [{ url: sourceUrl.trim(), type: "datasheet", retrieved_date: today() }] } : {}),
      profile_meta: { source: "community", verified: false, confidence: "low", created_at: today() },
      tags: ["custom"],
    }

    const parsed = parseDevice(device)
    if (!parsed.ok) return { errors: [parsed.error] }
    return { device: parsed.device }
  }

  function submit(download: boolean) {
    const res = build()
    if ("errors" in res) { setErrors(res.errors); return }
    const id = addCustomDevice(res.device)
    if (download) {
      const blob = new Blob([JSON.stringify(res.device, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${id.replace("custom/", "")}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    addToast({ type: "success", message: `Added ${res.device.manufacturer} ${res.device.model} to your library` })
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
        <motion.div
          initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-[3px] overflow-hidden"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 12px 48px rgba(0,0,0,0.6)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>Add a device</div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                conduit/v1 · community profile
              </div>
            </div>
            <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity"><X size={16} style={{ color: "var(--text-secondary)" }} /></button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {/* Identity */}
            <Section label="Identity">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Manufacturer *"><input className={inp} value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Christie" /></Field>
                <Field label="Model *"><input className={inp} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Boxer 4K30" /></Field>
                <Field label="Variant"><input className={inp} value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="EU" /></Field>
                <Field label="Category *">
                  <select className={inp} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {ALL_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Description"><input className={inp} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Single-chip DLP laser projector, WUXGA, 30,000 lumens" /></Field>
            </Section>

            {/* Physical */}
            <Section label="Physical">
              <div className="grid grid-cols-4 gap-2">
                <Field label="Form factor">
                  <select className={inp} value={formFactor} onChange={(e) => setFormFactor(e.target.value)}>
                    <option value="">—</option>
                    {FORM_FACTORS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Rack U"><input className={inp} type="number" value={rackU} onChange={(e) => setRackU(e.target.value)} placeholder="2" /></Field>
                <Field label="Weight kg"><input className={inp} type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="12.5" /></Field>
                <div />
                <Field label="Width mm"><input className={inp} type="number" value={w} onChange={(e) => setW(e.target.value)} /></Field>
                <Field label="Height mm"><input className={inp} type="number" value={h} onChange={(e) => setH(e.target.value)} /></Field>
                <Field label="Depth mm"><input className={inp} type="number" value={d} onChange={(e) => setD(e.target.value)} /></Field>
              </div>
            </Section>

            {/* Power */}
            <Section label="Power">
              <div className="grid grid-cols-3 gap-2">
                <Field label="Max watts"><input className={inp} type="number" value={maxW} onChange={(e) => setMaxW(e.target.value)} placeholder="366" /></Field>
                <Field label="Voltage V"><input className={inp} type="number" value={voltage} onChange={(e) => setVoltage(e.target.value)} placeholder="230" /></Field>
                <Field label="Connector">
                  <select className={inp} value={powerConn} onChange={(e) => setPowerConn(e.target.value)}>
                    <option value="">—</option>
                    {POWER_CONNECTORS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            {/* Ports */}
            <Section label={`Ports · ${ports.filter((p) => p.signal_type).length}`}>
              <div className="space-y-1.5">
                {ports.map((p, i) => (
                  <div key={i} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: "1.1fr 1.4fr 1.2fr 0.9fr 0.5fr 24px" }}>
                    <input className={inpSm} value={p.label} onChange={(e) => setPort(i, { label: e.target.value })} placeholder="Label" />
                    <input className={inpSm} list="sig-types" value={p.signal_type} onChange={(e) => setPort(i, { signal_type: e.target.value })} placeholder="signal type" />
                    <input className={inpSm} list="conn-types" value={p.connector_type} onChange={(e) => setPort(i, { connector_type: e.target.value })} placeholder="connector" />
                    <select className={inpSm} value={p.direction} onChange={(e) => setPort(i, { direction: e.target.value as PortDirection })}>
                      {PORT_DIRECTIONS.map((dir) => <option key={dir.value} value={dir.value}>{dir.label}</option>)}
                    </select>
                    <input className={inpSm} type="number" min="1" value={p.count} onChange={(e) => setPort(i, { count: e.target.value })} title="Quantity" />
                    <button onClick={() => removePort(i)} disabled={ports.length === 1} className="opacity-50 hover:opacity-100 disabled:opacity-20 flex justify-center">
                      <Trash2 size={13} style={{ color: "var(--text-secondary)" }} />
                    </button>
                  </div>
                ))}
                <button onClick={addPort} className="flex items-center gap-1.5 text-xs mt-1 px-2 py-1 rounded-[2px]"
                  style={{ color: "var(--accent)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}>
                  <Plus size={12} /> Add port
                </button>
              </div>
              <datalist id="sig-types">{SIGNAL_TYPE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
              <datalist id="conn-types">{CONNECTOR_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </Section>

            {/* Source */}
            <Section label="Source (for verification)">
              <Field label="Datasheet / spec URL">
                <input className={inp} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://manufacturer.com/product/datasheet.pdf" />
              </Field>
              <p className="text-[10px] mt-1" style={{ color: "var(--text-secondary)", opacity: 0.7 }}>
                A source link lets this profile be verified and enriched by the condu-scraper, then published to the open catalog.
              </p>
            </Section>

            {errors.length > 0 && (
              <div className="rounded-[2px] px-3 py-2 text-[11px] space-y-0.5" style={{ background: "#EF444415", border: "1px solid #EF444440", color: "#EF4444", fontFamily: "'JetBrains Mono', monospace" }}>
                {errors.map((e, i) => <div key={i}>· {e}</div>)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 px-5 py-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
              Saved to your library on this device
            </span>
            <div className="flex gap-2">
              <button onClick={() => submit(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[2px]"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}>
                <Download size={12} /> Add &amp; export JSON
              </button>
              <button onClick={() => submit(false)} className="text-xs px-4 py-1.5 rounded-[2px] font-semibold"
                style={{ background: "var(--accent)", color: "#000", fontFamily: "'JetBrains Mono', monospace" }}>
                Add to library
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const inp = "w-full px-2 py-1.5 text-xs rounded-[2px] outline-none bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)]"
const inpSm = "w-full px-2 py-1 text-[11px] rounded-[2px] outline-none bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)]"

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[9px] uppercase tracking-[0.15em] font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      {children}
    </label>
  )
}
