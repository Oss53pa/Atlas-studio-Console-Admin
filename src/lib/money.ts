// Money — FCFA en ENTIERS (franc CFA, aucune décimale ; BIGINT en base).
// Règle CDC : aucun calcul monétaire côté client pour les agrégats
// (fait par Postgres / Edge Functions). Ici : uniquement formatage + parsing UI.
// Les montants FCFA restent très en-deçà de Number.MAX_SAFE_INTEGER (2^53).

export type Fcfa = number;

const NF = new Intl.NumberFormat("fr-FR");

/** Formate un montant FCFA. `compact` → k / M. `suffix:false` → sans « FCFA ». */
export function formatFcfa(
  v: Fcfa | null | undefined,
  opts?: { compact?: boolean; suffix?: boolean },
): string {
  if (v == null) return "—";
  const n = Math.trunc(Number(v));
  const suffix = opts?.suffix === false ? "" : " FCFA";
  const abs = Math.abs(n);
  if (opts?.compact && abs >= 1_000_000) {
    return (n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M" + suffix;
  }
  if (opts?.compact && abs >= 1_000) {
    return Math.round(n / 1_000).toLocaleString("fr-FR") + " k" + suffix;
  }
  return NF.format(n) + suffix;
}

/** Parse une saisie UI (« 45 000 », « 45000 FCFA ») → entier FCFA. */
export function parseFcfa(input: string): Fcfa {
  const cleaned = (input || "").replace(/[^\d-]/g, "");
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Probabilité en basis points (0–10000) ↔ pourcentage (0–100). */
export function bpToPct(bp: number): number { return Math.round((bp ?? 0) / 100); }
export function pctToBp(pct: number): number {
  return Math.max(0, Math.min(10000, Math.round((pct ?? 0) * 100)));
}
