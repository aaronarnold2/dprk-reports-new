import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { getEntityName } from '../utils/entity'

const SCHEMA_COLORS = {
  Person: '#4f8ff7',
  Company: '#d29922',
  Organization: '#e5534b',
  Vessel: '#3fb950',
  Event: '#bc8cff',
  Identification: '#8b90a0',
  Sanction: '#e5534b',
  Document: '#8b90a0',
  Documentation: '#6e7681',
}

function getDefaultIds(data) {
  const connCount = {}
  data.edges.forEach(e => {
    connCount[e.source] = (connCount[e.source] || 0) + 1
    connCount[e.target] = (connCount[e.target] || 0) + 1
  })
  const topConnected = data.entities
    .filter(e => ['Person', 'Company', 'Organization', 'Vessel'].includes(e.schema) && connCount[e.id])
    .sort((a, b) => (connCount[b.id] || 0) - (connCount[a.id] || 0))
    .slice(0, 30)
  const seedIds = new Set(topConnected.map(e => e.id))
  data.edges.forEach(e => {
    if (seedIds.has(e.source)) seedIds.add(e.target)
    if (seedIds.has(e.target)) seedIds.add(e.source)
  })
  return [...seedIds].slice(0, 150)
}

export default function GraphView({ data, entityIds: initialEntityIds, onSelect }) {
  const graphRef = useRef()
  const [hoveredNode, setHoveredNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [activeIds, setActiveIds] = useState(() => {
    return new Set(initialEntityIds || getDefaultIds(data))
  })

  useEffect(() => {
    if (initialEntityIds) {
      setActiveIds(new Set(initialEntityIds))
      setSelectedNode(null)
    }
  }, [initialEntityIds])

  const neighborMap = useMemo(() => {
    const map = {}
    data.edges.forEach(e => {
      if (!map[e.source]) map[e.source] = []
      if (!map[e.target]) map[e.target] = []
      map[e.source].push(e.target)
      map[e.target].push(e.source)
    })
    return map
  }, [data])

  const expandNode = useCallback((nodeId) => {
    const neighbors = neighborMap[nodeId] || []
    if (neighbors.length === 0) return
    setActiveIds(prev => {
      const next = new Set(prev)
      neighbors.forEach(id => next.add(id))
      return next
    })
  }, [neighborMap])

  const expandableCount = useMemo(() => {
    if (!selectedNode) return 0
    const neighbors = neighborMap[selectedNode] || []
    return neighbors.filter(id => !activeIds.has(id)).length
  }, [selectedNode, neighborMap, activeIds])

  const graphData = useMemo(() => {
    const idArray = [...activeIds]
    const nodes = idArray
      .map(id => data.entityMap[id])
      .filter(Boolean)
      .map(e => ({
        id: e.id,
        name: getEntityName(e),
        schema: e.schema,
        color: SCHEMA_COLORS[e.schema] || '#666',
      }))

    const links = data.edges
      .filter(e => activeIds.has(e.source) && activeIds.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        label: e.role || e.relationship || e.schema,
      }))

    return { nodes, links }
  }, [activeIds, data])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isSelected = node.id === selectedNode
    const size = isSelected ? 8 : 6

    if (isSelected) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2 / globalScale
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI)
    ctx.fillStyle = node.color
    ctx.fill()

    if (globalScale > 1.5 || node.id === hoveredNode || isSelected) {
      ctx.font = `${11 / globalScale}px sans-serif`
      ctx.fillStyle = '#e1e4ed'
      ctx.textAlign = 'center'
      ctx.fillText(node.name, node.x, node.y + size + 10 / globalScale)
    }
  }, [hoveredNode, selectedNode])

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node.id)
    const neighbors = neighborMap[node.id] || []
    const newNeighbors = neighbors.filter(id => !activeIds.has(id))
    if (newNeighbors.length > 0) {
      setActiveIds(prev => {
        const next = new Set(prev)
        newNeighbors.forEach(id => next.add(id))
        return next
      })
    }
  }, [neighborMap, activeIds])

  const selectedEntity = selectedNode && data.entityMap[selectedNode]

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {graphData.nodes.length} nodes · {graphData.links.length} edges
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(SCHEMA_COLORS).filter(([s]) => graphData.nodes.some(n => n.schema === s)).map(([schema, color]) => (
            <span key={schema} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
              {schema}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>Click node to select & expand</span>
      </div>
      <div style={{ position: 'relative', background: 'var(--surface)', borderRadius: 8, height: 600 }}>
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={undefined}
          height={600}
          backgroundColor="#1a1d27"
          nodeCanvasObject={nodeCanvasObject}
          nodePointerAreaPaint={(node, color, ctx) => {
            ctx.beginPath()
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI)
            ctx.fillStyle = color
            ctx.fill()
          }}
          linkColor={() => 'rgba(255,255,255,0.15)'}
          linkWidth={1}
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          onNodeHover={(node) => setHoveredNode(node?.id)}
          cooldownTicks={100}
        />
        {selectedEntity && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14, background: 'rgba(26,29,39,0.95)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, zIndex: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className={`badge badge-${selectedEntity.schema.toLowerCase()}`}>{selectedEntity.schema}</span>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getEntityName(selectedEntity)}</strong>
              </div>
              {selectedEntity.properties.description && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedEntity.properties.description[0]}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => expandNode(selectedNode)}>
                Expand{expandableCount > 0 ? ` (+${expandableCount})` : ''}
              </button>
              <button className="secondary" onClick={() => onSelect(selectedNode)}>
                Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
