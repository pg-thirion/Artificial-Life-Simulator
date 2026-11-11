# Task 6 Brief: Multicellular Colony Coordinator & Cellular Differentiation

## Requirements
Create `src/colony.js`, integrate with `src/creature.js`, `src/world.js`, and `scripts/build_standalone.js`, and add unit tests in `tests/test_simulation.js`.

### 1. `Colony` Class in `src/colony.js`
- Export `class Colony`:
  - `constructor(cells = [])`:
    - Assigns unique `this.id`.
    - `this.cells = []`.
    - `this.coreCell = null`.
    - Adds initial cells using `addCell()`.
  - `addCell(creature)`:
    - If `creature.colony` exists or `this.cells.length >= 6`, return `false`.
    - Appends `creature` to `this.cells`.
    - Sets `creature.colony = this`.
    - If `!this.coreCell`, sets `this.coreCell = creature`.
    - Calls `this.recalculateRoles()`.
    - Returns `true`.
  - `removeCell(creature)`:
    - Removes `creature` from `this.cells`.
    - Clears `creature.colony = null` and `creature.colonyRole = null`.
    - If `creature === this.coreCell`:
      - If `this.cells.length > 0`, assigns new `coreCell` to largest living cell.
      - Else `this.coreCell = null`.
    - If `this.cells.length <= 1`:
      - Dissolves colony: remaining cell has `colony = null` and `colonyRole = null`.
      - Clears `this.cells = []`.
    - Calls `this.recalculateRoles()`.
  - `recalculateRoles()`:
    - If `this.cells.length === 0` return.
    - `this.coreCell.colonyRole = 'mouth'`; `this.coreCell.colonyAngleOffset = 0`; `this.coreCell.colonyDistOffset = 0`.
    - For remaining cells $1 \dots N-1$:
      - Offset assignments relative to `coreCell`:
        - Cell 1: `role = 'motor'`, angle $\pi$, dist `coreCell.radius * 1.8`
        - Cell 2: `role = 'armor'`, angle $-\pi/2$, dist `coreCell.radius * 1.8`
        - Cell 3: `role = 'armor'`, angle $\pi/2$, dist `coreCell.radius * 1.8`
        - Cell 4: `role = 'motor'`, angle $3\pi/4$, dist `coreCell.radius * 2.2`
        - Cell 5: `role = 'motor'`, angle $-3\pi/4$, dist `coreCell.radius * 2.2`
  - `update(dt, env)`:
    - Prune dead cells with `removeCell()`.
    - If `this.cells.length <= 1`, dissolve and return `null`.
    - **Energy Pooling**:
      - Sum `totalEnergy` of all cells.
      - Divide evenly: `c.energy = totalEnergy / this.cells.length` for all cells.
    - **Locomotion & Coordination**:
      - Count motor cells: `motorCount = cells.filter(c => c.colonyRole === 'motor').length`.
      - Boost `coreCell` speed multiplier: `1.0 + motorCount * 0.25`.
      - Member cells align polar position, heading, and velocity with `coreCell`:
        `worldAngle = coreCell.heading + c.colonyAngleOffset`
        `c.position.x = coreCell.position.x + Math.cos(worldAngle) * c.colonyDistOffset`
        `c.position.y = coreCell.position.y + Math.sin(worldAngle) * c.colonyDistOffset`
        `c.heading = coreCell.heading`
        `c.velocity.set(coreCell.velocity.x, coreCell.velocity.y)`
    - **Offshoot Splitting**:
      - If `this.cells.length >= 6` and `totalEnergy > 800`, detach child via `splitOffshoot()`.
  - `splitOffshoot()`:
    - Removes last member cell, grants it $50$ energy, returns it as independent creature.
  - `draw(ctx)`:
    - Renders glowing cytoplasmic bridges between `coreCell` and each member.
    - Renders role badges:
      - `'mouth'`: glowing ring around core.
      - `'armor'`: defensive blue chitin shield arc (`rgba(148, 163, 184, 0.7)`).
      - `'motor'`: elongated pulsing flagella tails.

### 2. Integration into `src/creature.js` & `src/world.js`
- In `Creature`:
  - `this.colony = null;`
  - `this.colonyRole = null;`
  - Member cells (where `this.colony && this.colony.coreCell !== this`) do not run individual autonomous steering forces in `update()`.
  - In `takeDamage(amt)`: if creature is in a colony and has armor cells, reduce incoming damage by 60%.
  - On death, `this.colony?.removeCell(this)`.
- In `World`:
  - `this.colonies = [];`
  - In `update(dt)`:
    - Colony formation check: if two alive conspecific organisms with `adhesion >= 0.5` collide (`dist < r1 + r2 + 6`), form or join a colony.
    - Update all colonies, prune dissolved colonies (`this.colonies = this.colonies.filter(c => c.cells.length > 1)`).
  - In `drawWorldEffects(ctx)`:
    - Draw each active colony: `for (const col of this.colonies) col.draw(ctx);`.
- In `scripts/build_standalone.js`:
  - Add `src/colony.js` to `moduleFiles` array before `src/world.js`.

### 3. Verification in `tests/test_simulation.js`
Add tests verifying:
- Colony formation with 2+ high adhesion cells.
- Role differentiation (`mouth`, `motor`, `armor`).
- Energy pooling across all cells.
- Coordinated rigid polar alignment with core cell.
- Motor cells boosting core speed.
- Armor cells reducing damage taken.
- Offshoot splitting when colony reaches capacity.
- Clean dissolution when members drop below 2.
- All existing tests pass (`npm test`).
- Standalone build succeeds (`npm run build`).
