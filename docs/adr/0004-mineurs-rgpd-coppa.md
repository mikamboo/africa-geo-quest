# ADR 0004 : protection des mineurs, RGPD et COPPA

**Statut :** accepté. **Ce document est une analyse technique à faire valider par une personne qualifiée. Ce n'est pas un avis juridique.**

## Contexte

Le public a 8–15 ans. En France, le seuil de consentement numérique est de 15 ans (RGPD art. 8 et loi Informatique et Libertés) ; aux États-Unis, COPPA concerne les moins de 13 ans. Ces obligations portent sur la collecte de données personnelles.

## Décision

Le jeu est conçu pour ne collecter **aucune donnée personnelle** :

- Pas de compte, d'e-mail, de nom réel ni de saisie libre : le pseudonyme est choisi dans une liste générée.
- Pas de backend. La progression reste dans le `localStorage` de l'appareil et n'est jamais transmise.
- Pas de cookie, de publicité, d'achat ni de traceur. Aucune requête vers un tiers au runtime (test e2e à l'appui).
- Liens externes précédés d'un écran d'avertissement.
- Mesure d'audience uniquement si `VITE_ENABLE_ANALYTICS=true` (Vercel Web Analytics, agrégée et sans cookie). Désactivée par défaut. L'activer impose de revoir cette analyse, car l'hébergeur traite alors techniquement des requêtes.

## Analyse

- **RGPD :** sans donnée transmise, l'éditeur ne devrait pas agir comme responsable de traitement pour la progression, qui reste sur l'appareil. À valider : les journaux techniques de l'hébergeur (adresses IP) relèvent d'un traitement distinct, à examiner au moment du déploiement. Le stockage local strictement nécessaire au jeu demandé par l'utilisateur relève de l'exception de la directive ePrivacy (art. 5(3)), à confirmer.
- **COPPA :** elle vise la collecte d'informations personnelles auprès d'enfants de moins de 13 ans. Sans collecte, les obligations de consentement parental ne devraient pas s'appliquer. À valider, notamment pour les identifiants persistants si l'analytics est activé.

## Conséquences

- Toute fonction en ligne (classement v2) rouvre cette analyse.
- La page « Parents & enseignants » explique les données stockées et la réinitialisation.

## Alternatives écartées

- **Pseudonyme libre :** risque de données personnelles et de contenu inapproprié.
- **Analytics actif par défaut :** requête réseau sans nécessité pour jouer.

## À faire valider par un humain

Cette analyse, avant toute mise en ligne publique.
