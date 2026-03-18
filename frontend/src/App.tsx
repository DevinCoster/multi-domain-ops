import { useCallback, useEffect, useRef, useState } from 'react'
import MapView from './components/MapView'
import UnitPalette from './components/UnitPalette'
import UnitEditor from './components/UnitEditor'
import UnitList from './components/UnitList'
import SimControls from './components/SimControls'
import Timeline from './components/Timeline'
import EventLog from './components/EventLog'
import {
  AppMode, MapClickMode, ScenarioMeta, ScenarioDef,
  SimEvent, SimStatus, Unit, UnitTemplate,
} from './types'

let _uidCounter = 0
function genId() { return `u_${Date.now()}_${++_uidCounter}` }

const PRESET_KEY = 'synapse_custom_presets'
function loadStoredPresets(): ScenarioDef[] {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY) ?? '[]') } catch { return [] }
}
function saveStoredPresets(p: ScenarioDef[]) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(p))
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60); const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function buildUtcStr(d: Date) {
  const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const day = DAYS[d.getUTCDay()]
  const date = String(d.getUTCDate()).padStart(2, '0')
  const mon  = MONTHS[d.getUTCMonth()]
  const yr   = String(d.getUTCFullYear()).slice(-2)
  const h    = String(d.getUTCHours()).padStart(2, '0')
  const m    = String(d.getUTCMinutes()).padStart(2, '0')
  const s    = String(d.getUTCSeconds()).padStart(2, '0')
  return `${day} ${date} ${mon} ${yr}, ${h}:${m}:${s}Z`
}

