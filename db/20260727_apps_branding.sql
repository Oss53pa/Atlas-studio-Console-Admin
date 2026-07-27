-- ============================================================================
-- Branding par app — colonnes de palette + wordmark sur public.apps
-- ----------------------------------------------------------------------------
-- À APPLIQUER sur le projet Supabase PARTAGÉ des apps Atlas Studio
-- (celui qui héberge public.apps, lu par la Console Admin et le portail).
--
-- Source unique du branding : ces colonnes sont éditées depuis la Console Admin
-- (écran « Grille Tarifaire & Applications ») et consommées par :
--   - le template email d'authentification (wordmark + accent) ;
--   - le portail (nom / couleur) ;
--   - la resync raw_user_meta_data (app, app_accent, app_wordmark).
-- ============================================================================

ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS accent_deep  text;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS accent_soft  text;
ALTER TABLE public.apps ADD COLUMN IF NOT EXISTS wordmark_url text;

COMMENT ON COLUMN public.apps.color        IS 'Accent de marque (hex). Ex: #235A6E';
COMMENT ON COLUMN public.apps.accent_deep  IS 'Variante foncée de l''accent (hex, optionnel).';
COMMENT ON COLUMN public.apps.accent_soft  IS 'Teinte claire pour tuiles/chips (hex, optionnel).';
COMMENT ON COLUMN public.apps.wordmark_url IS 'URL de l''image wordmark Grand Hotel (png), servie via CDN.';

-- Seed des valeurs (palette issue des dépôts des apps ; Advist à confirmer).
-- Le wordmark_url pointe sur les assets hébergés dans ce dépôt (jsDelivr @main).
UPDATE public.apps AS a SET
  color        = v.accent,
  accent_deep  = v.deep,
  accent_soft  = v.soft,
  wordmark_url = 'https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks/' || v.wm || '.png'
FROM (VALUES
  ('cockpit-journey', '#6E8B58', '#52693F', '#EEF4E9', 'wm-cockpit-journey'),
  ('cockpit-fa',      '#C97A5A', '#A85638', '#F6EAE3', 'wm-cockpit-fa'),
  ('atlas-compta',    '#235A6E', '#1B4655', '#E7EFF1', 'wm-atlas-compta'),
  ('tablesmart',      '#C0A24E', '#9A7E30', '#F5EFDD', 'wm-tablesmart'),
  ('atlasbanx',       '#C29A4B', '#8A6E2E', '#F4ECD4', 'wm-atlasbanx'),
  ('taxpilot',        '#0F766E', '#0B544E', '#DCF0EC', 'wm-taxpilot'),
  ('advist',          '#3E5C8A', '#2E4568', '#E7ECF4', 'wm-advist')  -- ⚠️ accent Advist à confirmer
) AS v(app_id, accent, deep, soft, wm)
WHERE a.id = v.app_id;
