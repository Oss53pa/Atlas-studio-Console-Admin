# CDC v2.1 — Lot L8 (Communications : preuve de délivrance, Envoyer/Renvoyer) : consignation

> 2026-07-31.

## Déployé

**Base** :
- `l8_admin_read_policies` : policies `is_admin()` de **lecture** sur `message_deliveries`, `entitlements`, `seat_claims`, `subscription_lines`, `app_provisioning`, `tenant_members` (CADMIN lit tous les tenants ; écriture toujours service_role only).
- `l8_queue_access_resend` : RPC `public.queue_access_resend(subscription_id) → uuid` (admin-gated via `is_admin()`) — insère une ligne d'outbox `acces_accorde` chaînée (`renvoi_de`) et renvoie son id.

**Edge Function `resend-webhook`** (v1, ACTIVE, verify_jwt=false) :
- Reçoit les événements Resend (Svix), **vérifie la signature** (`RESEND_WEBHOOK_SECRET`).
- Met à jour `message_deliveries` par `provider_message_id` : `email.delivered`→remis, `opened`→ouvert, `clicked`→cliqué, `bounced`→rebond_dur, `complained`→plainte (+ timestamps). Anti-rétrogradation de statut.

**Console** — onglet **Communications** dans la fiche client (`ClientsPage`) :
- Liste des `message_deliveries` du client (badges de statut : En attente / Envoyé / **Remis** / Ouvert / Cliqué / Rebond / Échec), canal, destinataire, horodatage, erreur.
- **« Voir le message »** → visionneuse `iframe sandbox` du `corps_snapshot` (pièce opposable).
- **« Renvoyer »** → `queue_access_resend` (RPC) puis `dispatch-access-messages?id=<msg>` (mode déjà existant, aucun redéploiement du worker).

## Les trois niveaux de preuve (Partie 15.2)

Envoyé (accepté par Resend) < **Remis** (accepté par le serveur destinataire = seule vraie preuve) < Ouvert/Cliqué (indicatif). Les statuts remontent via `resend-webhook`.

## Vérifications

- Typecheck console au vert ; dev server sans erreur.
- Migrations appliquées ; `resend-webhook` ACTIVE.
- Non exécuté end-to-end (pas d'email réel émis → pas d'événement Resend à recevoir).

## Étape dashboard requise (côté toi)

Dans **Resend → Webhooks** : ajouter l'endpoint `${SUPABASE_URL}/functions/v1/resend-webhook`, activer les événements `email.delivered/opened/clicked/bounced/complained`, et mettre le secret dans le secret Supabase **`RESEND_WEBHOOK_SECRET`** (`whsec_...`). Sans ça, les statuts restent à « Envoyé » (le webhook refuse faute de signature… ou accepte non vérifié si le secret est absent).

## Reste

- Front console à **build/déployer**.
- « Envoyer les accès » depuis le **détail abonnement** (vs Renvoyer depuis Communications) : couvert par le même mécanisme, bouton à ajouter côté abonnement si besoin.
- WhatsApp/SMS = L12.
