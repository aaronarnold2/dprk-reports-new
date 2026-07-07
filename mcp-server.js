#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadData } from './src/utils/dataLoader.js'
import { createMcpServer } from './src/mcp-tools.js'

const server = createMcpServer(loadData())
const transport = new StdioServerTransport()
await server.connect(transport)
