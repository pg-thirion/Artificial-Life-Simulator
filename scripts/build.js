import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function stripImportsExports(code) {
  // Remove import lines
  let clean = code.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '');
  // Replace export default / export class / export function / export const / export let
  clean = clean.replace(/export\s+default\s+/g, '');
  clean = clean.replace(/export\s+(class|function|const|let|var)\s+/g, '$1 ');
  // Remove named export blocks like export { foo, bar };
  clean = clean.replace(/export\s*\{[\s\S]*?\};?/g, '');
  return clean;
}

const files = [
  'src/math.js',
  'src/spatialGrid.js',
  'src/food.js',
  'src/genome.js',
  'src/creature.js',
  'src/world.js',
  'src/charts.js',
  'src/audio.js'
];

let bundledModules = '/* === BUNDLED SIMULATION CORE (CORS-FREE STANDALONE) === */\n';
for (const file of files) {
  const fullPath = path.join(rootDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  bundledModules += `\n/* --- ${file} --- */\n` + stripImportsExports(content) + '\n';
}

fs.writeFileSync(path.join(rootDir, 'dist_core.js'), bundledModules, 'utf8');
console.log('Successfully bundled simulation core into dist_core.js');
