import { memo } from "react"
import { NodeProps } from "@xyflow/react"

interface RoomBoundsData extends Record<string, unknown> {
  width_m: number
  depth_m: number
  name: string
}

// 1 grid square = 1m, grid gap = 20px
const M_TO_PX = 20

export const RoomBounds = memo(function RoomBounds({ data }: NodeProps) {
  const d = data as RoomBoundsData
  const w = d.width_m * M_TO_PX
  const h = d.depth_m * M_TO_PX

  return (
    <div
      style={{
        width: w,
        height: h,
        border: "2px dashed #1E2025",
        borderRadius: 2,
        position: "relative",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: -20,
          left: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "#6B7280",
          whiteSpace: "nowrap",
        }}
      >
        {d.name} — {d.width_m}m × {d.depth_m}m
      </span>
    </div>
  )
})
