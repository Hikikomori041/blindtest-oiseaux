#!/usr/bin/env node
/**
 * Outils d'ajout d'oiseaux au blind-test.
 *
 * Tout le processus tourne autour de tools/new_birds.json (même format que
 * assets/data/birds.json) qui contient le lot d'oiseaux en cours d'ajout.
 *
 *   node tools/oiseaux.js verifier "Nom[:categorie]" ...   1. vérifie les noms (et les ajoute au lot avec --ajouter)
 *   node tools/oiseaux.js collecte [--ouvrir]                2. crée les dossiers birds/ + la page tools/collecte.html
 *   node tools/oiseaux.js fusion [--simulation]              3. fusionne le lot complet dans birds.json
 *   node tools/oiseaux.js audit                              vérifie la cohérence de tout le blind-test
 *
 * Le lien oiseaux.net n'est jamais stocké : il se déduit du nom FR avec slugify(),
 * exactement comme dans l'application (app/js/strings.js).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');

// ─────────────────────────────── Constantes ───────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const BIRDS_JSON = path.join(ROOT, 'assets', 'data', 'birds.json');
const BIRDS_DIR = path.join(ROOT, 'birds');
const NEW_BIRDS_JSON = path.join(__dirname, 'new_birds.json');
const COLLECTE_HTML = path.join(__dirname, 'collecte.html');
const CACHE_PATH = path.join(__dirname, '.cache', 'especes-oiseaux-net.json');
const CACHE_MAX_AGE_DAYS = 30;
const CACHE_VERSION = 2; // à incrémenter si le format du cache change

const ON_BASE = 'https://www.oiseaux.net';
// Listes d'espèces servant de référentiel local (nom FR, latin, anglais, slug)
const ON_LISTES = ['/oiseaux/france.html', '/oiseaux/europe.html'];
const USER_AGENT = 'Mozilla/5.0 (blindtest-oiseaux tools)';

const CATEGORIES = {
  commun: 'Commun',
  eau: 'Eau',
  foret: 'Forêt',
  marin: 'Marin',
  montagne: 'Montagne',
  nocturne: 'Nocturne',
  plaine: 'Plaine',
};

if (process.stdout.setDefaultEncoding) process.stdout.setDefaultEncoding('utf8');

// ─────────────────────────────── Texte ───────────────────────────────

/** Copie exacte de slugify() dans app/js/strings.js — à garder synchronisée. */
function slugify(nomOiseau) {
  return nomOiseau.normalize('NFD')
    .replace("'", ".")
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ /g, '.')
    .replace(/[^a-z0-9.-]/g, '');
}

function remplacerLigatures(s) {
  return String(s)
    .replace(/œ/g, 'oe').replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae');
}

/** Clé de comparaison tolérante : sans accents, casse ni ponctuation. */
function cle(s) {
  return remplacerLigatures(s)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function decodeHtml(s) {
  const entites = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: String.fromCharCode(160) };
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => entites[n.toLowerCase()] ?? m);
}

/**
 * Nom utilisable dans le blind-test à partir du nom oiseaux.net :
 * sans ligatures (œ casse slugify) et avec des apostrophes droites.
 */
function nomPourApp(nomSite) {
  return remplacerLigatures(decodeHtml(nomSite))
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Même tri que l'application (app/js/strings.js)
const collator = new Intl.Collator(['fr-FR', 'fr'], { sensitivity: 'base', ignorePunctuation: true, numeric: true });

function trierParNom(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => collator.compare(a, b)));
}

function normaliserCategorie(s) {
  const c = cle(s);
  return Object.prototype.hasOwnProperty.call(CATEGORIES, c) ? c : null;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Score de ressemblance entre 0 et 1 (fautes de frappe, espaces, mots manquants). */
function ressemblance(saisie, candidat) {
  const a = cle(saisie);
  const b = cle(candidat);
  if (!a || !b) return 0;
  const ratio = (x, y) => 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  const ca = a.replace(/ /g, '');
  const cb = b.replace(/ /g, '');
  let score = Math.max(ratio(a, b), ratio(ca, cb));
  if (cb.includes(ca)) score = Math.max(score, 0.6 + 0.4 * (ca.length / cb.length));
  return score;
}

// ─────────────────────────────── Fichiers ───────────────────────────────

function lireJson(p, defaut) {
  if (!fs.existsSync(p)) return defaut;
  const texte = fs.readFileSync(p, 'utf8').trimStart(); // retire aussi un éventuel BOM
  return texte.trim() ? JSON.parse(texte) : defaut;
}

function ecrireJson(p, data, { newlineFinal = true } = {}) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + (newlineFinal ? '\n' : ''), 'utf8');
}

