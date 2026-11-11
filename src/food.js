/**
 * Artificial Life Simulator - Food & Nutrient Ecosystem
 * Manages plant food pellets, decaying carnivore meat morsels,
 * algae bloom patch clusters, and seasonal fertility cycles.
 */

import { Vector2D, randomFloat, randomInt, randomGaussian, clamp } from './math.js';
import { SpatialGrid } from './spatialGrid.js';

let NEXT_FOOD_ID = 1;

export class FoodPellet {
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
    } else if (this.type === 'berry') {
      return clamp(Math.sqrt(this.energy) * 0.8, 4.0, 7.5);
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
    } else if (this.type === 'berry') {
      // Rare golden energy berry with radiant sparkle
      const pulse = 1.0 + Math.sin(this.pulsePhase * 1.5) * 0.18;
      const drawR = r * pulse;

      ctx.beginPath();
      ctx.arc(x, y, drawR * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, drawR, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x - drawR * 0.3, y - drawR * 0.3, drawR * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
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

export class FoodManager {
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
   * Spawns a high-energy golden berry at specific world coordinates.
   * @param {number} x 
   * @param {number} y 
   * @param {number} [energy=80] 
   * @returns {FoodPellet}
   */
  spawnBerry(x, y, energy = 80) {
    const pellet = new FoodPellet(x, y, 'berry', energy);
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
