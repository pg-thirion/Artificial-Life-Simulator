/**
 * Artificial Life Simulator - Multicellular Colony Coordinator & Cellular Differentiation
 * Implements multicellular super-organisms with specialized differentiated cell roles
 * ('mouth', 'motor', 'armor'), shared energy pooling, coordinated polar movement locking,
 * and asexual offshoot fission.
 */

import { Vector2D } from './math.js';

let NEXT_COLONY_ID = 1;

/**
 * Standard relative polar offsets for member cells 1..5 relative to coreCell (index 0).
 */
const MEMBER_ROLE_CONFIGS = [
  { role: 'motor', angle: Math.PI, distMult: 1.8 },
  { role: 'armor', angle: -Math.PI / 2, distMult: 1.8 },
  { role: 'armor', angle: Math.PI / 2, distMult: 1.8 },
  { role: 'motor', angle: (3 * Math.PI) / 4, distMult: 2.2 },
  { role: 'motor', angle: (-3 * Math.PI) / 4, distMult: 2.2 }
];

export class Colony {
  /**
   * @param {Creature[]} [cells=[]] Initial member organisms
   */
  constructor(cells = []) {
    this.id = NEXT_COLONY_ID++;
    this.cells = [];
    this.coreCell = null;
    this.speedMultiplier = 1.0;

    for (const cell of cells) {
      this.addCell(cell);
    }
  }

  /**
   * Appends an organism to the colony if capacity (< 6) and not already in a colony.
   * @param {Creature} creature 
   * @returns {boolean} True if successfully added
   */
  addCell(creature) {
    if (!creature || creature.colony || this.cells.length >= 6) {
      return false;
    }
    this.cells.push(creature);
    creature.colony = this;
    if (!this.coreCell) {
      this.coreCell = creature;
    }
    this.recalculateRoles();
    return true;
  }

  /**
   * Removes an organism from the colony, reassigning core and recalculating roles,
   * or dissolving if <= 1 cell remains.
   * @param {Creature} creature 
   * @returns {boolean} True if removed
   */
  removeCell(creature) {
    const idx = this.cells.indexOf(creature);
    if (idx === -1) return false;

    this.cells.splice(idx, 1);
    creature.colony = null;
    creature.colonyRole = null;
    creature.colonyAngleOffset = 0;
    creature.colonyDistOffset = 0;

    if (creature === this.coreCell) {
      if (this.cells.length > 0) {
        const living = this.cells.filter(c => c.isAlive);
        const candidates = living.length > 0 ? living : this.cells;
        candidates.sort((a, b) => {
          const sizeA = a.radius ?? a.genome?.size ?? 0;
          const sizeB = b.radius ?? b.genome?.size ?? 0;
          return sizeB - sizeA;
        });
        this.coreCell = candidates[0] || null;
      } else {
        this.coreCell = null;
      }
    }

    if (this.cells.length <= 1) {
      if (this.cells.length === 1) {
        const remaining = this.cells[0];
        remaining.colony = null;
        remaining.colonyRole = null;
        remaining.colonyAngleOffset = 0;
        remaining.colonyDistOffset = 0;
      }
      this.cells = [];
      this.coreCell = null;
    } else {
      this.recalculateRoles();
    }

    return true;
  }

  /**
   * Recalculates specialized cellular roles and polar position offsets.
   */
  recalculateRoles() {
    if (this.cells.length === 0) return;

    if (!this.coreCell || !this.cells.includes(this.coreCell)) {
      const living = this.cells.filter(c => c.isAlive);
      const candidates = living.length > 0 ? living : this.cells;
      candidates.sort((a, b) => {
        const sizeA = a.radius ?? a.genome?.size ?? 0;
        const sizeB = b.radius ?? b.genome?.size ?? 0;
        return sizeB - sizeA;
      });
      this.coreCell = candidates[0];
    }

    // Core Cell: Mouth / Navigation leader
    this.coreCell.colonyRole = 'mouth';
    this.coreCell.colonyAngleOffset = 0;
    this.coreCell.colonyDistOffset = 0;

    // Remaining cells 1..N-1: Specialized peripheral roles
    const otherCells = this.cells.filter(c => c !== this.coreCell);
    for (let i = 0; i < otherCells.length; i++) {
      const member = otherCells[i];
      const cfg = MEMBER_ROLE_CONFIGS[i] || { role: 'motor', angle: Math.PI, distMult: 2.0 };
      member.colonyRole = cfg.role;
      member.colonyAngleOffset = cfg.angle;
      member.colonyDistOffset = this.coreCell.radius * cfg.distMult;

      // Synchronize polar coordinates immediately
      const worldAngle = this.coreCell.heading + member.colonyAngleOffset;
      member.position.x = this.coreCell.position.x + Math.cos(worldAngle) * member.colonyDistOffset;
      member.position.y = this.coreCell.position.y + Math.sin(worldAngle) * member.colonyDistOffset;
      member.heading = this.coreCell.heading;
      if (member.velocity && this.coreCell.velocity) {
        member.velocity.set(this.coreCell.velocity.x, this.coreCell.velocity.y);
      }
    }
  }

