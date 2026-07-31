# CDC v2.1 — Lot L5 (moteur de provisioning) : consignation

> Appliqué le 2026-07-30. Migrations `l5_schema_provision_prereqs`, `l5_provision_subscription_engine`.

## Choix d'architecture

`provision_subscription` est une **fonction Postgres `SECURITY DEFINER`** (pas une Edge Function) : la Partie 8 exige « transaction unique, toute erreur → ROLLBACK intégral », ce qui est natif en plpgsql. Les Edge Functions / CADMIN l'appellent en RPC. Les effets externes (Phase C : emails, provisioning réel) lisent les outbox `message_deliveries` et `app_provisioning`.

## Déployé en base (vérifié)

**Schéma additif** :
- `subscriptions` + colonnes `tenant_id, nature, origine, motif_attribution, numero, date_debut, date_fin, attribue_par, converti_depuis` (existants `is_granted/granted_by/seats_limit` conservés en miroir).
- `idempotency_keys` (clé + hash payload + réponse).
- `app_provisioning` (3.9) + RLS.
- séquence `subscriptions_numero_seq` (numéros `ABO-2026-NNNNN`).

**`public.provision_subscription(p_payload jsonb) → jsonb`** :
- **Phase A** (aucune écriture) : idempotence ; tenant existe/non archivé ; nature valide ; motif ≥ 20 car. si nature ≠ payant ; durée > 0 (sauf interne) ; ≥ 1 ligne ; apps connues ; pas de doublon d'app ; **aucun entitlement actif déjà existant** (règle 6). Renvoie la **liste complète** des erreurs.
- **Phase B** (transactionnelle) : tenant prospect→actif ; abonnement (numéro, nature, origine, motif, miroir is_granted) ; 1 `subscription_line` + 1 `entitlement` par app ; **auto-consommation d'un siège pour l'acheteur-admin** ; `app_provisioning` en_attente ; **1 message `acces_accorde` en outbox** (un seul par octroi, CDC 15.4) ; audit `activity_log` ; stockage idempotence.

Grant : `authenticated` + `service_role`.

## Recette au vert (transaction annulée)

| Scénario | Résultat |
|---|---|
| R4 — essai 30 j, 2 apps, sièges | ok, `ABO-2026-00001`, 2 entitlements, 2 sièges auto, 1 msg, 2 provisioning |
| E1 — rejeu même idempotency_key | même `subscription_id`, aucun doublon |
| E9 — re-octroi d'une app déjà active | refus « entitlement actif déjà existant » |
| Validation — motif court | **liste complète** des erreurs (motif + double droit) |

## Reste de L5 / suites (app-side, non fait ici)

1. **Recentrage `admin-clients`** (CDC 7.1) : arrêter la création d'abonnement d'essai. Edge Function (repo site-vitrine), livraison séparée.
2. **Câblage CADMIN** : le flux « Offrir » (`handleGrantSubscriptions`, aujourd'hui inserts navigateur) doit appeler `provision_subscription`. Remplace le formulaire « Accès test » + « Offrir » par le formulaire unifié (Partie 7.3).
3. **Phase C worker** (L6/L8) : lire `message_deliveries` en_attente → rendre le gabarit d'accès + envoyer (Resend/WhatsApp) ; lire `app_provisioning` en_attente → provisionner l'espace app + remplir `tenant_id_externe` (pont org↔tenant).
4. **Sémantique catalogue** : `apps.status = 'available'` (≠ 'production') → aligner le garde-fou de vendabilité.
5. **Feature flag** + garder l'ancien chemin actif jusqu'à preuve d'inutilité (règle de déploiement Partie 25).
