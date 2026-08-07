import {
  BarChart3, CreditCard, HelpCircle, LayoutDashboard, Megaphone,
  MessageSquareQuote, Search, Sparkles, type LucideIcon,
} from "lucide-react";
import { asObj, asStr, type SectionData } from "./LandingKit";

/* ══════════════════════════════════════════════════════════════════════════
   Schéma des sections d'une landing page (table public.app_landing_content).
   `sort_order` reproduit l'ordre d'affichage réel sur le site public.
   ══════════════════════════════════════════════════════════════════════════ */

export interface SectionMeta {
  key: string;
  label: string;
  icon: LucideIcon;
  order: number;
  /** Rendue dans l'aperçu (le SEO n'a pas de rendu visuel). */
  previewable: boolean;
}

export const SECTIONS: SectionMeta[] = [
  { key: "hero", label: "Hero", icon: LayoutDashboard, order: 1, previewable: true },
  { key: "stats", label: "Chiffres clés", icon: BarChart3, order: 2, previewable: true },
  { key: "features", label: "Fonctionnalités", icon: Sparkles, order: 3, previewable: true },
  { key: "pricing", label: "Tarifs", icon: CreditCard, order: 4, previewable: true },
  { key: "testimonials", label: "Témoignages", icon: MessageSquareQuote, order: 5, previewable: true },
  { key: "faq", label: "FAQ", icon: HelpCircle, order: 6, previewable: true },
  { key: "cta", label: "CTA final", icon: Megaphone, order: 7, previewable: true },
  { key: "seo", label: "SEO (métadonnées)", icon: Search, order: 99, previewable: false },
];

export const sectionMeta = (key: string): SectionMeta =>
  SECTIONS.find(s => s.key === key) ?? { key, label: key, icon: Sparkles, order: 50, previewable: false };

/* ══════════════════════════════════════════════════════════════════════════
   Liens CTA — normalisation.

   La base stocke `cta_primary: { text, url }`. L'ancien éditeur lisait et
   écrivait `cta_primary_text` / `cta_primary_url` : les champs s'affichaient
   donc toujours vides et un enregistrement dupliquait la donnée en clés
   plates que le site public n'utilise pas. On lit les deux formes et on
   n'écrit plus que la forme objet (en purgeant les clés plates héritées).
   ══════════════════════════════════════════════════════════════════════════ */

export interface CtaLink { text: string; url: string }

export function readCta(data: SectionData, key: string): CtaLink {
  const o = asObj(data[key]);
  return {
    text: asStr(o.text || data[`${key}_text`]),
    url: asStr(o.url || data[`${key}_url`]),
  };
}

export function writeCta(data: SectionData, key: string, next: CtaLink): SectionData {
  const out = { ...data };
  delete out[`${key}_text`];
  delete out[`${key}_url`];
  if (!next.text && !next.url) {
    delete out[key];
    return out;
  }
  out[key] = { ...asObj(data[key]), text: next.text, url: next.url };
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   Badges de confiance — la base mélange deux formes :
     "Sans engagement"                         (advist)
     { icon: "ShieldCheck", label: "RLS…" }    (cockpitjourney)
   On édite toujours { icon, label } et on réécrit une chaîne quand aucune
   icône n'est renseignée, pour préserver la forme d'origine.
   ══════════════════════════════════════════════════════════════════════════ */

export interface TrustBadge { icon: string; label: string }

export const readTrustBadges = (v: unknown): TrustBadge[] =>
  (Array.isArray(v) ? v : []).map(b =>
    typeof b === "string" ? { icon: "", label: b } : { icon: asStr(asObj(b).icon), label: asStr(asObj(b).label) },
  );

export const writeTrustBadges = (badges: TrustBadge[]): (string | TrustBadge)[] =>
  badges.map(b => (b.icon ? { icon: b.icon, label: b.label } : b.label));
