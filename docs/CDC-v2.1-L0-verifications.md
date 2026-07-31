# CDC v2.1 — Lot L0 : consignation des vérifications (Partie 0)

> Exécuté le 2026-07-30 contre le projet Supabase `vgtmljfayiysuvrcmunt` (« Logiciels SaaS »)
> et les dépôts `Atlas-Studio-Console-Admin` + `Atlas-Studio-Website` (source des Edge Functions).
> Lecture seule. Aucune écriture. **Aucun lot de développement ne démarre avant lecture de ce document.**

Légende statut d'écart (Partie 33) : **C** conforme · **D** divergent · **P** partiel · **A** absent.

---

## Tableau des 15 vérifications

| # | Vérification | Réponse (avec preuve) | Impact CDC |
|---|---|---|---|
| **V1** | Nom réel de la table compte client | **`tenants`** confirmé. **Piège : la table existe en double** — `public.tenants` (8 lignes, **utilisée par le code réel** : `licenceGeneration.ts`, licences, invoices) et `atlas_core.tenants` (1 ligne, quasi vide, parallèle). Le vocabulaire « tenant » du CDC est bon. | Trancher : **`public.tenants` fait foi**, `atlas_core.tenants` à clarifier/supprimer. Le schéma actuel (`id, name, slug, rccm, country, currency, legal_form, status, logo_url, billing_email, stripe_customer_id, created_by`) est **bien plus pauvre** que la cible 3.1 → migration lourde. Statut **P**. |
| **V2** | Schéma `subscriptions` | Colonnes clés présentes : `user_id, app_id (text), plan (text), status, price_at_subscription, trial_ends_at, current_period_start/end, seats_limit, is_granted, granted_by, bundle_slug, mrr_fcfa`. Pas de `nature`, `origine`, `numero`, `motif_attribution`, `date_debut/fin`, `subscription_lines`. | Les colonnes `is_granted/granted_by/seats_limit` existent (à alimenter en miroir puis déprécier, cf. 3.5). `nature/origine/motif` **absents** → migration Partie 3.5. Pas de `subscription_lines`. Statut **P**. |
| **V3** | Schéma `licences` + clés en clair | Table riche : `activation_key (NOT NULL), key_hash (NOT NULL), offline_token (nullable), offline_valid_days, max_seats, used_seats, status, activated/suspended/revoked_at…`. **État réel : 12 licences, 0 masquée, 7 clés stockées EN CLAIR complet, 0 avec offline_token.** | ⚠️ **Faille active confirmée.** `createGrantedLicence` (navigateur) et `createLicenceAfterPayment` écrivent la clé en clair ; seul `generate-licence` masque (mais n'est appelé que par `confirm-wire-transfer`). **Lot L1 urgent et prioritaire.** `offline_token` existe mais **jamais utilisé** (cohérent avec V11). |
| **V4** | Table sièges / rôles / membres déjà présente ? | **Sièges : `licence_seats` (28 lignes)** = modèle de siège actuel. **Rôles : `roles`, `user_roles`, `admin_roles`, `user_tenants` (2 lignes)** existent. **Absents : `entitlements`, `seat_claims`, `legal_entities`, `suites`, `role_canoniques`, `role_mappings`, `portfolio_scopes`.** | Le cœur cible du CDC (entitlements + seat_claims) est **à construire intégralement** (Parties 3.7/3.8/9). `licence_seats` sert de base de migration. Statut **A** pour entitlements/seat_claims. |
| **V5** | JWT : `products[]`, `tenant_id`, `custom_access_token_hook` ? | **Aucun `custom_access_token_hook`** en base (seuls `auth.jwt` natif et une fonction OAuth ASVC sans rapport). Le JWT ne calcule donc **pas** `products[]`/entitlements. | **Toute la Partie 10 est à construire (A).** L'accès n'est aujourd'hui pas gouverné par des claims calculés. Aucune `has_active_access()` non plus. |
| **V6** | TTL jeton d'accès / rafraîchissement | Non lisible en SQL (config projet Auth). **Défaut Supabase = 3600 s (1 h)** access token, refresh long. **À confirmer dans le dashboard.** | Cible = **15 min** (Partie 10). Écart probable **D** (1 h → 15 min). Confirmation dashboard requise. |
| **V7** | Edge Functions déployées + appelants | **197 fonctions déployées.** Chaîne de droits identifiée : `admin-clients` (création), `cinetpay-webhook`/`stripe-webhook`/`payment-webhook` → `createLicenceAfterPayment` (pas d'email, pas de masquage), `generate-licence` (email + masquage, appelé **seulement** par `confirm-wire-transfer`), `admin-reset-password`, `send-notification` (**hardcodé ADVIST**). | **3 chemins de génération de licence divergents** → cible = **1 moteur** `provision_subscription` (Partie 5). Statut **D/A**. |
| **V8** | `admin-clients` v24 crée-t-elle un essai ? | **Oui** : crée le compte auth (sans mdp), le profil, **une `subscriptions` status `trial`**, envoie l'email d'invitation harmonisé (palette par app). | Cible 7.1 : `admin-clients` **ne doit plus créer d'abonnement**. Écart **D** à corriger au lot L5. |
| **V9** | Fournisseur emails + domaine authentifié | **Resend** (`RESEND_API_KEY`), domaine `atlas-studio.org`, expéditeur `notifications@atlas-studio.org`. Tables `atlas_email_config` + `atlas_email_log` (**3 lignes seulement**). SPF/DKIM/DMARC non vérifiables en base. | Infra email OK mais **preuve de délivrance quasi inexistante** (3 logs). Webhooks Resend (remis/ouvert/rebond) à brancher (Partie 15). **Vérifier SPF/DKIM/DMARC en DNS.** Expéditeur cible = `acces@atlas-studio.org`. Statut **P**. |
| **V10** | Prestataire paiement + prélèvement récurrent | **CinetPay ET Stripe** (webhooks des deux + `payment-webhook`). Fonctions `renewal-engine`, `subscription-cron` présentes. | Prélèvement récurrent Mobile Money : **à confirmer auprès de CinetPay** (mandat). Structure le mode de reconduction (Partie 13). Recommandation CDC : **manuel par défaut**. |
| **V11** | Une app réellement installée / hors ligne ? | **Non.** `apps` n'a **aucune** colonne `mode_distribution` ; **les 11 apps ont un `external_url` web**, aucune n'est marquée offline. `offline_token` des licences = 0 utilisé. | ✅ **V11 négative → Partie 11 supprimée, Lot L18 annulé, concept de clé d'activation à retirer.** Les 12 licences existantes deviennent de simples entitlements cloud. Simplification majeure (Décision #1). |
| **V12** | Clients multi-entités juridiques déjà en base ? | **Non.** `tenants` n'a **pas** de `tenant_parent_id`, pas de `legal_entities`. Un tenant = une entité. | Parties 3.2/16.1 = **greenfield (A)**. Aucune donnée à migrer, pas d'urgence. |
| **V13** | Cabinets gérant plusieurs dossiers ? | **Pas au niveau core.** Pas de `tenant_parent_id`/`est_dossier`. Des `dossiers`, `cr_dossiers`, `coop_clients` existent **au niveau applicatif** uniquement. | Partie 29 (cabinets) = **greenfield au core (A)**. À éprouver par les 3 entretiens (29.7) avant L13. |
| **V14** | État des abonnements | **14 abonnements actifs.** Dont **8 offerts (`is_granted`)**. **3 abonnements actifs SANS licence** : 2× `Entreprise` payants (AtlasBanx/Atlas People — noms de plans non mappés) + 1× `Standard` offert (Cockpit Projet — produit sans plan). **Aucun `plan:"test"`** en base actuellement. | Confirme les échecs silencieux de génération de droit. Migration Partie 23 : régulariser ces 3 abonnements + créer entitlements rétroactifs. |
| **V15** | Facturation conforme DGI déjà en place ? | **Non.** `invoices` n'a **aucune** colonne de certification (pas de `qr_code`, `certification_number`, `signature`, machine à états). Champs = `invoice_number, amount, status, pdf_url, paid_at, cinetpay/stripe ids`. | Facture normalisée électronique DGI = **greenfield (A)**, Partie 12.2. Lot L11, le plus incertain. |

---

## Décalage modèle SaaS ↔ licence (cause racine du « pas généré correctement »)

Deux systèmes parallèles à moitié câblés :
- **SaaS** : `subscriptions.app_id (text)` + `plan (text)` → affiché/facturé.
- **Licence** : `products`/`plans`/`licences`/`licence_seats` (UUID + `max_seats`).

Pont = `app.slug == product.slug` **et** `subscription.plan == plan.name`. **Cassé pour 4 apps sur 11** :

| App | Plans SaaS | Plans licence | Génération droit |
|---|---|---|---|
| Advist, Atlas F&A, CockpitCR, Cockpit F&A, CockpitJourney, Liass'Pilot | = | = | ✅ OK |
| **AtlasBanx** | Cabinet, Entreprise | Starter, Premium | ❌ noms incompatibles |
| **Atlas People** | Entreprise, PME, TPE | *(aucun plan)* | ❌ |
| **Cockpit Projet** | Standard | *(aucun)* | ❌ |
| **WeDo** | Gratuit | *(aucun)* | ❌ |
| TableSmart | Multi-sites, Resto Solo | + Enterprise superflu | ⚠️ partiel |

Sièges configurés (`max_seats>1`) sur **4 apps seulement** (Advist, Atlas F&A, AtlasBanx, CockpitJourney) → l'unité de droit n'est pas homogène.

---

## Ajustements du CDC déclenchés par le L0

1. **Partie 11 (licences de poste) : SUPPRIMÉE.** V11 négative, tout est cloud. Le Lot L18 disparaît. Le concept de « clé d'activation » sort du produit ; les licences existantes → entitlements.
2. **Partie 10 : intégralement à construire.** Pas de hook, pas de `has_active_access()`. Confirmer le TTL courant (V6) au dashboard.
3. **Partie 3 : `public.tenants` fait foi** ; `atlas_core.tenants` (1 ligne) à clarifier/retirer. Schéma tenants à enrichir massivement.
4. **Partie 7.1 : recentrer `admin-clients`** — elle crée aujourd'hui un abonnement d'essai (V8), ce que la cible interdit.
5. **Lot L1 (sécurité) confirmé urgent** : 7 clés en clair, génération de clé côté navigateur à supprimer.
6. **Entitlements / seat_claims / legal_entities / suites / rôles canoniques : greenfield** (V4). `licence_seats` sert de base de migration.
7. **Facturation DGI (12.2) et multi-entités/cabinets (16/29) : greenfield** — pas de données à migrer (V12/V13/V15), donc planifiables en vagues 2-3 sans dette existante.
8. **Preuve de délivrance à bâtir** : `atlas_email_log` existe mais quasi vide (V9) ; brancher les webhooks Resend.

## Points restant à confirmer HORS base (non résolubles en lecture SQL)

- **V6** : TTL réel des jetons (dashboard Auth Supabase).
- **V9** : alignement SPF / DKIM / DMARC du domaine `atlas-studio.org` (DNS).
- **V10** : disponibilité réelle du mandat de prélèvement récurrent Mobile Money chez CinetPay (contrat/API).
