export function findShortestPath(edges, sourceId, targetId) {
  const adj = {}
  edges.forEach(e => {
    const s = typeof e.source === 'object' ? e.source.id : e.source
    const t = typeof e.target === 'object' ? e.target.id : e.target
    if (!adj[s]) adj[s] = []
    if (!adj[t]) adj[t] = []
    adj[s].push({ id: t, edge: e })
    adj[t].push({ id: s, edge: e })
  })

  const visited = new Set([sourceId])
  const queue = [[sourceId]]
  const edgePath = new Map()

  while (queue.length > 0) {
    const path = queue.shift()
    const current = path[path.length - 1]

    if (current === targetId) {
      const pathEdges = []
      for (let i = 0; i < path.length - 1; i++) {
        pathEdges.push(edgePath.get(`${path[i]}->${path[i + 1]}`))
      }
      return { nodes: path, edges: pathEdges }
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
