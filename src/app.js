// Canvases
const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

const chartCanvas = document.getElementById('chart-canvas');
const chartManager = new ChartManager(chartCanvas);

const minimapCanvas = document.getElementById('minimap-canvas');
const miniCtx = minimapCanvas.getContext('2d');

let width = (canvas.width = window.innerWidth);
let height = (canvas.height = window.innerHeight);

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

// World & Camera Setup
const WORLD_WIDTH = 2800;
const WORLD_HEIGHT = 1800;

let world = new World({
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  initialHerbivores: 48,
  initialCarnivores: 14,
  initialOmnivores: 10,
  maxFood: 420,
  showDeathMessages: true
});

let camera = {
  x: WORLD_WIDTH / 2 - width / 2,
  y: WORLD_HEIGHT / 2 - height / 2,
  zoom: 0.85
};
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let cameraFollowSelected = false;

// Toast Notifications
const toastContainer = document.getElementById('toast-container');
function showToast(message, type = 'normal') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 3500);
}

// Connect Audio Synthesizer to World Events
function bindWorldEvents() {
  world.on('extinction', (evt) => {
    if (world.showDeathMessages) {
      sound.extinction();
      showToast(evt.message, 'extinction');
    }
  });

  world.on('death', (evt) => {
    if (world.showDeathMessages && selectedCreature === evt.creature) {
      showToast(`Tracked Creature #${evt.creature.id} died (${evt.cause})`, 'extinction');
    }
  });

  world.on('disaster', (evt) => {
    if (evt.name === 'Meteor Strike') sound.meteor();
    showToast(evt.message, 'disaster');
  });

  world.on('speciation', (evt) => {
    showToast(evt.message, 'speciation');
  });

  world.on('eat', (evt) => {
    sound.eat(evt.pitchMultiplier || 1.0);
  });

  world.on('bite', () => {
    sound.bite();
  });

  world.on('reproduce', () => {
    sound.reproduce();
  });
}

bindWorldEvents();

// Audio UI Controls
const btnAudioMute = document.getElementById('btn-audio-mute');
btnAudioMute.onclick = () => {
  sound.init();
  const muted = sound.toggleMute();
  btnAudioMute.textContent = muted ? '🔇' : '🔊';
};

const sliderVolume = document.getElementById('slider-volume');
sliderVolume.oninput = () => {
  sound.init();
  sound.setVolume(parseFloat(sliderVolume.value));
};

// Death & Extinction Message Toggling
const btnToggleDeath = document.getElementById('btn-toggle-death');
const chkDeathMsgs = document.getElementById('chk-death-msgs');

function updateDeathMessagesUI(enabled) {
  world.setDeathMessages(enabled);
  if (btnToggleDeath) {
    btnToggleDeath.textContent = enabled ? 'Death Msgs: ON' : 'Death Msgs: OFF';
    btnToggleDeath.classList.toggle('active', enabled);
  }
  if (chkDeathMsgs) {
    chkDeathMsgs.checked = enabled;
  }
  showToast(`Death messages: ${enabled ? 'ENABLED' : 'MUTED'}`, 'normal');
}

if (btnToggleDeath) {
  btnToggleDeath.onclick = () => {
    updateDeathMessagesUI(!world.showDeathMessages);
  };
}

if (chkDeathMsgs) {
  chkDeathMsgs.onchange = () => {
    updateDeathMessagesUI(chkDeathMsgs.checked);
  };
}

// Tool Mode State
let activeTool = 'select'; // 'select' | 'food' | 'herbivore' | 'carnivore' | 'omnivore' | 'smite'
const toolButtons = {
  'select': document.getElementById('tool-select'),
  'food': document.getElementById('tool-food'),
  'herbivore': document.getElementById('tool-herbivore'),
  'carnivore': document.getElementById('tool-carnivore'),
  'omnivore': document.getElementById('tool-omnivore'),
  'smite': document.getElementById('tool-smite')
};

Object.keys(toolButtons).forEach(tool => {
  toolButtons[tool].onclick = () => {
    activeTool = tool;
    Object.values(toolButtons).forEach(b => b.classList.remove('active'));
    toolButtons[tool].classList.add('active');
    canvas.style.cursor = tool === 'select' ? 'default' : (tool === 'smite' ? 'not-allowed' : 'crosshair');
  };
});

// Helper: Convert screen coords to world coords
function screenToWorld(clientX, clientY) {
  const worldX = (clientX - width / 2) / camera.zoom + camera.x + width / 2;
  const worldY = (clientY - height / 2) / camera.zoom + camera.y + height / 2;
  return { x: worldX, y: worldY };
}

