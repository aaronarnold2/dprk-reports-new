import React from 'react'

export default function SanctionBadge({ size = 'normal' }) {
  const s = size === 'small' ? { fontSize: 9, padding: '1px 5px' } : { fontSize: 11, padding: '2px 7px' }
  return (
    <span style={{ ...s, background: 'var(--danger)', color: '#fff', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
      SANCTIONED
    </span>
  )
}
