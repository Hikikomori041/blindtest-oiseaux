// Lance un script Python avec le premier interpréteur disponible (py -3, python, python3),
// pour que les scripts npm marchent sur toutes les machines (Windows avec ou sans lanceur py, Mac).
// Usage : node scripts/run-python.js <script.py> [args...]
const { spawnSync } = require('child_process');

const CANDIDATS = [['py', ['-3']], ['python', []], ['python3', []]];

function trouverPython() {
  for (const [cmd, prefixe] of CANDIDATS) {
    const r = spawnSync(cmd, [...prefixe, '--version'], { stdio: 'ignore' });
    if (r.status === 0) return [cmd, prefixe];
  }
  return null;
}

const [script, ...args] = process.argv.slice(2);
if (!script) {
  console.error('Usage : node scripts/run-python.js <script.py> [args...]');
  process.exit(1);
}

const python = trouverPython();
if (!python) {
  console.error('Python introuvable (essayé : py, python, python3).');
  process.exit(1);
}

const [cmd, prefixe] = python;
const r = spawnSync(cmd, [...prefixe, script, ...args], {
  stdio: 'inherit',
  env: { ...process.env, PYTHONUTF8: '1' },
});
process.exit(r.status ?? 1);
