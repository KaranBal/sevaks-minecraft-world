// Walkable, Furnished 3D House Blueprints, Giant Rainbow Bridge & 3D Name Sign Generator
// Every house has hollow rooms (blockId: 0 clears interior air), working doors, glass windows, lanterns, beds, bookshelves & disco jukebox!

const PIXEL_FONT_5X7 = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','11011','10001'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
  '0': ['01110','10011','10101','10101','11001','10001','01110'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '2': ['01110','10001','00001','00110','01000','10000','11111'],
  '3': ['11110','00001','00001','01110','00001','00001','11110'],
  '4': ['10010','10010','10010','11111','00010','00010','00010'],
  '5': ['11111','10000','10000','11110','00001','00001','11110'],
  '6': ['01110','10000','10000','11110','10001','10001','01110'],
  '7': ['11111','00001','00010','00100','00100','00100','00100'],
  '8': ['01110','10001','10001','01110','10001','10001','01110'],
  '9': ['01110','10001','10001','01111','00001','00001','01110'],
  '!': ['00100','00100','00100','00100','00100','00000','00100']
};

class StructureGenerator {
  static finalize(map) {
    const list = Array.from(map.values());
    list.sort((a, b) => a.dy - b.dy || a.dz - b.dz || a.dx - b.dx);
    return list;
  }

  static set(map, dx, dy, dz, blockId) {
    map.set(`${dx},${dy},${dz}`, { dx, dy, dz, blockId });
  }

  // 1. COZY FAMILY BRICK & WOOD COTTAGE HOUSE
  static generateCozyHouse() {
    const m = new Map();
    const w = 4;
    const d = 4;

    for (let y = 1; y <= 9; y++) {
      for (let x = -w - 2; x <= w + 2; x++) {
        for (let z = -d - 2; z <= d + 3; z++) {
          this.set(m, x, y, z, 0);
        }
      }
    }

    for (let x = -w; x <= w; x++) {
      for (let z = -d; z <= d; z++) {
        this.set(m, x, 0, z, 2);
      }
    }
    for (let z = d + 1; z <= d + 2; z++) {
      this.set(m, 0, 0, z, 9);
      this.set(m, -1, 0, z, 9);
      this.set(m, 1, 0, z, 9);
    }
    for (let x = -w; x <= -2; x++) this.set(m, x, 1, d + 1, 17);
    for (let x = 2; x <= w; x++) this.set(m, x, 1, d + 1, 17);

    for (let y = 1; y <= 4; y++) {
      for (let x = -w; x <= w; x++) {
        for (let z = -d; z <= d; z++) {
          const isEdgeX = Math.abs(x) === w;
          const isEdgeZ = Math.abs(z) === d;
          if (!isEdgeX && !isEdgeZ) continue;

          if (z === d && x === 0 && (y === 1 || y === 2)) {
            this.set(m, x, y, z, 5);
            continue;
          }

          if (isEdgeX && isEdgeZ) {
            this.set(m, x, y, z, 13);
            continue;
          }

          const isFrontWindow = z === d && Math.abs(x) === 2 && (y === 2 || y === 3);
          const isBackWindow = z === -d && Math.abs(x) <= 1 && (y === 2 || y === 3);
          const isSideWindow = isEdgeX && Math.abs(z) <= 1 && (y === 2 || y === 3);

          if (isFrontWindow || isBackWindow || isSideWindow) {
            this.set(m, x, y, z, 4);
          } else {
            this.set(m, x, y, z, 1);
          }
        }
      }
    }

    for (let step = 0; step <= w + 1; step++) {
      const ry = 5 + step;
      const rxMax = w + 1 - step;
      if (rxMax < 0) break;
      for (let z = -d - 1; z <= d + 1; z++) {
        this.set(m, -rxMax, ry, z, 3);
        this.set(m, rxMax, ry, z, 3);
        if (Math.abs(z) === d && rxMax > 1) {
          for (let gx = -rxMax + 1; gx <= rxMax - 1; gx++) {
            this.set(m, gx, ry, z, 2);
          }
        }
      }
    }

    for (let cy = 1; cy <= 9; cy++) {
      this.set(m, w, cy, -d + 1, 9);
    }

    // Cozy Bed in back-left corner (Click to Sleep!)
    this.set(m, -w + 1, 1, -d + 1, 7);
    this.set(m, -w + 2, 1, -d + 1, 7);
    this.set(m, -w + 1, 1, -d + 2, 7);
    this.set(m, -w + 2, 1, -d + 2, 7);

    // Bookshelf & Interactive Disco Jukebox in back-right corner!
    for (let by = 1; by <= 3; by++) {
      this.set(m, w - 1, by, -d + 1, 8);
      this.set(m, w - 2, by, -d + 1, 8);
    }
    this.set(m, w - 1, 1, d - 1, 19); // Disco Jukebox right inside the house!

    // Glow Lanterns
    this.set(m, -w + 1, 4, d - 1, 6);
    this.set(m, w - 1, 4, d - 1, 6);
    this.set(m, 0, 4, -d + 1, 6);
    this.set(m, -1, 3, d + 1, 6);
    this.set(m, 1, 3, d + 1, 6);

    return this.finalize(m);
  }

