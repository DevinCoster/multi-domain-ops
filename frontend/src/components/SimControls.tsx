interface Props {
  showRings: boolean
  showTrails: boolean
  onReset: () => void
  onToggleRings: () => void
  onToggleTrails: () => void
}

export default function SimControls({ showRings, showTrails, onReset, onToggleRings, onToggleTrails }: Props) {
  return (
    <div className="sim-controls-body">
      <button className="btn btn-danger" onClick={onReset}>↺ Abort &amp; Reset</button>
      <div className="toggles-row">
        <button className={`toggle-btn${showRings ? ' on' : ''}`} onClick={onToggleRings}>
          ◎ Rings
        </button>
        <button className={`toggle-btn${showTrails ? ' on' : ''}`} onClick={onToggleTrails}>
          ∿ Trails
        </button>
      </div>
    </div>
  )
}
