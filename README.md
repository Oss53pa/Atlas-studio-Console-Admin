# Atlas Studio — Console d'administration

Console d'administration **indépendante** d'Atlas Studio, extraite du site vitrine
(`Atlas-Studio-Website`). C'est une application autonome (dépôt, build et déploiement
propres) mais **reliée au site** via le **même backend Supabase** : même base de
données, mêmes comptes administrateurs, mêmes tables.

## Architecture

- **Indépendante** : son propre `package.json`, sa propre config Vite/Tailwind, son
  propre point d'entrée `src/main.tsx`. Aucune dépendance au code du site vitrine.
- **Reliée** : pointe vers le même projet Supabase que le site (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`). Toute donnée gérée ici se reflète côté site et
  inversement.

L'application est montée sous `/admin` (comme sur le site d'origine, pour préserver
toute la navigation interne). La racine `/` redirige vers `/admin`.

## Démarrage

```bash
npm install
cp .env.example .env   # puis renseignez les clés Supabase (identiques au site)
npm run dev
```

- `npm run dev` — serveur de développement Vite
- `npm run build` — build de production
- `npm run typecheck` — vérification TypeScript
- `npm run lint` — ESLint

## Contenu

- `src/admin/**` — la console (layout, sidebar, pages, composants, contexts, hooks)
- `src/lib/**` — client Supabase, auth, types de la base, utilitaires partagés
- `src/hooks/**`, `src/components/**`, `src/config/**`, `src/types/**` — modules
  partagés nécessaires à la console, emportés depuis le site lors de l'extraction
