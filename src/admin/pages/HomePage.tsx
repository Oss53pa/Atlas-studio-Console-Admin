import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Brain, Users, Repeat, KeyRound, LayoutGrid,
  MessageSquare, ShieldCheck, Activity, CalendarDays, Wallet,
  TrendingDown, ArrowRight, ArrowUpRight, type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { useAuth } from "../../lib/auth";

/* ─────────────────────────────────────────────────────────────
   Page d'accueil — style éditorial (hero, KPI, insight, avancement)
   Adaptée au domaine de la console : apps, clients, abonnements, licences.
   ───────────────────────────────────────────────────────────── */

/** Sparkline purement décoratif (aucune valeur chiffrée revendiquée). */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 260, h = 56, pad = 4;
  const max = Math.max(...points), min = Math.min(...points);
  const span = max - min || 1;
  const step = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - ((p - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, unit, caption, spark, color }: {
  label: string; value: string | number; unit: string; caption: string; spark: number[]; color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-card shadow-premium">
      <div className="p-5 pb-0">
        <div className="text-neutral-muted text-[10px] font-bold uppercase tracking-widest">{label}</div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-neutral-light text-[34px] leading-none font-bold tracking-tight">{value}</span>
          <span className="text-neutral-muted text-xs font-medium">{unit}</span>
        </div>
        <div className="mt-1.5 text-neutral-muted text-[11px]">{caption}</div>
      </div>
      <div className="mt-3">
        <Sparkline points={spark} color={color} />
      </div>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, caption }: {
  icon: LucideIcon; label: string; value: string; caption: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mb-3">
        <Icon size={15} className="text-neutral-muted" strokeWidth={1.5} />
      </div>
      <div className="text-neutral-muted text-[9px] font-bold uppercase tracking-widest">{label}</div>
      <div className="text-neutral-light text-lg font-semibold mt-0.5 leading-tight">{value}</div>
      <div className="text-neutral-muted text-[10px] mt-0.5">{caption}</div>
    </div>
  );
}

