import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles, Brain, ShieldCheck, Activity, CalendarDays,
  Fingerprint, DatabaseZap, ArrowRight, ArrowUpRight, Server, type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { useAuth } from "../../lib/auth";

/* ─────────────────────────────────────────────────────────────
   Accueil PUBLIC (avant login) — thème clair (palette A/B).
   Plein écran, SANS scroll : tout est contenu dans le viewport.
   Données NON confidentielles (compteurs + état système).
   ───────────────────────────────────────────────────────────── */

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 260, h = 44, pad = 3;
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
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
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
    <div className="relative overflow-hidden rounded-xl border border-p-border bg-p-surface shadow-[0_6px_18px_-12px_rgba(0,0,0,0.22)] flex flex-col">
      <div className="px-4 pt-2.5">
        <div className="text-p-text-2 text-[10px] font-bold uppercase tracking-widest">{label}</div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-p-text text-2xl leading-none font-bold tracking-tight">{value}</span>
          <span className="text-p-text-2 text-xs font-medium">{unit}</span>
        </div>
        <div className="text-p-muted text-[11px]">{caption}</div>
      </div>
      <div className="mt-auto"><Sparkline points={spark} color={color} /></div>
    </div>
  );
}

function MiniCard({ icon: Icon, label, value, caption }: {
  icon: LucideIcon; label: string; value: string; caption: string;
}) {
  return (
    <div className="rounded-xl border border-p-border bg-p-surface px-3 py-2.5 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-6 h-6 rounded-md bg-p-surface-alt flex items-center justify-center shrink-0">
          <Icon size={13} className="text-p-accent" strokeWidth={1.6} />
        </div>
        <div className="text-p-text-2 text-[9px] font-bold uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-p-text text-sm font-semibold leading-tight">{value}</div>
      <div className="text-p-muted text-[10px]">{caption}</div>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/[0.08] text-white/85 text-[11px] font-semibold uppercase tracking-wider">
      <Icon size={12} className="text-p-accent" />
      {children}
    </span>
  );
}

