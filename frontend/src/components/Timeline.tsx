interface Props {
  current: number
  total: number
  timeStep: number
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Timeline({ current, total, timeStep }: Props) {
  const pct = total > 0 ? (current / total) * 100 : 0
  const simTime = current * timeStep
  const totalTime = total * timeStep

  return (
    <div className="timeline-body">
      <div className="timeline-labels">
        <span>T+{fmt(simTime)}</span>
        <span>{pct.toFixed(0)}%</span>
        <span>{fmt(totalTime)}</span>
      </div>
      <input
        type="range"
        className="timeline-slider"
        min={0}
        max={Math.max(0, total - 1)}
        value={current}
        readOnly
        style={{
          background: `linear-gradient(to right, var(--accent) ${pct}%, var(--border) 0%)`,
        }}
      />
      <div className="timeline-step">STEP {current} / {total}</div>
    </div>
  )
}
