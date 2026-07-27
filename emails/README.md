# Emails d'authentification harmonisés — Atlas Studio

Templates Supabase Auth **pilotés par palette** (décision D9 du brief
d'harmonisation). Un seul patron par type d'e-mail sert **toutes** les apps :
aucun contenu figé propre à une app (fini le hardcode CockpitJourney). Le titre,
l'accent et la baseline proviennent des métadonnées de l'utilisateur, avec repli
neutre **« Atlas Studio »** (sauge) quand elles sont absentes.

## Fichiers

| Fichier | Colle-le dans (Supabase → Auth → Email Templates) | Parcours |
|---------|---------------------------------------------------|----------|
| `magic-link.harmonise.html` | **Magic Link** | Connexion par lien / OTP |
| `confirm-signup.harmonise.html` | **Confirm signup** | Vérification e-mail à l'inscription |
| `reset-password.harmonise.html` | **Reset password** | Mot de passe oublié (D5) **et** premier accès d'un client créé par l'admin (D6, définition par lien — jamais de mot de passe en clair) |

Les trois partagent la **même coquille** (papier crème, wordmark, bouton
d'accent, pied Atlas Studio). Seuls le préheader, le titre de section, le corps
et le libellé du bouton changent.

## Contrat des variables

Le branding est la **source unique** dans la Console Admin (`public.apps`, écran
« Grille Tarifaire & Applications » → Modifier → **Branding**). Chaque app doit
poser ces champs dans `raw_user_meta_data` (au signup **et** en resync post-login,
idéalement lus depuis `public.apps`) :

| Variable template | Champ `public.apps` | Repli neutre |
|-------------------|---------------------|--------------|
| `.Data.app` | `name` | `Atlas Studio` |
| `.Data.app_tagline` | `tagline` | `L'écosystème Atlas Studio` |
| `.Data.app_accent` | `color` | `#6E8B58` (sauge) |
| `.Data.app_accent_deep` | `accent_deep` | `#52693F` |
| `.Data.app_accent_soft` | `accent_soft` | `#EEF4E9` |
| `.Data.app_wordmark` | `wordmark_url` | wordmark `wm-atlas-studio.png` |

Exemple de resync côté app :

```ts
await supabase.auth.updateUser({
  data: {
    app: 'Atlas F&A',
    app_tagline: 'Finance & Administration',
    app_accent: '#235A6E',
    app_accent_deep: '#1B4655',
    app_accent_soft: '#E7EFF1',
    app_wordmark: 'https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/wm-atlas-compta.png',
  },
});
```

## Palette de référence (7 apps)

| app | accent | teinte |
|-----|--------|--------|
| CockpitJourney | `#6E8B58` | Sauge |
| Cockpit F&A | `#C97A5A` | Terracotta |
| Atlas F&A | `#235A6E` | Pétrole |
| TableSmart | `#C0A24E` | Champagne |
| AtlasBanx | `#C29A4B` | Or champagne |
| Liass'Pilot | `#0F766E` | Teal |
| Advist | `#4F46E5` | Indigo |

## Pourquoi une image pour le titre

Les web-fonts (Grand Hotel) ne s'affichent pas dans la plupart des clients mail.
Le titre de l'app est donc servi en **image wordmark** (tracés vectoriels rendus
en PNG, cf. `public/wordmarks/`), identique partout. Le reste du corps est en
**Dosis** (dégradation propre vers une sans-serif système si la police ne charge
pas).

## Limite structurelle — « la dernière app gagne »

`raw_user_meta_data` est **par utilisateur**, pas par envoi. Pour un usager
multi-apps, la dernière app ayant fait la resync gagne : il peut recevoir
l'accent d'une autre app. Le repli neutre « Atlas Studio » évite tout affichage
faux, mais pour un rendu **toujours** exact par e-mail, il faut router l'OTP via
une **Edge Function à contexte par requête** (comme `send-otp` du portail)
plutôt que l'e-mail Auth natif global. Chantier référencé dans
`docs/DEPLOIEMENT-auth-harmonisation.md` (D9, seconde partie).

## Aperçu local

`emails/preview.html` rend les trois templates avec des valeurs d'exemple (repli
sauge + Atlas F&A pétrole) pour valider visuellement la palette **sans** déployer.
Ouvrez-le dans un navigateur. Ce n'est **pas** le fichier à coller dans Supabase
(il ne contient pas la syntaxe Go `{{ ... }}`).
