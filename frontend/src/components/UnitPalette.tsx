import { useState } from 'react'
import { UnitTemplate, Domain, MapClickMode, ScenarioMeta, ScenarioDef } from '../types'

const UNIT_TEMPLATES: UnitTemplate[] = [
  // AIR
  { templateId: 'air_fighter',  label: 'Fighter',    domain: 'air',   defaultName: 'Fighter',    defaultSpeed: 800, defaultSensors: { detection_radius: 150 }, defaultWeapons: { range: 100, damage: 40 }, defaultBehavior: 'intercept' },
  { templateId: 'air_bomber',   label: 'Bomber',     domain: 'air',   defaultName: 'Bomber',     defaultSpeed: 600, defaultSensors: { detection_radius: 100 }, defaultWeapons: { range: 150, damage: 50 }, defaultBehavior: 'attack' },
  { templateId: 'air_uav',      label: 'Recon UAV',  domain: 'air',   defaultName: 'UAV',        defaultSpeed: 350, defaultSensors: { detection_radius: 200 }, defaultWeapons: { range: 0,   damage: 0  }, defaultBehavior: 'patrol' },
  { templateId: 'air_patrol',   label: 'Patrol AC',  domain: 'air',   defaultName: 'Patrol AC',  defaultSpeed: 500, defaultSensors: { detection_radius: 150 }, defaultWeapons: { range: 80,  damage: 35 }, defaultBehavior: 'patrol' },
  // SEA
  { templateId: 'sea_destroyer',label: 'Destroyer',  domain: 'sea',   defaultName: 'DDG',        defaultSpeed: 55,  defaultSensors: { detection_radius: 100 }, defaultWeapons: { range: 70,  damage: 45 }, defaultBehavior: 'patrol' },
  { templateId: 'sea_frigate',  label: 'Frigate',    domain: 'sea',   defaultName: 'Frigate',    defaultSpeed: 40,  defaultSensors: { detection_radius: 80  }, defaultWeapons: { range: 60,  damage: 35 }, defaultBehavior: 'attack' },
  { templateId: 'sea_sub',      label: 'Submarine',  domain: 'sea',   defaultName: 'SSK',        defaultSpeed: 25,  defaultSensors: { detection_radius: 80  }, defaultWeapons: { range: 30,  damage: 70 }, defaultBehavior: 'intercept' },
  { templateId: 'sea_fac',      label: 'Fast Attack', domain: 'sea',  defaultName: 'FAC',        defaultSpeed: 70,  defaultSensors: { detection_radius: 60  }, defaultWeapons: { range: 40,  damage: 50 }, defaultBehavior: 'attack' },
  { templateId: 'sea_cargo',    label: 'Cargo Ship', domain: 'sea',   defaultName: 'MV',         defaultSpeed: 18,  defaultSensors: { detection_radius: 30  }, defaultWeapons: { range: 10,  damage: 5  }, defaultBehavior: 'patrol' },
  // LAND
  { templateId: 'land_base',    label: 'Base/FOB',   domain: 'land',  defaultName: 'FOB',        defaultSpeed: 0,   defaultSensors: { detection_radius: 50  }, defaultWeapons: { range: 30,  damage: 20 }, defaultBehavior: 'defend' },
  { templateId: 'land_armor',   label: 'Armor',      domain: 'land',  defaultName: 'M1A2',       defaultSpeed: 60,  defaultSensors: { detection_radius: 40  }, defaultWeapons: { range: 20,  damage: 55 }, defaultBehavior: 'attack' },
  { templateId: 'land_sam',     label: 'SAM Site',   domain: 'land',  defaultName: 'SAM',        defaultSpeed: 0,   defaultSensors: { detection_radius: 120 }, defaultWeapons: { range: 100, damage: 60 }, defaultBehavior: 'defend' },
  // CYBER
  { templateId: 'cyber_hub',    label: 'Cyber Hub',  domain: 'cyber', defaultName: 'C2 Node',    defaultSpeed: 0,   defaultSensors: { detection_radius: 250 }, defaultWeapons: { range: 150, damage: 20 }, defaultBehavior: 'defend' },
  { templateId: 'cyber_apt',    label: 'APT',        domain: 'cyber', defaultName: 'APT Group',  defaultSpeed: 0,   defaultSensors: { detection_radius: 300 }, defaultWeapons: { range: 200, damage: 15 }, defaultBehavior: 'attack' },
]

const DOMAIN_LABEL: Record<Domain, string> = { air: 'AIR', sea: 'SEA', land: 'LAND', cyber: 'CYBER' }
const DOMAIN_ORDER: Domain[] = ['air', 'sea', 'land', 'cyber']

function DomainSvg({ domain, side }: { domain: Domain; side: 'blue' | 'red' }) {
  const color = side === 'blue' ? '#00bfdb' : '#ff7820'
  const letter = { air: 'A', sea: 'S', land: 'L', cyber: 'C' }[domain]
  const shape = side === 'blue'
    ? `<rect x="3" y="3" width="20" height="20" rx="1" fill="rgba(0,191,219,0.12)" stroke="${color}" stroke-width="1.5"/>`
    : `<rect x="6" y="6" width="14" height="14" rx="1" fill="rgba(255,120,32,0.12)" stroke="${color}" stroke-width="1.5" transform="rotate(45 13 13)"/>`
  return (
    <svg width="26" height="26" viewBox="0 0 26 26"
      dangerouslySetInnerHTML={{ __html: `${shape}<text x="13" y="18" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="700" fill="${color}">${letter}</text>` }}
    />
  )
}

