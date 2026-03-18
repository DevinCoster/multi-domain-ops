import React, { useEffect, useMemo } from 'react'
import L from 'leaflet'
import {
  MapContainer, TileLayer, Marker, Popup,
  Circle, Polyline, CircleMarker, useMapEvents, useMap,
} from 'react-leaflet'
import { Unit, MapClickMode, Position } from '../types'

const DOMAIN_LETTER: Record<string, string> = { air: 'A', sea: 'S', land: 'L', cyber: 'C' }

// ── Haversine distance (km) ──────────────────────────────────────────────────
function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const [lat1, lon1] = a.map(x => x * Math.PI / 180)
  const [lat2, lon2] = b.map(x => x * Math.PI / 180)
  const dlat = lat2 - lat1, dlon = lon2 - lon1
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, h)))
}

// ── Bearing (degrees) ────────────────────────────────────────────────────────
function bearingDeg(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a.map(x => x * Math.PI / 180)
  const [lat2, lon2] = b.map(x => x * Math.PI / 180)
  const dlon = lon2 - lon1
  const x = Math.sin(dlon) * Math.cos(lat2)
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon)
  return ((Math.atan2(x, y) * 180 / Math.PI) + 360) % 360
}

// ── Midpoint ─────────────────────────────────────────────────────────────────
function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

