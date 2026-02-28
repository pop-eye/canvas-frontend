import { memo } from "react"
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from "@xyflow/react"
import { ConnectionEdge as ConnectionEdgeType } from "../../types/canvas"
import { portColourHex } from "../../utils/portColour"
import { AlertTriangle } from "lucide-react"

export const ConnectionEdge = memo(function ConnectionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<ConnectionEdgeType>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const signalType = data?.signalType ?? "other"
  const compatible = data?.compatible ?? true
  const warning = data?.warning

  let strokeColour = portColourHex(signalType)
  if (!compatible) strokeColour = "#EF4444"
  else if (warning) strokeColour = "#F59E0B"

  const strokeWidth = selected ? 3 : 2
  const strokeDash = compatible ? "6 3" : "4 2"

  return (
    <>
      {/* Glow / shadow underneath */}
      <path
        d={edgePath}
        fill="none"
        stroke={strokeColour}
        strokeWidth={strokeWidth + 4}
        strokeOpacity={0.12}
        strokeDasharray={strokeDash}
      />

      {/* Main edge */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColour}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinecap="round"
        className={compatible && !warning ? "edge-animated" : ""}
        style={{
          strokeDashoffset: compatible && !warning ? undefined : 0,
        }}
      />

      {/* Warning icon */}
      {(!compatible || warning) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full"
              style={{ background: "#0A0A0B", border: `1px solid ${strokeColour}` }}
              title={data?.warning ?? "Incompatible connection"}
            >
              <AlertTriangle
                size={10}
                style={{ color: strokeColour }}
              />
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
