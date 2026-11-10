# 👑 Sevak's Minecraft World

**Sevak's Minecraft World** is an interactive 3D voxel engineering, parkour, and AI-assisted world-building game playable directly in the browser on **Desktop/Laptop** and **iPhone/iPad** (60 FPS WebGL via Three.js `InstancedMesh` + FastAPI & Gemini Cloud AI Architect backend).

### 🌐 Play Live in Browser (Zero Login Required)
- **Primary Link:** [https://sevak.minecraft.223ac698.nip.io](https://sevak.minecraft.223ac698.nip.io)
- **Mirror Link:** [https://sevak.minecraft.34-58-198-152.sslip.io](https://sevak.minecraft.34-58-198-152.sslip.io)

---

## ✨ Key Highlights

### 1. 🏰 Sevak's Starter Fortress, 3D Monument & 10-Block Parkour Tower
- **3D `"SEVAK"` Diamond & Gold Monument:** Towering 3D voxel monument overlooking the north horizon.
- **10-Block Parkour & Skyscraper Challenge Tower:** Spiral parkour jump steps, a mid-tower Slime bounce pad, and a `Y=10` glowing Diamond summit platform loaded with high-altitude Gold Coins.
- **Walkable Base & Backyard:** Open/close doors, toggle Daylight vs. Night Ops mode on the Base Bunk, play 8-bit synth beats on the Jukebox, bounce on the Slime Trampoline, or ignite undo-safe Super TNT (`Press Z` to undo).

### 2. ⚔️ Skill-Based Progression & Master Challenges
Players start at **Level 1 (`0 🪙`, `0 XP`)** and earn Gold Coins, XP, and Armory Upgrades through genuine building mastery, parkour, and timed challenges:
1. **`🧱 Master Mason (40 Blocks)`** — Hand-craft 40 blocks (`+60 🪙`), plus earn **`+30 🪙 Engineering Milestones`** every 25 hand-built blocks.
2. **`🏔️ Sky Climber (Reach Y=10 No-Fly)`** — Climb or parkour to altitude `Y ≥ 10` without using Jetpack Fly (`+75 🪙`).
3. **`⏱️ Win a 30s Timed Blitz`** — Beat either the **30-Second Speed-Build Blitz** (*place 25 blocks in 30s*) or the **35-Second Parkour Coin Rush** (*collect 8 obstacle coins in 35s*) (`+100 🪙`).
4. **`🪙 Treasure Hunter (12 Coins)`** — Scale rooftops, towers, and trampolines to collect 12 high-altitude Gold Coins (`+80 🪙`).
5. **`🦖 T-Rex Roof Jump (Reach Y≥4)`** — Mount the Giant T-Rex and mega-jump onto a roof or platform (`+75 🪙`).
6. **`🏰 Empire Builder (3 Bases + 20 Blocks)`** — Deploy 3 major structures and customize them with 20+ hand-built blocks (`+100 🪙`).

### 3. ⚡ Sevak's Upgrade Armory
Spend earned Gold Coins to unlock and toggle 6 game-changing upgrades:
- **🏰 5×5 Mega Brush (`60 🪙`)** — Build 25 blocks in a single click.
- **🌙 Moon Bounce Boots (`100 🪙`)** — Super-high low-gravity jumps on any block.
- **🤖 Golden Sevak-Bot 2.5× (`140 🪙`)** — Upgrades the 3D AI companion drone to solid gold with 2.5× turbo laser construction speed.
- **🌈 Rainbow Trail (`180 🪙`)** — Spawns sparkling rainbow stars and gold particles as you run or fly.
- **👑 Diamond Crown (`220 🪙`)** — Equips a glowing 3D Royal Diamond Crown on your character (visible in 3rd-Person camera).
- **🧲 Super Magnet (`260 🪙`)** — Automatically pulls nearby Gold Coins from 12 blocks away.

### 4. 🤖 Sevak-Bot Cloud AI Architect & Visual Code Lab
- Type or speak any prompt (e.g., *"Build a Dragon Castle"*, *"Build a Pirate Ship"*, *"Build a Giant Robot"*, *"Build a Rollercoaster"*, *"Build a Soccer Stadium"*) and watch **Sevak-Bot** fly over and construct it block-by-block with a 3D laser beam, placing **Rooftop Treasure Coins** on the highest peaks.
- Every action updates a live, interactive code snippet in the **Live Code View** so players see how 3D games work under the hood.

### 5. 📱 Full iPhone, iPad & Laptop Controls
- **iPhone / iPad Touch Controls:**
  - **Left Thumb:** 360° Virtual Analog Thumbstick (drag to walk & turn smoothly, quick-tap to glide 4 blocks, or toggle `🏃 AUTO-WALK`).
  - **Right Thumb Action Pad:** `⬆️ WALK`, `🧱 BUILD`, `⛏️ BREAK`, `🦖 RIDE`, `🟢 JUMP`, `⬇️ DOWN`.
  - **1-Tap Quick-Travel Bar (`Go To:`):** Instantly jump to `🏔️ Parkour Tower`, `🚪 Base Door`, `🛋️ Inside`, `🦖 Ride T-Rex`, `🟢 Bounce`, or `🚁 Sky Fly`.
  - **Tap-to-Walk Mode (`👣 Walk Here`):** Tap any ground or floor block to auto-walk directly there.
- **Laptop / Desktop Controls:**
  - **Move:** `W A S D` or `Arrow Keys`
  - **Jump / Fly:** `Space` (Jump) · `F` (Toggle Jetpack Fly) · `R` (Ride Pet / T-Rex) · `V` (1st / 3rd Person Camera)
  - **Build / Break / Undo:** `Left-Click` or `B` (Build / Interact) · `Right-Click` or `X` (Break) · `Z` (Undo)

---

## 🛠️ Local Development & Deployment

### Run Locally with Python (FastAPI)
```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8080
```
Then open [http://localhost:8080](http://localhost:8080).

### Run with Docker
```bash
docker build -t sevaks-minecraft-world .
docker run -p 8080:8080 sevaks-minecraft-world
```

### Deploy to Google Cloud Run
```bash
./deploy_gcp.sh <YOUR_GCP_PROJECT_ID>
```
