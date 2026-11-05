/** Corrige les graphies de Natural Earth quand elles s'écartent de l'usage courant. */
export const CITY_NAME_FIXES: Record<string, string> = {
  'El Giza': 'Giza',
  'Bur Sudan': 'Port Sudan',
  Banghazi: 'Benghazi',
  Tubruq: 'Tobruk',
  Nzérékoré: "N'Zérékoré",
  Loubomo: 'Dolisie',
  'Ali Sabih': 'Ali Sabieh',
  Nazret: 'Adama',
  Ruhengeri: 'Musanze',
  Gitarama: 'Muhanga',
  Kismaayo: 'Kismayo',
  'Mohales Hoek': "Mohale's Hoek",
  'Piggs Peak': "Pigg's Peak",
  'Bobo Dioulasso': 'Bobo-Dioulasso',
  Fez: 'Fes',
};

/** Exonymes français des villes dont le nom change. Les autres gardent leur nom réel. */
export const CITY_NAME_TRANSLATIONS: Record<string, string> = {
  Alexandria: 'Alexandrie',
  Giza: 'Gizeh',
  Omdurman: 'Omdourman',
  'Port Sudan': 'Port-Soudan',
  Tangier: 'Tanger',
  Marrakesh: 'Marrakech',
  Johannesburg: 'Johannesbourg',
  Fes: 'Fès',
  Tobruk: 'Tobrouk',
};

/** Natural Earth rattache Saint-Louis à la Mauritanie ; la ville est sénégalaise. */
export const CITY_COUNTRY_FIXES: Record<string, string> = {
  'Saint-Louis': 'SEN',
};

/** Banlieues de grandes villes ou lieux trop mineurs pour être pédagogiques. */
export const CITY_EXCLUDED = ['Benoni', 'Matola', 'Chitungwiza', 'Kayes'];
