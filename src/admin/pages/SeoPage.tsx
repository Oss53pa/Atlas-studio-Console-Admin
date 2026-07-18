import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Save, Globe2, Loader2, ImageIcon, Eye, EyeOff, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAuth } from "../../lib/auth";
import { useToast } from "../contexts/ToastContext";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { ADMIN_INPUT_CLASS } from "../components/AdminFormField";
import { SITE_URL } from "../../config/site";

interface SeoData {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
  canonical: string;
  noindex: boolean;
  titleTemplate?: string; // site principal uniquement
}

const EMPTY: SeoData = { metaTitle: "", metaDescription: "", keywords: "", ogImage: "", canonical: "", noindex: false, titleTemplate: "%s — Atlas Studio" };

const TITLE_MAX = 60;
const DESC_MAX = 155;

function Counter({ value, max }: { value: number; max: number }) {
  const tone = value === 0 ? "text-admin-muted" : value <= max ? "text-green-700" : "text-orange-700";
  return <span className={`text-[11px] font-mono ${tone}`}>{value}/{max}</span>;
}

export default function SeoPage() {
  const { appList } = useAppCatalog();
  const { user } = useAuth();
  const { success, error: showError } = useToast();

  const [searchParams] = useSearchParams();
  const [scope, setScope] = useState<string>(searchParams.get("app") || "site"); // "site" ou app id
  const [form, setForm] = useState<SeoData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isSite = scope === "site";
  const app = appList.find(a => a.id === scope);
  const previewUrl = isSite ? SITE_URL : (app?.external_url || `${SITE_URL}/apps/${scope}`);
  const previewHost = previewUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

  const load = useCallback(async () => {
    setLoading(true);
    let data: Partial<SeoData> | null = null;
    if (isSite) {
      const { data: row } = await supabase.from("site_content").select("data").eq("key", "seo").maybeSingle();
      data = (row?.data as Partial<SeoData>) || null;
    } else {
      const { data: row } = await supabase.from("app_landing_content").select("data").eq("app_id", scope).eq("section", "seo").maybeSingle();
      data = (row?.data as Partial<SeoData>) || null;
    }
    setForm({ ...EMPTY, ...(data || {}) });
    setLoading(false);
  }, [scope, isSite]);

  useEffect(() => { load(); }, [load]);

  const u = (patch: Partial<SeoData>) => setForm(f => ({ ...f, ...patch }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form };
    const { error } = isSite
      ? await supabase.from("site_content").upsert({ key: "seo", data: payload, updated_at: new Date().toISOString(), updated_by: user?.id }, { onConflict: "key" })
      : await (supabase.from("app_landing_content").upsert as any)(
          { app_id: scope, section: "seo", data: payload, sort_order: 99, is_active: true, updated_at: new Date().toISOString(), updated_by: user?.id },
          { onConflict: "app_id,section" },
        );
    setSaving(false);
    if (error) { showError(`Échec de l'enregistrement : ${error.message}`); return; }
    success(isSite ? "SEO du site principal enregistré" : `SEO de ${app?.name || scope} enregistré`);
  };

  const displayTitle = form.metaTitle || (isSite ? "Atlas Studio — Logiciels de gestion OHADA" : app?.name || scope);
  const displayDesc = form.metaDescription || (isSite ? "Suite de logiciels SaaS pour la gestion, la comptabilité et la conformité OHADA." : app?.tagline || "");

  return (
    <div className="max-w-6xl">
      <AdminPageHeader title="SEO & Métadonnées" subtitle="Balises meta, Open Graph et indexation — site principal et landing pages par application">
        <button onClick={save} disabled={saving || loading}
          className="bg-gold dark:bg-admin-accent text-admin-bg font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors px-4 py-2.5 text-[13px] flex items-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
        </button>
      </AdminPageHeader>

      {/* Sélecteur de scope */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <button onClick={() => setScope("site")}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium border transition-all ${isSite ? "bg-admin-accent text-admin-bg border-admin-accent" : "bg-admin-surface text-admin-text border-admin-surface-alt hover:border-admin-accent/45"}`}>
          <Globe2 size={14} /> Site principal
        </button>
        <span className="text-admin-muted text-[12px] mx-1">·</span>
        {appList.map(a => (
          <button key={a.id} onClick={() => setScope(a.id)}
            className={`px-3.5 py-2 rounded-lg text-[12.5px] font-medium border transition-all ${scope === a.id ? "bg-admin-accent text-admin-bg border-admin-accent" : "bg-admin-surface text-admin-text border-admin-surface-alt hover:border-admin-accent/45"}`}>
            {a.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-admin-muted text-sm">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire */}
          <div className="space-y-5 bg-admin-surface border border-admin-surface-alt rounded-2xl p-6 shadow-premium">
            {isSite && (
              <div>
                <label className="block text-admin-text text-[13px] font-semibold mb-1.5">Modèle de titre global</label>
                <input value={form.titleTemplate || ""} onChange={e => u({ titleTemplate: e.target.value })} placeholder="%s — Atlas Studio" className={ADMIN_INPUT_CLASS} />
                <p className="text-admin-muted text-[11px] mt-1"><code>%s</code> est remplacé par le titre de chaque page.</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-admin-text text-[13px] font-semibold">Meta title</label>
                <Counter value={form.metaTitle.length} max={TITLE_MAX} />
              </div>
              <input value={form.metaTitle} onChange={e => u({ metaTitle: e.target.value })} placeholder={displayTitle} className={ADMIN_INPUT_CLASS} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-admin-text text-[13px] font-semibold">Meta description</label>
                <Counter value={form.metaDescription.length} max={DESC_MAX} />
              </div>
              <textarea value={form.metaDescription} onChange={e => u({ metaDescription: e.target.value })} rows={3} placeholder={displayDesc} className={`${ADMIN_INPUT_CLASS} resize-y`} />
            </div>

            <div>
              <label className="block text-admin-text text-[13px] font-semibold mb-1.5">Mots-clés</label>
              <input value={form.keywords} onChange={e => u({ keywords: e.target.value })} placeholder="comptabilité, OHADA, SaaS" className={ADMIN_INPUT_CLASS} />
              <p className="text-admin-muted text-[11px] mt-1">Séparés par des virgules.</p>
            </div>

            <div>
              <label className="block text-admin-text text-[13px] font-semibold mb-1.5">Image Open Graph (partage social)</label>
              <input value={form.ogImage} onChange={e => u({ ogImage: e.target.value })} placeholder="https://…/og-image.jpg" className={ADMIN_INPUT_CLASS} />
              <p className="text-admin-muted text-[11px] mt-1">Recommandé : 1200×630px.</p>
            </div>

            <div>
              <label className="block text-admin-text text-[13px] font-semibold mb-1.5">URL canonique</label>
              <input value={form.canonical} onChange={e => u({ canonical: e.target.value })} placeholder={previewUrl} className={ADMIN_INPUT_CLASS} />
            </div>

            <div>
              <label className="block text-admin-text text-[13px] font-semibold mb-1.5">Indexation moteurs</label>
              <button type="button" onClick={() => u({ noindex: !form.noindex })}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${!form.noindex ? "bg-admin-success/15 text-green-700 border-admin-success/30 hover:bg-admin-success/25" : "bg-admin-surface-alt text-admin-muted border-admin-surface-alt hover:bg-admin-surface-alt/80"}`}>
                {!form.noindex ? <Eye size={14} /> : <EyeOff size={14} />}
                {!form.noindex ? "Indexable (index, follow)" : "Masqué des moteurs (noindex)"}
              </button>
            </div>
          </div>

          {/* Aperçu live */}
          <div className="space-y-5">
            {/* SERP Google */}
            <div className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-5 shadow-premium">
              <div className="flex items-center gap-2 mb-3">
                <Search size={14} className="text-admin-accent" />
                <span className="text-admin-text text-[13px] font-semibold">Aperçu résultat Google</span>
              </div>
              <div className="rounded-xl border border-admin-surface-alt bg-admin-bg p-4">
                <div className="flex items-center gap-1.5 text-[12px] text-admin-muted mb-0.5">
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: app?.color || "var(--c-accent-dark)" }}>A</span>
                  <span className="truncate">{previewHost}</span>
                </div>
                <div className="text-[18px] leading-snug text-blue-700 dark:text-blue-700 font-medium truncate">{displayTitle}</div>
                <p className="text-[12.5px] text-admin-text/80 leading-snug mt-0.5 line-clamp-2">{displayDesc}</p>
                {form.noindex && <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-orange-700 bg-amber-500/10 border border-amber-500/25 rounded px-2 py-0.5"><EyeOff size={10} /> noindex — n'apparaîtra pas dans Google</div>}
              </div>
            </div>

            {/* Carte sociale OG */}
            <div className="bg-admin-surface border border-admin-surface-alt rounded-2xl p-5 shadow-premium">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={14} className="text-admin-accent" />
                <span className="text-admin-text text-[13px] font-semibold">Aperçu partage social</span>
              </div>
              <div className="rounded-xl border border-admin-surface-alt overflow-hidden">
                <div className="aspect-[1200/630] bg-admin-surface-alt flex items-center justify-center overflow-hidden">
                  {form.ogImage
                    ? <img src={form.ogImage} alt="Open Graph" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    : <div className="text-admin-muted text-[12px] flex flex-col items-center gap-1"><ImageIcon size={22} /> Aucune image OG</div>}
                </div>
                <div className="px-4 py-3 bg-admin-bg">
                  <div className="text-[10.5px] uppercase tracking-wide text-admin-muted">{previewHost}</div>
                  <div className="text-[14px] font-semibold text-admin-text truncate">{displayTitle}</div>
                  <p className="text-[12px] text-admin-muted leading-snug line-clamp-2">{displayDesc}</p>
                </div>
              </div>
              {app?.external_url && (
                <a href={app.external_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-admin-accent text-[12px] font-medium hover:underline">
                  Voir la landing <ExternalLink size={11} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
