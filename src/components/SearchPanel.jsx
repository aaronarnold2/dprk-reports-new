import React, { useState, useMemo, useEffect } from 'react'
import { exportCSV, exportJSON } from '../utils/export'
import { getEntityName } from '../utils/entity'
import SanctionBadge from './SanctionBadge'

const DATE_FIELDS = ['date', 'birthDate', 'startDate', 'incorporationDate']

function extractDate(entity) {
  for (const f of DATE_FIELDS) {
    const val = entity.properties[f]?.[0]
    if (val) return val
  }
  return null
}

function parseToComparable(dateStr) {
  if (!dateStr) return null
  if (/^\d{4}$/.test(dateStr)) return dateStr + '-01-01'
  if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr + '-01'
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10)
  return null
}

export default function SearchPanel({ data, onSelect, onGraph, searchState, onSearchStateChange }) {
  const [query, setQuery] = useState(searchState?.query || '')
  const [schemaFilter, setSchemaFilter] = useState(searchState?.type || '')
  const [countryFilter, setCountryFilter] = useState(searchState?.country || '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const PAGE_SIZE = 50

  useEffect(() => {
    if (onSearchStateChange) {
      onSearchStateChange({ query, type: schemaFilter, country: countryFilter })
    }
  }, [query, schemaFilter, countryFilter])

  const searchable = useMemo(() => {
    return data.entities
      .filter(e => !['Documentation', 'Identification'].includes(e.schema))
      .map(e => ({
        ...e,
        _searchText: Object.values(e.properties).flat().join(' ').toLowerCase(),
        _fields: Object.fromEntries(
          Object.entries(e.properties).map(([k, v]) => [k.toLowerCase(), v.join(' ').toLowerCase()])
        ),
        _date: parseToComparable(extractDate(e)),
        _sanctioned: data.sanctionedIds?.has(e.id) || false,
      }))
  }, [data])

  const schemas = useMemo(() => {
    const s = new Set(searchable.map(e => e.schema))
    return [...s].sort()
  }, [searchable])

  const countries = useMemo(() => {
    const c = {}
    searchable.forEach(e => {
      ;(e.properties.country || e.properties.nationality || []).forEach(code => {
        c[code] = (c[code] || 0) + 1
      })
    })
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [searchable])

  const results = useMemo(() => {
    setPage(0)
    const q = query.trim()
    return searchable.filter(e => {
      if (schemaFilter && e.schema !== schemaFilter) return false
      if (countryFilter) {
        const cts = [...(e.properties.country || []), ...(e.properties.nationality || [])]
        if (!cts.includes(countryFilter)) return false
      }
      if (dateFrom && (!e._date || e._date < dateFrom)) return false
      if (dateTo && (!e._date || e._date > dateTo)) return false
      if (!q) return true
      return matchQuery(q, e)
    })
  }, [query, schemaFilter, countryFilter, dateFrom, dateTo, searchable])

  const paged = results.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(results.length / PAGE_SIZE)

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder={showAdvanced ? 'e.g. name:Kim AND nationality:kp OR description:KOMID' : 'Search names, aliases, descriptions...'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 300 }}
        />
        <select value={schemaFilter} onChange={e => setSchemaFilter(e.target.value)}>
          <option value="">All Types</option>
          {schemas.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}>
          <option value="">All Countries</option>
          {countries.map(([c, n]) => <option key={c} value={c}>{c.toUpperCase()} ({n})</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Date from</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>to</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: 12, padding: '4px 8px' }} />
        {(dateFrom || dateTo) && (
          <button className="secondary" onClick={() => { setDateFrom(''); setDateTo('') }} style={{ fontSize: 12, padding: '4px 8px' }}>Clear dates</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="secondary" onClick={() => setShowAdvanced(!showAdvanced)} style={{ fontSize: 12, padding: '4px 10px' }}>
          {showAdvanced ? 'Simple Search' : 'Advanced Search'}
        </button>
        {results.length > 0 && (
          <>
            <button className="secondary" onClick={() => exportCSV(results.slice(0, 1000), 'search_results.csv')} style={{ fontSize: 12, padding: '4px 10px' }}>
              Export CSV {results.length > 1000 ? '(first 1000)' : ''}
            </button>
            <button className="secondary" onClick={() => exportJSON(results.slice(0, 1000), 'search_results.json')} style={{ fontSize: 12, padding: '4px 10px' }}>
              Export JSON
            </button>
          </>
        )}
        {results.length > 1 && (
          <button onClick={() => onGraph(results.slice(0, 100).map(e => e.id))} style={{ fontSize: 12, padding: '4px 10px' }}>
            Graph top {Math.min(100, results.length)}
          </button>
        )}
      </div>

      {showAdvanced && (
        <div style={{ background: 'var(--surface)', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13, color: 'var(--text-dim)' }}>
          <strong style={{ color: 'var(--text)' }}>Search operators:</strong>
          <div style={{ marginTop: 4, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
            <span><code>field:value</code> — search specific field</span>
            <span><code>AND</code> — both conditions must match</span>
            <span><code>OR</code> — either condition matches</span>
            <span><code>NOT term</code> — exclude results with term</span>
          </div>
          <div style={{ marginTop: 6 }}>
            Fields: name, alias, description, nationality, country, email, phone, address, number, status, birthDate
          </div>
        </div>
      )}

      <div style={{ marginBottom: 12, color: 'var(--text-dim)', fontSize: 13 }}>
        {results.length.toLocaleString()} results
        {totalPages > 1 && ` · Page ${page + 1} of ${totalPages}`}
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        {paged.map(e => (
          <div key={e.id} onClick={() => onSelect(e.id)} style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 6, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', borderLeft: e._sanctioned ? '3px solid var(--danger)' : '3px solid transparent' }}>
            <span className={`badge badge-${e.schema.toLowerCase()}`}>{e.schema}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{getEntityName(e)}</span>
                {e._sanctioned && <SanctionBadge size="small" />}
              </div>
              {e.properties.alias && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>aka: {e.properties.alias.join(', ')}</div>}
              {e.properties.description && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.properties.description[0]}</div>}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
              {(e.properties.country || e.properties.nationality || []).map(c => c.toUpperCase()).join(', ')}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
          <button className="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</button>
          <button className="secondary" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  )
}

function matchQuery(query, entity) {
  const hasOperators = /\b(AND|OR|NOT)\b/.test(query) || /\w+:/.test(query)
  if (!hasOperators) {
    return entity._searchText.includes(query.toLowerCase())
  }

  const orParts = query.split(/\bOR\b/i)
  return orParts.some(orPart => {
    const andParts = orPart.split(/\bAND\b/i).map(s => s.trim()).filter(Boolean)
    return andParts.every(part => {
      const notMatch = part.match(/^NOT\s+(.+)$/i)
      if (notMatch) {
        return !matchTerm(notMatch[1].trim(), entity)
      }
      return matchTerm(part, entity)
    })
  })
}

function matchTerm(term, entity) {
  const fieldMatch = term.match(/^(\w+):(.+)$/)
  if (fieldMatch) {
    const field = fieldMatch[1].toLowerCase()
    const value = fieldMatch[2].toLowerCase().trim()
    const fieldVal = entity._fields[field]
    if (!fieldVal) return false
    return fieldVal.includes(value)
  }
  return entity._searchText.includes(term.toLowerCase())
}
