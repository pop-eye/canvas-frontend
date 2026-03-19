import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { Scene } from "./Scene"
import { useUIStore } from "../../store/uiStore"

export function Viewport3D() {
  const theme = useUIStore((s) => s.theme)
  const bg = theme === "light" ? "#F9FAFB" : "#0A0A0B"

  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 500 }}
      style={{ background: bg, width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: false }}
    >
      <color attach="background" args={[bg]} />
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
