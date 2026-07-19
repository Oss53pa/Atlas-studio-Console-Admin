import { useState } from "react";
import { Plus, RefreshCw, Eye, EyeOff, Radio } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { useCortexDataSources, useCortexEvents } from "./hooks";
import type { CpsDataSource, SourceMode } from "./types";
import { Badge, CpsModal, Field, Input, Select } from "./ui";
import "./cortex.css";

const MODES: [SourceMode, string][] = [["push", "Push (SDK)"], ["pull", "Pull (connecteur)"], ["manual", "Manuel"]];
const INGEST_URL = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/functions/v1/cortex-ingest`;

function ago(ts: string | null) {
  if (!ts) return "jamais";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return `il y a ${s}s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export default function CortexDataFabricPage() {
  const { rows, loading, createSource, rotateSecret } = useCortexDataSources();
  const { rows: events, refresh: refreshEvents } = useCortexEvents();
  const toast = useToast();
  const [form, setForm] = useState<{ source_app: string; mode: SourceMode } | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);

  const add = async () => {
    if (!form?.source_app) { toast.error("Code source obligatoire"); return; }
    try { await createSource(form.source_app, form.mode); toast.success("Source créée"); setForm(null); }
    catch (e: any) { toast.error(e.message); }
  };
  const rotate = async (id: string) => {
    try { await rotateSecret(id); toast.success("Secret régénéré"); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Data Fabric" subtitle="Cortex — sources d'ingestion, secrets & flux temps réel (CPS-90)">
        <button className="cps-btn" onClick={() => setForm({ source_app: "", mode: "push" })}><Plus size={15} /> Nouvelle source</button>
      </AdminPageHeader>

      <div className="mb-4 text-[12px] text-admin-muted font-mono break-all bg-warm-bg/50 dark:bg-white/[0.03] border border-warm-border dark:border-white/5 rounded-lg px-3 py-2">
        Endpoint d'ingestion : <span className="text-admin-text">{INGEST_URL}</span> <span className="text-admin-muted">· en-tête <code>x-cortex-signature</code> (HMAC-SHA256)</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* Sources */}
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 560 }}>
              <thead>
                <tr className="text-left text-admin-muted border-b border-warm-border dark:border-white/5" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Mode</th>
                  <th className="px-4 py-3 font-medium">Heartbeat</th>
                  <th className="px-4 py-3 font-medium text-right">Évts / rejets</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-admin-muted">Chargement…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-admin-muted">Aucune source. Crée-en une et embarque le SDK dans l'app.</td></tr>}
                {rows.map((s: CpsDataSource) => (
                  <tr key={s.id} className="border-b border-warm-border/60 dark:border-white/5 align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-admin-text">{s.source_app}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <span className="font-mono text-[10px] text-admin-muted">{reveal === s.id ? (s.hmac_secret ?? "—") : "••••••••••"}</span>
                        <button onClick={() => setReveal(reveal === s.id ? null : s.id)} className="text-admin-muted hover:cps-accent">{reveal === s.id ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge tone="blue">{MODES.find(([v]) => v === s.mode)?.[1]}</Badge></td>
                    <td className="px-4 py-3 text-[12px] text-admin-muted">{ago(s.last_seen_at)}<div><Badge tone={s.status === "active" ? "green" : "gray"}>{s.status}</Badge></div></td>
                    <td className="px-4 py-3 text-right money text-[13px]">{s.event_count}{s.reject_count > 0 && <span className="text-red-600"> / {s.reject_count}</span>}</td>
                    <td className="px-4 py-3 text-right"><button title="Régénérer le secret" onClick={() => rotate(s.id)} className="text-admin-muted hover:cps-accent"><RefreshCw size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flux d'événements */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-admin-text text-sm flex items-center gap-1.5"><Radio size={14} className="text-green-600" /> Événements récents</h2>
            <button onClick={refreshEvents} className="text-admin-muted hover:cps-accent"><RefreshCw size={13} /></button>
          </div>
          <div className="space-y-1.5 max-h-[520px] overflow-y-auto">
            {events.length === 0 && <div className="text-sm text-admin-muted py-6 text-center bg-white dark:bg-admin-surface rounded-xl border border-warm-border dark:border-white/5">Aucun événement ingéré.</div>}
            {events.map((e) => (
              <div key={e.id} className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-lg px-3 py-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-admin-text">{e.event_type}</span>
                  <span className="text-admin-muted">{ago(e.received_at)}</span>
                </div>
                <div className="text-admin-muted font-mono text-[10px]">{e.source_app}{(e.payload as any)?.amount_fcfa ? ` · ${(e.payload as any).amount_fcfa} FCFA` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {form && (
        <CpsModal title="Nouvelle source d'ingestion" onClose={() => setForm(null)}
          footer={<><button className="cps-btn cps-btn-ghost" onClick={() => setForm(null)}>Annuler</button><button className="cps-btn" onClick={add}>Créer</button></>}>
          <Field label="Code source (source_app)"><Input value={form.source_app} onChange={(e) => setForm({ ...form, source_app: e.target.value })} placeholder="atlas_fna" /></Field>
          <Field label="Mode"><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as SourceMode })} options={MODES} /></Field>
          <p className="text-[12px] text-admin-muted">Un secret HMAC est généré automatiquement — copie-le dans l'app émettrice (SDK <code>@atlas/cortex-emitter</code>).</p>
        </CpsModal>
      )}
    </div>
  );
}
