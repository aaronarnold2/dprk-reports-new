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
