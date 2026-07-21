/**
 * Back-compat shim. Colour is now derived from the hierarchical conduit/v1
 * signal type (domain-based) in src/conduit/signalType.ts. These wrappers keep
 * older call sites working while pointing at the single source of truth.
 */
import { signalColour } from "../conduit/signalType"

export function portColour(signalType: string): string {
  return signalColour(signalType)
}

export function portColourHex(signalType: string): string {
  return signalColour(signalType)
}
