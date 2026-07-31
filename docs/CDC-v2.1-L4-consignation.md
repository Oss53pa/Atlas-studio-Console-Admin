# CDC v2.1 — Lot L4 (RPC sièges) : consignation

> Appliqué le 2026-07-30. Migration `l4_claim_release_seat_rpc`.

## Déployé en base (vérifié)

| Fonction | Rôle |
|---|---|
| `public.claim_seat(p_app_code text, p_user_id uuid, p_role_canonique text default 'operateur', p_role_app_code text default null, p_date_fin date default null)` → `(ok, motif, sieges_restants)` | L'app consomme un siège pour un utilisateur. Tenant résolu via `current_tenant()` (compte actif du JWT). Refuse si : pas de compte actif, tenant suspendu, pas d'entitlement actif, quota atteint, `auditeur_externe` sans date de fin. Idempotent. Verrou `FOR UPDATE` sur l'entitlement (anti-course quota → invariant 21.6). |
| `public.release_seat(p_app_code text, p_user_id uuid)` | Libère le siège ouvert de l'utilisateur (released_at = now), historique conservé. |

Grants : `authenticated` + `service_role`. `SECURITY DEFINER` (contourne la RLS pour écrire `seat_claims`).

**Écart au CDC** : schéma `public` au lieu de `atlas_core` (auth/atlas_core restreints). Comportement identique.

## Tests de recette au vert (transaction annulée)

Droit à 2 sièges sur `advist` :
- claim u2 → ok, reste 1 · claim u3 → ok, reste 0
- **claim u4 (3ᵉ/2) → refusé « quota de sieges atteint »** (R7)
- claim u2 répété → « siege deja actif » (idempotent, R6 étendu)
- release u2 puis claim u4 → ok, reste 0

## Reste de L4 : adaptation de l'application pilote — BLOQUÉ

L'app pilote (Advist ou CockpitJourney, décision #12) doit :
1. Appeler `claim_seat`/`release_seat` quand son admin active/désactive un collaborateur.
2. Utiliser `has_active_access()` dans ses RLS (le JWT accélère, ne fait pas foi — CDC 10.1).

**Dépendance bloquante** : Advist est keyé sur `public.organizations`, pas sur `public.tenants`. Le pont `organization ↔ tenant` (= `app_provisioning.tenant_id_externe`, CDC 3.9) n'existe pas encore — il relève de **L5** (`provision_subscription`). Le câblage app-side nécessite aussi le dépôt de l'app pilote.

→ Les RPC cœur sont livrées et prouvées ; l'intégration app pilote attend L5 (mapping org↔tenant) + accès au repo de l'app.