// Brush Application
function applyToolAt(worldX, worldY) {
  if (activeTool === 'food') {
    world.foodManager.spawnPlant(worldX, worldY);
  } else if (activeTool === 'herbivore') {
    const c = new Creature(worldX, worldY, Genome.random('herbivore'), 100);
    world.creatures.push(c);
    world.creatureGrid.insert(c);
    world.registerCreatureSpecies(c, null);
  } else if (activeTool === 'carnivore') {
    const c = new Creature(worldX, worldY, Genome.random('carnivore'), 120);
    world.creatures.push(c);
    world.creatureGrid.insert(c);
    world.registerCreatureSpecies(c, null);
  } else if (activeTool === 'omnivore') {
    const c = new Creature(worldX, worldY, Genome.random('omnivore'), 110);
    world.creatures.push(c);
    world.creatureGrid.insert(c);
    world.registerCreatureSpecies(c, null);
  } else if (activeTool === 'smite') {
    const toSmite = world.creatureGrid.queryRadius(worldX, worldY, 45);
    for (const c of toSmite) {
      c.kill();
    }
    const foodToSmite = world.foodManager.spatialGrid.queryRadius(worldX, worldY, 45);
    for (const f of foodToSmite) {
      world.foodManager.consume(f);
    }
  }
}

// Mouse Interaction
let isMouseDown = false;
let selectedCreature = null;

canvas.addEventListener('mousedown', (e) => {
  sound.init(); // lazy init audio context on user gesture
  const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);
  isMouseDown = true;

  if (activeTool === 'select') {
    const nearest = world.creatureGrid.queryNearest(worldX, worldY, 40);
    if (nearest) {
      selectCreature(nearest.entity);
      return;
    }
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
  } else {
    applyToolAt(worldX, worldY);
  }
});

window.addEventListener('mousemove', (e) => {
  if (isDragging && activeTool === 'select') {
    const dx = (e.clientX - dragStart.x) / camera.zoom;
    const dy = (e.clientY - dragStart.y) / camera.zoom;
    camera.x -= dx;
    camera.y -= dy;
    dragStart = { x: e.clientX, y: e.clientY };
  } else if (isMouseDown && (activeTool === 'food' || activeTool === 'smite')) {
    const { x: worldX, y: worldY } = screenToWorld(e.clientX, e.clientY);
    applyToolAt(worldX, worldY);
  }
});

window.addEventListener('mouseup', () => {
  isMouseDown = false;
  isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
  camera.zoom = clamp(camera.zoom * zoomFactor, 0.25, 2.5);
}, { passive: false });

// Minimap Interaction: Click or drag on minimap to jump camera
minimapCanvas.addEventListener('mousedown', (e) => {
  handleMinimapClick(e);
});

function handleMinimapClick(e) {
  const rect = minimapCanvas.getBoundingClientRect();
  const clickX = clamp(e.clientX - rect.left, 0, rect.width);
  const clickY = clamp(e.clientY - rect.top, 0, rect.height);

  const targetWorldX = (clickX / rect.width) * WORLD_WIDTH;
  const targetWorldY = (clickY / rect.height) * WORLD_HEIGHT;

  camera.x = targetWorldX - width / 2;
  camera.y = targetWorldY - height / 2;
  cameraFollowSelected = false;
  document.getElementById('btn-follow-creature').textContent = 'Follow: OFF';
}

// Inspector Handling
const inspectorEl = document.getElementById('inspector');
document.getElementById('insp-close').onclick = hideInspector;

function selectCreature(c) {
  if (selectedCreature) selectedCreature.isHighlighted = false;
  selectedCreature = c;
  if (c) {
    c.isHighlighted = true;
    inspectorEl.classList.add('open');
    updateInspectorUI();
  }
}

function hideInspector() {
  if (selectedCreature) {
    selectedCreature.isHighlighted = false;
    selectedCreature.isPossessed = false;
  }
  selectedCreature = null;
  cameraFollowSelected = false;
  document.getElementById('btn-follow-creature').textContent = 'Follow: OFF';
  document.getElementById('btn-follow-creature').classList.remove('active');
  const btnPossess = document.getElementById('btn-possess-creature');
  if (btnPossess) {
    btnPossess.textContent = 'Possess: OFF';
    btnPossess.classList.remove('active');
  }
  inspectorEl.classList.remove('open');
}

const btnFollow = document.getElementById('btn-follow-creature');
btnFollow.onclick = () => {
  cameraFollowSelected = !cameraFollowSelected;
  btnFollow.textContent = cameraFollowSelected ? 'Follow: ON' : 'Follow: OFF';
  btnFollow.classList.toggle('active', cameraFollowSelected);
};

const btnPossess = document.getElementById('btn-possess-creature');
if (btnPossess) {
  btnPossess.onclick = () => {
    togglePossession();
  };
}

function togglePossession() {
  if (!selectedCreature || !selectedCreature.isAlive) return;
  selectedCreature.isPossessed = !selectedCreature.isPossessed;
  if (btnPossess) {
    btnPossess.textContent = selectedCreature.isPossessed ? 'Possess: ON' : 'Possess: OFF';
    btnPossess.classList.toggle('active', selectedCreature.isPossessed);
  }
  if (selectedCreature.isPossessed) {
    cameraFollowSelected = true;
    btnFollow.textContent = 'Follow: ON';
    btnFollow.classList.add('active');
    showToast(`Controlling Creature #${selectedCreature.id}! Use WASD to steer, Space to reproduce.`, 'speciation');
  } else {
    showToast(`Released Creature #${selectedCreature.id}`, 'normal');
  }
}

