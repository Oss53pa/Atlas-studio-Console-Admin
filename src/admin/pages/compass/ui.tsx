import { X } from "lucide-react";
import type { ReactNode } from "react";
import type {
  LifecycleStage, StrategicClass, DealStage, MilestoneStatus,
  AssumptionStatus, Criticality, Provenance,
} from "./types";

/* ── Libellés FR + tons ─────────────────────────────────────────────────── */
export const LIFECYCLE: Record<LifecycleStage, string> = {
  idea: "Idée", cdc: "CDC", build: "Build", beta: "Bêta",
  live: "Live", frozen: "Gelé", sunset: "Sunset",
};
export const CLASS_LABEL: Record<StrategicClass, string> = {
  locomotive: "Locomotive", pari: "Pari", support: "Support", dormant: "Dormant",
};
export const DEAL_STAGE: Record<DealStage, string> = {
  contact: "Contact", demo: "Démo", pilote: "Pilote",
  negociation: "Négociation", client: "Client", perdu: "Perdu",
};
export const MILESTONE_STATUS: Record<MilestoneStatus, string> = {
  a_venir: "À venir", en_cours: "En cours", atteint: "Atteint",
  glisse: "Glissé", abandonne: "Abandonné",
};
export const ASSUMPTION_STATUS: Record<AssumptionStatus, string> = {
  a_tester: "À tester", en_test: "En test", validee: "Validée", invalidee: "Invalidée",
};
export const CRITICALITY: Record<Criticality, string> = {
  bloquante: "Bloquante", majeure: "Majeure", mineure: "Mineure",
};

const TONE: Record<string, { bg: string; fg: string }> = {
  amber: { bg: "#FBEEDA", fg: "#8A5A0B" }, green: { bg: "#E1F1E6", fg: "#256B3D" },
  blue: { bg: "#E4EEF7", fg: "#245A87" }, red: { bg: "#FBE7E5", fg: "#973229" },
  gray: { bg: "#ECECE7", fg: "#5A5A52" }, violet: { bg: "#ECE8F7", fg: "#4A3A87" },
};
export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONE | string; children: ReactNode }) {
  const t = TONE[tone] || TONE.gray;
  return (
    <span style={{ background: t.bg, color: t.fg }} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap">
      {children}
    </span>
  );
}

export const stageTone: Record<LifecycleStage, string> = {
  idea: "gray", cdc: "blue", build: "amber", beta: "violet", live: "green", frozen: "gray", sunset: "red",
};
export const classTone: Record<StrategicClass, string> = {
  locomotive: "amber", pari: "violet", support: "blue", dormant: "gray",
};
export const dealTone: Record<DealStage, string> = {
  contact: "gray", demo: "blue", pilote: "amber", negociation: "violet", client: "green", perdu: "red",
};
export const assumptionTone: Record<AssumptionStatus, string> = {
  a_tester: "amber", en_test: "blue", validee: "green", invalidee: "red",
};

/* Badge de provenance (RG-06) — chaque chiffre porte son origine. */
export function Provenance({ source }: { source: Provenance }) {
  const map = { manual: { s: "○ manuel", tone: "gray" }, import: { s: "⇅ import", tone: "blue" }, connector: { s: "● auto", tone: "green" } };
  const m = map[source] || map.manual;
  const t = TONE[m.tone];
  return <span className="prov" style={{ background: t.bg, color: t.fg }}>{m.s}</span>;
}

/* ── Modale ─────────────────────────────────────────────────────────────── */
export function CpsModal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/10 rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-border dark:border-white/10">
          <h3 className="font-semibold text-admin-text">{title}</h3>
          <button onClick={onClose} className="text-admin-muted hover:text-admin-text"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-3">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-warm-border dark:border-white/10 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ── Champs de formulaire ───────────────────────────────────────────────── */
const inputCls = "w-full px-3 py-2 rounded-lg border border-warm-border dark:border-white/10 bg-white dark:bg-admin-surface-alt text-admin-text text-sm outline-none focus:border-[var(--cps-accent)]";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="block text-[12px] font-medium text-admin-muted mb-1">{label}</span>{children}</label>;
}
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={inputCls} />; }
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={inputCls + " min-h-[70px]"} />; }
export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][] }) {
  return <select {...props} className={inputCls}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
