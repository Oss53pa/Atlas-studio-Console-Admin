import {
  aliased, asArr, asObj, asStr, Check, Field, JsonEditor, LABEL, Repeater, TagInput,
  type SectionData,
} from "./LandingKit";
import { readCta, readTrustBadges, writeCta, writeTrustBadges, type TrustBadge } from "./LandingSchema";

/* ══════════════════════════════════════════════════════════════════════════
   Éditeurs par section. Chaque éditeur couvre TOUTES les clés réellement
   présentes en base pour sa section ; les clés inconnues restent intactes
   (spread `...data`) et accessibles via l'onglet « JSON ».
   ══════════════════════════════════════════════════════════════════════════ */

export interface EditorProps {
  data: SectionData;
  set: (d: SectionData) => void;
}

/** Titre + sous-titre de section (features / pricing / testimonials / faq). */
function Headings({ data, set }: EditorProps) {
  return (
    <div className="grid md:grid-cols-2 gap-x-3">
      <Field label="Titre de section" value={asStr(data.title)} onChange={v => set({ ...data, title: v })} />
      <Field label="Sous-titre de section" value={asStr(data.subtitle)} onChange={v => set({ ...data, subtitle: v })} />
    </div>
  );
}

/** Couple libellé + URL d'un bouton. */
function CtaPair({ data, set, name, label }: EditorProps & { name: string; label: string }) {
  const cta = readCta(data, name);
  return (
    <div className="grid md:grid-cols-2 gap-x-3">
      <Field label={`${label} — libellé`} value={cta.text} onChange={v => set(writeCta(data, name, { ...cta, text: v }))} />
      <Field label={`${label} — URL`} value={cta.url} onChange={v => set(writeCta(data, name, { ...cta, url: v }))} mono
        placeholder="https://… ou #ancre" />
    </div>
  );
}

/* ── Hero ── */
export function HeroEditor({ data, set }: EditorProps) {
  const social = asObj(data.social_proof);
  const setSocial = (patch: Record<string, string>) => {
    const next = { ...social, ...patch };
    if (!next.count && !next.label) {
      const out = { ...data }; delete out.social_proof; set(out);
    } else set({ ...data, social_proof: next });
  };
  return (
    <>
      <Field label="Titre" value={asStr(data.title)} onChange={v => set({ ...data, title: v })} />
      <Field label="Sous-titre" value={asStr(data.subtitle)} onChange={v => set({ ...data, subtitle: v })} multi />
      <TagInput label="Mots tournants (animation du titre)" tags={asArr<string>(data.rotating_words)}
        onChange={v => set({ ...data, rotating_words: v })} />
      <TagInput label="Badges" tags={asArr<string>(data.badges)} onChange={v => set({ ...data, badges: v })} />
      <CtaPair data={data} set={set} name="cta_primary" label="Bouton principal" />
      <CtaPair data={data} set={set} name="cta_secondary" label="Bouton secondaire" />
      <TagInput label="Réassurance en ligne" tags={asArr<string>(data.trust_inline)}
        onChange={v => set({ ...data, trust_inline: v })} placeholder="Ex. Sans carte bancaire" />
      <div>
        <label className={LABEL}>Preuve sociale</label>
        <div className="grid md:grid-cols-2 gap-x-3">
          <Field label="Chiffre" value={asStr(social.count)} onChange={v => setSocial({ count: v })} placeholder="2 500+" />
          <Field label="Libellé" value={asStr(social.label)} onChange={v => setSocial({ label: v })} placeholder="entreprises satisfaites" />
        </div>
      </div>
    </>
  );
}

/* ── Chiffres clés ── */
export function StatsEditor({ data, set }: EditorProps) {
  const items = asArr<Record<string, unknown>>(data.items);
  return (
    <Repeater
      label="Chiffres" items={items} onChange={v => set({ ...data, items: v })}
      blank={() => ({ value: "", label: "", sub: "" })}
      addLabel="Ajouter un chiffre"
      title={(s, i) => asStr(s.value) || `Chiffre ${i + 1}`}
      render={(s, patch) => (
        <div className="grid md:grid-cols-3 gap-x-3">
          <Field label="Valeur" value={asStr(s.value)} onChange={v => patch({ value: v })} mono />
          <Field label="Libellé" value={asStr(s.label)} onChange={v => patch({ label: v })} />
          <Field label="Précision (optionnel)" value={asStr(s.sub)} onChange={v => patch({ sub: v })} />
        </div>
      )}
    />
  );
}

