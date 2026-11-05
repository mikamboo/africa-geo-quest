# Journal des décisions

Format : décision, raison, alternative écartée.

| #   | Décision                                                  | Raison                                                                                                                                       | Alternative écartée                                                                                       |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | TypeScript 6.0 et non 7.0                                 | `typescript-eslint` 8.72 exige `typescript <6.1.0`                                                                                           | TypeScript 7 sans lint typé, contraire à la section 10                                                    |
| 2   | `aidlc/` est exclu via `.git/info/exclude`                | Des hooks globaux de la machine le créent à chaque session. Le prompt interdit ce dossier dans le projet et interdit de modifier `~/.claude` | L'ignorer dans `.gitignore`, ce qui laisserait une trace de cette machine dans le dépôt                   |
| 3   | Nom du jeu : **Tembea** (« marcher, voyager » en swahili) | Court, prononçable en FR et EN, lié à la mécanique centrale. Aucune recherche d'antériorité de marque n'a été faite                          | « Sankofa Trek » : concept akan à forte charge culturelle, plus délicat à utiliser pour un nom de produit |
