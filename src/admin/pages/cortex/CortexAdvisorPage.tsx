import { useState } from "react";
import { Sparkles, Radar, Check, X, BookOpen } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { useCortexInsights } from "./hooks";
import type { CpsInsight, InsightSeverity, InsightStatus } from "./types";
import { Badge, CpsModal, Field, Textarea } from "./ui";
import "./cortex.css";

const SEV: Record<InsightSeverity, { label: string; tone: string }> = {
  info: { label: "Info", tone: "gray" },
  attention: { label: "Attention", tone: "amber" },
  critique: { label: "Critique", tone: "red" },
};
const STATUS_LABEL: Record<InsightStatus, string> = {
  nouveau: "Nouveau", lu: "Lu", accepte: "Accepté", rejete: "Rejeté", converti_en_action: "Converti en action",
};
const TYPE_LABEL: Record<string, string> = {
  alerte_derive: "Alerte dérive", opportunite: "Opportunité", arbitrage_portefeuille: "Arbitrage portefeuille",
  hypothese_suggeree: "Hypothèse suggérée", risque: "Risque", synthese_periodique: "Synthèse",
};

export default function CortexAdvisorPage() {
  const { rows, loading, triage, detectSignals, runAdvisor } = useCortexInsights();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ insight: CpsInsight; status: InsightStatus } | null>(null);
  const [filter, setFilter] = useState<"ouverts" | "tous">("ouverts");

  const shown = rows.filter((r) => filter === "tous" || ["nouveau", "lu"].includes(r.status));
  const open = rows.filter((r) => ["nouveau", "lu"].includes(r.status)).length;

  const detect = async () => {
    setBusy(true);
    try { const n = await detectSignals(); toast.success(n > 0 ? `${n} signal(s) détecté(s)` : "Aucun signal — tout est au vert"); }
    catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };
  const ai = async () => {
    setBusy(true);
    try { const r = await runAdvisor(); toast.success(`${r.inserted} insight(s) IA · ${r.rejected_count} rejeté(s) (contrôle chiffres)`); }
    catch (e: any) { toast.error("Analyse IA indisponible — l'Edge Function cortex-advisor-feed doit être déployée. (" + (e.message ?? "") + ")"); }
    setBusy(false);
  };
  const applyTriage = async (insight: CpsInsight, status: InsightStatus, human_note?: string) => {
    try { await triage(insight.id, status, human_note); toast.success("Insight " + STATUS_LABEL[status].toLowerCase()); setNote(null); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div data-module="cortex">
      <AdminPageHeader title="PROPH3T Advisor" subtitle={`Cortex — orientations à valider · ${open} ouvert(s)`}>
        <div className="flex items-center gap-2">
          <button className="cps-btn cps-btn-ghost" onClick={detect} disabled={busy}><Radar size={15} /> Détecter les signaux</button>
          <button className="cps-btn" onClick={ai} disabled={busy}><Sparkles size={15} /> Analyse IA</button>
        </div>
      </AdminPageHeader>

      <div className="flex items-center gap-2 mb-4">
        {(["ouverts", "tous"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={"px-3 py-1.5 rounded-full text-[12px] font-semibold border " + (filter === f ? "cps-accent-bg border-transparent" : "border-warm-border dark:border-white/10 text-admin-muted")}>
            {f === "ouverts" ? "À traiter" : "Tous"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <div className="text-sm text-admin-muted py-8 text-center">Chargement…</div>}
        {!loading && shown.length === 0 && (
          <div className="text-sm text-admin-muted py-12 text-center bg-white dark:bg-admin-surface rounded-2xl border border-warm-border dark:border-white/5">
            Aucun insight. Lance « Détecter les signaux » (déterministe, sans IA) ou l'analyse IA.
          </div>
        )}
        {shown.map((i) => (
          <article key={i.id} className="cps-insight bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge tone={SEV[i.severity].tone}>{SEV[i.severity].label}</Badge>
                <Badge tone="blue">{TYPE_LABEL[i.insight_type] ?? i.insight_type}</Badge>
                <h3 className="font-semibold text-admin-text">{i.title}</h3>
              </div>
              <Badge tone={i.status === "accepte" ? "green" : i.status === "rejete" ? "red" : "gray"}>{STATUS_LABEL[i.status]}</Badge>
            </div>

            <p className="text-[13.5px] text-admin-text mt-2 leading-relaxed whitespace-pre-line">{i.body}</p>

            <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
              <div className="text-[10px] text-admin-muted font-mono">
                {i.model_used ?? "—"}{i.inputs_hash ? ` · inputs ${i.inputs_hash.slice(0, 8)}` : ""}
              </div>
              {["nouveau", "lu"].includes(i.status) && (
                <div className="flex items-center gap-2">
                  <button onClick={() => applyTriage(i, "lu")} className="cps-btn cps-btn-ghost"><BookOpen size={13} /> Lu</button>
                  <button onClick={() => setNote({ insight: i, status: "rejete" })} className="cps-btn cps-btn-ghost"><X size={13} /> Rejeter</button>
                  <button onClick={() => setNote({ insight: i, status: "accepte" })} className="cps-btn"><Check size={13} /> Accepter</button>
                </div>
              )}
            </div>
            {i.human_note && <div className="mt-2 text-[12px] text-admin-muted border-l-2 border-warm-border dark:border-white/10 pl-2">Note : {i.human_note}</div>}
          </article>
        ))}
      </div>

      {note && (
        <CpsModal title={note.status === "accepte" ? "Accepter l'insight" : "Rejeter l'insight"} onClose={() => setNote(null)}
          footer={<>
            <button className="cps-btn cps-btn-ghost" onClick={() => setNote(null)}>Annuler</button>
            <button className="cps-btn" onClick={() => applyTriage(note.insight, note.status, (document.getElementById("cps-note") as HTMLTextAreaElement)?.value)}>
              Confirmer
            </button>
          </>}>
          <p className="text-[13px] text-admin-text font-medium">{note.insight.title}</p>
          <Field label="Note (décision, contexte)"><Textarea id="cps-note" placeholder="Pourquoi cette décision…" /></Field>
          {note.status === "accepte" && (
            <p className="text-[12px] text-admin-muted">La création automatique de tâche CockpitJourney arrivera avec le connecteur CJ.</p>
          )}
        </CpsModal>
      )}
    </div>
  );
}
