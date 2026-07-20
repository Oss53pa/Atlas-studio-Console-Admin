import { useMemo, useState } from "react";
import { Plus, Trash2, Link2, Network, LayoutGrid } from "lucide-react";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useToast } from "../../contexts/ToastContext";
import { useCortexCanvas, useCortexCanvasAll, useCortexPortfolio, useCortexAssumptions } from "./hooks";
import type { BlockType, CanvasItem, Confidence, CpsCanvasBlock } from "./types";
import { Badge, CpsModal, Field, Input, Select, Textarea } from "./ui";
import "./cortex.css";

const BLOCK_LABEL: Record<BlockType, string> = {
  partners: "Partenaires clés",
  activities: "Activités clés",
  resources: "Ressources clés",
  value_prop: "Proposition de valeur",
  relations: "Relations clients",
  channels: "Canaux",
  segments: "Segments de clientèle",
  costs: "Structure de coûts",
  revenues: "Flux de revenus",
};
/** Disposition du Business Model Canvas (grille 5 colonnes sur grand écran). */
const BLOCK_POS: Record<BlockType, string> = {
  partners: "lg:col-start-1 lg:row-start-1 lg:row-span-2",
  activities: "lg:col-start-2 lg:row-start-1",
  resources: "lg:col-start-2 lg:row-start-2",
  value_prop: "lg:col-start-3 lg:row-start-1 lg:row-span-2",
  relations: "lg:col-start-4 lg:row-start-1",
  channels: "lg:col-start-4 lg:row-start-2",
  segments: "lg:col-start-5 lg:row-start-1 lg:row-span-2",
  costs: "lg:col-start-1 lg:col-span-2 lg:row-start-3",
  revenues: "lg:col-start-3 lg:col-span-3 lg:row-start-3",
};
const ORDER: BlockType[] = ["partners", "activities", "resources", "value_prop", "relations", "channels", "segments", "costs", "revenues"];
const CONF: Record<Confidence, { label: string; tone: string }> = {
  hypothese: { label: "Hypothèse", tone: "gray" },
  testee: { label: "Testée", tone: "amber" },
  validee: { label: "Validée", tone: "green" },
};

