/**
 * Artificial Life Simulator - Species Arena Battle Royale Tournament Mode
 * Pits 4 distinct genetic clades against each other inside a shrinking
 * high-radiation storm ring until a single champion clade survives.
 */

import { clamp, randomFloat } from './math.js';
import { Genome } from './genome.js';
import { Creature } from './creature.js';
import { FoodPellet } from './food.js';

export class ArenaTournament {
  /**
   * @param {import('./world.js').World} world
   * @param {Object} [options={}]
   */
  constructor(world, options = {}) {
    this.world = world;
    this.centerX = options.centerX ?? (world ? world.width / 2 : 1400);
    this.centerY = options.centerY ?? (world ? world.height / 2 : 900);
    this.initialRadius = options.initialRadius ?? 1200;
    this.minRadius = options.minRadius ?? 80;
    this.duration = options.duration ?? 90; // seconds
    this.radiationDamagePerSec = options.radiationDamagePerSec ?? 25;
    this.organismsPerClade = options.organismsPerClade ?? 10;

    this.stormRadius = this.initialRadius;
    this.elapsedTime = 0;
    this.isActive = false;
    this.isComplete = false;
    this.competingClades = [];
    this.winner = null;
    this.worldSnapshot = null;
  }

  /**
   * Saves the current sandbox world state so exiting Arena restores the exact prior state.
   */
  snapshotWorld() {
    if (!this.world) return;

    const speciesClone = new Map();
    if (this.world.speciesRegistry) {
      for (const [id, record] of this.world.speciesRegistry.entries()) {
        speciesClone.set(id, {
          ...record,
          representativeGenome: record.representativeGenome ? record.representativeGenome.clone() : null
        });
      }
    }

    const foodClone = this.world.foodManager
      ? this.world.foodManager.foodList.map(f => ({
          x: f.position.x,
          y: f.position.y,
          type: f.type,
          energy: f.energy,
          maxEnergy: f.maxEnergy,
          age: f.age,
          rotDuration: f.rotDuration,
          rotTimer: f.rotTimer
        }))
      : [];

    this.worldSnapshot = {
      creatures: [...this.world.creatures],
      colonies: [...(this.world.colonies || [])],
      food: foodClone,
      time: this.world.time,
      dayCount: this.world.dayCount,
      timeOfDay: this.world.timeOfDay,
      temperature: this.world.temperature,
      targetTemperature: this.world.targetTemperature,
      climateState: this.world.climateState,
      climateCycleTimer: this.world.climateCycleTimer,
      foodGrowthMultiplier: this.world.foodGrowthMultiplier,
      mutationMultiplier: this.world.mutationMultiplier,
      kineticCostMultiplier: this.world.kineticCostMultiplier,
      temperatureOverride: this.world.temperatureOverride,
      showDeathMessages: this.world.showDeathMessages,
      speciesRegistry: speciesClone,
      fossilRecord: [...(this.world.fossilRecord || [])]
    };
  }

