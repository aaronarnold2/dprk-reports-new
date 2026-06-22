import React, { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import SearchPanel from './components/SearchPanel'
import EntityDetail from './components/EntityDetail'
import GraphView from './components/GraphView'
import MapView from './components/MapView'
import TimelineView from './components/TimelineView'
import BookmarkPanel from './components/BookmarkPanel'
import PathFinder from './components/PathFinder'
import { getBookmarks } from './utils/bookmarks'

const VIEWS = ['dashboard', 'search', 'graph', 'map', 'timeline', 'paths', 'bookmarks']

export default function App() {
  const [data, setData] = useState(null)
  const [view, setView] = useState('dashboard')
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [graphEntities, setGraphEntities] = useState(null)
  const [bookmarks, setBookmarks] = useState([])

  useEffect(() => {
    fetch('/data.json')
      .then(r => r.json())
      .then(d => {
        const entityMap = {}
        d.entities.forEach(e => { entityMap[e.id] = e })
        setData({ entities: d.entities, edges: d.edges, entityMap })
      })
    setBookmarks(getBookmarks())
  }, [])

  const openEntity = useCallback((id) => {
    setSelectedEntity(id)
    setView('detail')
  }, [])

  const openGraph = useCallback((entityIds) => {
    setGraphEntities(entityIds)
    setView('graph')
  }, [])

  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Loading dataset...</div>

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>DPRK Sanctions Investigator</h1>
        <nav style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v} className={v !== view ? 'secondary' : ''} onClick={() => setView(v)} style={{ textTransform: 'capitalize', padding: '5px 12px', fontSize: 13 }}>
              {v}
            </button>
          ))}
        </nav>
        {view === 'detail' && selectedEntity && (
          <button className="secondary" onClick={() => setView('search')} style={{ marginLeft: 'auto', fontSize: 13 }}>
            ← Back
          </button>
        )}
      </header>
      <main style={{ padding: 24 }}>
        {view === 'dashboard' && <Dashboard data={data} onSelect={openEntity} onGraph={openGraph} />}
        {view === 'search' && <SearchPanel data={data} onSelect={openEntity} onGraph={openGraph} />}
        {view === 'detail' && selectedEntity && <EntityDetail data={data} entityId={selectedEntity} onSelect={openEntity} onGraph={openGraph} bookmarks={bookmarks} setBookmarks={setBookmarks} />}
        {view === 'graph' && <GraphView data={data} entityIds={graphEntities} onSelect={openEntity} />}
        {view === 'map' && <MapView data={data} onSelect={openEntity} />}
        {view === 'timeline' && <TimelineView data={data} onSelect={openEntity} />}
        {view === 'paths' && <PathFinder data={data} onSelect={openEntity} onGraph={openGraph} />}
        {view === 'bookmarks' && <BookmarkPanel bookmarks={bookmarks} setBookmarks={setBookmarks} onSelect={openEntity} onGraph={openGraph} />}
      </main>
    </div>
  )
}
