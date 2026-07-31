# CDC v2.1 — Lot L11 (facturation DGI) : consignation

> 2026-07-31. Migration `l11_billing_dgi_scaffold`. **⚠️ SQUELETTE — pas de conformité fiscale.**

## Périmètre livré : scaffold uniquement

Conformément à la Partie 34.2, la conformité fiscale (taux de TVA, certification DGI :
numéro, QR, signature) **ne peut pas être produite sans un fiscaliste + l'API de certification
DGI**. Ce lot pose la **structure** prête à recevoir cette intégration. Rien ici n'est
opposable fiscalement tant que le worker de certification et la validation fiscaliste ne sont pas branchés.

### Base (additif, appliqué)
- **`country_config`** : devise + TVA + libellé identifiant fiscal par pays. 5 pays semés
  (CI/SN/BJ/CM/GA) ; **seul CI marqué `valide_fiscaliste=true`** (18%, usuel — à confirmer).
  Les autres taux sont des placeholders `valide_fiscaliste=false`.
- **`invoices`** + colonnes certification : `type_document` (facture|attestation),
  `certification_statut` (brouillon|a_certifier|certifiee|rejetee|annulee), `certification_number`,
  `certification_qr`, `certification_signature`, `certified_at`, `certification_erreur`, `exercice`,
  `legal_entity_id`, `montant_ht`, `tva_taux`, `tva_montant`.
- **`invoice_lines`**, **`credit_notes`** (avoirs : référencent une facture, motif fermé), RLS lecture admin.
- **`invoice_counters`** + **`next_invoice_number(entity, exercice, type)`** : numérotation
  **continue, sans trou, par entité émettrice + exercice** (`FA-2026-00001`, `ATT-2026-00001`). Vérifié.
- **`submit_invoice_for_certification(invoice_id)`** : met la facture en file `a_certifier` ;
  **les attestations 0 FCFA (offert/essai) NE sont PAS certifiées** (document interne). Vérifié.

## Ce qui MANQUE (bloqué sur entrées externes)

1. **Worker de certification DGI** (Edge Function) : appelle l'API DGI, stocke numéro/QR/signature,
   gère la file avec reprise, passe `a_certifier → certifiee|rejetee`. Nécessite **identifiants API DGI**.
2. **Validation fiscaliste** : taux de TVA par pays, régimes d'exonération, retenue à la source,
   format exact du numéro normalisé, mentions légales obligatoires.
3. **Génération des factures** au provisioning payant (create invoice + lines + TVA) — à câbler dans
   le flux payant (webhooks) et/ou `provision_subscription` pour nature payant.
4. **PDF conforme** (mentions légales, QR de certification).
5. **Avoirs** : workflow d'émission + certification (même exigence DGI).

## Invariant lié

Partie 21 #13 (« aucune facture `a_certifier` depuis > 24 h ») : à ajouter à `check_invariants()`
une fois le worker en place (aujourd'hui toujours 0, aucune facture certifiable).

## Décisions requises (toi + fiscaliste)

- API DGI : fournisseur, identifiants, environnement de test (comme Atlas Lease).
- Taux/régimes par pays à valider (`country_config.valide_fiscaliste`).
- Entité(s) juridique(s) émettrice(s) et leur numérotation.
