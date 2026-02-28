import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, CheckCircle, Info, XCircle, X } from "lucide-react"
import { useUIStore } from "../../store/uiStore"

const icons = {
  error: <XCircle size={14} className="text-red-400 shrink-0" />,
  warning: <AlertTriangle size={14} className="text-amber-400 shrink-0" />,
  info: <Info size={14} className="text-blue-400 shrink-0" />,
  success: <CheckCircle size={14} className="text-emerald-400 shrink-0" />,
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto"
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[2px] border shadow-xl"
              style={{
                background: "#1A1B1F",
                borderColor: "var(--border)",
                fontFamily: "'DM Sans', sans-serif",
                color: "var(--text-primary)",
                fontSize: 13,
                maxWidth: 420,
              }}
            >
              {icons[toast.type]}
              <span className="flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-50 hover:opacity-100 transition-opacity ml-1"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
