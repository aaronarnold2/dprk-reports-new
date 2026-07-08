import express from 'express'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { loadData, searchEntities, getEntity, getConnections, findPath, getStats } from './src/utils/dataLoader.js'
import { createMcpServer } from './src/mcp-tools.js'
import { getBaseUrl, buildOpenApiSpec, buildLlmsTxt, buildRobotsTxt } from './src/api-metadata.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 8080

// Cloud Run runs the app behind a front-end proxy; trust the first hop so
// express-rate-limit keys on the real client IP (X-Forwarded-For) rather than
// the proxy's. Trusting exactly one hop (not `true`) avoids clients spoofing
// X-Forwarded-For to dodge the rate limit.
app.set('trust proxy', 1)

app.use(compression())
app.use(express.json({ limit: '4mb' }))

// CORS — allow browser-based agents and tools to call the API and MCP endpoint
// from any origin. The data is public, so a permissive policy is appropriate.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID')
  res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// Rate limiting — a basic per-IP abuse/cost guard on the compute-bearing
// endpoints only (the REST API and the MCP endpoint). Static assets and the
// discovery files (llms.txt, robots.txt, openapi.json) are left unlimited so
// normal browsing and crawler discovery are never throttled. Limits are
// per-instance in-memory; on Cloud Run the effective global limit scales with
// instance count, which is fine for a coarse guard. Tune via env vars.
const WINDOW_MS = 60 * 1000
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: Number(process.env.RATE_LIMIT_API) || 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many requests. Please slow down and retry shortly.' },
})
const mcpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: Number(process.env.RATE_LIMIT_MCP) || 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  // Respond in JSON-RPC shape so MCP clients get a well-formed error.
  handler: (req, res) =>
    res.status(429).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Rate limit exceeded. Please slow down and retry shortly.' }, id: null }),
})
app.use('/mcp', mcpLimiter)
app.use('/api', apiLimiter)

// Remote MCP server over Streamable HTTP. Stateless (a fresh server + transport
// per request) so it scales cleanly across ephemeral Cloud Run instances. Any
// MCP client can connect to {baseUrl}/mcp — no cloning required.
app.post('/mcp', async (req, res) => {
  try {
    const server = createMcpServer(loadData())
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    res.on('close', () => { transport.close(); server.close() })
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('MCP request error:', err)
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null })
    }
  }
})
// Stateless mode has no long-lived stream or session to GET/DELETE.
const mcpMethodNotAllowed = (req, res) =>
  res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed. This MCP endpoint is stateless; use POST.' }, id: null })
app.get('/mcp', mcpMethodNotAllowed)
app.delete('/mcp', mcpMethodNotAllowed)

// Machine-readable discovery documents
app.get('/.well-known/openapi.json', (req, res) => {
  res.json(buildOpenApiSpec(getBaseUrl()))
})
app.get('/llms.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').send(buildLlmsTxt(getBaseUrl()))
})
app.get('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8').send(buildRobotsTxt(getBaseUrl()))
})

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

// Static files and SPA fallback. The 21 MB data.json changes only on redeploy,
// so give it a longer cache to cut repeat egress (browsers and any CDN in front
// will serve from cache; ETag still allows revalidation after expiry).
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('data.json')) {
      res.setHeader('Cache-Control', 'public, max-age=86400')
    }
  },
}))
app.get('/{*path}', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
