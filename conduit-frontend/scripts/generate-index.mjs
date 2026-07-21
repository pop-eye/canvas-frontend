/**
 * Generate a device index manifest for a conduit/v1 device export tree.
 *
 * Walks `<devicesDir>/<manufacturer>/<model>.json`, reads a light summary from
 * each profile, and writes `index.json`. The app fetches this manifest to list
 * the library without downloading every full profile.
 *
 * Usage:
 *   node scripts/generate-index.mjs <devicesDir> <outFile>
 *
 * Examples:
 *   node scripts/generate-index.mjs src/data/sample-devices src/data/sample-index.json
 *   node scripts/generate-index.mjs ../conduit-open-standard/exports/devices ../conduit-open-standard/exports/devices/index.json
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

const [, , devicesDir, outFile] = process.argv
if (!devicesDir || !outFile) {
  console.error("usage: node scripts/generate-index.mjs <devicesDir> <outFile>")
  process.exit(1)
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (name.endsWith(".json") && name !== "index.json") out.push(full)
  }
  return out
}

const files = walk(devicesDir).sort()
const devices = []

for (const file of files) {
  let doc
  try {
    doc = JSON.parse(readFileSync(file, "utf8"))
  } catch (e) {
    console.warn(`skip (invalid JSON): ${file} — ${e.message}`)
    continue
  }
  const rel = relative(devicesDir, file).split(sep).join("/")
  const id = rel.replace(/\.json$/, "")
  devices.push({
    id,
    path: rel,
    manufacturer: doc.manufacturer ?? "",
    model: doc.model ?? "",
    model_variant: doc.model_variant,
    category: doc.category ?? "other",
    subcategory: doc.subcategory,
    form_factor: doc.form_factor,
    description: doc.description,
    port_count: Array.isArray(doc.ports) ? doc.ports.length : 0,
    verified: doc.profile_meta?.verified,
    confidence: doc.profile_meta?.confidence,
    tags: doc.tags,
  })
}

const index = {
  schema_version: "conduit/v1",
  generated_at: new Date().toISOString().slice(0, 10),
  count: devices.length,
  devices,
}

writeFileSync(outFile, JSON.stringify(index, null, 2) + "\n")
console.log(`wrote ${outFile} — ${devices.length} devices`)
