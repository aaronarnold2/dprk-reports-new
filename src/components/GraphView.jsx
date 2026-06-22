import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import { getEntityName } from '../utils/entity'
import SanctionBadge from './SanctionBadge'

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

const HIDDEN_PROPS = new Set(['proof', 'involved', 'document', 'entity', 'holder', 'employer', 'employee', 'member', 'organization', 'person', 'associate', 'subject', 'object', 'authority'])

const FIELD_LABELS = {
  name: 'Name', alias: 'Aliases', nationality: 'Nationality', country: 'Country',
  address: 'Address', phone: 'Phone', email: 'Email', birthDate: 'Date of Birth',
  gender: 'Gender', status: 'Status', description: 'Description', notes: 'Notes',
  imoNumber: 'IMO Number', mmsi: 'MMSI', flag: 'Flag', type: 'Type',
  idNumber: 'ID Numbers', website: 'Website',
  number: 'Number', date: 'Date', startDate: 'Start Date', endDate: 'End Date',
  summary: 'Summary', keywords: 'Keywords', location: 'Location',
  unscId: 'UNSC ID', program: 'Program', recordId: 'Record ID',
  fraudAlias: 'Fraudulent Aliases', fraudImoNumber: 'Fraudulent IMO',
  fraudMmsi: 'Fraudulent MMSI', fraudFlag: 'Fraudulent Flag',
  namesMentioned: 'Names Mentioned', sourceUrl: 'Source', title: 'Title',
  role: 'Role', relationship: 'Relationship',
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

const DEFAULT_HEIGHT = 600

export default function GraphView({ data, entityIds: initialEntityIds, onSelect }) {
  const canvasRef = useRef()
  const containerRef = useRef()
  const simRef = useRef(null)
  const sizeRef = useRef({ width: 900, height: DEFAULT_HEIGHT })
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [activeIds, setActiveIds] = useState(() => new Set(initialEntityIds || getDefaultIds(data)))
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const dragRef = useRef(null)
  const panRef = useRef(null)
  const rafRef = useRef(null)

  const [canvasSize, setCanvasSize] = useState({ width: 900, height: DEFAULT_HEIGHT })
  const [hiddenSchemas, setHiddenSchemas] = useState(new Set())

  const toggleSchema = useCallback((schema) => {
    setHiddenSchemas(prev => {
      const next = new Set(prev)
      if (next.has(schema)) next.delete(schema)
      else next.add(schema)
      return next
    })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect
      if (width > 0) {
        sizeRef.current = { width, height: DEFAULT_HEIGHT }
        setCanvasSize({ width, height: DEFAULT_HEIGHT })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

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
    return (neighborMap[selectedNode] || []).filter(id => !activeIds.has(id)).length
  }, [selectedNode, neighborMap, activeIds])

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return []
    return data.edges
      .filter(e => e.source === selectedNode || e.target === selectedNode)
      .map(e => {
        const otherId = e.source === selectedNode ? e.target : e.source
        const other = data.entityMap[otherId]
        if (!other) return null
        return { ...e, other, otherId, inGraph: activeIds.has(otherId) }
      })
      .filter(Boolean)
  }, [selectedNode, data, activeIds])

  // Build and run simulation when activeIds change
  useEffect(() => {
    if (simRef.current) simRef.current.stop()

    const idArray = [...activeIds]
    const nodes = idArray.map(id => data.entityMap[id]).filter(Boolean).map(e => ({
      id: e.id,
      name: getEntityName(e),
      schema: e.schema,
      color: SCHEMA_COLORS[e.schema] || '#666',
      sanctioned: data.sanctionedIds?.has(e.id) || false,
    }))

    const nodeSet = new Set(nodes.map(n => n.id))
    const links = data.edges
      .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
      .map(e => ({ source: e.source, target: e.target }))

    nodesRef.current = nodes
    linksRef.current = links

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id(d => d.id).distance(60))
      .force('charge', forceManyBody().strength(-120))
      .force('center', forceCenter(sizeRef.current.width / 2, sizeRef.current.height / 2))
      .force('collide', forceCollide(10))
      .on('tick', draw)

    simRef.current = sim
    setTransform({ x: 0, y: 0, k: 1 })

    return () => { sim.stop() }
  }, [activeIds, data])

  // Redraw when selection/hover/visibility changes without restarting sim
  useEffect(() => { draw() }, [selectedNode, hoveredNode, transform, canvasSize, hiddenSchemas])

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = sizeRef.current.width * dpr
    canvas.height = sizeRef.current.height * dpr
    canvas.style.width = sizeRef.current.width + 'px'
    canvas.style.height = sizeRef.current.height + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.fillStyle = '#1a1d27'
    ctx.fillRect(0, 0, sizeRef.current.width, sizeRef.current.height)

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    const visibleNodeIds = new Set()
    nodesRef.current.forEach(n => {
      if (n.x != null && !hiddenSchemas.has(n.schema)) visibleNodeIds.add(n.id)
    })

    linksRef.current.forEach(l => {
      if (!l.source?.x || !l.target?.x) return
      const srcId = typeof l.source === 'object' ? l.source.id : l.source
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target
      if (!visibleNodeIds.has(srcId) || !visibleNodeIds.has(tgtId)) return
      ctx.beginPath()
      ctx.moveTo(l.source.x, l.source.y)
      ctx.lineTo(l.target.x, l.target.y)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 0.5 / transform.k
      ctx.stroke()
    })

    nodesRef.current.forEach(n => {
      if (n.x == null || hiddenSchemas.has(n.schema)) return
      const isSelected = n.id === selectedNode
      const isHovered = n.id === hoveredNode
      const r = (isSelected ? 8 : 6) / transform.k

      if (n.sanctioned) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 3 / transform.k, 0, Math.PI * 2)
        ctx.strokeStyle = '#e5534b'
        ctx.lineWidth = 2 / transform.k
        ctx.stroke()
      }

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + (n.sanctioned ? 5 : 3) / transform.k, 0, Math.PI * 2)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2 / transform.k
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? '#fff' : n.color
      ctx.fill()

      if (transform.k > 0.7 || isSelected || isHovered) {
        const fontSize = Math.max(8, 10 / transform.k)
        ctx.font = `${fontSize}px sans-serif`
        ctx.fillStyle = isSelected || isHovered ? '#fff' : 'rgba(225,228,237,0.7)'
        ctx.textAlign = 'center'
        const label = n.name.length > 25 ? n.name.slice(0, 25) + '...' : n.name
        ctx.fillText(label, n.x, n.y + r + fontSize + 2 / transform.k)
      }
    })

    ctx.restore()
  }

  const screenToWorld = useCallback((sx, sy) => ({
    x: (sx - transform.x) / transform.k,
    y: (sy - transform.y) / transform.k,
  }), [transform])

  const getNodeAt = useCallback((sx, sy) => {
    const { x, y } = screenToWorld(sx, sy)
    const hitRadius = 10 / transform.k
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i]
      if (n.x == null || hiddenSchemas.has(n.schema)) continue
      const dx = n.x - x
      const dy = n.y - y
      if (dx * dx + dy * dy < hitRadius * hitRadius) return n
    }
    return null
  }, [screenToWorld, transform, hiddenSchemas])

  const getMousePos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top }
  }

  const handleMouseDown = useCallback((e) => {
    const { sx, sy } = getMousePos(e)
    const node = getNodeAt(sx, sy)
    if (node) {
      dragRef.current = { node, startX: sx, startY: sy, moved: false }
    } else {
      panRef.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y }
    }
  }, [getNodeAt, transform])

  const handleMouseMove = useCallback((e) => {
    const { sx, sy } = getMousePos(e)

    if (dragRef.current) {
      dragRef.current.moved = true
      const { x, y } = screenToWorld(sx, sy)
      dragRef.current.node.fx = x
      dragRef.current.node.fy = y
      if (simRef.current) simRef.current.alpha(0.3).restart()
      return
    }

    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      setTransform(prev => ({ ...prev, x: panRef.current.tx + dx, y: panRef.current.ty + dy }))
      return
    }

    const node = getNodeAt(sx, sy)
    setHoveredNode(node?.id || null)
    canvasRef.current.style.cursor = node ? 'pointer' : 'grab'
  }, [getNodeAt, screenToWorld])

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      if (!dragRef.current.moved) {
        setSelectedNode(prev => prev === dragRef.current.node.id ? null : dragRef.current.node.id)
      }
      dragRef.current.node.fx = null
      dragRef.current.node.fy = null
    }
    dragRef.current = null
    panRef.current = null
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const { sx, sy } = getMousePos(e)
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setTransform(prev => {
      const newK = Math.max(0.1, Math.min(5, prev.k * delta))
      const scale = newK / prev.k
      return { k: newK, x: sx - (sx - prev.x) * scale, y: sy - (sy - prev.y) * scale }
    })
  }, [])

  const selectedEntity = selectedNode && data.entityMap[selectedNode]

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {nodesRef.current.length} nodes · {linksRef.current.length} edges
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(SCHEMA_COLORS).filter(([s]) => nodesRef.current.some(n => n.schema === s)).map(([schema, color]) => {
            const hidden = hiddenSchemas.has(schema)
            return (
              <span key={schema} onClick={() => toggleSchema(schema)} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, cursor: 'pointer', opacity: hidden ? 0.35 : 1, textDecoration: hidden ? 'line-through' : 'none', userSelect: 'none', padding: '2px 6px', borderRadius: 4, background: hidden ? 'transparent' : 'var(--surface2)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {schema}
              </span>
            )
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>Click node to inspect · Scroll to zoom · Drag to pan</span>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div ref={containerRef} style={{ flex: 1, background: 'var(--surface)', borderRadius: 8, overflow: 'hidden', minWidth: 0 }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { if (dragRef.current?.node) { dragRef.current.node.fx = null; dragRef.current.node.fy = null; } dragRef.current = null; panRef.current = null; setHoveredNode(null) }}
            onWheel={handleWheel}
          />
        </div>
        {selectedEntity && (
          <div style={{ width: 340, flexShrink: 0, background: 'var(--surface)', borderRadius: 8, padding: 16, height: DEFAULT_HEIGHT, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span className={`badge badge-${selectedEntity.schema.toLowerCase()}`}>{selectedEntity.schema}</span>
              <strong style={{ fontSize: 15 }}>{getEntityName(selectedEntity)}</strong>
              {data.sanctionedIds?.has(selectedNode) && <SanctionBadge size="small" />}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={() => expandNode(selectedNode)} style={{ fontSize: 12, padding: '4px 10px' }}>
                Expand{expandableCount > 0 ? ` (+${expandableCount})` : ''}
              </button>
              <button className="secondary" onClick={() => onSelect(selectedNode)} style={{ fontSize: 12, padding: '4px 10px' }}>
                Full Details
              </button>
              <button className="secondary" onClick={() => setSelectedNode(null)} style={{ fontSize: 12, padding: '4px 10px' }}>
                Close
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Properties</h4>
              {Object.entries(selectedEntity.properties)
                .filter(([k]) => !HIDDEN_PROPS.has(k))
                .map(([key, values]) => (
                <div key={key} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{FIELD_LABELS[key] || key}</div>
                  <div style={{ fontSize: 13 }}>
                    {key === 'sourceUrl' || key === 'website' ? (
                      <a href={values[0]} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{values[0]}</a>
                    ) : key === 'country' || key === 'nationality' || key === 'flag' ? (
                      values.map(v => v.toUpperCase()).join(', ')
                    ) : key === 'description' ? (
                      <span style={{ fontSize: 12, lineHeight: 1.5 }}>{values[0].length > 300 ? values[0].slice(0, 300) + '...' : values[0]}</span>
                    ) : (
                      values.join(', ')
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                Connections ({selectedConnections.length})
              </h4>
              {selectedConnections.slice(0, 20).map((c, i) => (
                <div key={i} onClick={() => {
                  if (c.inGraph) setSelectedNode(c.otherId)
                  else onSelect(c.otherId)
                }} style={{ padding: '6px 8px', background: 'var(--surface2)', borderRadius: 4, cursor: 'pointer', marginBottom: 4, borderLeft: c.inGraph ? '3px solid var(--accent)' : '3px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge badge-${c.other.schema.toLowerCase()}`} style={{ fontSize: 9 }}>{c.other.schema}</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{getEntityName(c.other)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {c.schema}{c.role ? `: ${c.role}` : ''}{c.relationship ? ` (${c.relationship})` : ''}
                  </div>
                </div>
              ))}
              {selectedConnections.length > 20 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: 4 }}>+{selectedConnections.length - 20} more</div>
              )}
              {selectedConnections.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No connections</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
