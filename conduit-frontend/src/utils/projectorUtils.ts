import { Vector3, Quaternion } from "three"
import type { DeviceNode } from "../types/canvas"
import type { DevicePlacement, RoomConfig3D } from "../types/spatial"
import { getProjectorSpec, type ProjectorSpec } from "../conduit/device"

export interface HitResult {
  point: Vector3
  distance: number
  surface: "floor" | "ceiling" | "wall"
  normal: Vector3
}

export interface FootprintData {
  hit: HitResult
  corners: Vector3[] // [TL, TR, BR, BL]
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

export function rayRoomIntersect(origin: Vector3, dir: Vector3, W: number, H: number, D: number): HitResult | null {
  const surfaces: { name: HitResult["surface"]; t: number; normal: Vector3; check: (p: Vector3) => boolean }[] = [
    { name: "floor", t: Math.abs(dir.y) > 1e-6 ? (0 - origin.y) / dir.y : Infinity, normal: new Vector3(0, 1, 0), check: (p) => p.x >= 0 && p.x <= W && p.z >= 0 && p.z <= D },
    { name: "ceiling", t: Math.abs(dir.y) > 1e-6 ? (H - origin.y) / dir.y : Infinity, normal: new Vector3(0, -1, 0), check: (p) => p.x >= 0 && p.x <= W && p.z >= 0 && p.z <= D },
    { name: "wall", t: Math.abs(dir.z) > 1e-6 ? (0 - origin.z) / dir.z : Infinity, normal: new Vector3(0, 0, 1), check: (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H },
    { name: "wall", t: Math.abs(dir.z) > 1e-6 ? (D - origin.z) / dir.z : Infinity, normal: new Vector3(0, 0, -1), check: (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H },
    { name: "wall", t: Math.abs(dir.x) > 1e-6 ? (0 - origin.x) / dir.x : Infinity, normal: new Vector3(1, 0, 0), check: (p) => p.z >= 0 && p.z <= D && p.y >= 0 && p.y <= H },
    { name: "wall", t: Math.abs(dir.x) > 1e-6 ? (W - origin.x) / dir.x : Infinity, normal: new Vector3(-1, 0, 0), check: (p) => p.z >= 0 && p.z <= D && p.y >= 0 && p.y <= H },
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

function specAspect(spec: ProjectorSpec): number {
  if (spec.resWidth && spec.resHeight) return spec.resWidth / spec.resHeight
  return 16 / 9
}

export function projectionDirection(placement: DevicePlacement): Vector3 {
  let base: Vector3
  if (placement.mounted === "truss" || placement.mounted === "ceiling") base = new Vector3(0, -1, 0)
  else if (placement.mounted === "wall-front") base = new Vector3(0, 0, 1)
  else if (placement.mounted === "wall-rear") base = new Vector3(0, 0, -1)
  else base = new Vector3(0, 0, -1)
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), placement.rotation.y)
  return base.clone().applyQuaternion(q).normalize()
}

export function computeProjectorFootprint(node: DeviceNode, placement: DevicePlacement, room: RoomConfig3D): FootprintData | null {
  const spec = getProjectorSpec(node.data.device)
  if (!spec || !(spec.throwRatioMin || spec.throwRatioMax)) return null

  const { width_m: W, depth_m: D, height_m: H } = room
  const origin = new Vector3(placement.position3d.x, placement.position3d.y, placement.position3d.z)
  const dir = projectionDirection(placement)
  const hit = rayRoomIntersect(origin, dir, W, H, D)
  if (!hit) return null

  const trMin = spec.throwRatioMin
  const trMax = spec.throwRatioMax
  const throwRatio = trMin && trMax ? (trMin + trMax) / 2 : (trMin ?? trMax ?? 1.5)

  const throwDist = hit.distance
  const imgW = throwDist / throwRatio
  const aspect = specAspect(spec)
  const imgH = imgW / aspect

  const shiftV = (spec.lensShiftVPercent ?? 0) / 100
  const shiftH = (spec.lensShiftHPercent ?? 0) / 100

  const worldUp = Math.abs(dir.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
  const right = new Vector3().crossVectors(dir, worldUp).normalize()
  const imageUp = new Vector3().crossVectors(right, dir).normalize()

  const centre = hit.point.clone().addScaledVector(imageUp, shiftV * imgH).addScaledVector(right, shiftH * imgW)

  const corners = [
    centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, imgH / 2),
    centre.clone().addScaledVector(right, imgW / 2).addScaledVector(imageUp, imgH / 2),
    centre.clone().addScaledVector(right, imgW / 2).addScaledVector(imageUp, -imgH / 2),
    centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, -imgH / 2),
  ]

  const apex = origin.clone().addScaledVector(dir, 0.15)

  return { hit, corners, centre, normal: hit.normal, right, imageUp, imgW, imgH, throwDist, throwRatio, apex, dir, lumens: spec.lumens }
}

// ─── Tessellated multi-surface footprint ─────────────────────────────────────

export const TESS_COLS = 20
export const TESS_ROWS = 12

export interface TessellatedFootprint {
  positions: Float32Array
  uvs: Float32Array
  gridVertices: (Vector3 | null)[][]
  gridCols: number
  gridRows: number
  isMultiSurface: boolean
  surfaces: Array<"floor" | "ceiling" | "wall">
  totalAreaM2: number
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

export function computeTessellatedFootprint(node: DeviceNode, placement: DevicePlacement, room: RoomConfig3D): TessellatedFootprint | null {
  const fp = computeProjectorFootprint(node, placement, room)
  if (!fp) return null

  const { width_m: W, depth_m: D, height_m: H } = room
  const origin = new Vector3(placement.position3d.x, placement.position3d.y, placement.position3d.z)
  const { centre, right, imageUp, imgW, imgH, throwDist, throwRatio, apex, dir, lumens } = fp

  const COLS = TESS_COLS
  const ROWS = TESS_ROWS

  const gridVertices: (Vector3 | null)[][] = []
  const hitSurfaceSet = new Set<"floor" | "ceiling" | "wall">()

  for (let row = 0; row <= ROWS; row++) {
    gridVertices[row] = []
    for (let col = 0; col <= COLS; col++) {
      const u = col / COLS
      const v = row / ROWS
      const imagePoint = centre.clone().addScaledVector(right, (u - 0.5) * imgW).addScaledVector(imageUp, (v - 0.5) * imgH)
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

  const posArr: number[] = []
  const uvArr: number[] = []
  let totalAreaM2 = 0

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const bl = gridVertices[row][col]
      const br = gridVertices[row][col + 1]
      const tl = gridVertices[row + 1][col]
      const tr = gridVertices[row + 1][col + 1]
      const u0 = col / COLS, u1 = (col + 1) / COLS
      const v0 = row / ROWS, v1 = (row + 1) / ROWS

      if (bl && br && tr) {
        posArr.push(bl.x, bl.y, bl.z, br.x, br.y, br.z, tr.x, tr.y, tr.z)
        uvArr.push(u0, v0, u1, v0, u1, v1)
        totalAreaM2 += triArea(bl, br, tr)
      }
      if (bl && tr && tl) {
        posArr.push(bl.x, bl.y, bl.z, tr.x, tr.y, tr.z, tl.x, tl.y, tl.z)
        uvArr.push(u0, v0, u1, v1, u0, v1)
        totalAreaM2 += triArea(bl, tr, tl)
      }
    }
  }

  if (posArr.length === 0) return null

  return {
    positions: new Float32Array(posArr),
    uvs: new Float32Array(uvArr),
    gridVertices, gridCols: COLS, gridRows: ROWS,
    isMultiSurface: hitSurfaceSet.size > 1,
    surfaces: Array.from(hitSurfaceSet),
    totalAreaM2, centre, apex, dir, imgW, imgH, throwDist, throwRatio, lumens,
  }
}

export interface ThrowEnvelope {
  minZoom: FootprintData | null
  maxZoom: FootprintData | null
}

export function computeThrowEnvelope(node: DeviceNode, placement: DevicePlacement, room: RoomConfig3D): ThrowEnvelope {
  const spec = getProjectorSpec(node.data.device)
  if (!spec) return { minZoom: null, maxZoom: null }

  const trMin = spec.throwRatioMin
  const trMax = spec.throwRatioMax
  if (!trMin || !trMax || Math.abs(trMin - trMax) < 0.01) return { minZoom: null, maxZoom: null }

  function fpAt(ratio: number): FootprintData | null {
    const { width_m: W, depth_m: D, height_m: H } = room
    const origin = new Vector3(placement.position3d.x, placement.position3d.y, placement.position3d.z)
    const dir = projectionDirection(placement)
    const hit = rayRoomIntersect(origin, dir, W, H, D)
    if (!hit) return null

    const throwDist = hit.distance
    const imgW = throwDist / ratio
    const aspect = specAspect(spec!)
    const imgH = imgW / aspect
    const shiftV = (spec!.lensShiftVPercent ?? 0) / 100
    const shiftH = (spec!.lensShiftHPercent ?? 0) / 100
    const worldUp = Math.abs(dir.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
    const right = new Vector3().crossVectors(dir, worldUp).normalize()
    const imageUp = new Vector3().crossVectors(right, dir).normalize()
    const centre = hit.point.clone().addScaledVector(imageUp, shiftV * imgH).addScaledVector(right, shiftH * imgW)
    const corners = [
      centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, imgH / 2),
      centre.clone().addScaledVector(right, imgW / 2).addScaledVector(imageUp, imgH / 2),
      centre.clone().addScaledVector(right, imgW / 2).addScaledVector(imageUp, -imgH / 2),
      centre.clone().addScaledVector(right, -imgW / 2).addScaledVector(imageUp, -imgH / 2),
    ]
    return { hit, corners, centre, normal: hit.normal, right, imageUp, imgW, imgH, throwDist, throwRatio: ratio, apex: origin.clone().addScaledVector(dir, 0.15), dir, lumens: spec!.lumens }
  }

  return { minZoom: fpAt(trMax), maxZoom: fpAt(trMin) }
}

// ─── Full projector planning analysis ────────────────────────────────────────

export interface ProjectorAnalysisResult {
  imgW: number
  imgH: number
  throwDist: number
  screenAreaM2: number
  lux: number | null
  footCandles: number | null
  luxPass: "pass" | "warn" | "fail" | null
  contrastRatioEstimate: number | null
  contrastPass: "pass" | "warn" | "fail" | null
  imageWidthAtMaxRatio: number | null
  imageWidthAtMinRatio: number | null
  minThrowViolation: boolean
  minThrowDistanceM: number | null
  tiltDegrees: number
  keystoneWarning: boolean
  projectorHeightM: number
  screenCentreHeightM: number
  verticalOffsetM: number
  lensShiftNeededPct: number
  lensShiftSufficient: boolean | null
  pixelsWide: number | null
  pixelsHigh: number | null
  pxPerMetreH: number | null
  arcMinPerPxAt3m: number | null
  nativeAspect: number
  screenAspect: number | null
  aspectMismatch: boolean | null
  pillarboxFraction: number | null
  letterboxFraction: number | null
}

export function runProjectorAnalysis(node: DeviceNode, placement: DevicePlacement, room: RoomConfig3D): ProjectorAnalysisResult | null {
  const fp = computeProjectorFootprint(node, placement, room)
  const spec = getProjectorSpec(node.data.device)
  if (!fp || !spec) return null

  const { imgW, imgH, throwDist } = fp
  const screenAreaM2 = imgW * imgH

  const lumens = spec.lumens ?? null
  const lux = lumens != null ? lumens / screenAreaM2 : null
  const footCandles = lux != null ? lux / 10.764 : null
  let luxPass: ProjectorAnalysisResult["luxPass"] = null
  if (lux != null) luxPass = lux >= 107 ? "pass" : lux >= 54 ? "warn" : "fail"

  const ambientLux = room.ambient_lux ?? null
  let contrastRatioEstimate: number | null = null
  let contrastPass: ProjectorAnalysisResult["contrastPass"] = null
  if (lux != null && ambientLux != null && ambientLux > 0) {
    contrastRatioEstimate = Math.round(lux / ambientLux)
    contrastPass = contrastRatioEstimate >= 50 ? "pass" : contrastRatioEstimate >= 8 ? "warn" : "fail"
  }

  const imageWidthAtMaxRatio = spec.throwRatioMax != null ? throwDist / spec.throwRatioMax : null
  const imageWidthAtMinRatio = spec.throwRatioMin != null ? throwDist / spec.throwRatioMin : null

  // conduit/v1 has no explicit minimum throw distance.
  const minThrowDistanceM: number | null = null
  const minThrowViolation = false

  const dir = fp.dir
  const perpendicular = fp.normal.clone().negate()
  const dotProduct = Math.max(-1, Math.min(1, dir.dot(perpendicular)))
  const tiltDegrees = Math.round(Math.acos(dotProduct) * (180 / Math.PI) * 10) / 10
  const keystoneWarning = tiltDegrees > 15

  const projectorHeightM = placement.position3d.y
  const screenCentreHeightM = fp.centre.y
  const verticalOffsetM = screenCentreHeightM - projectorHeightM
  const lensShiftNeededPct = Math.round((verticalOffsetM / imgH) * 100 * 10) / 10
  let lensShiftSufficient: boolean | null = null
  if (spec.lensShiftVPercent != null) lensShiftSufficient = Math.abs(lensShiftNeededPct) <= spec.lensShiftVPercent

  const pixelsWide = spec.resWidth ?? null
  const pixelsHigh = spec.resHeight ?? null
  const pxPerMetreH = pixelsWide != null ? pixelsWide / imgW : null
  const arcMinPerPxAt3m = pxPerMetreH != null ? Math.round((1 / (pxPerMetreH * 3)) * (180 / Math.PI) * 60 * 10) / 10 : null

  const nativeAspect = specAspect(spec)
  let screenAspect: number | null = null
  let aspectMismatch: boolean | null = null
  let pillarboxFraction: number | null = null
  let letterboxFraction: number | null = null

  if (room.screen_width_m != null && room.screen_height_m != null && room.screen_height_m > 0) {
    screenAspect = Math.round((room.screen_width_m / room.screen_height_m) * 1000) / 1000
    aspectMismatch = Math.abs(nativeAspect - screenAspect) > 0.05
    if (aspectMismatch) {
      if (nativeAspect > screenAspect) {
        letterboxFraction = 1 - screenAspect / nativeAspect
      } else {
        pillarboxFraction = 1 - nativeAspect / screenAspect
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
