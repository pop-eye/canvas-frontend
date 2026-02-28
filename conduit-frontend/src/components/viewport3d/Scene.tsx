import { ContactShadows } from "@react-three/drei"
import { useShallow } from "zustand/react/shallow"
import { useCanvasStore } from "../../store/canvasStore"
import { RoomVolume } from "./RoomVolume"
import { DeviceMesh } from "./DeviceMesh"
import { CameraRig } from "./CameraRig"

const DEFAULT_ROOM = {
  width_m: 20,
  depth_m: 15,
  height_m: 5,
  venueName: "Untitled Venue",
}

export function Scene() {
  const { nodes, placements, roomConfig3D } = useCanvasStore(
    useShallow((s) => ({
      nodes: s.nodes,
      placements: s.placements,
      roomConfig3D: s.roomConfig3D,
    }))
  )

  const room = roomConfig3D ?? DEFAULT_ROOM

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight
        position={[room.width_m / 2, room.height_m, room.depth_m / 2]}
        intensity={0.4}
        color="#00D4CC"
      />

      {/* Environment */}
      <RoomVolume config={room} />
      <ContactShadows
        position={[room.width_m / 2, 0.01, room.depth_m / 2]}
        opacity={0.45}
        scale={Math.max(room.width_m, room.depth_m) * 2}
        blur={2.5}
        color="#000000"
      />

      {/* Devices */}
      {nodes.map((node) => {
        const placement = placements[node.data.instanceId]
        if (!placement) return null
        return (
          <DeviceMesh
            key={node.data.instanceId}
            node={node}
            placement={placement}
          />
        )
      })}

      {/* Camera */}
      <CameraRig roomConfig={room} />
    </>
  )
}
