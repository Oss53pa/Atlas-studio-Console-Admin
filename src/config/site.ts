/**
 * URL publique du site vitrine Atlas Studio.
 * La console est indépendante mais reliée au site ; les liens « Retour au site »
 * et les redirections non-admin pointent ici. Surchargée par VITE_SITE_URL si défini.
 */
export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://atlas-studio.org';
