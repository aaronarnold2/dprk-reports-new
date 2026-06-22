import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let _data = null

export function loadData() {
  if (_data) return _data

  const raw = JSON.parse(readFileSync(join(__dirname, '../../dist/data.json'), 'utf-8'))
  const entityMap = {}
  raw.entities.forEach(e => { entityMap[e.id] = e })

  const sanctionedIds = new Set()
  raw.edges.forEach(e => { if (e.schema === 'Sanction') sanctionedIds.add(e.source) })

  const neighborMap = {}
  raw.edges.forEach(e => {
    if (!neighborMap[e.source]) neighborMap[e.source] = []
    if (!neighborMap[e.target]) neighborMap[e.target] = []
    neighborMap[e.source].push(e.target)
    neighborMap[e.target].push(e.source)
  })

  _data = { ...raw, entityMap, sanctionedIds, neighborMap }
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

export function findPath(data, fromId, toId) {
  const visited = new Set([fromId])
  const queue = [[fromId]]
  const edgePath = new Map()

  const adj = {}
  data.edges.forEach(e => {
    if (!adj[e.source]) adj[e.source] = []
    if (!adj[e.target]) adj[e.target] = []
    adj[e.source].push({ id: e.target, edge: e })
    adj[e.target].push({ id: e.source, edge: e })
  })

  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]

    if (current === toId) {
      return {
        hops: path.length - 1,
        path: path.map(id => formatEntity(data.entityMap[id], data)),
        edges: Array.from({ length: path.length - 1 }, (_, i) => {
          const edge = edgePath.get(`${path[i]}->${path[i + 1]}`)
          return { schema: edge.schema, role: edge.role || '', relationship: edge.relationship || '' }
        }),
      }
    }

    for (const neighbor of (adj[current] || [])) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id)
        edgePath.set(`${current}->${neighbor.id}`, neighbor.edge)
        queue.push([...path, neighbor.id])
      }
    }
  }

  return null
}

export function getStats(data) {
  const bySchema = {}
  data.entities.forEach(e => { bySchema[e.schema] = (bySchema[e.schema] || 0) + 1 })
  return {
    totalEntities: data.entities.length,
    totalEdges: data.edges.length,
    totalSanctioned: data.sanctionedIds.size,
    bySchema,
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
