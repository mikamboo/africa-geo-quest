# ADR 0005 : couches et persistance

**Statut :** accepté.

## Contexte

Un backend doit pouvoir arriver plus tard (classement, mode enseignant) sans réécrire la logique. Les données locales d'un enfant peuvent être corrompues ou issues d'une ancienne version.

## Décision

- `core/` est pur et testable sous Node. Une règle ESLint lui interdit PixiJS, React, le DOM et les couches supérieures.
- `core/` définit les interfaces `ProgressRepository` et `ScoreRepository`. `data/` les implémente sur `localStorage`.
- Chaque sauvegarde porte un numéro de version et passe par un schéma Zod au chargement. Si la validation échoue, les données sont écartées, le jeu repart proprement et le joueur reçoit un message neutre.

## Conséquences

- Un backend se branche en écrivant un nouveau repository.
- Une évolution de schéma impose d'écrire une migration ou d'assumer la réinitialisation.

## Alternatives écartées

- **Zustand `persist` direct :** pratique, mais il lie le format au store et complique la validation.
- **IndexedDB :** asynchrone et plus lourd pour quelques kilo-octets.

## Sécurité

Les données lues dans `localStorage` sont traitées comme non fiables : validation Zod à chaque chargement.
