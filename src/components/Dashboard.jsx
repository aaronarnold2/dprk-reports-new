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

export default function Dashboard({ stats }) {
  const byCat = stats.bySchema || {}
  const totalEntities = stats.totalEntities || 0
  const totalEdges = stats.totalEdges || 0

  const topCountries = useMemo(
    () => Object.entries(stats.byCountry || {}).sort((a, b) => b[1] - a[1]).slice(0, 20),
    [stats],
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Entities" value={totalEntities.toLocaleString()} />
        <StatCard label="Relationships" value={totalEdges.toLocaleString()} />
        <StatCard label="Persons" value={(byCat.Person || 0).toLocaleString()} color="var(--person)" />
        <StatCard label="Companies" value={(byCat.Company || 0).toLocaleString()} color="var(--company)" />
        <StatCard label="Vessels" value={(byCat.Vessel || 0).toLocaleString()} color="var(--vessel)" />
        <StatCard label="Events" value={(byCat.Event || 0).toLocaleString()} color="var(--event)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Entity Types</h3>
          {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([schema, count]) => (
            <div key={schema} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: SCHEMA_COLORS[schema] || '#666' }} />
              <span style={{ flex: 1 }}>{schema}</span>
              <span style={{ color: 'var(--text-dim)' }}>{count.toLocaleString()}</span>
              <div style={{ width: 100, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                <div style={{ width: `${totalEntities ? (count / totalEntities) * 100 : 0}%`, height: '100%', background: SCHEMA_COLORS[schema] || '#666', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Top Countries</h3>
          {topCountries.map(([code, count]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 30, fontWeight: 600, textTransform: 'uppercase' }}>{code}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3 }}>
                <div style={{ width: `${topCountries[0] ? (count / topCountries[0][1]) * 100 : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
              </div>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 24, marginTop: 24, lineHeight: 1.7, fontSize: 14 }} className="about-content">
        <h3 style={{ marginBottom: 12 }}>About the DPRK Reports Database</h3>
        <p>The objective of this database is to provide national authorities and private-sector institutions with information that can assist with sanctions implementation efforts such as due diligence and compliance.</p>
        <p>The DPRK Reports database contains structured information relating to the activities of entities that assist North Korea to develop prohibited weapons programmes and evade sanctions. The data is sourced from the <a href="https://www.un.org/securitycouncil/sanctions/1718/panel_experts/reports" target="_blank" rel="noopener noreferrer">United Nations Panel of Experts reports</a>, from 2010 to 2023, as well as the associated <a href="https://main.un.org/securitycouncil/en/sanctions/1718/resolutions" target="_blank" rel="noopener noreferrer">UN sanctions resolutions</a>.</p>
        <p>The database includes profiles of the persons, companies, organizations, and vessels that are mentioned in the reports, and contains information such as names, aliases, locations, contact details and sanction designation status. The database also records the relationships between entities and their involvement or relationship to specific events.</p>
        <p>The database was developed by the <a href="https://www.rusi.org/" target="_blank" rel="noopener noreferrer">Royal United Services Institute (RUSI)</a> in partnership with the <a href="https://www.korearisk.com/" target="_blank" rel="noopener noreferrer">Korea Risk Group</a>.</p>
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
