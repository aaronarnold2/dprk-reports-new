import express from 'express'
import compression from 'compression'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { loadData, searchEntities, getEntity, getConnections, findPath, getStats } from './src/utils/dataLoader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8080

app.use(compression())

// API routes
app.get('/api/stats', (req, res) => {
  res.json(getStats(loadData()))
})

app.get('/api/search', (req, res) => {
  const { q, type, country, sanctioned, limit, offset } = req.query
  res.json(searchEntities(loadData(), {
    q, type, country, sanctioned,
    limit: Math.min(parseInt(limit) || 50, 500),
    offset: parseInt(offset) || 0,
  }))
})

app.get('/api/entity/:id', (req, res) => {
  const entity = getEntity(loadData(), req.params.id)
  if (!entity) return res.status(404).json({ error: 'Entity not found' })
  res.json(entity)
})

app.get('/api/entity/:id/connections', (req, res) => {
  const data = loadData()
  if (!data.entityMap[req.params.id]) return res.status(404).json({ error: 'Entity not found' })
  res.json(getConnections(data, req.params.id))
})

app.get('/api/paths', (req, res) => {
  const { from, to } = req.query
  if (!from || !to) return res.status(400).json({ error: 'Both "from" and "to" entity IDs are required' })
  const data = loadData()
  if (!data.entityMap[from]) return res.status(404).json({ error: `Entity "${from}" not found` })
  if (!data.entityMap[to]) return res.status(404).json({ error: `Entity "${to}" not found` })
  const result = findPath(data, from, to)
  if (!result) return res.json({ found: false, message: 'No path found between these entities' })
  res.json({ found: true, ...result })
})

// Static files and SPA fallback
app.use(express.static(join(__dirname, 'dist'), { maxAge: '1h' }))
app.get('/{*path}', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
