import React, { useState, useMemo, useCallback } from 'react'
import { findShortestPath } from '../utils/pathfinder'
import { getEntityName } from '../utils/entity'

export default function PathFinder({ data, onSelect, onGraph }) {
  const [sourceQuery, setSourceQuery] = useState('')
  const [targetQuery, setTargetQuery] = useState('')
  const [sourceId, setSourceId] = useState(null)
  const [targetId, setTargetId] = useState(null)
  const [pathResult, setPathResult] = useState(null)
  const [noPath, setNoPath] = useState(false)

  const searchable = useMemo(() => {
    return data.entities
      .filter(e => !['Documentation', 'Identification'].includes(e.schema))
      .map(e => ({
        id: e.id,
        schema: e.schema,
        name: getEntityName(e),
        _search: (e.properties.name || []).join(' ').toLowerCase(),
      }))
  }, [data])

  const sourceResults = useMemo(() => {
    if (sourceId || sourceQuery.length < 2) return []
    const q = sourceQuery.toLowerCase()
    return searchable.filter(e => e._search.includes(q)).slice(0, 8)
  }, [sourceQuery, sourceId, searchable])

  const targetResults = useMemo(() => {
    if (targetId || targetQuery.length < 2) return []
    const q = targetQuery.toLowerCase()
    return searchable.filter(e => e._search.includes(q)).slice(0, 8)
  }, [targetQuery, targetId, searchable])

  const selectSource = (e) => {
    setSourceId(e.id)
    setSourceQuery(e.name)
    setPathResult(null)
    setNoPath(false)
  }

  const selectTarget = (e) => {
    setTargetId(e.id)
    setTargetQuery(e.name)
    setPathResult(null)
    setNoPath(false)
  }

  const findPath = useCallback(() => {
    if (!sourceId || !targetId) return
    const result = findShortestPath(data.edges, sourceId, targetId)
    if (result) {
      setPathResult(result)
      setNoPath(false)
    } else {
      setPathResult(null)
      setNoPath(true)
    }
  }, [sourceId, targetId, data.edges])

  const clearSource = () => { setSourceId(null); setSourceQuery(''); setPathResult(null); setNoPath(false) }
  const clearTarget = () => { setTargetId(null); setTargetQuery(''); setPathResult(null); setNoPath(false) }

  return (
    <div>
      <h3 style={{ marginBottom: 16 }}>Path Finder</h3>
      <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 16 }}>Find the shortest connection path between two entities.</p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>From</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={sourceQuery}
              onChange={e => { setSourceQuery(e.target.value); setSourceId(null) }}
              placeholder="Search entity..."
              style={{ flex: 1 }}
            />
            {sourceId && <button className="secondary" onClick={clearSource} style={{ padding: '4px 8px' }}>✕</button>}
          </div>
          {sourceResults.length > 0 && (
            <Dropdown items={sourceResults} onSelect={selectSource} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 250, position: 'relative' }}>
          <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>To</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={targetQuery}
              onChange={e => { setTargetQuery(e.target.value); setTargetId(null) }}
              placeholder="Search entity..."
              style={{ flex: 1 }}
            />
            {targetId && <button className="secondary" onClick={clearTarget} style={{ padding: '4px 8px' }}>✕</button>}
          </div>
          {targetResults.length > 0 && (
            <Dropdown items={targetResults} onSelect={selectTarget} />
          )}
        </div>

        <div style={{ paddingTop: 20 }}>
          <button onClick={findPath} disabled={!sourceId || !targetId}>Find Path</button>
        </div>
      </div>

      {noPath && (
        <div style={{ padding: 20, background: 'var(--surface)', borderRadius: 8, textAlign: 'center', color: 'var(--warning)' }}>
          No connection path found between these entities.
        </div>
      )}

      {pathResult && (
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Path found — {pathResult.nodes.length} entities, {pathResult.nodes.length - 1} hops</span>
            <button onClick={() => onGraph(pathResult.nodes)}>View in Graph</button>
          </div>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            {pathResult.nodes.map((nodeId, i) => {
              const entity = data.entityMap[nodeId]
              if (!entity) return null
              const edge = pathResult.edges[i]
              return (
                <div key={nodeId}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -24, width: 16, height: 16, borderRadius: '50%', background: i === 0 || i === pathResult.nodes.length - 1 ? 'var(--accent)' : 'var(--surface2)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                    <div onClick={() => onSelect(nodeId)} style={{ flex: 1, padding: '10px 14px', background: 'var(--surface)', borderRadius: 6, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className={`badge badge-${entity.schema.toLowerCase()}`}>{entity.schema}</span>
                      <span style={{ fontWeight: 600 }}>{getEntityName(entity)}</span>
                      {entity.properties.description && (
                        <span style={{ fontSize: 12, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{entity.properties.description[0]}</span>
                      )}
                    </div>
                  </div>
                  {edge && (
                    <div style={{ marginLeft: -16, paddingLeft: 40, paddingTop: 4, paddingBottom: 4, borderLeft: '2px solid var(--border)', marginBottom: 0 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4 }}>
                        {edge.schema || 'linked'}{edge.role ? `: ${edge.role}` : ''}{edge.relationship ? ` (${edge.relationship})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Dropdown({ items, onSelect }) {
  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
      {items.map(e => (
        <div key={e.id} onClick={() => onSelect(e)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <span className={`badge badge-${e.schema.toLowerCase()}`} style={{ fontSize: 10 }}>{e.schema}</span>
          <span style={{ fontSize: 13 }}>{e.name}</span>
        </div>
      ))}
    </div>
  )
}
