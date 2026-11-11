/**
 * Artificial Life Simulator - Organism Physics, Metabolism & Autonomous Steering
 * Faithful implementation of Primer's mass-volume metabolic physics,
 * Reynolds autonomous steering behaviors, and expressive 2D blob morphology.
 */

import { Vector2D, randomFloat, randomGaussian, clamp, lerp, normalizeAngle } from './math.js';
import { Genome } from './genome.js';
import { NeuralBrain } from './neuralBrain.js';

let NEXT_CREATURE_ID = 1;

export class Creature {
  /**
   * @param {number} x 
   * @param {number} y 
   * @param {Genome} [genome] 
   * @param {number} [initialEnergy=100] 
   */
  constructor(x, y, genome = null, initialEnergy = null) {
    this.id = NEXT_CREATURE_ID++;

    // Genetics
    this.genome = genome ? genome.clone() : Genome.random('herbivore');

    // Neural Perceptron Brain
    this.brain = new NeuralBrain(this.genome.brainWeights);

    // Organism Physics
    this.position = new Vector2D(x, y);
    this.velocity = Vector2D.random(this.genome.speed * 0.5);
    this.acceleration = new Vector2D(0, 0);

    // Dynamic rotation & orientation
    this.heading = this.velocity.heading();
    this.angularVelocity = 0;

    // Mass & dimensions strictly derived from size gene
    this.radius = this.genome.size;
    this.mass = Math.max(1.0, this.genome.size);

    // Morphological squash & stretch + animated swimming tail
    this.squishFactor = 1.0;
    this.tailWiggle = Math.random() * Math.PI * 2;
    this.tailWiggleSpeed = 8.0;
    this.mitosisTimer = 0; // Visual pinch/wobble on birth

    // Reynolds wander angle
    this.wanderAngle = Math.random() * Math.PI * 2;

    // Energy & Life Cycle
    this.maxEnergy = this.genome.size * 26.0;
    this.energy = initialEnergy !== null ? initialEnergy : Math.min(this.maxEnergy * 0.65, 100);
    this.reproductionThreshold = Math.max(140, this.genome.size * 18.0);
    this.birthEnergyTax = 22.0;

    this.age = 0;
    // Lifespan scales positively with size and inversely with metabolic rate (Primer biology)
    this.lifespan = randomFloat(70, 110) * (this.genome.size / 8.5) / this.genome.metabolismRate;
    this.isAlive = true;
    this.causeOfDeath = null; // 'starvation' | 'predation' | 'old_age'

    // Ecological statistics
    this.kills = 0;
    this.plantsEaten = 0;
    this.meatEaten = 0;
    this.offspringCount = 0;
    this.distanceTraveled = 0;

    // Lineage & Sexual Reproduction
    this.parentAId = null;
    this.parentBId = null;
    this.reproductionType = 'asexual';
    this.matingCooldown = randomFloat(2.0, 6.0);
    this.courtshipTarget = null;

    // Behavioral & Intention state
    this.state = 'wandering'; // 'wandering' | 'foraging' | 'hunting' | 'fleeing' | 'courtship' | 'possessed'
    this.currentIntention = 'Exploring Habitat';
    this.currentTarget = null;
    this.threatTarget = null;
    this.isHighlighted = false;
    this.isPossessed = false;
    this.playerInputVector = new Vector2D(0, 0);

    // Neural sensory and motor telemetry
    this.lastNeuralInputs = null;
    this.lastNeuralOutputs = null;
  }

  /**
   * Brain architecture type ('neural' | 'heuristic').
   * @returns {'neural'|'heuristic'}
   */
  get brainType() {
    return this.genome.brainType;
  }

  set brainType(val) {
    this.genome.brainType = val;
  }

  /**
   * Calculates Primer-exact metabolic cost per second:
   * Cost = basalCost(size^3 * 0.0015 * metabolismRate)
   *      + moveCost(size * speed^2 * 0.0008)
   *      + senseCost(sense * 0.003)
   *      + huntingMod
   * @param {number} currentSpeed Speed in pixels per frame/second
   * @param {boolean} isHunting Whether actively sprinting or locked in predation
   * @returns {number} Energy burned per second
   */
  calculateMetabolicCost(currentSpeed, isHunting = false, kineticMultiplier = 1.0) {
    const size = this.genome.size;
    const basalCost = Math.pow(size, 3) * 0.0015 * this.genome.metabolismRate;
    const moveCost = size * (currentSpeed * currentSpeed) * 0.014 * kineticMultiplier;
    const senseCost = this.genome.sense * 0.003;
    const huntingMod = isHunting ? (0.28 * size) : 0;

    return basalCost + moveCost + senseCost + huntingMod;
  }

  /**
   * Applies an external force vector: F = ma => a += F / m.
   * @param {Vector2D} force 
   */
  applyForce(force) {
    const f = Vector2D.div(force, this.mass);
    this.acceleration.add(f);
  }

  /**
   * Reynolds Autonomous Steering: Smooth Perlin-style wander.
   * Projects a circle ahead of creature and jitters a target point along its perimeter.
   * @param {number} [strength=0.18] 
   * @returns {Vector2D} Steering force
   */
  wander(strength = 0.22) {
    const circleRadius = 24.0;
    const circleDistance = 45.0;
    const change = 0.35;

    this.wanderAngle += randomFloat(-change, change);

    // Point on wander circle ahead of creature
    const circleCenter = this.velocity.copy().normalize().mult(circleDistance);
    const displacement = Vector2D.fromAngle(this.wanderAngle, circleRadius);
    const wanderForce = circleCenter.add(displacement);

    wanderForce.limit(this.genome.speed * strength);
    return wanderForce;
  }

