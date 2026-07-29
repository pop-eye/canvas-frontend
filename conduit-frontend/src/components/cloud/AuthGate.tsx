import { AuthForm } from "./AuthForm"

/**
 * Full-screen sign-in gate. Shown before the app when cloud is enabled and no
 * user is signed in. The /share/:token route bypasses this (public read-only).
 */
export function AuthGate() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(rgba(0,212,204,0.05) 1px, transparent 1px) 0 0 / 22px 22px, var(--bg)",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div
            className="text-lg font-semibold tracking-[0.28em] uppercase"
            style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}
          >
            CONDUIT
          </div>
          <p className="text-[11px] mt-1" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
            AV &amp; immersive system design
          </p>
        </div>

        <div
          className="rounded-[3px] p-6"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 12px 48px rgba(0,0,0,0.5)" }}
        >
          <h1 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
            Sign in to continue
          </h1>
          <p className="text-[11px] mb-4" style={{ color: "var(--text-secondary)" }}>
            Sign in to design rigs, save them to the cloud, and share them.
          </p>
          <AuthForm />
        </div>
      </div>
    </div>
  )
}