/* ── Fonctionnalités ── */
export function FeaturesEditor({ data, set }: EditorProps) {
  const items = asArr<Record<string, unknown>>(data.items);
  return (
    <>
      <Headings data={data} set={set} />
      <Repeater
        label="Fonctionnalités" items={items} onChange={v => set({ ...data, items: v })}
        blank={() => ({ title: "", description: "", icon: "" })}
        addLabel="Ajouter une fonctionnalité"
        title={(f, i) => asStr(f.title) || `Fonctionnalité ${i + 1}`}
        render={(f, patch) => {
          const desc = aliased(f, "description", "body", "text");
          return (
            <>
              <div className="grid md:grid-cols-2 gap-x-3">
                <Field label="Titre" value={asStr(f.title)} onChange={v => patch({ title: v })} />
                <Field label="Icône (nom Lucide)" value={asStr(f.icon)} onChange={v => patch({ icon: v })} mono
                  placeholder="FileText" hint="Voir lucide.dev/icons" />
              </div>
              <Field label="Description" value={desc.value} onChange={v => patch({ [desc.key]: v })} multi rows={2} />
            </>
          );
        }}
      />
    </>
  );
}

/* ── Tarifs ── */
export function PricingEditor({ data, set }: EditorProps) {
  const plans = asArr<Record<string, unknown>>(data.plans);
  const addOns = asArr<Record<string, unknown>>(data.add_ons);
  return (
    <>
      <Headings data={data} set={set} />
      <Repeater
        label="Offres" items={plans} onChange={v => set({ ...data, plans: v })}
        blank={() => ({ name: "", price: 0, currency: "FCFA", period: "mois", features: [], is_popular: false, cta_text: "", cta_url: "" })}
        addLabel="Ajouter une offre"
        title={(p, i) => asStr(p.name) || `Offre ${i + 1}`}
        render={(p, patch) => (
          <>
            <div className="grid md:grid-cols-4 gap-x-3">
              <Field label="Nom" value={asStr(p.name)} onChange={v => patch({ name: v })} />
              <Field label="Prix" value={asStr(p.price)} onChange={v => patch({ price: v === "" ? "" : Number(v.replace(/\s/g, "")) || 0 })} mono />
              <Field label="Devise" value={asStr(p.currency) || "FCFA"} onChange={v => patch({ currency: v })} mono />
              <Field label="Période" value={asStr(p.period)} onChange={v => patch({ period: v })} placeholder="mois" />
            </div>
            <Field label="Accroche (optionnel)" value={aliased(p, "description", "tagline").value}
              onChange={v => patch({ [aliased(p, "description", "tagline").key]: v })} multi rows={2} />
            <div className="grid md:grid-cols-2 gap-x-3">
              <Field label="Bouton — libellé" value={asStr(p.cta_text)} onChange={v => patch({ cta_text: v })} />
              <Field label="Bouton — URL" value={asStr(p.cta_url)} onChange={v => patch({ cta_url: v })} mono />
            </div>
            <TagInput label="Inclus dans l'offre" tags={asArr<string>(p.features)} onChange={v => patch({ features: v })} />
            <Check checked={!!p.is_popular} onChange={v => patch({ is_popular: v })} label="Offre mise en avant" />
          </>
        )}
      />
      <Repeater
        label="Options / modules additionnels" items={addOns} onChange={v => set({ ...data, add_ons: v })}
        blank={() => ({ name: "", price: 0, period: "mois" })}
        addLabel="Ajouter une option"
        title={(a, i) => asStr(a.name) || `Option ${i + 1}`}
        render={(a, patch) => (
          <div className="grid md:grid-cols-3 gap-x-3">
            <Field label="Nom" value={asStr(a.name)} onChange={v => patch({ name: v })} />
            <Field label="Prix" value={asStr(a.price)} onChange={v => patch({ price: v === "" ? "" : Number(v.replace(/\s/g, "")) || 0 })} mono />
            <Field label="Période" value={asStr(a.period)} onChange={v => patch({ period: v })} placeholder="mois" />
          </div>
        )}
      />
    </>
  );
}

