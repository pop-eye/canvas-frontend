import { useRef, useEffect } from "react"
import { useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { Vector3 } from "three"
import type { RoomConfig3D } from "../../types/spatial"
import { useCanvasStore } from "../../store/canvasStore"
import { useUIStore } from "../../store/uiStore"

interface Props {
  roomConfig: RoomConfig3D
}

type PresetKey = "perspective" | "top" | "front" | "rear"

function getPresets(room: RoomConfig3D) {
  const cx = room.width_m / 2
  const cz = room.depth_m / 2
  const ch = room.height_m
  return {
    perspective: { pos: new Vector3(cx, ch * 1.2, room.depth_m + 5), target: new Vector3(cx, 0, cz) },
    top:         { pos: new Vector3(cx, ch * 3,   cz),               target: new Vector3(cx, 0, cz) },
    front:       { pos: new Vector3(cx, ch / 2,   room.depth_m + 8), target: new Vector3(cx, ch / 2, cz) },
    rear:        { pos: new Vector3(cx, ch / 2,   -5),               target: new Vector3(cx, ch / 2, cz) },
  }
}

export function CameraRig({ roomConfig }: Props) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const { selectedNodeId, nodes, placements } = useCanvasStore()
  const isDraggingDevice = useUIStore((s) => s.isDraggingDevice)

  function moveTo(preset: PresetKey) {
    const p = getPresets(roomConfig)[preset]
    camera.position.copy(p.pos)
    controlsRef.current?.target.copy(p.target)
    controlsRef.current?.update()
  }

  useEffect(() => {
    // Initial camera position
    moveTo("perspective")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Skip if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return
      if (e.key === "1") moveTo("perspective")
      if (e.key === "2") moveTo("top")
      if (e.key === "3") moveTo("front")
      if (e.key === "4") moveTo("rear")
      if ((e.key === "f" || e.key === "F") && selectedNodeId) {
        const node = nodes.find((n) => n.id === selectedNodeId)
        if (!node) return
        const placement = placements[node.data.instanceId]
        if (!placement) return
        const { x, y, z } = placement.position3d
        const target = new Vector3(x, y, z)
        camera.position.set(x + 2, y + 2, z + 4)
        controlsRef.current?.target.copy(target)
        controlsRef.current?.update()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedNodeId, nodes, placements, roomConfig])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={0.5}
      maxDistance={200}
      enabled={!isDraggingDevice}
    />
  )
}
