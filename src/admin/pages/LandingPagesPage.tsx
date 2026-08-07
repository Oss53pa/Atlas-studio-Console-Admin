import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Braces, ChevronDown, ChevronRight, Clock, ExternalLink, Eye, EyeOff,
  FormInput, Loader2, Monitor, RotateCcw, Save, Search, Smartphone, UploadCloud,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useToast } from "../contexts/ToastContext";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { SITE_URL } from "../../config/site";
import { INPUT, JsonEditor, NO_AUTOFILL, type SectionData } from "../components/landing/LandingKit";
import { EDITORS, GenericEditor } from "../components/landing/LandingEditors";
import { SECTIONS, sectionMeta } from "../components/landing/LandingSchema";
import { LandingPreview, type PreviewSection } from "../components/landing/LandingPreview";
import type { AppLandingContentRow } from "../../lib/database.types";

/* ══════════════════════════════════════════════════════════════════════════
   Landing Pages — édition du contenu marketing de chaque app.

   Ce module remplace une version qui souffrait de trois défauts :
     • la liste des apps était figée dans le code (5 entrées, dont un id et
       des URLs erronés) alors que le catalogue en compte davantage ;
     • aucun aperçu : impossible de voir une modification avant publication ;
     • des couleurs en dur (#F5F5F5 sur blanc) rendaient le texte illisible.

   Principe retenu : le formulaire édite un BROUILLON local ; la base n'est
   touchée qu'à la publication, section par section (ou en bloc).
   ══════════════════════════════════════════════════════════════════════════ */

interface SectionState {
  data: SectionData;
  isActive: boolean;
  updatedAt: string | null;
  /** false tant qu'aucune ligne n'existe en base pour (app, section). */
  exists: boolean;
}
type AppSections = Record<string, SectionState>;
type Store = Record<string, AppSections>;

const EMPTY_SECTION: SectionState = { data: {}, isActive: true, updatedAt: null, exists: false };

/* Contenus stockés sous un app_id qui n'est pas celui du catalogue.
   Vide depuis l'alignement de « cockpitjourney » sur « cockpit-journey »
   (migration align_cockpitjourney_landing_app_id). Le mécanisme est conservé :
   il rattache un contenu à son application sans rien changer en base, ce qui
   laisse le temps d'aligner les identifiants côté site avant de migrer.
   Clé = id du catalogue, valeur = app_id réellement utilisé en base. */
const CONTENT_ID_ALIASES: Record<string, string> = {};

const sectionOf = (store: Store, appId: string, key: string): SectionState =>
  store[appId]?.[key] ?? EMPTY_SECTION;

const sameSection = (a: SectionState, b: SectionState) =>
  a.isActive === b.isActive && JSON.stringify(a.data ?? {}) === JSON.stringify(b.data ?? {});