  /**
   * Reynolds Autonomous Steering: Seek with smooth arrival deceleration.
   * @param {Vector2D} targetPos 
   * @param {number} [slowingRadius=20] 
   * @returns {Vector2D} Steering force
   */
  seek(targetPos, slowingRadius = 20) {
    const desired = Vector2D.sub(targetPos, this.position);
    const d = desired.mag();

    if (d < 1e-5) return new Vector2D(0, 0);

    let targetSpeed = this.genome.speed;
    if (d < slowingRadius) {
      targetSpeed = this.genome.speed * (d / slowingRadius);
    }

    desired.setMag(targetSpeed);
    const steer = Vector2D.sub(desired, this.velocity);
    steer.limit(0.35);
    return steer;
  }

  /**
   * Reynolds Autonomous Steering: Evasive flee from predator / threat.
   * Includes panic sprint acceleration.
   * @param {Vector2D} threatPos 
   * @param {number} [panicRadius=120] 
   * @returns {Vector2D} Steering force
   */
  flee(threatPos, panicRadius = 120) {
    const desired = Vector2D.sub(this.position, threatPos);
    const d = desired.mag();

    if (d > panicRadius || d < 1e-5) return new Vector2D(0, 0);

    // Evasive sprint: panic adds a temporary 15% speed surge
    const sprintSpeed = this.genome.speed * 1.15;
    desired.setMag(sprintSpeed);

    const steer = Vector2D.sub(desired, this.velocity);
    steer.limit(0.55); // More urgent force than standard wander
    return steer;
  }

  /**
   * Reynolds Autonomous Steering: Intercept pursuit / predatory hunt.
   * Predicts prey motion and steers towards projected intercept point.
   * @param {Creature} prey 
   * @returns {Vector2D} Steering force
   */
  hunt(prey) {
    if (!prey || !prey.isAlive) return this.wander();

    const toPrey = Vector2D.sub(prey.position, this.position);
    const d = toPrey.mag();
    const relativeSpeed = Math.max(0.1, this.genome.speed);
    const lookAheadTime = clamp(d / relativeSpeed, 0, 1.5);

    // Intercept position
    const futurePos = Vector2D.add(
      prey.position,
      Vector2D.mult(prey.velocity, lookAheadTime * 12.0)
    );

    const steer = this.seek(futurePos, 15);
    steer.limit(0.48);
    return steer;
  }

  /**
   * Soft repulsion from world edges to keep creatures naturally contained.
   * @param {number} worldWidth 
   * @param {number} worldHeight 
   * @param {number} [margin=60] 
   * @returns {Vector2D}
   */
  avoidBoundaries(worldWidth, worldHeight, margin = 60) {
    const steer = new Vector2D(0, 0);
    const maxSpeed = this.genome.speed;

    if (this.position.x < margin) {
      steer.x = maxSpeed * ((margin - this.position.x) / margin);
    } else if (this.position.x > worldWidth - margin) {
      steer.x = -maxSpeed * ((this.position.x - (worldWidth - margin)) / margin);
    }

    if (this.position.y < margin) {
      steer.y = maxSpeed * ((margin - this.position.y) / margin);
    } else if (this.position.y > worldHeight - margin) {
      steer.y = -maxSpeed * ((this.position.y - (worldHeight - margin)) / margin);
    }

    steer.limit(0.5);
    return steer;
  }

