# Design Spec: Neural Evolution & Ecosystem Expansion for Artificial Life Simulator

**Date:** 2026-11-11  
**Status:** Draft / Ready for Approval  
**Target:** Cloudflare Pages Static Deployment & Zero-Dependency Standalone Simulator  

---

## 1. Intent & The Why

*Artificial Life Simulator* currently simulates continuous genetic drift using hardcoded Reynolds autonomous steering (seek, flee, wander, flock) and heuristic rules. While stable and expressive, hardcoded steering cannot evolve truly novel, unexpected emergent behaviors.

This expansion replaces and augments heuristic steering with an **Evolving Deep Neural Network Brain** as the primary pillar, supported by four rich ecological systems:
1. **Neural Network Brains (Core Feature)**: Sensory perceptron brains with synaptic DNA that evolve tactical behaviors (ambushing, circling, feinting, cooperative hunting) purely through survival pressure.
2. **Dynamic Chromatophores & Mimicry**: Active camouflage that adapts to biomes, alongside aposematic warning coloration and Batesian mimicry.
3. **Symbiosis & Parasitism**: Cleaner mutualism and energy-draining leeches with host-grooming interactions.
4. **Multi-Cellular Colonies**: Structural adhesion and cellular differentiation into specialized super-organisms (mouth, armor, flagella).
5. **Species Arena Challenge**: Battle Royale tournament mode with a shrinking hazard ring and clade brackets.
6. **Cloudflare Pages Production Deployment**: Optimized static build pipeline for instant edge hosting.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Emergent Tactical Intelligence**: Organisms make decisions by evaluating a 9-input, 8-hidden, 4-output neural network whose weights are encoded directly in their genome.
- **Live Neural Brain Inspector**: Players can click any organism to inspect its firing neurons and synaptic weights in real time.
- **Dual-Mode Coexistence**: Players can toggle between Heuristic AI and Neural Network Brains, or run them simultaneously to watch neural organisms out-evolve heuristic organisms.
- **Deep Ecological Dynamics**: Biome camouflage, cleaner-host mutualism, parasitic leeches, and multicellular colony physics.
- **Competitive Arena Mode**: Dedicated challenge mode to test species fitness under shrinking boundary constraints.
- **Zero-Dependency Cloudflare Hosting**: Standalone `dist/index.html` build compatible with Cloudflare Pages, zero external CDN dependencies, 100% offline-capable.

### Non-Goals
- Heavy multi-megabyte machine learning libraries (TensorFlow.js, PyTorch/ONNX). All matrix math and activation functions are written in zero-dependency vanilla JS for 60 FPS performance with 100+ simultaneous brains.
- Backpropagation or reinforcement learning during an organism's lifetime. Evolution is purely Darwinian: synaptic weights mutate during reproduction, and selection pressures determine which brains replicate.

### Anti-Goals
- Do not break existing features: Death message toggles, tutorial system, Primer kinetic scaling, and God-mode tools must continue working seamlessly.
- Do not drop frame rate below 50 FPS on modern hardware with 100 living organisms.

---

## 3. Architecture & Technical Design

### Feature 1: Neural Network Brain Architecture (Primary Focus)

#### Topology & Math
- **Feedforward Perceptron**:
  - Input Layer ($N_{in} = 10$):
    1. `nearestFoodDistNorm`: $1.0 - \text{clamp}(d / \text{sense}, 0, 1)$ (plants for herbivores, living prey/meat for carnivores)
    2. `nearestFoodAngleNorm`: relative angle to nearest food/prey in $[-\pi, \pi]$ normalized to $[-1, 1]$
    3. `nearestFoodDangerSignal`: $0.0$ for docile plants/prey, up to $1.0$ for high-armor/aposematic targets
    4. `nearestThreatDistNorm`: predator threat proximity in $[0, 1]$
    5. `nearestThreatAngleNorm`: relative threat direction in $[-1, 1]$
    6. `nearestMateDistNorm`: receptive mate proximity in $[0, 1]$
    7. `nearestMateAngleNorm`: relative mate direction in $[-1, 1]$
    8. `energyRatio`: $\text{energy} / \text{maxEnergy} \in [0, 1]$
    9. `biomeDragStress`: current biome friction/heat penalty in $[0, 1]$
    10. `solarIntensity`: circadian light level in $[0, 1]$
  - Hidden Layer ($N_{hid} = 8$):
    - Activation function: $\tanh(x)$ for smooth positive/negative activation gradients.
    - $H = \tanh(W_1 \cdot I + B_1)$ where $W_1$ is $8 \times 10$ and $B_1$ is $8 \times 1$.
  - Output Layer ($N_{out} = 4$):
    1. `steerAngleDelta`: desired turning impulse in radians $\in [-\pi, \pi]$ (via $\tanh \times \pi$)
    2. `thrustMagnitude`: propulsion acceleration in $[0, 1]$ (via clamped linear / sigmoid)
    3. `courtshipDesire`: mating drive $\in [0, 1]$
    4. `aggressionImpulse`: biting/predation intensity $\in [0, 1]$
    - $O = W_2 \cdot H + B_2$ where $W_2$ is $4 \times 8$ and $B_2$ is $4 \times 1$.

#### Synaptic Genetics & Inheritance
- Total parameters per brain: $(8 \times 10 + 8) + (4 \times 8 + 4) = 80 + 8 + 32 + 4 = 124$ weights and biases.
- Weights stored as a `Float32Array(124)` in `BrainGenome`.
- **Mutation**:
  - Mutation rate determines probability of synaptic jitter.
  - Weights perturb via Gaussian drift: $w' = w + \mathcal{N}(0, \sigma)$.
  - Rare structural macro-mutation (5% chance): sign flip or re-randomization of a connection.
