import { useState, useMemo } from "react";
import { Gift, Check } from "lucide-react";
import { AdminModal } from "./AdminModal";
import { ADMIN_INPUT_CLASS } from "./AdminFormField";
import { apiCall } from "../../lib/api";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";
import type { Profile } from "../../lib/database.types";

// CDC v2.1 Partie 7.3 — formulaire d'octroi unifié (remplace « Accès test » + « Offrir »).
// N'écrit rien directement : appelle l'Edge Function admin-grant -> provision_subscription.

type AppItem = { id: string; name: string; pricing?: Record<string, number> };

const GRANT_DURATIONS = [
  { label: "7 jours", days: 7 },
  { label: "14 jours", days: 14 },
  { label: "1 mois", days: 30 },
  { label: "3 mois", days: 90 },
  { label: "6 mois", days: 180 },
  { label: "1 an", days: 365 },
  { label: "Illimité (10 ans)", days: 3650 },
];

const NATURES = [
  { value: "essai", label: "Essai gratuit" },
  { value: "offert", label: "Accès offert" },
  { value: "interne", label: "Interne" },
  { value: "partenaire", label: "Partenaire" },
];

export function GrantAccessModal({
  client, appList, activeAppIds, onClose, onDone,
}: {
  client: Profile;
  appList: AppItem[];
  activeAppIds: Set<string>;
  onClose: () => void;
  onDone: () => void;
}) {
  const { success, error: showError } = useToast();
  const [nature, setNature] = useState("offert");
  const [motif, setMotif] = useState("");
  const [duration, setDuration] = useState(365);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apps, setApps] = useState<Record<string, { selected: boolean; plan: string; seats: number }>>(() => {
    const init: Record<string, { selected: boolean; plan: string; seats: number }> = {};
    for (const a of appList) {
      const plans = Object.keys((a.pricing as Record<string, number>) || {});
      init[a.id] = { selected: false, plan: plans[plans.length - 1] || "", seats: 1 };
    }
    return init;
  });

  const selectedCount = useMemo(() => Object.values(apps).filter((a) => a.selected).length, [apps]);
  const motifRequired = nature !== "payant";
  const motifOk = !motifRequired || motif.trim().length >= 20;

  const submit = async () => {
    const lignes = Object.entries(apps)
      .filter(([, v]) => v.selected)
      .map(([appId, v]) => ({ application_code: appId, plan_code: v.plan, sieges: Math.max(1, v.seats) }));
    if (lignes.length === 0) { showError("Sélectionnez au moins une application"); return; }
    if (!motifOk) { showError("Motif obligatoire (20 caractères minimum)"); return; }

    setSaving(true);
    try {
      const res = await apiCall<any>("admin-grant", {
        method: "POST",
        body: {
          profile_id: client.id,
          nature,
          motif_attribution: motif.trim(),
          duree_jours: duration,
          lignes,
          notify,
        },
      });
      if (res?.ok === false) {
        showError(`Refusé : ${(res.errors || []).join(" · ")}`);
        setSaving(false);
        return;
      }
      const parts = [`Accès accordé (${res.numero || "abonnement créé"}), ${lignes.length} app(s)`];
      if (notify) parts.push(res.notified ? "email envoyé" : "email non envoyé (à relancer)");
      success(parts.join(" — "));
      onDone();
      onClose();
    } catch (err: unknown) {
      showError(formatSupabaseError(err));
    }
    setSaving(false);
  };

  return (
    <AdminModal
      open
      onClose={onClose}
      title="Donner accès"
      subtitle={`${client.full_name || "— profil incomplet —"} · ${client.email}`}
      footer={
        <button
          onClick={submit}
          disabled={saving || selectedCount === 0 || !motifOk}
          className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 text-[13px] flex items-center gap-2 transition-colors ${saving || selectedCount === 0 || !motifOk ? "opacity-50 cursor-not-allowed" : "hover:bg-gold-dark"}`}
        >
          <Gift size={14} />
          {saving ? "Attribution..." : `Accorder ${selectedCount || ""} accès`}
        </button>
      }
    >
      <div className="space-y-5">
        {/* Nature */}
        <div>
          <label className="block text-admin-text/80 text-[13px] font-semibold mb-1.5">Nature de l'attribution</label>
          <select value={nature} onChange={(e) => setNature(e.target.value)} className={ADMIN_INPUT_CLASS}>
            {NATURES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>

        {/* Motif */}
        <div>
          <label className="block text-admin-text/80 text-[13px] font-semibold mb-1.5">
            Motif {motifRequired && <span className="text-red-500">*</span>}
            <span className="ml-2 text-[11px] font-normal text-admin-muted">({motif.trim().length}/20 min)</span>
          </label>
          <textarea
            value={motif} onChange={(e) => setMotif(e.target.value)} rows={2}
            placeholder="POC demandé par le DAF lors du rendez-vous du…"
            className={ADMIN_INPUT_CLASS + " resize-none" + (motifRequired && !motifOk ? " border-red-500/50" : "")}
          />
        </div>

        {/* Applications */}
        <div>
          <label className="block text-admin-text/80 text-[13px] font-semibold mb-2">Applications</label>
          <div className="space-y-2">
            {appList.map((app) => {
              const st = apps[app.id];
              if (!st) return null;
              const already = activeAppIds.has(app.id);
              const plans = Object.keys((app.pricing as Record<string, number>) || {});
              return (
                <div key={app.id} className={`border rounded-xl p-3 transition-all ${already ? "opacity-50 border-admin-surface-alt" : st.selected ? "border-gold/40 bg-gold/5 dark:bg-admin-accent/5" : "border-warm-border dark:border-admin-surface-alt"}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-[140px]">
                      <input type="checkbox" checked={st.selected} disabled={already}
                        onChange={() => setApps((p) => ({ ...p, [app.id]: { ...p[app.id], selected: !p[app.id].selected } }))}
                        className="w-4 h-4 accent-gold dark:accent-admin-accent" />
                      <span className="text-admin-text text-sm font-medium">{app.name}
                        {already && <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500"><Check size={9} className="inline mr-0.5" />Déjà abonné</span>}
                      </span>
                    </label>
                    {st.selected && !already && (
                      <div className="flex items-center gap-2">
                        {plans.length > 0 && (
                          <select value={st.plan} onChange={(e) => setApps((p) => ({ ...p, [app.id]: { ...p[app.id], plan: e.target.value } }))}
                            className="px-2 py-1.5 bg-white dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-admin-text text-[12px] outline-none">
                            {plans.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                          </select>
                        )}
                        <input type="number" min={1} value={st.seats} title="Sièges"
                          onChange={(e) => setApps((p) => ({ ...p, [app.id]: { ...p[app.id], seats: parseInt(e.target.value) || 1 } }))}
                          className="w-16 px-2 py-1.5 bg-white dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-admin-text text-[12px] outline-none" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Durée */}
        <div>
          <label className="block text-admin-text/80 text-[13px] font-semibold mb-1.5">Durée</label>
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={ADMIN_INPUT_CLASS} disabled={nature === "interne"}>
            {GRANT_DURATIONS.map((d) => <option key={d.days} value={d.days}>{d.label}</option>)}
          </select>
          {nature === "interne" && <p className="text-[11px] text-admin-muted mt-1">Nature interne : sans terme.</p>}
        </div>

        {/* Notification */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="w-4 h-4 accent-gold dark:accent-admin-accent" />
          <span className="text-admin-text text-[13px]">Envoyer l'email d'accès au client (avec liens et mot de passe)</span>
        </label>
      </div>
    </AdminModal>
  );
}
