import { Vector3, Quaternion } from "three"
import type { DeviceNode } from "../types/canvas"
import type { DevicePlacement, RoomConfig3D } from "../types/spatial"
import type { ProjectionSpec } from "../types/api"

export interface HitResult {
  point: Vector3
  distance: number
  surface: "floor" | "ceiling" | "wall"
  normal: Vector3
}

export interface FootprintData {
  hit: HitResult
  corners: Vector3[]    // [TL, TR, BR, BL]
  centre: Vector3
  normal: Vector3
  right: Vector3
  imageUp: Vector3
  imgW: number
  imgH: number
  throwDist: number
  throwRatio: number
  apex: Vector3
  dir: Vector3
  lumens?: number
}

export function rayRoomIntersect(
  origin: Vector3,
  dir: Vector3,
  W: number,
  H: number,
  D: number
): HitResult | null {
  const surfaces: {
    name: HitResult["surface"]
    t: number
    normal: Vector3
    check: (p: Vector3) => boolean
  }[] = [
    {
      name: "floor",
      t: Math.abs(dir.y) > 1e-6 ? (0 - origin.y) / dir.y : Infinity,
      normal: new Vector3(0, 1, 0),
      check: (p) => p.x >= 0 && p.x <= W && p.z >= 0 && p.z <= D,
    },
    {
      name: "ceiling",
      t: Math.abs(dir.y) > 1e-6 ? (H - origin.y) / dir.y : Infinity,
      normal: new Vector3(0, -1, 0),
      check: (p) => p.x >= 0 && p.x <= W && p.z >= 0 && p.z <= D,
    },
    {
      name: "wall",
      t: Math.abs(dir.z) > 1e-6 ? (0 - origin.z) / dir.z : Infinity,
      normal: new Vector3(0, 0, 1),
      check: (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H,
    },
    {
      name: "wall",
      t: Math.abs(dir.z) > 1e-6 ? (D - origin.z) / dir.z : Infinity,
      normal: new Vector3(0, 0, -1),
      check: (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H,
    },
    {
      name: "wall",
      t: Math.abs(dir.x) > 1e-6 ? (0 - origin.x) / dir.x : Infinity,
      normal: new Vector3(1, 0, 0),
      check: (p) => p.z >= 0 && p.z <= D && p.y >= 0 && p.y <= H,
    },
    {
      name: "wall",
      t: Math.abs(dir.x) > 1e-6 ? (W - origin.x) / dir.x : Infinity,
      normal: new Vector3(-1, 0, 0),
      check: (p) => p.z >= 0 && p.z <= D && p.y >= 0 && p.y <= H,
    },
  ]

  let best: HitResult | null = null
  for (const { name, t, normal, check } of surfaces) {
    if (!isFinite(t) || t < 0.05) continue
    const p = origin.clone().addScaledVector(dir, t)
    if (!check(p)) continue
    if (!best || t < best.distance) best = { point: p, distance: t, surface: name, normal }
  }
  return best
}

export function parseAspect(resolution?: string): number {
  if (!resolution) return 16 / 9
  const m = resolution.match(/(\d+)[x×](\d+)/i)
  if (!m) return 16 / 9
  return parseInt(m[1]) / parseInt(m[2])
}

export function projectionDirection(placement: DevicePlacement): Vector3 {
  let base: Vector3
  if (placement.mounted === "truss" || placement.mounted === "ceiling") {
    base = new Vector3(0, -1, 0)
  } else if (placement.mounted === "wall-front") {
    base = new Vector3(0, 0, 1)
  } else if (placement.mounted === "wall-rear") {
    base = new Vector3(0, 0, -1)
  } else {
    base = new Vector3(0, 0, -1)
  }
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), placement.rotation.y)
  return base.clone().applyQuaternion(q).normalize()
}

