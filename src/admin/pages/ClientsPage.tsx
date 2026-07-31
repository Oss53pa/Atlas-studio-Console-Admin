import { useState, useEffect, useMemo } from "react";
import { Search, UserX, UserCheck, Plus, Pencil, Trash2, Download, KeyRound, Gift } from "lucide-react";
import { ADMIN_INPUT_CLASS } from "../components/AdminFormField";
import { supabase } from "../../lib/supabase";
import { apiCall } from "../../lib/api";
import { exportToCSV } from "../../lib/csvExport";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { GrantAccessModal } from "../components/GrantAccessModal";
import { useToast } from "../contexts/ToastContext";
import { useAppFilter } from "../contexts/AppFilterContext";
import { formatSupabaseError } from "../../lib/errorMessages";
import type { Profile, Subscription, Invoice } from "../../lib/database.types";
import { useAppCatalog } from "../../hooks/useAppCatalog";

type DetailTab = "profile" | "subscriptions" | "invoices" | "communications";

type MessageDelivery = {
  id: string; subscription_id: string | null; evenement: string; canal: string;
  statut: string; sujet: string | null; destinataire: string; corps_snapshot: string;
  provider_message_id: string | null; created_at: string; envoye_le: string | null;
  remis_le: string | null; ouvert_le: string | null; clique_le: string | null; erreur: string | null;
};

const MSG_STATUT: Record<string, { label: string; cls: string }> = {
  en_attente: { label: "En attente", cls: "text-amber-600 bg-amber-500/10" },
  envoye: { label: "Envoyé", cls: "text-blue-600 bg-blue-500/10" },
  remis: { label: "Remis", cls: "text-emerald-600 bg-emerald-500/10" },
  ouvert: { label: "Ouvert", cls: "text-emerald-700 bg-emerald-500/10" },
  clique: { label: "Cliqué", cls: "text-emerald-700 bg-emerald-500/10" },
  rebond_dur: { label: "Rebond dur", cls: "text-red-600 bg-red-500/10" },
  rebond_doux: { label: "Rebond", cls: "text-orange-600 bg-orange-500/10" },
  plainte: { label: "Plainte", cls: "text-red-700 bg-red-500/10" },
  echec: { label: "Échec", cls: "text-red-600 bg-red-500/10" },
};

// NOTE: defined at module scope (not inside ClientsPage) so inputs don't
// remount on every parent re-render and lose focus between keystrokes.
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="mb-3">
    <label className="block text-admin-text/80 text-[13px] font-semibold mb-1.5">{label}</label>
    {children}
  </div>
);

