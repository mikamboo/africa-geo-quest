# ADR 0002 : projection azimutale équivalente de Lambert

**Statut :** accepté.

## Contexte

L'Afrique s'étend d'environ 37° N à 35° S, à cheval sur l'équateur. Le jeu enseigne les tailles relatives des pays : c'est un enjeu pédagogique autant que visuel.

## Décision

`d3.geoAzimuthalEqualArea` avec le centre de rotation à 20° E et 2° N environ, soit le centre du continent. Les surfaces sont exactes partout, et les déformations de forme restent faibles autour du centre.

## Conséquences

- Les distances restent assez justes pour régler la vitesse, et un même temps de marche correspond à une même distance à peu près partout.
- Le nord n'est pas exactement vertical aux bords (îles lointaines) ; c'est négligeable à cette échelle.
- La projection est un calcul pur : elle vit dans `core/`, et la carte SVG et Pixi partagent les mêmes coordonnées.

## Alternatives écartées

- **Mercator :** familier, mais il gonfle l'Afrique du Nord et l'Afrique australe par rapport à l'équateur, et réduit donc visuellement le centre du continent. Message pédagogique faux.
- **Équirectangulaire :** simple, mais ni conforme ni équivalente.
- **Mollweide ou Robinson :** pensées pour le monde entier, sans gain à l'échelle d'un continent.

## Sécurité

Sans objet : aucune donnée ni surface d'attaque.
