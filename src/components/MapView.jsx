import React, { useMemo, useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { getEntityName } from '../utils/entity'

const COUNTRY_COORDS = {
  kp:[39.0,125.7],cn:[35.8,104.1],ru:[61.5,105.3],hk:[22.3,114.1],sg:[1.3,103.8],
  tw:[23.6,121.0],zm:[15.4,28.3],my:[4.2,101.9],jp:[36.2,138.2],us:[37.1,-95.7],
  sy:[34.8,38.9],kh:[12.5,104.9],vn:[14.0,108.2],tz:[6.3,34.8],la:[19.8,102.4],
  th:[15.8,100.9],ao:[11.2,17.8],it:[41.8,12.5],ae:[23.4,53.8],ir:[32.4,53.6],
  pk:[30.3,69.3],sd:[15.5,32.5],ly:[26.3,17.2],mm:[21.9,95.9],ng:[9.0,8.6],
  eg:[26.8,30.8],mz:[18.6,35.5],ug:[1.3,32.2],et:[9.1,40.4],in:[20.5,78.9],
  de:[51.1,10.4],gb:[55.3,-3.4],kr:[35.9,127.7],ph:[12.8,121.7],id:[0.7,113.9],
  es:[40.4,-3.7],cu:[21.5,-77.7],fr:[46.2,2.2],br:[-14.2,-51.9],mx:[23.6,-102.5],
  tr:[38.9,35.2],sa:[23.8,45.0],kz:[48.0,66.9],au:[-25.2,133.7],bd:[23.6,90.3],
  lk:[7.8,80.7],np:[28.3,84.1],mg:[18.7,46.8],gq:[1.6,10.2],cg:[-4.2,15.8],
  cd:[-4.0,21.7],rw:[-1.9,29.8],ke:[-0.0,37.9],dz:[28.0,1.6],gh:[7.9,-1.0],
  za:[-30.5,22.9],na:[-22.9,18.4],sl:[8.4,-11.7],er:[15.1,39.7],ch:[46.8,8.2],
  at:[47.5,14.5],nl:[52.1,5.2],se:[60.1,18.6],no:[60.4,8.4],fi:[61.9,25.7],
  dk:[56.2,9.5],pl:[51.9,19.1],cz:[49.8,15.4],hu:[47.1,19.5],ro:[45.9,24.9],
  bg:[42.7,25.4],hr:[45.1,15.2],rs:[44.0,21.0],ua:[48.3,31.1],by:[53.7,27.9],
  ge:[42.3,43.3],am:[40.0,45.0],az:[40.1,47.5],jo:[30.5,36.2],lb:[33.8,35.8],
  iq:[33.2,43.6],ye:[15.5,48.5],om:[21.4,55.9],qa:[25.3,51.1],bh:[26.0,50.5],
  kw:[29.3,47.4],
}

export default function MapView({ data, onSelect }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const [selectedCountry, setSelectedCountry] = useState(null)

  const countryData = useMemo(() => {
    const byCountry = {}
    data.entities.forEach(e => {
      const countries = [...(e.properties.country || []), ...(e.properties.nationality || [])]
      const unique = [...new Set(countries)]
      unique.forEach(c => {
        const code = c.toLowerCase()
        if (!byCountry[code]) byCountry[code] = { count: 0, entities: [], schemas: {} }
        byCountry[code].count++
        byCountry[code].entities.push(e)
        byCountry[code].schemas[e.schema] = (byCountry[code].schemas[e.schema] || 0) + 1
      })
    })
    return byCountry
  }, [data])

  const maxCount = useMemo(() => Math.max(...Object.values(countryData).map(d => d.count)), [countryData])

  useEffect(() => {
    if (mapInstanceRef.current || !mapRef.current) return

    import('leaflet').then(L => {
      const map = L.map(mapRef.current, {
        center: [20, 80],
        zoom: 3,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
      }).addTo(map)

      Object.entries(countryData).forEach(([code, info]) => {
        const coords = COUNTRY_COORDS[code]
        if (!coords) return

        const radius = Math.max(6, Math.min(30, (info.count / maxCount) * 30))
        const intensity = Math.min(1, info.count / (maxCount * 0.3))
        const color = `rgba(79, 143, 247, ${0.3 + intensity * 0.7})`

        const circle = L.circleMarker([coords[0], coords[1]], {
          radius,
          fillColor: color,
          fillOpacity: 0.8,
          color: '#4f8ff7',
          weight: 1,
        }).addTo(map)

        const schemaBreakdown = Object.entries(info.schemas)
          .sort((a, b) => b[1] - a[1])
          .map(([s, c]) => `${s}: ${c}`)
          .join('<br/>')

        circle.bindPopup(`
          <div style="font-family: sans-serif; min-width: 150px;">
            <strong style="font-size: 14px;">${code.toUpperCase()}</strong>
            <div style="margin: 4px 0; font-size: 18px; font-weight: bold;">${info.count} entities</div>
            <div style="font-size: 12px; color: #888;">${schemaBreakdown}</div>
          </div>
        `)

        circle.on('click', () => {
          setSelectedCountry(code)
        })
      })

      mapInstanceRef.current = map
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [countryData, maxCount])

  const selectedEntities = useMemo(() => {
    if (!selectedCountry) return []
    return (countryData[selectedCountry]?.entities || [])
      .filter(e => !['Documentation', 'Identification'].includes(e.schema))
      .slice(0, 50)
  }, [selectedCountry, countryData])

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Geographic Distribution</h3>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          {Object.keys(countryData).length} countries · Click a marker to see entities
        </span>
      </div>
      <div ref={mapRef} style={{ height: 500, borderRadius: 8, background: 'var(--surface)' }} />
      {selectedCountry && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3>{selectedCountry.toUpperCase()} — {countryData[selectedCountry]?.count} entities</h3>
            <button className="secondary" onClick={() => setSelectedCountry(null)}>Clear</button>
          </div>
          <div style={{ display: 'grid', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
            {selectedEntities.map(e => (
              <div key={e.id} onClick={() => onSelect(e.id)} style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`badge badge-${e.schema.toLowerCase()}`}>{e.schema}</span>
                <span style={{ fontWeight: 500 }}>{getEntityName(e)}</span>
              </div>
            ))}
            {selectedEntities.length === 50 && <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 8 }}>Showing first 50 — use Search to see all</div>}
          </div>
        </div>
      )}
    </div>
  )
}
