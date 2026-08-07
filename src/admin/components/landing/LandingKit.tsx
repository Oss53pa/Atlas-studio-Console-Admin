import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════════
   Primitives partagées de l'éditeur de landing pages.

   Deux règles :
   1. AUCUNE couleur en dur — uniquement les tokens de palette `p-*`
      (cf. index.css / tailwind.config.js). L'ancien module écrivait
      `text-[#F5F5F5]` sur des surfaces blanches → texte invisible.
   2. Les JSON stockés en base sont hétérogènes (chaînes vs objets, clés
      absentes…). Tout passe par les helpers `asStr` / `asArr` / `asObj`
      pour ne jamais casser sur une donnée inattendue.
   ══════════════════════════════════════════════════════════════════════════ */

export type SectionData = Record<string, unknown>;

/* ── lecture défensive du JSON ── */
export const asStr = (v: unknown): string => (v == null ? "" : typeof v === "string" ? v : String(v));
export const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
export const asObj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Première valeur non vide parmi plusieurs clés équivalentes.
 *  Les apps n'ont pas toutes nommé leurs champs pareil : une FAQ stocke
 *  `question`/`answer`, une autre `q`/`a`. On lit les deux. */
export const pickStr = (o: Record<string, unknown>, ...keys: string[]): string => {
  for (const k of keys) {
    const v = asStr(o[k]);
    if (v) return v;
  }
  return "";
};

/** Comme `pickStr`, mais renvoie aussi la clé à réécrire : celle déjà
 *  utilisée par l'élément, sinon la clé canonique (la première). */
export const aliased = (o: Record<string, unknown>, ...keys: string[]): { value: string; key: string } => {
  const present = keys.find(k => o[k] !== undefined) ?? keys[0];
  return { value: asStr(o[present]), key: present };
};

/* ── tokens de style ── */
export const INPUT =
  "w-full px-3 py-2 bg-p-surface border border-p-border rounded-lg text-p-text text-sm outline-none " +
  "focus:border-p-accent focus:ring-2 focus:ring-p-accent/20 transition placeholder:text-p-muted/70";
export const LABEL = "block text-p-text-2 text-[11px] font-semibold uppercase tracking-wide mb-1";
const BTN = "px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5";
export const BTN_GHOST = `${BTN} border border-p-border text-p-text-2 hover:border-p-accent hover:text-p-accent`;
export const BTN_ACCENT = `${BTN} bg-p-accent text-p-on-accent hover:bg-p-accent-dark`;

/** Neutralise l'autofill navigateur / gestionnaire de mots de passe.
 *  Sans ça, un champ « Badges » sans `name` se fait remplir avec un email. */
export const NO_AUTOFILL = {
  autoComplete: "off",
  autoCorrect: "off",
  spellCheck: false,
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-form-type": "other",
} as const;

/* ── champ texte / zone de texte ── */
export function Field({
  label, value, onChange, multi, rows = 3, placeholder, mono, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multi?: boolean;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
  hint?: string;
}) {
  const cls = `${INPUT}${mono ? " font-mono text-[13px]" : ""}`;
  return (
    <div className="mb-3">
      <label className={LABEL}>{label}</label>
      {multi ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={`${cls} resize-y`}
          {...NO_AUTOFILL}
        />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} {...NO_AUTOFILL} />
      )}
      {hint && <p className="mt-1 text-[11px] text-p-muted">{hint}</p>}
    </div>
  );
}

/* ── liste de chaînes (badges, features d'un plan, mots tournants…) ── */
export function TagInput({ label, tags, onChange, placeholder = "Saisir puis Entrée" }: {
  label: string;
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div className="mb-3">
      <label className={LABEL}>{label}</label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {tags.map((t, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-p-accent/12 text-p-accent rounded text-xs font-medium">
              {t}
              <button
                type="button"
                aria-label={`Retirer ${t}`}
                onClick={() => onChange(tags.filter((_, j) => j !== i))}
                className="hover:text-p-err"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); add(); }
          }}
          className={INPUT}
          placeholder={placeholder}
          {...NO_AUTOFILL}
        />
        <button type="button" onClick={add} className={BTN_ACCENT} aria-label="Ajouter">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── case à cocher ── */
export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-p-text-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-p-border accent-[var(--c-accent)]"
      />
      {label}
    </label>
  );
}

/* ── liste ordonnée d'objets (stats, features, plans, FAQ…) ── */
export function Repeater<T>({ label, items, onChange, blank, render, addLabel, title }: {
  label?: string;
  items: T[];
  onChange: (v: T[]) => void;
  blank: () => T;
  render: (item: T, patch: (p: Partial<T>) => void, index: number) => React.ReactNode;
  addLabel: string;
  title?: (item: T, index: number) => string;
}) {
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="mb-3">
      {label && <label className={LABEL}>{label}</label>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-p-border bg-p-surface-alt/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-p-muted truncate">
                {title ? title(item, i) : `#${i + 1}`}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}
                  className="p-1 rounded text-p-muted hover:text-p-text disabled:opacity-25 disabled:hover:text-p-muted">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" aria-label="Descendre" disabled={i === items.length - 1} onClick={() => move(i, 1)}
                  className="p-1 rounded text-p-muted hover:text-p-text disabled:opacity-25 disabled:hover:text-p-muted">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" aria-label="Supprimer" onClick={() => onChange(items.filter((_, j) => j !== i))}
                  className="p-1 rounded text-p-err hover:bg-p-err/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {render(item, patch => onChange(items.map((x, j) => (j === i ? { ...(x as object), ...patch } as T : x))), i)}
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...items, blank()])} className={`${BTN_GHOST} mt-2`}>
        <Plus className="w-4 h-4" />{addLabel}
      </button>
    </div>
  );
}

/* ── éditeur JSON brut ──
   Filet de sécurité : toute clé non couverte par un éditeur dédié
   (et toute section future) reste modifiable ici. */
export function JsonEditor({ data, onChange }: { data: SectionData; onChange: (d: SectionData) => void }) {
  const serialized = JSON.stringify(data ?? {}, null, 2);
  const [draft, setDraft] = useState(serialized);
  const [err, setErr] = useState<string | null>(null);

  // Resynchronise quand la donnée change ailleurs (autre app, rechargement),
  // sauf si l'utilisateur a une saisie en cours non appliquée.
  useEffect(() => {
    setDraft(prev => (prev === serialized || !err ? serialized : prev));
    setErr(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);

  const apply = () => {
    try {
      const parsed = JSON.parse(draft);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setErr("La racine doit être un objet JSON.");
        return;
      }
      setErr(null);
      onChange(parsed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "JSON invalide");
    }
  };

  return (
    <div>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={14}
        className={`${INPUT} font-mono text-[12px] leading-relaxed resize-y`}
        {...NO_AUTOFILL}
      />
      <div className="flex items-center gap-3 mt-2">
        <button type="button" onClick={apply} className={BTN_GHOST}>Appliquer le JSON</button>
        {err
          ? <span className="text-xs text-p-err">{err}</span>
          : draft !== serialized
            ? <span className="text-xs text-p-warn">Modifications non appliquées</span>
            : <span className="text-xs text-p-muted">Synchronisé avec le formulaire</span>}
      </div>
    </div>
  );
}