export default function App() {
  // ── Clock ─────────────────────────────────────────────────────────────────
  const [utcClock, setUtcClock] = useState(() => buildUtcStr(new Date()))
  useEffect(() => {
    const id = setInterval(() => setUtcClock(buildUtcStr(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Scenario ──────────────────────────────────────────────────────────────
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([])
  const [scenarioBounds, setScenarioBounds] = useState<ScenarioDef['map_bounds'] | undefined>()
  const [customPresets, setCustomPresets] = useState<ScenarioDef[]>(loadStoredPresets)

  // ── Edit mode ─────────────────────────────────────────────────────────────
  const [placedUnits, setPlacedUnits] = useState<Map<string, Unit>>(new Map())
  const [activeSide, setActiveSide] = useState<'blue' | 'red'>('blue')
  const [activeTemplate, setActiveTemplate] = useState<UnitTemplate | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [mapClickMode, setMapClickMode] = useState<MapClickMode>('none')

  // ── Sim mode ──────────────────────────────────────────────────────────────
  const [appMode, setAppMode] = useState<AppMode>('edit')
  const [simStatus, setSimStatus] = useState<SimStatus>('idle')
  const [simTimeStep, setSimTimeStep] = useState(10)
  const [currentStep, setCurrentStep] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [simUnits, setSimUnits] = useState<Map<string, Unit>>(new Map())
  const [trails, setTrails] = useState<Map<string, [number, number][]>>(new Map())
  const [events, setEvents] = useState<SimEvent[]>([])
  const [showRings, setShowRings] = useState(true)
  const [showTrails, setShowTrails] = useState(true)
  const [engagedPairs, setEngagedPairs] = useState<Map<string, string>>(new Map())
  const wsRef = useRef<WebSocket | null>(null)

  // ── Load scenarios ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/scenarios/').then(r => r.json()).then(setScenarios).catch(console.error)
  }, [])

  // ── ESC to cancel ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMapClickMode('none'); setActiveTemplate(null) }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [])

  function handleSelectTemplate(t: UnitTemplate | null) {
    setActiveTemplate(t)
    setMapClickMode(t ? 'place' : 'none')
  }

  const editStateRef = useRef({ mapClickMode, selectedUnitId, activeTemplate, activeSide })
  editStateRef.current = { mapClickMode, selectedUnitId, activeTemplate, activeSide }

  const handleMapClick = useCallback((lat: number, lon: number) => {
    const { mapClickMode, selectedUnitId, activeTemplate, activeSide } = editStateRef.current

    if (mapClickMode === 'waypoint' && selectedUnitId) {
      setPlacedUnits(prev => {
        const next = new Map(prev)
        const u = next.get(selectedUnitId)
        if (!u) return prev
        return next.set(selectedUnitId, { ...u, waypoints: [...(u.waypoints ?? []), { lat, lon }] })
      })
      return
    }

    if (mapClickMode === 'place' && activeTemplate) {
      const id = genId()
      const unit: Unit = {
        id,
        name: `${activeSide === 'blue' ? 'Blue' : 'Red'} ${activeTemplate.label}`,
        domain: activeTemplate.domain,
        side: activeSide,
        position: { lat, lon },
        speed: activeTemplate.defaultSpeed,
        heading: 0,
        hp: 100,
        status: 'active',
        behavior: activeTemplate.defaultBehavior,
        sensors: { ...activeTemplate.defaultSensors },
        weapons: { ...activeTemplate.defaultWeapons },
        waypoints: [],
      }
      setPlacedUnits(prev => new Map(prev).set(id, unit))
      setSelectedUnitId(id)
      return
    }

    setSelectedUnitId(null)
    setMapClickMode('none')
    setActiveTemplate(null)
  }, [])

  function handleUnitSelect(id: string) {
    setSelectedUnitId(id); setMapClickMode('none'); setActiveTemplate(null)
  }

  function handleUnitDrag(id: string, lat: number, lon: number) {
    setPlacedUnits(prev => {
      const next = new Map(prev)
      const u = next.get(id)
      if (u) next.set(id, { ...u, position: { lat, lon } })
      return next
    })
  }

  function handleUnitUpdate(id: string, patch: Partial<Unit> & { sensors?: Partial<Unit['sensors']>; weapons?: Partial<Unit['weapons']> }) {
    setPlacedUnits(prev => {
      const next = new Map(prev)
      const u = next.get(id)
      if (!u) return prev
      return next.set(id, {
        ...u, ...patch,
        sensors: patch.sensors ? { ...u.sensors, ...patch.sensors } : u.sensors,
        weapons: patch.weapons ? { ...u.weapons, ...patch.weapons } : u.weapons,
      })
    })
  }

  function handleUnitDelete(id: string) {
    setPlacedUnits(prev => { const next = new Map(prev); next.delete(id); return next })
    if (selectedUnitId === id) setSelectedUnitId(null)
  }

  function handleRemoveWaypoint(id: string, idx: number) {
    setPlacedUnits(prev => {
      const next = new Map(prev)
      const u = next.get(id)
      if (!u || !u.waypoints) return prev
      return next.set(id, { ...u, waypoints: u.waypoints.filter((_, i) => i !== idx) })
    })
  }

  function handleStartWaypointMode() { setMapClickMode('waypoint'); setActiveTemplate(null) }

  function handleClearMap() {
    setPlacedUnits(new Map())
    setScenarioBounds(undefined)
    setSelectedUnitId(null)
    setMapClickMode('none')
    setActiveTemplate(null)
  }

  async function handleLoadPreset(scenarioId: string) {
    try {
      let def: ScenarioDef
      if (scenarioId.startsWith('custom_')) {
        const found = customPresets.find(p => p.id === scenarioId)
        if (!found) return
        def = found
      } else {
        def = await fetch(`/api/scenarios/${scenarioId}`).then(r => r.json())
      }
      setPlacedUnits(new Map(def.units.map(u => [u.id, { ...u, waypoints: u.waypoints ?? [] }])))
      setScenarioBounds(def.map_bounds)
      setSimTimeStep(def.time_step)
      setSelectedUnitId(null); setMapClickMode('none'); setActiveTemplate(null)
    } catch (e) { console.error('Failed to load preset', e) }
  }

  function handleSavePreset(name: string) {
    const allUnits = Array.from(placedUnits.values())
    if (!allUnits.length) return
    const lats = allUnits.map(u => u.position.lat)
    const lons = allUnits.map(u => u.position.lon)
    const pad = 1.5
    const bounds = scenarioBounds ?? {
      min_lat: Math.min(...lats) - pad, max_lat: Math.max(...lats) + pad,
      min_lon: Math.min(...lons) - pad, max_lon: Math.max(...lons) + pad,
    }
    const preset: ScenarioDef = {
      id: `custom_${Date.now()}`,
      name: name.trim() || 'My Preset',
      description: 'User-saved preset',
      map_bounds: bounds,
      time_step: simTimeStep,
      duration: 1800,
      units: allUnits,
    }
    const updated = [...customPresets, preset]
    setCustomPresets(updated)
    saveStoredPresets(updated)
  }

  function handleDeleteCustomPreset(id: string) {
    const updated = customPresets.filter(p => p.id !== id)
    setCustomPresets(updated)
    saveStoredPresets(updated)
  }

  const handleWsMessage = useCallback((e: MessageEvent) => {
    const msg = JSON.parse(e.data as string)

    if (msg.type === 'status') { setSimStatus(msg.data.status as SimStatus); return }
    if (msg.type === 'snapshot') {
      setSimUnits(new Map((msg.data.units as Unit[]).map(u => [u.id, u])))
      setCurrentStep(msg.data.timestep as number)
      return
    }
    if (msg.type === 'tick') { setCurrentStep(msg.data.timestep as number); return }
    if (msg.type !== 'event') return

    const ev = msg.data as SimEvent
    setEvents(prev => [...prev, ev])

    if (ev.type === 'unit_moved') {
      const { lat, lon } = ev.data as { lat: number; lon: number }
      setSimUnits(prev => {
        const next = new Map(prev)
        const u = next.get(ev.unit_id)
        if (u) next.set(ev.unit_id, { ...u, position: { lat, lon } })
        return next
      })
      setTrails(prev => {
        const next = new Map(prev)
        const trail = next.get(ev.unit_id) ?? []
        next.set(ev.unit_id, [...trail.slice(-50), [lat, lon]])
        return next
      })
      setCurrentStep(ev.timestep)
    }

    if (ev.type === 'engaged' && ev.target_id) {
      const hp = (ev.data as { target_hp: number }).target_hp
      setSimUnits(prev => {
        const next = new Map(prev)
        const t = next.get(ev.target_id!)
        if (t) next.set(ev.target_id!, { ...t, hp })
        return next
      })
      setEngagedPairs(prev => new Map(prev).set(ev.unit_id, ev.target_id!))
    }

    if (ev.type === 'destroyed') {
      setSimUnits(prev => {
        const next = new Map(prev)
        const u = next.get(ev.unit_id)
        if (u) next.set(ev.unit_id, { ...u, status: 'destroyed', hp: 0 })
        return next
      })
      setEngagedPairs(prev => {
        const next = new Map(prev)
        next.delete(ev.unit_id)
        for (const [k, v] of next) if (v === ev.unit_id) next.delete(k)
        return next
      })
    }
  }, [])

  async function handleLaunch() {
    if (placedUnits.size === 0) return

    const allUnits = Array.from(placedUnits.values())
    const blueCount = allUnits.filter(u => u.side === 'blue').length
    const redCount  = allUnits.filter(u => u.side === 'red').length
    if (blueCount === 0 || redCount === 0) {
      alert(`Place units on BOTH sides before launching.\nCurrently: ${blueCount} blue, ${redCount} red.`)
      return
    }

    const units = allUnits.map(u =>
      u.behavior === 'patrol' && (!u.waypoints || u.waypoints.length === 0)
        ? { ...u, behavior: 'intercept' as const }
        : u
    )

    const lats = units.map(u => u.position.lat)
    const lons = units.map(u => u.position.lon)
    const pad  = 1.5
    const bounds = scenarioBounds ?? {
      min_lat: Math.min(...lats) - pad, max_lat: Math.max(...lats) + pad,
      min_lon: Math.min(...lons) - pad, max_lon: Math.max(...lons) + pad,
    }

    const scenario: ScenarioDef = {
      id: 'custom', name: 'Custom Scenario',
      description: 'User-placed forces',
      map_bounds: bounds, time_step: simTimeStep, duration: 1800, units,
    }

    try {
      const res = await fetch('/api/simulations/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        alert(`Launch failed (${res.status}): ${JSON.stringify(err.detail ?? err)}`)
        return
      }
      const sim = await res.json()

      setSimUnits(new Map(units.map(u => [u.id, { ...u }])))
      setTotalSteps(sim.total_timesteps)
      setCurrentStep(0)
      setEvents([])
      setTrails(new Map())
      setEngagedPairs(new Map())
      setSimStatus('running')
      setAppMode('sim')

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const backendHost = window.location.port === '3000'
        ? `${window.location.hostname}:8000`
        : window.location.host
      const ws = new WebSocket(`${wsProto}//${backendHost}/ws/simulation/${sim.id}`)
      ws.onopen    = () => console.log('[WS] connected to sim', sim.id)
      ws.onclose   = e => console.log('[WS] closed', e.code, e.reason)
      ws.onerror   = e => console.error('[WS] error', e)
      ws.onmessage = handleWsMessage
      wsRef.current = ws
    } catch (e) {
      console.error('Launch failed', e)
      alert(`Launch failed: ${e}`)
    }
  }

  function handleReset() {
    wsRef.current?.close(); wsRef.current = null
    setSimStatus('idle'); setCurrentStep(0)
    setEvents([]); setTrails(new Map()); setEngagedPairs(new Map())
    setAppMode('edit')
  }

  const displayUnits = appMode === 'edit' ? placedUnits : simUnits
  const selectedUnit = appMode === 'edit' ? placedUnits.get(selectedUnitId ?? '') ?? null : null
  const unitNames    = new Map(Array.from(displayUnits.values()).map(u => [u.id, u.name]))
  const blueCount    = Array.from(placedUnits.values()).filter(u => u.side === 'blue').length
  const redCount     = Array.from(placedUnits.values()).filter(u => u.side === 'red').length
  const simTime      = currentStep * simTimeStep
  const isRunning    = appMode === 'sim' && simStatus === 'running'
  const isComplete   = appMode === 'sim' && simStatus === 'complete'

  return (
    <div className="synapse-app">

      {/* ── Icon Nav Rail ── */}
      <nav className="nav-rail">
        <div className="nav-logo">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <polygon points="9,1 17,5 17,13 9,17 1,13 1,5"
              stroke="currentColor" strokeWidth="1.4" fill="rgba(0,191,219,0.08)"/>
            <polygon points="9,5.5 13,7.5 13,10.5 9,12.5 5,10.5 5,7.5"
              stroke="currentColor" strokeWidth="1" fill="rgba(0,191,219,0.18)"/>
          </svg>
        </div>
        <div className="nav-items">
          <button
            className={`nav-item${appMode === 'edit' ? ' active' : ''}`}
            title="Force Editor"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1.5" y="1.5" width="5" height="5" rx="0.5"/>
              <rect x="8.5" y="1.5" width="5" height="5" rx="0.5"/>
              <rect x="1.5" y="8.5" width="5" height="5" rx="0.5"/>
              <rect x="8.5" y="8.5" width="5" height="5" rx="0.5"/>
            </svg>
          </button>
          <button
            className={`nav-item${appMode === 'sim' ? ' active' : ''}`}
            title="Simulation"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7.5" cy="7.5" r="5.5"/>
              <circle cx="7.5" cy="7.5" r="2"/>
              <line x1="7.5" y1="2" x2="7.5" y2="0.5"/>
              <line x1="7.5" y1="13" x2="7.5" y2="14.5"/>
              <line x1="2" y1="7.5" x2="0.5" y2="7.5"/>
              <line x1="13" y1="7.5" x2="14.5" y2="7.5"/>
            </svg>
          </button>
          <button className="nav-item" title="Layers" style={{ marginTop: 'auto', marginBottom: 6 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,6 7.5,2.5 14,6"/>
              <polyline points="1,8.5 7.5,5 14,8.5"/>
              <polyline points="1,11 7.5,7.5 14,11 7.5,14.5 1,11"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className="main-content">

        {/* ── Topbar ── */}
        <header className="topbar">

          {/* App wordmark */}
          <div className="topbar-wordmark">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
              <circle cx="2"   cy="2"   r="1.3"/>
              <circle cx="6.5" cy="2"   r="1.3"/>
              <circle cx="11"  cy="2"   r="1.3"/>
              <circle cx="2"   cy="6.5" r="1.3"/>
              <circle cx="6.5" cy="6.5" r="1.3"/>
              <circle cx="11"  cy="6.5" r="1.3"/>
              <circle cx="2"   cy="11"  r="1.3"/>
              <circle cx="6.5" cy="11"  r="1.3"/>
              <circle cx="11"  cy="11"  r="1.3"/>
            </svg>
            SYNAPSE
          </div>

          <div className="topbar-divider" />

          {/* Mode label + state */}
          {appMode === 'edit' ? (
            <>
              <span className="topbar-label">Force Editor</span>
              <div className="topbar-force-counts">
                <div className="force-count-badge force-blue">■ {blueCount}</div>
                <div className="force-count-badge force-red">◆ {redCount}</div>
              </div>
            </>
          ) : (
            <>
              {isRunning && (
                <div className="topbar-live">
                  <span className="live-dot" />
                  SIM LIVE
                </div>
              )}
              {isComplete && (
                <div className="topbar-live" style={{ color: 'var(--accent)' }}>
                  <span className="live-dot live-dot--accent" />
                  COMPLETE
                </div>
              )}
              <span className="topbar-time">T+{fmt(simTime)}</span>
            </>
          )}

          <div className="topbar-spacer" />

          {/* Actions */}
          {appMode === 'edit' ? (
            <button className="btn btn-launch" onClick={handleLaunch} disabled={placedUnits.size === 0}>
              Launch →
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={handleReset}>↺ Reset</button>
          )}

          <div className="topbar-divider" />

          {/* Online indicator + UTC clock */}
          <div className="topbar-status">
            <div className="topbar-online">
              <span className="live-dot" style={{ width: 5, height: 5 }} />
              Online
            </div>
            <span className="topbar-clock">{utcClock}</span>
          </div>
        </header>

        {/* ── Map Area ── */}
        <div className="map-area">

          {/* Mode banners */}
          {mapClickMode === 'waypoint' && (
            <div className="map-overlay-banner">
              Waypoint Mode · Click map to place · ESC to finish
            </div>
          )}
          {mapClickMode === 'place' && activeTemplate && (
            <div className="map-overlay-banner map-overlay-banner--place">
              Placing: {activeSide.toUpperCase()} {activeTemplate.label} · Click map · ESC to cancel
            </div>
          )}

          {/* ── Left panel ── */}
          <div className="overlay-panel overlay-panel--left">
            <div className="panel-hdr">
              <div className="panel-hdr-icon">
                {appMode === 'edit' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="1" width="5" height="5" rx="0.5"/>
                    <rect x="8" y="1" width="5" height="5" rx="0.5"/>
                    <rect x="1" y="8" width="5" height="5" rx="0.5"/>
                    <rect x="8" y="8" width="5" height="5" rx="0.5"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="2" y1="4"  x2="12" y2="4"/>
                    <line x1="2" y1="7"  x2="12" y2="7"/>
                    <line x1="2" y1="10" x2="12" y2="10"/>
                  </svg>
                )}
              </div>
              <span className="panel-hdr-title">
                {appMode === 'edit' ? 'Unit Library' : 'Force Status'}
              </span>
              {isRunning  && <span className="badge badge-live">Live</span>}
              {isComplete && <span className="badge badge-complete">Done</span>}
            </div>

            {appMode === 'edit' ? (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <UnitPalette
                  activeSide={activeSide}
                  setActiveSide={setActiveSide}
                  activeTemplate={activeTemplate}
                  onSelectTemplate={handleSelectTemplate}
                  mapClickMode={mapClickMode}
                  scenarios={scenarios}
                  customPresets={customPresets}
                  unitCount={placedUnits.size}
                  onLoadPreset={handleLoadPreset}
                  onClearMap={handleClearMap}
                  onSavePreset={handleSavePreset}
                  onDeleteCustomPreset={handleDeleteCustomPreset}
                />
              </div>
            ) : (
              <UnitList units={simUnits} />
            )}
          </div>

          {/* Map (behind panels) */}
          <div className="map-wrapper">
            <MapView
              units={displayUnits}
              trails={appMode === 'sim' ? trails : new Map()}
              showRings={showRings}
              showTrails={showTrails && appMode === 'sim'}
              editMode={appMode === 'edit'}
              selectedUnitId={selectedUnitId}
              mapClickMode={appMode === 'edit' ? mapClickMode : 'none'}
              bounds={scenarioBounds}
              engagedPairs={appMode === 'sim' ? engagedPairs : new Map()}
              onMapClick={handleMapClick}
              onUnitSelect={appMode === 'edit' ? handleUnitSelect : () => {}}
              onUnitDrag={appMode === 'edit' ? handleUnitDrag : () => {}}
            />
          </div>

          {/* ── Right panel ── */}
          <div className="overlay-panel overlay-panel--right">
            <div className="panel-hdr">
              <div className="panel-hdr-icon">
                {appMode === 'edit' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 11L2 12.5H3.5L11 5L9.5 3.5L2 11Z"/>
                    <path d="M12 2.5A1 1 0 0 1 12 4L11 5L9.5 3.5L10.5 2.5A1 1 0 0 1 12 2.5Z"
                      strokeLinejoin="round" fill="none"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="7" cy="7" r="5.5"/>
                    <polyline points="7,4 7,7 9.5,9.5"/>
                  </svg>
                )}
              </div>
              <span className="panel-hdr-title">
                {appMode === 'edit' ? 'Unit Properties' : 'Simulation'}
              </span>
              {appMode === 'edit' && selectedUnit && (
                <span className="panel-hdr-tag">
                  {selectedUnit.side === 'blue' ? (
                    <span style={{ color: 'var(--friendly)' }}>Friendly</span>
                  ) : (
                    <span style={{ color: 'var(--hostile)' }}>Hostile</span>
                  )}
                </span>
              )}
              {appMode === 'sim' && isRunning && (
                <span className="badge badge-live">Running</span>
              )}
              {appMode === 'sim' && isComplete && (
                <span className="badge badge-complete">Complete</span>
              )}
            </div>

            {appMode === 'edit' ? (
              <UnitEditor
                unit={selectedUnit}
                waypointModeActive={mapClickMode === 'waypoint'}
                onUpdate={handleUnitUpdate}
                onDelete={handleUnitDelete}
                onStartWaypointMode={handleStartWaypointMode}
                onStopWaypointMode={() => setMapClickMode('none')}
                onRemoveWaypoint={handleRemoveWaypoint}
              />
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <SimControls
                  showRings={showRings}
                  showTrails={showTrails}
                  onReset={handleReset}
                  onToggleRings={() => setShowRings(v => !v)}
                  onToggleTrails={() => setShowTrails(v => !v)}
                />
                <div className="section-label" style={{ borderTop: '1px solid var(--border-dim)' }}>
                  Timeline
                </div>
                <Timeline current={currentStep} total={totalSteps} timeStep={simTimeStep} />
                <div className="section-label" style={{ borderTop: '1px solid var(--border-dim)' }}>
                  Intel Feed
                </div>
                <EventLog events={events} unitNames={unitNames} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
