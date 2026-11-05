import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 300 * 1024;
const html = readFileSync('dist/index.html', 'utf8');

/** JS initial = scripts et modulepreload référencés par index.html (les chunks à la demande en sont exclus). */
const initial = [...html.matchAll(/(?:src|href)="\/?([^"]+\.js)"/g)].map((match) => match[1]!);
if (initial.length === 0) {
  console.error('Aucun script initial trouvé dans dist/index.html');
  process.exit(1);
}

let total = 0;
for (const file of initial) {
  const size = gzipSync(readFileSync(join('dist', file))).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(8)} Ko gzip  ${file}`);
}
console.log(`JS initial : ${(total / 1024).toFixed(1)} Ko gzip (budget ${BUDGET_BYTES / 1024} Ko)`);

const assets = readdirSync('dist/assets').filter((name) => name.endsWith('.js'));
const everything = assets.reduce((sum, name) => sum + statSync(join('dist/assets', name)).size, 0);
console.log(`Tous les chunks JS (non compressés) : ${(everything / 1024).toFixed(0)} Ko`);

if (total > BUDGET_BYTES) {
  console.error('Budget de JS initial dépassé.');
  process.exit(1);
}
