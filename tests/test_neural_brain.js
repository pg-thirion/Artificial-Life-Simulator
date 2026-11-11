/**
 * Neural Brain Unit Tests
 * Validates Perceptron matrix math, activation bounds, weight mutation,
 * sexual crossover, and state caching.
 */

import { NeuralBrain, BRAIN_CONFIG } from '../src/neuralBrain.js';

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

console.log('--- Testing NeuralBrain: Configuration & Instantiation ---');

assert(BRAIN_CONFIG.TOTAL_WEIGHTS === 124, 'Total weights config equals 124');
assert(BRAIN_CONFIG.INPUT_SIZE === 10, 'Input size config equals 10');
assert(BRAIN_CONFIG.HIDDEN_SIZE === 8, 'Hidden size config equals 8');
assert(BRAIN_CONFIG.OUTPUT_SIZE === 4, 'Output size config equals 4');

const brain = new NeuralBrain();
assert(brain.weights instanceof Float32Array, 'Weights is Float32Array');
assert(brain.weights.length === 124, 'Default weights length is 124');
assert(brain.activations !== undefined, 'Activations object exists');
assert(brain.activations.input.length === 10, 'Input activations buffer length 10');
assert(brain.activations.hidden.length === 8, 'Hidden activations buffer length 8');
assert(brain.activations.output.length === 4, 'Output activations buffer length 4');

// Weight initialization bounds
let allInitInRange = true;
for (let i = 0; i < brain.weights.length; i++) {
  if (brain.weights[i] < -1.0001 || brain.weights[i] > 1.0001) {
    allInitInRange = false;
    break;
  }
}
assert(allInitInRange, 'Initial random weights within [-1.0, 1.0]');

console.log('--- Testing NeuralBrain: Deterministic Forward Pass ---');

// Zero-weights test
const zeroWeights = new Float32Array(124);
const zeroBrain = new NeuralBrain(zeroWeights);
const zeroInput = new Float32Array(10);
const outZero = zeroBrain.forward(zeroInput);

assertApprox(outZero[0], 0.0, 1e-4, 'Zero weights -> steerAngleDelta is 0 (tanh(0) * PI)');
assertApprox(outZero[1], 0.5, 1e-4, 'Zero weights -> thrustMagnitude is 0.5 (sigmoid(0))');
assertApprox(outZero[2], 0.5, 1e-4, 'Zero weights -> courtshipDesire is 0.5 (sigmoid(0))');
assertApprox(outZero[3], 0.5, 1e-4, 'Zero weights -> aggressionImpulse is 0.5 (sigmoid(0))');

// Cached activations check
assert(zeroBrain.activations.output[0] === outZero[0], 'Activations output[0] cached');
assert(zeroBrain.activations.output[1] === outZero[1], 'Activations output[1] cached');
assert(zeroBrain.activations.output[2] === outZero[2], 'Activations output[2] cached');
assert(zeroBrain.activations.output[3] === outZero[3], 'Activations output[3] cached');

// Hand-crafted single connection test
// Test input 0 -> hidden 0 -> output 0
const customWeights = new Float32Array(124);
// W1[hidden 0, input 0] = weights[0] = 2.0
customWeights[0] = 2.0;
// B1[hidden 0] = weights[80] = 0.5
customWeights[80] = 0.5;
// W2[output 0, hidden 0] = weights[88 + 0*8 + 0] = weights[88] = 1.5
customWeights[88] = 1.5;
// B2[output 0] = weights[120] = -0.3
customWeights[120] = -0.3;

const testBrain = new NeuralBrain(customWeights);
const testInputs = new Float32Array(10);
testInputs[0] = 0.5;

// Expected:
// z_h0 = 0.5 + 2.0 * 0.5 = 1.5
// a_h0 = tanh(1.5)
const expected_h0 = Math.tanh(1.5);
// z_out0 = -0.3 + 1.5 * expected_h0
const expected_z_out0 = -0.3 + 1.5 * expected_h0;
const expected_out0 = Math.tanh(expected_z_out0) * Math.PI;

const outCustom = testBrain.forward(testInputs);
assertApprox(testBrain.activations.hidden[0], expected_h0, 1e-4, 'Hidden node 0 activation matches manual tanh');
assertApprox(outCustom[0], expected_out0, 1e-4, 'Output 0 steer angle matches manual calculation');

