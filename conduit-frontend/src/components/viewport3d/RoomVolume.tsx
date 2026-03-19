import { Grid, Html } from "@react-three/drei"
import type { RoomConfig3D } from "../../types/spatial"
import { useUIStore } from "../../store/uiStore"

interface Props {
  config: RoomConfig3D
}

export function RoomVolume({ config }: Props) {
  const { width_m: W, depth_m: D, height_m: H } = config
  const cx = W / 2
  const cz = D / 2
  const theme = useUIStore((s) => s.theme)
  const isLight = theme === "light"

  return (
    <>
      {/* Floor grid */}
      <Grid
        position={[cx, 0, cz]}
        args={[W, D]}
        cellSize={1}
        cellThickness={0.4}
        cellColor={isLight ? "#E5E7EB" : "#1E2025"}
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor={isLight ? "#D1D5DB" : "#2A2D35"}
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Room perimeter wireframe box */}
      <mesh position={[cx, H / 2, cz]}>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial color={isLight ? "#0D9488" : "#00D4CC"} opacity={0.06} transparent wireframe />
      </mesh>

      {/* Floor shadow receiver */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.001, cz]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={isLight ? "#F3F4F6" : "#0D0E12"} roughness={1} metalness={0} />
      </mesh>

      {/* Venue label */}
      <Html position={[0.1, 0.02, 0.1]} style={{ pointerEvents: "none" }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: isLight ? "#6B7280" : "#4A5060",
          whiteSpace: "nowrap",
        }}>
          {config.venueName} · {W}m × {D}m × {H}m
        </span>
      </Html>
    </>
  )
}