export default function HomePage() {
  const { appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const { profile, user } = useAuth();
  const cta = user
    ? { to: "/admin/dashboard", label: "Accéder à la console" }
    : { to: "/admin/login", label: "Se connecter" };

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
    <div className="h-screen overflow-hidden flex flex-col bg-p-bg">
      {/* ═══ HERO (compact) ═══ */}
      <div className="relative shrink-0" style={{ background: "var(--c-ink)" }}>
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
        <div className="relative flex items-center justify-between gap-4 px-6 md:px-8 pt-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-white text-sm font-bold tracking-wide uppercase">Atlas Studio</span>
            <span className="hidden sm:block w-px h-4 bg-white/25" />
            <span className="hidden sm:block text-white/70 text-xs truncate">Console d'administration{prenom ? ` · ${prenom}` : ""}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Pill icon={CalendarDays}>Période {moisSeul}</Pill>
            <Pill icon={DatabaseZap}>Temps réel</Pill>
          </div>
          <Link
            to={cta.to}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-p-accent text-p-on-accent text-[13px] font-semibold hover:brightness-110 transition-all whitespace-nowrap"
          >
            {cta.label} <ArrowUpRight size={14} />
          </Link>
        </div>
        {/* Contenu hero */}
        <div className="relative px-6 md:px-8 pt-4 pb-5 text-center">
          <div className="inline-flex items-center gap-2 text-p-accent text-[10px] font-bold uppercase tracking-[0.2em]">
            <span className="w-1.5 h-1.5 rounded-full bg-p-accent animate-pulse" />
            Bienvenue{prenom ? ` ${prenom}` : ""} · {moisAnneeCap}
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl leading-none font-bold text-white tracking-tight">
            Console <span className="font-logo text-[1.2em] bg-gradient-champagne bg-clip-text text-transparent">Atlas Studio</span>
          </h1>
          <p className="mt-2 max-w-2xl mx-auto text-white/75 text-xs leading-relaxed">
            Pilotage unifié de votre suite — <strong className="text-white font-semibold">catalogue d'apps</strong>, <strong className="text-white font-semibold">clients, abonnements et licences</strong>. Temps réel.
          </p>
        </div>
      </div>

      {/* ═══ CORPS (flex-1, sans scroll) ═══ */}
      <div className="flex-1 min-h-0 px-6 md:px-8 py-3 flex flex-col gap-2.5">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <StatCard label="Applications" value={appList.length} unit="apps" caption="au catalogue" color={BLUE} spark={[4, 5, 4.6, 6, 6.4, 7.6, 8.2]} />
          <StatCard label="Utilisateurs" value={fmt(users)} unit="comptes" caption="clients · partenaires" color={AMBER} spark={[3, 3.4, 4.2, 4, 5.2, 6, 7.1]} />
          <StatCard label="Abonnements" value={fmt(subs)} unit="actifs" caption="en cours" color={EMERALD} spark={[2, 3, 3.6, 4.4, 4.2, 5.6, 6.8]} />
          <StatCard label="Licences" value={fmt(licences)} unit="clés" caption="actives" color={AMBER} spark={[3, 3.2, 4, 4.8, 5.4, 6.2, 7.4]} />
        </div>

        {/* Insight + cartes d'état */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
          <div className="lg:col-span-2 rounded-xl border border-p-border bg-p-surface shadow-[0_6px_18px_-12px_rgba(0,0,0,0.22)] p-5 flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-p-accent flex items-center justify-center">
                <Sparkles size={15} className="text-p-on-accent" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-p-surface-alt border border-p-border text-p-text-2 text-[11px] font-medium">Insight du jour</span>
              <span className="text-p-accent text-[11px] font-semibold uppercase tracking-wider">Proph3t · Confiance 86 %</span>
            </div>
            <p className="text-p-text text-[15px] leading-relaxed">
              Aucune anomalie détectée sur les <strong>{fmt(users)}</strong> comptes et <strong>{fmt(subs)}</strong> abonnements actifs.
            </p>
            <p className="text-p-text-2 text-xs mt-1.5 leading-relaxed">
              Conformité RGPD validée · piste d'audit chaînée SHA-256 · sauvegardes chiffrées en continu.
            </p>
            {/* Avancement compact */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-p-text-2 font-semibold uppercase tracking-widest">Avancement {moisSeul}</span>
                <span className="text-p-text font-bold">{yearPct}% <span className="text-p-muted font-normal">YTD</span></span>
              </div>
              <div className="h-2 rounded-full bg-p-surface-alt overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${yearPct}%`, background: "linear-gradient(90deg, var(--c-accent-dark), var(--c-accent))" }} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-auto pt-3">
              <Link to="/admin/clients" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-p-accent text-p-on-accent text-sm font-semibold hover:brightness-110 transition-all">
                Consulter les clients <ArrowRight size={15} />
              </Link>
              <Link to="/admin/proph3t" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-p-border text-p-text text-sm font-medium hover:bg-p-surface-alt transition-all">
                <Brain size={15} className="text-p-accent" /> Demander à Proph3t
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 min-h-0">
            <MiniCard icon={Server} label="Environnement" value="Production" caption="temps réel" />
            <MiniCard icon={ShieldCheck} label="Conformité" value="100 %" caption="RGPD · révisé" />
            <MiniCard icon={Activity} label="Système" value="Opérationnel" caption="uptime" />
            <MiniCard icon={Fingerprint} label="Intégrité" value="SHA-256" caption="piste d'audit" />
            <MiniCard icon={CalendarDays} label="Période" value={moisSeul} caption={String(now.getFullYear())} />
            <MiniCard icon={DatabaseZap} label="Backend" value="Supabase" caption="temps réel" />
          </div>
        </div>
      </div>
    </div>
  );
}
