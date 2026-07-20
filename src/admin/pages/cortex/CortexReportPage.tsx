import { useMemo, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { formatFcfa } from "../../../lib/money";
import {
  useCortexDashboard, useCortexPortfolio, useCortexCanvas,
  useCortexMilestones, useCortexCosts, useCortexScenarios, useCortexProjections, useCortexDeals,
} from "./hooks";
import type { BlockType, BpProfile, CanvasItem } from "./types";
import { Select, CLASS_LABEL, LIFECYCLE, MILESTONE_STATUS } from "./ui";
import { buildBusinessPlanPdf, bpFilename, type BpSection } from "./bpPdf";
import "./cortex.css";

/* RG-11 — chaque profil de destinataire n'ouvre que les sections autorisées.
   La whitelist est explicite : rien ne fuit par défaut. */
type Section =
  | "synthese" | "couts_synthese" | "portefeuille" | "canvas"
  | "pipeline_nominatif" | "pipeline_agrege" | "jalons" | "finance"
  | "couts_detail" | "couts_prives";

const WHITELIST: Record<BpProfile, Section[]> = {
  complet: ["synthese", "couts_synthese", "portefeuille", "canvas", "pipeline_nominatif", "jalons", "finance", "couts_detail", "couts_prives"],
  banquier: ["synthese", "couts_synthese", "portefeuille", "pipeline_agrege", "jalons", "finance", "couts_detail"],
  partenaire: ["synthese", "portefeuille", "canvas", "jalons"],
};
const PROFILE_NOTE: Record<BpProfile, string> = {
  complet: "Document interne — contient les coûts privés et le pipeline nominatif.",
  banquier: "Dossier de financement — finances et jalons ; pipeline agrégé, coûts privés exclus.",
  partenaire: "Présentation partenaire — modèle et feuille de route ; aucune donnée financière détaillée.",
};
const BLOCK_LABEL: Record<BlockType, string> = {
  partners: "Partenaires clés", activities: "Activités clés", resources: "Ressources clés",
  value_prop: "Proposition de valeur", relations: "Relations clients", channels: "Canaux",
  segments: "Segments de clientèle", costs: "Structure de coûts", revenues: "Flux de revenus",
};

export default function CortexReportPage() {
  const [profile, setProfile] = useState<BpProfile>("complet");
  const [scenarioId, setScenarioId] = useState<string>("");

  const { data: kpi } = useCortexDashboard();
  const { rows: apps } = useCortexPortfolio();
  const { blocks } = useCortexCanvas();               // canvas global
  const { rows: milestones } = useCortexMilestones();
  const { rows: costs } = useCortexCosts();
  const { rows: deals } = useCortexDeals();
  const { rows: scenarios } = useCortexScenarios();
  const { rows: projections } = useCortexProjections(scenarioId || undefined);

  const allow = (s: Section) => WHITELIST[profile].includes(s);
  const today = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  // Coûts : le profil décide si les lignes « owner_only » sortent du document.
  const visibleCosts = useMemo(
    () => costs.filter((c) => allow("couts_prives") || !c.owner_only),
    [costs, profile], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const costByCategory = useMemo(() => {
    const m = new Map<string, number>();
    visibleCosts.forEach((c) => m.set(c.category, (m.get(c.category) ?? 0) + c.amount_fcfa));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [visibleCosts]);
  const pipelineWeighted = useMemo(
    () => deals.filter((d) => !["client", "perdu"].includes(d.stage))
               .reduce((s, d) => s + Math.round((d.expected_mrr_fcfa * d.probability_bp) / 10000), 0),
    [deals],
  );

  /** Assemble le PDF à partir des mêmes données — et des mêmes filtres — que
   *  l'aperçu à l'écran : une seule décision de confidentialité, deux rendus. */
  const downloadPdf = () => {
    const sections: BpSection[] = [];

    if (allow("synthese") && kpi) {
      const rows: string[][] = [
        ["Applications au portefeuille", String(kpi.apps_total)],
        ["Applications en production", String(kpi.apps_live)],
        ["Revenu récurrent constaté", formatFcfa(kpi.mrr_real_fcfa)],
        ["Clients actifs", String(kpi.active_clients)],
        ["Pipeline pondéré", formatFcfa(kpi.pipeline_weighted_fcfa)],
        ["Affaires ouvertes", String(kpi.pipeline_open_deals)],
        ["Jalons à échéance sous 30 jours", String(kpi.milestones_due_30d)],
      ];
      if (allow("couts_synthese")) rows.push(["Coûts du mois en cours", formatFcfa(kpi.costs_month_fcfa)]);
      sections.push({ heading: "1. Synthèse", head: ["Indicateur", "Valeur"], rows });
    }

    if (allow("portefeuille")) {
      sections.push({
        heading: "2. Portefeuille d'applications",
        head: ["Application", "Stade", "Classe", "Marchés"],
        rows: apps.map((a) => [
          a.name, LIFECYCLE[a.lifecycle_stage], CLASS_LABEL[a.strategic_class],
          (a.target_market ?? []).join(", ") || "-",
        ]),
      });
    }

    if (allow("canvas")) {
      const filled = blocks.filter((b) => (b.items ?? []).length > 0);
      if (filled.length > 0) {
        sections.push({
          heading: "3. Modèle économique",
          bullets: filled.map((b) => ({
            label: BLOCK_LABEL[b.block_type],
            items: (b.items as CanvasItem[]).map((it) => it.label + (it.detail ? ` — ${it.detail}` : "")),
          })),
        });
      }
    }

    if (allow("pipeline_nominatif")) {
      sections.push({
        heading: "4. Pipeline commercial",
        head: ["Prospect", "Segment", "Étape", "MRR attendu", "Prob."],
        rows: deals.map((d) => [
          d.prospect_name, d.segment ?? "-", d.stage,
          formatFcfa(d.expected_mrr_fcfa), `${(d.probability_bp / 100).toFixed(0)} %`,
        ]),
      });
    } else if (allow("pipeline_agrege")) {
      const open = deals.filter((d) => !["client", "perdu"].includes(d.stage)).length;
      sections.push({
        heading: "4. Pipeline commercial (agrégé)",
        text: `${open} affaire(s) en cours, pour un MRR pondéré de ${formatFcfa(pipelineWeighted)}. `
          + "L'identité des prospects n'est pas divulguée dans ce profil de document.",
      });
    }

    if (allow("finance") && scenarioId && projections.length > 0) {
      sections.push({
        heading: "5. Projections financières",
        breakBefore: true,
        text: `Scénario « ${scenarios.find((s) => s.id === scenarioId)?.name} » — il s'agit d'une projection `
          + "fondée sur des hypothèses de travail, et non d'un engagement.",
        head: ["Mois", "Clients actifs", "MRR", "Coûts"],
        rows: projections.map((p) => [
          `M+${p.month_index}`, String(p.active_customers),
          formatFcfa(p.mrr_fcfa), formatFcfa(p.costs_fcfa),
        ]),
      });
    }

    if (allow("couts_detail") && costByCategory.length > 0) {
      sections.push({
        heading: "6. Structure de coûts",
        head: ["Catégorie", "Montant cumulé"],
        rows: costByCategory.map(([cat, amt]) => [cat, formatFcfa(amt)]),
        text: !allow("couts_prives") && costs.some((c) => c.owner_only)
          ? "Certaines lignes à caractère personnel sont exclues de ce profil de document."
          : undefined,
      });
    }

    if (allow("jalons") && milestones.length > 0) {
      sections.push({
        heading: "7. Feuille de route",
        head: ["Jalon", "Catégorie", "Échéance", "Statut"],
        rows: milestones.map((m) => [
          m.title, m.category,
          m.target_date ? new Date(m.target_date).toLocaleDateString("fr-FR") : "-",
          MILESTONE_STATUS[m.status],
        ]),
      });
    }

    buildBusinessPlanPdf({ profile, generatedOn: today, sections }).save(bpFilename(profile));
  };

  return (
    <div data-module="cortex">
      <div className="cps-noprint">
        <AdminPageHeader title="Business plan" subtitle="Cortex — document généré à partir des données du module (RG-11)">
          <div className="flex items-center gap-2">
            <Select value={profile} onChange={(e) => setProfile(e.target.value as BpProfile)}
              options={[["complet", "Profil : complet (interne)"], ["banquier", "Profil : banquier"], ["partenaire", "Profil : partenaire"]]} />
            <Select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}
              options={[["", "Scénario : aucun"], ...scenarios.map((s) => [s.id, `Scénario : ${s.name}`] as [string, string])]} />
            <button className="cps-btn" onClick={downloadPdf}><Download size={15} /> Télécharger le PDF</button>
          </div>
        </AdminPageHeader>

        <div className="flex items-start gap-2 mb-5 p-3 rounded-xl bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5">
          <ShieldCheck size={16} className="cps-accent mt-0.5 shrink-0" />
          <p className="text-[13px] text-admin-muted">{PROFILE_NOTE[profile]}</p>
        </div>
      </div>

      {/* ── Document ──────────────────────────────────────────────────────── */}
      <div id="cps-bp" className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-8 shadow-sm max-w-4xl mx-auto space-y-8">
        <header className="cps-bp-section border-b border-warm-border dark:border-white/10 pb-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-admin-muted">Atlas Studio</p>
          <h1 className="text-2xl font-bold text-admin-text mt-1">Business plan — {profile === "complet" ? "document interne" : profile === "banquier" ? "dossier de financement" : "présentation partenaire"}</h1>
          <p className="text-[13px] text-admin-muted mt-1">Généré le {today} · données Cortex</p>
        </header>

        {allow("synthese") && kpi && (
          <section className="cps-bp-section">
            <H>1. Synthèse</H>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi label="Applications" value={String(kpi.apps_total)} sub={`${kpi.apps_live} en production`} />
              <Kpi label="MRR réel" value={formatFcfa(kpi.mrr_real_fcfa)} sub={`${kpi.active_clients} client(s) actif(s)`} />
              <Kpi label="Pipeline pondéré" value={formatFcfa(kpi.pipeline_weighted_fcfa)} sub={`${kpi.pipeline_open_deals} affaire(s)`} />
              {allow("couts_synthese")
                ? <Kpi label="Coûts du mois" value={formatFcfa(kpi.costs_month_fcfa)} sub="toutes catégories" />
                : <Kpi label="Jalons à 30 j" value={String(kpi.milestones_due_30d)} sub="échéances proches" />}
            </div>
          </section>
        )}

        {allow("portefeuille") && (
          <section className="cps-bp-section">
            <H>2. Portefeuille d'applications</H>
            <Table head={["Application", "Stade", "Classe", "Marchés"]}
              rows={apps.map((a) => [
                a.name,
                LIFECYCLE[a.lifecycle_stage],
                CLASS_LABEL[a.strategic_class],
                (a.target_market ?? []).join(", ") || "—",
              ])} />
          </section>
        )}

        {allow("canvas") && blocks.length > 0 && (
          <section className="cps-bp-section">
            <H>3. Modèle économique</H>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blocks.filter((b) => (b.items ?? []).length > 0).map((b) => (
                <div key={b.id}>
                  <h4 className="text-[12px] font-bold uppercase tracking-wide text-admin-muted mb-1">{BLOCK_LABEL[b.block_type]}</h4>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {(b.items as CanvasItem[]).map((it, i) => (
                      <li key={i} className="text-[13px] text-admin-text">{it.label}{it.detail ? ` — ${it.detail}` : ""}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {allow("pipeline_nominatif") && (
          <section className="cps-bp-section">
            <H>4. Pipeline commercial</H>
            <Table head={["Prospect", "Segment", "Étape", "MRR attendu", "Prob."]}
              rows={deals.map((d) => [
                d.prospect_name, d.segment ?? "—", d.stage,
                formatFcfa(d.expected_mrr_fcfa), `${(d.probability_bp / 100).toFixed(0)} %`,
              ])} />
          </section>
        )}
        {allow("pipeline_agrege") && (
          <section className="cps-bp-section">
            <H>4. Pipeline commercial (agrégé)</H>
            <p className="text-[13px] text-admin-text">
              {deals.filter((d) => !["client", "perdu"].includes(d.stage)).length} affaire(s) en cours,
              pour un MRR pondéré de <strong>{formatFcfa(pipelineWeighted)}</strong>.
              L'identité des prospects n'est pas divulguée dans ce profil de document.
            </p>
          </section>
        )}

        {allow("finance") && scenarioId && projections.length > 0 && (
          <section className="cps-bp-section cps-bp-break">
            <H>5. Projections financières</H>
            <p className="text-[12px] text-admin-muted mb-2">
              Scénario « {scenarios.find((s) => s.id === scenarioId)?.name} » — projection, non un engagement (RG-12).
            </p>
            <Table head={["Mois", "Clients actifs", "MRR", "Coûts"]}
              rows={projections.map((p) => [
                `M+${p.month_index}`, String(p.active_customers),
                formatFcfa(p.mrr_fcfa), formatFcfa(p.costs_fcfa),
              ])} />
          </section>
        )}

        {allow("couts_detail") && costByCategory.length > 0 && (
          <section className="cps-bp-section">
            <H>6. Structure de coûts</H>
            <Table head={["Catégorie", "Montant cumulé"]}
              rows={costByCategory.map(([cat, amt]) => [cat, formatFcfa(amt)])} />
            {!allow("couts_prives") && costs.some((c) => c.owner_only) && (
              <p className="text-[11px] text-admin-muted mt-2 italic">
                Certaines lignes à caractère personnel sont exclues de ce profil de document.
              </p>
            )}
          </section>
        )}

        {allow("jalons") && milestones.length > 0 && (
          <section className="cps-bp-section">
            <H>7. Feuille de route</H>
            <Table head={["Jalon", "Catégorie", "Échéance", "Statut"]}
              rows={milestones.map((m) => [
                m.title, m.category,
                m.target_date ? new Date(m.target_date).toLocaleDateString("fr-FR") : "—",
                MILESTONE_STATUS[m.status],
              ])} />
          </section>
        )}

        <footer className="cps-bp-section pt-4 border-t border-warm-border dark:border-white/10">
          <p className="text-[11px] text-admin-muted">
            Document généré automatiquement depuis Cortex — Atlas Studio. Les projections sont des hypothèses
            de travail et ne constituent ni une garantie ni un engagement contractuel.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ── Petits composants de mise en page ──────────────────────────────────── */
const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-[15px] font-bold text-admin-text mb-3 pb-1 border-b border-warm-border dark:border-white/10">{children}</h2>
);

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-warm-border dark:border-white/10 rounded-xl p-3">
      <p className="text-[11px] uppercase tracking-wide text-admin-muted">{label}</p>
      <p className="text-lg font-bold text-admin-text money mt-0.5">{value}</p>
      {sub && <p className="text-[11px] text-admin-muted">{sub}</p>}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (rows.length === 0) return <p className="text-[13px] text-admin-muted italic">Aucune donnée.</p>;
  return (
    <table className="w-full text-[12.5px] border-collapse">
      <thead>
        <tr className="text-admin-muted text-[11px] uppercase tracking-wide">
          {head.map((h) => <th key={h} className="text-left font-semibold pb-1.5 border-b border-warm-border dark:border-white/10">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-warm-border/60 dark:border-white/5">
            {r.map((c, j) => <td key={j} className="py-1.5 pr-3 text-admin-text align-top">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
