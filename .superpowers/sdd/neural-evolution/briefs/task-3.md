# Task 3 Brief: Normalized Sensory Pipeline & Neural Steering Integration

## Requirements
Implement the 10-input sensory pipeline and neural motor actuation in `src/creature.js`, and integrate it cleanly into `evaluateBehavior()` and `tests/test_simulation.js`.

### 1. `evaluateNeuralBehavior(env)` in `src/creature.js`
Create method `evaluateNeuralBehavior(env)` that extracts a 10-element normalized feature vector:

#### Input Vector Definition (`Float32Array(10)`):
1. `nearestFoodDistNorm`: $1.0 - \text{clamp}(d / \text{sense}, 0, 1)$. Searches for food pellet (plant/meat according to diet) or prey. If none, $0.0$.
2. `nearestFoodAngleNorm`: Angular delta between creature's current heading and vector to food, normalized to $[-1, 1]$: `normalizeAngle(angleDelta) / Math.PI`.
3. `nearestFoodDangerSignal`: $0.0$ for food pellets. For prey creatures: `prey.aposematicWarningLevel ?? prey.genome.armor ?? 0.0`.
4. `nearestThreatDistNorm`: $1.0 - \text{clamp}(d / \text{sense}, 0, 1)$ for largest nearby predator. $0.0$ if no threat.
5. `nearestThreatAngleNorm`: Angular delta to threat normalized to $[-1, 1]$.
6. `nearestMateDistNorm`: $1.0 - \text{clamp}(d / \text{sense}, 0, 1)$ for valid reproductive partner of same or compatible species. $0.0$ if none.
7. `nearestMateAngleNorm`: Angular delta to mate normalized to $[-1, 1]$.
8. `energyRatio`: `clamp(this.energy / this.maxEnergy, 0.0, 1.0)`.
9. `biomeDragStress`: Local environmental drag or stress normalized $[0.0, 1.0]$ (e.g. from `env.drag` or `env.getBiomeAt?.(this.position.x, this.position.y)?.drag ?? 0.0`).
10. `solarIntensity`: Diurnal cycle $[0.0, 1.0]$ (e.g. `env.solarIntensity ?? (env.isNight ? 0.15 : 0.9)`).

#### Neural Forward Evaluation:
- Query `const outputs = this.brain.forward(inputs);`
- Extract:
  - `steerAngleDelta = outputs[0]` ($[-\pi, \pi]$)
  - `thrustMagnitude = outputs[1]` ($[0, 1]$)
  - `courtshipDesire = outputs[2]` ($[0, 1]$)
  - `aggressionImpulse = outputs[3]` ($[0, 1]$)

#### Motor Force Application:
- Compute desired velocity:
  `const desiredHeading = this.heading + steerAngleDelta;`
  `const desiredVel = Vector2D.fromAngle(desiredHeading, this.genome.speed * thrustMagnitude);`
  `const steerForce = Vector2D.sub(desiredVel, this.velocity);`
  `steerForce.limit(0.55);`
  `this.applyForce(steerForce);`
- Store references on `this`:
  - `this.lastNeuralInputs = inputs;`
  - `this.lastNeuralOutputs = outputs;`
  - Set `this.threatTarget`, `this.currentTarget`, `this.courtshipTarget` based on nearest targets detected so inspector can display them.
  - Set `this.state = 'neural'`;
  - Set `this.currentIntention` to informative status (e.g. `Neural: Thrust ${(thrustMagnitude * 100).toFixed(0)}%, Turn ${(steerAngleDelta * 180 / Math.PI).toFixed(0)}°`).
- Return `{ steerAngleDelta, thrustMagnitude, courtshipDesire, aggressionImpulse, inputs, outputs }`.

### 2. Dual-Brain Dispatch in `evaluateBehavior(env)`
- Check player possession first.
- If `this.brainType === 'neural'`, call and return `this.evaluateNeuralBehavior(env)`.
- Otherwise, execute the classic heuristic behavioral steering.

### 3. Verification & Tests in `tests/test_simulation.js`
Add tests verifying:
- Calling `evaluateNeuralBehavior(env)` produces 10 finite normalized inputs in valid ranges.
- Output actions map correctly to steer angle delta $[-\pi, \pi]$ and thrust $[0, 1]$.
- Neural creature accelerates in response to forward pass thrust output.
- Heuristic creature retains classic behavior when `brainType === 'heuristic'`.
- Running 100 frames of simulation with mixed neural and heuristic creatures runs without error.
- All existing tests pass (`npm test`).
