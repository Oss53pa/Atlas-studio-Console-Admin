# CDC v2.1 — Complément 1 (L2 bis) : consignation

> Exécuté le 2026-07-30, projet `vgtmljfayiysuvrcmunt`. Lecture + migrations additives sûres.

## Phase 0 — contrôles de sécurité bloquants

| # | Contrôle | Résultat | Verdict |
|---|---|---|---|
| C1 | `billing_email` en doublon dans `public.tenants` | **2 emails × 2 tenants** (aroland@cosmos-yopougon.com, pamela.atokouna@yahoo.com) | 🔴 **POSITIF** — la RLS par email autoriserait un accès croisé |
| C2 | L'utilisateur peut-il changer son email ? | Policies UPDATE `id=auth.uid()` sans `WITH CHECK` colonne + `GRANT UPDATE(email)` à authenticated/anon | 🔴 **POSITIF** — élévation de privilège triviale |
| C3 | Profils résolvant plusieurs tenants | **2** | 🔴 confirme C1 |
| C4 | Tenants sans email (inaccessibles) | 0 | ✅ |
| C5 | Emails de profil partagés | 0 | ✅ |

**Conséquence appliquée** : la RLS par email posée en L2 est **retirée** (bascule sur `tenant_members`, fail-closed). Correctif C2 posé : trigger `prevent_email_self_change` (SECURITY INVOKER) bloquant tout changement d'email par authenticated/anon.

## Phase 1 — quel objet fait foi ?

Trois tables de compte parallèles, chacune servant une famille d'apps :

| Objet | Référencé par (extrait) | Rôle |
|---|---|---|
| **`public.tenants`** | **licences, invoices.tenant_id, entitlements, atlas_email_*, feature_flags, ao_*** | **compte cœur / facturation** |
| `public.organizations` | subscriptions.organization_id, invoices.organization_id, profiles, roles, notifications, atlasbanx_*, advist_*, RGPD/ISMS | tenant opérationnel des apps |
| `public.societes` | journal_entries, budget_*, capex_*, cr_*, stock_*, treasury_*, **user_tenants.tenant_id**, profiles.company_id | tenant des apps finance/compta |

Faits décisifs : `invoices` est **doublement clé** (tenant_id + organization_id) ; `subscriptions` → `organizations` (pas de `tenant_id`) ; `licences` → `tenants` ; `user_tenants` → `societes`.

**Recommandation (à confirmer) : `public.tenants` = compte commercial cœur qui fait foi.** `organizations` et `societes` sont les **tenants internes des applications** (le `tenant_id_externe` d'`app_provisioning`, CDC 3.9) — mappés par le provisioning, pas absorbés.

## Phase 2 — schéma (FAIT, additif)

Migration `l2bis_phase0_hardening_and_tenant_members` (+ `l2bis_fix_email_trigger_invoker`) :
- Table `public.tenant_members` (tenant_id→tenants, user_id→auth.users, role_canonique proprietaire|administrateur, statut, est_acheteur_admin, source_migration…) + index (un seul acheteur-admin actif par tenant) + RLS (select = `tenant_id = any(public.tenant_ids())`, write interdit à authenticated).
- Fonctions `public.tenant_ids()`, `public.current_tenant()`, `public.set_active_tenant()`. **Écart au complément** : en schéma `public` (création dans `auth` refusée par Supabase) ; comportement identique.
- `public.user_can_access_tenant()` rebasculée sur `tenant_members` (fail-closed).

**Tests d'isolation au vert** (rollback intégral) : isolation entitlements A=1/0 B=1/0 ; T6 écriture `tenant_members` bloquée ; T7 auto-changement d'email bloqué.

## Phase 3 — peuplement : BLOQUÉ (décisions requises)

Classification des 8 tenants cœur :
- **3** auto-liables (email unique + profil) — cas C, source « email » faible.
- **4** email partagé — **cas D, arbitrage manuel**.
- **1** email sans profil correspondant.
- `user_tenants` pointe vers `societes` → **pas une source pour tenants**.
- `subscriptions` sans `tenant_id` → aucun rattachement direct abonnement↔tenant cœur.

Le peuplement automatique est donc impossible sans décisions. Migration NON exécutée.

## Décisions à trancher (avant Phase 3)

1. **Confirmer `public.tenants` comme source de vérité cœur.** (reco : oui)
2. **Sort de `societes` / `organizations`** : rester tenants internes des apps (mappés), pas absorbés. (reco : oui)
3. **Pont abonnement↔tenant** : `subscriptions` est keyé sur `organizations`/`user`, les droits sur `tenants`. Règle de rattachement à définir (rôle de L5 `provision_subscription`).
4. **Arbitrage des 4 tenants cas D** (emails aroland@cosmos-yopougon.com, pamela.atokouna@yahoo.com) : comptes de test/doublons du fondateur, ou cabinets légitimes ? Détermine fusion vs multi-dossier.
