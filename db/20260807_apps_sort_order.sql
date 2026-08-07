-- ============================================================================
-- Ordre d'affichage du catalogue — renumérotation de public.apps.sort_order
-- ----------------------------------------------------------------------------
-- Problème corrigé : deux paires d'apps partagent la même valeur de sort_order
--   sort_order = 3 → advist, cockpit-fa
--   sort_order = 4 → atlasbanx, cockpit-journey
-- La console et le site trient uniquement sur sort_order : à valeur égale,
-- l'ordre des cartes n'est pas déterministe et peut varier d'un chargement à
-- l'autre.
--
-- Correctif : renumérotation par pas de 10, en conservant l'ordre actuel
-- (sort_order, puis id pour départager les doublons). Le pas de 10 permet
-- d'insérer une app entre deux autres sans tout renuméroter.
--
-- À APPLIQUER sur le projet Supabase partagé (celui qui héberge public.apps).
--   supabase db execute -f db/20260807_apps_sort_order.sql
-- ============================================================================

BEGIN;

WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY sort_order, id) * 10 AS rang
  FROM public.apps
)
UPDATE public.apps AS a
SET sort_order = r.rang,
    updated_at = now()
FROM ranked AS r
WHERE a.id = r.id
  AND a.sort_order IS DISTINCT FROM r.rang;

-- Garde-fou : plus aucun doublon ne doit subsister.
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM (
    SELECT sort_order FROM public.apps GROUP BY sort_order HAVING count(*) > 1
  ) d;
  IF n > 0 THEN
    RAISE EXCEPTION 'sort_order encore en doublon sur % valeur(s)', n;
  END IF;
END $$;

COMMIT;

-- Contrôle
-- SELECT id, name, sort_order, visible FROM public.apps ORDER BY sort_order;

-- ----------------------------------------------------------------------------
-- Optionnel — empêcher durablement les doublons. À n'activer qu'après la
-- renumérotation ci-dessus, et en sachant que la console écrit sort_order
-- librement : une saisie en conflit sera alors rejetée avec une erreur.
-- ----------------------------------------------------------------------------
-- CREATE UNIQUE INDEX IF NOT EXISTS apps_sort_order_key ON public.apps (sort_order);
