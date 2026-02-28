import { useRef, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AnimatePresence, motion } from "framer-motion"
import { Sidebar } from "./Sidebar"
import { Inspector } from "./Inspector"
import { RoomConfigModal } from "./RoomConfigModal"
import { PrintReport } from "./PrintReport"
import { ViewToggle } from "./ViewToggle"
import { RackView } from "./RackView"
import { ConduitCanvas } from "../canvas/ConduitCanvas"
import { Viewport3D } from "../viewport3d/Viewport3D"
import { ToastContainer } from "../ui/Toast"
import { useUIStore } from "../../store/uiStore"
import { useCanvasStore } from "../../store/canvasStore"
import { saveRig, loadRig } from "../../utils/rigFile"
import { PanelLeft, Trash2, Undo2, LayoutDashboard, Save, FolderOpen, FileText } from "lucide-react"

const queryClient = new QueryClient()

export function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShellInner />
    </QueryClientProvider>
  )
}

function AppShellInner() {
  const { sidebarOpen, toggleSidebar, addToast, viewMode } = useUIStore()
  const { selectedNodeId, clearCanvas, undo, roomConfig } = useCanvasStore()
  const [roomModalOpen, setRoomModalOpen] = useState(false)
  const [printOpen, setPrintOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleLoadRig(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    const result = await loadRig(file)
    if (result.ok) {
      addToast({ type: "success", message: "Rig loaded successfully" })
    } else {
      addToast({ type: "error", message: result.error })
    }
  }

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: "var(--bg)" }}
    >
      {/* Top toolbar */}
      <div
        className="flex items-center gap-2 px-4 h-10 shrink-0 border-b"
        style={{ background: "var(--panel)", borderColor: "var(--border)" }}
      >
        <button
          onClick={toggleSidebar}
          className="opacity-60 hover:opacity-100 transition-opacity"
          title="Toggle sidebar"
        >
          <PanelLeft size={16} style={{ color: "var(--text-primary)" }} />
        </button>
        <span
          className="text-sm font-semibold tracking-widest uppercase"
          style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em" }}
        >
          CONDUIT
        </span>
        {roomConfig && (
          <span className="text-[11px] opacity-50 pl-1" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
            · {roomConfig.name}
          </span>
        )}
        <div className="flex-1" />
        <Divider />
        <TBtn onClick={() => setRoomModalOpen(true)} title="Room Config" icon={<LayoutDashboard size={13} />} label="Room" />
        <Divider />
        <TBtn onClick={saveRig} title="Save Rig (.conduit)" icon={<Save size={13} />} label="Save" />
        <TBtn onClick={() => fileInputRef.current?.click()} title="Load Rig (.conduit)" icon={<FolderOpen size={13} />} label="Load" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".conduit"
          className="hidden"
          onChange={handleLoadRig}
        />
        <Divider />
        <TBtn onClick={() => setPrintOpen(true)} title="Export Report" icon={<FileText size={13} />} label="Report" />
        <Divider />
        <ViewToggle />
        <Divider />
        <TBtn onClick={undo} title="Undo (Ctrl+Z)" icon={<Undo2 size={13} />} label="Undo" />
        <TBtn
          onClick={() => { if (confirm("Clear all devices from canvas?")) clearCanvas() }}
          title="Clear canvas"
          icon={<Trash2 size={13} />}
          label="Clear"
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              key="sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 border-r flex flex-col overflow-hidden"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            >
              <div className="w-80">
                <Sidebar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas / Viewport */}
        <div className="flex-1 relative min-w-0 overflow-hidden">
          {viewMode === "2d" && <ConduitCanvas />}
          {viewMode === "3d" && <Viewport3D />}
          {viewMode === "split" && (
            <div className="flex h-full">
              <div className="flex-1 min-w-0"><ConduitCanvas /></div>
              <div className="w-px shrink-0" style={{ background: "var(--border)" }} />
              <div className="flex-1 min-w-0"><Viewport3D /></div>
            </div>
          )}
          {viewMode === "rack" && <RackView />}
        </div>

        {/* Right inspector */}
        <AnimatePresence initial={false}>
          {selectedNodeId && (
            <motion.div
              key="inspector"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="shrink-0 border-l flex flex-col overflow-hidden"
              style={{ background: "var(--panel)", borderColor: "var(--border)" }}
            >
              <div className="w-[360px] h-full flex flex-col">
                <Inspector />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ToastContainer />

      {/* Modals */}
      <RoomConfigModal open={roomModalOpen} onClose={() => setRoomModalOpen(false)} />
      <PrintReport open={printOpen} onClose={() => setPrintOpen(false)} />
    </div>
  )
}

function TBtn({
  onClick,
  title,
  icon,
  label,
}: {
  onClick: () => void
  title: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-[2px] opacity-60 hover:opacity-100 transition-opacity"
      style={{ color: "var(--text-secondary)" }}
    >
      {icon}
      {label}
    </button>
  )
}

function Divider() {
  return (
    <div
      className="h-4 w-px mx-1 shrink-0"
      style={{ background: "var(--border)" }}
    />
  )
}
