import asyncio
import uuid
from typing import Dict

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import SimulationMeta, ScenarioDef
from scenarios import SCENARIOS
from simulation import SimulationRunner

app = FastAPI(title="Multi-Domain Ops Sandbox")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

simulations: Dict[str, SimulationRunner] = {}


class CreateSimRequest(BaseModel):
    scenario_id: str


@app.get("/api/scenarios/")
def list_scenarios():
    return [
        {"id": s.id, "name": s.name, "description": s.description}
        for s in SCENARIOS.values()
    ]


@app.get("/api/scenarios/{scenario_id}")
def get_scenario(scenario_id: str):
    s = SCENARIOS.get(scenario_id)
    if not s:
        raise HTTPException(404, "Scenario not found")
    return s.model_dump()


@app.post("/api/simulations/")
async def create_simulation(body: CreateSimRequest):
    scenario = SCENARIOS.get(body.scenario_id)
    if not scenario:
        raise HTTPException(404, "Scenario not found")
    sim_id = str(uuid.uuid4())[:8]
    runner = SimulationRunner(sim_id, scenario)
    simulations[sim_id] = runner
    asyncio.create_task(runner.run())
    return runner.meta().model_dump()


@app.post("/api/simulations/custom")
async def create_custom_simulation(scenario: ScenarioDef):
    sim_id = str(uuid.uuid4())[:8]
    runner = SimulationRunner(sim_id, scenario)
    simulations[sim_id] = runner
    asyncio.create_task(runner.run())
    return runner.meta().model_dump()


@app.get("/api/simulations/{sim_id}")
def get_simulation(sim_id: str):
    runner = simulations.get(sim_id)
    if not runner:
        raise HTTPException(404, "Not found")
    return runner.meta().model_dump()


@app.get("/api/simulations/{sim_id}/snapshot")
def get_snapshot(sim_id: str, t: int = 0):
    runner = simulations.get(sim_id)
    if not runner:
        raise HTTPException(404, "Not found")
    snap = runner.snapshots.get(t)
    if snap is None:
        raise HTTPException(404, "Snapshot not available yet")
    return snap.model_dump()


@app.websocket("/ws/simulation/{sim_id}")
async def ws_simulation(websocket: WebSocket, sim_id: str):
    await websocket.accept()
    runner = simulations.get(sim_id)
    if not runner:
        await websocket.close(code=1008)
        return

    # If already complete, replay all events then close
    if runner.status == "complete":
        for ev in runner.event_log:
            await websocket.send_json({"type": "event", "data": ev.model_dump()})
        await websocket.send_json({"type": "status", "data": {"status": "complete"}})
        return

    # If partially run, send current snapshot to sync state
    if runner.current_timestep > 0:
        snap = runner.snapshots.get(runner.current_timestep)
        if snap:
            await websocket.send_json({"type": "snapshot", "data": snap.model_dump()})

    q = runner.subscribe()
    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=120.0)
            except asyncio.TimeoutError:
                break
            await websocket.send_json(msg)
            if msg.get("type") == "status" and msg["data"].get("status") == "complete":
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        runner.unsubscribe(q)