  // 2. MODERN GLASS & POOL VILLA
  static generateModernVilla() {
    const m = new Map();
    const w = 5;
    const d = 4;

    for (let y = 1; y <= 10; y++) {
      for (let x = -w - 2; x <= w + 2; x++) {
        for (let z = -d - 2; z <= d + 6; z++) {
          this.set(m, x, y, z, 0);
        }
      }
    }

    for (let x = -w; x <= w; x++) {
      for (let z = -d; z <= d; z++) {
        this.set(m, x, 0, z, 2);
      }
    }

    for (let x = -4; x <= 4; x++) {
      for (let z = d + 1; z <= d + 5; z++) {
        const isBorder = x === -4 || x === 4 || z === d + 1 || z === d + 5;
        this.set(m, x, 0, z, isBorder ? 16 : 15);
      }
    }
    this.set(m, -4, 1, d + 3, 12);
    this.set(m, -3, 1, d + 3, 12);

    for (let y = 1; y <= 4; y++) {
      for (let x = -w; x <= w; x++) {
        for (let z = -d; z <= d; z++) {
          const isEdgeX = Math.abs(x) === w;
          const isEdgeZ = Math.abs(z) === d;
          if (!isEdgeX && !isEdgeZ) continue;

          if (z === d && (x === 0 || x === 1) && (y === 1 || y === 2)) {
            this.set(m, x, y, z, 5);
            continue;
          }

          if ((isEdgeX && isEdgeZ) || y === 4) {
            this.set(m, x, y, z, 16);
          } else if (y === 2 || y === 3) {
            this.set(m, x, y, z, 4);
          } else {
            this.set(m, x, y, z, 2);
          }
        }
      }
    }

    for (let x = -w - 1; x <= w + 1; x++) {
      for (let z = -d - 1; z <= d + 1; z++) {
        this.set(m, x, 5, z, 16);
        const onRoofEdge = Math.abs(x) === w + 1 || Math.abs(z) === d + 1;
        if (onRoofEdge) {
          this.set(m, x, 6, z, 4);
        }
      }
    }

    for (let s = 0; s < 5; s++) {
      this.set(m, w + 1, 1 + s, d - s, 2);
      this.set(m, w + 1, 6, d - s, 0);
    }

    for (let bx = -w + 1; bx <= -w + 3; bx++) {
      this.set(m, bx, 1, -d + 1, 7);
      this.set(m, bx, 1, -d + 2, 7);
    }
    this.set(m, w - 1, 1, -d + 1, 8);
    this.set(m, w - 1, 2, -d + 1, 8);
    this.set(m, w - 2, 1, -d + 1, 8);
    this.set(m, w - 2, 2, -d + 1, 8);
    this.set(m, w - 1, 1, d - 1, 19); // Disco Jukebox
    this.set(m, -w + 1, 4, 0, 6);
    this.set(m, w - 1, 4, 0, 6);

    return this.finalize(m);
  }

