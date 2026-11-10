// Procedural 16x16 Voxel Pixel-Art Texture Generator with 1-Draw-Call 48x16 Multi-Face UV Atlas!
// Supports distinct Top, Side, and Bottom pixel art on Grass, Beds, Bookshelves, Logs & TNT in a single InstancedMesh draw call!

const BLOCK_TYPES = [
  {
    id: 1,
    key: 'brick',
    name: 'House Brick',
    emoji: '🧱',
    color: '#c84b31',
    description: 'Strong red bricks for building cozy house walls!'
  },
  {
    id: 2,
    key: 'planks',
    name: 'Wood Planks',
    emoji: '🪵',
    color: '#c28d4e',
    description: 'Warm oak wood planks for house floors & cabins!'
  },
  {
    id: 3,
    key: 'roof',
    name: 'Roof Tiles',
    emoji: '🏠',
    color: '#6d3b47',
    description: 'Shingle tiles for building pitched house roofs!'
  },
  {
    id: 4,
    key: 'glass',
    name: 'Glass Window',
    emoji: '🪟',
    color: '#bfefff',
    transparent: true,
    opacity: 0.48,
    description: 'Crystal clear window glass to see outside your house!'
  },
  {
    id: 5,
    key: 'door',
    name: 'Front Door',
    emoji: '🚪',
    color: '#9c6228',
    isDoor: true,
    description: 'Places a 2-block tall Front Door! Click the door anytime to Open or Close it!'
  },
  {
    id: 6,
    key: 'lantern',
    name: 'Glow Lantern',
    emoji: '💡',
    color: '#ffdd55',
    emissive: 0x664400,
    description: 'Warm golden light for inside your house! Click it to sparkle!'
  },
  {
    id: 7,
    key: 'bed',
    name: 'Cozy Bed',
    emoji: '🛏️',
    color: '#e63946',
    description: 'Place in your bedroom, then click the Bed to sleep from Night to Morning!'
  },
  {
    id: 8,
    key: 'bookshelf',
    name: 'Bookshelf',
    emoji: '📚',
    color: '#8f5d2c',
    description: 'Wooden shelves with storybooks! Click a placed bookshelf for a magic sparkle!'
  },
  {
    id: 11,
    key: 'diamond',
    name: 'Diamond',
    emoji: '💎',
    color: '#34f5e5',
    emissive: 0x0d4744,
    description: 'Sparkling cyan diamond treasure block!'
  },
  {
    id: 12,
    key: 'slime',
    name: 'Trampoline',
    emoji: '🟢',
    color: '#48ff48',
    emissive: 0x0d380d,
    bouncy: true,
    description: 'Jump on this green slime pad to bounce super high!'
  },
  {
    id: 19,
    key: 'jukebox',
    name: 'Disco Box',
    emoji: '🎵',
    color: '#d946ef',
    emissive: 0x441166,
    description: 'Place & click the Disco Jukebox to play dance music and make your pets dance!'
  },
  {
    id: 20,
    key: 'tnt',
    name: 'Super TNT',
    emoji: '🧨',
    color: '#ef233c',
    description: 'Place & click TNT to light the fuse for a big boom! (Press Undo Z to restore!)'
  },
  // Terrain & Structural Blueprint Blocks
  {
    id: 9,
    key: 'stone',
    name: 'Cobblestone',
    emoji: '🪨',
    color: '#808892',
    inHotbar: false
  },
  {
    id: 10,
    key: 'grass',
    name: 'Garden Grass',
    emoji: '🌱',
    color: '#4eb835',
    inHotbar: false
  },
  {
    id: 13,
    key: 'log',
    name: 'Oak Tree Log',
    emoji: '🌲',
    color: '#6e4a23',
    inHotbar: false
  },
  {
    id: 14,
    key: 'leaves',
    name: 'Tree Leaves',
    emoji: '🍃',
    color: '#2d8a2d',
    inHotbar: false
  },
  {
    id: 15,
    key: 'water',
    name: 'Pool Water',
    emoji: '💧',
    color: '#2b82ff',
    transparent: true,
    opacity: 0.72,
    nonSolid: true,
    inHotbar: false
  },
  {
    id: 16,
    key: 'white',
    name: 'Modern White Wall',
    emoji: '⬜',
    color: '#f1f5f9',
    inHotbar: false
  },
  {
    id: 17,
    key: 'flowers',
    name: 'Flower Garden',
    emoji: '🌻',
    color: '#55c43c',
    inHotbar: false
  },
  {
    id: 18,
    key: 'door_open',
    name: 'Open Door',
    emoji: '🚪',
    color: '#9c6228',
    transparent: true,
    opacity: 0.28,
    nonSolid: true,
    isDoor: true,
    inHotbar: false
  }
];