/**
 * Insère les nouvelles entrées à leur place alphabétique sans réordonner l'existant
 * (l'ordre de référence de birds.json est celui de scripts/trier_json.py).
 */
function insererTrie(obj, ajouts) {
  const entrees = Object.entries(obj);
  for (const [nom, info] of Object.entries(trierParNom(ajouts))) {
    const i = entrees.findIndex(([n]) => collator.compare(n, nom) > 0);
    entrees.splice(i === -1 ? entrees.length : i, 0, [nom, info]);
  }
  return Object.fromEntries(entrees);
}

const lireBirds = () => lireJson(BIRDS_JSON, {});
const lireNewBirds = () => lireJson(NEW_BIRDS_JSON, {});
// birds.json est écrit par scripts/trier_json.py sans retour à la ligne final
const ecrireBirds = (data) => ecrireJson(BIRDS_JSON, data, { newlineFinal: false });
const ecrireNewBirds = (data) => ecrireJson(NEW_BIRDS_JSON, trierParNom(data));

/** État du dossier birds/<nom> : présence, images, sons. */
function etatDossier(nom) {
  const dir = path.join(BIRDS_DIR, nom);
  if (!fs.existsSync(dir)) return { dir, existe: false, images: [], sons: [], imageJpg: false, ok: false };
  const fichiers = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
  const images = fichiers.filter((f) => /\.jpe?g$/i.test(f));
  const sons = fichiers.filter((f) => /\.(mp3|wav)$/i.test(f));
  return {
    dir,
    existe: true,
    images,
    sons,
    imageJpg: fichiers.includes('image.jpg'),
    ok: images.length > 0 && sons.length > 0,
  };
}

// ─────────────────────────────── oiseaux.net ───────────────────────────────

async function telecharger(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  return { status: res.status, texte: res.ok ? await res.text() : '' };
}

/** Référentiel des espèces (listes France + Europe d'oiseaux.net), mis en cache 30 jours. */
async function chargerEspeces({ rafraichir = false } = {}) {
  const cache = lireJson(CACHE_PATH, null);
  const ageJours = cache ? (Date.now() - new Date(cache.date).getTime()) / 86400000 : Infinity;
  if (cache && cache.version === CACHE_VERSION && !rafraichir && ageJours < CACHE_MAX_AGE_DAYS) return cache;

  try {
    const parSlug = new Map();
    // <td><a href=".../oiseaux/slug.html">Nom</a>[<br /><span class="on-liste-v3__synonyme">Synonyme</span>]</td><td><i>Latin</i></td><td>Anglais</td>
    const re = /<td><a href="https:\/\/www\.oiseaux\.net\/oiseaux\/([a-z0-9.-]+)\.html">([^<]+)<\/a>((?:(?!<\/td>).)*)<\/td><td><i>([^<]+)<\/i><\/td><td>([^<]*)<\/td>/g;
    const reSynonyme = /<span class="on-liste-v3__synonyme">([^<]+)<\/span>/g;
    for (const chemin of ON_LISTES) {
      const { status, texte } = await telecharger(ON_BASE + chemin);
      if (status !== 200) throw new Error(`HTTP ${status} sur ${chemin}`);
      for (const m of texte.matchAll(re)) {
        parSlug.set(m[1], {
          slug: m[1],
          nom: decodeHtml(m[2]).trim(),
          synonymes: [...m[3].matchAll(reSynonyme)].map((s) => decodeHtml(s[1]).trim()),
          latin: decodeHtml(m[4]).trim(),
          anglais: decodeHtml(m[5]).trim(),
        });
      }
    }
    if (parSlug.size < 500) {
      throw new Error(`seulement ${parSlug.size} espèces lues : le format des listes oiseaux.net a dû changer`);
    }
    const nouveau = { version: CACHE_VERSION, date: new Date().toISOString(), especes: [...parSlug.values()] };
    ecrireJson(CACHE_PATH, nouveau);
    return nouveau;
  } catch (err) {
    if (cache) {
      console.warn(`⚠ Impossible de rafraîchir la liste oiseaux.net (${err.message}), utilisation du cache du ${cache.date.slice(0, 10)}.`);
      return cache;
    }
    throw new Error(`Impossible de récupérer la liste des espèces sur oiseaux.net : ${err.message}`);
  }
}

