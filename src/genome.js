/**
 * Artificial Life Simulator - Primer Genetics & Speciation Model
 * Encodes continuous biological genes: speed, perception radius, size/mass,
 * trophic diet, basal metabolism, bravery, and mutation rate.
 */

import { randomFloat, randomGaussian, clamp, lerp, geneticColor } from './math.js';

let NEXT_SPECIES_COUNTER = 1;

export const GENE_BOUNDS = {
  speed: { min: 0.8, max: 4.8, default: 2.2 },
  sense: { min: 25.0, max: 220.0, default: 75.0 },
  size: { min: 4.0, max: 22.0, default: 8.5 },
  diet: { min: 0.0, max: 1.0, default: 0.1 }, // 0.0 = pure plant, 1.0 = pure meat
  metabolismRate: { min: 0.65, max: 1.55, default: 1.0 },
  mutationRate: { min: 0.015, max: 0.16, default: 0.06 },
  bravery: { min: 0.0, max: 1.0, default: 0.5 },
  camouflage: { min: 0.0, max: 1.0, default: 0.25 },
  efficiency: { min: 0.6, max: 1.4, default: 1.0 },
  flocking: { min: 0.0, max: 1.0, default: 0.5 },
  armor: { min: 0.0, max: 1.0, default: 0.2 },
  nocturnal: { min: 0.0, max: 1.0, default: 0.2 }
};

export class Genome {
  /**
   * @param {Object} [traits={}] Initial traits
   */
  constructor(traits = {}) {
    this.speed = clamp(traits.speed ?? GENE_BOUNDS.speed.default, GENE_BOUNDS.speed.min, GENE_BOUNDS.speed.max);
    this.sense = clamp(traits.sense ?? GENE_BOUNDS.sense.default, GENE_BOUNDS.sense.min, GENE_BOUNDS.sense.max);
    this.size = clamp(traits.size ?? GENE_BOUNDS.size.default, GENE_BOUNDS.size.min, GENE_BOUNDS.size.max);
    this.diet = clamp(traits.diet ?? GENE_BOUNDS.diet.default, GENE_BOUNDS.diet.min, GENE_BOUNDS.diet.max);
    this.metabolismRate = clamp(traits.metabolismRate ?? GENE_BOUNDS.metabolismRate.default, GENE_BOUNDS.metabolismRate.min, GENE_BOUNDS.metabolismRate.max);
    this.mutationRate = clamp(traits.mutationRate ?? GENE_BOUNDS.mutationRate.default, GENE_BOUNDS.mutationRate.min, GENE_BOUNDS.mutationRate.max);
    this.bravery = clamp(traits.bravery ?? GENE_BOUNDS.bravery.default, GENE_BOUNDS.bravery.min, GENE_BOUNDS.bravery.max);
    this.camouflage = clamp(traits.camouflage ?? GENE_BOUNDS.camouflage.default, GENE_BOUNDS.camouflage.min, GENE_BOUNDS.camouflage.max);
    this.efficiency = clamp(traits.efficiency ?? GENE_BOUNDS.efficiency.default, GENE_BOUNDS.efficiency.min, GENE_BOUNDS.efficiency.max);
    this.flocking = clamp(traits.flocking ?? GENE_BOUNDS.flocking.default, GENE_BOUNDS.flocking.min, GENE_BOUNDS.flocking.max);
    this.armor = clamp(traits.armor ?? GENE_BOUNDS.armor.default, GENE_BOUNDS.armor.min, GENE_BOUNDS.armor.max);
    this.nocturnal = clamp(traits.nocturnal ?? GENE_BOUNDS.nocturnal.default, GENE_BOUNDS.nocturnal.min, GENE_BOUNDS.nocturnal.max);

    this.generation = traits.generation ?? 1;
    this.speciesId = traits.speciesId ?? `sp_${NEXT_SPECIES_COUNTER++}`;

    // Cache color representation
    this._cachedColor = null;
    this._colorDirty = true;
  }

  /**
   * Retrieves visual phenotypic styling derived from genes.
   * @returns {Object}
   */
  get color() {
    if (this._colorDirty || !this._cachedColor) {
      this._cachedColor = geneticColor(this);
      this._colorDirty = false;
    }
    return this._cachedColor;
  }