  /**
   * Restores the saved sandbox snapshot back to `this.world`.
   */
  restoreWorld() {
    if (!this.world) return;

    if (this.worldSnapshot) {
      const snap = this.worldSnapshot;
      this.world.creatures = [...snap.creatures];
      this.world.colonies = [...snap.colonies];
      this.world.time = snap.time;
      this.world.dayCount = snap.dayCount;
      this.world.timeOfDay = snap.timeOfDay;
      this.world.temperature = snap.temperature;
      this.world.targetTemperature = snap.targetTemperature;
      this.world.climateState = snap.climateState;
      this.world.climateCycleTimer = snap.climateCycleTimer;
      this.world.foodGrowthMultiplier = snap.foodGrowthMultiplier;
      this.world.mutationMultiplier = snap.mutationMultiplier;
      this.world.kineticCostMultiplier = snap.kineticCostMultiplier;
      this.world.temperatureOverride = snap.temperatureOverride;
      this.world.showDeathMessages = snap.showDeathMessages;
      this.world.speciesRegistry = snap.speciesRegistry;
      this.world.fossilRecord = [...snap.fossilRecord];

      if (this.world.creatureGrid) {
        this.world.creatureGrid.clear();
        for (const c of this.world.creatures) {
          if (c.isAlive) {
            this.world.creatureGrid.insert(c);
          }
        }
      }

      if (this.world.foodManager) {
        this.world.foodManager.clear();
        for (const item of snap.food) {
          const pellet = new FoodPellet(item.x, item.y, item.type, item.energy);
          pellet.maxEnergy = item.maxEnergy;
          pellet.age = item.age;
          pellet.rotDuration = item.rotDuration;
          pellet.rotTimer = item.rotTimer;
          this.world.foodManager.foodList.push(pellet);
          this.world.foodManager.spatialGrid.insert(pellet);
        }
      }

      this.worldSnapshot = null;
    }

    this.isActive = false;
    this.isComplete = false;
    this.winner = null;
  }

  /**
   * Builds default neural warrior clade templates to fill up to 4 competing clades.
   * @returns {Array<{speciesId: string, name: string, genome: Genome}>}
   */
  _createDefaultWarriorClades() {
    return [
      {
        speciesId: 'clade_crimson_fang',
        name: 'Crimson Fang (Apex)',
        genome: new Genome({
          speciesId: 'clade_crimson_fang',
          speed: 3.8,
          sense: 165,
          size: 13.5,
          diet: 0.92,
          bravery: 0.92,
          armor: 0.45,
          brainType: 'neural'
        })
      },
      {
        speciesId: 'clade_obsidian_titan',
        name: 'Obsidian Juggernaut',
        genome: new Genome({
          speciesId: 'clade_obsidian_titan',
          speed: 2.7,
          sense: 135,
          size: 17.5,
          diet: 0.78,
          bravery: 0.88,
          armor: 0.85,
          brainType: 'neural'
        })
      },
      {
        speciesId: 'clade_emerald_viper',
        name: 'Emerald Viper (Skirmisher)',
        genome: new Genome({
          speciesId: 'clade_emerald_viper',
          speed: 4.4,
          sense: 185,
          size: 9.0,
          diet: 0.55,
          bravery: 0.72,
          armor: 0.25,
          camouflage: 0.85,
          brainType: 'neural'
        })
      },
      {
        speciesId: 'clade_cobalt_swarm',
        name: 'Cobalt Phalanx (Grazers)',
        genome: new Genome({
          speciesId: 'clade_cobalt_swarm',
          speed: 3.6,
          sense: 160,
          size: 10.5,
          diet: 0.22,
          bravery: 0.65,
          armor: 0.65,
          flocking: 0.9,
          brainType: 'neural'
        })
      }
    ];
  }

