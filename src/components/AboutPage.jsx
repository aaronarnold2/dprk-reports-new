import React from 'react'

export default function AboutPage({ data }) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = '/data.json'
    a.download = 'dprk_reports_ftm.json'
    a.click()
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 24 }}>Guide & Download</h2>

      <Section title="About the Dataset">
        <p>
          This tool provides an interactive interface to the <strong>DPRK Reports Database</strong>, a structured dataset
          compiled from United Nations Security Council Panel of Experts reports on the Democratic People's Republic of Korea (DPRK).
        </p>
        <p>
          The dataset uses the <a href="https://followthemoney.tech/explorer/schemata/" target="_blank" rel="noopener noreferrer">Follow the Money (FTM)</a> data
          schema — a standard designed for financial crime, corruption investigations, and document forensics. It contains <strong>{data.entities.length.toLocaleString()} entities</strong> and <strong>{data.edges.length.toLocaleString()} relationships</strong> spanning
          individuals, companies, organizations, vessels, events, sanctions, and source documents linked to DPRK sanctions evasion activities.
        </p>
        <h4>Entity types</h4>
        <ul>
          <li><strong>Persons</strong> — Individuals linked to DPRK sanctions evasion, including diplomats, businesspeople, and workers.</li>
          <li><strong>Companies</strong> — Corporate entities involved in or associated with DPRK activities, including front companies and shell entities.</li>
          <li><strong>Organizations</strong> — Government bodies, military organizations, and other non-commercial entities.</li>
          <li><strong>Vessels</strong> — Ships involved in sanctions evasion, including ship-to-ship transfers and smuggling. Includes IMO numbers, MMSI, and fraudulent identifiers.</li>
          <li><strong>Events</strong> — Specific incidents such as arms shipments, diplomatic meetings, and repatriation events.</li>
          <li><strong>Sanctions</strong> — UN Security Council designations applied to entities.</li>
          <li><strong>Identifications</strong> — Passports, national IDs, and other identity documents.</li>
          <li><strong>Documents</strong> — The source UN Panel of Experts reports.</li>
        </ul>
        <h4>Relationship types</h4>
        <ul>
          <li><strong>Employment</strong> — Person-to-Company employment relationships with roles.</li>
          <li><strong>Membership</strong> — Person-to-Organization membership with roles.</li>
          <li><strong>Associate</strong> — Person-to-Person relationships.</li>
          <li><strong>UnknownLink</strong> — Miscellaneous connections between any entity types.</li>
          <li><strong>Documentation</strong> — Links entities to the reports where they are mentioned.</li>
          <li><strong>Source</strong> — Links entities to their proof documents.</li>
        </ul>
      </Section>

      <Section title="How to Use This Tool">
        <h4>Dashboard</h4>
        <p>
          The landing page provides a high-level overview of the dataset: total entity counts, a breakdown by entity type, and
          the top countries represented. Use this to get a quick sense of the data's scope and geographic distribution.
        </p>

        <h4>Search</h4>
        <p>
          Search across all entity fields — names, aliases, descriptions, emails, addresses, ID numbers, and more.
          Use the <strong>Type</strong> and <strong>Country</strong> dropdowns to filter results.
        </p>
        <p>
          Click <strong>Advanced Search</strong> for field-specific queries using operators:
        </p>
        <ul>
          <li><code>name:Kim</code> — search within a specific field</li>
          <li><code>name:Kim AND nationality:kp</code> — both conditions must match</li>
          <li><code>description:KOMID OR description:munitions</code> — either condition matches</li>
          <li><code>nationality:kp AND NOT description:repatriated</code> — exclude results containing a term</li>
        </ul>
        <p>
          Use the <strong>Date from / to</strong> pickers to filter by date (birth dates, event dates, start dates).
          From search results, you can <strong>Export CSV</strong> or <strong>Export JSON</strong> to download matching entities,
          or click <strong>Graph top 100</strong> to visualize the results as a network.
        </p>

        <h4>Entity Detail</h4>
        <p>
          Click any entity to view its full properties and connections. From here you can:
        </p>
        <ul>
          <li><strong>Bookmark</strong> — Save the entity to your Bookmarks for later reference.</li>
          <li><strong>Export Report</strong> — Download a text report of the entity and its connections.</li>
          <li><strong>View Network Graph</strong> — Visualize the entity and all its connections.</li>
        </ul>
        <p>Click any connection to navigate to that entity's detail page.</p>

        <h4>Graph</h4>
        <p>
          The network graph displays entities as color-coded nodes and their relationships as edges.
          You can zoom and pan to explore the network. Click a node to <strong>expand</strong> it — this pulls in all
          of its connected entities that aren't already visible, allowing you to progressively explore the network.
          The info panel at the bottom shows the selected entity and provides a <strong>Details</strong> button.
        </p>

        <h4>Map</h4>
        <p>
          A geographic view showing where entities are concentrated around the world. Marker size reflects the number
          of entities associated with each country. Click a marker to see a popup with the entity breakdown, then
          browse the entity list below the map.
        </p>

        <h4>Path Finder</h4>
        <p>
          Discover how two entities are connected. Enter a <strong>From</strong> and <strong>To</strong> entity using
          the search boxes, then click <strong>Find Path</strong>. The tool uses a breadth-first search to find the shortest
          chain of relationships between them. Results show each hop with the relationship type, and you can click
          <strong> View in Graph</strong> to see the path visualized.
        </p>

        <h4>Bookmarks</h4>
        <p>
          Your saved entities, persisted in your browser's local storage. Add notes to bookmarked entities to track
          your investigation progress. Use <strong>Graph All Bookmarks</strong> to visualize how your bookmarked entities
          relate to each other.
        </p>
      </Section>

      <Section title="REST API">
        <p>
          The DPRK Reports database is available via a REST API for programmatic access. All endpoints return JSON.
        </p>

        <h4>GET /api/stats</h4>
        <p>Returns high-level database statistics: total entities, edges, sanctioned count, and breakdown by entity type.</p>
        <pre><code>curl {window.location.origin}/api/stats</code></pre>

        <h4>GET /api/search</h4>
        <p>Search across all entity fields. Parameters:</p>
        <ul>
          <li><code>q</code> — Search query (matches names, aliases, descriptions, emails, addresses, etc.)</li>
          <li><code>type</code> — Filter by entity type: Person, Company, Organization, Vessel, Event, Sanction, Document</li>
          <li><code>country</code> — Filter by country code (ISO 3166-1 alpha-2, e.g. <code>kp</code>, <code>cn</code>)</li>
          <li><code>sanctioned</code> — Filter by sanctions status: <code>true</code> or <code>false</code></li>
          <li><code>limit</code> — Max results (default 50, max 500)</li>
          <li><code>offset</code> — Pagination offset</li>
        </ul>
        <pre><code>curl "{window.location.origin}/api/search?q=KOMID&type=Company&limit=10"</code></pre>

        <h4>GET /api/entity/:id</h4>
        <p>Get full details of a specific entity by ID.</p>
        <pre><code>curl {window.location.origin}/api/entity/ENTITY_ID</code></pre>

        <h4>GET /api/entity/:id/connections</h4>
        <p>Get all relationships for a specific entity — returns connected entities with relationship types and roles.</p>
        <pre><code>curl {window.location.origin}/api/entity/ENTITY_ID/connections</code></pre>

        <h4>GET /api/paths?from=ID&to=ID</h4>
        <p>Find the shortest connection path between two entities using breadth-first search.</p>
        <pre><code>curl "{window.location.origin}/api/paths?from=ENTITY_A&to=ENTITY_B"</code></pre>
      </Section>

      <Section title="MCP Server (AI Agent Integration)">
        <p>
          An <a href="https://modelcontextprotocol.io/" target="_blank" rel="noopener noreferrer">MCP (Model Context Protocol)</a> server
          is included, enabling AI agents like Claude to query the DPRK Reports database directly as tools within their workflow.
          MCP is an open standard that allows AI assistants to interact with external data sources through a structured tool interface.
        </p>

        <h4>Prerequisites</h4>
        <ul>
          <li>Node.js 18 or later installed</li>
          <li>The repository cloned locally: <code>git clone https://github.com/aaronarnold2/dprk-reports-new.git</code></li>
          <li>Dependencies installed: <code>cd dprk-reports-new && npm install --legacy-peer-deps</code></li>
          <li>Production build (the MCP server reads data from <code>dist/</code>): <code>npm run build</code></li>
        </ul>

        <h4>Setup with Claude Desktop</h4>
        <p>Edit your Claude Desktop configuration file:</p>
        <ul>
          <li>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
          <li>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
        </ul>
        <p>Add the following (replace <code>/path/to/dprk-reports-new</code> with the actual path where you cloned the repo):</p>
        <pre><code>{`{
  "mcpServers": {
    "dprk-reports": {
      "command": "node",
      "args": ["mcp-server.js"],
      "cwd": "/path/to/dprk-reports-new"
    }
  }
}`}</code></pre>
        <p>Restart Claude Desktop. You should see "dprk-reports" listed as a connected MCP server with 5 available tools.</p>

        <h4>Setup with Claude Code (CLI)</h4>
        <p>Create a <code>.mcp.json</code> file in your project directory:</p>
        <pre><code>{`{
  "mcpServers": {
    "dprk-reports": {
      "command": "node",
      "args": ["/path/to/dprk-reports-new/mcp-server.js"]
    }
  }
}`}</code></pre>
        <p>Or add it globally in <code>~/.claude/settings.json</code> under the <code>mcpServers</code> key.</p>

        <h4>Available Tools</h4>
        <ul>
          <li><strong>search_entities</strong> — Search for persons, companies, organizations, vessels, and events. Accepts: <code>q</code> (search query), <code>type</code> (Person, Company, Organization, Vessel, Event, Sanction, Document), <code>country</code> (ISO country code), <code>sanctioned</code> (true/false), <code>limit</code>, <code>offset</code>.</li>
          <li><strong>get_entity</strong> — Retrieve full details of a specific entity by its 40-character hex ID. Returns all properties and sanctions status.</li>
          <li><strong>get_connections</strong> — Get all relationships for an entity. Returns connected entities with relationship schema, role, and type.</li>
          <li><strong>find_path</strong> — Find the shortest connection path between two entities using breadth-first search. Returns the full chain of entities and relationship types.</li>
          <li><strong>get_stats</strong> — Get high-level database statistics: total entities, edges, sanctioned count, and breakdown by schema type.</li>
        </ul>

        <h4>Example Prompts</h4>
        <p>Once configured, you can ask the AI agent questions like:</p>
        <ul>
          <li>"Search the DPRK Reports database for all sanctioned companies based in China"</li>
          <li>"Look up the entity Korea Mining Development Trading Corporation and show me all its connections"</li>
          <li>"Find the connection path between Alejandro Cao de Benós and Korea Kwangson Banking Corporation"</li>
          <li>"How many vessels are in the DPRK Reports database? Show me some that have fraudulent IMO numbers"</li>
          <li>"Find all persons connected to arms-related events in Syria"</li>
        </ul>

        <h4>Verifying the Server</h4>
        <p>To test that the MCP server is working, run:</p>
        <pre><code>npm run mcp</code></pre>
        <p>The server communicates via stdin/stdout using the JSON-RPC protocol. If it starts without errors, it is ready for use.</p>
      </Section>

      <Section title="Download Dataset">
        <p>
          Download the complete processed dataset in JSON format. The file contains all {data.entities.length.toLocaleString()} entities
          and {data.edges.length.toLocaleString()} relationships in the Follow the Money schema.
        </p>
        <button onClick={handleDownload} style={{ marginTop: 8 }}>
          Download Complete Dataset (JSON)
        </button>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 24, marginBottom: 20 }}>
      <h3 style={{ marginBottom: 16 }}>{title}</h3>
      <div style={{ color: 'var(--text)', lineHeight: 1.7, fontSize: 14 }} className="about-content">
        {children}
      </div>
    </div>
  )
}
