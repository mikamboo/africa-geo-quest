import { geoFilesBytes, runChecks } from './checks';

const errors = runChecks();
console.log(`Données géographiques : ${(geoFilesBytes() / 1024).toFixed(0)} Ko (budget 500 Ko)`);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Validation des données réussie.');
