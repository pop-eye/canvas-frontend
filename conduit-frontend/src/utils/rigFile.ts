import { z } from "zod"
import { DeviceNode, ConnectionEdge, RoomConfig } from "../types/canvas"
import { useCanvasStore } from "../store/canvasStore"

// ── Zod schemas ────────────────────────────────────────────────────────────────

const PositionSchema = z.object({ x: z.number(), y: z.number() })

const NodeDataSchema = z.object({
  instanceId: z.string(),
  label: z.string().optional(),
  record: z.object({
    id: z.string(),
    name: z.string(),
    manufacturer: z.string(),
    model: z.string(),
    category: z.string(),
    confidence_score: z.number(),
    needs_review: z.boolean(),
    metadata: z.record(z.string(), z.unknown()),
    connectors: z.array(z.record(z.string(), z.unknown())).optional(),
    schema_version: z.string().optional(),
    scraped_at: z.string().optional(),
    datasheet_url: z.string().nullable().optional(),
  }),
})

const DeviceNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: PositionSchema,
  data: NodeDataSchema,
})

const EdgeDataSchema = z.object({
  sourcePortId: z.string().optional(),
  targetPortId: z.string().optional(),
  signalType: z.string().optional(),
  compatible: z.boolean().optional(),
  warning: z.string().optional(),
})

const ConnectionEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  type: z.string().optional(),
  data: EdgeDataSchema.optional(),
})

const RoomConfigSchema = z.object({
  name: z.string(),
  width_m: z.number().positive(),
  depth_m: z.number().positive(),
})

const ConduitFileSchema = z.object({
  version: z.literal(1),
  savedAt: z.string(),
  roomConfig: RoomConfigSchema.nullable(),
  nodes: z.array(DeviceNodeSchema),
  edges: z.array(ConnectionEdgeSchema),
})

type ConduitFile = z.infer<typeof ConduitFileSchema>

// ── Save ──────────────────────────────────────────────────────────────────────

export function saveRig() {
  const { nodes, edges, roomConfig } = useCanvasStore.getState()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const file: any = {
    version: 1,
    savedAt: new Date().toISOString(),
    roomConfig,
    nodes,
    edges,
  }

  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const filename = (roomConfig?.name ?? "conduit-rig")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  a.download = `${filename}.conduit`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Load ──────────────────────────────────────────────────────────────────────

export async function loadRig(file: File): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const text = await file.text()
    const json = JSON.parse(text)
    const result = ConduitFileSchema.safeParse(json)

    if (!result.success) {
      const first = result.error.issues[0]
      return { ok: false, error: `Invalid file: ${first.path.join(".")} — ${first.message}` }
    }

    const { nodes, edges, roomConfig } = result.data
    useCanvasStore.getState().loadRig(
      nodes as unknown as DeviceNode[],
      edges as unknown as ConnectionEdge[],
      roomConfig as RoomConfig | null
    )
    return { ok: true }
  } catch {
    return { ok: false, error: "Failed to parse .conduit file — is this a valid CONDUIT export?" }
  }
}
