# Atlas Compass — Plan d'implémentation technique
_Basé sur le CDC v1.0 + cartographie du dépôt (blueprint ASVC). Statut : à valider avant code._

## 0. Architecture des dépôts (à retenir)
Le backend est **partagé** entre deux dépôts :
- **UI** → dépôt console `Atlas Studio Console Admin` : `src/admin/pages/compass/` (calqué sur `asvc/`).
- **DB + Edge Functions** → dépôt site `Atlas-Studio-Website/supabase/` : migrations `cps_*` et fonctions `compass-*` (même Supabase que la console).

Le schéma part **sur une branche Supabase** (validé), puis merge en prod.

---

## 1. Décisions à trancher AVANT de coder (les vrais blocages)

| # | Sujet | Constat | Reco |
|---|-------|---------|------|
| D1 | **Accent ambre `#EF9F27`** | La console est en **olive `#6C7A1E` + volt `#C4EC00`** (palette globale). L'ambre du CDC n'existe pas et jurerait si on touche `--c-accent`. | **Scoper l'ambre à Compass** via `data-module="compass"` (variables locales `--cps-accent`…), sans toucher la palette globale. Compass aura son identité ambre, le reste reste olive/volt. |
| D2 | **Police UI** | CDC demande **Exo 2** ; la console est en **Dosis** (Exo 2 non configurée). Grand Hotel + JetBrains Mono sont déjà là. | Garder **Dosis** en UI (cohérence console) + Grand Hotel (titres/app) + JetBrains Mono (montants). Ajouter Exo 2 seulement si tu y tiens. |
| D3 | **PROPH3T « Ollama local d'abord »** | ⚠️ Les Edge Functions tournent dans le **cloud Supabase** : elles **ne peuvent pas joindre un Ollama local**. Le CDC est irréaliste sur ce point pour un advisor serveur. | Router l'advisor via l'infra multi-provider existante (`asvcChat()` → **Groq gratuit** en défaut, fallback Anthropic/Gemini, tous BYOK chiffrés). Ollama restera possible seulement si un worker auto-hébergé y accède (v2+). |
| D4 | **§11.3 coûts perso / salaire** | `cps_costs` a `app_id` nullable (coût transverse) + catégories. | Traiter l'apport/salaire comme une ligne `category = 'financement'` visible **owner only** (RLS). Non bloquant pour la Vague 1. |

Les autres points du §11 (modèle Ollama à benchmarker, 1re app instrumentée, fréquence synthèse, event ADVIST) concernent les **Vagues 3–4**, pas la Vague 1.

---

## 2. Conventions réutilisées (blueprint ASVC — rien de générique)

- **Module UI** : `src/admin/pages/compass/` = pages `CPS-*.tsx` + `hooks.ts` (hooks `useState/useEffect`, pas de React Query) + `types.ts` + `components/`.
- **Router** (`src/main.tsx`) : `lazyRetry(() => import('./admin/pages/compass/…'))` + `S(<Page/>)` (Suspense), routes sous `/admin` dans `<RequireAdmin><AdminLayout>`.
- **Nav** (`src/admin/AdminSidebar.tsx`) : une entrée `NAV_GROUPS` `{ id:"compass", label:"Atlas Compass", icon, subgroups:[…] }`.
- **UI kit** : `AdminPageHeader`, `AdminCard`, `AdminTable`, `AdminModal`, `AdminBadge`, `AdminConfirmDialog`, `AdminFormField`, toasts (`ToastContext`).
- **Data** : client unique `src/lib/supabase.ts` ; lectures `.from()`, agrégats `.rpc()`, actions LLM `functions.invoke(...)` avec `Authorization: Bearer <access_token>`.
- **Audit SHA-256** : **cloner** `asvc_audit_log` → `cps_audit_log` (colonnes `prev_hash/hash`, RULES anti-update/delete, trigger `cps_audit_compute_hash()` SECURITY DEFINER) + RPC `cps_log_audit(...)` (grant `service_role`) + `cps_verify_audit_chain()`.
- **RLS** : chaque table `cps_*` gate sur `public.is_admin()` OU `service_role` (helper déjà existant).
- **Edge Functions** : squelette `Deno.serve` + `_shared/{cors,supabase,auth}.ts` + logique dans `_shared/cps/*.ts` ; auth via `authorizeRequest` (JWT admin **ou** `CRON_SHARED_SECRET` pour pg_cron).
- **LLM** : appels via `asvcChat()` (clone `cpsChat()`), jamais un provider en dur.
- **Charts** : `src/components/ui/charts/PremiumCharts.tsx` (recharts) + d3 dispo.
- **Nouveau** : `src/lib/money.ts` (bigint FCFA, formatage, jamais de float) — n'existe pas, à créer.

