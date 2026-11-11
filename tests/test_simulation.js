/**
 * Artificial Life Simulator - Unit & Integration Test Suite
 * Validates Vector2D physics, Spatial Partitioning, Primer Metabolic Physics,
 * Genetics & Speciation, and Autonomous Reynolds Steering.
 */

import { Vector2D, randomGaussian, clamp, mapRange, geneticColor } from '../src/math.js';
import { SpatialGrid } from '../src/spatialGrid.js';
import { FoodPellet, FoodManager } from '../src/food.js';
import { Genome, GENE_BOUNDS } from '../src/genome.js';
import { Creature } from '../src/creature.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

function assertApprox(actual, expected, tolerance = 1e-4, message = '') {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${message} - Expected ~${expected}, got ${actual} (diff: ${diff})`);
  }
}

console.log('--- Testing Piece 1: Math & Vector Utilities ---');

// Vector operations
const v1 = new Vector2D(3, 4);
assertApprox(v1.mag(), 5.0, 1e-4, 'Vector2D mag calculation');
assertApprox(v1.magSq(), 25.0, 1e-4, 'Vector2D magSq');

const vNorm = v1.copy().normalize();
assertApprox(vNorm.mag(), 1.0, 1e-4, 'Vector2D normalize unit length');
assertApprox(vNorm.x, 0.6, 1e-4, 'Vector2D norm x');
assertApprox(vNorm.y, 0.8, 1e-4, 'Vector2D norm y');

const vZero = new Vector2D(0, 0).normalize();
assert(vZero.x === 0 && vZero.y === 0, 'Vector2D zero div safety');

const v2 = new Vector2D(1, 1);
const vAdd = Vector2D.add(v1, v2);
assert(vAdd.x === 4 && vAdd.y === 5, 'Static Vector2D.add');

const vDist = Vector2D.dist(new Vector2D(0, 0), new Vector2D(6, 8));
assertApprox(vDist, 10.0, 1e-4, 'Vector2D.dist');

// Math helpers
assert(clamp(-5, 0, 10) === 0, 'clamp min');
assert(clamp(15, 0, 10) === 10, 'clamp max');
assert(clamp(5, 0, 10) === 5, 'clamp within range');
assertApprox(mapRange(5, 0, 10, 0, 100), 50, 1e-4, 'mapRange');

// Box-Muller Gaussian distribution test
const samples = [];
for (let i = 0; i < 5000; i++) {
  samples.push(randomGaussian(100, 15));
}
const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
const variance = samples.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / samples.length;
const stdDev = Math.sqrt(variance);
assertApprox(mean, 100, 2.0, `Gaussian mean near 100 (got ${mean.toFixed(2)})`);
assertApprox(stdDev, 15, 2.0, `Gaussian stdDev near 15 (got ${stdDev.toFixed(2)})`);

console.log('--- Testing Piece 1: Spatial Hash Grid ---');

const grid = new SpatialGrid(64, 2000, 2000);
const ent1 = { id: 1, x: 100, y: 100, radius: 5 };
const ent2 = { id: 2, x: 110, y: 100, radius: 5 };
const ent3 = { id: 3, x: 500, y: 500, radius: 5 };

grid.insert(ent1);
grid.insert(ent2);
grid.insert(ent3);

assert(grid.totalEntities === 3, 'Grid totalEntities count');

// Query radius
const nearby = grid.queryRadius(100, 100, 30);
assert(nearby.length === 2, `queryRadius found exactly 2 nearby entities (got ${nearby.length})`);
assert(nearby.includes(ent1) && nearby.includes(ent2), 'queryRadius contains correct entities');

// Query nearest
const nearest = grid.queryNearest(102, 100, 50);
assert(nearest !== null && nearest.entity === ent1, 'queryNearest identified closest entity');

// Update entity movement
ent1.x = 800;
ent1.y = 800;
grid.update(ent1);

const nearbyAfterMove = grid.queryRadius(100, 100, 30);
assert(nearbyAfterMove.length === 1 && nearbyAfterMove[0] === ent2, 'Entity removed from old cell on move');

const nearbyAtNewPos = grid.queryRadius(800, 800, 30);
assert(nearbyAtNewPos.length === 1 && nearbyAtNewPos[0] === ent1, 'Entity found in new cell after move');

// Remove entity
grid.remove(ent2);
assert(grid.queryRadius(100, 100, 30).length === 0, 'Entity cleanly removed');

console.log('--- Testing Piece 1: Food Ecosystem ---');

const foodMgr = new FoodManager({
  worldWidth: 1000,
  worldHeight: 1000,
  maxFood: 50,
  growthRate: 10
});

assert(foodMgr.foodList.length > 0, 'FoodManager initial population created');
const initCount = foodMgr.foodList.length;

// Consume food
const sampleFood = foodMgr.foodList[0];
const energyVal = sampleFood.energy;
const gained = foodMgr.consume(sampleFood);
assert(gained === energyVal, 'FoodManager.consume returned food energy');
assert(foodMgr.foodList.length === initCount - 1, 'FoodManager removed eaten pellet');

// Test explicit FoodManager.spawnPlant method
const spawnedPellet = foodMgr.spawnPlant(250, 250, 35);
assert(spawnedPellet !== null && spawnedPellet.position.x === 250, 'FoodManager.spawnPlant created plant pellet');
assert(foodMgr.spatialGrid.queryRadius(250, 250, 10).length > 0, 'FoodManager.spawnPlant indexed pellet in spatialGrid');

// Meat decay
const meat = new FoodPellet(100, 100, 'meat', 80);
const initialEnergy = meat.energy;
meat.decay(15);
assert(meat.energy < initialEnergy, 'Meat decays and loses energy over time');
const deadMeat = meat.decay(25);
assert(deadMeat === true || meat.isRotten, 'Meat rots completely after rotDuration');

console.log('--- Testing Piece 2: Genetics & Primer Evolution ---');

const herbGenome = Genome.random('herbivore');
assert(herbGenome.diet < 0.35, 'Herbivore archetype has plant diet gene');
assert(herbGenome.speed >= GENE_BOUNDS.speed.min && herbGenome.speed <= GENE_BOUNDS.speed.max, 'Speed within bounds');

const carnGenome = Genome.random('carnivore');
assert(carnGenome.diet > 0.65, 'Carnivore archetype has meat diet gene');

// Speciation distance
const distBetweenSpecies = herbGenome.geneticDistance(carnGenome);
assert(distBetweenSpecies > 0.28, `Genetic distance detects divergent species (${distBetweenSpecies.toFixed(3)})`);

// Mutation
const mutated = herbGenome.mutate();
assert(mutated.generation === herbGenome.generation + 1, 'Mutated offspring has generation incremented');
assert(mutated.speed >= GENE_BOUNDS.speed.min && mutated.speed <= GENE_BOUNDS.speed.max, 'Mutated speed within bounds');

// Genetic Color
const herbColor = geneticColor(herbGenome);
assert(herbColor.hue >= 90 && herbColor.hue <= 150, `Herbivore hue is green (got ${herbColor.hue})`);
const carnColor = geneticColor(carnGenome);
assert(carnColor.hue <= 30 || carnColor.hue >= 350, `Carnivore hue is reddish/crimson (got ${carnColor.hue})`);

console.log('--- Testing Piece 2: Creature Physics, Metabolism & AI ---');

const creature = new Creature(500, 500, herbGenome, 100);

// Primer metabolic equation verification:
// Cost = basal(size^3 * 0.0015 * metabolismRate) + move(size * speed^2 * 0.014) + sense(sense * 0.003) + huntingMod
const size = creature.genome.size;
const expectedBasal = Math.pow(size, 3) * 0.0015 * creature.genome.metabolismRate;
const expectedMove = size * Math.pow(2.0, 2) * 0.014;
const expectedSense = creature.genome.sense * 0.003;
const expectedTotal = expectedBasal + expectedMove + expectedSense;

const calculatedRate = creature.calculateMetabolicCost(2.0, false);
assertApprox(calculatedRate, expectedTotal, 1e-4, 'Primer metabolic formula strictly matches mathematical specification');

// Verify kinetic cost scaling: speed 4 burns ~2.5-3.5x more energy than speed 1
const testGenome = new Genome({ size: 8.0, speed: 2.0, sense: 80, metabolismRate: 1.0 });
const testCreature = new Creature(500, 500, testGenome, 100);
const costSpeed1 = testCreature.calculateMetabolicCost(1.0, false);
const costSpeed4 = testCreature.calculateMetabolicCost(4.0, false);
const speedRatio = costSpeed4 / costSpeed1;
assert(speedRatio >= 2.0 && speedRatio <= 4.0, `Speed 4 burns significantly more energy than speed 1 (ratio: ${speedRatio.toFixed(2)})`);

// Verify flee sprint velocity clamp allows 1.15x speed
const threatGrid = new SpatialGrid(64, 1000, 1000);
const bigPred = new Creature(520, 500, new Genome({ size: 18, speed: 3.0, diet: 0.9, bravery: 0.9 }));
threatGrid.insert(bigPred);
threatGrid.insert(creature);
creature.velocity.set(100, 100);
creature.update(0.01, { creatureGrid: threatGrid, worldWidth: 1000, worldHeight: 1000 });
assertApprox(creature.velocity.mag(), creature.genome.speed * 1.15, 0.01, 'Flee sprint allows 1.15x max speed');

// Energy expenditure over time
const startingEnergy = creature.energy;
const dt = 0.5;
creature.update(dt, {
  foodManager: null,
  foodGrid: null,
  creatureGrid: null,
  worldWidth: 1000,
  worldHeight: 1000
});
assert(creature.energy < startingEnergy, 'Creature burns energy during life cycle');

// Food consumption increases energy
const hungryCreature = new Creature(500, 500, herbGenome, 50);
const plantNearby = new FoodPellet(502, 500, 'plant', 30);
const testFoodGrid = new SpatialGrid(64, 1000, 1000);
testFoodGrid.insert(plantNearby);
const mockFoodMgr = {
  spatialGrid: testFoodGrid,
  consume: (p) => { testFoodGrid.remove(p); return p.energy; }
};
hungryCreature.update(0.1, {
  foodManager: mockFoodMgr,
  foodGrid: testFoodGrid,
  creatureGrid: null,
  worldWidth: 1000,
  worldHeight: 1000
});
assert(hungryCreature.energy > 50, 'Creature consumed plant pellet and gained energy');
assert(hungryCreature.plantsEaten === 1, 'Creature recorded plantsEaten');

// Reproduction check
creature.energy = creature.reproductionThreshold + 30;
creature.age = 10;
const offspring = creature.update(0.1, {
  foodManager: foodMgr,
  foodGrid: foodMgr.spatialGrid,
  creatureGrid: null,
  worldWidth: 1000,
  worldHeight: 1000
});

assert(offspring !== null, 'Creature reproduces when energy exceeds reproductionThreshold');
assert(offspring instanceof Creature, 'Offspring is valid Creature instance');
assert(offspring.genome.generation === creature.genome.generation + 1, 'Child inherits mutated generation');
assert(creature.offspringCount === 1, 'Parent records offspring count');

// Starvation check
creature.energy = 0.01;
creature.update(1.0, {
  foodManager: foodMgr,
  foodGrid: foodMgr.spatialGrid,
  creatureGrid: null,
  worldWidth: 1000,
  worldHeight: 1000
});
assert(!creature.isAlive, 'Creature dies when energy reaches 0');
assert(creature.causeOfDeath === 'starvation', 'Cause of death is starvation');

console.log('--- Testing Predation & Steering Behaviors ---');

const predGenome = new Genome({ size: 14, speed: 3.5, sense: 120, diet: 0.9, bravery: 0.8 });
const testPreyGenome = new Genome({ size: 6, speed: 2.0, sense: 80, diet: 0.1, bravery: 0.2 });
const carnivore = new Creature(400, 400, predGenome, 80);
const prey = new Creature(408, 400, testPreyGenome, 40);

const creatureGrid = new SpatialGrid(64, 1000, 1000);
creatureGrid.insert(carnivore);
creatureGrid.insert(prey);

const meatSpawnGrid = new SpatialGrid(64, 1000, 1000);
let spawnedMeatPellets = [];
const testPredationEnv = {
  foodManager: {
    spawnMeat: (pos, energy, size) => {
      const meatPellet = new FoodPellet(pos.x, pos.y, 'meat', energy);
      spawnedMeatPellets.push(meatPellet);
      meatSpawnGrid.insert(meatPellet);
    },
    consume: () => 0
  },
  foodGrid: meatSpawnGrid,
  creatureGrid: creatureGrid,
  worldWidth: 1000,
  worldHeight: 1000
};

// Update carnivore: should detect prey within sense radius, hunt, attack and kill it
carnivore.update(0.05, testPredationEnv);

assert(carnivore.state === 'hunting', `Carnivore state entered hunting (got ${carnivore.state})`);
assert(!prey.isAlive, 'Prey killed by predator');
assert(prey.causeOfDeath === 'predation', 'Prey cause of death recorded as predation');
assert(carnivore.kills === 1, 'Carnivore recorded kill count');
assert(spawnedMeatPellets.length > 0, 'Meat spawned on predation kill');

console.log('--- Testing Piece 3: World Engine & Speciation ---');

import('../src/world.js').then(async ({ World }) => {
  const world = new World({
    width: 2000,
    height: 1500,
    initialHerbivores: 25,
    initialCarnivores: 8,
    initialOmnivores: 6,
    maxFood: 200
  });

  assert(world.creatures.length === 39, `World initialized with 39 organisms (got ${world.creatures.length})`);
  assert(world.speciesRegistry.size > 0, 'Phylogenetic species registry initialized');

  // Test Shannon-Wiener Diversity Index
  const divInfo = world.calculateDiversityIndex();
  assert(divInfo.shannonIndex > 0, `Shannon diversity index is positive (${divInfo.shannonIndex.toFixed(3)})`);
  assert(divInfo.activeSpeciesCount >= 3, `At least 3 active species guilds (${divInfo.activeSpeciesCount})`);

  // Extinction listener test
  let extinctionAlertReceived = false;
  let extinctSpeciesId = null;
  world.on('extinction', (evt) => {
    extinctionAlertReceived = true;
    extinctSpeciesId = evt.speciesId;
  });

  // Force extinction of a registered species by killing its members
  const targetSpecies = Array.from(world.speciesRegistry.values())[0];
  for (const c of world.creatures) {
    if (c.genome.speciesId === targetSpecies.id) {
      c.isAlive = false;
    }
  }
  world.updateSpeciesCounts();

  assert(extinctionAlertReceived, 'Extinction alert triggered when species population dropped to 0');
  assert(targetSpecies.extinct === true, 'Species record flagged as extinct');

  // Climate and Temperature Dynamics
  const initialTemp = world.temperature;
  world.update(2.0);
  assert(world.time >= 2.0, 'World time advanced');
  assert(world.temperatureMetabolicMultiplier >= 1.0, 'Temperature multiplier active');

  // Disaster Events: Meteor Impact
  let meteorTriggered = false;
  world.on('disaster', (d) => {
    if (d.name === 'Meteor Strike') meteorTriggered = true;
  });

  const popBeforeMeteor = world.creatures.filter(c => c.isAlive).length;
  // Strike right at the center of the world
  world.triggerMeteor(1000, 750, 400, 200);

  assert(meteorTriggered, 'Meteor strike event fired to listeners');
  assert(world.activeShockwaves.length === 1, 'Shockwave animation entity registered');

  // Disaster Events: Epidemic
  world.triggerEpidemic(0.8);
  assert(world.eventLog.length >= 2, 'Disaster events recorded into event log');

  // Telemetry recording
  world.recordTelemetry();
  assert(world.telemetryHistory.length > 0, 'Telemetry history recorded snapshot');
  const snap = world.telemetryHistory[0];
  assert(snap.totalPop >= 0 && snap.foodCount >= 0, 'Telemetry snapshot contains valid numbers');

  console.log('--- Testing Piece 4: Charts & Analytics ---');
  const { ChartManager } = await import('../src/charts.js');
  const chartMgr = new ChartManager(null);
  assert(chartMgr !== null, 'ChartManager class instantiated');
  assert(chartMgr.currentTab === 'histograms', 'Default chart tab is histograms');

  console.log('--- Testing Piece 5: God-Mode Controls & Presets ---');
  // Preset scenario loading
  world.loadPreset('apex_predator');
  assert(world.creatures.length > 50, 'Apex predator scenario loaded creatures');
  const carnCount = world.creatures.filter(c => c.genome.diet > 0.65).length;
  assert(carnCount >= 10, `Apex predator scenario contains carnivores (${carnCount})`);

  world.loadPreset('famine_scarcity');
  assert(world.temperature === 4.0, 'Famine scenario set winter temperature');
  assert(world.kineticCostMultiplier === 2.2, 'Famine scenario set high kinetic penalty');

  world.loadPreset('hyper_mutation');
  assert(world.mutationMultiplier === 3.5, 'Hyper-mutation scenario set 3.5x mutation multiplier');

  world.loadPreset('cambrian_explosion');
  assert(world.creatures.length >= 40, 'Cambrian explosion reset balanced ecosystem');

  // God-Mode Creature Inspector methods
  const godCreature = world.creatures[0];
  const eBefore = godCreature.energy;
  godCreature.feed(50);
  assert(godCreature.energy >= eBefore, 'God-mode feed increased organism energy');

  godCreature.modifyGene('speed', 4.2);
  assertApprox(godCreature.genome.speed, 4.2, 0.01, 'God-mode modifyGene updated speed');

  godCreature.kill();
  assert(!godCreature.isAlive, 'God-mode kill eliminated organism');

  // Environment sliders
  world.foodGrowthMultiplier = 2.5;
  world.mutationMultiplier = 2.0;
  world.kineticCostMultiplier = 1.4;
  world.temperatureOverride = 30.0;
  world.update(0.1);
  assert(world.temperature === 30.0, 'Temperature override took effect');

  // Floating text visual juice
  const textsCountBefore = world.floatingTexts.length;
  world.addFloatingText(500, 500, '+ENERGY', '#22c55e');
  assert(world.floatingTexts.length === textsCountBefore + 1, 'Floating text entity created');
  const addedText = world.floatingTexts[world.floatingTexts.length - 1];
  const yBefore = addedText.y;
  world.update(0.1);
  assert(addedText.y < yBefore, 'Floating text rises upward over time');

  // Toggleable Death & Extinction Messages
  assert(world.showDeathMessages === true, 'Death messages enabled by default');
  world.setDeathMessages(false);
  assert(world.showDeathMessages === false, 'setDeathMessages(false) disabled death messages');
  world.setDeathMessages(true);
  assert(world.showDeathMessages === true, 'setDeathMessages(true) enabled death messages');
  world.setDeathMessages(); // toggle
  assert(world.showDeathMessages === false, 'setDeathMessages() toggled to false');
  world.setDeathMessages(); // toggle back
  assert(world.showDeathMessages === true, 'setDeathMessages() toggled to true');

  // In-Depth Deep Simulation Features:
  // 1. New Genetic Traits
  const depthGenome = new Genome({ camouflage: 0.85, efficiency: 1.25, flocking: 0.9 });
  assertApprox(depthGenome.camouflage, 0.85, 0.01, 'Genome encodes camouflage gene');
  assertApprox(depthGenome.efficiency, 1.25, 0.01, 'Genome encodes efficiency gene');
  assertApprox(depthGenome.flocking, 0.9, 0.01, 'Genome encodes flocking gene');

  // 2. Golden Energy Berries
  const berry = world.foodManager.spawnBerry(350, 450, 80);
  assert(berry.type === 'berry', 'Spawned golden energy berry');
  assert(berry.energy === 80, 'Golden energy berry stores 80 calories');

  // 3. Biome System
  const oasis = world.getBiomeAt(100, 100);
  assert(oasis.id === 'oasis', 'NW coordinate maps to Fertile Oasis');
  const desert = world.getBiomeAt(2000, 100);
  assert(desert.id === 'desert', 'NE coordinate maps to Arid Desert');
  const marsh = world.getBiomeAt(100, 1200);
  assert(marsh.id === 'marsh', 'SW coordinate maps to Deep Marsh');
  const volcanic = world.getBiomeAt(2000, 1200);
  assert(volcanic.id === 'volcanic', 'SE coordinate maps to Thermal Barrens');

  // 4. Challenge Scenarios
  world.loadPreset('challenge_speed_trap');
  assert(world.creatures.length > 0, 'Loaded challenge: The Speed Trap');
  assert(world.foodGrowthMultiplier === 0.55, 'Speed Trap configured food shortage');

  world.loadPreset('challenge_darwin_finches');
  assert(world.creatures.length > 0, "Loaded challenge: Darwin's Finches");

  // 5. Possession Mode
  const testControlled = world.creatures[0];
  testControlled.isPossessed = true;
  testControlled.playerInputVector.set(1, 0);
  testControlled.evaluateBehavior({ foodGrid: world.foodManager.spatialGrid, creatureGrid: world.creatureGrid });
  assert(testControlled.state === 'possessed', 'Creature in possessed state under player control');
  testControlled.isPossessed = false;

  // 6: Primer Phase Space Scatter Tab
  chartMgr.currentTab = 'scatter';
  chartMgr.render(world);
  assert(chartMgr.currentTab === 'scatter', 'ChartManager renders scatter phase space tab');

  // 7: In-Depth Features: Circadian Cycle
  const initialTimeOfDay = world.timeOfDay;
  world.update(2.0);
  assert(world.timeOfDay > initialTimeOfDay, 'Circadian cycle advanced time of day');
  assert(typeof world.isNight === 'boolean', 'Circadian cycle evaluates isNight');

  // 8: Chemical Ecology: Pheromones
  world.addPheromone(250, 250, 'food', 1.0, 4.0);
  assert(world.pheromones.length > 0, 'Emitted food scent pheromone');
  assert(world.pheromones[world.pheromones.length - 1].type === 'food', 'Pheromone has correct type');
  world.update(1.0);
  assert(world.pheromones[world.pheromones.length - 1].strength < 1.0, 'Pheromone evaporates over time');

  // 9: Sexual Reproduction & Chromosomal Recombination
  const parentA = new Creature(100, 100, new Genome({ speed: 2.0, sense: 80, diet: 0.1, armor: 0.8 }));
  const parentB = new Creature(105, 105, new Genome({ speed: 3.0, sense: 120, diet: 0.2, armor: 0.4 }));
  parentA.energy = 160;
  parentB.energy = 160;
  parentA.age = 10;
  parentB.age = 10;
  parentA.matingCooldown = 0;
  parentB.matingCooldown = 0;

  world.creatureGrid.insert(parentA);
  world.creatureGrid.insert(parentB);

  const testEnv = {
    foodGrid: world.foodManager.spatialGrid,
    creatureGrid: world.creatureGrid,
    mutationMultiplier: 1.0,
    addFloatingText: () => {},
    addPheromone: () => {}
  };

  // Step evaluateBehavior so parentA acquires parentB as courtshipTarget
  parentA.evaluateBehavior(testEnv);
  assert(parentA.state === 'courtship' && parentA.courtshipTarget === parentB, 'Parent A engaged in courtship with Parent B');

  // Trigger reproduction step
  const childSexual = parentA.update(0.1, null); // null env avoids re-evaluating behavior
  assert(childSexual !== null, 'Sexual courtship encounter produced viable offspring');
  assert(childSexual.reproductionType === 'sexual', 'Offspring tagged with sexual reproduction type');
  assert(childSexual.parentAId === parentA.id, 'Offspring tracks parent A');
  assert(childSexual.parentBId === parentB.id, 'Offspring tracks parent B');

  // 10: Fossil Record & Lazarus Cloner
  const dummySpeciesId = 'sp_test_fossil';
  world.fossilRecord.unshift({
    speciesId: dummySpeciesId,
    archetype: 'carnivore',
    color: { bodyCss: '#ef4444', strokeCss: '#991b1b' },
    divergenceTime: 10,
    extinctionTime: 50,
    lifespan: 40,
    peakPopulation: 18,
    divergenceGeneration: 3,
    parentSpeciesId: 'sp_1',
    representativeGenome: new Genome({ speed: 3.5, size: 14, diet: 0.9 }),
    causeOfDeath: 'starvation'
  });
  assert(world.fossilRecord.length > 0, 'Fossil record contains extinct taxon');
  const resSuccess = world.resurrectFossil(dummySpeciesId, 2);
  assert(resSuccess === true, 'Lazarus taxon resurrection succeeded');
  assert(world.creatures.some(c => c.genome.speciesId === dummySpeciesId), 'Resurrected creatures injected into active world');

  // 11: World State Serialization (Save / Load JSON)
  const exportedJSON = world.exportWorldJSON();
  assert(typeof exportedJSON === 'string' && exportedJSON.includes('creatures'), 'Simulation exported valid JSON string');
  const restoredSuccess = world.importWorldJSON(exportedJSON);
  assert(restoredSuccess === true, 'Simulation world restored successfully from JSON');
  assert(world.creatures.length > 0, 'Restored world populated with living organisms');

  // 12: Fossils & Lineage Chart Tab
  chartMgr.currentTab = 'fossils';
  chartMgr.render(world);
  assert(chartMgr.currentTab === 'fossils', 'ChartManager renders Fossils & Lineage tab');

  console.log('--- Testing Piece 6: Web Audio Synthesizer Interface ---');
  const { SoundSynthesizer, sound } = await import('../src/audio.js');
  const synth = new SoundSynthesizer();
  assert(synth !== null, 'SoundSynthesizer instantiated');
  assert(!synth.isMuted, 'Synthesizer is unmuted by default');
  synth.toggleMute();
  assert(synth.isMuted, 'Synthesizer toggleMute muted audio');
  synth.toggleMute();
  assert(!synth.isMuted, 'Synthesizer toggleMute unmuted audio');
  synth.setVolume(0.8);
  assertApprox(synth.masterVolume, 0.8, 0.01, 'Synthesizer masterVolume updated');

  // Verify sound trigger methods execute safely without crash in headless node
  synth.eat();
  synth.bite();
  synth.reproduce();
  synth.extinction();
  synth.meteor();
  assert(true, 'Audio sound trigger methods execute gracefully without headless audio context error');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL SIMULATION UNIT & INTEGRATION TESTS PASSED PERFECTLY!');
  }
});
