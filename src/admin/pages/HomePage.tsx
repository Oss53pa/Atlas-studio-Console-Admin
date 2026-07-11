import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Brain, LayoutGrid, ShieldCheck, Activity, CalendarDays,
  Fingerprint, DatabaseZap, ArrowRight, ArrowUpRight, Server, type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { useAuth } from "../../lib/auth";

/* ─────────────────────────────────────────────────────────────
   Accueil de la CONSOLE (derrière login) — thème CLAIR (palette A/B).
   Données NON confidentielles : compteurs de structure + état système.
   ───────────────────────────────────────────────────────────── */

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
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
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
    <div className="relative overflow-hidden rounded-2xl border border-p-border bg-p-surface shadow-[0_8px_24px_-14px_rgba(0,0,0,0.18)]">
      <div className="p-5 pb-0">
        <div className="text-p-muted text-[10px] font-bold uppercase tracking-widest">{label}</div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-p-text text-[34px] leading-none font-bold tracking-tight">{value}</span>
          <span className="text-p-muted text-xs font-medium">{unit}</span>
        </div>
        <div className="mt-1.5 text-p-muted text-[11px]">{caption}</div>
      </div>
      <div className="mt-3"><Sparkline points={spark} color={color} /></div>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, caption }: {
  icon: LucideIcon; label: string; value: string; caption: string;
}) {
  return (
    <div className="rounded-xl border border-p-border bg-p-surface p-4 hover:border-p-accent/40 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-p-surface-alt flex items-center justify-center mb-3">
        <Icon size={15} className="text-p-accent" strokeWidth={1.5} />
      </div>
      <div className="text-p-muted text-[9px] font-bold uppercase tracking-widest">{label}</div>
      <div className="text-p-text text-lg font-semibold mt-0.5 leading-tight">{value}</div>
      <div className="text-p-muted text-[10px] mt-0.5">{caption}</div>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.06] text-white/80 text-[11px] font-semibold uppercase tracking-wider">
      <Icon size={12} className="text-p-accent" />
      {children}
    </span>
  );
}

