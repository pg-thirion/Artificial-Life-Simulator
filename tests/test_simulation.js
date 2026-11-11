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
import { Colony } from '../src/colony.js';
import { NeuralBrain, BRAIN_CONFIG } from '../src/neuralBrain.js';
import { NeuralVisualizer, INPUT_LABELS, OUTPUT_LABELS } from '../src/neuralVisualizer.js';
import { ArenaTournament } from '../src/arena.js';

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

console.log('--- Testing Neural Brain Math & Perceptron Engine ---');
const simBrain = new NeuralBrain();
assert(simBrain.weights.length === 124, 'NeuralBrain initializes with 124 synaptic weights');
assert(simBrain.activations.output.length === 4, 'NeuralBrain allocates 4 output activations');
const simOutputs = simBrain.forward(new Float32Array(10));
assert(simOutputs.length === 4, 'NeuralBrain forward pass yields 4 motor outputs');
assert(simOutputs[0] >= -Math.PI - 1e-5 && simOutputs[0] <= Math.PI + 1e-5, 'Neural steer angle delta within [-PI, PI]');
assert(simOutputs[1] >= 0 && simOutputs[1] <= 1, 'Neural thrust magnitude within [0, 1]');
const simMutated = NeuralBrain.mutateWeights(simBrain.weights, 0.1);
assert(simMutated.length === 124, 'NeuralBrain mutation maintains 124 weights');
const simCrossed = NeuralBrain.crossoverWeights(simBrain.weights, simMutated);
assert(simCrossed.length === 124, 'NeuralBrain crossover yields 124 weights');

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

console.log('--- Testing Task 2: Synaptic DNA Encoding & Dual-Brain Genetics ---');

// 1. Genome defaults for neural genes
const defaultGenome = new Genome();
assert(defaultGenome.brainType === 'neural', 'Default genome brainType is neural');
assert(defaultGenome.brainWeights instanceof Float32Array, 'Default genome brainWeights is Float32Array');
assert(defaultGenome.brainWeights.length === 124, 'Default genome has 124 synaptic weights');
assertApprox(defaultGenome.chromatophore, 0.3, 1e-4, 'Default chromatophore is 0.3');
assertApprox(defaultGenome.adhesion, 0.1, 1e-4, 'Default adhesion is 0.1');
assertApprox(defaultGenome.symbiosis, 0.2, 1e-4, 'Default symbiosis is 0.2');

const customGenome = new Genome({
  brainType: 'heuristic',
  chromatophore: 0.75,
  adhesion: 0.85,
  symbiosis: 0.95
});
assert(customGenome.brainType === 'heuristic', 'Custom genome honors brainType');
assertApprox(customGenome.chromatophore, 0.75, 1e-4, 'Custom chromatophore preserved');
assertApprox(customGenome.adhesion, 0.85, 1e-4, 'Custom adhesion preserved');
assertApprox(customGenome.symbiosis, 0.95, 1e-4, 'Custom symbiosis preserved');

// 2. Independent Float32Array on clone
const clonedGenome = defaultGenome.clone();
assert(clonedGenome.brainWeights instanceof Float32Array, 'Cloned genome has Float32Array weights');
assert(clonedGenome.brainWeights.length === 124, 'Cloned genome weights length 124');
assert(clonedGenome.brainWeights !== defaultGenome.brainWeights, 'Cloned brainWeights is an independent Float32Array instance');
assertApprox(clonedGenome.brainWeights[0], defaultGenome.brainWeights[0], 1e-6, 'Cloned brainWeights initially equal');
const originalW0 = defaultGenome.brainWeights[0];
clonedGenome.brainWeights[0] += 1.5;
assertApprox(defaultGenome.brainWeights[0], originalW0, 1e-6, 'Mutating cloned weights does not modify original genome weights');
assert(clonedGenome.brainType === defaultGenome.brainType, 'Clone preserves brainType');
assertApprox(clonedGenome.chromatophore, defaultGenome.chromatophore, 1e-4, 'Clone preserves chromatophore');
assertApprox(clonedGenome.adhesion, defaultGenome.adhesion, 1e-4, 'Clone preserves adhesion');
assertApprox(clonedGenome.symbiosis, defaultGenome.symbiosis, 1e-4, 'Clone preserves symbiosis');

// 3. Mutation perturbing synaptic weights within [-5, 5]
const mutChild = defaultGenome.mutate(2.0);
assert(mutChild.brainWeights instanceof Float32Array, 'Mutated offspring has Float32Array brainWeights');
assert(mutChild.brainWeights.length === 124, 'Mutated offspring has 124 weights');
let allWithinBounds = true;
let anyPerturbed = false;
for (let i = 0; i < 124; i++) {
  if (mutChild.brainWeights[i] < -5.0 || mutChild.brainWeights[i] > 5.0) allWithinBounds = false;
  if (mutChild.brainWeights[i] !== defaultGenome.brainWeights[i]) anyPerturbed = true;
}
assert(allWithinBounds, 'All mutated synaptic weights clamped to [-5.0, 5.0]');
assert(anyPerturbed, 'Synaptic mutation perturbs neural weights');
assert(mutChild.chromatophore >= 0 && mutChild.chromatophore <= 1, 'Mutated chromatophore within [0, 1]');
assert(mutChild.adhesion >= 0 && mutChild.adhesion <= 1, 'Mutated adhesion within [0, 1]');
assert(mutChild.symbiosis >= 0 && mutChild.symbiosis <= 1, 'Mutated symbiosis within [0, 1]');
assert(['neural', 'heuristic'].includes(mutChild.brainType), 'Mutated brainType valid');

// 4. Crossover producing valid recombinant synaptic weights
const parentA = new Genome({ brainType: 'neural' });
const parentB = new Genome({ brainType: 'heuristic' });
const crossChild = parentA.crossover(parentB);
assert(crossChild.brainWeights instanceof Float32Array, 'Crossover child has Float32Array weights');
assert(crossChild.brainWeights.length === 124, 'Crossover child has 124 weights');
let crossWithinBounds = true;
for (let i = 0; i < 124; i++) {
  if (crossChild.brainWeights[i] < -5.0 || crossChild.brainWeights[i] > 5.0) crossWithinBounds = false;
}
assert(crossWithinBounds, 'Crossover synaptic weights within [-5.0, 5.0]');
assert(['neural', 'heuristic'].includes(crossChild.brainType), 'Crossover child brainType inherited from parents');
assert(crossChild.chromatophore >= 0 && crossChild.chromatophore <= 1, 'Crossover chromatophore in bounds');
assert(crossChild.adhesion >= 0 && crossChild.adhesion <= 1, 'Crossover adhesion in bounds');
assert(crossChild.symbiosis >= 0 && crossChild.symbiosis <= 1, 'Crossover symbiosis in bounds');

// 5. Creature instantiating this.brain instanceof NeuralBrain
const testCreature1 = new Creature(200, 200, defaultGenome);
assert(testCreature1.brain instanceof NeuralBrain, 'Creature instantiates this.brain instanceof NeuralBrain');
assert(testCreature1.brain.weights.length === 124, 'Creature brain has 124 weights');
assert(testCreature1.brainType === defaultGenome.brainType, 'Creature brainType getter matches genome brainType');
const asexualChild = testCreature1.reproduceAsexual();
assert(asexualChild.brain instanceof NeuralBrain, 'Asexual offspring instantiates new NeuralBrain');
assert(asexualChild.brain.weights !== testCreature1.brain.weights, 'Asexual offspring has independent brain weights');
const sexualPartner = new Creature(210, 200, parentB);
const sexualChild = testCreature1.reproduceSexual(sexualPartner);
assert(sexualChild.brain instanceof NeuralBrain, 'Sexual offspring instantiates new NeuralBrain');
assert(sexualChild.brain.weights !== testCreature1.brain.weights && sexualChild.brain.weights !== sexualPartner.brain.weights, 'Sexual offspring has independent recombinant brain weights');

// 6. Genetic Distance & Synaptic Delta
assertApprox(defaultGenome.distance(defaultGenome), 0.0, 1e-4, 'Distance between identical genomes is 0');
assertApprox(defaultGenome.distance(mutChild), defaultGenome.geneticDistance(mutChild), 1e-6, 'distance() is alias for geneticDistance()');
const gA = new Genome();
const gB = gA.clone();
assertApprox(gA.geneticDistance(gB), 0.0, 1e-4, 'Identical clone distance is 0');
for (let i = 0; i < 124; i++) gB.brainWeights[i] += 2.0;
const dSyn = gA.geneticDistance(gB);
assert(dSyn > 0.0, 'Synaptic weight delta contributes to genetic distance');

// 7. toJSON and fromJSON serialization
const json = defaultGenome.toJSON();
assert(Array.isArray(json.brainWeights), 'toJSON exports brainWeights as array');
assert(json.brainWeights.length === 124, 'toJSON exports all 124 weights');
assert(json.brainType === 'neural', 'toJSON exports brainType');
assertApprox(json.chromatophore, 0.3, 1e-4, 'toJSON exports chromatophore');
assertApprox(json.adhesion, 0.1, 1e-4, 'toJSON exports adhesion');
assertApprox(json.symbiosis, 0.2, 1e-4, 'toJSON exports symbiosis');
const serializedStr = JSON.stringify(json);
const restoredGenome = Genome.fromJSON(JSON.parse(serializedStr));
assert(restoredGenome.brainWeights instanceof Float32Array, 'fromJSON restores Float32Array brainWeights');
assert(restoredGenome.brainWeights.length === 124, 'fromJSON restores 124 weights');
assert(restoredGenome.brainType === 'neural', 'fromJSON restores brainType');
assertApprox(restoredGenome.distance(defaultGenome), 0.0, 1e-4, 'Restored genome genetic distance to original is 0');

console.log('--- Testing Task 3: Normalized Sensory Pipeline & Neural Steering Integration ---');

// 1. evaluateNeuralBehavior returns valid finite 10-input vector in empty environment
const neuralCreature1 = new Creature(500, 500, new Genome({ brainType: 'neural', sense: 100 }));
assert(neuralCreature1.brainType === 'neural', 'Creature has neural brainType');
const emptyResult = neuralCreature1.evaluateNeuralBehavior({});
assert(emptyResult.inputs instanceof Float32Array, 'Neural inputs is Float32Array');
assert(emptyResult.inputs.length === 10, 'Neural inputs length is exactly 10');
assert(emptyResult.outputs instanceof Float32Array, 'Neural outputs is Float32Array');
assert(emptyResult.outputs.length === 4, 'Neural outputs length is exactly 4');

