/**
 * Artificial Life Simulator - Neural Brain & Perceptron Engine
 * Zero-dependency feedforward perceptron: 10 inputs -> 8 hidden (tanh) -> 4 outputs.
 * Total parameters: exactly 124 weights stored as Float32Array(124).
 * Caches live activations for visualizer inspection and telemetry.
 */

import { clamp, randomFloat, randomGaussian } from './math.js';

export const BRAIN_CONFIG = Object.freeze({
  INPUT_SIZE: 10,
  HIDDEN_SIZE: 8,
  OUTPUT_SIZE: 4,
  TOTAL_WEIGHTS: 124, // W1 (80) + B1 (8) + W2 (32) + B2 (4)
  W1_OFFSET: 0,       // 0..79
  B1_OFFSET: 80,      // 80..87
  W2_OFFSET: 88,      // 88..119
  B2_OFFSET: 120,     // 120..123
  MUTATION_RATE: 0.06,
  WEIGHT_MIN: -5.0,
  WEIGHT_MAX: 5.0,
  INIT_WEIGHT_MIN: -1.0,
  INIT_WEIGHT_MAX: 1.0,
  INPUT_LABELS: [
    'nearestFoodDist',
    'nearestFoodAngle',
    'nearestFoodDangerSignal',
    'nearestThreatDist',
    'nearestThreatAngle',
    'nearestMateDist',
    'nearestMateAngle',
    'energyRatio',
    'biomeDragStress',
    'solarIntensity'
  ],
  OUTPUT_LABELS: [
    'steerAngleDelta',
    'thrustMagnitude',
    'courtshipDesire',
    'aggressionImpulse'
  ]
});

/**
 * Standard numerically stable sigmoid helper clamped to [0, 1].
 * @param {number} z 
 * @returns {number}
 */
function sigmoid(z) {
  if (z >= 0) {
    return clamp(1.0 / (1.0 + Math.exp(-z)), 0.0, 1.0);
  } else {
    const ez = Math.exp(z);
    return clamp(ez / (1.0 + ez), 0.0, 1.0);
  }
}

export class NeuralBrain {
  /**
   * @param {Float32Array|Array<number>|null} [weights=null] 124 parameter weights array or null for random.
   */
  constructor(weights = null) {
    this.weights = new Float32Array(BRAIN_CONFIG.TOTAL_WEIGHTS);

    if (weights && weights.length >= BRAIN_CONFIG.TOTAL_WEIGHTS) {
      for (let i = 0; i < BRAIN_CONFIG.TOTAL_WEIGHTS; i++) {
        this.weights[i] = clamp(weights[i], BRAIN_CONFIG.WEIGHT_MIN, BRAIN_CONFIG.WEIGHT_MAX);
      }
    } else {
      const initial = NeuralBrain.randomWeights();
      this.weights.set(initial);
    }

    this.activations = {
      input: new Float32Array(BRAIN_CONFIG.INPUT_SIZE),
      hidden: new Float32Array(BRAIN_CONFIG.HIDDEN_SIZE),
      output: new Float32Array(BRAIN_CONFIG.OUTPUT_SIZE)
    };
  }