export function computeProjectorFootprint(
  node: DeviceNode,
  placement: DevicePlacement,
  room: RoomConfig3D
): FootprintData | null {
  const proj: ProjectionSpec | undefined = node.data.record.metadata.projection
  const hasThrow = !!(proj?.throw_ratio_min || proj?.throw_ratio_max)
  if (!hasThrow) return null

  const { width_m: W, depth_m: D, height_m: H } = room
  const origin = new Vector3(
    placement.position3d.x,
    placement.position3d.y,
    placement.position3d.z
  )
  const dir = projectionDirection(placement)
  const hit = rayRoomIntersect(origin, dir, W, H, D)
  if (!hit) return null

  const trMin = proj!.throw_ratio_min
  const trMax = proj!.throw_ratio_max
  const throwRatio = trMin && trMax ? (trMin + trMax) / 2 : (trMin ?? trMax ?? 1.5)

  const throwDist = hit.distance
  const imgW = throwDist / throwRatio
  const aspect = parseAspect(proj?.resolution ?? node.data.record.metadata.video?.resolution)
  const imgH = imgW / aspect

  const shiftV = (proj?.lens_shift_v_percent ?? 0) / 100
  const shiftH = (proj?.lens_shift_h_percent ?? 0) / 100

  const worldUp = Math.abs(dir.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
  const right = new Vector3().crossVectors(dir, worldUp).normalize()
  const imageUp = new Vector3().crossVectors(right, dir).normalize()

  const centre = hit.point.clone()
    .addScaledVector(imageUp, shiftV * imgH)
    .addScaledVector(right, shiftH * imgW)

  const corners = [
    centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, imgH / 2),
    centre.clone().addScaledVector(right,  imgW / 2).addScaledVector(imageUp, imgH / 2),
    centre.clone().addScaledVector(right,  imgW / 2).addScaledVector(imageUp, -imgH / 2),
    centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, -imgH / 2),
  ]

  const apex = origin.clone().addScaledVector(dir, 0.15)

  return {
    hit,
    corners,
    centre,
    normal: hit.normal,
    right,
    imageUp,
    imgW,
    imgH,
    throwDist,
    throwRatio,
    apex,
    dir,
    lumens: proj?.lumens,
  }
}

// ─── Tessellated multi-surface footprint ─────────────────────────────────────

export const TESS_COLS = 20
export const TESS_ROWS = 12

export interface TessellatedFootprint {
  /** Flat triangle-list positions for BufferGeometry (Float32Array, x/y/z triplets) */
  positions: Float32Array
  /** Per-vertex UV coordinates (Float32Array, u/v pairs, matches positions) */
  uvs: Float32Array
  /** Grid of hit points [row][col], row 0 = bottom, null = no surface hit */
  gridVertices: (Vector3 | null)[][]
  gridCols: number
  gridRows: number
  /** True when rays landed on more than one surface type */
  isMultiSurface: boolean
  surfaces: Array<"floor" | "ceiling" | "wall">
  /** Sum of all triangle areas in m² */
  totalAreaM2: number
  // ── Center-ray info (for label placement and analysis) ──
  centre: Vector3
  apex: Vector3
  dir: Vector3
  imgW: number
  imgH: number
  throwDist: number
  throwRatio: number
  lumens?: number
}

function triArea(a: Vector3, b: Vector3, c: Vector3): number {
  return b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5
}

/**
 * Tessellates the projector frustum into a (TESS_COLS × TESS_ROWS) grid.
 * Each vertex shoots its own ray so the resulting mesh correctly folds across
 * multiple room surfaces — floor, walls and ceiling simultaneously.
 */