export default function LandingPagesPage() {
  const { user } = useAuth();
  const { appList, loading: appsLoading } = useAppCatalog();
  const { success, error: toastErr } = useToast();

  const [published, setPublished] = useState<Store>({});
  const [draft, setDraft] = useState<Store>({});
  const [appId, setAppId] = useState<string>("");
  const [openSection, setOpenSection] = useState<string | null>("hero");
  const [jsonMode, setJsonMode] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [appQuery, setAppQuery] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  /* ── chargement ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("app_landing_content")
      .select("app_id, section, data, is_active, updated_at")
      .order("app_id");

    if (error) {
      console.error("LandingPages fetchAll", error);
      toastErr(`Chargement impossible : ${error.message}`);
      setLoading(false);
      return;
    }

    const store: Store = {};
    for (const row of (data ?? []) as Pick<AppLandingContentRow, "app_id" | "section" | "data" | "is_active" | "updated_at">[]) {
      (store[row.app_id] ??= {})[row.section] = {
        data: (row.data ?? {}) as SectionData,
        isActive: row.is_active !== false,
        updatedAt: row.updated_at,
        exists: true,
      };
    }
    setPublished(store);
    // Les brouillons non publiés en cours d'édition sont conservés ;
    // seules les sections propres sont resynchronisées.
    setDraft(prev => {
      const next: Store = JSON.parse(JSON.stringify(store));
      for (const [aid, sections] of Object.entries(prev)) {
        for (const [key, state] of Object.entries(sections)) {
          const pub = store[aid]?.[key] ?? EMPTY_SECTION;
          if (!sameSection(state, pub)) (next[aid] ??= {})[key] = state;
        }
      }
      return next;
    });
    setLoading(false);
  }, [toastErr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── liste des apps : catalogue ∪ app_id présents dans le contenu ──
     Un contenu dont l'app_id n'existe pas au catalogue reste visible et
     éditable (et signalé), au lieu d'être silencieusement inaccessible. */
  const apps = useMemo(() => {
    const known = appList.map(a => ({
      id: a.id,
      contentId: CONTENT_ID_ALIASES[a.id] ?? a.id,
      name: a.name,
      color: a.color || "#4F46E5",
      url: a.external_url || `${SITE_URL}/apps/${a.id}`,
      orphan: false,
    }));
    const claimed = new Set(known.map(a => a.contentId));
    const orphans = Object.keys(published)
      .filter(id => !claimed.has(id))
      .map(id => ({ id, contentId: id, name: id, color: "#4F46E5", url: `${SITE_URL}/apps/${id}`, orphan: true }));
    return [...known, ...orphans];
  }, [appList, published]);

  useEffect(() => {
    if (!appId && apps.length > 0) setAppId(apps[0].id);
  }, [apps, appId]);

  const app = apps.find(a => a.id === appId);
  /** Identifiant sous lequel le contenu de l'app sélectionnée vit en base. */
  const contentId = app?.contentId ?? appId;

  const visibleApps = useMemo(() => {
    const q = appQuery.trim().toLowerCase();
    return q ? apps.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) : apps;
  }, [apps, appQuery]);

  /* ── sections de l'app : schéma ∪ sections trouvées en base ── */
  const sectionKeys = useMemo(() => {
    const keys = new Set(SECTIONS.map(s => s.key));
    Object.keys(published[contentId] ?? {}).forEach(k => keys.add(k));
    Object.keys(draft[contentId] ?? {}).forEach(k => keys.add(k));
    return [...keys].sort((a, b) => sectionMeta(a).order - sectionMeta(b).order || a.localeCompare(b));
  }, [published, draft, contentId]);

  /* ── état modifié ── */
  const dirtyKeys = useCallback((aid: string) => {
    const keys = new Set([...Object.keys(published[aid] ?? {}), ...Object.keys(draft[aid] ?? {})]);
    return [...keys].filter(k => !sameSection(sectionOf(draft, aid, k), sectionOf(published, aid, k)));
  }, [draft, published]);

  const currentDirty = useMemo(() => dirtyKeys(contentId), [dirtyKeys, contentId]);
  const totalDirty = useMemo(
    () => apps.reduce((n, a) => n + dirtyKeys(a.contentId).length, 0),
    [apps, dirtyKeys],
  );

  useEffect(() => {
    if (totalDirty === 0) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [totalDirty]);

  /* ── mutations ── */
  const patchSection = (key: string, patch: Partial<SectionState>) => {
    setDraft(prev => {
      const base = prev[contentId]?.[key] ?? published[contentId]?.[key] ?? EMPTY_SECTION;
      return { ...prev, [contentId]: { ...prev[contentId], [key]: { ...base, ...patch } } };
    });
  };

  const resetSection = (key: string) => {
    const pub = published[contentId]?.[key];
    setDraft(prev => {
      const sections = { ...prev[contentId] };
      if (pub) sections[key] = JSON.parse(JSON.stringify(pub));
      else delete sections[key];
      return { ...prev, [contentId]: sections };
    });
  };

  const publishSection = async (key: string): Promise<boolean> => {
    const state = sectionOf(draft, contentId, key);
    setSaving(key);
    const { data, error } = await supabase
      .from("app_landing_content")
      .upsert(
        {
          app_id: contentId,
          section: key,
          data: state.data ?? {},
          sort_order: sectionMeta(key).order,
          is_active: state.isActive,
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        },
        { onConflict: "app_id,section" },
      )
      .select("app_id, section, data, is_active, updated_at")
      .single();
    setSaving(null);

    if (error) {
      toastErr(`Publication impossible : ${error.message}`);
      return false;
    }
    const row = data as Pick<AppLandingContentRow, "data" | "is_active" | "updated_at">;
    const saved: SectionState = {
      data: (row.data ?? {}) as SectionData,
      isActive: row.is_active !== false,
      updatedAt: row.updated_at,
      exists: true,
    };
    setPublished(prev => ({ ...prev, [contentId]: { ...prev[contentId], [key]: saved } }));
    setDraft(prev => ({ ...prev, [contentId]: { ...prev[contentId], [key]: JSON.parse(JSON.stringify(saved)) } }));
    return true;
  };

  const publishOne = async (key: string) => {
    if (await publishSection(key)) success(`${sectionMeta(key).label} publiée`);
  };

  const publishAll = async () => {
    let ok = 0;
    for (const key of currentDirty) {
      if (await publishSection(key)) ok++;
    }
    if (ok > 0) success(`${ok} section${ok > 1 ? "s" : ""} publiée${ok > 1 ? "s" : ""}`);
  };

  /* ── aperçu (sur le brouillon, pas sur la base) ── */
  const previewSections: PreviewSection[] = useMemo(
    () => sectionKeys
      .filter(k => sectionMeta(k).previewable)
      .map(k => {
        const s = sectionOf(draft, contentId, k);
        return { key: k, data: s.data ?? {}, isActive: s.isActive };
      }),
    [sectionKeys, draft, contentId],
  );

  const busy = loading || appsLoading;

  return (
    <div className="min-h-screen bg-p-bg text-p-text p-6 md:p-8">
      <AdminPageHeader title="Landing Pages" subtitle="Contenu marketing de chaque application — brouillon, aperçu, publication">
        <button
          type="button"
          onClick={() => setShowPreview(v => !v)}
          className="px-4 py-2 rounded-full text-[13px] font-medium border border-p-border text-p-text-2 hover:border-p-accent hover:text-p-accent transition-colors inline-flex items-center gap-2"
        >
          {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showPreview ? "Masquer l'aperçu" : "Afficher l'aperçu"}
        </button>
        {app && (
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-full text-[13px] font-medium border border-p-border text-p-text-2 hover:border-p-accent hover:text-p-accent transition-colors inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />Site en ligne
          </a>
        )}
        <button
          type="button"
          onClick={publishAll}
          disabled={currentDirty.length === 0 || saving !== null}
          className="px-5 py-2 rounded-full text-[13px] font-semibold bg-p-accent text-p-on-accent hover:bg-p-accent-dark transition-colors inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          Publier cette page {currentDirty.length > 0 ? `(${currentDirty.length})` : ""}
        </button>
      </AdminPageHeader>

      {/* ── sélecteur d'application ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-p-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={appQuery}
              onChange={e => setAppQuery(e.target.value)}
              placeholder={`Filtrer ${apps.length} applications…`}
              className={`${INPUT} pl-9`}
              {...NO_AUTOFILL}
            />
          </div>
          {totalDirty > 0 && (
            <span className="text-xs text-p-warn font-medium inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {totalDirty} modification{totalDirty > 1 ? "s" : ""} non publiée{totalDirty > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleApps.map(a => {
            const active = a.id === appId;
            const nDirty = dirtyKeys(a.contentId).length;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => { setAppId(a.id); setOpenSection("hero"); }}
                className={`px-3.5 py-2 rounded-full text-[13px] font-medium transition-colors inline-flex items-center gap-2 border ${
                  active
                    ? "bg-p-accent text-p-on-accent border-p-accent font-semibold"
                    : "bg-p-surface text-p-text-2 border-p-border hover:border-p-accent hover:text-p-accent"
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: a.color }} />
                {a.name}
                {a.orphan && <span className="text-[10px] opacity-70">(orphelin)</span>}
                {nDirty > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? "bg-p-on-accent/25" : "bg-p-warn/15 text-p-warn"}`}>
                    {nDirty}
                  </span>
                )}
              </button>
            );
          })}
          {visibleApps.length === 0 && <p className="text-sm text-p-muted">Aucune application ne correspond.</p>}
        </div>
        {app?.orphan && (
          <p className="mt-3 text-xs text-p-warn inline-flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Contenu enregistré sous l'identifiant «&nbsp;{app.id}&nbsp;», absent du catalogue d'applications.
            Le site correspondant ne le lira que s'il utilise exactement cet identifiant.
          </p>
        )}
        {app && !app.orphan && app.contentId !== app.id && (
          <p className="mt-3 text-xs text-p-muted inline-flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Le catalogue identifie cette application «&nbsp;{app.id}&nbsp;» mais son contenu est stocké sous
            «&nbsp;{app.contentId}&nbsp;». L'édition porte bien sur les lignes existantes ; aligner les deux
            identifiants en base reste à faire.
          </p>
        )}
      </div>

      {busy ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-p-accent" />
        </div>
      ) : (
        <div className={`grid gap-6 items-start ${showPreview ? "xl:grid-cols-2" : "grid-cols-1 max-w-4xl"}`}>
          {/* ── colonne édition ── */}
          <div className="space-y-2 min-w-0">
            {sectionKeys.map(key => {
              const meta = sectionMeta(key);
              const Icon = meta.icon;
              const state = sectionOf(draft, contentId, key);
              const pub = published[contentId]?.[key];
              const isDirty = !sameSection(state, pub ?? EMPTY_SECTION);
              const isOpen = openSection === key;
              const Editor = EDITORS[key] ?? GenericEditor;
              const raw = jsonMode[key] ?? false;

              return (
                <div key={key} className="bg-p-surface border border-p-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : key)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-p-surface-alt/60 transition-colors text-left"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      {isOpen ? <ChevronDown className="w-4 h-4 text-p-accent shrink-0" /> : <ChevronRight className="w-4 h-4 text-p-muted shrink-0" />}
                      <Icon className={`w-4 h-4 shrink-0 ${isOpen ? "text-p-accent" : "text-p-muted"}`} />
                      <span className="text-sm font-semibold text-p-text truncate">{meta.label}</span>
                      {!state.isActive && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-p-surface-alt text-p-muted shrink-0">MASQUÉE</span>
                      )}
                      {isDirty && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-p-warn/15 text-p-warn shrink-0">BROUILLON</span>
                      )}
                      {!pub && !isDirty && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-p-surface-alt text-p-muted shrink-0">VIDE</span>
                      )}
                    </span>
                    {pub?.updatedAt && (
                      <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-p-muted shrink-0">
                        <Clock className="w-3 h-3" />{new Date(pub.updatedAt).toLocaleString("fr-FR")}
                      </span>
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-p-border">
                      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-1 p-0.5 bg-p-surface-alt rounded-lg">
                          <button
                            type="button"
                            onClick={() => setJsonMode(m => ({ ...m, [key]: false }))}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                              raw ? "text-p-muted hover:text-p-text" : "bg-p-surface text-p-text shadow-elev-1"
                            }`}
                          >
                            <FormInput className="w-3.5 h-3.5" />Formulaire
                          </button>
                          <button
                            type="button"
                            onClick={() => setJsonMode(m => ({ ...m, [key]: true }))}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                              raw ? "bg-p-surface text-p-text shadow-elev-1" : "text-p-muted hover:text-p-text"
                            }`}
                          >
                            <Braces className="w-3.5 h-3.5" />JSON
                          </button>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-medium text-p-text-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={state.isActive}
                            onChange={e => patchSection(key, { isActive: e.target.checked })}
                            className="w-4 h-4 rounded border-p-border accent-[var(--c-accent)]"
                          />
                          Visible sur le site
                        </label>
                      </div>

                      {raw || !EDITORS[key]
                        ? <JsonEditor data={state.data ?? {}} onChange={d => patchSection(key, { data: d })} />
                        : <Editor data={state.data ?? {}} set={d => patchSection(key, { data: d })} />}

                      <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-p-border">
                        <button
                          type="button"
                          onClick={() => resetSection(key)}
                          disabled={!isDirty}
                          className="px-3.5 py-2 rounded-full text-[13px] font-medium border border-p-border text-p-text-2 hover:border-p-accent hover:text-p-accent transition-colors inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />Annuler les modifications
                        </button>
                        <button
                          type="button"
                          onClick={() => publishOne(key)}
                          disabled={saving === key}
                          className="px-4 py-2 rounded-full text-[13px] font-semibold bg-p-accent text-p-on-accent hover:bg-p-accent-dark transition-colors inline-flex items-center gap-2 disabled:opacity-40"
                        >
                          {saving === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Publier la section
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── colonne aperçu ── */}
          {showPreview && app && (
            <div className="min-w-0 xl:sticky xl:top-28">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-xs text-p-text-2">
                  Aperçu du <strong className="text-p-text">brouillon</strong>
                  {currentDirty.length > 0
                    ? <span className="text-p-warn"> — {currentDirty.length} section{currentDirty.length > 1 ? "s" : ""} non publiée{currentDirty.length > 1 ? "s" : ""}</span>
                    : <span className="text-p-muted"> — identique à la version en ligne</span>}
                </p>
                <div className="flex items-center gap-1 p-0.5 bg-p-surface-alt rounded-lg shrink-0">
                  <button type="button" aria-label="Aperçu bureau" onClick={() => setDevice("desktop")}
                    className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-p-surface text-p-text shadow-elev-1" : "text-p-muted hover:text-p-text"}`}>
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" aria-label="Aperçu mobile" onClick={() => setDevice("mobile")}
                    className={`p-1.5 rounded-md transition-colors ${device === "mobile" ? "bg-p-surface text-p-text shadow-elev-1" : "text-p-muted hover:text-p-text"}`}>
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="border border-p-border rounded-xl overflow-hidden bg-p-surface-alt shadow-elev-2">
                <div className="max-h-[calc(100vh-13rem)] overflow-y-auto">
                  <div className={device === "mobile" ? "mx-auto my-4 w-[390px] max-w-full border border-p-border rounded-2xl overflow-hidden shadow-elev-1" : ""}>
                    <LandingPreview appName={app.name} appColor={app.color} sections={previewSections} />
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-p-muted">
                Rendu de contrôle du contenu (textes, ordre, sections masquées). La mise en page finale reste
                celle du site public.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
