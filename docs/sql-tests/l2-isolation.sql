-- ============================================================
-- Test d'isolation RLS — Lot L2 (CDC v2.1, Partie 18.8)
-- Prouve qu'un tenant ne lit jamais les entitlements d'un autre.
-- Transactionnel et auto-annulé : le RAISE EXCEPTION final rollback tout le seed.
-- Attendu : a_voit_son_droit=1 a_voit_droit_de_B=0 b_voit_son_droit=1 b_voit_droit_de_A=0
--
-- Remplacer ua/ub par deux id de profiles réels (avec email renseigné) avant exécution :
--   select id, email from public.profiles where email is not null limit 2;
-- ============================================================
do $$
declare
  ua uuid := '00000000-0000-0000-0000-000000000000';  -- profil A (à remplacer)
  ub uuid := '00000000-0000-0000-0000-000000000001';  -- profil B (à remplacer)
  ea text; eb text;
  ta uuid := gen_random_uuid(); tb uuid := gen_random_uuid();
  sa uuid := gen_random_uuid(); sb uuid := gen_random_uuid();
  la uuid := gen_random_uuid(); lb uuid := gen_random_uuid();
  a_own int; a_other int; b_own int; b_other int;
begin
  select email into ea from public.profiles where id = ua;
  select email into eb from public.profiles where id = ub;

  insert into public.tenants (id, name, slug, billing_email, status, country, currency)
    values (ta,'TEST A','test-a-'||substr(ta::text,1,8), ea,'active','CI','XOF'),
           (tb,'TEST B','test-b-'||substr(tb::text,1,8), eb,'active','CI','XOF');
  insert into public.subscriptions (id, user_id, app_id, plan, status, price_at_subscription)
    values (sa, ua,'advist','test','active',0),(sb, ub,'advist','test','active',0);
  insert into public.subscription_lines (id, subscription_id, app_id, quantite_sieges)
    values (la, sa,'advist',1),(lb, sb,'advist',1);
  insert into public.entitlements (tenant_id, app_id, subscription_line_id, seats_limit)
    values (ta,'advist',la,1),(tb,'advist',lb,1);

  perform set_config('request.jwt.claims', json_build_object('sub', ua)::text, true);
  perform set_config('request.jwt.claim.sub', ua::text, true);
  set local role authenticated;
  select count(*) filter (where tenant_id = ta), count(*) filter (where tenant_id = tb)
    into a_own, a_other from public.entitlements;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', ub)::text, true);
  perform set_config('request.jwt.claim.sub', ub::text, true);
  set local role authenticated;
  select count(*) filter (where tenant_id = tb), count(*) filter (where tenant_id = ta)
    into b_own, b_other from public.entitlements;
  reset role;

  raise exception 'ISO_TEST a_voit_son_droit=% a_voit_droit_de_B=% b_voit_son_droit=% b_voit_droit_de_A=%',
    a_own, a_other, b_own, b_other;
end $$;
