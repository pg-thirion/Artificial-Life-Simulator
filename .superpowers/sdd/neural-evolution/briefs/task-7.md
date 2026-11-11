# Task 7 Brief: Live Neural Network Visualizer in Creature Inspector

## Requirements
Create `src/neuralVisualizer.js`, integrate `#insp-brain-canvas` into `src/template.html` and `src/app.js`, update `scripts/build_standalone.js`, and add unit tests in `tests/test_simulation.js`.

### 1. `NeuralVisualizer` Class in `src/neuralVisualizer.js`
- Export `class NeuralVisualizer`:
  - `constructor(canvas)`:
    - Stores `this.canvas = canvas` and `this.ctx = canvas ? canvas.getContext('2d') : null`.
    - Defines `INPUT_LABELS = ['Food Dist', 'Food Ang', 'Danger', 'Threat Dist', 'Threat Ang', 'Mate Dist', 'Mate Ang', 'Energy', 'Drag', 'Solar']`.
    - Defines `OUTPUT_LABELS = ['Steer', 'Thrust', 'Court', 'Attack']`.
  - `render(brain, brainType = 'neural')`:
    - Guards if `!this.canvas || !this.ctx`.
    - Clears canvas (`0, 0, width, height`) and fills dark background (`rgba(15, 23, 42, 0.85)`).
    - If `brainType !== 'neural' || !brain`:
      - Renders centered message `"Heuristic Rule Brain"` and subtitle `"Click Brain badge to switch to Neural"`.
      - Returns cleanly.
    - Computes node coordinates for 3 columns:
      - Column 1 (x ≈ 52): 10 input nodes evenly spaced vertically.
      - Column 2 (x ≈ width * 0.5): 8 hidden nodes evenly spaced vertically.
      - Column 3 (x ≈ width - 48): 4 output nodes evenly spaced vertically.
    - Renders synaptic weights:
      - Layer 1 ($W_1$, indices `0..79`, $8 \times 10$): line from input $i$ to hidden $h$.
      - Layer 2 ($W_2$, indices `88..119`, $4 \times 8$): line from hidden $h$ to output $o$.
      - Positive weights: `rgba(74, 222, 128, alpha)` (emerald green).
      - Negative weights: `rgba(248, 113, 113, alpha)` (coral red).
      - Alpha and lineWidth scaled by `clamp(Math.abs(w) / 2.5, 0.08, 0.9)`.
    - Renders nodes (circles radius `4.5`):
      - Fill color intensity scaled by live activation in `brain.activations.input`, `brain.activations.hidden`, and `brain.activations.output`.
      - Positive activations glow cyan/emerald (`#38bdf8` / `#4ade80`); negative activations glow amber/red (`#f59e0b` / `#ef4444`).
    - Renders crisp text labels (`9px sans-serif`) on left of input nodes and right of output nodes with numeric activation readout.

### 2. Inspector UI in `src/template.html` & `src/app.js`
- In `src/template.html` inside `#inspector`:
  - Add a stats row for Brain Architecture:
    `<div class="stats-row"><span>Brain:</span><strong id="insp-brain-type" style="color: #c084fc; cursor: pointer;" title="Click to toggle Neural / Heuristic">NEURAL (124 syn)</strong></div>`
  - Add the neural visualizer canvas container inside `#inspector`:
    ```html
    <div class="brain-viz-box" style="margin-top: 4px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden; background: rgba(15, 23, 42, 0.7);">
      <div style="font-size: 9px; color: #94a3b8; padding: 3px 6px; display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <span>LIVE NEURAL TOPOLOGY (10→8→4)</span>
        <span id="insp-brain-Summary">Active</span>
      </div>
      <canvas id="insp-brain-canvas" width="268" height="165" style="display: block; width: 100%; height: 165px;"></canvas>
    </div>
    ```
- In `src/app.js`:
  - Import `NeuralVisualizer` from `./neuralVisualizer.js`.
  - Instantiate `const brainCanvas = document.getElementById('insp-brain-canvas'); const neuralVisualizer = new NeuralVisualizer(brainCanvas);`.
  - In `updateInspectorUI()`:
    - Update `#insp-brain-type` text and color.
    - Call `neuralVisualizer.render(c.brain, c.brainType)`.
  - Allow clicking `#insp-brain-type` to toggle `selectedCreature.brainType` between `'neural'` and `'heuristic'`.

### 3. Build & Tests
- Add `'src/neuralVisualizer.js'` to `moduleFiles` in `scripts/build_standalone.js`.
- Add unit tests in `tests/test_simulation.js` testing `NeuralVisualizer` instantiation, neural rendering, heuristic rendering, and null-safety.
- Verify `npm test` and `npm run build` succeed.