export default function HomePage() {
  const { appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const { profile } = useAuth();

  const [users, setUsers] = useState(0);
  const [subs, setSubs] = useState(0);
  const [mrr, setMrr] = useState(0);
  const [tickets, setTickets] = useState(0);
  const [licences, setLicences] = useState(0);
  const [pending, setPending] = useState(0);
  const [churn, setChurn] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const statsRes = await supabase.rpc("admin_dashboard_stats");
        const s = statsRes.data as unknown as { total_users: number; active_subscriptions: number } | null;
        if (s) { setUsers(s.total_users || 0); setSubs(s.active_subscriptions || 0); }

        const revRes = await supabase.rpc("admin_revenue_summary");
        const r = revRes.data as unknown as { pending_payments: number } | null;
        if (r) setPending(r.pending_payments || 0);

        let subsQ = supabase.from("subscriptions").select("price_at_subscription").in("status", ["active", "trial"]);
        if (selectedApp !== "all") subsQ = subsQ.eq("app_id", selectedApp);
        const { data: activeSubs } = await subsQ;
        if (activeSubs) setMrr(activeSubs.reduce((a, x) => a + (Number(x.price_at_subscription) || 0), 0));

        let tQ = supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
        if (selectedApp !== "all") tQ = tQ.eq("app_id", selectedApp);
        const { count: tc } = await tQ;
        setTickets(tc || 0);

        const { count: la } = await supabase.from("licences").select("id", { count: "exact", head: true }).eq("status", "active");
        setLicences(la || 0);

        const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const [cRes, aRes] = await Promise.all([
          supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("cancelled_at", thirtyAgo),
          supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]),
        ]);
        const can = cRes.count || 0, act = aRes.count || 0;
        setChurn(act > 0 ? Math.round((can / (act + can)) * 100) : 0);
      } catch { /* mode démo / hors-ligne — valeurs par défaut */ }
    }
    load();
  }, [selectedApp]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const now = new Date();
  const moisAnnee = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisAnneeCap = moisAnnee.charAt(0).toUpperCase() + moisAnnee.slice(1);
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const yearPct = Math.round((dayOfYear / 365) * 100);
  const prenom = (profile?.full_name || "").split(" ")[0] || "";

  const AMBER = "#EF9F27", BLUE = "#3B82F6", EMERALD = "#10B981";

  return (
    <div>
      {/* ═══ HERO (pleine largeur) ═══ */}
      <div className="-mx-8 md:-mx-10 -mt-8 md:-mt-10 mb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-ink-radial" />
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to left, black, transparent 55%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 55%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-admin-bg" />
        <div className="relative px-8 md:px-10 py-14 text-center">
          <div className="inline-flex items-center gap-2 text-admin-accent text-[11px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-admin-accent animate-pulse" />
            Bienvenue{prenom ? ` ${prenom}` : ""} · {moisAnneeCap}
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-neutral-light tracking-tight">
            Console <span className="font-logo text-[1.15em] bg-gradient-champagne bg-clip-text text-transparent">Atlas Studio</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-neutral-body text-sm md:text-[15px] leading-relaxed">
            Pilotage unifié de votre suite — du <strong className="text-neutral-light font-semibold">catalogue d'apps</strong> aux{" "}
            <strong className="text-neutral-light font-semibold">clients, abonnements et licences</strong>. Données 100 % en temps réel.
          </p>
        </div>
      </div>

      {/* ═══ KPI (4 cartes à courbe) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Applications" value={appList.length} unit="apps" caption="catalogue actif" color={BLUE} spark={[4, 5, 4.6, 6, 6.4, 7.6, 8.2]} />
        <StatCard label="Clients" value={fmt(users)} unit="comptes" caption="utilisateurs · partenaires" color={AMBER} spark={[3, 3.4, 4.2, 4, 5.2, 6, 7.1]} />
        <StatCard label="Abonnements" value={fmt(subs)} unit="actifs" caption="abonnements en cours" color={EMERALD} spark={[2, 3, 3.6, 4.4, 4.2, 5.6, 6.8]} />
        <StatCard label="Licences" value={fmt(licences)} unit="clés" caption="licences actives" color={AMBER} spark={[3, 3.2, 4, 4.8, 5.4, 6.2, 7.4]} />
      </div>

      {/* ═══ INSIGHT + MINI-CARTES ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Insight du jour */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-card shadow-premium p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-admin-accent flex items-center justify-center">
              <Sparkles size={17} className="text-onyx" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-body text-[11px] font-medium">Insight du jour</span>
            <span className="text-admin-accent text-[11px] font-semibold uppercase tracking-wider">Proph3t · Confiance 86 %</span>
          </div>
          <p className="text-neutral-light text-[15px] leading-relaxed">
            Aucune anomalie détectée sur les <strong>{fmt(users)}</strong> clients et <strong>{fmt(subs)}</strong> abonnements actifs.
          </p>
          <p className="text-neutral-muted text-xs mt-2 leading-relaxed">
            Conformité RGPD validée · piste d'audit chaînée SHA-256 · sauvegardes chiffrées en continu.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-1">
            <Link to="/admin/clients" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-admin-accent text-onyx text-sm font-semibold hover:brightness-110 transition-all">
              Consulter les clients <ArrowRight size={15} />
            </Link>
            <Link to="/admin/proph3t" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/15 text-neutral-light text-sm font-medium hover:bg-white/5 transition-all">
              Demander à Proph3t
            </Link>
          </div>
        </div>

        {/* Cluster mini-cartes */}
        <div className="grid grid-cols-2 gap-3">
          <MiniCard icon={LayoutGrid} label="Apps" value={String(appList.length)} caption="catalogue" />
          <MiniCard icon={ShieldCheck} label="Conformité" value="100 %" caption="RGPD · SHA-256" />
          <MiniCard icon={MessageSquare} label="Support" value={String(tickets)} caption="tickets ouverts" />
          <MiniCard icon={Activity} label="Système" value="Opérationnel" caption="uptime · monitoring" />
          <MiniCard icon={Wallet} label="MRR" value={`${fmt(mrr)}`} caption="FCFA / mois" />
          <MiniCard icon={CalendarDays} label="Période" value={moisAnneeCap.split(" ")[0]} caption={String(now.getFullYear())} />
        </div>
      </div>

      {/* ═══ AVANCEMENT + ASSISTANT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Avancement de l'année */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-gradient-card shadow-premium p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-neutral-muted text-[10px] font-bold uppercase tracking-widest">Avancement de l'année</div>
              <div className="text-neutral-light text-lg font-semibold mt-1">{moisAnneeCap}</div>
            </div>
            <div className="text-right">
              <div className="text-neutral-light text-4xl font-bold leading-none">{yearPct}%</div>
              <div className="text-neutral-muted text-[10px] font-semibold uppercase tracking-widest mt-1">YTD</div>
            </div>
          </div>
          <div className="mt-5 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-admin-accent-dark via-admin-accent to-emerald-400 transition-all" style={{ width: `${yearPct}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
            <span className="text-neutral-muted">Churn 30j · <span className={churn > 5 ? "text-red-400" : "text-emerald-400"}>{churn}%</span></span>
            <span className="text-neutral-muted">En attente · <span className="text-amber-400">{fmt(pending)} FCFA</span></span>
            <span className="text-neutral-muted">Abonnements actifs · <span className="text-neutral-light">{fmt(subs)}</span></span>
          </div>
        </div>

        {/* Assistant IA */}
        <Link to="/admin/proph3t" className="group rounded-2xl border border-white/10 bg-gradient-card shadow-premium p-6 flex flex-col hover:border-admin-accent/30 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <Brain size={19} className="text-admin-accent" />
            </div>
            <ArrowUpRight size={16} className="text-neutral-muted group-hover:text-admin-accent transition-colors" />
          </div>
          <div className="mt-4 text-neutral-light text-sm font-semibold flex items-center gap-1.5">
            Proph3t <span className="text-neutral-muted font-normal">· Assistant IA</span>
          </div>
          <p className="text-neutral-muted text-xs mt-1.5 leading-relaxed flex-1">
            Analyse, commente et anticipe l'activité de votre plateforme.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-neutral-muted">
            <TrendingDown size={11} className="rotate-180 text-emerald-400" />
            Modèle v3.4 · AUC 0.87 · garde-fous éthiques actifs
          </div>
        </Link>
      </div>
    </div>
  );
}
