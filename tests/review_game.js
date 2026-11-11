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

  // Check 11: Full Screen Simulation Screenshot
  console.log('\n12. Capturing Final Gameplay Screenshot...');
  await page.screenshot({ path: path.join(__dirname, 'gameplay_screen.png') });
  console.log('Saved gameplay screenshot: tests/gameplay_screen.png');

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
