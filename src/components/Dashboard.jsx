import React, { useMemo } from 'react'

const SCHEMA_COLORS = {
  Person: 'var(--person)',
  Company: 'var(--company)',
  Organization: 'var(--organization)',
  Vessel: 'var(--vessel)',
  Event: 'var(--event)',
  Identification: 'var(--identification)',
  Sanction: 'var(--danger)',
  Document: 'var(--document)',
  Documentation: 'var(--documentation)',
}

export default function Dashboard({ data, onSelect, onGraph }) {
  const stats = useMemo(() => {
    const byCat = {}
    const byCountry = {}
    data.entities.forEach(e => {
      byCat[e.schema] = (byCat[e.schema] || 0) + 1
      const countries = e.properties.country || e.properties.nationality || []
      countries.forEach(c => { byCountry[c] = (byCountry[c] || 0) + 1 })
    })
    const topCountries = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 20)
    return { byCat, topCountries, totalEntities: data.entities.length, totalEdges: data.edges.length }
  }, [data])

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Entities" value={stats.totalEntities.toLocaleString()} />
        <StatCard label="Relationships" value={stats.totalEdges.toLocaleString()} />
        <StatCard label="Persons" value={(stats.byCat.Person || 0).toLocaleString()} color="var(--person)" />
        <StatCard label="Companies" value={(stats.byCat.Company || 0).toLocaleString()} color="var(--company)" />
        <StatCard label="Vessels" value={(stats.byCat.Vessel || 0).toLocaleString()} color="var(--vessel)" />
        <StatCard label="Events" value={(stats.byCat.Event || 0).toLocaleString()} color="var(--event)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Entity Types</h3>
          {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([schema, count]) => (
            <div key={schema} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: SCHEMA_COLORS[schema] || '#666' }} />
              <span style={{ flex: 1 }}>{schema}</span>
              <span style={{ color: 'var(--text-dim)' }}>{count.toLocaleString()}</span>
              <div style={{ width: 100, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                <div style={{ width: `${(count / stats.totalEntities) * 100}%`, height: '100%', background: SCHEMA_COLORS[schema] || '#666', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Top Countries</h3>
          {stats.topCountries.map(([code, count]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 30, fontWeight: 600, textTransform: 'uppercase' }}>{code}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                <div style={{ width: `${(count / stats.topCountries[0][1]) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
              </div>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20, borderLeft: `3px solid ${color || 'var(--accent)'}` }}>
      <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  )
}