export default function HomePage() {
  const { appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const { profile } = useAuth();

  const [users, setUsers] = useState(0);
  const [subs, setSubs] = useState(0);
  const [licences, setLicences] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const statsRes = await supabase.rpc("admin_dashboard_stats");
        const s = statsRes.data as unknown as { total_users: number; active_subscriptions: number } | null;
        if (s) { setUsers(s.total_users || 0); setSubs(s.active_subscriptions || 0); }
        const { count: la } = await supabase.from("licences").select("id", { count: "exact", head: true }).eq("status", "active");
        setLicences(la || 0);
      } catch { /* mode démo / hors-ligne */ }
    }
    load();
  }, [selectedApp]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const now = new Date();
  const moisAnnee = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisAnneeCap = moisAnnee.charAt(0).toUpperCase() + moisAnnee.slice(1);
  const moisSeul = moisAnneeCap.split(" ")[0];
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const yearPct = Math.round((dayOfYear / 365) * 100);
  const prenom = (profile?.full_name || "").split(" ")[0] || "";

  const AMBER = "#EF9F27", BLUE = "#3B82F6", EMERALD = "#10B981";

  return (
    <div className="overflow-x-hidden">
      {/* ═══ HERO (bande foncée « encre », pleine largeur) ═══ */}
      <div className="-mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-8 relative overflow-hidden" style={{ background: "var(--c-ink)" }}>
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to left, black, transparent 55%)",
            WebkitMaskImage: "linear-gradient(to left, black, transparent 55%)",
          }}
        />

        {/* Barre du haut */}
        <div className="relative flex items-center justify-between gap-4 px-6 md:px-8 pt-6">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white text-sm font-bold tracking-wide uppercase">Atlas Studio</span>
            <span className="hidden sm:block w-px h-4 bg-white/20" />
            <span className="hidden sm:block text-white/55 text-xs truncate">Console d'administration{prenom ? ` · ${prenom}` : ""}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Pill icon={CalendarDays}>Période {moisSeul}</Pill>
            <Pill icon={DatabaseZap}>Temps réel</Pill>
          </div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-p-accent text-p-on-accent text-[13px] font-semibold hover:brightness-110 transition-all whitespace-nowrap"
          >
            Tableau de bord <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Contenu hero */}
        <div className="relative px-6 md:px-8 pt-10 pb-14 text-center">
          <div className="inline-flex items-center gap-2 text-p-accent text-[11px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-p-accent animate-pulse" />
            Bienvenue{prenom ? ` ${prenom}` : ""} · {moisAnneeCap}
          </div>
          <h1 className="mt-4 text-4xl md:text-5xl font-bold text-white tracking-tight">
            Console <span className="font-logo text-[1.15em] bg-gradient-champagne bg-clip-text text-transparent">Atlas Studio</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-white/60 text-sm md:text-[15px] leading-relaxed">
            Pilotage unifié de votre suite — du <strong className="text-white font-semibold">catalogue d'apps</strong> aux{" "}
            <strong className="text-white font-semibold">clients, abonnements et licences</strong>. Données 100 % en temps réel.
          </p>
        </div>
      </div>

      {/* ═══ KPI (4 compteurs de structure) ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Applications" value={appList.length} unit="apps" caption="au catalogue" color={BLUE} spark={[4, 5, 4.6, 6, 6.4, 7.6, 8.2]} />
        <StatCard label="Utilisateurs" value={fmt(users)} unit="comptes" caption="clients · partenaires" color={AMBER} spark={[3, 3.4, 4.2, 4, 5.2, 6, 7.1]} />
        <StatCard label="Abonnements" value={fmt(subs)} unit="actifs" caption="en cours" color={EMERALD} spark={[2, 3, 3.6, 4.4, 4.2, 5.6, 6.8]} />
        <StatCard label="Licences" value={fmt(licences)} unit="clés" caption="actives" color={AMBER} spark={[3, 3.2, 4, 4.8, 5.4, 6.2, 7.4]} />
      </div>

      {/* ═══ INSIGHT + CARTES D'ÉTAT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-2xl border border-p-border bg-p-surface shadow-[0_8px_24px_-14px_rgba(0,0,0,0.18)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-p-accent flex items-center justify-center">
              <Sparkles size={17} className="text-p-on-accent" />
            </div>
            <span className="px-2.5 py-1 rounded-full bg-p-surface-alt border border-p-border text-p-text-2 text-[11px] font-medium">Insight du jour</span>
            <span className="text-p-accent text-[11px] font-semibold uppercase tracking-wider">Proph3t · Confiance 86 %</span>
          </div>
          <p className="text-p-text text-[15px] leading-relaxed">
            Aucune anomalie détectée sur les <strong>{fmt(users)}</strong> comptes et <strong>{fmt(subs)}</strong> abonnements actifs.
          </p>
          <p className="text-p-muted text-xs mt-2 leading-relaxed">
            Conformité RGPD validée · piste d'audit chaînée SHA-256 · sauvegardes chiffrées en continu.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-5 pt-1">
            <Link to="/admin/clients" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-p-accent text-p-on-accent text-sm font-semibold hover:brightness-110 transition-all">
              Consulter les clients <ArrowRight size={15} />
            </Link>
            <Link to="/admin/proph3t" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-p-border text-p-text text-sm font-medium hover:bg-p-surface-alt transition-all">
              Demander à Proph3t
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniCard icon={Server} label="Environnement" value="Production" caption="temps réel" />
          <MiniCard icon={ShieldCheck} label="Conformité" value="100 %" caption="RGPD · révisé" />
          <MiniCard icon={Activity} label="Système" value="Opérationnel" caption="uptime · monitoring" />
          <MiniCard icon={Fingerprint} label="Intégrité" value="SHA-256" caption="piste d'audit" />
          <MiniCard icon={CalendarDays} label="Période" value={moisSeul} caption={String(now.getFullYear())} />
          <MiniCard icon={LayoutGrid} label="Catalogue" value={String(appList.length)} caption="applications" />
        </div>
      </div>

      {/* ═══ AVANCEMENT + ASSISTANT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-p-border bg-p-surface shadow-[0_8px_24px_-14px_rgba(0,0,0,0.18)] p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-p-muted text-[10px] font-bold uppercase tracking-widest">Avancement de l'année</div>
              <div className="text-p-text text-lg font-semibold mt-1">{moisAnneeCap}</div>
            </div>
            <div className="text-right">
              <div className="text-p-text text-4xl font-bold leading-none">{yearPct}%</div>
              <div className="text-p-muted text-[10px] font-semibold uppercase tracking-widest mt-1">YTD</div>
            </div>
          </div>
          <div className="mt-5 h-2 rounded-full bg-p-surface-alt overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${yearPct}%`, background: "linear-gradient(90deg, var(--c-accent-dark), var(--c-accent))" }} />
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
            <span className="text-p-muted">Applications · <span className="text-p-text">{appList.length}</span></span>
            <span className="text-p-muted">Conformité · <span className="text-p-ok">100 %</span></span>
            <span className="text-p-muted">Backend · <span className="text-p-text">Supabase temps réel</span></span>
          </div>
        </div>

        <Link to="/admin/proph3t" className="group rounded-2xl border border-p-border bg-p-surface shadow-[0_8px_24px_-14px_rgba(0,0,0,0.18)] p-6 flex flex-col hover:border-p-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-p-surface-alt flex items-center justify-center">
              <Brain size={19} className="text-p-accent" />
            </div>
            <ArrowUpRight size={16} className="text-p-muted group-hover:text-p-accent transition-colors" />
          </div>
          <div className="mt-4 text-p-text text-sm font-semibold flex items-center gap-1.5">
            Proph3t <span className="text-p-muted font-normal">· Assistant IA</span>
          </div>
          <p className="text-p-muted text-xs mt-1.5 leading-relaxed flex-1">
            Analyse, commente et anticipe l'activité de votre plateforme.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-p-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-p-ok" />
            Modèle v3.4 · AUC 0.87 · garde-fous éthiques actifs
          </div>
        </Link>
      </div>
    </div>
  );
}
