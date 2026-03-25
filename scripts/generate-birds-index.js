const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const birdsRoot = path.join(repoRoot, 'birds');
const outPath = path.join(repoRoot, 'assets', 'data', 'birds-index.json');
const baseUrl = 'https://github.com/Hikikomori041/blindtest-oiseaux/raw/refs/heads/main/';

function toPosixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function collectFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }

    const stat = fs.statSync(fullPath);
    const relative = toPosixPath(path.relative(repoRoot, fullPath));
    files.push({
      path: relative,
      size: stat.size,
      sha256: sha256File(fullPath)
    });
  }

  return files;
}

function loadExistingIndex(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function normalizedPayload(payload) {
  return {
    baseUrl: payload.baseUrl,
    files: payload.files
  };
}

function main() {
  if (!fs.existsSync(birdsRoot)) {
    throw new Error(`Dossier birds introuvable: ${birdsRoot}`);
  }

  const files = collectFiles(birdsRoot).sort((a, b) => a.path.localeCompare(b.path));
  const payload = {
    version: new Date().toISOString(),
    generatedAt: new Date().toISOString(),
    baseUrl,
    files
  };

  const existing = loadExistingIndex(outPath);
  if (existing) {
    const unchanged = JSON.stringify(normalizedPayload(existing)) === JSON.stringify(normalizedPayload(payload));
    if (unchanged) {
      console.log(`birds-index inchange (hors metadonnees): ${outPath}`);
      return;
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`birds-index genere: ${outPath} (${files.length} fichiers)`);
}

main();