let allEmptyFinite = true;
for (let i = 0; i < 10; i++) {
  if (!Number.isFinite(emptyResult.inputs[i])) allEmptyFinite = false;
}
assert(allEmptyFinite, 'All inputs are finite in empty environment');
assertApprox(emptyResult.inputs[0], 0.0, 1e-4, 'Empty env nearestFoodDist is 0.0');
assertApprox(emptyResult.inputs[1], 0.0, 1e-4, 'Empty env nearestFoodAngle is 0.0');
assertApprox(emptyResult.inputs[2], 0.0, 1e-4, 'Empty env nearestFoodDangerSignal is 0.0');
assertApprox(emptyResult.inputs[3], 0.0, 1e-4, 'Empty env nearestThreatDist is 0.0');
assertApprox(emptyResult.inputs[4], 0.0, 1e-4, 'Empty env nearestThreatAngle is 0.0');
assertApprox(emptyResult.inputs[5], 0.0, 1e-4, 'Empty env nearestMateDist is 0.0');
assertApprox(emptyResult.inputs[6], 0.0, 1e-4, 'Empty env nearestMateAngle is 0.0');
assert(emptyResult.inputs[7] >= 0.0 && emptyResult.inputs[7] <= 1.0, 'Energy ratio is normalized [0, 1]');
assert(emptyResult.inputs[8] >= 0.0 && emptyResult.inputs[8] <= 1.0, 'Biome drag stress is normalized [0, 1]');
assert(emptyResult.inputs[9] >= 0.0 && emptyResult.inputs[9] <= 1.0, 'Solar intensity is normalized [0, 1]');

// 2. evaluateNeuralBehavior with populated environment (Food, Threat, Mate, Drag, Solar)
const task3FoodGrid = new SpatialGrid(64, 1000, 1000);
const task3CreatureGrid = new SpatialGrid(64, 1000, 1000);

// Place food directly ahead of creature (heading = 0, along +X axis)
neuralCreature1.position.set(500, 500);
neuralCreature1.heading = 0; // facing +X
neuralCreature1.velocity.set(1, 0);

const plantPellet = new FoodPellet(550, 500, 'plant', 30); // 50 units away (sense is 100 => distNorm = 1 - 50/100 = 0.5)
task3FoodGrid.insert(plantPellet);

// Place a predator threat 25 units away to the right (+Y, angle PI/2 => relative angleNorm ~ 0.5)
const threatCreature = new Creature(500, 525, new Genome({
  size: neuralCreature1.genome.size * 1.5,
  diet: 0.9,
  speed: 2.0
}));
task3CreatureGrid.insert(threatCreature);

// Place a compatible mate 80 units away (distNorm = 1 - 80/100 = 0.2)
const mateCreature = new Creature(580, 500, neuralCreature1.genome.clone());
task3CreatureGrid.insert(mateCreature);

const populatedEnv = {
  foodGrid: task3FoodGrid,
  creatureGrid: task3CreatureGrid,
  drag: 0.75,
  solarIntensity: 0.42,
  worldWidth: 1000,
  worldHeight: 1000
};

const popResult = neuralCreature1.evaluateNeuralBehavior(populatedEnv);
assertApprox(popResult.inputs[0], 0.5, 0.02, 'nearestFoodDistNorm computed accurately (1 - 50/100 = 0.5)');
assertApprox(popResult.inputs[1], 0.0, 0.02, 'nearestFoodAngleNorm is ~0 when directly ahead');
assertApprox(popResult.inputs[2], 0.0, 1e-4, 'nearestFoodDangerSignal is 0.0 for plant pellet');
assert(neuralCreature1.currentTarget === plantPellet, 'currentTarget references detected food pellet');

assertApprox(popResult.inputs[3], 0.75, 0.02, 'nearestThreatDistNorm computed accurately (1 - 25/100 = 0.75)');
assertApprox(popResult.inputs[4], 0.5, 0.05, 'nearestThreatAngleNorm reflects +90 deg offset (~0.5)');
assert(neuralCreature1.threatTarget === threatCreature, 'threatTarget references detected predator');

assertApprox(popResult.inputs[5], 0.2, 0.02, 'nearestMateDistNorm computed accurately (1 - 80/100 = 0.2)');
assertApprox(popResult.inputs[6], 0.0, 0.02, 'nearestMateAngleNorm is ~0 when directly ahead');
assert(neuralCreature1.courtshipTarget === mateCreature, 'courtshipTarget references detected mate');

assertApprox(popResult.inputs[8], 0.75, 1e-4, 'biomeDragStress captured from env.drag');
assertApprox(popResult.inputs[9], 0.42, 1e-4, 'solarIntensity captured from env.solarIntensity');

// Test carnivore prey detection and aposematic warning / armor danger signal
const carnNeuralCreature = new Creature(500, 500, new Genome({
  diet: 0.9,
  size: 15,
  speed: 3.0,
  sense: 100,
  brainType: 'neural'
}));
const preyCreatureGrid = new SpatialGrid(64, 1000, 1000);
const toxicPrey = new Creature(530, 500, new Genome({
  diet: 0.1,
  size: 8,
  armor: 0.85,
  bravery: 0.685,
  camouflage: 0.0
}));
preyCreatureGrid.insert(toxicPrey);
const preyEnvResult = carnNeuralCreature.evaluateNeuralBehavior({
  creatureGrid: preyCreatureGrid,
  foodGrid: null,
  worldWidth: 1000,
  worldHeight: 1000
});
assert(carnNeuralCreature.currentTarget === toxicPrey, 'Carnivore targets prey creature');
assert(preyEnvResult.inputs[0] > 0.0, 'Carnivore senses distance to prey');
assertApprox(preyEnvResult.inputs[2], 0.85, 0.02, 'Prey armor / aposematic warning level captured in danger signal');

// 3. Neural outputs bounding and telemetry caching
assert(popResult.steerAngleDelta >= -Math.PI && popResult.steerAngleDelta <= Math.PI, 'steerAngleDelta bounded in [-PI, PI]');
assert(popResult.thrustMagnitude >= 0.0 && popResult.thrustMagnitude <= 1.0, 'thrustMagnitude bounded in [0, 1]');
assert(popResult.courtshipDesire >= 0.0 && popResult.courtshipDesire <= 1.0, 'courtshipDesire bounded in [0, 1]');
assert(popResult.aggressionImpulse >= 0.0 && popResult.aggressionImpulse <= 1.0, 'aggressionImpulse bounded in [0, 1]');
assert(neuralCreature1.lastNeuralInputs === popResult.inputs, 'lastNeuralInputs cached on creature');
assert(neuralCreature1.lastNeuralOutputs === popResult.outputs, 'lastNeuralOutputs cached on creature');
assert(neuralCreature1.state === 'neural', 'Creature state set to neural');
assert(neuralCreature1.currentIntention.startsWith('Neural: Thrust'), 'Creature intention updated with telemetry string');

// 4. Force application changes velocity as expected
const testMotorCreature = new Creature(500, 500, new Genome({ brainType: 'neural', speed: 4.0 }));
testMotorCreature.velocity.set(0, 0);
testMotorCreature.acceleration.set(0, 0);
// Configure weights to produce positive thrust
testMotorCreature.brain.weights[BRAIN_CONFIG.B2_OFFSET + 1] = 4.0; // strong positive bias on thrust output
testMotorCreature.evaluateNeuralBehavior({});
assert(testMotorCreature.acceleration.mag() > 0, 'evaluateNeuralBehavior applies acceleration force via thrust');
testMotorCreature.update(0.1, { worldWidth: 1000, worldHeight: 1000 });
assert(testMotorCreature.velocity.mag() > 0, 'Velocity increases in response to neural thrust force');

// 5. Dual-brain execution dispatch
const heuristicTestCreature = new Creature(500, 500, new Genome({ brainType: 'heuristic' }));
assert(heuristicTestCreature.brainType === 'heuristic', 'Heuristic creature has brainType heuristic');
const heuristicResult = heuristicTestCreature.evaluateBehavior({});
assert(heuristicResult.action !== undefined, 'Heuristic evaluateBehavior returns action object');
assert(heuristicTestCreature.state !== 'neural', 'Heuristic creature does not enter neural state');

const neuralDispatchCreature = new Creature(500, 500, new Genome({ brainType: 'neural' }));
const neuralResult = neuralDispatchCreature.evaluateBehavior({});
assert(neuralResult.steerAngleDelta !== undefined, 'Neural evaluateBehavior returns steerAngleDelta');
assert(neuralDispatchCreature.state === 'neural', 'Neural creature enters neural state');

// Possessed creature preserves player control over both brain types
neuralDispatchCreature.isPossessed = true;
neuralDispatchCreature.playerInputVector.set(1, 0);
const possessedResult = neuralDispatchCreature.evaluateBehavior({});
assert(possessedResult.action === 'possessed', 'Player possession takes precedence over neural brain');
assert(neuralDispatchCreature.state === 'possessed', 'Possessed creature state is possessed');
neuralDispatchCreature.isPossessed = false;

console.log('--- Testing Task 4: Dynamic Chromatophores & Aposematic Mimicry ---');

// 1. Dynamic Chromatophore Initialization & effectiveColorCss
const defaultChromaCreature = new Creature(500, 500);
assert(defaultChromaCreature.chromatophoreColor !== undefined, 'Creature initializes chromatophoreColor');
assert(typeof defaultChromaCreature.chromatophoreColor.r === 'number', 'chromatophoreColor.r is number');
assert(typeof defaultChromaCreature.chromatophoreColor.g === 'number', 'chromatophoreColor.g is number');
assert(typeof defaultChromaCreature.chromatophoreColor.b === 'number', 'chromatophoreColor.b is number');
assert(typeof defaultChromaCreature.effectiveColorCss === 'string', 'effectiveColorCss returns string');
assert(defaultChromaCreature.effectiveColorCss.startsWith('rgb('), 'effectiveColorCss returns rgb(...) format');

// Fallback behavior when genome is undefined / missing
const bareCreature = new Creature(100, 100);
bareCreature.genome = null;
bareCreature.chromatophoreColor = null;
assert(bareCreature.effectiveColorCss === 'rgb(120, 140, 200)', 'effectiveColorCss handles null chromatophore with fallback');

// 2. Chromatophore Color Shifting towards Biome Substrates
const oasisCreature = new Creature(100, 100, new Genome({ chromatophore: 0.8, brainType: 'heuristic' }));
const initialOasisRgb = { ...oasisCreature.chromatophoreColor };
const oasisEnv = {
  getBiomeAt: () => ({ id: 'oasis' }),
  worldWidth: 2000,
  worldHeight: 2000
};

// Distance helper
function rgbDistSq(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db;
}

const targetOasis = { r: 34, g: 197, b: 94 };
const initialDist = rgbDistSq(initialOasisRgb, targetOasis);

// Step 1: Run single update with dt = 0.1
// t = 0.8 * 0.1 * 2.0 = 0.16
oasisCreature.update(0.1, oasisEnv);
const afterOneStepDist = rgbDistSq(oasisCreature.chromatophoreColor, targetOasis);
assert(afterOneStepDist < initialDist, 'Chromatophore shifts closer to oasis substrate after 1 update');