export function computeTessellatedFootprint(
  node: DeviceNode,
  placement: DevicePlacement,
  room: RoomConfig3D
): TessellatedFootprint | null {
  // Use the center footprint to establish frustum parameters
  const fp = computeProjectorFootprint(node, placement, room)
  if (!fp) return null

  const { width_m: W, depth_m: D, height_m: H } = room
  const origin = new Vector3(
    placement.position3d.x,
    placement.position3d.y,
    placement.position3d.z
  )
  const { centre, right, imageUp, imgW, imgH, throwDist, throwRatio, apex, dir, lumens } = fp

  const COLS = TESS_COLS
  const ROWS = TESS_ROWS

  // Build grid: row 0 = bottom (v=0), row ROWS = top (v=1)
  const gridVertices: (Vector3 | null)[][] = []
  const hitSurfaceSet = new Set<"floor" | "ceiling" | "wall">()

  for (let row = 0; row <= ROWS; row++) {
    gridVertices[row] = []
    for (let col = 0; col <= COLS; col++) {
      const u = col / COLS   // 0 = left,   1 = right
      const v = row / ROWS   // 0 = bottom, 1 = top
      // Point on the lens-shifted image plane for this (u, v)
      const imagePoint = centre.clone()
        .addScaledVector(right,   (u - 0.5) * imgW)
        .addScaledVector(imageUp, (v - 0.5) * imgH)
      // Ray from the projector origin through that image point
      const rayDir = imagePoint.clone().sub(origin).normalize()
      const hit = rayRoomIntersect(origin, rayDir, W, H, D)
      if (hit) {
        gridVertices[row].push(hit.point.clone())
        hitSurfaceSet.add(hit.surface)
      } else {
        gridVertices[row].push(null)
      }
    }
  }

  // Build triangles from quads — each quad → 2 triangles, skip any with null vertices
  const posArr: number[] = []
  const uvArr: number[] = []
  let totalAreaM2 = 0

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const bl = gridVertices[row][col]
      const br = gridVertices[row][col + 1]
      const tl = gridVertices[row + 1][col]
      const tr = gridVertices[row + 1][col + 1]

      const u0 = col / COLS,       u1 = (col + 1) / COLS
      const v0 = row / ROWS,       v1 = (row + 1) / ROWS

      // Triangle 1: bl, br, tr
      if (bl && br && tr) {
        posArr.push(bl.x, bl.y, bl.z,  br.x, br.y, br.z,  tr.x, tr.y, tr.z)
        uvArr.push(u0, v0,  u1, v0,  u1, v1)
        totalAreaM2 += triArea(bl, br, tr)
      }
      // Triangle 2: bl, tr, tl
      if (bl && tr && tl) {
        posArr.push(bl.x, bl.y, bl.z,  tr.x, tr.y, tr.z,  tl.x, tl.y, tl.z)
        uvArr.push(u0, v0,  u1, v1,  u0, v1)
        totalAreaM2 += triArea(bl, tr, tl)
      }
    }
  }

  if (posArr.length === 0) return null

  return {
    positions: new Float32Array(posArr),
    uvs: new Float32Array(uvArr),
    gridVertices,
    gridCols: COLS,
    gridRows: ROWS,
    isMultiSurface: hitSurfaceSet.size > 1,
    surfaces: Array.from(hitSurfaceSet),
    totalAreaM2,
    centre,
    apex,
    dir,
    imgW,
    imgH,
    throwDist,
    throwRatio,
    lumens,
  }
}

export interface ThrowEnvelope {
  minZoom: FootprintData | null   // smallest image (throw_ratio_max)
  maxZoom: FootprintData | null   // largest image  (throw_ratio_min)
}

/** Computes footprints for the extremes of the projector's zoom range.
 *  Returns null entries when the projector has only one throw ratio or no zoom. */
export function computeThrowEnvelope(
  node: DeviceNode,
  placement: DevicePlacement,
  room: RoomConfig3D
): ThrowEnvelope {
  const proj = node.data.record.metadata.projection
  if (!proj) return { minZoom: null, maxZoom: null }

  const trMin = proj.throw_ratio_min
  const trMax = proj.throw_ratio_max

  // No zoom range — both are the same
  if (!trMin || !trMax || Math.abs(trMin - trMax) < 0.01) {
    return { minZoom: null, maxZoom: null }
  }

  function fpAt(ratio: number): FootprintData | null {
    const { width_m: W, depth_m: D, height_m: H } = room
    const origin = new Vector3(
      placement.position3d.x,
      placement.position3d.y,
      placement.position3d.z
    )
    const dir = projectionDirection(placement)
    const hit = rayRoomIntersect(origin, dir, W, H, D)
    if (!hit) return null

    const throwDist = hit.distance
    const imgW = throwDist / ratio
    const aspect = parseAspect(proj!.resolution ?? node.data.record.metadata.video?.resolution)
    const imgH = imgW / aspect

    const shiftV = (proj!.lens_shift_v_percent ?? 0) / 100
    const shiftH = (proj!.lens_shift_h_percent ?? 0) / 100

    const worldUp = Math.abs(dir.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
    const right = new Vector3().crossVectors(dir, worldUp).normalize()
    const imageUp = new Vector3().crossVectors(right, dir).normalize()

    const centre = hit.point.clone()
      .addScaledVector(imageUp, shiftV * imgH)
      .addScaledVector(right, shiftH * imgW)

    const corners = [
      centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp,  imgH / 2),
      centre.clone().addScaledVector(right,  imgW / 2).addScaledVector(imageUp,  imgH / 2),
      centre.clone().addScaledVector(right,  imgW / 2).addScaledVector(imageUp, -imgH / 2),
      centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, -imgH / 2),
    ]

    return {
      hit, corners, centre,
      normal: hit.normal, right, imageUp,
      imgW, imgH, throwDist, throwRatio: ratio,
      apex: origin.clone().addScaledVector(dir, 0.15),
      dir, lumens: proj!.lumens,
    }
  }

  return {
    minZoom: fpAt(trMax),   // high ratio  → small image
    maxZoom: fpAt(trMin),   // low ratio   → large image
  }
}

