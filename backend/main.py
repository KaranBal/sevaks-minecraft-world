"""FastAPI Google Cloud Backend for Sevak's Minecraft World (Cloud AI Edition).

Provides:
1. Cloud World Save & Load API (`/api/v1/world/save`, `/api/v1/world/load`) for cross-device world persistence.
2. Vertex AI Gemini 3D Voxel Architect (`/api/v1/ai/architect`) that transforms any spoken or typed prompt
   (e.g., "Build a Pirate Ship", "Build a Fire Station", "Build a Giant Robot", "Build a Dragon Keep")
   into a walkable 3D voxel blueprint (`[{dx, dy, dz, blockId}, ...]`), spoken Sevak-Bot voice narration,
   and a live code block.
3. Static hosting of the 60-FPS Three.js InstancedMesh 3D frontend.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sevak_minecraft_backend")

GCP_PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "")
GCP_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
CLOUD_SAVE_PATH = Path("/tmp/sevak_minecraft_cloud_world.json")

app = FastAPI(
    title="Sevak's Minecraft World — Google Cloud AI Architect & World Persistence API",
    version="4.0.0",
    description="Google Cloud Run + Vertex AI Gemini backend for Sevak's Minecraft World.",
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Valid Block IDs in Sevak's Minecraft World
VALID_BLOCK_IDS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18, 19, 20}

# In-memory + /tmp persistent cloud world state
_CLOUD_WORLD_STATE: Dict[str, Any] = {}
_genai_client = None


def get_genai_client():
    global _genai_client
    if _genai_client is not None:
        return _genai_client
    try:
        import asyncio
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.set_event_loop(asyncio.new_event_loop())
        from google import genai
        _genai_client = genai.Client(
            vertexai=True,
            project=GCP_PROJECT_ID,
            location=GCP_LOCATION,
        )
        return _genai_client
    except Exception as exc:
        logger.warning("Vertex AI genai client initialization fallback: %s", exc)
        return None


def _load_persisted_world() -> Dict[str, Any]:
    global _CLOUD_WORLD_STATE
    if _CLOUD_WORLD_STATE:
        return _CLOUD_WORLD_STATE
    if CLOUD_SAVE_PATH.exists():
        try:
            _CLOUD_WORLD_STATE = json.loads(CLOUD_SAVE_PATH.read_text())
            return _CLOUD_WORLD_STATE
        except Exception as exc:
            logger.warning("Failed reading cloud world file: %s", exc)
    return {}


def _save_persisted_world(payload: Dict[str, Any]) -> None:
    global _CLOUD_WORLD_STATE
    _CLOUD_WORLD_STATE = payload
    try:
        CLOUD_SAVE_PATH.write_text(json.dumps(payload))
    except Exception as exc:
        logger.warning("Failed writing cloud world file: %s", exc)


class WorldSaveRequest(BaseModel):
    v: int = 4
    ts: Optional[int] = None
    blocksBuiltCount: int = 0
    blocks: List[int] = Field(default_factory=list)
    quests: Dict[str, bool] = Field(default_factory=dict)
    coins: int = 0
    xp: int = 0
    level: int = 1
    upgrades: Dict[str, Any] = Field(default_factory=dict)
    kidName: str = "SEVAK"


class AIArchitectRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=200)
    kidName: str = "SEVAK"


# ---------------------------------------------------------------------------
# Server-Side Procedural Cloud Blueprints (Instant Walkable Kid Creations)
# ---------------------------------------------------------------------------

def _put_Map(bmap: Dict[tuple, int], dx: int, dy: int, dz: int, block_id: int) -> None:
    if -14 <= dx <= 14 and 0 <= dy <= 24 and -14 <= dz <= 14:
        if block_id == 0 or block_id in VALID_BLOCK_IDS:
            bmap[(int(dx), int(dy), int(dz))] = int(block_id)


def _map_to_sorted_blocks(bmap: Dict[tuple, int]) -> List[Dict[str, int]]:
    items = [
        {"dx": k[0], "dy": k[1], "dz": k[2], "blockId": v}
        for k, v in bmap.items()
    ]
    items.sort(key=lambda b: (0 if b["blockId"] == 0 else 1, b["dy"], b["dx"], b["dz"]))
    return items


def _build_pirate_ship() -> Dict[str, Any]:
    """Walkable 3D Pirate Ship with water moat, wood deck, captain cabin, sails, and TNT cannons."""
    bmap: Dict[tuple, int] = {}
    for x in range(-6, 7):
        for z in range(-4, 5):
            for y in range(1, 13):
                _put_Map(bmap, x, y, z, 0)
            # Water around the hull
            _put_Map(bmap, x, 0, z, 18)

    # Wooden hull & walkable deck
    for x in range(-5, 6):
        half_w = 2 if abs(x) < 4 else (1 if abs(x) == 4 else 0)
        for z in range(-half_w, half_w + 1):
            _put_Map(bmap, x, 1, z, 13)  # Dark oak bottom hull
            _put_Map(bmap, x, 2, z, 2)   # Walkable wood plank deck
            if z == -half_w or z == half_w or abs(x) == 5:
                _put_Map(bmap, x, 3, z, 13)  # Ship railings

    # Boarding gangplank at front (z = 2..4, x = 0)
    for z in range(2, 5):
        _put_Map(bmap, 0, 1, z, 2)
        _put_Map(bmap, 0, 2, z, 2)
    _put_Map(bmap, 0, 3, 2, 0)  # Open entry onto deck

    # Captain's Treasure Cabin at stern (x = 3..4)
    _put_Map(bmap, 3, 3, 0, 11)  # Diamond treasure chest
    _put_Map(bmap, 4, 3, 0, 6)   # Captain's Glow Lantern
    # Fun TNT Pirate Cannons on deck sides
    _put_Map(bmap, -2, 3, 2, 20)
    _put_Map(bmap, 2, 3, 2, 20)

    # Tall Mast & White/Gold Sails
    for y in range(3, 11):
        _put_Map(bmap, 0, y, 0, 13)
    for y in range(5, 10):
        for x in range(-3, 4):
            if x != 0:
                _put_Map(bmap, x, y, 0, 6 if (x + y) % 2 == 0 else 1)
    # Crow's nest & diamond beacon on top
    _put_Map(bmap, 0, 11, 0, 11)

    return {
        "title": "🏴‍☠️ Walkable Pirate Treasure Ship",
        "speech": "Ahoy! Sevak-Bot built a walkable Pirate Galleon on Google Cloud! Climb up to the crow's nest to claim the rooftop treasure!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildPirateShip",
        "codeArg": "🏴‍☠️ SEVAK_GALLEON",
        "explanation": "🏴‍☠️ Sevak-Bot engineered a Pirate Ship! Climb the wooden gangplank and mast to reach the top beacon!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_fire_station() -> Dict[str, Any]:
    """Walkable Red Brick Fire Station with open garage bay, parked Fire Truck, siren lanterns, and Cozy Bed."""
    bmap: Dict[tuple, int] = {}
    for x in range(-5, 6):
        for z in range(-5, 6):
            for y in range(1, 10):
                _put_Map(bmap, x, y, z, 0)

    # Cobblestone driveway & Fire Station floor
    for x in range(-4, 5):
        for z in range(-4, 5):
            _put_Map(bmap, x, 0, z, 9)
            if (x in (-4, 4) or z in (-4, 4)) and not (z == 4 and -2 <= x <= 2):
                for y in range(1, 5):
                    _put_Map(bmap, x, y, z, 1)  # Bright red fire station walls

    # Side walk-in door & windows
    _put_Map(bmap, 4, 1, 0, 5)
    _put_Map(bmap, 4, 2, 0, 0)
    _put_Map(bmap, -4, 2, 0, 4)
    _put_Map(bmap, -4, 3, 0, 4)

    # Roof & flashing siren lanterns
    for x in range(-4, 5):
        for z in range(-4, 5):
            _put_Map(bmap, x, 5, z, 3)
    _put_Map(bmap, -3, 6, 4, 6)
    _put_Map(bmap, 0, 6, 4, 11)
    _put_Map(bmap, 3, 6, 4, 6)
    _put_Map(bmap, 0, 4, 0, 6)

    # Parked Red Fire Truck inside/front of garage (x = -1..1, z = 0..4)
    for x in range(-1, 2):
        for z in range(0, 4):
            _put_Map(bmap, x, 1, z, 1)
    _put_Map(bmap, -1, 2, 3, 4)  # Windshield
    _put_Map(bmap, 0, 2, 3, 4)
    _put_Map(bmap, 1, 2, 3, 4)
    _put_Map(bmap, 0, 2, 1, 6)   # Fire truck siren light
    _put_Map(bmap, -3, 1, -3, 7) # Firefighter cozy bed
    _put_Map(bmap, 3, 1, -3, 19) # Fire alarm jukebox

    return {
        "title": "🚒 Sevak Rescue Station & Fire Truck",
        "speech": "Sevak-Bot and Google Cloud AI deployed Rescue Station 1 with an armored Fire Engine inside!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildFireStation",
        "codeArg": "🚒 SEVAK_RESCUE_1",
        "explanation": "🚒 Enter the open garage bay or climb onto the roof to collect the high-altitude coins!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_giant_robot() -> Dict[str, Any]:
    """Giant Diamond & Gold Mecha Robot with bouncy slime jet-boots and glowing eyes."""
    bmap: Dict[tuple, int] = {}
    for x in range(-5, 6):
        for z in range(-4, 5):
            for y in range(1, 14):
                _put_Map(bmap, x, y, z, 0)

    # Bouncy Slime Jet Boots
    for x in (-2, -1, 1, 2):
        _put_Map(bmap, x, 1, 0, 12)
        for y in range(2, 5):
            _put_Map(bmap, x, y, 0, 9)

    # Diamond Armor Torso with Disco Heart Core
    for x in range(-2, 3):
        for z in range(-1, 2):
            for y in range(5, 9):
                _put_Map(bmap, x, y, z, 11)
    _put_Map(bmap, 0, 7, 1, 19)  # Interactive Disco Jukebox Chest Core!
    _put_Map(bmap, 0, 6, 1, 6)   # Glowing power core

    # Robot Arms with Laser Hands
    for y in range(5, 9):
        _put_Map(bmap, -3, y, 0, 9)
        _put_Map(bmap, 3, y, 0, 9)
    _put_Map(bmap, -3, 5, 1, 6)
    _put_Map(bmap, 3, 5, 1, 6)

    # Robot Head & Glowing Eyes + Antenna
    for x in range(-1, 2):
        for z in range(-1, 2):
            for y in range(9, 12):
                _put_Map(bmap, x, y, z, 11)
    _put_Map(bmap, -1, 10, 1, 6)  # Left glowing eye
    _put_Map(bmap, 1, 10, 1, 6)   # Right glowing eye
    _put_Map(bmap, 0, 12, 0, 3)   # Antenna mast
    _put_Map(bmap, 0, 13, 0, 6)   # Antenna beacon

    return {
        "title": "🤖 Sevak Mecha-Titan Robot",
        "speech": "Sevak-Bot and Google Cloud Vertex AI engineered the 13-block Diamond Mecha-Titan! Bounce off its slime jet-boots to reach the top!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildGiantRobot",
        "codeArg": "🤖 SEVAK_MECHA_XL",
        "explanation": "🤖 Parkour challenge: Jump on the green Slime Jet-Boots to launch up to the Mecha-Titan's head at Y=13!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_pizza_ice_cream_shop() -> Dict[str, Any]:
    """Walkable Pizza & Ice Cream Parlor with colorful striped roof, counter, jukebox, and books."""
    bmap: Dict[tuple, int] = {}
    for x in range(-4, 5):
        for z in range(-4, 5):
            for y in range(1, 9):
                _put_Map(bmap, x, y, z, 0)

    for x in range(-3, 4):
        for z in range(-3, 4):
            _put_Map(bmap, x, 0, z, 2)
            on_edge = x in (-3, 3) or z in (-3, 3)
            if on_edge:
                for y in range(1, 4):
                    if z == 3 and x == 0 and y in (1, 2):
                        continue
                    if y == 2 and (abs(x) == 2 or abs(z) == 2):
                        _put_Map(bmap, x, y, z, 4)  # Big shop windows
                    else:
                        _put_Map(bmap, x, y, z, 1 if (x + z) % 2 == 0 else 6)

    # Front Door
    _put_Map(bmap, 0, 1, 3, 5)
    # Colorful Ice Cream Striped Roof & Giant Cone Topper
    for x in range(-4, 5):
        for z in range(-4, 5):
            _put_Map(bmap, x, 4, z, 11 if x % 2 == 0 else 19)
    _put_Map(bmap, 0, 5, 0, 2)
    _put_Map(bmap, 0, 6, 0, 6)
    _put_Map(bmap, 0, 7, 0, 1)  # Cherry on top!

    # Interior Counter, Jukebox & Cozy Seating
    _put_Map(bmap, -1, 1, -1, 19)
    _put_Map(bmap, 0, 1, -1, 8)
    _put_Map(bmap, 1, 1, -1, 6)
    _put_Map(bmap, -2, 1, 1, 7)

    return {
        "title": "🍕 Sevak's Arcade & Pizza HQ",
        "speech": "Sevak-Bot built Sevak's Arcade and Pizza HQ! Open the front door or climb to the rooftop tower!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildShop",
        "codeArg": "🍕 SEVAK_PIZZA_HQ",
        "explanation": "🍕 Enter the front door to check out the interior counter and jukebox, or climb the roof!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_pyramid_treasure() -> Dict[str, Any]:
    """Walkable Golden Pyramid with secret doorway, glowing interior chamber, bed, and diamond altar."""
    bmap: Dict[tuple, int] = {}
    for x in range(-6, 7):
        for z in range(-6, 7):
            for y in range(1, 9):
                _put_Map(bmap, x, y, z, 0)

    for y in range(1, 7):
        r = 6 - y
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                on_shell = abs(x) == r or abs(z) == r
                if on_shell:
                    _put_Map(bmap, x, y, z, 11 if y == 6 else (6 if (x + z + y) % 3 == 0 else 3))

    # Front Doorway into the secret chamber
    _put_Map(bmap, 0, 1, 5, 5)
    _put_Map(bmap, 0, 2, 5, 0)
    _put_Map(bmap, 0, 2, 4, 0)
    # Interior Treasure Chamber
    _put_Map(bmap, 0, 1, 0, 11)
    _put_Map(bmap, 0, 2, 0, 6)
    _put_Map(bmap, -2, 1, -1, 7)
    _put_Map(bmap, 2, 1, -1, 8)
    _put_Map(bmap, 0, 1, -2, 19)

    return {
        "title": "🏜️ Sevak's Golden Pharaoh Pyramid",
        "speech": "Sevak-Bot built the Golden Pharaoh Pyramid! Climb the stepped tiers to the apex or unlock the hidden tomb door!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildPyramid",
        "codeArg": "🏜️ SEVAK_PYRAMID",
        "explanation": "🏜️ Climb all 6 stepped tiers of the Pyramid to claim the apex treasure, or enter the hidden chamber!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_soccer_stadium() -> Dict[str, Any]:
    """Walkable Mini Soccer Pitch with two diamond/glass goals, bouncy corner trampolines, and stadium floodlights."""
    bmap: Dict[tuple, int] = {}
    for x in range(-6, 7):
        for z in range(-5, 6):
            for y in range(1, 8):
                _put_Map(bmap, x, y, z, 0)
            _put_Map(bmap, x, 0, z, 10)

    # White/Diamond center line & bouncy corner pads
    for z in range(-4, 5):
        _put_Map(bmap, 0, 0, z, 11)
    for cx in (-5, 5):
        for cz in (-4, 4):
            _put_Map(bmap, cx, 1, cz, 12)
            _put_Map(bmap, cx, 2, cz, 6)

    # Left & Right Soccer Goals (x = -6 and x = 6, z = -2..2)
    for gx in (-6, 6):
        for z in range(-2, 3):
            for y in range(1, 4):
                if abs(z) == 2 or y == 3:
                    _put_Map(bmap, gx, y, z, 11)
                else:
                    _put_Map(bmap, gx + (-1 if gx < 0 else 1), y, z, 4)

    # Soccer Ball in center
    _put_Map(bmap, 0, 1, 0, 19)

    return {
        "title": "⚽ Sevak Champions Soccer Arena",
        "speech": "GOAL! Sevak-Bot engineered the Sevak Champions Soccer Arena with diamond goals and corner jump pads!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildStadium",
        "codeArg": "⚽ SEVAK_ARENA",
        "explanation": "⚽ Sprint across the pitch, score in the Diamond Goals, or launch off the corner jump pads!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_rollercoaster() -> Dict[str, Any]:
    """Walkable 3D Neon Rainbow Rollercoaster & Trampoline Sky Loop with Launch Pad."""
    bmap: Dict[tuple, int] = {}
    for x in range(-7, 8):
        for z in range(-4, 5):
            for y in range(1, 13):
                _put_Map(bmap, x, y, z, 0)

    palette = [1, 6, 12, 11, 19]
    for idx, x in enumerate(range(-6, 7)):
        h = 1 + int(round((1 - (abs(x) / 6.5) ** 2) * 8))
        col = palette[idx % len(palette)]
        for z in (-1, 0, 1):
            _put_Map(bmap, x, h, z, 12 if z == 0 else col)
        # Support pillars & glow rails
        if x in (-6, -3, 0, 3, 6):
            for y in range(1, h):
                _put_Map(bmap, x, y, -1, 11)
                _put_Map(bmap, x, y, 1, 11)
        _put_Map(bmap, x, h + 1, -1, 6)
        _put_Map(bmap, x, h + 1, 1, 6)

    # Bouncy Slime Launch Pads at both ends
    for end_x in (-7, 7):
        for z in (-1, 0, 1):
            _put_Map(bmap, end_x, 1, z, 12)

    return {
        "title": "🎢 Sevak Sky-Loop Coaster",
        "speech": "Sevak-Bot engineered the Sky-Loop Rollercoaster! Use the green slime launch pads to parkour to the 10-block summit!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildCoaster",
        "codeArg": "🎢 SEVAK_COASTER",
        "explanation": "🎢 Parkour challenge: Bounce from the Slime Launch Pads up to the top of the arch to pass the Skyscraper Challenge!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _build_dragon_castle() -> Dict[str, Any]:
    """Walkable Dragon Lava Keep with glowing gold towers, dragon head spire, treasure room, and Super TNT."""
    bmap: Dict[tuple, int] = {}
    for x in range(-5, 6):
        for z in range(-5, 6):
            for y in range(1, 13):
                _put_Map(bmap, x, y, z, 0)
            _put_Map(bmap, x, 0, z, 9)

    for x in range(-4, 5):
        for z in range(-4, 5):
            if x in (-4, 4) or z in (-4, 4):
                for y in range(1, 6):
                    _put_Map(bmap, x, y, z, 3 if (x + y + z) % 2 == 0 else 9)
                if (x + z) % 2 == 0:
                    _put_Map(bmap, x, 6, z, 6)

    # 4 Glowing Dragon Spire Towers
    for tx in (-4, 4):
        for tz in (-4, 4):
            for y in range(1, 9):
                _put_Map(bmap, tx, y, tz, 1)
            _put_Map(bmap, tx, 9, tz, 6)
            _put_Map(bmap, tx, 10, tz, 11)

    # Walk-in Dragon Gate at z=4, x=0
    _put_Map(bmap, 0, 1, 4, 5)
    _put_Map(bmap, 0, 2, 4, 0)
    _put_Map(bmap, -1, 3, 4, 6)
    _put_Map(bmap, 1, 3, 4, 6)

    # Dragon Throne & Treasure Inside
    _put_Map(bmap, 0, 1, -2, 11)
    _put_Map(bmap, 0, 2, -2, 6)
    _put_Map(bmap, -2, 1, -2, 19)
    _put_Map(bmap, 2, 1, -2, 7)
    _put_Map(bmap, 0, 1, 1, 20)

    return {
        "title": "🐉 Sevak's Dragon Keep",
        "speech": "Sevak-Bot constructed Sevak's Dragon Keep with 10-block spire towers, a diamond throne room, and TNT charges!",
        "codeActor": "🤖 SEVAK_BOT",
        "codeVerb": "buildDragonKeep",
        "codeArg": "🐉 SEVAK_DRAGON_KEEP",
        "explanation": "🐉 Breach the front gate or build stairs up to the 10-block Dragon Spire Towers to collect rooftop treasure!",
        "blocks": _map_to_sorted_blocks(bmap),
    }


def _match_curated_cloud_blueprint(prompt: str) -> Optional[Dict[str, Any]]:
    p = prompt.lower().strip()
    if any(w in p for w in ("pirate", "ship", "boat", "galleon", "sail")):
        return _build_pirate_ship()
    if any(w in p for w in ("fire", "truck", "station", "ambulance", "police", "rescue")):
        return _build_fire_station()
    if any(w in p for w in ("robot", "mecha", "transformer", "iron", "bot")):
        return _build_giant_robot()
    if any(w in p for w in ("pizza", "ice cream", "shop", "store", "cafe", "bakery", "restaurant")):
        return _build_pizza_ice_cream_shop()
    if any(w in p for w in ("pyramid", "egypt", "tomb", "temple", "treasure")):
        return _build_pyramid_treasure()
    if any(w in p for w in ("soccer", "stadium", "football", "goal", "arena", "sports")):
        return _build_soccer_stadium()
    if any(w in p for w in ("coaster", "roller", "park", "ride")):
        return _build_rollercoaster()
    if any(w in p for w in ("dragon", "dungeon", "fortress")):
        return _build_dragon_castle()
    return None


def _call_vertex_gemini_architect(prompt: str, kid_name: str) -> Optional[Dict[str, Any]]:
    """Calls Google Cloud Vertex AI Gemini (`gemini-2.5-flash`) to design a custom 3D voxel structure."""
    client = get_genai_client()
    if client is None:
        return None

    system_instruction = f"""You are Sevak-Bot, the 3D Voxel Master Architect on Google Cloud Vertex AI for {kid_name} in Sevak's Minecraft World.
