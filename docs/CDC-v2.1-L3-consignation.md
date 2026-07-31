# CDC v2.1 — Lot L3 (identité, jeton, révocation) : consignation

> Appliqué le 2026-07-30, projet `vgtmljfayiysuvrcmunt`. Migration `l3_identity_hook_and_has_active_access`.

## Déployé en base (vérifié)

| Objet | Rôle |
|---|---|
| `public.has_active_access(p_tenant_id uuid, p_app_code text)` | Double contrôle RLS applicatif : entitlement actif + non expiré + tenant non `suspendu`. À appeler par les politiques RLS des apps (CDC 9/10). |
| `public.custom_access_token_hook(event jsonb)` | Calcule les claims à l'émission du jeton : `tenant_ids`, `active_tenant_id`, `products[]` (**du compte actif uniquement**, jamais l'union — CDC 10.0), `tenant_role`. |

Grants : hook exécutable **uniquement** par `supabase_auth_admin` (révoqué de authenticated/anon/public). `has_active_access` exécutable par authenticated/service_role.

**Tests au vert** (transactions annulées) :
- Hook sur membre réel sans droit → `tenant_ids=[…]`, `active_tenant_id` défini, `tenant_role=proprietaire`, `products=[]`.
- Hook avec un entitlement `advist` → `products=["advist"]`, `has_active_access=true`.

## ⚠️ Étapes DASHBOARD indispensables (non faisables en SQL)

Tant que ces 2 réglages ne sont pas faits, **le hook existe mais n'est pas appelé** et le TTL reste à 1 h.

1. **Activer le hook** : Dashboard Supabase → **Authentication → Hooks → Custom Access Token** → sélectionner `public.custom_access_token_hook` → activer.
   Sans ça, aucun `tenant_ids`/`products` n'entre dans le JWT.
2. **TTL du jeton = 15 min** : Dashboard → **Authentication → Sessions / JWT** → *Access token expiry* = **900 s** (décision #4 / V6). Fenêtre maximale de révocation.

## Reste à câbler (lots ultérieurs)

- **Invalidation de session à la révocation** (CDC 10.1 §4) : toute révocation (suspension, résiliation, expiration, retrait de siège) doit appeler l'API admin Supabase (`auth.admin.signOut` / suppression de sessions) pour ne pas attendre l'expiration du jeton. À implémenter dans les flux L5 (provision/suspend).
- **RLS applicatives** : les apps doivent revérifier via `has_active_access()` (le JWT accélère, ne fait pas foi).
- **Sélecteur de compte portail** dès que `tenant_ids` > 1 (CDC 10.0), via `public.set_active_tenant()` + rafraîchissement de jeton.

## État global des lots

L0 ✅ · L1 ✅ (déploiement console en attente) · L2 ✅ · L2 bis Ph.0/2/3 ✅ · **L3 ✅ (2 réglages dashboard à faire)** · L4/L5 à venir.
