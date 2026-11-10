// VoxelCraft House Builder & AI Kid Code Studio (Swarm-Upgraded v3)
// - 60-FPS InstancedMesh + Multi-Face UV Atlas + Smooth Staircase Camera Lerp + Dynamic Warm Interior Light
// - Interactive Furniture (Doors, Cozy Bed Sleep Cycle, Disco Jukebox Party, Magic Bookshelf, Undo-Safe Super TNT)
// - Rideable Pets & Giant T-Rex + Launchable 3D Space Rocket + 60-FPS Weather (Snow, Rain, Fireflies)
// - "Talk to AI Builder" Voice-to-Code + Spoken AI Robot Narrator + ScratchJr Interactive Code Pills
// - 5-Star Kid Builder Sticker Quests + Automatic localStorage World Saving

class MinecraftKidStudio {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x74c7ff);
    this.scene.fog = new THREE.FogExp2(0x74c7ff, 0.01);

    this.camera = new THREE.PerspectiveCamera(
      68,
      window.innerWidth / window.innerHeight,
      0.1,
      180
    );
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Initialize Multi-Face Procedural Pixel-Art Textures
    window.textureFactory.buildAll();

    // Sunlight & Ambient Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5d6, 0.85);
    this.sunLight.position.set(25, 42, 25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 110;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Warm Dynamic Interior House Light (glows automatically when walking inside any roofed house!)
    this.interiorLight = new THREE.PointLight(0xffb347, 0, 15, 1.5);
    this.scene.add(this.interiorLight);

    // World & Entities
    this.world = new VoxelWorld(this.scene);
    this.entities = new EntityManager(this.scene, this.world, this.camera);

    // Sevak's 6 Master Challenges State
    this.quests = {
      mason40: false,     // Hand-build 40 blocks (+60 Coins)
      climber10: false,   // Climb to altitude Y>=10 without Fly (+75 Coins)
      speedblitz: false,  // Win a 30s Timed Blitz (+100 Coins)
      treasure12: false,  // Collect 12 High-Altitude & World Coins (+80 Coins)
      trexroof: false,    // Ride T-Rex & jump to Y>=3.8 (+75 Coins)
      architect3: false   // Deploy 3 Bases + Hand-Build 20 blocks (+100 Coins)
    };

    // Skill-Based Progression Counters & Active Timed Challenge State
    this.coins = 0;
    this.xp = 0;
    this.level = 1;
    this.handCraftedBlocks = 0;
    this.coinsCollectedCount = 0;
    this.basesDeployedCount = 0;
    this.streakCount = 0;
    this.lastActionTime = 0;

    // Live Timed Challenge State ('build' = 25 blocks in 30s, 'coins' = 8 coins in 35s)
    this.activeChallenge = null; // { type, timeLeft, progress, target, reward, label }

    this.upgrades = {
      turboBoots: { unlocked: false, active: false, cost: 60,  name: '⚡ Turbo Sprint Boots', icon: '⚡' },
      megaBrush:  { unlocked: false, active: false, cost: 100, name: '🏰 5×5 Mega Builder', icon: '🏰' },
      goldenBot:  { unlocked: false, active: false, cost: 140, name: '🤖 Golden Sevak-Bot 2.5x', icon: '🤖' },
      moonBounce: { unlocked: false, active: false, cost: 180, name: '🦘 Gravity Jump Boots', icon: '🦘' },
      kingCrown:  { unlocked: false, active: false, cost: 220, name: "👑 Sevak's Royal Crown", icon: '👑' },
      coinMagnet: { unlocked: false, active: false, cost: 260, name: '🧲 Treasure Magnet Field', icon: '🧲' }
    };

    // Player State (player.y is at FEET level; standing on y=0 grass block means player.y = 0.5)
    // Default to 3rd-Person Hero Camera on phones/tablets so the player sees their 3D character walk & jump!
    this.player = {
      x: 0,
      y: 0.5,
      z: 3.5,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: 0.02,
      stepOffset: 0,      // Smooth exponential decay for 1-block stair step-ups
      shakeTimer: 0,      // Camera shake timer for TNT & Rocket launches
      mountedPet: null,   // Currently ridden animal (wolf, pig, chicken, trex)
      speedMultiplier: 1.0,
      gravityMultiplier: 1.0,
      onGround: true,
      flying: false,
      thirdPerson: window.innerWidth <= 1024
    };

    // Load saved village from localStorage or generate fresh starter village, then sync with Google Cloud Run backend
    const saved = this.world.loadFromLocalStorage();
    if (saved) {
      this.restoreSavedMeta(saved);
    } else {
      this.world.generateInitialTerrain();
      this.world.syncFromCloudBackend().then((cloudWorld) => {
        if (cloudWorld && cloudWorld.v >= 4 && Array.isArray(cloudWorld.blocks) && cloudWorld.blocks.length >= 100) {
          this.world.applyWorldPayload(cloudWorld);
          this.restoreSavedMeta(cloudWorld);
        }
      });
    }

    // Spawn Companions & Giant T-Rex in the side meadow!
    this.entities.spawnAnimal('wolf', -3, 3);
    this.entities.spawnAnimal('pig', 5, 2);
    this.entities.spawnAnimal('chicken', 3, 4);
    this.entities.spawnAnimal('trex', -11, 2);

    // Spawn Skill-Based Parkour & Rooftop Treasure Coins & hook up collection!
    this.entities.onCoinPickup = (val) => {
      this.coinsCollectedCount++;
      if (this.activeChallenge && this.activeChallenge.type === 'coins') {
        this.activeChallenge.progress++;
        if (this.activeChallenge.progress >= this.activeChallenge.target) {
          this.completeTimedChallenge();
        }
      }
      this.awardCoins(val, `Treasure Coin (${this.coinsCollectedCount}/12)`, false);
      this.renderQuestUI();
      if (this.coinsCollectedCount >= 12) {
        this.completeQuest('treasure12', 'Collected 12 Parkour & Rooftop Treasure Coins!', 80);
      }
    };
    this.spawnStarterYardCoins();

    // Building Tools & Brush State
    this.selectedBlockId = 1; // Red Brick
    this.entities.setHeldBlock(this.selectedBlockId);
    this.toolMode = 'build';  // 'build', 'walk', or 'break'
    this.brushMode = '1x1';   // '1x1', 'wall', 'floor', 'rainbow', 'mega5x5'
    this.rainbowStep = 0;
    this.currentTheme = 'day';

    // Input, Analog Joystick, Auto-Walk, Quick-Tap Glide & Tap-to-Walk State
    this.keys = {};
    this.moveButtons = {
      forward: false,
      backward: false,
      turnLeft: false,
      turnRight: false,
      up: false,
      down: false
    };
    this.joyForward = 0;
    this.joyTurn = 0;
    this.joyStrafe = 0;
    this.autoWalkActive = false;
    this.glideForwardTimer = 0;
    this.glideForwardDir = 1;
    this.glideTurnTimer = 0;
    this.glideTurnDir = 0;
    this.walkTarget = null;

    this.mouseNdc = new THREE.Vector2(0, 0);
    this.isPointerLocked = false;
    this.isMouseDown = false;
    this.dragDist = 0;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.raycaster = new THREE.Raycaster();
    this.currentHit = null;

    // 1. Wireframe Outline on Targeted Block
    const wireGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
    this.targetWireframe = new THREE.LineSegments(
      wireGeom,
      new THREE.LineBasicMaterial({ color: 0x111827, linewidth: 2 })
    );
    this.targetWireframe.visible = false;
    this.scene.add(this.targetWireframe);

    // 1B. Glowing 3D Tap-to-Walk Destination Beacon Ring
    this.walkTargetRing = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.56, 24),
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88
      })
    );
    outerRing.rotation.x = -Math.PI / 2;
    const innerDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 20),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      })
    );
    innerDisc.rotation.x = -Math.PI / 2;
    innerDisc.position.y = 0.01;
    this.walkTargetRing.add(outerRing);
    this.walkTargetRing.add(innerDisc);
    this.walkTargetRing.visible = false;
    this.scene.add(this.walkTargetRing);

    // 2. Translucent Ghost Preview Meshes (up to 25 blocks for 5x5 Mega Brush!)
    this.ghostGroup = new THREE.Group();
    this.ghostMeshes = [];
    const ghostGeom = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    this.ghostMatBuild = new THREE.MeshBasicMaterial({
      color: 0x34f5e5,
      transparent: true,
      opacity: 0.36,
      depthWrite: false
    });
    this.ghostMatInteractive = new THREE.MeshBasicMaterial({
      color: 0xffd026,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    this.ghostMatBreak = new THREE.MeshBasicMaterial({
      color: 0xff3b3b,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    for (let i = 0; i < 25; i++) {
      const gm = new THREE.Mesh(ghostGeom, this.ghostMatBuild);
      gm.visible = false;
      this.ghostGroup.add(gm);
      this.ghostMeshes.push(gm);
    }
    this.scene.add(this.ghostGroup);

    this.triggerShake = (duration = 0.5) => {
      this.player.shakeTimer = Math.max(this.player.shakeTimer, duration);
    };

    this.setupUI();
    this.setupVoiceCommander();
    this.setupControls();
    this.applyUpgrades();
    this.renderQuestUI();
    this.renderCoinAndUpgradeUI();

    this.clock = new THREE.Clock();
    this.elapsedTime = 0;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  restoreSavedMeta(data) {
    if (!data) return;
    if (data.quests) {
      for (const k of Object.keys(this.quests)) {
        if (typeof data.quests[k] === 'boolean') {
          this.quests[k] = data.quests[k];
        }
      }
    }
    if (typeof data.coins === 'number') this.coins = Math.max(0, data.coins);
    if (typeof data.xp === 'number') this.xp = Math.max(0, data.xp);
    if (typeof data.level === 'number') this.level = Math.max(1, data.level);
    if (typeof data.handCraftedBlocks === 'number') this.handCraftedBlocks = Math.max(0, data.handCraftedBlocks);
    if (typeof data.coinsCollectedCount === 'number') this.coinsCollectedCount = Math.max(0, data.coinsCollectedCount);
    if (typeof data.basesDeployedCount === 'number') this.basesDeployedCount = Math.max(0, data.basesDeployedCount);
    if (data.upgrades && typeof data.upgrades === 'object') {
      for (const k of Object.keys(this.upgrades)) {
        if (data.upgrades[k]) {
          this.upgrades[k].unlocked = !!data.upgrades[k].unlocked;
          this.upgrades[k].active = !!data.upgrades[k].active;
        }
      }
    }
    if (data.kidName) {
      const inp = document.getElementById('kid-name-input');
      if (inp) inp.value = data.kidName;
    }
    this.applyUpgrades();
    this.renderQuestUI();
    this.renderCoinAndUpgradeUI();
  }

  // Skill-Based Parkour & Rooftop Treasure Coins (Must climb, bounce, or explore to collect!)
  spawnStarterYardCoins() {
    // 1. Along the 10-Block Sevak Parkour Tower steps & Y=10 Summit Jackpot!
    const towerCoins = [
      [10, 2.2, -6, 10],
      [12, 4.2, -8, 10],
      [10, 6.2, -10, 15],
      [8, 8.2, -8, 15],
      [10, 11.4, -8, 25], // Summit Jackpot Coin at Y=11!
      [9, 11.2, -8, 20],
      [11, 11.2, -8, 20]
    ];
    // 2. High above the Slime Trampoline (must bounce high to grab in mid-air!) & on Base Rooftop
    const parkourCoins = [
      [-8, 4.2, -6, 15],
      [-8, 6.8, -6, 20],
      [0, 6.4, -9, 20],   // Top of Sevak's Base Roof
      [-2, 5.4, -9, 15],
      [2, 5.4, -9, 15],
      [0, 1.5, -10, 10],  // Inside Base Vault
      [-11, 2.2, 2, 15]   // Guarded by the T-Rex
    ];
    for (const [cx, cy, cz, val] of [...towerCoins, ...parkourCoins]) {
      this.entities.spawnWorldCoin(cx, cy, cz, val);
    }
  }

  // Spawns High-Altitude Treasure Coins on the roof/towers of newly deployed structures!
  spawnRooftopTreasureCoins(centerX, centerZ) {
    const offsets = [
      [0, 6.5, 0, 15],
      [-2, 5.5, 0, 15],
      [2, 5.5, 0, 15],
      [0, 8.5, 0, 20]
    ];
    for (const [dx, dy, dz, val] of offsets) {
      this.entities.spawnWorldCoin(centerX + dx, dy, centerZ + dz, val);
    }
  }

  getLevelTitle(lvl = this.level) {
    const titles = [
      'Scout Builder',
      'Field Engineer',
      'Fortress Architect',
      'Parkour Master',
      'Redstone Commander',
      'Grandmaster of SevakCraft'
    ];
    return titles[Math.min(titles.length - 1, Math.max(0, lvl - 1))];
  }

  // Earned Kudos & Coin Engine — Only triggers on real milestones, challenges, and treasure collection!
  awardCoins(amount, actionLabel = 'Challenge Milestone', speakPraise = false) {
    if (amount <= 0) return;

    this.coins += amount;
    this.xp += amount;

    window.soundEngine.playCoin();

    const kidName = (document.getElementById('kid-name-input')?.value || 'SEVAK').trim().toUpperCase();
    const praises = [
      `⚡ EARNED +${amount} 🪙`,
      `🏆 SKILL BONUS +${amount} 🪙`,
      `🔥 MASTER MOVE +${amount} 🪙`,
      `👑 ${kidName} +${amount} 🪙`
    ];
    const header = praises[Math.floor(Math.random() * praises.length)];
    this.spawnFloatingDopamine(`${header} • ${actionLabel}`);

    if (speakPraise) {
      window.soundEngine.speak(`${actionLabel}! Earned ${amount} Gold Coins!`);
    }

    // Check for Rank-Up (every 180 XP * level — requires real achievements to rank up!)
    const nextThreshold = this.level * 180;
    if (this.xp >= nextThreshold) {
      this.xp -= nextThreshold;
      this.level++;
      this.coins += 60; // Rank-up bonus
      const title = this.getLevelTitle(this.level);
      this.triggerFireworksShow();
      window.soundEngine.playLevelUpFanfare();
      this.triggerCelebrationCard(
        '🏆',
        `RANK UP! LEVEL ${this.level}: ${title.toUpperCase()}!`,
        `Outstanding engineering, ${kidName}! +60 Bonus Coins awarded for reaching Level ${this.level}!`,
        `Rank Up! ${kidName} reached Level ${this.level}, ${title}! Plus 60 bonus coins!`
      );
    }

    this.renderCoinAndUpgradeUI();
    this.scheduleAutoSave();
  }

  // Live Timed Challenge Engine ('build' = 25 blocks in 30s, 'coins' = 8 coins in 35s)
  startTimedChallenge(type = 'build') {
    window.soundEngine.init();
    this.closeAllMobileDrawers?.();

    if (type === 'coins') {
      // Disable Jetpack Fly for fair parkour challenge!
      if (this.player.flying) {
        this.toggleFly();
      }
      this.activeChallenge = {
        type: 'coins',
        timeLeft: 35.0,
        progress: 0,
        target: 8,
        reward: 90,
        label: '🏃 35s Parkour Coin Rush'
      };
      // Spawn fresh parkour coins across the tower, trampoline, and yard!
      this.spawnStarterYardCoins();
      this.showBanner('🏃 COIN RUSH STARTED! Collect 8 Gold Coins across the village & tower in 35 seconds!', true);
    } else {
      this.activeChallenge = {
        type: 'build',
        timeLeft: 30.0,
        progress: 0,
        target: 25,
        reward: 100,
        label: '⏱️ 30s Speed-Build Blitz'
      };
      this.toolMode = 'build';
      document.getElementById('mode-build-btn')?.classList.add('active');
      document.getElementById('mode-walk-btn')?.classList.remove('active');
      document.getElementById('mode-mine-btn')?.classList.remove('active');
      this.showBanner('⏱️ SPEED-BUILD BLITZ! Place 25 blocks in 30 seconds! (Tip: Use Wall or 3×3 brush!)', true);
    }
    this.updateChallengeHUD();
  }

  updateTimedChallenge(dt) {
    if (!this.activeChallenge) return;
    this.activeChallenge.timeLeft -= dt;
    if (this.activeChallenge.timeLeft <= 0) {
      const ch = this.activeChallenge;
      this.activeChallenge = null;
      this.updateChallengeHUD();
      this.showBanner(
        `⏱️ Time's Up on ${ch.label}! You reached ${ch.progress}/${ch.target}. Tap ⚔️ Challenge to try again!`,
        true
      );
      return;
    }
    this.updateChallengeHUD();
  }

  completeTimedChallenge() {
    if (!this.activeChallenge) return;
    const ch = this.activeChallenge;
    const timeSaved = Math.ceil(ch.timeLeft);
    this.activeChallenge = null;
    this.updateChallengeHUD();

    this.triggerFireworksShow();
    window.soundEngine.playQuestFanfare();
    if (!this.quests.speedblitz) {
      this.completeQuest('speedblitz', `Won ${ch.label} with ${timeSaved}s left!`, 100);
    } else {
      this.awardCoins(ch.reward, `⚡ Won ${ch.label} (${timeSaved}s left)!`, false);
      this.triggerCelebrationCard(
        '⏱️',
        `BLITZ VICTORY! +${ch.reward} COINS!`,
        `Conquered ${ch.label} with ${timeSaved} seconds remaining!`,
        `Blitz Victory! You beat the clock with ${timeSaved} seconds remaining and earned ${ch.reward} gold coins!`
      );
    }
  }

  updateChallengeHUD() {
    const pill = document.getElementById('challenge-timer-pill');
    if (!pill) return;
    if (!this.activeChallenge) {
      pill.classList.add('hidden');
      return;
    }
    const ch = this.activeChallenge;
    const secs = Math.max(0, Math.ceil(ch.timeLeft));
    const unit = ch.type === 'coins' ? '🪙' : '🧱';
    pill.textContent = `⏱️ ${secs}s • ${ch.progress}/${ch.target} ${unit}`;
    pill.classList.remove('hidden');
  }

  spawnFloatingDopamine(text) {
    const layer = document.getElementById('dopamine-layer');
    if (!layer) return;
    const el = document.createElement('div');
    el.className = 'dopamine-float';
    el.textContent = text;
    const leftPct = 44 + (Math.random() - 0.5) * 16;
    const topPct = 26 + (Math.random() - 0.5) * 10;
    el.style.left = `${leftPct}%`;
    el.style.top = `${topPct}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 1400);

    const coinPill = document.getElementById('coin-bank-pill');
    if (coinPill) {
      coinPill.classList.remove('coin-bounce');
      void coinPill.offsetWidth;
      coinPill.classList.add('coin-bounce');
    }
  }

  triggerCelebrationCard(emoji, title, subtitle, speakText = null) {
    const card = document.getElementById('dopamine-celebration-card');
    if (!card) return;
    const emEl = document.getElementById('cel-emoji');
    const tiEl = document.getElementById('cel-title');
    const suEl = document.getElementById('cel-sub');
    if (emEl) emEl.textContent = emoji;
    if (tiEl) tiEl.textContent = title;
    if (suEl) suEl.textContent = subtitle;

    card.classList.remove('hidden');
    clearTimeout(this.celTimeout);
    this.celTimeout = setTimeout(() => {
      card.classList.add('hidden');
    }, 4200);

    if (speakText) {
      window.soundEngine.speak(speakText);
    }
  }

  handleUpgradeClick(upgradeKey) {
    const up = this.upgrades[upgradeKey];
    if (!up) return;
    const kidName = (document.getElementById('kid-name-input')?.value || 'SEVAK').trim().toUpperCase();

    if (up.unlocked) {
      up.active = !up.active;
      window.soundEngine.playUpgradeUnlock();
      this.applyUpgrades();
      this.renderCoinAndUpgradeUI();
      this.scheduleAutoSave();
      this.showBanner(
        up.active ? `${up.icon} ${up.name} Equipped!` : `${up.icon} ${up.name} Disabled`,
        true
      );
      return;
    }

    if (this.coins < up.cost) {
      const needed = up.cost - this.coins;
      window.soundEngine.playBreak();
      this.showBanner(
        `🔒 Need ${needed} more 🪙 for ${up.name}! Complete a ⚔️ Timed Blitz or climb the Y=10 Parkour Tower to earn coins!`,
        true
      );
      return;
    }

    // Unlock the Armory Upgrade with hard-earned coins!
    this.coins -= up.cost;
    up.unlocked = true;
    up.active = true;
    window.soundEngine.playUpgradeUnlock();
    this.applyUpgrades();
    this.renderCoinAndUpgradeUI();
    this.scheduleAutoSave();

    const pos = this.getHousePlotInFront(5);
    this.entities.launchFirework(pos.x, 2, pos.z);
    if (upgradeKey === 'megaBrush') {
      document.getElementById('brush-mega5x5-btn')?.click();
    } else if (upgradeKey === 'kingCrown') {
      if (!this.player.thirdPerson) {
        this.toggleCameraView();
      }
    }

    this.renderVisualCode({
      actor: '⚡ SEVAK_ARMORY',
      verb: 'equipUpgrade',
      arg: up.name.toUpperCase(),
      explanation: `⚡ Unlocked ${up.name}! Click it anytime in the Armory to toggle ON or OFF.`
    });

    this.triggerCelebrationCard(
      up.icon,
      `ARMORY UNLOCKED: ${up.name.toUpperCase()}!`,
      `Well earned, ${kidName}! ${up.name} is now equipped and active!`,
      `Armory Upgrade Unlocked! ${up.name} is now active!`
    );
  }

  applyUpgrades() {
    // 1. Turbo Sprint Boots (1.8x Walk & Ride Speed!)
    const turboOn = this.upgrades.turboBoots.unlocked && this.upgrades.turboBoots.active;
    this.player.speedMultiplier = turboOn ? 1.8 : 1.0;
    const speedSlider = document.getElementById('slider-speed');
    const speedVal = document.getElementById('val-speed');
    if (speedSlider) speedSlider.value = String(this.player.speedMultiplier);
    if (speedVal) speedVal.textContent = turboOn ? '⚡ 1.8x Turbo' : `${this.player.speedMultiplier.toFixed(1)}x`;

    // 2. Golden Sevak-Bot 2.5x Laser
    const goldBotOn = this.upgrades.goldenBot.unlocked && this.upgrades.goldenBot.active;
    this.entities.setGoldenBotUpgrade(goldBotOn);

    // 3. Sevak's Royal Crown & 3D Trail
    const crownOn = this.upgrades.kingCrown.unlocked && this.upgrades.kingCrown.active;
    this.entities.setCrownAndTrailUpgrade(crownOn);

    // 4. Treasure Magnet Field
    const magnetOn = this.upgrades.coinMagnet.unlocked && this.upgrades.coinMagnet.active;
    this.entities.setCoinMagnetUpgrade(magnetOn);
  }

  renderCoinAndUpgradeUI() {
    const coinEl = document.getElementById('hud-coin-count');
    if (coinEl) coinEl.textContent = String(this.coins);

    const lvlEl = document.getElementById('hud-level-badge');
    if (lvlEl) lvlEl.textContent = `🏆 LVL ${this.level} • ${this.getLevelTitle(this.level)}`;

    const xpFill = document.getElementById('hud-xp-fill');
    if (xpFill) {
      const pct = Math.min(100, Math.round((this.xp / (this.level * 180)) * 100));
      xpFill.style.width = `${Math.max(6, pct)}%`;
    }

    const streakEl = document.getElementById('hud-streak-pill');
    if (streakEl) {
      if (this.handCraftedBlocks >= 25) {
        streakEl.textContent = `🔨 ${this.handCraftedBlocks} Crafted`;
        streakEl.classList.remove('hidden');
      } else {
        streakEl.classList.add('hidden');
      }
    }

    document.querySelectorAll('.upgrade-btn').forEach((btn) => {
      const key = btn.dataset.upgrade;
      const up = this.upgrades[key];
      if (!up) return;
      const priceEl = btn.querySelector('.up-price');
      btn.classList.toggle('unlocked', up.unlocked);
      btn.classList.toggle('disabled-toggle', up.unlocked && !up.active);
      btn.classList.toggle('can-afford', !up.unlocked && this.coins >= up.cost);
      if (priceEl) {
        priceEl.textContent = up.unlocked ? (up.active ? '✅ ON' : '⏸️ OFF') : `🪙 ${up.cost}`;
      }
    });
  }

  scheduleAutoSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      const kidName = document.getElementById('kid-name-input')?.value || 'SEVAK';
      const ok = this.world.saveToLocalStorage({
        v: 4,
        quests: this.quests,
        coins: this.coins,
        xp: this.xp,
        level: this.level,
        handCraftedBlocks: this.handCraftedBlocks,
        coinsCollectedCount: this.coinsCollectedCount,
        basesDeployedCount: this.basesDeployedCount,
        upgrades: this.upgrades,
        kidName
      });
      if (ok) {
        const badge = document.getElementById('save-status-pill');
        if (badge) {
          badge.textContent = '☁️ GCP Saved!';
          badge.classList.add('saved-flash');
          setTimeout(() => badge.classList.remove('saved-flash'), 900);
        }
      }
    }, 500);
  }

  // Sevak's 6 Master Challenges (Earned via real building, parkour climbing, and timed blitzes!)
  completeQuest(questId, message, rewardCoins = 75) {
    if (!(questId in this.quests) || this.quests[questId]) return;
    this.quests[questId] = true;
    this.renderQuestUI();
    window.soundEngine.playQuestFanfare();
    const pos = this.getHousePlotInFront(5);
    this.entities.launchFirework(pos.x, 2, pos.z);
    this.awardCoins(rewardCoins, `🏆 Challenge: ${message}`, false);
    const kidName = (document.getElementById('kid-name-input')?.value || 'SEVAK').trim().toUpperCase();
    this.triggerCelebrationCard(
      '⚔️',
      `CHALLENGE CONQUERED! +${rewardCoins} COINS!`,
      `${message} — Impressive skill, ${kidName}!`,
      `Challenge Conquered! ${message}! Earned ${rewardCoins} Gold Coins!`
    );

    const allDone = Object.values(this.quests).every(Boolean);
    if (allDone && !this.masterCelebrated) {
      this.masterCelebrated = true;
      setTimeout(() => {
        this.triggerFireworksShow();
        this.awardCoins(250, '👑 All 6 Sevak Master Challenges!', false);
        this.triggerCelebrationCard(
          '👑',
          'GRANDMASTER OF SEVAKCRAFT! 6 / 6!',
          `Unstoppable, ${kidName}! You conquered all 6 Master Challenges + 250 Bonus Coins!`,
          `Congratulations ${kidName}! You conquered all 6 Master Challenges and are the Grandmaster of SevakCraft!`
        );
      }, 2200);
    }
  }

  renderQuestUI() {
    const masonEl = document.getElementById('q-label-mason40');
    if (masonEl) {
      masonEl.textContent = `🧱 Master Mason (${Math.min(40, this.handCraftedBlocks)}/40 Blocks) • +60🪙`;
    }
    const treasureEl = document.getElementById('q-label-treasure12');
    if (treasureEl) {
      treasureEl.textContent = `🪙 Treasure Hunter (${Math.min(12, this.coinsCollectedCount)}/12 Coins) • +80🪙`;
    }
    const archEl = document.getElementById('q-label-architect3');
    if (archEl) {
      archEl.textContent = `🏰 Empire Builder (${Math.min(3, this.basesDeployedCount)}/3 Bases + ${Math.min(20, this.handCraftedBlocks)}/20 Blk) • +100🪙`;
    }

    let doneCount = 0;
    document.querySelectorAll('.quest-item').forEach((item) => {
      const qid = item.dataset.quest;
      const isDone = !!this.quests[qid];
      if (isDone) doneCount++;
      item.classList.toggle('done', isDone);
      const starEl = item.querySelector('.quest-star');
      if (starEl) starEl.textContent = isDone ? '🏆' : '☆';
    });
    const totalEl = document.getElementById('quest-star-total');
    if (totalEl) {
      totalEl.textContent = doneCount === 6 ? '👑 6 / 6 🏆' : `${doneCount} / 6 🏆`;
    }
  }

  // True 3D AABB Voxel Collision Solver
  checkAABBCollision(px, py, pz) {
    const halfW = 0.28;
    const minX = Math.floor(px - halfW + 0.5);
    const maxX = Math.floor(px + halfW + 0.5);
    const minZ = Math.floor(pz - halfW + 0.5);
    const maxZ = Math.floor(pz + halfW + 0.5);
    const minY = Math.floor(py + 0.04 + 0.5);
    const maxY = Math.floor(py + 1.60 + 0.5);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          if (this.world.isSolid(bx, by, bz)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  isInteractiveBlock(blockId) {
    return (
      blockId === 5 ||  // Closed Door
      blockId === 18 || // Open Door
      blockId === 7 ||  // Cozy Bed (Sleep Cycle)
      blockId === 19 || // Disco Jukebox (Dance Music)
      blockId === 20 || // Super TNT (Ignite Fuse)
      blockId === 8     // Magic Bookshelf (Treasure Sparkle)
    );
  }

  getBrushPositions(hit) {
    if (!hit) return [];
    if (this.toolMode === 'break') {
      return [{ x: hit.x, y: hit.y, z: hit.z }];
    }

    const baseX = hit.x + hit.normal.x;
    const baseY = hit.y + hit.normal.y;
    const baseZ = hit.z + hit.normal.z;

    if (this.selectedBlockId === 5) {
      return [
        { x: baseX, y: baseY, z: baseZ },
        { x: baseX, y: baseY + 1, z: baseZ }
      ];
    }

    if (this.brushMode === '1x1') {
      return [{ x: baseX, y: baseY, z: baseZ }];
    }

    if (this.brushMode === 'wall') {
      const lookX = Math.abs(Math.sin(this.player.yaw));
      const lookZ = Math.abs(Math.cos(this.player.yaw));
      const list = [];
      for (let d = -1; d <= 1; d++) {
        if (lookZ >= lookX) {
          list.push({ x: baseX + d, y: baseY, z: baseZ });
        } else {
          list.push({ x: baseX, y: baseY, z: baseZ + d });
        }
      }
      return list;
    }

    if (this.brushMode === 'floor') {
      const list = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          list.push({ x: baseX + dx, y: baseY, z: baseZ + dz });
        }
      }
      return list;
    }

    if (this.brushMode === 'mega5x5') {
      const list = [];
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          list.push({ x: baseX + dx, y: baseY, z: baseZ + dz });
        }
      }
      return list;
    }

    if (this.brushMode === 'rainbow') {
      // 5-block mini rainbow arch!
      const lookX = Math.abs(Math.sin(this.player.yaw));
      const lookZ = Math.abs(Math.cos(this.player.yaw));
      const list = [];
      for (let d = -2; d <= 2; d++) {
        const archH = 2 - Math.abs(d);
        if (lookZ >= lookX) {
          list.push({ x: baseX + d, y: baseY + archH, z: baseZ });
        } else {
          list.push({ x: baseX, y: baseY + archH, z: baseZ + d });
        }
      }
      return list;
    }

    return [{ x: baseX, y: baseY, z: baseZ }];
  }

  updateTargetBlock() {
    this.updateRaycastAndGhost();
  }

  updateRaycastAndGhost() {
    if (this.isPointerLocked) {
      this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    } else {
      this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    }

    const ray = this.raycaster.ray;
    const hit = this.world.raycast(ray.origin, ray.direction, 22);
    this.currentHit = hit;

    for (const gm of this.ghostMeshes) {
      gm.visible = false;
    }

    if (!hit) {
      this.targetWireframe.visible = false;
      return;
    }

    this.targetWireframe.position.set(hit.x, hit.y, hit.z);
    this.targetWireframe.visible = true;

    // Highlight interactive furniture (Doors, Beds, Jukebox, TNT, Bookshelf) in glowing gold!
    if ((this.toolMode === 'build' || this.toolMode === 'walk') && this.isInteractiveBlock(hit.blockId)) {
      this.ghostMeshes[0].material = this.ghostMatInteractive;
      this.ghostMeshes[0].position.set(hit.x, hit.y, hit.z);
      this.ghostMeshes[0].visible = true;
      return;
    }

    if (this.toolMode === 'walk') {
      this.ghostMeshes[0].material = this.ghostMatInteractive;
      this.ghostMeshes[0].position.set(hit.x, hit.y, hit.z);
      this.ghostMeshes[0].visible = true;
      return;
    }

    const positions = this.getBrushPositions(hit);
    const mat = this.toolMode === 'break' ? this.ghostMatBreak : this.ghostMatBuild;
    for (let i = 0; i < positions.length && i < this.ghostMeshes.length; i++) {
      this.ghostMeshes[i].material = mat;
      this.ghostMeshes[i].position.set(positions[i].x, positions[i].y, positions[i].z);
      this.ghostMeshes[i].visible = true;
    }
  }

  setWalkDestination(tx, ty, tz, bannerMsg = null) {
    const clampedX = Math.max(-23, Math.min(23, tx));
    const clampedZ = Math.max(-23, Math.min(23, tz));
    const groundY = Math.max(0.5, ty);
    this.walkTarget = { x: clampedX, y: groundY, z: clampedZ };
    this.walkTargetRing.position.set(clampedX, groundY + 0.04, clampedZ);
    this.walkTargetRing.visible = true;
    this.entities.spawnBlockBurst(clampedX, groundY + 0.25, clampedZ, 0x10b981, 8);
    window.soundEngine.playPlace(11);
    if (bannerMsg) {
      this.showBanner(bannerMsg);
    }
  }

  goToLandmark(place) {
    window.soundEngine.init();
    this.closeAllMobileDrawers?.();
    this.autoWalkActive = false;
    document.getElementById('pad-autowalk')?.classList.remove('active');

    if (place === 'parkour-tower') {
      this.player.flying = false;
      document.getElementById('btn-fly')?.classList.remove('active');
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
      this.player.x = 10;
      this.player.y = 0.5;
      this.player.z = -3.6;
      this.player.yaw = 0;
      this.player.pitch = 0.18;
      this.entities.spawnBlockBurst(10, 1.5, -8, 0x38bdf8, 14);
      window.soundEngine.playBuildChime();
      this.showBanner('🏔️ Sevak\'s 10-Block Parkour Tower! Climb the spiral stairs to Y=10 (No Fly!) for +75 🪙!', true);
      return;
    }

    if (place === 'house-door') {
      const doorBlock = this.world.getBlock(0, 1, -5);
      if (doorBlock && doorBlock.blockId === 5) {
        this.world.toggleDoorAt(0, 1, -5);
      }
      this.player.flying = false;
      document.getElementById('btn-fly')?.classList.remove('active');
      this.player.x = 0;
      this.player.y = 0.5;
      this.player.z = -1.8;
      this.player.yaw = 0;
      this.player.pitch = 0.02;
      this.setWalkDestination(0, 0.5, -3.6, '🚪 Walking right up to Sevak\'s Base Front Door!');
      return;
    }

    if (place === 'inside-house') {
      const doorBlock = this.world.getBlock(0, 1, -5);
      if (doorBlock && doorBlock.blockId === 5) {
        this.world.toggleDoorAt(0, 1, -5);
      }
      this.player.flying = false;
      document.getElementById('btn-fly')?.classList.remove('active');
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
      this.player.x = 0;
      this.player.y = 1.5;
      this.player.z = -8.2;
      this.player.yaw = 0;
      this.player.pitch = -0.05;
      this.entities.spawnBlockBurst(0, 2.2, -9, 0xfde047, 14);
      window.soundEngine.playBuildChime();
      this.showBanner('🛋️ Inside Sevak\'s Base! Climb the roof outside to collect Rooftop Gold Coins!', true);
      return;
    }

    if (place === 'ride-trex') {
      let trex = this.entities.animals.find((a) => a.type === 'trex');
      if (!trex) {
        trex = this.entities.spawnAnimal('trex', -9, 2);
      }
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
      if (this.player.mountedPet !== trex) {
        this.player.mountedPet = null;
        this.toggleRidePet(trex);
      } else {
        this.showBanner('🦖 Riding Giant T-Rex! Mega-Jump onto a roof (Y≥4) to beat the T-Rex Roof Jump Challenge!', true);
      }
      return;
    }

    if (place === 'trampoline') {
      this.player.flying = false;
      document.getElementById('btn-fly')?.classList.remove('active');
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
      this.player.x = -8;
      this.player.y = 2.6;
      this.player.z = -6;
      this.player.vy = 15.2;
      this.player.onGround = false;
      this.player.yaw = -0.45;
      window.soundEngine.playBounce();
      this.entities.spawnBlockBurst(-8, 2.0, -6, 0x22c55e, 14);
      this.showBanner('🟢 BOING! High-Altitude Slime Trampoline! Grab the mid-air Gold Coins!', true);
      return;
    }

    if (place === 'sky-fly') {
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
      if (!this.player.flying) {
        this.toggleFly();
      }
      this.player.y = Math.max(this.player.y + 4.5, 7.5);
      this.player.pitch = -0.22;
      this.entities.spawnBlockBurst(this.player.x, this.player.y, this.player.z, 0x38bdf8, 14);
      this.showBanner('🚁 Sky Fly View! (Note: Sky Climber Y=10 challenge requires climbing WITHOUT Fly!)', true);
    }
  }

  performClickAction(overrideMode = null) {
    this.entities.triggerHandSwing();

    // 0. Check if player clicked on a Pet or T-Rex in the yard to Ride!
    if (!overrideMode) {
      const clickedAnimal = this.entities.findClickedAnimal(this.raycaster, 14);
      if (clickedAnimal) {
        window.soundEngine.playAnimalSound(clickedAnimal.type);
        this.entities.spawnBlockBurst(
          clickedAnimal.mesh.position.x,
          clickedAnimal.mesh.position.y + 1.0,
          clickedAnimal.mesh.position.z,
          0xff3366,
          10
        );
        this.toggleRidePet(clickedAnimal);
        return;
      }
    }

    if (!this.currentHit) return;
    const hit = this.currentHit;
    const mode = overrideMode || this.toolMode;

    // 1. INTERACTIVE HOUSE FURNITURE & TOYS (When clicked in Build Mode or Tap-to-Walk Mode)
    if (mode === 'build' || mode === 'walk') {
      // A. Front Door (Open / Close)
      if (hit.blockId === 5 || hit.blockId === 18) {
        this.world.beginUndoBatch();
        const isOpen = this.world.toggleDoorAt(hit.x, hit.y, hit.z);
        this.world.commitUndoBatch();
        if (isOpen && hit.distance > 2.2) {
          this.setWalkDestination(hit.x, 1.5, hit.z - 1.2);
        }
        this.renderVisualCode({
          actor: '🚪 FRONT_DOOR',
          verb: 'setOpen',
          arg: isOpen ? 'OPEN' : 'CLOSED',
          explanation: isOpen
            ? '🚪 Door Swung OPEN! Walk right inside Sevak\'s base!'
            : '🚪 Door CLOSED securely!'
        });
        this.showBanner(isOpen ? '🚪 Door Opened!' : '🚪 Door Closed!', false);
        this.scheduleAutoSave();
        return;
      }

      // B. Cozy Bed (Sleep Cycle: Night <-> Sunny Morning!)
      if (hit.blockId === 7) {
        const nextTheme = this.currentTheme === 'space' ? 'day' : 'space';
        this.setWorldTheme(nextTheme);
        window.soundEngine.playSleepChime(nextTheme === 'day');
        this.entities.spawnBlockBurst(hit.x, hit.y + 0.8, hit.z, 0xfde047, 12);
        this.renderVisualCode({
          actor: '🛏️ BASE_BUNK',
          verb: 'sleepUntil',
          arg: nextTheme === 'day' ? '☀️ DAYLIGHT' : '🌙 NIGHT_OPS',
          explanation: nextTheme === 'day'
            ? '☀️ Daylight mode restored!'
            : '🌙 Night Ops mode! Stars & glowing blocks activated!'
        });
        this.showBanner(
          nextTheme === 'day' ? '☀️ Daylight Mode Activated!' : '🌙 Night Ops Mode Activated!',
          false
        );
        return;
      }

      // C. Disco Jukebox (Play 8-bit Dance Music & Make Pets Dance!)
      if (hit.blockId === 19) {
        const playing = window.soundEngine.toggleDiscoMusic();
        this.entities.discoActive = playing;
        this.entities.spawnBlockBurst(hit.x, hit.y + 0.8, hit.z, 0xd946ef, 14);
        this.renderVisualCode({
          actor: '🎵 JUKEBOX',
          verb: 'playSynthBeat',
          arg: playing ? '💃 8BIT_BEAT_ON' : '⏸️ PAUSED',
          explanation: playing
            ? '🎵 8-Bit Synth Beat ON!'
            : '🎵 Music paused.'
        });
        this.showBanner(
          playing ? '🎵 8-Bit Synth Beat ON!' : '🎵 Music Paused',
          false
        );
        return;
      }

      // D. Magic Bookshelf (Engineering Tip!)
      if (hit.blockId === 8) {
        window.soundEngine.playBuildChime();
        this.entities.spawnBlockBurst(hit.x, hit.y + 0.6, hit.z, 0x34f5e5, 14);
        this.renderVisualCode({
          actor: '📚 CODEX_BOOK',
          verb: 'readBlueprintTip',
          arg: '⚔️ MASTER_CHALLENGES',
          explanation: '📚 Pro Tip: Climb the 10-Block Parkour Tower (No Fly) or beat a 30s Timed Blitz for big Gold Coin payouts!'
        });
        this.showBanner('📚 Codex Tip: Scale the Y=10 Parkour Tower or beat a 30s Timed Blitz for Gold Coins!', true);
        return;
      }

      // E. Super TNT Block (Light Fuse -> Undo-Safe Chain Reaction Boom!)
      if (hit.blockId === 20) {
        this.entities.igniteTNT(hit.x, hit.y, hit.z, 1.5);
        this.renderVisualCode({
          actor: '🧨 SUPER_TNT',
          verb: 'igniteFuse',
          arg: '💥 BOOM_1.5s',
          paramLabel: 'undo',
          paramValue: '↩️ Undo',
          onTweak: () => {
            if (this.world.undoLastAction()) {
              this.showBanner('↩️ Undo restored every block!', true);
            }
          },
          explanation: '🧨 TNT Fuse Lit! Stand back! (Press Z anytime to Undo demolition!)'
        });
        this.showBanner('🧨 SSSSS... TNT Fuse Lit! Stand clear! (Press Z after boom to Undo)', false);
        return;
      }
    }

    // 1B. TAP-TO-WALK MODE: Walk automatically to any tapped ground, path, or floor block!
    if (mode === 'walk') {
      const destX = hit.ny > 0 ? hit.x : hit.placeX;
      const destY = hit.ny > 0 ? hit.y + 0.5 : Math.max(0.5, hit.placeY - 0.5);
      const destZ = hit.ny > 0 ? hit.z : hit.placeZ;
      this.setWalkDestination(destX, destY, destZ, '👣 Moving to target coordinates!');
      return;
    }

    // 2. BREAK MODE
    if (mode === 'break') {
      if (hit.y <= 0) {
        this.showBanner('🌱 Bedrock grass layer is indestructible!', false);
        return;
      }
      const info = window.textureFactory.getBlockInfo(hit.blockId);
      const colorNum = parseInt(info.color.replace('#', '0x'), 16) || 0xc84b31;
      this.world.beginUndoBatch();
      const removed = this.world.removeBlock(hit.x, hit.y, hit.z);
      this.world.commitUndoBatch();
      if (removed) {
        window.soundEngine.playBreak();
        this.entities.spawnBlockBurst(hit.x, hit.y, hit.z, colorNum, 8);
        this.scheduleAutoSave();
      }
      return;
    }

    // 3. BUILD MODE: Place block(s) with selected brush ('1x1', 'wall', 'floor', 'rainbow', 'mega5x5')
    const positions = this.getBrushPositions(hit);
    const rainbowPalette = [1, 6, 12, 11, 19, 7];
    const info = window.textureFactory.getBlockInfo(this.selectedBlockId);
    const colorNum = parseInt(info.color.replace('#', '0x'), 16) || 0xc84b31;

    this.world.beginUndoBatch();
    let placedCount = 0;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (pos.y < 1 || pos.y > 28) continue;

      const blockToPlace = this.brushMode === 'rainbow'
        ? rainbowPalette[(this.rainbowStep + i) % rainbowPalette.length]
        : this.selectedBlockId;

      this.world.setBlock(pos.x, pos.y, pos.z, blockToPlace, true);

      if (this.checkAABBCollision(this.player.x, this.player.y, this.player.z)) {
        if (!this.checkAABBCollision(this.player.x, pos.y + 0.5, this.player.z) && pos.y <= this.player.y + 1.1) {
          this.player.y = pos.y + 0.5;
        } else {
          this.world.removeBlock(pos.x, pos.y, pos.z);
          continue;
        }
      }
      placedCount++;
    }
    this.rainbowStep++;
    this.world.commitUndoBatch();

    if (placedCount > 0) {
      window.soundEngine.playPlace(this.selectedBlockId);
      this.entities.spawnBlockBurst(positions[0].x, positions[0].y, positions[0].z, colorNum, 6);

      const prevCrafted = this.handCraftedBlocks;
      this.handCraftedBlocks += placedCount;

      // Advance active 30s Speed-Build Blitz Challenge if running!
      if (this.activeChallenge && this.activeChallenge.type === 'build') {
        this.activeChallenge.progress += placedCount;
        this.updateChallengeHUD();
      }

      // Award Engineering Milestone Bonus every 25 hand-crafted blocks (instead of every click!)
      if (Math.floor(prevCrafted / 25) < Math.floor(this.handCraftedBlocks / 25)) {
        const milestone = Math.floor(this.handCraftedBlocks / 25) * 25;
        this.awardCoins(30, `🧱 ${milestone}-Block Engineering Milestone!`, true);
        this.showBanner(`🧱 ENGINEERING MILESTONE: ${milestone} Hand-Crafted Blocks! (+30 🪙)`, false);
      }

      // Check Master Challenges: Mason 40 & Empire Architect
      if (this.handCraftedBlocks >= 40 && !this.quests.mason40) {
        this.completeQuest('mason40', 'Hand-Crafted 40 Blocks!', 60);
      }
      if (this.basesDeployedCount >= 3 && this.handCraftedBlocks >= 20 && !this.quests.architect3) {
        this.completeQuest('architect3', 'Built 3 Bases + 20 Custom Blocks!', 100);
      }

      this.renderQuestUI();
      this.scheduleAutoSave();
    }
  }

  toggleRidePet(targetPet = null) {
    if (this.player.mountedPet) {
      const prev = this.player.mountedPet;
      prev.isMounted = false;
      this.player.mountedPet = null;
      this.player.vy = 4.5;
      window.soundEngine.playJump();
      this.showBanner(`👟 Dismounted ${prev.type.toUpperCase()}!`, false);
      this.renderVisualCode({
        actor: '👟 SEVAK',
        verb: 'dismount',
        arg: prev.type.toUpperCase(),
        explanation: '👟 Dismounted back on foot!'
      });
      return;
    }

    const pet = targetPet || this.entities.findNearestAnimal(this.player.x, this.player.z, 8);
    if (!pet) {
      this.showBanner('🐾 Walk near a Wolf, Pig, or Giant T-Rex and tap it to mount!', false);
      return;
    }

    this.player.mountedPet = pet;
    pet.isMounted = true;
    this.player.x = pet.mesh.position.x;
    this.player.z = pet.mesh.position.z;
    window.soundEngine.playBounce();
    this.showBanner(
      pet.type === 'trex'
        ? '🦖 Mounted Giant T-Rex! Mega-Jump onto a roof or platform (Y≥4) to win +75 🪙!'
        : `🏇 Mounted ${pet.type.toUpperCase()}! Steer with WASD / Thumbstick!`,
      true
    );
    this.renderVisualCode({
      actor: '🏇 SEVAK_RIDER',
      verb: 'mount',
      arg: pet.type.toUpperCase(),
      paramLabel: 'jumpBoost',
      paramValue: pet.type === 'trex' ? '🦖 MegaJump' : '1.4x',
      explanation: `🏇 Riding ${pet.type.toUpperCase()}! Use T-Rex Mega-Jump to leap onto rooftops!`
    });
  }

  launchRocketAction() {
    const pos = this.getHousePlotInFront(6);
    this.entities.launchSpaceRocket(pos.x, pos.z, this.triggerShake);
    // Spawn high-altitude aerial coins in the rocket's launch column so player must climb or bounce to reach them!
    this.entities.spawnCoin(pos.x, 4.5, pos.z, 25);
    this.entities.spawnCoin(pos.x, 7.0, pos.z, 25);
    this.renderVisualCode({
      actor: '🚀 SEVAK_ROCKET',
      verb: 'blastOff',
      arg: '🌌 ORBIT_LAUNCH',
      paramLabel: 'launchAgain',
      paramValue: '🚀 +1',
      onTweak: () => this.launchRocketAction(),
      explanation: '🚀 3... 2... 1... BLAST OFF! High-altitude Gold Coins spawned in the launch plume!'
    });
    this.showBanner('🚀 3... 2... 1... BLAST OFF! Climb or bounce up to grab the aerial Gold Coins!', true);
  }

  // ScratchJr-Style Interactive Color-Coded Visual Code Block
  renderVisualCode({ actor, verb, arg, paramLabel, paramValue, onTweak, explanation }) {
    const codeBox = document.getElementById('live-code-display');
    const explainBox = document.getElementById('live-code-explain');
    if (codeBox) {
      codeBox.innerHTML = `
        <div class="visual-code-line">
          <span class="vc-actor">${actor}</span>.<span class="vc-verb">${verb}</span>(
          <span class="vc-arg">"${arg}"</span>
          ${paramLabel ? `<button id="vc-tweak-btn" class="vc-tweak-pill" title="Click to run or change this code!">${paramValue}</button>` : ''}
          )
        </div>
      `;
      if (onTweak) {
        const btn = document.getElementById('vc-tweak-btn');
        if (btn) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onTweak();
          });
        }
      }
      codeBox.classList.remove('code-flash');
      void codeBox.offsetWidth;
      codeBox.classList.add('code-flash');
    }
    if (explainBox && explanation) {
      explainBox.textContent = explanation;
    }
  }

  logCodeEvent(codeSnippet, explanation) {
    this.renderVisualCode({
      actor: '🤖 SEVAK_BOT',
      verb: 'run',
      arg: codeSnippet.replace(/[^A-Z0-9_]/gi, '_').slice(0, 18),
      explanation
    });
  }

  showBanner(text, speakOutLoud = false) {
    const banner = document.getElementById('kid-toast');
    if (banner) {
      banner.textContent = text;
      banner.classList.add('visible');
      clearTimeout(this.bannerTimeout);
      this.bannerTimeout = setTimeout(() => {
        banner.classList.remove('visible');
      }, 2800);
    }
    if (speakOutLoud) {
      window.soundEngine.speak(text);
    }
  }

  getHousePlotInFront(dist = 8) {
    const bx = Math.round(this.player.x - Math.sin(this.player.yaw) * dist);
    const bz = Math.round(this.player.z - Math.cos(this.player.yaw) * dist);
    return {
      x: Math.max(-18, Math.min(18, bx)),
      y: 0,
      z: Math.max(-18, Math.min(18, bz))
    };
  }

  // Voice-to-Code ("Talk to AI Builder") using Web Speech API + 1-Click Voice Chips
  setupVoiceCommander() {
    const micBtn = document.getElementById('btn-voice-cmd');
    const transcriptEl = document.getElementById('voice-transcript-pill');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognizer = SpeechRec ? new SpeechRec() : null;
    this.isListening = false;

    if (this.recognizer) {
      this.recognizer.lang = 'en-US';
      this.recognizer.interimResults = true;
      this.recognizer.maxAlternatives = 1;

      this.recognizer.onresult = (event) => {
        const text = Array.from(event.results).map((r) => r[0].transcript).join('');
        if (transcriptEl) {
          transcriptEl.textContent = `🗣️ "${text}"`;
        }
        if (event.results[0].isFinal) {
          this.executeVoiceIntent(text);
        }
      };
      this.recognizer.onerror = () => this.stopVoiceListening();
      this.recognizer.onend = () => this.stopVoiceListening();
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (!this.recognizer) {
          this.showBanner('🎙️ Tap any AI Command Chip in Sevak\'s Command Lab to deploy a build!', true);
          return;
        }
        if (this.isListening) {
          this.recognizer.stop();
        } else {
          this.isListening = true;
          micBtn.classList.add('listening-pulse');
          if (transcriptEl) transcriptEl.textContent = '🎙️ Listening... Say "Dragon Castle" or "Pirate Ship"!';
          window.soundEngine.playAnimalSound('bot');
          try {
            this.recognizer.start();
          } catch (e) {
            this.stopVoiceListening();
          }
        }
      });
    }

    // Bind 1-click Voice Prompt Chips
    document.querySelectorAll('.voice-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const cmd = chip.dataset.voice;
        if (transcriptEl) transcriptEl.textContent = `☁️ Sevak-Bot AI: "${cmd}"`;
        this.executeVoiceIntent(cmd);
      });
    });

    // Bind Google Cloud Vertex AI Architect custom prompt bar
    const cloudInput = document.getElementById('cloud-ai-prompt-input');
    const cloudBtn = document.getElementById('btn-cloud-ai-build');
    const triggerCloudBuild = () => {
      const prompt = (cloudInput?.value || 'Build a Pirate Ship').trim();
      if (!prompt) return;
      this.askCloudAIArchitect(prompt);
    };
    cloudBtn?.addEventListener('click', triggerCloudBuild);
    cloudInput?.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') triggerCloudBuild();
    });
  }

  stopVoiceListening() {
    this.isListening = false;
    document.getElementById('btn-voice-cmd')?.classList.remove('listening-pulse');
  }

  registerDeployedStructure(centerX, centerZ) {
    this.basesDeployedCount++;
    if (this.basesDeployedCount >= 3 && this.handCraftedBlocks >= 20 && !this.quests.architect3) {
      this.completeQuest('architect3', 'Built 3 Bases + 20 Custom Blocks!', 100);
    }
    this.renderQuestUI();
    this.spawnRooftopTreasureCoins(centerX, centerZ);
  }

  async askCloudAIArchitect(promptText) {
    const prompt = String(promptText || 'Build a Pirate Ship').trim();
    const kidName = (document.getElementById('kid-name-input')?.value || 'SEVAK').trim().toUpperCase();
    const transcriptEl = document.getElementById('voice-transcript-pill');
    if (transcriptEl) transcriptEl.textContent = '☁️ Sevak-Bot Thinking...';
    this.showBanner(`☁️ Sevak-Bot & Google Cloud AI are engineering "${prompt}"...`, false);
    window.soundEngine.playAnimalSound('bot');

    try {
      const res = await fetch('/api/v1/ai/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, kidName })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && Array.isArray(data.blocks) && data.blocks.length > 0) {
        const pos = this.getHousePlotInFront(8);
        this.world.queueStructure(data.blocks, pos.x, 0, pos.z, () => {
          this.scheduleAutoSave();
          this.registerDeployedStructure(pos.x, pos.z);
        });
        if (transcriptEl) transcriptEl.textContent = `☁️ ${data.title || 'Built by Sevak-Bot!'}`;
        this.renderVisualCode({
          actor: data.codeActor || '🤖 SEVAK_BOT',
          verb: data.codeVerb || 'generate3D',
          arg: data.codeArg || prompt.toUpperCase().slice(0, 16),
          paramLabel: 'rebuild',
          paramValue: '☁️ +1',
          onTweak: () => this.askCloudAIArchitect(prompt),
          explanation: `${data.explanation || '☁️ Built live by Sevak-Bot!'} (Climb to the roof for Treasure Coins!)`
        });
        this.showBanner(
          `${data.speech || `☁️ Sevak-Bot built ${data.title}!`} Climb to the top to claim the Rooftop Gold Coins!`,
          true
        );
        return;
      }
    } catch (err) {
      document.getElementById('build-cozy-house-btn')?.click();
    }
  }

  executeVoiceIntent(rawText) {
    const t = String(rawText || '').toLowerCase().trim();
    if (!t) return;

    if (
      t.includes('pirate') || t.includes('ship') || t.includes('boat') ||
      t.includes('fire') || t.includes('truck') || t.includes('station') ||
      t.includes('robot') || t.includes('mecha') || t.includes('bot') ||
      t.includes('pizza') || t.includes('ice cream') || t.includes('shop') || t.includes('cafe') ||
      t.includes('pyramid') || t.includes('treasure') || t.includes('temple') ||
      t.includes('soccer') || t.includes('stadium') || t.includes('football') ||
      t.includes('coaster') || t.includes('roller') || t.includes('dragon')
    ) {
      this.askCloudAIArchitect(rawText);
    } else if (t.includes('treehouse') || t.includes('tree')) {
      document.getElementById('build-treehouse-btn').click();
    } else if (t.includes('villa') || t.includes('pool') || t.includes('swim')) {
      document.getElementById('build-villa-btn').click();
    } else if (t.includes('castle') || t.includes('king') || t.includes('fort')) {
      document.getElementById('build-castle-btn').click();
    } else if (t.includes('rainbow') || t.includes('bridge')) {
      document.getElementById('build-rainbow-btn').click();
    } else if (t.includes('house') || t.includes('cottage') || t.includes('home')) {
      document.getElementById('build-cozy-house-btn').click();
    } else if (t.includes('rocket') || t.includes('launch') || t.includes('blast') || t.includes('spaceship')) {
      this.launchRocketAction();
    } else if (t.includes('rex') || t.includes('dino')) {
      const pos = this.getHousePlotInFront(4);
      this.entities.spawnAnimal('trex', pos.x, pos.z);
      window.soundEngine.playAnimalSound('trex');
      this.showBanner('🦖 ROOOAAAR! Giant T-Rex deployed! Ride it and Mega-Jump onto a roof for +75 🪙!', true);
    } else if (t.includes('dog') || t.includes('puppy') || t.includes('wolf')) {
      const pos = this.getHousePlotInFront(3);
      this.entities.spawnAnimal('wolf', pos.x, pos.z);
      window.soundEngine.playAnimalSound('wolf');
      this.showBanner('🐶 Woof! Companion Wolf deployed!', true);
    } else if (t.includes('snow') || t.includes('winter')) {
      this.entities.setWeather('snow');
      this.showBanner('❄️ Snowstorm mode activated!', true);
    } else if (t.includes('rain')) {
      this.entities.setWeather('rain');
      this.showBanner('🌧️ Rainstorm mode activated!', true);
    } else if (t.includes('moon') || t.includes('gravity') || t.includes('space')) {
      this.player.gravityMultiplier = 0.25;
      document.getElementById('slider-gravity').value = '0.25';
      document.getElementById('val-gravity').textContent = '🌙 Moon Jump';
      this.setWorldTheme('space');
      this.showBanner('🌙 Low-Gravity Space Mode ON! Jump to scale high rooftops!', true);
    } else if (t.includes('fly') || t.includes('jetpack')) {
      this.toggleFly();
    } else if (t.startsWith('spell ') || t.startsWith('write ')) {
      const cleanWord = t.replace(/^(spell|write)\s+/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10) || 'SEVAK';
      const inp = document.getElementById('kid-name-input');
      if (inp) inp.value = cleanWord;
      document.getElementById('btn-build-name').click();
    } else {
      this.askCloudAIArchitect(rawText);
    }
  }

  setupUI() {
    // 1. Populate 12-Slot House & Fun Hotbar
    const hotbar = document.getElementById('hotbar');
    hotbar.innerHTML = '';
    const hotbarBlocks = window.BLOCK_TYPES.filter((b) => b.inHotbar !== false);

    hotbarBlocks.forEach((b, idx) => {
      const slot = document.createElement('button');
      slot.className = `hotbar-slot ${b.id === this.selectedBlockId ? 'active' : ''}`;
      slot.dataset.blockId = b.id;
      const iconUrl = window.textureFactory.iconsById[b.id];
      const keyLabel = idx < 9 ? String(idx + 1) : (idx === 9 ? '0' : (idx === 10 ? '-' : '='));
      slot.innerHTML = `
        <span class="slot-key">${keyLabel}</span>
        <img src="${iconUrl}" alt="${b.name}" class="slot-icon" />
        <span class="slot-name">${b.emoji} ${b.name}</span>
      `;
      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectBlock(b.id);
      });
      hotbar.appendChild(slot);
    });

    // 2. Build vs Tap-to-Walk vs Break Tool Switcher
    const modeBuildBtn = document.getElementById('mode-build-btn');
    const modeWalkBtn = document.getElementById('mode-walk-btn');
    const modeMineBtn = document.getElementById('mode-mine-btn');
    const syncToolButtons = () => {
      modeBuildBtn?.classList.toggle('active', this.toolMode === 'build');
      modeWalkBtn?.classList.toggle('active', this.toolMode === 'walk');
      modeMineBtn?.classList.toggle('active', this.toolMode === 'break');
    };
    modeBuildBtn?.addEventListener('click', () => {
      this.toolMode = 'build';
      syncToolButtons();
      this.showBanner('🧱 Build Mode: Tap or click to place blocks or open doors!', true);
    });
    modeWalkBtn?.addEventListener('click', () => {
      this.toolMode = 'walk';
      syncToolButtons();
      this.showBanner('👣 Tap-to-Walk Mode: Tap any ground, path, or floor block to walk right there!', true);
    });
    modeMineBtn?.addEventListener('click', () => {
      this.toolMode = 'break';
      syncToolButtons();
      this.showBanner('⛏️ Smash Mode: Tap or click any block to break it!', true);
    });

    // 2B. 1-Tap Quick-Travel Landmark Bar (#quick-travel-bar)
    document.querySelectorAll('.travel-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dest = btn.dataset.goto;
        if (dest) this.goToLandmark(dest);
      });
    });

    // 3. House Builder Brush Size Selector (1x1, 3-Wide Wall, 3x3 Floor, Magic Rainbow, 5x5 Mega)
    document.querySelectorAll('.brush-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.brush === 'mega5x5' && !this.upgrades.megaBrush.unlocked) {
          this.handleUpgradeClick('megaBrush');
          return;
        }
        this.brushMode = btn.dataset.brush;
        this.toolMode = 'build';
        syncToolButtons();
        document.querySelectorAll('.brush-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderVisualCode({
          actor: '🖌️ BRUSH_CODE',
          verb: 'setPattern',
          arg: this.brushMode.toUpperCase(),
          explanation: this.brushMode === 'rainbow'
            ? '🌈 Magic Rainbow Loop Brush! Every click builds a colorful 5-block rainbow arch!'
            : (this.brushMode === 'mega5x5'
              ? '🏰 5×5 MEGA BRUSH! Every single click builds 25 blocks at once!'
              : `🧱 Brush set to ${this.brushMode.toUpperCase()}!`)
        });
      });
    });

    // 3B. Sevak's Upgrade Armory Buttons & Timed Blitz Challenge Launchers
    document.querySelectorAll('.upgrade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.upgrade;
        if (key) this.handleUpgradeClick(key);
      });
    });

    const toggleTimedBlitz = () => {
      this.closeAllMobileDrawers?.();
      const nextMode = this.activeChallenge?.type === 'build' ? 'coins' : 'build';
      this.startTimedChallenge(nextMode);
    };
    document.getElementById('btn-start-challenge')?.addEventListener('click', toggleTimedBlitz);
    document.getElementById('btn-spawn-coins')?.addEventListener('click', () => {
      this.closeAllMobileDrawers?.();
      this.startTimedChallenge('coins');
    });
    document.getElementById('coin-bank-pill')?.addEventListener('click', toggleTimedBlitz);
    document.getElementById('btn-challenge-build')?.addEventListener('click', () => {
      this.closeAllMobileDrawers?.();
      this.startTimedChallenge('build');
    });
    document.getElementById('btn-challenge-coins')?.addEventListener('click', () => {
      this.closeAllMobileDrawers?.();
      this.startTimedChallenge('coins');
    });

    // 4. Undo Last Action & Reset World Buttons
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (this.world.undoLastAction()) {
        this.showBanner('↩️ Undo! Reversed last action!', false);
        this.scheduleAutoSave();
      } else {
        this.showBanner('✨ Nothing left to undo!');
      }
    });

    document.getElementById('btn-reset-village')?.addEventListener('click', () => {
      localStorage.removeItem(VoxelWorld.STORAGE_KEY);
      this.world.clearAllBlocks();
      this.world.generateInitialTerrain();
      this.player.x = 0;
      this.player.y = 0.5;
      this.player.z = 3.5;
      this.player.yaw = 0;
      this.player.pitch = 0.02;
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
      this.spawnStarterYardCoins();
      this.showBanner('👑 Sevak\'s World Reset! Climb the 10-Block Parkour Tower to earn Gold Coins!', true);
    });

    // 5. Walkable Base Blueprints (Spawns Rooftop Treasure Coins on top of the roof so Sevak climbs to claim them!)
    document.getElementById('build-cozy-house-btn').addEventListener('click', () => {
      const pos = this.getHousePlotInFront(8);
      const bp = StructureGenerator.generateCozyHouse();
      this.world.queueStructure(bp, pos.x, 0, pos.z, () => {
        this.scheduleAutoSave();
        this.registerDeployedStructure(pos.x, pos.z);
      });
      this.renderVisualCode({
        actor: '🤖 SEVAK_BOT',
        verb: 'buildBase',
        arg: '🏡 SEVAK_COTTAGE',
        paramLabel: 'buildMore',
        paramValue: '🏡 +1',
        onTweak: () => document.getElementById('build-cozy-house-btn').click(),
        explanation: '🏡 Sevak-Bot is laser-building a Brick Base! Climb to the roof to claim 4 Rooftop Gold Coins!'
      });
      this.showBanner('🏡 Sevak-Bot is building a Brick Base! Climb the roof to collect the Gold Coins!', true);
    });

    document.getElementById('build-villa-btn').addEventListener('click', () => {
      const pos = this.getHousePlotInFront(9);
      const bp = StructureGenerator.generateModernVilla();
      this.world.queueStructure(bp, pos.x, 0, pos.z, () => {
        this.scheduleAutoSave();
        this.registerDeployedStructure(pos.x, pos.z);
      });
      this.renderVisualCode({
        actor: '🤖 SEVAK_BOT',
        verb: 'buildBase',
        arg: '🏠 POOL_VILLA',
        explanation: '🏠 Building a 2-Story Glass Pool Villa with Slime Diving Board & Rooftop Treasure Coins!'
      });
      this.showBanner('🏠 Building Pool Villa! Bounce off the Slime Diving Board onto the roof for Gold Coins!', true);
    });

    document.getElementById('build-treehouse-btn').addEventListener('click', () => {
      const pos = this.getHousePlotInFront(8);
      const bp = StructureGenerator.generateTreehouse();
      this.world.queueStructure(bp, pos.x, 0, pos.z, () => {
        this.scheduleAutoSave();
        this.registerDeployedStructure(pos.x, pos.z);
      });
      this.renderVisualCode({
        actor: '🤖 SEVAK_BOT',
        verb: 'buildBase',
        arg: '🌲 SKY_TREEHOUSE',
        explanation: '🌲 Building a Giant Oak Sky Treehouse! Climb the spiral trunk stairs to claim the canopy Gold Coins!'
      });
      this.showBanner('🌲 Building Giant Sky Treehouse! Scale the spiral stairs to claim the canopy Gold Coins!', true);
    });

    document.getElementById('build-castle-btn').addEventListener('click', () => {
      const pos = this.getHousePlotInFront(8);
      const bp = StructureGenerator.generateCastleHome();
      this.world.queueStructure(bp, pos.x, 0, pos.z, () => {
        this.scheduleAutoSave();
        this.registerDeployedStructure(pos.x, pos.z);
      });
      this.renderVisualCode({
        actor: '🤖 SEVAK_BOT',
        verb: 'buildFortress',
        arg: '🏰 FORT_SEVAK',
        explanation: '🏰 Building Fort Sevak with 4 Diamond Watchtowers! Scale the towers to collect the Rooftop Gold Coins!'
      });
      this.showBanner('🏰 Building Fort Sevak! Parkour up the battlements for Rooftop Gold Coins!', true);
    });

    document.getElementById('build-rainbow-btn').addEventListener('click', () => {
      const pos = this.getHousePlotInFront(8);
      const bp = StructureGenerator.generateRainbowBridge();
      this.world.queueStructure(bp, pos.x, 0, pos.z, () => {
        this.scheduleAutoSave();
        this.registerDeployedStructure(pos.x, pos.z);
      });
      this.renderVisualCode({
        actor: '🤖 SEVAK_BOT',
        verb: 'buildBridge',
        arg: '🌈 SKY_BRIDGE',
        explanation: '🌈 Building a High-Altitude Sky Bridge with Slime Launch Pads & Summit Gold Coins!'
      });
      this.showBanner('🌈 Building Sky Bridge! Cross the top arch to claim the Summit Gold Coins!', true);
    });

    document.getElementById('launch-rocket-btn').addEventListener('click', () => {
      this.launchRocketAction();
    });

    document.getElementById('clear-lot-btn').addEventListener('click', () => {
      const pos = this.getHousePlotInFront(6);
      this.world.clearPlot(pos.x, pos.z, 6);
      this.scheduleAutoSave();
      this.showBanner('🧹 Cleared Build Zone for Your Custom Engineering!', false);
    });

    // 6. 3D Sevak Monument Builder
    const nameInput = document.getElementById('kid-name-input');
    const triggerNameBuild = () => {
      const word = (nameInput.value || 'SEVAK').trim().toUpperCase();
      const bp = StructureGenerator.generate3DText(word);
      const pos = this.getHousePlotInFront(10);
      this.world.queueStructure(bp, pos.x, 0, pos.z, () => {
        this.triggerFireworksShow();
        this.scheduleAutoSave();
        this.registerDeployedStructure(pos.x, pos.z);
      });
      this.renderVisualCode({
        actor: '🤖 SEVAK_BOT',
        verb: 'buildMonument',
        arg: `💎 ${word}`,
        explanation: `✨ Sevak-Bot is constructing the "${word}" 3D Diamond Monument with summit treasure coins!`
      });
      this.showBanner(`✨ Constructing "${word}" 3D Diamond Monument! Climb the letters for Gold Coins!`, true);
    };
    document.getElementById('btn-build-name').addEventListener('click', triggerNameBuild);
    nameInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') triggerNameBuild();
    });

    // 7. Quick Controls (Jetpack Fly, Ride Pet, Camera View, Mouse Look, Voice, Sound)
    document.getElementById('btn-fly').addEventListener('click', () => this.toggleFly());
    document.getElementById('btn-ride')?.addEventListener('click', () => this.toggleRidePet());
    const camBtn = document.getElementById('btn-camera');
    if (camBtn) {
      camBtn.textContent = this.player.thirdPerson ? '🎥 3rd Person' : '👀 1st Person';
      camBtn.addEventListener('click', () => this.toggleCameraView());
    }
    document.getElementById('btn-mouselook').addEventListener('click', () => {
      this.renderer.domElement.requestPointerLock();
    });
    document.getElementById('btn-fireworks').addEventListener('click', () => {
      this.triggerFireworksShow();
    });

    const voiceToggleBtn = document.getElementById('btn-voice-toggle');
    voiceToggleBtn?.addEventListener('click', () => {
      const on = window.soundEngine.toggleVoice();
      voiceToggleBtn.textContent = on ? '🗣️ Voice ON' : '🤫 Voice OFF';
    });

    const muteBtn = document.getElementById('btn-mute');
    muteBtn.addEventListener('click', () => {
      const muted = window.soundEngine.toggleMute();
      muteBtn.textContent = muted ? '🔇 Muted' : '🔊 Sound';
    });

    document.getElementById('btn-read-code')?.addEventListener('click', () => {
      const explain = document.getElementById('live-code-explain')?.textContent || '';
      window.soundEngine.speak(explain);
    });

    const toggleLabBtn = document.getElementById('toggle-lab-btn');
    const labPanel = document.getElementById('tech-lab-panel');
    toggleLabBtn.addEventListener('click', () => {
      labPanel.classList.toggle('collapsed');
      toggleLabBtn.textContent = labPanel.classList.contains('collapsed')
        ? '👑 Open Sevak Lab'
        : '➖ Hide Panel';
    });

    // 8. Spawn Yard Pets & Giant T-Rex
    document.querySelectorAll('.spawn-mob-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.mob;
        const pos = this.getHousePlotInFront(3);
        const pet = this.entities.spawnAnimal(type, pos.x, pos.z);
        window.soundEngine.playAnimalSound(type);
        this.renderVisualCode({
          actor: '🐾 SEVAK_MOB',
          verb: 'spawn',
          arg: type.toUpperCase(),
          paramLabel: 'ride',
          paramValue: '🏇 Mount!',
          onTweak: () => this.toggleRidePet(pet),
          explanation: `🐾 Deployed ${type.toUpperCase()}! Mount the T-Rex and Mega-Jump onto a roof (Y≥4) for +75 🪙!`
        });
        this.showBanner(`🐾 Deployed ${type.toUpperCase()}! Tap it in the yard to mount!`, false);
      });
    });

    // 9. Weather Buttons (Clear, Snow, Rain, Fireflies)
    document.querySelectorAll('.weather-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.weather-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.weather;
        this.entities.setWeather(mode);
        this.renderVisualCode({
          actor: '🌦️ WEATHER',
          verb: 'setForecast',
          arg: mode.toUpperCase(),
          explanation: mode === 'clear'
            ? '☀️ Clear skies over Sevak\'s World!'
            : `❄️ Weather set to ${mode.toUpperCase()}!`
        });
      });
    });

    // 10. Physics & Sky Theme Controls
    document.getElementById('slider-gravity').addEventListener('input', (e) => {
      this.player.gravityMultiplier = parseFloat(e.target.value);
      const label = this.player.gravityMultiplier < 0.5 ? '🌙 Moon Jump' : '🌍 Normal';
      document.getElementById('val-gravity').textContent = label;
    });

    document.getElementById('slider-speed').addEventListener('input', (e) => {
      this.player.speedMultiplier = parseFloat(e.target.value);
      document.getElementById('val-speed').textContent = `${this.player.speedMultiplier.toFixed(1)}x`;
    });

    document.querySelectorAll('.theme-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.setWorldTheme(btn.dataset.theme);
      });
    });

    // 11. Sevak's Master Challenges Hints (Clicking any challenge row explains how to beat it!)
    const questHints = {
      mason40: 'Hand-craft 40 blocks yourself using any brush! Every 25 blocks also awards +30 Gold Coins!',
      climber10: 'Tap Go To: Parkour Tower and climb the spiral stairs to the Y=10 Diamond Summit WITHOUT Jetpack Fly! (+75 Coins)',
      speedblitz: 'Tap ⏱️ 30s Build Blitz or 🏃 35s Coin Rush and beat the countdown clock! (+100 Coins)',
      treasure12: 'Climb onto rooftops, scale the Parkour Tower, or bounce on the Slime Trampoline to collect 12 Gold Coins! (+80 Coins)',
      trexroof: 'Tap Go To: Ride T-Rex and use its Mega-Jump to leap onto a roof or platform at height Y≥4! (+75 Coins)',
      architect3: 'Deploy 3 major bases or AI builds AND customize your world with at least 20 hand-crafted blocks! (+100 Coins)'
    };
    document.querySelectorAll('.quest-item').forEach((item) => {
      item.addEventListener('click', () => {
        const qid = item.dataset.quest;
        if (questHints[qid]) {
          this.showBanner(`⚔️ Challenge Intel: ${questHints[qid]}`, true);
        }
      });
    });

    // 12. 360° Virtual Analog Thumbstick (#joystick-zone & #joystick-knob) + Quick-Tap Glide + Auto-Walk!
    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    this.joystickTouchId = null;
    this.joystickMouseActive = false;
    let joyStartTime = 0;
    let lastJoyNx = 0;
    let lastJoyNy = 0;

    const updateJoystickFromPoint = (clientX, clientY) => {
      if (!joyZone || !joyKnob) return;
      const rect = joyZone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxR = Math.max(28, rect.width * 0.34);
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
      }
      joyKnob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      joyKnob.classList.add('active');

      const nx = dx / maxR; // -1 (left) to +1 (right)
      const ny = dy / maxR; // -1 (up/forward) to +1 (down/backward)
      lastJoyNx = nx;
      lastJoyNy = ny;

      this.joyForward = Math.abs(ny) > 0.1 ? -ny : 0;
      this.joyTurn = Math.abs(nx) > 0.12 ? -nx * 1.15 : 0;
      this.joyStrafe = Math.abs(nx) > 0.18 ? nx * 0.35 : 0;

      // Cancel tap-to-walk target when player pushes the thumbstick manually
      if (Math.abs(this.joyForward) > 0.15 || Math.abs(this.joyTurn) > 0.15) {
        this.walkTarget = null;
        this.walkTargetRing.visible = false;
      }
    };

    const releaseJoystick = () => {
      const elapsed = Date.now() - joyStartTime;
      // If player did a quick tap (< 280ms) on the thumbstick arrows, glide smoothly in that direction!
      if (elapsed > 0 && elapsed < 280) {
        if (lastJoyNy < -0.2) {
          this.glideForwardTimer = 0.68;
          this.glideForwardDir = 1;
        } else if (lastJoyNy > 0.2) {
          this.glideForwardTimer = 0.52;
          this.glideForwardDir = -1;
        } else if (Math.abs(lastJoyNx) <= 0.2 && Math.abs(lastJoyNy) <= 0.2) {
          this.glideForwardTimer = 0.68;
          this.glideForwardDir = 1;
        }
        if (lastJoyNx < -0.22) {
          this.glideTurnTimer = 0.36;
          this.glideTurnDir = 1;
        } else if (lastJoyNx > 0.22) {
          this.glideTurnTimer = 0.36;
          this.glideTurnDir = -1;
        }
      }
      this.joyForward = 0;
      this.joyTurn = 0;
      this.joyStrafe = 0;
      lastJoyNx = 0;
      lastJoyNy = 0;
      if (joyKnob) {
        joyKnob.style.transform = 'translate(0px, 0px)';
        joyKnob.classList.remove('active');
      }
    };

    if (joyZone) {
      joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.soundEngine.init();
        if (this.joystickTouchId === null && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          this.joystickTouchId = t.identifier;
          joyStartTime = Date.now();
          updateJoystickFromPoint(t.clientX, t.clientY);
        }
      }, { passive: false });

      joyZone.addEventListener('touchmove', (e) => {
        if (this.joystickTouchId === null) return;
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === this.joystickTouchId) {
            updateJoystickFromPoint(t.clientX, t.clientY);
            break;
          }
        }
      }, { passive: false });

      const endJoyTouch = (e) => {
        if (this.joystickTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            this.joystickTouchId = null;
            releaseJoystick();
            break;
          }
        }
      };
      joyZone.addEventListener('touchend', endJoyTouch, { passive: false });
      joyZone.addEventListener('touchcancel', endJoyTouch, { passive: false });

      // Desktop mouse support on the Virtual Analog Thumbstick
      joyZone.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.soundEngine.init();
        this.joystickMouseActive = true;
        joyStartTime = Date.now();
        updateJoystickFromPoint(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => {
        if (!this.joystickMouseActive) return;
        updateJoystickFromPoint(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', () => {
        if (!this.joystickMouseActive) return;
        this.joystickMouseActive = false;
        releaseJoystick();
      });
    }

    // Hands-Free Auto-Walk Toggle Button (#pad-autowalk)
    const autoWalkBtn = document.getElementById('pad-autowalk');
    autoWalkBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.soundEngine.init();
      this.autoWalkActive = !this.autoWalkActive;
      if (this.autoWalkActive) {
        this.walkTarget = null;
        this.walkTargetRing.visible = false;
      }
      autoWalkBtn.classList.toggle('active', this.autoWalkActive);
      autoWalkBtn.textContent = this.autoWalkActive ? '🏃 AUTO: ON' : '🏃 AUTO-WALK';
      this.showBanner(
        this.autoWalkActive
          ? '🏃 Auto-Walk ON! Drag the screen to steer anywhere!'
          : '🛑 Auto-Walk Paused'
      );
    });

    // Multi-touch safe hold button helper for Jump / Fly Down
    const bindHoldBtn = (id, keyName, onPress = null) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.soundEngine.init();
        if (onPress) onPress();
        if (keyName) this.moveButtons[keyName] = true;
      };
      const end = (e) => {
        if (e) e.stopPropagation();
        if (keyName) this.moveButtons[keyName] = false;
      };
      el.addEventListener('mousedown', start);
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('mouseup', end);
      el.addEventListener('mouseleave', end);
      el.addEventListener('touchend', end);
      el.addEventListener('touchcancel', end);
    };

    bindHoldBtn('pad-jump', 'up', () => this.triggerJump());
    bindHoldBtn('pad-land', 'down', () => {
      if (this.player.flying && this.player.y <= 1.6) {
        this.toggleFly();
      }
    });
    document.getElementById('pad-center')?.addEventListener('click', () => {
      this.player.pitch = 0.02;
      this.showBanner('👀 Camera leveled straight ahead!');
    });

    // 13. Welcome Hero Launch Overlay (Sevak Branding + Audio Unlock — No Free Coin Handout!)
    const welcomeModal = document.getElementById('welcome-modal');
    const welcomeNameInp = document.getElementById('welcome-name-input');
    if (welcomeNameInp && nameInput) {
      welcomeNameInp.value = nameInput.value || 'SEVAK';
      welcomeNameInp.addEventListener('input', () => {
        nameInput.value = welcomeNameInp.value.toUpperCase();
      });
    }
    document.querySelectorAll('.name-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.name-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const chosen = chip.dataset.name || 'SEVAK';
        if (welcomeNameInp) welcomeNameInp.value = chosen;
        if (nameInput) nameInput.value = chosen;
      });
    });

    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      window.soundEngine.init();
      const chosenName = ((welcomeNameInp?.value || nameInput?.value || 'SEVAK').trim().toUpperCase()) || 'SEVAK';
      if (nameInput) nameInput.value = chosenName;
      welcomeModal?.classList.add('hidden');
      this.triggerFireworksShow();
      this.showBanner(
        `👑 Welcome to ${chosenName}'s Minecraft World! Scale the 10-Block Parkour Tower or beat a 30s Timed Blitz to earn Gold Coins!`,
        true
      );
    });

    // 14. 1-Tap "🌟 Surprise WOW!" Showcase & Mobile "⏱️ Blitz!" Button
    this.surpriseStep = 0;
    const runSurprise = () => {
      this.closeAllMobileDrawers();
      this.triggerSurpriseWowBuild();
    };
    document.getElementById('btn-surprise-wow')?.addEventListener('click', runSurprise);
    document.getElementById('btn-lab-surprise')?.addEventListener('click', runSurprise);
    document.getElementById('mob-tab-wow')?.addEventListener('click', toggleTimedBlitz);

    // 15. Mobile / iPhone Slide-Over Drawer Tabs (#mobile-drawer-bar) + Explicit "✖️ Done" Close Buttons
    const drawerIds = ['tech-lab-panel', 'upgrade-shop-card', 'quest-sticker-card'];
    this.closeAllMobileDrawers = () => {
      drawerIds.forEach((id) => document.getElementById(id)?.classList.remove('mobile-open'));
      document.querySelectorAll('.mob-tab-btn[data-drawer]').forEach((b) => b.classList.remove('active'));
    };

    document.querySelectorAll('.drawer-close-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeAllMobileDrawers();
      });
    });

    document.querySelectorAll('.mob-tab-btn[data-drawer]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.drawer;
        const panel = document.getElementById(targetId);
        if (!panel) return;
        const wasOpen = panel.classList.contains('mobile-open');
        this.closeAllMobileDrawers();
        if (!wasOpen) {
          panel.classList.add('mobile-open');
          btn.classList.add('active');
        }
      });
    });

    // Auto-close mobile drawer on iPhone when a build or voice preset chip is tapped
    const autoCloseSelectors = [
      '.voice-chip',
      '#btn-cloud-ai-build',
      '#build-cozy-house-btn',
      '#build-villa-btn',
      '#build-treehouse-btn',
      '#build-castle-btn',
      '#build-rainbow-btn',
      '#launch-rocket-btn',
      '.spawn-mob-btn'
    ];
    autoCloseSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.addEventListener('click', () => {
          if (window.innerWidth <= 1024) {
            this.closeAllMobileDrawers();
          }
        });
      });
    });

    // 16. Right-Thumb Mobile Action Pad (#mobile-action-pad) for iPhone / iPad Gameplay
    const mobWalkBtn = document.getElementById('mob-act-walk');
    if (mobWalkBtn) {
      const startWalkBtn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.soundEngine.init();
        this.walkTarget = null;
        this.walkTargetRing.visible = false;
        this.moveButtons.forward = true;
        this.glideForwardTimer = 0.72;
        this.glideForwardDir = 1;
      };
      const endWalkBtn = (e) => {
        if (e) e.stopPropagation();
        this.moveButtons.forward = false;
      };
      mobWalkBtn.addEventListener('mousedown', startWalkBtn);
      mobWalkBtn.addEventListener('touchstart', startWalkBtn, { passive: false });
      mobWalkBtn.addEventListener('mouseup', endWalkBtn);
      mobWalkBtn.addEventListener('mouseleave', endWalkBtn);
      mobWalkBtn.addEventListener('touchend', endWalkBtn);
      mobWalkBtn.addEventListener('touchcancel', endWalkBtn);
    }

    document.getElementById('mob-act-build')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.soundEngine.init();
      this.mouseNdc.x = 0;
      this.mouseNdc.y = 0;
      this.updateRaycastAndGhost();
      this.performClickAction('build');
    });
    document.getElementById('mob-act-break')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.soundEngine.init();
      this.mouseNdc.x = 0;
      this.mouseNdc.y = 0;
      this.updateRaycastAndGhost();
      this.performClickAction('break');
    });
    document.getElementById('mob-act-ride')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.soundEngine.init();
      this.toggleRidePet();
    });
  }

  triggerSurpriseWowBuild() {
    window.soundEngine.init();
    const wowPrompts = [
      'Build a Pirate Ship',
      'Build a Giant Robot',
      'Build a Rollercoaster',
      'Build a Dragon Castle',
      'Build a Fire Station',
      'Build a Soccer Stadium',
      'Build a Golden Pyramid'
    ];
    const picked = wowPrompts[this.surpriseStep % wowPrompts.length];
    this.surpriseStep++;
    this.triggerFireworksShow();
    this.askCloudAIArchitect(picked);
  }

  selectBlock(blockId) {
    this.selectedBlockId = blockId;
    this.toolMode = 'build';
    document.getElementById('mode-build-btn')?.classList.add('active');
    document.getElementById('mode-walk-btn')?.classList.remove('active');
    document.getElementById('mode-mine-btn')?.classList.remove('active');
    this.entities.setHeldBlock(blockId);

    document.querySelectorAll('.hotbar-slot').forEach((el) => {
      el.classList.toggle('active', parseInt(el.dataset.blockId, 10) === blockId);
    });
    const info = window.textureFactory.getBlockInfo(blockId);
    window.soundEngine.playPlace(blockId);
    window.soundEngine.speak(info.name);
    this.renderVisualCode({
      actor: '🧱 HOTBAR',
      verb: 'selectBlock',
      arg: `${info.emoji} ${info.name.toUpperCase()}`,
      explanation: `${info.emoji} ${info.description}`
    });
  }

  toggleFly() {
    this.player.flying = !this.player.flying;
    if (this.player.flying) {
      this.player.vy = 2;
      window.soundEngine.playJump();
    }
    document.getElementById('btn-fly').classList.toggle('active', this.player.flying);
    this.showBanner(
      this.player.flying
        ? '🚀 Jetpack Fly ON! (Turn Fly OFF to qualify for the Y=10 Sky Climber Challenge!)'
        : '👟 Jetpack Fly OFF — Parkour & Sky Climber Challenge active!',
      true
    );
  }

  toggleCameraView() {
    this.player.thirdPerson = !this.player.thirdPerson;
    document.getElementById('btn-camera').textContent = this.player.thirdPerson
      ? '🎥 3rd Person'
      : '👀 1st Person';
  }

  triggerFireworksShow() {
    const pos = this.getHousePlotInFront(7);
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.entities.launchFirework(
          pos.x + (Math.random() - 0.5) * 9,
          2,
          pos.z + (Math.random() - 0.5) * 9
        );
      }, i * 210);
    }
  }

  setWorldTheme(theme) {
    this.currentTheme = theme;
    const themes = {
      day: { bg: 0x74c7ff, amb: 0xffffff, ambInt: 0.78, sun: 0xfff5d6 },
      sunset: { bg: 0xff8c66, amb: 0xffd1b3, ambInt: 0.72, sun: 0xffaa44 },
      space: { bg: 0x0f172a, amb: 0x99bbff, ambInt: 0.52, sun: 0x77ccff },
      candy: { bg: 0xffb8e6, amb: 0xffe6f7, ambInt: 0.82, sun: 0xfff2aa }
    };
    const t = themes[theme] || themes.day;
    this.scene.background.setHex(t.bg);
    this.scene.fog.color.setHex(t.bg);
    this.ambientLight.color.setHex(t.amb);
    this.ambientLight.intensity = t.ambInt;
    this.sunLight.color.setHex(t.sun);
  }

  triggerJump() {
    if (this.player.flying) {
      this.player.vy = 6.0;
      return;
    }
    if (this.player.onGround) {
      const under = this.world.getBlock(
        Math.round(this.player.x),
        Math.round(this.player.y - 0.5),
        Math.round(this.player.z)
      );
      const bounceUpgrade = this.upgrades.moonBounce.unlocked && this.upgrades.moonBounce.active;
      if (under && under.blockId === 12) {
        this.player.vy = 15.2;
        window.soundEngine.playBounce();
        this.showBanner('🟢 BOING! Super Trampoline Jump!', true);
      } else if (bounceUpgrade) {
        this.player.vy = 13.5;
        window.soundEngine.playBounce();
      } else {
        this.player.vy = this.player.mountedPet?.type === 'trex' ? 10.5 : 7.8;
        window.soundEngine.playJump();
      }
      this.player.onGround = false;
    }
  }

  setupControls() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      const cross = document.getElementById('center-crosshair');
      if (cross) cross.classList.toggle('hidden', !this.isPointerLocked);
      const mlBtn = document.getElementById('btn-mouselook');
      if (mlBtn) mlBtn.classList.toggle('active', this.isPointerLocked);
    });

    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      const code = e.code;
      this.keys[code] = true;

      if (code === 'Space') {
        e.preventDefault();
        this.triggerJump();
      } else if (code === 'KeyF') {
        this.toggleFly();
      } else if (code === 'KeyR') {
        this.toggleRidePet();
      } else if (code === 'KeyV') {
        this.toggleCameraView();
      } else if (code === 'KeyL') {
        if (this.isPointerLocked) {
          document.exitPointerLock();
        } else {
          this.renderer.domElement.requestPointerLock();
        }
      } else if (code === 'KeyZ') {
        if (this.world.undoLastAction()) {
          this.showBanner('↩️ Undid Last Action!', true);
          this.scheduleAutoSave();
        }
      } else if (code === 'KeyB') {
        this.performClickAction('build');
      } else if (code === 'KeyX' || code === 'KeyM') {
        this.performClickAction('break');
      } else if (code.startsWith('Digit')) {
        const num = parseInt(code.replace('Digit', ''), 10);
        const index = num === 0 ? 9 : num - 1;
        const hotbarBlocks = window.BLOCK_TYPES.filter((b) => b.inHotbar !== false);
        if (hotbarBlocks[index]) {
          this.selectBlock(hotbarBlocks[index].id);
        }
      } else if (code === 'Minus') {
        this.selectBlock(19); // Disco Jukebox
      } else if (code === 'Equal') {
        this.selectBlock(20); // Super TNT
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('mousedown', (e) => {
      window.soundEngine.init();
      if (this.isPointerLocked) {
        if (e.button === 0) {
          this.performClickAction(this.toolMode);
        } else if (e.button === 2) {
          this.performClickAction(this.toolMode === 'build' ? 'break' : 'build');
        }
        return;
      }

      this.isMouseDown = true;
      this.dragDist = 0;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        this.player.yaw -= e.movementX * 0.003;
        this.player.pitch = Math.max(-1.3, Math.min(1.3, this.player.pitch - e.movementY * 0.003));
        return;
      }

      this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isMouseDown) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.dragDist += Math.abs(dx) + Math.abs(dy);
        if (this.dragDist > 12) {
          this.player.yaw -= dx * 0.005;
          this.player.pitch = Math.max(-1.25, Math.min(1.2, this.player.pitch - dy * 0.004));
        }
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isPointerLocked || !this.isMouseDown) return;
      this.isMouseDown = false;
      if (e.target !== canvas) return;

      // Forgiving 14px tolerance for 6-year-old trackpad clicks!
      if (this.dragDist <= 14) {
        if (e.button === 2 || e.shiftKey) {
          this.performClickAction(this.toolMode === 'build' ? 'break' : 'build');
        } else if (e.button === 0) {
          this.performClickAction(this.toolMode);
        }
      }
    });

    // Full iPhone / iPad Touch Controls on the 3D Canvas:
    // - Drag 1 finger to look around 360°
    // - Tap 1 finger anywhere on the 3D world to place/break blocks, walk there (in Tap-to-Walk mode), open doors, sleep in beds, or ride pets!
    this.touchLookId = null;
    this.touchDragDist = 0;
    this.lastTouchX = 0;
    this.lastTouchY = 0;

    canvas.addEventListener('touchstart', (e) => {
      window.soundEngine.init();
      if (this.closeAllMobileDrawers && window.innerWidth <= 1024) {
        this.closeAllMobileDrawers();
      }
      if (e.changedTouches.length > 0 && this.touchLookId === null) {
        const t = e.changedTouches[0];
        this.touchLookId = t.identifier;
        this.touchDragDist = 0;
        this.lastTouchX = t.clientX;
        this.lastTouchY = t.clientY;
        const cross = document.getElementById('center-crosshair');
        if (cross) cross.classList.remove('hidden');
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (this.touchLookId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touchLookId) {
          const dx = t.clientX - this.lastTouchX;
          const dy = t.clientY - this.lastTouchY;
          this.touchDragDist += Math.abs(dx) + Math.abs(dy);
          if (this.touchDragDist > 6) {
            this.player.yaw -= dx * 0.0062;
            this.player.pitch = Math.max(-1.25, Math.min(1.2, this.player.pitch - dy * 0.0052));
            // Keep center crosshair aimed straight ahead while panning camera on iPhone
            this.mouseNdc.x = 0;
            this.mouseNdc.y = 0;
          }
          this.lastTouchX = t.clientX;
          this.lastTouchY = t.clientY;
          break;
        }
      }
    }, { passive: true });

    const onTouchEnd = (e) => {
      if (this.touchLookId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === this.touchLookId) {
          this.touchLookId = null;
          // If it was a quick tap (< 18px drag), raycast to the exact tapped 3D block/pet and interact!
          if (this.touchDragDist <= 18) {
            this.mouseNdc.x = (t.clientX / window.innerWidth) * 2 - 1;
            this.mouseNdc.y = -(t.clientY / window.innerHeight) * 2 + 1;
            this.updateRaycastAndGhost();
            this.performClickAction(this.toolMode);
            // Reset aim back to center crosshair after tap
            setTimeout(() => {
              this.mouseNdc.x = 0;
              this.mouseNdc.y = 0;
            }, 120);
          }
          break;
        }
      }
    };
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  updatePlayerPhysics(dt) {
    const turnSpeed = 2.1;
    if (this.keys['KeyQ'] || this.keys['ArrowLeft'] || this.moveButtons.turnLeft) {
      this.player.yaw += turnSpeed * dt;
    }
    if (this.keys['KeyE'] || this.keys['ArrowRight'] || this.moveButtons.turnRight) {
      this.player.yaw -= turnSpeed * dt;
    }

    // Apply Virtual Analog Thumbstick turning & Quick-Tap turn glide
    if (Math.abs(this.joyTurn) > 0.01) {
      this.player.yaw += this.joyTurn * turnSpeed * dt;
    }
    if (this.glideTurnTimer > 0) {
      this.glideTurnTimer = Math.max(0, this.glideTurnTimer - dt);
      this.player.yaw += this.glideTurnDir * turnSpeed * 0.95 * dt;
    }

    let forward = 0;
    let strafe = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp'] || this.moveButtons.forward) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown'] || this.moveButtons.backward) forward -= 1;
    if (this.keys['KeyA']) strafe -= 1;
    if (this.keys['KeyD']) strafe += 1;

    // Combine Virtual Analog Thumbstick forward & strafe
    if (Math.abs(this.joyForward) > 0.01) {
      forward += this.joyForward;
    }
    if (Math.abs(this.joyStrafe) > 0.01) {
      strafe += this.joyStrafe;
    }

    // Quick-Tap Directional Glide (so tapping an arrow or WALK button moves ~4 blocks smoothly!)
    if (this.glideForwardTimer > 0) {
      this.glideForwardTimer = Math.max(0, this.glideForwardTimer - dt);
      if (Math.abs(forward) < 0.2) {
        forward = this.glideForwardDir * 0.92;
      }
    }

    // Hands-Free Auto-Walk Toggle
    if (this.autoWalkActive && Math.abs(forward) < 0.1) {
      forward = 0.88;
    }

    // Cancel Tap-to-Walk destination if user presses manual movement keys
    if (
      this.keys['KeyW'] || this.keys['KeyS'] || this.keys['KeyA'] || this.keys['KeyD'] ||
      this.keys['ArrowUp'] || this.keys['ArrowDown']
    ) {
      this.walkTarget = null;
      this.walkTargetRing.visible = false;
    }

    // Tap-Ground-to-Walk Autopilot (#walkTarget)
    if (this.walkTarget) {
      this.walkTargetRing.rotation.y += dt * 2.5;
      const pulse = 1 + Math.sin(this.elapsedTime * 8) * 0.14;
      this.walkTargetRing.scale.set(pulse, 1, pulse);

      const dx = this.walkTarget.x - this.player.x;
      const dz = this.walkTarget.z - this.player.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.52) {
        this.walkTarget = null;
        this.walkTargetRing.visible = false;
      } else {
        const targetYaw = Math.atan2(-dx, -dz);
        let diff = targetYaw - this.player.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.player.yaw += diff * Math.min(1, dt * 8.5);
        forward = Math.min(1.0, Math.max(0.55, dist * 0.65));
      }
    }

    forward = Math.max(-1, Math.min(1, forward));
    strafe = Math.max(-1, Math.min(1, strafe));

    if (Math.abs(forward) > 0.7 && Math.abs(strafe) > 0.7) {
      forward *= 0.7071;
      strafe *= 0.7071;
    }

    const petBoost = this.player.mountedPet
      ? (this.player.mountedPet.type === 'wolf' ? 1.5 : 1.38)
      : 1.0;
    const speed = (this.player.flying ? 9.0 : 5.6 * petBoost) * this.player.speedMultiplier;
    const sinY = Math.sin(this.player.yaw);
    const cosY = Math.cos(this.player.yaw);

    const vx = (-sinY * forward + cosY * strafe) * speed;
    const vz = (-cosY * forward - sinY * strafe) * speed;
    const isMoving = Math.abs(forward) > 0.01 || Math.abs(strafe) > 0.01;

    // Move X with True 3D AABB Voxel Collision + Butter-Smooth 1-Block Staircase Step-Up
    const nextX = Math.max(-24, Math.min(24, this.player.x + vx * dt));
    if (!this.checkAABBCollision(nextX, this.player.y, this.player.z)) {
      this.player.x = nextX;
    } else if (
      this.player.onGround &&
      !this.checkAABBCollision(this.player.x, this.player.y + 1.0, this.player.z) &&
      !this.checkAABBCollision(nextX, this.player.y + 1.0, this.player.z)
    ) {
      this.player.x = nextX;
      this.player.y += 1.0;
      this.player.stepOffset = Math.max(-1.0, this.player.stepOffset - 1.0);
    }

    // Move Z with True 3D AABB Voxel Collision + Butter-Smooth 1-Block Staircase Step-Up
    const nextZ = Math.max(-24, Math.min(24, this.player.z + vz * dt));
    if (!this.checkAABBCollision(this.player.x, this.player.y, nextZ)) {
      this.player.z = nextZ;
    } else if (
      this.player.onGround &&
      !this.checkAABBCollision(this.player.x, this.player.y + 1.0, this.player.z) &&
      !this.checkAABBCollision(this.player.x, this.player.y + 1.0, nextZ)
    ) {
      this.player.z = nextZ;
      this.player.y += 1.0;
      this.player.stepOffset = Math.max(-1.0, this.player.stepOffset - 1.0);
    }

    // Exponentially decay stair step-up offset so camera glides up stairs smoothly!
    this.player.stepOffset *= Math.exp(-16 * dt);
    if (Math.abs(this.player.stepOffset) < 0.005) this.player.stepOffset = 0;

    // Move Y (Gravity, Jumping, Roof Ceiling Collision & Jetpack Flying!)
    if (this.player.flying) {
      this.player.vy = 0;
      if (this.keys['Space'] || this.moveButtons.up) this.player.vy = 6.0;
      if (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.moveButtons.down) this.player.vy = -6.0;
      const nextY = Math.max(0.5, Math.min(32, this.player.y + this.player.vy * dt));
      if (!this.checkAABBCollision(this.player.x, nextY, this.player.z)) {
        this.player.y = nextY;
      }
      this.player.onGround = false;
    } else {
      const gravity = 22.0 * this.player.gravityMultiplier;
      this.player.vy = Math.max(-22, this.player.vy - gravity * dt);
      const nextY = this.player.y + this.player.vy * dt;

      if (!this.checkAABBCollision(this.player.x, nextY, this.player.z)) {
        this.player.y = nextY;
        this.player.onGround = false;
      } else {
        if (this.player.vy < 0) {
          this.player.y = Math.floor(this.player.y + 0.4) + 0.5;
          const underBlock = this.world.getBlock(
            Math.round(this.player.x),
            Math.round(this.player.y - 0.5),
            Math.round(this.player.z)
          );
          if (underBlock && underBlock.blockId === 12 && this.player.vy < -3.5) {
            this.player.vy = Math.min(16.5, Math.max(11.5, Math.abs(this.player.vy) * 1.1));
            this.player.onGround = false;
            window.soundEngine.playBounce();
          } else {
            this.player.vy = 0;
            this.player.onGround = true;
          }
        } else {
          this.player.vy = 0;
        }
      }

      if (this.player.y < 0.5) {
        this.player.y = 0.5;
        this.player.vy = 0;
        this.player.onGround = true;
      }
    }

    // Check Master Challenges: Sky Climber (Y>=10 No Fly!) and T-Rex Roof Jump (Y>=4 on T-Rex!)
    if (!this.player.flying && this.player.y >= 9.6 && !this.quests.climber10) {
      this.completeQuest('climber10', 'Scaled to Altitude Y=10 Without Fly!', 75);
    }

    // Sync Mounted Pet position & leg animation if riding a pet!
    let mountEyeOffset = 0;
    if (this.player.mountedPet) {
      const pet = this.player.mountedPet;
      pet.mesh.position.set(this.player.x, this.player.y, this.player.z);
      pet.mesh.rotation.y = this.player.yaw;
      const swing = isMoving ? Math.sin(this.elapsedTime * 12) * 0.65 : 0;
      for (let i = 0; i < pet.legs.length; i++) {
        pet.legs[i].rotation.x = i % 2 === 0 ? swing : -swing;
      }
      mountEyeOffset = pet.type === 'trex' ? 1.45 : 0.35;

      if (pet.type === 'trex' && this.player.y >= 3.6 && !this.quests.trexroof) {
        this.completeQuest('trexroof', 'T-Rex Mega-Jump to Rooftop Height!', 75);
      }
    }

    // Dynamic Warm Interior House PointLight (lights up house rooms & furniture!)
    const isIndoors = this.world.hasRoofAbove(this.player.x, this.player.y, this.player.z);
    const targetLightInt = isIndoors
      ? 1.15 + Math.sin(this.elapsedTime * 7) * 0.08
      : 0.2;
    this.interiorLight.intensity += (targetLightInt - this.interiorLight.intensity) * Math.min(1, dt * 6);
    this.interiorLight.position.set(this.player.x, this.player.y + 1.6, this.player.z);

    this.entities.updatePlayerVisuals(this.player, isMoving, this.elapsedTime, dt);

    // Position Camera with Smooth Stair Step-Up Offset & Explosion Shake
    let shakeX = 0;
    let shakeY = 0;
    if (this.player.shakeTimer > 0) {
      this.player.shakeTimer = Math.max(0, this.player.shakeTimer - dt);
      const mag = this.player.shakeTimer * 0.35;
      shakeX = (Math.random() - 0.5) * mag;
      shakeY = (Math.random() - 0.5) * mag;
    }

    const eyeX = this.player.x + shakeX;
    const eyeY = this.player.y + this.player.stepOffset + 1.52 + mountEyeOffset + shakeY;
    const eyeZ = this.player.z;

    if (!this.player.thirdPerson) {
      this.camera.position.set(eyeX, eyeY, eyeZ);
    } else {
      let camDist = 3.8;
      const backDir = {
        x: Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
        y: -Math.sin(this.player.pitch),
        z: Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
      };
      const wallHit = this.world.raycast({ x: eyeX, y: eyeY, z: eyeZ }, backDir, camDist);
      if (wallHit) {
        camDist = Math.max(0.6, wallHit.distance - 0.35);
      }
      this.camera.position.set(
        eyeX + backDir.x * camDist,
        eyeY + backDir.y * camDist + 0.3,
        eyeZ + backDir.z * camDist
      );
    }

    const lookX = eyeX - Math.sin(this.player.yaw) * Math.cos(this.player.pitch) * 8;
    const lookY = eyeY + Math.sin(this.player.pitch) * 8;
    const lookZ = eyeZ - Math.cos(this.player.yaw) * Math.cos(this.player.pitch) * 8;
    this.camera.lookAt(lookX, lookY, lookZ);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsedTime += dt;

    this.updatePlayerPhysics(dt);
    this.updateTimedChallenge(dt);
    this.updateRaycastAndGhost();
    this.world.update(dt, this.entities);
    this.entities.update(dt, this.player, this.elapsedTime, this.triggerShake);

    const counterEl = document.getElementById('hud-block-count');
    if (counterEl) counterEl.textContent = this.handCraftedBlocks;

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new MinecraftKidStudio();
});