document.getElementById('btn-feed-creature').onclick = () => {
  if (selectedCreature && selectedCreature.isAlive) {
    selectedCreature.feed(50);
    world.addFloatingText(selectedCreature.position.x, selectedCreature.position.y - 14, '+50 NRG', '#4ade80');
    sound.eat(1.4);
  }
};

document.getElementById('btn-kill-creature').onclick = () => {
  if (selectedCreature && selectedCreature.isAlive) {
    selectedCreature.kill();
    world.addFloatingText(selectedCreature.position.x, selectedCreature.position.y - 14, 'SMOTE!', '#ef4444');
    hideInspector();
  }
};

// Live Gene Modifiers
const geneSliders = {
  speed: document.getElementById('insp-slider-speed'),
  sense: document.getElementById('insp-slider-sense'),
  size: document.getElementById('insp-slider-size'),
  diet: document.getElementById('insp-slider-diet'),
  armor: document.getElementById('insp-slider-armor'),
  nocturnal: document.getElementById('insp-slider-nocturnal'),
  bravery: document.getElementById('insp-slider-bravery')
};

Object.keys(geneSliders).forEach(gene => {
  if (geneSliders[gene]) {
    geneSliders[gene].oninput = () => {
      if (!selectedCreature || !selectedCreature.isAlive) return;
      const val = parseFloat(geneSliders[gene].value);
      selectedCreature.modifyGene(gene, val);
      updateInspectorUI();
    };
  }
});

function updateInspectorUI() {
  if (!selectedCreature || !selectedCreature.isAlive) {
    hideInspector();
    return;
  }

  const c = selectedCreature;
  const g = c.genome;

  document.getElementById('insp-name').textContent = `Creature #${c.id}`;
  document.getElementById('insp-species').textContent = g.speciesId;
  document.getElementById('insp-state').textContent = c.state.toUpperCase();
  const inspIntention = document.getElementById('insp-intention');
  if (inspIntention) inspIntention.textContent = c.currentIntention;
  const inspLineage = document.getElementById('insp-lineage');
  if (inspLineage) {
    const reproDesc = c.reproductionType === 'sexual' ? 'Sexually Recombined' : 'Asexual Fission';
    inspLineage.textContent = `Gen ${g.generation} (${reproDesc})`;
  }
  document.getElementById('insp-energy').textContent = `${Math.round(c.energy)} / ${Math.round(c.maxEnergy)}`;
  document.getElementById('insp-age').textContent = `${Math.round(c.age)}s / ${Math.round(c.lifespan)}s`;
  document.getElementById('insp-offspring').textContent = c.offspringCount;
  document.getElementById('insp-diet-stat').textContent = `${c.kills} / ${c.plantsEaten}`;

  if (btnPossess) {
    btnPossess.textContent = c.isPossessed ? 'Possess: ON' : 'Possess: OFF';
    btnPossess.classList.toggle('active', c.isPossessed);
  }

  if (document.activeElement !== geneSliders.speed) geneSliders.speed.value = g.speed;
  document.getElementById('insp-speed-val').textContent = g.speed.toFixed(2);

  if (document.activeElement !== geneSliders.sense) geneSliders.sense.value = g.sense;
  document.getElementById('insp-sense-val').textContent = Math.round(g.sense);

  if (document.activeElement !== geneSliders.size) geneSliders.size.value = g.size;
  document.getElementById('insp-size-val').textContent = g.size.toFixed(1);

  if (document.activeElement !== geneSliders.diet) geneSliders.diet.value = g.diet;
  document.getElementById('insp-diet-val').textContent = g.diet.toFixed(2);

  if (geneSliders.armor && document.activeElement !== geneSliders.armor) {
    geneSliders.armor.value = g.armor ?? 0.2;
    const el = document.getElementById('insp-armor-val');
    if (el) el.textContent = (g.armor ?? 0.2).toFixed(2);
  }

  if (geneSliders.nocturnal && document.activeElement !== geneSliders.nocturnal) {
    geneSliders.nocturnal.value = g.nocturnal ?? 0.2;
    const el = document.getElementById('insp-nocturnal-val');
    if (el) el.textContent = (g.nocturnal ?? 0.2).toFixed(2);
  }

  if (document.activeElement !== geneSliders.bravery) geneSliders.bravery.value = g.bravery;
  document.getElementById('insp-bravery-val').textContent = g.bravery.toFixed(2);
}

// Environment Tweakers
const envPanel = document.getElementById('env-panel');
document.getElementById('btn-env-toggle').onclick = () => {
  envPanel.classList.toggle('open');
};
document.getElementById('btn-env-close').onclick = () => {
  envPanel.classList.remove('open');
};

const envFoodSlider = document.getElementById('env-slider-food');
envFoodSlider.oninput = () => {
  world.foodGrowthMultiplier = parseFloat(envFoodSlider.value);
  document.getElementById('env-food-val').textContent = `${world.foodGrowthMultiplier.toFixed(1)}x`;
};

