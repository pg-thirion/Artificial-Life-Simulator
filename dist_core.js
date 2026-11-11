/* === BUNDLED SIMULATION CORE (CORS-FREE STANDALONE) === */

/* --- src/math.js --- */
/**
 * Artificial Life Simulator - Math & Vector Utilities
 * Pure ES6 module providing 2D Vector physics, Box-Muller Gaussian distributions,
 * clamping/interpolation, and Primer-compatible phenotypic color derivation.
 */

class Vector2D {
  /**
   * @param {number} x 
   * @param {number} y 
   */
  constructor(x = 0, y = 0) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
  }

  /**
   * Sets components in-place.
   * @param {number} x 
   * @param {number} y 
   * @returns {Vector2D} this
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Returns a new copy of this vector.
   * @returns {Vector2D}
   */
  copy() {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Adds another vector or (x, y) to this vector in-place.
   * @param {Vector2D|number} v 
   * @param {number} [y] 
   * @returns {Vector2D} this
   */
  add(v, y) {
    if (typeof v === 'number') {
      this.x += v;
      this.y += y !== undefined ? y : v;
    } else {
      this.x += v.x;
      this.y += v.y;
    }
    return this;
  }

  /**
   * Subtracts another vector or (x, y) from this vector in-place.
   * @param {Vector2D|number} v 
   * @param {number} [y] 
   * @returns {Vector2D} this
   */
  sub(v, y) {
    if (typeof v === 'number') {
      this.x -= v;
      this.y += y !== undefined ? y : v;
    } else {
      this.x -= v.x;
      this.y -= v.y;
    }
    return this;
  }

  /**
   * Multiplies vector components by scalar n in-place.
   * @param {number} n 
   * @returns {Vector2D} this
   */
  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  /**
   * Divides vector components by scalar n in-place.
   * Guarded against division by zero.
   * @param {number} n 
   * @returns {Vector2D} this
   */
  div(n) {
    if (n === 0 || !Number.isFinite(n)) {
      this.x = 0;
      this.y = 0;
    } else {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  /**
   * Calculates squared magnitude.
   * @returns {number}
   */
  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Calculates magnitude (length).
   * @returns {number}
   */
  mag() {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Calculates squared Euclidean distance to another vector.
   * Faster than dist() because it avoids Math.sqrt.
   * @param {Vector2D} v 
   * @returns {number}
   */
  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculates Euclidean distance to another vector.
   * @param {Vector2D} v 
   * @returns {number}
   */
  dist(v) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  /**
   * Normalizes vector to unit length in-place.
   * @returns {Vector2D} this
   */
  normalize() {
    const m = this.mag();
    if (m > 1e-9) {
      this.div(m);
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  /**
   * Limits vector magnitude to max.
   * @param {number} max 
   * @returns {Vector2D} this
   */
  limit(max) {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.div(Math.sqrt(mSq)).mult(max);
    }
    return this;
  }

  /**
   * Sets magnitude of vector to len in-place.
   * @param {number} len 
   * @returns {Vector2D} this
   */
  setMag(len) {
    return this.normalize().mult(len);
  }

  /**
   * Calculates angle of rotation in radians.
   * @returns {number} Angle in radians [-PI, PI]
   */
  heading() {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Rotates vector by an angle in radians in-place.
   * @param {number} angle 
   * @returns {Vector2D} this
   */
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  /**
   * Dot product with another vector.
   * @param {Vector2D} v 
   * @returns {number}
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Linearly interpolates towards vector v.
   * @param {Vector2D} v 
   * @param {number} t (0.0 - 1.0)
   * @returns {Vector2D} this
   */
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  // --- Static Vector Operations ---

  static add(v1, v2) {
    return new Vector2D(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1, v2) {
    return new Vector2D(v1.x - v2.x, v1.y - v2.y);
  }

  static mult(v, n) {
    return new Vector2D(v.x * n, v.y * n);
  }

  static div(v, n) {
    if (n === 0 || !Number.isFinite(n)) return new Vector2D(0, 0);
    return new Vector2D(v.x / n, v.y / n);
  }

  static dist(v1, v2) {
    return Math.hypot(v1.x - v2.x, v1.y - v2.y);
  }

  static distSq(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return dx * dx + dy * dy;
  }

  static fromAngle(angle, length = 1) {
    return new Vector2D(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static random(length = 1) {
    const angle = Math.random() * Math.PI * 2;
    return Vector2D.fromAngle(angle, length);
  }
}

// --- Random Number Utilities ---

/**
 * Returns a pseudorandom float within [min, max).
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function randomFloat(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

/**
 * Returns a pseudorandom integer within [min, max] inclusive.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(low + Math.random() * (high - low + 1));
}

/**
 * Generates normally distributed random numbers using Box-Muller transform.
 * @param {number} mean 
 * @param {number} stdDev 
 * @returns {number}
 */
function randomGaussian(mean = 0, stdDev = 1) {
  let u1 = 0;
  let u2 = 0;
  // Prevent Math.log(0)
  while (u1 <= 1e-15) u1 = Math.random();
  while (u2 <= 1e-15) u2 = Math.random();
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Clamps value between min and max.
 * @param {number} val 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Linear interpolation between a and b.
 * @param {number} a 
 * @param {number} b 
 * @param {number} t (0 - 1)
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Re-maps a number from one range to another.
 * @param {number} val 
 * @param {number} inMin 
 * @param {number} inMax 
 * @param {number} outMin 
 * @param {number} outMax 
 * @param {boolean} [clampResult=false] 
 * @returns {number}
 */
function mapRange(val, inMin, inMax, outMin, outMax, clampResult = false) {
  if (Math.abs(inMax - inMin) < 1e-12) return outMin;
  const res = outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
  return clampResult ? clamp(res, Math.min(outMin, outMax), Math.max(outMin, outMax)) : res;
}

// --- Color Utilities ---

/**
 * Converts HSL values to RGB format.
 * @param {number} h Hue in degrees [0, 360]
 * @param {number} s Saturation in [0, 1] or [0, 100]
 * @param {number} l Lightness in [0, 1] or [0, 100]
 * @returns {{r: number, g: number, b: number, css: string}}
 */
function hslToRgb(h, s, l) {
  // Normalize hue to [0, 360)
  let normH = ((h % 360) + 360) % 360;
  // If s or l > 1 assume percentage 0-100
  let normS = s > 1 ? s / 100 : s;
  let normL = l > 1 ? l / 100 : l;

  normS = clamp(normS, 0, 1);
  normL = clamp(normL, 0, 1);

  const c = (1 - Math.abs(2 * normL - 1)) * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normL - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (normH < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (normH < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (normH < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (normH < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (normH < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  const r = Math.round((rPrime + m) * 255);
  const g = Math.round((gPrime + m) * 255);
  const b = Math.round((bPrime + m) * 255);

  return {
    r,
    g,
    b,
    css: `rgb(${r}, ${g}, ${b})`
  };
}

/**
 * Converts a hex string (#RGB, #RRGGBB) to {r, g, b}.
 * @param {string} hex 
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  if (isNaN(intVal)) return { r: 255, g: 255, b: 255 };
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255
  };
}

/**
 * Converts RGB components to hex code.
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {string} #rrggbb
 */
function rgbToHex(r, g, b) {
  const clampR = clamp(Math.round(r), 0, 255);
  const clampG = clamp(Math.round(g), 0, 255);
  const clampB = clamp(Math.round(b), 0, 255);
  return '#' + [clampR, clampG, clampB]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives phenotypic colors from creature genome traits.
 * Inspired by Primer's visual biological markers:
 * - Herbivores (diet=0): Emerald green (hue ~ 135)
 * - Omnivores (diet=0.5): Golden honey / warm amber (hue ~ 42)
 * - Carnivores (diet=1.0): Aggressive crimson / vermilion (hue ~ 4)
 * - Speed elevates saturation and shifts hue towards cyan/neon highlights
 * - Bravery shifts the outline/accent contrast
 * @param {Object} genome Genome or trait bundle
 * @returns {Object} Color bundle for rendering
 */
function geneticColor(genome) {
  const diet = clamp(genome?.diet ?? 0, 0, 1);
  const speed = genome?.speed ?? 2.0;
  const bravery = clamp(genome?.bravery ?? 0.5, 0, 1);
  const sense = genome?.sense ?? 80;

  // Hue calculation:
  // Diet 0 (herbivore) -> 135 (green)
  // Diet 0.5 (omnivore) -> 42 (golden amber)
  // Diet 1.0 (carnivore) -> 4 (crimson red)
  let baseHue;
  if (diet < 0.5) {
    const t = diet / 0.5;
    baseHue = lerp(135, 42, t);
  } else {
    const t = (diet - 0.5) / 0.5;
    baseHue = lerp(42, 4, t);
  }

  // Speed trait increases saturation and gives electric vitality
  const speedNorm = clamp((speed - 1.0) / 3.0, 0, 1);
  const saturation = Math.round(lerp(65, 95, speedNorm));
  const lightness = Math.round(lerp(46, 56, 1 - Math.abs(diet - 0.5) * 0.2));

  // Sense trait controls subtle eye iris tint or aura
  const senseNorm = clamp((sense - 30) / 150, 0, 1);
  const irisHue = (baseHue + 180 + senseNorm * 40) % 360;

  // Bravery controls accent outline luminance
  const strokeLightness = Math.round(lerp(25, 15, bravery));

  const bodyCss = `hsl(${Math.round(baseHue)}, ${saturation}%, ${lightness}%)`;
  const bodyGlowCss = `hsla(${Math.round(baseHue)}, ${saturation}%, ${lightness}%, 0.35)`;
  const strokeCss = `hsl(${Math.round(baseHue)}, ${Math.min(100, saturation + 10)}%, ${strokeLightness}%)`;
  const irisCss = `hsl(${Math.round(irisHue)}, 90%, 60%)`;
  const eyeWhiteCss = '#f8fafc';

  return {
    hue: Math.round(baseHue),
    saturation,
    lightness,
    bodyCss,
    bodyGlowCss,
    strokeCss,
    irisCss,
    eyeWhiteCss,
    diet
  };
}


/* --- src/spatialGrid.js --- */
/**
 * Artificial Life Simulator - Spatial Hash Grid
 * High-performance 2D spatial partitioning system for O(1) local neighbor
 * queries, collision detection, and sensory field perception.
 */

class SpatialGrid {
  /**
   * @param {number} [cellSize=64] Size of each grid cell in pixels
   * @param {number} [worldWidth=4000] Optional boundary width
   * @param {number} [worldHeight=4000] Optional boundary height
   */
  constructor(cellSize = 64, worldWidth = 4000, worldHeight = 4000) {
    this.cellSize = cellSize > 0 ? cellSize : 64;
    this.invCellSize = 1 / this.cellSize;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    /** @type {Map<number, Set<Object>>} */
    this.cells = new Map();

    // Reusable array buffer to avoid GC thrashing in high-frequency queries
    /** @type {Object[]} */
    this._reusableQueryBuffer = [];
  }

  /**
   * Encodes grid cell coordinates (cx, cy) into a compact 30-bit integer key.
   * Offsets by 16384 to safely cover coordinate space from -16000 to +16000 cells.
   * Generates ZERO object or string allocations.
   * @param {number} cx 
   * @param {number} cy 
   * @returns {number}
   */
  getKey(cx, cy) {
    return (((cx + 16384) & 0x7fff) << 15) | ((cy + 16384) & 0x7fff);
  }

  /**
   * Converts world position (x, y) to cell coordinates.
   * @param {number} x 
   * @param {number} y 
   * @returns {{cx: number, cy: number}}
   */
  worldToCell(x, y) {
    return {
      cx: Math.floor(x * this.invCellSize),
      cy: Math.floor(y * this.invCellSize)
    };
  }

  /**
   * Extracts position {x, y} from an entity regardless of whether it uses
   * entity.x/entity.y or entity.position.x/entity.position.y.
   * @param {Object} entity 
   * @returns {{x: number, y: number}}
   */
  getEntityPos(entity) {
    if (entity.position && typeof entity.position.x === 'number') {
      return entity.position;
    }
    return {
      x: entity.x ?? 0,
      y: entity.y ?? 0
    };
  }

  /**
   * Inserts an entity into the grid.
   * Stores reference key on entity for O(1) removal and updates.
   * @param {Object} entity 
   * @returns {SpatialGrid} this
   */
  insert(entity) {
    if (!entity) return this;

    const pos = this.getEntityPos(entity);
    const cx = Math.floor(pos.x * this.invCellSize);
    const cy = Math.floor(pos.y * this.invCellSize);
    const key = this.getKey(cx, cy);

    let cell = this.cells.get(key);
    if (!cell) {
      cell = new Set();
      this.cells.set(key, cell);
    }

    cell.add(entity);
    entity._spatialGridKey = key;
    entity._spatialGrid = this;

    return this;
  }

  /**
   * Updates an entity's cell assignment when it moves.
   * Extremely fast: if entity hasn't crossed a cell boundary, returns immediately.
   * @param {Object} entity 
   * @returns {boolean} True if cell changed
   */
  update(entity) {
    if (!entity) return false;

    const pos = this.getEntityPos(entity);
    const cx = Math.floor(pos.x * this.invCellSize);
    const cy = Math.floor(pos.y * this.invCellSize);
    const newKey = this.getKey(cx, cy);

    const oldKey = entity._spatialGridKey;
    if (oldKey === newKey) {
      return false; // Entity still in same spatial cell, zero work needed
    }

    // Remove from old cell
    if (oldKey !== undefined) {
      const oldCell = this.cells.get(oldKey);
      if (oldCell) {
        oldCell.delete(entity);
        if (oldCell.size === 0) {
          this.cells.delete(oldKey);
        }
      }
    }

    // Insert into new cell
    let newCell = this.cells.get(newKey);
    if (!newCell) {
      newCell = new Set();
      this.cells.set(newKey, newCell);
    }
    newCell.add(entity);
    entity._spatialGridKey = newKey;

    return true;
  }

  /**
   * Removes an entity from the spatial grid in O(1) time.
   * @param {Object} entity 
   * @returns {boolean} True if removed
   */
  remove(entity) {
    if (!entity || entity._spatialGridKey === undefined) return false;

    const key = entity._spatialGridKey;
    const cell = this.cells.get(key);
    let removed = false;

    if (cell) {
      removed = cell.delete(entity);
      if (cell.size === 0) {
        this.cells.delete(key);
      }
    }

    entity._spatialGridKey = undefined;
    entity._spatialGrid = undefined;
    return removed;
  }

  /**
   * Queries all entities within radius r of (x, y).
   * Average O(1) execution time for localized radii.
   * @param {number} x Center x
   * @param {number} y Center y
   * @param {number} radius Perception / search radius
   * @param {Function} [filterFn] Optional predicate (entity) => boolean
   * @param {Object[]} [outResults] Optional target array to write into
   * @returns {Object[]} Matching entities within the radius
   */
  queryRadius(x, y, radius, filterFn = null, outResults = null) {
    const results = outResults || [];
    if (!outResults) results.length = 0;

    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);

    const rSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (const entity of cell) {
          if (filterFn && !filterFn(entity)) {
            continue;
          }

          const pos = this.getEntityPos(entity);
          const dx = pos.x - x;
          const dy = pos.y - y;
          const distSq = dx * dx + dy * dy;

          // Account for entity body radius if defined
          const entRadius = entity.radius || entity.size || 0;
          const effectiveRadiusSq = (radius + entRadius) * (radius + entRadius);

          if (distSq <= effectiveRadiusSq) {
            results.push(entity);
          }
        }
      }
    }

    return results;
  }

  /**
   * Finds the single closest entity to (x, y) within radius r.
   * @param {number} x 
   * @param {number} y 
   * @param {number} radius 
   * @param {Function} [filterFn] 
   * @returns {{entity: Object, distance: number, distSq: number}|null}
   */
  queryNearest(x, y, radius, filterFn = null) {
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);

    let closestEntity = null;
    let closestDistSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getKey(cx, cy);
        const cell = this.cells.get(key);
        if (!cell) continue;

        for (const entity of cell) {
          if (filterFn && !filterFn(entity)) {
            continue;
          }

          const pos = this.getEntityPos(entity);
          const dx = pos.x - x;
          const dy = pos.y - y;
          const dSq = dx * dx + dy * dy;

          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            closestEntity = entity;
          }
        }
      }
    }

    if (!closestEntity) return null;

    return {
      entity: closestEntity,
      distSq: closestDistSq,
      distance: Math.sqrt(closestDistSq)
    };
  }

  /**
   * Completely clears all cells and entity assignments.
   */
  clear() {
    for (const cell of this.cells.values()) {
      for (const entity of cell) {
        entity._spatialGridKey = undefined;
        entity._spatialGrid = undefined;
      }
      cell.clear();
    }
    this.cells.clear();
  }

  /**
   * Bulk rebuilds the spatial hash grid from an array of entities.
   * Useful on initialization or after wholesale state resets.
   * @param {Iterable<Object>} entities 
   */
  bulkRebuild(entities) {
    this.clear();
    for (const entity of entities) {
      this.insert(entity);
    }
  }

  /**
   * Total number of occupied cells.
   * @returns {number}
   */
  get cellCount() {
    return this.cells.size;
  }

  /**
   * Total number of entity instances currently indexed.
   * @returns {number}
   */
  get totalEntities() {
    let count = 0;
    for (const cell of this.cells.values()) {
      count += cell.size;
    }
    return count;
  }
}


/* --- src/food.js --- */
/**
 * Artificial Life Simulator - Food & Nutrient Ecosystem
 * Manages plant food pellets, decaying carnivore meat morsels,
 * algae bloom patch clusters, and seasonal fertility cycles.
 */




let NEXT_FOOD_ID = 1;

class FoodPellet {
  /**
   * @param {number} x 
   * @param {number} y 
   * @param {'plant'|'meat'} [type='plant'] 
   * @param {number} [energy=30] 
   */
  constructor(x, y, type = 'plant', energy = 30) {
    this.id = NEXT_FOOD_ID++;
    this.position = new Vector2D(x, y);
    this.type = type; // 'plant' or 'meat'
    this.energy = energy;
    this.maxEnergy = energy;
    this.age = 0; // seconds

    // Meat rots after 25-35 seconds; plants last indefinitely or slowly turn into humus
    this.rotDuration = type === 'meat' ? randomFloat(22, 32) : 180;
    this.rotTimer = this.rotDuration;
    this.isRotten = false;

    // Radius derived from energy density
    this.radius = this.calculateRadius();

    // Visual pulse phase for attractive rendering
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  /**
   * Computes radius based on current food type and energy.
   * @returns {number}
   */
  calculateRadius() {
    if (this.type === 'plant') {
      return clamp(Math.sqrt(this.energy) * 0.75, 2.5, 6.0);
    } else {
      // Meat pellets are denser
      return clamp(Math.sqrt(this.energy) * 0.85, 3.5, 9.0);
    }
  }

  /**
   * Advances decay timer.
   * @param {number} dt Delta time in seconds
   * @returns {boolean} True if pellet has expired/rotted away
   */
  decay(dt) {
    this.age += dt;
    this.pulsePhase += dt * 2.5;

    if (this.type === 'meat') {
      this.rotTimer -= dt;
      // Meat gradually loses energy and shrinks during its final rotting phase
      if (this.rotTimer <= 0) {
        this.isRotten = true;
        this.energy = 0;
        return true;
      }
      const freshnessRatio = Math.max(0, this.rotTimer / this.rotDuration);
      this.energy = this.maxEnergy * (0.4 + 0.6 * freshnessRatio);
      this.radius = this.calculateRadius();
    }

    return false;
  }

  /**
   * Renders the food pellet to canvas.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    const x = this.position.x;
    const y = this.position.y;
    const r = this.radius;

    ctx.save();

    if (this.type === 'plant') {
      // Pulsing green plant pellet with organic glow
      const pulse = 1.0 + Math.sin(this.pulsePhase) * 0.12;
      const drawR = r * pulse;

      // Soft glow
      ctx.beginPath();
      ctx.arc(x, y, drawR * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
      ctx.fill();

      // Core body
      ctx.beginPath();
      ctx.arc(x, y, drawR, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();

      // Chloroplast center highlight
      ctx.beginPath();
      ctx.arc(x - drawR * 0.3, y - drawR * 0.3, drawR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#86efac';
      ctx.fill();
    } else {
      // Meat pellet: crimson with bone/fat speck, rot fade
      const freshness = clamp(this.rotTimer / this.rotDuration, 0, 1);
      const alpha = 0.4 + 0.6 * freshness;

      // Core meat
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = freshness > 0.3 
        ? `rgba(225, 29, 72, ${alpha})` 
        : `rgba(136, 19, 55, ${alpha})`;
      ctx.fill();

      // Rim
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = `rgba(159, 18, 57, ${alpha})`;
      ctx.stroke();

      // Marbling or bone speck
      ctx.beginPath();
      ctx.arc(x + r * 0.25, y - r * 0.25, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(254, 205, 211, ${alpha * 0.9})`;
      ctx.fill();

      // Carcass decay: Rot ring and orbiting decay flies
      if (freshness < 0.75) {
        const rotAlpha = (1.0 - freshness) * 0.35;
        // Foul decomposition aura
        ctx.beginPath();
        ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(132, 204, 22, ${rotAlpha * 0.35})`;
        ctx.fill();

        // 3 Orbiting decay flies
        const flyCount = freshness < 0.4 ? 3 : 2;
        for (let f = 0; f < flyCount; f++) {
          const orbitAngle = this.pulsePhase * 2.2 + f * (Math.PI * 2 / flyCount);
          const orbitR = r * 1.5 + Math.sin(this.pulsePhase * 3.5 + f) * (r * 0.4);
          const flyX = x + Math.cos(orbitAngle) * orbitR;
          const flyY = y + Math.sin(orbitAngle) * orbitR;

          ctx.beginPath();
          ctx.arc(flyX, flyY, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#0f172a';
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }
}

class FoodManager {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.worldWidth=2400]
   * @param {number} [options.worldHeight=1600]
   * @param {number} [options.maxFood=350]
   * @param {number} [options.growthRate=18] Plants spawned per second
   * @param {number} [options.gridCellSize=64]
   */
  constructor(options = {}) {
    this.worldWidth = options.worldWidth || 2400;
    this.worldHeight = options.worldHeight || 1600;
    this.maxFood = options.maxFood || 350;
    this.growthRate = options.growthRate || 18;

    /** @type {FoodPellet[]} */
    this.foodList = [];

    /** @type {SpatialGrid} */
    this.spatialGrid = new SpatialGrid(
      options.gridCellSize || 64,
      this.worldWidth,
      this.worldHeight
    );

    // Seasonal cycle: 120 seconds for full year (Spring -> Summer -> Autumn -> Winter)
    this.seasonTimer = 0;
    this.seasonCycleDuration = 120; // seconds
    this.seasonName = 'Spring';
    this.seasonalMultiplier = 1.0;

    // Algae bloom patches (clustered food spawning zones)
    this.patches = [];
    this.initPatches(6);

    // Spawning accumulator to handle fractional rates smoothly
    this.spawnAccumulator = 0;

    // Pre-populate with initial bloom
    this.populateInitial(Math.floor(this.maxFood * 0.6));
  }

  /**
   * Initializes drifting algae bloom clusters.
   * @param {number} count 
   */
  initPatches(count = 6) {
    this.patches = [];
    for (let i = 0; i < count; i++) {
      this.patches.push({
        x: randomFloat(100, this.worldWidth - 100),
        y: randomFloat(100, this.worldHeight - 100),
        radius: randomFloat(180, 340),
        vx: randomFloat(-3, 3),
        vy: randomFloat(-3, 3)
      });
    }
  }

  /**
   * Populates initial plant density.
   * @param {number} count 
   */
  populateInitial(count) {
    for (let i = 0; i < count; i++) {
      this.spawnSinglePlant();
    }
  }

  /**
   * Spawns a plant either in an algae bloom cluster (80% probability)
   * or windblown random dispersal (20%).
   * @returns {FoodPellet|null}
   */
  spawnSinglePlant() {
    if (this.foodList.length >= this.maxFood) return null;

    let x, y;
    if (this.patches.length > 0 && Math.random() < 0.82) {
      // Pick random bloom patch
      const patch = this.patches[randomInt(0, this.patches.length - 1)];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.abs(randomGaussian(0, patch.radius * 0.45));
      x = clamp(patch.x + Math.cos(angle) * dist, 20, this.worldWidth - 20);
      y = clamp(patch.y + Math.sin(angle) * dist, 20, this.worldHeight - 20);
    } else {
      // Uniform random dispersal
      x = randomFloat(20, this.worldWidth - 20);
      y = randomFloat(20, this.worldHeight - 20);
    }

    const energy = randomFloat(25, 40);
    const pellet = new FoodPellet(x, y, 'plant', energy);

    this.foodList.push(pellet);
    this.spatialGrid.insert(pellet);
    return pellet;
  }

  /**
   * Directly spawns a plant food pellet at specified coordinate.
   * @param {number} x 
   * @param {number} y 
   * @param {number} [energy=35] 
   * @returns {FoodPellet}
   */
  spawnPlant(x, y, energy = 35) {
    const pellet = new FoodPellet(x, y, 'plant', energy);
    this.foodList.push(pellet);
    this.spatialGrid.insert(pellet);
    return pellet;
  }

  /**
   * Spawns meat pellet(s) when a creature dies.
   * Energy and morsel count scaled with creature size.
   * @param {Vector2D} position 
   * @param {number} energy Remaining creature energy
   * @param {number} size Creature radius
   */
  spawnMeat(position, energy = 60, size = 10) {
    const morselCount = size > 14 ? randomInt(2, 3) : 1;
    const baseEnergy = Math.max(35, energy * 0.75);
    const energyPerPellet = baseEnergy / morselCount;

    for (let i = 0; i < morselCount; i++) {
      const offsetX = morselCount > 1 ? randomFloat(-size * 0.6, size * 0.6) : 0;
      const offsetY = morselCount > 1 ? randomFloat(-size * 0.6, size * 0.6) : 0;
      const x = clamp(position.x + offsetX, 10, this.worldWidth - 10);
      const y = clamp(position.y + offsetY, 10, this.worldHeight - 10);

      const meat = new FoodPellet(x, y, 'meat', energyPerPellet);
      this.foodList.push(meat);
      this.spatialGrid.insert(meat);
    }
  }

  /**
   * Removes a food pellet that has been eaten.
   * @param {FoodPellet} pellet 
   * @returns {number} Energy yield from pellet
   */
  consume(pellet) {
    if (!pellet) return 0;
    const energyYield = pellet.energy;

    this.spatialGrid.remove(pellet);

    // Fast array deletion
    const idx = this.foodList.indexOf(pellet);
    if (idx !== -1) {
      // Swap with back for O(1) delete
      const last = this.foodList.pop();
      if (idx < this.foodList.length) {
        this.foodList[idx] = last;
      }
    }

    return energyYield;
  }

  /**
   * Updates seasons, drifting bloom patches, food decay, and plant regrowth.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    // 1. Advance seasonal cycle
    this.seasonTimer = (this.seasonTimer + dt) % this.seasonCycleDuration;
    const seasonProgress = this.seasonTimer / this.seasonCycleDuration; // 0.0 - 1.0

    if (seasonProgress < 0.25) {
      this.seasonName = 'Spring';
      this.seasonalMultiplier = 1.55; // high algae bloom
    } else if (seasonProgress < 0.5) {
      this.seasonName = 'Summer';
      this.seasonalMultiplier = 1.15; // steady growth
    } else if (seasonProgress < 0.75) {
      this.seasonName = 'Autumn';
      this.seasonalMultiplier = 0.75; // cooling off
    } else {
      this.seasonName = 'Winter';
      this.seasonalMultiplier = 0.35; // famine conditions
    }

    // 2. Drift algae bloom patches
    for (const patch of this.patches) {
      patch.x += patch.vx * dt;
      patch.y += patch.vy * dt;

      // Bounce smoothly off boundaries
      if (patch.x < patch.radius * 0.5) {
        patch.x = patch.radius * 0.5;
        patch.vx *= -1;
      } else if (patch.x > this.worldWidth - patch.radius * 0.5) {
        patch.x = this.worldWidth - patch.radius * 0.5;
        patch.vx *= -1;
      }

      if (patch.y < patch.radius * 0.5) {
        patch.y = patch.radius * 0.5;
        patch.vy *= -1;
      } else if (patch.y > this.worldHeight - patch.radius * 0.5) {
        patch.y = this.worldHeight - patch.radius * 0.5;
        patch.vy *= -1;
      }
    }

    // 3. Decay existing food pellets and prune rotted meat
    for (let i = this.foodList.length - 1; i >= 0; i--) {
      const food = this.foodList[i];
      const expired = food.decay(dt);
      if (expired) {
        this.spatialGrid.remove(food);
        const last = this.foodList.pop();
        if (i < this.foodList.length) {
          this.foodList[i] = last;
        }
      }
    }

    // 4. Regrow plants based on growthRate * seasonalMultiplier
    if (this.foodList.length < this.maxFood) {
      const effectiveRate = this.growthRate * this.seasonalMultiplier;
      this.spawnAccumulator += effectiveRate * dt;

      while (this.spawnAccumulator >= 1.0 && this.foodList.length < this.maxFood) {
        this.spawnSinglePlant();
        this.spawnAccumulator -= 1.0;
      }
    } else {
      this.spawnAccumulator = 0;
    }
  }

  /**
   * Renders visible food pellets with optional viewport frustum culling.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {{minX?: number, minY?: number, maxX?: number, maxY?: number}} [viewport]
   */
  draw(ctx, viewport = null) {
    const hasViewport = viewport && typeof viewport.minX === 'number';

    for (let i = 0; i < this.foodList.length; i++) {
      const food = this.foodList[i];
      if (hasViewport) {
        const x = food.position.x;
        const y = food.position.y;
        const r = food.radius + 6;
        if (
          x + r < viewport.minX ||
          x - r > viewport.maxX ||
          y + r < viewport.minY ||
          y - r > viewport.maxY
        ) {
          continue;
        }
      }
      food.draw(ctx);
    }
  }

  /**
   * Clears all food and empties the spatial grid.
   */
  clear() {
    this.spatialGrid.clear();
    this.foodList.length = 0;
    this.spawnAccumulator = 0;
  }
}


/* --- src/genome.js --- */
/**
 * Artificial Life Simulator - Primer Genetics & Speciation Model
 * Encodes continuous biological genes: speed, perception radius, size/mass,
 * trophic diet, basal metabolism, bravery, and mutation rate.
 */



let NEXT_SPECIES_COUNTER = 1;

const GENE_BOUNDS = {
  speed: { min: 0.8, max: 4.8, default: 2.2 },
  sense: { min: 25.0, max: 220.0, default: 75.0 },
  size: { min: 4.0, max: 22.0, default: 8.5 },
  diet: { min: 0.0, max: 1.0, default: 0.1 }, // 0.0 = pure plant, 1.0 = pure meat
  metabolismRate: { min: 0.65, max: 1.55, default: 1.0 },
  mutationRate: { min: 0.015, max: 0.16, default: 0.06 },
  bravery: { min: 0.0, max: 1.0, default: 0.5 }
};

class Genome {
  /**
   * @param {Object} [traits={}] Initial traits
   */
  constructor(traits = {}) {
    this.speed = clamp(traits.speed ?? GENE_BOUNDS.speed.default, GENE_BOUNDS.speed.min, GENE_BOUNDS.speed.max);
    this.sense = clamp(traits.sense ?? GENE_BOUNDS.sense.default, GENE_BOUNDS.sense.min, GENE_BOUNDS.sense.max);
    this.size = clamp(traits.size ?? GENE_BOUNDS.size.default, GENE_BOUNDS.size.min, GENE_BOUNDS.size.max);
    this.diet = clamp(traits.diet ?? GENE_BOUNDS.diet.default, GENE_BOUNDS.diet.min, GENE_BOUNDS.diet.max);
    this.metabolismRate = clamp(traits.metabolismRate ?? GENE_BOUNDS.metabolismRate.default, GENE_BOUNDS.metabolismRate.min, GENE_BOUNDS.metabolismRate.max);
    this.mutationRate = clamp(traits.mutationRate ?? GENE_BOUNDS.mutationRate.default, GENE_BOUNDS.mutationRate.min, GENE_BOUNDS.mutationRate.max);
    this.bravery = clamp(traits.bravery ?? GENE_BOUNDS.bravery.default, GENE_BOUNDS.bravery.min, GENE_BOUNDS.bravery.max);

    this.generation = traits.generation ?? 1;
    this.speciesId = traits.speciesId ?? `sp_${NEXT_SPECIES_COUNTER++}`;

    // Cache color representation
    this._cachedColor = null;
    this._colorDirty = true;
  }

  /**
   * Retrieves visual phenotypic styling derived from genes.
   * @returns {Object}
   */
  get color() {
    if (this._colorDirty || !this._cachedColor) {
      this._cachedColor = geneticColor(this);
      this._colorDirty = false;
    }
    return this._cachedColor;
  }

  /**
   * Creates a random genome calibrated for an ecological archetype.
   * @param {'herbivore'|'carnivore'|'omnivore'|'random'} [archetype='herbivore'] 
   * @returns {Genome}
   */
  static random(archetype = 'herbivore') {
    let dietVal;
    let speedVal;
    let senseVal;
    let sizeVal;
    let braveryVal;

    switch (archetype) {
      case 'carnivore':
        dietVal = randomFloat(0.72, 1.0);
        speedVal = randomFloat(2.6, 4.2);
        senseVal = randomFloat(90, 180);
        sizeVal = randomFloat(9.0, 16.0);
        braveryVal = randomFloat(0.65, 0.95);
        break;
      case 'omnivore':
        dietVal = randomFloat(0.38, 0.62);
        speedVal = randomFloat(1.8, 3.2);
        senseVal = randomFloat(60, 130);
        sizeVal = randomFloat(7.0, 12.0);
        braveryVal = randomFloat(0.4, 0.7);
        break;
      case 'herbivore':
      default:
        dietVal = randomFloat(0.0, 0.22);
        speedVal = randomFloat(1.4, 3.0);
        senseVal = randomFloat(50, 110);
        sizeVal = randomFloat(6.0, 10.5);
        braveryVal = randomFloat(0.15, 0.45);
        break;
    }

    return new Genome({
      speed: speedVal,
      sense: senseVal,
      size: sizeVal,
      diet: dietVal,
      metabolismRate: randomFloat(0.85, 1.15),
      mutationRate: randomFloat(0.04, 0.08),
      bravery: braveryVal,
      generation: 1
    });
  }

  /**
   * Produces a mutated offspring genome using Gaussian drift.
   * Magnitude of mutation is governed by the genome's mutationRate gene and optional multiplier.
   * @param {number} [multiplier=1.0]
   * @returns {Genome} New mutated Genome instance
   */
  mutate(multiplier = 1.0) {
    const rate = this.mutationRate * Math.max(0, multiplier);

    // Standard deviations scaled to gene dynamic range
    const speedRange = GENE_BOUNDS.speed.max - GENE_BOUNDS.speed.min;
    const senseRange = GENE_BOUNDS.sense.max - GENE_BOUNDS.sense.min;
    const sizeRange = GENE_BOUNDS.size.max - GENE_BOUNDS.size.min;
    const dietRange = GENE_BOUNDS.diet.max - GENE_BOUNDS.diet.min;
    const metaRange = GENE_BOUNDS.metabolismRate.max - GENE_BOUNDS.metabolismRate.min;
    const mutRange = GENE_BOUNDS.mutationRate.max - GENE_BOUNDS.mutationRate.min;

    const newSpeed = clamp(
      randomGaussian(this.speed, speedRange * rate * 0.75),
      GENE_BOUNDS.speed.min,
      GENE_BOUNDS.speed.max
    );

    const newSense = clamp(
      randomGaussian(this.sense, senseRange * rate * 0.75),
      GENE_BOUNDS.sense.min,
      GENE_BOUNDS.sense.max
    );

    const newSize = clamp(
      randomGaussian(this.size, sizeRange * rate * 0.75),
      GENE_BOUNDS.size.min,
      GENE_BOUNDS.size.max
    );

    const newDiet = clamp(
      randomGaussian(this.diet, dietRange * rate * 0.5),
      GENE_BOUNDS.diet.min,
      GENE_BOUNDS.diet.max
    );

    const newMeta = clamp(
      randomGaussian(this.metabolismRate, metaRange * rate * 0.5),
      GENE_BOUNDS.metabolismRate.min,
      GENE_BOUNDS.metabolismRate.max
    );

    const newMutationRate = clamp(
      randomGaussian(this.mutationRate, mutRange * 0.25),
      GENE_BOUNDS.mutationRate.min,
      GENE_BOUNDS.mutationRate.max
    );

    const newBravery = clamp(
      randomGaussian(this.bravery, rate * 0.6),
      GENE_BOUNDS.bravery.min,
      GENE_BOUNDS.bravery.max
    );

    const child = new Genome({
      speed: newSpeed,
      sense: newSense,
      size: newSize,
      diet: newDiet,
      metabolismRate: newMeta,
      mutationRate: newMutationRate,
      bravery: newBravery,
      generation: this.generation + 1,
      speciesId: this.speciesId
    });

    // Check if speciation barrier crossed (> 0.28 genetic distance from parent lineage)
    if (this.geneticDistance(child) > 0.28) {
      child.speciesId = `sp_${NEXT_SPECIES_COUNTER++}`;
    }

    return child;
  }

  /**
   * Sexual recombination / crossover between two parent genomes.
   * @param {Genome} partner 
   * @returns {Genome}
   */
  crossover(partner) {
    const pick = (gene) => {
      // 45% parent A, 45% parent B, 10% blend
      const roll = Math.random();
      if (roll < 0.45) return this[gene];
      if (roll < 0.90) return partner[gene];
      return lerp(this[gene], partner[gene], randomFloat(0.2, 0.8));
    };

    const offspring = new Genome({
      speed: pick('speed'),
      sense: pick('sense'),
      size: pick('size'),
      diet: pick('diet'),
      metabolismRate: pick('metabolismRate'),
      mutationRate: pick('mutationRate'),
      bravery: pick('bravery'),
      generation: Math.max(this.generation, partner.generation) + 1,
      speciesId: this.speciesId
    });

    if (this.geneticDistance(offspring) > 0.28) {
      offspring.speciesId = `sp_${NEXT_SPECIES_COUNTER++}`;
    }

    return offspring;
  }

  /**
   * Calculates normalized weighted genetic distance to another genome.
   * Used for speciation detection, mate selection, and cladogram clustering.
   * Range: ~0.0 (identical) to 1.0 (radically distinct).
   * @param {Genome} other 
   * @returns {number}
   */
  geneticDistance(other) {
    if (!other) return 1.0;

    const dSpeed = (this.speed - other.speed) / (GENE_BOUNDS.speed.max - GENE_BOUNDS.speed.min);
    const dSense = (this.sense - other.sense) / (GENE_BOUNDS.sense.max - GENE_BOUNDS.sense.min);
    const dSize = (this.size - other.size) / (GENE_BOUNDS.size.max - GENE_BOUNDS.size.min);
    const dDiet = this.diet - other.diet;
    const dBravery = this.bravery - other.bravery;
    const dMeta = (this.metabolismRate - other.metabolismRate) / (GENE_BOUNDS.metabolismRate.max - GENE_BOUNDS.metabolismRate.min);

    // Weights: Diet and Size have highest evolutionary weight in morphological divergence
    const wDiet = 0.35;
    const wSize = 0.22;
    const wSpeed = 0.18;
    const wSense = 0.12;
    const wBravery = 0.08;
    const wMeta = 0.05;

    const distSq = 
      wDiet * (dDiet * dDiet) +
      wSize * (dSize * dSize) +
      wSpeed * (dSpeed * dSpeed) +
      wSense * (dSense * dSense) +
      wBravery * (dBravery * dBravery) +
      wMeta * (dMeta * dMeta);

    return Math.sqrt(distSq);
  }

  /**
   * Creates an exact clone of this genome.
   * @returns {Genome}
   */
  clone() {
    return new Genome({
      speed: this.speed,
      sense: this.sense,
      size: this.size,
      diet: this.diet,
      metabolismRate: this.metabolismRate,
      mutationRate: this.mutationRate,
      bravery: this.bravery,
      generation: this.generation,
      speciesId: this.speciesId
    });
  }

  /**
   * Serializes genome to plain JS object.
   * @returns {Object}
   */
  toJSON() {
    return {
      speed: this.speed,
      sense: this.sense,
      size: this.size,
      diet: this.diet,
      metabolismRate: this.metabolismRate,
      mutationRate: this.mutationRate,
      bravery: this.bravery,
      generation: this.generation,
      speciesId: this.speciesId
    };
  }

  /**
   * Deserializes genome from object.
   * @param {Object} data 
   * @returns {Genome}
   */
  static fromJSON(data) {
    return new Genome(data);
  }
}


/* --- src/creature.js --- */
/**
 * Artificial Life Simulator - Organism Physics, Metabolism & Autonomous Steering
 * Faithful implementation of Primer's mass-volume metabolic physics,
 * Reynolds autonomous steering behaviors, and expressive 2D blob morphology.
 */




let NEXT_CREATURE_ID = 1;

class Creature {
  /**
   * @param {number} x 
   * @param {number} y 
   * @param {Genome} [genome] 
   * @param {number} [initialEnergy=100] 
   */
  constructor(x, y, genome = null, initialEnergy = null) {
    this.id = NEXT_CREATURE_ID++;

    // Genetics
    this.genome = genome ? genome.clone() : Genome.random('herbivore');

    // Organism Physics
    this.position = new Vector2D(x, y);
    this.velocity = Vector2D.random(this.genome.speed * 0.5);
    this.acceleration = new Vector2D(0, 0);

    // Dynamic rotation & orientation
    this.heading = this.velocity.heading();
    this.angularVelocity = 0;

    // Mass & dimensions strictly derived from size gene
    this.radius = this.genome.size;
    this.mass = Math.max(1.0, this.genome.size);

    // Morphological squash & stretch + animated swimming tail
    this.squishFactor = 1.0;
    this.tailWiggle = Math.random() * Math.PI * 2;
    this.tailWiggleSpeed = 8.0;
    this.mitosisTimer = 0; // Visual pinch/wobble on birth

    // Reynolds wander angle
    this.wanderAngle = Math.random() * Math.PI * 2;

    // Energy & Life Cycle
    this.maxEnergy = this.genome.size * 26.0;
    this.energy = initialEnergy !== null ? initialEnergy : Math.min(this.maxEnergy * 0.65, 100);
    this.reproductionThreshold = Math.max(140, this.genome.size * 18.0);
    this.birthEnergyTax = 22.0;

    this.age = 0;
    // Lifespan scales positively with size and inversely with metabolic rate (Primer biology)
    this.lifespan = randomFloat(70, 110) * (this.genome.size / 8.5) / this.genome.metabolismRate;
    this.isAlive = true;
    this.causeOfDeath = null; // 'starvation' | 'predation' | 'old_age'

    // Ecological statistics
    this.kills = 0;
    this.plantsEaten = 0;
    this.meatEaten = 0;
    this.offspringCount = 0;
    this.distanceTraveled = 0;

    // Behavioral state
    this.state = 'wandering'; // 'wandering' | 'foraging' | 'hunting' | 'fleeing'
    this.currentTarget = null;
    this.threatTarget = null;
    this.isHighlighted = false;
  }

  /**
   * Calculates Primer-exact metabolic cost per second:
   * Cost = basalCost(size^3 * 0.0015 * metabolismRate)
   *      + moveCost(size * speed^2 * 0.0008)
   *      + senseCost(sense * 0.003)
   *      + huntingMod
   * @param {number} currentSpeed Speed in pixels per frame/second
   * @param {boolean} isHunting Whether actively sprinting or locked in predation
   * @returns {number} Energy burned per second
   */
  calculateMetabolicCost(currentSpeed, isHunting = false, kineticMultiplier = 1.0) {
    const size = this.genome.size;
    const basalCost = Math.pow(size, 3) * 0.0015 * this.genome.metabolismRate;
    const moveCost = size * (currentSpeed * currentSpeed) * 0.014 * kineticMultiplier;
    const senseCost = this.genome.sense * 0.003;
    const huntingMod = isHunting ? (0.28 * size) : 0;

    return basalCost + moveCost + senseCost + huntingMod;
  }

  /**
   * Applies an external force vector: F = ma => a += F / m.
   * @param {Vector2D} force 
   */
  applyForce(force) {
    const f = Vector2D.div(force, this.mass);
    this.acceleration.add(f);
  }

  /**
   * Reynolds Autonomous Steering: Smooth Perlin-style wander.
   * Projects a circle ahead of creature and jitters a target point along its perimeter.
   * @param {number} [strength=0.18] 
   * @returns {Vector2D} Steering force
   */
  wander(strength = 0.22) {
    const circleRadius = 24.0;
    const circleDistance = 45.0;
    const change = 0.35;

    this.wanderAngle += randomFloat(-change, change);

    // Point on wander circle ahead of creature
    const circleCenter = this.velocity.copy().normalize().mult(circleDistance);
    const displacement = Vector2D.fromAngle(this.wanderAngle, circleRadius);
    const wanderForce = circleCenter.add(displacement);

    wanderForce.limit(this.genome.speed * strength);
    return wanderForce;
  }

  /**
   * Reynolds Autonomous Steering: Seek with smooth arrival deceleration.
   * @param {Vector2D} targetPos 
   * @param {number} [slowingRadius=20] 
   * @returns {Vector2D} Steering force
   */
  seek(targetPos, slowingRadius = 20) {
    const desired = Vector2D.sub(targetPos, this.position);
    const d = desired.mag();

    if (d < 1e-5) return new Vector2D(0, 0);

    let targetSpeed = this.genome.speed;
    if (d < slowingRadius) {
      targetSpeed = this.genome.speed * (d / slowingRadius);
    }

    desired.setMag(targetSpeed);
    const steer = Vector2D.sub(desired, this.velocity);
    steer.limit(0.35);
    return steer;
  }

  /**
   * Reynolds Autonomous Steering: Evasive flee from predator / threat.
   * Includes panic sprint acceleration.
   * @param {Vector2D} threatPos 
   * @param {number} [panicRadius=120] 
   * @returns {Vector2D} Steering force
   */
  flee(threatPos, panicRadius = 120) {
    const desired = Vector2D.sub(this.position, threatPos);
    const d = desired.mag();

    if (d > panicRadius || d < 1e-5) return new Vector2D(0, 0);

    // Evasive sprint: panic adds a temporary 15% speed surge
    const sprintSpeed = this.genome.speed * 1.15;
    desired.setMag(sprintSpeed);

    const steer = Vector2D.sub(desired, this.velocity);
    steer.limit(0.55); // More urgent force than standard wander
    return steer;
  }

  /**
   * Reynolds Autonomous Steering: Intercept pursuit / predatory hunt.
   * Predicts prey motion and steers towards projected intercept point.
   * @param {Creature} prey 
   * @returns {Vector2D} Steering force
   */
  hunt(prey) {
    if (!prey || !prey.isAlive) return this.wander();

    const toPrey = Vector2D.sub(prey.position, this.position);
    const d = toPrey.mag();
    const relativeSpeed = Math.max(0.1, this.genome.speed);
    const lookAheadTime = clamp(d / relativeSpeed, 0, 1.5);

    // Intercept position
    const futurePos = Vector2D.add(
      prey.position,
      Vector2D.mult(prey.velocity, lookAheadTime * 12.0)
    );

    const steer = this.seek(futurePos, 15);
    steer.limit(0.48);
    return steer;
  }

  /**
   * Soft repulsion from world edges to keep creatures naturally contained.
   * @param {number} worldWidth 
   * @param {number} worldHeight 
   * @param {number} [margin=60] 
   * @returns {Vector2D}
   */
  avoidBoundaries(worldWidth, worldHeight, margin = 60) {
    const steer = new Vector2D(0, 0);
    const maxSpeed = this.genome.speed;

    if (this.position.x < margin) {
      steer.x = maxSpeed * ((margin - this.position.x) / margin);
    } else if (this.position.x > worldWidth - margin) {
      steer.x = -maxSpeed * ((this.position.x - (worldWidth - margin)) / margin);
    }

    if (this.position.y < margin) {
      steer.y = maxSpeed * ((margin - this.position.y) / margin);
    } else if (this.position.y > worldHeight - margin) {
      steer.y = -maxSpeed * ((this.position.y - (worldHeight - margin)) / margin);
    }

    steer.limit(0.5);
    return steer;
  }

  /**
   * Evaluates sensory perception and steers towards targets or away from predators.
   * @param {Object} env Environment context
   * @param {SpatialGrid} env.foodGrid
   * @param {SpatialGrid} env.creatureGrid
   * @param {number} env.worldWidth
   * @param {number} env.worldHeight
   * @returns {{action: string, target: Object|null}}
   */
  evaluateBehavior(env) {
    const sense = this.genome.sense;
    const diet = this.genome.diet;
    const bravery = this.genome.bravery;

    this.threatTarget = null;
    this.currentTarget = null;

    // 1. Scan for Predatory Threats
    // Other creatures with carnivore/omnivore diet that are larger and genetically different
    if (env.creatureGrid) {
      const candidates = env.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        return c !== this && c.isAlive && c.genome.diet > 0.45 && c.genome.size > this.genome.size * 1.12;
      });

      if (candidates.length > 0) {
        // Find closest threat
        let closest = candidates[0];
        let closestDistSq = this.position.distSq(closest.position);
        for (let i = 1; i < candidates.length; i++) {
          const dSq = this.position.distSq(candidates[i].position);
          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            closest = candidates[i];
          }
        }

        // Bravery check: cowardly creatures flee readily, fearless ones only flee if critically near
        const fearDistance = sense * (1.1 - bravery * 0.45);
        if (Math.sqrt(closestDistSq) <= fearDistance) {
          this.threatTarget = closest;
          this.state = 'fleeing';
          const fleeForce = this.flee(closest.position, fearDistance);
          this.applyForce(fleeForce.mult(1.4));
          return { action: 'flee', target: closest };
        }
      }
    }

    // 2. Scan for Prey (Carnivores and aggressive Omnivores)
    if (diet >= 0.42 && env.creatureGrid) {
      const preyCandidates = env.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        return c !== this && c.isAlive && 
          (this.genome.size > c.genome.size * 1.08) &&
          (c.genome.diet < diet) &&
          (this.genome.geneticDistance(c.genome) > 0.16);
      });

      if (preyCandidates.length > 0) {
        let bestPrey = preyCandidates[0];
        let bestDistSq = this.position.distSq(bestPrey.position);
        for (let i = 1; i < preyCandidates.length; i++) {
          const dSq = this.position.distSq(preyCandidates[i].position);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestPrey = preyCandidates[i];
          }
        }

        this.currentTarget = bestPrey;
        this.state = 'hunting';
        const huntForce = this.hunt(bestPrey);
        this.applyForce(huntForce.mult(1.2));
        return { action: 'hunt', target: bestPrey };
      }
    }

    // 3. Scan for Food Pellets (Plants for herbivores/omnivores, Meat for carnivores/omnivores)
    if (env.foodGrid) {
      const prefersMeat = diet > 0.55;
      const prefersPlants = diet < 0.45;

      const nearestFood = env.foodGrid.queryNearest(this.position.x, this.position.y, sense, (food) => {
        if (food.isRotten) return false;
        if (prefersMeat) return food.type === 'meat';
        if (prefersPlants) return food.type === 'plant';
        return true; // omnivore accepts both
      });

      if (nearestFood) {
        this.currentTarget = nearestFood.entity;
        this.state = 'foraging';
        const seekForce = this.seek(nearestFood.entity.position, 18);
        this.applyForce(seekForce);
        return { action: 'seek_food', target: nearestFood.entity };
      }
    }

    // 4. Default Autonomous Wandering
    this.state = 'wandering';
    const wanderForce = this.wander();
    this.applyForce(wanderForce);

    return { action: 'wander', target: null };
  }

  /**
   * Main simulation step for this organism.
   * @param {number} dt Delta time in seconds
   * @param {Object} env Environment context (foodGrid, creatureGrid, foodManager, bounds)
   * @returns {Creature|null} Child creature if reproduction occurred this frame
   */
  update(dt, env) {
    if (!this.isAlive) return null;

    this.age += dt;

    // Check natural death by old age
    if (this.age >= this.lifespan) {
      this.isAlive = false;
      this.causeOfDeath = 'old_age';
      return null;
    }

    // 1. Evaluate steering AI
    if (env) {
      this.evaluateBehavior(env);
      const boundaryForce = this.avoidBoundaries(env.worldWidth || 2400, env.worldHeight || 1600);
      this.applyForce(boundaryForce);
    }

    // 2. Integrate Physics (Verlet/Euler autonomous movement)
    this.velocity.add(this.acceleration);
    const maxSpd = (this.state === 'fleeing') ? this.genome.speed * 1.15 : this.genome.speed;
    this.velocity.limit(maxSpd);
    this.position.add(Vector2D.mult(this.velocity, dt * 60.0));
    this.acceleration.set(0, 0);

    // Hard boundary clamp safety
    if (env) {
      const w = env.worldWidth || 2400;
      const h = env.worldHeight || 1600;
      this.position.x = clamp(this.position.x, this.radius, w - this.radius);
      this.position.y = clamp(this.position.y, this.radius, h - this.radius);
    }

    // 3. Smooth Heading & Squish Factor
    const currentSpeed = this.velocity.mag();
    this.distanceTraveled += currentSpeed * dt * 60.0;

    if (currentSpeed > 0.05) {
      const targetHeading = this.velocity.heading();
      // Smooth angle interpolation
      let diff = targetHeading - this.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.heading += diff * clamp(dt * 12.0, 0, 1);

      // Organic tail oscillation
      this.tailWiggle += dt * (this.tailWiggleSpeed + currentSpeed * 2.5);

      // Dynamic squish & stretch: faster organisms elongate forward
      const stretch = (currentSpeed / this.genome.speed) * 0.32;
      this.squishFactor = lerp(this.squishFactor, 1.0 + stretch, dt * 8.0);
    } else {
      this.squishFactor = lerp(this.squishFactor, 1.0, dt * 6.0);
    }

    if (this.mitosisTimer > 0) {
      this.mitosisTimer -= dt;
    }

    // 4. Burn Primer Metabolic Energy
    const isHunting = this.state === 'hunting' || this.state === 'fleeing';
    const kineticMultiplier = env?.kineticMultiplier ?? 1.0;
    const burnRate = this.calculateMetabolicCost(currentSpeed, isHunting, kineticMultiplier);
    this.energy -= burnRate * dt;

    if (this.energy <= 0) {
      this.energy = 0;
      this.isAlive = false;
      this.causeOfDeath = 'starvation';
      return null;
    }

    // 5. Intersect & Consume Food Pellets
    if (env && env.foodManager && env.foodGrid) {
      const nearbyFood = env.foodGrid.queryRadius(this.position.x, this.position.y, this.radius + 6);
      for (const pellet of nearbyFood) {
        const dSq = this.position.distSq(pellet.position);
        const contactRadius = this.radius + pellet.radius;

        if (dSq <= contactRadius * contactRadius) {
          // Digest food according to diet adaptation
          let efficiency = 1.0;
          if (pellet.type === 'plant') {
            // Herbivores digest plants at 100%, carnivores at only 15%
            efficiency = clamp(1.15 - this.genome.diet * 1.1, 0.12, 1.0);
            this.plantsEaten++;
          } else {
            // Meat: carnivores digest at 100%, pure herbivores at 15%
            efficiency = clamp(0.15 + this.genome.diet * 0.95, 0.15, 1.0);
            this.meatEaten++;
          }

          const energyGained = env.foodManager.consume(pellet) * efficiency;
          this.energy = Math.min(this.maxEnergy, this.energy + energyGained);
          break; // Eat one pellet per frame
        }
      }
    }

    // 6. Predation: Carnivore Attacks Prey
    if (this.state === 'hunting' && this.currentTarget && this.currentTarget.isAlive) {
      const prey = this.currentTarget;
      const dSq = this.position.distSq(prey.position);
      const attackRange = this.radius + prey.radius * 0.8;

      if (dSq <= attackRange * attackRange) {
        // Successful hunt! Kill prey
        prey.isAlive = false;
        prey.causeOfDeath = 'predation';
        this.kills++;

        // Carnivore consumes meat proportional to prey mass & remaining energy
        const preyYield = Math.min(prey.maxEnergy * 0.75, prey.energy + prey.genome.size * 10);
        this.energy = Math.min(this.maxEnergy, this.energy + preyYield);

        // Drop remaining flesh as meat pellet for scavengers
        if (env && env.foodManager) {
          env.foodManager.spawnMeat(prey.position, preyYield * 0.4, prey.genome.size);
        }
      }
    }

    // 7. Reproduction (Asexual Budding with Genetic Drift)
    // Creature splits when well-fed, passing half its energy minus metabolic birth tax
    if (this.energy >= this.reproductionThreshold && this.age > 4.0) {
      const mutMult = env?.mutationMultiplier ?? 1.0;
      const childGenome = this.genome.mutate(mutMult);

      // Energy split: each retains ~42% of parent energy (16% tax for birth metabolism)
      const childEnergy = (this.energy - this.birthEnergyTax) * 0.48;
      this.energy = (this.energy - this.birthEnergyTax) * 0.48;
      this.offspringCount++;

      // Trigger visual mitosis squeeze/pinch animation
      this.mitosisTimer = 0.45;

      // Spawn child slightly behind parent
      const spawnOffset = Vector2D.fromAngle(this.heading + Math.PI + randomFloat(-0.6, 0.6), this.radius * 2.2);
      const childX = this.position.x + spawnOffset.x;
      const childY = this.position.y + spawnOffset.y;

      const child = new Creature(childX, childY, childGenome, childEnergy);
      child.mitosisTimer = 0.45;
      return child;
    }

    return null;
  }

  /**
   * Renders the creature with expressive blob morphology, animated eyes,
   * jaw markers, tail movement, and sensory aura.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Object} [renderOptions={}]
   * @param {boolean} [renderOptions.isSelected=false]
   * @param {boolean} [renderOptions.showPerception=false]
   */
  draw(ctx, renderOptions = {}) {
    const isSelected = renderOptions.isSelected || this.isHighlighted;
    const showPerception = renderOptions.showPerception || isSelected;

    const x = this.position.x;
    const y = this.position.y;
    const r = this.radius;
    const colorInfo = this.genome.color;

    ctx.save();
    ctx.translate(x, y);

    // 1. Sensory Field Circle
    if (showPerception) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.genome.sense, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = isSelected ? 1.5 : 1.0;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
        ctx.fill();
      }
      ctx.restore();
    }

    // Align rendering with heading orientation
    ctx.rotate(this.heading);

    // 2. Animated Flagella / Swimming Tail
    const tailLength = r * 1.35;
    const tailWiggleOffset = Math.sin(this.tailWiggle) * (r * 0.45);

    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.quadraticCurveTo(-r * 1.4, tailWiggleOffset, -r * 0.8 - tailLength, tailWiggleOffset * 1.5);
    ctx.strokeStyle = colorInfo.strokeCss;
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Blob Body with Squash & Stretch and Mitosis Pinch
    let squishX = this.squishFactor;
    let squishY = 1.0 / Math.sqrt(this.squishFactor);
    if (this.mitosisTimer > 0) {
      const wobble = Math.sin(this.mitosisTimer * 28.0) * (this.mitosisTimer / 0.45) * 0.35;
      squishX *= (1.0 + wobble);
      squishY *= (1.0 - wobble);
    }
    ctx.scale(squishX, squishY);

    // Outer soft glow when selected or highly energetic
    if (isSelected || this.energy > this.maxEnergy * 0.85) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = colorInfo.bodyGlowCss;
      ctx.fill();
    }

    // Main Body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = colorInfo.bodyCss;
    ctx.fill();

    // Membrane Stroke
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.strokeStyle = isSelected ? '#38bdf8' : colorInfo.strokeCss;
    ctx.stroke();

    // Reset squash scale for feature details (eyes, mouth)
    ctx.scale(1.0 / squishX, 1.0 / squishY);

    // 4. Expressive Eyes
    const eyeSpacing = r * 0.48;
    const eyeForward = r * 0.42;
    const eyeRadius = Math.max(2.2, r * 0.28);
    const pupilRadius = eyeRadius * 0.52;

    // Left and Right Eyes
    for (const side of [-1, 1]) {
      const eyeX = eyeForward;
      const eyeY = side * eyeSpacing;

      // Eye sclera
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = colorInfo.eyeWhiteCss;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = colorInfo.strokeCss;
      ctx.stroke();

      // Pupil direction: looking towards heading / prey
      const pupilOffsetX = eyeRadius * 0.32;
      const pupilOffsetY = 0;

      ctx.beginPath();
      ctx.arc(eyeX + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Pupil light gleam
      ctx.beginPath();
      ctx.arc(eyeX + pupilOffsetX - 0.6, eyeY + pupilOffsetY - 0.6, pupilRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // 5. Dietary Mouth Morphologies
    const mouthX = r * 0.82;
    if (this.genome.diet >= 0.62) {
      // Carnivore: Sharp forward-facing fangs / predatory mandibles
      ctx.beginPath();
      ctx.moveTo(mouthX - 1, -r * 0.32);
      ctx.lineTo(mouthX + r * 0.45, -r * 0.15);
      ctx.lineTo(mouthX + 1, 0);
      ctx.lineTo(mouthX + r * 0.45, r * 0.15);
      ctx.lineTo(mouthX - 1, r * 0.32);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    } else if (this.genome.diet <= 0.32) {
      // Herbivore: Cute round snout / soft grazing mouth
      ctx.beginPath();
      ctx.arc(mouthX - 2, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = colorInfo.strokeCss;
      ctx.fill();
    } else {
      // Omnivore: Small versatile beak
      ctx.beginPath();
      ctx.moveTo(mouthX - 2, -r * 0.18);
      ctx.lineTo(mouthX + r * 0.22, 0);
      ctx.lineTo(mouthX - 2, r * 0.18);
      ctx.closePath();
      ctx.fillStyle = '#d97706';
      ctx.fill();
    }

    // 6. Low Energy / Starvation Warning Indicator
    if (this.energy < this.maxEnergy * 0.22) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
    }

    // 7. Selection Ring & Health Bar
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      // Arc Energy Bar
      const energyPct = clamp(this.energy / this.maxEnergy, 0, 1);
      ctx.beginPath();
      ctx.arc(0, 0, r + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * energyPct);
      ctx.strokeStyle = energyPct > 0.4 ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * God-mode: Modify a gene value in real time.
   * @param {string} geneName 
   * @param {number} value 
   */
  modifyGene(geneName, value) {
    if (this.genome[geneName] !== undefined) {
      this.genome[geneName] = value;
      this.genome._colorDirty = true;
      if (geneName === 'size') {
        this.radius = value;
        this.mass = Math.max(1.0, value);
        this.maxEnergy = value * 26.0;
        this.reproductionThreshold = Math.max(140, value * 18.0);
      }
    }
  }

  /**
   * God-mode: Infuses energy.
   * @param {number} [amount=50] 
   */
  feed(amount = 50) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  /**
   * God-mode: Instantly kills creature.
   */
  kill() {
    this.isAlive = false;
    this.causeOfDeath = 'smite';
  }
}


/* --- src/world.js --- */
/**
 * Artificial Life Simulator - World Engine & Ecosystem Coordinator
 * Implements Lotka-Volterra dynamics, continuous phylogenetic speciation,
 * extinction tracking, climate/seasonal temperature oscillations, and disaster events.
 */







let NEXT_DISASTER_ID = 1;

class World {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.width=2800]
   * @param {number} [options.height=1800]
   * @param {number} [options.initialHerbivores=50]
   * @param {number} [options.initialCarnivores=14]
   * @param {number} [options.initialOmnivores=10]
   * @param {number} [options.maxFood=450]
   * @param {number} [options.foodGrowthRate=26]
   */
  constructor(options = {}) {
    this.width = options.width || 2800;
    this.height = options.height || 1800;

    // Spatial partitioning & food ecosystem
    this.creatureGrid = new SpatialGrid(80, this.width, this.height);
    this.foodManager = new FoodManager({
      worldWidth: this.width,
      worldHeight: this.height,
      maxFood: options.maxFood || 450,
      growthRate: options.foodGrowthRate || 26,
      gridCellSize: 64
    });

    /** @type {Creature[]} */
    this.creatures = [];

    // Ecosystem & Climate Dynamics
    this.time = 0; // Simulation time in seconds
    this.temperature = 20.0; // Baseline 20°C
    this.targetTemperature = 20.0;
    this.climateState = 'temperate'; // 'temperate' | 'heatwave' | 'ice_age' | 'golden_age'
    this.climateCycleTimer = 0;
    this.climateCycleDuration = 180; // seconds

    // Temperature-induced metabolic stress factor
    this.temperatureMetabolicMultiplier = 1.0;

    // Speciation & Extinction Registry
    /** @type {Map<string, Object>} */
    this.speciesRegistry = new Map();
    this.speciationThreshold = 0.28;
    this.speciesClusterTimer = 0;

    // Telemetry & Event Logging
    this.eventLog = [];
    this.maxEventLogLength = 40;
    this.telemetryHistory = [];
    this.maxTelemetryPoints = 240; // ~2 minutes at 2 Hz
    this.telemetryTimer = 0;

    // Environment Tweakers (God-Mode Multipliers)
    this.baseGrowthRate = options.foodGrowthRate || 26;
    this.foodGrowthMultiplier = 1.0;
    this.mutationMultiplier = 1.0;
    this.kineticCostMultiplier = 1.0;
    this.temperatureOverride = null;

    // Visual Juice: Floating texts
    /** @type {{x: number, y: number, text: string, color: string, timer: number, duration: number}[]} */
    this.floatingTexts = [];

    // Disaster State (meteors, epidemics, shockwaves)
    this.activeShockwaves = [];
    this.epidemicActive = false;
    this.epidemicTimer = 0;
    this.autoDisastersEnabled = false;
    this.disasterCooldown = randomFloat(75, 130);

    // Event listeners
    this.listeners = {
      extinction: [],
      speciation: [],
      disaster: [],
      eat: [],
      bite: [],
      reproduce: []
    };

    // Initialize initial population
    this.populateInitial(
      options.initialHerbivores ?? 50,
      options.initialCarnivores ?? 14,
      options.initialOmnivores ?? 10
    );
  }

  /**
   * Registers an event callback.
   * @param {'extinction'|'speciation'|'disaster'} eventName 
   * @param {Function} callback 
   */
  on(eventName, callback) {
    if (this.listeners[eventName]) {
      this.listeners[eventName].push(callback);
    }
  }

  /**
   * Dispatches an event to registered callbacks and pushes to eventLog.
   * @param {string} eventName 
   * @param {Object} data 
   */
  emit(eventName, data) {
    const entry = {
      id: NEXT_DISASTER_ID++,
      type: eventName,
      time: this.time,
      formattedTime: this.formatTime(this.time),
      ...data
    };

    this.eventLog.unshift(entry);
    if (this.eventLog.length > this.maxEventLogLength) {
      this.eventLog.pop();
    }

    if (this.listeners[eventName]) {
      for (const cb of this.listeners[eventName]) {
        try {
          cb(entry);
        } catch (err) {
          console.error(`Error in ${eventName} listener:`, err);
        }
      }
    }
  }

  /**
   * Helper to format simulation seconds as MM:SS.
   * @param {number} sec 
   * @returns {string}
   */
  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Pre-populates the world with baseline ecological guilds.
   * @param {number} herbivores 
   * @param {number} carnivores 
   * @param {number} omnivores 
   */
  populateInitial(herbivores, carnivores, omnivores) {
    this.creatures = [];
    this.creatureGrid.clear();
    this.speciesRegistry.clear();

    const addCreature = (archetype) => {
      const x = randomFloat(100, this.width - 100);
      const y = randomFloat(100, this.height - 100);
      const genome = Genome.random(archetype);
      const c = new Creature(x, y, genome);
      this.creatures.push(c);
      this.creatureGrid.insert(c);
      this.registerCreatureSpecies(c, null);
    };

    for (let i = 0; i < herbivores; i++) addCreature('herbivore');
    for (let i = 0; i < carnivores; i++) addCreature('carnivore');
    for (let i = 0; i < omnivores; i++) addCreature('omnivore');

    this.updateSpeciesCounts();
  }

  /**
   * Adds a floating visual combat / event text that rises and fades.
   * @param {number} x 
   * @param {number} y 
   * @param {string} text 
   * @param {string} [color='#fff'] 
   */
  addFloatingText(x, y, text, color = '#fff') {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      timer: 0,
      duration: 1.1
    });
  }

  /**
   * Loads one of the 4 benchmark preset scenarios.
   * @param {'cambrian_explosion'|'apex_predator'|'famine_scarcity'|'hyper_mutation'} presetName 
   */
  loadPreset(presetName) {
    this.creatures = [];
    this.creatureGrid.clear();
    this.foodManager.clear();
    this.speciesRegistry.clear();
    this.floatingTexts = [];
    this.activeShockwaves = [];

    switch (presetName) {
      case 'apex_predator':
        // Hyper-carnivores vs evasive prey
        this.foodGrowthMultiplier = 1.1;
        this.mutationMultiplier = 1.0;
        this.kineticCostMultiplier = 1.1;
        this.temperatureOverride = null;
        this.foodManager.populateInitial(200);

        // 60 Fast, small, timid prey
        for (let i = 0; i < 60; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const g = new Genome({
            speed: randomFloat(3.2, 4.4),
            sense: randomFloat(120, 200),
            size: randomFloat(5.0, 7.5),
            diet: randomFloat(0.0, 0.15),
            bravery: randomFloat(0.05, 0.25)
          });
          const c = new Creature(x, y, g, 85);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }

        // 16 Massive, aggressive apex predators
        for (let i = 0; i < 16; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const g = new Genome({
            speed: randomFloat(3.5, 4.5),
            sense: randomFloat(140, 210),
            size: randomFloat(14.0, 20.0),
            diet: randomFloat(0.85, 1.0),
            bravery: randomFloat(0.85, 1.0)
          });
          const c = new Creature(x, y, g, 180);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }
        break;

      case 'famine_scarcity':
        // Famine & harsh ice age conditions
        this.foodGrowthMultiplier = 0.35;
        this.mutationMultiplier = 0.8;
        this.kineticCostMultiplier = 2.2;
        this.temperatureOverride = 4.0; // Frozen wasteland
        this.temperature = 4.0;
        this.foodManager.populateInitial(70);

        for (let i = 0; i < 35; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const c = new Creature(x, y, Genome.random('herbivore'), 110);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }
        for (let i = 0; i < 6; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const c = new Creature(x, y, Genome.random('carnivore'), 140);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }
        break;

      case 'hyper_mutation':
        // Rapid 3.5x genetic drift & cladogenesis
        this.foodGrowthMultiplier = 1.4;
        this.mutationMultiplier = 3.5;
        this.kineticCostMultiplier = 1.0;
        this.temperatureOverride = null;
        this.foodManager.populateInitial(320);

        for (let i = 0; i < 40; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const c = new Creature(x, y, Genome.random('herbivore'), 100);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }
        for (let i = 0; i < 15; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const c = new Creature(x, y, Genome.random('omnivore'), 100);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }
        break;

      case 'cambrian_explosion':
      default:
        // Balanced baseline
        this.foodGrowthMultiplier = 1.0;
        this.mutationMultiplier = 1.0;
        this.kineticCostMultiplier = 1.0;
        this.temperatureOverride = null;
        this.foodManager.populateInitial(240);
        this.populateInitial(48, 14, 10);
        break;
    }

    this.updateSpeciesCounts();
  }

  /**
   * Registers a creature into the species phylogenetic registry.
   * @param {Creature} creature 
   * @param {string|null} parentSpeciesId 
   */
  registerCreatureSpecies(creature, parentSpeciesId = null) {
    const spId = creature.genome.speciesId;
    let record = this.speciesRegistry.get(spId);

    if (!record) {
      // Divergence event: new phylogenetic branch created!
      record = {
        id: spId,
        parentSpeciesId: parentSpeciesId,
        divergenceTime: this.time,
        divergenceGeneration: creature.genome.generation,
        color: creature.genome.color,
        archetype: creature.genome.diet < 0.35 ? 'herbivore' : (creature.genome.diet > 0.65 ? 'carnivore' : 'omnivore'),
        memberCount: 1,
        peakCount: 1,
        extinct: false,
        extinctionTime: null,
        representativeGenome: creature.genome.clone()
      };
      this.speciesRegistry.set(spId, record);

      if (parentSpeciesId) {
        this.emit('speciation', {
          speciesId: spId,
          parentSpeciesId,
          archetype: record.archetype,
          generation: creature.genome.generation,
          message: `New species [${spId}] diverged from [${parentSpeciesId}] (${record.archetype.toUpperCase()})`
        });
      }
    } else {
      record.memberCount++;
      if (record.memberCount > record.peakCount) {
        record.peakCount = record.memberCount;
      }
      if (record.extinct) {
        // Lazarus taxon resurrection if re-populated
        record.extinct = false;
        record.extinctionTime = null;
      }
    }
  }

  /**
   * Recalculates active population counts for each species and alerts on extinctions.
   */
  updateSpeciesCounts() {
    // Reset all counts
    for (const record of this.speciesRegistry.values()) {
      record.memberCount = 0;
    }

    for (const c of this.creatures) {
      if (!c.isAlive) continue;
      const record = this.speciesRegistry.get(c.genome.speciesId);
      if (record) {
        record.memberCount++;
        if (record.memberCount > record.peakCount) {
          record.peakCount = record.memberCount;
        }
      } else {
        this.registerCreatureSpecies(c, null);
      }
    }

    // Check for extinctions
    for (const record of this.speciesRegistry.values()) {
      if (record.memberCount === 0 && !record.extinct && record.peakCount > 0) {
        record.extinct = true;
        record.extinctionTime = this.time;

        this.emit('extinction', {
          speciesId: record.id,
          archetype: record.archetype,
          peakPopulation: record.peakCount,
          lifespan: Math.round(this.time - record.divergenceTime),
          message: `Species [${record.id}] (${record.archetype.toUpperCase()}) is EXTINCT. Survived for ${Math.round(this.time - record.divergenceTime)}s.`
        });
      }
    }
  }

  /**
   * Calculates current Shannon-Wiener Diversity Index:
   * H' = - sum(p_i * ln(p_i))
   * @returns {{shannonIndex: number, activeSpeciesCount: number, evenness: number}}
   */
  calculateDiversityIndex() {
    const totalPop = this.creatures.length;
    if (totalPop === 0) return { shannonIndex: 0, activeSpeciesCount: 0, evenness: 0 };

    let shannonIndex = 0;
    let activeSpeciesCount = 0;

    for (const record of this.speciesRegistry.values()) {
      if (record.memberCount > 0) {
        activeSpeciesCount++;
        const pi = record.memberCount / totalPop;
        shannonIndex -= pi * Math.log(pi);
      }
    }

    const maxH = activeSpeciesCount > 1 ? Math.log(activeSpeciesCount) : 1;
    const evenness = activeSpeciesCount > 1 ? (shannonIndex / maxH) : 1.0;

    return {
      shannonIndex: Math.max(0, shannonIndex),
      activeSpeciesCount,
      evenness: clamp(evenness, 0, 1)
    };
  }

  /**
   * Steps the macro-climate and temperature cycles.
   * @param {number} dt 
   */
  updateClimate(dt) {
    this.climateCycleTimer = (this.climateCycleTimer + dt) % this.climateCycleDuration;
    const progress = this.climateCycleTimer / this.climateCycleDuration;

    // Macro climate periods:
    // 0.0 - 0.35: Temperate / Stable
    // 0.35 - 0.55: Heatwave (high temp, high metabolic cost)
    // 0.55 - 0.80: Temperate / Golden Age (high fertility)
    // 0.80 - 1.00: Ice Age / Deep Winter (low temp, cold stress, food famine)
    if (progress < 0.35) {
      this.climateState = 'temperate';
      this.targetTemperature = 21.0;
    } else if (progress < 0.55) {
      this.climateState = 'heatwave';
      this.targetTemperature = 35.0;
    } else if (progress < 0.80) {
      this.climateState = 'golden_age';
      this.targetTemperature = 22.0;
    } else {
      this.climateState = 'ice_age';
      this.targetTemperature = 4.0;
    }

    // Smooth temperature adjustment
    this.temperature += (this.targetTemperature - this.temperature) * (dt * 0.1);

    // Temperature stress: extremes above 25°C or below 15°C penalize basal metabolism
    const tempDelta = Math.abs(this.temperature - 20.0);
    this.temperatureMetabolicMultiplier = 1.0 + tempDelta * 0.018;

    // Climate effects on food growth
    if (this.climateState === 'ice_age') {
      this.foodManager.seasonalMultiplier *= 0.45; // severe famine
    } else if (this.climateState === 'golden_age') {
      this.foodManager.seasonalMultiplier *= 1.40; // lush abundance
    }
  }

  /**
   * Triggers a catastrophic meteor impact disaster.
   * @param {number} x Center x
   * @param {number} y Center y
   * @param {number} [radius=260] Impact radius
   * @param {number} [power=180] Kinetic impulse
   */
  triggerMeteor(x = null, y = null, radius = 260, power = 180) {
    const impactX = x !== null ? x : randomFloat(200, this.width - 200);
    const impactY = y !== null ? y : randomFloat(200, this.height - 200);

    // Shockwave animation entity
    this.activeShockwaves.push({
      x: impactX,
      y: impactY,
      currentRadius: 10,
      maxRadius: radius * 1.35,
      alpha: 1.0,
      duration: 1.6,
      timer: 0
    });

    let casualties = 0;

    // Query creatures within impact crater
    const affectedCreatures = this.creatureGrid.queryRadius(impactX, impactY, radius);
    for (const c of affectedCreatures) {
      const d = c.position.dist(new Vector2D(impactX, impactY));
      const damageFactor = 1.0 - (d / radius);

      if (damageFactor > 0.45) {
        // Direct incineration / lethal blast
        c.isAlive = false;
        c.causeOfDeath = 'disaster';
        casualties++;
        // Drop charred meat
        this.foodManager.spawnMeat(c.position, c.genome.size * 5, c.genome.size);
      } else {
        // Blast wave repulsion & partial injury
        c.energy = Math.max(5, c.energy - 40 * damageFactor);
        const impulse = Vector2D.sub(c.position, new Vector2D(impactX, impactY)).normalize().mult(power * damageFactor);
        c.velocity.add(impulse);
      }
    }

    // Incinerate food inside blast center
    const burnedFood = this.foodManager.spatialGrid.queryRadius(impactX, impactY, radius * 0.7);
    for (const f of burnedFood) {
      this.foodManager.consume(f);
    }

    this.emit('disaster', {
      name: 'Meteor Strike',
      x: Math.round(impactX),
      y: Math.round(impactY),
      casualties,
      message: `METEOR STRIKE at (${Math.round(impactX)}, ${Math.round(impactY)})! Casualties: ${casualties}.`
    });
  }

  /**
   * Triggers a contagious epidemic targeting high-density organism clusters.
   * @param {number} [virulence=0.65] Mortality rate
   */
  triggerEpidemic(virulence = 0.65) {
    if (this.creatures.length === 0) return;

    // Find the single highest density creature
    let patientZero = this.creatures[0];
    let maxNeighbors = -1;

    for (const c of this.creatures) {
      const count = this.creatureGrid.queryRadius(c.position.x, c.position.y, 120).length;
      if (count > maxNeighbors) {
        maxNeighbors = count;
        patientZero = c;
      }
    }

    // Spread pathogen across spatial proximity
    const infectedPool = this.creatureGrid.queryRadius(patientZero.position.x, patientZero.position.y, 220);
    let victims = 0;

    for (const c of infectedPool) {
      // Resistance inversely proportional to speed/metabolism
      const roll = Math.random();
      if (roll < virulence) {
        c.energy *= 0.35;
        if (roll < virulence * 0.6) {
          c.isAlive = false;
          c.causeOfDeath = 'epidemic';
          victims++;
          this.foodManager.spawnMeat(c.position, c.genome.size * 6, c.genome.size);
        }
      }
    }

    this.emit('disaster', {
      name: 'Epidemic Outbreak',
      x: Math.round(patientZero.position.x),
      y: Math.round(patientZero.position.y),
      casualties: victims,
      message: `EPIDEMIC OUTBREAK in dense cluster! ${victims} organisms died, ${infectedPool.length} weakened.`
    });
  }

  /**
   * Collects periodic telemetry snapshot for charts and analytics.
   */
  recordTelemetry() {
    let herbivores = 0;
    let carnivores = 0;
    let omnivores = 0;
    let totalBiomass = 0;

    let sumSpeed = 0;
    let sumSense = 0;
    let sumSize = 0;
    let sumDiet = 0;
    const pop = this.creatures.length;

    for (const c of this.creatures) {
      if (!c.isAlive) continue;
      const g = c.genome;
      totalBiomass += g.size * (c.energy / c.maxEnergy);

      sumSpeed += g.speed;
      sumSense += g.sense;
      sumSize += g.size;
      sumDiet += g.diet;

      if (g.diet < 0.35) herbivores++;
      else if (g.diet > 0.65) carnivores++;
      else omnivores++;
    }

    const { shannonIndex, activeSpeciesCount, evenness } = this.calculateDiversityIndex();

    const snapshot = {
      time: this.time,
      totalPop: pop,
      herbivores,
      carnivores,
      omnivores,
      foodCount: this.foodManager.foodList.length,
      totalBiomass: Math.round(totalBiomass),
      avgSpeed: pop > 0 ? (sumSpeed / pop) : 0,
      avgSense: pop > 0 ? (sumSense / pop) : 0,
      avgSize: pop > 0 ? (sumSize / pop) : 0,
      avgDiet: pop > 0 ? (sumDiet / pop) : 0,
      temperature: this.temperature,
      climateState: this.climateState,
      shannonIndex,
      activeSpeciesCount,
      evenness
    };

    this.telemetryHistory.push(snapshot);
    if (this.telemetryHistory.length > this.maxTelemetryPoints) {
      this.telemetryHistory.shift();
    }
  }

  /**
   * Main simulation step for the entire world.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.time += dt;

    // 1. Advance climate & seasons
    this.updateClimate(dt);
    if (this.temperatureOverride !== null) {
      this.temperature = this.temperatureOverride;
    }
    this.foodManager.growthRate = this.baseGrowthRate * this.foodGrowthMultiplier;
    this.foodManager.update(dt);

    // 2. Automated disaster scheduler (optional)
    if (this.autoDisastersEnabled) {
      this.disasterCooldown -= dt;
      if (this.disasterCooldown <= 0) {
        if (Math.random() < 0.6) {
          this.triggerMeteor();
        } else {
          this.triggerEpidemic();
        }
        this.disasterCooldown = randomFloat(90, 160);
      }
    }

    // 3. Step shockwaves and floating texts
    for (let i = this.activeShockwaves.length - 1; i >= 0; i--) {
      const sw = this.activeShockwaves[i];
      sw.timer += dt;
      const progress = sw.timer / sw.duration;
      sw.currentRadius = sw.maxRadius * Math.sin(progress * Math.PI * 0.5);
      sw.alpha = 1.0 - progress;

      if (sw.timer >= sw.duration) {
        this.activeShockwaves.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.timer += dt;
      ft.y -= dt * 28.0;
      if (ft.timer >= ft.duration) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 4. Update Organisms
    const newOffspring = [];
    const env = {
      foodManager: this.foodManager,
      foodGrid: this.foodManager.spatialGrid,
      creatureGrid: this.creatureGrid,
      worldWidth: this.width,
      worldHeight: this.height,
      temperatureMultiplier: this.temperatureMetabolicMultiplier,
      kineticMultiplier: this.kineticCostMultiplier,
      mutationMultiplier: this.mutationMultiplier
    };

    let ateThisFrame = false;
    let bitThisFrame = false;

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];

      // Apply macro-temperature stress to metabolic expenditure
      if (this.temperatureMetabolicMultiplier !== 1.0) {
        c.energy -= (this.temperatureMetabolicMultiplier - 1.0) * dt * 0.8;
      }

      const foodBefore = c.plantsEaten + c.meatEaten;
      const killsBefore = c.kills;

      const child = c.update(dt, env);

      if (c.plantsEaten + c.meatEaten > foodBefore) {
        if (!ateThisFrame && Math.random() < 0.45) {
          this.emit('eat', { pitchMultiplier: c.genome.size > 12 ? 0.8 : 1.2 });
          ateThisFrame = true;
        }
        this.addFloatingText(c.position.x, c.position.y - 12, '+FOOD', '#4ade80');
      }

      if (c.kills > killsBefore) {
        if (!bitThisFrame) {
          this.emit('bite', {});
          bitThisFrame = true;
        }
        this.addFloatingText(c.position.x, c.position.y - 12, 'CRUNCH!', '#ef4444');
      }

      if (child) {
        newOffspring.push(child);
        this.emit('reproduce', {});
        this.addFloatingText(child.position.x, child.position.y - 14, 'SPLIT!', '#38bdf8');
      }

      if (!c.isAlive) {
        this.creatureGrid.remove(c);
        // Spawn decaying carcass if died naturally or of famine
        if (c.causeOfDeath !== 'predation' && c.causeOfDeath !== 'disaster') {
          this.foodManager.spawnMeat(c.position, c.genome.size * 8, c.genome.size);
        }
        this.creatures.splice(i, 1);
      } else {
        this.creatureGrid.update(c);
      }
    }

    // 5. Integrate newborn offspring & speciation checks
    for (const child of newOffspring) {
      this.creatures.push(child);
      this.creatureGrid.insert(child);
      this.registerCreatureSpecies(child, child.genome.speciesId);
    }

    // 6. Natural Lotka-Volterra density stabilization: prevent total ecosystem collapse
    if (this.creatures.length < 12) {
      for (let i = 0; i < 8; i++) {
        const x = randomFloat(100, this.width - 100);
        const y = randomFloat(100, this.height - 100);
        const archetype = Math.random() < 0.7 ? 'herbivore' : 'carnivore';
        const immigrant = new Creature(x, y, Genome.random(archetype), 95);
        this.creatures.push(immigrant);
        this.creatureGrid.insert(immigrant);
        this.registerCreatureSpecies(immigrant, null);
      }
    }

    // 7. Periodic species census (every 0.5 sec)
    this.speciesClusterTimer += dt;
    if (this.speciesClusterTimer >= 0.5) {
      this.updateSpeciesCounts();
      this.speciesClusterTimer = 0;
    }

    // 8. Periodic Telemetry (every 0.5 sec)
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.5) {
      this.recordTelemetry();
      this.telemetryTimer = 0;
    }
  }

  /**
   * Renders background world effects: disaster shockwaves, climate ambient tint.
   * @param {CanvasRenderingContext2D} ctx 
   */
  drawWorldEffects(ctx) {
    // 1. Climate ambient tint overlay
    if (this.climateState === 'heatwave') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (this.climateState === 'ice_age') {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
      ctx.fillRect(0, 0, this.width, this.height);
    } else if (this.climateState === 'golden_age') {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.04)';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Active meteor / blast shockwaves
    for (const sw of this.activeShockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(249, 115, 22, ${sw.alpha})`;
      ctx.lineWidth = 4 * sw.alpha;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.currentRadius * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(239, 68, 68, ${sw.alpha * 0.25})`;
      ctx.fill();
      ctx.restore();
    }

    // 3. Floating combat & energy indicator numbers
    if (this.floatingTexts.length > 0) {
      ctx.save();
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';

      for (const ft of this.floatingTexts) {
        const alpha = Math.max(0, 1.0 - (ft.timer / ft.duration));
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = alpha;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }
  }
}


/* --- src/charts.js --- */
/**
 * Artificial Life Simulator - Evolutionary Analytics & Charts
 * High-performance Primer-grade Canvas charts:
 * 1. Real-time Trait Histograms with Mean (μ) and StdDev (σ) markers
 * 2. Multi-line Population History Time Series
 * 3. Trait Co-Evolution Trajectory
 * 4. Shannon-Wiener Diversity & Phylogenetic Cladogram Breakdown
 */




class ChartManager {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.currentTab = 'histograms'; // 'histograms' | 'population' | 'evolution' | 'diversity'

    // Color palette matching dark futuristic theme
    this.colors = {
      bg: '#0f172a',
      cardBg: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      muted: '#94a3b8',
      herbivore: '#22c55e',
      carnivore: '#ef4444',
      omnivore: '#f59e0b',
      food: '#38bdf8',
      biomass: '#a855f7',
      speed: '#06b6d4',
      sense: '#3b82f6',
      size: '#8b5cf6',
      diet: '#f43f5e'
    };
  }

  /**
   * Main render dispatch for the active chart tab.
   * @param {Object} world World instance containing creatures, telemetryHistory, speciesRegistry
   */
  render(world) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    switch (this.currentTab) {
      case 'histograms':
        this.drawTraitHistograms(ctx, w, h, world.creatures);
        break;
      case 'population':
        this.drawPopulationHistory(ctx, w, h, world.telemetryHistory);
        break;
      case 'evolution':
        this.drawTraitEvolution(ctx, w, h, world.telemetryHistory);
        break;
      case 'diversity':
        this.drawDiversityAndSpecies(ctx, w, h, world);
        break;
    }
  }

  /**
   * 1. Real-time Trait Histograms for Speed, Sense, Size, and Diet.
   */
  drawTraitHistograms(ctx, width, height, creatures) {
    const pad = 12;
    const cols = 2;
    const rows = 2;
    const cellW = (width - pad * 3) / cols;
    const cellH = (height - pad * 3) / rows;

    const traits = [
      { key: 'speed', label: 'Movement Speed', min: GENE_BOUNDS.speed.min, max: GENE_BOUNDS.speed.max, color: this.colors.speed, unit: 'px/s' },
      { key: 'sense', label: 'Perception Radius', min: GENE_BOUNDS.sense.min, max: GENE_BOUNDS.sense.max, color: this.colors.sense, unit: 'px' },
      { key: 'size', label: 'Body Size / Mass', min: GENE_BOUNDS.size.min, max: GENE_BOUNDS.size.max, color: this.colors.size, unit: 'r' },
      { key: 'diet', label: 'Diet (Plant -> Meat)', min: 0.0, max: 1.0, color: this.colors.diet, unit: '' }
    ];

    traits.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + pad);
      const y = pad + row * (cellH + pad);

      this.drawSingleHistogram(ctx, x, y, cellW, cellH, creatures, t);
    });
  }

  /**
   * Helper to draw a single trait histogram card.
   */
  drawSingleHistogram(ctx, x, y, w, h, creatures, traitConfig) {
    // Card background
    ctx.fillStyle = this.colors.cardBg;
    ctx.strokeStyle = this.colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Title & Trait info
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(traitConfig.label, x + 10, y + 16);

    const numBins = 14;
    const bins = new Array(numBins).fill(0);
    const range = traitConfig.max - traitConfig.min;

    let sum = 0;
    const values = [];

    for (const c of creatures) {
      if (!c.isAlive) continue;
      const val = c.genome[traitConfig.key];
      values.push(val);
      sum += val;

      const norm = clamp((val - traitConfig.min) / range, 0, 0.999);
      const binIdx = Math.floor(norm * numBins);
      bins[binIdx]++;
    }

    const n = values.length;
    if (n === 0) return;

    const mean = sum / n;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Header stats badge
    ctx.fillStyle = this.colors.muted;
    ctx.font = '10px monospace';
    const statsStr = `μ: ${mean.toFixed(2)}  σ: ${stdDev.toFixed(2)}`;
    ctx.fillText(statsStr, x + w - ctx.measureText(statsStr).width - 10, y + 16);

    // Chart plotting area
    const plotX = x + 10;
    const plotY = y + 26;
    const plotW = w - 20;
    const plotH = h - 38;

    const maxBin = Math.max(...bins, 1);
    const barW = (plotW / numBins) - 2;

    // Draw bins
    for (let i = 0; i < numBins; i++) {
      const barH = (bins[i] / maxBin) * (plotH - 6);
      const bx = plotX + i * (plotW / numBins);
      const by = plotY + plotH - barH;

      ctx.fillStyle = traitConfig.color;
      ctx.fillRect(bx, by, barW, barH);
    }

    // Mean Marker (Vertical dashed line)
    const meanNorm = clamp((mean - traitConfig.min) / range, 0, 1);
    const meanX = plotX + meanNorm * plotW;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.moveTo(meanX, plotY);
    ctx.lineTo(meanX, plotY + plotH);
    ctx.stroke();

    // Standard deviation bracket
    const leftSdNorm = clamp((mean - stdDev - traitConfig.min) / range, 0, 1);
    const rightSdNorm = clamp((mean + stdDev - traitConfig.min) / range, 0, 1);
    const sdX1 = plotX + leftSdNorm * plotW;
    const sdX2 = plotX + rightSdNorm * plotW;

    ctx.fillStyle = 'rgba(248, 250, 252, 0.08)';
    ctx.fillRect(sdX1, plotY, sdX2 - sdX1, plotH);
    ctx.restore();
  }

  /**
   * 2. Live Multi-line Population History Time Series.
   */
  drawPopulationHistory(ctx, width, height, history) {
    if (!history || history.length < 2) {
      this.drawEmptyMessage(ctx, width, height, 'Collecting population telemetry...');
      return;
    }

    const padLeft = 45;
    const padRight = 15;
    const padTop = 30;
    const padBottom = 25;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Find max value for Y-scaling
    let maxVal = 20;
    for (const pt of history) {
      maxVal = Math.max(maxVal, pt.herbivores, pt.carnivores, pt.foodCount, pt.totalPop);
    }
    maxVal = Math.ceil(maxVal * 1.15);

    // Card background
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    // Legend
    const legends = [
      { label: 'Herbivores', color: this.colors.herbivore },
      { label: 'Carnivores/Omnivores', color: this.colors.carnivore },
      { label: 'Food Pellets', color: this.colors.food },
      { label: 'Total Pop', color: '#f8fafc' }
    ];
    let legendX = padLeft;
    ctx.font = '10px sans-serif';
    for (const leg of legends) {
      ctx.fillStyle = leg.color;
      ctx.fillRect(legendX, 10, 8, 8);
      ctx.fillStyle = this.colors.muted;
      ctx.fillText(leg.label, legendX + 12, 18);
      legendX += ctx.measureText(leg.label).width + 24;
    }

    // Gridlines
    ctx.strokeStyle = '#27354f';
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.muted;
    ctx.font = '9px monospace';

    for (let i = 0; i <= 4; i++) {
      const yVal = Math.round((maxVal / 4) * i);
      const py = padTop + plotH - (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();
      ctx.fillText(yVal.toString(), 8, py + 3);
    }

    // Plot Lines
    const drawLine = (prop, color, lineWidth = 1.8) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      for (let i = 0; i < history.length; i++) {
        const x = padLeft + (i / (history.length - 1)) * plotW;
        const val = history[i][prop] || 0;
        const y = padTop + plotH - (val / maxVal) * plotH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('foodCount', this.colors.food, 1.2);
    drawLine('herbivores', this.colors.herbivore, 2.0);
    drawLine('carnivores', this.colors.carnivore, 2.0);
    drawLine('totalPop', '#f8fafc', 1.0);
  }

  /**
   * 3. Trait Evolution Over Time (Generational shifts in Speed, Sense, Size, Diet).
   */
  drawTraitEvolution(ctx, width, height, history) {
    if (!history || history.length < 2) {
      this.drawEmptyMessage(ctx, width, height, 'Tracking trait co-evolution...');
      return;
    }

    const padLeft = 45;
    const padRight = 15;
    const padTop = 30;
    const padBottom = 25;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    // Legend
    const legends = [
      { label: 'Avg Speed', color: this.colors.speed },
      { label: 'Avg Sense', color: this.colors.sense },
      { label: 'Avg Size', color: this.colors.size },
      { label: 'Avg Diet', color: this.colors.diet }
    ];
    let legendX = padLeft;
    ctx.font = '10px sans-serif';
    for (const leg of legends) {
      ctx.fillStyle = leg.color;
      ctx.fillRect(legendX, 10, 8, 8);
      ctx.fillStyle = this.colors.muted;
      ctx.fillText(leg.label, legendX + 12, 18);
      legendX += ctx.measureText(leg.label).width + 24;
    }

    // Gridlines (0% to 100% normalized range)
    ctx.strokeStyle = '#27354f';
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.muted;
    ctx.font = '9px monospace';

    for (let i = 0; i <= 4; i++) {
      const pct = i * 25;
      const py = padTop + plotH - (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();
      ctx.fillText(`${pct}%`, 10, py + 3);
    }

    // Trait Line drawer (normalizes values to 0.0 - 1.0)
    const drawNormalizedTrait = (prop, min, max, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;

      for (let i = 0; i < history.length; i++) {
        const x = padLeft + (i / (history.length - 1)) * plotW;
        const rawVal = history[i][prop] || min;
        const norm = clamp((rawVal - min) / (max - min), 0, 1);
        const y = padTop + plotH - norm * plotH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawNormalizedTrait('avgSpeed', GENE_BOUNDS.speed.min, GENE_BOUNDS.speed.max, this.colors.speed);
    drawNormalizedTrait('avgSense', GENE_BOUNDS.sense.min, GENE_BOUNDS.sense.max, this.colors.sense);
    drawNormalizedTrait('avgSize', GENE_BOUNDS.size.min, GENE_BOUNDS.size.max, this.colors.size);
    drawNormalizedTrait('avgDiet', 0.0, 1.0, this.colors.diet);
  }

  /**
   * 4. Species Phylogenetic Tree & Shannon-Wiener Diversity Breakdown.
   */
  drawDiversityAndSpecies(ctx, width, height, world) {
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    const { shannonIndex, activeSpeciesCount, evenness } = world.calculateDiversityIndex();

    // Header Metrics
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Species Diversity & Phylogeny', 16, 22);

    ctx.font = '11px monospace';
    ctx.fillStyle = this.colors.food;
    ctx.fillText(`Shannon Diversity H': ${shannonIndex.toFixed(3)}`, 16, 42);
    ctx.fillStyle = this.colors.muted;
    ctx.fillText(`Active Species: ${activeSpeciesCount}  |  Pielou Evenness J': ${evenness.toFixed(2)}`, 16, 58);

    // Active Species Proportion Stacked Bar
    const totalPop = world.creatures.length;
    if (totalPop === 0) return;

    const barX = 16;
    const barY = 72;
    const barW = width - 32;
    const barH = 14;

    ctx.fillStyle = '#334155';
    ctx.fillRect(barX, barY, barW, barH);

    let curX = barX;
    const sortedSpecies = Array.from(world.speciesRegistry.values())
      .filter(s => s.memberCount > 0)
      .sort((a, b) => b.memberCount - a.memberCount);

    for (const sp of sortedSpecies) {
      const segW = (sp.memberCount / totalPop) * barW;
      ctx.fillStyle = sp.color ? sp.color.bodyCss : '#38bdf8';
      ctx.fillRect(curX, barY, segW, barH);
      curX += segW;
    }

    // Species Registry List Table
    const tableY = 104;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = this.colors.muted;
    ctx.fillText('SPECIES', 16, tableY);
    ctx.fillText('GUILD', 90, tableY);
    ctx.fillText('ALIVE', 170, tableY);
    ctx.fillText('PEAK', 220, tableY);
    ctx.fillText('LINEAGE', 270, tableY);

    ctx.strokeStyle = this.colors.border;
    ctx.beginPath();
    ctx.moveTo(16, tableY + 4);
    ctx.lineTo(width - 16, tableY + 4);
    ctx.stroke();

    const maxRows = Math.min(sortedSpecies.length, 6);
    ctx.font = '10px monospace';

    for (let i = 0; i < maxRows; i++) {
      const sp = sortedSpecies[i];
      const rowY = tableY + 20 + i * 18;

      // Color badge dot
      ctx.fillStyle = sp.color ? sp.color.bodyCss : '#fff';
      ctx.beginPath();
      ctx.arc(22, rowY - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.fillText(sp.id, 32, rowY);

      // Guild
      ctx.fillStyle = sp.archetype === 'carnivore' ? this.colors.carnivore : (sp.archetype === 'herbivore' ? this.colors.herbivore : this.colors.omnivore);
      ctx.fillText(sp.archetype.toUpperCase(), 90, rowY);

      ctx.fillStyle = '#fff';
      ctx.fillText(sp.memberCount.toString(), 170, rowY);
      ctx.fillStyle = this.colors.muted;
      ctx.fillText(sp.peakCount.toString(), 220, rowY);

      const parentStr = sp.parentSpeciesId ? `from ${sp.parentSpeciesId}` : 'ancestral';
      ctx.fillText(parentStr, 270, rowY);
    }
  }

  /**
   * Fallback message for empty data.
   */
  drawEmptyMessage(ctx, w, h, msg) {
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.colors.muted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h / 2);
    ctx.textAlign = 'left';
  }
}


/* --- src/audio.js --- */
/**
 * Artificial Life Simulator - Procedural Web Audio Synthesizer
 * Zero external audio assets. Generates real-time procedural sound effects
 * using the Web Audio API (FM synthesis, noise buffers, and ADSR envelopes).
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterVolume = 0.5;
    this.masterGain = null;
    this._initialized = false;
  }

  /**
   * Initializes or resumes the AudioContext on first user gesture.
   */
  init() {
    if (this._initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    if (typeof window === 'undefined') return; // Headless node environment safety

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this._initialized = true;
  }

  /**
   * Sets the master volume (0.0 to 1.0).
   * @param {number} vol 
   */
  setVolume(vol) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Toggles mute on/off.
   * @returns {boolean} New mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const targetGain = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Cheerful bubble/pop when food is consumed.
   * Pitch is slightly modulated by food pellet size or type.
   * @param {number} [pitchMultiplier=1.0] 
   */
  eat(pitchMultiplier = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 420 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.85, t + 0.08);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Crunchy bite / attack sound when a carnivore strikes prey.
   */
  bite() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Ascending cheerful dual-tone chirp when mitosis / birth occurs.
   */
  reproduce() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 triad

    notes.forEach((freq, i) => {
      const noteT = t + i * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteT);

      gain.gain.setValueAtTime(0.18, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteT);
      osc.stop(noteT + 0.12);
    });
  }

  /**
   * Solemn descending minor chord chime when a species goes extinct.
   */
  extinction() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440.0, 370.0, 311.13]; // A4, F#4, D#4 diminished / solemn tension

    notes.forEach((freq, i) => {
      const noteT = t + i * 0.14;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteT);

      gain.gain.setValueAtTime(0.24, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.65);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(noteT);
      osc.stop(noteT + 0.65);
    });
  }

  /**
   * Deep low-frequency noise rumble explosion with sub-bass for meteor impacts.
   */
  meteor() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const duration = 1.4;

    // Sub-bass sine sweep
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + duration);

    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + duration);

    // Filtered noise buffer for blast wave crackle
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + duration);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + duration);
  }
}

// Global singleton instance for easy import
const sound = new SoundSynthesizer();

