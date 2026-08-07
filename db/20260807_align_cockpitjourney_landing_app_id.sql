-- ============================================================================
-- Alignement de l'app_id du contenu de landing de CockpitJourney
-- ----------------------------------------------------------------------------
-- APPLIQUÉE sur le projet Supabase partagé (migration Supabase :
-- align_cockpitjourney_landing_app_id). Fichier conservé pour traçabilité.
--
-- public.apps, public.subscriptions et db/20260727_apps_branding.sql
-- identifient l'application « cockpit-journey » ; seul
-- public.app_landing_content stockait ses 7 sections sous « cockpitjourney ».
-- Le contenu apparaissait donc orphelin dans la Console Admin (écran
-- « Landing Pages »), sans nom, couleur ni URL de marque.
--
-- Contexte de sûreté au moment de l'exécution : aucune clé étrangère sur la
-- table, contrainte UNIQUE (app_id, section), 7 lignes source et 0 ligne
-- « cockpit-journey » préexistante — donc aucune collision possible.
-- ============================================================================

UPDATE public.app_landing_content
SET app_id = 'cockpit-journey'
WHERE app_id = 'cockpitjourney';

-- Rollback :
-- UPDATE public.app_landing_content
-- SET app_id = 'cockpitjourney'
-- WHERE app_id = 'cockpit-journey';
