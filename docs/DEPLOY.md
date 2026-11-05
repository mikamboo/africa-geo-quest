# Déploiement (à faire plus tard)

Rien n'a été déployé. Ces étapes sont à suivre par un humain, avec ses propres comptes.

## Avant de commencer

- Relire `docs/REVIEW_FACTS.md`.
- Faire valider l'ADR 0004 (RGPD, COPPA) par une personne qualifiée.
- Vérifier la disponibilité du nom « Tembea » : aucune recherche de marque n'a été faite.

## 1. Créer le dépôt GitHub

```bash
gh repo create geo-africa --private --source=. --remote=origin
```

```bash
git push -u origin main
```

```bash
git push -u origin feat/prototype
```

Ouvrir ensuite une PR de `feat/prototype` vers `main`. Le CI (`.github/workflows/ci.yml`) lance `pnpm verify` puis `pnpm lighthouse`.

Dans _Settings → Branches_, protéger `main` et exiger le contrôle `verify`.

## 2. Relier Vercel

1. Sur vercel.com, _Add New → Project_, importer le dépôt.
2. Garder la configuration lue dans `vercel.json` : framework Vite, build `pnpm build`, sortie `dist`.
3. Branche de production : `main`.

Chaque PR obtient alors une prévisualisation, et chaque fusion sur `main` part en production.

Les prévisualisations sont publiques par défaut : activer _Deployment Protection_ si le contenu n'est pas encore relu.

## 3. Après le premier déploiement

- `index.html` : passer `og:image` en URL absolue, avec le domaine réel. Les réseaux sociaux n'acceptent pas les chemins relatifs.
- Vérifier les en-têtes servis :

```bash
curl -sI https://VOTRE-DOMAINE/ | grep -iE 'content-security|strict-transport|x-content-type|referrer-policy'
```

- Ouvrir le jeu sur un vrai téléphone de milieu de gamme et vérifier la fluidité. Ce point n'a jamais été mesuré sur appareil réel.

## 4. Mesure d'audience (facultatif)

Désactivée par défaut. Pour l'activer :

1. Activer _Web Analytics_ dans le projet Vercel.
2. Définir `VITE_ENABLE_ANALYTICS=true` dans les variables d'environnement Vercel.
3. Revoir l'ADR 0004 et mettre à jour la page « Parents & enseignants », qui affirme aujourd'hui qu'aucune donnée n'est envoyée. Adapter aussi le contrôle de `scripts/check-bundle.ts` et le test e2e de requêtes hors origine.

## Retour arrière

Sur Vercel : _Deployments → déploiement précédent → Promote to Production_. Le service worker se met à jour de lui-même à la visite suivante (`registerType: autoUpdate`).