// Step 2: Run 40 additional updates, should strongly converge to oasis RGB
for (let i = 0; i < 40; i++) {
  oasisCreature.update(0.1, oasisEnv);
}
assertApprox(oasisCreature.chromatophoreColor.r, 34, 1.5, 'Chromatophore R converged to oasis substrate 34');
assertApprox(oasisCreature.chromatophoreColor.g, 197, 1.5, 'Chromatophore G converged to oasis substrate 197');
assertApprox(oasisCreature.chromatophoreColor.b, 94, 1.5, 'Chromatophore B converged to oasis substrate 94');
assert(oasisCreature.effectiveColorCss === 'rgb(34, 197, 94)', 'effectiveColorCss matches oasis substrate');

// Test other biome substrates: desert, marsh, volcanic
const desertCreature = new Creature(100, 100, new Genome({ chromatophore: 0.9, brainType: 'heuristic' }));
const desertEnv = { getBiomeAt: () => ({ id: 'desert' }), worldWidth: 1000, worldHeight: 1000 };
for (let i = 0; i < 50; i++) desertCreature.update(0.1, desertEnv);
assertApprox(desertCreature.chromatophoreColor.r, 245, 1.5, 'Desert substrate R ~ 245');
assertApprox(desertCreature.chromatophoreColor.g, 158, 1.5, 'Desert substrate G ~ 158');
assertApprox(desertCreature.chromatophoreColor.b, 11, 1.5, 'Desert substrate B ~ 11');

const marshCreature = new Creature(100, 100, new Genome({ chromatophore: 0.9, brainType: 'heuristic' }));
const marshEnv = { getBiomeAt: () => ({ id: 'marsh' }), worldWidth: 1000, worldHeight: 1000 };
for (let i = 0; i < 50; i++) marshCreature.update(0.1, marshEnv);
assertApprox(marshCreature.chromatophoreColor.r, 56, 1.5, 'Marsh substrate R ~ 56');
assertApprox(marshCreature.chromatophoreColor.g, 189, 1.5, 'Marsh substrate G ~ 189');
assertApprox(marshCreature.chromatophoreColor.b, 248, 1.5, 'Marsh substrate B ~ 248');

const volcanicCreature = new Creature(100, 100, new Genome({ chromatophore: 0.9, brainType: 'heuristic' }));
const volcanicEnv = { getBiomeAt: () => ({ id: 'volcanic' }), worldWidth: 1000, worldHeight: 1000 };
for (let i = 0; i < 50; i++) volcanicCreature.update(0.1, volcanicEnv);
assertApprox(volcanicCreature.chromatophoreColor.r, 239, 1.5, 'Volcanic substrate R ~ 239');
assertApprox(volcanicCreature.chromatophoreColor.g, 68, 1.5, 'Volcanic substrate G ~ 68');
assertApprox(volcanicCreature.chromatophoreColor.b, 68, 1.5, 'Volcanic substrate B ~ 68');

// 3. Zero Chromatophore Gene Prevents Color Shifting
const staticCreature = new Creature(100, 100, new Genome({ chromatophore: 0.0, brainType: 'heuristic' }));
const staticInitialRgb = { ...staticCreature.chromatophoreColor };
const staticInitialCss = staticCreature.effectiveColorCss;
for (let i = 0; i < 30; i++) {
  staticCreature.update(0.1, oasisEnv);
}
assert(staticCreature.chromatophoreColor.r === staticInitialRgb.r, 'Zero chromatophore preserves R');
assert(staticCreature.chromatophoreColor.g === staticInitialRgb.g, 'Zero chromatophore preserves G');
assert(staticCreature.chromatophoreColor.b === staticInitialRgb.b, 'Zero chromatophore preserves B');
assert(staticCreature.effectiveColorCss === staticInitialCss, 'Zero chromatophore preserves effectiveColorCss');

// 4. Aposematic Warning Level & Batesian Mimicry
// Genuine toxic/armored aposematism: (armor * bravery - 0.20) / 0.45
const highGenuine = new Creature(0, 0, new Genome({ armor: 0.9, bravery: 0.8, camouflage: 0.2 }));
// 0.9 * 0.8 = 0.72; (0.72 - 0.20) / 0.45 = 0.52 / 0.45 = 1.155 -> clamped 1.0
assertApprox(highGenuine.aposematicWarningLevel, 1.0, 1e-4, 'Genuine high armor & bravery has warning level 1.0');

const midGenuine = new Creature(0, 0, new Genome({ armor: 0.6, bravery: 0.6, camouflage: 0.1 }));
// 0.6 * 0.6 = 0.36; (0.36 - 0.20) / 0.45 = 0.16 / 0.45 = 0.3555...
assertApprox(midGenuine.aposematicWarningLevel, 0.3556, 0.01, 'Genuine moderate armor & bravery warning level calculated correctly');

const lowGenuine = new Creature(0, 0, new Genome({ armor: 0.2, bravery: 0.2, camouflage: 0.1 }));
// 0.2 * 0.2 = 0.04; (0.04 - 0.20) / 0.45 < 0 -> clamped 0.0
assertApprox(lowGenuine.aposematicWarningLevel, 0.0, 1e-4, 'Harmless creature has genuine warning level 0.0');

// Batesian mimicry: defenceless (armor 0, bravery 0) but high camouflage (> 0.65)
// (camouflage - 0.65) / 0.35
const perfectMimic = new Creature(0, 0, new Genome({ armor: 0.0, bravery: 0.0, camouflage: 1.0 }));
assertApprox(perfectMimic.aposematicWarningLevel, 1.0, 1e-4, 'Batesian mimic with max camouflage has warning level 1.0');

const partialMimic = new Creature(0, 0, new Genome({ armor: 0.0, bravery: 0.0, camouflage: 0.825 }));
// (0.825 - 0.65) / 0.35 = 0.175 / 0.35 = 0.5
assertApprox(partialMimic.aposematicWarningLevel, 0.5, 0.01, 'Batesian mimic with 0.825 camouflage has warning level 0.5');

const lowCamoNonMimic = new Creature(0, 0, new Genome({ armor: 0.0, bravery: 0.0, camouflage: 0.5 }));
assertApprox(lowCamoNonMimic.aposematicWarningLevel, 0.0, 1e-4, 'Creature with camouflage <= 0.65 has warning level 0.0');

// 5. Sensory Pipeline Danger Signal from Aposematic & Mimic Prey
const testPredator = new Creature(500, 500, new Genome({
  diet: 0.95,
  size: 16,
  speed: 3.5,
  sense: 120,
  brainType: 'neural'
}));

// Test 5A: Targeting genuine aposematic prey
const preyGridA = new SpatialGrid(64, 1000, 1000);
const genuinePrey = new Creature(530, 500, new Genome({
  diet: 0.1,
  size: 7,
  armor: 0.9,
  bravery: 0.8,
  camouflage: 0.1
}));
preyGridA.insert(genuinePrey);
const resultA = testPredator.evaluateNeuralBehavior({ creatureGrid: preyGridA, worldWidth: 1000, worldHeight: 1000 });
assert(testPredator.currentTarget === genuinePrey, 'Predator targets genuine prey');
assertApprox(resultA.inputs[2], 1.0, 0.02, 'nearestFoodDangerSignal captures genuine aposematic warning level ~ 1.0');

// Test 5B: Targeting Batesian mimic prey
const preyGridB = new SpatialGrid(64, 1000, 1000);
const mimicPrey = new Creature(530, 500, new Genome({
  diet: 0.1,
  size: 7,
  armor: 0.0,
  bravery: 0.0,
  camouflage: 0.95 // mimic level = (0.95 - 0.65)/0.35 = 0.857
}));
preyGridB.insert(mimicPrey);
const resultB = testPredator.evaluateNeuralBehavior({ creatureGrid: preyGridB, worldWidth: 1000, worldHeight: 1000 });
assert(testPredator.currentTarget === mimicPrey, 'Predator targets mimic prey');
assertApprox(resultB.inputs[2], 0.857, 0.03, 'nearestFoodDangerSignal reflects deceptive danger from Batesian mimic ~ 0.857');

// Test 5C: Targeting harmless non-aposematic prey
const preyGridC = new SpatialGrid(64, 1000, 1000);
const harmlessPrey = new Creature(530, 500, new Genome({
  diet: 0.1,
  size: 7,
  armor: 0.1,
  bravery: 0.1,
  camouflage: 0.2
}));
preyGridC.insert(harmlessPrey);
const resultC = testPredator.evaluateNeuralBehavior({ creatureGrid: preyGridC, worldWidth: 1000, worldHeight: 1000 });
assert(testPredator.currentTarget === harmlessPrey, 'Predator targets harmless prey');
assertApprox(resultC.inputs[2], 0.0, 1e-4, 'nearestFoodDangerSignal is 0.0 for harmless non-aposematic prey');

