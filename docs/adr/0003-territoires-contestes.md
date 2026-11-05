# ADR 0003 : traitement neutre des territoires contestés

**Statut :** accepté.

## Contexte

Un jeu pour enfants ne doit ni trancher un différend ni tromper. Natural Earth représente les situations de fait, qui diffèrent parfois des positions de l'ONU.

## Décision

Alignement sur les 54 États membres de l'ONU :

- **Somaliland** : fusionné dans la Somalie, sans frontière interne.
- **Sahara occidental** : affiché avec son contour et nommé « territoire non autonome (ONU) », sans statut d'État. Il n'est pas compté dans les 54, n'a ni drapeau ni tampon, et il ne figure ni dans les quiz ni dans les missions.
- **Contour du Sahara occidental** : Natural Earth le découpe selon la ligne de fait, en rattachant l'essentiel au Maroc. Le pipeline réunit les deux géométries puis les sépare au parallèle 27°40' N, limite nord du territoire.
- **Mention « frontières indicatives »** dans l'interface et sur la page parents.

## Conséquences

- Le pipeline contient une règle explicite de fusion, testée par oracle.
- L'alignement sur l'ONU est lui-même un choix, signalé sur la page parents.

## Alternatives écartées

- **Vue de fait de Natural Earth sans correction :** elle ferait du Somaliland une entité distincte, en contradiction avec la liste des 54.
- **Absorber le Sahara occidental dans le Maroc ou le laisser en blanc :** dans le premier cas c'est une prise de position, dans le second une omission trompeuse.

## Sécurité et conformité

Sans objet. Point de vigilance éditoriale à faire relire par un humain.
