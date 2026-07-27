# Déploiement — Harmonisation de l'authentification Atlas Studio

Runbook des étapes de mise en production. Le code est prêt (7 PR) ; les étapes
ci-dessous sont celles qui **exigent un accès Supabase** (dashboard / CLI), donc
à réaliser par toi.

---

## 0. État des PR

| # | Dépôt | Contenu | Statut |
|---|-------|---------|--------|
| [#15](https://github.com/Oss53pa/Atlas-banx/pull/15) | Atlas-banx | SSO `verifyAtlasJWT` harmonisé | ✅ **mergée** |
| [#16](https://github.com/Oss53pa/Atlas-banx/pull/16) | Atlas-banx | Factory client Supabase | ✅ **mergée** |
| [#1](https://github.com/Oss53pa/Atlas-studio-Console-Admin/pull/1) | Console-Admin | Branding (wordmarks + palette + UI) | ✅ **mergée** |
| [#32](https://github.com/Oss53pa/Advist/pull/32) | Advist | SSO harmonisé | ⏳ à merger (⚠️ merge = `supabase db push`) |
| [#80](https://github.com/Oss53pa/Atlas-Finance/pull/80) | Atlas-Finance | SSO harmonisé | ⏳ à merger |
| [#4](https://github.com/Oss53pa/SmartTable/pull/4) | SmartTable | SSO harmonisé | ⏳ à merger (⚠️ merge = déploie Vercel `--prod`) |
| [#41](https://github.com/Oss53pa/Liass-Pilot/pull/41) | Liass-Pilot | SSO harmonisé + audience resserrée | ⏳ à merger |

> ⚠️ **Rappel** : merger une PR SSO **ne déploie pas** l'edge function. La nouvelle
> vérification n'est active qu'après `supabase functions deploy atlas-sso`.

---

## 1. Déployer la vérification SSO (edge functions)

Pour **chaque** satellite (Atlas-banx déjà mergé ; merge les 4 autres d'abord),
depuis le dossier du dépôt :

```bash
# Lier le projet Supabase de l'app (ref = celui qui héberge la fonction atlas-sso)
supabase link --project-ref <PROJECT_REF>

# Déployer la fonction harmonisée
supabase functions deploy atlas-sso
```

### Variables d'environnement (secrets de la fonction)
Le helper résout la clé de vérification ainsi (miroir de `federation_keys` côté émetteur) :

```bash
# Clé par app si tu veux l'isolation (recommandé) — sinon repli sur la partagée
supabase secrets set JWT_SECRET_ATLASBANX=<clé>     # ex. pour Atlas-banx
# Repli commun (déjà en place aujourd'hui)
supabase secrets set JWT_SECRET=<clé partagée>
```

Le `kid` du token (= appId) sélectionne `JWT_SECRET_<APPID>` ; en son absence,
repli sur `JWT_SECRET`. **Rien à changer si tu gardes uniquement `JWT_SECRET`** :
comportement identique à aujourd'hui, en plus strict (`exp` obligatoire, `aud`).

### Audiences par app (déjà codées dans chaque PR)
| App | audience acceptée |
|-----|-------------------|
| Atlas-banx | `atlasbanx`, `scrutix` |
| Advist | `advist` |
| Atlas-Finance | `atlas-compta`, `atlas-fa` |
| SmartTable | `tablesmart` |
| Liass-Pilot | `liasspilot`, `taxpilot` |

### Test bout-en-bout (obligatoire avant de considérer l'app OK)
1. Depuis le portail Atlas Studio → lancer l'app.
2. Vérifier l'ouverture de session (pas d'erreur « Audience non autorisée » /
   « Token expiré »).
3. En cas d'échec : `supabase functions logs atlas-sso` → lire le message précis.

---

## 2. Branding — migration + assets (déjà mergés)

### 2.1 Appliquer la migration sur le **Supabase partagé** (`vgtmljfayiysuvrcmunt`)
Le fichier est dans la PR mergée : `db/20260727_apps_branding.sql`.

```bash
# Option CLI
supabase db execute -f db/20260727_apps_branding.sql
# ou : coller le SQL dans le dashboard → SQL Editor → Run
```
Ajoute `accent_deep`, `accent_soft`, `wordmark_url` à `public.apps` et seed la
palette des 7 apps (wordmarks servis via jsDelivr `@main`).

### 2.2 Wordmarks (aucune action)
Servis automatiquement, ex. :
`https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/wm-atlas-compta.png`

### 2.3 Édition future
La couleur/wordmark de chaque app se modifie désormais depuis la **Console Admin**
(« Grille Tarifaire & Applications » → Modifier → section **Branding**).

---

## 3. Template email d'authentification (dashboard Supabase)

Sur le projet partagé `vgtmljfayiysuvrcmunt` :

1. **Authentication → Email Templates → Magic Link** (et *Confirm signup* /
   *Reset password* si tu veux le même branding partout).
2. Coller le contenu de **`magic-link.harmonise.html`**.
3. Le template lit depuis `raw_user_meta_data` : `app`, `app_tagline`,
   `app_accent`, `app_accent_deep`, `app_accent_soft`, `app_wordmark`.

### 3.1 Alimenter les métadonnées par app (côté apps)
Au signup **et** en resync après login, chaque app doit poser ces champs
(idéalement lus depuis `public.apps`) :

```ts
await supabase.auth.updateUser({
  data: {
    app: 'Atlas F&A',
    app_id: 'atlas-compta',
    app_tagline: 'Finance & Administration',
    app_accent: '#235A6E',
    app_accent_deep: '#1B4655',
    app_accent_soft: '#E7EFF1',
    app_wordmark: 'https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/wm-atlas-compta.png',
  },
});
```

> ⚠️ **Limite structurelle** : `raw_user_meta_data` est **par utilisateur**, pas
> par envoi. Pour un usager multi-apps, « la dernière app gagne ». Si tu veux un
> rendu **toujours** exact, route l'OTP via une fonction à contexte par requête
> (comme `send-otp` du portail) plutôt que l'email Auth global. Sinon, le repli
> neutre « Atlas Studio » du template évite tout affichage faux.

---

## 4. Factory client Supabase (frontend)

- **Atlas-banx** : mergé (#16). Se déploie via ton déploiement front habituel
  (Vercel). Le changement de `storageKey` (→ `atlasbanx-auth`) **déconnecte une
  fois** les sessions existantes (re-login, sans perte de données).
- **Autres apps** : à généraliser — chaque app fournit son `storageKey`
  (`import { createAtlasSupabaseClient }` puis remplacer son `createClient`).

---

## 5. Ordre recommandé

1. **Merger** les 4 PR SSO restantes (Advist, Atlas-Finance, SmartTable, Liass-Pilot).
2. **Déployer** `atlas-sso` sur chaque projet + **tester** (§1).
3. **Appliquer** la migration branding (§2.1).
4. **Coller** le template email + alimenter les métadonnées (§3).
5. **Déployer** le front Atlas-banx (factory) et vérifier la persistance de session.
6. Quand les pilotes sont validés : **généraliser** factory + branding aux autres apps.

---

## 6. Rollback

- **Edge function** : `supabase functions deploy atlas-sso` depuis le commit
  précédent (ou `git revert` de la PR puis redeploy). Les changements sont
  rétro-compatibles → un rollback n'est nécessaire qu'en cas d'imprévu.
- **Migration** : additive (ADD COLUMN IF NOT EXISTS). Rollback =
  `ALTER TABLE public.apps DROP COLUMN accent_deep, accent_soft, wordmark_url;`
  (les valeurs `color` seedées peuvent rester sans effet).
- **Template email** : conserver l'ancien template avant de coller le nouveau.
- **Factory** : `git revert` de la PR #16 puis redeploy front.

---

## 7. Ce qui reste à généraliser (optionnel)

- **SSO** : ✅ complet (les 5 apps ayant `atlas-sso` sont couvertes).
- **Factory client** : à étendre aux autres frontends (1 PR chacun).
- **Branding métadonnées** : brancher la resync `raw_user_meta_data` sur
  `public.apps` dans chaque app.
- **Récupération MDP centralisée** (D5) et **OTP à contexte par requête** :
  chantiers du brief non encore entamés.

_Généré par Claude Code — harmonisation auth Atlas Studio._
