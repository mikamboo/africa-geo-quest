# ADR 0001 : PixiJS v8 comme moteur de rendu

**Statut :** accepté.

## Contexte

Le jeu affiche une grande carte vectorielle, un personnage et des étiquettes. La logique reste dans `core/`, et le moteur doit se charger à la demande pour tenir le budget de JS initial.

## Décision

PixiJS v8, importé dynamiquement avec `pixi.js/unsafe-eval` pour la CSP.

## Conséquences

- Il faut écrire nous-mêmes la caméra et la boucle, ce qui reste court.
- Le moteur ne contient aucune règle de jeu, et `core/` reste testable sans navigateur.
- En cas d'absence de WebGL, Pixi échoue à l'initialisation : l'interface bascule alors sur la carte SVG.

## Alternatives écartées

- **Phaser 3 :** cadre complet (scènes, physique, entrées) dont nous n'utiliserions presque rien. Plus lourd, et il pousse la logique de jeu dans ses scènes, ce qui gêne la séparation de `core/`.
- **Canvas 2D seul :** plus léger, mais redessiner des dizaines de milliers de sommets à chaque image est hors de portée sur mobile.

## Sécurité

Aucun nouveau flux de données. La CSP est traitée dans l'ADR 0006.
