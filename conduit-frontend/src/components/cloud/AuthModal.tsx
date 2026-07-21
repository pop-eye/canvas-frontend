import { useState } from "react"
import { motion } from "framer-motion"
import { X, Mail } from "lucide-react"
import { signInWithEmail, signInWithProvider } from "../../backend/useAuth"

interface Props {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: Props) {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  async function sendMagicLink() {
    if (!email.trim()) return
    setBusy(true); setError(null)
    const { error } = await signInWithEmail(email.trim())
    setBusy(false)
    if (error) setError(error)
    else setSent(true)
  }

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

        <div className="px-5 py-5 space-y-4">
          {sent ? (
            <div className="text-center space-y-2 py-4">
              <Mail size={22} style={{ color: "var(--accent)", margin: "0 auto" }} />
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>Check your inbox</p>
              <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>We sent a sign-in link to <span style={{ color: "var(--text-primary)" }}>{email}</span>.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <button onClick={() => signInWithProvider("google")} className={oauthBtn}>Continue with Google</button>
                <button onClick={() => signInWithProvider("github")} className={oauthBtn}>Continue with GitHub</button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>or</span>
                <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
              </div>

              <div className="space-y-2">
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
                  placeholder="you@studio.com"
                  className="w-full px-3 py-2 text-sm rounded-[2px] outline-none"
                  style={{ background: "var(--bg)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                />
                <button onClick={sendMagicLink} disabled={busy || !email.trim()} className="w-full py-2 text-sm font-semibold rounded-[2px] disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#000", fontFamily: "'JetBrains Mono', monospace" }}>
                  {busy ? "Sending…" : "Email me a sign-in link"}
                </button>
              </div>

              {error && <p className="text-[11px] text-red-400">{error}</p>}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

const oauthBtn =
  "w-full py-2 text-sm rounded-[2px] transition-colors hover:bg-white/5 " +
  "text-[var(--text-primary)] border border-[var(--border)] bg-[var(--bg)]"