/** Lit une fiche oiseaux.net. Renvoie null si la page n'existe pas. */
async function lireFiche(slug) {
  if (!slug) return null;
  const { status, texte } = await telecharger(`${ON_BASE}/oiseaux/${slug}.html`);
  if (status === 404) return null;
  if (status !== 200) throw new Error(`HTTP ${status} sur la fiche ${slug}`);
  const titre = decodeHtml((texte.match(/<title>([^<]*)<\/title>/) || [])[1] || '');
  const parts = titre.split(' - ').map((p) => p.trim());
  if (parts.length < 3) return null;
  return { slug, nom: parts[0], synonymes: [], latin: parts[1], anglais: '' };
}

/** Recherche plein texte du site (rattrape les noms usuels, ex. « chouette effraie »). */
async function rechercherSurSite(q) {
  const { status, texte } = await telecharger(`${ON_BASE}/search/?q=${encodeURIComponent(q)}`);
  if (status !== 200) return [];
  const re = /<h3 class="sr-title"><a href="https:\/\/www\.oiseaux\.net\/oiseaux\/([a-z0-9.-]+)\.html">([^<]+)<\/a>/g;
  return [...texte.matchAll(re)]
    .filter((m) => !['france', 'europe'].includes(m[1]))
    .map((m) => ({ slug: m[1], nom: decodeHtml(m[2]).trim() }));
}

const lienFiche = (nom) => `${ON_BASE}/oiseaux/${slugify(nom)}.html`;
const lienXenoCanto = (latin) => `https://xeno-canto.org/explore?query=${latin.trim().replace(/\s+/g, '+')}&pg=1`;

// ─────────────────────────────── Commande : verifier ───────────────────────────────

/** Cherche un oiseau déjà connu (blind-test ou lot en cours) par nom, slug ou nom latin. */
function chercherExistant(index, { nom, latin }) {
  const k = nom ? cle(nom) : null;
  const s = nom ? slugify(nom) : null;
  const l = latin ? cle(latin) : null;
  for (const [source, data] of index) {
    for (const [n, info] of Object.entries(data)) {
      if ((k && (cle(n) === k || slugify(n) === s)) || (l && cle(info.nom_latin || '') === l)) {
        return { source, nom: n, info };
      }
    }
  }
  return null;
}

const nomsDe = (e) => [e.nom, ...(e.synonymes || []), e.latin, e.anglais].filter(Boolean);

async function resoudre(saisie, referentiel) {
  const k = cle(saisie);
  const s = slugify(saisie);
  const especes = referentiel.especes;

  // 1. Correspondance exacte (accents/casse/ponctuation ignorés) sur nom FR, synonymes, latin ou anglais
  const exact = especes.find((e) => e.slug === s || nomsDe(e).some((n) => cle(n) === k));
  if (exact) return { espece: exact };

  // 2. Fiche directe (espèces hors France/Europe)
  const fiche = await lireFiche(s);
  if (fiche) return { espece: fiche };

  // 3. Suggestions : ressemblance locale + recherche du site
  const scores = especes
    .map((e) => ({ e, score: Math.max(...nomsDe(e).map((n) => ressemblance(saisie, n))) }))
    .filter((x) => x.score >= 0.55)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const suggestions = scores.map((x) => x.e);

  if (!scores.length || scores[0].score < 0.85) {
    for (const r of (await rechercherSurSite(saisie)).slice(0, 3)) {
      if (suggestions.some((e) => e.slug === r.slug)) continue;
      const e = especes.find((x) => x.slug === r.slug) || (await lireFiche(r.slug));
      if (e) suggestions.push(e);
    }
  }
  return { suggestions };
}

