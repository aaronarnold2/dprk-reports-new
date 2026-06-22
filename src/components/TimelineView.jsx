import React, { useMemo, useState } from 'react'
import { getEntityName } from '../utils/entity'

export default function TimelineView({ data, onSelect }) {
  const [schemaFilter, setSchemaFilter] = useState('')
  const [zoomLevel, setZoomLevel] = useState('year')

  const timedEntities = useMemo(() => {
    return data.entities
      .map(e => {
        const date = (e.properties.date || e.properties.birthDate || e.properties.startDate || e.properties.incorporationDate || [])[0]
        if (!date) return null
        const parsed = parseDate(date)
        if (!parsed) return null
        return { ...e, _date: parsed, _dateStr: date }
      })
      .filter(Boolean)
      .sort((a, b) => a._date - b._date)
  }, [data])

  const filtered = useMemo(() => {
    if (!schemaFilter) return timedEntities
    return timedEntities.filter(e => e.schema === schemaFilter)
  }, [timedEntities, schemaFilter])

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(e => {
      let key
      const d = e._date
      if (zoomLevel === 'year') key = d.getFullYear().toString()
      else if (zoomLevel === 'decade') key = `${Math.floor(d.getFullYear() / 10) * 10}s`
      else key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered, zoomLevel])

  const schemas = useMemo(() => {
    const s = new Set(timedEntities.map(e => e.schema))
    return [...s].sort()
  }, [timedEntities])

  const SCHEMA_COLORS = {
    Person: '#4f8ff7', Company: '#d29922', Organization: '#e5534b',
    Vessel: '#3fb950', Event: '#bc8cff', Sanction: '#e5534b',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Timeline</h3>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{filtered.length} dated entities</span>
        <select value={schemaFilter} onChange={e => setSchemaFilter(e.target.value)}>
          <option value="">All Types</option>
          {schemas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 4 }}>
          {['decade', 'year', 'month'].map(z => (
            <button key={z} className={z !== zoomLevel ? 'secondary' : ''} onClick={() => setZoomLevel(z)} style={{ textTransform: 'capitalize', padding: '4px 12px', fontSize: 12 }}>
              {z}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', paddingLeft: 120 }}>
        {grouped.map(([period, entities]) => (
          <div key={period} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <div style={{ position: 'absolute', left: 0, width: 100, textAlign: 'right', fontWeight: 700, fontSize: 14, color: 'var(--accent)', paddingTop: 4 }}>
              {period}
            </div>
            <div style={{ width: 2, background: 'var(--border)', flexShrink: 0, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, left: -4, width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
            </div>
            <div style={{ flex: 1, display: 'grid', gap: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>{entities.length} {entities.length === 1 ? 'entity' : 'entities'}</div>
              {entities.slice(0, 10).map(e => (
                <div key={e.id} onClick={() => onSelect(e.id)} style={{ padding: '6px 10px', background: 'var(--surface)', borderRadius: 6, cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center', borderLeft: `3px solid ${SCHEMA_COLORS[e.schema] || '#666'}` }}>
                  <span className={`badge badge-${e.schema.toLowerCase()}`} style={{ fontSize: 10 }}>{e.schema}</span>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{getEntityName(e)}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 'auto' }}>{e._dateStr}</span>
                </div>
              ))}
              {entities.length > 10 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '4px 10px' }}>+{entities.length - 10} more</div>
              )}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>No dated entities found for this filter</div>
        )}
      </div>
    </div>
  )
}

function parseDate(str) {
  if (!str) return null
  if (/^\d{4}$/.test(str)) return new Date(parseInt(str), 0, 1)
  if (/^\d{4}-\d{2}$/.test(str)) {
    const [y, m] = str.split('-')
    return new Date(parseInt(y), parseInt(m) - 1, 1)
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}