- **Sexual Crossover**:
  - Uniform recombination: 50% chance to inherit connection from Parent A, 50% from Parent B, or arithmetic blend.
- **Dual-Mode Coexistence**:
  - Organisms possess a `brainType: 'neural' | 'heuristic'`.
  - Both share the morphological body genome.
  - When mating across brain types, offspring has a 50% chance to inherit the neural brain, enabling head-to-head evolutionary fitness competition.

#### Live Neural Brain Visualizer
- A dedicated 240×180 canvas inside the Creature Inspector drawer.
- 9 Input nodes on left, 8 Hidden nodes in center, 4 Output nodes on right.
- Node circles glow proportionally to their current activation value (cyan for positive, red for negative).
- Synaptic connection lines rendered with opacity and color based on weight magnitude ($>0$ green, $<0$ red).
- Hovering or inspecting shows live numeric readout of firing rates.

---

### Feature 2: Dynamic Chromatophores & Mimicry

- **Chromatophore Gene (`chromatophore` $\in [0, 1]$)**:
  - Determines speed and precision with which organism adapts its outer body color to the underlying biome (Oasis green, Desert amber, Marsh teal, Barrens crimson).
  - High camouflage + chromatophore renders creature partially transparent and color-matched, reducing predator detection range by up to 75%.
- **Aposematism & Warning Displays**:
  - Brave, high-armor or toxic organisms develop bright contrasting rings (aposematic yellow/black or toxic violet bands).
  - Predator neural networks learn via negative reinforcement (counter-attack damage) to avoid chasing aposematic patterns.
- **Batesian Mimicry**:
  - Non-toxic prey species can evolve false warning colorations through genetic drift to exploit predator learned avoidance.

---

### Feature 3: Symbiosis & Parasitism

- **Cleaner Mutualism**:
  - Organisms with `symbiosis` gene $\ge 0.6$ and small size act as "cleaner fish".
  - Cleaners approach larger organisms without triggering predator aggression.
  - Cleaners remove attached parasites or necrotic tissue, restoring host health and gaining energy.
- **Parasite Leeches**:
  - Tiny parasitic organisms (`size` $< 5$, `diet` carnivorous) latch onto host bodies upon contact.
  - Latched parasites drain a small fraction of host energy per second ($0.5$ cal/s) and ride host movement.
  - Host thrashing sprint or cleaner mutualist intervention detaches parasites.

---

### Feature 4: Multi-Cellular Colonies

- **Cell Adhesion Gene (`adhesion` $\in [0, 1]$)**:
  - Organisms with high adhesion of the same clade bond into multicellular clusters upon contact.
  - Managed by a composite `Colony` coordinator that aggregates total mass, pools calories, and coordinates movement without spring jitter.
- **Colony Differentiation**:
  - **Mouth / Core Cell**: Central organism responsible for feeding, steering decision-making, and caloric distribution.
  - **Motor Cells**: Flagellated periphery organisms align their propulsion thrust along the colony's master heading.
  - **Armor / Chitin Cells**: Hardened boundary organisms providing +60% physical shield to protect core cells.
- **Colony Reproduction**:
  - When colony pooled energy reaches 2.5× individual reproduction threshold, a specialized bud organism detaches to establish a new lineage.

---

### Feature 5: Species Arena Challenge (Battle Royale Tournament)

- Dedicated Arena Preset button `#btn-arena-mode`.
- **Sandbox Preservation**: Automatically saves current sandbox simulation state to memory before tournament begins, and restores it on tournament exit.
- Initializes a specialized circular gladiatorial arena with 4 to 8 user-selected species clades (10 organisms each).
- A glowing electric "storm ring" contracts from radius 1200px to 80px over 90 seconds.
- Organisms trapped outside the storm perimeter take rapid 25 cal/s environmental damage.
- Real-time tournament leaderboard:
  - Remaining clades, live headcounts, total kills, time survived.
  - Victory podium modal crowning the surviving Apex Clade when one remains.

---

### Feature 6: Cloudflare Pages Deployment

- Build output directory: `dist/`.
- Updated bundler `scripts/build_standalone.js` compiles modular architecture into `dist/index.html` and root `index.html`.
- Added configuration:
  - `wrangler.toml` pointing to `dist/`.
  - `package.json` scripts: `npm run build`, `npm run deploy`.
  - Deployment instructions for direct GitHub repo integration or Wrangler CLI deployment.

---

## 4. Verification Plan

1. **Simulation Unit Tests (`tests/test_simulation.js`)**:
   - Neural network feedforward propagation: verify input-to-output matrix math.
   - Synaptic mutation and crossover: verify weight perturbations and array bounds.
   - Chromatophore color lerping: verify substrate biome matching.
   - Parasite attachment and energy transfer.
   - Multicellular spring joint physics.
   - Arena storm contraction radius calculation.
2. **Playwright E2E Review (`tests/review_game.js`)**:
   - Verify Neural Brain toggle and Inspector visualizer canvas rendering.
   - Verify DNA Synthesizer includes Neural Network and Chromatophore parameters.
   - Verify Arena Challenge mode launches, contracts storm ring, and displays leaderboard.
   - 0 console errors, 0 uncaught exceptions on Cloudflare static build.
