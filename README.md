# DPRK Reports

A web application for investigating the DPRK sanctions evasion network, built on structured data from the United Nations Panel of Experts reports.

The database contains **26,187 entities** and **58,267 relationships** spanning persons, companies, organizations, vessels, events, sanctions designations, and source documents linked to DPRK sanctions evasion activities from 2010 to 2023.

Developed by the [Royal United Services Institute (RUSI)](https://www.rusi.org/) in partnership with the [Korea Risk Group](https://www.korearisk.com/).

## Features

- **Search** — Full-text search across all entity fields with advanced operators (`name:Kim AND nationality:kp`), type/country/date filters, and CSV/JSON export
- **Entity Detail** — View all properties, connections, and sanctions status for any entity
- **Network Graph** — Interactive force-directed graph visualization with node expansion, entity type toggles, and a detail panel
- **Map** — Geographic distribution of entities across 137 countries
- **Path Finder** — Discover the shortest connection chain between any two entities
- **Bookmarks** — Save entities of interest with notes, persisted in browser localStorage
- **Sanctions Indicators** — Designated entities are visually marked throughout the app
- **Shareable URLs** — Every view encodes its state in the URL for sharing with colleagues
- **REST API** — Programmatic access to search, entity details, connections, and pathfinding
- **MCP Server** — AI agent integration via the Model Context Protocol

## Getting Started

### Prerequisites

- Node.js 18+

### Install and Run

```bash
git clone https://github.com/aaronarnold2/dprk-reports-new.git
cd dprk-reports-new
npm install --legacy-peer-deps
npm run dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
npm run build
npm start
```

The production server runs on port 8080 (configurable via `PORT` environment variable) and includes the REST API with gzip compression.

## REST API

All endpoints return JSON.

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Database statistics |
| `GET /api/search?q=&type=&country=&sanctioned=&limit=&offset=` | Search entities |
| `GET /api/entity/:id` | Entity details |
| `GET /api/entity/:id/connections` | Entity relationships |
| `GET /api/paths?from=&to=` | Shortest path between two entities |

### Examples

```bash
# Search for sanctioned companies in China
curl "http://localhost:8080/api/search?q=&type=Company&country=cn&sanctioned=true"

# Get entity details
curl "http://localhost:8080/api/entity/ENTITY_ID"

# Find connections
curl "http://localhost:8080/api/entity/ENTITY_ID/connections"

# Find path between two entities
curl "http://localhost:8080/api/paths?from=ENTITY_A_ID&to=ENTITY_B_ID"
```

## MCP Server (AI Agent Integration)

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server is included, enabling AI agents like Claude to query the database directly as tools.

### Setup

1. Clone the repo and install dependencies (see above)
2. Build the project: `npm run build`
3. Configure your MCP client

**Claude Desktop** — edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "dprk-reports": {
      "command": "node",
      "args": ["mcp-server.js"],
      "cwd": "/path/to/dprk-reports-new"
    }
  }
}
```

**Claude Code** — create `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "dprk-reports": {
      "command": "node",
      "args": ["/path/to/dprk-reports-new/mcp-server.js"]
    }
  }
}
```

### Available Tools

| Tool | Description |
|---|---|
| `search_entities` | Search by keyword, entity type, country, or sanctions status |
| `get_entity` | Get full details of an entity by ID |
| `get_connections` | Get all relationships for an entity |
| `find_path` | Find shortest path between two entities |
| `get_stats` | Database statistics overview |

### Example Prompts

Once configured, ask your AI agent:

- "Search the DPRK Reports database for all sanctioned companies based in China"
- "Look up Korea Mining Development Trading Corporation and show me all its connections"
- "Find the connection path between Alejandro Cao de Benós and Korea Kwangson Banking Corporation"
- "How many vessels are in the database? Show me some with fraudulent IMO numbers"

### Verify

```bash
npm run mcp
```

The server communicates via stdin/stdout using JSON-RPC. If it starts without errors, it is ready.

## Deploy to Google Cloud Run

```bash
# Build and push container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/dprk-reports

# Deploy
gcloud run deploy dprk-reports \
  --image gcr.io/YOUR_PROJECT_ID/dprk-reports \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --port 8080
```

## Data Source

The data is sourced from the [United Nations Panel of Experts reports](https://www.un.org/securitycouncil/sanctions/1718/panel_experts/reports) (2010–2023) and the associated [UN sanctions resolutions](https://main.un.org/securitycouncil/en/sanctions/1718/resolutions). The dataset uses the [Follow the Money (FTM)](https://followthemoney.tech/explorer/schemata/) data schema.

## License

This project is provided for research and sanctions compliance purposes.
