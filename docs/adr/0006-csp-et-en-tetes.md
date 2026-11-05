# ADR 0006 : CSP stricte et en-têtes

**Statut :** accepté.

## Contexte

PixiJS v8 génère du code à l'exécution par défaut, ce qu'une CSP sans `unsafe-eval` bloque. D'après sa documentation, `pixi.js/unsafe-eval` remplace cette génération par des polyfills statiques ; malgré son nom, il supprime le besoin d'`unsafe-eval`.

## Décision

- `import 'pixi.js/unsafe-eval'` avant l'initialisation du renderer.
- `script-src 'self'`, sans `unsafe-eval` ni `unsafe-inline`. `worker-src 'self' blob:` pour les workers de Pixi.
- `vercel.json` est l'unique source de vérité. `vite preview` le relit, donc les e2e couvrent les en-têtes réellement livrés.

## Conséquences

- `style-src 'self'` interdit les styles en ligne dans le HTML. React passe par le CSSOM, qui n'est pas concerné.
- HSTS n'a d'effet qu'en HTTPS, et il est inoffensif en local.

## Alternatives écartées

- **`unsafe-eval` :** réduit nettement la protection, pour un public mineur.
- **Balise `<meta>` CSP :** ne couvre ni `frame-ancestors` ni les autres en-têtes.
