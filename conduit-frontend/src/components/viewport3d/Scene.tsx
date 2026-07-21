import { ContactShadows } from "@react-three/drei"
import { useShallow } from "zustand/react/shallow"
import { useCanvasStore } from "../../store/canvasStore"
import { RoomVolume } from "./RoomVolume"
import { DeviceMesh } from "./DeviceMesh"
import { CameraRig } from "./CameraRig"
import { ProjectorThrow } from "./ProjectorThrow"
import { OverlapHighlight } from "./OverlapHighlight"
import { AudioCoverageHeatmap } from "./AudioCoverageHeatmap"

import { useUIStore } from "../../store/uiStore"

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
  const theme = useUIStore(s => s.theme)
  const isLight = theme === "light"

  const room = roomConfig3D ?? DEFAULT_ROOM

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isLight ? 0.8 : 0.45} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={isLight ? 1.0 : 1.2}
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
        intensity={isLight ? 0.2 : 0.4}
        color={isLight ? "#0D9488" : "#00D4CC"}
      />

      {/* Environment */}
      <RoomVolume config={room} />
      <ContactShadows
        position={[room.width_m / 2, 0.01, room.depth_m / 2]}
        opacity={isLight ? 0.15 : 0.35}
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

      {/* Projector throw visualisations (world-space, one per projection device) */}
      {nodes
        .filter(n => n.data.device.category === "projector")
        .map(node => {
          const placement = placements[node.data.instanceId]
          if (!placement) return null
          return (
            <ProjectorThrow
              key={`throw-${node.data.instanceId}`}
              node={node}
              placement={placement}
              room={room}
            />
          )
        })
      }

      {/* Projector overlap highlights */}
      <OverlapHighlight nodes={nodes} placements={placements} room={room} />

      {/* Audio coverage heatmap on floor */}
      <AudioCoverageHeatmap nodes={nodes} placements={placements} />

      {/* Camera */}
      <CameraRig roomConfig={room} />
    </>
  )
}
