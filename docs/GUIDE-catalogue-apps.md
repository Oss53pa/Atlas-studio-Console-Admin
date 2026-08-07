# Guide — Catalogue des applications (console ↔ site vitrine)

> Comment récupérer, créer et publier une application pour qu'elle s'affiche
> dans la console **et** sur `atlas-studio.org`. Procédure manuelle + diagnostic.
>
> État de la base constaté le **2026-08-07** (projet `Atlas Studio - Logiciels Saas`).

---

## 1. Le principe : une seule source de vérité

La table **`public.apps`** du projet Supabase partagé. Il n'y a **aucun export /
import** entre la console et le site : les deux lisent la même table.

```
public.apps  (projet Supabase partagé)
   │
   ├──► Console admin   →  src/admin/pages/AdminAppsTable.tsx  (SELECT * ORDER BY sort_order)
   │                       src/hooks/useAppCatalog.ts
   │                       src/admin/pages/AppCockpitPage.tsx  (cockpit par app)
   │
   └──► Site vitrine    →  même SELECT, filtré sur visible = true
```

Conséquence : une modification enregistrée dans la console est visible sur le
site **au rechargement de page suivant**. Aucun redéploiement n'est nécessaire.

Le second projet Supabase (`Atlas Studio - Applications Mobiles`) **ne contient
pas** de table `apps` — il n'y a donc pas de catalogue concurrent.

## 2. Prérequis

| Prérequis | Vérification |
|---|---|
| Console et site sur le **même** projet Supabase | `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` identiques des deux côtés (y compris dans les variables d'environnement Vercel, pas seulement en local) |
| Compte **admin** | La policy d'écriture est `is_admin()` ; sans ce flag, les enregistrements échouent |
| Colonnes de branding présentes | `accent_deep`, `accent_soft`, `wordmark_url` — cf. `db/20260727_apps_branding.sql` |

Policies RLS en place sur `public.apps` (vérifiées) :

- `Anyone can read apps` — `SELECT` avec `using (true)` → le site public lit avec
  la clé anon. **Ne pas la restreindre**, sinon le site n'affiche plus rien.
- `Admins can manage apps` — `ALL` avec `using (is_admin())`.

## 3. Méthode manuelle A — par la console (recommandé)

1. Se connecter à la console avec un compte admin.
2. Aller sur **`/admin/apps`** — « Grille Tarifaire & Applications ».
3. **« Nouvelle app »**, ou l'icône crayon pour modifier une app existante.
   Le bouton « Importer par défaut » n'apparaît **que si la table est vide** ;
   voir l'avertissement en §6.
4. Renseigner au minimum : `ID (slug)`, `Nom`, `Type`, `Tagline`, `Description`.
5. Régler les champs qui pilotent l'affichage public :

   | Champ | Effet sur le site |
   |---|---|
   | `visible` | **le commutateur de publication** — « Visible sur atlas-studio.org » / « Masquée » |
   | `status` | `available` / `coming_soon` / `unavailable` — badge métier, **indépendant** de `visible` |
   | `sort_order` | ordre des cartes dans « Nos applications » — voir §6, doit être **unique** |
   | `external_url` | si rempli, la carte pointe vers ce site au lieu de la fiche interne |
   | `name`, `tagline`, `description`, `features`, `categories`, `highlights`, `pricing`, `color`, `icon` | contenu de la carte et de la fiche |

6. Enregistrer, puis recharger le site.

Contraintes à connaître :

- l'`id` (slug) est **immuable** après création (champ désactivé en édition) ;
- slugs réservés, refusés à la création : `atlas-studio`, `atlasstudio`,
  `admin`, `portal`, `site` ;
- `type` est un enum : `Module ERP`, `App`, `App mobile` ;
- supprimer une app **orpheline les abonnements** associés — préférez
  `visible = false`.

## 4. Méthode manuelle B — SQL direct (SQL Editor Supabase)

À utiliser si la console est indisponible, ou pour un lot d'apps.

```sql
insert into public.apps
  (id, name, type, tagline, description, features, categories,
   pricing, pricing_notes, seat_pricing, pricing_period, currency,
   color, accent_deep, accent_soft, wordmark_url, icon, highlights,
   external_url, status, visible, sort_order, updated_at)
values
  ('mon-app', 'Mon App', 'App',
   'Ma tagline', 'Ma description…',
   array['Fonction 1','Fonction 2'],
   array['Finance'],
   '{"Starter": 18000, "Business": 45000}'::jsonb,
   '{"Starter": "3 sièges inclus · +6 000 FCFA/siège suppl."}'::jsonb,
   '{"Starter": {"mode":"forfait_seats","included":3,"extra":6000}}'::jsonb,
   'mois', 'FCFA',
   '#235A6E', '#1B4655', '#E7EFF1',
   'https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/wm-mon-app.png',
   'receipt',
   array['Point fort 1'],
   'https://mon-app.atlas-studio.org',
   'available', true, 12, now())
on conflict (id) do update set
  name = excluded.name,
  visible = excluded.visible,
  updated_at = now();
```

Contrôle :

```sql
select id, name, status, visible, sort_order, external_url
from public.apps order by sort_order, id;
```

## 5. Diagnostic — « la console (ou le site) n'affiche rien »

À dérouler dans cet ordre, c'est presque toujours l'un des quatre :

1. **Mauvais projet Supabase** — comparez `VITE_SUPABASE_URL` console / site,
   en local **et** dans Vercel.
2. **Table vide** — `select count(*) from public.apps;`.
3. **RLS** — sans policy `SELECT` ouverte, la requête renvoie 0 ligne
   **sans erreur** : `useAppCatalog` ne distingue pas « vide » de « interdit ».
4. **Colonnes manquantes** — un `insert`/`update` incluant `accent_deep`,
   `accent_soft` ou `wordmark_url` échoue si `db/20260727_apps_branding.sql`
   n'a pas été appliqué.

Si le site n'affiche qu'une partie du catalogue, la cause est presque toujours
`visible = false` sur les apps manquantes.

## 6. Points de vigilance constatés sur la base actuelle

**a) `sort_order` en doublon — ✅ corrigé le 2026-08-07.** `advist` et `cockpit-fa`
valaient tous deux `3`, `atlasbanx` et `cockpit-journey` tous deux `4`. Les deux
lectures trient uniquement sur `sort_order` : à valeur égale, l'ordre des cartes
n'était pas déterministe et pouvait changer d'un chargement à l'autre.
`db/20260807_apps_sort_order.sql` a été appliqué (renumérotation par pas de 10,
ordre d'origine préservé) — plus aucun doublon. Ordre en vigueur :

| `sort_order` | app |
|---|---|
| 10 | `atlas-people` |
| 20 | `atlas-compta` |
| 30 | `taxpilot` |
| 40 | `advist` |
| 50 | `cockpit-fa` |
| 60 | `atlasbanx` *(masquée)* |
| 70 | `cockpit-journey` |
| 80 | `cockpit-cr` |
| 90 | `cockpit-projet` |
| 100 | `tablesmart` |
| 110 | `wedo` |

**b) `pricing_notes` et `seat_pricing` — ✅ éditables depuis la console
(2026-08-07).** Le bloc « Tarification » de `/admin/apps` traite désormais chaque
plan comme un tout : prix, **mention publique** et **grille au siège** se
modifient au même endroit, ce qui supprime le risque de voir un prix évoluer
sans sa mention. Deux modes de sièges sont pris en charge, ceux présents en
base :

