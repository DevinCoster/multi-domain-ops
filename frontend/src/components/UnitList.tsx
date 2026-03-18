import { useState } from 'react'
import { Unit, Domain, Side } from '../types'

const DOMAINS: Domain[] = ['air', 'sea', 'land', 'cyber']
const SIDES: Side[] = ['blue', 'red']

function hpColor(hp: number) {
  if (hp > 60) return 'var(--ok)'
  if (hp > 30) return 'var(--warn)'
  return 'var(--crit)'
}

interface Props {
  units: Map<string, Unit>
}

export default function UnitList({ units }: Props) {
  const [activeDomains, setActiveDomains] = useState<Set<Domain>>(new Set(DOMAINS))
  const [activeSides, setActiveSides]   = useState<Set<Side>>(new Set(SIDES))

  const all = Array.from(units.values())
  const blueActive = all.filter(u => u.side === 'blue' && u.status === 'active').length
  const redActive  = all.filter(u => u.side === 'red'  && u.status === 'active').length

  function toggleDomain(d: Domain) {
    setActiveDomains(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n })
  }
  function toggleSide(s: Side) {
    setActiveSides(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  const filtered = all.filter(u => activeDomains.has(u.domain) && activeSides.has(u.side))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Summary */}
      <div className="roster-summary">
        <span className="roster-b">■ {blueActive} blue</span>
        <span className="roster-r">◆ {redActive} red</span>
        <span style={{ marginLeft: 'auto' }}>{all.filter(u => u.status === 'destroyed').length} KIA</span>
      </div>

      {/* Filters */}
      <div className="unit-filters">
        {DOMAINS.map(d => (
          <button key={d} className={`filter-chip ${d}${activeDomains.has(d) ? ' active' : ''}`}
            onClick={() => toggleDomain(d)}>{d}</button>
        ))}
        {SIDES.map(s => (
          <button key={s} className={`filter-chip ${s}${activeSides.has(s) ? ' active' : ''}`}
            onClick={() => toggleSide(s)}>{s}</button>
        ))}
      </div>

      {/* List */}
      <div className="section-body" style={{ flex: 1 }}>
        <div className="unit-cards">
          {filtered.map(unit => (
            <div key={unit.id} className={`unit-card unit-card--${unit.side}${unit.status === 'destroyed' ? ' unit-card--destroyed' : ''}`}>
              <div className="unit-card-top">
                <div className={`unit-domain-badge ${unit.domain}`}>
                  {{ air: 'A', sea: 'S', land: 'L', cyber: 'C' }[unit.domain]}
                </div>
                <span className="unit-card-name">{unit.name}</span>
                <span className={`unit-dot unit-dot--${unit.status}`} />
              </div>
              <div className="unit-hp-bar">
                <div className="unit-hp-fill"
                  style={{ width: `${Math.max(0, unit.hp)}%`, background: hpColor(unit.hp) }} />
              </div>
              <div className="unit-card-meta">
                {unit.behavior} · {unit.speed} km/h · HP {unit.hp.toFixed(0)}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text-mute)', fontSize: 11, textAlign: 'center', padding: 16 }}>
              No units match filters
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
