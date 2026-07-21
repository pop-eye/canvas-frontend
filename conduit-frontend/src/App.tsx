import { AppShell } from "./components/layout/AppShell"
import { ShareView } from "./components/share/ShareView"

export default function App() {
  // Lightweight routing: /share/:token renders the read-only viewer, else the app.
  const match = window.location.pathname.match(/^\/share\/([^/]+)/)
  if (match) return <ShareView token={decodeURIComponent(match[1])} />
  return <AppShell />
}