class TextureFactory {
  constructor() {
    this.materialsById = {};
    this.iconsById = {};
    this.multiFaceIds = new Set();
    this.atlasBoxGeom = null;
  }

  createAtlasBoxGeometry() {
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const uv = geom.attributes.uv;
    // Three.js BoxGeometry face order: 0:+X, 1:-X, 2:+Y (Top), 3:-Y (Bottom), 4:+Z, 5:-Z
    const faceTiles = [1, 1, 0, 2, 1, 1]; // 0 = Top, 1 = Side, 2 = Bottom
    for (let face = 0; face < 6; face++) {
      const tile = faceTiles[face];
      const uMin = (tile + 0.004) / 3;
      const uMax = (tile + 0.996) / 3;
      const base = face * 4;
      for (let v = 0; v < 4; v++) {
        const oldU = uv.getX(base + v);
        const oldV = uv.getY(base + v);
        uv.setXY(base + v, oldU < 0.5 ? uMin : uMax, oldV);
      }
    }
    uv.needsUpdate = true;
    return geom;
  }

  createPixelCanvas(drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return canvas;
  }

  fillNoise(ctx, baseHex, variations, seedOffset = 0) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = Math.sin((x + seedOffset) * 12.9898 + (y + seedOffset) * 78.233) * 43758.5453;
        const r = n - Math.floor(n);
        for (let i = 0; i < variations.length; i++) {
          if (r < variations[i].chance) {
            ctx.fillStyle = variations[i].color;
            ctx.fillRect(x, y, 1, 1);
            break;
          }
        }
      }
    }
  }

  canvasToTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  register(id, canvas, options = {}) {
    const mat = new THREE.MeshLambertMaterial({
      map: this.canvasToTexture(canvas),
      transparent: !!options.transparent,
      opacity: options.opacity !== undefined ? options.opacity : 1.0,
      emissive: options.emissive || 0x000000
    });
    this.materialsById[id] = mat;
    this.iconsById[id] = canvas.toDataURL();
  }

  registerAtlas(id, topCanvas, sideCanvas, bottomCanvas, options = {}) {
    const atlas = document.createElement('canvas');
    atlas.width = 48;
    atlas.height = 16;
    const ctx = atlas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(topCanvas, 0, 0);
    ctx.drawImage(sideCanvas, 16, 0);
    ctx.drawImage(bottomCanvas, 32, 0);

    const mat = new THREE.MeshLambertMaterial({
      map: this.canvasToTexture(atlas),
      transparent: !!options.transparent,
      opacity: options.opacity !== undefined ? options.opacity : 1.0,
      emissive: options.emissive || 0x000000
    });
    this.materialsById[id] = mat;
    this.iconsById[id] = (options.iconCanvas || sideCanvas).toDataURL();
    this.multiFaceIds.add(id);
  }

  buildAll() {
    this.atlasBoxGeom = this.createAtlasBoxGeometry();

    // 1. HOUSE BRICK
    const brickCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#d6cfc7';
      ctx.fillRect(0, 0, 16, 16);
      const colors = ['#b83b27', '#c94730', '#a63320', '#d1523b'];
      for (let row = 0; row < 4; row++) {
        const y = row * 4;
        const offset = (row % 2) * 4;
        for (let col = -1; col < 3; col++) {
          const x = col * 8 + offset;
          ctx.fillStyle = colors[(row + col + 4) % colors.length];
          ctx.fillRect(x + 1, y + 1, 7, 3);
        }
      }
    });
    this.register(1, brickCanvas);

    // 2. OAK WOOD PLANKS
    const planksCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#c48f52';
      ctx.fillRect(0, 0, 16, 16);
      const shades = ['#cf9b5d', '#b88346', '#c99355', '#ad793e'];
      for (let row = 0; row < 4; row++) {
        const y = row * 4;
        ctx.fillStyle = shades[row];
        ctx.fillRect(0, y, 16, 3);
        ctx.fillStyle = '#8c5f2b';
        ctx.fillRect(0, y + 3, 16, 1);
        const seamX = (row * 7 + 4) % 14 + 1;
        ctx.fillRect(seamX, y, 1, 3);
      }
    });
    this.register(2, planksCanvas);

    // 3. ROOF SHINGLE TILES
    const roofCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#5e2f3d';
      ctx.fillRect(0, 0, 16, 16);
      for (let y = 0; y < 16; y += 4) {
        ctx.fillStyle = y % 8 === 0 ? '#733b4c' : '#633240';
        ctx.fillRect(0, y, 16, 3);
        ctx.fillStyle = '#421e28';
        ctx.fillRect(0, y + 3, 16, 1);
        for (let x = (y % 8 === 0 ? 0 : 2); x < 16; x += 4) {
          ctx.fillRect(x, y, 1, 3);
        }
      }
    });
    this.register(3, roofCanvas);

    // 4. GLASS WINDOW
    const glassCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = 'rgba(190, 240, 255, 0.28)';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 16, 2);
      ctx.fillRect(0, 14, 16, 2);
      ctx.fillRect(0, 0, 2, 16);
      ctx.fillRect(14, 0, 2, 16);
      ctx.fillRect(7, 0, 2, 16);
      ctx.fillRect(0, 7, 16, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, 3, 2, 1);
      ctx.fillRect(3, 4, 1, 2);
    });
    this.register(4, glassCanvas, { transparent: true, opacity: 0.56 });

    // 5. FRONT DOOR (Closed) & 18. FRONT DOOR (Open)
    const doorCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#8f5824';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#704318';
      ctx.strokeRect(1, 1, 14, 14);
      ctx.fillStyle = '#bfefff';
      ctx.fillRect(3, 2, 4, 5);
      ctx.fillRect(9, 2, 4, 5);
      ctx.fillStyle = '#6b3e15';
      ctx.fillRect(3, 9, 10, 5);
      ctx.fillStyle = '#ffd026';
      ctx.fillRect(12, 7, 2, 2);
    });
    this.register(5, doorCanvas);
    this.register(18, doorCanvas, { transparent: true, opacity: 0.25 });

    // 6. GLOW LANTERN
    const lanternCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ffbb22';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#ffee88';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(6, 6, 4, 4);
    });
    this.register(6, lanternCanvas, { emissive: 0x664400 });

    // 7. COZY BED BLOCK (Multi-Face Atlas: Pillow+Quilt Top, Bed Frame Sides, Plank Bottom)
    const bedTopCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#d62828';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(1, 1, 14, 5);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(0, 6, 16, 1);
      ctx.fillStyle = '#b51d1d';
      ctx.fillRect(2, 8, 12, 6);
    });
    const bedSideCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#c48f52';
      ctx.fillRect(0, 8, 16, 8);
      ctx.fillStyle = '#d62828';
      ctx.fillRect(0, 0, 16, 9);
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, 5, 6);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(0, 8, 16, 1);
    });
    this.registerAtlas(7, bedTopCanvas, bedSideCanvas, planksCanvas, { iconCanvas: bedTopCanvas });

    // 8. BOOKSHELF (Multi-Face Atlas: Wood Planks Top/Bottom, Books on 4 Sides)
    const shelfCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#a8753d';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#3b2410';
      ctx.fillRect(1, 2, 14, 5);
      ctx.fillRect(1, 9, 14, 5);
      const bookColors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#06b6d4'];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = bookColors[i];
        ctx.fillRect(2 + i * 2, 3, 2, 4);
        ctx.fillStyle = bookColors[(i + 3) % bookColors.length];
        ctx.fillRect(2 + i * 2, 10, 2, 4);
      }
    });
    this.registerAtlas(8, planksCanvas, shelfCanvas, planksCanvas, { iconCanvas: shelfCanvas });

    // 9. COBBLESTONE
    const stoneCanvas = this.createPixelCanvas((ctx) => {
      this.fillNoise(ctx, '#7c848e', [
        { chance: 0.25, color: '#616870' },
        { chance: 0.5, color: '#969fa8' }
      ], 3);
      ctx.strokeStyle = '#50565e';
      ctx.strokeRect(1, 1, 6, 6);
      ctx.strokeRect(8, 2, 7, 5);
      ctx.strokeRect(2, 9, 8, 6);
    });
    this.register(9, stoneCanvas);

    // 10. GARDEN GRASS (Multi-Face Atlas: Green Top, Grass-Fringe over Dirt Sides, Dirt Bottom)
    const grassTopCanvas = this.createPixelCanvas((ctx) => {
      this.fillNoise(ctx, '#48b032', [
        { chance: 0.28, color: '#58c940' },
        { chance: 0.5, color: '#3b9627' }
      ], 10);
    });
    const dirtCanvas = this.createPixelCanvas((ctx) => {
      this.fillNoise(ctx, '#7a5230', [
        { chance: 0.28, color: '#634124' },
        { chance: 0.52, color: '#8f623b' }
      ], 21);
    });
    const grassSideCanvas = this.createPixelCanvas((ctx) => {
      ctx.drawImage(dirtCanvas, 0, 0);
      ctx.fillStyle = '#48b032';
      ctx.fillRect(0, 0, 16, 4);
      const blades = [5, 6, 4, 5, 7, 5, 4, 6, 5, 4, 6, 5, 4, 5, 6, 4];
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = x % 2 === 0 ? '#48b032' : '#58c940';
        ctx.fillRect(x, 0, 1, blades[x]);
      }
    });
    this.registerAtlas(10, grassTopCanvas, grassSideCanvas, dirtCanvas, { iconCanvas: grassSideCanvas });

    // 11. DIAMOND BLOCK
    const diamondCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#1cd6ce';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#6cfcf5';
      ctx.fillRect(1, 1, 14, 14);
      ctx.fillStyle = '#25e8df';
      ctx.fillRect(3, 3, 10, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 4, 4, 4);
    });
    this.register(11, diamondCanvas, { emissive: 0x0b4442 });

    // 12. BOUNCY SLIME TRAMPOLINE
    const slimeCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#2dd42d';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#6bff6b';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#22a822';
      ctx.fillRect(4, 4, 8, 8);
    });
    this.register(12, slimeCanvas, { emissive: 0x0a330a });

    // 13. OAK TREE LOG (Multi-Face Atlas: Rings on Top/Bottom, Vertical Bark on Sides)
    const logSideCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#6b4722';
      ctx.fillRect(0, 0, 16, 16);
      for (let x = 0; x < 16; x += 2) {
        ctx.fillStyle = x % 4 === 0 ? '#543618' : '#7d5429';
        ctx.fillRect(x, 0, 1, 16);
      }
    });
    const logTopCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#6b4722';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#d4a36a';
      ctx.fillRect(2, 2, 12, 12);
      ctx.strokeStyle = '#a87840';
      ctx.strokeRect(4.5, 4.5, 7, 7);
      ctx.fillStyle = '#8c5f2b';
      ctx.fillRect(7, 7, 2, 2);
    });
    this.registerAtlas(13, logTopCanvas, logSideCanvas, logTopCanvas, { iconCanvas: logSideCanvas });

    // 14. TREE LEAVES
    const leavesCanvas = this.createPixelCanvas((ctx) => {
      this.fillNoise(ctx, '#2b8a28', [
        { chance: 0.3, color: '#39ab35' },
        { chance: 0.55, color: '#1d661b' }
      ], 14);
    });
    this.register(14, leavesCanvas);

    // 15. POOL WATER
    const waterCanvas = this.createPixelCanvas((ctx) => {
      this.fillNoise(ctx, '#2484ff', [
        { chance: 0.3, color: '#59a5ff' },
        { chance: 0.5, color: '#1967d2' }
      ], 15);
    });
    this.register(15, waterCanvas, { transparent: true, opacity: 0.72 });

    // 16. MODERN WHITE WALL
    const whiteCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, 16, 16);
      ctx.strokeStyle = '#dce4ee';
      ctx.strokeRect(0.5, 0.5, 15, 15);
    });
    this.register(16, whiteCanvas);

    // 17. FLOWER GARDEN
    const flowerCanvas = this.createPixelCanvas((ctx) => {
      this.fillNoise(ctx, '#48b032', [{ chance: 0.3, color: '#58c940' }], 17);
      const petals = ['#ffdd00', '#ff4d6d', '#ffffff', '#ff9e00'];
      const spots = [[3, 3], [11, 4], [5, 11], [12, 11], [8, 7]];
      spots.forEach(([fx, fy], idx) => {
        ctx.fillStyle = petals[idx % petals.length];
        ctx.fillRect(fx, fy, 2, 2);
      });
    });
    this.register(17, flowerCanvas);

    // 19. DISCO JUKEBOX BLOCK
    const jukeboxCanvas = this.createPixelCanvas((ctx) => {
      const colors = ['#ff3b6b', '#ff9e2c', '#ffe62c', '#38e858', '#36b5ff', '#b34dff'];
      for (let y = 0; y < 16; y += 4) {
        for (let x = 0; x < 16; x += 4) {
          ctx.fillStyle = colors[((x + y) / 4) % colors.length];
          ctx.fillRect(x, y, 4, 4);
        }
      }
      ctx.fillStyle = '#111827';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#34f5e5';
      ctx.fillRect(6, 6, 4, 4);
    });
    this.register(19, jukeboxCanvas, { emissive: 0x331155 });

    // 20. SUPER TNT DYNAMITE BLOCK (Multi-Face Atlas: Fuse Top, "TNT" Banner Sides)
    const tntTopCanvas = this.createPixelCanvas((ctx) => {
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#ef4444';
      for (let y = 1; y < 15; y += 4) {
        for (let x = 1; x < 15; x += 4) {
          ctx.fillRect(x, y, 3, 3);
        }
      }
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(6, 6, 4, 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(7, 7, 2, 2);
    });
    const tntSideCanvas = this.createPixelCanvas((ctx) => {
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = Math.floor(x / 4) % 2 === 0 ? '#dc2626' : '#b91c1c';
        ctx.fillRect(x, 0, 1, 16);
      }
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 5, 16, 6);
      ctx.fillStyle = '#111827';
      // T
      ctx.fillRect(2, 6, 3, 1); ctx.fillRect(3, 6, 1, 4);
      // N
      ctx.fillRect(6, 6, 1, 4); ctx.fillRect(7, 7, 1, 1); ctx.fillRect(8, 8, 1, 1); ctx.fillRect(9, 6, 1, 4);
      // T
      ctx.fillRect(11, 6, 3, 1); ctx.fillRect(12, 6, 1, 4);
    });
    this.registerAtlas(20, tntTopCanvas, tntSideCanvas, tntTopCanvas, { iconCanvas: tntSideCanvas });
  }

  getMaterial(blockId) {
    return this.materialsById[blockId] || this.materialsById[1];
  }

  getBlockInfo(blockId) {
    return BLOCK_TYPES.find((b) => b.id === blockId) || BLOCK_TYPES[0];
  }
}

window.BLOCK_TYPES = BLOCK_TYPES;
window.textureFactory = new TextureFactory();