// ── Unit marker icon ─────────────────────────────────────────────────────────
function makeIcon(unit: Unit, selected: boolean): L.DivIcon {
  const isBlue  = unit.side === 'blue'
  const color   = isBlue ? '#00bfdb' : '#ff7820'
  const bg      = isBlue ? '0,191,219' : '255,120,32'
  const opacity = unit.status === 'destroyed' ? 0.28 : 1
  const sw      = selected ? 2.5 : 1.5
  const filt    = selected
    ? `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 3px #fff)`
    : `drop-shadow(0 0 5px ${color}88)`
  const letter  = DOMAIN_LETTER[unit.domain] ?? '?'
  const label   = unit.name.length > 16 ? unit.name.slice(0, 15) + '…' : unit.name
  const fillOp  = unit.status === 'destroyed' ? 0 : 0.13

  const shape = isBlue
    ? `<rect x="4" y="4" width="26" height="26" rx="2" fill="rgba(${bg},${fillOp})" stroke="${color}" stroke-width="${sw}"/>`
    : `<rect x="8" y="8" width="18" height="18" rx="1" fill="rgba(${bg},${fillOp})" stroke="${color}" stroke-width="${sw}" transform="rotate(45 17 17)"/>`

  return L.divIcon({
    className: '',
    html: `<div style="opacity:${opacity};position:relative;text-align:center;width:34px">
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34"
           style="filter:${filt};display:block">
        ${shape}
        <text x="17" y="22" text-anchor="middle"
              font-family="Inter,system-ui,sans-serif"
              font-size="13" font-weight="700" fill="${color}">${letter}</text>
      </svg>
      <div style="position:absolute;top:36px;left:50%;transform:translateX(-50%);
                  white-space:nowrap;font-family:Inter,sans-serif;font-size:10px;
                  font-weight:600;color:${color};
                  background:rgba(10,10,10,0.92);
                  padding:1px 5px;border-radius:2px;
                  border:1px solid ${color}44;letter-spacing:0.03em;
                  pointer-events:none;line-height:1.4">
        ${label}
      </div>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -22],
  })
}

function makeWaypointIcon(idx: number, color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
      <circle cx="11" cy="11" r="8" fill="rgba(0,0,0,0.65)"
        stroke="${color}" stroke-width="1.5" stroke-dasharray="3 2"/>
      <text x="11" y="15" text-anchor="middle"
        font-family="Inter,sans-serif" font-size="11" font-weight="700" fill="${color}">${idx + 1}</text>
    </svg>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

// Engagement line label icon (midpoint bearing/distance callout)
function makeEngagementLabel(bearing: number, distKm: number): L.DivIcon {
  const distMi = (distKm * 0.621371).toFixed(0)
  const brg    = bearing.toFixed(0).padStart(3, '0')
  return L.divIcon({
    className: '',
    html: `<div style="
        background:rgba(10,10,10,0.93);
        border:1px solid #ff7820;
        border-radius:20px;
        padding:4px 11px 4px 9px;
        white-space:nowrap;
        font-family:Inter,sans-serif;
        font-size:12px;font-weight:700;
        color:#ff7820;letter-spacing:0.04em;
        transform:translateX(-50%) translateY(-50%);
        pointer-events:none;
        display:flex;align-items:center;gap:6px;
        box-shadow:0 2px 12px rgba(0,0,0,0.7)">
      <svg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 11 11' fill='none'>
        <circle cx='5.5' cy='5.5' r='4.5' stroke='#ff7820' stroke-width='1.2'/>
        <circle cx='5.5' cy='5.5' r='1.8' fill='#ff7820'/>
      </svg>
      <span style='opacity:0.65;font-size:11px'>&#8599;</span>
      ${brg}° &middot; ${distMi} mi
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

// ── Child components ──────────────────────────────────────────────────────────
function ClickHandler({ onClick, active }: { onClick: (lat: number, lon: number) => void; active: boolean }) {
  useMapEvents({ click(e) { if (active) onClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function BoundsSync({ bounds }: { bounds: { min_lat: number; max_lat: number; min_lon: number; max_lon: number } }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds([[bounds.min_lat, bounds.min_lon], [bounds.max_lat, bounds.max_lon]])
  }, [map, bounds.min_lat, bounds.max_lat, bounds.min_lon, bounds.max_lon])
  return null
}

function CursorController({ crosshair }: { crosshair: boolean }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    crosshair ? el.classList.add('cursor-crosshair') : el.classList.remove('cursor-crosshair')
  }, [map, crosshair])
  return null
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  units: Map<string, Unit>
  trails: Map<string, [number, number][]>
  showRings: boolean
  showTrails: boolean
  editMode: boolean
  selectedUnitId: string | null
  mapClickMode: MapClickMode
  bounds?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number }
  engagedPairs: Map<string, string>  // attackerId → targetId
  onMapClick: (lat: number, lon: number) => void
  onUnitSelect: (id: string) => void
  onUnitDrag: (id: string, lat: number, lon: number) => void
}

export default function MapView({
  units, trails, showRings, showTrails,
  editMode, selectedUnitId, mapClickMode, bounds, engagedPairs,
  onMapClick, onUnitSelect, onUnitDrag,
}: Props) {
  const defaultCenter: [number, number] = [15, 145]

  const markers = useMemo(() => Array.from(units.values()).map(unit => {
    const icon = makeIcon(unit, unit.id === selectedUnitId)
    return (
      <Marker
        key={unit.id}
        position={[unit.position.lat, unit.position.lon]}
        icon={icon}
        draggable={editMode}
        eventHandlers={{
          click: () => onUnitSelect(unit.id),
          dragend: (e) => {
            const { lat, lng } = (e.target as L.Marker).getLatLng()
            onUnitDrag(unit.id, lat, lng)
          },
        }}
      >
        <Popup>
          <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 13, lineHeight: 1.7, minWidth: 160 }}>
            <strong style={{ color: unit.side === 'blue' ? '#00bfdb' : '#ff7820' }}>{unit.name}</strong><br />
            <span style={{ color: '#666666' }}>{unit.domain.toUpperCase()} · {unit.side.toUpperCase()} · {unit.behavior}</span><br />
            HP: {unit.hp.toFixed(0)} / 100 · {unit.speed} km/h<br />
            Sensor: {unit.sensors.detection_radius} km · Wpn: {unit.weapons.range} km
          </div>
        </Popup>
      </Marker>
    )
  }), [units, selectedUnitId, editMode, onUnitSelect, onUnitDrag])

  // Sensor detection rings
  const rings = useMemo(() => {
    if (!showRings) return null
    return Array.from(units.values())
      .filter(u => u.status === 'active')
      .map(unit => {
        const color = unit.side === 'blue' ? '#00bfdb' : '#ff7820'
        return (
          <Circle key={`sensor-${unit.id}`}
            center={[unit.position.lat, unit.position.lon]}
            radius={unit.sensors.detection_radius * 1000}
            pathOptions={{ color, weight: 2, opacity: 0.65, fillOpacity: 0.05, dashArray: '6 8' }}
          />
        )
      })
  }, [units, showRings])

  // Weapon rings (smaller, tighter dash)
  const weaponRings = useMemo(() => {
    if (!showRings) return null
    return Array.from(units.values())
      .filter(u => u.status === 'active' && u.weapons.range > 0)
      .map(unit => {
        const color = unit.side === 'blue' ? '#22c55e' : '#ffa726'
        return (
          <Circle key={`wpn-${unit.id}`}
            center={[unit.position.lat, unit.position.lon]}
            radius={unit.weapons.range * 1000}
            pathOptions={{ color, weight: 1.5, opacity: 0.5, fillOpacity: 0.02, dashArray: '3 9' }}
          />
        )
      })
  }, [units, showRings])

  // Trails
  const trailLines = useMemo(() => {
    if (!showTrails) return null
    return Array.from(trails.entries()).map(([id, trail]) => {
      const unit = units.get(id)
      if (!trail.length || !unit) return null
      const color = unit.side === 'blue' ? '#00bfdb' : '#ff7820'
      return (
        <Polyline key={`trail-${id}`} positions={trail}
          pathOptions={{ color, weight: 2.5, opacity: 0.75 }} />
      )
    })
  }, [trails, units, showTrails])

  // Engagement lines (orange, with bearing/distance label)
  const engagementLines = useMemo(() => {
    return Array.from(engagedPairs.entries()).map(([attackerId, targetId]) => {
      const attacker = units.get(attackerId)
      const target   = units.get(targetId)
      if (!attacker || !target || attacker.status === 'destroyed' || target.status === 'destroyed') return null

      const aPos: [number, number] = [attacker.position.lat, attacker.position.lon]
      const tPos: [number, number] = [target.position.lat,   target.position.lon]
      const mid   = midpoint(aPos, tPos)
      const dist  = haversineKm(aPos, tPos)
      const brg   = bearingDeg(aPos, tPos)
      const label = makeEngagementLabel(brg, dist)

      return (
        <React.Fragment key={`eng-${attackerId}-${targetId}`}>
          <Polyline positions={[aPos, tPos]}
            pathOptions={{ color: '#ff7820', weight: 1.5, opacity: 0.75, dashArray: '6 4' }} />
          <Marker position={mid} icon={label} interactive={false} />
        </React.Fragment>
      )
    })
  }, [engagedPairs, units])

  // Waypoints (edit mode, selected patrol unit)
  const waypointLayer = useMemo(() => {
    if (!editMode || !selectedUnitId) return null
    const unit = units.get(selectedUnitId)
    if (!unit || unit.behavior !== 'patrol' || !unit.waypoints?.length) return null
    const color = unit.side === 'blue' ? '#00bfdb' : '#ff7820'
    const positions = unit.waypoints.map(wp => [wp.lat, wp.lon] as [number, number])
    return (
      <>
        <Polyline positions={positions}
          pathOptions={{ color, weight: 1.5, opacity: 0.5, dashArray: '6 4' }} />
        {unit.waypoints.map((wp, i) => (
          <Marker key={`wp-${i}`} position={[wp.lat, wp.lon]} icon={makeWaypointIcon(i, color)} />
        ))}
      </>
    )
  }, [units, selectedUnitId, editMode])

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics'
        maxZoom={19}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
        opacity={0.7}
      />

      {bounds && <BoundsSync bounds={bounds} />}
      <CursorController crosshair={mapClickMode !== 'none'} />
      <ClickHandler onClick={onMapClick} active={mapClickMode !== 'none'} />

      {rings}
      {weaponRings}
      {trailLines}
      {engagementLines}
      {markers}
      {waypointLayer}
    </MapContainer>
  )
}