  /**
   * Evaluates the feedforward network.
   * Input: 10 sensory features.
   * Output: 4 motor actions:
   *  - output[0]: steerAngleDelta in [-PI, PI]
   *  - output[1]: thrustMagnitude in [0, 1]
   *  - output[2]: courtshipDesire in [0, 1]
   *  - output[3]: aggressionImpulse in [0, 1]
   * Caches activations in this.activations.
   *
   * @param {Array<number>|Float32Array} inputs 
   * @returns {Float32Array} Output activations (length 4)
   */
  forward(inputs) {
    const inAct = this.activations.input;
    const hidAct = this.activations.hidden;
    const outAct = this.activations.output;
    const w = this.weights;

    // Cache sensory inputs
    const numIn = BRAIN_CONFIG.INPUT_SIZE;
    for (let i = 0; i < numIn; i++) {
      inAct[i] = Number.isFinite(inputs[i]) ? inputs[i] : 0.0;
    }

    // Layer 1: Inputs -> Hidden (tanh)
    // W1: 8 rows (hidden), 10 cols (inputs). Offset: 0..79
    // B1: 8 biases. Offset: 80..87
    const numHid = BRAIN_CONFIG.HIDDEN_SIZE;
    const b1Offset = BRAIN_CONFIG.B1_OFFSET;

    for (let h = 0; h < numHid; h++) {
      let sum = w[b1Offset + h];
      const rowOffset = h * numIn;
      for (let i = 0; i < numIn; i++) {
        sum += inAct[i] * w[rowOffset + i];
      }
      hidAct[h] = Math.tanh(sum);
    }

    // Layer 2: Hidden -> Output
    // W2: 4 rows (outputs), 8 cols (hidden). Offset: 88..119
    // B2: 4 biases. Offset: 120..123
    const numOut = BRAIN_CONFIG.OUTPUT_SIZE;
    const w2Offset = BRAIN_CONFIG.W2_OFFSET;
    const b2Offset = BRAIN_CONFIG.B2_OFFSET;

    for (let o = 0; o < numOut; o++) {
      let sum = w[b2Offset + o];
      const rowOffset = w2Offset + o * numHid;
      for (let h = 0; h < numHid; h++) {
        sum += hidAct[h] * w[rowOffset + h];
      }

      if (o === 0) {
        // Output 0: Turning impulse in [-PI, PI]
        outAct[0] = clamp(Math.tanh(sum) * Math.PI, -Math.PI, Math.PI);
      } else {
        // Output 1..3: Action drives in [0, 1]
        outAct[o] = sigmoid(sum);
      }
    }

    return outAct;
  }

  /**
   * Generates a new Float32Array(124) with uniform random weights in [-1.0, 1.0].
   * @returns {Float32Array}
   */
  static randomWeights() {
    const weights = new Float32Array(BRAIN_CONFIG.TOTAL_WEIGHTS);
    for (let i = 0; i < BRAIN_CONFIG.TOTAL_WEIGHTS; i++) {
      weights[i] = randomFloat(BRAIN_CONFIG.INIT_WEIGHT_MIN, BRAIN_CONFIG.INIT_WEIGHT_MAX);
    }
    return weights;
  }

  /**
   * Mutates synaptic weights using Gaussian noise with 5% chance of sign flip.
   * Clamps all weights to [-5.0, 5.0].
   * Does not mutate original weights array.
   *
   * @param {Float32Array|Array<number>} weights 
   * @param {number} [mutationRate=0.06] Probability of mutation per synapse
   * @param {number} [stdDev=0.2] Gaussian noise standard deviation
   * @returns {Float32Array} New mutated weights array
   */
  static mutateWeights(weights, mutationRate = BRAIN_CONFIG.MUTATION_RATE, stdDev = 0.2) {
    const total = BRAIN_CONFIG.TOTAL_WEIGHTS;
    const child = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      let val = weights[i];

      if (Math.random() < mutationRate) {
        // Perturb with Gaussian noise
        val += randomGaussian(0, stdDev);

        // 5% chance of structural macro-mutation (sign flip)
        if (Math.random() < 0.05) {
          val = -val;
        }
      }

      child[i] = clamp(val, BRAIN_CONFIG.WEIGHT_MIN, BRAIN_CONFIG.WEIGHT_MAX);
    }

    return child;
  }

  /**
   * Sexual crossover recombines two parent weight genomes 50/50 with occasional arithmetic blending.
   * Clamps all weights to [-5.0, 5.0].
   *
   * @param {Float32Array|Array<number>} wA Parent A weights
   * @param {Float32Array|Array<number>} wB Parent B weights
   * @returns {Float32Array} New recombinant child weights
   */
  static crossoverWeights(wA, wB) {
    const total = BRAIN_CONFIG.TOTAL_WEIGHTS;
    const child = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const r = Math.random();
      let val;

      if (r < 0.45) {
        val = wA[i];
      } else if (r < 0.90) {
        val = wB[i];
      } else {
        // 10% chance of arithmetic blend
        const blend = Math.random();
        val = wA[i] * blend + wB[i] * (1.0 - blend);
      }

      child[i] = clamp(val, BRAIN_CONFIG.WEIGHT_MIN, BRAIN_CONFIG.WEIGHT_MAX);
    }

    return child;
  }
}
