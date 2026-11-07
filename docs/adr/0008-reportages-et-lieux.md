# ADR 0008 : reportages et lieux à l'intérieur

**Statut :** accepté.

## Contexte

Marcher sur la carte et recevoir une fiche restait trop basique. Le propriétaire veut pouvoir entrer dans un lieu, avec un vrai changement de contexte, et supprimer les clichés.

## Décision

- **Boucle :** un reportage donne un indice géographique, le joueur marche jusqu'à la ville, entre, parle, répond, reçoit l'indice suivant. La géographie sert à avancer.
- **Lieux :** toute ville ou tout monument s'ouvre sur un intérieur en grille, avec collisions, personnes, panneau et carte murale. La carte du monde disparaît.
- **Données plutôt que code :** dialogues en graphes (`core/dialogue.ts`), plans de pièces en texte (`core/rooms.ts`), reportages en JSON. Des tests vérifient qu'aucun dialogue n'a d'impasse et que tout point d'action est atteignable.
- **Sauvegarde v2 :** migration depuis la v1, sans perte de progression.
- **Accessibilité :** en mode sans déplacement, les actions d'un lieu sont une simple liste.

## Conséquences

- Le contenu narratif doit être sourcé et relu : voir `docs/REVIEW_FACTS.md` et `docs/CHARTE_EDITORIALE.md`.
- `pixi.js` gère deux scènes dans la même application.

## Alternatives écartées

- **Ink ou Yarn Spinner :** puissants, mais trop pour des dialogues courts. Un graphe de données et un petit moteur suffisent, sans langage à maintenir.
- **Une seule scène par pays :** 54 décors à concevoir. Huit genres de lieux suffisent, habités par un contenu propre à chaque ville.

## Sécurité

Aucun flux réseau nouveau. Reportages et faits sont validés au chargement.