- **Forfait + sièges supplémentaires** (`forfait_seats`) — N sièges inclus,
  chaque siège au-delà facturé au prix indiqué ;
- **Par personne** (`per_person`) — prix par personne sur une tranche
  d'effectif, borne haute vide = illimité.

Le bouton **« Générer depuis les sièges »** remplit la mention à partir de la
grille (« 3 sièges inclus · +6 000 FCFA/siège suppl. », « par personne · 2 à
10 ») ; il n'apparaît que si la mention diffère de ce qui serait généré. La
mention reste librement éditable à la main : rien n'est écrasé automatiquement.

Détails d'implémentation utiles à connaître :

- la lecture prend l'**union** des clés de `pricing`, `pricing_notes` et
  `seat_pricing` — une mention orpheline (plan absent de `pricing`) reste
  visible et n'est pas perdue à l'enregistrement ;
- renommer un plan renomme la clé dans les trois objets d'un coup, puisqu'ils
  sont construits depuis la même ligne de formulaire ;
- vider la mention supprime la clé de `pricing_notes` ; passer les sièges sur
  « Aucune » supprime la clé de `seat_pricing` ;
- `currency` **n'est toujours pas éditable** : la valeur en base est lue et
  affichée (partout `FCFA` aujourd'hui), mais se modifie en SQL.

Le cycle lecture → écriture a été rejoué sur les 11 apps réelles : aucune
divergence, et les mentions générées reproduisent à l'identique celles déjà en
base.

**c) Le catalogue par défaut du code a divergé de la base.** `DEFAULT_CONTENT.apps`
(`src/config/content.ts`) décrit 7 apps avec l'id `atlas-fa`, alors que la base
en compte 11 et utilise `atlas-compta` ; `atlas-people`, `cockpit-cr`,
`cockpit-projet` et `cockpit-journey` n'y figurent pas. Le bouton **« Importer
par défaut » ne doit donc plus être utilisé** : sur une table vidée, il
recréerait un doublon `atlas-fa` et perdrait 4 apps. Il ne s'affiche que si la
table est vide, ce qui n'est pas le cas aujourd'hui.

**d) Branding incomplet.** `atlas-people`, `cockpit-cr`, `cockpit-projet` et
`wedo` n'ont ni `accent_deep`, ni `accent_soft`, ni `wordmark_url`. Impact :
emails d'authentification et portail retombent sur les valeurs par défaut pour
ces quatre apps.

**e) `atlasbanx` est `visible = false`** (statut `available`) : l'app est en
service mais absente du site public. À confirmer si c'est volontaire.

## 7. La bonne façon de faire, en résumé

- **Publier / dépublier** : le commutateur `visible` dans la console. Jamais un
  `delete`.
- **Ordonner** : `sort_order` par pas de 10 (10, 20, 30…), valeurs uniques —
  on peut ainsi insérer une app entre deux autres sans tout renuméroter.
- **Créer une app** : par la console, puis compléter en SQL le branding
  (`accent_deep`, `accent_soft`, `wordmark_url`) et `currency` si nécessaire.
- **Changer un prix** : entièrement dans la console — prix, mention publique et
  grille au siège sont sur la même ligne de formulaire, à mettre à jour ensemble.
- **Ne jamais** modifier un `id` : c'est la clé de jointure des `subscriptions`,
  `licences`, `error_logs` et `deployments`.