  /**
   * Starts the Arena Battle Royale tournament.
   * @param {Array<Object>} [cladeSpecs=[]] Optional custom clade specifications
   */
  start(cladeSpecs = []) {
    if (!this.world) return;

    if (!this.isActive) {
      this.snapshotWorld();
    }

    this.centerX = this.world.width / 2;
    this.centerY = this.world.height / 2;

    const selectedSpecs = [];

    // 1. Use passed cladeSpecs if provided
    if (Array.isArray(cladeSpecs) && cladeSpecs.length > 0) {
      for (let i = 0; i < cladeSpecs.length; i++) {
        const spec = cladeSpecs[i];
        const baseGenome = spec.genome instanceof Genome
          ? spec.genome.clone()
          : new Genome(spec.genome || spec);
        const spId = spec.speciesId || baseGenome.speciesId || `arena_clade_${i + 1}`;
        baseGenome.speciesId = spId;
        selectedSpecs.push({
          speciesId: spId,
          name: spec.name || spId,
          genome: baseGenome,
          count: spec.count ?? this.organismsPerClade
        });
      }
    } else {
      // 2. Otherwise pick top living species from current world
      const speciesCounts = new Map();
      for (const c of this.world.creatures) {
        if (!c.isAlive) continue;
        const spId = c.genome.speciesId;
        const entry = speciesCounts.get(spId) || { count: 0, genome: c.genome };
        entry.count++;
        speciesCounts.set(spId, entry);
      }

      const sortedSpecies = Array.from(speciesCounts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 4);

      for (const [spId, info] of sortedSpecies) {
        const g = info.genome.clone();
        g.speciesId = spId;
        selectedSpecs.push({
          speciesId: spId,
          name: `Species ${spId}`,
          genome: g,
          count: this.organismsPerClade
        });
      }

      // Fill up to 4 with distinct neural warrior clades if fewer than 4 exist
      const defaults = this._createDefaultWarriorClades();
      let defIdx = 0;
      while (selectedSpecs.length < 4 && defIdx < defaults.length) {
        const candidate = defaults[defIdx++];
        if (!selectedSpecs.some(s => s.speciesId === candidate.speciesId)) {
          selectedSpecs.push({
            ...candidate,
            count: this.organismsPerClade
          });
        }
      }
    }

    // Clear arena world
    this.world.creatures = [];
    this.world.colonies = [];
    if (this.world.creatureGrid) this.world.creatureGrid.clear();
    if (this.world.speciesRegistry) this.world.speciesRegistry.clear();
    if (this.world.foodManager) {
      this.world.foodManager.clear();
      // Spawn central arena food pellets & golden berries
      for (let i = 0; i < 140; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.sqrt(Math.random()) * (this.initialRadius * 0.72);
        const fx = clamp(this.centerX + Math.cos(angle) * dist, 40, this.world.width - 40);
        const fy = clamp(this.centerY + Math.sin(angle) * dist, 40, this.world.height - 40);
        if (i % 7 === 0) {
          this.world.foodManager.spawnBerry(fx, fy, 80);
        } else {
          this.world.foodManager.spawnPlant(fx, fy, 40);
        }
      }
    }

    this.competingClades = [];
    const numClades = selectedSpecs.length;
    const spawnRingRadius = this.initialRadius * 0.55;

    for (let i = 0; i < numClades; i++) {
      const spec = selectedSpecs[i];
      const sectorAngle = (i / Math.max(1, numClades)) * Math.PI * 2;
      const sectorCenterX = this.centerX + Math.cos(sectorAngle) * spawnRingRadius;
      const sectorCenterY = this.centerY + Math.sin(sectorAngle) * spawnRingRadius;
      const orgCount = spec.count ?? this.organismsPerClade;

      for (let j = 0; j < orgCount; j++) {
        const subAngle = (j / Math.max(1, orgCount)) * Math.PI * 2;
        const jitterR = orgCount > 1 ? randomFloat(18, 65) : 0;
        const cx = clamp(sectorCenterX + Math.cos(subAngle) * jitterR, 40, this.world.width - 40);
        const cy = clamp(sectorCenterY + Math.sin(subAngle) * jitterR, 40, this.world.height - 40);

        const g = spec.genome.clone();
        g.speciesId = spec.speciesId;
        const c = new Creature(cx, cy, g, 140);
        // Orient inward toward arena center
        c.heading = Math.atan2(this.centerY - cy, this.centerX - cx);
        this.world.creatures.push(c);
        if (this.world.creatureGrid) this.world.creatureGrid.insert(c);
        if (typeof this.world.registerCreatureSpecies === 'function') {
          this.world.registerCreatureSpecies(c, null);
        }
      }

      this.competingClades.push({
        speciesId: spec.speciesId,
        name: spec.name || spec.speciesId,
        color: spec.genome.color ? spec.genome.color.bodyCss : '#38bdf8',
        initialCount: orgCount,
        aliveCount: orgCount,
        kills: 0,
        totalEnergy: orgCount * 140
      });
    }

    this.stormRadius = this.initialRadius;
    this.elapsedTime = 0;
    this.isActive = true;
    this.isComplete = false;
    this.winner = null;
  }