  /**
   * Creates a random genome calibrated for an ecological archetype.
   * @param {'herbivore'|'carnivore'|'omnivore'|'random'} [archetype='herbivore'] 
   * @returns {Genome}
   */
  static random(archetype = 'herbivore') {
    let dietVal;
    let speedVal;
    let senseVal;
    let sizeVal;
    let braveryVal;

    switch (archetype) {
      case 'carnivore':
        dietVal = randomFloat(0.72, 1.0);
        speedVal = randomFloat(2.6, 4.2);
        senseVal = randomFloat(90, 180);
        sizeVal = randomFloat(9.0, 16.0);
        braveryVal = randomFloat(0.65, 0.95);
        break;
      case 'omnivore':
        dietVal = randomFloat(0.38, 0.62);
        speedVal = randomFloat(1.8, 3.2);
        senseVal = randomFloat(60, 130);
        sizeVal = randomFloat(7.0, 12.0);
        braveryVal = randomFloat(0.4, 0.7);
        break;
      case 'herbivore':
      default:
        dietVal = randomFloat(0.0, 0.22);
        speedVal = randomFloat(1.4, 3.0);
        senseVal = randomFloat(50, 110);
        sizeVal = randomFloat(6.0, 10.5);
        braveryVal = randomFloat(0.15, 0.45);
        break;
    }

    return new Genome({
      speed: speedVal,
      sense: senseVal,
      size: sizeVal,
      diet: dietVal,
      metabolismRate: randomFloat(0.85, 1.15),
      mutationRate: randomFloat(0.04, 0.08),
      bravery: braveryVal,
      generation: 1
    });
  }

  /**
   * Produces a mutated offspring genome using Gaussian drift.
   * Magnitude of mutation is governed by the genome's mutationRate gene and optional multiplier.
   * @param {number} [multiplier=1.0]
   * @returns {Genome} New mutated Genome instance
   */
  mutate(multiplier = 1.0) {
    const rate = this.mutationRate * Math.max(0, multiplier);

    // Standard deviations scaled to gene dynamic range
    const speedRange = GENE_BOUNDS.speed.max - GENE_BOUNDS.speed.min;
    const senseRange = GENE_BOUNDS.sense.max - GENE_BOUNDS.sense.min;
    const sizeRange = GENE_BOUNDS.size.max - GENE_BOUNDS.size.min;
    const dietRange = GENE_BOUNDS.diet.max - GENE_BOUNDS.diet.min;
    const metaRange = GENE_BOUNDS.metabolismRate.max - GENE_BOUNDS.metabolismRate.min;
    const mutRange = GENE_BOUNDS.mutationRate.max - GENE_BOUNDS.mutationRate.min;

    const newSpeed = clamp(
      randomGaussian(this.speed, speedRange * rate * 0.75),
      GENE_BOUNDS.speed.min,
      GENE_BOUNDS.speed.max
    );

    const newSense = clamp(
      randomGaussian(this.sense, senseRange * rate * 0.75),
      GENE_BOUNDS.sense.min,
      GENE_BOUNDS.sense.max
    );

    const newSize = clamp(
      randomGaussian(this.size, sizeRange * rate * 0.75),
      GENE_BOUNDS.size.min,
      GENE_BOUNDS.size.max
    );

    const newDiet = clamp(
      randomGaussian(this.diet, dietRange * rate * 0.5),
      GENE_BOUNDS.diet.min,
      GENE_BOUNDS.diet.max
    );

    const newMeta = clamp(
      randomGaussian(this.metabolismRate, metaRange * rate * 0.5),
      GENE_BOUNDS.metabolismRate.min,
      GENE_BOUNDS.metabolismRate.max
    );

    const newMutationRate = clamp(
      randomGaussian(this.mutationRate, mutRange * 0.25),
      GENE_BOUNDS.mutationRate.min,
      GENE_BOUNDS.mutationRate.max
    );

    const newBravery = clamp(
      randomGaussian(this.bravery, rate * 0.6),
      GENE_BOUNDS.bravery.min,
      GENE_BOUNDS.bravery.max
    );

    const newCamouflage = clamp(
      randomGaussian(this.camouflage, rate * 0.5),
      GENE_BOUNDS.camouflage.min,
      GENE_BOUNDS.camouflage.max
    );

    const newEfficiency = clamp(
      randomGaussian(this.efficiency, (GENE_BOUNDS.efficiency.max - GENE_BOUNDS.efficiency.min) * rate * 0.4),
      GENE_BOUNDS.efficiency.min,
      GENE_BOUNDS.efficiency.max
    );

    const newFlocking = clamp(
      randomGaussian(this.flocking, rate * 0.5),
      GENE_BOUNDS.flocking.min,
      GENE_BOUNDS.flocking.max
    );

    const newArmor = clamp(
      randomGaussian(this.armor, rate * 0.5),
      GENE_BOUNDS.armor.min,
      GENE_BOUNDS.armor.max
    );

    const newNocturnal = clamp(
      randomGaussian(this.nocturnal, rate * 0.5),
      GENE_BOUNDS.nocturnal.min,
      GENE_BOUNDS.nocturnal.max
    );

    const child = new Genome({
      speed: newSpeed,
      sense: newSense,
      size: newSize,
      diet: newDiet,
      metabolismRate: newMeta,
      mutationRate: newMutationRate,
      bravery: newBravery,
      camouflage: newCamouflage,
      efficiency: newEfficiency,
      flocking: newFlocking,
      armor: newArmor,
      nocturnal: newNocturnal,
      generation: this.generation + 1,
      speciesId: this.speciesId
    });

    // Check if speciation barrier crossed (> 0.28 genetic distance from parent lineage)
    if (this.geneticDistance(child) > 0.28) {
      child.speciesId = `sp_${NEXT_SPECIES_COUNTER++}`;
    }

    return child;
  }

