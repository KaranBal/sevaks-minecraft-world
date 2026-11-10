// High-Performance 60-FPS Voxel World Engine
// Uses THREE.InstancedMesh (1 draw call per block type!) + Multi-Face UV Atlas + Exact 3D Voxel DDA Raycasting + Undo Stack + localStorage Auto-Save!

class VoxelWorld {
  static STORAGE_KEY = 'sevak_minecraft_world_v5';

  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map(); // "x,y,z" -> { x, y, z, blockId, instanceIndex }
    this.maxInstancesPerType = 12000;
    this.boxGeom = new THREE.BoxGeometry(1, 1, 1);
    this.dummy = new THREE.Object3D();

    this.pools = {};
    this.initInstancedPools();

    // Undo History Stack
    this.undoStack = [];
    this.currentBatch = null;

    // Animated House Builder Queue + Bit-Bot Laser Target
    this.buildQueue = [];
    this.lastBuiltBlock = null;
    this.onBuildComplete = null;
    this.blocksBuiltCount = 0;

    // Drifting Sky Clouds
    this.cloudsGroup = new THREE.Group();
    this.scene.add(this.cloudsGroup);
    this.createClouds();
  }

  initInstancedPools() {
    for (const b of window.BLOCK_TYPES) {
      const mat = window.textureFactory.getMaterial(b.id);
      const geom = window.textureFactory.multiFaceIds.has(b.id)
        ? window.textureFactory.atlasBoxGeom
        : this.boxGeom;
      const instMesh = new THREE.InstancedMesh(geom, mat, this.maxInstancesPerType);
      instMesh.count = 0;
      instMesh.castShadow = !b.transparent;
      instMesh.receiveShadow = true;
      instMesh.frustumCulled = false;
      this.scene.add(instMesh);

      this.pools[b.id] = {
        mesh: instMesh,
        count: 0,
        keysByIndex: []
      };
    }
  }

  key(x, y, z) {
    return `${x},${y},${z}`;
  }

  getBlock(x, y, z) {
    return this.blocks.get(this.key(x, y, z)) || null;
  }

  isSolid(x, y, z) {
    const b = this.getBlock(x, y, z);
    if (!b) return false;
    const info = window.textureFactory.getBlockInfo(b.blockId);
    return !info.nonSolid;
  }

  // Check if there is a roof/ceiling block within 1..8 blocks above (x, y, z)
  hasRoofAbove(x, y, z) {
    const ix = Math.round(x);
    const iy = Math.floor(y + 1);
    const iz = Math.round(z);
    for (let checkY = iy + 1; checkY <= iy + 8; checkY++) {
      if (this.isSolid(ix, checkY, iz)) return true;
    }
    return false;
  }

  beginUndoBatch() {
    this.currentBatch = new Map();
  }

  commitUndoBatch() {
    if (this.currentBatch && this.currentBatch.size > 0) {
      this.undoStack.push(Array.from(this.currentBatch.values()));
      if (this.undoStack.length > 40) {
        this.undoStack.shift();
      }
    }
    this.currentBatch = null;
  }

  recordUndo(x, y, z, prevBlockId) {
    if (!this.currentBatch) return;
    const k = this.key(x, y, z);
    if (!this.currentBatch.has(k)) {
      this.currentBatch.set(k, { x, y, z, prevBlockId });
    }
  }

  undoLastAction() {
    if (this.undoStack.length === 0) return false;
    const lastBatch = this.undoStack.pop();
    const prevBatch = this.currentBatch;
    this.currentBatch = null;

    for (const item of lastBatch) {
      if (item.prevBlockId === 0) {
        this.removeBlock(item.x, item.y, item.z);
      } else {
        this.setBlock(item.x, item.y, item.z, item.prevBlockId);
      }
    }
    this.currentBatch = prevBatch;
    window.soundEngine.playUndo();
    return true;
  }

  computeMatrixForBlock(x, y, z, blockId) {
    if (blockId === 18) {
      this.dummy.position.set(x - 0.4, y, z + 0.35);
      this.dummy.scale.set(0.18, 1.0, 0.95);
    } else {
      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(1, 1, 1);
    }
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    return this.dummy.matrix;
  }

  setBlock(x, y, z, blockId, countAsBuilt = false) {
    if (blockId === 0) {
      this.removeBlock(x, y, z);
      return null;
    }

    const k = this.key(x, y, z);
    const existing = this.blocks.get(k);
    const prevId = existing ? existing.blockId : 0;

    if (prevId === blockId) return existing;
    this.recordUndo(x, y, z, prevId);

    if (existing) {
      this._removeFromPool(k, existing);
    }

    const pool = this.pools[blockId];
    if (!pool || pool.count >= this.maxInstancesPerType) return null;

    const idx = pool.count;
    pool.count++;
    pool.mesh.count = pool.count;
    pool.keysByIndex[idx] = k;

    const matrix = this.computeMatrixForBlock(x, y, z, blockId);
    pool.mesh.setMatrixAt(idx, matrix);
    pool.mesh.instanceMatrix.needsUpdate = true;

    const entry = { x, y, z, blockId, instanceIndex: idx };
    this.blocks.set(k, entry);

    if (countAsBuilt) {
      this.blocksBuiltCount++;
    }
    return entry;
  }

  removeBlock(x, y, z) {
    if (y <= 0) return false;

    const k = this.key(x, y, z);
    const existing = this.blocks.get(k);
    if (!existing) return false;

    this.recordUndo(x, y, z, existing.blockId);
    this._removeFromPool(k, existing);
    this.blocks.delete(k);

    if (existing.blockId === 5 || existing.blockId === 18) {
      const above = this.getBlock(x, y + 1, z);
      if (above && (above.blockId === 5 || above.blockId === 18)) {
        this.recordUndo(x, y + 1, z, above.blockId);
        this._removeFromPool(this.key(x, y + 1, z), above);
        this.blocks.delete(this.key(x, y + 1, z));
      }
      const below = this.getBlock(x, y - 1, z);
      if (below && (below.blockId === 5 || below.blockId === 18)) {
        this.recordUndo(x, y - 1, z, below.blockId);
        this._removeFromPool(this.key(x, y - 1, z), below);
        this.blocks.delete(this.key(x, y - 1, z));
      }
    }

    return true;
  }

  _removeFromPool(k, entry) {
    const pool = this.pools[entry.blockId];
    if (!pool || pool.count <= 0) return;

    const idxToRemove = entry.instanceIndex;
    const lastIdx = pool.count - 1;

    if (idxToRemove !== lastIdx) {
      const lastKey = pool.keysByIndex[lastIdx];
      const lastEntry = this.blocks.get(lastKey);
      if (lastEntry) {
        const mat = this.computeMatrixForBlock(lastEntry.x, lastEntry.y, lastEntry.z, lastEntry.blockId);
        pool.mesh.setMatrixAt(idxToRemove, mat);
        lastEntry.instanceIndex = idxToRemove;
        pool.keysByIndex[idxToRemove] = lastKey;
      }
    }

    pool.keysByIndex.pop();
    pool.count--;
    pool.mesh.count = pool.count;
    pool.mesh.instanceMatrix.needsUpdate = true;
  }

  toggleDoorAt(x, y, z) {
    const b = this.getBlock(x, y, z);
    if (!b || (b.blockId !== 5 && b.blockId !== 18)) return false;

    const targetState = b.blockId === 5 ? 18 : 5;
    this.setBlock(x, y, z, targetState);

    const above = this.getBlock(x, y + 1, z);
    if (above && (above.blockId === 5 || above.blockId === 18)) {
      this.setBlock(x, y + 1, z, targetState);
    }
    const below = this.getBlock(x, y - 1, z);
    if (below && (below.blockId === 5 || below.blockId === 18)) {
      this.setBlock(x, y - 1, z, targetState);
    }

    window.soundEngine.playDoor(targetState === 18);
    return targetState === 18;
  }

  // Fast 3D Voxel DDA Raycaster (<0.01ms)
  raycast(origin, dir, maxDistance = 18) {
    let px = origin.x + 0.5;
    let py = origin.y + 0.5;
    let pz = origin.z + 0.5;

    let ix = Math.floor(px);
    let iy = Math.floor(py);
    let iz = Math.floor(pz);

    const stepX = dir.x > 0 ? 1 : (dir.x < 0 ? -1 : 0);
    const stepY = dir.y > 0 ? 1 : (dir.y < 0 ? -1 : 0);
    const stepZ = dir.z > 0 ? 1 : (dir.z < 0 ? -1 : 0);

    const tDeltaX = stepX !== 0 ? Math.abs(1 / dir.x) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(1 / dir.y) : Infinity;
    const tDeltaZ = stepZ !== 0 ? Math.abs(1 / dir.z) : Infinity;

    let tMaxX = stepX > 0 ? (ix + 1 - px) * tDeltaX : (stepX < 0 ? (px - ix) * tDeltaX : Infinity);
    let tMaxY = stepY > 0 ? (iy + 1 - py) * tDeltaY : (stepY < 0 ? (py - iy) * tDeltaY : Infinity);
    let tMaxZ = stepZ > 0 ? (iz + 1 - pz) * tDeltaZ : (stepZ < 0 ? (pz - iz) * tDeltaZ : Infinity);

    let dist = 0;
    let nx = 0;
    let ny = 0;
    let nz = 0;

    for (let step = 0; step < 65; step++) {
      const hit = this.getBlock(ix, iy, iz);
      if (hit && hit.blockId !== 15 && dist > 0.05) {
        return {
          x: ix,
          y: iy,
          z: iz,
          blockId: hit.blockId,
          normal: { x: nx, y: ny, z: nz },
          distance: dist
        };
      }

      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          ix += stepX;
          dist = tMaxX;
          tMaxX += tDeltaX;
          nx = -stepX;
          ny = 0;
          nz = 0;
        } else {
          iz += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          nx = 0;
          ny = 0;
          nz = -stepZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          iy += stepY;
          dist = tMaxY;
          tMaxY += tDeltaY;
          nx = 0;
          ny = -stepY;
          nz = 0;
        } else {
          iz += stepZ;
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          nx = 0;
          ny = 0;
          nz = -stepZ;
        }
      }

      if (dist > maxDistance) break;
    }

    return null;
  }

  queueStructure(blueprint, originX, originY, originZ, onComplete = null) {
    this.beginUndoBatch();
    for (const item of blueprint) {
      const wx = originX + item.dx;
      const wy = originY + item.dy;
      const wz = originZ + item.dz;
      const existing = this.getBlock(wx, wy, wz);
      this.recordUndo(wx, wy, wz, existing ? existing.blockId : 0);
      this.buildQueue.push({
        x: wx,
        y: wy,
        z: wz,
        blockId: item.blockId
      });
    }
    this.commitUndoBatch();
    this.onBuildComplete = onComplete;
    window.soundEngine.playBuildChime();
  }

  clearPlot(cx, cz, radius = 6) {
    this.beginUndoBatch();
    for (let x = cx - radius; x <= cx + radius; x++) {
      for (let z = cz - radius; z <= cz + radius; z++) {
        this.setBlock(x, 0, z, 10);
        for (let y = 1; y <= 14; y++) {
          this.removeBlock(x, y, z);
        }
      }
    }
    this.commitUndoBatch();
    window.soundEngine.playBuildChime();
  }

  clearAllBlocks() {
    this.blocks.clear();
    this.buildQueue = [];
    for (const id of Object.keys(this.pools)) {
      const pool = this.pools[id];
      pool.count = 0;
      pool.mesh.count = 0;
      pool.keysByIndex.length = 0;
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  // Persistence: Save & Load Village from localStorage AND Google Cloud Run Backend!
  saveToLocalStorage(extraState = {}) {
    try {
      const packed = [];
      for (const entry of this.blocks.values()) {
        packed.push(entry.x, entry.y, entry.z, entry.blockId);
      }
      const payload = {
        v: 3,
        ts: Date.now(),
        blocksBuiltCount: this.blocksBuiltCount,
        blocks: packed,
        ...extraState
      };
      localStorage.setItem(VoxelWorld.STORAGE_KEY, JSON.stringify(payload));
      // Sync asynchronously to Google Cloud Run FastAPI backend
      fetch('/api/v1/world/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  applyWorldPayload(data) {
    if (!data || !Array.isArray(data.blocks) || data.blocks.length < 100) return null;
    this.clearAllBlocks();
    const arr = data.blocks;
    for (let i = 0; i < arr.length; i += 4) {
      this.setBlock(arr[i], arr[i + 1], arr[i + 2], arr[i + 3], false);
    }
    this.blocksBuiltCount = data.blocksBuiltCount || 0;
    this.undoStack = [];
    return data;
  }

  loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem(VoxelWorld.STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return this.applyWorldPayload(data);
    } catch (e) {
      return null;
    }
  }

  async syncFromCloudBackend() {
    try {
      const res = await fetch('/api/v1/world/load');
      if (!res.ok) return null;
      const json = await res.json();
      if (json && json.status === 'loaded' && json.world) {
        return json.world;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  generateInitialTerrain() {
    const radius = 26;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        this.setBlock(x, 0, z, 10);
      }
    }

    for (let z = -4; z <= 12; z++) {
      this.setBlock(0, 0, z, 9);
      this.setBlock(-1, 0, z, 9);
      this.setBlock(1, 0, z, 9);
    }

    // Glowing Streetlamp Posts along the front walkway for crisp visual parallax while walking
    const lampPosts = [[-3, 2], [3, 2], [-3, -2], [3, -2], [-3, 7], [3, 7]];
    for (const [lx, lz] of lampPosts) {
      this.setBlock(lx, 1, lz, 17);
      this.setBlock(lx, 2, lz, 6);
    }

    // Colorful Stepping-Stone Paths to the Slime Trampoline (-8, -6) and T-Rex Meadow (-11, 2)
    for (let px = -6; px <= -2; px++) {
      this.setBlock(px, 0, -6, px % 2 === 0 ? 9 : 2);
    }
    for (let px = -10; px <= -2; px++) {
      this.setBlock(px, 0, 2, px % 2 === 0 ? 9 : 11);
    }

    const treePositions = [
      [-15, -14], [15, -14], [-17, 2], [17, 2],
      [-15, 15], [15, 15], [0, -19], [-9, -17], [9, -17]
    ];
    for (const [tx, tz] of treePositions) {
      this.plantTree(tx, 1, tz);
    }

    // Starter Cozy Brick House at (0, 0, -9)
    const starterHouse = window.StructureGenerator.generateCozyHouse();
    for (const item of starterHouse) {
      if (item.blockId !== 0) {
        this.setBlock(item.dx, item.dy, -9 + item.dz, item.blockId);
      }
    }

    // Backyard Bouncy Slime Trampoline next to the house at (-8, 1, -6)
    for (let sx = -9; sx <= -7; sx++) {
      for (let sz = -7; sz <= -5; sz++) {
        this.setBlock(sx, 1, sz, 12);
      }
    }

    // Sevak's 10-Block Parkour & Skyscraper Challenge Tower at (10, y, -8)
    // Players can climb or jump up the spiral steps to reach Y=10 for the Skyscraper Challenge!
    for (let y = 1; y <= 10; y++) {
      this.setBlock(10, y, -8, y % 2 === 0 ? 11 : 9);
    }
    // Summit platform at Y=10
    for (let px = 9; px <= 11; px++) {
      for (let pz = -9; pz <= -7; pz++) {
        this.setBlock(px, 10, pz, 11);
      }
    }
    this.setBlock(10, 11, -8, 6); // Summit beacon lantern
    // Spiral 1-block parkour staircase wrapping around (10, y, -8) from y=1..9
    const spiralSteps = [
      [10, 1, -6], [12, 2, -6], [12, 3, -8], [12, 4, -10],
      [10, 5, -10], [8, 6, -10], [8, 7, -8], [8, 8, -6], [10, 9, -6]
    ];
    for (const [sx, sy, sz] of spiralSteps) {
      this.setBlock(sx, sy, sz, sy % 3 === 0 ? 12 : 2);
    }

    // 3D "SEVAK" Monument Sign on the North Horizon (0, 0, -20)
    const sevakSign = window.StructureGenerator.generate3DText('SEVAK');
    for (const item of sevakSign) {
      if (item.blockId !== 0) {
        this.setBlock(item.dx, item.dy, -20 + item.dz, item.blockId);
      }
    }

    // Fun TNT Demolition Stack in the right side yard at (8, 1, -2)
    this.setBlock(8, 1, -2, 20);
    this.setBlock(9, 1, -2, 20);
    this.setBlock(8, 2, -2, 20);
  }

  plantTree(x, y, z) {
    for (let ty = 0; ty < 4; ty++) {
      this.setBlock(x, y + ty, z, 13);
    }
    for (let lx = -2; lx <= 2; lx++) {
      for (let lz = -2; lz <= 2; lz++) {
        for (let ly = 3; ly <= 5; ly++) {
          if (Math.abs(lx) === 2 && Math.abs(lz) === 2 && ly === 5) continue;
          if (lx === 0 && lz === 0 && ly === 3) continue;
          this.setBlock(x + lx, y + ly, z + lz, 14);
        }
      }
    }
  }

  createClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });
    for (let i = 0; i < 12; i++) {
      const w = 5 + Math.floor(Math.random() * 5);
      const d = 3 + Math.floor(Math.random() * 4);
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(w, 1, d), cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 75,
        24 + Math.random() * 5,
        (Math.random() - 0.5) * 75
      );
      this.cloudsGroup.add(cloud);
    }
  }

  update(dt, entities) {
    for (const c of this.cloudsGroup.children) {
      c.position.x += dt * 0.6;
      if (c.position.x > 40) c.position.x = -40;
    }

    // Animated House Builder Queue with Bit-Bot Laser tracking (2.5x Turbo when Golden Bit-Bot is active!)
    if (this.buildQueue.length > 0) {
      const speedBatch = entities && entities.goldenBotEnabled ? 48 : 20;
      const batch = Math.min(speedBatch, this.buildQueue.length);
      for (let i = 0; i < batch; i++) {
        const next = this.buildQueue.shift();
        if (next.blockId === 0) {
          this.removeBlock(next.x, next.y, next.z);
        } else {
          this.setBlock(next.x, next.y, next.z, next.blockId, true);
          this.lastBuiltBlock = next;
          if (entities && i % 7 === 0) {
            entities.spawnParticle(
              next.x,
              next.y + 0.5,
              next.z,
              entities.goldenBotEnabled ? 0xffd026 : 0x34f5e5,
              0.16
            );
          }
        }
      }
      if (this.buildQueue.length === 0) {
        this.lastBuiltBlock = null;
        if (this.onBuildComplete) {
          const cb = this.onBuildComplete;
          this.onBuildComplete = null;
          cb();
        }
      }
    }
  }
}

window.VoxelWorld = VoxelWorld;