  /**
   * Stops the Arena tournament and restores the sandbox world state.
   */
  stop() {
    this.restoreWorld();
  }

  /**
   * Updates the shrinking radiation storm ring, applies out-of-bounds damage,
   * refreshes the clade survival leaderboard, and checks victory conditions.
   * @param {number} dt Delta time in seconds
   * @returns {{isComplete: boolean, winner: Object|null, stormRadius: number, leaderboard: Array<Object>}}
   */
  update(dt) {
    if (!this.isActive || !this.world) {
      return {
        isComplete: this.isComplete,
        winner: this.winner,
        stormRadius: this.stormRadius,
        leaderboard: this.competingClades
      };
    }

    if (!this.isComplete) {
      this.elapsedTime += dt;
      const progress = clamp(this.elapsedTime / this.duration, 0, 1);
      this.stormRadius = this.initialRadius - (this.initialRadius - this.minRadius) * progress;

      // Apply out-of-bounds radiation damage
      for (const c of this.world.creatures) {
        if (!c.isAlive) continue;
        const dx = c.position.x - this.centerX;
        const dy = c.position.y - this.centerY;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d > this.stormRadius) {
          c.energy -= this.radiationDamagePerSec * dt;
          if (c.energy <= 0) {
            if (typeof c.die === 'function') {
              c.die('disaster');
            } else {
              c.isAlive = false;
              c.causeOfDeath = 'disaster';
            }
          }
        }
      }

      // Refresh competing clade statistics
      const cladeMap = new Map();
      for (const clade of this.competingClades) {
        clade.aliveCount = 0;
        clade.kills = 0;
        clade.totalEnergy = 0;
        cladeMap.set(clade.speciesId, clade);
      }

      for (const c of this.world.creatures) {
        let clade = cladeMap.get(c.genome.speciesId);
        if (!clade && this.competingClades.length > 0) {
          // Offspring that speciated during arena battle belong to their closest competing clade
          let bestClade = this.competingClades[0];
          clade = bestClade;
        }
        if (clade) {
          clade.kills += c.kills || 0;
          if (c.isAlive) {
            clade.aliveCount++;
            clade.totalEnergy += c.energy;
          }
        }
      }

      // Sort leaderboard by aliveCount desc, then totalEnergy desc, then kills desc
      this.competingClades.sort((a, b) => {
        if (b.aliveCount !== a.aliveCount) return b.aliveCount - a.aliveCount;
        if (b.totalEnergy !== a.totalEnergy) return b.totalEnergy - a.totalEnergy;
        return b.kills - a.kills;
      });

      // Check victory condition
      const survivingClades = this.competingClades.filter(cl => cl.aliveCount > 0);
      if (survivingClades.length <= 1 && this.competingClades.length > 1) {
        this.isComplete = true;
        this.winner = survivingClades[0] || this.competingClades[0] || null;
      }
    }

    return {
      isComplete: this.isComplete,
      winner: this.winner,
      stormRadius: this.stormRadius,
      leaderboard: this.competingClades
    };
  }

  /**
   * Renders the glowing radiation storm ring and hazard zone onto the world canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    if (!this.isActive || !ctx) return;

    ctx.save();

    // Outer radiation hazard ring stroke (thick semi-transparent hazard aura)
    const hazardBandWidth = 360;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.stormRadius + hazardBandWidth / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.14)';
    ctx.lineWidth = hazardBandWidth;
    ctx.stroke();

    // Secondary violet radiation ring
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.stormRadius + 14, 0, Math.PI * 2);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([14, 10]);
    }
    ctx.stroke();

    // Primary pulsing crimson storm wall
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.stormRadius, 0, Math.PI * 2);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 4.5;
    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    ctx.stroke();

    ctx.restore();
  }
}
