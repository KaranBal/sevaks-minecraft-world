// Polished 3D Voxel Entities:
// - Embodied 3D "Bit-Bot" AI Companion Drone with Construction Laser Beam
// - First-Person Held Block Arm & 3rd-Person Hero Avatar
// - Rideable Pets (Dog, Piggy, Chicken) & Giant Friendly T-Rex
// - Undo-Safe Chain-Reaction Super TNT & Launchable 3D Space Rocket
// - 1-Draw-Call 60-FPS Weather System (Snow, Rain, Fireflies) with House Roof Occlusion

class EntityManager {
  constructor(scene, world, camera) {
    this.scene = scene;
    this.world = world;
    this.camera = camera;
    this.animals = [];
    this.particles = [];
    this.fireworks = [];
    this.activeTnts = [];
    this.rockets = [];
    this.worldCoins = [];
    this.discoActive = false;
    this.goldenBotEnabled = false;
    this.crownTrailEnabled = false;
    this.coinMagnetEnabled = false;
    this.onCoinPickup = null;

    this.sharedUnitBox = new THREE.BoxGeometry(1, 1, 1);
    this.sharedCoinGeom = new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16);
    this.sharedCoinMat = new THREE.MeshLambertMaterial({
      color: 0xffd026,
      emissive: 0x664400
    });

    // 1. Third-Person Player Hero Avatar
    this.playerAvatar = this.createPlayerAvatar();
    this.scene.add(this.playerAvatar);

