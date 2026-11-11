/**
 * Artificial Life Simulator - Math & Vector Utilities
 * Pure ES6 module providing 2D Vector physics, Box-Muller Gaussian distributions,
 * clamping/interpolation, and Primer-compatible phenotypic color derivation.
 */

export class Vector2D {
  /**
   * @param {number} x 
   * @param {number} y 
   */
  constructor(x = 0, y = 0) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
  }

  /**
   * Sets components in-place.
   * @param {number} x 
   * @param {number} y 
   * @returns {Vector2D} this
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Returns a new copy of this vector.
   * @returns {Vector2D}
   */
  copy() {
    return new Vector2D(this.x, this.y);
  }

  /**
   * Adds another vector or (x, y) to this vector in-place.
   * @param {Vector2D|number} v 
   * @param {number} [y] 
   * @returns {Vector2D} this
   */
  add(v, y) {
    if (typeof v === 'number') {
      this.x += v;
      this.y += y !== undefined ? y : v;
    } else {
      this.x += v.x;
      this.y += v.y;
    }
    return this;
  }

  /**
   * Subtracts another vector or (x, y) from this vector in-place.
   * @param {Vector2D|number} v 
   * @param {number} [y] 
   * @returns {Vector2D} this
   */
  sub(v, y) {
    if (typeof v === 'number') {
      this.x -= v;
      this.y += y !== undefined ? y : v;
    } else {
      this.x -= v.x;
      this.y -= v.y;
    }
    return this;
  }

  /**
   * Multiplies vector components by scalar n in-place.
   * @param {number} n 
   * @returns {Vector2D} this
   */
  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  /**
   * Divides vector components by scalar n in-place.
   * Guarded against division by zero.
   * @param {number} n 
   * @returns {Vector2D} this
   */
  div(n) {
    if (n === 0 || !Number.isFinite(n)) {
      this.x = 0;
      this.y = 0;
    } else {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  /**
   * Calculates squared magnitude.
   * @returns {number}
   */
  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Calculates magnitude (length).
   * @returns {number}
   */
  mag() {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Calculates squared Euclidean distance to another vector.
   * Faster than dist() because it avoids Math.sqrt.
   * @param {Vector2D} v 
   * @returns {number}
   */
  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Calculates Euclidean distance to another vector.
   * @param {Vector2D} v 
   * @returns {number}
   */
  dist(v) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  /**
   * Normalizes vector to unit length in-place.
   * @returns {Vector2D} this
   */
  normalize() {
    const m = this.mag();
    if (m > 1e-9) {
      this.div(m);
    } else {
      this.x = 0;
      this.y = 0;
    }
    return this;
  }

  /**
   * Limits vector magnitude to max.
   * @param {number} max 
   * @returns {Vector2D} this
   */
  limit(max) {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.div(Math.sqrt(mSq)).mult(max);
    }
    return this;
  }

  /**
   * Sets magnitude of vector to len in-place.
   * @param {number} len 
   * @returns {Vector2D} this
   */
  setMag(len) {
    return this.normalize().mult(len);
  }

  /**
   * Calculates angle of rotation in radians.
   * @returns {number} Angle in radians [-PI, PI]
   */
  heading() {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Rotates vector by an angle in radians in-place.
   * @param {number} angle 
   * @returns {Vector2D} this
   */
  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  /**
   * Dot product with another vector.
   * @param {Vector2D} v 
   * @returns {number}
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Linearly interpolates towards vector v.
   * @param {Vector2D} v 
   * @param {number} t (0.0 - 1.0)
   * @returns {Vector2D} this
   */
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  // --- Static Vector Operations ---

  static add(v1, v2) {
    return new Vector2D(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1, v2) {
    return new Vector2D(v1.x - v2.x, v1.y - v2.y);
  }

  static mult(v, n) {
    return new Vector2D(v.x * n, v.y * n);
  }

  static div(v, n) {
    if (n === 0 || !Number.isFinite(n)) return new Vector2D(0, 0);
    return new Vector2D(v.x / n, v.y / n);
  }

  static dist(v1, v2) {
    return Math.hypot(v1.x - v2.x, v1.y - v2.y);
  }

  static distSq(v1, v2) {
    const dx = v1.x - v2.x;
    const dy = v1.y - v2.y;
    return dx * dx + dy * dy;
  }

  static fromAngle(angle, length = 1) {
    return new Vector2D(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static random(length = 1) {
    const angle = Math.random() * Math.PI * 2;
    return Vector2D.fromAngle(angle, length);
  }
}

// --- Random Number Utilities ---

/**
 * Returns a pseudorandom float within [min, max).
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomFloat(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

/**
 * Returns a pseudorandom integer within [min, max] inclusive.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(low + Math.random() * (high - low + 1));
}

/**
 * Generates normally distributed random numbers using Box-Muller transform.
 * @param {number} mean 
 * @param {number} stdDev 
 * @returns {number}
 */
export function randomGaussian(mean = 0, stdDev = 1) {
  let u1 = 0;
  let u2 = 0;
  // Prevent Math.log(0)
  while (u1 <= 1e-15) u1 = Math.random();
  while (u2 <= 1e-15) u2 = Math.random();
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * Clamps value between min and max.
 * @param {number} val 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Linear interpolation between a and b.
 * @param {number} a 
 * @param {number} b 
 * @param {number} t (0 - 1)
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Re-maps a number from one range to another.
 * @param {number} val 
 * @param {number} inMin 
 * @param {number} inMax 
 * @param {number} outMin 
 * @param {number} outMax 
 * @param {boolean} [clampResult=false] 
 * @returns {number}
 */
export function mapRange(val, inMin, inMax, outMin, outMax, clampResult = false) {
  if (Math.abs(inMax - inMin) < 1e-12) return outMin;
  const res = outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin);
  return clampResult ? clamp(res, Math.min(outMin, outMax), Math.max(outMin, outMax)) : res;
}

/**
 * Normalizes an angle in radians to the range [-PI, PI].
 * Numerically safe and guards non-finite inputs.
 * @param {number} angle Angle in radians
 * @returns {number} Normalized angle in [-PI, PI]
 */
export function normalizeAngle(angle) {
  if (!Number.isFinite(angle)) return 0.0;
  let a = angle % (Math.PI * 2);
  if (a <= -Math.PI) a += Math.PI * 2;
  else if (a > Math.PI) a -= Math.PI * 2;
  return a;
}

// --- Color Utilities ---

/**
 * Converts HSL values to RGB format.
 * @param {number} h Hue in degrees [0, 360]
 * @param {number} s Saturation in [0, 1] or [0, 100]
 * @param {number} l Lightness in [0, 1] or [0, 100]
 * @returns {{r: number, g: number, b: number, css: string}}
 */
export function hslToRgb(h, s, l) {
  // Normalize hue to [0, 360)
  let normH = ((h % 360) + 360) % 360;
  // If s or l > 1 assume percentage 0-100
  let normS = s > 1 ? s / 100 : s;
  let normL = l > 1 ? l / 100 : l;

  normS = clamp(normS, 0, 1);
  normL = clamp(normL, 0, 1);

  const c = (1 - Math.abs(2 * normL - 1)) * normS;
  const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
  const m = normL - c / 2;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (normH < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (normH < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (normH < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (normH < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (normH < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  const r = Math.round((rPrime + m) * 255);
  const g = Math.round((gPrime + m) * 255);
  const b = Math.round((bPrime + m) * 255);

  return {
    r,
    g,
    b,
    css: `rgb(${r}, ${g}, ${b})`
  };
}

/**
 * Converts a hex string (#RGB, #RRGGBB) to {r, g, b}.
 * @param {string} hex 
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const intVal = parseInt(clean, 16);
  if (isNaN(intVal)) return { r: 255, g: 255, b: 255 };
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255
  };
}

/**
 * Converts RGB components to hex code.
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {string} #rrggbb
 */
export function rgbToHex(r, g, b) {
  const clampR = clamp(Math.round(r), 0, 255);
  const clampG = clamp(Math.round(g), 0, 255);
  const clampB = clamp(Math.round(b), 0, 255);
  return '#' + [clampR, clampG, clampB]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Derives phenotypic colors from creature genome traits.
 * Inspired by Primer's visual biological markers:
 * - Herbivores (diet=0): Emerald green (hue ~ 135)
 * - Omnivores (diet=0.5): Golden honey / warm amber (hue ~ 42)
 * - Carnivores (diet=1.0): Aggressive crimson / vermilion (hue ~ 4)
 * - Speed elevates saturation and shifts hue towards cyan/neon highlights
 * - Bravery shifts the outline/accent contrast
 * @param {Object} genome Genome or trait bundle
 * @returns {Object} Color bundle for rendering
 */
export function geneticColor(genome) {
  const diet = clamp(genome?.diet ?? 0, 0, 1);
  const speed = genome?.speed ?? 2.0;
  const bravery = clamp(genome?.bravery ?? 0.5, 0, 1);
  const sense = genome?.sense ?? 80;

  // Hue calculation:
  // Diet 0 (herbivore) -> 135 (green)
  // Diet 0.5 (omnivore) -> 42 (golden amber)
  // Diet 1.0 (carnivore) -> 4 (crimson red)
  let baseHue;
  if (diet < 0.5) {
    const t = diet / 0.5;
    baseHue = lerp(135, 42, t);
  } else {
    const t = (diet - 0.5) / 0.5;
    baseHue = lerp(42, 4, t);
  }

  // Speed trait increases saturation and gives electric vitality
  const speedNorm = clamp((speed - 1.0) / 3.0, 0, 1);
  const saturation = Math.round(lerp(65, 95, speedNorm));
  const lightness = Math.round(lerp(46, 56, 1 - Math.abs(diet - 0.5) * 0.2));

  // Sense trait controls subtle eye iris tint or aura
  const senseNorm = clamp((sense - 30) / 150, 0, 1);
  const irisHue = (baseHue + 180 + senseNorm * 40) % 360;

  // Bravery controls accent outline luminance
  const strokeLightness = Math.round(lerp(25, 15, bravery));

  const bodyCss = `hsl(${Math.round(baseHue)}, ${saturation}%, ${lightness}%)`;
  const bodyGlowCss = `hsla(${Math.round(baseHue)}, ${saturation}%, ${lightness}%, 0.35)`;
  const strokeCss = `hsl(${Math.round(baseHue)}, ${Math.min(100, saturation + 10)}%, ${strokeLightness}%)`;
  const irisCss = `hsl(${Math.round(irisHue)}, 90%, 60%)`;
  const eyeWhiteCss = '#f8fafc';

  return {
    hue: Math.round(baseHue),
    saturation,
    lightness,
    bodyCss,
    bodyGlowCss,
    strokeCss,
    irisCss,
    eyeWhiteCss,
    diet
  };
}
