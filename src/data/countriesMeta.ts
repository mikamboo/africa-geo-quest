import type { CountryInfo } from '../core/types';
import countriesJson from '../../data/countries.json';

/** Métadonnées sans Zod, pour l'accueil : le fichier est validé au build par `pnpm data:validate`. */
export const COUNTRIES_META = countriesJson as unknown as CountryInfo[];
