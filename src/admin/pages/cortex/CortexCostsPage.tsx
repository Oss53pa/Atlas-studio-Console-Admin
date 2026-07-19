import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { formatFcfa, parseFcfa } from "../../../lib/money";
import { useCortexCosts, useCortexPortfolio } from "./hooks";
import type { CpsCost, CostCategory } from "./types";
import { Badge, Provenance, CpsModal, Field, Input, Select } from "./ui";
import "./cortex.css";

const CATS: [CostCategory, string][] = [
  ["infra", "Infrastructure"], ["ai_tooling", "IA & outils"], ["marketing", "Marketing"],
  ["legal", "Juridique"], ["hardware", "Matériel"], ["financement", "Financement"], ["other", "Autre"],
];
const SOURCES: [string, string][] = [["manual", "Manuel"], ["import", "Import"], ["connector", "Connecteur"]];

function thisMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }
const emptyCost: Partial<CpsCost> = { category: "infra", amount_fcfa: 0, period_month: thisMonth(), source: "manual", owner_only: false };

export default function CortexCostsPage() {
  const { rows, loading, error, create, update } = useCortexCosts();
  const { rows: apps } = useCortexPortfolio();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<CpsCost> | null>(null);

  const total = rows.reduce((s, r) => s + Number(r.amount_fcfa), 0); // affichage seul

  const save = async () => {
    if (!edit?.amount_fcfa) { toast.error("Montant obligatoire"); return; }
    try {
      const payload = { ...edit, app_id: edit.app_id || null };
      (edit as any).id ? await update((edit as any).id, payload) : await create(payload);
      toast.success("Coût enregistré"); setEdit(null);
    } catch (e: any) { toast.error(e.message); }
  };
  const appName = (id: string | null) => id ? (apps.find((a) => a.id === id)?.name ?? "—") : "Transverse";

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Coûts réels" subtitle={`Cortex — ${rows.length} lignes · total affiché ${formatFcfa(total, { compact: true })}`}>
        <button className="cps-btn" onClick={() => setEdit({ ...emptyCost })}><Plus size={15} /> Ajouter un coût</button>
      </AdminPageHeader>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 780 }}>
            <thead>
              <tr className="text-left text-admin-muted border-b border-warm-border dark:border-white/5" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <th className="px-4 py-3 font-medium">Mois</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 font-medium">Libellé</th>
                <th className="px-4 py-3 font-medium">App</th>
                <th className="px-4 py-3 font-medium text-right">Montant</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-admin-muted">Chargement…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-admin-muted">Aucun coût saisi.</td></tr>}
              {rows.map((r: CpsCost) => (
                <tr key={r.id} className="border-b border-warm-border/60 dark:border-white/5 hover:bg-warm-bg/40 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 money text-admin-muted">{r.period_month?.slice(0, 7)}</td>
                  <td className="px-4 py-3"><Badge tone="blue">{CATS.find(([v]) => v === r.category)?.[1]}</Badge>{r.owner_only && <span className="ml-1 text-[10px] text-admin-muted">owner</span>}</td>
                  <td className="px-4 py-3 text-admin-text">{r.label ?? "—"}</td>
                  <td className="px-4 py-3 text-admin-muted">{appName(r.app_id)}</td>
                  <td className="px-4 py-3 text-right"><span className="money font-semibold">{formatFcfa(r.amount_fcfa)}</span> <Provenance source={r.source} /></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setEdit({ ...(r as any) })} className="text-admin-muted hover:cps-accent"><Pencil size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <CpsModal title={(edit as any).id ? "Modifier le coût" : "Nouveau coût"} onClose={() => setEdit(null)}
          footer={<><button className="cps-btn cps-btn-ghost" onClick={() => setEdit(null)}>Annuler</button><button className="cps-btn" onClick={save}>Enregistrer</button></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Catégorie"><Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as CostCategory })} options={CATS} /></Field>
            <Field label="Montant (FCFA)"><Input value={edit.amount_fcfa ? String(edit.amount_fcfa) : ""} onChange={(e) => setEdit({ ...edit, amount_fcfa: parseFcfa(e.target.value) })} placeholder="120 000" /></Field>
            <Field label="Mois"><Input type="month" value={edit.period_month?.slice(0, 7) ?? ""} onChange={(e) => setEdit({ ...edit, period_month: e.target.value + "-01" })} /></Field>
            <Field label="Application"><Select value={edit.app_id ?? ""} onChange={(e) => setEdit({ ...edit, app_id: e.target.value })} options={[["", "Transverse"], ...apps.map((a) => [a.id, a.name] as [string, string])]} /></Field>
            <Field label="Source"><Select value={edit.source} onChange={(e) => setEdit({ ...edit, source: e.target.value as any })} options={SOURCES} /></Field>
          </div>
          <Field label="Libellé"><Input value={edit.label ?? ""} onChange={(e) => setEdit({ ...edit, label: e.target.value })} placeholder="Supabase Pro" /></Field>
          <label className="flex items-center gap-2 text-sm text-admin-text"><input type="checkbox" checked={!!edit.owner_only} onChange={(e) => setEdit({ ...edit, owner_only: e.target.checked })} /> Visible owner uniquement (financement / salaire)</label>
        </CpsModal>
      )}
    </div>
  );
}
