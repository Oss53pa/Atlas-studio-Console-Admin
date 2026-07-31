-- ============================================================
-- CDC v2.1 Complément 1 — L2 bis, Phase 3 : peuplement de tenant_members
-- Source de vérité : public.tenants (décision du 2026-07-30).
-- Idempotent (on conflict do nothing) et rejouable.
--
-- DRY-RUN PAR DÉFAUT : le script se termine par `rollback;`. Il n'écrit RIEN.
-- Pour appliquer : lire le rapport affiché, puis remplacer `rollback;` par `commit;`.
--
-- Ne crée QUE les liens prouvés (cas C : email unique des deux côtés).
-- Les cas D (email partagé) et F (email sans profil) sont LISTÉS, jamais liés :
-- ils relèvent d'un arbitrage manuel dans CADMIN (« Comptes sans propriétaire »).
-- ============================================================
begin;

create temp table if not exists l2bis_report (cas text, tenant_id uuid, email text, raison text) on commit drop;

-- ---- Cas C : email de facturation unique des deux côtés, aucun membre existant ----
with cible as (
  select t.id as tenant_id, p.id as user_id
  from public.tenants t
  join public.profiles p on lower(trim(p.email)) = lower(trim(t.billing_email))
  where t.billing_email is not null and t.billing_email <> ''
    and 1 = (select count(*) from public.tenants t2 where lower(trim(t2.billing_email)) = lower(trim(t.billing_email)))
    and 1 = (select count(*) from public.profiles p2 where lower(trim(p2.email)) = lower(trim(p.email)))
    and not exists (select 1 from public.tenant_members m where m.tenant_id = t.id)
)
insert into public.tenant_members
  (tenant_id, user_id, role_canonique, statut, est_acheteur_admin, accepte_le, source_migration)
select tenant_id, user_id, 'proprietaire', 'actif', true, now(), 'email'
from cible
on conflict do nothing;

-- ---- Cas D : email de facturation partagé par plusieurs comptes -> arbitrage manuel ----
insert into l2bis_report
select 'D', t.id, t.billing_email, 'email de facturation partage par plusieurs comptes'
from public.tenants t
where t.billing_email in (
        select billing_email from public.tenants
        where billing_email is not null group by 1 having count(*) > 1)
  and not exists (select 1 from public.tenant_members m where m.tenant_id = t.id);

-- ---- Cas F : aucun profil ne correspond (ou pas d'email) -> aucun membre ----
insert into l2bis_report
select 'F', t.id, t.billing_email, 'aucun profil ne correspond a l email de facturation'
from public.tenants t
where not exists (select 1 from public.tenant_members m where m.tenant_id = t.id)
  and not exists (select 1 from public.profiles p where lower(trim(p.email)) = lower(trim(t.billing_email)));

-- ---- Revue avant validation ----
select cas, count(*) as nb from l2bis_report group by 1 order by 1;
select * from l2bis_report order by cas, email;
select count(*) as membres_total, count(*) filter (where source_migration = 'email') as dont_source_email
from public.tenant_members;

-- Cas H (abonnement actif sans membre) : NON calculable — public.subscriptions n'a pas
-- de tenant_id. Le rattachement abonnement -> tenant est défini par L5 (provision_subscription).

-- ============================================================
-- Après lecture du rapport ci-dessus :
--   * tout est cohérent  -> remplacer `rollback;` par `commit;`
--   * doute              -> laisser `rollback;`, arbitrer les cas D/F, rejouer
-- ============================================================
rollback;