const envMutSlider = document.getElementById('env-slider-mut');
envMutSlider.oninput = () => {
  world.mutationMultiplier = parseFloat(envMutSlider.value);
  document.getElementById('env-mut-val').textContent = `${world.mutationMultiplier.toFixed(1)}x`;
};

const envKineticSlider = document.getElementById('env-slider-kinetic');
envKineticSlider.oninput = () => {
  world.kineticCostMultiplier = parseFloat(envKineticSlider.value);
  document.getElementById('env-kinetic-val').textContent = `${world.kineticCostMultiplier.toFixed(1)}x`;
};

const envTempSlider = document.getElementById('env-slider-temp');
envTempSlider.oninput = () => {
  const val = parseFloat(envTempSlider.value);
  world.temperatureOverride = val;
  world.temperature = val;
  document.getElementById('env-temp-val').textContent = `${val}°C`;
};

document.getElementById('btn-temp-auto').onclick = () => {
  world.temperatureOverride = null;
  document.getElementById('env-temp-val').textContent = 'Auto';
};

// Preset Scenarios
const presetSelect = document.getElementById('preset-select');
presetSelect.onchange = () => {
  world.loadPreset(presetSelect.value);
  bindWorldEvents();
  hideInspector();
  showToast(`Loaded scenario: ${presetSelect.options[presetSelect.selectedIndex].text}`, 'normal');
};

// Controls
let isPaused = false;
let timeScale = 1.0;
let showGrid = false;
let showAllPerception = false;

const btnPause = document.getElementById('btn-pause');
btnPause.onclick = () => {
  isPaused = !isPaused;
  btnPause.textContent = isPaused ? 'Resume' : 'Pause';
  btnPause.classList.toggle('active', isPaused);
};

const speedButtons = [
  { id: 'btn-speed-1', speed: 1.0 },
  { id: 'btn-speed-2', speed: 2.0 },
  { id: 'btn-speed-5', speed: 5.0 }
];
speedButtons.forEach(btn => {
  const el = document.getElementById(btn.id);
  el.onclick = () => {
    timeScale = btn.speed;
    speedButtons.forEach(b => document.getElementById(b.id).classList.remove('active'));
    el.classList.add('active');
  };
});

document.getElementById('btn-reset').onclick = () => {
  world.loadPreset('cambrian_explosion');
  bindWorldEvents();
  hideInspector();
};

const btnGrid = document.getElementById('btn-toggle-grid');
btnGrid.onclick = () => {
  showGrid = !showGrid;
  btnGrid.classList.toggle('active', showGrid);
};

const btnSense = document.getElementById('btn-toggle-sense');
btnSense.onclick = () => {
  showAllPerception = !showAllPerception;
  btnSense.classList.toggle('active', showAllPerception);
};

// Disasters
document.getElementById('btn-meteor').onclick = () => {
  world.triggerMeteor();
};
document.getElementById('btn-epidemic').onclick = () => {
  world.triggerEpidemic();
};

// Analytics Panel & Tabs
const analyticsPanel = document.getElementById('analytics-panel');
const btnToggleCharts = document.getElementById('btn-toggle-charts');
btnToggleCharts.onclick = () => {
  analyticsPanel.classList.toggle('minimized');
  btnToggleCharts.classList.toggle('active', !analyticsPanel.classList.contains('minimized'));
};
document.getElementById('analytics-close').onclick = () => {
  analyticsPanel.classList.add('minimized');
  btnToggleCharts.classList.remove('active');
};

const tabButtons = document.querySelectorAll('.analytics-tab');
tabButtons.forEach(btn => {
  btn.onclick = () => {
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    chartManager.currentTab = btn.getAttribute('data-tab');
  };
});

// Pheromone checkbox
const chkPheromones = document.getElementById('chk-pheromones');
if (chkPheromones) {
  chkPheromones.onchange = (e) => {
    world.showPheromones = e.target.checked;
  };
}

