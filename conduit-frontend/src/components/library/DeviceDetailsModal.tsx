import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useDevice } from "../../conduit/useDevices"
import { getCategoryIcon, categoryLabel } from "../../conduit/category"
import { signalLabel } from "../../conduit/signalType"
import { Badge } from "../ui/Badge"

interface Props {
  deviceId: string | null
  onClose: () => void
}

export function DeviceDetailsModal({ deviceId, onClose }: Props) {
  const { data: device, isLoading, error } = useDevice(deviceId)

  if (!deviceId) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 12, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-[4px] shadow-2xl overflow-hidden"
          style={{ background: "var(--panel)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b shrink-0 bg-white/5" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-sm font-semibold text-white font-sans tracking-wide">
                Device Details
              </div>
            </div>
            <button
              onClick={onClose}
              className="opacity-50 hover:opacity-100 transition-opacity bg-black/20 p-1.5 rounded-full"
            >
              <X size={14} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 font-sans">
            {isLoading && (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-2/3 rounded bg-white/10" />
                <div className="h-4 w-1/3 rounded bg-white/5" />
                <div className="h-32 w-full rounded bg-white/5 mt-4" />
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm text-center py-8">
                Failed to load device details.
              </div>
            )}

            {device && (
              <>
                {/* Identity */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const Icon = getCategoryIcon(device.category)
                      return (
                        <div className="p-2 rounded bg-white/5" style={{ color: "var(--accent)" }}>
                          <Icon size={24} />
                        </div>
                      )
                    })()}
                    <div>
                      <h2 className="text-xl font-medium text-white leading-tight">
                        {device.manufacturer} {device.model}
                      </h2>
                      <div className="text-xs mt-1" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {device.model_variant ? `${device.model_variant} · ` : ""}
                        {categoryLabel(device.category)}
                      </div>
                    </div>
                  </div>
                  {device.description && (
                    <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-secondary)" }}>
                      {device.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {device.form_factor && <Badge variant="default">{device.form_factor.replace(/-/g, " ")}</Badge>}
                    <Badge variant="default">{device.ports.length} ports</Badge>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Physical */}
                  <div className="p-4 rounded-[3px] space-y-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                      Physical
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {device.weight_kg && (
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Weight</span>
                          <span className="font-mono text-white">{device.weight_kg} kg</span>
                        </div>
                      )}
                      {device.rack_units && (
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Rack U</span>
                          <span className="font-mono text-white">{device.rack_units}U</span>
                        </div>
                      )}
                      {device.dimensions && (
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Dims (W×H×D)</span>
                          <span className="font-mono text-white text-[10px]">
                            {device.dimensions.width_mm}×{device.dimensions.height_mm}×{device.dimensions.depth_mm} mm
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Power */}
                  <div className="p-4 rounded-[3px] space-y-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                      Power
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {device.power?.max_wattage ? (
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Draw (Max)</span>
                          <span className="font-mono text-white">{device.power.max_wattage} W</span>
                        </div>
                      ) : (
                        <div className="text-white/40 text-xs">No power data</div>
                      )}
                      {device.power?.voltage_v && (
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Voltage</span>
                          <span className="font-mono text-white">{device.power.voltage_v} V</span>
                        </div>
                      )}
                      {device.power?.connector_type && (
                        <div className="flex justify-between">
                          <span style={{ color: "var(--text-secondary)" }}>Connector</span>
                          <span className="font-mono text-white truncate max-w-[80px]" title={device.power.connector_type}>
                            {device.power.connector_type}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ports Summary */}
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
                    Ports Preview
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {device.ports.map((port, idx) => (
                      <div
                        key={port.id || idx}
                        className="flex items-center justify-between p-2 rounded-[2px]"
                        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="default">
                            {port.direction === "in" ? "IN" : port.direction === "out" ? "OUT" : "BIDI"}
                          </Badge>
                          <span className="text-xs text-white truncate w-32" title={port.label}>{port.label}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-right" style={{ color: "var(--text-secondary)" }}>
                          <span className="text-white/70">{signalLabel(port.signal_type)}</span>
                          <span>·</span>
                          <span className="truncate max-w-[60px]" title={port.connector_type}>{port.connector_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="p-4 border-t bg-white/[0.02]" style={{ borderColor: "var(--border)" }}>
            <div className="text-center text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
              Drag this device from the library to deploy it to the canvas.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
