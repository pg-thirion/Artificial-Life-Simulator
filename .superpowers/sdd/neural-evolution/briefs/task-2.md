# Task 2 Brief: Synaptic DNA Encoding & Dual-Brain Genetics

## Requirements
Update `src/genome.js` and `src/creature.js` to encode neural synaptic weights and the new genes into organism DNA, and add comprehensive unit tests in `tests/test_simulation.js`.

### 1. `GENE_BOUNDS` in `src/genome.js`
Add entries for:
- `chromatophore`: `{ min: 0.0, max: 1.0, default: 0.3 }`
- `adhesion`: `{ min: 0.0, max: 1.0, default: 0.1 }`
- `symbiosis`: `{ min: 0.0, max: 1.0, default: 0.2 }`

### 2. `Genome` Class in `src/genome.js`
- Import `NeuralBrain` from `./neuralBrain.js`.
- Properties on `Genome` instance:
  - `this.brainType`: `'neural' | 'heuristic'`, default `'neural'`.
  - `this.brainWeights`: `Float32Array(124)` containing synaptic weights. If `traits.brainWeights` provided, clone into Float32Array; otherwise call `NeuralBrain.randomWeights()`.
  - `this.chromatophore`: clamped continuous trait.
  - `this.adhesion`: clamped continuous trait.
  - `this.symbiosis`: clamped continuous trait.
- `clone()`:
  - Clones all scalar traits plus deep-copies `brainWeights: new Float32Array(this.brainWeights)`.
  - Preserves `brainType`.
- `mutate()`:
  - Mutates scalar traits (including `chromatophore`, `adhesion`, `symbiosis`).
  - Calls `NeuralBrain.mutateWeights(this.brainWeights, this.mutationRate)` for synaptic DNA.
  - Rare (e.g. 2%) macro-mutation chance to flip `brainType` between `'neural'` and `'heuristic'`.
- `crossover(other)`:
  - Recombines scalar traits (uniform crossover or blend).
  - Recombines synaptic weights via `NeuralBrain.crossoverWeights(this.brainWeights, other.brainWeights)`.
  - Picks `brainType` 50/50 from parents.
- `distance(other)`:
  - Include new scalar genes (`chromatophore`, `adhesion`, `symbiosis`) and normalized average synaptic weight delta so neural divergence contributes to speciation.
- Serialization / deserialization (`toJSON`, `fromJSON`):
  - Properly serialize `brainWeights` (e.g., Array.from(this.brainWeights) or Float32Array handling) and `brainType`.

### 3. `Creature` Class in `src/creature.js`
- Import `NeuralBrain` from `./neuralBrain.js`.
- In constructor:
  - Instantiate `this.brain = new NeuralBrain(this.genome.brainWeights)`.
  - Expose helper or getter `this.brainType = this.genome.brainType`.
- In reproduction (`reproduceAsexual`, `reproduceSexual`):
  - Ensure offspring receives mutated/crossover genome, which initializes new offspring `NeuralBrain`.

### 4. Tests in `tests/test_simulation.js`
Add a dedicated test section verifying:
- Genome initialization defaults (brainType 'neural', 124 brainWeights, new genes).
- Genome cloning produces independent Float32Array instance of brainWeights.
- Genome mutation perturbs weights within [-5.0, 5.0].
- Genome crossover produces blended child with valid weights.
- Creature instantiation creates `this.brain instanceof NeuralBrain`.
- All existing 129 tests continue passing.

### 5. Verification Command
- `npm test` -> 100% green tests.
- `npm run build` -> compiles without error.
