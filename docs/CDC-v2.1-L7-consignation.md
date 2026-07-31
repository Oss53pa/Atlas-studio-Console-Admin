# CDC v2.1 — Lot L7 (formulaire d'octroi unifié CADMIN) : consignation

> 2026-07-31. Edge Function `admin-grant` (v1) + composant console `GrantAccessModal`.

## Ce que fait le lot

Remplace les deux flux navigateur « Accès test » (FlaskConical) + « Offrir un abonnement » (Gift)
par **un seul flux serveur** conforme au Principe 2 (aucune écriture droit côté navigateur).

### Serveur — Edge Function `admin-grant` (site-vitrine, ACTIVE, verify_jwt=true, admin only)
Orchestration pour un client existant :
1. résout / crée le tenant (`public.tenants`, par `billing_email`) ;
2. garantit l'appartenance **acheteur-admin** (`tenant_members`, upsert service role) ;
3. appelle le moteur unique **`provision_subscription()`** (idempotency key, `attribue_par` = admin) ;
4. si `notify` : déclenche `dispatch-access-messages` (L6) pour l'email d'accès.

Body : `{ profile_id, nature, motif_attribution, duree_jours, environnement?, lignes:[{application_code, plan_code, sieges}], notify }`.

### Console — `src/admin/components/GrantAccessModal.tsx`
Formulaire unifié (CDC 7.3) : contexte client · **nature** (essai/offert/interne/partenaire) · **motif** (obligatoire ≥ 20 car. si nature ≠ payant, avec compteur) · **applications multi-sélection** + plan + **sièges par app** · **durée** · **case « envoyer l'email d'accès »**. Appelle `admin-grant`, affiche le n° d'abonnement et l'état d'envoi.

Câblage `ClientsPage` : un seul bouton **« Donner accès »** (icône Gift) par ligne, ouvre la modale. Ancien code d'octroi navigateur (handlers, state, modales test/offrir, imports `licenceGeneration`, `useAuth`) **supprimé** (code mort).

## Vérifications

- **Typecheck** console au vert (`tsc --noEmit`).
- Serveur dev démarre, **aucune erreur console/serveur**, app rendue (page login). Page Clients derrière auth → click-through non testé ici.
- `admin-grant` déployée ACTIVE, admin-gated.
- Flux non exécuté en prod (pas d'octroi réel + email vers un vrai client sans accord).

## Reste / à savoir

- **Non poussé en git** (comme demandé). Le front console doit être **buildé + déployé** (Vercel) pour être actif en prod.
- **Réglages dashboard L3** (activer le hook, TTL 900s) toujours requis pour que `current_tenant()`/`claim_seat` marchent en prod.
- `admin-clients` (recentrage 7.1 : ne plus créer d'essai) = livraison séparée à venir.
- Le formulaire couvre l'essentiel de 7.3 ; les blocs avancés (surcharges quotas/fonctionnalités, entités juridiques, pré-invitations, aperçu du mail, seuils d'approbation) restent à ajouter (L7+ / L8).
- Test de bout en bout recommandé : octroi sur un **compte interne** puis vérifier entitlements + email (compte `interne` avant toute bascule, règle Partie 25).
