import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Plus, FolderOpen, Share2, Trash2, Pencil, RefreshCw } from "lucide-react"
import { useUIStore } from "../../store/uiStore"
import { useCanvasStore } from "../../store/canvasStore"
import {
  listProjects, createProject, updateProject, fetchProject, renameProject,
  deleteProject, createShareLink, type ProjectRow,
} from "../../backend/projects"
import { captureProjectState, applyProjectState } from "../../backend/projectState"

interface Props {
  open: boolean
  onClose: () => void
}

export function ProjectsModal({ open, onClose }: Props) {
  const addToast = useUIStore((s) => s.addToast)
  const roomConfig = useCanvasStore((s) => s.roomConfig)
  const nodeCount = useCanvasStore((s) => s.nodes.length)

  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null) // currently-loaded cloud project

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setRows(await listProjects()) }
    catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Failed to load projects" }) }
    finally { setLoading(false) }
  }, [addToast])

  useEffect(() => { if (open) refresh() }, [open, refresh])

  if (!open) return null

  async function saveCurrentAsNew() {
    const name = roomConfig?.name?.trim() || `Rig ${new Date().toLocaleDateString("en-GB")}`
    try {
      const id = await createProject(name, captureProjectState())
      setOpenId(id)
      addToast({ type: "success", message: `Saved “${name}” to the cloud` })
      refresh()
    } catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Save failed" }) }
  }

  async function updateOpen() {
    if (!openId) return
    const row = rows.find((r) => r.id === openId)
    try {
      await updateProject(openId, row?.name ?? "Untitled Rig", captureProjectState())
      addToast({ type: "success", message: "Project updated" })
      refresh()
    } catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Update failed" }) }
  }

  async function open_(id: string) {
    try {
      const { name, state } = await fetchProject(id)
      applyProjectState(state)
      setOpenId(id)
      addToast({ type: "success", message: `Opened “${name}”` })
      onClose()
    } catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Open failed" }) }
  }

  async function rename_(row: ProjectRow) {
    const name = window.prompt("Rename project", row.name)?.trim()
    if (!name) return
    try { await renameProject(row.id, name); refresh() }
    catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Rename failed" }) }
  }

  async function delete_(row: ProjectRow) {
    if (!window.confirm(`Delete “${row.name}”? This cannot be undone.`)) return
    try {
      await deleteProject(row.id)
      if (openId === row.id) setOpenId(null)
      refresh()
    } catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Delete failed" }) }
  }

  async function share_(row: ProjectRow) {
    try {
      const url = await createShareLink(row.id)
      await navigator.clipboard.writeText(url).catch(() => {})
      addToast({ type: "success", message: "Share link copied to clipboard" })
    } catch (e) { addToast({ type: "error", message: e instanceof Error ? e.message : "Could not create link" }) }
  }

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose} />
      <motion.div
        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-[3px] overflow-hidden"
        style={{ background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 12px 48px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>Cloud projects</span>
          <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity"><X size={16} style={{ color: "var(--text-secondary)" }} /></button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          <button onClick={saveCurrentAsNew} className={primaryBtn} title="Save the current canvas as a new cloud project">
            <Plus size={13} /> Save current rig
          </button>
          {openId && (
            <button onClick={updateOpen} className={ghostBtn} title="Update the open project with the current canvas">
              <RefreshCw size={12} /> Update open
            </button>
          )}
          <span className="ml-auto text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
            {nodeCount} device{nodeCount !== 1 ? "s" : ""} on canvas
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="p-5 text-sm text-center" style={{ color: "var(--text-secondary)" }}>Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              No cloud projects yet. Save your current rig to get started.
            </div>
          )}
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2 px-5 py-2.5 border-b hover:bg-white/5 group" style={{ borderColor: "var(--border)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  {row.name}
                  {openId === row.id && <span className="text-[9px] px-1 rounded-[1px]" style={{ background: "var(--accent)", color: "#000", fontFamily: "'JetBrains Mono', monospace" }}>OPEN</span>}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                  updated {new Date(row.updated_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <IconBtn onClick={() => open_(row.id)} title="Open"><FolderOpen size={14} /></IconBtn>
              <IconBtn onClick={() => share_(row)} title="Copy share link"><Share2 size={14} /></IconBtn>
              <IconBtn onClick={() => rename_(row)} title="Rename"><Pencil size={13} /></IconBtn>
              <IconBtn onClick={() => delete_(row)} title="Delete"><Trash2 size={13} /></IconBtn>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

const primaryBtn = "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[2px] font-semibold bg-[var(--accent)] text-black"
const ghostBtn = "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[2px] text-[var(--text-secondary)] border border-[var(--border)]"

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} className="p-1.5 rounded-[2px] opacity-50 hover:opacity-100 transition-opacity" style={{ color: "var(--text-secondary)" }}>
      {children}
    </button>
  )
}
