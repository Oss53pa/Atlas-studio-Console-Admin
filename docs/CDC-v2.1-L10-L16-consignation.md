# CDC v2.1 — Vague 2 : L16 (observabilité) + L10 (cycle de vie) : consignation

> 2026-07-31. Migrations `l16_invariants_function`, `l16_backfill_migration_motifs`,
> `l16_admin_kpis`, `l10_subscription_lifecycle_tick`, `l10_lifecycle_tick_catchall`.

## L16 — invariants & observabilité (FAIT)

- **`public.check_invariants()`** → 13 invariants exécutables (Partie 21 + Complément) : ligne sans droit, droit expiré actif, siège sur droit non actif, sièges > quota, provisioning bloqué, motif manquant, message en attente, 2 droits même app, clé en clair, tenant sans propriétaire, abo actif sans membre, >1 acheteur-admin, email partagé. Chacun doit renvoyer 0.
- **`public.admin_kpis()`** (admin only) → tableau de bord : comptes actifs, abos commerciaux, en retard, droits actifs, sièges consommés/vendus, droits expirant à 30 j, messages non délivrés / en file, invariants KO.

**Baseline → 0 violation** après nettoyage piloté par les invariants :
- I8 (11) : backfill du motif « régularisation migration v1 » sur les abos migrés non-payant.
- I4 (1) : accès offert au terme dépassé (Cira Balde, cockpit-fa, 22/05) → expiré par le moteur L10.
- I17 (1) : tenant « CockpitJourney Dev » (0 abo) → passé en `suspended`.

## L10 — cycle de vie (cœur FAIT)

**`public.subscription_lifecycle_tick(grace=15, resil=45)`** — état `past_due` réutilisé (déjà dans la contrainte) :
- **payant** : échéance → `past_due` + **accès maintenu** (droit étendu jusqu'à fin de grâce) ; fin de grâce (J+15) → droits `suspendu` ; résiliation (J+45) → droits `revoque`, sub `canceled`, sièges libérés.
- **essai / offert** : expiration au terme (`date_fin` ou `current_period_end`).
- **filet I4** : tout droit actif au-delà de sa `date_expiration` → `expire`.
- interne (sans terme) : jamais touché.

**Planifié** : `cron.job` **atlas-subscription-lifecycle**, quotidien 02:00 UTC (pg_cron, jobid 10, actif).

## L10 — relances + liens de paiement (FAIT)

- **`public.queue_due_reminders()`** : met en file (message_deliveries, modele='echeance') les rappels **J-30 / J-15 / J-7 / J-1** et **J+7 (retard)** pour les abos payant, une seule fois par jalon. Intégré au cron quotidien (enchaîné après le tick).
- **Edge Function `dispatch-reminders`** (déployée, service/admin) : rend l'email de relance (ton selon le jalon, accent rouge si urgent) avec un **lien de paiement signé**, l'envoie via Resend, écrit la preuve. Reprise 5 essais. 401 sans auth ✅.
- **Edge Function `pay-link`** (déployée, publique) : **page de paiement HTML sans login** validée par jeton HMAC signé (n'expose que montant + référence, valable 90 j). Rendu HTML confirmé (`text/html`), jeton invalide → page « lien invalide ».

### À savoir / enhancements
- **Envoi automatique non activé** : le cron *met en file* les relances mais ne les *envoie* pas (pas d'emails auto vers de vrais clients sans ton accord). Pour automatiser : ajouter un cron appelant `dispatch-reminders` (+ `dispatch-access-messages`) via `pg_net` avec la clé service_role.
- **Paiement no-login de bout en bout** : le bouton « Payer » de `pay-link` renvoie vers `/portal/billing?renew=<id>`. Le checkout CinetPay direct depuis la page publique (sans login) reste à câbler (dépend de la config CinetPay / V10).

## Non fait / à savoir
- **L16 alerte** : `check_invariants()` existe ; le branchement d'une alerte (email/notif) sur `violations>0` reste à faire (cron + notify). On peut ajouter un job `check_invariants` quotidien qui alerte si KO.
- **Cron invariants** : non planifié (à ajouter comme le lifecycle).

## Reste de la Vague 2

- **L11 (facturation DGI)** : BLOQUÉ sur validation fiscaliste + API de certification DGI (Partie 34). Seul un squelette de schéma (états de certification, avoirs) est possible sans ces entrées.
- **L17 (bascule + gel complet + refactor flux payant)** : dépend de la migration du portail (les écritures `subscriptions` doivent passer côté serveur avant de geler la table).