---

## 3. Schéma DB — migrations `cps_*` (ordre, sur branche Supabase)
Répertoire : `Atlas-Studio-Website/supabase/migrations/` — nommage `YYYYMMDDHHMMSS_cps_*.sql`.

1. **`cps_foundation.sql`** _(Vague 1)_ — `cps_apps`, `cps_app_stage_history`, `cps_costs`, `cps_deals`, `cps_deal_events`, `cps_milestones`, `cps_assumptions` + **audit** (`cps_audit_log`, `cps_log_audit`, `cps_verify_audit_chain`) + RLS + enums. Montants en `BIGINT`.
2. **`cps_canvas.sql`** _(V5)_ — `cps_canvas`, `cps_canvas_blocks`.
3. **`cps_finance.sql`** _(V2)_ — `cps_pricing_plans`, `cps_scenarios`, `cps_projections` (+ `inputs_hash`).
4. **`cps_gtm.sql`** _(V1/V2)_ — `cps_channels` (deals déjà en foundation).
5. **`cps_data_fabric.sql`** _(V3)_ — `cps_data_sources`, `cps_events_raw` (idempotency unique), `cps_metrics_snapshot`, `cps_metrics_daily`, `cps_metrics_monthly`, `cps_effort_log`.
6. **`cps_proph3t.sql`** _(V4)_ — `cps_proph3t_insights` + rôle Postgres **`proph3t_writer`** (GRANT limité à cette seule table, défense en profondeur).

Chaque migration : header documenté, RLS activée, triggers audit branchés. Test sur la branche → `cps_verify_audit_chain()` OK → merge prod.

---

## 4. Edge Functions (Vagues 2–4)
- `compass-ingest` (V3) — réception événements apps, **HMAC-SHA256** par source (réutilise `_shared/federation_auth.ts`), idempotence.
- `compass-aggregate` (V2/V3) — MRR, burn, runway, effort, vélocité → `cps_metrics_*` (pg_cron).
- `compass-project` (V2) — projections scénarisées, `inputs_hash`.
- `compass-advisor-feed` (V4) — sérialise agrégats → `cpsChat()` → insère dans `cps_proph3t_insights` via rôle `proph3t_writer` ; **post-contrôle anti-hallucination** (tout nombre cité doit exister dans les inputs, sinon rejet `hallucination_check_failed`).
- pg_cron : agrégations + analyses PROPH3T quotidienne/hebdo/mensuelle.

---

## 5. Écrans (module `compass/`)
`CPS-00` Dashboard exécutif · `CPS-10` Matrice portefeuille + arbitrage · `CPS-11` Fiche app (onglets) · `CPS-20` Canvas + synergies · `CPS-30/31` Finance/scénarios · `CPS-40` Pipeline kanban + Levier Cosmos · `CPS-50` Jalons + Mur de vérité · `CPS-60` Advisor Feed · `CPS-70` Reporting/exports (BP PDF multi-profils) · `CPS-90` Admin Data Fabric.

Signalétique CDC : réalisé = plein · projeté = pointillé + scénario · badge provenance `auto ● / manuel ○ / import` sur **chaque** chiffre (RG-06).

---

## 6. Découpage & livraison

| Vague | Contenu | Ce que tu vois marcher |
|---|---|---|
| **V1 — Socle & réel** | `cps_foundation` + `money.ts` + nav/routes + CPS-00/10/11 (partiels) + saisie manuelle + import effort CockpitJourney + tuiles reporting de base. | **Arbitrage portefeuille sur effort réel + pipeline vivant**, données réelles/manuelles horodatées. |
| **V2** | Finance : pricing, coûts, `compass-project`, scénarios, CPS-30/31, export XLSX. | Réalisé vs projeté, burn/runway/point mort. |
| **V3** | Data Fabric temps réel : `compass-ingest` + HMAC + SDK `@atlas/compass-emitter`, 1re app instrumentée, Realtime, CPS-90. | Dashboard live < 5 s. |
| **V4** | PROPH3T Advisor : `compass-advisor-feed`, `proph3t_writer`, analyses programmées, anti-hallucination, CPS-60. | Insights advisory validables. |
| **V5** | Canvas + synergies, BP PDF multi-profils, rapport mensuel auto, rôles `advisor`/`investor_view`. | Business plan exporté généré. |

---

## 7. Prochaine étape proposée
Une fois D1–D4 tranchés : je crée la **branche Supabase**, j'écris **`cps_foundation.sql`** (tables Vague 1 + audit + RLS), je la teste sur la branche (insert + vérif chaîne audit), puis je monte l'ossature UI `compass/` (nav + routes + CPS-00/10/11 avec saisie manuelle). Build + revue avant tout merge prod.
