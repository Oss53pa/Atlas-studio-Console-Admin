import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, ExternalLink, Pencil, BarChart3, AlertTriangle, Users, Repeat,
  Wallet, Receipt, Eye, EyeOff, Globe2, CreditCard, TrendingUp, Layers, ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminCard } from "../components/AdminCard";
import { AdminBadge } from "../components/AdminBadge";
import { useAppFilter } from "../contexts/AppFilterContext";
import { useToast } from "../contexts/ToastContext";
import type { AppRow, Subscription, Invoice, ErrorLogRow } from "../../lib/database.types";

const fmt = (n: number) => n.toLocaleString("fr-FR");
const fcfa = (n: number) => `${fmt(Math.round(n))} FCFA`;

interface ProfileLite { id: string; full_name: string | null; email: string | null }

const SEVERITY_TONE: Record<string, string> = {
  critical: "text-red-700 bg-red-500/10 border-red-500/25",
  error: "text-red-700 bg-red-500/10 border-red-500/25",
  warning: "text-orange-700 bg-amber-500/10 border-amber-500/25",
  info: "text-blue-700 bg-blue-500/10 border-blue-500/25",
};

export default function AppCockpitPage() {
  const { appId = "" } = useParams();
  const navigate = useNavigate();
  const { setSelectedApp } = useAppFilter();
  const { success, error: showError } = useToast();

  const [app, setApp] = useState<AppRow | null>(null);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [errors, setErrors] = useState<ErrorLogRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Entrer dans le cockpit d'une app scope toute la console sur cette app.
  useEffect(() => { if (appId) setSelectedApp(appId); }, [appId, setSelectedApp]);

  const fetchAll = async () => {
    setLoading(true);
    const [appRes, subsRes, invRes, errRes] = await Promise.all([
      supabase.from("apps").select("*").eq("id", appId).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("app_id", appId),
      supabase.from("invoices").select("*").eq("app_id", appId),
      supabase.from("error_logs").select("*").eq("app_id", appId).eq("status", "open").order("last_seen_at", { ascending: false }).limit(6),
    ]);

    if (appRes.error || !appRes.data) { setNotFound(true); setLoading(false); return; }
    setApp(appRes.data as unknown as AppRow);
    const subsData = (subsRes.data || []) as unknown as Subscription[];
    const invData = (invRes.data || []) as unknown as Invoice[];
    setSubs(subsData);
    setInvoices(invData);
    setErrors((errRes.data || []) as unknown as ErrorLogRow[]);

    // Noms clients pour les abonnements récents
    const userIds = Array.from(new Set(subsData.map(s => s.user_id))).slice(0, 100);
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      const map: Record<string, ProfileLite> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (appId) fetchAll(); /* eslint-disable-next-line */ }, [appId]);

  const kpi = useMemo(() => {
    const active = subs.filter(s => s.status === "active" || s.status === "trial");
    const recurring = active.reduce((sum, s) => sum + (Number(s.price_at_subscription) || 0), 0);
    const uniqueClients = new Set(active.map(s => s.user_id)).size;
    const cashed = invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const pendingInv = invoices.filter(i => i.status === "pending").length;
    const critical = errors.filter(e => e.severity === "critical").length;
    return { activeCount: active.length, recurring, uniqueClients, cashed, pendingInv, openErrors: errors.length, critical };
  }, [subs, invoices, errors]);

  const planRows = useMemo(() => {
    const pricing = (app?.pricing || {}) as Record<string, number>;
    const activeByPlan: Record<string, number> = {};
    subs.filter(s => s.status === "active" || s.status === "trial").forEach(s => { activeByPlan[s.plan] = (activeByPlan[s.plan] || 0) + 1; });
    const keys = Array.from(new Set([...Object.keys(pricing), ...Object.keys(activeByPlan)]));
    return keys.map(plan => ({ plan, price: pricing[plan] ?? null, count: activeByPlan[plan] || 0 }))
      .sort((a, b) => (b.count - a.count) || (b.price ?? 0) - (a.price ?? 0));
  }, [app, subs]);

  const recentSubs = useMemo(
    () => [...subs].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 6),
    [subs],
  );

  const clientName = (uid: string) => profiles[uid]?.full_name || profiles[uid]?.email || uid.slice(0, 8);
  const dateFr = (d: string | null) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const toggleVisibility = async () => {
    if (!app) return;
    const next = !app.visible;
    setApp({ ...app, visible: next });
    const { error } = await supabase.from("apps").update({ visible: next, updated_at: new Date().toISOString() }).eq("id", app.id);
    if (error) { setApp({ ...app, visible: app.visible }); showError("Impossible de changer la visibilité"); }
    else success(next ? `${app.name} est visible sur le site public` : `${app.name} est masquée du site public`);
  };

  if (notFound) {
    return (
      <div className="max-w-3xl">
        <Link to="/admin/apps" className="inline-flex items-center gap-1.5 text-admin-muted hover:text-admin-accent text-[13px] mb-6"><ArrowLeft size={14} /> Applications</Link>
        <div className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-12 text-center">
          <p className="text-admin-text font-semibold">Application introuvable</p>
          <p className="text-admin-muted text-sm mt-1">L'identifiant « {appId} » ne correspond à aucune application.</p>
        </div>
      </div>
    );
  }

  const ActionBtn = ({ icon: Icon, label, onClick, to, href }: { icon: any; label: string; onClick?: () => void; to?: string; href?: string }) => {
    const cls = "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-admin-surface border border-admin-surface-alt text-admin-text hover:border-admin-accent/45 hover:bg-admin-surface-alt/60 transition-all";
    const inner = <><Icon size={14} /> {label}</>;
    if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}<ExternalLink size={12} className="opacity-60" /></a>;
    if (to) return <Link to={to} className={cls}>{inner}</Link>;
    return <button onClick={onClick} className={cls}>{inner}</button>;
  };

  return (
    <div className="max-w-6xl">
      <Link to="/admin/apps" className="inline-flex items-center gap-1.5 text-admin-muted hover:text-admin-accent text-[13px] mb-4"><ArrowLeft size={14} /> Applications</Link>

      {/* Hero identité */}
      <div className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-6 shadow-premium mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: app?.color || "var(--c-accent-dark)" }}>
              {(app?.name || appId).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-admin-text text-2xl font-bold truncate">{app?.name || appId}</h1>
                {app && <AdminBadge status={app.status} />}
                <span className="text-admin-muted text-[12px] font-mono">{app?.type}</span>
              </div>
              <p className="text-admin-muted text-sm mt-0.5">{app?.tagline || "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {app?.external_url && <ActionBtn icon={Globe2} label="Landing" href={app.external_url} />}
            <ActionBtn icon={BarChart3} label="Analytics" to="/admin/analytics" />
            <ActionBtn icon={AlertTriangle} label="Erreurs" to={`/admin/error-monitor/${appId}`} />
            <ActionBtn icon={Pencil} label="Modifier" to={`/admin/apps?edit=${appId}`} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <AdminCard label="Abonnés actifs" value={loading ? "…" : kpi.activeCount} icon={Users} sub="abonnements actifs + essais" onClick={() => navigate("/admin/subscriptions")} />
        <AdminCard label={`Revenu récurrent / ${app?.pricing_period || "mois"}`} value={loading ? "…" : fcfa(kpi.recurring)} icon={TrendingUp} sub="somme des abonnements actifs" />
        <AdminCard label="Clients uniques" value={loading ? "…" : kpi.uniqueClients} icon={Users} sub="comptes distincts actifs" onClick={() => navigate("/admin/clients")} />
        <AdminCard label="Revenu encaissé" value={loading ? "…" : fcfa(kpi.cashed)} icon={Wallet} sub="factures payées (cumul)" onClick={() => navigate("/admin/invoices")} />
        <AdminCard label="Factures en attente" value={loading ? "…" : kpi.pendingInv} icon={Receipt} sub="paiements à relancer" onClick={() => navigate("/admin/invoices")} />
        <AdminCard label="Erreurs ouvertes" value={loading ? "…" : kpi.openErrors} icon={AlertTriangle} sub={kpi.critical > 0 ? `${kpi.critical} critique(s)` : "aucune critique"} onClick={() => navigate(`/admin/error-monitor/${appId}`)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plans & adoption */}
          <section className="bg-admin-surface border border-admin-surface-alt rounded-2xl overflow-hidden shadow-premium">
            <div className="px-5 py-4 border-b border-admin-surface-alt flex items-center justify-between">
              <h2 className="text-admin-text font-semibold text-sm flex items-center gap-2"><Layers size={15} className="text-admin-accent" /> Plans &amp; adoption</h2>
              <Link to="/admin/plans" className="text-admin-accent text-[12px] font-medium hover:underline inline-flex items-center gap-0.5">Gérer <ChevronRight size={13} /></Link>
            </div>
            {planRows.length === 0 ? (
              <p className="text-admin-muted text-sm p-6 text-center">Aucun plan tarifaire configuré.</p>
            ) : (
              <div className="divide-y divide-admin-surface-alt">
                {planRows.map(({ plan, price, count }) => (
                  <div key={plan} className="flex items-center justify-between px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="text-admin-text text-[13px] font-medium truncate">{plan}</div>
                      <div className="text-admin-muted text-[11.5px]">{price != null ? `${fcfa(price)} / ${app?.pricing_period || "mois"}` : "tarif non défini"}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-admin-accent font-semibold text-[15px] tabular-nums">{count}</span>
                      <span className="text-admin-muted text-[11px]">abonné{count > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Abonnements récents */}
          <section className="bg-admin-surface border border-admin-surface-alt rounded-2xl overflow-hidden shadow-premium">
            <div className="px-5 py-4 border-b border-admin-surface-alt flex items-center justify-between">
              <h2 className="text-admin-text font-semibold text-sm flex items-center gap-2"><Repeat size={15} className="text-admin-accent" /> Abonnements récents</h2>
              <Link to="/admin/subscriptions" className="text-admin-accent text-[12px] font-medium hover:underline inline-flex items-center gap-0.5">Tout voir <ChevronRight size={13} /></Link>
            </div>
            {loading ? (
              <p className="text-admin-muted text-sm p-6 text-center">Chargement…</p>
            ) : recentSubs.length === 0 ? (
              <p className="text-admin-muted text-sm p-6 text-center">Aucun abonnement pour cette application.</p>
            ) : (
              <div className="divide-y divide-admin-surface-alt">
                {recentSubs.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3 gap-3">
                    <div className="min-w-0">
                      <div className="text-admin-text text-[13px] font-medium truncate">{clientName(s.user_id)}</div>
                      <div className="text-admin-muted text-[11.5px]">{s.plan} · {dateFr(s.created_at)}</div>
                    </div>
                    <AdminBadge status={s.status} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Landing / site public */}
          <section className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-5 shadow-premium">
            <h2 className="text-admin-text font-semibold text-sm flex items-center gap-2 mb-3"><Globe2 size={15} className="text-admin-accent" /> Landing &amp; site public</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-admin-muted text-[12.5px]">Landing page</span>
                {app?.external_url
                  ? <a href={app.external_url} target="_blank" rel="noreferrer" className="text-admin-accent text-[12.5px] font-medium hover:underline inline-flex items-center gap-1 max-w-[160px] truncate">{app.external_url.replace(/^https?:\/\//, "")} <ExternalLink size={11} /></a>
                  : <span className="text-admin-muted text-[12.5px]">non définie</span>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-admin-muted text-[12.5px]">Visibilité site</span>
                <button onClick={toggleVisibility} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${app?.visible ? "bg-admin-success/15 text-green-700 border-admin-success/30 hover:bg-admin-success/25" : "bg-admin-surface-alt text-admin-muted border-admin-surface-alt hover:bg-admin-surface-alt/80"}`}>
                  {app?.visible ? <Eye size={12} /> : <EyeOff size={12} />}{app?.visible ? "Visible" : "Masquée"}
                </button>
              </div>
              <Link to="/admin/landing-pages" className="block text-center mt-1 px-3 py-2 rounded-lg border border-admin-surface-alt text-admin-text text-[12.5px] font-medium hover:border-admin-accent/45 hover:bg-admin-surface-alt/60 transition-all">Gérer les landing pages</Link>
            </div>
          </section>

          {/* Erreurs récentes */}
          <section className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-5 shadow-premium">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-admin-text font-semibold text-sm flex items-center gap-2"><AlertTriangle size={15} className="text-admin-accent" /> Erreurs ouvertes</h2>
              <Link to={`/admin/error-monitor/${appId}`} className="text-admin-accent text-[12px] font-medium hover:underline">Détail</Link>
            </div>
            {loading ? (
              <p className="text-admin-muted text-sm py-4 text-center">Chargement…</p>
            ) : errors.length === 0 ? (
              <p className="text-admin-muted text-[12.5px] py-4 text-center">Aucune erreur ouverte 🎉</p>
            ) : (
              <div className="space-y-2">
                {errors.slice(0, 5).map(e => (
                  <div key={e.id} className={`px-3 py-2 rounded-lg border text-[11.5px] ${SEVERITY_TONE[e.severity] || SEVERITY_TONE.info}`}>
                    <div className="font-medium truncate">{e.message}</div>
                    <div className="opacity-70 mt-0.5">{e.occurrence_count}× · {e.component_name || e.environment}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Facturation raccourci */}
          <section className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-5 shadow-premium">
            <h2 className="text-admin-text font-semibold text-sm flex items-center gap-2 mb-3"><CreditCard size={15} className="text-admin-accent" /> Facturation</h2>
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="text-admin-muted">Factures ({invoices.length})</span>
              <Link to="/admin/invoices" className="text-admin-accent font-medium hover:underline">Ouvrir</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
