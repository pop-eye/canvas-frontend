import { useState, useRef, useEffect } from "react"
import { Cloud, LogOut, FolderOpen, User as UserIcon } from "lucide-react"
import { isCloudEnabled } from "../../backend/supabase"
import { useAuth, signOut } from "../../backend/useAuth"
import { AuthModal } from "./AuthModal"
import { ProjectsModal } from "./ProjectsModal"

/** Toolbar entry point for cloud. Renders nothing when cloud is not configured. */
export function UserMenu() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [menuOpen])

  if (!isCloudEnabled()) return null

  if (!user) {
    return (
      <>
        <button
          onClick={() => setAuthOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-[2px] opacity-70 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-secondary)" }}
          title="Sign in for cloud projects"
        >
          <Cloud size={13} /> Sign in
        </button>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    )
  }

  const label = user.email?.split("@")[0] ?? "Account"

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-[2px] opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: "var(--text-secondary)" }}
        title={user.email ?? undefined}
      >
        <UserIcon size={13} /> <span className="max-w-[100px] truncate">{label}</span>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-[2px] py-1 z-50"
          style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
        >
          <MenuItem icon={<FolderOpen size={13} />} label="Cloud projects" onClick={() => { setMenuOpen(false); setProjectsOpen(true) }} />
          <div className="my-1 h-px" style={{ background: "var(--border)" }} />
          <MenuItem icon={<LogOut size={13} />} label="Sign out" onClick={() => { setMenuOpen(false); signOut() }} />
        </div>
      )}

      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </div>
  )
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/5 text-left" style={{ color: "var(--text-primary)" }}>
      {icon} {label}
    </button>
  )
}
