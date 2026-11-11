# Task 9 Brief: Cloudflare Pages Build Pipeline & Production Packaging

## Requirements
Create `wrangler.toml`, `dist/_headers`, update `scripts/build_standalone.js` and `package.json`, and add packaging verification tests in `tests/test_simulation.js`.

### 1. `wrangler.toml`
Create `wrangler.toml` at repository root:
```toml
name = "artificial-life-simulator"
compatibility_date = "2025-01-01"
pages_build_output_dir = "dist"
```

### 2. `scripts/build_standalone.js` & `dist/` Output
- Ensure all modules are included in `moduleFiles`:
  `src/math.js`, `src/neuralBrain.js`, `src/spatialGrid.js`, `src/food.js`, `src/genome.js`, `src/creature.js`, `src/colony.js`, `src/world.js`, `src/charts.js`, `src/audio.js`, `src/neuralVisualizer.js`, `src/arena.js`.
- Write the generated standalone HTML to:
  1. `path.join(rootDir, 'index.html')`
  2. `path.join(rootDir, 'dist', 'index.html')` (creating `dist/` with `fs.mkdirSync(..., { recursive: true })`).
- Write `path.join(rootDir, 'dist', '_headers')` with Cloudflare Pages security & caching headers:
  ```
  /*
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Referrer-Policy: strict-origin-when-cross-origin
    Cache-Control: public, max-age=3600
  ```

### 3. `package.json`
- Ensure `"scripts"` contains:
  - `"test": "node tests/test_simulation.js"`
  - `"review": "node tests/review_game.js"`
  - `"build": "node scripts/build_standalone.js"`
  - `"deploy": "npx wrangler pages deploy dist --project-name artificial-life-simulator"`

### 4. Verification Tests in `tests/test_simulation.js`
Add a Task 9 test section verifying:
- `wrangler.toml` exists and contains `pages_build_output_dir = "dist"` and `name = "artificial-life-simulator"`.
- `dist/index.html` exists, is non-empty, equals root `index.html`, and includes bundled classes (`NeuralBrain`, `Colony`, `NeuralVisualizer`, `ArenaTournament`).
- `dist/_headers` exists and configures `X-Content-Type-Options: nosniff` and `Cache-Control`.
- Run `npm run build` and `npm test` -> 100% pass.
