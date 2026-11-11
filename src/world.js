/**
 * Artificial Life Simulator - World Engine & Ecosystem Coordinator
 * Implements Lotka-Volterra dynamics, continuous phylogenetic speciation,
 * extinction tracking, climate/seasonal temperature oscillations, and disaster events.
 */

import { Vector2D, randomFloat, randomInt, clamp } from './math.js';
import { SpatialGrid } from './spatialGrid.js';
import { FoodManager } from './food.js';
import { Genome } from './genome.js';
import { Creature } from './creature.js';

let NEXT_DISASTER_ID = 1;

export class World {
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

    // Circadian Day / Night Cycle
    this.dayNightCycleDuration = 70.0; // 70 simulation seconds per full 24h day
    this.timeOfDay = 0.25; // 0.25 = midday noon, 0.75 = midnight
    this.dayCount = 1;
    this.isNight = false;
    this.solarIntensity = 1.0;

    // Chemical Ecology: Pheromone & Scent Trails
    /** @type {{x: number, y: number, type: 'food'|'danger'|'mating', strength: number, timer: number, duration: number}[]} */
    this.pheromones = [];
    this.showPheromones = true;

    // Speciation & Extinction Registry + Fossil Record
    /** @type {Map<string, Object>} */
    this.speciesRegistry = new Map();
    this.fossilRecord = []; // Extinct species museum
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
    this.showDeathMessages = options.showDeathMessages !== undefined ? options.showDeathMessages : true;

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
      death: [],
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
   * Toggles or sets death/extinction message visibility.
   * @param {boolean} [forcedState]
   * @returns {boolean} New state
   */
  setDeathMessages(forcedState) {
    this.showDeathMessages = (forcedState !== undefined) ? !!forcedState : !this.showDeathMessages;
    return this.showDeathMessages;
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

      case 'challenge_speed_trap':
        // Challenge: The Speed Trap (High speed burns too much fuel; must adapt lower speed)
        this.foodGrowthMultiplier = 0.55;
        this.mutationMultiplier = 1.4;
        this.kineticCostMultiplier = 1.8;
        this.temperatureOverride = null;
        this.foodManager.populateInitial(120);
        for (let i = 0; i < 45; i++) {
          const x = randomFloat(100, this.width - 100);
          const y = randomFloat(100, this.height - 100);
          const g = new Genome({
            speed: randomFloat(3.8, 4.6),
            sense: randomFloat(90, 160),
            size: randomFloat(7.0, 10.0),
            diet: randomFloat(0.05, 0.20),
            bravery: 0.3
          });
          const c = new Creature(x, y, g, 95);
          this.creatures.push(c);
          this.creatureGrid.insert(c);
          this.registerCreatureSpecies(c, null);
        }
        break;

      case 'challenge_darwin_finches':
        // Challenge: Allopatric Speciation (Omnivores split between Oasis & Desert)
        this.foodGrowthMultiplier = 1.0;
        this.mutationMultiplier = 1.8;
        this.kineticCostMultiplier = 1.2;
        this.temperatureOverride = null;
        this.foodManager.populateInitial(200);
        for (let i = 0; i < 50; i++) {
          const x = randomFloat(200, this.width - 200);
          const y = randomFloat(200, this.height - 200);
          const g = new Genome({
            speed: 2.2,
            sense: 80,
            size: 8.5,
            diet: 0.48, // perfect omnivore seed
            bravery: 0.5
          });
          const c = new Creature(x, y, g, 100);
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
   * Returns biome characteristics for a given coordinate.
   * @param {number} x 
   * @param {number} y 
   * @returns {{id: string, name: string, color: string, foodMult: number, drag: number, desc: string}}
   */
  getBiomeAt(x, y) {
    const midX = this.width / 2;
    const midY = this.height / 2;
    if (x < midX && y < midY) {
      return { id: 'oasis', name: 'Fertile Oasis', color: 'rgba(34, 197, 94, 0.07)', foodMult: 1.5, drag: 1.0, desc: 'High plant growth, gentle climate' };
    } else if (x >= midX && y < midY) {
      return { id: 'desert', name: 'Arid Desert', color: 'rgba(245, 158, 11, 0.06)', foodMult: 0.35, drag: 1.0, desc: 'Scanty food, high metabolic burn' };
    } else if (x < midX && y >= midY) {
      return { id: 'marsh', name: 'Deep Marsh', color: 'rgba(56, 189, 248, 0.07)', foodMult: 0.9, drag: 0.70, desc: 'Watery swamp, slows movement by 30%' };
    } else {
      return { id: 'volcanic', name: 'Thermal Barrens', color: 'rgba(239, 68, 68, 0.06)', foodMult: 0.6, drag: 1.0, desc: 'Volcanic vents, rare golden berries' };
    }
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

        const fossil = {
          speciesId: record.id,
          archetype: record.archetype,
          color: record.color,
          divergenceTime: record.divergenceTime,
          extinctionTime: this.time,
          lifespan: Math.round(this.time - record.divergenceTime),
          peakPopulation: record.peakCount,
          divergenceGeneration: record.divergenceGeneration,
          parentSpeciesId: record.parentSpeciesId,
          representativeGenome: record.representativeGenome.clone(),
          causeOfDeath: record.primaryCauseOfDeath || 'Extinction'
        };
        this.fossilRecord.unshift(fossil);
        if (this.fossilRecord.length > 50) this.fossilRecord.pop();

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
   * Resurrects an extinct taxon from the fossil record (Lazarus taxon resurrection).
   * @param {string} speciesId 
   * @param {number} [count=3]
   * @returns {boolean} Success
   */
  resurrectFossil(speciesId, count = 3) {
    const fossil = this.fossilRecord.find(f => f.speciesId === speciesId);
    if (!fossil) return false;

    for (let i = 0; i < count; i++) {
      const x = randomFloat(200, this.width - 200);
      const y = randomFloat(200, this.height - 200);
      const g = fossil.representativeGenome.clone();
      g.speciesId = speciesId;
      const c = new Creature(x, y, g, 100);
      this.creatures.push(c);
      this.creatureGrid.insert(c);
      this.registerCreatureSpecies(c, fossil.parentSpeciesId);
    }

    const reg = this.speciesRegistry.get(speciesId);
    if (reg) {
      reg.extinct = false;
      reg.extinctionTime = null;
    }

    this.addFloatingText(this.width / 2, this.height / 2, `✨ LAZARUS TAXON [${speciesId}] RESURRECTED!`, '#38bdf8');
    this.emit('speciation', {
      speciesId,
      archetype: fossil.archetype,
      message: `Lazarus taxon [${speciesId}] resurrected from fossil record!`
    });
    return true;
  }

  /**
   * Emits a chemical scent / pheromone at coordinates.
   * @param {number} x 
   * @param {number} y 
   * @param {'food'|'danger'|'mating'} type 
   * @param {number} [strength=1.0] 
   * @param {number} [duration=5.0] 
   */
  addPheromone(x, y, type, strength = 1.0, duration = 5.0) {
    if (!this.showPheromones) return;
    if (this.pheromones.length > 200) {
      this.pheromones.shift();
    }
    this.pheromones.push({
      x,
      y,
      type,
      strength,
      timer: 0,
      duration
    });
  }

  /**
   * Serializes complete world simulation state to a JSON string.
   * @returns {string}
   */
  exportWorldJSON() {
    const data = {
      version: '2.0',
      time: this.time,
      dayCount: this.dayCount,
      timeOfDay: this.timeOfDay,
      temperature: this.temperature,
      climateState: this.climateState,
      showDeathMessages: this.showDeathMessages,
      foodGrowthMultiplier: this.foodGrowthMultiplier,
      mutationMultiplier: this.mutationMultiplier,
      kineticCostMultiplier: this.kineticCostMultiplier,
      creatures: this.creatures.map(c => ({
        x: c.position.x,
        y: c.position.y,
        energy: c.energy,
        age: c.age,
        genome: c.genome.toJSON()
      })),
      foodCount: this.foodManager.foodList.length
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Restores world simulation state from JSON.
   * @param {string|Object} jsonInput 
   * @returns {boolean} Success
   */
  importWorldJSON(jsonInput) {
    try {
      const data = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
      if (!data || !Array.isArray(data.creatures)) return false;

      this.creatures = [];
      this.creatureGrid.clear();
      this.speciesRegistry.clear();
      this.fossilRecord = [];

      this.time = data.time ?? 0;
      this.dayCount = data.dayCount ?? 1;
      this.timeOfDay = data.timeOfDay ?? 0.25;
      this.temperature = data.temperature ?? 20;
      this.climateState = data.climateState ?? 'temperate';
      if (data.showDeathMessages !== undefined) this.showDeathMessages = data.showDeathMessages;
      if (data.foodGrowthMultiplier !== undefined) this.foodGrowthMultiplier = data.foodGrowthMultiplier;
      if (data.mutationMultiplier !== undefined) this.mutationMultiplier = data.mutationMultiplier;
      if (data.kineticCostMultiplier !== undefined) this.kineticCostMultiplier = data.kineticCostMultiplier;

      this.foodManager.clear();
      this.foodManager.populateInitial(data.foodCount || 240);

      for (const item of data.creatures) {
        const genome = Genome.fromJSON(item.genome);
        const c = new Creature(item.x, item.y, genome, item.energy);
        c.age = item.age ?? 0;
        this.creatures.push(c);
        this.creatureGrid.insert(c);
        this.registerCreatureSpecies(c, null);
      }

      this.updateSpeciesCounts();
      return true;
    } catch (e) {
      console.error('Failed to import world state:', e);
      return false;
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
        if (typeof c.die === 'function') {
          c.die('disaster');
        } else {
          c.isAlive = false;
          c.causeOfDeath = 'disaster';
        }
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
          if (typeof c.die === 'function') {
            c.die('epidemic');
          } else {
            c.isAlive = false;
            c.causeOfDeath = 'epidemic';
          }
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

    // 0. Circadian Solar Day / Night Cycle
    const oldTimeOfDay = this.timeOfDay;
    this.timeOfDay = (this.timeOfDay + dt / this.dayNightCycleDuration) % 1.0;
    if (this.timeOfDay < oldTimeOfDay) {
      this.dayCount++;
    }
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    this.solarIntensity = clamp((Math.cos(sunAngle) + 0.6) / 1.6, 0.0, 1.0);
    this.isNight = this.solarIntensity < 0.35;

    // 1. Advance climate & seasons (Photosynthesis affected by sunlight)
    this.updateClimate(dt);
    if (this.temperatureOverride !== null) {
      this.temperature = this.temperatureOverride;
    }
    const daylightGrowth = this.isNight ? 0.35 : (0.7 + this.solarIntensity * 0.5);
    this.foodManager.growthRate = this.baseGrowthRate * this.foodGrowthMultiplier * daylightGrowth;
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

    // 3. Step shockwaves, floating texts, and pheromone scents
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

    for (let i = this.pheromones.length - 1; i >= 0; i--) {
      const p = this.pheromones[i];
      p.timer += dt;
      p.strength = Math.max(0, 1.0 - (p.timer / p.duration));
      if (p.timer >= p.duration) {
        this.pheromones.splice(i, 1);
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
      mutationMultiplier: this.mutationMultiplier,
      isNight: this.isNight,
      solarIntensity: this.solarIntensity,
      getBiomeAt: (x, y) => this.getBiomeAt(x, y),
      addPheromone: (x, y, t, s, d) => this.addPheromone(x, y, t, s, d),
      addFloatingText: (x, y, txt, col) => this.addFloatingText(x, y, txt, col)
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
        if (typeof c.onDeath === 'function') {
          c.onDeath();
        }
        this.creatureGrid.remove(c);
        // Spawn decaying carcass if died naturally or of famine
        if (c.causeOfDeath !== 'predation' && c.causeOfDeath !== 'disaster') {
          this.foodManager.spawnMeat(c.position, c.genome.size * 8, c.genome.size);
          // Soil fertilization: fertile corpse soil occasionally yields rare golden energy berries
          if (Math.random() < 0.22 && this.foodManager.spawnBerry) {
            this.foodManager.spawnBerry(c.position.x + randomFloat(-15, 15), c.position.y + randomFloat(-15, 15), 75);
          }
        }
        if (this.showDeathMessages) {
          const deathLabel = c.causeOfDeath === 'starvation' ? 'STARVED' :
                             c.causeOfDeath === 'predation' ? 'PREYED' :
                             c.causeOfDeath === 'old_age' ? 'OLD AGE' :
                             c.causeOfDeath === 'smite' ? 'SMOTE' : 'DIED';
          this.addFloatingText(c.position.x, c.position.y - 12, `💀 ${deathLabel}`, '#94a3b8');
        }
        this.emit('death', {
          creature: c,
          cause: c.causeOfDeath,
          x: c.position.x,
          y: c.position.y,
          speciesId: c.genome.speciesId
        });
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
