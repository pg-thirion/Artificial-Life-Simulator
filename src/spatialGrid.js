/**
 * Artificial Life Simulator - Spatial Hash Grid
 * High-performance 2D spatial partitioning system for O(1) local neighbor
 * queries, collision detection, and sensory field perception.
 */

export class SpatialGrid {
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
