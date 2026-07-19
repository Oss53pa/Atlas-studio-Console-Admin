import { useMemo, useState } from "react";
import { Plus, Pencil, Play, Download, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { formatFcfa, parseFcfa, bpToPct, pctToBp } from "../../../lib/money";
import { useCortexScenarios, useCortexProjections, useCortexPortfolio } from "./hooks";
import type { CpsScenario, ScenarioKind } from "./types";
import { Badge, CpsModal, Field, Input, Select } from "./ui";
import "./cortex.css";

const KIND: [ScenarioKind, string][] = [["pessimiste", "Pessimiste"], ["realiste", "Réaliste"], ["optimiste", "Optimiste"], ["custom", "Custom"]];
const AMBER = "#EF9F27";
const emptyScenario: Partial<CpsScenario> = {
  name: "", kind: "realiste", horizon_months: 24, start_customers: 0, new_per_month: 5,
  growth_bp: 0, churn_monthly_bp: 200, avg_mrr_fcfa: 0, monthly_fixed_cost_fcfa: 0,
};

export default function CortexScenariosPage() {
  const { rows, loading, create, update, generate } = useCortexScenarios();
  const { rows: apps } = useCortexPortfolio();
  const toast = useToast();
  const [selId, setSelId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<CpsScenario> | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = rows.find((r) => r.id === selId) ?? rows[0] ?? null;
  const { rows: proj, refresh: refreshProj } = useCortexProjections(selected?.id);

  const chartData = useMemo(() => proj.map((p) => ({
    mois: p.month_index, MRR: p.mrr_fcfa, Coûts: p.costs_fcfa, Clients: p.active_customers,
  })), [proj]);

  const save = async () => {
    if (!edit?.name) { toast.error("Nom obligatoire"); return; }
    setBusy(true);
    try {
      const payload = { ...edit, app_id: edit.app_id || null };
      if ((edit as any).id) await update((edit as any).id, payload);
      else await create(payload);
      toast.success("Scénario enregistré · pense à générer les projections");
      setEdit(null);
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const runGenerate = async (id: string) => {
    setBusy(true);
    try { const n = await generate(id); await refreshProj(); toast.success(`${n} mois projetés`); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };

  const exportCsv = () => {
    if (!selected || !proj.length) return;
    const header = "mois;nouveaux;actifs;mrr_fcfa;couts_fcfa";
    const lines = proj.map((p) => [p.month_index, p.new_customers, p.active_customers, p.mrr_fcfa, p.costs_fcfa].join(";"));
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `projections_${selected.name}.csv`;
    a.click();
  };

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Scénarios & Projections" subtitle="Cortex — modélisation réalisé vs projeté">
        <button className="cps-btn" onClick={() => setEdit({ ...emptyScenario })}><Plus size={15} /> Nouveau scénario</button>
      </AdminPageHeader>

      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        {/* Liste scénarios */}
        <div className="space-y-2">
          {loading && <div className="text-sm text-admin-muted">Chargement…</div>}
          {!loading && rows.length === 0 && <div className="text-sm text-admin-muted py-6 text-center bg-white dark:bg-admin-surface rounded-xl border border-warm-border dark:border-white/5">Aucun scénario. Crée ton premier jeu d'hypothèses.</div>}
          {rows.map((s) => (
            <div key={s.id} onClick={() => setSelId(s.id)} className={"cursor-pointer bg-white dark:bg-admin-surface border rounded-xl p-3 transition-colors " + (selected?.id === s.id ? "border-[var(--cps-accent)]" : "border-warm-border dark:border-white/5 hover:border-[var(--cps-accent)]/50")}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-admin-text text-sm">{s.name}</span>
                <div className="flex items-center gap-1">
                  {s.is_stale && <span title="Projections à régénérer"><AlertTriangle size={13} className="text-amber-600" /></span>}
                  <button onClick={(e) => { e.stopPropagation(); setEdit({ ...(s as any) }); }} className="text-admin-muted hover:cps-accent"><Pencil size={13} /></button>
                </div>
              </div>
              <div className="text-[11px] text-admin-muted mt-1">
                {KIND.find(([v]) => v === s.kind)?.[1]} · {s.horizon_months} mois · {s.app_id ? (apps.find((a) => a.id === s.app_id)?.name ?? "app") : "global"}
              </div>
            </div>
          ))}
        </div>

        {/* Détail scénario sélectionné */}
        <div>
          {!selected ? (
            <div className="text-sm text-admin-muted py-16 text-center bg-white dark:bg-admin-surface rounded-2xl border border-warm-border dark:border-white/5">Sélectionne un scénario.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-admin-text">{selected.name}</h2>
                  {selected.is_stale ? <Badge tone="amber">à régénérer</Badge> : <Badge tone="green">à jour</Badge>}
                  {selected.inputs_hash && <span className="prov" style={{ background: "#ECECE7", color: "#5A5A52" }}>hash {selected.inputs_hash.slice(0, 8)}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button className="cps-btn" disabled={busy} onClick={() => runGenerate(selected.id)}><Play size={14} /> Générer</button>
                  <button className="cps-btn cps-btn-ghost" disabled={!proj.length} onClick={exportCsv}><Download size={14} /> CSV</button>
                </div>
              </div>

              {/* Graphe — projeté en pointillé (RG-12) */}
              <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-4 shadow-sm">
                <div className="text-[12px] text-admin-muted mb-2">MRR & coûts projetés (pointillé = projeté · RG-12) — réalisé disponible en Vague 3</div>
                {proj.length === 0 ? (
                  <div className="h-[280px] flex items-center justify-center text-sm text-admin-muted">Aucune projection — clique « Générer ».</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ left: 10, right: 10, top: 6 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="rgba(120,120,110,0.15)" />
                      <XAxis dataKey="mois" tick={{ fontSize: 11 }} tickFormatter={(m) => "M" + m} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatFcfa(v, { compact: true, suffix: false })} width={60} />
                      <Tooltip formatter={(v: any, n: any) => n === "Clients" ? v : formatFcfa(v, { compact: true })} labelFormatter={(m) => "Mois " + m} />
                      <Line type="monotone" dataKey="MRR" stroke={AMBER} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                      <Line type="monotone" dataKey="Coûts" stroke="#8E8C86" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Drivers (hypothèses chiffrées) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ["Clients départ", selected.start_customers],
                  ["Nouveaux / mois", selected.new_per_month],
                  ["Croissance", bpToPct(selected.growth_bp) + " %"],
                  ["Churn mensuel", bpToPct(selected.churn_monthly_bp) + " %"],
                  ["MRR moyen / client", formatFcfa(selected.avg_mrr_fcfa)],
                  ["Coûts fixes / mois", formatFcfa(selected.monthly_fixed_cost_fcfa)],
                ].map(([l, v]) => (
                  <div key={l as string} className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-3">
                    <div className="text-[11px] text-admin-muted">{l}</div>
                    <div className="text-sm font-semibold text-admin-text money mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {edit && (
        <CpsModal title={(edit as any).id ? "Modifier le scénario" : "Nouveau scénario"} onClose={() => setEdit(null)}
          footer={<><button className="cps-btn cps-btn-ghost" onClick={() => setEdit(null)}>Annuler</button><button className="cps-btn" onClick={save} disabled={busy}>Enregistrer</button></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Réaliste 2026" /></Field>
            <Field label="Type"><Select value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as ScenarioKind })} options={KIND} /></Field>
            <Field label="Application (ou global)"><Select value={edit.app_id ?? ""} onChange={(e) => setEdit({ ...edit, app_id: e.target.value })} options={[["", "Global"], ...apps.map((a) => [a.id, a.name] as [string, string])]} /></Field>
            <Field label="Horizon (mois)"><Input type="number" value={edit.horizon_months ?? 24} onChange={(e) => setEdit({ ...edit, horizon_months: Number(e.target.value) })} /></Field>
          </div>
          <div className="text-[11px] font-semibold text-admin-muted uppercase tracking-wide mt-1">Hypothèses chiffrées</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Field label="Clients au départ"><Input type="number" value={edit.start_customers ?? 0} onChange={(e) => setEdit({ ...edit, start_customers: Number(e.target.value) })} /></Field>
            <Field label="Nouveaux / mois"><Input type="number" value={edit.new_per_month ?? 0} onChange={(e) => setEdit({ ...edit, new_per_month: Number(e.target.value) })} /></Field>
            <Field label="Croissance (%/mois)"><Input type="number" value={bpToPct(edit.growth_bp ?? 0)} onChange={(e) => setEdit({ ...edit, growth_bp: pctToBp(Number(e.target.value)) })} /></Field>
            <Field label="Churn (%/mois)"><Input type="number" value={bpToPct(edit.churn_monthly_bp ?? 0)} onChange={(e) => setEdit({ ...edit, churn_monthly_bp: pctToBp(Number(e.target.value)) })} /></Field>
            <Field label="MRR moyen/client (FCFA)"><Input value={edit.avg_mrr_fcfa ? String(edit.avg_mrr_fcfa) : ""} onChange={(e) => setEdit({ ...edit, avg_mrr_fcfa: parseFcfa(e.target.value) })} placeholder="40 000" /></Field>
            <Field label="Coûts fixes/mois (FCFA)"><Input value={edit.monthly_fixed_cost_fcfa ? String(edit.monthly_fixed_cost_fcfa) : ""} onChange={(e) => setEdit({ ...edit, monthly_fixed_cost_fcfa: parseFcfa(e.target.value) })} placeholder="500 000" /></Field>
          </div>
        </CpsModal>
      )}
    </div>
  );
}
