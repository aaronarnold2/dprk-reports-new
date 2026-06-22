export function getEntityName(entity) {
  if (!entity) return 'Unknown'
  const p = entity.properties
  if (p.name?.[0]) return p.name[0]
  if (p.title?.[0]) return p.title[0]
  switch (entity.schema) {
    case 'Identification':
      return [p.description?.[0], p.number?.[0]].filter(Boolean).join(': ') || 'Identification'
    case 'Documentation':
      return p.recordId?.[0] || p.summary?.[0] || 'Documentation'
    case 'Sanction':
      return p.summary?.[0] || p.program?.[0]?.slice(0, 80) || 'Sanction'
    default:
      return 'Unknown'
  }
}
