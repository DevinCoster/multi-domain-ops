import { useEffect, useRef } from 'react'
import { SimEvent } from '../types'

function fmt(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const BADGES: Record<string, string> = { detected: 'DETECT', engaged: 'ENGAGE', destroyed: 'DESTROY' }

function summary(ev: SimEvent, name: (id: string) => string): string {
  switch (ev.type) {
    case 'detected':  return `${name(ev.unit_id)} acquired ${name(ev.target_id ?? '')} at ${(ev.data.distance as number).toFixed(0)} km`
    case 'engaged':   return `${name(ev.unit_id)} engaging ${name(ev.target_id ?? '')} · HP ${(ev.data.target_hp as number).toFixed(0)}`
    case 'destroyed': return `${name(ev.unit_id)} DESTROYED by ${name(ev.target_id ?? '')}`
    default:          return ev.type
  }
}

interface Props {
  events: SimEvent[]
  unitNames: Map<string, string>
}

export default function EventLog({ events, unitNames }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const getName = (id: string) => unitNames.get(id) ?? id

  const displayed = events.filter(e => e.type !== 'unit_moved').slice(-200)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayed.length])

  return (
    <div className="intel-feed">
      <div className="intel-list">
        {displayed.length === 0 && (
          <div className="intel-empty">Awaiting contacts…</div>
        )}
        {displayed.map((ev, i) => (
          <div key={i} className={`intel-entry intel-entry--${ev.type}`}>
            <span className="intel-time">{fmt(ev.time)}</span>
            <span className={`intel-badge intel-badge--${ev.type}`}>{BADGES[ev.type] ?? ev.type}</span>
            <span className="intel-text">{summary(ev, getName)}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  )
}