/* ── Témoignages ── */
export function TestimonialsEditor({ data, set }: EditorProps) {
  const items = asArr<Record<string, unknown>>(data.items);
  return (
    <>
      <Headings data={data} set={set} />
      <Field label="Note globale affichée (optionnel)" value={asStr(data.rating)}
        onChange={v => set({ ...data, rating: v === "" ? "" : Number(v) || v })} mono placeholder="4.8" />
      <Repeater
        label="Témoignages" items={items} onChange={v => set({ ...data, items: v })}
        blank={() => ({ name: "", role: "", company: "", text: "", avatar: "", rating: 5 })}
        addLabel="Ajouter un témoignage"
        title={(t, i) => asStr(t.name) || `Témoignage ${i + 1}`}
        render={(t, patch) => {
          const verbatim = aliased(t, "text", "quote");
          const avatar = aliased(t, "avatar", "initials");
          return (
            <>
              <div className="grid md:grid-cols-3 gap-x-3">
                <Field label="Nom" value={asStr(t.name)} onChange={v => patch({ name: v })} />
                <Field label="Fonction" value={asStr(t.role)} onChange={v => patch({ role: v })} />
                <Field label="Société" value={asStr(t.company)} onChange={v => patch({ company: v })} />
              </div>
              <Field label="Verbatim" value={verbatim.value} onChange={v => patch({ [verbatim.key]: v })} multi />
              <div className="grid md:grid-cols-2 gap-x-3 items-start">
                <Field label="Avatar (initiales ou URL)" value={avatar.value} onChange={v => patch({ [avatar.key]: v })}
                  placeholder="AK" />
                <div className="mb-3">
                  <label className={LABEL}>Note</label>
                  <div className="flex gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button" aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                        onClick={() => patch({ rating: n === Number(t.rating) ? 0 : n })}
                        className={`w-6 h-6 text-lg leading-none ${n <= (Number(t.rating) || 0) ? "text-p-accent" : "text-p-border"}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          );
        }}
      />
    </>
  );
}

/* ── FAQ ── */
export function FaqEditor({ data, set }: EditorProps) {
  const items = asArr<Record<string, unknown>>(data.items);
  return (
    <>
      <Headings data={data} set={set} />
      <Repeater
        label="Questions" items={items} onChange={v => set({ ...data, items: v })}
        blank={() => ({ question: "", answer: "" })}
        addLabel="Ajouter une question"
        title={(f, i) => aliased(f, "question", "q").value || `Question ${i + 1}`}
        render={(f, patch) => {
          const q = aliased(f, "question", "q");
          const a = aliased(f, "answer", "a");
          return (
            <>
              <Field label="Question" value={q.value} onChange={v => patch({ [q.key]: v })} />
              <Field label="Réponse" value={a.value} onChange={v => patch({ [a.key]: v })} multi />
            </>
          );
        }}
      />
    </>
  );
}

/* ── CTA final ── */
export function CtaEditor({ data, set }: EditorProps) {
  const badges = readTrustBadges(data.trust_badges);
  return (
    <>
      <Field label="Titre" value={asStr(data.title)} onChange={v => set({ ...data, title: v })} />
      <Field label="Sous-titre" value={asStr(data.subtitle)} onChange={v => set({ ...data, subtitle: v })} multi />
      <div className="grid md:grid-cols-2 gap-x-3">
        <Field label="Bouton — libellé" value={asStr(data.cta_text)} onChange={v => set({ ...data, cta_text: v })} />
        <Field label="Bouton — URL" value={asStr(data.cta_url)} onChange={v => set({ ...data, cta_url: v })} mono />
      </div>
      <Repeater<TrustBadge>
        label="Badges de réassurance" items={badges}
        onChange={v => set({ ...data, trust_badges: writeTrustBadges(v) })}
        blank={() => ({ icon: "", label: "" })}
        addLabel="Ajouter un badge"
        title={(b, i) => b.label || `Badge ${i + 1}`}
        render={(b, patch) => (
          <div className="grid md:grid-cols-2 gap-x-3">
            <Field label="Libellé" value={b.label} onChange={v => patch({ label: v })} />
            <Field label="Icône Lucide (optionnel)" value={b.icon} onChange={v => patch({ icon: v })} mono placeholder="ShieldCheck" />
          </div>
        )}
      />
    </>
  );
}

/* ── SEO ── */
export function SeoEditor({ data, set }: EditorProps) {
  return (
    <>
      <div className="grid md:grid-cols-2 gap-x-3">
        <Field label="Meta title" value={asStr(data.metaTitle)} onChange={v => set({ ...data, metaTitle: v })}
          hint="60 caractères max recommandés" />
        <Field label="URL canonique" value={asStr(data.canonical)} onChange={v => set({ ...data, canonical: v })} mono />
      </div>
      <Field label="Meta description" value={asStr(data.metaDescription)} onChange={v => set({ ...data, metaDescription: v })}
        multi hint="155 caractères max recommandés" />
      <div className="grid md:grid-cols-2 gap-x-3">
        <Field label="Mots-clés" value={asStr(data.keywords)} onChange={v => set({ ...data, keywords: v })} />
        <Field label="Image Open Graph" value={asStr(data.ogImage)} onChange={v => set({ ...data, ogImage: v })} mono />
      </div>
      <Check checked={!!data.noindex} onChange={v => set({ ...data, noindex: v })} label="Interdire l'indexation (noindex)" />
    </>
  );
}

/* ── Section sans éditeur dédié : JSON brut ── */
export function GenericEditor({ data, set }: EditorProps) {
  return (
    <>
      <p className="mb-3 text-xs text-p-muted">
        Aucun formulaire dédié pour cette section — édition directe du contenu JSON.
      </p>
      <JsonEditor data={data} onChange={set} />
    </>
  );
}

export const EDITORS: Record<string, React.FC<EditorProps>> = {
  hero: HeroEditor,
  stats: StatsEditor,
  features: FeaturesEditor,
  pricing: PricingEditor,
  testimonials: TestimonialsEditor,
  faq: FaqEditor,
  cta: CtaEditor,
  seo: SeoEditor,
};