  /**
   * Sexual recombination / crossover between two parent genomes.
   * @param {Genome} partner 
   * @returns {Genome}
   */
  crossover(partner) {
    const pick = (gene) => {
      // 45% parent A, 45% parent B, 10% blend
      const roll = Math.random();
      if (roll < 0.45) return this[gene];
      if (roll < 0.90) return partner[gene];
      return lerp(this[gene], partner[gene], randomFloat(0.2, 0.8));
    };

    const offspring = new Genome({
      speed: pick('speed'),
      sense: pick('sense'),
      size: pick('size'),
      diet: pick('diet'),
      metabolismRate: pick('metabolismRate'),
      mutationRate: pick('mutationRate'),
      bravery: pick('bravery'),
      camouflage: pick('camouflage'),
      efficiency: pick('efficiency'),
      flocking: pick('flocking'),
      armor: pick('armor'),
      nocturnal: pick('nocturnal'),
      generation: Math.max(this.generation, partner.generation) + 1,
      speciesId: this.speciesId
    });

    if (this.geneticDistance(offspring) > 0.28) {
      offspring.speciesId = `sp_${NEXT_SPECIES_COUNTER++}`;
    }

    return offspring;
  }

  /**
   * Calculates normalized weighted genetic distance to another genome.
   * Used for speciation detection, mate selection, and cladogram clustering.
   * Range: ~0.0 (identical) to 1.0 (radically distinct).
   * @param {Genome} other 
   * @returns {number}
   */
  geneticDistance(other) {
    if (!other) return 1.0;

    const dSpeed = (this.speed - other.speed) / (GENE_BOUNDS.speed.max - GENE_BOUNDS.speed.min);
    const dSense = (this.sense - other.sense) / (GENE_BOUNDS.sense.max - GENE_BOUNDS.sense.min);
    const dSize = (this.size - other.size) / (GENE_BOUNDS.size.max - GENE_BOUNDS.size.min);
    const dDiet = this.diet - other.diet;
    const dBravery = this.bravery - other.bravery;
    const dCamouflage = (this.camouflage ?? 0.25) - (other.camouflage ?? 0.25);
    const dArmor = (this.armor ?? 0.2) - (other.armor ?? 0.2);
    const dNocturnal = (this.nocturnal ?? 0.2) - (other.nocturnal ?? 0.2);
    const dMeta = (this.metabolismRate - other.metabolismRate) / (GENE_BOUNDS.metabolismRate.max - GENE_BOUNDS.metabolismRate.min);

    // Weights: Diet and Size have highest evolutionary weight in morphological divergence
    const wDiet = 0.30;
    const wSize = 0.19;
    const wSpeed = 0.15;
    const wSense = 0.11;
    const wCamouflage = 0.07;
    const wArmor = 0.07;
    const wNocturnal = 0.05;
    const wBravery = 0.04;
    const wMeta = 0.02;

    const distSq = 
      wDiet * (dDiet * dDiet) +
      wSize * (dSize * dSize) +
      wSpeed * (dSpeed * dSpeed) +
      wSense * (dSense * dSense) +
      wCamouflage * (dCamouflage * dCamouflage) +
      wArmor * (dArmor * dArmor) +
      wNocturnal * (dNocturnal * dNocturnal) +
      wBravery * (dBravery * dBravery) +
      wMeta * (dMeta * dMeta);

    return Math.sqrt(distSq);
  }

  /**
   * Creates an exact clone of this genome.
   * @returns {Genome}
   */
  clone() {
    return new Genome({
      speed: this.speed,
      sense: this.sense,
      size: this.size,
      diet: this.diet,
      metabolismRate: this.metabolismRate,
      mutationRate: this.mutationRate,
      bravery: this.bravery,
      camouflage: this.camouflage,
      efficiency: this.efficiency,
      flocking: this.flocking,
      armor: this.armor,
      nocturnal: this.nocturnal,
      generation: this.generation,
      speciesId: this.speciesId
    });
  }

  /**
   * Serializes genome to plain JS object.
   * @returns {Object}
   */
  toJSON() {
    return {
      speed: this.speed,
      sense: this.sense,
      size: this.size,
      diet: this.diet,
      metabolismRate: this.metabolismRate,
      mutationRate: this.mutationRate,
      bravery: this.bravery,
      camouflage: this.camouflage,
      efficiency: this.efficiency,
      flocking: this.flocking,
      armor: this.armor,
      nocturnal: this.nocturnal,
      generation: this.generation,
      speciesId: this.speciesId
    };
  }

  /**
   * Deserializes genome from object.
   * @param {Object} data 
   * @returns {Genome}
   */
  static fromJSON(data) {
    return new Genome(data);
  }
}
