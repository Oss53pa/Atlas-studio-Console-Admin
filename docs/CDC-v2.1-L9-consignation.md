# CDC v2.1 — Lot L9 (migration de l'existant, Partie 23) : consignation

> 2026-07-31. **APPLIQUÉ** (migration `l9_arbitrage_and_migrate`) après arbitrage des cas D.

## Résultat final (vérifié)

- **0** abonnement actif sans droit · **14** entitlements actifs · 14 lignes · 14 sièges · 5 membres.
- **Arbitrage cas D** : Aniella Roland → tenant `3d4176d2` ; Pamela ATOKOUNA → tenant `b3627368` (le porteur des 6 licences). Doublons `2e64be2d` + `902abf45` → statut `fusionne` (licences réassignées au principal).
- **Pamela = compte interne** : ses 8 abonnements passés en `nature='interne'`, entitlements sans terme, sortis des indicateurs commerciaux.
- Contrainte `tenants_status_check` étendue avec `fusionne`.

---
### Historique (dry-run initial)

## Baseline (Étape 1)

- **14 abonnements**, tous `active`/`trial`.
- **5 rattachables** à un tenant (via appartenance `tenant_members`) → à doter d'un droit.
- **9 non rattachables** : tenant introuvable (emails de facturation partagés — cas D `aroland@`/`pamela.atokouna@` — ou compte dev). Non migrés.
- **0** abonnement `plan:"test"` ; **8** offerts (`is_granted`).
- Entitlements/lignes/sièges : **0** avant migration (le nouveau modèle n'était pas encore peuplé).

## Ce que fait la migration ([docs/sql-migrations/l9-migration-existant.sql](sql-migrations/l9-migration-existant.sql))

- **Étape 3** : requalifie tout `plan:"test"` en `nature='essai'` avec `date_fin` (aucun aujourd'hui).
- **Étape 4** : pour chaque abonnement actif dont le tenant est résolu et sans droit :
  backfill `tenant_id` + `nature` (trial→essai / granted→offert / sinon payant) + `origine='migration'`,
  puis crée `subscription_line` + `entitlement` (seats_limit, expiration = `current_period_end`) + `seat_claim` propriétaire.
- **Non résolus** → table de rapport `l9_report`, jamais migrés (arbitrage manuel : fixer d'abord l'appartenance, puis rejouer — idempotent).

Résolution du tenant : appartenance (fiable) puis email **unique** (sûr depuis le verrou email de L2 bis). Emails partagés → jamais liés.

## Dry-run (transaction annulée)

`migres=5 · non_resolus=9 · deja_droit=0` — aucun conflit de contrainte.

## Étape 5 — campagne de rattrapage (FAIT : mis en file, non envoyé)

Migration `l9_etape5_rattrapage_queue` : **6 messages `acces_regularisation` en file** (`statut='en_attente'`) pour **4 vrais clients** régularisés jamais notifiés (Aniella Roland, Cira Balde, Pamela Atokouna `patokouna@`, Ange-Félicien AKE-DANHO — 3 apps). Rien n'est envoyé : le déclenchement se fait via `dispatch-access-messages`, sur décision. Pamela interne exclue. *Refinement noté : un client multi-apps reçoit un message par abonnement (Ange = 3) ; consolidation par tenant à prévoir.*

## Étape 6 — gel (FAIT en partie)

Migration `l9_etape6_gel_licences` : **écritures directes sur `licences` gelées** (`revoke insert/update/delete` à authenticated/anon). Confirmé sans risque — aucun frontend n'écrit `licences` côté client (console = Edge Functions service_role ; site = code mort, corrigé pour déléguer à `admin-grant-licence`). service_role conserve tout.
- Tables neuves (entitlements/seat_claims/…) : déjà gelées (write=service_role, depuis L2).
- **Reporté à L17** : `subscriptions` (checkout portail `useSubscriptions.ts` + console `SubscriptionsPage` écrivent en direct) et `licence_seats` (apps externes non vérifiables).

## Reste (Partie 23)

- **Étape 5 — campagne de rattrapage** : pour les comptes régularisés n'ayant jamais reçu de message d'accès, envoyer un message dédié (gabarit distinct). À faire après COMMIT, via `dispatch-access-messages` / un gabarit de rattrapage.
- **Étape 6 — gel** : interdire toute écriture directe dans les tables de droits (déjà : RLS write = service_role only ; reste à supprimer les anciens chemins d'écriture applicatifs éventuels).
- **Les 9 non résolus** dépendent de l'arbitrage des cas D (Phase 3 de L2 bis) : même population.

## À faire (toi)

Exécuter le fichier, lire le rapport, puis `rollback;` → `commit;`. Ou me dire « commit L9 » et je l'applique.