// Save / Load Simulation World State
const btnSaveSim = document.getElementById('btn-save-sim');
if (btnSaveSim) {
  btnSaveSim.onclick = () => {
    const json = world.exportWorldJSON();
    try {
      localStorage.setItem('als_world_save', json);
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `als_world_day${world.dayCount}_t${Math.round(world.time)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Simulation State Saved to JSON!', 'speciation');
  };
}

const btnLoadSim = document.getElementById('btn-load-sim');
const fileLoadSim = document.getElementById('file-load-sim');
if (btnLoadSim && fileLoadSim) {
  btnLoadSim.onclick = () => {
    fileLoadSim.click();
  };
  fileLoadSim.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const success = world.importWorldJSON(event.target.result);
      if (success) {
        bindWorldEvents();
        hideInspector();
        showToast('Simulation World Successfully Restored!', 'speciation');
      } else {
        showToast('Failed to parse simulation save file', 'extinction');
      }
    };
    reader.readAsText(file);
  };
}

// DNA Synthesizer & Genetic Lab Modal
const dnaModal = document.getElementById('dna-modal');
const btnDnaLab = document.getElementById('btn-dna-lab');
const btnDnaClose = document.getElementById('dna-close');
const btnCloneDnaLab = document.getElementById('btn-clone-dna-lab');
const dnaPreviewCanvas = document.getElementById('dna-preview-canvas');
const dnaCtx = dnaPreviewCanvas ? dnaPreviewCanvas.getContext('2d') : null;

const dnaSliders = {
  speed: document.getElementById('dna-slider-speed'),
  sense: document.getElementById('dna-slider-sense'),
  size: document.getElementById('dna-slider-size'),
  diet: document.getElementById('dna-slider-diet'),
  armor: document.getElementById('dna-slider-armor'),
  nocturnal: document.getElementById('dna-slider-nocturnal')
};

let dnaPreviewGenome = Genome.random('herbivore');

function openDnaLab(genomeToLoad = null) {
  if (genomeToLoad) {
    dnaPreviewGenome = genomeToLoad.clone();
  }
  syncDnaLabSliders();
  if (dnaModal) dnaModal.classList.add('open');
}

function closeDnaLab() {
  if (dnaModal) dnaModal.classList.remove('open');
}

function syncDnaLabSliders() {
  if (dnaSliders.speed) dnaSliders.speed.value = dnaPreviewGenome.speed;
  if (dnaSliders.sense) dnaSliders.sense.value = dnaPreviewGenome.sense;
  if (dnaSliders.size) dnaSliders.size.value = dnaPreviewGenome.size;
  if (dnaSliders.diet) dnaSliders.diet.value = dnaPreviewGenome.diet;
  if (dnaSliders.armor) dnaSliders.armor.value = dnaPreviewGenome.armor ?? 0.2;
  if (dnaSliders.nocturnal) dnaSliders.nocturnal.value = dnaPreviewGenome.nocturnal ?? 0.2;

  const spdEl = document.getElementById('dna-spd-val');
  if (spdEl) spdEl.textContent = dnaPreviewGenome.speed.toFixed(2);
  const snsEl = document.getElementById('dna-sns-val');
  if (snsEl) snsEl.textContent = Math.round(dnaPreviewGenome.sense);
  const szEl = document.getElementById('dna-sz-val');
  if (szEl) szEl.textContent = dnaPreviewGenome.size.toFixed(1);
  const dtEl = document.getElementById('dna-dt-val');
  if (dtEl) dtEl.textContent = dnaPreviewGenome.diet.toFixed(2);
  const armEl = document.getElementById('dna-arm-val');
  if (armEl) armEl.textContent = (dnaPreviewGenome.armor ?? 0.2).toFixed(2);
  const nocEl = document.getElementById('dna-noc-val');
  if (nocEl) nocEl.textContent = (dnaPreviewGenome.nocturnal ?? 0.2).toFixed(2);

  const lbl = document.getElementById('dna-archetype-label');
  if (lbl) {
    const dt = dnaPreviewGenome.diet;
    if (dt < 0.35) {
      lbl.textContent = 'HERBIVORE (Grazer)';
      lbl.style.color = '#4ade80';
    } else if (dt > 0.65) {
      lbl.textContent = 'CARNIVORE (Hunter)';
      lbl.style.color = '#f87171';
    } else {
      lbl.textContent = 'OMNIVORE (Opportunist)';
      lbl.style.color = '#c084fc';
    }
  }
}

if (btnDnaLab) btnDnaLab.onclick = () => openDnaLab();
if (btnDnaClose) btnDnaClose.onclick = closeDnaLab;
if (btnCloneDnaLab) {
  btnCloneDnaLab.onclick = () => {
    if (selectedCreature) {
      openDnaLab(selectedCreature.genome);
      showToast(`Copied Creature #${selectedCreature.id}'s DNA into Lab!`, 'speciation');
    }
  };
}

Object.keys(dnaSliders).forEach(key => {
  const slider = dnaSliders[key];
  if (slider) {
    slider.oninput = () => {
      dnaPreviewGenome[key] = parseFloat(slider.value);
      dnaPreviewGenome._colorDirty = true;
      syncDnaLabSliders();
    };
  }
});

const setupDnaPreset = (btnId, archetype) => {
  const btn = document.getElementById(btnId);
  if (btn) {
    btn.onclick = () => {
      dnaPreviewGenome = Genome.random(archetype);
      syncDnaLabSliders();
    };
  }
};
setupDnaPreset('dna-preset-herb', 'herbivore');
setupDnaPreset('dna-preset-carn', 'carnivore');
setupDnaPreset('dna-preset-omni', 'omnivore');

const btnDnaTitan = document.getElementById('dna-preset-titan');
if (btnDnaTitan) {
  btnDnaTitan.onclick = () => {
    dnaPreviewGenome = new Genome({
      speed: 3.4,
      sense: 160,
      size: 18.0,
      diet: 0.95,
      bravery: 0.95,
      armor: 0.8,
      nocturnal: 0.7
    });
    syncDnaLabSliders();
  };
}