interface Props {
  activeSide: 'blue' | 'red'
  setActiveSide: (s: 'blue' | 'red') => void
  activeTemplate: UnitTemplate | null
  onSelectTemplate: (t: UnitTemplate | null) => void
  mapClickMode: MapClickMode
  scenarios: ScenarioMeta[]
  customPresets: ScenarioDef[]
  unitCount: number
  onLoadPreset: (id: string) => void
  onClearMap: () => void
  onSavePreset: (name: string) => void
  onDeleteCustomPreset: (id: string) => void
}

export default function UnitPalette({
  activeSide, setActiveSide, activeTemplate, onSelectTemplate,
  mapClickMode, scenarios, customPresets, unitCount,
  onLoadPreset, onClearMap, onSavePreset, onDeleteCustomPreset,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [presetName, setPresetName] = useState('')

  const grouped = DOMAIN_ORDER.map(d => ({
    domain: d,
    templates: UNIT_TEMPLATES.filter(t => t.domain === d),
  }))

  function handleTemplateClick(t: UnitTemplate) {
    if (activeTemplate?.templateId === t.templateId && mapClickMode === 'place') {
      onSelectTemplate(null)
    } else {
      onSelectTemplate(t)
    }
  }

  function commitSave() {
    onSavePreset(presetName)
    setSaving(false)
    setPresetName('')
  }

  const hasPresets = scenarios.length > 0 || customPresets.length > 0

  return (
    <>
      {/* Side toggle */}
      <div className="side-toggle">
        <button
          className={`side-btn side-btn--blue${activeSide === 'blue' ? ' active' : ''}`}
          onClick={() => setActiveSide('blue')}
        >
          ■ Blue Force
        </button>
        <button
          className={`side-btn side-btn--red${activeSide === 'red' ? ' active' : ''}`}
          onClick={() => setActiveSide('red')}
        >
          ◆ Red Force
        </button>
      </div>

      {/* Preset section */}
      <div className="preset-section">

        {/* Dropdown */}
        {hasPresets && (
          <div className="preset-row">
            <select
              className="preset-select"
              value=""
              onChange={e => { if (e.target.value) onLoadPreset(e.target.value) }}
            >
              <option value="" disabled>Load preset scenario…</option>
              {scenarios.length > 0 && (
                <optgroup label="Built-in">
                  {scenarios.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              )}
              {customPresets.length > 0 && (
                <optgroup label="My Presets">
                  {customPresets.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {/* Actions row */}
        <div className="preset-actions">
          <button
            className="btn btn-ghost btn-sm preset-action-btn"
            onClick={onClearMap}
            disabled={unitCount === 0}
          >
            ✕ Clear
          </button>
          <button
            className="btn btn-ghost btn-sm preset-action-btn"
            onClick={() => { setSaving(true); setPresetName('') }}
            disabled={unitCount === 0}
          >
            + Save Preset
          </button>
        </div>

        {/* Inline save form */}
        {saving && (
          <div className="preset-save-form">
            <input
              className="field-input"
              placeholder="Preset name…"
              value={presetName}
              autoFocus
              onChange={e => setPresetName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitSave()
                if (e.key === 'Escape') { setSaving(false); setPresetName('') }
              }}
            />
            <div className="preset-save-actions">
              <button
                className="btn btn-launch btn-sm"
                onClick={commitSave}
                disabled={!presetName.trim()}
              >
                Save
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setSaving(false); setPresetName('') }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Custom preset list */}
        {customPresets.length > 0 && (
          <div className="custom-presets-list">
            <div className="custom-presets-label">My Presets</div>
            {customPresets.map(p => (
              <div key={p.id} className="custom-preset-item">
                <button
                  className="custom-preset-name"
                  onClick={() => onLoadPreset(p.id)}
                  title={`Load "${p.name}"`}
                >
                  {p.name}
                </button>
                <button
                  className="custom-preset-del"
                  onClick={() => onDeleteCustomPreset(p.id)}
                  title="Delete preset"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates by domain */}
      <div className="section-body" style={{ paddingTop: 4 }}>
        {grouped.map(({ domain, templates }) => (
          <div key={domain} className="domain-group">
            <div className={`domain-group-label ${domain}`}>{DOMAIN_LABEL[domain]}</div>
            <div className="template-grid">
              {templates.map(t => {
                const isActive = activeTemplate?.templateId === t.templateId && mapClickMode === 'place'
                return (
                  <div
                    key={t.templateId}
                    className={`template-card${isActive ? ` active ${t.domain}` : ''}`}
                    onClick={() => handleTemplateClick(t)}
                  >
                    <div className="template-icon">
                      <DomainSvg domain={t.domain} side={activeSide} />
                    </div>
                    <div className="template-info">
                      <div className="template-name">{t.label}</div>
                      <div className="template-meta">
                        {t.defaultSpeed > 0 ? `${t.defaultSpeed} km/h` : 'stationary'} · {t.defaultBehavior}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
