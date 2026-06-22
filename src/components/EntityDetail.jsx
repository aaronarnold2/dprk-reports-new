import React, { useMemo } from 'react'
import { addBookmark, removeBookmark, isBookmarked } from '../utils/bookmarks'
import { exportReport } from '../utils/export'
import { getEntityName } from '../utils/entity'

const LINK_FIELDS = new Set(['nkproUrl', 'sourceUrl', 'website'])
const HIDDEN_FIELDS = new Set(['proof'])

const FIELD_LABELS = {
  name: 'Name', alias: 'Aliases', nkproUrl: 'NK Pro', nationality: 'Nationality',
  country: 'Country', address: 'Address', phone: 'Phone', email: 'Email',
  birthDate: 'Date of Birth', gender: 'Gender', status: 'Status',
  description: 'Description', notes: 'Notes', idNumber: 'ID Numbers',
  website: 'Website', imoNumber: 'IMO Number', fraudImoNumber: 'Fraudulent IMO',
  mmsi: 'MMSI', fraudMmsi: 'Fraudulent MMSI', flag: 'Flag',
  fraudFlag: 'Fraudulent Flag', fraudAlias: 'Fraudulent Aliases',
  type: 'Type', unscId: 'UNSC ID', program: 'Program', summary: 'Summary',
  date: 'Date', startDate: 'Start Date', endDate: 'End Date',
  sourceUrl: 'Source', recordId: 'Record ID', authority: 'Authority',
  number: 'Number', namesMentioned: 'Names Mentioned', holder: 'Holder',
  involved: 'Involved', location: 'Location', keywords: 'Keywords',
  title: 'Title', author: 'Author', role: 'Role', relationship: 'Relationship',
  document: 'Document', entity: 'Entity',
}

export default function EntityDetail({ data, entityId, onSelect, onGraph, bookmarks, setBookmarks }) {
  const entity = data.entityMap[entityId]
  if (!entity) return <div>Entity not found</div>

  const connections = useMemo(() => {
    return data.edges
      .filter(e => e.source === entityId || e.target === entityId)
      .map(e => {
        const otherId = e.source === entityId ? e.target : e.source
        const other = data.entityMap[otherId]
        return { ...e, other, otherId }
      })
      .filter(c => c.other)
  }, [data, entityId])

  const connectedIds = [entityId, ...connections.map(c => c.otherId)]
  const props = entity.properties
  const name = getEntityName(entity)
  const bookmarked = isBookmarked(entityId)

  const handleBookmark = () => {
    if (bookmarked) {
      setBookmarks(removeBookmark(entityId))
    } else {
      setBookmarks(addBookmark(entity))
    }
  }

  const handleExport = () => {
    exportReport(entity, connections, data.entityMap)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className={`badge badge-${entity.schema.toLowerCase()}`}>{entity.schema}</span>
            <h2 style={{ fontSize: 24 }}>{name}</h2>
          </div>
          {props.alias && <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>Also known as: {props.alias.join(', ')}</div>}
          {props.fraudAlias && <div style={{ color: 'var(--danger)', marginTop: 2, fontSize: 13 }}>Fraudulent aliases: {props.fraudAlias.join(', ')}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={bookmarked ? '' : 'secondary'} onClick={handleBookmark} style={{ fontSize: 13 }}>
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button className="secondary" onClick={handleExport} style={{ fontSize: 13 }}>
            Export Report
          </button>
          {connections.length > 0 && (
            <button onClick={() => onGraph(connectedIds)} style={{ fontSize: 13 }}>View Network Graph</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Properties</h3>
          <dl style={{ display: 'grid', gap: 10 }}>
            {Object.entries(props)
              .filter(([k]) => !HIDDEN_FIELDS.has(k) && k !== 'alias' && k !== 'fraudAlias')
              .map(([key, values]) => (
              <div key={key}>
                <dt style={{ fontSize: 12, color: 'var(--text-dim)' }}>{FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1')}</dt>
                <dd style={{ marginTop: 2 }}>
                  {LINK_FIELDS.has(key) ? (
                    values.map((v, i) => (
                      <span key={i}>
                        {i > 0 && ', '}
                        <a href={v} target="_blank" rel="noopener noreferrer">{key === 'nkproUrl' ? 'View on NK Pro' : v}</a>
                      </span>
                    ))
                  ) : key === 'keywords' ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {values.map((v, i) => (
                        <span key={i} style={{ background: 'var(--surface2)', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{v}</span>
                      ))}
                    </div>
                  ) : key === 'country' || key === 'nationality' || key === 'flag' || key === 'fraudFlag' ? (
                    values.map(v => v.toUpperCase()).join(', ')
                  ) : key === 'status' ? (
                    <span style={{ color: values[0] === 'Deceased' || values[0] === 'Dissolved' ? 'var(--danger)' : 'var(--warning)' }}>{values.join(', ')}</span>
                  ) : (
                    values.join(', ')
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Connections ({connections.length})</h3>
          <div style={{ display: 'grid', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
            {connections.map((c, i) => (
              <div key={i} onClick={() => onSelect(c.otherId)} style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge badge-${c.other.schema.toLowerCase()}`} style={{ fontSize: 10 }}>{c.other.schema}</span>
                  <span style={{ fontWeight: 500 }}>{getEntityName(c.other)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                  {c.schema}{c.role ? `: ${c.role}` : ''}{c.relationship ? ` (${c.relationship})` : ''}
                </div>
              </div>
            ))}
            {connections.length === 0 && <div style={{ color: 'var(--text-dim)' }}>No direct connections found</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
