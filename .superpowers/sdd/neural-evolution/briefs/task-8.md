# Task 8 Brief: Species Arena Battle Royale Tournament Mode

## Requirements
Create `src/arena.js`, integrate Arena UI into `src/template.html` and `src/app.js`, update `scripts/build_standalone.js`, and add comprehensive unit tests in `tests/test_simulation.js`.

### 1. `ArenaTournament` Class in `src/arena.js`
- Export `class ArenaTournament`:
  - `constructor(world, options = {})`:
    - `this.world = world;`
    - `this.centerX = options.centerX ?? (world ? world.width / 2 : 1400);`
    - `this.centerY = options.centerY ?? (world ? world.height / 2 : 900);`
    - `this.initialRadius = options.initialRadius ?? 1200;`
    - `this.minRadius = options.minRadius ?? 80;`
    - `this.duration = options.duration ?? 90;` // seconds
    - `this.radiationDamagePerSec = options.radiationDamagePerSec ?? 25;`
    - `this.stormRadius = this.initialRadius;`
    - `this.elapsedTime = 0;`
    - `this.isActive = false;`
    - `this.isComplete = false;`
    - `this.competingClades = [];`
    - `this.winner = null;`
    - `this.worldSnapshot = null;`
  - `snapshotWorld()`:
    - Saves current world state (`creatures` cloned/referenced, `food`, `time`, `temperature`, `climateState`, `speciesRegistry`) so exiting Arena restores the exact prior sandbox state.
  - `restoreWorld()`:
    - Restores `this.worldSnapshot` back to `this.world`, rebuilds `creatureGrid`, clears `this.worldSnapshot`, sets `this.isActive = false`, `this.isComplete = false`, `this.winner = null`.
  - `start(cladeSpecs = [])`:
    - If `!this.isActive`, calls `this.snapshotWorld()`.
    - Determines 4 competing clades (uses passed `cladeSpecs`, or top living species in `world`, filling up to 4 with generated distinct neural warrior clades if fewer than 4 exist).
    - Clears `world.creatures`, `world.colonies`, `world.creatureGrid`, and spawns central arena food pellets.
    - Spawns `organismsPerClade` (default 10) creatures for each competing clade in symmetric ring sectors inside `initialRadius * 0.55`.
    - Sets `this.stormRadius = this.initialRadius`, `this.elapsedTime = 0`, `this.isActive = true`, `this.isComplete = false`, `this.winner = null`.
  - `stop()`:
    - Calls `this.restoreWorld()`.
  - `update(dt)`:
    - If `!this.isActive`, returns `{ isComplete: this.isComplete, winner: this.winner }`.
    - If `!this.isComplete`:
      - `this.elapsedTime += dt;`
      - `const progress = clamp(this.elapsedTime / this.duration, 0, 1);`
      - `this.stormRadius = this.initialRadius - (this.initialRadius - this.minRadius) * progress;`
      - For each alive creature in `this.world.creatures`:
        - Compute distance `d` from `(this.centerX, this.centerY)`.
        - If `d > this.stormRadius`:
          - Inflict radiation damage: `c.energy -= this.radiationDamagePerSec * dt;`
          - If `c.energy <= 0`: call `c.die('disaster')` (or set `c.isAlive = false; c.causeOfDeath = 'disaster'`).
      - Update `this.competingClades` (`aliveCount`, `kills`, `totalEnergy`).
      - Check victory condition:
        - Filter clades with `aliveCount > 0`.
        - If `survivingClades.length <= 1` (and total initial clades > 1):
          - `this.isComplete = true;`
          - `this.winner = survivingClades[0] || this.competingClades[0] || null;`
    - Return `{ isComplete: this.isComplete, winner: this.winner, stormRadius: this.stormRadius, leaderboard: this.competingClades }`.
  - `draw(ctx)`:
    - If `!this.isActive || !ctx` return.
    - Draws glowing radiation storm boundary circle at `(this.centerX, this.centerY)` with radius `this.stormRadius`, outer hazard tint, and pulsing electrical border (`#f43f5e` / `#c084fc`).

### 2. Arena UI in `src/template.html` & `src/app.js`
- In `src/template.html`:
  - Add button `#btn-arena-mode` (`⚔️ Arena`) in `.audio-bar`.
  - Add `#arena-hud` overlay panel (hidden by default, `.open` when Arena active) displaying:
    - Storm radius & timer (`#arena-timer-stat`)
    - Clade Leaderboard (`#arena-leaderboard`)
    - Winner Podium Banner (`#arena-winner-banner`)
    - Action buttons: `#btn-arena-rematch` ("🔄 Rematch") and `#btn-arena-exit` ("🚪 Exit to Sandbox").
- In `src/app.js`:
  - Import `ArenaTournament` from `./arena.js`.
  - Instantiate `const arena = new ArenaTournament(world);`.
  - Wire `#btn-arena-mode`, `#btn-arena-rematch`, and `#btn-arena-exit`.
  - In main loop: call `arena.update(dt)` when `arena.isActive`, update `#arena-hud`, and call `arena.draw(ctx)` in world render pass.

### 3. Build & Tests
- Add `'src/arena.js'` to `moduleFiles` in `scripts/build_standalone.js`.
- Add unit tests in `tests/test_simulation.js` testing:
  - Storm ring contraction from `1200` to `80` over `90s`.
  - Out-of-bounds radiation damage and elimination.
  - Clade survival leaderboard and winner crowning when 1 clade remains.
  - Sandbox snapshot and full state restoration via `stop()`.
  - `draw(ctx)` canvas rendering without error.
- Verify `npm test` and `npm run build` pass.
