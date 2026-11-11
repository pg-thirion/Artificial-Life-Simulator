# Task 4 Brief: Dynamic Chromatophores & Aposematic Mimicry

## Requirements
Implement dynamic chromatophore skin color blending and aposematic warning rings / Batesian mimicry in `src/creature.js`, and test in `tests/test_simulation.js`.

### 1. Dynamic Chromatophores in `src/creature.js`
- Property on `Creature`:
  - `this.chromatophoreColor`: `{ r: number, g: number, b: number }` initialized to genome color RGB or default body RGB.
  - Getter `this.effectiveColorCss` returning `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` or using it in `draw()`.
- In `update(dt, env)`:
  - When `env.getBiomeAt` is available:
    - Determine target substrate RGB for the biome:
      - `oasis`: `{ r: 34, g: 197, b: 94 }`
      - `desert`: `{ r: 245, g: 158, b: 11 }`
      - `marsh`: `{ r: 56, g: 189, b: 248 }`
      - `volcanic`: `{ r: 239, g: 68, b: 68 }`
      - Default / fallback: base genome color RGB.
    - Blend rate: `t = clamp(this.genome.chromatophore * dt * 2.0, 0, 1)`.
    - Lerp `this.chromatophoreColor.r, g, b` towards target RGB.
- Update `draw(ctx)`:
  - If `this.genome.chromatophore > 0.05`, modulate body fill color with `this.chromatophoreColor` (e.g. `rgb(${r}, ${g}, ${b})`).

### 2. Aposematic Warning Rings & Batesian Mimicry
- Property / Getter on `Creature`:
  - `get aposematicWarningLevel()`:
    - Base toxicity/armor signal: `const genuine = clamp((this.genome.armor * this.genome.bravery - 0.20) / 0.45, 0, 1);`
    - Batesian mimicry: defenceless creatures with high camouflage mimic toxic warning:
      `const mimic = (this.genome.camouflage > 0.65) ? clamp((this.genome.camouflage - 0.65) / 0.35, 0, 1) : 0;`
    - Returns `clamp(Math.max(genuine, mimic), 0, 1)`.
- In `draw(ctx)`:
  - If `this.aposematicWarningLevel > 0.35`:
    - Render contrasting aposematic warning bands or dashed rings around the body using high-contrast yellow (`#facc15`) and black (`#09090b`), pulsating gently with `Math.sin(this.age * 4.0)`.
- In `evaluateNeuralBehavior`:
  - Ensure `nearestFoodDangerSignal` incorporates `target.aposematicWarningLevel` (or `target.genome.armor`).

### 3. Tests in `tests/test_simulation.js`
Add tests verifying:
- Chromatophore color shifts towards biome color over time when `chromatophore > 0.0`.
- Organisms with `chromatophore == 0.0` do not shift color.
- `aposematicWarningLevel` returns expected values for high armor/bravery (genuine aposematism) and high camouflage (Batesian mimicry).
- Warning rings render in `draw()` without canvas exceptions.
- Sensory pipeline reflects non-zero danger signal when targeting an aposematic creature.
- All existing tests pass (`npm test`).