const btnDnaSpawn = document.getElementById('btn-dna-spawn');
if (btnDnaSpawn) {
  btnDnaSpawn.onclick = () => {
    for (let i = 0; i < 3; i++) {
      const x = camera.x + width / 2 + randomFloat(-120, 120);
      const y = camera.y + height / 2 + randomFloat(-120, 120);
      const g = dnaPreviewGenome.clone();
      g.speciesId = `sp_lab_${Math.floor(Math.random() * 899 + 100)}`;
      const c = new Creature(clamp(x, 100, WORLD_WIDTH - 100), clamp(y, 100, WORLD_HEIGHT - 100), g, 120);
      world.creatures.push(c);
      world.creatureGrid.insert(c);
      world.registerCreatureSpecies(c, null);
    }
    closeDnaLab();
    showToast('Spawned 3 Custom Genotype Organisms!', 'speciation');
  };
}

// Draw DNA Preview loop
function drawDnaPreview() {
  if (dnaModal && dnaModal.classList.contains('open') && dnaCtx && dnaPreviewCanvas) {
    const dw = dnaPreviewCanvas.width;
    const dh = dnaPreviewCanvas.height;
    dnaCtx.clearRect(0, 0, dw, dh);
    dnaCtx.fillStyle = '#090e17';
    dnaCtx.fillRect(0, 0, dw, dh);

    dnaCtx.save();
    dnaCtx.translate(dw / 2, dh / 2);

    // Perception ring preview
    dnaCtx.beginPath();
    dnaCtx.arc(0, 0, clamp(dnaPreviewGenome.sense * 0.45, 20, 75), 0, Math.PI * 2);
    dnaCtx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    dnaCtx.setLineDash([3, 3]);
    dnaCtx.stroke();
    dnaCtx.setLineDash([]);

    const col = dnaPreviewGenome.color;
    const r = dnaPreviewGenome.size * 2.5;

    // Glow
    dnaCtx.beginPath();
    dnaCtx.arc(0, 0, r + 4, 0, Math.PI * 2);
    dnaCtx.fillStyle = col.bodyGlowCss;
    dnaCtx.fill();

    // Body
    dnaCtx.beginPath();
    dnaCtx.arc(0, 0, r, 0, Math.PI * 2);
    dnaCtx.fillStyle = col.bodyCss;
    dnaCtx.fill();
    dnaCtx.strokeStyle = col.strokeCss;
    dnaCtx.lineWidth = 2;
    dnaCtx.stroke();

    // Eyes
    const eyeR = Math.max(2.5, r * 0.25);
    for (const side of [-1, 1]) {
      dnaCtx.beginPath();
      dnaCtx.arc(r * 0.35, side * r * 0.45, eyeR, 0, Math.PI * 2);
      dnaCtx.fillStyle = '#fff';
      dnaCtx.fill();
      dnaCtx.beginPath();
      dnaCtx.arc(r * 0.42, side * r * 0.45, eyeR * 0.5, 0, Math.PI * 2);
      dnaCtx.fillStyle = '#0f172a';
      dnaCtx.fill();
    }

    // Armor plates
    if ((dnaPreviewGenome.armor ?? 0.2) > 0.35) {
      dnaCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      dnaCtx.lineWidth = 1.8;
      dnaCtx.beginPath();
      dnaCtx.arc(0, 0, r * 0.72, -Math.PI * 0.6, Math.PI * 0.6);
      dnaCtx.stroke();
    }

    dnaCtx.restore();
  }
  requestAnimationFrame(drawDnaPreview);
}
requestAnimationFrame(drawDnaPreview);

// Expose on window for tests & developer console
window.alsWorld = world;
window.alsCamera = camera;
window.alsSelectCreature = selectCreature;

// Minimap Drawing Helper
function drawMinimap() {
  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;

  miniCtx.clearRect(0, 0, mw, mh);

  miniCtx.fillStyle = '#090e17';
  miniCtx.fillRect(0, 0, mw, mh);
  miniCtx.strokeStyle = '#1e293b';
  miniCtx.lineWidth = 1;
  miniCtx.strokeRect(0, 0, mw, mh);

  const scaleX = mw / WORLD_WIDTH;
  const scaleY = mh / WORLD_HEIGHT;

  miniCtx.fillStyle = 'rgba(34, 197, 94, 0.15)';
  for (const patch of world.foodManager.patches) {
    miniCtx.beginPath();
    miniCtx.arc(patch.x * scaleX, patch.y * scaleY, patch.radius * scaleX, 0, Math.PI * 2);
    miniCtx.fill();
  }

  miniCtx.fillStyle = '#22c55e';
  const foodStep = Math.max(1, Math.floor(world.foodManager.foodList.length / 100));
  for (let i = 0; i < world.foodManager.foodList.length; i += foodStep) {
    const f = world.foodManager.foodList[i];
    miniCtx.fillRect(f.position.x * scaleX, f.position.y * scaleY, 1.2, 1.2);
  }

  for (const c of world.creatures) {
    const cx = c.position.x * scaleX;
    const cy = c.position.y * scaleY;
    miniCtx.fillStyle = c.genome.diet > 0.65 ? '#ef4444' : (c.genome.diet < 0.35 ? '#4ade80' : '#f59e0b');
    miniCtx.beginPath();
    miniCtx.arc(cx, cy, c === selectedCreature ? 3 : 1.5, 0, Math.PI * 2);
    miniCtx.fill();
  }

  const vx = (camera.x) * scaleX;
  const vy = (camera.y) * scaleY;
  const vw = (width / camera.zoom) * scaleX;
  const vh = (height / camera.zoom) * scaleY;

  miniCtx.strokeStyle = '#38bdf8';
  miniCtx.lineWidth = 1.2;
  miniCtx.strokeRect(vx, vy, vw, vh);
}

