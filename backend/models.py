from enum import Enum
from typing import Optional, List
from pydantic import BaseModel

class Domain(str, Enum):
    air = "air"
    land = "land"
    sea = "sea"
    cyber = "cyber"

class Side(str, Enum):
    blue = "blue"
    red = "red"

class BehaviorType(str, Enum):
    patrol = "patrol"
    intercept = "intercept"
    defend = "defend"
    attack = "attack"

class UnitStatus(str, Enum):
    active = "active"
    destroyed = "destroyed"

class Position(BaseModel):
    lat: float
    lon: float

class SensorConfig(BaseModel):
    detection_radius: float  # km

class WeaponConfig(BaseModel):
    range: float  # km
    damage: float  # 0-100

class UnitDef(BaseModel):
    id: str
    name: str
    domain: Domain
    side: Side
    position: Position
    speed: float  # km/h
    heading: float = 0.0  # degrees
    sensors: SensorConfig
    weapons: WeaponConfig
    behavior: BehaviorType
    waypoints: Optional[List[Position]] = None
    hp: float = 100.0
    status: UnitStatus = UnitStatus.active

class ScenarioDef(BaseModel):
    id: str
    name: str
    description: str
    map_bounds: dict  # {min_lat, max_lat, min_lon, max_lon}
    time_step: float  # seconds
    duration: float  # seconds
    units: List[UnitDef]

class SimulationMeta(BaseModel):
    id: str
    scenario_id: str
    status: str  # pending, running, complete
    current_timestep: int
    total_timesteps: int

class EventType(str, Enum):
    unit_moved = "unit_moved"
    detected = "detected"
    engaged = "engaged"
    destroyed = "destroyed"

class SimEvent(BaseModel):
    timestep: int
    time: float
    type: EventType
    unit_id: str
    target_id: Optional[str] = None
    data: dict = {}

class SimulationSnapshot(BaseModel):
    timestep: int
    time: float
    units: List[UnitDef]
