import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useCanvasStore } from "../../store/canvasStore"
import { runProjectorAnalysis } from "../../utils/projectorUtils"
import type { ProjectorAnalysisResult } from "../../utils/projectorUtils"

interface Props {
  nodeId: string
}

const DEFAULT_ROOM = { width_m: 20, depth_m: 15, height_m: 5, venueName: "Untitled Venue" }

// ─── Status helpers ──────────────────────────────────────────────────────────

type Status = "pass" | "warn" | "fail" | "info" | null

const STATUS_COLOUR: Record<NonNullable<Status>, string> = {
  pass: "#10B981",
  warn: "#F59E0B",
  fail: "#EF4444",
  info: "var(--text-secondary)",
}

function StatusDot({ status }: { status: Status }) {
  if (!status) return null
  const c = STATUS_COLOUR[status]
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{ width: 7, height: 7, background: c, boxShadow: `0 0 4px ${c}80` }}
    />
  )
}

function StatusBadge({ status, label }: { status: Status; label: string }) {
  const c = status ? STATUS_COLOUR[status] : "var(--text-secondary)"
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-[2px] uppercase tracking-wide font-semibold"
      style={{
        background: `${c}18`,
        color: c,
        border: `1px solid ${c}40`,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      {label}
    </span>
  )
}

function Row({
  label,
  value,
  status,
  sub,
}: {
  label: string
  value: string
  status?: Status
  sub?: string
}) {
  return (
    <div
      className="flex items-start justify-between gap-2 py-1.5 px-2 rounded-[2px]"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {status != null && <StatusDot status={status} />}
          <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {label}
          </span>
        </div>
        {sub && (
          <div className="text-[9px] mt-0.5 ml-5" style={{ color: "var(--text-secondary)", opacity: 0.55 }}>
            {sub}
          </div>
        )}
      </div>
      <span className="text-[11px] text-right shrink-0 ml-2" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="text-[9px] uppercase tracking-[0.15em] font-semibold pt-3 pb-1"
      style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}
    >
      {label}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ProjectorAnalysisPanel({ nodeId }: Props) {
  const { nodes, placements, roomConfig3D } = useCanvasStore(
    useShallow((s) => ({ nodes: s.nodes, placements: s.placements, roomConfig3D: s.roomConfig3D }))
  )

  const node = nodes.find((n) => n.id === nodeId)
  const placement = node ? placements[node.data.instanceId] : undefined
  const room = roomConfig3D ?? DEFAULT_ROOM

  const analysis: ProjectorAnalysisResult | null = useMemo(() => {
    if (!node || !placement) return null
    return runProjectorAnalysis(node, placement, room)
  }, [node, placement, room])

  if (!node) return null

  if (node.data.device.category !== "projector") {
    return (
      <div className="p-4 space-y-1 text-center" style={{ color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
        <div className="text-[11px] pt-4">Not a projection device.</div>
        <div className="text-[10px] opacity-50">Throw analysis is only available for projectors.</div>
      </div>
    )
  }

  if (!placement) {
    return (
      <div className="p-4 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
        Assign a 3D position in the <strong>Position</strong> tab first.
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-4 text-sm text-center" style={{ color: "var(--text-secondary)" }}>
        No throw ratio data — add <code>throw_ratio_min</code> / <code>throw_ratio_max</code> to this device's projection spec.
      </div>
    )
  }

  const a = analysis

  return (
    <div
      className="p-4 space-y-0.5 overflow-y-auto"
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
    >

      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <SectionLabel label="Image on Screen" />
      <Row
        label="Image size"
        value={`${a.imgW.toFixed(2)} × ${a.imgH.toFixed(2)} m`}
        status="info"
      />
      <Row label="Screen area" value={`${a.screenAreaM2.toFixed(2)} m²`} />
      <Row label="Throw distance" value={`${a.throwDist.toFixed(2)} m`} />

      {/* ── Throw zoom range ──────────────────────────────────────────────── */}
      {(a.imageWidthAtMinRatio != null || a.imageWidthAtMaxRatio != null) && (
        <>
          <SectionLabel label="Zoom Envelope (at current throw)" />
          {a.imageWidthAtMinRatio != null && (
            <Row
              label="Wide end (min ratio)"
              value={`${a.imageWidthAtMinRatio.toFixed(2)} m wide`}
              status="info"
              sub="Largest achievable image at this distance"
            />
          )}
          {a.imageWidthAtMaxRatio != null && (
            <Row
              label="Tele end (max ratio)"
              value={`${a.imageWidthAtMaxRatio.toFixed(2)} m wide`}
              status="info"
              sub="Smallest achievable image at this distance"
            />
          )}
        </>
      )}

      {/* ── Min throw guard ───────────────────────────────────────────────── */}
      {a.minThrowDistanceM != null && (
        <>
          <SectionLabel label="Minimum Throw" />
          <Row
            label="Min throw distance"
            value={`${a.minThrowDistanceM.toFixed(2)} m`}
            status={a.minThrowViolation ? "fail" : "pass"}
            sub={
              a.minThrowViolation
                ? `Too close — projector is ${a.throwDist.toFixed(2)} m from screen`
                : `OK — projector is ${a.throwDist.toFixed(2)} m from screen`
            }
          />
        </>
      )}

      {/* ── Brightness ────────────────────────────────────────────────────── */}
      {a.lux != null && (
        <>
          <SectionLabel label="Screen Brightness" />
          <Row
            label="Illuminance"
            value={`${Math.round(a.lux)} lux`}
            status={a.luxPass}
            sub="AVIXA F502.01: ≥54 lux min, ≥107 lux recommended"
          />
          {a.footCandles != null && (
            <Row label="Foot-candles" value={`${a.footCandles.toFixed(1)} fc`} />
          )}
          <div className="flex gap-2 mt-1">
            <StatusBadge
              status={a.luxPass}
              label={
                a.luxPass === "pass" ? "AVIXA OK"
                  : a.luxPass === "warn" ? "Marginal"
                  : "Under-lit"
              }
            />
          </div>
        </>
      )}

      {/* ── Contrast ──────────────────────────────────────────────────────── */}
      {a.contrastRatioEstimate != null && (
        <>
          <SectionLabel label="Contrast vs Ambient" />
          <Row
            label="Contrast ratio"
            value={`${a.contrastRatioEstimate}:1`}
            status={a.contrastPass}
            sub="≥50:1 good · ≥8:1 acceptable · <8:1 poor"
          />
          <div className="flex gap-2 mt-1">
            <StatusBadge
              status={a.contrastPass}
              label={
                a.contrastPass === "pass" ? "Good"
                  : a.contrastPass === "warn" ? "Acceptable"
                  : "Poor"
              }
            />
          </div>
        </>
      )}
      {a.contrastRatioEstimate == null && (
        <div className="text-[10px] mt-2 italic" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
          Set ambient lux in Room Config to see contrast analysis.
        </div>
      )}

      {/* ── Keystone ──────────────────────────────────────────────────────── */}
      <SectionLabel label="Geometry" />
      <Row
        label="Tilt off-axis"
        value={`${a.tiltDegrees}°`}
        status={a.keystoneWarning ? "warn" : "pass"}
        sub={a.keystoneWarning ? "> 15° — significant keystone distortion" : "Within keystone-free range"}
      />

      {/* ── Lens shift ────────────────────────────────────────────────────── */}
      <Row
        label="Lens shift needed"
        value={`${Math.abs(a.lensShiftNeededPct)}% ${a.lensShiftNeededPct >= 0 ? "up" : "down"}`}
        status={
          a.lensShiftSufficient == null ? null
            : a.lensShiftSufficient ? "pass" : "fail"
        }
        sub={
          a.lensShiftSufficient == null
            ? "No lens shift spec available"
            : a.lensShiftSufficient
              ? "Lens shift can centre the image"
              : "Lens shift range insufficient — projector must be physically tilted"
        }
      />
      <Row
        label="Proj. height"
        value={`${a.projectorHeightM.toFixed(2)} m`}
        status="info"
        sub={`Screen centre at ${a.screenCentreHeightM.toFixed(2)} m · offset ${a.verticalOffsetM >= 0 ? "+" : ""}${a.verticalOffsetM.toFixed(2)} m`}
      />

      {/* ── Pixel density ─────────────────────────────────────────────────── */}
      {a.pxPerMetreH != null && (
        <>
          <SectionLabel label="Pixel Density" />
          {a.pixelsWide != null && a.pixelsHigh != null && (
            <Row label="Resolution" value={`${a.pixelsWide} × ${a.pixelsHigh}`} />
          )}
          <Row
            label="Density"
            value={`${Math.round(a.pxPerMetreH)} px/m`}
            sub={`${(a.pxPerMetreH / 100).toFixed(0)} px/cm`}
          />
          {a.arcMinPerPxAt3m != null && (
            <Row
              label="Angular res. @ 3 m"
              value={`${a.arcMinPerPxAt3m} arcmin/px`}
              status={a.arcMinPerPxAt3m <= 1 ? "pass" : a.arcMinPerPxAt3m <= 2 ? "warn" : "fail"}
              sub="≤1 arcmin/px retina-class · ≤2 acceptable at 3 m"
            />
          )}
        </>
      )}

      {/* ── Aspect ratio ──────────────────────────────────────────────────── */}
      {a.screenAspect != null && (
        <>
          <SectionLabel label="Aspect Ratio" />
          <Row
            label="Native aspect"
            value={`${a.nativeAspect.toFixed(3)} : 1`}
          />
          <Row
            label="Screen aspect"
            value={`${a.screenAspect.toFixed(3)} : 1`}
          />
          <Row
            label="Match"
            value={a.aspectMismatch ? "Mismatch" : "OK"}
            status={a.aspectMismatch ? "warn" : "pass"}
            sub={
              a.pillarboxFraction != null
                ? `Pillarboxing — ${(a.pillarboxFraction * 100).toFixed(1)}% black bars`
                : a.letterboxFraction != null
                  ? `Letterboxing — ${(a.letterboxFraction * 100).toFixed(1)}% black bars`
                  : undefined
            }
          />
        </>
      )}
      {a.screenAspect == null && (
        <div className="text-[10px] mt-1 italic" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
          Set screen dimensions in Room Config for aspect ratio analysis.
        </div>
      )}

    </div>
  )
}