// 6. Mock Canvas Draw Tests (Warning Bands & Dynamic Fill)
function createMockContext() {
  const strokeStyles = [];
  const fillStyles = [];
  const lineDashes = [];
  const calls = [];

  const ctx = {
    calls,
    strokeStyles,
    fillStyles,
    lineDashes,
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    translate: () => calls.push('translate'),
    rotate: () => calls.push('rotate'),
    scale: () => calls.push('scale'),
    beginPath: () => calls.push('beginPath'),
    arc: () => calls.push('arc'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    quadraticCurveTo: () => calls.push('quadraticCurveTo'),
    closePath: () => calls.push('closePath'),
    fill: () => {
      calls.push('fill');
      fillStyles.push(ctx.fillStyle);
    },
    stroke: () => {
      calls.push('stroke');
      strokeStyles.push(ctx.strokeStyle);
    },
    fillText: () => calls.push('fillText'),
    setLineDash: (d) => {
      calls.push('setLineDash');
      lineDashes.push(d);
    },
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'round'
  };
  return ctx;
}

// 6A: Aposematic Creature (warningLevel > 0.35) renders yellow and black warning bands
const aposematicCreature = new Creature(100, 100, new Genome({
  armor: 0.9,
  bravery: 0.9,
  chromatophore: 0.7
}));
assert(aposematicCreature.aposematicWarningLevel > 0.35, 'Creature exceeds warning level threshold 0.35');
const mockCtxA = createMockContext();
aposematicCreature.draw(mockCtxA);
assert(mockCtxA.strokeStyles.includes('#facc15'), 'Aposematic warning band renders high-contrast yellow #facc15');
assert(mockCtxA.strokeStyles.includes('#09090b'), 'Aposematic warning band renders obsidian black #09090b');
assert(mockCtxA.lineDashes.length >= 2, 'Aposematic warning bands use setLineDash for dashed stripes');
assert(mockCtxA.fillStyles.includes(aposematicCreature.effectiveColorCss), 'Body fill uses effectiveColorCss when chromatophore > 0.05');

// 6B: Non-aposematic Creature does NOT render warning bands
const nonAposematicCreature = new Creature(100, 100, new Genome({
  armor: 0.1,
  bravery: 0.1,
  camouflage: 0.1,
  chromatophore: 0.0
}));
assert(nonAposematicCreature.aposematicWarningLevel <= 0.35, 'Creature does not exceed warning level threshold 0.35');
const mockCtxB = createMockContext();
nonAposematicCreature.draw(mockCtxB);
assert(!mockCtxB.strokeStyles.includes('#facc15'), 'Non-aposematic creature does not render yellow warning band');
assert(!mockCtxB.strokeStyles.includes('#09090b'), 'Non-aposematic creature does not render black warning band');
assert(mockCtxB.fillStyles.includes(nonAposematicCreature.genome.color.bodyCss), 'Body fill uses genome color bodyCss when chromatophore <= 0.05');

console.log('--- Testing Task 5: Symbiosis Mutualism & Parasitic Leeches ---');

// 1. Parasite Properties Initialization & Attachment Validation
const hostA = new Creature(300, 300, new Genome({ size: 16, brainType: 'heuristic' }), 100);
const parasiteA = new Creature(300, 300, new Genome({ size: 5, symbiosis: 0.1, diet: 0.8, brainType: 'heuristic' }), 30);

assert(Array.isArray(hostA.attachedParasites), 'Host initializes attachedParasites array');
assert(hostA.attachedParasites.length === 0, 'Host initially has 0 attached parasites');
assert(parasiteA.hostCreature === null, 'Parasite initially has null hostCreature');
assert(parasiteA.parasiteOffsetAngle === 0, 'Parasite initially has 0 offset angle');
assert(parasiteA.isParasite === true, 'isParasite returns true for symbiosis < 0.25, diet > 0.45, size < 7.0');

// Valid attachment
const attachSuccess = parasiteA.attachToHost(hostA);
assert(attachSuccess === true, 'attachToHost returns true for valid host');
assert(parasiteA.hostCreature === hostA, 'parasite.hostCreature points to host');
assert(hostA.attachedParasites.includes(parasiteA), 'host.attachedParasites includes parasite');
assert(parasiteA.parasiteOffsetAngle >= 0 && parasiteA.parasiteOffsetAngle <= Math.PI * 2, 'parasiteOffsetAngle assigned in [0, 2PI]');

// Cannot attach again if already attached
const hostB = new Creature(350, 350, new Genome({ size: 16 }), 100);
assert(parasiteA.attachToHost(hostB) === false, 'Cannot attach if already attached to a host');

// Cannot attach to self
assert(hostA.attachToHost(hostA) === false, 'Creature cannot attach to itself');

// Cannot attach to null or dead host
const deadHost = new Creature(300, 300, new Genome({ size: 16 }), 100);
deadHost.isAlive = false;
const parasiteB = new Creature(300, 300, new Genome({ size: 5 }), 30);
assert(parasiteB.attachToHost(null) === false, 'Cannot attach to null host');
assert(parasiteB.attachToHost(deadHost) === false, 'Cannot attach to dead host');

// Dead creature cannot attach
const deadParasite = new Creature(300, 300, new Genome({ size: 5 }), 30);
deadParasite.isAlive = false;
assert(deadParasite.attachToHost(hostB) === false, 'Dead creature cannot attach to host');

// Cannot attach if parasite is too large (size >= host.size * 0.80)
const largeCreature = new Creature(300, 300, new Genome({ size: 14 }), 50);
assert(largeCreature.attachToHost(hostB) === false, 'Cannot attach if size >= 0.80 of host size');

// 2. Position Synchronization with Host Movement
const syncHost = new Creature(200, 200, new Genome({ size: 12 }), 100);
syncHost.heading = 0;
syncHost.velocity.set(3, 4);

const syncParasite = new Creature(200, 200, new Genome({ size: 4 }), 40);
syncParasite.attachToHost(syncHost);
syncParasite.parasiteOffsetAngle = 0; // Fix angle for deterministic verification

syncParasite.update(0.1, null);

const expectedRadius = syncHost.radius + syncParasite.radius * 0.5;
assertApprox(syncParasite.position.x, syncHost.position.x + expectedRadius, 1e-4, 'Parasite x synchronized to host position and offset');
assertApprox(syncParasite.position.y, syncHost.position.y, 1e-4, 'Parasite y synchronized to host position and offset');
assertApprox(syncParasite.velocity.x, 3, 1e-4, 'Parasite velocity.x synchronized to host');
assertApprox(syncParasite.velocity.y, 4, 1e-4, 'Parasite velocity.y synchronized to host');

// 3. Energy Drain and Siphon Transfer over update()
const drainHost = new Creature(400, 400, new Genome({ size: 16 }), 100);
const drainParasite = new Creature(400, 400, new Genome({ size: 5, symbiosis: 0.1, diet: 0.8 }), 20);
drainParasite.attachToHost(drainHost);

const hostInitialEnergy = drainHost.energy;
const parasiteInitialEnergy = drainParasite.energy;
const dtStep = 0.5;

// Run 1 frame
drainParasite.update(dtStep, null);
assertApprox(drainHost.energy, hostInitialEnergy - 2.0 * dtStep, 1e-4, 'Host energy drained by 2.0 * dt in single update');
assert(drainParasite.energy > parasiteInitialEnergy, 'Parasite gained net energy from siphoning');

// Run 9 more frames (total 10 frames = 5 seconds)
for (let i = 0; i < 9; i++) {
  drainParasite.update(dtStep, null);
}
assertApprox(drainHost.energy, hostInitialEnergy - 10.0, 1e-3, 'Host energy accurately reduced by 10.0 over 5.0s of latching');
assert(drainParasite.energy > parasiteInitialEnergy + 5.0, 'Parasite accumulated significant siphoned energy');

// 4. Detach stops energy drain
const energyBeforeDetachHost = drainHost.energy;
drainParasite.detachFromHost();
assert(drainParasite.hostCreature === null, 'detachFromHost clears hostCreature');
assert(!drainHost.attachedParasites.includes(drainParasite), 'Host attachedParasites no longer contains detached parasite');

drainParasite.update(dtStep, null);
assertApprox(drainHost.energy, energyBeforeDetachHost, 1e-4, 'Host energy unchanged after parasite detachment');

// 5. Host Death Detaches All Parasites Safely
const dyingHost = new Creature(500, 500, new Genome({ size: 18 }), 50);
const p1 = new Creature(500, 500, new Genome({ size: 4 }), 30);
const p2 = new Creature(500, 500, new Genome({ size: 5 }), 30);
p1.attachToHost(dyingHost);
p2.attachToHost(dyingHost);
assert(dyingHost.attachedParasites.length === 2, 'Host has 2 attached parasites');

dyingHost.die('starvation');
assert(!dyingHost.isAlive, 'Host is deceased');
assert(dyingHost.attachedParasites.length === 0, 'Host death clears all attachedParasites');
assert(p1.hostCreature === null, 'p1 detached on host demise');
assert(p2.hostCreature === null, 'p2 detached on host demise');

// Parasite death detaches from host
const hostC = new Creature(500, 500, new Genome({ size: 18 }), 80);
const p3 = new Creature(500, 500, new Genome({ size: 4 }), 20);
p3.attachToHost(hostC);
assert(hostC.attachedParasites.includes(p3), 'p3 attached to hostC');
p3.die('predation');
assert(p3.hostCreature === null, 'Dying parasite detaches from host');
assert(!hostC.attachedParasites.includes(p3), 'Host removes dead parasite from attachedParasites');

// 6. Cleaner Mutualism Grooms Parasite off Host
const mutualistHost = new Creature(600, 600, new Genome({ size: 18 }), 90);
const victimParasite = new Creature(600, 600, new Genome({ size: 4, symbiosis: 0.1, diet: 0.8 }), 20);
victimParasite.attachToHost(mutualistHost);

const cleaner = new Creature(600, 600, new Genome({ size: 7, symbiosis: 0.85, diet: 0.2 }), 40);
assert(cleaner.isCleaner === true, 'isCleaner returns true for symbiosis >= 0.6');

const cleanerInitialEnergy = cleaner.energy;
const gainedEnergy = cleaner.groomParasite(victimParasite);
const expectedGain = Math.min(25, 20 * 0.6 + 5); // 17

assertApprox(gainedEnergy, expectedGain, 1e-4, 'groomParasite returns exact energy reward');
assertApprox(cleaner.energy, cleanerInitialEnergy + expectedGain, 1e-4, 'Cleaner gains energy from grooming');
assert(victimParasite.hostCreature === null, 'Groomed parasite detached from host');
assert(!mutualistHost.attachedParasites.includes(victimParasite), 'Host attachedParasites cleared of groomed parasite');
assertApprox(victimParasite.energy, 20 - expectedGain, 1e-4, 'Parasite energy reduced by grooming damage');

// Grooming non-attached parasite returns 0
assert(cleaner.groomParasite(victimParasite) === 0, 'Grooming unattached parasite returns 0');

// 7. Predator Immunity for Cleaners
const predator = new Creature(100, 100, new Genome({ size: 16, diet: 0.9, sense: 120, brainType: 'neural' }), 200);
const cleanerPrey = new Creature(130, 100, new Genome({ size: 6, diet: 0.1, symbiosis: 0.8, brainType: 'heuristic' }), 40);
const standardPrey = new Creature(130, 100, new Genome({ size: 6, diet: 0.1, symbiosis: 0.2, brainType: 'heuristic' }), 40);

const cleanerPredGrid = new SpatialGrid(64, 1000, 1000);
cleanerPredGrid.insert(predator);
cleanerPredGrid.insert(cleanerPrey);

// Well-fed predator (energy 200 > maxEnergy * 0.25 = 104) ignores cleaner
predator.evaluateNeuralBehavior({ creatureGrid: cleanerPredGrid, worldWidth: 1000, worldHeight: 1000 });
assert(predator.currentTarget !== cleanerPrey, 'Well-fed neural predator does not target cleaner prey');

predator.brainType = 'heuristic';
predator.evaluateBehavior({ creatureGrid: cleanerPredGrid, worldWidth: 1000, worldHeight: 1000 });
assert(predator.currentTarget !== cleanerPrey, 'Well-fed heuristic predator does not target cleaner prey');

// Starving predator (energy = 10 < maxEnergy * 0.25) DOES target cleaner
predator.energy = 10;
predator.evaluateBehavior({ creatureGrid: cleanerPredGrid, worldWidth: 1000, worldHeight: 1000 });
assert(predator.currentTarget === cleanerPrey, 'Starving heuristic predator targets cleaner prey');

predator.brainType = 'neural';
predator.evaluateNeuralBehavior({ creatureGrid: cleanerPredGrid, worldWidth: 1000, worldHeight: 1000 });
assert(predator.currentTarget === cleanerPrey, 'Starving neural predator targets cleaner prey');

// 8. Contact Latching in update()
const contactGrid = new SpatialGrid(64, 1000, 1000);
const wildHost = new Creature(200, 200, new Genome({ size: 15, diet: 0.2 }), 80);
const huntingParasite = new Creature(205, 200, new Genome({ size: 5, symbiosis: 0.1, diet: 0.8 }), 40);
contactGrid.insert(wildHost);
contactGrid.insert(huntingParasite);

huntingParasite.update(0.1, { creatureGrid: contactGrid, worldWidth: 1000, worldHeight: 1000 });
assert(huntingParasite.hostCreature === wildHost, 'Unattached parasite latches onto host on contact in update()');
assert(wildHost.attachedParasites.includes(huntingParasite), 'Host records latching parasite on contact');

// 9. Contact Grooming in update()
const groomingGrid = new SpatialGrid(64, 1000, 1000);
const infestedHost = new Creature(300, 300, new Genome({ size: 16 }), 80);
const attachedLeech = new Creature(300, 300, new Genome({ size: 4, symbiosis: 0.1, diet: 0.8 }), 20);
attachedLeech.attachToHost(infestedHost);

const patrollingCleaner = new Creature(308, 300, new Genome({ size: 7, symbiosis: 0.85, diet: 0.2 }), 40);
groomingGrid.insert(infestedHost);
groomingGrid.insert(attachedLeech);
groomingGrid.insert(patrollingCleaner);

patrollingCleaner.update(0.1, { creatureGrid: groomingGrid, worldWidth: 1000, worldHeight: 1000 });
assert(infestedHost.attachedParasites.length === 0, 'Cleaner automatically grooms host on contact in update()');
assert(attachedLeech.hostCreature === null, 'Leech detached through automated contact grooming');

// 10. Canvas Draw Visuals for Parasite Tendrils & Host Distress
const drawHost = new Creature(100, 100, new Genome({ size: 15 }));
const drawParasite = new Creature(100, 100, new Genome({ size: 5 }));
drawParasite.attachToHost(drawHost);

const hostCtx = createMockContext();
drawHost.draw(hostCtx);
assert(hostCtx.fillStyles.includes('#ef4444'), 'Host with attached parasites renders red #ef4444 distress dots');

const parasiteCtx = createMockContext();
drawParasite.draw(parasiteCtx);
assert(parasiteCtx.strokeStyles.includes('#ef4444'), 'Latched parasite renders #ef4444 gripping tendrils/claws');
assert(parasiteCtx.fillStyles.includes('#b91c1c'), 'Latched parasite renders #b91c1c gripping claws');

console.log('--- Testing Task 6: Multicellular Colony Coordinator & Cellular Differentiation ---');

// 1. Colony Initialization & Creature Colony Properties
const cCell1 = new Creature(100, 100, new Genome({ size: 10, adhesion: 0.8 }));
const cCell2 = new Creature(110, 100, new Genome({ size: 10, adhesion: 0.8 }));

assert(cCell1.colony === null, 'Creature initializes colony as null');
assert(cCell1.colonyRole === null, 'Creature initializes colonyRole as null');
assert(cCell1.colonyAngleOffset === 0, 'Creature initializes colonyAngleOffset as 0');
assert(cCell1.colonyDistOffset === 0, 'Creature initializes colonyDistOffset as 0');
assert(cCell1.colonySpeedMultiplier === 1.0, 'Creature initializes colonySpeedMultiplier as 1.0');

const emptyColony = new Colony();
assert(typeof emptyColony.id === 'number' && emptyColony.id > 0, 'Colony generates positive numeric ID');
assert(Array.isArray(emptyColony.cells) && emptyColony.cells.length === 0, 'Colony initializes empty cells array');
assert(emptyColony.coreCell === null, 'Empty colony has null coreCell');
assert(emptyColony.speedMultiplier === 1.0, 'Empty colony has 1.0 speedMultiplier');

// 2. Colony Formation & Capacity Constraints (Max 6 Cells)
const testColony = new Colony([cCell1, cCell2]);
assert(testColony.cells.length === 2, 'Colony constructor adds initial cells');
assert(testColony.coreCell === cCell1, 'First cell assigned as coreCell');
assert(cCell1.colony === testColony, 'Core cell references colony');
assert(cCell2.colony === testColony, 'Member cell references colony');

// Cannot add creature already in a colony
assert(testColony.addCell(cCell1) === false, 'Cannot add creature already in this colony');
const otherCreature = new Creature(150, 150);
const otherCol = new Colony([otherCreature]);
assert(testColony.addCell(otherCreature) === false, 'Cannot add creature already in another colony');

// Fill colony to 6 cells
const cCell3 = new Creature(120, 100);
const cCell4 = new Creature(130, 100);
const cCell5 = new Creature(140, 100);
const cCell6 = new Creature(150, 100);
assert(testColony.addCell(cCell3) === true, 'Successfully added 3rd cell');
assert(testColony.addCell(cCell4) === true, 'Successfully added 4th cell');
assert(testColony.addCell(cCell5) === true, 'Successfully added 5th cell');
assert(testColony.addCell(cCell6) === true, 'Successfully added 6th cell');
assert(testColony.cells.length === 6, 'Colony holds exactly 6 cells');

// 7th cell rejected (capacity limit)
const cCell7 = new Creature(160, 100);
assert(testColony.addCell(cCell7) === false, 'addCell returns false when colony is at 6-cell capacity');
assert(testColony.cells.length === 6, 'Colony cell count remains 6');
assert(cCell7.colony === null, 'Rejected creature colony remains null');

// 3. Cellular Differentiation & Specialized Roles
assert(cCell1.colonyRole === 'mouth', 'Core cell assigned mouth role');
assert(cCell1.colonyAngleOffset === 0, 'Core mouth cell angle offset is 0');
assert(cCell1.colonyDistOffset === 0, 'Core mouth cell dist offset is 0');

assert(cCell2.colonyRole === 'motor', 'Member 1 assigned motor role');
assertApprox(cCell2.colonyAngleOffset, Math.PI, 1e-4, 'Member 1 angle offset is PI');
assertApprox(cCell2.colonyDistOffset, cCell1.radius * 1.8, 1e-4, 'Member 1 dist offset is coreCell.radius * 1.8');

assert(cCell3.colonyRole === 'armor', 'Member 2 assigned armor role');
assertApprox(cCell3.colonyAngleOffset, -Math.PI / 2, 1e-4, 'Member 2 angle offset is -PI/2');
assertApprox(cCell3.colonyDistOffset, cCell1.radius * 1.8, 1e-4, 'Member 2 dist offset is coreCell.radius * 1.8');

assert(cCell4.colonyRole === 'armor', 'Member 3 assigned armor role');
assertApprox(cCell4.colonyAngleOffset, Math.PI / 2, 1e-4, 'Member 3 angle offset is PI/2');
assertApprox(cCell4.colonyDistOffset, cCell1.radius * 1.8, 1e-4, 'Member 3 dist offset is coreCell.radius * 1.8');

assert(cCell5.colonyRole === 'motor', 'Member 4 assigned motor role');
assertApprox(cCell5.colonyAngleOffset, (3 * Math.PI) / 4, 1e-4, 'Member 4 angle offset is 3PI/4');
assertApprox(cCell5.colonyDistOffset, cCell1.radius * 2.2, 1e-4, 'Member 4 dist offset is coreCell.radius * 2.2');

assert(cCell6.colonyRole === 'motor', 'Member 5 assigned motor role');
assertApprox(cCell6.colonyAngleOffset, (-3 * Math.PI) / 4, 1e-4, 'Member 5 angle offset is -3PI/4');
assertApprox(cCell6.colonyDistOffset, cCell1.radius * 2.2, 1e-4, 'Member 5 dist offset is coreCell.radius * 2.2');

// 4. Energy Pooling
const poolCell1 = new Creature(200, 200, null, 120);
const poolCell2 = new Creature(200, 200, null, 80);
const poolCell3 = new Creature(200, 200, null, 40);
const poolColony = new Colony([poolCell1, poolCell2, poolCell3]);

assertApprox(poolCell1.energy + poolCell2.energy + poolCell3.energy, 240, 1e-4, 'Initial total energy is 240');
poolColony.update(0.1, null);
assertApprox(poolCell1.energy, 80.0, 1e-4, 'Cell 1 energy pooled to 80.0');
assertApprox(poolCell2.energy, 80.0, 1e-4, 'Cell 2 energy pooled to 80.0');
assertApprox(poolCell3.energy, 80.0, 1e-4, 'Cell 3 energy pooled to 80.0');

// 5. Coordinated Rigid Polar Locomotion & Steering Delegation
const steerCore = new Creature(300, 300, new Genome({ size: 10, speed: 3.0 }));
const steerMember = new Creature(300, 300, new Genome({ size: 8, speed: 2.0 }));
const steerColony = new Colony([steerCore, steerMember]);

// Member delegates steering to colony
const memberBehavior = steerMember.evaluateBehavior(null);
assert(memberBehavior.action === 'colony_member', 'Colony member delegates steering behavior');
assert(steerMember.state === 'colony_member', 'Colony member state set to colony_member');

// Polar lock alignment
steerCore.position.set(400, 400);
steerCore.heading = Math.PI / 2;
steerCore.velocity.set(0, 4);
steerColony.update(0.05, null);

const expectedMemberAngle = steerCore.heading + steerMember.colonyAngleOffset;
const expectedX = steerCore.position.x + Math.cos(expectedMemberAngle) * steerMember.colonyDistOffset;
const expectedY = steerCore.position.y + Math.sin(expectedMemberAngle) * steerMember.colonyDistOffset;

assertApprox(steerMember.position.x, expectedX, 1e-4, 'Member polar X locked to coreCell orientation');
assertApprox(steerMember.position.y, expectedY, 1e-4, 'Member polar Y locked to coreCell orientation');
assertApprox(steerMember.heading, steerCore.heading, 1e-4, 'Member heading locked to coreCell');
assertApprox(steerMember.velocity.x, steerCore.velocity.x, 1e-4, 'Member velocity X aligned with coreCell');
assertApprox(steerMember.velocity.y, steerCore.velocity.y, 1e-4, 'Member velocity Y aligned with coreCell');

// Member cell update does not drift autonomously
const posXBefore = steerMember.position.x;
const posYBefore = steerMember.position.y;
steerMember.update(0.05, null);
assertApprox(steerMember.position.x, posXBefore, 1e-4, 'Member cell skips autonomous physics in creature.update()');
assertApprox(steerMember.position.y, posYBefore, 1e-4, 'Member cell skips autonomous physics in creature.update()');

// 6. Motor Cell Speed Boost
// 2 cells = 1 motor cell -> 1.0 + 1 * 0.25 = 1.25
assertApprox(steerColony.speedMultiplier, 1.25, 1e-4, '1 motor cell provides 1.25x speed boost');
assertApprox(steerCore.colonySpeedMultiplier, 1.25, 1e-4, 'Core cell colonySpeedMultiplier set to 1.25');

// 6 cells = 3 motor cells (Cell 1, 4, 5) -> 1.0 + 3 * 0.25 = 1.75
testColony.update(0.05, null);
assertApprox(testColony.speedMultiplier, 1.75, 1e-4, '3 motor cells provide 1.75x speed boost');
assertApprox(cCell1.colonySpeedMultiplier, 1.75, 1e-4, 'Core cell colonySpeedMultiplier set to 1.75 with 3 motors');

// 7. Armor Cell Damage Reduction (60% Mitigation)
const unarmoredCreature = new Creature(500, 500, null, 100);
const dmgInflicted1 = unarmoredCreature.takeDamage(50);
assertApprox(dmgInflicted1, 50, 1e-4, 'Unarmored creature takes full 50 damage');
assertApprox(unarmoredCreature.energy, 50, 1e-4, 'Unarmored creature energy reduced by 50');

// Colony with 2 cells has mouth and motor, NO armor
const noArmorColony = new Colony([new Creature(100, 100, null, 100), new Creature(100, 100, null, 100)]);
const dmgInflicted2 = noArmorColony.cells[0].takeDamage(50);
assertApprox(dmgInflicted2, 50, 1e-4, 'Colony without armor cells takes full 50 damage');

// Colony with 3+ cells has armor cells
const armorCellTarget = testColony.cells[0];
const initialTargetEnergy = armorCellTarget.energy;
const dmgInflicted3 = armorCellTarget.takeDamage(50);
assertApprox(dmgInflicted3, 20, 1e-4, 'Armor cells mitigate 60% damage (50 -> 20)');
assertApprox(armorCellTarget.energy, initialTargetEnergy - 20, 1e-4, 'Armor protected creature energy reduced by only 20');

// Member cell also protected by colony armor
const memberTarget = testColony.cells[2];
const initialMemberEnergy = memberTarget.energy;
const dmgInflicted4 = memberTarget.takeDamage(40);
assertApprox(dmgInflicted4, 16, 1e-4, 'Colony member also receives 60% armor damage mitigation (40 -> 16)');
assertApprox(memberTarget.energy, initialMemberEnergy - 16, 1e-4, 'Colony member energy reduced by only 16');

// Fatal damage still kills protected creature
const dyingCell = new Creature(600, 600, null, 10);
const fatalColony = new Colony([new Creature(600, 600), new Creature(600, 600), dyingCell]);
dyingCell.takeDamage(100);
assert(!dyingCell.isAlive, 'Lethal damage through armor destroys creature');

// 8. Offshoot Splitting When Colony Saturated (cells >= 6 && totalEnergy > 800)
const splitColony = new Colony([
  new Creature(100, 100, null, 200),
  new Creature(100, 100, null, 200),
  new Creature(100, 100, null, 200),
  new Creature(100, 100, null, 200),
  new Creature(100, 100, null, 200),
  new Creature(100, 100, null, 200)
]);
assert(splitColony.cells.length === 6, 'Colony reaches 6 cells');
const offshootChild = splitColony.update(0.1, null);
assert(offshootChild !== null, 'Saturated colony (>800 energy, 6 cells) produces offshoot child');
assert(offshootChild.colony === null, 'Offshoot child colony reference cleared');
assert(offshootChild.colonyRole === null, 'Offshoot child colony role cleared');
assertApprox(offshootChild.energy, 50.0, 1e-4, 'Offshoot child granted 50 starting energy');
assert(splitColony.cells.length === 5, 'Colony cell count decremented to 5 after split');
assert(!splitColony.cells.includes(offshootChild), 'Colony no longer contains detached offshoot child');

// Manual splitOffshoot() method test
const manualOffshoot = splitColony.splitOffshoot();
assert(manualOffshoot !== null, 'splitOffshoot() returns detached creature');
assert(manualOffshoot.colony === null, 'manualOffshoot colony reference cleared');
assertApprox(manualOffshoot.energy, 50.0, 1e-4, 'manualOffshoot granted 50 starting energy');
assert(splitColony.cells.length === 4, 'Colony cell count decremented to 4');

// 9. Colony Dissolution & Core Reassignment
// A. Core cell demise reassigns largest living member
const reassignCol = new Colony([
  new Creature(100, 100, new Genome({ size: 8 })),
  new Creature(100, 100, new Genome({ size: 14 })),
  new Creature(100, 100, new Genome({ size: 11 }))
]);
const oldCore = reassignCol.coreCell;
assert(oldCore.genome.size === 8, 'Initial core cell is first cell added');
reassignCol.removeCell(oldCore);
assert(reassignCol.cells.length === 2, 'Colony maintains 2 remaining cells');
assert(reassignCol.coreCell.genome.size === 14, 'New coreCell reassigned to largest living cell (size 14)');
assert(reassignCol.coreCell.colonyRole === 'mouth', 'New core cell role set to mouth');

// B. Member demise in 2-cell colony triggers clean dissolution
const dissolveCell1 = new Creature(200, 200);
const dissolveCell2 = new Creature(200, 200);
const dissolveCol = new Colony([dissolveCell1, dissolveCell2]);
assert(dissolveCell1.colony === dissolveCol && dissolveCell2.colony === dissolveCol, 'Both cells in colony');

// Kill cell 2: onDeath removes it from colony
dissolveCell2.die('predation');
assert(dissolveCell2.colony === null, 'Dead cell colony cleared on death');
assert(dissolveCell1.colony === null, 'Survivor cell colony cleared on dissolution');
assert(dissolveCell1.colonyRole === null, 'Survivor cell colonyRole cleared on dissolution');
assert(dissolveCol.cells.length === 0, 'Dissolved colony has 0 cells');
assert(dissolveCol.coreCell === null, 'Dissolved colony coreCell is null');

// C. update() on single-cell colony dissolves cleanly
const orphanCell = new Creature(300, 300);
const singleCol = new Colony();
singleCol.cells.push(orphanCell);
orphanCell.colony = singleCol;
singleCol.coreCell = orphanCell;
assert(singleCol.update(0.1, null) === null, 'update() returns null on dissolution');
assert(orphanCell.colony === null, 'Orphan cell colony cleared by update()');
assert(singleCol.cells.length === 0, 'singleCol cells cleared by update()');

// 10. Canvas Rendering & Differentiated Role Badges
const renderColony = new Colony([
  new Creature(100, 100, new Genome({ size: 10 })),
  new Creature(100, 100, new Genome({ size: 10 })),
  new Creature(100, 100, new Genome({ size: 10 }))
]);
const colonyMockCtx = createMockContext();
renderColony.draw(colonyMockCtx);
assert(colonyMockCtx.strokeStyles.includes('rgba(56, 189, 248, 0.45)'), 'Renders cytoplasmic tether bridges rgba(56, 189, 248, 0.45)');
assert(colonyMockCtx.strokeStyles.includes('rgba(255, 255, 255, 0.6)'), 'Renders inner cytoplasmic canals');
assert(colonyMockCtx.strokeStyles.includes('rgba(244, 63, 94, 0.85)'), 'Renders mouth role badge ring rgba(244, 63, 94, 0.85)');
assert(colonyMockCtx.strokeStyles.includes('rgba(148, 163, 184, 0.7)'), 'Renders armor shield arc badge rgba(148, 163, 184, 0.7)');
assert(colonyMockCtx.strokeStyles.includes('rgba(56, 189, 248, 0.75)'), 'Renders motor flagella badge rgba(56, 189, 248, 0.75)');


console.log('--- Testing Piece 2: Creature Physics, Metabolism & AI ---');

const creature = new Creature(500, 500, herbGenome, 100);
creature.brainType = 'heuristic';

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

const predGenome = new Genome({ size: 14, speed: 3.5, sense: 120, diet: 0.9, bravery: 0.8, brainType: 'heuristic' });
const testPreyGenome = new Genome({ size: 6, speed: 2.0, sense: 80, diet: 0.1, bravery: 0.2, brainType: 'heuristic' });
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
  const trackedPheromone = world.pheromones[world.pheromones.length - 1];
  assert(world.pheromones.length > 0, 'Emitted food scent pheromone');
  assert(trackedPheromone.type === 'food', 'Pheromone has correct type');
  world.update(1.0);
  assert(trackedPheromone.strength < 1.0, 'Pheromone evaporates over time');

  // 9: Sexual Reproduction & Chromosomal Recombination
  const parentA = new Creature(100, 100, new Genome({ speed: 2.0, sense: 80, diet: 0.1, armor: 0.8, brainType: 'heuristic' }));
  const parentB = new Creature(105, 105, new Genome({ speed: 3.0, sense: 120, diet: 0.2, armor: 0.4, brainType: 'heuristic' }));
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

  console.log('--- Testing Task 3: Dual-Brain Multi-Frame World Integration ---');
  // Run 100 frames of simulation with mixed neural and heuristic creatures
  const mixedWorld = new World({
    width: 2000,
    height: 1500,
    initialHerbivores: 15,
    initialCarnivores: 5,
    initialOmnivores: 5,
    maxFood: 100
  });

  // Assign half to neural, half to heuristic
  for (let i = 0; i < mixedWorld.creatures.length; i++) {
    mixedWorld.creatures[i].brainType = (i % 2 === 0) ? 'neural' : 'heuristic';
  }

  // Advance simulation for 100 frames
  for (let f = 0; f < 100; f++) {
    mixedWorld.update(0.05);
  }

  assert(mixedWorld.creatures.length > 0, 'World maintains living population across 100 frames');
  let allFiniteState = true;
  for (const c of mixedWorld.creatures) {
    if (!Number.isFinite(c.position.x) || !Number.isFinite(c.position.y)) {
      console.log('FAIL position', c.position);
      allFiniteState = false;
    }
    if (!Number.isFinite(c.velocity.x) || !Number.isFinite(c.velocity.y)) {
      console.log('FAIL velocity', c.velocity);
      allFiniteState = false;
    }
    if (!Number.isFinite(c.energy) || c.energy < 0) {
      console.log('FAIL energy', c.energy);
      allFiniteState = false;
    }
    if (c.brainType === 'neural' && c.isAlive) {
      if (!c.lastNeuralInputs || !c.lastNeuralOutputs) {
        console.log('FAIL neural inputs/outputs', c.id, 'colony:', !!c.colony, 'isCore:', c.colony && c.colony.coreCell === c);
        allFiniteState = false;
      }
    }
  }
  assert(allFiniteState, 'All surviving creatures maintain finite physics and neural telemetry across 100 frames');
  assert(mixedWorld.creatures.some(c => c.brainType === 'neural'), 'Neural organisms active in mixed ecosystem');
  assert(mixedWorld.creatures.some(c => c.brainType === 'heuristic'), 'Heuristic organisms active in mixed ecosystem');

  // --- Task 6: Multicellular Colony World Integration ---
  console.log('--- Testing Task 6: Multicellular Colony World Integration ---');
  const colonyWorld = new World({
    width: 2000,
    height: 1500,
    initialHerbivores: 0,
    initialCarnivores: 0,
    initialOmnivores: 0,
    maxFood: 50
  });

  assert(Array.isArray(colonyWorld.colonies), 'World initializes colonies array');
  assert(colonyWorld.colonies.length === 0, 'World initially has 0 colonies');

  // A. Two conspecific cells with high adhesion colliding form a colony
  const adhA = new Creature(500, 500, new Genome({ adhesion: 0.8, size: 8, speciesId: 'sp_colony_test' }), 100);
  const adhB = new Creature(512, 500, new Genome({ adhesion: 0.8, size: 8, speciesId: 'sp_colony_test' }), 100);
  colonyWorld.creatures.push(adhA, adhB);
  colonyWorld.creatureGrid.insert(adhA);
  colonyWorld.creatureGrid.insert(adhB);

  colonyWorld.update(0.05);

  assert(colonyWorld.colonies.length === 1, 'World forms 1 colony from colliding high-adhesion conspecifics');
  assert(adhA.colony === colonyWorld.colonies[0], 'First creature joined world colony');
  assert(adhB.colony === colonyWorld.colonies[0], 'Second creature joined world colony');
  assert(colonyWorld.colonies[0].cells.length === 2, 'Colony contains both organisms');

  // B. Third conspecific colliding joins the existing colony
  const adhC = new Creature(adhA.position.x + 2, adhA.position.y + 2, new Genome({ adhesion: 0.7, size: 8, speciesId: 'sp_colony_test' }), 100);
  adhC.velocity.set(0, 0);
  colonyWorld.creatures.push(adhC);
  colonyWorld.creatureGrid.insert(adhC);

  colonyWorld.update(0.05);
  assert(colonyWorld.colonies.length === 1, 'Colony count remains 1 as member joins');
  assert(adhC.colony === colonyWorld.colonies[0], 'Third creature joined existing colony');
  assert(colonyWorld.colonies[0].cells.length === 3, 'Colony size expanded to 3');

  // C. Low adhesion organism does NOT form a colony
  const lowAdhA = new Creature(800, 800, new Genome({ adhesion: 0.2, size: 8, speciesId: 'sp_solo_test' }), 100);
  const lowAdhB = new Creature(808, 800, new Genome({ adhesion: 0.2, size: 8, speciesId: 'sp_solo_test' }), 100);
  colonyWorld.creatures.push(lowAdhA, lowAdhB);
  colonyWorld.creatureGrid.insert(lowAdhA);
  colonyWorld.creatureGrid.insert(lowAdhB);

  colonyWorld.update(0.05);
  assert(lowAdhA.colony === null, 'Low adhesion cell does not form colony');
  assert(lowAdhB.colony === null, 'Low adhesion cell does not form colony');

  // D. Different species with high adhesion do NOT form a colony
  const diffSpeciesA = new Creature(1000, 1000, new Genome({ adhesion: 0.9, size: 8, speciesId: 'sp_alpha' }), 100);
  const diffSpeciesB = new Creature(1008, 1000, new Genome({ adhesion: 0.9, size: 8, speciesId: 'sp_beta' }), 100);
  colonyWorld.creatures.push(diffSpeciesA, diffSpeciesB);
  colonyWorld.creatureGrid.insert(diffSpeciesA);
  colonyWorld.creatureGrid.insert(diffSpeciesB);

  colonyWorld.update(0.05);
  assert(diffSpeciesA.colony === null, 'Different species organism does not join alien colony');
  assert(diffSpeciesB.colony === null, 'Different species organism does not join alien colony');

  // E. Colony dissolution prunes from world.colonies
  adhB.die('predation');
  adhC.die('predation');
  colonyWorld.update(0.05);
  assert(colonyWorld.colonies.length === 0, 'Dissolved colony cleanly pruned from world.colonies');
  assert(adhA.colony === null, 'Survivor cell colony reference cleared in world');

  // F. drawWorldEffects renders colonies without error
  const renderColWorld = new World({ width: 1000, height: 1000, initialHerbivores: 0, initialCarnivores: 0, initialOmnivores: 0 });
  const wCell1 = new Creature(200, 200, new Genome({ size: 10, adhesion: 0.8, speciesId: 'sp_draw' }));
  const wCell2 = new Creature(210, 200, new Genome({ size: 10, adhesion: 0.8, speciesId: 'sp_draw' }));
  renderColWorld.creatures.push(wCell1, wCell2);
  renderColWorld.update(0.05);
  const wMockCtx = createMockContext();
  renderColWorld.drawWorldEffects(wMockCtx);
  assert(wMockCtx.strokeStyles.includes('rgba(56, 189, 248, 0.45)'), 'drawWorldEffects successfully renders active colony bridges');

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

  console.log('--- Testing Task 7: Live Neural Network Visualizer ---');

  // 1. Null-safety & Labels Verification
  const nullViz = new NeuralVisualizer(null);
  assert(nullViz.canvas === null && nullViz.ctx === null, 'NeuralVisualizer handles null canvas safely');
  nullViz.render(new NeuralBrain(), 'neural');
  nullViz.render(null, 'heuristic');
  assert(Array.isArray(nullViz.INPUT_LABELS) && nullViz.INPUT_LABELS.length === 10, 'NeuralVisualizer defines 10 INPUT_LABELS');
  assert(Array.isArray(nullViz.OUTPUT_LABELS) && nullViz.OUTPUT_LABELS.length === 4, 'NeuralVisualizer defines 4 OUTPUT_LABELS');
  assert(INPUT_LABELS[0] === 'Food Dist' && INPUT_LABELS[9] === 'Solar', 'INPUT_LABELS match sensory specification');
  assert(OUTPUT_LABELS[0] === 'Steer' && OUTPUT_LABELS[3] === 'Attack', 'OUTPUT_LABELS match motor specification');

  // Helper to create mock canvas for NeuralVisualizer
  function createVizMockCanvas(width = 268, height = 165) {
    const texts = [];
    const strokeStyles = [];
    const fillStyles = [];
    const arcs = [];
    let lineToCount = 0;

    const ctx = {
      texts,
      strokeStyles,
      fillStyles,
      arcs,
      get lineToCount() { return lineToCount; },
      clearRect: () => {},
      fillRect: () => { fillStyles.push(ctx.fillStyle); },
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => { lineToCount++; },
      arc: (x, y, r) => { arcs.push({ x, y, r }); },
      fill: () => { fillStyles.push(ctx.fillStyle); },
      stroke: () => { strokeStyles.push(ctx.strokeStyle); },
      fillText: (text) => { texts.push(text); },
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: ''
    };

    return {
      width,
      height,
      getContext: () => ctx,
      ctx
    };
  }

  // 2. Heuristic Mode & Null Brain Rendering
  const heurMockCanvas = createVizMockCanvas();
  const heurViz = new NeuralVisualizer(heurMockCanvas);
  heurViz.render(new NeuralBrain(), 'heuristic');
  assert(heurMockCanvas.ctx.texts.includes('Heuristic Rule Brain'), 'Heuristic mode renders Heuristic Rule Brain title');
  assert(heurMockCanvas.ctx.texts.includes('Click Brain badge to switch to Neural'), 'Heuristic mode renders toggle subtitle');
  assert(heurMockCanvas.ctx.lineToCount === 0, 'Heuristic mode does not draw synaptic weight lines');

  const nullBrainCanvas = createVizMockCanvas();
  const nullBrainViz = new NeuralVisualizer(nullBrainCanvas);
  nullBrainViz.render(null, 'neural');
  assert(nullBrainCanvas.ctx.texts.includes('Heuristic Rule Brain'), 'Null brain in neural mode falls back cleanly to heuristic message');

  // 3. Live Neural Mode Rendering (10->8->4 Topology, Synapses, Nodes & Labels)
  const neuralMockCanvas = createVizMockCanvas();
  const neuralViz = new NeuralVisualizer(neuralMockCanvas);
  const vizBrain = new NeuralBrain();
  // Set explicit positive and negative weights to verify emerald green and coral red synapses
  vizBrain.weights[0] = 2.0;   // positive W1 synapse
  vizBrain.weights[1] = -2.0;  // negative W1 synapse
  vizBrain.weights[88] = 1.8;  // positive W2 synapse
  vizBrain.weights[89] = -1.8; // negative W2 synapse
  // Run forward pass with active inputs
  vizBrain.forward(new Float32Array([0.8, -0.6, 0.9, 0.4, -0.5, 0.2, 0.1, 0.75, 0.3, 0.9]));

  neuralViz.render(vizBrain, 'neural');

  // 80 W1 lines + 32 W2 lines = 112 synaptic lines
  assert(neuralMockCanvas.ctx.lineToCount === 112, `NeuralVisualizer draws all 112 synaptic connections (got ${neuralMockCanvas.ctx.lineToCount})`);
  assert(neuralMockCanvas.ctx.strokeStyles.some(s => s.startsWith('rgba(74, 222, 128,')), 'Positive weights rendered in emerald green rgba(74, 222, 128, ...)');
  assert(neuralMockCanvas.ctx.strokeStyles.some(s => s.startsWith('rgba(248, 113, 113,')), 'Negative weights rendered in coral red rgba(248, 113, 113, ...)');

  // 10 input + 8 hidden + 4 output = 22 core nodes of radius 4.5
  const coreNodes = neuralMockCanvas.ctx.arcs.filter(a => Math.abs(a.r - 4.5) < 1e-4);
  assert(coreNodes.length === 22, `NeuralVisualizer draws 22 core neuron nodes of radius 4.5 (got ${coreNodes.length})`);

  // Verify input and output labels rendered
  for (const inLabel of INPUT_LABELS) {
    assert(neuralMockCanvas.ctx.texts.includes(inLabel), `NeuralVisualizer rendered input label "${inLabel}"`);
  }
  for (const outLabel of OUTPUT_LABELS) {
    assert(neuralMockCanvas.ctx.texts.some(t => t.startsWith(outLabel)), `NeuralVisualizer rendered output label "${outLabel}" with numeric readout`);
  }

  console.log('--- Testing Task 8: Species Arena Battle Royale Tournament Mode ---');

  // 1. Arena Initialization & Default Configuration
  const arenaWorld = new World({
    width: 2800,
    height: 1800,
    initialHerbivores: 20,
    initialCarnivores: 8,
    initialOmnivores: 6,
    maxFood: 180
  });
  arenaWorld.time = 42.5;
  arenaWorld.temperature = 26.0;
  arenaWorld.climateState = 'heatwave';

  const arena = new ArenaTournament(arenaWorld);
  assert(arena.world === arenaWorld, 'ArenaTournament references world instance');
  assertApprox(arena.centerX, 1400, 1e-4, 'Arena centerX defaults to world.width / 2 (1400)');
  assertApprox(arena.centerY, 900, 1e-4, 'Arena centerY defaults to world.height / 2 (900)');
  assert(arena.initialRadius === 1200, 'Arena initialRadius defaults to 1200');
  assert(arena.minRadius === 80, 'Arena minRadius defaults to 80');
  assert(arena.duration === 90, 'Arena duration defaults to 90s');
  assert(arena.radiationDamagePerSec === 25, 'Arena radiationDamagePerSec defaults to 25');
  assert(arena.isActive === false && arena.isComplete === false, 'Arena starts inactive and incomplete');

  // 2. Sandbox Snapshot & Tournament Start
  const preArenaCreatureCount = arenaWorld.creatures.length;
  const preArenaFirstCreature = arenaWorld.creatures[0];
  const preArenaFoodCount = arenaWorld.foodManager.foodList.length;
  const preArenaTime = arenaWorld.time;
  const preArenaTemp = arenaWorld.temperature;
  const preArenaClimate = arenaWorld.climateState;
  const preArenaSpeciesSize = arenaWorld.speciesRegistry.size;

  arena.start();
  assert(arena.isActive === true, 'arena.start() activates tournament');
  assert(arena.isComplete === false, 'arena.start() sets isComplete to false');
  assert(arena.winner === null, 'arena.start() resets winner to null');
  assert(arena.worldSnapshot !== null, 'arena.start() snapshots original sandbox state');
  assert(arena.competingClades.length === 4, `Arena spawns 4 competing clades (got ${arena.competingClades.length})`);
  assert(arenaWorld.creatures.length === 40, `Arena spawns 40 total combatants (4 clades x 10, got ${arenaWorld.creatures.length})`);

  // Verify symmetric ring sector placement within initialRadius * 0.55 + jitter
  let allInsideInitialStorm = true;
  for (const c of arenaWorld.creatures) {
    const distFromCenter = Math.hypot(c.position.x - arena.centerX, c.position.y - arena.centerY);
    if (distFromCenter > arena.initialRadius) {
      allInsideInitialStorm = false;
    }
  }
  assert(allInsideInitialStorm, 'All arena combatants spawn safely inside initial storm ring');

  // 3. Storm Ring Contraction (1200 -> 80 over 90s)
  // Prevent victory during contraction test by keeping all creatures alive inside center
  for (const c of arenaWorld.creatures) {
    c.position.set(arena.centerX, arena.centerY);
    c.energy = 500;
  }

  arena.update(45); // 50% duration (45s / 90s)
  // Expected midpoint radius: 1200 - (1200 - 80) * 0.5 = 1200 - 560 = 640
  assertApprox(arena.stormRadius, 640, 1e-3, 'Storm radius contracts linearly to 640px at t=45s (50%)');

  arena.update(45); // 100% duration (90s / 90s)
  assertApprox(arena.stormRadius, 80, 1e-3, 'Storm radius reaches minRadius 80px at t=90s (100%)');

  arena.update(20); // Beyond 90s clamps at minRadius 80
  assertApprox(arena.stormRadius, 80, 1e-3, 'Storm radius clamps at minRadius 80px after duration');

  // 4. Out-of-Bounds Radiation Damage (25 cal/s) & Elimination
  const testVictim = arenaWorld.creatures[0];
  const safeFighter = arenaWorld.creatures[1];
  // Place testVictim outside storm ring (stormRadius is 80, place at distance 300)
  testVictim.position.set(arena.centerX + 300, arena.centerY);
  testVictim.energy = 40;
  // Place safeFighter at center (distance 0 <= 80)
  safeFighter.position.set(arena.centerX, arena.centerY);
  safeFighter.energy = 100;

  arena.update(1.0); // 1 second of 25 cal/s radiation
  assertApprox(testVictim.energy, 15, 1e-3, 'Creature outside storm ring takes 25 cal/s radiation damage (40 -> 15)');
  assert(testVictim.isAlive === true, 'Creature with remaining energy survives radiation tick');
  assertApprox(safeFighter.energy, 100, 1e-3, 'Creature inside storm ring takes 0 radiation damage');

  arena.update(1.0); // Second tick: 15 - 25 = -10 <= 0 -> lethal radiation death
  assert(testVictim.isAlive === false, 'Creature outside storm ring dies when radiation depletes energy <= 0');
  assert(testVictim.causeOfDeath === 'disaster', 'Radiation elimination sets causeOfDeath to disaster');

  // 5. Clade Survival Leaderboard & Champion Detection
  const championCladeId = arena.competingClades[0].speciesId;
  for (const c of arenaWorld.creatures) {
    if (c.genome.speciesId === championCladeId) {
      c.isAlive = true;
      c.energy = 150;
      c.kills = 2;
      c.position.set(arena.centerX, arena.centerY);
    } else {
      c.die('predation');
    }
  }

  const finalState = arena.update(0.5);
  assert(finalState.isComplete === true && arena.isComplete === true, 'Tournament completes when only 1 surviving clade remains');
  assert(finalState.winner !== null && finalState.winner.speciesId === championCladeId, `Last surviving clade crowned champion (${championCladeId})`);
  assert(finalState.leaderboard[0].speciesId === championCladeId, 'Champion clade ranked #1 on leaderboard');
  assert(finalState.leaderboard[0].aliveCount > 0, 'Champion clade has positive aliveCount');
  assert(finalState.leaderboard[0].kills > 0, 'Champion clade tracks aggregate kills');

  // 6. Canvas Rendering of Storm Ring
  const arenaMockCtx = createMockContext();
  arena.draw(arenaMockCtx);
  assert(arenaMockCtx.strokeStyles.includes('#f43f5e'), 'arena.draw(ctx) renders primary #f43f5e storm border');
  assert(arenaMockCtx.strokeStyles.includes('#c084fc'), 'arena.draw(ctx) renders secondary #c084fc electrical ring');

  // 7. World State Restoration via stop()
  arena.stop();
  assert(arena.isActive === false, 'arena.stop() deactivates arena mode');
  assert(arena.isComplete === false, 'arena.stop() resets isComplete');
  assert(arena.winner === null, 'arena.stop() clears winner');
  assert(arena.worldSnapshot === null, 'arena.stop() clears snapshot after restoring');
  assert(arenaWorld.creatures.length === preArenaCreatureCount, `Restored exact sandbox creature count (${arenaWorld.creatures.length} === ${preArenaCreatureCount})`);
  assert(arenaWorld.creatures[0] === preArenaFirstCreature, 'Restored exact sandbox creature instances');
  assert(arenaWorld.foodManager.foodList.length === preArenaFoodCount, `Restored exact sandbox food count (${arenaWorld.foodManager.foodList.length} === ${preArenaFoodCount})`);
  assertApprox(arenaWorld.time, preArenaTime, 1e-4, 'Restored exact sandbox simulation time');
  assertApprox(arenaWorld.temperature, preArenaTemp, 1e-4, 'Restored exact sandbox temperature');
  assert(arenaWorld.climateState === preArenaClimate, 'Restored exact sandbox climateState');
  assert(arenaWorld.speciesRegistry.size === preArenaSpeciesSize, 'Restored exact sandbox speciesRegistry');

  console.log('--- Testing Task 9: Cloudflare Pages Build Pipeline & Production Packaging ---');
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(testDir, '..');

  // 1. Verify wrangler.toml
  const wranglerPath = path.join(rootDir, 'wrangler.toml');
  assert(fs.existsSync(wranglerPath), 'wrangler.toml exists at repository root');
  const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
  assert(wranglerContent.includes('name = "artificial-life-simulator"'), 'wrangler.toml configures name = "artificial-life-simulator"');
  assert(wranglerContent.includes('compatibility_date = "2025-01-01"'), 'wrangler.toml configures compatibility_date = "2025-01-01"');
  assert(wranglerContent.includes('pages_build_output_dir = "dist"'), 'wrangler.toml configures pages_build_output_dir = "dist"');

  // 2. Verify package.json scripts
  const pkgPath = path.join(rootDir, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert(pkgJson.scripts && pkgJson.scripts.deploy === 'npx wrangler pages deploy dist --project-name artificial-life-simulator', 'package.json includes Cloudflare Pages deploy script');
  assert(pkgJson.scripts && pkgJson.scripts.build === 'node scripts/build_standalone.js', 'package.json includes build script');

  // 3. Verify dist/index.html and root index.html
  const rootIndexPath = path.join(rootDir, 'index.html');
  const distIndexPath = path.join(rootDir, 'dist', 'index.html');
  assert(fs.existsSync(rootIndexPath), 'Root index.html exists');
  assert(fs.existsSync(distIndexPath), 'dist/index.html exists');
  const rootIndexContent = fs.readFileSync(rootIndexPath, 'utf8');
  const distIndexContent = fs.readFileSync(distIndexPath, 'utf8');
  assert(distIndexContent.length > 1000, 'dist/index.html is non-empty');
  assert(distIndexContent === rootIndexContent, 'dist/index.html matches root index.html');
  assert(distIndexContent.includes('class NeuralBrain'), 'dist/index.html bundles NeuralBrain');
  assert(distIndexContent.includes('class Colony'), 'dist/index.html bundles Colony');
  assert(distIndexContent.includes('class NeuralVisualizer'), 'dist/index.html bundles NeuralVisualizer');
  assert(distIndexContent.includes('class ArenaTournament'), 'dist/index.html bundles ArenaTournament');

  // 4. Verify dist/_headers
  const distHeadersPath = path.join(rootDir, 'dist', '_headers');
  assert(fs.existsSync(distHeadersPath), 'dist/_headers exists');
  const distHeadersContent = fs.readFileSync(distHeadersPath, 'utf8');
  assert(distHeadersContent.includes('X-Frame-Options: DENY'), 'dist/_headers configures X-Frame-Options: DENY');
  assert(distHeadersContent.includes('X-Content-Type-Options: nosniff'), 'dist/_headers configures X-Content-Type-Options: nosniff');
  assert(distHeadersContent.includes('Referrer-Policy: strict-origin-when-cross-origin'), 'dist/_headers configures Referrer-Policy');
  assert(distHeadersContent.includes('Cache-Control: public, max-age=3600'), 'dist/_headers configures Cache-Control');

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('ALL SIMULATION UNIT & INTEGRATION TESTS PASSED PERFECTLY!');
  }
});
