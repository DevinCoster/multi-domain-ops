export type Domain = 'air' | 'land' | 'sea' | 'cyber'
export type Side = 'blue' | 'red'
export type BehaviorType = 'patrol' | 'intercept' | 'defend' | 'attack'
export type UnitStatus = 'active' | 'destroyed'
export type EventType = 'unit_moved' | 'detected' | 'engaged' | 'destroyed'
export type SimStatus = 'idle' | 'running' | 'complete'
export type AppMode = 'edit' | 'sim'
export type MapClickMode = 'place' | 'waypoint' | 'none'

export interface Position {
  lat: number
  lon: number
}

export interface Unit {
  id: string
  name: string
  domain: Domain
  side: Side
  position: Position
  speed: number
  heading: number
  hp: number
  status: UnitStatus
  behavior: BehaviorType
  sensors: { detection_radius: number }
  weapons: { range: number; damage: number }
  waypoints?: Position[]
}

export interface SimEvent {
  timestep: number
  time: number
  type: EventType
  unit_id: string
  target_id?: string
  data: Record<string, unknown>
}

export interface ScenarioMeta {
  id: string
  name: string
  description: string
}

export interface ScenarioDef extends ScenarioMeta {
  map_bounds: { min_lat: number; max_lat: number; min_lon: number; max_lon: number }
  time_step: number
  duration: number
  units: Unit[]
}

export interface SimMeta {
  id: string
  scenario_id: string
  status: string
  current_timestep: number
  total_timesteps: number
}

export interface UnitTemplate {
  templateId: string
  label: string
  domain: Domain
  defaultName: string
  defaultSpeed: number
  defaultSensors: { detection_radius: number }
  defaultWeapons: { range: number; damage: number }
  defaultBehavior: BehaviorType
}
