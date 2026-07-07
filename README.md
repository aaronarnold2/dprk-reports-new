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
- **REST API** — Programmatic access to search, entity details, connections, and pathfinding. CORS-enabled and documented by an OpenAPI 3.1 spec
- **Remote MCP Server** — AI agents connect to a hosted Streamable-HTTP endpoint (`/mcp`) — no cloning required; a stdio server is also available
- **Agent Discovery** — `llms.txt`, an AI-crawler-friendly `robots.txt`, `schema.org` Dataset metadata, and per-IP rate limiting

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

All endpoints return JSON and are CORS-enabled (callable from any origin). A machine-readable **OpenAPI 3.1** spec is served at `GET /.well-known/openapi.json`. The hosted API is rate limited to **120 requests/min per IP** (HTTP 429 with `Retry-After` when exceeded; override with the `RATE_LIMIT_API` env var).

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

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server lets AI agents like Claude query the database directly as tools.

### Remote server (recommended — no installation)

The MCP server is hosted over **Streamable HTTP** at `https://dprk-reports.org/mcp`. Any MCP client connects to that URL — no cloning, no local build. It runs statelessly (POST per request) and is rate limited to **60 requests/min per IP** (override with `RATE_LIMIT_MCP`).

**Claude Code:**

```bash
claude mcp add --transport http dprk-reports https://dprk-reports.org/mcp
```

…or add to `.mcp.json`:

```json
{
  "mcpServers": {
    "dprk-reports": {
      "type": "http",
      "url": "https://dprk-reports.org/mcp"
    }
  }
}
```

**Claude Desktop:** Settings → Connectors → Add custom connector → enter `https://dprk-reports.org/mcp`.

### Local server (stdio) — alternative

To run the server yourself: clone the repo, install dependencies, and build (`npm run build`, since the stdio server reads data from `dist/`). Then configure your MCP client — for **Claude Desktop**, edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Verify it starts with `npm run mcp` (communicates via stdin/stdout using JSON-RPC).

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

## Machine-Readable Discovery

The deployed site publishes standard files so AI agents and crawlers can discover its capabilities automatically:

| Path | Description |
|---|---|
| `/llms.txt` | Concise, LLM-friendly description of the dataset and its endpoints |
| `/.well-known/openapi.json` | OpenAPI 3.1 specification for the REST API |
| `/robots.txt` | Explicitly welcomes AI/agent crawlers (GPTBot, ClaudeBot, PerplexityBot, and others) |

The app's HTML also embeds [schema.org `Dataset`](https://schema.org/Dataset) structured data (JSON-LD), and all API and MCP responses are CORS-enabled.

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
