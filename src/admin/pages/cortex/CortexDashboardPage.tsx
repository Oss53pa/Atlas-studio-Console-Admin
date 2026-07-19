import { Link } from "react-router-dom";
import { LayoutGrid, Target, Flag, AlertTriangle, Wallet, Rocket, TrendingUp } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { AdminCard } from "../../components/AdminCard";
import { formatFcfa } from "../../../lib/money";
import { useCortexDashboard } from "./hooks";
import { Provenance } from "./ui";
import "./cortex.css";

export default function CortexDashboardPage() {
  const { data, loading } = useCortexDashboard();
  const d = data;

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Cortex" subtitle="Dashboard exécutif — pilotage stratégique du portefeuille" />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AdminCard loading={loading} label="MRR réel (temps réel)" value={formatFcfa(d?.mrr_real_fcfa, { compact: true })} icon={TrendingUp}
          sub={`${d?.active_clients ?? 0} clients actifs · Data Fabric`} />
        <AdminCard loading={loading} label="Applications" value={d?.apps_total ?? 0} icon={LayoutGrid}
          sub={`${d?.apps_live ?? 0} live · ${d?.apps_build ?? 0} en build`} />
        <AdminCard loading={loading} label="Pipeline pondéré" value={formatFcfa(d?.pipeline_weighted_fcfa, { compact: true })} icon={Target}
          sub={`${d?.pipeline_open_deals ?? 0} deals ouverts`} />
        <AdminCard loading={loading} label="Locomotives" value={`${d?.apps_locomotive ?? 0} / 3`} icon={Rocket}
          sub="Focus stratégique (RG-01)" />
        <AdminCard loading={loading} label="Jalons < 30 j" value={d?.milestones_due_30d ?? 0} icon={Flag}
          sub="À échéance proche" />
        <AdminCard loading={loading} label="Hypothèses critiques" value={d?.assumptions_critical_open ?? 0} icon={AlertTriangle}
          sub="Bloquantes non testées" />
        <AdminCard loading={loading} label="Coûts du mois" value={formatFcfa(d?.costs_month_fcfa, { compact: true })} icon={Wallet}
          sub="Dépenses réelles" />
      </div>

      <div className="flex items-center gap-2 text-[12px] text-admin-muted mb-6">
        <span>Provenance des chiffres :</span>
        <Provenance source="manual" /> <Provenance source="import" /> <Provenance source="connector" />
        <span className="ml-1">— les métriques temps réel (MRR live) arrivent avec la Data Fabric (Vague 3).</span>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: "/admin/cortex/portfolio", label: "Portefeuille", desc: "Matrice & arbitrage" },
          { to: "/admin/cortex/pipeline", label: "Pipeline", desc: "Deals commerciaux" },
          { to: "/admin/cortex/planning", label: "Jalons & hypothèses", desc: "Mur de vérité" },
          { to: "/admin/cortex/costs", label: "Coûts", desc: "Dépenses réelles" },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="block bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-xl p-4 hover:border-[var(--cps-accent)] transition-colors shadow-sm">
            <div className="font-semibold text-admin-text">{l.label}</div>
            <div className="text-[12px] text-admin-muted">{l.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
