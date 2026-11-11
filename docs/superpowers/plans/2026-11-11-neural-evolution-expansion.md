# Neural Evolution & Ecosystem Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Artificial Life Simulator into an evolving neural ecosystem featuring a 10-input sensory perceptron brain with real-time visualizer, dynamic chromatophore camouflage/mimicry, symbiosis/parasites, multicellular colonies, a battle royale Arena mode, and Cloudflare Pages static edge hosting.

**Architecture:** A lightweight zero-dependency feedforward perceptron (`NeuralBrain`) is integrated into `Genome` and `Creature`, driven by a 10-feature normalized sensory pipeline that outputs turning, thrust, mating, and biting impulses. Secondary ecological layers (chromatophores, leeches/cleaners, colonies, and shrinking arena storm) build modularly on top of this physical foundation, bundled into a production `dist/index.html` static export configured for Cloudflare Pages.

**Tech Stack:** Vanilla JavaScript (ES modules + zero-dependency bundle), HTML5 Canvas 2D, Web Audio API, Playwright CLI, Node.js test harness, Cloudflare Pages / Wrangler.

**Spec:** [docs/superpowers/specs/2026-11-11-neural-evolution-expansion-design.md](file:///C:/Users/gawie/OneDrive/Documents/GitHub/Artificial%20Life%20Simulator/docs/superpowers/specs/2026-11-11-neural-evolution-expansion-design.md)

## Global Constraints
- Target platform: Standalone zero-dependency HTML5/JS running identically via local `file://` and Cloudflare Pages.
- Brain parameter count: Exactly 124 parameters ($10 \times 8 + 8 + 8 \times 4 + 4$) stored as a `Float32Array(124)`.
- Performance floor: Stable $\ge 50$ FPS with 100+ concurrent organisms on modern desktop browser.
- External libraries: 0 external CDN or runtime npm dependencies; standard Node.js test and Playwright review scripts only.
- Documentation & Tests: Existing 122 unit tests and Playwright review must continue to pass 100%.

## Review Focus
- **Empty sensory inputs**: When no food, predator, or mate is in sensory range, inputs must default smoothly to 0.0 without NaN or zero-division.
- **Extreme synaptic weights**: Weights drifted by mutation must be clamped to $[-5.0, 5.0]$ to prevent numerical overflow in $\tanh$ activations.
- **Dual-mode interbreeding**: Crosses between neural and heuristic organisms must safely inherit valid genomes without crashing or corrupting weight buffers.
- **Colony physics stability**: Multi-cell colony clusters must not oscillate, jitter, or tunnel through world boundaries under high thrust.
- **Arena mode cleanup**: Exiting or finishing Arena mode must reliably restore the exact prior sandbox state without memory leaks or orphaned entities.

---

### Task 1: Neural Brain Math & Perceptron Engine

**Files:**
- Create: `src/neuralBrain.js`
- Test: `tests/test_neural_brain.js`

**Interfaces:**
- Produces:
  - `class NeuralBrain`: constructor `(weights: Float32Array|null)`
  - `NeuralBrain.prototype.forward(inputs: Float32Array): Float32Array` (length 4)
  - `NeuralBrain.prototype.weights: Float32Array` (length 124)
  - `NeuralBrain.prototype.activations: { input: Float32Array, hidden: Float32Array, output: Float32Array }`
  - `NeuralBrain.randomWeights(): Float32Array`
  - `NeuralBrain.mutateWeights(weights: Float32Array, mutationRate: number): Float32Array`
  - `NeuralBrain.crossoverWeights(wA: Float32Array, wB: Float32Array): Float32Array`

- [ ] **Step 1: Write failing test in `tests/test_neural_brain.js`**
Test forward propagation matrix multiplication with known weights, tanh activation, bounds clamping, mutation, and crossover length 124.
- [ ] **Step 2: Run test to verify it fails**
Run: `node tests/test_neural_brain.js`
Expected: FAIL (Cannot find module `src/neuralBrain.js`)
- [ ] **Step 3: Implement `NeuralBrain` in `src/neuralBrain.js`**
Write zero-dependency feedforward perceptron: $10 \to 8 \to 4$. Input size 10, hidden size 8 with $\tanh$, output size 4 ($O_0 = \tanh \times \pi$, $O_1 = \text{clamp}(0, 1)$, $O_2 = \text{clamp}(0, 1)$, $O_3 = \text{clamp}(0, 1)$). Caches live activations for visualizer.
- [ ] **Step 4: Run test to verify it passes**
Run: `node tests/test_neural_brain.js`
Expected: PASS with 100% assertions green.
- [ ] **Step 5: Add Task 1 tests to master suite in `tests/test_simulation.js`**
Run: `npm test`
Expected: PASS.

---

### Task 2: Synaptic DNA Encoding & Dual-Brain Genetics

**Files:**
- Modify: `src/genome.js`
- Modify: `src/creature.js`
- Test: `tests/test_simulation.js`

**Interfaces:**
- Consumes: `NeuralBrain` from `src/neuralBrain.js`
- Produces:
  - `Genome.prototype.brainType`: `'neural' | 'heuristic'`
  - `Genome.prototype.brainWeights`: `Float32Array(124)`
  - `Genome.prototype.chromatophore`: `number` ($[0, 1]$)
  - `Genome.prototype.adhesion`: `number` ($[0, 1]$)
  - `Genome.prototype.symbiosis`: `number` ($[0, 1]$)
  - `Creature.prototype.brain`: `NeuralBrain`

- [ ] **Step 1: Write failing test for neural genome cloning, mutation, and crossover**
Add assertions in `tests/test_simulation.js` verifying `Genome` initializes with 124 weights, mutates weights, and performs cross-type sexual recombination.
- [ ] **Step 2: Run test to verify failure**
Run: `npm test`
Expected: FAIL (`brainWeights` undefined).
- [ ] **Step 3: Update `src/genome.js` and `src/creature.js`**
Encode `brainType`, `brainWeights`, `chromatophore`, `adhesion`, `symbiosis` in `GENE_BOUNDS` and `Genome`. In `Genome.mutate()`, invoke `NeuralBrain.mutateWeights`. In `Genome.crossover()`, invoke `NeuralBrain.crossoverWeights`. Instantiate `this.brain = new NeuralBrain(this.genome.brainWeights)` in `Creature`.
- [ ] **Step 4: Run test to verify passing**
Run: `npm test`
Expected: PASS.

---

### Task 3: Normalized Sensory Pipeline & Neural Steering Integration

**Files:**
- Modify: `src/creature.js`
- Modify: `src/world.js`
- Test: `tests/test_simulation.js`

**Interfaces:**
- Consumes: `Creature.prototype.brain.forward(inputs)`
- Produces:
  - `Creature.prototype.evaluateNeuralBehavior(env: Object): { steerAngleDelta: number, thrustMagnitude: number, courtshipDesire: number, aggressionImpulse: number }`

- [x] **Step 1: Write failing test for `evaluateNeuralBehavior`**
Assert that given normalized sensory inputs, neural output controls steering angle, thrust force, courtship trigger, and bite impulse.
- [x] **Step 2: Run test to verify failure**
Run: `npm test`
Expected: FAIL (`evaluateNeuralBehavior` not a function).
- [x] **Step 3: Implement sensory extraction & neural execution in `src/creature.js`**
Construct 10-element input vector in `evaluateNeuralBehavior`:
1. `nearestFoodDist`: nearest plant for herbivore, nearest meat/prey for carnivore.
2. `nearestFoodAngle`: relative heading delta in $[-1, 1]$.
3. `nearestFoodDangerSignal`: $0.0$ for food, up to $1.0$ for high-armor/aposematic prey.
4. `nearestThreatDist`, 5. `nearestThreatAngle`.
6. `nearestMateDist`, 7. `nearestMateAngle`.
8. `energyRatio`, 9. `biomeDragStress`, 10. `solarIntensity`.
Apply output steering force: `desiredAngle = this.heading + steerAngleDelta`, `steerForce = Vector2D.fromAngle(desiredAngle, this.genome.speed * thrustMagnitude)`.
- [x] **Step 4: Run test to verify passing**
Run: `npm test`
Expected: PASS.

---

### Task 4: Dynamic Chromatophores & Aposematic Mimicry

**Files:**
- Modify: `src/creature.js`
- Modify: `src/genome.js`
- Test: `tests/test_simulation.js`

**Interfaces:**
- Produces:
  - `Creature.prototype.chromatophoreColor: Object`
  - `Creature.prototype.aposematicWarningLevel: number`

- [x] **Step 1: Write failing test for chromatophore color shifting and aposematic warning level**
Assert creature smoothly shifts skin color towards biome color over time, and aposematic warning stripes render when `armor * bravery > 0.35`.
- [x] **Step 2: Run test to verify failure**
Run: `npm test`
Expected: FAIL.
- [x] **Step 3: Implement chromatophore blending and warning ring rendering in `src/creature.js`**
In `Creature.update(dt, env)`: lerp `this.chromatophoreColor` towards `env.currentBiome.color` scaled by `this.genome.chromatophore * dt * 2.0`. In `Creature.draw()`, render aposematic yellow/black contrasting bands when toxic/armored. Set `nearestFoodDangerSignal` proportional to target's warning level.
- [x] **Step 4: Run test to verify passing**
Run: `npm test`
Expected: PASS.

---

### Task 5: Symbiosis Mutualism & Parasitic Leeches

**Files:**
- Modify: `src/creature.js`
- Modify: `src/world.js`
- Test: `tests/test_simulation.js`

**Interfaces:**
- Produces:
  - `Creature.prototype.attachedParasites: Creature[]`
  - `Creature.prototype.hostCreature: Creature|null`
  - `Creature.prototype.attachToHost(host: Creature): boolean`
  - `Creature.prototype.detachFromHost(): void`

- [ ] **Step 1: Write failing test for leech attachment, energy siphoning, and cleaner mutualism**
Assert small carnivore attaches as parasite, siphons energy, and cleaner organism detaches parasites to earn mutualistic calories.
- [ ] **Step 2: Run test to verify failure**
Run: `npm test`
Expected: FAIL (`attachToHost` not defined).
- [ ] **Step 3: Implement parasitism and cleaner behavior in `src/creature.js` and `src/world.js`**
When `size < 5.0` and `diet > 0.65`, creature can latch onto larger host (`size > 10.0`), following host coordinates and draining $0.4$ cal/s. When `symbiosis > 0.60`, cleaner approaches hosts, consuming attached parasites for $+25$ energy each and repairing host armor.
- [ ] **Step 4: Run test to verify passing**
Run: `npm test`
Expected: PASS.

---

### Task 6: Multicellular Colony Coordinator & Differentiation

**Files:**
- Create: `src/colony.js`
- Modify: `src/world.js`
- Modify: `src/creature.js`
- Test: `tests/test_simulation.js`

**Interfaces:**
- Produces:
  - `class Colony`: constructor `(cells: Creature[])`
  - `Colony.prototype.update(dt: number, env: Object): Creature|null`
  - `Colony.prototype.draw(ctx: CanvasRenderingContext2D): void`
  - `Colony.prototype.splitOffshoot(): Creature`

- [ ] **Step 1: Write failing test in `tests/test_simulation.js` for `Colony` coordination**
Assert that multiple organisms with high `adhesion` merge into a `Colony`, pool calories, share damage, and coordinate directional movement.
- [ ] **Step 2: Run test to verify failure**
Run: `npm test`
Expected: FAIL (`Colony` not defined).
- [ ] **Step 3: Implement `Colony` in `src/colony.js` and integrate into `src/world.js`**
`Colony` designates lead cell as core/mouth, outer cells as armor (+60% defense), and rear cells as flagellated thrusters. Coordinates thrust vectors along lead heading. Pools calories evenly across members.
- [ ] **Step 4: Run test to verify passing**
Run: `npm test`
Expected: PASS.

---

### Task 7: Live Neural Network Visualizer in Creature Inspector

**Files:**
- Create: `src/neuralVisualizer.js`
- Modify: `src/template.html`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `Creature.prototype.brain.activations` and `Creature.prototype.brain.weights`
- Produces:
  - `class NeuralVisualizer`: constructor `(canvas: HTMLCanvasElement)`
  - `NeuralVisualizer.prototype.render(brain: NeuralBrain): void`

- [ ] **Step 1: Create `src/neuralVisualizer.js` with node rendering logic**
Renders 10 input nodes, 8 hidden nodes, 4 output nodes with live glow for activations, green/red lines for synaptic weights, and text labels for all 10 inputs and 4 outputs.
- [ ] **Step 2: Add visualizer canvas to `#inspector` in `src/template.html`**
Add `<canvas id="insp-brain-canvas" width="240" height="180"></canvas>` and brain type badge.
- [ ] **Step 3: Connect visualizer in `src/app.js`**
Update `updateInspectorUI()` to render `neuralVisualizer.render(selectedCreature.brain)` when creature uses neural brain.
- [ ] **Step 4: Verify in browser / Playwright test**
Verify `#insp-brain-canvas` draws without error.

---

### Task 8: Species Arena Battle Royale Tournament Mode

**Files:**
- Create: `src/arena.js`
- Modify: `src/template.html`
- Modify: `src/app.js`

**Interfaces:**
- Produces:
  - `class ArenaTournament`: constructor `(world: World, options: Object)`
  - `ArenaTournament.prototype.start(cladeIds: string[]): void`
  - `ArenaTournament.prototype.update(dt: number): { isComplete: boolean, winner: Object|null }`
  - `ArenaTournament.prototype.draw(ctx: CanvasRenderingContext2D): void`

- [ ] **Step 1: Write unit tests for Arena storm ring contraction and elimination**
Assert storm radius shrinks from 1200px to 80px over 90s, damages out-of-bounds organisms, and tracks surviving clades.
- [ ] **Step 2: Implement `ArenaTournament` in `src/arena.js`**
Snapshots current world state to memory before tournament. Spawns 10 organisms for each competing clade inside arena circle. Draws glowing electrical boundary ring. Inflicts 25 cal/s radiation damage outside ring. Shows leaderboard and victory banner.
- [ ] **Step 3: Add Arena Mode UI button and modal in `src/template.html` and `src/app.js`**
Add `#btn-arena-mode` toolbar button and tournament leaderboard HUD.
- [ ] **Step 4: Run tests**
Run: `npm test`
Expected: PASS.

---

### Task 9: Cloudflare Pages Build Pipeline & Production Packaging

**Files:**
- Create: `wrangler.toml`
- Create: `dist/_headers`
- Modify: `package.json`
- Modify: `scripts/build_standalone.js`

**Interfaces:**
- Produces:
  - Production bundle in `dist/index.html`
  - `npm run build` command generating both root `index.html` and `dist/index.html`
  - `wrangler.toml` configured for Cloudflare Pages

- [ ] **Step 1: Update `scripts/build_standalone.js`**
Include `src/neuralBrain.js`, `src/colony.js`, `src/neuralVisualizer.js`, `src/arena.js` in module list. Write output to both `index.html` and `dist/index.html`.
- [ ] **Step 2: Create `wrangler.toml`**
Configure `pages_build_output_dir = "dist"` and project name `artificial-life-simulator`.
- [ ] **Step 3: Add `dist/_headers`**
Configure optimal caching and security headers for Cloudflare edge CDN.
- [ ] **Step 4: Update `package.json`**
Add scripts: `"build": "node scripts/build_standalone.js"`, `"deploy": "wrangler pages deploy dist"`.
- [ ] **Step 5: Run build**
Run: `npm run build`
Verify `dist/index.html` exists and is identical to standalone `index.html`.

---

### Task 10: Playwright CLI E2E Suite & Full Verification

**Files:**
- Modify: `tests/review_game.js`
- Test: `npm run review`

**Interfaces:**
- Verifies:
  - Initial load on `file://` and `dist/index.html` (0 errors)
  - Neural network inspector visualization
  - Chromatophore camouflage and aposematic warning coloration
  - Parasite leech attachment and cleaner mutualism
  - Multicellular colony clustering
  - Arena battle royale tournament launch and leaderboard
  - Standalone Cloudflare Pages bundle execution

- [ ] **Step 1: Add E2E tests for Tasks 1-9 in `tests/review_game.js`**
- [ ] **Step 2: Run full Playwright CLI test**
Run: `npm run review`
Expected: 100% of reviews and tests PASS.
- [ ] **Step 3: Run complete simulation unit tests**
Run: `npm test`
Expected: All tests pass.
