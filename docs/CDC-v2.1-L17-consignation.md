# CDC v2.1 — Lot L17 (bascule générale) : consignation

> 2026-07-31. Migration `l17_bascule_entitlement_sync`.

## Principe retenu : bascule par synchronisation automatique

Plutôt que de modifier les webhooks de paiement (risqué, et interdit dans la même livraison
que le flux d'octroi), la bascule se fait par **trigger sur `subscriptions`** : dès qu'un
abonnement passe `active` — **quel que soit le canal** (portail, webhook CinetPay/Stripe,
admin, migration) — le nouveau modèle se synchronise tout seul.

### Déployé (base)
- **`ensure_entitlement_for_subscription(sub_id)`** : idempotent, best-effort. Résout le tenant
  (`sub.tenant_id` → appartenance → email unique → **création** depuis le profil), garantit
  l'appartenance acheteur-admin, crée `subscription_line` + `entitlement` + siège propriétaire si absent.
- **Trigger `trg_sub_entitlement_sync`** (AFTER INSERT/UPDATE OF status) : appelle la fonction quand
  `status='active'`, **dans un bloc d'exception qui ne peut JAMAIS casser la transaction appelante**
  (le paiement aboutit même si la synchro échoue ; l'échec est un simple `warning`).

### Vérifié
Insertion d'un abonnement `active` → **1 entitlement auto-créé** (actif, sièges, siège propriétaire).
Invariants toujours à **0** après déploiement. Test en transaction annulée.

## Conséquences

- **Flux payant refactorisé de fait** : un nouveau paiement crée désormais un droit dans le nouveau
  modèle (avant L17, il ne créait qu'une licence legacy). Le client payant obtient un entitlement + siège.
- **Gel de `subscriptions` désormais optionnel** : la table peut rester ouverte en écriture (checkout
  portail, `SubscriptionsPage`) sans incohérence — le trigger resynchronise le modèle à chaque activation.
  Le gel strict (L9 étape 6) n'est plus bloquant pour la cohérence.

## Reste (livraisons séparées, règle Partie 25)

- **Retrait de `createLicenceAfterPayment`** des webhooks (cinetpay/stripe/payment) : la création de
  licence legacy est maintenant **redondante** avec les entitlements. À retirer dans une livraison
  dédiée au flux payant (repo site-vitrine), après recette.
- **Code mort** : l'octroi navigateur (console) a été retiré (L7) ; `createGrantedLicence` site-vitrine
  délègue au serveur (L9). Reste à auditer d'éventuels vieux chemins d'écriture licence/seat côté apps.
- **Recette compte interne** avant bascule définitive : le compte interne (Pamela) a déjà ses droits ;
  activer un abo de test sur un compte interne pour valider la chaîne complète en réel.

## Note annexe (bug pré-existant repéré, hors périmètre)

`SubscriptionsPage` (console) écrit `status='suspended'`/`'cancelled'`, or la contrainte
`subscriptions_status_check` n'autorise que `trialing|active|past_due|canceled|incomplete`
(« canceled » à un seul L). Ces actions échouent probablement déjà en prod — à corriger séparément.
