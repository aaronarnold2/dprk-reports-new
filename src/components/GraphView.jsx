import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import { getEntityName, safeUrl } from '../utils/entity'
import { clickable } from '../utils/a11y'
import SanctionBadge from './SanctionBadge'

// Graph data is served by the API (/api/graph/seed and /api/graph/subgraph) so the
// browser never downloads the full edge list. The view holds the set of active
// node ids; whenever it changes we fetch the induced subgraph (nodes + the edges
// among them). Selecting a node fetches its full record and connections on demand.

const SCHEMA_COLORS = {
  Person: '#49c9f0',
  Company: '#e3b341',
  Organization: '#ff5f56',
  Vessel: '#2ee86a',
  Event: '#c678dd',
  Identification: '#7d9a82',
  Sanction: '#ff5f56',
  Document: '#7d9a82',
  Documentation: '#5f7a64',
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

const DEFAULT_HEIGHT = 600

// Node radius scales with degree (connection count) so hubs read as hubs at a
// glance. sqrt keeps very high-degree nodes from ballooning; clamped both ends.
function nodeRadius(n) {
  return 4 + Math.min(9, Math.sqrt(n.degree || 0) * 1.5)
}

export default function GraphView({ entityIds: initialEntityIds, onSelect }) {
  const canvasRef = useRef()
  const containerRef = useRef()
  const simRef = useRef(null)
  const sizeRef = useRef({ width: 900, height: DEFAULT_HEIGHT })
  const [graph, setGraph] = useState({ nodes: [], edges: [] })
  const [activeIds, setActiveIds] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [selectedConns, setSelectedConns] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const dragRef = useRef(null)
  const panRef = useRef(null)

  const [canvasSize, setCanvasSize] = useState({ width: 900, height: DEFAULT_HEIGHT })
  const [hiddenSchemas, setHiddenSchemas] = useState(new Set())

  const applyGraph = useCallback((g) => {
    setGraph({ nodes: g.nodes || [], edges: g.edges || [] })
    setActiveIds(new Set((g.nodes || []).map(n => n.id)))
  }, [])

  const loadSubgraph = useCallback((ids) => {
    setLoading(true)
    return fetch('/api/graph/subgraph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...ids] }),
    })
      .then(r => r.json())
      .then(applyGraph)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [applyGraph])

  // Initial load: an explicit id set (from search/detail/path/bookmarks) or the
  // server's default seed subgraph.
  useEffect(() => {
    let cancelled = false
    setSelectedNode(null)
    setLoading(true)
    const req = (initialEntityIds && initialEntityIds.length)
      ? fetch('/api/graph/subgraph', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: initialEntityIds }) })
      : fetch('/api/graph/seed')
    req.then(r => r.json())
      .then(g => { if (!cancelled) applyGraph(g) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [initialEntityIds, applyGraph])

  // Selected node: fetch its full record + connections for the side panel.
  useEffect(() => {
    if (!selectedNode) { setSelectedEntity(null); setSelectedConns(null); return }
    let cancelled = false
    setSelectedEntity(null)
    setSelectedConns(null)
    Promise.all([
      fetch(`/api/entity/${encodeURIComponent(selectedNode)}`).then(r => r.ok ? r.json() : null),
      fetch(`/api/entity/${encodeURIComponent(selectedNode)}/connections`).then(r => r.ok ? r.json() : []),
    ]).then(([e, c]) => {
      if (cancelled) return
      setSelectedEntity(e)
      setSelectedConns(Array.isArray(c) ? c : [])
    }).catch(() => { if (!cancelled) setSelectedConns([]) })
    return () => { cancelled = true }
  }, [selectedNode])

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

  const expandableCount = useMemo(() => {
    if (!selectedConns) return 0
    return selectedConns.filter(c => !activeIds.has(c.entity.id)).length
  }, [selectedConns, activeIds])

  const expandNode = useCallback(() => {
    if (!selectedConns || !selectedConns.length) return
    const next = new Set(activeIds)
    selectedConns.forEach(c => next.add(c.entity.id))
    loadSubgraph(next)
  }, [selectedConns, activeIds, loadSubgraph])

  // Build and run the simulation whenever the fetched graph changes.
  useEffect(() => {
    if (simRef.current) simRef.current.stop()

    const nodes = graph.nodes.map(n => ({
      id: n.id,
      name: n.name,
      schema: n.schema,
      color: SCHEMA_COLORS[n.schema] || '#5f7a64',
      sanctioned: n.sanctioned,
    }))
    const nodeSet = new Set(nodes.map(n => n.id))
    const links = graph.edges
      .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
      .map(e => ({ source: e.source, target: e.target }))

    // Degree per node, computed before forceLink mutates link.source/target from
    // ids into node references.
    const degree = {}
    links.forEach(l => {
      degree[l.source] = (degree[l.source] || 0) + 1
      degree[l.target] = (degree[l.target] || 0) + 1
    })
    nodes.forEach(n => { n.degree = degree[n.id] || 0 })

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
  }, [graph])

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

    ctx.fillStyle = '#0a0f0b'
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
      ctx.strokeStyle = 'rgba(46,232,106,0.14)'
      ctx.lineWidth = 0.5 / transform.k
      ctx.stroke()
    })

    nodesRef.current.forEach(n => {
      if (n.x == null || hiddenSchemas.has(n.schema)) return
      const isSelected = n.id === selectedNode
      const isHovered = n.id === hoveredNode
      const r = (nodeRadius(n) + (isSelected ? 2 : 0)) / transform.k

      if (n.sanctioned) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + 3 / transform.k, 0, Math.PI * 2)
        ctx.strokeStyle = '#ff5f56'
        ctx.lineWidth = 2 / transform.k
        ctx.stroke()
      }

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, r + (n.sanctioned ? 5 : 3) / transform.k, 0, Math.PI * 2)
        ctx.strokeStyle = '#2ee86a'
        ctx.lineWidth = 2 / transform.k
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? '#eafff0' : n.color
      ctx.fill()

      if (transform.k > 0.7 || isSelected || isHovered) {
        const fontSize = Math.max(8, 10 / transform.k)
        ctx.font = `${fontSize}px ui-monospace, Menlo, Consolas, monospace`
        ctx.fillStyle = isSelected || isHovered ? '#eafff0' : 'rgba(185,235,196,0.7)'
        ctx.textAlign = 'center'
        const label = n.name && n.name.length > 25 ? n.name.slice(0, 25) + '...' : (n.name || '')
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
    for (let i = nodesRef.current.length - 1; i >= 0; i--) {
      const n = nodesRef.current[i]
      if (n.x == null || hiddenSchemas.has(n.schema)) continue
      const hitRadius = nodeRadius(n) + 4
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

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = 'dprk-network-graph.png'
      a.click()
    } catch { /* toDataURL can throw if the canvas is tainted; nothing is drawn from cross-origin here, so this is defensive only */ }
  }, [])

  const selectedNodeObj = graph.nodes.find(n => n.id === selectedNode)

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {loading ? 'Loading graph…' : `${nodesRef.current.length} nodes · ${linksRef.current.length} edges`}
        </span>
        <button className="secondary" onClick={exportPNG} disabled={loading || !nodesRef.current.length} style={{ fontSize: 12, padding: '4px 10px' }}>
          Export PNG
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(SCHEMA_COLORS).filter(([s]) => nodesRef.current.some(n => n.schema === s)).map(([schema, color]) => {
            const hidden = hiddenSchemas.has(schema)
            return (
              <span key={schema} {...clickable(() => toggleSchema(schema), `${hidden ? 'Show' : 'Hide'} ${schema} nodes`)} aria-pressed={!hidden} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12, cursor: 'pointer', opacity: hidden ? 0.35 : 1, textDecoration: hidden ? 'line-through' : 'none', userSelect: 'none', padding: '2px 6px', borderRadius: 4, background: hidden ? 'transparent' : 'var(--surface2)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {schema}
              </span>
            )
          })}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-dim)', marginLeft: 'auto' }}>Node size = connections · Click to inspect · Scroll to zoom · Drag to pan</span>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <div ref={containerRef} style={{ flex: 1, background: 'var(--surface)', borderRadius: 8, overflow: 'hidden', minWidth: 280 }}>
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
        {selectedNodeObj && (
          <div style={{ width: 340, flexShrink: 0, background: 'var(--surface)', borderRadius: 8, padding: 16, height: DEFAULT_HEIGHT, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span className={`badge badge-${selectedNodeObj.schema.toLowerCase()}`}>{selectedNodeObj.schema}</span>
              <strong style={{ fontSize: 15 }}>{selectedNodeObj.name}</strong>
              {selectedNodeObj.sanctioned && <SanctionBadge size="small" />}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <button onClick={expandNode} disabled={!selectedConns} style={{ fontSize: 12, padding: '4px 10px' }}>
                Expand{expandableCount > 0 ? ` (+${expandableCount})` : ''}
              </button>
              <button className="secondary" onClick={() => onSelect(selectedNode)} style={{ fontSize: 12, padding: '4px 10px' }}>
                Full Details
              </button>
              <button className="secondary" onClick={() => setSelectedNode(null)} style={{ fontSize: 12, padding: '4px 10px' }}>
                Close
              </button>
            </div>

            {selectedEntity && (
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Properties</h4>
                {Object.entries(selectedEntity.properties)
                  .filter(([k]) => !HIDDEN_PROPS.has(k))
                  .map(([key, values]) => (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{FIELD_LABELS[key] || key}</div>
                    <div style={{ fontSize: 13 }}>
                      {(key === 'sourceUrl' || key === 'website') && safeUrl(values[0]) ? (
                        <a href={safeUrl(values[0])} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{values[0]}</a>
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
            )}

            <div>
              <h4 style={{ fontSize: 12, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                Connections ({selectedConns ? selectedConns.length : '…'})
              </h4>
              {(selectedConns || []).slice(0, 20).map((c, i) => (
                <div key={i} {...clickable(() => {
                  if (activeIds.has(c.entity.id)) setSelectedNode(c.entity.id)
                  else onSelect(c.entity.id)
                }, `View ${getEntityName(c.entity)}`)} style={{ padding: '6px 8px', background: 'var(--surface2)', borderRadius: 4, cursor: 'pointer', marginBottom: 4, borderLeft: activeIds.has(c.entity.id) ? '3px solid var(--accent)' : '3px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge badge-${c.entity.schema.toLowerCase()}`} style={{ fontSize: 9 }}>{c.entity.schema}</span>
                    <span style={{ fontWeight: 500, fontSize: 12 }}>{getEntityName(c.entity)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {c.schema}{c.role ? `: ${c.role}` : ''}{c.relationship ? ` (${c.relationship})` : ''}
                  </div>
                </div>
              ))}
              {selectedConns && selectedConns.length > 20 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: 4 }}>+{selectedConns.length - 20} more</div>
              )}
              {selectedConns && selectedConns.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>No connections</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
