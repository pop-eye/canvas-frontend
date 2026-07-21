/**
 * Runtime validation for conduit/v1 device profiles.
 *
 * Deliberately lenient, per the standard's forward-compatibility rule:
 *   - Enum-like fields are validated as plain strings (unknown future values
 *     must not error).
 *   - Unknown object keys are preserved, not rejected.
 * We validate only the invariants the app relies on to render safely:
 * the required identity fields and a well-formed `ports` array.
 */
import { z } from "zod"
import type { ConduitDevice } from "./types"

const portSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    signal_type: z.string(),
    connector_type: z.string(),
    direction: z.string(),
    count: z.number().optional(),
    signal_modes: z
      .array(z.object({ signal_type: z.string() }).loose())
      .optional(),
  })
  .loose()

const deviceSchema = z
  .object({
    schema_version: z.string(),
    manufacturer: z.string().min(1),
    model: z.string().min(1),
    category: z.string(),
    ports: z.array(portSchema).min(1),
  })
  .loose()

export interface ParseOk {
  ok: true
  device: ConduitDevice
}
export interface ParseErr {
  ok: false
  error: string
}
export type ParseResult = ParseOk | ParseErr

/** Validate an unknown value as a conduit/v1 device. Never throws. */
export function parseDevice(input: unknown): ParseResult {
  const result = deviceSchema.safeParse(input)
  if (!result.success) {
    const first = result.error.issues[0]
    const path = first?.path.join(".") || "(root)"
    return { ok: false, error: `${path}: ${first?.message ?? "invalid device"}` }
  }
  // Normalise: ensure every port has a count (default 1).
  const device = result.data as unknown as ConduitDevice
  for (const port of device.ports) if (port.count == null) port.count = 1
  return { ok: true, device }
}

/** Convenience: parse and throw on failure (for tests / trusted input). */
export function parseDeviceOrThrow(input: unknown): ConduitDevice {
  const r = parseDevice(input)
  if (!r.ok) throw new Error(r.error)
  return r.device
}
