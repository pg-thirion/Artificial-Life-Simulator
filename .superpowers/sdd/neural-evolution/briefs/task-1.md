# Task 1 Brief: Neural Brain Math & Perceptron Engine

## Requirements
Create `src/neuralBrain.js` and `tests/test_neural_brain.js`.

### Architecture
A lightweight zero-dependency feedforward perceptron:
- Input layer: $N_{in} = 10$
- Hidden layer: $N_{hid} = 8$ with $\tanh(x)$ activation function
- Output layer: $N_{out} = 4$
  - Output 0: `steerAngleDelta` = $\tanh(z_0) \times \pi \in [-\pi, \pi]$
  - Output 1: `thrustMagnitude` = clamp $(1 / (1 + e^{-z_1})) \in [0, 1]$
  - Output 2: `courtshipDesire` = clamp $(1 / (1 + e^{-z_2})) \in [0, 1]$
  - Output 3: `aggressionImpulse` = clamp $(1 / (1 + e^{-z_3})) \in [0, 1]$

### Total Parameters: 124
- Weights 1 ($W_1$): $8 \times 10 = 80$
- Biases 1 ($B_1$): $8$
- Weights 2 ($W_2$): $4 \times 8 = 32$
- Biases 2 ($B_2$): $4$
Total: $80 + 8 + 32 + 4 = 124$ floats stored as a `Float32Array(124)`.

### Interface Requirements
- `class NeuralBrain`:
  - `constructor(weights = null)`: copies or calls `NeuralBrain.randomWeights()`. Clamps initial weights to $[-2.0, 2.0]$.
  - `weights`: `Float32Array(124)`
  - `activations`: `{ input: Float32Array(10), hidden: Float32Array(8), output: Float32Array(4) }` (stored on each `forward(inputs)` call for visualization).
  - `forward(inputs)`: takes array or `Float32Array` of length 10. Computes hidden layer activations and output layer activations. Returns `Float32Array(4)`.
  - `static randomWeights()`: returns new `Float32Array(124)` initialized with small random values $\mathcal{U}(-1.0, 1.0)$.
  - `static mutateWeights(weights, mutationRate = 0.06)`: returns new `Float32Array(124)` perturbed by Gaussian noise with 5% chance of sign flip, clamped to $[-5.0, 5.0]$.
  - `static crossoverWeights(wA, wB)`: returns new `Float32Array(124)` recombined 50/50 from wA and wB with occasional blend.

### Verification
- `node tests/test_neural_brain.js`: must pass 100% of matrix math, boundary, mutation, and crossover assertions.
- `npm test`: all master tests must pass.
