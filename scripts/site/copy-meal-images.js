// scripts/site/copy-meal-images.js
// Run in your APP repo (where the images live):  node scripts/site/copy-meal-images.js
//
// Copies every image from src/assets/meals/ to the json.fit site's images/meals/
// folder, renaming each to the SAME web-safe name the meal page asks for.
// You don't rename anything by hand — this is the one step that makes the
// images line up with what r/index.html requests.

const fs = require('fs');
const path = require('path');

// --- EDIT THESE TWO PATHS to match your setup ---
const SRC  = path.resolve(__dirname, '../../src/assets/meals');               // app bundle images
const DEST = path.resolve(__dirname, '../../../json.fit-site/images/meals');  // site folder served at json.fit/images/meals/
//   If json.fit is the SAME repo (Pages from /docs):  DEST = path.resolve(__dirname, '../../docs/images/meals')

// --- This MUST stay identical to slugifyImage() inside r/index.html, or names won't match ---
function slugifyImage(filename) {
  if (!filename) return '';
  const ext = (filename.match(/\.(png|jpe?g|webp)$/i) || ['', 'png'])[1].toLowerCase();
  const base = filename.replace(/\.(png|jpe?g|webp)$/i, '');
  const slug = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents (Ćevapi -> Cevapi)
    .replace(/[^\w\s-]/g, '')          // drop emoji, &, (), etc.
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return `${slug}.${ext}`;
}

fs.mkdirSync(DEST, { recursive: true });

const files = fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
let copied = 0;
const collisions = {};

for (const f of files) {
  const out = slugifyImage(f);
  if (collisions[out]) {
    console.warn(`!! NAME COLLISION: "${f}" and "${collisions[out]}" both slugify to "${out}" — one will overwrite the other.`);
  }
  collisions[out] = f;
  fs.copyFileSync(path.join(SRC, f), path.join(DEST, out));
  if (f !== out) console.log(`${f}  ->  ${out}`);
  copied++;
}

console.log(`\nCopied ${copied} images to ${DEST}`);