console.log('--- Testing NeuralBrain: Boundary Clamping & Safety ---');

// Test extreme positive saturation
const satPosWeights = new Float32Array(124).fill(5.0);
const satBrainPos = new NeuralBrain(satPosWeights);
const satInputsPos = new Float32Array(10).fill(100.0);
const outPos = satBrainPos.forward(satInputsPos);

assert(outPos[0] <= Math.PI + 1e-5 && outPos[0] >= -Math.PI - 1e-5, 'Extreme positive steerAngleDelta within [-PI, PI]');
assert(outPos[1] >= 0.0 && outPos[1] <= 1.0, 'Extreme positive thrustMagnitude within [0, 1]');
assert(outPos[2] >= 0.0 && outPos[2] <= 1.0, 'Extreme positive courtshipDesire within [0, 1]');
assert(outPos[3] >= 0.0 && outPos[3] <= 1.0, 'Extreme positive aggressionImpulse within [0, 1]');
assert(!isNaN(outPos[0]) && !isNaN(outPos[1]), 'No NaN in extreme positive outputs');

// Test extreme negative saturation
const satNegWeights = new Float32Array(124).fill(-5.0);
const satBrainNeg = new NeuralBrain(satNegWeights);
const satInputsNeg = new Float32Array(10).fill(-100.0);
const outNeg = satBrainNeg.forward(satInputsNeg);

assert(outNeg[0] <= Math.PI + 1e-5 && outNeg[0] >= -Math.PI - 1e-5, 'Extreme negative steerAngleDelta within [-PI, PI]');
assert(outNeg[1] >= 0.0 && outNeg[1] <= 1.0, 'Extreme negative thrustMagnitude within [0, 1]');
assert(outNeg[2] >= 0.0 && outNeg[2] <= 1.0, 'Extreme negative courtshipDesire within [0, 1]');
assert(outNeg[3] >= 0.0 && outNeg[3] <= 1.0, 'Extreme negative aggressionImpulse within [0, 1]');
assert(!isNaN(outNeg[0]) && !isNaN(outNeg[1]), 'No NaN in extreme negative outputs');

console.log('--- Testing NeuralBrain: Mutation ---');

const baseWeights = new Float32Array(124).fill(1.0);
const mutated = NeuralBrain.mutateWeights(baseWeights, 0.2);

assert(mutated instanceof Float32Array, 'Mutated weights is Float32Array');
assert(mutated.length === 124, 'Mutated weights has length 124');
assert(baseWeights[0] === 1.0, 'Base weights array is immutable / unchanged');

let hasDiff = false;
let mutatedAllInBounds = true;
for (let i = 0; i < 124; i++) {
  if (mutated[i] !== baseWeights[i]) hasDiff = true;
  if (mutated[i] < -5.0 || mutated[i] > 5.0) mutatedAllInBounds = false;
}
assert(hasDiff, 'Mutation perturbed at least one weight');
assert(mutatedAllInBounds, 'All mutated weights clamped in [-5.0, 5.0]');

// Test sign flip check over many mutations
let signFlipped = false;
for (let trial = 0; trial < 100; trial++) {
  const m = NeuralBrain.mutateWeights(new Float32Array(124).fill(2.0), 1.0);
  for (let i = 0; i < 124; i++) {
    if (m[i] < 0) {
      signFlipped = true;
      break;
    }
  }
  if (signFlipped) break;
}
assert(signFlipped, '5% sign flip triggers under high mutation rate');

console.log('--- Testing NeuralBrain: Crossover ---');

const pA = new Float32Array(124).fill(-2.0);
const pB = new Float32Array(124).fill(3.0);
const child = NeuralBrain.crossoverWeights(pA, pB);

assert(child instanceof Float32Array, 'Crossover child is Float32Array');
assert(child.length === 124, 'Crossover child has length 124');

let hasA = false;
let hasB = false;
let childInBounds = true;

for (let i = 0; i < 124; i++) {
  if (child[i] === -2.0) hasA = true;
  if (child[i] === 3.0) hasB = true;
  if (child[i] < -5.0 || child[i] > 5.0) childInBounds = false;
}

assert(hasA || hasB, 'Child inherited genes from parent A or parent B');
assert(childInBounds, 'Child weights within [-5.0, 5.0]');

console.log(`\nNeural Brain Tests: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL NEURAL BRAIN UNIT TESTS PASSED!');
}
