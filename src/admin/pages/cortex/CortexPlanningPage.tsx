import { useState } from "react";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { useCortexMilestones, useCortexAssumptions } from "./hooks";
import type { CpsMilestone, CpsAssumption, MilestoneStatus, MilestoneCategory, AssumptionStatus, AssumptionDomain, Criticality } from "./types";
import { Badge, CpsModal, Field, Input, Textarea, Select, MILESTONE_STATUS, ASSUMPTION_STATUS, CRITICALITY, assumptionTone } from "./ui";
import "./cortex.css";

const M_CAT: [MilestoneCategory, string][] = [["juridique", "Juridique"], ["produit", "Produit"], ["commercial", "Commercial"], ["financier", "Financier"], ["equipe", "Équipe"]];
const A_DOM: [AssumptionDomain, string][] = [["pricing", "Pricing"], ["demande", "Demande"], ["canal", "Canal"], ["cout", "Coût"], ["reglementaire", "Réglementaire"], ["tech", "Tech"]];
const critTone: Record<Criticality, string> = { bloquante: "red", majeure: "amber", mineure: "gray" };
const mStatusTone: Record<MilestoneStatus, string> = { a_venir: "gray", en_cours: "blue", atteint: "green", glisse: "amber", abandonne: "red" };

export default function CortexPlanningPage() {
  const ms = useCortexMilestones();
  const as = useCortexAssumptions();
  const toast = useToast();
  const [mEdit, setMEdit] = useState<Partial<CpsMilestone> | null>(null);
  const [aEdit, setAEdit] = useState<Partial<CpsAssumption> | null>(null);

  // hypothèses : bloquantes non testées d'abord (Mur de vérité)
  const wallOrder = { bloquante: 0, majeure: 1, mineure: 2 } as Record<Criticality, number>;
  const assumptions = [...as.rows].sort((a, b) =>
    (wallOrder[a.criticality] - wallOrder[b.criticality]) ||
    (a.status === "a_tester" ? -1 : 1));

  const saveM = async () => {
    if (!mEdit?.title) { toast.error("Titre obligatoire"); return; }
    try { (mEdit as any).id ? await ms.update((mEdit as any).id, mEdit) : await ms.create(mEdit); toast.success("Jalon enregistré"); setMEdit(null); }
    catch (e: any) { toast.error(e.message); }
  };
  const saveA = async () => {
    if (!aEdit?.statement) { toast.error("Énoncé obligatoire"); return; }
    try { (aEdit as any).id ? await as.update((aEdit as any).id, aEdit) : await as.create(aEdit); toast.success("Hypothèse enregistrée"); setAEdit(null); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Jalons & Hypothèses" subtitle="Cortex — exécution & mur de vérité" />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Jalons */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-admin-text">Jalons stratégiques</h2>
            <button className="cps-btn" onClick={() => setMEdit({ category: "produit", status: "a_venir" })}><Plus size={14} /> Jalon</button>
          </div>
          <div className="space-y-2">
            {ms.rows.length === 0 && <div className="text-sm text-admin-muted py-6 text-center bg-white dark:bg-admin-surface rounded-xl border border-warm-border dark:border-white/5">Aucun jalon.</div>}
            {ms.rows.map((m: CpsMilestone) => (
              <button key={m.id} onClick={() => setMEdit({ ...(m as any) })} className="w-full text-left bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-3 hover:border-[var(--cps-accent)] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-admin-text text-sm">{m.title}</span>
                  <Badge tone={mStatusTone[m.status]}>{MILESTONE_STATUS[m.status]}</Badge>
                </div>
                <div className="text-[11px] text-admin-muted mt-1">{M_CAT.find(([v]) => v === m.category)?.[1]}{m.target_date ? ` · ${m.target_date}` : ""}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Mur de vérité */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-admin-text">Mur de vérité — hypothèses</h2>
            <button className="cps-btn" onClick={() => setAEdit({ domain: "demande", criticality: "majeure", status: "a_tester" })}><Plus size={14} /> Hypothèse</button>
          </div>
          <div className="space-y-2">
            {assumptions.length === 0 && <div className="text-sm text-admin-muted py-6 text-center bg-white dark:bg-admin-surface rounded-xl border border-warm-border dark:border-white/5">Aucune hypothèse.</div>}
            {assumptions.map((a: CpsAssumption) => (
              <button key={a.id} onClick={() => setAEdit({ ...(a as any) })} className={"w-full text-left bg-white dark:bg-admin-surface border rounded-xl p-3 hover:border-[var(--cps-accent)] transition-colors " + (a.criticality === "bloquante" && a.status === "a_tester" ? "border-red-300 dark:border-red-500/40" : "border-warm-border dark:border-white/5")}>
                <div className="text-sm text-admin-text">{a.statement}</div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge tone={critTone[a.criticality]}>{CRITICALITY[a.criticality]}</Badge>
                  <Badge tone={assumptionTone[a.status]}>{ASSUMPTION_STATUS[a.status]}</Badge>
                  <span className="text-[11px] text-admin-muted">{A_DOM.find(([v]) => v === a.domain)?.[1]}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {mEdit && (
        <CpsModal title={(mEdit as any).id ? "Modifier le jalon" : "Nouveau jalon"} onClose={() => setMEdit(null)}
          footer={<><button className="cps-btn cps-btn-ghost" onClick={() => setMEdit(null)}>Annuler</button><button className="cps-btn" onClick={saveM}>Enregistrer</button></>}>
          <Field label="Titre"><Input value={mEdit.title ?? ""} onChange={(e) => setMEdit({ ...mEdit, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie"><Select value={mEdit.category} onChange={(e) => setMEdit({ ...mEdit, category: e.target.value as MilestoneCategory })} options={M_CAT} /></Field>
            <Field label="Statut"><Select value={mEdit.status} onChange={(e) => setMEdit({ ...mEdit, status: e.target.value as MilestoneStatus })} options={Object.entries(MILESTONE_STATUS)} /></Field>
            <Field label="Échéance"><Input type="date" value={mEdit.target_date ?? ""} onChange={(e) => setMEdit({ ...mEdit, target_date: e.target.value })} /></Field>
          </div>
          <Field label="Critère de succès"><Textarea value={mEdit.success_criteria ?? ""} onChange={(e) => setMEdit({ ...mEdit, success_criteria: e.target.value })} /></Field>
        </CpsModal>
      )}

      {aEdit && (
        <CpsModal title={(aEdit as any).id ? "Modifier l'hypothèse" : "Nouvelle hypothèse"} onClose={() => setAEdit(null)}
          footer={<><button className="cps-btn cps-btn-ghost" onClick={() => setAEdit(null)}>Annuler</button><button className="cps-btn" onClick={saveA}>Enregistrer</button></>}>
          <Field label="Énoncé"><Textarea value={aEdit.statement ?? ""} onChange={(e) => setAEdit({ ...aEdit, statement: e.target.value })} placeholder="Les cabinets comptables CI paieront ≥ 35 000 FCFA/mois pour LiassPilot" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Domaine"><Select value={aEdit.domain} onChange={(e) => setAEdit({ ...aEdit, domain: e.target.value as AssumptionDomain })} options={A_DOM} /></Field>
            <Field label="Criticité"><Select value={aEdit.criticality} onChange={(e) => setAEdit({ ...aEdit, criticality: e.target.value as Criticality })} options={Object.entries(CRITICALITY)} /></Field>
            <Field label="Statut"><Select value={aEdit.status} onChange={(e) => setAEdit({ ...aEdit, status: e.target.value as AssumptionStatus })} options={Object.entries(ASSUMPTION_STATUS)} /></Field>
          </div>
          <Field label="Méthode de test"><Input value={aEdit.test_method ?? ""} onChange={(e) => setAEdit({ ...aEdit, test_method: e.target.value })} placeholder="pilote, entretiens, LP + ads…" /></Field>
        </CpsModal>
      )}
    </div>
  );
}