// 60 FPS Loop
let lastTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;
let chartRenderTimer = 0;
let minimapRenderTimer = 0;
const keysPressed = {};

function step() {
  requestAnimationFrame(step);

  const now = performance.now();
  const rawDt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  frameCount++;
  fpsTimer += rawDt;
  if (fpsTimer >= 0.5) {
    document.getElementById('stat-fps').textContent = Math.round(frameCount / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
  }

  const dt = rawDt * timeScale;

  // Manual player possession controls
  if (selectedCreature && selectedCreature.isPossessed && selectedCreature.isAlive) {
    let moveX = 0;
    let moveY = 0;
    if (keysPressed['w'] || keysPressed['arrowup']) moveY -= 1;
    if (keysPressed['s'] || keysPressed['arrowdown']) moveY += 1;
    if (keysPressed['a'] || keysPressed['arrowleft']) moveX -= 1;
    if (keysPressed['d'] || keysPressed['arrowright']) moveX += 1;
    selectedCreature.playerInputVector.set(moveX, moveY);
    if (moveX !== 0 || moveY !== 0) {
      selectedCreature.playerInputVector.normalize();
    }
  }

  if (!isPaused) {
    world.update(dt);
  }

  if (cameraFollowSelected && selectedCreature && selectedCreature.isAlive) {
    camera.x = selectedCreature.position.x - width / 2;
    camera.y = selectedCreature.position.y - height / 2;
  }

  let herbCount = 0;
  let carnCount = 0;
  for (const c of world.creatures) {
    if (c.genome.diet < 0.45) herbCount++;
    else carnCount++;
  }
  document.getElementById('stat-creatures').textContent = world.creatures.length;
  document.getElementById('stat-herbivores').textContent = herbCount;
  document.getElementById('stat-carnivores').textContent = carnCount;
  document.getElementById('stat-food').textContent = world.foodManager.foodList.length;
  document.getElementById('season-badge').textContent = world.foodManager.seasonName;

  const climateStr = `${Math.round(world.temperature)}°C (${world.climateState.replace('_', ' ').toUpperCase()})`;
  document.getElementById('climate-badge').textContent = climateStr;

  const divInfo = world.calculateDiversityIndex();
  document.getElementById('stat-species').textContent = divInfo.activeSpeciesCount;
  document.getElementById('stat-shannon').textContent = divInfo.shannonIndex.toFixed(2);

  // Circadian clock HUD display
  const statTimeClock = document.getElementById('stat-time-clock');
  if (statTimeClock) {
    const hours = Math.floor(world.timeOfDay * 24);
    const mins = Math.floor((world.timeOfDay * 24 % 1) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const icon = world.isNight ? '🌙' : (hours >= 17 || hours <= 7 ? '🌅' : '☀️');
    statTimeClock.textContent = `${icon} Day ${world.dayCount} ${h12}:${mins.toString().padStart(2, '0')} ${ampm}`;
    statTimeClock.style.color = world.isNight ? '#60a5fa' : '#facc15';
  }

  if (selectedCreature) {
    updateInspectorUI();
  }

  chartRenderTimer += rawDt;
  if (chartRenderTimer >= 0.066 && !analyticsPanel.classList.contains('minimized')) {
    chartManager.render(world);
    chartRenderTimer = 0;
  }

  minimapRenderTimer += rawDt;
  if (minimapRenderTimer >= 0.05) {
    drawMinimap();
    minimapRenderTimer = 0;
  }

  // --- World Canvas Render ---
  ctx.clearRect(0, 0, width, height);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x - width / 2, -camera.y - height / 2);

  // Arena boundary & backdrop
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Biome regional backgrounds
  const midX = WORLD_WIDTH / 2;
  const midY = WORLD_HEIGHT / 2;

  // NW: Fertile Oasis
  ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
  ctx.fillRect(0, 0, midX, midY);

  // NE: Arid Desert
  ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
  ctx.fillRect(midX, 0, midX, midY);

  // SW: Deep Marsh
  ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
  ctx.fillRect(0, midY, midX, midY);

  // SE: Thermal Barrens
  ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
  ctx.fillRect(midX, midY, midX, midY);

  // Biome quadrant boundary lines & labels
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(midX, 0); ctx.lineTo(midX, WORLD_HEIGHT);
  ctx.moveTo(0, midY); ctx.lineTo(WORLD_WIDTH, midY);
  ctx.stroke();

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
  ctx.fillText('🌿 FERTILE OASIS (1.5x Food)', 40, 40);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.fillText('🏜️ ARID DESERT (0.35x Food)', midX + 40, 40);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.fillText('🌊 DEEP MARSH (0.7x Speed Drag)', 40, midY + 40);

  ctx.fillStyle = 'rgba(248, 113, 113, 0.35)';
  ctx.fillText('☣️ THERMAL BARRENS (Golden Berries)', midX + 40, midY + 40);

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  if (showGrid) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const cs = 64;
    for (let x = 0; x <= WORLD_WIDTH; x += cs) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += cs) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }
  }

  for (const patch of world.foodManager.patches) {
    const grad = ctx.createRadialGradient(patch.x, patch.y, 10, patch.x, patch.y, patch.radius);
    grad.addColorStop(0, 'rgba(34, 197, 94, 0.12)');
    grad.addColorStop(1, 'rgba(34, 197, 94, 0.00)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(patch.x, patch.y, patch.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pheromone & chemical scent trails
  if (world.showPheromones && world.pheromones) {
    for (const p of world.pheromones) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.type === 'danger' ? 14 : (p.type === 'mating' ? 12 : 8)), 0, Math.PI * 2);
      ctx.fillStyle = p.type === 'danger' ? `rgba(239, 68, 68, ${p.strength * 0.35})` :
                      p.type === 'mating' ? `rgba(236, 72, 153, ${p.strength * 0.40})` :
                      `rgba(34, 197, 94, ${p.strength * 0.28})`;
      ctx.fill();
    }
  }

  world.foodManager.draw(ctx);

  for (const c of world.creatures) {
    c.draw(ctx, {
      isSelected: c === selectedCreature,
      showPerception: showAllPerception || c === selectedCreature
    });
  }

  world.drawWorldEffects(ctx);

  // Ambient Day / Night / Sunset atmospheric overlay
  if (world.isNight || world.solarIntensity < 0.85) {
    const darkness = clamp((0.85 - world.solarIntensity) * 0.70, 0.0, 0.58);
    ctx.fillStyle = `rgba(5, 12, 34, ${darkness})`;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  ctx.restore();
}

