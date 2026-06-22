export function exportCSV(entities, filename = 'export.csv') {
  const allKeys = new Set()
  entities.forEach(e => {
    Object.keys(e.properties).forEach(k => allKeys.add(k))
  })
  const keys = ['schema', ...Array.from(allKeys).sort()]

  const rows = [keys.join(',')]
  entities.forEach(e => {
    const row = keys.map(k => {
      if (k === 'schema') return quote(e.schema)
      const vals = e.properties[k]
      if (!vals) return ''
      return quote(vals.join('; '))
    })
    rows.push(row.join(','))
  })

  download(rows.join('\n'), filename, 'text/csv')
}

export function exportJSON(entities, filename = 'export.json') {
  download(JSON.stringify(entities, null, 2), filename, 'application/json')
}

export function exportReport(entity, connections, entityMap) {
  const name = _getName(entity)
  const lines = [
    `INVESTIGATION REPORT`,
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    `${'='.repeat(60)}`,
    '',
    `Entity: ${name}`,
    `Type: ${entity.schema}`,
    `ID: ${entity.id}`,
    '',
    '--- PROPERTIES ---',
    '',
  ]

  Object.entries(entity.properties).forEach(([key, values]) => {
    if (key !== 'proof') {
      lines.push(`${key}: ${values.join(', ')}`)
    }
  })

  lines.push('', `--- CONNECTIONS (${connections.length}) ---`, '')

  connections.forEach(c => {
    const other = entityMap[c.otherId]
    if (other) {
      const otherName = _getName(other)
      lines.push(`[${other.schema}] ${otherName}`)
      lines.push(`  Relationship: ${c.schema}${c.role ? ' - ' + c.role : ''}`)
      lines.push('')
    }
  })

  download(lines.join('\n'), `report_${name.replace(/\s+/g, '_')}.txt`, 'text/plain')
}

function _getName(entity) {
  if (!entity) return 'Unknown'
  const p = entity.properties
  if (p.name?.[0]) return p.name[0]
  if (p.title?.[0]) return p.title[0]
  if (entity.schema === 'Identification') return [p.description?.[0], p.number?.[0]].filter(Boolean).join(': ') || 'Identification'
  if (entity.schema === 'Documentation') return p.recordId?.[0] || p.summary?.[0] || 'Documentation'
  if (entity.schema === 'Sanction') return p.summary?.[0] || 'Sanction'
  return 'Unknown'
}

function quote(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
