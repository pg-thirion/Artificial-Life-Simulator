/**
 * Artificial Life Simulator - Live Neural Network Visualizer
 * Renders real-time 10->8->4 feedforward perceptron topology, synaptic weights,
 * glowing node activations, and sensory/motor telemetry inside the Creature Inspector.
 */

import { clamp } from './math.js';
import { BRAIN_CONFIG } from './neuralBrain.js';

export const INPUT_LABELS = [
  'Food Dist',
  'Food Ang',
  'Danger',
  'Threat Dist',
  'Threat Ang',
  'Mate Dist',
  'Mate Ang',
  'Energy',
  'Drag',
  'Solar'
];

export const OUTPUT_LABELS = [
  'Steer',
  'Thrust',
  'Court',
  'Attack'
];

export class NeuralVisualizer {
  /**
   * @param {HTMLCanvasElement|Object|null} canvas
   */
  constructor(canvas) {
    this.canvas = canvas || null;
    this.ctx = (this.canvas && typeof this.canvas.getContext === 'function')
      ? this.canvas.getContext('2d')
      : null;
    this.INPUT_LABELS = INPUT_LABELS;
    this.OUTPUT_LABELS = OUTPUT_LABELS;
  }

  /**
   * Renders the live neural topology, synaptic weights, and node activations.
   * @param {NeuralBrain|null} brain
   * @param {'neural'|'heuristic'|string} [brainType='neural']
   */
  render(brain, brainType = 'neural') {
    if (!this.canvas || !this.ctx) return;

    const ctx = this.ctx;
    const width = this.canvas.width || 268;
    const height = this.canvas.height || 165;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, width, height);

    if (brainType !== 'neural' || !brain) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Heuristic Rule Brain', width * 0.5, height * 0.45);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Click Brain badge to switch to Neural', width * 0.5, height * 0.60);
      ctx.restore();
      return;
    }

    const numIn = BRAIN_CONFIG.INPUT_SIZE;
    const numHid = BRAIN_CONFIG.HIDDEN_SIZE;
    const numOut = BRAIN_CONFIG.OUTPUT_SIZE;

    const col1X = 52;
    const col2X = width * 0.5;
    const col3X = width - 48;

    const padYIn = 12;
    const padYHid = 18;
    const padYOut = 30;

    const inCoords = [];
    for (let i = 0; i < numIn; i++) {
      const y = numIn > 1
        ? padYIn + (i / (numIn - 1)) * (height - padYIn * 2)
        : height * 0.5;
      inCoords.push({ x: col1X, y });
    }

    const hidCoords = [];
    for (let h = 0; h < numHid; h++) {
      const y = numHid > 1
        ? padYHid + (h / (numHid - 1)) * (height - padYHid * 2)
        : height * 0.5;
      hidCoords.push({ x: col2X, y });
    }

    const outCoords = [];
    for (let o = 0; o < numOut; o++) {
      const y = numOut > 1
        ? padYOut + (o / (numOut - 1)) * (height - padYOut * 2)
        : height * 0.5;
      outCoords.push({ x: col3X, y });
    }

    const weights = brain.weights || new Float32Array(BRAIN_CONFIG.TOTAL_WEIGHTS);
    const inAct = (brain.activations && brain.activations.input) || new Float32Array(numIn);
    const hidAct = (brain.activations && brain.activations.hidden) || new Float32Array(numHid);
    const outAct = (brain.activations && brain.activations.output) || new Float32Array(numOut);

    // 1. Render Layer 1 Synapses (Input -> Hidden, W1: 0..79)
    for (let h = 0; h < numHid; h++) {
      const rowOffset = h * numIn;
      const dst = hidCoords[h];
      for (let i = 0; i < numIn; i++) {
        const w = weights[rowOffset + i] || 0;
        const alpha = clamp(Math.abs(w) / 2.5, 0.08, 0.9);
        const src = inCoords[i];
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
        ctx.strokeStyle = w >= 0
          ? `rgba(74, 222, 128, ${alpha.toFixed(3)})`
          : `rgba(248, 113, 113, ${alpha.toFixed(3)})`;
        ctx.lineWidth = alpha * 1.6;
        ctx.stroke();
      }
    }

    // 2. Render Layer 2 Synapses (Hidden -> Output, W2: 88..119)
    const w2Offset = BRAIN_CONFIG.W2_OFFSET;
    for (let o = 0; o < numOut; o++) {
      const rowOffset = w2Offset + o * numHid;
      const dst = outCoords[o];
      for (let h = 0; h < numHid; h++) {
        const w = weights[rowOffset + h] || 0;
        const alpha = clamp(Math.abs(w) / 2.5, 0.08, 0.9);
        const src = hidCoords[h];
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
        ctx.strokeStyle = w >= 0
          ? `rgba(74, 222, 128, ${alpha.toFixed(3)})`
          : `rgba(248, 113, 113, ${alpha.toFixed(3)})`;
        ctx.lineWidth = alpha * 1.8;
        ctx.stroke();
      }
    }

    // Helper to draw an activation node with glow
    const drawNode = (x, y, val, isOutput0 = false) => {
      const normVal = isOutput0 ? clamp(val / Math.PI, -1.0, 1.0) : clamp(val, -1.0, 1.0);
      const intensity = clamp(Math.abs(normVal), 0.15, 1.0);

      // Outer glow for strong activations
      if (Math.abs(normVal) > 0.25) {
        ctx.beginPath();
        ctx.arc(x, y, 7.0, 0, Math.PI * 2);
        ctx.fillStyle = normVal >= 0
          ? `rgba(56, 189, 248, ${(intensity * 0.35).toFixed(3)})`
          : `rgba(245, 158, 11, ${(intensity * 0.35).toFixed(3)})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      if (Math.abs(normVal) < 0.05) {
        ctx.fillStyle = '#1e293b';
      } else if (normVal > 0) {
        ctx.fillStyle = normVal > 0.5 ? '#4ade80' : '#38bdf8';
      } else {
        ctx.fillStyle = normVal < -0.5 ? '#ef4444' : '#f59e0b';
      }
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    };

    // 3. Render Input Nodes & Labels
    ctx.font = '9px sans-serif';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < numIn; i++) {
      const pt = inCoords[i];
      const act = inAct[i] || 0;
      drawNode(pt.x, pt.y, act, false);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(this.INPUT_LABELS[i] || `In ${i}`, pt.x - 7, pt.y);
    }

    // 4. Render Hidden Nodes
    for (let h = 0; h < numHid; h++) {
      const pt = hidCoords[h];
      const act = hidAct[h] || 0;
      drawNode(pt.x, pt.y, act, false);
    }

    // 5. Render Output Nodes & Labels with Numeric Readout
    for (let o = 0; o < numOut; o++) {
      const pt = outCoords[o];
      const act = outAct[o] || 0;
      drawNode(pt.x, pt.y, act, o === 0);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      const label = this.OUTPUT_LABELS[o] || `Out ${o}`;
      const valStr = o === 0 ? `${(act * 180 / Math.PI).toFixed(0)}°` : act.toFixed(2);
      ctx.fillText(`${label} ${valStr}`, pt.x + 7, pt.y);
    }
  }
}
