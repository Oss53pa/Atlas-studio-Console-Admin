import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { formatFcfa, bpToPct } from "../../../lib/money";
import { useCompassApp, useCompassDeals, useCompassMilestones, useCompassAssumptions, useCompassCosts } from "./hooks";
import type { LifecycleStage, StrategicClass } from "./types";
import {
  Badge, LIFECYCLE, CLASS_LABEL, DEAL_STAGE, MILESTONE_STATUS, ASSUMPTION_STATUS, CRITICALITY,
  stageTone, classTone, dealTone, assumptionTone,
} from "./ui";
import "./compass.css";

type Tab = "pipeline" | "jalons" | "hypotheses" | "couts";

export default function CompassAppPage() {
  const { id = "" } = useParams();
  const { app, loading } = useCompassApp(id);
  const deals = useCompassDeals(id);
  const miles = useCompassMilestones(id);
  const assum = useCompassAssumptions(id);
  const costs = useCompassCosts(id);
  const [tab, setTab] = useState<Tab>("pipeline");

  if (loading) return <div data-module="compass"><div className="p-10 text-center text-admin-muted">Chargement…</div></div>;
  if (!app) return <div data-module="compass" className="p-10 text-center text-admin-muted">App introuvable. <Link to="/admin/compass/portfolio" className="cps-accent">Retour</Link></div>;

  return (
    <div data-module="compass">
      <Link to="/admin/compass/portfolio" className="inline-flex items-center gap-1 text-[13px] text-admin-muted hover:cps-accent mb-2"><ArrowLeft size={14} /> Portefeuille</Link>
      <AdminPageHeader title={app.name} subtitle={`${app.code} · Fiche business`}>
        <div className="flex items-center gap-2">
          <Badge tone={stageTone[app.lifecycle_stage as LifecycleStage]}>{LIFECYCLE[app.lifecycle_stage as LifecycleStage]}</Badge>
          <Badge tone={classTone[app.strategic_class as StrategicClass]}>{CLASS_LABEL[app.strategic_class as StrategicClass]}</Badge>
        </div>
      </AdminPageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ["Pipeline pondéré", formatFcfa(app.pipeline_weighted_fcfa, { compact: true })],
          ["Deals ouverts", String(app.open_deals)],
          ["Hyp. critiques", String(app.open_critical_assumptions)],
          ["Rang", app.priority_rank != null ? String(app.priority_rank) : "—"],
        ].map(([l, v]) => (
          <div key={l} className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] text-admin-muted uppercase tracking-wide">{l}</div>
            <div className="text-xl font-bold text-admin-text money mt-1">{v}</div>
          </div>
        ))}
      </div>

      <div className="flex border-b border-warm-border dark:border-white/5 mb-4">
        {([["pipeline", "Pipeline"], ["jalons", "Jalons"], ["hypotheses", "Hypothèses"], ["couts", "Coûts"]] as [Tab, string][]).map(([k, l]) => (
          <div key={k} className={"cps-tab" + (tab === k ? " on" : "")} onClick={() => setTab(k)}>{l}</div>
        ))}
      </div>

      <div className="space-y-2">
        {tab === "pipeline" && (deals.rows.length ? deals.rows.map((d) => (
          <div key={d.id} className="flex items-center justify-between bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-3">
            <div><span className="font-medium text-admin-text text-sm">{d.prospect_name}</span> <span className="text-[11px] text-admin-muted">{d.segment}</span></div>
            <div className="flex items-center gap-3"><span className="money text-sm">{formatFcfa(d.expected_mrr_fcfa, { compact: true })} · {bpToPct(d.probability_bp)}%</span><Badge tone={dealTone[d.stage]}>{DEAL_STAGE[d.stage]}</Badge></div>
          </div>
        )) : <Empty label="Aucun deal pour cette app." />)}

        {tab === "jalons" && (miles.rows.length ? miles.rows.map((m) => (
          <div key={m.id} className="flex items-center justify-between bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-3">
            <span className="text-sm text-admin-text">{m.title} <span className="text-[11px] text-admin-muted">{m.target_date ?? ""}</span></span>
            <Badge tone="gray">{MILESTONE_STATUS[m.status]}</Badge>
          </div>
        )) : <Empty label="Aucun jalon." />)}

        {tab === "hypotheses" && (assum.rows.length ? assum.rows.map((a) => (
          <div key={a.id} className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-3">
            <div className="text-sm text-admin-text">{a.statement}</div>
            <div className="flex gap-2 mt-2"><Badge tone={a.criticality === "bloquante" ? "red" : "amber"}>{CRITICALITY[a.criticality]}</Badge><Badge tone={assumptionTone[a.status]}>{ASSUMPTION_STATUS[a.status]}</Badge></div>
          </div>
        )) : <Empty label="Aucune hypothèse." />)}

        {tab === "couts" && (costs.rows.length ? costs.rows.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-3">
            <span className="text-sm text-admin-text">{c.label ?? c.category} <span className="text-[11px] text-admin-muted">{c.period_month?.slice(0, 7)}</span></span>
            <span className="money font-semibold text-sm">{formatFcfa(c.amount_fcfa)}</span>
          </div>
        )) : <Empty label="Aucun coût imputé." />)}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-sm text-admin-muted py-8 text-center bg-white dark:bg-admin-surface rounded-xl border border-warm-border dark:border-white/5">{label}</div>;
}
