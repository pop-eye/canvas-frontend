import { useEffect, useState } from "react"
import { Mail } from "lucide-react"
import { signInWithEmail, signInWithProvider } from "../../backend/useAuth"
import { fetchEnabledProviders, type EnabledProviders } from "../../backend/authSettings"

/**
 * The sign-in form itself (email magic-link + whichever OAuth providers are
 * enabled). Shared by the sign-in gate and the account modal.
 */
export function AuthForm() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [providers, setProviders] = useState<EnabledProviders>({ email: true, google: false, github: false })

  useEffect(() => { fetchEnabledProviders().then(setProviders) }, [])

  async function sendMagicLink() {
    if (!email.trim()) return
    setBusy(true); setError(null)
    const { error } = await signInWithEmail(email.trim())
    setBusy(false)
    if (error) setError(error)
    else setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-2 py-4">
        <Mail size={22} style={{ color: "var(--accent)", margin: "0 auto" }} />
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>Check your inbox</p>
        <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
          We sent a sign-in link to <span style={{ color: "var(--text-primary)" }}>{email}</span>.
        </p>
      </div>
    )
  }

  const hasOAuth = providers.google || providers.github

  return (
    <div className="space-y-4">
      {hasOAuth && (
        <div className="space-y-2">
          {providers.google && <button onClick={() => signInWithProvider("google")} className={oauthBtn}>Continue with Google</button>}
          {providers.github && <button onClick={() => signInWithProvider("github")} className={oauthBtn}>Continue with GitHub</button>}
        </div>
      )}

      {hasOAuth && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          <span className="text-[10px] uppercase tracking-widest" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
        </div>
      )}

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
    </div>
  )
}

const oauthBtn =
  "w-full py-2 text-sm rounded-[2px] transition-colors hover:bg-white/5 " +
  "text-[var(--text-primary)] border border-[var(--border)] bg-[var(--bg)]"