function parserSaisie(brut, typeParDefaut) {
  let nom = brut.trim();
  let type = typeParDefaut;
  const i = nom.lastIndexOf(':');
  if (i > 0) {
    const cat = normaliserCategorie(nom.slice(i + 1));
    if (!cat) throw new Error(`Catégorie inconnue dans « ${brut} ». Catégories : ${Object.keys(CATEGORIES).join(', ')}`);
    type = cat;
    nom = nom.slice(0, i).trim();
  }
  return { brut, nom, type };
}

async function cmdVerifier(args, opts) {
  if (!args.length) {
    throw new Error('Donne au moins un nom : node tools/oiseaux.js verifier "Tétras lyre:montagne" "Gobemouche gris"');
  }
  let typeParDefaut = null;
  if (opts.type) {
    typeParDefaut = normaliserCategorie(opts.type);
    if (!typeParDefaut) throw new Error(`Catégorie inconnue : ${opts.type}`);
  }
  const saisies = args.map((a) => parserSaisie(a, typeParDefaut));

  const birds = lireBirds();
  const newBirds = lireNewBirds();
  const index = [['blind-test', birds], ['lot en cours', newBirds]];
  let referentiel = await chargerEspeces({ rafraichir: opts.rafraichir });
  let listeRafraichie = Boolean(opts.rafraichir);

  console.log(`Vérification de ${saisies.length} oiseau(x) — référentiel oiseaux.net : ${referentiel.especes.length} espèces (${referentiel.date.slice(0, 10)})\n`);

  const aAjouter = {};
  const bilan = { nouveaux: 0, presents: 0, aPreciser: 0, introuvables: 0, sansCategorie: 0 };

  for (const { brut, nom, type } of saisies) {
    // Déjà connu sous ce nom exact ? (pas besoin d'aller sur internet)
    const connu = chercherExistant(index, { nom });
    if (connu) {
      bilan.presents++;
      console.log(`= DÉJÀ PRÉSENT   ${connu.nom} — ${connu.info.nom_latin} — ${connu.info.type}  [${connu.source}]`);
      continue;
    }

    let { espece, suggestions } = await resoudre(nom, referentiel);

    // Le cache ne sert qu'à trouver l'espèce : nom et latin sont repris de la fiche en ligne.
    // Si la fiche a disparu (espèce renommée depuis la mise en cache), on recharge la liste une fois.
    if (espece) {
      let fiche = await lireFiche(espece.slug);
      if (!fiche && !listeRafraichie) {
        console.log(`  (fiche ${espece.slug} introuvable, rechargement de la liste oiseaux.net…)`);
        referentiel = await chargerEspeces({ rafraichir: true });
        listeRafraichie = true;
        ({ espece, suggestions } = await resoudre(nom, referentiel));
        fiche = espece ? await lireFiche(espece.slug) : null;
      }
      if (espece && fiche) {
        espece = { ...espece, nom: fiche.nom, latin: fiche.latin };
      } else if (espece) {
        espece = null;
        suggestions = [];
      }
    }

    if (!espece) {
      if (suggestions.length) {
        bilan.aPreciser++;
        console.log(`? À PRÉCISER     « ${brut} » n'existe pas tel quel sur oiseaux.net. Suggestions :`);
        for (const e of suggestions) {
          const dejaLa = chercherExistant(index, { nom: nomPourApp(e.nom), latin: e.latin });
          const note = dejaLa ? `  (déjà présent : ${dejaLa.nom} [${dejaLa.source}])` : '';
          console.log(`                   - ${nomPourApp(e.nom)} — ${e.latin}${note}`);
        }
      } else {
        bilan.introuvables++;
        console.log(`✗ INTROUVABLE    « ${brut} » : aucune espèce correspondante sur oiseaux.net`);
      }
      continue;
    }

    // Nom à utiliser : celui d'oiseaux.net, sauf si la saisie ne diffère que par la casse
    let nomFinal = nomPourApp(espece.nom);
    if (nom.toLowerCase() === nomFinal.toLowerCase()) nomFinal = nom.charAt(0).toUpperCase() + nom.slice(1);

    const doublon = chercherExistant(index, { nom: nomFinal, latin: espece.latin });
    if (doublon) {
      bilan.presents++;
      console.log(`= DÉJÀ PRÉSENT   ${doublon.nom} — ${doublon.info.nom_latin} — ${doublon.info.type}  [${doublon.source}] (saisi : « ${brut} »)`);
      continue;
    }

    const avertissements = [];
    if (nomFinal.toLowerCase() !== nom.toLowerCase()) avertissements.push(`orthographe corrigée (saisi : « ${nom} »)`);
    if (slugify(nomFinal) !== espece.slug) {
      avertissements.push(`ATTENTION le lien généré par l'appli (${slugify(nomFinal)}) ≠ fiche oiseaux.net (${espece.slug})`);
    }
    avertissements.push(lienFiche(nomFinal));

    if (!type) {
      bilan.sansCategorie++;
      console.log(`! CATÉGORIE ?    ${nomFinal} — ${espece.latin} — catégorie à préciser (${Object.keys(CATEGORIES).join(', ')})`);
    } else {
      bilan.nouveaux++;
      aAjouter[nomFinal] = { type, nom_latin: espece.latin };
      console.log(`+ NOUVEAU        ${nomFinal} — ${espece.latin} — ${type}`);
    }
    for (const a of avertissements) console.log(`                  ${a}`);
  }

  console.log(`\nBilan : ${bilan.nouveaux} nouveau(x), ${bilan.presents} déjà présent(s), ${bilan.aPreciser} à préciser, ${bilan.sansCategorie} sans catégorie, ${bilan.introuvables} introuvable(s)`);

  if (!Object.keys(aAjouter).length) return;
  if (opts.ajouter) {
    ecrireNewBirds({ ...newBirds, ...aAjouter });
    console.log(`\n✔ ${Object.keys(aAjouter).length} oiseau(x) ajouté(s) à ${path.relative(ROOT, NEW_BIRDS_JSON)}. Étape suivante : npm run birds:collect`);
  } else {
    console.log('\nLignes prêtes (relancer avec --ajouter pour les écrire dans tools/new_birds.json) :');
    console.log(JSON.stringify(aAjouter, null, 2));
  }
}

