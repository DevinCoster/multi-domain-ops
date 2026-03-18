# SYNAPSE · Multi-Domain Operations

A real-time multi-domain military operations simulation tool with an Anduril Lattice-inspired interface. Place forces, configure behaviors, launch simulations, and watch engagements unfold live across air, sea, land, and cyber domains.

![SYNAPSE UI](https://github.com/DevinCoster/multi-domain-ops/blob/main/Screenshot%202026-03-18%20153911.png)

---

## Features

- **Force Editor** — Place Blue (friendly) and Red (hostile) units on an interactive satellite map
- **Unit Library** — 13 unit types across 4 domains: Air (Fighter, Bomber, UAV, Patrol AC), Sea (Destroyer, Frigate, Submarine, FAC, Cargo), Land (Base/FOB, Armor, SAM Site), and Cyber (Hub, APT)
- **Behaviors** — Each unit supports `patrol`, `intercept`, `attack`, or `defend` modes
- **Live Simulation** — WebSocket-streamed real-time simulation with haversine movement and detection physics
- **Engagement Tracking** — Live sensor rings, weapon range overlays, intercept callouts, and kill events
- **Intel Feed** — Timestamped event log (detection, engagement, destruction) streamed from the backend
- **Timeline** — Scrollable event timeline synced to simulation time
- **Scenario Presets** — Two built-in scenarios; save, load, and delete your own custom presets (persisted via `localStorage`)
- **Satellite Map** — Esri World Imagery base layer with labels/borders overlay

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Map | React-Leaflet, Esri tile layers |
| Backend | FastAPI, Python 3.11+, Uvicorn |
| Realtime | WebSockets (`asyncio`) |
| State | React `useState` / `useEffect` |
| Persistence | `localStorage` (custom presets) |

---

## Getting Started

### Prerequisites

- **Python 3.11+** (Windows: use the `py` launcher)
- **Node.js 18+** and npm

### Backend

```bash
cd backend
pip install -r requirements.txt
py -m uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will open at `http://localhost:3000`.

---

## Built-in Scenarios

| Scenario | Setting | Duration | Focus |
|---|---|---|---|
| **Island Defense** | Pacific theater | 30 min | Air superiority + naval + cyber |
| **Convoy Escort** | Gulf of Aden | 60 min | Anti-submarine + surface warfare |

---

## Custom Presets

1. Place units on the map using the unit palette
2. Click **+ Save Preset** and enter a name
3. Presets appear under **My Presets** in the sidebar and persist across sessions
4. Click a preset name to load it, or **×** to delete it

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/scenarios/` | List built-in scenarios |
| `GET` | `/api/scenarios/{id}` | Get scenario definition |
| `POST` | `/api/simulations/` | Start a built-in scenario simulation |
| `POST` | `/api/simulations/custom` | Start a simulation from a custom unit set |
| `GET` | `/api/simulations/{id}` | Get simulation metadata |
| `GET` | `/api/simulations/{id}/snapshot` | Get current unit positions snapshot |
| `WS` | `/ws/simulation/{id}` | Stream live simulation events |

---

## Project Structure

```
multi-domain-ops/
├── backend/
│   ├── main.py           # FastAPI app, routes, WebSocket handler
│   ├── simulation.py     # SimulationRunner: movement, detection, engagement
│   ├── scenarios.py      # Built-in scenario definitions
│   ├── models.py         # Pydantic v2 data models
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── App.tsx        # Application shell, state, preset handlers
    │   ├── index.css      # Full dark theme (Lattice-inspired)
    │   ├── types.ts       # Shared TypeScript types
    │   └── components/
    │       ├── MapView.tsx      # Leaflet map, unit markers, rings, trails
    │       ├── UnitPalette.tsx  # Unit library + preset management
    │       ├── UnitEditor.tsx   # Selected unit property editor
    │       ├── UnitList.tsx     # Deployed units list
    │       ├── IntelFeed.tsx    # Live event log
    │       └── Timeline.tsx     # Simulation event timeline
    ├── index.html
    └── package.json
```

---

## Simulation Model

- Movement uses **haversine** geodesic math (lat/lon positions, km/h speeds scaled to ~20 steps/sec)
- **Detection** triggers when unit separation falls within `detection_radius`
- **Engagement** triggers when separation falls within `weapon_range`
- **Defend** behavior: units hold position but engage threats within weapon range
- **Intercept/Attack**: units seek the nearest enemy unit
- **Patrol**: units cycle through a set of waypoints

---

## Design

The UI is inspired by [Anduril's Lattice](https://www.anduril.com/lattice/) command-and-control platform

---

## License

MIT
