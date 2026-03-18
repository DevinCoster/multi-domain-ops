from models import ScenarioDef, UnitDef, Position, SensorConfig, WeaponConfig, Domain, Side, BehaviorType

SCENARIOS: dict[str, ScenarioDef] = {}

def _reg(s: ScenarioDef):
    SCENARIOS[s.id] = s
    return s

_reg(ScenarioDef(
    id="island_defense",
    name="Island Defense",
    description="Blue forces defend a Pacific island from converging air, sea, and cyber threats.",
    map_bounds={"min_lat": 13.5, "max_lat": 17.5, "min_lon": 142.5, "max_lon": 147.5},
    time_step=10.0,
    duration=1800.0,
    units=[
        UnitDef(
            id="b_f35", name="F-35A Eagle-1", domain=Domain.air, side=Side.blue,
            position=Position(lat=15.2, lon=145.7), speed=800.0,
            sensors=SensorConfig(detection_radius=150.0),
            weapons=WeaponConfig(range=100.0, damage=40.0),
            behavior=BehaviorType.patrol,
            waypoints=[
                Position(lat=15.2, lon=145.7), Position(lat=15.8, lon=146.2),
                Position(lat=15.2, lon=146.6), Position(lat=14.7, lon=146.0),
            ],
        ),
        UnitDef(
            id="b_ddg", name="USS Defender DDG-91", domain=Domain.sea, side=Side.blue,
            position=Position(lat=14.9, lon=145.5), speed=50.0,
            sensors=SensorConfig(detection_radius=100.0),
            weapons=WeaponConfig(range=50.0, damage=30.0),
            behavior=BehaviorType.patrol,
            waypoints=[
                Position(lat=14.9, lon=145.5), Position(lat=15.4, lon=145.9),
                Position(lat=15.0, lon=146.3), Position(lat=14.6, lon=145.8),
            ],
        ),
        UnitDef(
            id="b_cyber", name="Cyber Hub Alpha", domain=Domain.cyber, side=Side.blue,
            position=Position(lat=15.1, lon=145.65), speed=0.0,
            sensors=SensorConfig(detection_radius=250.0),
            weapons=WeaponConfig(range=150.0, damage=20.0),
            behavior=BehaviorType.defend,
        ),
        UnitDef(
            id="r_bomber", name="Tu-22M Backfire", domain=Domain.air, side=Side.red,
            position=Position(lat=17.2, lon=143.0), speed=600.0,
            sensors=SensorConfig(detection_radius=100.0),
            weapons=WeaponConfig(range=150.0, damage=50.0),
            behavior=BehaviorType.attack,
        ),
        UnitDef(
            id="r_frigate", name="PLA Frigate 530", domain=Domain.sea, side=Side.red,
            position=Position(lat=14.3, lon=147.8), speed=40.0,
            sensors=SensorConfig(detection_radius=80.0),
            weapons=WeaponConfig(range=60.0, damage=35.0),
            behavior=BehaviorType.attack,
        ),
        UnitDef(
            id="r_cyber", name="APT Phantom", domain=Domain.cyber, side=Side.red,
            position=Position(lat=16.8, lon=142.2), speed=0.0,
            sensors=SensorConfig(detection_radius=300.0),
            weapons=WeaponConfig(range=200.0, damage=15.0),
            behavior=BehaviorType.attack,
        ),
    ],
))

_reg(ScenarioDef(
    id="convoy_escort",
    name="Convoy Escort",
    description="Blue escort forces protect a cargo convoy through the Gulf of Aden against fast-attack and submarine threats.",
    map_bounds={"min_lat": 11.5, "max_lat": 17.5, "min_lon": 41.5, "max_lon": 47.5},
    time_step=10.0,
    duration=3600.0,
    units=[
        UnitDef(
            id="b_cargo1", name="MV Atlantic Star", domain=Domain.sea, side=Side.blue,
            position=Position(lat=14.0, lon=46.2), speed=18.0,
            sensors=SensorConfig(detection_radius=30.0),
            weapons=WeaponConfig(range=15.0, damage=8.0),
            behavior=BehaviorType.patrol,
            waypoints=[
                Position(lat=14.0, lon=46.2), Position(lat=14.2, lon=44.5),
                Position(lat=14.5, lon=43.0), Position(lat=14.8, lon=42.0),
            ],
        ),
        UnitDef(
            id="b_cargo2", name="MV Pacific Dawn", domain=Domain.sea, side=Side.blue,
            position=Position(lat=13.7, lon=46.2), speed=18.0,
            sensors=SensorConfig(detection_radius=30.0),
            weapons=WeaponConfig(range=15.0, damage=8.0),
            behavior=BehaviorType.patrol,
            waypoints=[
                Position(lat=13.7, lon=46.2), Position(lat=13.9, lon=44.5),
                Position(lat=14.2, lon=43.0), Position(lat=14.5, lon=42.0),
            ],
        ),
        UnitDef(
            id="b_escort", name="USS Sherman DDG-140", domain=Domain.sea, side=Side.blue,
            position=Position(lat=13.85, lon=46.3), speed=55.0,
            sensors=SensorConfig(detection_radius=120.0),
            weapons=WeaponConfig(range=70.0, damage=45.0),
            behavior=BehaviorType.intercept,
        ),
        UnitDef(
            id="b_p8", name="P-8 Poseidon", domain=Domain.air, side=Side.blue,
            position=Position(lat=15.0, lon=45.0), speed=600.0,
            sensors=SensorConfig(detection_radius=150.0),
            weapons=WeaponConfig(range=80.0, damage=40.0),
            behavior=BehaviorType.patrol,
            waypoints=[
                Position(lat=15.0, lon=45.0), Position(lat=14.5, lon=46.5),
                Position(lat=13.5, lon=46.0), Position(lat=13.0, lon=44.5),
                Position(lat=13.5, lon=43.0), Position(lat=15.0, lon=43.5),
            ],
        ),
        UnitDef(
            id="r_fa1", name="Fast Attack Craft-1", domain=Domain.sea, side=Side.red,
            position=Position(lat=13.2, lon=46.8), speed=70.0,
            sensors=SensorConfig(detection_radius=60.0),
            weapons=WeaponConfig(range=40.0, damage=50.0),
            behavior=BehaviorType.attack,
        ),
        UnitDef(
            id="r_fa2", name="Fast Attack Craft-2", domain=Domain.sea, side=Side.red,
            position=Position(lat=12.8, lon=45.9), speed=70.0,
            sensors=SensorConfig(detection_radius=60.0),
            weapons=WeaponConfig(range=40.0, damage=50.0),
            behavior=BehaviorType.attack,
        ),
        UnitDef(
            id="r_sub", name="Kilo-Class Submarine", domain=Domain.sea, side=Side.red,
            position=Position(lat=13.6, lon=44.8), speed=25.0,
            sensors=SensorConfig(detection_radius=80.0),
            weapons=WeaponConfig(range=30.0, damage=70.0),
            behavior=BehaviorType.intercept,
        ),
    ],
))
