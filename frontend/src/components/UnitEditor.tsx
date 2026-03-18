import { useEffect } from 'react'
import { Unit, BehaviorType } from '../types'

const BEHAVIORS: BehaviorType[] = ['patrol', 'intercept', 'defend', 'attack']

interface Props {
  unit: Unit | null
  waypointModeActive: boolean
  onUpdate: (id: string, patch: Partial<Unit> & { sensors?: Partial<Unit['sensors']>; weapons?: Partial<Unit['weapons']> }) => void
  onDelete: (id: string) => void
  onStartWaypointMode: () => void
  onStopWaypointMode: () => void
  onRemoveWaypoint: (id: string, idx: number) => void
}

export default function UnitEditor({
  unit, waypointModeActive,
  onUpdate, onDelete, onStartWaypointMode, onStopWaypointMode, onRemoveWaypoint,
}: Props) {
  // ESC to exit waypoint mode
  useEffect(() => {
    if (!waypointModeActive) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onStopWaypointMode() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [waypointModeActive, onStopWaypointMode])

  if (!unit) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-icon">◎</div>
        <div className="editor-empty-text">
          Select a unit on the map<br />to edit its properties
        </div>
      </div>
    )
  }

  const color = unit.side === 'blue' ? 'var(--blue)' : 'var(--red)'

  return (
    <div className="unit-editor">
      {/* Identity */}
      <div className="editor-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color, flex: 1 }}>{unit.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {unit.side} · {unit.domain}
          </span>
        </div>

        <div className="field-row">
          <label className="field-label">Callsign</label>
          <input
            className="field-input"
            value={unit.name}
            onChange={e => onUpdate(unit.id, { name: e.target.value })}
          />
        </div>

        <div className="field-row">
          <label className="field-label">Behavior</label>
          <div className="behavior-btns">
            {BEHAVIORS.map(b => (
              <button
                key={b}
                className={`behavior-btn${unit.behavior === b ? ' active' : ''}`}
                onClick={() => onUpdate(unit.id, { behavior: b })}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="editor-section">
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 6 }}>
          Performance
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label">Speed</label>
            <span className="field-range-val">{unit.speed} km/h</span>
          </div>
          <input type="range" className="field-range" min={0} max={1000} step={10} value={unit.speed}
            onChange={e => onUpdate(unit.id, { speed: Number(e.target.value) })} />
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label">Sensor Range</label>
            <span className="field-range-val">{unit.sensors.detection_radius} km</span>
          </div>
          <input type="range" className="field-range" min={10} max={500} step={10}
            value={unit.sensors.detection_radius}
            onChange={e => onUpdate(unit.id, { sensors: { detection_radius: Number(e.target.value) } })} />
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label">Weapon Range</label>
            <span className="field-range-val">{unit.weapons.range} km</span>
          </div>
          <input type="range" className="field-range" min={0} max={300} step={5}
            value={unit.weapons.range}
            onChange={e => onUpdate(unit.id, { weapons: { ...unit.weapons, range: Number(e.target.value) } })} />
        </div>

        <div className="field-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label">Damage / min</label>
            <span className="field-range-val">{unit.weapons.damage}</span>
          </div>
          <input type="range" className="field-range" min={0} max={100} step={5}
            value={unit.weapons.damage}
            onChange={e => onUpdate(unit.id, { weapons: { ...unit.weapons, damage: Number(e.target.value) } })} />
        </div>
      </div>

      {/* Waypoints (patrol only) */}
      {unit.behavior === 'patrol' && (
        <div className="editor-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
              Waypoints ({unit.waypoints?.length ?? 0})
            </span>
            {(unit.waypoints?.length ?? 0) > 0 && (
              <button className="btn btn-sm btn-ghost"
                onClick={() => onUpdate(unit.id, { waypoints: [] })}>
                Clear
              </button>
            )}
          </div>

          <button
            className={`btn-add-waypoints${waypointModeActive ? ' active' : ''}`}
            onClick={waypointModeActive ? onStopWaypointMode : onStartWaypointMode}
          >
            {waypointModeActive ? '✓ Click map · ESC to finish' : '+ Add Waypoints on Map'}
          </button>

          {unit.waypoints && unit.waypoints.length > 0 && (
            <div className="waypoint-list">
              {unit.waypoints.map((wp, i) => (
                <div key={i} className="waypoint-row">
                  <span className="waypoint-idx">{i + 1}</span>
                  <span>{wp.lat.toFixed(3)}°, {wp.lon.toFixed(3)}°</span>
                  <span className="waypoint-del" onClick={() => onRemoveWaypoint(unit.id, i)}>×</span>
                </div>
              ))}
            </div>
          )}

          {(!unit.waypoints || unit.waypoints.length === 0) && !waypointModeActive && (
            <div className="waypoints-empty">No waypoints — unit will remain stationary</div>
          )}
        </div>
      )}

      {/* Delete */}
      <div className="editor-section">
        <button className="btn btn-danger" style={{ width: '100%' }}
          onClick={() => onDelete(unit.id)}>
          Delete Unit
        </button>
      </div>
    </div>
  )
}
