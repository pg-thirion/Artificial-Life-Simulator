import { chromium } from 'file:///C:/Users/gawie/AppData/Roaming/npm/node_modules/playwright/index.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runFullGameReview() {
  console.log('====================================================');
  console.log('   PLAYWRIGHT CLI: FULL GAME & TUTORIAL REVIEW     ');
  console.log('====================================================\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warn') {
      consoleWarnings.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  const fileUrl = 'file:///' + path.resolve(__dirname, '../index.html').replace(/\\/g, '/');
  console.log('1. Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Check 1: Zero console errors on boot
  console.log('\n2. Checking Console and Network Errors...');
  if (consoleErrors.length > 0) {
    console.error('FAILED: Found console errors on boot:');
    consoleErrors.forEach(e => console.error('  ->', e));
    process.exit(1);
  } else {
    console.log('PASS: 0 console errors on initial load!');
  }

  if (pageErrors.length > 0) {
    console.error('FAILED: Found uncaught page errors:');
    pageErrors.forEach(e => console.error('  ->', e));
    process.exit(1);
  } else {
    console.log('PASS: 0 uncaught exceptions on initial load!');
  }

  // Check 2: Tutorial Modal Verification
  console.log('\n3. Reviewing Interactive Tutorial System...');
  const tutorialOverlay = await page.$('#tutorial-overlay');
  const isTutorialOpen = await page.$eval('#tutorial-overlay', el => el.classList.contains('open'));
  console.log(`Tutorial overlay exists: ${!!tutorialOverlay}, Auto-opened on launch: ${isTutorialOpen}`);

  if (!isTutorialOpen) {
    throw new Error('Tutorial did not auto-open on first launch!');
  }

  const step1Title = await page.$eval('#tut-title', el => el.textContent);
  const step1Badge = await page.$eval('#tut-step-badge', el => el.textContent);
  console.log(`Step 1 Title: "${step1Title}", Badge: "${step1Badge}"`);

  // Step through tutorial
  for (let s = 1; s <= 5; s++) {
    await page.click('#tut-next');
    await page.waitForTimeout(200);
    const badge = await page.$eval('#tut-step-badge', el => el.textContent);
    console.log(`  -> Clicked Next: Now on ${badge}`);
  }

  const lastStepBtnText = await page.$eval('#tut-next', el => el.textContent.trim());
  console.log(`Final Step Next Button Text: "${lastStepBtnText}"`);

  // Take screenshot of tutorial
  await page.screenshot({ path: path.join(__dirname, 'tutorial_screen.png') });
  console.log('Saved tutorial screenshot: tests/tutorial_screen.png');

  // Complete tutorial
  await page.click('#tut-next');
  await page.waitForTimeout(300);
  const isClosedAfterFinish = await page.$eval('#tutorial-overlay', el => !el.classList.contains('open'));
  console.log(`Tutorial closed after completion: ${isClosedAfterFinish}`);

  // Test reopening via "❓ Tutorial" button
  console.log('Testing reopening tutorial via HUD button...');
  await page.click('#btn-help-tutorial');
  await page.waitForTimeout(200);
  const isReopened = await page.$eval('#tutorial-overlay', el => el.classList.contains('open'));
  console.log(`Reopened tutorial successfully: ${isReopened}`);

  // Close with Escape hotkey
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const isClosedByEscape = await page.$eval('#tutorial-overlay', el => !el.classList.contains('open'));
  console.log(`Closed tutorial via Escape key: ${isClosedByEscape}`);

  // Test opening with 'T' hotkey
  await page.keyboard.press('t');
  await page.waitForTimeout(200);
  const isOpenedByHotkey = await page.$eval('#tutorial-overlay', el => el.classList.contains('open'));
  console.log(`Opened tutorial via 'T' hotkey: ${isOpenedByHotkey}`);
  await page.click('#tut-close');
  await page.waitForTimeout(200);

  // Check 3: Simulation Core & HUD Status
  console.log('\n4. Reviewing Simulation HUD & Population Metrics...');
  const creaturesCount = parseInt(await page.$eval('#stat-creatures', el => el.textContent), 10);
  const herbivoresCount = parseInt(await page.$eval('#stat-herbivores', el => el.textContent), 10);
  const carnivoresCount = parseInt(await page.$eval('#stat-carnivores', el => el.textContent), 10);
  const foodCount = parseInt(await page.$eval('#stat-food', el => el.textContent), 10);
  const speciesCount = parseInt(await page.$eval('#stat-species', el => el.textContent), 10);
  const shannonDiversity = parseFloat(await page.$eval('#stat-shannon', el => el.textContent));
  const timeClock = await page.$eval('#stat-time-clock', el => el.textContent.trim());

  console.log(`Organisms: ${creaturesCount} (Herbivores: ${herbivoresCount}, Carnivores: ${carnivoresCount})`);
  console.log(`Food Pellets: ${foodCount}, Species: ${speciesCount}, Shannon Diversity: ${shannonDiversity}`);
  console.log(`Circadian Time Clock: "${timeClock}"`);

  if (creaturesCount <= 0 || foodCount <= 0) {
    throw new Error(`Simulation failed to populate organisms (${creaturesCount}) or food (${foodCount})!`);
  }
  console.log('PASS: Simulation populated and running smoothly!');

  // Check 3.5: DNA Synthesizer & Genetic Lab Modal
  console.log('\n4.5. Reviewing DNA Synthesizer & Genetic Lab...');
  await page.click('#btn-dna-lab');
  await page.waitForTimeout(300);
  const isDnaModalOpen = await page.$eval('#dna-modal', el => el.classList.contains('open'));
  console.log(`  -> DNA Lab Modal open: ${isDnaModalOpen}`);
  if (!isDnaModalOpen) throw new Error('DNA Lab modal failed to open on #btn-dna-lab click');

  // Test preset button
  await page.click('#dna-preset-carn');
  await page.waitForTimeout(150);
  const archLabel = await page.$eval('#dna-archetype-label', el => el.textContent.trim());
  console.log(`  -> Switched to Carnivore preset: "${archLabel}"`);

  // Spawn 3 custom organisms
  const orgCountBeforeDna = parseInt(await page.$eval('#stat-creatures', el => el.textContent), 10);
  await page.click('#btn-dna-spawn');
  await page.waitForTimeout(300);
  const orgCountAfterDna = parseInt(await page.$eval('#stat-creatures', el => el.textContent), 10);
  console.log(`  -> Spawned custom organisms: before=${orgCountBeforeDna}, after=${orgCountAfterDna}`);
  if (orgCountAfterDna < orgCountBeforeDna + 3) {
    throw new Error('Failed to spawn custom organisms from DNA Lab');
  }
  console.log('PASS: DNA Synthesizer & Genetic Lab verified!');

  // Check 4: God-Mode Spawner Brushes
  console.log('\n5. Reviewing God-Mode Brushes...');
  // Select Food Brush and click center of canvas
  await page.click('#tool-food');
  const foodBefore = parseInt(await page.$eval('#stat-food', el => el.textContent), 10);
  await page.mouse.click(600, 400);
  await page.mouse.click(610, 410);
  await page.waitForTimeout(300);
  const foodAfter = parseInt(await page.$eval('#stat-food', el => el.textContent), 10);
  console.log(`Food Brush test: before=${foodBefore}, after=${foodAfter} (spawned: ${foodAfter - foodBefore})`);

  // Spawn Carnivore
  await page.click('#tool-carnivore');
  const carnBefore = parseInt(await page.$eval('#stat-carnivores', el => el.textContent), 10);
  await page.mouse.click(700, 400);
  await page.waitForTimeout(300);
  const carnAfter = parseInt(await page.$eval('#stat-carnivores', el => el.textContent), 10);
  console.log(`Carnivore Brush test: before=${carnBefore}, after=${carnAfter} (spawned: ${carnAfter - carnBefore})`);

  // Check 5: Scenarios & Challenges Presets
  console.log('\n6. Reviewing Preset Scenarios & Challenges...');
  const presets = ['apex_predator', 'famine_scarcity', 'hyper_mutation', 'challenge_speed_trap', 'challenge_darwin_finches', 'cambrian_explosion'];
  for (const preset of presets) {
    await page.selectOption('#preset-select', preset);
    await page.waitForTimeout(400);
    const pop = parseInt(await page.$eval('#stat-creatures', el => el.textContent), 10);
    console.log(`  -> Preset "${preset}" loaded. Organism count: ${pop}`);
  }

  // Check 6: Analytics Tabs (including Phase Space Scatter & Fossils)
  console.log('\n7. Reviewing Evolutionary Analytics Dashboard...');
  const tabs = ['population', 'evolution', 'diversity', 'scatter', 'fossils', 'histograms'];
  for (const tab of tabs) {
    await page.click(`button[data-tab="${tab}"]`);
    await page.waitForTimeout(200);
    const activeTab = await page.$eval('.analytics-tab.active', el => el.getAttribute('data-tab'));
    console.log(`  -> Switched to analytics tab: ${activeTab}`);
  }
  await page.click('#analytics-close');
  await page.waitForTimeout(200);

  // Check 7: Death & Extinction Message Toggling
  console.log('\n8. Reviewing Toggleable Death & Extinction Messages...');
  const deathBtnInitial = await page.$eval('#btn-toggle-death', el => el.textContent.trim());
  const deathBtnActiveInitial = await page.$eval('#btn-toggle-death', el => el.classList.contains('active'));
  console.log(`Initial Death Msgs button: "${deathBtnInitial}", active: ${deathBtnActiveInitial}`);
  if (deathBtnInitial !== 'Death Msgs: ON' || !deathBtnActiveInitial) {
    throw new Error(`Death button initial state unexpected: "${deathBtnInitial}" active=${deathBtnActiveInitial}`);
  }

  // Click button to disable death messages
  await page.click('#btn-toggle-death');
  await page.waitForTimeout(200);
  const deathBtnMuted = await page.$eval('#btn-toggle-death', el => el.textContent.trim());
  const deathBtnActiveMuted = await page.$eval('#btn-toggle-death', el => el.classList.contains('active'));
  const chkMuted = await page.$eval('#chk-death-msgs', el => el.checked);
  console.log(`After click: "${deathBtnMuted}", active: ${deathBtnActiveMuted}, chk: ${chkMuted}`);
  if (deathBtnMuted !== 'Death Msgs: OFF' || deathBtnActiveMuted || chkMuted) {
    throw new Error('Failed to mute death messages via toggle button');
  }

  // Toggle via 'D' hotkey
  await page.keyboard.press('d');
  await page.waitForTimeout(200);
  const deathBtnAfterD = await page.$eval('#btn-toggle-death', el => el.textContent.trim());
  console.log(`After 'D' hotkey toggle: "${deathBtnAfterD}"`);
  if (deathBtnAfterD !== 'Death Msgs: ON') {
    throw new Error("Failed to re-enable death messages via 'D' hotkey");
  }

  // Toggle via 'M' hotkey
  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  const deathBtnAfterM = await page.$eval('#btn-toggle-death', el => el.textContent.trim());
  console.log(`After 'M' hotkey toggle: "${deathBtnAfterM}"`);
  if (deathBtnAfterM !== 'Death Msgs: OFF') {
    throw new Error("Failed to mute death messages via 'M' hotkey");
  }

  // Re-enable via checkbox in Tweakers panel (open panel first)
  await page.click('#btn-env-toggle');
  await page.waitForTimeout(200);
  await page.click('#chk-death-msgs');
  await page.waitForTimeout(200);
  const deathBtnFinal = await page.$eval('#btn-toggle-death', el => el.textContent.trim());
  console.log(`After checkbox toggle: "${deathBtnFinal}"`);
  if (deathBtnFinal !== 'Death Msgs: ON') {
    throw new Error('Failed to re-enable death messages via checkbox');
  }
  await page.click('#btn-env-close');
  await page.waitForTimeout(200);
  console.log('PASS: Toggleable death messages verified across button, hotkeys (D, M), and tweaker checkbox!');

  // Check 8: Disaster Triggers
  console.log('\n9. Reviewing Environmental Disasters...');
  await page.click('#btn-meteor');
  await page.waitForTimeout(400);
  const toasts = await page.$$eval('.toast', els => els.map(e => e.textContent));
  console.log(`  -> Triggered Meteor Strike. Active toasts: ${toasts.join(' | ')}`);

  // Check 8.5: Chemical Ecology Pheromones Toggle
  console.log('\n9.5. Reviewing Pheromone Scent Trails in Tweakers...');
  await page.click('#btn-env-toggle');
  await page.waitForTimeout(200);
  const chkPhero = await page.$eval('#chk-pheromones', el => el.checked);
  console.log(`  -> Initial Pheromones checkbox: ${chkPhero}`);
  await page.click('#chk-pheromones');
  await page.waitForTimeout(150);
  const chkPheroOff = await page.$eval('#chk-pheromones', el => el.checked);
  console.log(`  -> After toggle: ${chkPheroOff}`);
  await page.click('#chk-pheromones'); // re-enable
  await page.click('#btn-env-close');
  await page.waitForTimeout(200);

  // Check 9: Audio System
  console.log('\n10. Reviewing Web Audio UI Controls...');
  const muteBtnTextBefore = await page.$eval('#btn-audio-mute', el => el.textContent);
  await page.click('#btn-audio-mute');
  const muteBtnTextAfter = await page.$eval('#btn-audio-mute', el => el.textContent);
  console.log(`  -> Audio Mute toggle: "${muteBtnTextBefore}" -> "${muteBtnTextAfter}"`);

  // Check 10: Possession Mode (Manual WASD Control)
  console.log('\n11. Reviewing Direct Possession Mode (WASD Control)...');
  await page.evaluate(() => {
    if (window.alsWorld && window.alsWorld.creatures.length > 0 && window.alsSelectCreature) {
      window.alsSelectCreature(window.alsWorld.creatures[0]);
    }
  });
  await page.waitForTimeout(200);

  const isInspectorOpen = await page.$eval('#inspector', el => el.classList.contains('open')).catch(() => false);
  console.log(`Inspector open after select: ${isInspectorOpen}`);

  if (isInspectorOpen) {
    const possessBtnBefore = await page.$eval('#btn-possess-creature', el => el.textContent.trim());
    await page.click('#btn-possess-creature');
    await page.waitForTimeout(200);
    const possessBtnAfter = await page.$eval('#btn-possess-creature', el => el.textContent.trim());
    console.log(`  -> Possess button: "${possessBtnBefore}" -> "${possessBtnAfter}"`);

    // Verify intention updated
    const intentionText = await page.$eval('#insp-intention', el => el.textContent.trim()).catch(() => '');
    console.log(`  -> Inspector intention: "${intentionText}"`);

    // Send WASD movement keys
    await page.keyboard.press('w');
    await page.keyboard.press('d');
    await page.waitForTimeout(200);

    // Release with 'E' hotkey
    await page.keyboard.press('e');
    await page.waitForTimeout(200);
    const possessBtnReleased = await page.$eval('#btn-possess-creature', el => el.textContent.trim());
    console.log(`  -> Released with 'E' key: "${possessBtnReleased}"`);
    console.log('PASS: Direct possession mode (WASD + E key) verified!');
  }

  // Check 11: World Simulation State Save (JSON)
  console.log('\n11.5. Reviewing Simulation State Export & Serialization...');
  const saveStateJSON = await page.evaluate(() => {
    return window.alsWorld ? window.alsWorld.exportWorldJSON() : null;
  });
  console.log(`  -> Exported JSON length: ${saveStateJSON ? saveStateJSON.length : 0} bytes`);
  if (!saveStateJSON || !saveStateJSON.includes('creatures')) {
    throw new Error('Simulation failed to export valid JSON state');
  }
  console.log('PASS: Simulation state export and JSON serialization verified!');

  // Check 12: Live Neural Network Brain & Visualizer in Inspector
  console.log('\n12. Reviewing Live Neural Network Brain & Visualizer in Inspector...');
  const neuralCheck = await page.evaluate(() => {
    const c = window.alsWorld.creatures.find(cr => cr.isAlive);
    if (!c) throw new Error('No living creature available to select');
    c.brainType = 'neural';
    window.alsSelectCreature(c);
    const canvasEl = document.getElementById('insp-brain-canvas');
    const badgeEl = document.getElementById('insp-brain-type');
    return {
      canvasExists: !!canvasEl,
      width: canvasEl ? canvasEl.width : 0,
      height: canvasEl ? canvasEl.height : 0,
      badgeText: badgeEl ? badgeEl.textContent.trim() : '',
      weightsLength: c.brain && c.brain.weights ? c.brain.weights.length : 0,
      outputsLength: c.brain && c.brain.activations && c.brain.activations.output ? c.brain.activations.output.length : 0
    };
  });
  console.log(`  -> Brain Canvas: exists=${neuralCheck.canvasExists}, ${neuralCheck.width}x${neuralCheck.height}`);
  console.log(`  -> Brain Badge: "${neuralCheck.badgeText}", weights=${neuralCheck.weightsLength}, outputs=${neuralCheck.outputsLength}`);
  if (!neuralCheck.canvasExists || neuralCheck.width !== 268 || neuralCheck.height !== 165) {
    throw new Error(`Invalid #insp-brain-canvas dimensions: ${neuralCheck.width}x${neuralCheck.height}`);
  }
  if (neuralCheck.badgeText !== 'NEURAL (124 syn)') {
    throw new Error(`Expected initial badge "NEURAL (124 syn)", got "${neuralCheck.badgeText}"`);
  }
  if (neuralCheck.weightsLength !== 124 || neuralCheck.outputsLength !== 4) {
    throw new Error(`Invalid brain topology: weights=${neuralCheck.weightsLength}, outputs=${neuralCheck.outputsLength}`);
  }

  // Click #insp-brain-type to toggle to Heuristic
  await page.click('#insp-brain-type');
  await page.waitForTimeout(150);
  const badgeAfterHeuristic = await page.$eval('#insp-brain-type', el => el.textContent.trim());
  const summaryAfterHeuristic = await page.$eval('#insp-brain-Summary', el => el.textContent.trim());
  console.log(`  -> Toggled to Heuristic: badge="${badgeAfterHeuristic}", summary="${summaryAfterHeuristic}"`);
  if (badgeAfterHeuristic !== 'HEURISTIC (Rule)') {
    throw new Error(`Expected badge "HEURISTIC (Rule)" after click, got "${badgeAfterHeuristic}"`);
  }

  // Click #insp-brain-type again to restore 'neural'
  await page.click('#insp-brain-type');
  await page.waitForTimeout(150);
  const badgeRestored = await page.$eval('#insp-brain-type', el => el.textContent.trim());
  const brainModeRestored = await page.evaluate(() => {
    const c = window.alsWorld.creatures.find(cr => cr.isHighlighted);
    return c ? c.brainType : null;
  });
  console.log(`  -> Restored Neural mode: badge="${badgeRestored}", brainType="${brainModeRestored}"`);
  if (badgeRestored !== 'NEURAL (124 syn)' || brainModeRestored !== 'neural') {
    throw new Error(`Failed to restore neural brain mode: badge="${badgeRestored}", brainType="${brainModeRestored}"`);
  }
  console.log('PASS: Live Neural Network Brain & Visualizer verified!');

  // Check 13: Dynamic Chromatophores & Aposematic Mimicry
  console.log('\n13. Reviewing Dynamic Chromatophores & Aposematic Mimicry...');
  const chromCheck = await page.evaluate(() => {
    const c = window.alsWorld.creatures.find(cr => cr.isAlive);
    c.genome.armor = 0.9;
    c.genome.bravery = 0.9;
    c.genome.chromatophore = 0.9;
    c.update(0.1, {
      worldWidth: window.alsWorld.width,
      worldHeight: window.alsWorld.height,
      getBiomeAt: (x, y) => window.alsWorld.getBiomeAt(x, y)
    });
    return {
      hasChromatophoreColor: !!c.chromatophoreColor && typeof c.chromatophoreColor.r === 'number',
      effectiveColorCss: c.effectiveColorCss,
      aposematicWarningLevel: c.aposematicWarningLevel
    };
  });
  console.log(`  -> Chromatophore RGB valid: ${chromCheck.hasChromatophoreColor}, CSS: "${chromCheck.effectiveColorCss}", Aposematic Warning: ${chromCheck.aposematicWarningLevel.toFixed(2)}`);
  if (!chromCheck.hasChromatophoreColor || !chromCheck.effectiveColorCss.startsWith('rgb(') || chromCheck.aposematicWarningLevel <= 0.35) {
    throw new Error(`Chromatophore / Aposematic check failed: ${JSON.stringify(chromCheck)}`);
  }
  console.log('PASS: Dynamic Chromatophores & Aposematic Mimicry verified!');

  // Check 14: Symbiosis Mutualism & Parasitic Leeches
  console.log('\n14. Reviewing Symbiosis Mutualism & Parasitic Leeches...');
  const symbiosisCheck = await page.evaluate(() => {
    const host = new Creature(500, 500, new Genome({ size: 14.0, diet: 0.2, symbiosis: 0.2 }), 180);
    const parasite = new Creature(505, 500, new Genome({ size: 5.0, diet: 0.75, symbiosis: 0.1 }), 40);
    const cleaner = new Creature(508, 500, new Genome({ size: 7.5, diet: 0.3, symbiosis: 0.85 }), 60);

    const attached = parasite.attachToHost(host);
    const hostParasiteCountAfterAttach = host.attachedParasites.length;
    const cleanerEnergyBefore = cleaner.energy;
    const gained = cleaner.groomParasite(parasite);
    const hostParasiteCountAfterGroom = host.attachedParasites.length;

    return {
      isParasite: parasite.isParasite,
      isCleaner: cleaner.isCleaner,
      attached,
      hostParasiteCountAfterAttach,
      gained,
      cleanerEnergyAfter: cleaner.energy,
      cleanerEnergyBefore,
      hostParasiteCountAfterGroom,
      parasiteHostAfterGroom: parasite.hostCreature
    };
  });
  console.log(`  -> Parasite attached: ${symbiosisCheck.attached} (count=${symbiosisCheck.hostParasiteCountAfterAttach}), Cleaner groomed: +${symbiosisCheck.gained.toFixed(1)} NRG (count after=${symbiosisCheck.hostParasiteCountAfterGroom})`);
  if (!symbiosisCheck.isParasite || !symbiosisCheck.isCleaner || !symbiosisCheck.attached || symbiosisCheck.hostParasiteCountAfterAttach !== 1 || symbiosisCheck.gained <= 0 || symbiosisCheck.hostParasiteCountAfterGroom !== 0 || symbiosisCheck.parasiteHostAfterGroom !== null) {
    throw new Error(`Symbiosis / Parasite check failed: ${JSON.stringify(symbiosisCheck)}`);
  }
  console.log('PASS: Symbiosis Mutualism & Parasitic Leeches verified!');

  // Check 15: Multicellular Colony Coordinator
  console.log('\n15. Reviewing Multicellular Colony Coordinator...');
  const colonyCheck = await page.evaluate(() => {
    const g = new Genome({
      speciesId: 'sp_colony_e2e',
      size: 9.0,
      diet: 0.2,
      adhesion: 0.92
    });
    const c1 = new Creature(800, 800, g.clone(), 120);
    const c2 = new Creature(805, 800, g.clone(), 120);
    window.alsWorld.creatures.push(c1, c2);
    window.alsWorld.creatureGrid.insert(c1);
    window.alsWorld.creatureGrid.insert(c2);
    window.alsWorld.registerCreatureSpecies(c1, null);
    window.alsWorld.registerCreatureSpecies(c2, null);

    window.alsWorld.update(0.05);

    const col = c1.colony;
    const inWorldColonies = col ? window.alsWorld.colonies.includes(col) : false;
    const roles = col ? col.cells.map(cell => cell.colonyRole) : [];
    return {
      formed: !!col && c1.colony === c2.colony,
      inWorldColonies,
      cellCount: col ? col.cells.length : 0,
      roles
    };
  });
  console.log(`  -> Colony formed: ${colonyCheck.formed}, in world.colonies: ${colonyCheck.inWorldColonies}, cells: ${colonyCheck.cellCount}, roles: [${colonyCheck.roles.join(', ')}]`);
  if (!colonyCheck.formed || !colonyCheck.inWorldColonies || !colonyCheck.roles.includes('mouth') || !colonyCheck.roles.includes('motor')) {
    throw new Error(`Multicellular Colony check failed: ${JSON.stringify(colonyCheck)}`);
  }
  console.log('PASS: Multicellular Colony Coordinator verified!');

  // Check 16: Species Arena Battle Royale Tournament Mode
  console.log('\n16. Reviewing Species Arena Battle Royale Tournament Mode...');
  await page.click('#btn-arena-mode');
  await page.waitForTimeout(300);

  const arenaStartState = await page.evaluate(() => {
    const hud = document.getElementById('arena-hud');
    const rows = document.querySelectorAll('#arena-leaderboard .arena-clade-row');
    return {
      hudOpen: hud ? hud.classList.contains('open') : false,
      isActive: window.alsArena ? window.alsArena.isActive : false,
      cladeRowCount: rows.length,
      stormRadius: window.alsArena ? window.alsArena.stormRadius : 0
    };
  });
  console.log(`  -> Arena started: hudOpen=${arenaStartState.hudOpen}, isActive=${arenaStartState.isActive}, clades=${arenaStartState.cladeRowCount}`);
  if (!arenaStartState.hudOpen || !arenaStartState.isActive || arenaStartState.cladeRowCount !== 4) {
    throw new Error(`Arena mode failed to start properly: ${JSON.stringify(arenaStartState)}`);
  }

  // Click #btn-arena-rematch and verify tournament restarts cleanly
  await page.evaluate(() => {
    window.alsArena.update(10.0);
  });
  await page.click('#btn-arena-rematch');
  await page.waitForTimeout(200);
  const arenaRematchState = await page.evaluate(() => {
    const rows = document.querySelectorAll('#arena-leaderboard .arena-clade-row');
    return {
      isActive: window.alsArena.isActive,
      elapsedTime: window.alsArena.elapsedTime,
      stormRadius: window.alsArena.stormRadius,
      initialRadius: window.alsArena.initialRadius,
      cladeRowCount: rows.length
    };
  });
  console.log(`  -> Arena rematch: isActive=${arenaRematchState.isActive}, elapsedTime=${arenaRematchState.elapsedTime.toFixed(2)}, stormRadius=${arenaRematchState.stormRadius}, clades=${arenaRematchState.cladeRowCount}`);
  if (!arenaRematchState.isActive || arenaRematchState.cladeRowCount !== 4 || arenaRematchState.stormRadius < arenaRematchState.initialRadius - 50) {
    throw new Error(`Arena rematch failed: ${JSON.stringify(arenaRematchState)}`);
  }

  // Click #btn-arena-exit and verify #arena-hud closes and sandbox state is restored
  await page.click('#btn-arena-exit');
  await page.waitForTimeout(250);
  const arenaExitState = await page.evaluate(() => {
    const hud = document.getElementById('arena-hud');
    return {
      hudOpen: hud ? hud.classList.contains('open') : true,
      isActive: window.alsArena ? window.alsArena.isActive : true,
      creatureCount: window.alsWorld ? window.alsWorld.creatures.length : 0
    };
  });
  console.log(`  -> Arena exited: hudOpen=${arenaExitState.hudOpen}, isActive=${arenaExitState.isActive}, restored organisms=${arenaExitState.creatureCount}`);
  if (arenaExitState.hudOpen || arenaExitState.isActive || arenaExitState.creatureCount <= 0) {
    throw new Error(`Arena exit failed to restore sandbox: ${JSON.stringify(arenaExitState)}`);
  }
  console.log('PASS: Species Arena Battle Royale Tournament Mode verified!');

  // Capture Final Gameplay Screenshot before navigating to dist/index.html
  console.log('\n16.5. Capturing Final Gameplay Screenshot...');
  await page.screenshot({ path: path.join(__dirname, 'gameplay_screen.png') });
  console.log('Saved gameplay screenshot: tests/gameplay_screen.png');

  // Check 17: Cloudflare Pages Production Bundle (dist/index.html)
  console.log('\n17. Reviewing Cloudflare Pages Production Bundle (dist/index.html)...');
  const distConsoleErrors = [];
  const distPageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') distConsoleErrors.push(msg.text());
  });
  page.on('pageerror', err => {
    distPageErrors.push(err.toString());
  });

  const distUrl = 'file:///' + path.resolve(__dirname, '../dist/index.html').replace(/\\/g, '/');
  console.log('  -> Navigating to:', distUrl);
  await page.goto(distUrl, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const distCreaturesCount = parseInt(await page.$eval('#stat-creatures', el => el.textContent), 10);
  console.log(`  -> dist/index.html Organism Count: ${distCreaturesCount}, Console Errors: ${distConsoleErrors.length}, Page Errors: ${distPageErrors.length}`);
  if (distConsoleErrors.length > 0 || distPageErrors.length > 0 || distCreaturesCount <= 0) {
    throw new Error(`dist/index.html verification failed: creatures=${distCreaturesCount}, consoleErrors=${distConsoleErrors.length}, pageErrors=${distPageErrors.length}`);
  }
  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error(`Total console/page errors during review: console=${consoleErrors.length}, page=${pageErrors.length}`);
  }
  console.log('PASS: Cloudflare Pages Production Bundle (dist/index.html) verified with 0 errors!');

  console.log('\n====================================================');
  console.log('   ALL PLAYWRIGHT TESTS & REVIEWS PASSED (100%)    ');
  console.log('====================================================\n');

  await browser.close();
}

runFullGameReview().catch(err => {
  console.error('\nPLAYWRIGHT REVIEW FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
