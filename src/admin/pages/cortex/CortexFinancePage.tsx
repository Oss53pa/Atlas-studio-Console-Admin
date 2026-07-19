import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { formatFcfa, parseFcfa } from "../../../lib/money";
import { useCortexPricing, useCortexPortfolio } from "./hooks";
import type { CpsPricingPlan, PricingModel, PricingPeriod, PricingStatus } from "./types";
import { Badge, CpsModal, Field, Input, Select } from "./ui";
import "./cortex.css";

const MODEL: [PricingModel, string][] = [["subscription", "Abonnement"], ["freemium", "Freemium"], ["setup_fee", "Frais de mise en place"], ["usage", "À l'usage"], ["license", "Licence"], ["service", "Service"]];
const PERIOD: [PricingPeriod, string][] = [["monthly", "/mois"], ["quarterly", "/trim."], ["yearly", "/an"], ["one_off", "one-shot"]];
const STATUS: [PricingStatus, string][] = [["draft", "Brouillon"], ["active", "Actif"], ["retired", "Retiré"]];
const statusTone: Record<PricingStatus, string> = { draft: "gray", active: "green", retired: "red" };
const emptyPlan: Partial<CpsPricingPlan> = { plan_code: "", model: "subscription", amount_fcfa: 0, period: "monthly", status: "draft" };

export default function CortexFinancePage() {
  const { rows, loading, error, create, update } = useCortexPricing();
  const { rows: apps } = useCortexPortfolio();
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<CpsPricingPlan> | null>(null);

  const appName = (id: string) => apps.find((a) => a.id === id)?.name ?? "—";
  const save = async () => {
    if (!edit?.app_id) { toast.error("Application obligatoire"); return; }
    if (!edit?.plan_code) { toast.error("Code plan obligatoire"); return; }
    try { (edit as any).id ? await update((edit as any).id, edit) : await create(edit); toast.success("Plan enregistré"); setEdit(null); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Finance — Pricing" subtitle={`Cortex — grilles tarifaires · ${rows.length} plans`}>
        <button className="cps-btn" onClick={() => setEdit({ ...emptyPlan })}><Plus size={15} /> Nouveau plan</button>
      </AdminPageHeader>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 760 }}>
            <thead>
              <tr className="text-left text-admin-muted border-b border-warm-border dark:border-white/5" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <th className="px-4 py-3 font-medium">Application</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium text-right">Montant</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-admin-muted">Chargement…</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-admin-muted">Aucun plan tarifaire.</td></tr>}
              {rows.map((p: CpsPricingPlan) => (
                <tr key={p.id} className="border-b border-warm-border/60 dark:border-white/5 hover:bg-warm-bg/40 dark:hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-admin-text">{appName(p.app_id)}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-admin-muted">{p.plan_code}</td>
                  <td className="px-4 py-3 text-[12px] text-admin-muted">{MODEL.find(([v]) => v === p.model)?.[1]}</td>
                  <td className="px-4 py-3 text-right"><span className="money font-semibold">{formatFcfa(p.amount_fcfa)}</span> <span className="text-[11px] text-admin-muted">{PERIOD.find(([v]) => v === p.period)?.[1]}</span></td>
                  <td className="px-4 py-3"><Badge tone={statusTone[p.status]}>{STATUS.find(([v]) => v === p.status)?.[1]}</Badge></td>
                  <td className="px-4 py-3 text-right"><button onClick={() => setEdit({ ...(p as any) })} className="text-admin-muted hover:cps-accent"><Pencil size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <CpsModal title={(edit as any).id ? "Modifier le plan" : "Nouveau plan"} onClose={() => setEdit(null)}
          footer={<><button className="cps-btn cps-btn-ghost" onClick={() => setEdit(null)}>Annuler</button><button className="cps-btn" onClick={save}>Enregistrer</button></>}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Application"><Select value={edit.app_id ?? ""} onChange={(e) => setEdit({ ...edit, app_id: e.target.value })} options={[["", "—"], ...apps.map((a) => [a.id, a.name] as [string, string])]} /></Field>
            <Field label="Code plan"><Input value={edit.plan_code ?? ""} onChange={(e) => setEdit({ ...edit, plan_code: e.target.value })} placeholder="FNA_PRO" /></Field>
            <Field label="Modèle"><Select value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value as PricingModel })} options={MODEL} /></Field>
            <Field label="Période"><Select value={edit.period} onChange={(e) => setEdit({ ...edit, period: e.target.value as PricingPeriod })} options={PERIOD} /></Field>
            <Field label="Montant (FCFA)"><Input value={edit.amount_fcfa ? String(edit.amount_fcfa) : ""} onChange={(e) => setEdit({ ...edit, amount_fcfa: parseFcfa(e.target.value) })} placeholder="45 000" /></Field>
            <Field label="Statut"><Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as PricingStatus })} options={STATUS} /></Field>
          </div>
        </CpsModal>
      )}
    </div>
  );
}
