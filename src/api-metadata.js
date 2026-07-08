// Machine-readable API metadata: the canonical base URL and an OpenAPI 3.1 spec
// describing the DPRK Reports REST API. Served at /.well-known/openapi.json.
// Override the host with the SITE_URL env var.

export function getBaseUrl() {
  return (process.env.SITE_URL || 'https://dprk-reports.org').replace(/\/+$/, '')
}

export function buildOpenApiSpec(baseUrl) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'DPRK Reports API',
      version: '1.0.0',
      description:
        'Programmatic access to the DPRK sanctions-evasion network dataset compiled from ' +
        'United Nations Panel of Experts reports (2010–2023). Search entities, retrieve ' +
        'details and connections, and find shortest paths across the network. An MCP server ' +
        'exposing the same capabilities as tools is available at ' + baseUrl + '/mcp (Streamable HTTP).',
    },
    servers: [{ url: baseUrl }],
    paths: {
      '/api/stats': {
        get: {
          operationId: 'getStats',
          summary: 'Database statistics',
          description: 'Total entities, edges, sanctioned entities, and breakdown by entity type.',
          responses: { 200: { description: 'Statistics object', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/api/search': {
        get: {
          operationId: 'searchEntities',
          summary: 'Search entities',
          parameters: [
            { name: 'q', in: 'query', description: 'Full-text query across all entity fields', schema: { type: 'string' } },
            { name: 'type', in: 'query', description: 'Filter by entity type', schema: { type: 'string', enum: ['Person', 'Company', 'Organization', 'Vessel', 'Event', 'Sanction', 'Document'] } },
            { name: 'country', in: 'query', description: 'ISO 3166-1 alpha-2 lowercase country code (e.g. kp, cn, ru)', schema: { type: 'string' } },
            { name: 'sanctioned', in: 'query', description: 'Filter by UN sanctions designation status', schema: { type: 'string', enum: ['true', 'false'] } },
            { name: 'limit', in: 'query', description: 'Max results (default 50, max 500)', schema: { type: 'integer', default: 50, maximum: 500 } },
            { name: 'offset', in: 'query', description: 'Pagination offset', schema: { type: 'integer', default: 0 } },
          ],
          responses: { 200: { description: 'Search results', content: { 'application/json': { schema: { type: 'object' } } } } },
        },
      },
      '/api/entity/{id}': {
        get: {
          operationId: 'getEntity',
          summary: 'Get entity details',
          parameters: [{ name: 'id', in: 'path', required: true, description: 'Entity ID (40-character hex string)', schema: { type: 'string' } }],
          responses: {
            200: { description: 'Entity object', content: { 'application/json': { schema: { type: 'object' } } } },
            404: { description: 'Entity not found' },
          },
        },
      },
      '/api/entity/{id}/connections': {
        get: {
          operationId: 'getConnections',
          summary: 'Get entity connections',
          parameters: [{ name: 'id', in: 'path', required: true, description: 'Entity ID', schema: { type: 'string' } }],
          responses: {
            200: { description: 'Linked entities with relationship types', content: { 'application/json': { schema: { type: 'object' } } } },
            404: { description: 'Entity not found' },
          },
        },
      },
      '/api/paths': {
        get: {
          operationId: 'findPath',
          summary: 'Find shortest path between two entities',
          parameters: [
            { name: 'from', in: 'query', required: true, description: 'Source entity ID', schema: { type: 'string' } },
            { name: 'to', in: 'query', required: true, description: 'Target entity ID', schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Path result (found flag plus the chain when found)', content: { 'application/json': { schema: { type: 'object' } } } },
            400: { description: 'Missing from/to parameter' },
            404: { description: 'Source or target entity not found' },
          },
        },
      },
    },
  }
}

// A concise, human- and LLM-readable site description in the llms.txt format
// (https://llmstxt.org/). Advertises the API, MCP endpoint, and OpenAPI spec.
export function buildLlmsTxt(baseUrl) {
  return `# DPRK Reports

> Investigative database of the DPRK (North Korea) sanctions-evasion network: 26,187 entities and 58,267 relationships covering persons, companies, organizations, vessels, events, sanctions designations, and source documents, compiled from United Nations Panel of Experts reports (2010–2023). Developed by RUSI in partnership with the Korea Risk Group.

## For AI agents

- REST API (JSON): ${baseUrl}/api — see the OpenAPI spec at ${baseUrl}/.well-known/openapi.json
- MCP server (Streamable HTTP): ${baseUrl}/mcp — connect any MCP client to query the database as tools, no cloning required

## API endpoints

- GET ${baseUrl}/api/stats — database statistics
- GET ${baseUrl}/api/search?q=&type=&country=&sanctioned=&limit=&offset= — search entities
- GET ${baseUrl}/api/entity/{id} — full entity details
- GET ${baseUrl}/api/entity/{id}/connections — an entity's relationships
- GET ${baseUrl}/api/paths?from=&to= — shortest path between two entities

## MCP tools

- search_entities — search by keyword, entity type, country, or sanctions status
- get_entity — full details of an entity by ID
- get_connections — all relationships for an entity
- find_path — shortest path between two entities
- get_stats — database statistics overview

## Data

Source: UN Panel of Experts reports (2010–2023) and associated UN sanctions resolutions. Schema: Follow the Money (FTM). Country codes are ISO 3166-1 alpha-2 lowercase.
`
}

// robots.txt that welcomes general and AI/agent crawlers, but disallows the
// 21 MB bulk dataset (/data.json) to limit egress. The rule is repeated in every
// user-agent group because crawlers obey only their most-specific matching group
// — a Disallow under "*" alone would not apply to bots that have their own group.
// This does not affect the app (the browser's fetch ignores robots.txt) or the
// in-app human download; agents should use the API or MCP for data instead.
export function buildRobotsTxt(baseUrl) {
  const aiBots = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'anthropic-ai', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'cohere-ai']
  const groups = ['*', ...aiBots]
    .map((ua) => `User-agent: ${ua}\nAllow: /\nDisallow: /data.json`)
    .join('\n\n')
  return `# DPRK Reports — AI crawlers and agents welcome, except the bulk data file
${groups}

# /data.json is the full 21 MB dataset; it is excluded from crawling to limit
# egress. Use the REST API (${baseUrl}/api) or MCP (${baseUrl}/mcp) instead.

# Machine-readable site description for LLMs
# ${baseUrl}/llms.txt
`
}