Design an impressive, walkable 3D voxel creation for: "{prompt}".

Use 3 to 7 3D boxes in "boxes" plus optional single blocks in "blocks".
Each entry in "boxes" is: [x1, y1, z1, x2, y2, z2, blockId, hollow]
- x1..x2 in -4..4, y1..y2 in 1..10, z1..z2 in -4..4 (z=4 is the front facing the player).
- hollow: 1 for hollow walls/room, 0 for solid fill.
- Put a Front Door (blockId=5) in "blocks" at [0, 1, 4, 5] if it's a building/fortress!

Block IDs:
1=Red Brick, 2=Wood Planks, 3=Roof Tile, 4=Glass Window, 5=Front Door, 6=Glow Lantern, 7=Cozy Bed, 8=Bookshelf, 9=Cobblestone, 11=Diamond, 12=Slime Trampoline, 13=Oak Log, 14=Green Leaves, 18=Water, 19=Disco Jukebox, 20=Super TNT.

Return strictly valid JSON (no comments):
{{
  "title": "Emoji + Short Title",
  "speech": "1 energetic engineer sentence spoken to {kid_name} by Sevak-Bot!",
  "codeVerb": "camelCaseVerb",
  "codeArg": "UPPERCASE_NAME",
  "explanation": "1 short tip on how to explore or climb it!",
  "boxes": [
    [-3, 1, -3, 3, 4, 3, 1, 1],
    [-3, 5, -3, 3, 5, 3, 3, 0]
  ],
  "blocks": [
    [0, 1, 3, 5],
    [0, 1, 0, 19],
    [-2, 1, -2, 7],
    [0, 6, 0, 6]
  ]
}}"""

    try:
        from google.genai import types
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"Design 3D voxel creation for {kid_name}: {prompt}",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        raw_text = (response.text or "").strip()
        raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
        raw_text = re.sub(r"\s*```$", "", raw_text)
        # Strip any JS-style // comments or trailing commas before ] or }
        raw_text = re.sub(r"//.*", "", raw_text)
        raw_text = re.sub(r",\s*([\]}])", r"\1", raw_text)
        parsed = json.loads(raw_text)

        bmap: Dict[tuple, int] = {}
        for x in range(-5, 6):
            for z in range(-5, 6):
                for y in range(1, 12):
                    _put_Map(bmap, x, y, z, 0)

        valid_count = 0
        for box in parsed.get("boxes", []):
            if isinstance(box, (list, tuple)) and len(box) >= 7:
                x1, y1, z1, x2, y2, z2, bid = [int(v) for v in box[:7]]
                hollow = bool(box[7]) if len(box) >= 8 else False
                if bid not in VALID_BLOCK_IDS:
                    bid = 11
                xa, xb = max(-5, min(x1, x2)), min(5, max(x1, x2))
                ya, yb = max(1, min(y1, y2)), min(11, max(y1, y2))
                za, zb = max(-5, min(z1, z2)), min(5, max(z1, z2))
                for x in range(xa, xb + 1):
                    for y in range(ya, yb + 1):
                        for z in range(za, zb + 1):
                            if hollow and (xa < x < xb) and (za < z < zb) and (y < yb):
                                _put_Map(bmap, x, y, z, 0)
                            else:
                                _put_Map(bmap, x, y, z, bid)
                                valid_count += 1

        for b in parsed.get("blocks", []):
            if isinstance(b, (list, tuple)) and len(b) >= 4:
                dx = max(-5, min(5, int(b[0])))
                dy = max(1, min(11, int(b[1])))
                dz = max(-5, min(5, int(b[2])))
                bid = int(b[3])
            elif isinstance(b, dict):
                dx = max(-5, min(5, int(b.get("dx", 0))))
                dy = max(1, min(11, int(b.get("dy", 1))))
                dz = max(-5, min(5, int(b.get("dz", 0))))
                bid = int(b.get("blockId", 1))
            else:
                continue
            if bid != 0 and bid not in VALID_BLOCK_IDS:
                bid = 11
            _put_Map(bmap, dx, dy, dz, bid)
            if bid == 5:
                # Carve empty air above front door so player can walk inside
                _put_Map(bmap, dx, dy + 1, dz, 0)
            valid_count += 1

        if valid_count < 8:
            return None

        return {
            "title": str(parsed.get("title") or f"✨ {prompt.title()}")[:42],
            "speech": str(parsed.get("speech") or f"Nice design {kid_name}! Sevak-Bot engineered your {prompt} on Google Cloud!"),
            "codeActor": "🤖 SEVAK_BOT",
            "codeVerb": str(parsed.get("codeVerb") or "generate3D"),
            "codeArg": str(parsed.get("codeArg") or prompt.upper().replace(" ", "_")[:18]),
            "explanation": str(parsed.get("explanation") or f"☁️ Engineered live by Sevak-Bot & Google Cloud Vertex AI ({GEMINI_MODEL})!"),
            "blocks": _map_to_sorted_blocks(bmap),
            "ai_engine": f"vertex-ai-{GEMINI_MODEL}",
        }
    except Exception as exc:
        logger.warning("Vertex AI Gemini generation fallback for '%s': %s", prompt, exc)
        return None


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/v1/health")
def health_check():
    world = _load_persisted_world()
    return {
        "status": "ok",
        "service": "sevak-minecraft-world",
        "gcp_project": GCP_PROJECT_ID,
        "region": GCP_LOCATION,
        "gemini_model": GEMINI_MODEL,
        "vertex_ai_enabled": True,
        "cloud_world_saved": bool(world),
        "saved_blocks_len": len(world.get("blocks", [])) // 4 if world else 0,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/ai/presets")
def list_cloud_ai_presets():
    return {
        "presets": [
            {"id": "pirate_ship", "label": "🏴‍☠️ Pirate Ship", "prompt": "Build a Pirate Treasure Ship"},
            {"id": "fire_station", "label": "🚒 Fire Station", "prompt": "Build a Fire Station and Fire Truck"},
            {"id": "giant_robot", "label": "🤖 Giant Robot", "prompt": "Build a Giant Diamond Mecha Robot"},
            {"id": "pizza_shop", "label": "🍕 Pizza & Arcade", "prompt": "Build Sevak's Pizza and Arcade HQ"},
            {"id": "pyramid", "label": "🏜️ Golden Pyramid", "prompt": "Build a Secret Golden Treasure Pyramid"},
            {"id": "soccer_stadium", "label": "⚽ Soccer Stadium", "prompt": "Build a Champions Soccer Stadium"},
        ]
    }


@app.post("/api/v1/world/save")
def save_world_to_cloud(req: WorldSaveRequest):
    payload = {
        "v": req.v,
        "ts": req.ts or int(datetime.now(timezone.utc).timestamp() * 1000),
        "blocksBuiltCount": req.blocksBuiltCount,
        "blocks": req.blocks,
        "quests": req.quests,
        "coins": req.coins,
        "xp": req.xp,
        "level": req.level,
        "upgrades": req.upgrades,
        "kidName": req.kidName,
        "savedAtIso": datetime.now(timezone.utc).isoformat(),
    }
    _save_persisted_world(payload)
    return {
        "status": "saved",
        "gcp_project": GCP_PROJECT_ID,
        "blocks_count": len(req.blocks) // 4,
        "coins": req.coins,
        "level": req.level,
        "kidName": req.kidName,
        "savedAtIso": payload["savedAtIso"],
    }


@app.get("/api/v1/world/load")
def load_world_from_cloud():
    world = _load_persisted_world()
    if not world or not world.get("blocks"):
        return {"status": "empty", "world": None}
    return {"status": "loaded", "world": world}


@app.post("/api/v1/ai/architect")
def generate_cloud_3d_structure(req: AIArchitectRequest):
    prompt = req.prompt.strip()
    kid_name = (req.kidName or "SEVAK").strip().upper()[:12]

    # 1. Check curated high-precision walkable cloud blueprints first for instant (<50ms) zero-latency builds
    curated = _match_curated_cloud_blueprint(prompt)
    if curated is not None:
        return {
            **curated,
            "ai_engine": "gcp-cloud-architect-blueprint",
            "gcp_project": GCP_PROJECT_ID,
        }

    # 2. Call Vertex AI Gemini (`gemini-2.5-flash`) for any open-ended imagination prompt!
    gemini_result = _call_vertex_gemini_architect(prompt, kid_name)
    if gemini_result is not None:
        return {
            **gemini_result,
            "gcp_project": GCP_PROJECT_ID,
        }

    # 3. Deterministic fallback (Sevak Mecha-Titan Robot)
    fallback = _build_giant_robot()
    fallback["title"] = f"✨ {prompt.title()[:28]}"
    fallback["speech"] = f"Nice design {kid_name}! Sevak-Bot engineered your custom {prompt} on Google Cloud!"
    return {
        **fallback,
        "ai_engine": "gcp-cloud-fallback-architect",
        "gcp_project": GCP_PROJECT_ID,
    }


# ---------------------------------------------------------------------------
# Static Frontend Hosting (Serves index.html, styles.css, *.js at `/`)
# ---------------------------------------------------------------------------

FRONTEND_DIR = Path(__file__).parent.parent.resolve()
ALLOWED_STATIC_FILES = {
    "index.html",
    "styles.css",
    "audio.js",
    "textures.js",
    "structures.js",
    "entities.js",
    "world.js",
    "main.js",
}


@app.get("/")
async def serve_index():
    return FileResponse(
        str(FRONTEND_DIR / "index.html"),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )


@app.get("/{file_path:path}")
async def serve_static_assets(file_path: str):
    if file_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    clean_name = Path(file_path).name
    if clean_name in ALLOWED_STATIC_FILES and (FRONTEND_DIR / clean_name).is_file():
        return FileResponse(
            str(FRONTEND_DIR / clean_name),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
        )
    return FileResponse(
        str(FRONTEND_DIR / "index.html"),
        headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"},
    )