// ─────────────────────────────── Commande : collecte ───────────────────────────────

function genererHtml(newBirds) {
  const entrees = Object.entries(newBirds).map(([nom, info]) => ({ nom, ...info, etat: etatDossier(nom) }));
  const complets = entrees.filter((e) => e.etat.ok).length;

  const sections = Object.entries(CATEGORIES).map(([type, label]) => {
    const oiseaux = entrees.filter((e) => e.type === type).sort((a, b) => collator.compare(a.nom, b.nom));
    if (!oiseaux.length) return '';
    const lignes = oiseaux.map((o) => {
      const nbImg = o.etat.images.length;
      const nbSons = o.etat.sons.length;
      return `
          <tr class="${o.etat.ok ? 'done' : ''}">
            <td><strong>${escapeHtml(o.nom)}</strong></td>
            <td class="latin">${escapeHtml(o.nom_latin)}</td>
            <td><div class="links">
              <a href="${escapeHtml(lienFiche(o.nom))}" target="_blank" rel="noopener">Fiche oiseaux.net</a>
              <a href="${escapeHtml(lienXenoCanto(o.nom_latin))}" target="_blank" rel="noopener">Sons xeno-canto</a>
              <a href="${escapeHtml(pathToFileURL(o.etat.dir).href)}">Dossier</a>
            </div></td>
            <td class="state ${nbImg ? 'ok' : 'ko'}">${nbImg ? '✓' : '✗'}${nbImg > 1 ? ` (${nbImg})` : ''}</td>
            <td class="state ${nbSons ? 'ok' : 'ko'}">${nbSons}</td>
          </tr>`;
    }).join('');
    return `
      <section>
        <h2>${label} <span class="count">${oiseaux.length}</span></h2>
        <table>
          <thead><tr><th>Nom</th><th>Nom latin</th><th>Liens</th><th>Image</th><th>Sons</th></tr></thead>
          <tbody>${lignes}
          </tbody>
        </table>
      </section>`;
  }).join('');

  const date = new Date().toLocaleString('fr-FR');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Collecte oiseaux</title>
<style>
  :root {
    --bg: #f3f6f4; --card: #fff; --text: #1f2a24; --muted: #5d6b63; --accent: #1f5e46;
    --border: #d8e2dc; --soft: #f7fbf8; --done: #eef8f2; --ok: #2b8a5b; --ko: #b4442f;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #141a17; --card: #1c2420; --text: #e3ebe6; --muted: #9aaba1; --accent: #8fd1b0;
      --border: #2e3a34; --soft: #212b26; --done: #1d2d25; --ok: #6fcf9a; --ko: #f08a72;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--text); font-family: "Segoe UI", system-ui, sans-serif; }
  .container { max-width: 1100px; margin: 0 auto; background: var(--card); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
  header { padding: 18px 22px; border-bottom: 1px solid var(--border); background: var(--soft); }
  h1 { margin: 0 0 6px; font-size: 1.35rem; }
  .subtitle { margin: 0; color: var(--muted); line-height: 1.5; }
  .progress { margin-top: 10px; font-weight: 600; }
  .content { padding: 16px; display: grid; gap: 14px; }
  section { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  h2 { margin: 0; padding: 9px 14px; font-size: 1rem; background: var(--soft); border-bottom: 1px solid var(--border); }
  .count { color: var(--muted); font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 9px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; font-size: 0.95rem; }
  tr:last-child td { border-bottom: none; }
  th { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
  tr.done td { background: var(--done); }
  .latin { font-style: italic; color: var(--muted); }
  .links { display: flex; gap: 12px; flex-wrap: wrap; }
  a { color: var(--accent); text-decoration: none; border-bottom: 1px dashed currentColor; }
  .state { text-align: center; font-weight: 600; width: 70px; }
  .ok { color: var(--ok); } .ko { color: var(--ko); }
  .empty { padding: 24px; color: var(--muted); }
  code { background: var(--soft); padding: 1px 5px; border-radius: 4px; }
  @media (max-width: 760px) { th, td { padding: 7px; } .links { flex-direction: column; gap: 4px; } }
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>Oiseaux à ajouter</h1>
    <p class="subtitle">Généré depuis <code>tools/new_birds.json</code> le ${escapeHtml(date)}. Ajoute une image (.jpg) et des sons (.mp3/.wav) dans chaque dossier, puis relance <code>npm run birds:collect</code> pour rafraîchir l'état. Quand tout est vert : <code>npm run birds:merge</code>.</p>
    <div class="progress">${complets} / ${entrees.length} oiseau(x) complet(s)</div>
  </header>
  <div class="content">${sections || '<p class="empty">Aucun oiseau en cours d\'ajout.</p>'}
  </div>
</div>
</body>
</html>
`;
}

function ouvrir(fichier) {
  const [cmd, args] = process.platform === 'win32'
    ? ['explorer', [fichier]]
    : [process.platform === 'darwin' ? 'open' : 'xdg-open', [fichier]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

async function cmdCollecte(_args, opts) {
  const newBirds = lireNewBirds();
  const noms = Object.keys(newBirds).sort(collator.compare);
  if (!noms.length) {
    console.log('Aucun oiseau dans tools/new_birds.json. Commence par : node tools/oiseaux.js verifier "Nom:categorie" --ajouter');
  }

  for (const nom of noms) {
    let etat = etatDossier(nom);
    if (!etat.existe) {
      fs.mkdirSync(etat.dir, { recursive: true });
      etat = etatDossier(nom);
      console.log(`+ dossier créé   birds/${nom}`);
    }
    const img = etat.images.length ? `image ✓${etat.images.length > 1 ? ` (${etat.images.length})` : ''}` : 'image ✗';
    console.log(`${etat.ok ? '✔' : '…'} ${nom.padEnd(32)} ${img.padEnd(12)} sons: ${etat.sons.length}`);
  }

  fs.writeFileSync(COLLECTE_HTML, genererHtml(newBirds), 'utf8');
  console.log(`\nPage de collecte : ${COLLECTE_HTML}`);
  if (opts.ouvrir) ouvrir(COLLECTE_HTML);
}

// ─────────────────────────────── Commande : fusion ───────────────────────────────

async function cmdFusion(_args, opts) {
  const newBirds = lireNewBirds();
  const noms = Object.keys(newBirds);
  if (!noms.length) {
    console.log('Rien à fusionner : tools/new_birds.json est vide.');
    return;
  }
  const birds = lireBirds();

  const prets = [];
  const problemes = [];
  for (const nom of noms) {
    const info = newBirds[nom];
    const etat = etatDossier(nom);
    const erreurs = [];
    if (birds[nom]) erreurs.push('déjà dans birds.json');
    if (!normaliserCategorie(info.type || '')) erreurs.push(`catégorie invalide (${info.type})`);
    if (!info.nom_latin) erreurs.push('nom latin manquant');
    if (!etat.existe) erreurs.push('dossier absent');
    else {
      if (!etat.images.length) erreurs.push('aucune image .jpg');
      if (etat.images.length > 1 && !etat.imageJpg) erreurs.push(`plusieurs images (${etat.images.join(', ')}), garder une seule`);
      if (!etat.sons.length) erreurs.push('aucun son .mp3/.wav');
    }
    if (erreurs.length) problemes.push({ nom, erreurs });
    else prets.push(nom);
  }

  for (const nom of prets) console.log(`✔ ${nom}`);
  for (const p of problemes) console.log(`✗ ${p.nom} : ${p.erreurs.join(', ')}`);

  if (problemes.length && !opts.partiel) {
    console.error(`\nFusion annulée : ${problemes.length} oiseau(x) incomplet(s). Complète-les, ou relance avec --partiel pour fusionner uniquement les oiseaux prêts.`);
    process.exitCode = 1;
    return;
  }
  if (!prets.length) {
    console.log('\nAucun oiseau prêt à fusionner.');
    return;
  }
  if (opts.simulation) {
    console.log(`\n(simulation) ${prets.length} oiseau(x) seraient ajoutés à birds.json.`);
    return;
  }

  const restants = { ...newBirds };
  const ajouts = {};
  for (const nom of prets) {
    ajouts[nom] = { type: newBirds[nom].type, nom_latin: newBirds[nom].nom_latin };
    delete restants[nom];
  }
  const fusionne = insererTrie(birds, ajouts);
  ecrireBirds(fusionne);
  ecrireNewBirds(restants);
  console.log(`\n✔ ${prets.length} oiseau(x) ajouté(s) à assets/data/birds.json (${Object.keys(fusionne).length} oiseaux au total).`);
  if (Object.keys(restants).length) console.log(`  ${Object.keys(restants).length} oiseau(x) restent dans tools/new_birds.json.`);
}

// ─────────────────────────────── Commande : audit ───────────────────────────────

async function cmdAudit() {
  const birds = lireBirds();
  const newBirds = lireNewBirds();
  // L'audit compare au site actuel : toujours repartir d'une liste fraîche (2 requêtes)
  const referentiel = await chargerEspeces({ rafraichir: true });
  const parSlug = new Map(referentiel.especes.map((e) => [e.slug, e]));
  const rubriques = {
    'Lien oiseaux.net cassé': [],
    'Nom latin différent d\'oiseaux.net': [],
    'Nom écrit différemment sur oiseaux.net': [],
    'Catégorie invalide': [],
    'Nom latin en double': [],
    'Dossier incomplet': [],
    'Majuscules différentes entre birds.json et le dossier': [],
    'Dossier sans entrée dans birds.json': [],
  };

  const latins = new Map();
  for (const [nom, info] of Object.entries(birds)) {
    if (!normaliserCategorie(info.type || '') || info.type !== cle(info.type)) {
      rubriques['Catégorie invalide'].push(`${nom} : « ${info.type} »`);
    }

    const kl = cle(info.nom_latin || '');
    if (latins.has(kl)) rubriques['Nom latin en double'].push(`${nom} et ${latins.get(kl)} : ${info.nom_latin}`);
    latins.set(kl, nom);

    const slug = slugify(nom);
    const espece = parSlug.get(slug) || (await lireFiche(slug));
    if (!espece) {
      rubriques['Lien oiseaux.net cassé'].push(`${nom} → ${lienFiche(nom)}`);
    } else {
      if (cle(espece.latin) !== cle(info.nom_latin || '')) {
        rubriques['Nom latin différent d\'oiseaux.net'].push(`${nom} : ${info.nom_latin} ≠ ${espece.latin} (oiseaux.net)`);
      }
      const nomSite = nomPourApp(espece.nom);
      if (nomSite !== nom) rubriques['Nom écrit différemment sur oiseaux.net'].push(`${nom} ≠ ${nomSite}`);
    }

    const etat = etatDossier(nom);
    const manques = [];
    if (!etat.existe) manques.push('dossier absent');
    else {
      if (!etat.imageJpg) manques.push('pas de image.jpg');
      if (!etat.sons.some((f) => f.endsWith('.mp3'))) manques.push('aucun .mp3');
    }
    if (manques.length) rubriques['Dossier incomplet'].push(`${nom} : ${manques.join(', ')}`);
  }

  if (fs.existsSync(BIRDS_DIR)) {
    const connus = new Map([...Object.keys(birds), ...Object.keys(newBirds)].map((n) => [n.toLowerCase(), n]));
    for (const d of fs.readdirSync(BIRDS_DIR, { withFileTypes: true })) {
      if (!d.isDirectory() || birds[d.name] || newBirds[d.name]) continue;
      const proche = connus.get(d.name.toLowerCase());
      if (proche) rubriques['Majuscules différentes entre birds.json et le dossier'].push(`« ${proche} » ≠ dossier « ${d.name} »`);
      else rubriques['Dossier sans entrée dans birds.json'].push(d.name);
    }
  }

  let total = 0;
  for (const [titre, items] of Object.entries(rubriques)) {
    if (!items.length) continue;
    total += items.length;
    console.log(`\n${titre} (${items.length})`);
    for (const i of items) console.log(`  - ${i}`);
  }
  const enCours = Object.keys(newBirds).length;
  console.log(`\n${Object.keys(birds).length} oiseaux audités, ${total} remarque(s).${enCours ? ` ${enCours} oiseau(x) en cours d'ajout dans tools/new_birds.json.` : ''}`);
}

// ─────────────────────────────── CLI ───────────────────────────────

const AIDE = `Outils d'ajout d'oiseaux au blind-test (lot en cours : tools/new_birds.json)

  node tools/oiseaux.js verifier "Nom[:categorie]" ... [--type <categorie>] [--ajouter]
      Dit si chaque oiseau est déjà dans le blind-test, sinon trouve son orthographe
      oiseaux.net et son nom latin. --ajouter écrit les nouveaux dans tools/new_birds.json.
      --type applique une catégorie aux noms qui n'en précisent pas.

  node tools/oiseaux.js collecte [--ouvrir]
      Crée les dossiers birds/<Nom> et génère tools/collecte.html (liens + état des fichiers).

  node tools/oiseaux.js fusion [--simulation] [--partiel]
      Vérifie que chaque oiseau du lot a une image et des sons, puis l'ajoute à birds.json
      et le retire du lot. --partiel fusionne seulement les oiseaux prêts.

  node tools/oiseaux.js audit
      Vérifie tout birds.json : liens oiseaux.net, noms latins, catégories, dossiers.

  Options communes : --rafraichir (recharge la liste des espèces oiseaux.net)
  Catégories : ${Object.keys(CATEGORIES).join(', ')}`;

const COMMANDES = { verifier: cmdVerifier, collecte: cmdCollecte, fusion: cmdFusion, audit: cmdAudit };

async function main() {
  const [commande, ...reste] = process.argv.slice(2);
  const args = [];
  const opts = {};
  for (let i = 0; i < reste.length; i++) {
    const a = reste[i];
    if (a === '--type') opts.type = reste[++i];
    else if (a.startsWith('--type=')) opts.type = a.slice(7);
    else if (a.startsWith('--')) opts[a.slice(2)] = true;
    else args.push(a);
  }

  const fn = COMMANDES[commande];
  if (!fn) {
    console.log(AIDE);
    if (commande && !['aide', 'help', '--help', '-h'].includes(commande)) process.exitCode = 1;
    return;
  }
  await fn(args, opts);
}

main().catch((err) => {
  console.error(`Erreur : ${err.message}`);
  process.exitCode = 1;
});
