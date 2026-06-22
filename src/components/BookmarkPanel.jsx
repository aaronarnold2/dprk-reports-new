import React, { useState } from 'react'
import { removeBookmark, updateBookmarkNotes } from '../utils/bookmarks'

export default function BookmarkPanel({ bookmarks, setBookmarks, onSelect, onGraph }) {
  const [editingId, setEditingId] = useState(null)
  const [noteText, setNoteText] = useState('')

  const handleRemove = (id) => {
    setBookmarks(removeBookmark(id))
  }

  const handleEditNote = (bookmark) => {
    setEditingId(bookmark.id)
    setNoteText(bookmark.notes || '')
  }

  const handleSaveNote = (id) => {
    setBookmarks(updateBookmarkNotes(id, noteText))
    setEditingId(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Saved Investigations</h3>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{bookmarks.length} bookmarked entities</span>
        {bookmarks.length > 1 && (
          <button onClick={() => onGraph(bookmarks.map(b => b.id))} style={{ marginLeft: 'auto' }}>
            Graph All Bookmarks
          </button>
        )}
      </div>

      {bookmarks.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
          No bookmarks yet. Use the bookmark button on any entity detail page to save it here.
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {bookmarks.map(b => (
          <div key={b.id} style={{ background: 'var(--surface)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span className={`badge badge-${b.schema.toLowerCase()}`}>{b.schema}</span>
              <span onClick={() => onSelect(b.id)} style={{ fontWeight: 600, cursor: 'pointer', flex: 1 }}>{b.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Added {new Date(b.addedAt).toLocaleDateString()}</span>
              <button className="secondary" onClick={() => handleEditNote(b)} style={{ padding: '2px 8px', fontSize: 12 }}>
                {b.notes ? 'Edit Note' : 'Add Note'}
              </button>
              <button className="secondary" onClick={() => handleRemove(b.id)} style={{ padding: '2px 8px', fontSize: 12, color: 'var(--danger)' }}>
                Remove
              </button>
            </div>
            {editingId === b.id ? (
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add investigation notes..."
                  style={{ flex: 1 }}
                  onKeyDown={e => e.key === 'Enter' && handleSaveNote(b.id)}
                  autoFocus
                />
                <button onClick={() => handleSaveNote(b.id)} style={{ padding: '4px 12px', fontSize: 12 }}>Save</button>
                <button className="secondary" onClick={() => setEditingId(null)} style={{ padding: '4px 12px', fontSize: 12 }}>Cancel</button>
              </div>
            ) : b.notes ? (
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic', paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>{b.notes}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