export default function ClientsPage() {
  const { appMap, appList } = useAppCatalog();
  const { success, error: showError } = useToast();
  const { selectedApp } = useAppFilter();
  const [clients, setClients] = useState<Profile[]>([]);
  const [allSubs, setAllSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [clientSubs, setClientSubs] = useState<Subscription[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [clientMessages, setClientMessages] = useState<MessageDelivery[]>([]);
  const [viewMsg, setViewMsg] = useState<MessageDelivery | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Profile | null>(null);
  // Brief 2026-05-07 : creation client = email + full_name + trial obligatoire.
  // Le mot de passe est genere par admin-clients v9 et envoye par email d'invitation.
  // company_name / phone restent pour l'edition (pas demandes a la creation).
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    company_name: "",
    phone: "",
    trial_app_id: "",
    trial_plan: "",
    trial_days: 14,
  });
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // ── Octroi d'accès unifié (CDC 7.3) ──
  const [grantAccessClient, setGrantAccessClient] = useState<Profile | null>(null);

  const fetchClients = async () => {
    const [profilesRes, subsRes] = await Promise.all([
      supabase.from("profiles").select("*").not("role", "in", "(admin,super_admin)").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, app_id, status"),
    ]);
    if (profilesRes.data) setClients(profilesRes.data as Profile[]);
    if (subsRes.data) setAllSubs(subsRes.data as Subscription[]);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  // ─── Filter by app (clients who have a subscription for selected app) ───
  const appClientIds = useMemo(() => {
    if (selectedApp === "all") return null;
    return new Set(allSubs.filter(s => s.app_id === selectedApp).map(s => s.user_id));
  }, [allSubs, selectedApp]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "suspended" && c.is_active) return false;
      if (appClientIds && !appClientIds.has(c.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(c.full_name || "").toLowerCase().includes(q) && !(c.email || "").toLowerCase().includes(q) && !(c.company_name || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [clients, search, statusFilter, appClientIds]);

  // ─── KPIs ───
  const activeCount = clients.filter(c => c.is_active).length;
  const suspendedCount = clients.filter(c => !c.is_active).length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = clients.filter(c => new Date(c.created_at) >= monthStart).length;

  // ─── Actions ───
  const toggleActive = async (client: Profile) => {
    const { error } = await supabase.from("profiles").update({ is_active: !client.is_active, updated_at: new Date().toISOString() }).eq("id", client.id);
    if (error) { console.error("Update error:", error); showError?.(formatSupabaseError(error)); }
    fetchClients();
    success(client.is_active ? "Client suspendu" : "Client réactivé");
  };

  const openClientDetail = async (client: Profile) => {
    setSelectedClient(client);
    setDetailTab("profile");
    const [subsRes, invRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", client.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", client.id).order("created_at", { ascending: false }).limit(20),
    ]);
    const subs = (subsRes.data as unknown as Subscription[]) || [];
    setClientSubs(subs);
    setClientInvoices(invRes.data as unknown as Invoice[] || []);
    // Communications : messages liés aux abonnements du client (lecture admin RLS)
    const subIds = subs.map(s => s.id).filter(Boolean);
    if (subIds.length) {
      const { data: msgs } = await supabase.from("message_deliveries").select("*")
        .in("subscription_id", subIds).order("created_at", { ascending: false });
      setClientMessages((msgs as unknown as MessageDelivery[]) || []);
    } else {
      setClientMessages([]);
    }
  };

  const reloadMessages = async (subIds: string[]) => {
    if (!subIds.length) return;
    const { data: msgs } = await supabase.from("message_deliveries").select("*")
      .in("subscription_id", subIds).order("created_at", { ascending: false });
    setClientMessages((msgs as unknown as MessageDelivery[]) || []);
  };

  const handleResendAccess = async (subscriptionId: string | null) => {
    if (!subscriptionId) { showError("Aucun abonnement lié à ce message"); return; }
    setResending(subscriptionId);
    try {
      const msgId = await supabase.rpc("queue_access_resend", { p_subscription_id: subscriptionId });
      if (msgId.error) throw msgId.error;
      await apiCall(`dispatch-access-messages?id=${msgId.data}`, { method: "POST" });
      success("Accès renvoyés au client");
      await reloadMessages(clientSubs.map(s => s.id));
    } catch (err: unknown) { showError(formatSupabaseError(err)); }
    setResending(null);
  };

  const handleResetPassword = async (client: Profile) => {
    setConfirmDialog({
      open: true, title: "Réinitialiser le mot de passe ?",
      message: `Un nouveau mot de passe sera envoyé à ${client.email}.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await apiCall("admin-reset-password", { method: "POST", body: { userId: client.id, email: client.email, fullName: client.full_name } });
          success(`Nouveau mot de passe envoyé à ${client.email}`);
        } catch (err: unknown) { showError(formatSupabaseError(err)); }
      },
    });
  };

  const openCreateForm = () => {
    setEditClient(null);
    const firstApp = appList[0];
    const firstPlan = firstApp ? Object.keys((firstApp.pricing as Record<string, number>) || {})[0] || "" : "";
    setFormData({
      email: "",
      full_name: "",
      company_name: "",
      phone: "",
      trial_app_id: firstApp?.id || "",
      trial_plan: firstPlan,
      trial_days: 14,
    });
    setShowForm(true);
  };
  const openEditForm = (client: Profile) => {
    setEditClient(client);
    setFormData({
      email: client.email || "",
      full_name: client.full_name || "",
      company_name: client.company_name || "",
      phone: client.phone || "",
      trial_app_id: "",
      trial_plan: "",
      trial_days: 14,
    });
    setShowForm(true);
  };

  const handleSaveClient = async () => {
    const fullName = formData.full_name.trim();
    if (!fullName) { showError("Le nom complet est obligatoire."); return; }
    if (!editClient) {
      if (!formData.email.trim()) { showError("L'email est obligatoire."); return; }
      if (!formData.trial_app_id) { showError("Selectionnez l'application a essayer."); return; }
      if (!formData.trial_plan) { showError("Selectionnez le plan du trial."); return; }
      if (!formData.trial_days || formData.trial_days < 1) { showError("Duree du trial invalide."); return; }
    }
    setSaving(true);
    try {
      if (editClient) {
        await supabase.from("profiles").update({ full_name: fullName, company_name: formData.company_name, phone: formData.phone, updated_at: new Date().toISOString() }).eq("id", editClient.id);
        success("Client modifié");
      } else {
        // Brief 2026-05-07 : admin-clients v9 cree user (mot de passe auto-genere),
        // envoie email d'invitation, puis cree la subscription trial.
        await apiCall("admin-clients", {
          method: "POST",
          body: {
            email: formData.email.trim(),
            full_name: fullName,
            trial_app_id: formData.trial_app_id,
            trial_plan: formData.trial_plan,
            trial_days: formData.trial_days,
          },
        });
        success(`Client cree, invitation envoyee a ${formData.email.trim()}`);
      }
      setShowForm(false);
      fetchClients();
    } catch (err: unknown) { showError(formatSupabaseError(err)); }
    setSaving(false);
  };

  const handleDeleteClient = (client: Profile) => {
    setConfirmDialog({
      open: true, title: "Supprimer ce client ?",
      message: `${client.full_name} (${client.email}) sera définitivement supprimé. Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { await apiCall(`admin-clients?id=${client.id}`, { method: "DELETE" }); success("Client supprimé"); fetchClients(); }
        catch (err: unknown) { showError(formatSupabaseError(err)); }
      },
    });
  };

  const bulkSuspend = async (ids: string[]) => {
    await supabase.from("profiles").update({ is_active: false, updated_at: new Date().toISOString() }).in("id", ids);
    fetchClients();
    success(`${ids.length} client(s) suspendu(s)`);
  };

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "full_name", label: "Nom" }, { key: "email", label: "Email" }, { key: "company_name", label: "Entreprise" },
      { key: "phone", label: "Telephone" }, { key: "is_active", label: "Actif", render: (r) => r.is_active ? "Oui" : "Non" },
      { key: "created_at", label: "Inscrit le", render: (r) => new Date(r.created_at).toLocaleDateString("fr-FR") },
    ], "clients");
    success("Export CSV téléchargé");
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const statusFilters: { label: string; value: typeof statusFilter; count: number }[] = [
    { label: "Tous", value: "all", count: clients.length },
    { label: "Actifs", value: "active", count: activeCount },
    { label: "Suspendus", value: "suspended", count: suspendedCount },
  ];

  const DETAIL_TABS: { label: string; value: DetailTab; count?: number }[] = [
    { label: "Profil", value: "profile" },
    { label: "Abonnements", value: "subscriptions", count: clientSubs.length },
    { label: "Factures", value: "invoices", count: clientInvoices.length },
    { label: "Communications", value: "communications", count: clientMessages.length },
  ];

  // inputClass imported from AdminFormField

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Utilisateurs</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{clients.length} clients — {newThisMonth} nouveaux ce mois</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg bg-white dark:bg-admin-surface text-neutral-text dark:text-admin-text/80 text-[13px] font-medium hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={openCreateForm} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouveau client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                statusFilter === f.value ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-text dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, email, entreprise..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
        </div>
      </div>

      {/* Table */}
      <AdminTable
        keyExtractor={(r: Profile) => r.id}
        loading={loading}
        selectable
        bulkActions={[
          { label: "Suspendre", onClick: bulkSuspend, variant: "danger" },
        ]}
        emptyMessage="Aucun client trouvé"
        onRowClick={openClientDetail}
        columns={[
          { key: "full_name", label: "Client", sortable: true, render: (r: Profile) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 dark:bg-admin-accent/10 flex items-center justify-center text-gold dark:text-admin-accent text-[11px] font-semibold flex-shrink-0">
                {getInitials(r.full_name || "?")}
              </div>
              <div>
                <div className="font-medium text-neutral-text dark:text-admin-text">{r.full_name}</div>
                {r.company_name && <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.company_name}</div>}
              </div>
            </div>
          )},
          { key: "email", label: "Email", sortable: true, render: (r: Profile) => <span className="text-[13px]">{r.email}</span> },
          { key: "is_active", label: "Statut", render: (r: Profile) => (
            <AdminBadge status={r.is_active ? "active" : "suspended"} label={r.is_active ? "Actif" : "Suspendu"} />
          )},
          { key: "consents", label: "Consentements", render: (r: Profile) => {
            const terms = (r as any).terms_accepted_at;
            const marketing = (r as any).marketing_opt_in;
            return (
              <div className="flex flex-col gap-0.5 text-[11px]">
                <span className={terms ? "text-green-500" : "text-red-700"}>
                  {terms ? "✓ CGU acceptées" : "✗ CGU manquantes"}
                </span>
                <span className={marketing ? "text-blue-500" : "text-neutral-muted dark:text-admin-muted"}>
                  {marketing ? "✓ Newsletter opt-in" : "— Pas de newsletter"}
                </span>
              </div>
            );
          }},
          { key: "created_at", label: "Inscrit le", sortable: true, render: (r: Profile) =>
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
          },
          { key: "actions", label: "", render: (r: Profile) => (
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => openEditForm(r)} className="p-1.5 rounded hover:bg-white dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:text-admin-accent transition-colors" title="Modifier"><Pencil size={14} /></button>
              <button onClick={() => handleResetPassword(r)} className="p-1.5 rounded hover:bg-blue-50 text-neutral-muted dark:text-admin-muted hover:text-blue-600 transition-colors" title="Reset mot de passe"><KeyRound size={14} /></button>
              <button onClick={() => setGrantAccessClient(r)} className="p-1.5 rounded hover:bg-gold/10 text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors" title="Donner accès"><Gift size={14} /></button>
              <button onClick={() => toggleActive(r)} className={`p-1.5 rounded transition-colors ${r.is_active ? "hover:bg-red-50 text-red-700" : "hover:bg-green-50 text-green-600"}`} title={r.is_active ? "Suspendre" : "Réactiver"}>
                {r.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
              <button onClick={() => handleDeleteClient(r)} className="p-1.5 rounded hover:bg-red-50 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Client detail modal with tabs */}
      <AdminModal open={!!selectedClient} onClose={() => setSelectedClient(null)} title={selectedClient?.full_name || "Client"} size="xl"
        subtitle={selectedClient?.email}>
        {selectedClient && (
          <div>
            <div className="flex gap-2 mb-6 border-b border-warm-border dark:border-admin-surface-alt">
              {DETAIL_TABS.map(tab => (
                <button key={tab.value} onClick={() => setDetailTab(tab.value)}
                  className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                    detailTab === tab.value ? "border-gold text-gold dark:text-admin-accent" : "border-transparent text-neutral-muted dark:text-admin-muted hover:text-neutral-text dark:text-admin-text"
                  }`}>
                  {tab.label} {tab.count !== undefined && <span className="ml-1 text-[11px] opacity-60">{tab.count}</span>}
                </button>
              ))}
            </div>

            {detailTab === "profile" && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Nom</div>
                  <div className="text-neutral-text dark:text-admin-text text-sm">{selectedClient.full_name}</div>
                </div>
                <div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Email</div>
                  <div className="text-neutral-text dark:text-admin-text text-sm">{selectedClient.email}</div>
                </div>
                <div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Entreprise</div>
                  <div className="text-neutral-text dark:text-admin-text text-sm">{selectedClient.company_name || "—"}</div>
                </div>
                <div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Téléphone</div>
                  <div className="text-neutral-text dark:text-admin-text text-sm">{selectedClient.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Statut</div>
                  <AdminBadge status={selectedClient.is_active ? "active" : "suspended"} label={selectedClient.is_active ? "Actif" : "Suspendu"} />
                </div>
                <div>
                  <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Inscrit le</div>
                  <div className="text-neutral-text dark:text-admin-text text-sm">{new Date(selectedClient.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</div>
                </div>
              </div>
            )}

            {detailTab === "subscriptions" && (
              clientSubs.length === 0 ? <p className="text-neutral-muted dark:text-admin-muted text-sm py-4">Aucun abonnement</p> : (
                <div className="space-y-2">
                  {clientSubs.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 bg-white dark:bg-admin-surface-alt rounded-xl">
                      <div>
                        <div className="text-neutral-text dark:text-admin-text text-sm font-medium">{appMap[sub.app_id]?.name || sub.app_id}</div>
                        <div className="text-neutral-muted dark:text-admin-muted text-[11px]">Plan {sub.plan} · Depuis {new Date(sub.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gold dark:text-admin-accent text-sm font-mono font-medium">{Number(sub.price_at_subscription).toLocaleString("fr-FR")} FCFA</span>
                        <AdminBadge status={sub.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {detailTab === "invoices" && (
              clientInvoices.length === 0 ? <p className="text-neutral-muted dark:text-admin-muted text-sm py-4">Aucune facture</p> : (
                <div className="space-y-2">
                  {clientInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-white dark:bg-admin-surface-alt rounded-xl">
                      <div>
                        <div className="text-neutral-text dark:text-admin-text text-sm font-mono">{inv.invoice_number}</div>
                        <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{new Date(inv.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-gold dark:text-admin-accent text-sm font-semibold">{Number(inv.amount).toLocaleString("fr-FR")} {inv.currency || "FCFA"}</span>
                        <AdminBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {detailTab === "communications" && (
              clientMessages.length === 0 ? (
                <p className="text-neutral-muted dark:text-admin-muted text-sm py-4">Aucun message envoyé à ce client.</p>
              ) : (
                <div className="space-y-2">
                  {clientMessages.map(m => {
                    const st = MSG_STATUT[m.statut] || { label: m.statut, cls: "text-neutral-muted bg-neutral-500/10" };
                    return (
                      <div key={m.id} className="p-4 bg-white dark:bg-admin-surface-alt rounded-xl">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                              <span className="text-[11px] text-neutral-muted dark:text-admin-muted uppercase">{m.canal}</span>
                              <span className="text-[11px] text-neutral-muted dark:text-admin-muted">{new Date(m.created_at).toLocaleString("fr-FR")}</span>
                            </div>
                            <div className="text-neutral-text dark:text-admin-text text-sm mt-1 truncate">{m.sujet || m.evenement}</div>
                            <div className="text-neutral-muted dark:text-admin-muted text-[11px]">
                              → {m.destinataire}
                              {m.ouvert_le && " · ouvert"}
                              {m.clique_le && " · cliqué"}
                              {m.erreur && <span className="text-red-600"> · {m.erreur.slice(0, 60)}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setViewMsg(m)} disabled={!m.corps_snapshot}
                              className="px-2.5 py-1.5 text-[12px] rounded-lg border border-warm-border dark:border-admin-surface-alt hover:border-gold/40 text-neutral-text dark:text-admin-text/80 disabled:opacity-40">
                              Voir le message
                            </button>
                            <button onClick={() => handleResendAccess(m.subscription_id)} disabled={resending === m.subscription_id}
                              className="px-2.5 py-1.5 text-[12px] rounded-lg bg-gold dark:bg-admin-accent text-black font-medium hover:bg-gold-dark disabled:opacity-50">
                              {resending === m.subscription_id ? "..." : "Renvoyer"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        )}
      </AdminModal>

      {/* Create/Edit form */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title={editClient ? "Modifier le client" : "Nouveau client"}
        footer={<button onClick={handleSaveClient} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors !py-2.5 ${saving ? "opacity-50" : ""}`}>{saving ? "Sauvegarde..." : editClient ? "Modifier" : "Créer"}</button>}>
        <div className="space-y-1">
          <Field label="Nom complet *"><input required value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} className={ADMIN_INPUT_CLASS} /></Field>

          {!editClient && (
            <>
              <Field label="Email *">
                <input required type="email" value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className={ADMIN_INPUT_CLASS}
                  placeholder="client@entreprise.com"
                />
              </Field>
              <p className="text-neutral-muted dark:text-admin-muted text-[12px] -mt-1 mb-3">
                Un mot de passe sera genere automatiquement et envoye au client par email d'invitation.
              </p>

              <div className="mt-4 mb-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-emerald-400 text-[12px] font-semibold uppercase tracking-wider">Trial gratuit a activer</p>
              </div>
              <Field label="Application *">
                <select required value={formData.trial_app_id}
                  onChange={e => {
                    const appId = e.target.value;
                    const app = appList.find(a => a.id === appId);
                    const firstPlan = app ? Object.keys((app.pricing as Record<string, number>) || {})[0] || "" : "";
                    setFormData(p => ({ ...p, trial_app_id: appId, trial_plan: firstPlan }));
                  }}
                  className={ADMIN_INPUT_CLASS}
                >
                  <option value="">— Selectionner une application —</option>
                  {appList.map(app => (
                    <option key={app.id} value={app.id}>{app.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Plan *">
                  <select required value={formData.trial_plan}
                    onChange={e => setFormData(p => ({ ...p, trial_plan: e.target.value }))}
                    className={ADMIN_INPUT_CLASS}
                    disabled={!formData.trial_app_id}
                  >
                    <option value="">— Plan —</option>
                    {(() => {
                      const app = appList.find(a => a.id === formData.trial_app_id);
                      const plans = app ? Object.keys((app.pricing as Record<string, number>) || {}) : [];
                      return plans.map(plan => <option key={plan} value={plan}>{plan}</option>);
                    })()}
                  </select>
                </Field>
                <Field label="Duree (jours) *">
                  <input required type="number" min={1} max={365} value={formData.trial_days}
                    onChange={e => setFormData(p => ({ ...p, trial_days: parseInt(e.target.value) || 14 }))}
                    className={ADMIN_INPUT_CLASS}
                  />
                </Field>
              </div>
            </>
          )}

          {editClient && (
            <>
              <Field label="Entreprise"><input value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} className={ADMIN_INPUT_CLASS} /></Field>
              <Field label="Téléphone"><input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className={ADMIN_INPUT_CLASS} /></Field>
            </>
          )}
        </div>
      </AdminModal>

      {grantAccessClient && (
        <GrantAccessModal
          client={grantAccessClient}
          appList={appList}
          activeAppIds={new Set(allSubs.filter(s => s.user_id === grantAccessClient.id && (s.status === "active" || s.status === "trial")).map(s => s.app_id))}
          onClose={() => setGrantAccessClient(null)}
          onDone={fetchClients}
        />
      )}

      {/* Visionneuse du message envoyé (pièce probante) */}
      <AdminModal open={!!viewMsg} onClose={() => setViewMsg(null)} title="Message envoyé" size="xl"
        subtitle={viewMsg ? `${viewMsg.destinataire} · ${new Date(viewMsg.created_at).toLocaleString("fr-FR")}${viewMsg.provider_message_id ? ` · ${viewMsg.provider_message_id}` : ""}` : undefined}>
        {viewMsg && (
          <iframe title="message" srcDoc={viewMsg.corps_snapshot}
            className="w-full h-[60vh] rounded-lg border border-warm-border dark:border-admin-surface-alt bg-white" sandbox="" />
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
