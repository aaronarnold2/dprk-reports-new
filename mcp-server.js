#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { loadData, searchEntities, getEntity, getConnections, findPath, getStats } from './src/utils/dataLoader.js'

const data = loadData()
const server = new McpServer({
  name: 'dprk-reports',
  version: '1.0.0',
})

server.tool(
  'search_entities',
  'Search the DPRK Reports database for persons, companies, organizations, vessels, and events. Returns matching entities with their properties and sanctions status.',
  {
    q: z.string().optional().describe('Search query — matches against all entity fields (names, aliases, descriptions, emails, addresses, etc.)'),
    type: z.enum(['Person', 'Company', 'Organization', 'Vessel', 'Event', 'Sanction', 'Document']).optional().describe('Filter by entity type'),
    country: z.string().optional().describe('Filter by country code (ISO 3166-1 alpha-2 lowercase, e.g. "kp", "cn", "ru")'),
    sanctioned: z.enum(['true', 'false']).optional().describe('Filter by UN sanctions designation status'),
    limit: z.number().optional().default(20).describe('Max results to return (default 20, max 100)'),
    offset: z.number().optional().default(0).describe('Offset for pagination'),
  },
  async ({ q, type, country, sanctioned, limit, offset }) => {
    const result = searchEntities(data, {
      q, type, country, sanctioned,
      limit: Math.min(limit || 20, 100),
      offset: offset || 0,
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'get_entity',
  'Get full details of a specific entity by its ID, including all properties and sanctions status.',
  {
    id: z.string().describe('Entity ID (40-character hex string)'),
  },
  async ({ id }) => {
    const entity = getEntity(data, id)
    if (!entity) return { content: [{ type: 'text', text: 'Entity not found' }], isError: true }
    return { content: [{ type: 'text', text: JSON.stringify(entity, null, 2) }] }
  }
)

server.tool(
  'get_connections',
  'Get all connections (relationships) for a specific entity. Returns linked entities with relationship types and roles.',
  {
    id: z.string().describe('Entity ID to get connections for'),
  },
  async ({ id }) => {
    if (!data.entityMap[id]) return { content: [{ type: 'text', text: 'Entity not found' }], isError: true }
    const connections = getConnections(data, id)
    return { content: [{ type: 'text', text: JSON.stringify(connections, null, 2) }] }
  }
)

server.tool(
  'find_path',
  'Find the shortest connection path between two entities in the DPRK Reports network. Uses breadth-first search across all relationship types.',
  {
    from: z.string().describe('Source entity ID'),
    to: z.string().describe('Target entity ID'),
  },
  async ({ from, to }) => {
    if (!data.entityMap[from]) return { content: [{ type: 'text', text: `Entity "${from}" not found` }], isError: true }
    if (!data.entityMap[to]) return { content: [{ type: 'text', text: `Entity "${to}" not found` }], isError: true }
    const result = findPath(data, from, to)
    if (!result) return { content: [{ type: 'text', text: 'No path found between these entities' }] }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'get_stats',
  'Get high-level statistics about the DPRK Reports database: total entities, edges, sanctioned entities, and breakdown by entity type.',
  {},
  async () => {
    const stats = getStats(data)
    return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
