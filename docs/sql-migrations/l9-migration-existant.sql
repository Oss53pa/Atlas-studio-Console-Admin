-- ============================================================
-- CDC v2.1 — Lot L9 (Partie 23) : migration de l'existant
-- Étape 4 : entitlements + seat_claims rétroactifs pour les abonnements actifs.
-- Étape 3 (partiel) : requalification plan:"test" -> essai.
--
-- Résolution du tenant : appartenance (tenant_members, fiable) PUIS email UNIQUE.
-- Les abonnements non résolus (email de facturation partagé / dev) NE sont PAS
-- migrés : ils sont listés pour arbitrage (mêmes cas D que la Phase 3 de L2 bis).
--
-- DRY-RUN PAR DÉFAUT : se termine par `rollback;`. Lire le rapport, puis
-- remplacer `rollback;` par `commit;`. Idempotent (skip si droit déjà présent).
-- ============================================================
begin;

create temp table if not exists l9_report (cas text, subscription_id uuid, app_id text, detail text) on commit drop;

-- ── Étape 3 : requalifier les anciens plan:"test" en essai (30 j si pas de terme) ──
update public.subscriptions
   set nature = coalesce(nature, 'essai'),
       date_fin = coalesce(date_fin, (coalesce(trial_ends_at, current_period_end, now() + interval '30 days'))::date)
 where plan = 'test' and status in ('active','trial');

-- ── Étape 4 : droits rétroactifs ──
do $$
declare r record; v_line uuid; v_ent uuid; v_nature text;
begin
  for r in
    select sub.id as sub_id, sub.user_id, sub.app_id, sub.status, coalesce(sub.is_granted,false) is_granted,
           greatest(coalesce(sub.seats_limit,1),1) seats, (sub.current_period_end)::date exp,
           coalesce(
             (select tm.tenant_id from public.tenant_members tm where tm.user_id=sub.user_id and tm.statut='actif' limit 1),
             (select t.id from public.tenants t join public.profiles p on p.id=sub.user_id and lower(trim(p.email))=lower(trim(t.billing_email))
                where 1=(select count(*) from public.tenants t2 where lower(trim(t2.billing_email))=lower(trim(t.billing_email))) limit 1)
           ) tenant_id
    from public.subscriptions sub where sub.status in ('active','trial')
  loop
    if r.tenant_id is null then
      insert into l9_report values ('non_resolu', r.sub_id, r.app_id, 'tenant non resolu (email partage/absent) — arbitrage manuel');
      continue;
    end if;
    if exists (select 1 from public.entitlements e where e.tenant_id=r.tenant_id and e.app_id=r.app_id and e.statut='actif') then
      insert into l9_report values ('deja_droit', r.sub_id, r.app_id, 'entitlement actif deja present');
      continue;
    end if;
    v_nature := case when r.status='trial' then 'essai' when r.is_granted then 'offert' else 'payant' end;
    update public.subscriptions set tenant_id=r.tenant_id,
        nature=coalesce(nature,v_nature), origine=coalesce(origine,'migration') where id=r.sub_id;
    insert into public.subscription_lines (subscription_id, app_id, quantite_sieges, statut_ligne)
      values (r.sub_id, r.app_id, r.seats, 'active') returning id into v_line;
    insert into public.entitlements (tenant_id, app_id, subscription_line_id, seats_limit, date_activation, date_expiration, statut)
      values (r.tenant_id, r.app_id, v_line, r.seats, current_date, r.exp, 'actif') returning id into v_ent;
    insert into public.seat_claims (entitlement_id, tenant_id, app_id, user_id, role_canonique, claimed_by_app)
      values (v_ent, r.tenant_id, r.app_id, r.user_id, 'proprietaire', 'migration') on conflict do nothing;
    insert into l9_report values ('migre', r.sub_id, r.app_id, v_nature);
  end loop;
end $$;

-- ── Revue ──
select cas, count(*) as nb from l9_report group by 1 order by 1;
select * from l9_report order by cas, app_id;

-- Après lecture : remplacer `rollback;` par `commit;`.
-- Les cas `non_resolu` se traitent en fixant d'abord l'appartenance (tenant_members),
-- puis en rejouant ce script (idempotent).
rollback;
