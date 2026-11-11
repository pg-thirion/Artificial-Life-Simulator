# Task 10 Brief: Playwright CLI E2E Suite & Full Verification

## Requirements
Update `tests/review_game.js` to verify all new Neural Evolution expansion features in a real headless Chromium browser via Playwright, and run both `npm run review` and `npm test`.

### E2E Checks to Add in `tests/review_game.js`
1. **Check 12: Live Neural Network Brain & Visualizer in Inspector**:
   - Select an organism (`window.alsSelectCreature(window.alsWorld.creatures[0])`).
   - Verify `#insp-brain-canvas` exists and has non-zero dimensions (`width === 268`, `height === 165`).
   - Verify `#insp-brain-type` badge text (`NEURAL (124 syn)` or `HEURISTIC (Rule)`).
   - Click `#insp-brain-type` to toggle between Neural and Heuristic brain modes and verify the UI updates accordingly, then click again to restore `'neural'`.
   - Verify `c.brain.weights.length === 124` and `c.brain.activations.output.length === 4`.

2. **Check 13: Dynamic Chromatophores & Aposematic Mimicry**:
   - Via `page.evaluate()`, verify organisms expose `chromatophoreColor`, `effectiveColorCss`, and `aposematicWarningLevel`, and verify a high-armor/bravery organism computes `aposematicWarningLevel > 0.35`.

3. **Check 14: Symbiosis Mutualism & Parasitic Leeches**:
   - Via `page.evaluate()`, test `attachToHost` and `groomParasite` on live `Creature` instances in the browser runtime.

4. **Check 15: Multicellular Colony Coordinator**:
   - Via `page.evaluate()`, spawn two colliding high-adhesion conspecifics in `window.alsWorld`, step `window.alsWorld.update(0.05)`, and verify a `Colony` is formed in `window.alsWorld.colonies` with differentiated roles (`mouth`, `motor`).

5. **Check 16: Species Arena Battle Royale Tournament Mode**:
   - Click `#btn-arena-mode`.
   - Verify `#arena-hud` has `.open` class and `window.alsArena.isActive === true`.
   - Verify `#arena-leaderboard` renders 4 competing clades.
   - Click `#btn-arena-rematch` and verify tournament restarts cleanly.
   - Click `#btn-arena-exit` and verify `#arena-hud` closes and sandbox state is restored (`window.alsArena.isActive === false`).

6. **Check 17: Cloudflare Pages Production Bundle (`dist/index.html`)**:
   - Navigate to `dist/index.html` (`file:///` URL), wait 500ms, verify `0` console errors, `0` uncaught page errors, and active organism population (`#stat-creatures > 0`).

### Verification Commands
- `npm run review` -> 100% pass with 0 console/page errors.
- `npm test` -> 100% pass.
