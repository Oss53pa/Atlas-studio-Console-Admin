-- ============================================================================
-- Branding — complément pour les 4 apps qui n'en avaient pas
-- ----------------------------------------------------------------------------
-- atlas-people, cockpit-cr, cockpit-projet et wedo n'avaient ni accent_deep,
-- ni accent_soft, ni wordmark_url : les emails d'authentification et le portail
-- retombaient sur les valeurs par défaut pour ces quatre apps.
--
-- Palette dérivée de l'accent déjà en base (colonne `color`), selon la règle
-- observée sur les 7 apps déjà brandées :
--   accent_deep = même teinte, luminosité × 0,75
--   accent_soft = accent mélangé au blanc à 86 %
-- Contrôle : la règle reproduit les paires existantes à moins de 13/255 par
-- canal (sauf advist, dont la palette vient de l'échelle indigo de Tailwind).
--
-- cockpit-cr partage exactement l'accent d'advist (#4F46E5) : on aligne sa
-- palette sur celle d'advist plutôt que d'appliquer la formule, pour éviter deux
-- variantes foncées différentes pour un même accent.
--
-- À APPLIQUER sur le projet Supabase partagé (celui qui héberge public.apps).
-- Statut : les deux étapes ont été exécutées le 2026-08-07 sur la base partagée
-- (11 apps, 0 sans accents, 0 sans wordmark). Le script reste rejouable tel quel.
-- ============================================================================

-- ── Étape 1 — accents (applicable immédiatement, aucune dépendance externe) ──
UPDATE public.apps AS a SET
  accent_deep = v.deep,
  accent_soft = v.soft,
  updated_at  = now()
FROM (VALUES
  ('atlas-people',   '#975E0D', '#F7EDDE'),
  ('cockpit-cr',     '#4338CA', '#EEF2FF'),  -- aligné sur advist (même accent)
  ('cockpit-projet', '#0B1F38', '#DDE1E6'),
  ('wedo',           '#A77B25', '#F9F2E4')
) AS v(app_id, deep, soft)
WHERE a.id = v.app_id;

-- ── Étape 2 — wordmarks ─────────────────────────────────────────────────────
-- Prérequis : les fichiers wm-atlas-people, wm-cockpit-cr, wm-cockpit-projet et
-- wm-wedo (.svg, .png, @2x.png) doivent être présents dans public/wordmarks/ sur
-- la branche `main` — les URL pointent sur jsDelivr @main, qui ne sert que ce qui
-- est sur main. Exécutée avant que les assets y soient, cette étape produirait des
-- images cassées dans les emails d'auth, soit une régression par rapport à une
-- colonne NULL (qui a un repli propre).
--
-- Ce prérequis est rempli depuis la PR #7 (merge 88b88c7) : les assets sont sur
-- main et cette étape a été exécutée dans la foulée. Sur une base neuve, elle se
-- rejoue telle quelle, juste après l'étape 1.
UPDATE public.apps AS a SET
  wordmark_url = 'https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/'
                 || v.wm || '.png',
  updated_at   = now()
FROM (VALUES
  ('atlas-people',   'wm-atlas-people'),
  ('cockpit-cr',     'wm-cockpit-cr'),
  ('cockpit-projet', 'wm-cockpit-projet'),
  ('wedo',           'wm-wedo')
) AS v(app_id, wm)
WHERE a.id = v.app_id;

-- Contrôle — doit renvoyer 0, 0, 11
-- SELECT count(*) FILTER (WHERE accent_deep IS NULL OR accent_soft IS NULL) AS sans_accents,
--        count(*) FILTER (WHERE wordmark_url IS NULL)                       AS sans_wordmark,
--        count(*)                                                           AS total
-- FROM public.apps;