  /**
   * Main colony tick: prunes dead cells, pools energy, synchronizes locomotion,
   * and triggers offshoot splitting if saturated.
   * @param {number} dt Delta time
   * @param {Object} [env=null] Environment telemetry
   * @returns {Creature|null} Split offshoot child if one was detached
   */
  update(dt, env = null) {
    // 1. Prune dead cells
    for (let i = this.cells.length - 1; i >= 0; i--) {
      const c = this.cells[i];
      if (!c.isAlive) {
        this.removeCell(c);
      }
    }

    // 2. Dissolve colony if <= 1 cell left
    if (this.cells.length <= 1) {
      if (this.cells.length === 1) {
        const remaining = this.cells[0];
        remaining.colony = null;
        remaining.colonyRole = null;
        remaining.colonyAngleOffset = 0;
        remaining.colonyDistOffset = 0;
        this.cells = [];
        this.coreCell = null;
      }
      return null;
    }

    // 3. Energy Pooling: sum and divide total energy evenly
    let totalEnergy = 0;
    for (const c of this.cells) {
      totalEnergy += c.energy;
    }
    const pooledEnergy = totalEnergy / this.cells.length;
    for (const c of this.cells) {
      c.energy = pooledEnergy;
    }

    // 4. Locomotion & Coordination: motor cell speed boost and rigid polar positioning
    const motorCount = this.cells.filter(c => c.colonyRole === 'motor').length;
    this.speedMultiplier = 1.0 + motorCount * 0.25;

    if (this.coreCell) {
      this.coreCell.colonySpeedMultiplier = this.speedMultiplier;
      this.coreCell.speedMultiplier = this.speedMultiplier;

      for (const c of this.cells) {
        if (c === this.coreCell) continue;
        const worldAngle = this.coreCell.heading + c.colonyAngleOffset;
        c.position.x = this.coreCell.position.x + Math.cos(worldAngle) * c.colonyDistOffset;
        c.position.y = this.coreCell.position.y + Math.sin(worldAngle) * c.colonyDistOffset;
        c.heading = this.coreCell.heading;
        if (c.velocity && this.coreCell.velocity) {
          c.velocity.set(this.coreCell.velocity.x, this.coreCell.velocity.y);
        }
      }
    }

    // 5. Offshoot Splitting: Saturated colony produces independent offspring
    if (this.cells.length >= 6 && totalEnergy > 800) {
      return this.splitOffshoot();
    }

    return null;
  }

  /**
   * Detaches the last peripheral cell from the colony with starting fuel.
   * @returns {Creature|null} Detached child creature
   */
  splitOffshoot() {
    if (this.cells.length <= 1) return null;
    const child = this.cells[this.cells.length - 1];
    this.removeCell(child);
    child.energy = 50;
    return child;
  }

  /**
   * Renders glowing cytoplasmic bridges and differentiated role badges.
   * @param {CanvasRenderingContext2D} ctx 
   */
  draw(ctx) {
    if (!ctx || !this.coreCell || this.cells.length <= 1) return;

    // 1. Glowing bioluminescent cytoplasmic bridges
    for (const c of this.cells) {
      if (c === this.coreCell || !c.isAlive) continue;
      if (ctx.save) ctx.save();

      // Outer cytoplasmic tether
      if (ctx.beginPath) ctx.beginPath();
      if (ctx.moveTo) ctx.moveTo(this.coreCell.position.x, this.coreCell.position.y);
      if (ctx.lineTo) ctx.lineTo(c.position.x, c.position.y);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = Math.max(3, Math.min(this.coreCell.radius, c.radius) * 0.45);
      ctx.lineCap = 'round';
      if (ctx.stroke) ctx.stroke();

      // Inner nutrient canal
      if (ctx.beginPath) ctx.beginPath();
      if (ctx.moveTo) ctx.moveTo(this.coreCell.position.x, this.coreCell.position.y);
      if (ctx.lineTo) ctx.lineTo(c.position.x, c.position.y);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.3);
      if (ctx.stroke) ctx.stroke();

      if (ctx.restore) ctx.restore();
    }

    // 2. Specialized role badges
    for (const c of this.cells) {
      if (!c.isAlive) continue;
      if (ctx.save) ctx.save();

      if (c.colonyRole === 'mouth') {
        // 'mouth': Glowing feeding corona ring around core
        if (ctx.beginPath) ctx.beginPath();
        if (ctx.arc) ctx.arc(c.position.x, c.position.y, c.radius + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.lineWidth = 2.5;
        if (ctx.stroke) ctx.stroke();
      } else if (c.colonyRole === 'armor') {
        // 'armor': Defensive blue chitin shield arc
        if (ctx.beginPath) ctx.beginPath();
        const heading = c.heading || 0;
        if (ctx.arc) ctx.arc(c.position.x, c.position.y, c.radius + 4, heading - Math.PI / 2, heading + Math.PI / 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        if (ctx.stroke) ctx.stroke();
      } else if (c.colonyRole === 'motor') {
        // 'motor': Elongated flagella tails
        const heading = c.heading || 0;
        const tailAngle = heading + Math.PI;
        const tailLen = c.radius * 2.2;
        if (ctx.beginPath) ctx.beginPath();
        if (ctx.moveTo) ctx.moveTo(c.position.x, c.position.y);
        if (ctx.lineTo) {
          ctx.lineTo(c.position.x + Math.cos(tailAngle) * tailLen, c.position.y + Math.sin(tailAngle) * tailLen);
        }
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 2.0;
        if (ctx.stroke) ctx.stroke();
      }

      if (ctx.restore) ctx.restore();
    }
  }
}
