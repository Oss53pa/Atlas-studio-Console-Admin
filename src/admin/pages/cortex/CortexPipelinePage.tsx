import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { formatFcfa, parseFcfa, bpToPct, pctToBp } from "../../../lib/money";
import { useCortexDeals, useCortexPortfolio } from "./hooks";
import type { CpsDeal, DealStage, DealOrigin } from "./types";
import { Badge, Provenance, CpsModal, Field, Input, Select, DEAL_STAGE, dealTone } from "./ui";
import "./cortex.css";

const ORIGINS: [DealOrigin, string][] = [
  ["reseau_perso", "Réseau perso"], ["cosmos_terrain", "Cosmos terrain"],
  ["inbound", "Inbound"], ["partenaire", "Partenaire"], ["autre", "Autre"],
];
const emptyDeal: Partial<CpsDeal> = { prospect_name: "", stage: "contact", origin: "reseau_perso", expected_mrr_fcfa: 0, probability_bp: 0 };

export default function CortexPipelinePage() {
  const { rows, loading, error, create, update } = useCortexDeals();
  const { rows: apps } = useCortexPortfolio();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<CpsDeal> | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!edit?.prospect_name) { toast.error("Nom du prospect obligatoire"); return; }
    setSaving(true);
    try {
      const payload = { ...edit, app_id: edit.app_id || null };
      if ((edit as any).id) await update((edit as any).id, payload);
      else await create(payload);
      toast.success("Deal enregistré"); setEdit(null);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    setSaving(false);
  };

  const appName = (id: string | null) => apps.find((a) => a.id === id)?.name ?? "—";

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Pipeline commercial" subtitle={`Cortex — ${rows.length} deals`}>
        <button className="cps-btn" onClick={() => setEdit({ ...emptyDeal })}><Plus size={15} /> Nouveau deal</button>
      </AdminPageHeader>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 920 }}>
            <thead>
              <tr className="text-left text-admin-muted border-b border-warm-border dark:border-white/5" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <th className="px-4 py-3 font-medium">Prospect</th>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium">Étape</th>
                <th className="px-4 py-3 font-medium text-right">MRR attendu</th>
                <th className="px-4 py-3 font-medium text-right">Prob.</th>
                <th className="px-4 py-3 font-medium">Origine</th>
                <th className="px-4 py-3 font-medium">Prochaine action</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-admin-muted">Chargement…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-admin-muted">Aucun deal. Ajoute ton premier prospect.</td></tr>}
              {rows.map((r: CpsDeal) => (
                <tr key={r.id} className="border-b border-warm-border/60 dark:border-white/5 hover:bg-warm-bg/40 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-admin-text">{r.prospect_name}</div>
                    <div className="text-[11px] text-admin-muted">{r.segment ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 text-admin-muted">{appName(r.app_id)}</td>
                  <td className="px-4 py-3"><Badge tone={dealTone[r.stage as DealStage]}>{DEAL_STAGE[r.stage as DealStage]}</Badge></td>
                  <td className="px-4 py-3 text-right"><span className="money font-semibold">{formatFcfa(r.expected_mrr_fcfa, { compact: true })}</span> <Provenance source={r.source} /></td>
                  <td className="px-4 py-3 text-right money">{bpToPct(r.probability_bp)}%</td>
                  <td className="px-4 py-3 text-[12px] text-admin-muted">{ORIGINS.find(([v]) => v === r.origin)?.[1]}</td>
                  <td className="px-4 py-3 text-[12px] text-admin-text">{r.next_action ?? "—"}<div className="text-admin-muted">{r.next_action_date ?? ""}</div></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setEdit({ ...(r as any) })} className="text-admin-muted hover:cps-accent"><Pencil size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <CpsModal title={(edit as any).id ? "Modifier le deal" : "Nouveau deal"} onClose={() => setEdit(null)}
          footer={<>
            <button className="cps-btn cps-btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
            <button className="cps-btn" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</button>
          </>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prospect"><Input value={edit.prospect_name ?? ""} onChange={(e) => setEdit({ ...edit, prospect_name: e.target.value })} /></Field>
            <Field label="Application"><Select value={edit.app_id ?? ""} onChange={(e) => setEdit({ ...edit, app_id: e.target.value })} options={[["", "—"], ...apps.map((a) => [a.id, a.name] as [string, string])]} /></Field>
            <Field label="Segment"><Input value={edit.segment ?? ""} onChange={(e) => setEdit({ ...edit, segment: e.target.value })} placeholder="cabinet comptable" /></Field>
            <Field label="Étape"><Select value={edit.stage} onChange={(e) => setEdit({ ...edit, stage: e.target.value as DealStage })} options={Object.entries(DEAL_STAGE)} /></Field>
            <Field label="MRR attendu (FCFA)"><Input value={edit.expected_mrr_fcfa ? String(edit.expected_mrr_fcfa) : ""} onChange={(e) => setEdit({ ...edit, expected_mrr_fcfa: parseFcfa(e.target.value) })} placeholder="45 000" /></Field>
            <Field label="Probabilité (%)"><Input type="number" value={bpToPct(edit.probability_bp ?? 0)} onChange={(e) => setEdit({ ...edit, probability_bp: pctToBp(Number(e.target.value)) })} /></Field>
            <Field label="Origine"><Select value={edit.origin} onChange={(e) => setEdit({ ...edit, origin: e.target.value as DealOrigin })} options={ORIGINS} /></Field>
            <Field label="Date prochaine action"><Input type="date" value={edit.next_action_date ?? ""} onChange={(e) => setEdit({ ...edit, next_action_date: e.target.value })} /></Field>
          </div>
          <Field label="Prochaine action"><Input value={edit.next_action ?? ""} onChange={(e) => setEdit({ ...edit, next_action: e.target.value })} placeholder="Relancer par email" /></Field>
        </CpsModal>
      )}
    </div>
  );
}