    // 2. First-Person Held Block in Right Hand
    this.handGroup = new THREE.Group();
    this.heldBlockMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      window.textureFactory.getMaterial(1)
    );
    this.heldBlockMesh.position.set(0.48, -0.36, -0.68);
    this.heldBlockMesh.rotation.set(0.15, -0.65, 0.05);
    this.handGroup.add(this.heldBlockMesh);
    this.camera.add(this.handGroup);
    this.swingAnim = 0;

    // 3. Embodied 3D "Bit-Bot" AI Companion Drone + Construction Laser Beam!
    this.aiBot = this.createAIBot();
    this.scene.add(this.aiBot);

    const laserGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -2, 0)
    ]);
    this.aiLaser = new THREE.Line(
      laserGeom,
      new THREE.LineBasicMaterial({ color: 0x34f5e5, linewidth: 3 })
    );
    this.aiLaser.visible = false;
    this.scene.add(this.aiLaser);

    // 4. 1-Draw-Call 60-FPS Weather System (Snow, Rain, Fireflies)
    this.weatherMode = 'clear';
    this.initWeatherSystem();
  }

  createBox(w, h, d, colorHex, x = 0, y = 0, z = 0, emissiveHex = 0x000000) {
    const geom = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshLambertMaterial({ color: colorHex, emissive: emissiveHex });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    return mesh;
  }

  createAIBot() {
    const g = new THREE.Group();
    this.botCore = this.createBox(0.55, 0.46, 0.55, 0x06b6d4, 0, 0, 0, 0x053344);
    const screen = this.createBox(0.44, 0.24, 0.06, 0x0f172a, 0, 0.02, -0.26);
    const eyeL = this.createBox(0.09, 0.09, 0.07, 0x48ff48, -0.1, 0.03, -0.28, 0x22aa22);
    const eyeR = this.createBox(0.09, 0.09, 0.07, 0x48ff48, 0.1, 0.03, -0.28, 0x22aa22);
    this.botRotor = this.createBox(0.85, 0.05, 0.12, 0xffd026, 0, 0.3, 0, 0x443300);
    this.botCrown = this.createBox(0.32, 0.14, 0.32, 0xffd026, 0, 0.38, 0, 0x664400);
    this.botCrown.visible = false;
    g.add(this.botCore, screen, eyeL, eyeR, this.botRotor, this.botCrown);
    g.position.set(2, 2.5, 2);
    return g;
  }

  setGoldenBotUpgrade(enabled) {
    this.goldenBotEnabled = !!enabled;
    if (this.botCore) {
      this.botCore.material.color.setHex(enabled ? 0xffd026 : 0x06b6d4);
      this.botCore.material.emissive.setHex(enabled ? 0x664400 : 0x053344);
    }
    if (this.botCrown) {
      this.botCrown.visible = !!enabled;
    }
  }

  setCrownAndTrailUpgrade(enabled) {
    this.crownTrailEnabled = !!enabled;
    if (this.heroCrownGroup) {
      this.heroCrownGroup.visible = !!enabled;
    }
  }

  setCoinMagnetUpgrade(enabled) {
    this.coinMagnetEnabled = !!enabled;
  }

  initWeatherSystem() {
    this.weatherCount = 150;
    this.weatherDummy = new THREE.Object3D();
    this.weatherMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.86
    });
    this.weatherMesh = new THREE.InstancedMesh(
      this.sharedUnitBox,
      this.weatherMat,
      this.weatherCount
    );
    this.weatherMesh.visible = false;
    this.weatherMesh.frustumCulled = false;
    this.scene.add(this.weatherMesh);

    this.weatherDrops = [];
    for (let i = 0; i < this.weatherCount; i++) {
      this.weatherDrops.push({
        dx: (Math.random() - 0.5) * 30,
        y: Math.random() * 17 + 1,
        dz: (Math.random() - 0.5) * 30,
        speed: 1.8 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  setWeather(mode) {
    this.weatherMode = mode;
    if (mode === 'clear') {
      this.weatherMesh.visible = false;
      return;
    }
    this.weatherMesh.visible = true;
    if (mode === 'snow') {
      this.weatherMat.color.setHex(0xffffff);
      this.weatherMat.opacity = 0.9;
    } else if (mode === 'rain') {
      this.weatherMat.color.setHex(0x60a5fa);
      this.weatherMat.opacity = 0.72;
    } else if (mode === 'fireflies') {
      this.weatherMat.color.setHex(0xfde047);
      this.weatherMat.opacity = 0.95;
    }
  }

  updateWeather(dt, player, time) {
    if (this.weatherMode === 'clear' || !this.weatherMesh.visible) return;

    for (let i = 0; i < this.weatherCount; i++) {
      const d = this.weatherDrops[i];
      if (this.weatherMode === 'snow') {
        d.y -= d.speed * dt;
        d.dx += Math.sin(time * 1.8 + d.phase) * 0.6 * dt;
        if (d.y < 0.8) d.y = 17 + Math.random() * 3;
        this.weatherDummy.scale.set(0.14, 0.14, 0.14);
      } else if (this.weatherMode === 'rain') {
        d.y -= d.speed * 5.2 * dt;
        if (d.y < 0.8) d.y = 18 + Math.random() * 3;
        this.weatherDummy.scale.set(0.05, 0.45, 0.05);
      } else if (this.weatherMode === 'fireflies') {
        d.dx += Math.cos(time * 1.4 + d.phase) * 0.8 * dt;
        d.dz += Math.sin(time * 1.2 + d.phase) * 0.8 * dt;
        d.y = 1.2 + Math.sin(time * 2.2 + d.phase) * 0.9 + (i % 5) * 0.7;
        const pulse = 0.08 + Math.max(0, Math.sin(time * 5 + d.phase)) * 0.12;
        this.weatherDummy.scale.set(pulse, pulse, pulse);
      }

      const wx = player.x + d.dx;
      const wz = player.z + d.dz;

      // Never let snow or rain fall inside a roofed house!
      if (this.weatherMode !== 'fireflies' && this.world.hasRoofAbove(wx, d.y - 1, wz)) {
        this.weatherDummy.scale.set(0, 0, 0);
      }

      this.weatherDummy.position.set(wx, d.y, wz);
      this.weatherDummy.updateMatrix();
      this.weatherMesh.setMatrixAt(i, this.weatherDummy.matrix);
    }
    this.weatherMesh.instanceMatrix.needsUpdate = true;
  }

  setHeldBlock(blockId) {
    if (this.heldBlockMesh) {
      const geom = window.textureFactory.multiFaceIds.has(blockId)
        ? window.textureFactory.atlasBoxGeom
        : this.sharedUnitBox;
      this.heldBlockMesh.geometry = geom;
      this.heldBlockMesh.scale.set(0.32, 0.32, 0.32);
      this.heldBlockMesh.material = window.textureFactory.getMaterial(blockId);
    }
  }

  triggerHandSwing() {
    this.swingAnim = 1.0;
  }

  createPlayerAvatar() {
    const group = new THREE.Group();
    const head = this.createBox(0.46, 0.46, 0.46, 0xffcc99, 0, 1.42, 0);
    const hair = this.createBox(0.5, 0.16, 0.5, 0x3b2314, 0, 1.6, 0);
    const body = this.createBox(0.46, 0.62, 0.26, 0x16a8c7, 0, 0.88, 0);

    // 3D Golden King Crown with Diamond Jewel (Unlocked via Upgrade Shop!)
    this.heroCrownGroup = new THREE.Group();
    const crownBase = this.createBox(0.54, 0.14, 0.54, 0xffd026, 0, 1.72, 0, 0x664400);
    const gemFront = this.createBox(0.14, 0.14, 0.08, 0x34f5e5, 0, 1.75, -0.26, 0x116666);
    const spikeL = this.createBox(0.12, 0.16, 0.12, 0xffd026, -0.18, 1.84, -0.18, 0x664400);
    const spikeM = this.createBox(0.14, 0.2, 0.14, 0xffd026, 0, 1.86, -0.2, 0x664400);
    const spikeR = this.createBox(0.12, 0.16, 0.12, 0xffd026, 0.18, 1.84, -0.18, 0x664400);
    this.heroCrownGroup.add(crownBase, gemFront, spikeL, spikeM, spikeR);
    this.heroCrownGroup.visible = false;

    this.leftArm = this.createBox(0.18, 0.56, 0.18, 0x16a8c7, -0.34, 0.88, 0);
    this.rightArm = this.createBox(0.18, 0.56, 0.18, 0x16a8c7, 0.34, 0.88, 0);
    this.leftLeg = this.createBox(0.2, 0.56, 0.2, 0x2b3e88, -0.12, 0.28, 0);
    this.rightLeg = this.createBox(0.2, 0.56, 0.2, 0x2b3e88, 0.12, 0.28, 0);

    group.add(head, hair, body, this.heroCrownGroup, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    group.visible = false;
    return group;
  }

  updatePlayerVisuals(player, isMoving, time, dt) {
    this.playerAvatar.visible = player.thirdPerson;
    this.handGroup.visible = !player.thirdPerson;

    // Emit 3D Rainbow Sparkle Trail when Crown & Rainbow Trail Upgrade is active!
    if (this.crownTrailEnabled && (isMoving || player.flying || Math.abs(player.vy) > 0.5)) {
      if (Math.random() < 0.48) {
        const rainbow = [0xff3366, 0xffd026, 0x22c55e, 0x34f5e5, 0xa855f7];
        const col = rainbow[Math.floor(Math.random() * rainbow.length)];
        this.spawnParticle(
          player.x + (Math.random() - 0.5) * 0.5,
          player.y + 0.35 + Math.random() * 0.4,
          player.z + (Math.random() - 0.5) * 0.5,
          col,
          0.16,
          { x: (Math.random() - 0.5) * 1.4, y: 1.2 + Math.random() * 1.5, z: (Math.random() - 0.5) * 1.4 },
          0.45
        );
      }
    }

    if (player.thirdPerson) {
      this.playerAvatar.position.set(player.x, player.y, player.z);
      this.playerAvatar.rotation.y = player.yaw;
      const swing = isMoving ? Math.sin(time * 10) * 0.6 : 0;
      this.leftArm.rotation.x = swing;
      this.rightArm.rotation.x = -swing;
      this.leftLeg.rotation.x = -swing;
      this.rightLeg.rotation.x = swing;
    } else {
      if (this.swingAnim > 0) {
        this.swingAnim = Math.max(0, this.swingAnim - dt * 5.5);
      }
      const bob = isMoving ? Math.sin(time * 10) * 0.025 : Math.sin(time * 2) * 0.008;
      const swingOffset = Math.sin(this.swingAnim * Math.PI) * 0.18;
      this.heldBlockMesh.position.set(
        0.48 - swingOffset * 0.4,
        -0.36 + bob - swingOffset * 0.3,
        -0.68 - swingOffset * 0.5
      );
      this.heldBlockMesh.rotation.x = 0.15 - swingOffset * 0.9;
    }
  }

  spawnAnimal(type, x, z) {
    const group = new THREE.Group();
    const legs = [];

    if (type === 'wolf') {
      const body = this.createBox(0.46, 0.42, 0.8, 0xd8dee9, 0, 0.42, 0);
      const collar = this.createBox(0.5, 0.45, 0.12, 0xff2a2a, 0, 0.43, -0.32);
      const head = this.createBox(0.42, 0.4, 0.42, 0xe5e9f0, 0, 0.6, -0.5);
      const nose = this.createBox(0.2, 0.16, 0.2, 0xabb2bf, 0, 0.52, -0.76);
      const earL = this.createBox(0.1, 0.16, 0.1, 0x99a1b3, -0.14, 0.86, -0.46);
      const earR = this.createBox(0.1, 0.16, 0.1, 0x99a1b3, 0.14, 0.86, -0.46);
      const tail = this.createBox(0.12, 0.12, 0.4, 0xd8dee9, 0, 0.55, 0.5);
      group.add(body, collar, head, nose, earL, earR, tail);
      const coords = [[-0.14, -0.25], [0.14, -0.25], [-0.14, 0.25], [0.14, 0.25]];
      for (const [lx, lz] of coords) {
        const leg = this.createBox(0.14, 0.24, 0.14, 0xc2c9d6, lx, 0.12, lz);
        legs.push(leg);
        group.add(leg);
      }
    } else if (type === 'pig') {
      const body = this.createBox(0.6, 0.45, 0.82, 0xff9eb5, 0, 0.42, 0);
      const head = this.createBox(0.46, 0.44, 0.46, 0xffadc0, 0, 0.58, -0.46);
      const snout = this.createBox(0.24, 0.16, 0.1, 0xff7896, 0, 0.52, -0.72);
      group.add(body, head, snout);
      const coords = [[-0.18, -0.26], [0.18, -0.26], [-0.18, 0.26], [0.18, 0.26]];
      for (const [lx, lz] of coords) {
        const leg = this.createBox(0.16, 0.24, 0.16, 0xf288a1, lx, 0.12, lz);
        legs.push(leg);
        group.add(leg);
      }
    } else if (type === 'trex') {
      // Giant Friendly Emerald Voxel T-Rex (Rideable!)
      const body = this.createBox(1.1, 1.0, 1.5, 0x22c55e, 0, 1.35, 0);
      const belly = this.createBox(0.9, 0.85, 1.3, 0x86efac, 0, 1.25, -0.05);
      const neck = this.createBox(0.75, 0.8, 0.75, 0x22c55e, 0, 1.95, -0.65);
      const head = this.createBox(0.86, 0.65, 1.15, 0x16a34a, 0, 2.35, -1.1);
      const jaw = this.createBox(0.78, 0.24, 0.95, 0x15803d, 0, 1.98, -1.05);
      const teeth = this.createBox(0.7, 0.12, 0.8, 0xffffff, 0, 2.1, -1.1);
      const eyeL = this.createBox(0.12, 0.14, 0.14, 0xfde047, -0.44, 2.48, -0.95);
      const eyeR = this.createBox(0.12, 0.14, 0.14, 0xfde047, 0.44, 2.48, -0.95);
      const armL = this.createBox(0.18, 0.2, 0.42, 0x16a34a, -0.62, 1.5, -0.75);
      const armR = this.createBox(0.18, 0.2, 0.42, 0x16a34a, 0.62, 1.5, -0.75);
      const tail1 = this.createBox(0.68, 0.62, 1.1, 0x22c55e, 0, 1.35, 1.15);
      const tail2 = this.createBox(0.42, 0.4, 1.0, 0x16a34a, 0, 1.4, 2.0);
      group.add(body, belly, neck, head, jaw, teeth, eyeL, eyeR, armL, armR, tail1, tail2);

      const legL = this.createBox(0.42, 0.95, 0.52, 0x15803d, -0.45, 0.48, 0.1);
      const legR = this.createBox(0.42, 0.95, 0.52, 0x15803d, 0.45, 0.48, 0.1);
      legs.push(legL, legR);
      group.add(legL, legR);
    } else {
      // Chicken
      const body = this.createBox(0.4, 0.38, 0.5, 0xffffff, 0, 0.35, 0);
      const head = this.createBox(0.3, 0.34, 0.3, 0xffffff, 0, 0.62, -0.22);
      const beak = this.createBox(0.16, 0.09, 0.14, 0xffb700, 0, 0.6, -0.42);
      const wattle = this.createBox(0.1, 0.12, 0.08, 0xe62222, 0, 0.5, -0.38);
      group.add(body, head, beak, wattle);
      const legL = this.createBox(0.08, 0.2, 0.08, 0xffaa00, -0.1, 0.1, 0);
      const legR = this.createBox(0.08, 0.2, 0.08, 0xffaa00, 0.1, 0.1, 0);
      legs.push(legL, legR);
      group.add(legL, legR);
    }

    group.position.set(x, 0.5, z);
    this.scene.add(group);
    const animal = {
      type,
      mesh: group,
      legs,
      vx: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      timer: Math.random() * 2,
      phase: Math.random() * 10,
      isMounted: false
    };
    this.animals.push(animal);
    return animal;
  }

  findClickedAnimal(raycaster, maxDist = 9) {
    const meshes = [];
    for (const a of this.animals) {
      a.mesh.traverse((child) => {
        if (child.isMesh) {
          child.userData.parentAnimal = a;
          meshes.push(child);
        }
      });
    }
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0 && hits[0].distance <= maxDist) {
      return hits[0].object.userData.parentAnimal || null;
    }
    return null;
  }

  findNearestAnimal(x, z, maxDist = 7) {
    let best = null;
    let bestDist = maxDist;
    for (const a of this.animals) {
      const dx = a.mesh.position.x - x;
      const dz = a.mesh.position.z - z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return best;
  }

  // Interactive TNT Fuse & Undo-Safe Chain Reaction!
  igniteTNT(x, y, z, fuseTime = 1.5) {
    const prevBatch = this.world.currentBatch;
    this.world.currentBatch = null;
    this.world.removeBlock(x, y, z);
    this.world.currentBatch = prevBatch;

    const mesh = new THREE.Mesh(
      window.textureFactory.atlasBoxGeom || this.sharedUnitBox,
      window.textureFactory.getMaterial(20).clone()
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    window.soundEngine.playFuse();

    this.activeTnts.push({
      x,
      y,
      z,
      mesh,
      fuse: fuseTime
    });
  }

  detonateTNT(tnt, onShake = null) {
    this.scene.remove(tnt.mesh);
    tnt.mesh.material.dispose();
    window.soundEngine.playExplosion();
    if (onShake) onShake(0.45);

    // Record entire explosion in Undo stack so pressing Undo (Z) restores the house!
    this.world.beginUndoBatch();
    this.world.recordUndo(tnt.x, tnt.y, tnt.z, 20);

    const radius = 3;
    const chainTnts = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq > 9.5) continue;
          const bx = tnt.x + dx;
          const by = tnt.y + dy;
          const bz = tnt.z + dz;
          if (by <= 0) continue; // Keep ground lawn intact

          const hit = this.world.getBlock(bx, by, bz);
          if (!hit) continue;
          if (hit.blockId === 20) {
            chainTnts.push({ x: bx, y: by, z: bz, delay: 0.25 + Math.sqrt(distSq) * 0.08 });
          } else {
            this.world.removeBlock(bx, by, bz);
          }
        }
      }
    }
    this.world.commitUndoBatch();

    for (const ct of chainTnts) {
      this.igniteTNT(ct.x, ct.y, ct.z, ct.delay);
    }

    const blastColors = [0xff3b30, 0xff9500, 0xffcc00, 0xf8fafc, 0x475569];
    for (let i = 0; i < 28; i++) {
      this.spawnParticle(
        tnt.x + (Math.random() - 0.5) * 1.4,
        tnt.y + (Math.random() - 0.5) * 1.4,
        tnt.z + (Math.random() - 0.5) * 1.4,
        blastColors[i % blastColors.length],
        0.26,
        {
          x: (Math.random() - 0.5) * 14,
          y: 3 + Math.random() * 10,
          z: (Math.random() - 0.5) * 14
        },
        0.85
      );
    }
  }

  // Launchable 3D Voxel Space Rocket!
  launchSpaceRocket(x, z, onShake = null) {
    const group = new THREE.Group();
    const pad = this.createBox(2.4, 0.25, 2.4, 0x64748b, 0, 0.12, 0);
    const body = this.createBox(1.1, 2.8, 1.1, 0xf8fafc, 0, 1.8, 0);
    const stripe = this.createBox(1.16, 0.5, 1.16, 0xef4444, 0, 2.1, 0);
    const windowBox = this.createBox(0.45, 0.45, 1.2, 0x38bdf8, 0, 2.6, 0, 0x0a4466);
    const nose1 = this.createBox(0.85, 0.6, 0.85, 0xef4444, 0, 3.5, 0);
    const nose2 = this.createBox(0.45, 0.6, 0.45, 0xfde047, 0, 4.1, 0, 0x443300);
    const fin1 = this.createBox(1.9, 0.8, 0.22, 0xdc2626, 0, 0.8, 0);
    const fin2 = this.createBox(0.22, 0.8, 1.9, 0xdc2626, 0, 0.8, 0);
    const thruster = this.createBox(0.7, 0.35, 0.7, 0x334155, 0, 0.35, 0);

    group.add(pad, body, stripe, windowBox, nose1, nose2, fin1, fin2, thruster);
    group.position.set(x, 0.5, z);
    this.scene.add(group);

    window.soundEngine.playRocketLaunch();
    if (onShake) onShake(0.65);

    this.rockets.push({
      mesh: group,
      x,
      z,
      y: 0.5,
      vy: 0.5,
      countdown: 1.0
    });
  }

  spawnParticle(x, y, z, colorHex, size = 0.18, vel = null, life = 0.55) {
    if (this.particles.length > 110) return;
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    const mesh = new THREE.Mesh(this.sharedUnitBox, mat);
    mesh.scale.set(size, size, size);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    this.particles.push({
      mesh,
      vx: vel ? vel.x : (Math.random() - 0.5) * 4,
      vy: vel ? vel.y : 1.5 + Math.random() * 3.5,
      vz: vel ? vel.z : (Math.random() - 0.5) * 4,
      life,
      maxLife: life,
      baseSize: size
    });
  }

  spawnBlockBurst(x, y, z, colorHex, count = 8) {
    for (let i = 0; i < count; i++) {
      this.spawnParticle(
        x + (Math.random() - 0.5) * 0.5,
        y + (Math.random() - 0.5) * 0.5,
        z + (Math.random() - 0.5) * 0.5,
        colorHex,
        0.15
      );
    }
  }

  launchFirework(x, y, z) {
    window.soundEngine.playFirework();
    const palette = [0xff3366, 0xffcc00, 0x33ff66, 0x22eeff, 0xd946ef];
    const color = palette[Math.floor(Math.random() * palette.length)];
    const mesh = new THREE.Mesh(
      this.sharedUnitBox,
      new THREE.MeshBasicMaterial({ color })
    );
    mesh.scale.set(0.25, 0.45, 0.25);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.fireworks.push({
      mesh,
      color,
      vy: 13 + Math.random() * 4,
      fuse: 0.7 + Math.random() * 0.25
    });
  }

  // 3D Spinning Gold Coins in the World!
  spawnWorldCoin(x, y, z, value = 20, vel = null) {
    if (this.worldCoins.length > 36) return;
    const coinGroup = new THREE.Group();
    const disc = new THREE.Mesh(this.sharedCoinGeom, this.sharedCoinMat);
    disc.rotation.x = Math.PI * 0.5;
    const gem = this.createBox(0.18, 0.18, 0.14, 0x34f5e5, 0, 0, 0, 0x115555);
    coinGroup.add(disc, gem);
    coinGroup.position.set(x, Math.max(1.15, y), z);
    this.scene.add(coinGroup);

    this.worldCoins.push({
      mesh: coinGroup,
      value,
      baseY: Math.max(1.15, y),
      vx: vel ? vel.x : 0,
      vy: vel ? vel.y : 0,
      vz: vel ? vel.z : 0,
      inAir: !!vel,
      phase: Math.random() * Math.PI * 2,
      age: 0
    });
  }

  spawnCoinFountain(x, y, z, count = 6, coinVal = 15) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 2.2 + Math.random() * 2.4;
      this.spawnWorldCoin(x, y + 1.2, z, coinVal, {
        x: Math.cos(angle) * speed,
        y: 4.5 + Math.random() * 2.5,
        z: Math.sin(angle) * speed
      });
    }
  }

  update(dt, player, time, onShake = null) {
    // 1. Update Embodied "Bit-Bot" AI Companion Drone & Construction Laser Beam!
    if (this.botRotor) this.botRotor.rotation.y = time * (this.goldenBotEnabled ? 28 : 16);
    if (this.world.buildQueue.length > 0 && this.world.lastBuiltBlock) {
      const b = this.world.lastBuiltBlock;
      this.aiBot.position.lerp(new THREE.Vector3(b.x, b.y + 2.4, b.z), 0.35);
      this.aiBot.lookAt(b.x, b.y, b.z);
      const posAttr = this.aiLaser.geometry.attributes.position;
      posAttr.setXYZ(0, this.aiBot.position.x, this.aiBot.position.y - 0.2, this.aiBot.position.z);
      posAttr.setXYZ(1, b.x, b.y, b.z);
      posAttr.needsUpdate = true;
      if (this.goldenBotEnabled) {
        const rainbow = [0xffd026, 0xff3366, 0x34f5e5, 0x22c55e, 0xa855f7];
        this.aiLaser.material.color.setHex(rainbow[Math.floor(time * 14) % rainbow.length]);
      } else {
        this.aiLaser.material.color.setHex(0x34f5e5);
      }
      this.aiLaser.visible = true;
    } else {
      this.aiLaser.visible = false;
      const targetX = player.x + Math.cos(time * 1.1) * 2.5;
      const targetY = player.y + 2.3 + Math.sin(time * 2.8) * 0.22;
      const targetZ = player.z + Math.sin(time * 1.1) * 2.5;
      this.aiBot.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), Math.min(1, dt * 3.2));
      this.aiBot.lookAt(player.x, player.y + 1.4, player.z);
    }

    // 1B. Update 3D Spinning Gold Coins & Magnetic Pickup!
    const magnetRadius = this.coinMagnetEnabled ? 18.0 : 2.8;
    for (let i = this.worldCoins.length - 1; i >= 0; i--) {
      const c = this.worldCoins[i];
      c.age += dt;
      c.mesh.rotation.y += dt * 3.8;

      if (c.inAir) {
        c.vy -= 12.0 * dt;
        c.mesh.position.x += c.vx * dt;
        c.mesh.position.y += c.vy * dt;
        c.mesh.position.z += c.vz * dt;
        if (c.mesh.position.y <= 1.2) {
          c.mesh.position.y = 1.2;
          c.baseY = 1.2;
          c.inAir = false;
        }
      } else {
        c.mesh.position.y = c.baseY + Math.sin(time * 3.6 + c.phase) * 0.18;
      }

      const dx = player.x - c.mesh.position.x;
      const dy = (player.y + 0.9) - c.mesh.position.y;
      const dz = player.z - c.mesh.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (c.age > 0.35 && dist < magnetRadius) {
        const pullSpeed = this.coinMagnetEnabled ? 15.0 : 9.5;
        c.mesh.position.x += (dx / Math.max(0.1, dist)) * pullSpeed * dt;
        c.mesh.position.y += (dy / Math.max(0.1, dist)) * pullSpeed * dt;
        c.mesh.position.z += (dz / Math.max(0.1, dist)) * pullSpeed * dt;
      }

      if (c.age > 0.35 && dist < 1.15) {
        this.spawnBlockBurst(c.mesh.position.x, c.mesh.position.y, c.mesh.position.z, 0xffd026, 10);
        this.scene.remove(c.mesh);
        this.worldCoins.splice(i, 1);
        if (this.onCoinPickup) {
          this.onCoinPickup(c.value);
        }
      }
    }

    // 2. Update Weather System
    this.updateWeather(dt, player, time);

    // 3. Update Burning TNT Fuses
    for (let i = 0; i < this.activeTnts.length; i++) {}
    for (let i = this.activeTnts.length - 1; i >= 0; i--) {
      const tnt = this.activeTnts[i];
      tnt.fuse -= dt;
      const flash = Math.floor(tnt.fuse * 10) % 2 === 0;
      tnt.mesh.material.emissive.setHex(flash ? 0xff4400 : 0x000000);
      const pulse = 1 + Math.sin(time * 26) * 0.12;
      tnt.mesh.scale.set(pulse, pulse, pulse);

      if (tnt.fuse <= 0) {
        this.activeTnts.splice(i, 1);
        this.detonateTNT(tnt, onShake);
      }
    }

    // 4. Update Launching 3D Space Rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      if (r.countdown > 0) {
        r.countdown -= dt;
        r.mesh.position.x = r.x + (Math.random() - 0.5) * 0.12;
        r.mesh.position.z = r.z + (Math.random() - 0.5) * 0.12;
      } else {
        r.vy += dt * 11.5;
        r.y += r.vy * dt;
        r.mesh.position.set(r.x, r.y, r.z);
        r.mesh.rotation.y += dt * 1.4;
      }

      // Rocket thruster flame particles
      for (let f = 0; f < 3; f++) {
        this.spawnParticle(
          r.x + (Math.random() - 0.5) * 0.9,
          r.y + 0.2,
          r.z + (Math.random() - 0.5) * 0.9,
          f % 2 === 0 ? 0xff5500 : 0xffee22,
          0.28,
          { x: (Math.random() - 0.5) * 2.5, y: -4 - Math.random() * 3, z: (Math.random() - 0.5) * 2.5 },
          0.6
        );
      }

      if (r.y > 38) {
        this.launchFirework(r.x, r.y, r.z);
        this.scene.remove(r.mesh);
        this.rockets.splice(i, 1);
      }
    }

    // 5. Update Friendly Animals & Rideable Mounts
    for (const a of this.animals) {
      if (a.isMounted) continue; // Controlled directly by player physics when mounted!

      a.timer -= dt;
      if (a.type === 'wolf') {
        const dx = player.x - a.mesh.position.x;
        const dz = player.z - a.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        a.yaw = Math.atan2(-dx, -dz);
        if (dist > 3.2) {
          a.vx = (dx / dist) * 3.2;
          a.vz = (dz / dist) * 3.2;
        } else {
          a.vx = 0;
          a.vz = 0;
        }
      } else if (a.timer <= 0) {
        a.timer = 2.0 + Math.random() * 3.0;
        a.yaw = Math.random() * Math.PI * 2;
        if (Math.random() < 0.7) {
          const spd = a.type === 'trex' ? 1.8 : 1.4;
          a.vx = -Math.sin(a.yaw) * spd;
          a.vz = -Math.cos(a.yaw) * spd;
        } else {
          a.vx = 0;
          a.vz = 0;
        }
      }

      const nx = a.mesh.position.x + a.vx * dt;
      const nz = a.mesh.position.z + a.vz * dt;
      if (
        Math.abs(nx) < 23 &&
        Math.abs(nz) < 23 &&
        !this.world.isSolid(Math.round(nx), 1, Math.round(nz))
      ) {
        a.mesh.position.x = nx;
        a.mesh.position.z = nz;
      } else {
        a.yaw += Math.PI * 0.5;
        a.vx = 0;
        a.vz = 0;
      }

      // Disco Jukebox makes all pets hop and spin to the music!
      const discoHop = this.discoActive ? Math.abs(Math.sin(time * 10 + a.phase)) * 0.65 : 0;
      a.mesh.position.y = 0.5 + discoHop;
      a.mesh.rotation.y = this.discoActive ? a.yaw + time * 4 : a.yaw;

      const moving = Math.abs(a.vx) + Math.abs(a.vz) > 0.05 || this.discoActive;
      const swing = moving ? Math.sin(time * 10 + a.phase) * 0.5 : 0;
      for (let i = 0; i < a.legs.length; i++) {
        a.legs[i].rotation.x = i % 2 === 0 ? swing : -swing;
      }
    }

    // 6. Fireworks
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      fw.mesh.position.y += fw.vy * dt;
      fw.fuse -= dt;
      if (fw.fuse <= 0) {
        for (let s = 0; s < 16; s++) {
          const angle = (s / 16) * Math.PI * 2;
          const pitch = (Math.random() - 0.5) * 4;
          this.spawnParticle(
            fw.mesh.position.x,
            fw.mesh.position.y,
            fw.mesh.position.z,
            fw.color,
            0.24,
            { x: Math.cos(angle) * 6, y: pitch + 2, z: Math.sin(angle) * 6 },
            0.8
          );
        }
        this.scene.remove(fw.mesh);
        fw.mesh.material.dispose();
        this.fireworks.splice(i, 1);
      }
    }

    // 7. Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 9.8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = Math.max(0.02, (p.life / p.maxLife) * p.baseSize);
      p.mesh.scale.set(s, s, s);
    }
  }
}

window.EntityManager = EntityManager;