  /**
   * Evaluates the 10-input normalized sensory pipeline and actuates neural motor impulses.
   * Inputs (all finite, normalized):
   *  0: nearestFoodDistNorm [0, 1]
   *  1: nearestFoodAngleNorm [-1, 1]
   *  2: nearestFoodDangerSignal [0, 1]
   *  3: nearestThreatDistNorm [0, 1]
   *  4: nearestThreatAngleNorm [-1, 1]
   *  5: nearestMateDistNorm [0, 1]
   *  6: nearestMateAngleNorm [-1, 1]
   *  7: energyRatio [0, 1]
   *  8: biomeDragStress [0, 1]
   *  9: solarIntensity [0, 1]
   *
   * @param {Object} [env={}] Environmental perception context
   * @returns {{steerAngleDelta: number, thrustMagnitude: number, courtshipDesire: number, aggressionImpulse: number, inputs: Float32Array, outputs: Float32Array}}
   */
  evaluateNeuralBehavior(env = {}) {
    const safeEnv = env || {};

    // Circadian nocturnal perception scaling
    let effectiveSense = this.genome.sense;
    if (safeEnv.isNight) {
      if ((this.genome.nocturnal ?? 0.2) >= 0.5) {
        effectiveSense *= 1.25;
      } else {
        effectiveSense *= 0.82;
      }
    }
    const sense = Math.max(1.0, effectiveSense);

    // 1. Scan for Food Pellets & Living Prey
    let closestFoodEntity = null;
    let closestFoodDist = Infinity;
    let closestFoodIsPrey = false;

    if (safeEnv.foodGrid) {
      const prefersMeat = this.genome.diet > 0.55;
      const prefersPlants = this.genome.diet < 0.45;
      const nearestPellet = safeEnv.foodGrid.queryNearest(this.position.x, this.position.y, sense, (food) => {
        if (food.isRotten) return false;
        if (prefersMeat) return food.type === 'meat';
        if (prefersPlants) return food.type === 'plant';
        return true;
      });
      if (nearestPellet) {
        closestFoodEntity = nearestPellet.entity;
        closestFoodDist = nearestPellet.distance;
        closestFoodIsPrey = false;
      }
    }

    if (this.genome.diet >= 0.42 && safeEnv.creatureGrid) {
      const preyCandidates = safeEnv.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        if (c === this || !c.isAlive) return false;
        const camo = c.genome?.camouflage ?? 0.25;
        const d = this.position.dist(c.position);
        const maxDetectDist = sense * (1.0 - camo * 0.60);
        return d <= maxDetectDist &&
          (this.genome.size > c.genome.size * 1.08) &&
          (c.genome.diet < this.genome.diet) &&
          (this.genome.geneticDistance(c.genome) > 0.16);
      });
      for (let i = 0; i < preyCandidates.length; i++) {
        const p = preyCandidates[i];
        const d = this.position.dist(p.position);
        if (d < closestFoodDist) {
          closestFoodDist = d;
          closestFoodEntity = p;
          closestFoodIsPrey = true;
        }
      }
    }

    let nearestFoodDistNorm = 0.0;
    let nearestFoodAngleNorm = 0.0;
    let nearestFoodDangerSignal = 0.0;

    if (closestFoodEntity && Number.isFinite(closestFoodDist)) {
      nearestFoodDistNorm = 1.0 - clamp(closestFoodDist / sense, 0.0, 1.0);
      const targetPos = closestFoodEntity.position;
      const angleToTarget = Math.atan2(targetPos.y - this.position.y, targetPos.x - this.position.x);
      const angleDelta = normalizeAngle(angleToTarget - this.heading);
      nearestFoodAngleNorm = clamp(angleDelta / Math.PI, -1.0, 1.0);
      if (closestFoodIsPrey) {
        nearestFoodDangerSignal = clamp(closestFoodEntity.aposematicWarningLevel ?? closestFoodEntity.genome?.armor ?? 0.0, 0.0, 1.0);
      } else {
        nearestFoodDangerSignal = 0.0;
      }
    }

    // 2. Scan for Predatory Threats
    let closestThreat = null;
    let closestThreatDist = Infinity;

    if (safeEnv.creatureGrid) {
      const threatCandidates = safeEnv.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        return c !== this && c.isAlive && c.genome?.diet > 0.45 && c.genome?.size > this.genome.size * 1.12;
      });
      for (let i = 0; i < threatCandidates.length; i++) {
        const t = threatCandidates[i];
        const d = this.position.dist(t.position);
        if (d <= sense && (d < closestThreatDist || (Math.abs(d - closestThreatDist) < 1e-4 && t.genome.size > closestThreat.genome.size))) {
          closestThreatDist = d;
          closestThreat = t;
        }
      }
    }

    let nearestThreatDistNorm = 0.0;
    let nearestThreatAngleNorm = 0.0;

    if (closestThreat && Number.isFinite(closestThreatDist)) {
      nearestThreatDistNorm = 1.0 - clamp(closestThreatDist / sense, 0.0, 1.0);
      const angleToThreat = Math.atan2(closestThreat.position.y - this.position.y, closestThreat.position.x - this.position.x);
      const angleDelta = normalizeAngle(angleToThreat - this.heading);
      nearestThreatAngleNorm = clamp(angleDelta / Math.PI, -1.0, 1.0);
    }

    // 3. Scan for Potential Mates (compatible species)
    let closestMate = null;
    let closestMateDist = Infinity;

    if (safeEnv.creatureGrid) {
      const mateCandidates = safeEnv.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        return c !== this && c.isAlive && this.genome.geneticDistance(c.genome) <= 0.40;
      });
      for (let i = 0; i < mateCandidates.length; i++) {
        const m = mateCandidates[i];
        const d = this.position.dist(m.position);
        if (d <= sense && d < closestMateDist) {
          closestMateDist = d;
          closestMate = m;
        }
      }
    }

    let nearestMateDistNorm = 0.0;
    let nearestMateAngleNorm = 0.0;

    if (closestMate && Number.isFinite(closestMateDist)) {
      nearestMateDistNorm = 1.0 - clamp(closestMateDist / sense, 0.0, 1.0);
      const angleToMate = Math.atan2(closestMate.position.y - this.position.y, closestMate.position.x - this.position.x);
      const angleDelta = normalizeAngle(angleToMate - this.heading);
      nearestMateAngleNorm = clamp(angleDelta / Math.PI, -1.0, 1.0);
    }

    // 4. Internal Metabolic State
    const energyRatio = (this.maxEnergy > 0 && Number.isFinite(this.energy))
      ? clamp(this.energy / this.maxEnergy, 0.0, 1.0)
      : 0.0;

    // 5. Environmental Factors: Drag & Solar Intensity
    let biomeDragStress = 0.0;
    if (typeof safeEnv.drag === 'number') {
      biomeDragStress = safeEnv.drag;
    } else if (typeof safeEnv.biomeDrag === 'number') {
      biomeDragStress = safeEnv.biomeDrag;
    } else if (typeof safeEnv.getBiomeAt === 'function') {
      const biome = safeEnv.getBiomeAt(this.position.x, this.position.y);
      if (biome && typeof biome.drag === 'number') {
        biomeDragStress = biome.drag;
      }
    }
    biomeDragStress = clamp(Number.isFinite(biomeDragStress) ? biomeDragStress : 0.0, 0.0, 1.0);

    let solarIntensity = 0.9;
    if (typeof safeEnv.solarIntensity === 'number') {
      solarIntensity = safeEnv.solarIntensity;
    } else if (safeEnv.isNight !== undefined) {
      solarIntensity = safeEnv.isNight ? 0.15 : 0.9;
    }
    solarIntensity = clamp(Number.isFinite(solarIntensity) ? solarIntensity : 0.9, 0.0, 1.0);

    // Guard all 10 features into Float32Array(10)
    const inputs = new Float32Array(10);
    inputs[0] = clamp(Number.isFinite(nearestFoodDistNorm) ? nearestFoodDistNorm : 0, 0, 1);
    inputs[1] = clamp(Number.isFinite(nearestFoodAngleNorm) ? nearestFoodAngleNorm : 0, -1, 1);
    inputs[2] = clamp(Number.isFinite(nearestFoodDangerSignal) ? nearestFoodDangerSignal : 0, 0, 1);
    inputs[3] = clamp(Number.isFinite(nearestThreatDistNorm) ? nearestThreatDistNorm : 0, 0, 1);
    inputs[4] = clamp(Number.isFinite(nearestThreatAngleNorm) ? nearestThreatAngleNorm : 0, -1, 1);
    inputs[5] = clamp(Number.isFinite(nearestMateDistNorm) ? nearestMateDistNorm : 0, 0, 1);
    inputs[6] = clamp(Number.isFinite(nearestMateAngleNorm) ? nearestMateAngleNorm : 0, -1, 1);
    inputs[7] = clamp(Number.isFinite(energyRatio) ? energyRatio : 0, 0, 1);
    inputs[8] = clamp(Number.isFinite(biomeDragStress) ? biomeDragStress : 0, 0, 1);
    inputs[9] = clamp(Number.isFinite(solarIntensity) ? solarIntensity : 0, 0, 1);

    // Forward pass
    if (!this.brain) {
      this.brain = new NeuralBrain(this.genome.brainWeights);
    }
    const outputs = this.brain.forward(inputs);
    const steerAngleDelta = Number.isFinite(outputs[0]) ? outputs[0] : 0.0;
    const thrustMagnitude = Number.isFinite(outputs[1]) ? outputs[1] : 0.0;
    const courtshipDesire = Number.isFinite(outputs[2]) ? outputs[2] : 0.0;
    const aggressionImpulse = Number.isFinite(outputs[3]) ? outputs[3] : 0.0;

    // Motor Actuation
    const desiredHeading = this.heading + steerAngleDelta;
    const desiredVel = Vector2D.fromAngle(desiredHeading, this.genome.speed * thrustMagnitude);
    const steerForce = Vector2D.sub(desiredVel, this.velocity);
    steerForce.limit(0.55);
    this.applyForce(steerForce);

    // Cache telemetry and targets
    this.lastNeuralInputs = inputs;
    this.lastNeuralOutputs = outputs;
    this.currentTarget = closestFoodEntity;
    this.threatTarget = closestThreat;
    this.courtshipTarget = closestMate;
    this.state = 'neural';
    const thrustPct = (thrustMagnitude * 100).toFixed(0);
    const turnDeg = (steerAngleDelta * 180 / Math.PI).toFixed(0);
    this.currentIntention = `Neural: Thrust ${thrustPct}%, Turn ${turnDeg}°`;

    return {
      steerAngleDelta,
      thrustMagnitude,
      courtshipDesire,
      aggressionImpulse,
      inputs,
      outputs
    };
  }

  /**
   * Evaluates sensory perception and steers towards targets or away from predators.
   * @param {Object} env Environment context
   * @param {SpatialGrid} env.foodGrid
   * @param {SpatialGrid} env.creatureGrid
   * @param {number} env.worldWidth
   * @param {number} env.worldHeight
   * @returns {{action: string, target: Object|null}}
   */
  evaluateBehavior(env) {
    // If possessed by player, bypass AI autonomy
    if (this.isPossessed) {
      this.state = 'possessed';
      this.currentIntention = 'Player Controlled (WASD)';
      if (this.playerInputVector.magSq() > 0.01) {
        const desired = this.playerInputVector.copy().setMag(this.genome.speed * 1.15);
        const steer = Vector2D.sub(desired, this.velocity);
        steer.limit(0.65);
        this.applyForce(steer);
      } else {
        this.velocity.mult(0.94); // gentle drag
      }
      return { action: 'possessed', target: null };
    }

    // Neural Brain Autonomous Steering
    if (this.brainType === 'neural') {
      return this.evaluateNeuralBehavior(env);
    }

    // Circadian nocturnal perception scaling
    let effectiveSense = this.genome.sense;
    if (env && env.isNight) {
      if ((this.genome.nocturnal ?? 0.2) >= 0.5) {
        effectiveSense *= 1.25; // Night vision advantage
      } else {
        effectiveSense *= 0.82; // Diurnal creatures have reduced vision in dark
      }
    }

    const sense = effectiveSense;
    const diet = this.genome.diet;
    const bravery = this.genome.bravery;

    this.threatTarget = null;
    this.currentTarget = null;
    this.courtshipTarget = null;

    // 1. Scan for Predatory Threats
    // Other creatures with carnivore/omnivore diet that are larger and genetically different
    if (env.creatureGrid) {
      const candidates = env.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        return c !== this && c.isAlive && c.genome.diet > 0.45 && c.genome.size > this.genome.size * 1.12;
      });

      if (candidates.length > 0) {
        // Find closest threat
        let closest = candidates[0];
        let closestDistSq = this.position.distSq(closest.position);
        for (let i = 1; i < candidates.length; i++) {
          const dSq = this.position.distSq(candidates[i].position);
          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            closest = candidates[i];
          }
        }

        // Bravery check: cowardly creatures flee readily, fearless ones only flee if critically near
        const fearDistance = sense * (1.1 - bravery * 0.45);
        if (Math.sqrt(closestDistSq) <= fearDistance) {
          this.threatTarget = closest;
          this.state = 'fleeing';
          this.currentIntention = `Fleeing threat [${closest.genome.speciesId}]`;
          const fleeForce = this.flee(closest.position, fearDistance);
          this.applyForce(fleeForce.mult(1.4));
          return { action: 'flee', target: closest };
        }
      }
    }

    // 2. Scan for Prey (Carnivores and aggressive Omnivores)
    if (diet >= 0.42 && env.creatureGrid) {
      const preyCandidates = env.creatureGrid.queryRadius(this.position.x, this.position.y, sense, (c) => {
        if (c === this || !c.isAlive) return false;
        // Camouflage reduces effective perception range
        const camo = c.genome.camouflage ?? 0.25;
        const dist = this.position.dist(c.position);
        const maxDetectDist = sense * (1.0 - camo * 0.60);
        return dist <= maxDetectDist &&
          (this.genome.size > c.genome.size * 1.08) &&
          (c.genome.diet < diet) &&
          (this.genome.geneticDistance(c.genome) > 0.16);
      });

      if (preyCandidates.length > 0) {
        let bestPrey = preyCandidates[0];
        let bestDistSq = this.position.distSq(bestPrey.position);
        for (let i = 1; i < preyCandidates.length; i++) {
          const dSq = this.position.distSq(preyCandidates[i].position);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestPrey = preyCandidates[i];
          }
        }

        this.currentTarget = bestPrey;
        this.state = 'hunting';
        this.currentIntention = `Hunting prey [${bestPrey.genome.speciesId}]`;
        const huntForce = this.hunt(bestPrey);
        this.applyForce(huntForce.mult(1.2));
        return { action: 'hunt', target: bestPrey };
      }
    }

    // 2.5 Scan for Potential Mate (Sexual Courtship)
    if (this.energy >= this.reproductionThreshold * 0.70 && this.age > 4.0 && this.matingCooldown <= 0 && env.creatureGrid) {
      const mates = env.creatureGrid.queryRadius(this.position.x, this.position.y, sense * 0.9, (c) => {
        return c !== this && c.isAlive && c.age > 4.0 && c.matingCooldown <= 0 &&
          c.energy >= c.reproductionThreshold * 0.65 &&
          this.genome.geneticDistance(c.genome) <= 0.40;
      });

      if (mates.length > 0) {
        let bestMate = mates[0];
        let bestDistSq = this.position.distSq(bestMate.position);
        for (let i = 1; i < mates.length; i++) {
          const dSq = this.position.distSq(mates[i].position);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestMate = mates[i];
          }
        }

        this.courtshipTarget = bestMate;
        this.state = 'courtship';
        this.currentIntention = `Courting mate [${bestMate.genome.speciesId}]`;
        const mateForce = this.seek(bestMate.position, 16);
        this.applyForce(mateForce.mult(1.1));
        return { action: 'courtship', target: bestMate };
      }
    }

    // 3. Scan for Food Pellets (Plants for herbivores/omnivores, Meat for carnivores/omnivores)
    if (env.foodGrid) {
      const prefersMeat = diet > 0.55;
      const prefersPlants = diet < 0.45;

      const nearestFood = env.foodGrid.queryNearest(this.position.x, this.position.y, sense, (food) => {
        if (food.isRotten) return false;
        if (prefersMeat) return food.type === 'meat';
        if (prefersPlants) return food.type === 'plant';
        return true; // omnivore accepts both
      });

      if (nearestFood) {
        this.currentTarget = nearestFood.entity;
        this.state = 'foraging';
        this.currentIntention = `Grazing ${nearestFood.entity.type}`;
        const seekForce = this.seek(nearestFood.entity.position, 18);
        this.applyForce(seekForce);
        return { action: 'seek_food', target: nearestFood.entity };
      }
    }

    // 4. Default Autonomous Wandering with Reynolds Conspecific Flocking
    this.state = 'wandering';
    this.currentIntention = 'Exploring habitat';
    const wanderForce = this.wander();
    this.applyForce(wanderForce);

    const flockingTendency = this.genome.flocking ?? 0.5;
    if (flockingTendency > 0.15 && diet < 0.45 && env.creatureGrid) {
      const herdMembers = env.creatureGrid.queryRadius(this.position.x, this.position.y, sense * 0.75, (c) => {
        return c !== this && c.isAlive && c.genome.speciesId === this.genome.speciesId;
      });
      if (herdMembers.length > 0) {
        let avgPos = new Vector2D(0, 0);
        let avgVel = new Vector2D(0, 0);
        for (const m of herdMembers) {
          avgPos.add(m.position);
          avgVel.add(m.velocity);
        }
        avgPos.div(herdMembers.length);
        avgVel.div(herdMembers.length);
        const cohesion = Vector2D.sub(avgPos, this.position).limit(0.12 * flockingTendency);
        const alignment = Vector2D.sub(avgVel, this.velocity).limit(0.15 * flockingTendency);
        this.applyForce(cohesion);
        this.applyForce(alignment);
      }
    }

    return { action: 'wander', target: null };
  }

  /**
   * Main simulation step for this organism.
   * @param {number} dt Delta time in seconds
   * @param {Object} env Environment context (foodGrid, creatureGrid, foodManager, bounds)
   * @returns {Creature|null} Child creature if reproduction occurred this frame
   */
  update(dt, env) {
    if (!this.isAlive) return null;

    this.age += dt;

    // Check natural death by old age
    if (this.age >= this.lifespan) {
      this.isAlive = false;
      this.causeOfDeath = 'old_age';
      return null;
    }

    // 1. Evaluate steering AI
    if (env) {
      this.evaluateBehavior(env);
      const boundaryForce = this.avoidBoundaries(env.worldWidth || 2400, env.worldHeight || 1600);
      this.applyForce(boundaryForce);
    }

    // 2. Integrate Physics (Verlet/Euler autonomous movement)
    this.velocity.add(this.acceleration);
    const maxSpd = (this.state === 'fleeing') ? this.genome.speed * 1.15 : this.genome.speed;
    this.velocity.limit(maxSpd);
    this.position.add(Vector2D.mult(this.velocity, dt * 60.0));
    this.acceleration.set(0, 0);

    // Hard boundary clamp safety
    if (env) {
      const w = env.worldWidth || 2400;
      const h = env.worldHeight || 1600;
      this.position.x = clamp(this.position.x, this.radius, w - this.radius);
      this.position.y = clamp(this.position.y, this.radius, h - this.radius);
    }

    // 3. Smooth Heading & Squish Factor
    const currentSpeed = this.velocity.mag();
    this.distanceTraveled += currentSpeed * dt * 60.0;

    if (currentSpeed > 0.05) {
      const targetHeading = this.velocity.heading();
      // Smooth angle interpolation
      let diff = targetHeading - this.heading;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.heading += diff * clamp(dt * 12.0, 0, 1);

      // Organic tail oscillation
      this.tailWiggle += dt * (this.tailWiggleSpeed + currentSpeed * 2.5);

      // Dynamic squish & stretch: faster organisms elongate forward
      const stretch = (currentSpeed / this.genome.speed) * 0.32;
      this.squishFactor = lerp(this.squishFactor, 1.0 + stretch, dt * 8.0);
    } else {
      this.squishFactor = lerp(this.squishFactor, 1.0, dt * 6.0);
    }

    if (this.mitosisTimer > 0) {
      this.mitosisTimer -= dt;
    }

    if (this.matingCooldown > 0) {
      this.matingCooldown -= dt;
    }

    // 4. Burn Primer Metabolic Energy
    const isHunting = this.state === 'hunting' || this.state === 'fleeing' || (this.brainType === 'neural' && (this.lastNeuralOutputs?.[3] ?? 0) > 0.45);
    const kineticMultiplier = env?.kineticMultiplier ?? 1.0;
    const burnRate = this.calculateMetabolicCost(currentSpeed, isHunting, kineticMultiplier);
    this.energy -= burnRate * dt;

    if (this.energy <= 0) {
      this.energy = 0;
      this.isAlive = false;
      this.causeOfDeath = 'starvation';
      return null;
    }

    // 5. Intersect & Consume Food Pellets
    if (env && env.foodManager && env.foodGrid) {
      const nearbyFood = env.foodGrid.queryRadius(this.position.x, this.position.y, this.radius + 6);
      for (const pellet of nearbyFood) {
        const dSq = this.position.distSq(pellet.position);
        const contactRadius = this.radius + pellet.radius;

        if (dSq <= contactRadius * contactRadius) {
          // Digest food according to diet adaptation
          let efficiency = 1.0;
          if (pellet.type === 'berry') {
            // Golden berries are universally nutritious
            efficiency = 1.0;
            this.plantsEaten++;
          } else if (pellet.type === 'plant') {
            // Herbivores digest plants at 100%, carnivores at only 15%
            efficiency = clamp(1.15 - this.genome.diet * 1.1, 0.12, 1.0);
            this.plantsEaten++;
          } else {
            // Meat: carnivores digest at 100%, pure herbivores at 15%
            efficiency = clamp(0.15 + this.genome.diet * 0.95, 0.15, 1.0);
            this.meatEaten++;
          }

          const energyGained = env.foodManager.consume(pellet) * efficiency;
          this.energy = Math.min(this.maxEnergy, this.energy + energyGained);
          break; // Eat one pellet per frame
        }
      }
    }

    // 6. Predation: Carnivore Attacks Prey
    const wantsHunt = this.state === 'hunting' || (this.brainType === 'neural' && (this.lastNeuralOutputs?.[3] ?? 0) > 0.45 && this.genome.diet >= 0.42);
    if (wantsHunt && this.currentTarget && this.currentTarget.isAlive) {
      const prey = this.currentTarget;
      const dSq = this.position.distSq(prey.position);
      const attackRange = this.radius + prey.radius * 0.8;

      if (dSq <= attackRange * attackRange) {
        // Prey armor mitigates predator yield
        const preyArmor = prey.genome.armor ?? 0.2;
        const armorMultiplier = clamp(1.0 - preyArmor * 0.50, 0.40, 1.0);

        // Prey retaliation check: brave/large prey inflicts counter-damage on attacker
        const preyDefense = prey.genome.size * (prey.genome.bravery ?? 0.5);
        const predatorAttack = this.genome.size * (this.genome.bravery ?? 0.5);
        if (preyDefense > predatorAttack * 0.75) {
          const retaliation = clamp((preyDefense / predatorAttack) * 16, 4, 30);
          this.energy -= retaliation;
          if (env && env.addFloatingText) {
            env.addFloatingText(this.position.x, this.position.y - 12, 'DEFENDED!', '#f59e0b');
          }
        }

        // Successful hunt! Kill prey
        prey.isAlive = false;
        prey.causeOfDeath = 'predation';
        this.kills++;

        // Drop danger pheromone
        if (env && env.addPheromone) {
          env.addPheromone(prey.position.x, prey.position.y, 'danger', 1.0, 5.0);
        }

        // Carnivore consumes meat proportional to prey mass & remaining energy
        const preyYield = Math.min(prey.maxEnergy * 0.75, (prey.energy + prey.genome.size * 10) * armorMultiplier);
        this.energy = Math.min(this.maxEnergy, this.energy + preyYield);

        // Drop remaining flesh as meat pellet for scavengers
        if (env && env.foodManager) {
          env.foodManager.spawnMeat(prey.position, preyYield * 0.4, prey.genome.size);
        }
      }
    }

    // 6.5 Sexual Reproduction (Courtship Encounter)
    const wantsCourt = this.state === 'courtship' || (this.brainType === 'neural' && (this.lastNeuralOutputs?.[2] ?? 0) > 0.45);
    if (wantsCourt && this.courtshipTarget && this.courtshipTarget.isAlive) {
      const partner = this.courtshipTarget;
      const dSq = this.position.distSq(partner.position);
      const contactDist = this.radius + partner.radius + 10;
      if (dSq <= contactDist * contactDist && partner.matingCooldown <= 0 && this.matingCooldown <= 0) {
        return this.reproduceSexual(partner, env);
      }
    }

    // 7. Reproduction (Asexual Budding with Genetic Drift)
    // Creature splits when well-fed, passing half its energy minus metabolic birth tax
    if (this.energy >= this.reproductionThreshold && this.age > 4.0) {
      return this.reproduceAsexual(env);
    }

    return null;
  }

  /**
   * Sexual reproduction encounter with a mate: performs crossover and instantiates offspring.
   * @param {Creature} partner 
   * @param {Object} [env=null] 
   * @returns {Creature} Offspring
   */
  reproduceSexual(partner, env = null) {
    const childGenome = this.genome.crossover(partner.genome);
    const splitEnergy = (this.energy * 0.28) + (partner.energy * 0.28);
    this.energy = Math.max(20, this.energy * 0.72);
    partner.energy = Math.max(20, partner.energy * 0.72);
    this.matingCooldown = 7.0;
    partner.matingCooldown = 7.0;
    this.offspringCount++;
    partner.offspringCount++;
    this.mitosisTimer = 0.5;
    partner.mitosisTimer = 0.5;

    const childX = (this.position.x + partner.position.x) / 2;
    const childY = (this.position.y + partner.position.y) / 2;
    const child = new Creature(childX, childY, childGenome, splitEnergy);
    child.parentAId = this.id;
    child.parentBId = partner.id;
    child.reproductionType = 'sexual';
    child.mitosisTimer = 0.5;
    this.courtshipTarget = null;
    partner.courtshipTarget = null;

    if (env && env.addPheromone) {
      env.addPheromone(childX, childY, 'mating', 1.0, 5.0);
    }
    if (env && env.addFloatingText) {
      env.addFloatingText(childX, childY - 14, '💕 MATED!', '#ec4899');
    }
    return child;
  }

  /**
   * Asexual budding reproduction: mutates genome and instantiates offspring.
   * @param {Object} [env=null] 
   * @returns {Creature} Offspring
   */
  reproduceAsexual(env = null) {
    const mutMult = env?.mutationMultiplier ?? 1.0;
    const childGenome = this.genome.mutate(mutMult);

    // Energy split: each retains ~42% of parent energy (16% tax for birth metabolism)
    const childEnergy = (this.energy - this.birthEnergyTax) * 0.48;
    this.energy = (this.energy - this.birthEnergyTax) * 0.48;
    this.offspringCount++;

    // Trigger visual mitosis squeeze/pinch animation
    this.mitosisTimer = 0.45;

    // Spawn child slightly behind parent
    const spawnOffset = Vector2D.fromAngle(this.heading + Math.PI + randomFloat(-0.6, 0.6), this.radius * 2.2);
    const childX = this.position.x + spawnOffset.x;
    const childY = this.position.y + spawnOffset.y;

    const child = new Creature(childX, childY, childGenome, childEnergy);
    child.parentAId = this.id;
    child.parentBId = null;
    child.reproductionType = 'asexual';
    child.mitosisTimer = 0.45;
    return child;
  }

  /**
   * Renders the creature with expressive blob morphology, animated eyes,
   * jaw markers, tail movement, and sensory aura.
   * @param {CanvasRenderingContext2D} ctx 
   * @param {Object} [renderOptions={}]
   * @param {boolean} [renderOptions.isSelected=false]
   * @param {boolean} [renderOptions.showPerception=false]
   */
  draw(ctx, renderOptions = {}) {
    const isSelected = renderOptions.isSelected || this.isHighlighted;
    const showPerception = renderOptions.showPerception || isSelected;

    const x = this.position.x;
    const y = this.position.y;
    const r = this.radius;
    const colorInfo = this.genome.color;

    ctx.save();
    ctx.translate(x, y);

    // 1. Sensory Field Circle
    if (showPerception) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, this.genome.sense, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = isSelected ? 1.5 : 1.0;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
        ctx.fill();
      }
      ctx.restore();
    }

    // Possession reticle & indicator
    if (this.isPossessed) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', 0, -r - 12);
      ctx.restore();
    }

    // Align rendering with heading orientation
    ctx.rotate(this.heading);

    // 2. Animated Flagella / Swimming Tail
    const tailLength = r * 1.35;
    const tailWiggleOffset = Math.sin(this.tailWiggle) * (r * 0.45);

    ctx.beginPath();
    ctx.moveTo(-r * 0.8, 0);
    ctx.quadraticCurveTo(-r * 1.4, tailWiggleOffset, -r * 0.8 - tailLength, tailWiggleOffset * 1.5);
    ctx.strokeStyle = colorInfo.strokeCss;
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    ctx.lineCap = 'round';
    ctx.stroke();

    // 3. Blob Body with Squash & Stretch and Mitosis Pinch
    let squishX = this.squishFactor;
    let squishY = 1.0 / Math.sqrt(this.squishFactor);
    if (this.mitosisTimer > 0) {
      const wobble = Math.sin(this.mitosisTimer * 28.0) * (this.mitosisTimer / 0.45) * 0.35;
      squishX *= (1.0 + wobble);
      squishY *= (1.0 - wobble);
    }
    ctx.scale(squishX, squishY);

    // Outer soft glow when selected or highly energetic
    if (isSelected || this.energy > this.maxEnergy * 0.85) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = colorInfo.bodyGlowCss;
      ctx.fill();
    }

    // Main Body
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = colorInfo.bodyCss;
    ctx.fill();

    // Membrane Stroke
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.strokeStyle = isSelected ? '#38bdf8' : colorInfo.strokeCss;
    ctx.stroke();

    // Reset squash scale for feature details (eyes, mouth)
    ctx.scale(1.0 / squishX, 1.0 / squishY);

    // 4. Expressive Eyes
    const eyeSpacing = r * 0.48;
    const eyeForward = r * 0.42;
    const eyeRadius = Math.max(2.2, r * 0.28);
    const pupilRadius = eyeRadius * 0.52;

    // Left and Right Eyes
    for (const side of [-1, 1]) {
      const eyeX = eyeForward;
      const eyeY = side * eyeSpacing;

      // Eye sclera
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeRadius, 0, Math.PI * 2);
      ctx.fillStyle = colorInfo.eyeWhiteCss;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = colorInfo.strokeCss;
      ctx.stroke();

      // Pupil direction: looking towards heading / prey
      const pupilOffsetX = eyeRadius * 0.32;
      const pupilOffsetY = 0;

      ctx.beginPath();
      ctx.arc(eyeX + pupilOffsetX, eyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Pupil light gleam
      ctx.beginPath();
      ctx.arc(eyeX + pupilOffsetX - 0.6, eyeY + pupilOffsetY - 0.6, pupilRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // 5. Dietary Mouth Morphologies
    const mouthX = r * 0.82;
    if (this.genome.diet >= 0.62) {
      // Carnivore: Sharp forward-facing fangs / predatory mandibles
      ctx.beginPath();
      ctx.moveTo(mouthX - 1, -r * 0.32);
      ctx.lineTo(mouthX + r * 0.45, -r * 0.15);
      ctx.lineTo(mouthX + 1, 0);
      ctx.lineTo(mouthX + r * 0.45, r * 0.15);
      ctx.lineTo(mouthX - 1, r * 0.32);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    } else if (this.genome.diet <= 0.32) {
      // Herbivore: Cute round snout / soft grazing mouth
      ctx.beginPath();
      ctx.arc(mouthX - 2, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = colorInfo.strokeCss;
      ctx.fill();
    } else {
      // Omnivore: Small versatile beak
      ctx.beginPath();
      ctx.moveTo(mouthX - 2, -r * 0.18);
      ctx.lineTo(mouthX + r * 0.22, 0);
      ctx.lineTo(mouthX - 2, r * 0.18);
      ctx.closePath();
      ctx.fillStyle = '#d97706';
      ctx.fill();
    }

    // 6. Low Energy / Starvation Warning Indicator
    if (this.energy < this.maxEnergy * 0.22) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
    }

    // 6.5 Armor Chitin Plates (Herbivore defense carapace)
    const armorVal = this.genome.armor ?? 0.2;
    if (armorVal > 0.35) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.72, -Math.PI * 0.6, Math.PI * 0.6);
      ctx.stroke();
      if (armorVal > 0.65) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. Selection Ring, Health Bar & Intention Bubble
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.stroke();

      // Arc Energy Bar
      const energyPct = clamp(this.energy / this.maxEnergy, 0, 1);
      ctx.beginPath();
      ctx.arc(0, 0, r + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * energyPct);
      ctx.strokeStyle = energyPct > 0.4 ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Intention Badge
      ctx.save();
      ctx.rotate(-this.heading); // Keep text horizontal
      ctx.font = '10px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(this.currentIntention, 0, -r - 16);
      ctx.restore();
    }

    // Courtship Heart Icon
    if (this.state === 'courtship') {
      ctx.save();
      ctx.rotate(-this.heading);
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💕', 0, -r - 12);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * God-mode: Modify a gene value in real time.
   * @param {string} geneName 
   * @param {number} value 
   */
  modifyGene(geneName, value) {
    if (this.genome[geneName] !== undefined) {
      this.genome[geneName] = value;
      this.genome._colorDirty = true;
      if (geneName === 'size') {
        this.radius = value;
        this.mass = Math.max(1.0, value);
        this.maxEnergy = value * 26.0;
        this.reproductionThreshold = Math.max(140, value * 18.0);
      }
    }
  }

  /**
   * God-mode: Infuses energy.
   * @param {number} [amount=50] 
   */
  feed(amount = 50) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  /**
   * God-mode: Instantly kills creature.
   */
  kill() {
    this.isAlive = false;
    this.causeOfDeath = 'smite';
  }
}