// ─── Full projector planning analysis ────────────────────────────────────────

export interface ProjectorAnalysisResult {
  // ── Image size at current throw ──────────────────────────────────────────
  imgW: number
  imgH: number
  throwDist: number
  screenAreaM2: number

  // ── Brightness ──────────────────────────────────────────────────────────
  /** Projected lumens per m² (lux) at the current image size */
  lux: number | null
  footCandles: number | null
  /** ISO 21118 / AVIXA F502.01 threshold: 54 lux min, 107 lux recommended */
  luxPass: "pass" | "warn" | "fail" | null

  // ── Contrast vs ambient ──────────────────────────────────────────────────
  /** Rough ANSI contrast: projector lux / ambient lux */
  contrastRatioEstimate: number | null
  contrastPass: "pass" | "warn" | "fail" | null

  // ── Throw range ──────────────────────────────────────────────────────────
  /** True minimum image width at max throw ratio (telephoto end) */
  imageWidthAtMaxRatio: number | null
  /** True maximum image width at min throw ratio (wide end) */
  imageWidthAtMinRatio: number | null

  // ── Minimum throw distance guard ─────────────────────────────────────────
  /** Distance from projector lens to screen */
  minThrowViolation: boolean
  minThrowDistanceM: number | null

  // ── Keystone / tilt ──────────────────────────────────────────────────────
  /** Degrees the projector is tilted off perpendicular to screen */
  tiltDegrees: number
  keystoneWarning: boolean   // > 15°

  // ── Lens shift sufficiency ───────────────────────────────────────────────
  projectorHeightM: number
  screenCentreHeightM: number
  verticalOffsetM: number
  /** Lens shift % needed to centre image */
  lensShiftNeededPct: number
  lensShiftSufficient: boolean | null   // null = no lens shift spec

  // ── Pixel density ────────────────────────────────────────────────────────
  pixelsWide: number | null
  pixelsHigh: number | null
  pxPerMetreH: number | null
  /** Angular resolution in arc-minutes/px at 3 m viewing distance */
  arcMinPerPxAt3m: number | null

  // ── Aspect ratio ─────────────────────────────────────────────────────────
  nativeAspect: number
  /** Aspect of physical screen (from room config), null if not configured */
  screenAspect: number | null
  aspectMismatch: boolean | null
  /** Horizontal black-bar fraction (0–1) if pillarboxing */
  pillarboxFraction: number | null
  /** Vertical black-bar fraction (0–1) if letterboxing */
  letterboxFraction: number | null
}

function parseResolutionPx(resolution?: string): { w: number; h: number } | null {
  if (!resolution) return null
  const m = resolution.match(/(\d{3,5})[xX×](\d{3,5})/)
  if (!m) return null
  return { w: parseInt(m[1]), h: parseInt(m[2]) }
}

