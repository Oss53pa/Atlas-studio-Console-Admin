# CDC v2.1 — Lot L6 (communication, canal email) : consignation

> Déployé le 2026-07-30. Edge Function `dispatch-access-messages` (v1, ACTIVE, verify_jwt=false).
> Source : repo site-vitrine `supabase/functions/dispatch-access-messages/index.ts`.

## Ce que fait le lot

Le **service d'envoi générique** qui vide l'outbox `message_deliveries` et envoie enfin
l'email d'accès — la notification que le client ne recevait jamais.

- Lit `message_deliveries` `statut='en_attente'`, `modele='acces_accorde'` (ou une ligne ciblée via `?id=`).
- Pour chaque message : reconstruit le contenu depuis l'abonnement (`subscription_id` → apps, plans, sièges, échéance, n° abonnement, tenant), **génère le lien de définition de mot de passe côté serveur** (`auth.admin.generateLink`), rend l'email et l'envoie via Resend.
- Écrit la preuve : `statut='envoye'`, `provider_message_id`, **`corps_snapshot` = HTML exact envoyé** (pièce opposable), `envoye_le`, `destinataire`.
- Reprise : `tentatives` incrémenté, `statut='echec'` après 5 essais (CDC Partie 8).

**Générique (Principe : « aucun codage en dur d'une application »)** : les apps, noms, `external_url` sont lus depuis la table `apps`. Un seul message par octroi listant toutes les apps (CDC 15.4).

**Gabarit** (Partie 15.4) : papier crème, wordmark « Atlas Studio » en Grand Hotel, accent or `#EF9F27`, bloc récap (type d'accès, échéance, code client, n° abonnement), un bloc par app avec bouton « Ouvrir » → `external_url`, CTA or « Définir mon mot de passe » (lien 7 j), lien espace client, version texte brut jointe. Expéditeur `acces@atlas-studio.org`.

## Autorisation

`verify_jwt=false` ; la fonction autorise elle-même : **service role** (cron) OU **admin** (déclenchement manuel L8). Vérifié : appel sans jeton → **HTTP 401**.

## Non fait / à faire

- **Envoi réel non testé end-to-end** (éviter d'emailer un vrai client sans accord). → faire un test contrôlé sur une adresse maîtrisée via `?id=<msg>`.
- **Déclencheur** (cron d'auto-drain, ou bouton « Envoyer/Renvoyer » CADMIN) = **L8**. Tant qu'il n'existe pas, l'outbox n'est vidée que sur appel explicite.
- **Secret** : `ACCESS_EMAIL_FROM` (défaut `Atlas Studio <acces@atlas-studio.org>`) — vérifier que l'adresse est autorisée sur le domaine Resend (domaine `atlas-studio.org` déjà vérifié). `RESEND_API_KEY`/`SITE_URL` déjà présents.
- **Câblage amont** : CADMIN « Offrir » doit appeler `provision_subscription` (L5) pour que des lignes `acces_accorde` arrivent dans l'outbox.
- **WhatsApp/SMS** = L12 (ici canal email seulement, conforme au périmètre L6).