  // 3. GIANT OAK TREEHOUSE WITH STAIRCASE & SKY CABIN
  static generateTreehouse() {
    const m = new Map();

    for (let y = 1; y <= 12; y++) {
      for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
          this.set(m, x, y, z, 0);
        }
      }
    }

    for (let y = 0; y <= 4; y++) {
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          this.set(m, x, y, z, 13);
        }
      }
    }

    const stairs = [
      [0, 1, 4],
      [1, 2, 3],
      [2, 3, 2],
      [2, 4, 1],
      [2, 5, 0]
    ];
    for (const [sx, sy, sz] of stairs) {
      this.set(m, sx, sy, sz, 2);
      this.set(m, sx + 1, sy, sz, 2);
    }

    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        if (x >= 2 && x <= 3 && z >= 1 && z <= 2) continue;
        this.set(m, x, 5, z, 2);
      }
    }

    for (let y = 6; y <= 8; y++) {
      for (let x = -4; x <= 4; x++) {
        for (let z = -4; z <= 4; z++) {
          const isEdge = Math.abs(x) === 4 || Math.abs(z) === 4;
          if (!isEdge) continue;
          if (z === 4 && (x === 2 || x === 3) && y <= 7) continue;

          if (y === 7 && (Math.abs(x) <= 1 || Math.abs(z) <= 1)) {
            this.set(m, x, y, z, 4);
          } else {
            this.set(m, x, y, z, 2);
          }
        }
      }
    }

    for (let y = 9; y <= 11; y++) {
      const r = 5 - (y - 9);
      for (let x = -r; x <= r; x++) {
        for (let z = -r; z <= r; z++) {
          this.set(m, x, y, z, 14);
        }
      }
    }

    this.set(m, -3, 6, -3, 7);
    this.set(m, -2, 6, -3, 7);
    this.set(m, -3, 6, -2, 7);
    this.set(m, 3, 6, -3, 8);
    this.set(m, 3, 7, -3, 8);
    this.set(m, -3, 6, 3, 19); // Disco Jukebox
    this.set(m, 0, 8, 0, 6);
    this.set(m, -3, 8, 3, 6);

    return this.finalize(m);
  }

  // 4. ROYAL CASTLE HOME
  static generateCastleHome() {
    const m = new Map();
    const s = 4;

    for (let y = 1; y <= 10; y++) {
      for (let x = -s - 2; x <= s + 2; x++) {
        for (let z = -s - 2; z <= s + 2; z++) {
          this.set(m, x, y, z, 0);
        }
      }
    }

    for (let x = -s; x <= s; x++) {
      for (let z = -s; z <= s; z++) {
        this.set(m, x, 0, z, Math.abs(x) <= 1 ? 7 : 9);
      }
    }

    for (let y = 1; y <= 4; y++) {
      for (let x = -s; x <= s; x++) {
        for (let z = -s; z <= s; z++) {
          const isEdge = Math.abs(x) === s || Math.abs(z) === s;
          if (!isEdge) continue;
          if (z === s && x === 0 && (y === 1 || y === 2)) {
            this.set(m, x, y, z, 5);
            continue;
          }
          if (y === 2 && (x === 0 || z === 0)) {
            this.set(m, x, y, z, 4);
          } else {
            this.set(m, x, y, z, 9);
          }
        }
      }
    }

    for (let x = -s; x <= s; x++) {
      for (let z = -s; z <= s; z++) {
        this.set(m, x, 5, z, 9);
        const isEdge = Math.abs(x) === s || Math.abs(z) === s;
        if (isEdge && (x + z) % 2 === 0) {
          this.set(m, x, 6, z, 9);
        }
      }
    }

    const corners = [[-s, -s], [s, -s], [-s, s], [s, s]];
    for (const [cx, cz] of corners) {
      for (let y = 1; y <= 7; y++) {
        this.set(m, cx, y, cz, 9);
      }
      this.set(m, cx, 8, cz, 11);
      this.set(m, cx, 9, cz, 6);
    }

    this.set(m, 0, 1, -s + 1, 11);
    this.set(m, 0, 2, -s + 1, 11);
    this.set(m, -s + 1, 1, -s + 1, 7);
    this.set(m, -s + 1, 1, -s + 2, 7);
    this.set(m, s - 1, 1, -s + 1, 8);
    this.set(m, s - 1, 2, -s + 1, 8);
    this.set(m, s - 1, 1, s - 1, 19);
    this.set(m, -2, 4, 0, 6);
    this.set(m, 2, 4, 0, 6);

    return this.finalize(m);
  }

  // 5. GIANT RAINBOW SKY BRIDGE & SLIME TRAMPOLINE PARK
  static generateRainbowBridge() {
    const m = new Map();
    const layers = [1, 6, 12, 11, 19]; // Red Brick, Gold Lantern, Green Slime, Cyan Diamond, Purple Disco
    for (let x = -7; x <= 7; x++) {
      const archY = Math.max(1, Math.round(7 - (x * x) / 8));
      for (let l = 0; l < layers.length; l++) {
        const z = l - 2;
        this.set(m, x, archY, z, layers[l]);
      }
      // Bouncy Slime trampoline landing pads at both ends
      if (Math.abs(x) >= 6) {
        for (let z = -2; z <= 2; z++) {
          this.set(m, x, 1, z, 12);
        }
      }
    }
    return this.finalize(m);
  }

  // 6. 3D SEVAK MONUMENT
  static generate3DText(rawText = 'SEVAK') {
    const clean = (rawText || 'SEVAK').toUpperCase().replace(/[^A-Z0-9! ]/g, '').slice(0, 10) || 'SEVAK';
    const m = new Map();
    const charWidth = 6;
    const totalWidth = clean.length * charWidth - 1;
    const startX = -Math.floor(totalWidth / 2);

    for (let x = startX - 1; x <= startX + totalWidth; x++) {
      this.set(m, x, 0, 0, 9);
      this.set(m, x, 1, 0, 6);
    }

    for (let c = 0; c < clean.length; c++) {
      const ch = clean[c];
      if (ch === ' ') continue;
      const bitmap = PIXEL_FONT_5X7[ch] || PIXEL_FONT_5X7['!'];
      const blockId = c % 2 === 0 ? 11 : 6;
      const baseX = startX + c * charWidth;

      for (let row = 0; row < 7; row++) {
        const dy = 2 + (6 - row);
        for (let col = 0; col < 5; col++) {
          if (bitmap[row][col] === '1') {
            this.set(m, baseX + col, dy, 0, blockId);
          }
        }
      }
    }

    return this.finalize(m);
  }
}

window.StructureGenerator = StructureGenerator;
