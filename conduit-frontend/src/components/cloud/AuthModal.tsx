import { motion } from "framer-motion"
import { X } from "lucide-react"
import { AuthForm } from "./AuthForm"

interface Props {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: Props) {
  if (!open) return null
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <motion.div
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm rounded-[3px] overflow-hidden"
        style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 12px 48px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>Sign in to CONDUIT</span>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity"><X size={16} style={{ color: "var(--text-secondary)" }} /></button>
        </div>
        <div className="px-5 py-5">
          <AuthForm />
        </div>
      </motion.div>
    </motion.div>
  )
}
