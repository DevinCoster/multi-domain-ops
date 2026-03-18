import asyncio
import copy
import math
from typing import Dict, List, Optional, Set, Tuple

from models import (
    BehaviorType, Domain, EventType, Position, SimEvent,
    SimulationMeta, SimulationSnapshot, ScenarioDef, UnitDef, UnitStatus,
)


def haversine_km(p1: Position, p2: Position) -> float:
    R = 6371.0
    lat1, lon1 = math.radians(p1.lat), math.radians(p1.lon)
    lat2, lon2 = math.radians(p2.lat), math.radians(p2.lon)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(min(1.0, a)))


def bearing_deg(p1: Position, p2: Position) -> float:
    lat1, lon1 = math.radians(p1.lat), math.radians(p1.lon)
    lat2, lon2 = math.radians(p2.lat), math.radians(p2.lon)
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def move_toward(pos: Position, target: Position, dist_km: float) -> Position:
    b = math.radians(bearing_deg(pos, target))
    d = dist_km / 6371.0
    lat1 = math.radians(pos.lat)
    lon1 = math.radians(pos.lon)
    lat2 = math.asin(math.sin(lat1) * math.cos(d) + math.cos(lat1) * math.sin(d) * math.cos(b))
    lon2 = lon1 + math.atan2(
        math.sin(b) * math.sin(d) * math.cos(lat1),
        math.cos(d) - math.sin(lat1) * math.sin(lat2),
    )
    return Position(lat=math.degrees(lat2), lon=math.degrees(lon2))


class SimulationRunner:
    def __init__(self, sim_id: str, scenario: ScenarioDef):
        self.sim_id = sim_id
        self.scenario = scenario
        self.status = "pending"
        self.current_timestep = 0
        self.total_timesteps = int(scenario.duration / scenario.time_step)
        self.snapshots: Dict[int, SimulationSnapshot] = {}
        self.event_log: List[SimEvent] = []
        self.subscribers: List[asyncio.Queue] = []

    def meta(self) -> SimulationMeta:
        return SimulationMeta(
            id=self.sim_id,
            scenario_id=self.scenario.id,
            status=self.status,
            current_timestep=self.current_timestep,
            total_timesteps=self.total_timesteps,
        )

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self.subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        if q in self.subscribers:
            self.subscribers.remove(q)

    async def _broadcast(self, msg: dict) -> None:
        for q in list(self.subscribers):
            await q.put(msg)

    def _get_move_target(
        self,
        unit: UnitDef,
        active_enemies: List[UnitDef],
        wp_idx: Dict[str, int],
        home: Dict[str, Position],
    ) -> Optional[Position]:
        if unit.behavior == BehaviorType.patrol:
            if not unit.waypoints:
                return None
            return unit.waypoints[wp_idx[unit.id]]

        if unit.behavior in (BehaviorType.intercept, BehaviorType.attack):
            if not active_enemies:
                return home.get(unit.id)
            return min(active_enemies, key=lambda e: haversine_km(unit.position, e.position)).position

        if unit.behavior == BehaviorType.defend:
            nearby = [
                e for e in active_enemies
                if haversine_km(unit.position, e.position) <= unit.sensors.detection_radius * 2
            ]
            if nearby:
                return min(nearby, key=lambda e: haversine_km(unit.position, e.position)).position
            return home.get(unit.id)

        return None

    async def run(self) -> None:
        self.status = "running"
        await self._broadcast({"type": "status", "data": {"status": "running"}})

        units: List[UnitDef] = copy.deepcopy(self.scenario.units)
        wp_idx: Dict[str, int] = {u.id: 0 for u in units}
        home: Dict[str, Position] = {u.id: Position(lat=u.position.lat, lon=u.position.lon) for u in units}
        time_step = self.scenario.time_step
        move_factor = time_step / 3600.0  # hours per step

        detected_pairs: Set[Tuple[str, str]] = set()  # emit detected only on entry

        for step in range(self.total_timesteps):
            self.current_timestep = step
            t = step * time_step
            step_events: List[SimEvent] = []

            active = [u for u in units if u.status == UnitStatus.active]

            # --- Movement ---
            for unit in active:
                if unit.domain == Domain.cyber or unit.speed == 0:
                    continue
                enemies = [u for u in active if u.side != unit.side]
                target = self._get_move_target(unit, enemies, wp_idx, home)
                if target is None:
                    continue
                dist = haversine_km(unit.position, target)
                move_dist = unit.speed * move_factor
                if dist < 0.5:
                    if unit.behavior == BehaviorType.patrol and unit.waypoints:
                        wp_idx[unit.id] = (wp_idx[unit.id] + 1) % len(unit.waypoints)
                else:
                    unit.position = move_toward(unit.position, target, min(move_dist, dist))
                unit.heading = bearing_deg(unit.position, target)
                step_events.append(SimEvent(
                    timestep=step, time=t, type=EventType.unit_moved, unit_id=unit.id,
                    data={"lat": unit.position.lat, "lon": unit.position.lon, "heading": unit.heading},
                ))

            # --- Detection & Engagement ---
            current_detected: Set[Tuple[str, str]] = set()
            engaged_this_step: Set[Tuple[str, str]] = set()

            for unit in active:
                enemies = [u for u in active if u.side != unit.side]
                for enemy in enemies:
                    dist = haversine_km(unit.position, enemy.position)
                    pair = (unit.id, enemy.id)

                    if dist <= unit.sensors.detection_radius:
                        current_detected.add(pair)
                        if pair not in detected_pairs:
                            step_events.append(SimEvent(
                                timestep=step, time=t, type=EventType.detected,
                                unit_id=unit.id, target_id=enemy.id,
                                data={"distance": round(dist, 1)},
                            ))

                        if dist <= unit.weapons.range and pair not in engaged_this_step:
                            engaged_this_step.add(pair)
                            damage = unit.weapons.damage * (time_step / 60.0)
                            enemy.hp = max(0.0, enemy.hp - damage)
                            step_events.append(SimEvent(
                                timestep=step, time=t, type=EventType.engaged,
                                unit_id=unit.id, target_id=enemy.id,
                                data={
                                    "distance": round(dist, 1),
                                    "damage": round(damage, 1),
                                    "target_hp": round(enemy.hp, 1),
                                },
                            ))
                            if enemy.hp <= 0 and enemy.status == UnitStatus.active:
                                enemy.status = UnitStatus.destroyed
                                step_events.append(SimEvent(
                                    timestep=step, time=t, type=EventType.destroyed,
                                    unit_id=enemy.id, target_id=unit.id, data={},
                                ))

            detected_pairs = current_detected

            # --- Snapshot ---
            self.snapshots[step] = SimulationSnapshot(
                timestep=step, time=t, units=copy.deepcopy(units),
            )
            self.event_log.extend(step_events)

            for ev in step_events:
                await self._broadcast({"type": "event", "data": ev.model_dump()})
            await self._broadcast({"type": "tick", "data": {"timestep": step, "time": t}})

            await asyncio.sleep(0.05)  # ~20 steps/sec real-time pacing

        self.status = "complete"
        await self._broadcast({"type": "status", "data": {"status": "complete"}})
