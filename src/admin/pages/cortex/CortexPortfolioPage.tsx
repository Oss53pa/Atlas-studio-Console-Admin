import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, ArrowUpRight, AlertTriangle } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { formatFcfa } from "../../../lib/money";
import { useCortexPortfolio } from "./hooks";
import type { CpsApp, CpsArbitrationRow, LifecycleStage, StrategicClass } from "./types";
import {
  Badge, Provenance, CpsModal, Field, Input, Textarea, Select,
  LIFECYCLE, CLASS_LABEL, stageTone, classTone,
} from "./ui";
import "./cortex.css";

const emptyApp: Partial<CpsApp> = {
  code: "", name: "", lifecycle_stage: "idea", strategic_class: "support",
  priority_rank: null, cosmos_leverage: false, target_market: [], notes: "",
};

export default function CortexPortfolioPage() {
  const { rows, loading, error, createApp, updateApp } = useCortexPortfolio();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<CpsApp> | null>(null);
  const [saving, setSaving] = useState(false);

  const locomotives = useMemo(() => rows.filter((r) => r.strategic_class === "locomotive").length, [rows]);

  const save = async () => {
    if (!edit?.code || !edit?.name) { toast.error("Code et nom obligatoires"); return; }
    // RG-01 : max 3 locomotives
    if (edit.strategic_class === "locomotive") {
      const already = rows.filter((r) => r.strategic_class === "locomotive" && r.id !== (edit as any).id).length;
      if (already >= 3) { toast.error("Max 3 apps « locomotive » (RG-01). Rétrograde-en une d'abord."); return; }
    }
    setSaving(true);
    try {
      const payload = {
        ...edit,
        priority_rank: edit.priority_rank ? Number(edit.priority_rank) : null,
        target_market: typeof (edit as any).target_market === "string"
          ? (edit as any).target_market.split(",").map((s: string) => s.trim()).filter(Boolean)
          : edit.target_market ?? [],
      };
      if ((edit as any).id) await updateApp((edit as any).id, payload);
      else await createApp(payload);
      toast.success("Enregistré");
      setEdit(null);
    } catch (e: any) { toast.error(e.message || "Erreur"); }
    setSaving(false);
  };

  return (
    <div data-module="cortex">
      <AdminPageHeader
        title="Portefeuille"
        subtitle={`Cortex — arbitrage stratégique · ${rows.length} apps · ${locomotives}/3 locomotives`}
      >
        <button className="cps-btn" onClick={() => setEdit({ ...emptyApp })}>
          <Plus size={15} /> Ajouter une app
        </button>
      </AdminPageHeader>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 880 }}>
            <thead>
              <tr className="text-left text-admin-muted border-b border-warm-border dark:border-white/5" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <th className="px-4 py-3 font-medium">Rang</th>
                <th className="px-4 py-3 font-medium">Application</th>
                <th className="px-4 py-3 font-medium">Stade</th>
                <th className="px-4 py-3 font-medium">Classe</th>
                <th className="px-4 py-3 font-medium text-right">Deals</th>
                <th className="px-4 py-3 font-medium text-right">Pipeline pondéré</th>
                <th className="px-4 py-3 font-medium text-right">Hyp. crit.</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-admin-muted">Chargement…</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-admin-muted">
                  Aucune app. Ajoute ta première application au portefeuille.
                </td></tr>
              )}
              {rows.map((r: CpsArbitrationRow) => (
                <tr key={r.id} className="border-b border-warm-border/60 dark:border-white/5 hover:bg-warm-bg/40 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 money text-admin-muted">{r.priority_rank ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/cortex/app/${r.id}`} className="font-semibold text-admin-text hover:cps-accent inline-flex items-center gap-1">
                      {r.name} <ArrowUpRight size={13} className="text-admin-muted" />
                    </Link>
                    <div className="text-[11px] text-admin-muted font-mono">{r.code}{r.cosmos_leverage ? " · Cosmos" : ""}</div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={stageTone[r.lifecycle_stage as LifecycleStage]}>{LIFECYCLE[r.lifecycle_stage as LifecycleStage]}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={classTone[r.strategic_class as StrategicClass]}>{CLASS_LABEL[r.strategic_class as StrategicClass]}</Badge></td>
                  <td className="px-4 py-3 text-right money">{r.open_deals || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="money font-semibold text-admin-text">{formatFcfa(r.pipeline_weighted_fcfa, { compact: true })}</span>
                    <span className="ml-1.5"><Provenance source="manual" /></span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.open_critical_assumptions > 0
                      ? <span className="inline-flex items-center gap-1 text-amber-700 font-semibold"><AlertTriangle size={13} />{r.open_critical_assumptions}</span>
                      : <span className="text-admin-muted">0</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setEdit({ ...(r as any) })} className="text-admin-muted hover:cps-accent"><Pencil size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <CpsModal
          title={(edit as any).id ? "Modifier l'application" : "Nouvelle application"}
          onClose={() => setEdit(null)}
          footer={<>
            <button className="cps-btn cps-btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
            <button className="cps-btn" onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</button>
          </>}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="atlas_fna" /></Field>
            <Field label="Nom"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Atlas F&A" /></Field>
            <Field label="Stade"><Select value={edit.lifecycle_stage} onChange={(e) => setEdit({ ...edit, lifecycle_stage: e.target.value as LifecycleStage })} options={Object.entries(LIFECYCLE)} /></Field>
            <Field label="Classe stratégique"><Select value={edit.strategic_class} onChange={(e) => setEdit({ ...edit, strategic_class: e.target.value as StrategicClass })} options={Object.entries(CLASS_LABEL)} /></Field>
            <Field label="Rang de priorité"><Input type="number" value={edit.priority_rank ?? ""} onChange={(e) => setEdit({ ...edit, priority_rank: e.target.value as any })} placeholder="1" /></Field>
            <Field label="Marchés cibles (,)"><Input value={Array.isArray(edit.target_market) ? edit.target_market.join(", ") : (edit.target_market as any) ?? ""} onChange={(e) => setEdit({ ...edit, target_market: e.target.value as any })} placeholder="uemoa, cemac" /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-admin-text">
            <input type="checkbox" checked={!!edit.cosmos_leverage} onChange={(e) => setEdit({ ...edit, cosmos_leverage: e.target.checked })} />
            Validable sur le terrain Cosmos
          </label>
          <Field label="Notes"><Textarea value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></Field>
        </CpsModal>
      )}
    </div>
  );
}
