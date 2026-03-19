import { create } from "zustand"

type InspectorTab = "panel" | "specs" | "power" | "connections" | "position" | "analysis" | "throw"
export type ViewMode = "2d" | "split" | "3d" | "rack"

interface UIStore {
  theme: "light" | "dark"
  inspectorOpen: boolean
  inspectorTab: InspectorTab
  sidebarOpen: boolean
  viewMode: ViewMode
  toasts: Toast[]
  isDraggingDevice: boolean
  gridSnap: boolean
  showEdgeLabels: boolean

  toggleTheme: () => void
  setInspectorTab: (tab: InspectorTab) => void
  openInspector: () => void
  closeInspector: () => void
  toggleSidebar: () => void
  setViewMode: (mode: ViewMode) => void
  addToast: (toast: Omit<Toast, "id">) => void
  removeToast: (id: string) => void
  setDraggingDevice: (v: boolean) => void
  toggleGridSnap: () => void
  toggleEdgeLabels: () => void
}

export interface Toast {
  id: string
  message: string
  type: "error" | "warning" | "info" | "success"
}

export const useUIStore = create<UIStore>((set) => ({
  theme: "dark",
  inspectorOpen: false,
  inspectorTab: "panel",
  sidebarOpen: true,
  viewMode: "2d",
  toasts: [],
  isDraggingDevice: false,
  gridSnap: false,
  showEdgeLabels: true,

  toggleTheme: () => set((state) => {
    const newTheme = state.theme === "dark" ? "light" : "dark"
    if (newTheme === "light") {
      document.documentElement.classList.add("light")
      document.documentElement.classList.remove("dark")
    } else {
      document.documentElement.classList.add("dark")
      document.documentElement.classList.remove("light")
    }
    return { theme: newTheme }
  }),
  setInspectorTab: (tab) => set({ inspectorTab: tab }),
  openInspector: () => set({ inspectorOpen: true }),
  closeInspector: () => set({ inspectorOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setViewMode: (mode) => set({ viewMode: mode }),

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
    // Auto-dismiss after 4s
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setDraggingDevice: (v) => set({ isDraggingDevice: v }),
  toggleGridSnap: () => set((state) => ({ gridSnap: !state.gridSnap })),
  toggleEdgeLabels: () => set((state) => ({ showEdgeLabels: !state.showEdgeLabels })),
}))
