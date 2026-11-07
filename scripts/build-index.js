// Build-time generator for the client "app index" (public/app-index.json).
//
// The full dataset (public/data.json, ~20 MB) stays the canonical source for the
// REST API, the MCP server, and the human bulk download. The browser app does
// NOT need all of it: it needs a searchable/mappable list of entities, and it
// gets relationships, full entity records, graphs, and paths from the API on
// demand. So this script emits a trimmed, edge-less index that is a fraction of
// the size, which is what the SPA fetches on load.
//
// Trimming:
//   - Drop all edges (9+ MB) — the graph, path-finder, and entity connections
//     are served by the API instead.
//   - Drop Documentation entities (18.6k rows / ~4.5 MB) — they never appear in
//     search, map, or path-finding; they surface only as connection targets,
//     which come from the API.
//   - Drop heavy per-entity fields the list/search/map UI never reads.
//   - Bake a `sanctioned` boolean onto each entity (derived from Sanction edges)
//     so the client doesn't need the edge list to know sanctions status.
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SRC = join(root, 'public/data.json')
const OUT = join(root, 'public/app-index.json')

// Entity schemas excluded from the client index entirely.
const EXCLUDE_SCHEMAS = new Set(['Documentation'])
// Properties dropped from the client index (heavy and/or unused by the list,
// search, and map views; full records with these fields come from /api/entity).
const DROP_FIELDS = new Set(['proof', 'notes', 'document', 'involved', 'entity', 'namesMentioned'])

const raw = JSON.parse(readFileSync(SRC, 'utf-8'))

const sanctioned = new Set()
for (const e of raw.edges) if (e.schema === 'Sanction') sanctioned.add(e.source)

const entities = []
for (const e of raw.entities) {
  if (EXCLUDE_SCHEMAS.has(e.schema)) continue
  const props = {}
  for (const [k, v] of Object.entries(e.properties || {})) {
    if (!DROP_FIELDS.has(k)) props[k] = v
  }
  entities.push({ id: e.id, schema: e.schema, properties: props, sanctioned: sanctioned.has(e.id) })
}

writeFileSync(OUT, JSON.stringify({ entities }))

const srcMb = (Buffer.byteLength(JSON.stringify(raw)) / 1048576).toFixed(1)
const outMb = (Buffer.byteLength(JSON.stringify({ entities })) / 1048576).toFixed(1)
console.log(`app-index.json: ${entities.length} entities (from ${raw.entities.length}) — ${outMb} MB (full dataset ${srcMb} MB)`)
