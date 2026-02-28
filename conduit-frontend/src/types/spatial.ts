export interface Position3D {
  x: number   // metres from room origin (left wall)
  y: number   // height (0 = floor)
  z: number   // depth from front wall
}

export interface DevicePlacement {
  instanceId: string
  position3d: Position3D
  rotation: { x: number; y: number; z: number }  // radians
  mounted: MountPosition
}

export type MountPosition =
  | "floor"
  | "rack"
  | "truss"
  | "ceiling"
  | "wall-front"
  | "wall-rear"
  | "wall-left"
  | "wall-right"
  | "table"
  | "freestanding"

export interface RoomConfig3D {
  width_m: number
  depth_m: number
  height_m: number
  venueName: string
}
