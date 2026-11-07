import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getEntityName } from './entity.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let _data = null

export function loadData() {
  if (_data) return _data

  const raw = JSON.parse(readFileSync(join(__dirname, '../../dist/data.json'), 'utf-8'))
  const entityMap = {}
  raw.entities.forEach(e => { entityMap[e.id] = e })

  const sanctionedIds = new Set()
  raw.edges.forEach(e => { if (e.schema === 'Sanction') sanctionedIds.add(e.source) })

  // Undirected adjacency, built once and reused by pathfinding and neighbor
  // lookups. neighborMap keeps bare neighbor ids; adjacency also carries the edge
  // so findPath can report the relationship chain without rescanning all edges.
  const neighborMap = {}
  const adjacency = {}
  raw.edges.forEach(e => {
    if (!neighborMap[e.source]) neighborMap[e.source] = []
    if (!neighborMap[e.target]) neighborMap[e.target] = []
    neighborMap[e.source].push(e.target)
    neighborMap[e.target].push(e.source)
    if (!adjacency[e.source]) adjacency[e.source] = []
    if (!adjacency[e.target]) adjacency[e.target] = []
    adjacency[e.source].push({ id: e.target, edge: e })
    adjacency[e.target].push({ id: e.source, edge: e })
  })

  _data = { ...raw, entityMap, sanctionedIds, neighborMap, adjacency }
  return _data
}

export function searchEntities(data, { q, type, country, sanctioned, limit = 50, offset = 0 }) {
  let results = data.entities.filter(e => !['Documentation', 'Identification'].includes(e.schema))

  if (type) results = results.filter(e => e.schema === type)
  if (country) {
    results = results.filter(e => {
      const cs = [...(e.properties.country || []), ...(e.properties.nationality || [])]
      return cs.includes(country)
    })
  }
  if (sanctioned === 'true') results = results.filter(e => data.sanctionedIds.has(e.id))
  if (sanctioned === 'false') results = results.filter(e => !data.sanctionedIds.has(e.id))

  if (q) {
    const lower = q.toLowerCase()
    results = results.filter(e => {
      const text = Object.values(e.properties).flat().join(' ').toLowerCase()
      return text.includes(lower)
    })
  }

  const total = results.length
  results = results.slice(offset, offset + limit)

  return {
    total,
    offset,
    limit,
    results: results.map(e => formatEntity(e, data)),
  }
}

export function getEntity(data, id) {
  const e = data.entityMap[id]
  if (!e) return null
  return formatEntity(e, data)
}

export function getConnections(data, id) {
  return data.edges
    .filter(e => e.source === id || e.target === id)
    .map(e => {
      const otherId = e.source === id ? e.target : e.source
      const other = data.entityMap[otherId]
      if (!other) return null
      return {
        schema: e.schema,
        role: e.role || '',
        relationship: e.relationship || '',
        entity: formatEntity(other, data),
      }
    })
    .filter(Boolean)
}

// Shortest path via BFS over the precomputed adjacency. Records a predecessor
// (previous node + the edge taken) per visited node and reconstructs the chain at
// the end, instead of rebuilding the adjacency and copying a full path array into
// the queue for every node — far less CPU and memory for distant pairs.
export function findPath(data, fromId, toId) {
  if (!data.entityMap[fromId] || !data.entityMap[toId]) return null
  if (fromId === toId) {
    return { hops: 0, path: [formatEntity(data.entityMap[fromId], data)], edges: [] }
  }

  const adj = data.adjacency
  const prev = new Map([[fromId, null]]) // id -> { from, edge }
  const queue = [fromId]
  let head = 0
  let found = false

  while (head < queue.length) {
    const current = queue[head++]
    if (current === toId) { found = true; break }
    for (const neighbor of (adj[current] || [])) {
      if (!prev.has(neighbor.id)) {
        prev.set(neighbor.id, { from: current, edge: neighbor.edge })
        queue.push(neighbor.id)
      }
    }
  }

  if (!found && !prev.has(toId)) return null

  const ids = []
  const edges = []
  let cur = toId
  while (cur !== fromId) {
    const step = prev.get(cur)
    ids.push(cur)
    edges.push(step.edge)
    cur = step.from
  }
  ids.push(fromId)
  ids.reverse()
  edges.reverse()

  return {
    hops: ids.length - 1,
    path: ids.map(id => formatEntity(data.entityMap[id], data)),
    edges: edges.map(edge => ({ schema: edge.schema, role: edge.role || '', relationship: edge.relationship || '' })),
  }
}

// Top-connected entities plus their immediate neighbors — the default view the
// graph opens on. Returns a ready-to-render subgraph (nodes + edges among them).
export function getGraphSeed(data, limit = 150) {
  const connCount = {}
  data.edges.forEach(e => {
    connCount[e.source] = (connCount[e.source] || 0) + 1
    connCount[e.target] = (connCount[e.target] || 0) + 1
  })
  const top = data.entities
    .filter(e => ['Person', 'Company', 'Organization', 'Vessel'].includes(e.schema) && connCount[e.id])
    .sort((a, b) => (connCount[b.id] || 0) - (connCount[a.id] || 0))
    .slice(0, 30)
  const ids = new Set(top.map(e => e.id))
  data.edges.forEach(e => {
    if (ids.has(e.source)) ids.add(e.target)
    if (ids.has(e.target)) ids.add(e.source)
  })
  return getSubgraph(data, [...ids].slice(0, limit))
}

// Given a set of entity ids, return the nodes that exist (with a display name)
// and every edge whose both endpoints are in the set. This lets the client render
// a fully-interconnected graph for any id set without holding the edge list.
export function getSubgraph(data, ids) {
  const idSet = new Set(ids)
  const nodes = []
  for (const id of idSet) {
    const e = data.entityMap[id]
    if (e) nodes.push({ id: e.id, schema: e.schema, name: getEntityName(e), sanctioned: data.sanctionedIds.has(e.id) })
  }
  const edges = []
  for (const e of data.edges) {
    if (idSet.has(e.source) && idSet.has(e.target)) {
      edges.push({ source: e.source, target: e.target, schema: e.schema, role: e.role || '', relationship: e.relationship || '' })
    }
  }
  return { nodes, edges }
}

export function getStats(data) {
  const bySchema = {}
  const byCountry = {}
  data.entities.forEach(e => {
    bySchema[e.schema] = (bySchema[e.schema] || 0) + 1
    const cs = e.properties.country || e.properties.nationality || []
    cs.forEach(c => { byCountry[c] = (byCountry[c] || 0) + 1 })
  })
  return {
    totalEntities: data.entities.length,
    totalEdges: data.edges.length,
    totalSanctioned: data.sanctionedIds.size,
    bySchema,
    byCountry,
  }
}

function formatEntity(e, data) {
  if (!e) return null
  return {
    id: e.id,
    schema: e.schema,
    properties: e.properties,
    sanctioned: data.sanctionedIds.has(e.id),
  }
}
