import { AppShell } from "./components/layout/AppShell"
import { ShareView } from "./components/share/ShareView"
import { AuthGate } from "./components/cloud/AuthGate"
import { isCloudEnabled } from "./backend/supabase"
import { useAuth } from "./backend/useAuth"

export default function App() {
  // Public read-only share links bypass the sign-in gate.
  const share = window.location.pathname.match(/^\/share\/([^/]+)/)
  if (share) return <ShareView token={decodeURIComponent(share[1])} />
  return <GatedApp />
}

function GatedApp() {
  const { user, loading } = useAuth()
  // With no cloud backend configured there is nothing to authenticate against,
  // so the app stays open (local-only mode). When cloud is on, sign-in is required.
  if (!isCloudEnabled()) return <AppShell />
  
  // Bypass sign-in gate in local development
  if (import.meta.env.DEV) return <AppShell />
  
  if (loading) return <Splash />
  if (!user) return <AuthGate />
  return <AppShell />
}

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <span className="text-sm tracking-[0.28em] uppercase" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>
        CONDUIT
      </span>
    </div>
  )
}
