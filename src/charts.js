/**
 * Artificial Life Simulator - Evolutionary Analytics & Charts
 * High-performance Primer-grade Canvas charts:
 * 1. Real-time Trait Histograms with Mean (μ) and StdDev (σ) markers
 * 2. Multi-line Population History Time Series
 * 3. Trait Co-Evolution Trajectory
 * 4. Shannon-Wiener Diversity & Phylogenetic Cladogram Breakdown
 */

import { GENE_BOUNDS } from './genome.js';
import { clamp } from './math.js';

export class ChartManager {
  /**
   * @param {HTMLCanvasElement} canvas 
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.currentTab = 'histograms'; // 'histograms' | 'population' | 'evolution' | 'diversity'

    // Color palette matching dark futuristic theme
    this.colors = {
      bg: '#0f172a',
      cardBg: '#1e293b',
      border: '#334155',
      text: '#f8fafc',
      muted: '#94a3b8',
      herbivore: '#22c55e',
      carnivore: '#ef4444',
      omnivore: '#f59e0b',
      food: '#38bdf8',
      biomass: '#a855f7',
      speed: '#06b6d4',
      sense: '#3b82f6',
      size: '#8b5cf6',
      diet: '#f43f5e'
    };
  }

  /**
   * Main render dispatch for the active chart tab.
   * @param {Object} world World instance containing creatures, telemetryHistory, speciesRegistry
   */
  render(world) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    switch (this.currentTab) {
      case 'histograms':
        this.drawTraitHistograms(ctx, w, h, world.creatures);
        break;
      case 'population':
        this.drawPopulationHistory(ctx, w, h, world.telemetryHistory);
        break;
      case 'evolution':
        this.drawTraitEvolution(ctx, w, h, world.telemetryHistory);
        break;
      case 'diversity':
        this.drawDiversityAndSpecies(ctx, w, h, world);
        break;
      case 'scatter':
        this.drawScatterPhaseSpace(ctx, w, h, world.creatures);
        break;
      case 'fossils':
        this.drawFossilRecord(ctx, w, h, world);
        break;
    }
  }

  /**
   * 1. Real-time Trait Histograms for Speed, Sense, Size, and Diet.
   */
  drawTraitHistograms(ctx, width, height, creatures) {
    const pad = 12;
    const cols = 2;
    const rows = 2;
    const cellW = (width - pad * 3) / cols;
    const cellH = (height - pad * 3) / rows;

    const traits = [
      { key: 'speed', label: 'Movement Speed', min: GENE_BOUNDS.speed.min, max: GENE_BOUNDS.speed.max, color: this.colors.speed, unit: 'px/s' },
      { key: 'sense', label: 'Perception Radius', min: GENE_BOUNDS.sense.min, max: GENE_BOUNDS.sense.max, color: this.colors.sense, unit: 'px' },
      { key: 'size', label: 'Body Size / Mass', min: GENE_BOUNDS.size.min, max: GENE_BOUNDS.size.max, color: this.colors.size, unit: 'r' },
      { key: 'diet', label: 'Diet (Plant -> Meat)', min: 0.0, max: 1.0, color: this.colors.diet, unit: '' }
    ];

    traits.forEach((t, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = pad + col * (cellW + pad);
      const y = pad + row * (cellH + pad);

      this.drawSingleHistogram(ctx, x, y, cellW, cellH, creatures, t);
    });
  }

  /**
   * Helper to draw a single trait histogram card.
   */
  drawSingleHistogram(ctx, x, y, w, h, creatures, traitConfig) {
    // Card background
    ctx.fillStyle = this.colors.cardBg;
    ctx.strokeStyle = this.colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // Title & Trait info
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(traitConfig.label, x + 10, y + 16);

    const numBins = 14;
    const bins = new Array(numBins).fill(0);
    const range = traitConfig.max - traitConfig.min;

    let sum = 0;
    const values = [];

    for (const c of creatures) {
      if (!c.isAlive) continue;
      const val = c.genome[traitConfig.key];
      values.push(val);
      sum += val;

      const norm = clamp((val - traitConfig.min) / range, 0, 0.999);
      const binIdx = Math.floor(norm * numBins);
      bins[binIdx]++;
    }

    const n = values.length;
    if (n === 0) return;

    const mean = sum / n;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Header stats badge
    ctx.fillStyle = this.colors.muted;
    ctx.font = '10px monospace';
    const statsStr = `μ: ${mean.toFixed(2)}  σ: ${stdDev.toFixed(2)}`;
    ctx.fillText(statsStr, x + w - ctx.measureText(statsStr).width - 10, y + 16);

    // Chart plotting area
    const plotX = x + 10;
    const plotY = y + 26;
    const plotW = w - 20;
    const plotH = h - 38;

    const maxBin = Math.max(...bins, 1);
    const barW = (plotW / numBins) - 2;

    // Draw bins
    for (let i = 0; i < numBins; i++) {
      const barH = (bins[i] / maxBin) * (plotH - 6);
      const bx = plotX + i * (plotW / numBins);
      const by = plotY + plotH - barH;

      ctx.fillStyle = traitConfig.color;
      ctx.fillRect(bx, by, barW, barH);
    }

    // Mean Marker (Vertical dashed line)
    const meanNorm = clamp((mean - traitConfig.min) / range, 0, 1);
    const meanX = plotX + meanNorm * plotW;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 1.5;
    ctx.moveTo(meanX, plotY);
    ctx.lineTo(meanX, plotY + plotH);
    ctx.stroke();

    // Standard deviation bracket
    const leftSdNorm = clamp((mean - stdDev - traitConfig.min) / range, 0, 1);
    const rightSdNorm = clamp((mean + stdDev - traitConfig.min) / range, 0, 1);
    const sdX1 = plotX + leftSdNorm * plotW;
    const sdX2 = plotX + rightSdNorm * plotW;

    ctx.fillStyle = 'rgba(248, 250, 252, 0.08)';
    ctx.fillRect(sdX1, plotY, sdX2 - sdX1, plotH);
    ctx.restore();
  }

  /**
   * 2. Live Multi-line Population History Time Series.
   */
  drawPopulationHistory(ctx, width, height, history) {
    if (!history || history.length < 2) {
      this.drawEmptyMessage(ctx, width, height, 'Collecting population telemetry...');
      return;
    }

    const padLeft = 45;
    const padRight = 15;
    const padTop = 30;
    const padBottom = 25;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Find max value for Y-scaling
    let maxVal = 20;
    for (const pt of history) {
      maxVal = Math.max(maxVal, pt.herbivores, pt.carnivores, pt.foodCount, pt.totalPop);
    }
    maxVal = Math.ceil(maxVal * 1.15);

    // Card background
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    // Legend
    const legends = [
      { label: 'Herbivores', color: this.colors.herbivore },
      { label: 'Carnivores/Omnivores', color: this.colors.carnivore },
      { label: 'Food Pellets', color: this.colors.food },
      { label: 'Total Pop', color: '#f8fafc' }
    ];
    let legendX = padLeft;
    ctx.font = '10px sans-serif';
    for (const leg of legends) {
      ctx.fillStyle = leg.color;
      ctx.fillRect(legendX, 10, 8, 8);
      ctx.fillStyle = this.colors.muted;
      ctx.fillText(leg.label, legendX + 12, 18);
      legendX += ctx.measureText(leg.label).width + 24;
    }

    // Gridlines
    ctx.strokeStyle = '#27354f';
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.muted;
    ctx.font = '9px monospace';

    for (let i = 0; i <= 4; i++) {
      const yVal = Math.round((maxVal / 4) * i);
      const py = padTop + plotH - (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();
      ctx.fillText(yVal.toString(), 8, py + 3);
    }

    // Plot Lines
    const drawLine = (prop, color, lineWidth = 1.8) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      for (let i = 0; i < history.length; i++) {
        const x = padLeft + (i / (history.length - 1)) * plotW;
        const val = history[i][prop] || 0;
        const y = padTop + plotH - (val / maxVal) * plotH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawLine('foodCount', this.colors.food, 1.2);
    drawLine('herbivores', this.colors.herbivore, 2.0);
    drawLine('carnivores', this.colors.carnivore, 2.0);
    drawLine('totalPop', '#f8fafc', 1.0);
  }

  /**
   * 3. Trait Evolution Over Time (Generational shifts in Speed, Sense, Size, Diet).
   */
  drawTraitEvolution(ctx, width, height, history) {
    if (!history || history.length < 2) {
      this.drawEmptyMessage(ctx, width, height, 'Tracking trait co-evolution...');
      return;
    }

    const padLeft = 45;
    const padRight = 15;
    const padTop = 30;
    const padBottom = 25;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    // Legend
    const legends = [
      { label: 'Avg Speed', color: this.colors.speed },
      { label: 'Avg Sense', color: this.colors.sense },
      { label: 'Avg Size', color: this.colors.size },
      { label: 'Avg Diet', color: this.colors.diet }
    ];
    let legendX = padLeft;
    ctx.font = '10px sans-serif';
    for (const leg of legends) {
      ctx.fillStyle = leg.color;
      ctx.fillRect(legendX, 10, 8, 8);
      ctx.fillStyle = this.colors.muted;
      ctx.fillText(leg.label, legendX + 12, 18);
      legendX += ctx.measureText(leg.label).width + 24;
    }

    // Gridlines (0% to 100% normalized range)
    ctx.strokeStyle = '#27354f';
    ctx.lineWidth = 1;
    ctx.fillStyle = this.colors.muted;
    ctx.font = '9px monospace';

    for (let i = 0; i <= 4; i++) {
      const pct = i * 25;
      const py = padTop + plotH - (i / 4) * plotH;
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();
      ctx.fillText(`${pct}%`, 10, py + 3);
    }

    // Trait Line drawer (normalizes values to 0.0 - 1.0)
    const drawNormalizedTrait = (prop, min, max, color) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.0;

      for (let i = 0; i < history.length; i++) {
        const x = padLeft + (i / (history.length - 1)) * plotW;
        const rawVal = history[i][prop] || min;
        const norm = clamp((rawVal - min) / (max - min), 0, 1);
        const y = padTop + plotH - norm * plotH;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawNormalizedTrait('avgSpeed', GENE_BOUNDS.speed.min, GENE_BOUNDS.speed.max, this.colors.speed);
    drawNormalizedTrait('avgSense', GENE_BOUNDS.sense.min, GENE_BOUNDS.sense.max, this.colors.sense);
    drawNormalizedTrait('avgSize', GENE_BOUNDS.size.min, GENE_BOUNDS.size.max, this.colors.size);
    drawNormalizedTrait('avgDiet', 0.0, 1.0, this.colors.diet);
  }

  /**
   * 4. Species Phylogenetic Tree & Shannon-Wiener Diversity Breakdown.
   */
  drawDiversityAndSpecies(ctx, width, height, world) {
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    const { shannonIndex, activeSpeciesCount, evenness } = world.calculateDiversityIndex();

    // Header Metrics
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Species Diversity & Phylogeny', 16, 22);

    ctx.font = '11px monospace';
    ctx.fillStyle = this.colors.food;
    ctx.fillText(`Shannon Diversity H': ${shannonIndex.toFixed(3)}`, 16, 42);
    ctx.fillStyle = this.colors.muted;
    ctx.fillText(`Active Species: ${activeSpeciesCount}  |  Pielou Evenness J': ${evenness.toFixed(2)}`, 16, 58);

    // Active Species Proportion Stacked Bar
    const totalPop = world.creatures.length;
    if (totalPop === 0) return;

    const barX = 16;
    const barY = 72;
    const barW = width - 32;
    const barH = 14;

    ctx.fillStyle = '#334155';
    ctx.fillRect(barX, barY, barW, barH);

    let curX = barX;
    const sortedSpecies = Array.from(world.speciesRegistry.values())
      .filter(s => s.memberCount > 0)
      .sort((a, b) => b.memberCount - a.memberCount);

    for (const sp of sortedSpecies) {
      const segW = (sp.memberCount / totalPop) * barW;
      ctx.fillStyle = sp.color ? sp.color.bodyCss : '#38bdf8';
      ctx.fillRect(curX, barY, segW, barH);
      curX += segW;
    }

    // Species Registry List Table
    const tableY = 104;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = this.colors.muted;
    ctx.fillText('SPECIES', 16, tableY);
    ctx.fillText('GUILD', 90, tableY);
    ctx.fillText('ALIVE', 170, tableY);
    ctx.fillText('PEAK', 220, tableY);
    ctx.fillText('LINEAGE', 270, tableY);

    ctx.strokeStyle = this.colors.border;
    ctx.beginPath();
    ctx.moveTo(16, tableY + 4);
    ctx.lineTo(width - 16, tableY + 4);
    ctx.stroke();

    const maxRows = Math.min(sortedSpecies.length, 6);
    ctx.font = '10px monospace';

    for (let i = 0; i < maxRows; i++) {
      const sp = sortedSpecies[i];
      const rowY = tableY + 20 + i * 18;

      // Color badge dot
      ctx.fillStyle = sp.color ? sp.color.bodyCss : '#fff';
      ctx.beginPath();
      ctx.arc(22, rowY - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.fillText(sp.id, 32, rowY);

      // Guild
      ctx.fillStyle = sp.archetype === 'carnivore' ? this.colors.carnivore : (sp.archetype === 'herbivore' ? this.colors.herbivore : this.colors.omnivore);
      ctx.fillText(sp.archetype.toUpperCase(), 90, rowY);

      ctx.fillStyle = '#fff';
      ctx.fillText(sp.memberCount.toString(), 170, rowY);
      ctx.fillStyle = this.colors.muted;
      ctx.fillText(sp.peakCount.toString(), 220, rowY);

      const parentStr = sp.parentSpeciesId ? `from ${sp.parentSpeciesId}` : 'ancestral';
      ctx.fillText(parentStr, 270, rowY);
    }
  }

  /**
   * 5. Primer Phase Space Scatter Plot: Speed (X) vs Sense (Y).
   */
  drawScatterPhaseSpace(ctx, width, height, creatures) {
    const padL = 40;
    const padR = 20;
    const padT = 30;
    const padB = 30;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, width, height);

    // Title & Legend
    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = this.colors.text;
    ctx.fillText('Primer Phase Space: Speed vs Sense', padL, 18);

    ctx.font = '9px sans-serif';
    ctx.fillStyle = this.colors.herbivore;
    ctx.fillText('● Herbivore', width - 180, 18);
    ctx.fillStyle = this.colors.omnivore;
    ctx.fillText('● Omnivore', width - 120, 18);
    ctx.fillStyle = this.colors.carnivore;
    ctx.fillText('● Carnivore', width - 60, 18);

    // Grid lines & labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;

    // X-axis (Speed 1 to 4)
    ctx.font = '9px monospace';
    ctx.fillStyle = this.colors.muted;
    for (let s = 1; s <= 4; s++) {
      const x = padL + ((s - 0.8) / 4.0) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + chartH);
      ctx.stroke();
      ctx.fillText(`${s}x`, x - 6, padT + chartH + 14);
    }
    ctx.fillText('Speed →', padL + chartW / 2 - 20, padT + chartH + 24);

    // Y-axis (Sense 50, 100, 150, 200)
    for (let sense = 50; sense <= 200; sense += 50) {
      const y = padT + chartH - ((sense - 25) / 195) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + chartW, y);
      ctx.stroke();
      ctx.fillText(`${sense}`, 12, y + 3);
    }

    if (!creatures || creatures.length === 0) return;

    let sumSpeed = 0;
    let sumSense = 0;
    let validCount = 0;

    // Plot organism dots
    for (const c of creatures) {
      if (!c.isAlive) continue;
      const g = c.genome;
      sumSpeed += g.speed;
      sumSense += g.sense;
      validCount++;

      const px = clamp(padL + ((g.speed - 0.8) / 4.0) * chartW, padL, padL + chartW);
      const py = clamp(padT + chartH - ((g.sense - 25) / 195) * chartH, padT, padT + chartH);
      const pr = clamp(g.size * 0.45, 2.5, 7.5);

      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = g.diet < 0.35 ? this.colors.herbivore : (g.diet > 0.65 ? this.colors.carnivore : this.colors.omnivore);
      ctx.globalAlpha = 0.75;
      ctx.fill();

      if (c.isHighlighted || c.isPossessed) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1.0;

    if (validCount > 0) {
      // Mean crosshair
      const avgSpeed = sumSpeed / validCount;
      const avgSense = sumSense / validCount;
      const mx = clamp(padL + ((avgSpeed - 0.8) / 4.0) * chartW, padL, padL + chartW);
      const my = clamp(padT + chartH - ((avgSense - 25) / 195) * chartH, padT, padT + chartH);

      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mx, padT);
      ctx.lineTo(mx, padT + chartH);
      ctx.moveTo(padL, my);
      ctx.lineTo(padL + chartW, my);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  /**
   * 6. Fossil Record & Phylogenetic Lineage Museum.
   * Displays extinct taxa, causes of death, peak population, and historical cladogram.
   */
  drawFossilRecord(ctx, width, height, world) {
    const pad = 14;
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2);

    ctx.strokeStyle = this.colors.border;
    ctx.strokeRect(pad, pad, width - pad * 2, height - pad * 2);

    // Header Title
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('🏛️ FOSSIL RECORD & CLADE EXTINCTION MUSEUM', pad + 12, pad + 20);

    const fossils = world.fossilRecord || [];
    const activeClades = world.speciesRegistry ? world.speciesRegistry.size : 0;

    // Subtitle Stats
    ctx.font = '10px monospace';
    ctx.fillStyle = this.colors.muted;
    ctx.fillText(`Extinct Species: ${fossils.length} | Active Clades: ${activeClades} | Epoch Time: ${Math.round(world.time)}s`, pad + 12, pad + 36);

    if (fossils.length === 0) {
      ctx.fillStyle = this.colors.muted;
      ctx.font = 'italic 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No extinct taxa in the fossil record yet. All active clades are thriving!', width / 2, height / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Two-column layout: Left column = Recent Extinct Taxa, Right column = Phylogenetic History Tree
    const colW = (width - pad * 2 - 28) / 2;
    const startY = pad + 48;
    const maxEntries = Math.min(fossils.length, 6);

    // Left Column: Extinct Taxa Cards
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('RECENT EXTINCT TAXA:', pad + 12, startY);

    for (let i = 0; i < maxEntries; i++) {
      const f = fossils[i];
      const cardY = startY + 10 + i * 26;

      // Color badge
      ctx.beginPath();
      ctx.arc(pad + 18, cardY + 6, 5, 0, Math.PI * 2);
      ctx.fillStyle = f.color ? f.color.bodyCss : '#94a3b8';
      ctx.fill();

      // Species ID & Archetype
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`[${f.speciesId}]`, pad + 28, cardY + 9);

      const archColor = f.archetype === 'carnivore' ? this.colors.carnivore :
                        f.archetype === 'herbivore' ? this.colors.herbivore : this.colors.omnivore;
      ctx.fillStyle = archColor;
      ctx.font = '9px sans-serif';
      ctx.fillText(f.archetype.toUpperCase(), pad + 80, cardY + 9);

      // Lifespan & Peak
      ctx.fillStyle = this.colors.muted;
      ctx.font = '9px monospace';
      ctx.fillText(`Peak: ${f.peakPopulation} | Survived: ${f.lifespan}s`, pad + 155, cardY + 9);
    }

    // Right Column: Cladogram Branch Diagram
    const rightX = pad + 12 + colW + 10;
    ctx.fillStyle = this.colors.text;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('PHYLOGENETIC DIVERGENCE TREE:', rightX, startY);

    const treeW = colW - 10;
    const treeH = height - startY - pad - 12;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(rightX, startY + 10, treeW, treeH);
    ctx.strokeStyle = this.colors.border;
    ctx.strokeRect(rightX, startY + 10, treeW, treeH);

    // Render branch lines from speciesRegistry
    let branchIdx = 0;
    const records = Array.from(world.speciesRegistry.values()).slice(0, 8);
    const branchSpacing = treeH / (records.length + 1);

    for (const r of records) {
      const by = startY + 16 + (branchIdx + 1) * branchSpacing;
      const startX = rightX + 16;
      const endX = rightX + treeW - 40;

      ctx.strokeStyle = r.color ? r.color.strokeCss : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(startX, by);
      ctx.lineTo(endX, by);
      ctx.stroke();

      // Leaf dot
      ctx.beginPath();
      ctx.arc(endX, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = r.extinct ? '#ef4444' : '#22c55e';
      ctx.fill();

      // Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '8px monospace';
      ctx.fillText(`${r.id} ${r.extinct ? '†' : `(${r.memberCount})`}`, endX + 6, by + 3);

      branchIdx++;
    }
  }

  /**
   * Fallback message for empty data.
   */
  drawEmptyMessage(ctx, w, h, msg) {
    ctx.fillStyle = this.colors.cardBg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = this.colors.muted;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg, w / 2, h / 2);
    ctx.textAlign = 'left';
  }
}
