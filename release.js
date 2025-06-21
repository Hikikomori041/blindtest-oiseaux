const { execSync } = require('child_process');
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('./package.json'));
const version = pkg.version;

const tag = `v${version}`;

try {
  console.log(`📦 Version actuelle : ${version}`);
  console.log(`📦 Tag à créer : ${tag}`);

  // Vérifie si le tag existe déjà
  const existingTags = execSync('git tag').toString().split('\n').map(t => t.trim());
  if (existingTags.includes(tag)) {
    console.error(`❌ Le tag ${tag} existe déjà !`);
    process.exit(1);
  }

  console.log(`🚀 Création et push du tag ${tag}...`);
  execSync(`git tag ${tag}`, { stdio: 'inherit' });
  execSync(`git push origin ${tag}`, { stdio: 'inherit' });

  console.log(`✅ Release ${tag} déclenchée sur GitHub !`);
} catch (err) {
  console.error(`❌ Une erreur est survenue :`, err);
  process.exit(1);
}