// Global hotkeys
window.addEventListener('keydown', (e) => {
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = e.key.toLowerCase();
  keysPressed[k] = true;

  // Space handling: if creature is possessed, space manually reproduces!
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    if (selectedCreature && selectedCreature.isPossessed && selectedCreature.isAlive) {
      if (selectedCreature.energy >= selectedCreature.reproductionThreshold * 0.8) {
        const childGenome = selectedCreature.genome.mutate(world.mutationMultiplier);
        const child = new Creature(selectedCreature.position.x + 20, selectedCreature.position.y, childGenome, selectedCreature.energy * 0.45);
        selectedCreature.energy *= 0.5;
        world.creatures.push(child);
        world.creatureGrid.insert(child);
        world.registerCreatureSpecies(child, childGenome.speciesId);
        world.addFloatingText(selectedCreature.position.x, selectedCreature.position.y - 14, 'SPLIT!', '#38bdf8');
        sound.reproduce();
        showToast('Manual Reproduction Successful!', 'speciation');
      } else {
        world.addFloatingText(selectedCreature.position.x, selectedCreature.position.y - 14, 'NOT ENOUGH NRG', '#f59e0b');
      }
      return;
    }

    isPaused = !isPaused;
    btnPause.textContent = isPaused ? 'Resume' : 'Pause';
    btnPause.classList.toggle('active', isPaused);
  } else if (e.key === 'e' || e.key === 'E') {
    if (selectedCreature && selectedCreature.isAlive) {
      togglePossession();
    }
  } else if (e.key === 'g' || e.key === 'G') {
    showGrid = !showGrid;
    btnGrid.classList.toggle('active', showGrid);
  } else if (e.key === 'p' || e.key === 'P') {
    showAllPerception = !showAllPerception;
    btnSense.classList.toggle('active', showAllPerception);
  } else if (e.key === 'd' || e.key === 'D' || e.key === 'm' || e.key === 'M') {
    updateDeathMessagesUI(!world.showDeathMessages);
  } else if (e.key === '1') {
    timeScale = 1.0;
    speedButtons.forEach(b => document.getElementById(b.id).classList.remove('active'));
    document.getElementById('btn-speed-1').classList.add('active');
  } else if (e.key === '2') {
    timeScale = 2.0;
    speedButtons.forEach(b => document.getElementById(b.id).classList.remove('active'));
    document.getElementById('btn-speed-2').classList.add('active');
  } else if (e.key === '5') {
    timeScale = 5.0;
    speedButtons.forEach(b => document.getElementById(b.id).classList.remove('active'));
    document.getElementById('btn-speed-5').classList.add('active');
  }
});

window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false;
});

requestAnimationFrame(step);
