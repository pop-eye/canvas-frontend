import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import { Scene } from "./Scene"

export function Viewport3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 12], fov: 50, near: 0.1, far: 500 }}
      style={{ background: "#0A0A0B", width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: false }}
    >
      <Suspense fallback={null}>
        <Scene />
      </Suspense>
    </Canvas>
  )
}
