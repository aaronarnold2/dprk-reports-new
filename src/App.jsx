import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import Dashboard from './components/Dashboard'
import SearchPanel from './components/SearchPanel'
import EntityDetail from './components/EntityDetail'
import BookmarkPanel from './components/BookmarkPanel'
import AboutPage from './components/AboutPage'
import { getBookmarks } from './utils/bookmarks'

// Heavy views (d3-force graph, Leaflet map) load on demand so they stay out of the
// initial bundle.
const GraphView = lazy(() => import('./components/GraphView'))
const MapView = lazy(() => import('./components/MapView'))
const PathFinder = lazy(() => import('./components/PathFinder'))

const VIEWS = ['dashboard', 'search', 'graph', 'map', 'paths', 'bookmarks', 'guide']

function parseHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return {}
  const params = new URLSearchParams(hash)
  return Object.fromEntries(params)
}

function buildHash(state) {
  const params = new URLSearchParams()
  if (state.view && state.view !== 'dashboard') params.set('view', state.view)
  if (state.entity) params.set('entity', state.entity)
  if (state.query) params.set('q', state.query)
  if (state.type) params.set('type', state.type)
  if (state.country) params.set('country', state.country)
  const str = params.toString()
  return str ? '#' + str : ''
}

function Loading({ label = 'Loading…' }) {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>{label}</div>
}

export default function App() {
  const [data, setData] = useState(null)   // trimmed client index (search/map/paths)
  const [stats, setStats] = useState(null)  // /api/stats (dashboard + totals)
  const [view, setViewState] = useState('dashboard')
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [graphEntities, setGraphEntities] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [searchState, setSearchState] = useState({ query: '', type: '', country: '' })

  useEffect(() => {
    // Apply the initial hash immediately so deep links work before the index
    // finishes loading (entity detail and graph are API-driven and don't need it).
    const h = parseHash()
    if (h.entity) {
      setSelectedEntity(h.entity)
      setViewState('detail')
    } else if (h.view && (VIEWS.includes(h.view) || h.view === 'detail')) {
      setViewState(h.view)
    }
    if (h.q || h.type || h.country) {
      setSearchState({ query: h.q || '', type: h.type || '', country: h.country || '' })
      if (!h.entity && !h.view) setViewState('search')
    }
    setBookmarks(getBookmarks())

    // Stats is tiny and lands fast, so the dashboard paints without waiting on the
    // index. The trimmed index streams in parallel for the search/map/path views.
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
    fetch('/app-index.json')
      .then(r => r.json())
      .then(d => {
        const entityMap = {}
        const sanctionedIds = new Set()
        d.entities.forEach(e => {
          entityMap[e.id] = e
          if (e.sanctioned) sanctionedIds.add(e.id)
        })
        setData({ entities: d.entities, entityMap, sanctionedIds })
      })
      .catch(() => {})
  }, [])

  const setView = useCallback((v) => {
    setViewState(v)
    if (v !== 'detail') {
      window.history.replaceState(null, '', buildHash({ view: v, ...searchState }))
    }
  }, [searchState])

  const openEntity = useCallback((id) => {
    setSelectedEntity(id)
    setViewState('detail')
    window.history.replaceState(null, '', buildHash({ view: 'detail', entity: id }))
  }, [])

  const openGraph = useCallback((entityIds) => {
    setGraphEntities(entityIds)
    setViewState('graph')
    window.history.replaceState(null, '', buildHash({ view: 'graph' }))
  }, [])

  const updateSearchState = useCallback((state) => {
    setSearchState(state)
    window.history.replaceState(null, '', buildHash({ view: 'search', query: state.query, type: state.type, country: state.country }))
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const h = parseHash()
      if (h.entity) {
        setSelectedEntity(h.entity)
        setViewState('detail')
      } else if (h.view) {
        setViewState(h.view)
      } else {
        setViewState('dashboard')
      }
    }
    window.addEventListener('hashchange', onPopState)
    return () => window.removeEventListener('hashchange', onPopState)
  }, [])

  if (!stats) return <Loading />

  return (
    <div style={{ minHeight: '100vh' }}>
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="https://www.rusi.org/" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img src="/rusi-logo-white.png" alt="RUSI" style={{ height: 36 }} />
        </a>
        <h1 style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>DPRK Reports</h1>
        <nav style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v} className={v !== view ? 'secondary' : ''} onClick={() => setView(v)} style={{ textTransform: 'capitalize', padding: '5px 12px', fontSize: 13 }}>
              {v === 'guide' ? 'Guide & Download' : v}
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
        <Suspense fallback={<Loading label="Loading view…" />}>
          {view === 'dashboard' && <Dashboard stats={stats} />}
          {view === 'search' && (data ? <SearchPanel data={data} onSelect={openEntity} onGraph={openGraph} searchState={searchState} onSearchStateChange={updateSearchState} /> : <Loading label="Loading dataset…" />)}
          {view === 'detail' && selectedEntity && <EntityDetail entityId={selectedEntity} onSelect={openEntity} onGraph={openGraph} bookmarks={bookmarks} setBookmarks={setBookmarks} />}
          {view === 'graph' && <GraphView entityIds={graphEntities} onSelect={openEntity} />}
          {view === 'map' && (data ? <MapView data={data} onSelect={openEntity} /> : <Loading label="Loading dataset…" />)}
          {view === 'paths' && (data ? <PathFinder data={data} onSelect={openEntity} onGraph={openGraph} /> : <Loading label="Loading dataset…" />)}
          {view === 'bookmarks' && <BookmarkPanel bookmarks={bookmarks} setBookmarks={setBookmarks} onSelect={openEntity} onGraph={openGraph} />}
          {view === 'guide' && <AboutPage stats={stats} />}
        </Suspense>
      </main>
    </div>
  )
}
