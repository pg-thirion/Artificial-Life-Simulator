import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function stripImportsExports(code) {
  let clean = code.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  clean = clean.replace(/export\s+default\s+/g, '');
  clean = clean.replace(/export\s+(class|function|const|let|var)\s+/g, '$1 ');
  clean = clean.replace(/export\s*\{[\s\S]*?\};?/g, '');
  return clean;
}

const moduleFiles = [
  'src/math.js',
  'src/neuralBrain.js',
  'src/neuralVisualizer.js',
  'src/spatialGrid.js',
  'src/food.js',
  'src/genome.js',
  'src/creature.js',
  'src/colony.js',
  'src/world.js',
  'src/charts.js',
  'src/audio.js'
];

let coreBundle = '/* ==================== BUNDLED CORE ENGINE ==================== */\n';
for (const file of moduleFiles) {
  const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
  coreBundle += `\n/* --- ${file} --- */\n` + stripImportsExports(content) + '\n';
}

const tutorialScript = `
  /* ==================== INTERACTIVE TUTORIAL CONTROLLER ==================== */
  const TUTORIAL_STEPS = [
    {
      icon: '🧬',
      title: 'Welcome to Artificial Life Simulator',
      html: \`
        <h4>A Darwinian Sandbox Running in Real Time</h4>
        <p>You are observing an emergent artificial ecosystem where digital organisms live, forage, hunt, reproduce, mutate, and evolve according to real evolutionary physics.</p>
        <div class="tut-mini-box">
          <strong>Key Dynamics:</strong>
          Organisms possess continuous genetic DNA. Natural selection determines which traits survive based on caloric efficiency, predation pressure, and environmental carrying capacity.
        </div>
        <div class="tut-callout">
          💡 <em>Organisms that cannot find enough energy starve and die. Successful foragers reproduce and pass on mutated DNA to offspring.</em>
        </div>
      \`
    },
    {
      icon: '🌱',
      title: 'Genetics, Diets & Primer Physics',
      html: \`
        <h4>Three Trophic Diets & Physical Trade-Offs</h4>
        <div class="tut-card-grid">
          <div class="tut-mini-box">
            <strong style="color: #4ade80;">🌿 Herbivores (Diet &lt; 0.4)</strong>
            Graze exclusively on plant algae. Fast flee sprints away from predators.
          </div>
          <div class="tut-mini-box">
            <strong style="color: #f87171;">🥩 Carnivores (Diet &gt; 0.6)</strong>
            Equipped with sharp mandibles. Hunt and devour other organisms for high meat calories.
          </div>
          <div class="tut-mini-box">
            <strong style="color: #c084fc;">🟣 Omnivores (Diet 0.4 - 0.6)</strong>
            Eat both plants and meat. Opportunistic foragers and scavengers.
          </div>
          <div class="tut-mini-box">
            <strong style="color: #38bdf8;">⚖️ Primer Kinetic Law</strong>
            Metabolic cost = Size³ × Basal + Size × Speed² × 0.014 + Sense × 0.003. Fast speed burns energy fast!
          </div>
        </div>
        <div class="tut-callout">
          ⚠️ <em>Runaway speed is fatal: faster organisms require exponentially more food to avoid starvation!</em>
        </div>
      \`
    },
    {
      icon: '🛠️',
      title: 'God-Mode Tools & Spawner Brushes',
      html: \`
        <h4>Shape the World with Your Hands</h4>
        <p>Use the top toolbar to influence the simulation:</p>
        <div class="tut-card-grid">
          <div class="tut-mini-box">
            <strong>🖱️ Select Tool</strong>
            Click an organism to inspect its genome. Drag empty space to pan the camera. Mouse wheel to zoom.
          </div>
          <div class="tut-mini-box">
            <strong>🌿 Food Brush</strong>
            Click or drag across the arena to paint lush algae feeding grounds.
          </div>
          <div class="tut-mini-box">
            <strong>➕ Creature Spawners</strong>
            Inject custom Herbivores, Carnivores, or Omnivores directly into the habitat.
          </div>
          <div class="tut-mini-box">
            <strong style="color: #ef4444;">⚡ Smite / Cull Brush</strong>
            Drag across overpopulated or rogue clusters to immediately cull organisms and food.
          </div>
        </div>
      \`
    },
    {
      icon: '🔬',
      title: 'Creature Inspector & Possession Mode',
      html: \`
        <h4>Direct Control & Genetic Modification</h4>
        <p>Click any organism with the <strong>Select</strong> tool to inspect its live vitals:</p>
        <div class="tut-mini-box">
          <strong>Key Inspector Features:</strong>
          <ul style="padding-left: 18px; margin-top: 4px; font-size: 12px;">
            <li><strong>🎮 Possess Mode (Hotkey: E):</strong> Steer the organism directly with <code>WASD</code> or Arrow Keys! Press <code>Space</code> to manually reproduce.</li>
            <li><strong>📷 Camera Follow:</strong> Lock camera tracking onto the creature as it navigates.</li>
            <li><strong>🧬 Live Gene Sliders:</strong> Modify Speed, Sense Radius, Size, Diet, or Bravery on the fly!</li>
            <li><strong>🍎 Feed (+50 NRG):</strong> Rescue an endangered creature or breed a dynasty.</li>
          </ul>
        </div>
      \`
    },
    {
      icon: '📊',
      title: 'Primer Evolutionary Analytics',
      html: \`
        <h4>Live Real-Time Science Charts</h4>
        <p>Click the <strong>Analytics</strong> button on the bottom control bar to open the scientific dashboard:</p>
        <div class="tut-card-grid">
          <div class="tut-mini-box">
            <strong>📊 Trait Distributions</strong>
            Histograms for Speed, Sense, Size, and Diet with mean (μ) and standard deviation (±σ) markers.
          </div>
          <div class="tut-mini-box">
            <strong>🎯 Phase Space (Speed vs Sense)</strong>
            The classic Primer scatter plot showing natural selection clusters forming in real time.
          </div>
          <div class="tut-mini-box">
            <strong>📈 Population Trends</strong>
            Multi-series Lotka-Volterra predator-prey dynamics over time.
          </div>
          <div class="tut-mini-box">
            <strong>🌐 Diversity & Clades</strong>
            Shannon-Wiener Diversity Index (H') and active species lineage cladogram.
          </div>
        </div>
      \`
    },
    {
      icon: '☄️',
      title: 'Biomes, Challenges & Controls',
      html: \`
        <h4>Explore Diverse Ecological Niches</h4>
        <div class="tut-card-grid">
          <div class="tut-mini-box">
            <strong>🗺️ 4 Dynamic Biomes:</strong>
            <em>Fertile Oasis</em> (high food), <em>Arid Desert</em> (famine), <em>Deep Marsh</em> (water drag), and <em>Thermal Barrens</em> (golden berries).
          </div>
          <div class="tut-mini-box">
            <strong style="color: #f87171;">💀 Death & Extinction Alerts:</strong>
            Toggle death messages on/off using the <strong>Death Msgs</strong> button or <code>D</code> / <code>M</code> hotkey for quiet viewing.
          </div>
        </div>
        <div class="tut-callout">
          ⌨️ <strong>Hotkeys:</strong> <code>WASD</code> Move Possessed | <code>E</code> Possess | <code>Space</code> Pause / Bud | <code>D</code>/<code>M</code> Death Msgs | <code>T</code>/<code>H</code> Tutorial | <code>G</code> Grid | <code>P</code> Perception.
        </div>
      \`
    }
  ];

  class TutorialController {
    constructor() {
      this.overlay = document.getElementById('tutorial-overlay');
      this.titleEl = document.getElementById('tut-title');
      this.iconEl = document.getElementById('tut-icon');
      this.badgeEl = document.getElementById('tut-step-badge');
      this.bodyEl = document.getElementById('tut-body');
      this.prevBtn = document.getElementById('tut-prev');
      this.nextBtn = document.getElementById('tut-next');
      this.closeBtn = document.getElementById('tut-close');
      this.dotsContainer = document.getElementById('tut-dots');
      this.dontShowCheckbox = document.getElementById('tut-dont-show');
      this.currentStep = 0;

      this.initEvents();

      const dismissed = localStorage.getItem('alife_tutorial_dismissed');
      if (!dismissed) {
        this.open();
      }
    }

    initEvents() {
      this.prevBtn.onclick = () => this.prev();
      this.nextBtn.onclick = () => this.next();
      this.closeBtn.onclick = () => this.close();
      this.overlay.onclick = (e) => {
        if (e.target === this.overlay) this.close();
      };

      const dots = this.dotsContainer.querySelectorAll('.tut-dot');
      dots.forEach((dot, idx) => {
        dot.onclick = () => this.goTo(idx);
      });

      this.dontShowCheckbox.onchange = () => {
        if (this.dontShowCheckbox.checked) {
          localStorage.setItem('alife_tutorial_dismissed', 'true');
        } else {
          localStorage.removeItem('alife_tutorial_dismissed');
        }
      };

      window.addEventListener('keydown', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
        if (e.key === 't' || e.key === 'T' || e.key === 'h' || e.key === 'H') {
          if (!this.overlay.classList.contains('open')) {
            this.open();
          } else {
            this.close();
          }
        } else if (e.key === 'Escape' && this.overlay.classList.contains('open')) {
          this.close();
        } else if (e.key === 'ArrowRight' && this.overlay.classList.contains('open')) {
          this.next();
        } else if (e.key === 'ArrowLeft' && this.overlay.classList.contains('open')) {
          this.prev();
        }
      });

      const btnHelp = document.getElementById('btn-help-tutorial');
      if (btnHelp) {
        btnHelp.onclick = () => this.open();
      }
    }

    render() {
      const step = TUTORIAL_STEPS[this.currentStep];
      this.titleEl.textContent = step.title;
      this.iconEl.textContent = step.icon;
      this.badgeEl.textContent = \`Step \${this.currentStep + 1} of \${TUTORIAL_STEPS.length}\`;
      this.bodyEl.innerHTML = step.html;

      this.prevBtn.disabled = this.currentStep === 0;
      if (this.currentStep === TUTORIAL_STEPS.length - 1) {
        this.nextBtn.textContent = 'Start Simulating 🚀';
      } else {
        this.nextBtn.textContent = 'Next →';
      }

      const dots = this.dotsContainer.querySelectorAll('.tut-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === this.currentStep);
      });
    }

    open() {
      this.overlay.classList.add('open');
      this.render();
    }

    close() {
      this.overlay.classList.remove('open');
      if (this.dontShowCheckbox.checked) {
        localStorage.setItem('alife_tutorial_dismissed', 'true');
      }
    }

    next() {
      if (this.currentStep < TUTORIAL_STEPS.length - 1) {
        this.currentStep++;
        this.render();
      } else {
        this.close();
      }
    }

    prev() {
      if (this.currentStep > 0) {
        this.currentStep--;
        this.render();
      }
    }

    goTo(idx) {
      if (idx >= 0 && idx < TUTORIAL_STEPS.length) {
        this.currentStep = idx;
        this.render();
      }
    }
  }
`;

const templateHtml = fs.readFileSync(path.join(rootDir, 'src/template.html'), 'utf8');
const appJsContent = stripImportsExports(fs.readFileSync(path.join(rootDir, 'src/app.js'), 'utf8'));

const finalScript = `
  <script>
${coreBundle}
${tutorialScript}
${appJsContent}
  // Instantiate Tutorial Controller
  window.tutorial = new TutorialController();
  </script>
`;

const finalHtml = templateHtml.replace('<!-- SCRIPT_PLACEHOLDER -->', finalScript);

fs.writeFileSync(path.join(rootDir, 'index.html'), finalHtml, 'utf8');
console.log('Successfully generated clean standalone index.html with death message toggle and tutorial!');
