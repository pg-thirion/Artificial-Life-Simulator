# Task 5 Brief: Symbiosis Mutualism & Parasitic Leeches

## Requirements
Implement parasite attachment, energy draining, host-riding physics, and cleaner mutualist grooming in `src/creature.js` and `src/world.js`, with unit tests in `tests/test_simulation.js`.

### 1. Parasite & Host Properties in `src/creature.js`
- Properties on `Creature`:
  - `this.attachedParasites = []`: array of Creature instances attached to this host.
  - `this.hostCreature = null`: Creature instance this creature is currently latched onto.
  - `this.parasiteOffsetAngle = 0`: angular offset relative to host heading.
- Methods on `Creature`:
  - `attachToHost(host)`:
    - Validates: `this.isAlive`, `!this.hostCreature`, `host && host.isAlive`, `this.genome.size < host.genome.size * 0.80`.
    - If valid, sets `this.hostCreature = host`, adds `this` to `host.attachedParasites`, sets `this.parasiteOffsetAngle = Math.random() * Math.PI * 2`. Returns `true`, otherwise `false`.
  - `detachFromHost()`:
    - If `this.hostCreature`:
      - Removes `this` from `this.hostCreature.attachedParasites`.
      - `this.hostCreature = null`.
  - `groomParasite(parasite)`:
    - Verifies `parasite` is attached to a host.
    - Removes `parasite` from its host via `parasite.detachFromHost()`.
    - Cleaner gains energy (e.g. `gained = Math.min(25, parasite.energy * 0.6 + 5); this.energy = Math.min(this.maxEnergy, this.energy + gained)`).
    - Parasite takes damage or is consumed / pushed away.
    - Returns gained energy amount.

### 2. Behavioral Dynamics & Physics in `src/creature.js`
- **Parasite Latching & Draining in `update(dt, env)`**:
  - If `this.hostCreature`:
    - If `!this.hostCreature.isAlive`:
      - Call `this.detachFromHost()`.
    - Else:
      - Coordinate attachment position:
        `const r = this.hostCreature.radius + this.radius * 0.5;`
        `const angle = this.hostCreature.heading + this.parasiteOffsetAngle;`
        `this.position.x = this.hostCreature.position.x + Math.cos(angle) * r;`
        `this.position.y = this.hostCreature.position.y + Math.sin(angle) * r;`
        `this.velocity.set(this.hostCreature.velocity.x, this.hostCreature.velocity.y);`
      - Siphon energy:
        `const drain = 2.0 * dt;`
        `const siphoned = Math.min(this.hostCreature.energy, drain);`
        `this.hostCreature.energy -= siphoned;`
        `this.energy = Math.min(this.maxEnergy, this.energy + siphoned * 0.8);`
      - Attached parasite skips autonomous steering locomotion.
  - If not attached and `isParasite`:
    - (`this.genome.symbiosis < 0.25 && this.genome.diet > 0.45 && this.genome.size < 7.0`)
    - Seeks nearby large hosts (`size > this.genome.size * 1.35`) and latches on contact (`dist <= this.radius + target.radius + 3`).
- **Cleaner Mutualism in `update(dt, env)`**:
  - Organisms with `this.genome.symbiosis >= 0.6`:
    - Seek nearby organisms with `attachedParasites.length > 0`.
    - If in contact (`dist <= this.radius + host.radius + 6`), calls `this.groomParasite(host.attachedParasites[0])`.
- **Predator Immunity for Cleaners**:
  - In predator prey scanning (`evaluateBehavior` and `evaluateNeuralBehavior`):
    - Predators do not target creatures with `genome.symbiosis >= 0.6` unless predator is starving (`energy < maxEnergy * 0.25`).
- **On Death**:
  - In `Creature.die()` or when `isAlive = false`:
    - If host dies, all `attachedParasites` are detached (`p.detachFromHost()`).
    - If parasite dies, `detachFromHost()` is called.

### 3. Rendering in `src/creature.js`
- In `draw(ctx)`:
  - If organism is attached as a parasite, render distinct latching tendrils/claws.
  - If host has attached parasites, show small warning distress dots or indicators.

### 4. Tests in `tests/test_simulation.js`
Add tests verifying:
- Parasite successfully attaches to host with `attachToHost()`.
- Parasite position synchronizes with host movement.
- Host energy is drained over multiple update frames and transferred to parasite.
- Detaching parasite stops energy drain.
- Cleaner mutualist grooms parasite off host and receives energy reward.
- Host death detaches all parasites safely without error.
- All existing tests pass (`npm test`).