export function runProjectorAnalysis(
  node: DeviceNode,
  placement: DevicePlacement,
  room: RoomConfig3D
): ProjectorAnalysisResult | null {
  const fp = computeProjectorFootprint(node, placement, room)
  if (!fp) return null

  const proj = node.data.record.metadata.projection!
  const { imgW, imgH, throwDist } = fp
  const screenAreaM2 = imgW * imgH

  // ── Brightness ──────────────────────────────────────────────────────────
  const lumens = proj.lumens ?? null
  const lux = lumens != null ? lumens / screenAreaM2 : null
  const footCandles = lux != null ? lux / 10.764 : null
  let luxPass: ProjectorAnalysisResult["luxPass"] = null
  if (lux != null) {
    if (lux >= 107) luxPass = "pass"
    else if (lux >= 54) luxPass = "warn"
    else luxPass = "fail"
  }

  // ── Contrast vs ambient ──────────────────────────────────────────────────
  const ambientLux = room.ambient_lux ?? null
  let contrastRatioEstimate: number | null = null
  let contrastPass: ProjectorAnalysisResult["contrastPass"] = null
  if (lux != null && ambientLux != null && ambientLux > 0) {
    contrastRatioEstimate = Math.round(lux / ambientLux)
    if (contrastRatioEstimate >= 50) contrastPass = "pass"
    else if (contrastRatioEstimate >= 8) contrastPass = "warn"
    else contrastPass = "fail"
  }

  // ── Throw range ──────────────────────────────────────────────────────────
  const imageWidthAtMaxRatio = proj.throw_ratio_max != null
    ? throwDist / proj.throw_ratio_max : null
  const imageWidthAtMinRatio = proj.throw_ratio_min != null
    ? throwDist / proj.throw_ratio_min : null

  // ── Minimum throw distance guard ─────────────────────────────────────────
  const minThrowDistanceM = proj.min_throw_distance_m ?? null
  const minThrowViolation = minThrowDistanceM != null
    ? throwDist < minThrowDistanceM
    : false

  // ── Keystone / tilt ──────────────────────────────────────────────────────
  const dir = fp.dir
  // Angle between projection direction and the hit surface normal (reversed = perpendicular = 0°)
  const perpendicular = fp.normal.clone().negate()
  const dotProduct = Math.max(-1, Math.min(1, dir.dot(perpendicular)))
  const tiltDegrees = Math.round(Math.acos(dotProduct) * (180 / Math.PI) * 10) / 10
  const keystoneWarning = tiltDegrees > 15

  // ── Lens shift sufficiency ───────────────────────────────────────────────
  const projectorHeightM = placement.position3d.y
  const screenCentreHeightM = fp.centre.y
  const verticalOffsetM = screenCentreHeightM - projectorHeightM
  // Needed shift as % of image height
  const lensShiftNeededPct = Math.round((verticalOffsetM / imgH) * 100 * 10) / 10
  let lensShiftSufficient: boolean | null = null
  if (proj.lens_shift_v_percent != null) {
    lensShiftSufficient = Math.abs(lensShiftNeededPct) <= proj.lens_shift_v_percent
  }

  // ── Pixel density ────────────────────────────────────────────────────────
  const resolutionStr = proj.resolution ?? node.data.record.metadata.video?.resolution
  const resPx = parseResolutionPx(resolutionStr)
  const pixelsWide = resPx?.w ?? null
  const pixelsHigh = resPx?.h ?? null
  const pxPerMetreH = resPx != null ? resPx.w / imgW : null
  const arcMinPerPxAt3m = pxPerMetreH != null
    ? Math.round((1 / (pxPerMetreH * 3)) * (180 / Math.PI) * 60 * 10) / 10
    : null

  // ── Aspect ratio ─────────────────────────────────────────────────────────
  const nativeAspect = parseAspect(resolutionStr)
  let screenAspect: number | null = null
  let aspectMismatch: boolean | null = null
  let pillarboxFraction: number | null = null
  let letterboxFraction: number | null = null

  if (room.screen_width_m != null && room.screen_height_m != null && room.screen_height_m > 0) {
    screenAspect = Math.round((room.screen_width_m / room.screen_height_m) * 1000) / 1000
    const tolerance = 0.05
    aspectMismatch = Math.abs(nativeAspect - screenAspect) > tolerance
    if (aspectMismatch) {
      if (nativeAspect > screenAspect) {
        // Image wider than screen → letterbox (horizontal bars)
        letterboxFraction = 1 - screenAspect / nativeAspect
        pillarboxFraction = null
      } else {
        // Image taller than screen → pillarbox (vertical bars)
        pillarboxFraction = 1 - nativeAspect / screenAspect
        letterboxFraction = null
      }
    }
  }

  return {
    imgW, imgH, throwDist, screenAreaM2,
    lux, footCandles, luxPass,
    contrastRatioEstimate, contrastPass,
    imageWidthAtMaxRatio, imageWidthAtMinRatio,
    minThrowViolation, minThrowDistanceM,
    tiltDegrees, keystoneWarning,
    projectorHeightM, screenCentreHeightM, verticalOffsetM,
    lensShiftNeededPct, lensShiftSufficient,
    pixelsWide, pixelsHigh, pxPerMetreH, arcMinPerPxAt3m,
    nativeAspect, screenAspect, aspectMismatch,
    pillarboxFraction, letterboxFraction,
  }
}