export default function CortexCanvasPage() {
  const [tab, setTab] = useState<"canvas" | "synergies">("canvas");
  const [appId, setAppId] = useState<string>("");           // "" = canvas global
  const { rows: apps } = useCortexPortfolio();
  const { blocks, loading, saveBlock } = useCortexCanvas(appId || undefined);
  const { rows: assumptions } = useCortexAssumptions(appId || undefined);
  const [editing, setEditing] = useState<CpsCanvasBlock | null>(null);
  const toast = useToast();

  const byType = useMemo(() => {
    const m = new Map<BlockType, CpsCanvasBlock>();
    blocks.forEach((b) => m.set(b.block_type, b));
    return m;
  }, [blocks]);

  return (
    <div data-module="cortex">
      <AdminPageHeader title="Canvas" subtitle="Cortex — modèle économique en 9 blocs et synergies inter-apps">
        <Select value={appId} onChange={(e) => setAppId(e.target.value)}
          options={[["", "Canvas global (Atlas Studio)"], ...apps.map((a) => [a.id, a.name] as [string, string])]} />
      </AdminPageHeader>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setTab("canvas")} className={"cps-tab " + (tab === "canvas" ? "on" : "")}>
          <LayoutGrid size={14} /> Canvas
        </button>
        <button onClick={() => setTab("synergies")} className={"cps-tab " + (tab === "synergies" ? "on" : "")}>
          <Network size={14} /> Synergies
        </button>
      </div>

      {tab === "canvas" && (
        loading ? <div className="text-sm text-admin-muted py-12 text-center">Chargement…</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 auto-rows-fr">
            {ORDER.map((t) => {
              const b = byType.get(t);
              const items = (b?.items ?? []) as CanvasItem[];
              return (
                <button key={t} onClick={() => b && setEditing(b)}
                  className={"text-left bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-3.5 shadow-sm hover:border-[var(--cps-accent)] transition-colors min-h-[130px] " + BLOCK_POS[t]}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-[12px] font-bold uppercase tracking-wide text-admin-muted">{BLOCK_LABEL[t]}</h3>
                    <span className="text-[11px] text-admin-muted">{items.length}</span>
                  </div>
                  {items.length === 0 && <p className="text-[12px] text-admin-muted italic">Cliquer pour remplir…</p>}
                  <ul className="space-y-1.5">
                    {items.map((it, i) => (
                      <li key={i} className="text-[12.5px] text-admin-text leading-snug flex items-start gap-1.5">
                        <span className="mt-[6px] w-1 h-1 rounded-full bg-[var(--cps-accent)] shrink-0" />
                        <span>
                          {it.label}
                          {it.confidence && it.confidence !== "hypothese" && (
                            <span className="ml-1.5 align-middle"><Badge tone={CONF[it.confidence].tone}>{CONF[it.confidence].label}</Badge></span>
                          )}
                          {it.linked_assumption_id && <Link2 size={11} className="inline ml-1 text-admin-muted" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        )
      )}

      {tab === "synergies" && <SynergiesView />}

      {editing && (
        <BlockEditor block={editing} assumptions={assumptions}
          onClose={() => setEditing(null)}
          onSave={async (items) => {
            try { await saveBlock(editing.id, items); toast.success("Bloc enregistré"); setEditing(null); }
            catch (e: any) { toast.error(e.message); }
          }} />
      )}
    </div>
  );
}

/* ── Éditeur d'un bloc ──────────────────────────────────────────────────── */
function BlockEditor({ block, assumptions, onClose, onSave }: {
  block: CpsCanvasBlock;
  assumptions: { id: string; statement: string }[];
  onClose: () => void;
  onSave: (items: CanvasItem[]) => void | Promise<void>;
}) {
  const [items, setItems] = useState<CanvasItem[]>(block.items ?? []);
  const set = (i: number, patch: Partial<CanvasItem>) =>
    setItems((p) => p.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  return (
    <CpsModal title={BLOCK_LABEL[block.block_type]} onClose={onClose}
      footer={<>
        <button className="cps-btn cps-btn-ghost" onClick={onClose}>Annuler</button>
        <button className="cps-btn" onClick={() => onSave(items.filter((i) => i.label.trim()))}>Enregistrer</button>
      </>}>
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="border border-warm-border dark:border-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={it.label} autoFocus={i === items.length - 1}
                onChange={(e) => set(i, { label: e.target.value })} placeholder="Élément…" />
              <button className="cps-btn cps-btn-ghost shrink-0" title="Supprimer"
                onClick={() => setItems((p) => p.filter((_, j) => j !== i))}><Trash2 size={14} /></button>
            </div>
            <Textarea value={it.detail ?? ""} rows={2}
              onChange={(e) => set(i, { detail: e.target.value })} placeholder="Détail (facultatif)" />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Confiance">
                <Select value={it.confidence ?? "hypothese"} onChange={(e) => set(i, { confidence: e.target.value as Confidence })}
                  options={(Object.keys(CONF) as Confidence[]).map((c) => [c, CONF[c].label] as [string, string])} />
              </Field>
              <Field label="Hypothèse liée">
                <Select value={it.linked_assumption_id ?? ""} onChange={(e) => set(i, { linked_assumption_id: e.target.value || null })}
                  options={[["", "—"], ...assumptions.map((a) => [a.id, a.statement.slice(0, 60)] as [string, string])]} />
              </Field>
            </div>
          </div>
        ))}
        <button className="cps-btn cps-btn-ghost w-full justify-center"
          onClick={() => setItems((p) => [...p, { label: "", confidence: "hypothese" }])}>
          <Plus size={14} /> Ajouter un élément
        </button>
      </div>
    </CpsModal>
  );
}

/* ── Synergies : éléments partagés par plusieurs apps ───────────────────── */
function SynergiesView() {
  const { canvases, blocks, loading } = useCortexCanvasAll();
  const { rows: apps } = useCortexPortfolio();

  const shared = useMemo(() => {
    const appOf = new Map(canvases.map((c) => [c.id, c.app_id]));
    const nameOf = new Map(apps.map((a) => [a.id, a.name]));
    // clé = "bloc|libellé normalisé" → ensemble d'apps qui le citent
    const map = new Map<string, { type: BlockType; label: string; apps: Set<string> }>();
    for (const b of blocks) {
      const appId = appOf.get(b.canvas_id);
      if (!appId) continue;                                   // on ignore le canvas global
      for (const it of (b.items ?? []) as CanvasItem[]) {
        const norm = it.label.trim().toLowerCase();
        if (!norm) continue;
        const key = b.block_type + "|" + norm;
        if (!map.has(key)) map.set(key, { type: b.block_type, label: it.label.trim(), apps: new Set() });
        map.get(key)!.apps.add(nameOf.get(appId) ?? "?");
      }
    }
    return [...map.values()].filter((e) => e.apps.size > 1).sort((a, b) => b.apps.size - a.apps.size);
  }, [canvases, blocks, apps]);

  if (loading) return <div className="text-sm text-admin-muted py-12 text-center">Chargement…</div>;

  return (
    <div className="bg-white dark:bg-admin-surface rounded-2xl border border-warm-border dark:border-white/5 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-warm-border dark:border-white/5">
        <p className="text-[13px] text-admin-muted">
          Éléments de canvas cités par <strong className="text-admin-text">au moins deux applications</strong> —
          segments, canaux ou ressources mutualisables.
        </p>
      </div>
      {shared.length === 0 ? (
        <div className="py-12 text-center text-sm text-admin-muted">
          Aucune synergie détectée. Remplis les canvas de plusieurs apps pour voir les recoupements.
        </div>
      ) : (
        <table className="w-full text-[13px]">
          <thead className="bg-warm-bg/60 dark:bg-white/5 text-admin-muted text-[11px] uppercase tracking-wide">
            <tr><th className="text-left px-4 py-2">Bloc</th><th className="text-left px-4 py-2">Élément</th><th className="text-left px-4 py-2">Applications</th></tr>
          </thead>
          <tbody>
            {shared.map((s, i) => (
              <tr key={i} className="border-t border-warm-border dark:border-white/5">
                <td className="px-4 py-2.5 text-admin-muted">{BLOCK_LABEL[s.type]}</td>
                <td className="px-4 py-2.5 font-medium text-admin-text">{s.label}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {[...s.apps].map((n) => <Badge key={n} tone="amber">{n}</Badge>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
