// Génération du business plan en PDF vectoriel (jsPDF + autoTable).
// Le document est construit à partir des données déjà filtrées par le profil
// de destinataire (RG-11) : cette couche ne décide rien, elle met en page.
// Export nommé obligatoire : l'export par défaut de jspdf est un objet
// (espace de noms), pas le constructeur.
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { BpProfile } from "./types";

const ACCENT: [number, number, number] = [239, 159, 39];
const INK: [number, number, number] = [40, 44, 32];
const MUTED: [number, number, number] = [122, 122, 112];
const MARGIN = 16;

/** Les polices standard PDF sont encodées en Latin-1 : les caractères hors de
 *  ce jeu (tiret cadratin, apostrophes courbes, points de suspension) sortiraient
 *  en glyphes parasites. On les ramène à leur équivalent ASCII. */
function latin1(s: string): string {
  return String(s ?? "")
    .replace(/[\u2014\u2013]/g, "-")        // tirets cadratin / demi-cadratin
    .replace(/[\u2018\u2019]/g, "'")        // apostrophes courbes
    .replace(/[\u201C\u201D]/g, '"')        // guillemets courbes
    .replace(/\u2026/g, "...")               // points de suspension
    .replace(/[\u2022\u00B7]/g, "-")        // puces
    .replace(/[\u00A0\u202F\u2009]/g, " ") // espaces insecables / fines
    .replace(/[^\n\u0020-\u00FF]/g, "");   // reste : hors Latin-1
}

const TITLE: Record<BpProfile, string> = {
  complet: "Business plan — document interne",
  banquier: "Business plan — dossier de financement",
  partenaire: "Business plan — présentation partenaire",
};
const FOOTER_NOTE: Record<BpProfile, string> = {
  complet: "Document interne — diffusion restreinte.",
  banquier: "Dossier de financement — pipeline agrégé, coûts privés exclus.",
  partenaire: "Présentation partenaire — sans données financières détaillées.",
};

export interface BpSection {
  heading: string;
  /** Paragraphe libre (affiché avant le tableau s'il y en a un). */
  text?: string;
  /** Tableau : en-têtes + lignes. */
  head?: string[];
  rows?: string[][];
  /** Liste à puces (utilisée pour les blocs du canvas). */
  bullets?: { label: string; items: string[] }[];
  /** Force un saut de page avant la section. */
  breakBefore?: boolean;
}

export interface BpDocument {
  profile: BpProfile;
  generatedOn: string;
  sections: BpSection[];
}

export function buildBusinessPlanPdf(doc: BpDocument): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;

  /** Réserve `need` mm ; passe à la page suivante si la place manque. */
  const ensure = (need: number) => {
    if (y + need > pageH - MARGIN - 10) { pdf.addPage(); y = MARGIN; }
  };

  // ── Couverture / en-tête ────────────────────────────────────────────────
  pdf.setFillColor(...ACCENT);
  pdf.rect(MARGIN, y, 22, 1.6, "F");
  y += 8;
  pdf.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
  pdf.text("ATLAS STUDIO", MARGIN, y);
  y += 8;
  pdf.setFont("helvetica", "bold").setFontSize(19).setTextColor(...INK);
  pdf.text(latin1(TITLE[doc.profile]), MARGIN, y, { maxWidth: contentW });
  y += 8;
  pdf.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  pdf.text(latin1(`Généré le ${doc.generatedOn} à partir des données du module Cortex`), MARGIN, y);
  y += 10;

  // ── Sections ────────────────────────────────────────────────────────────
  doc.sections.forEach((s) => {
    if (s.breakBefore) { pdf.addPage(); y = MARGIN; }
    ensure(18);

    pdf.setFont("helvetica", "bold").setFontSize(12).setTextColor(...INK);
    pdf.text(latin1(s.heading), MARGIN, y);
    y += 2.5;
    pdf.setDrawColor(...ACCENT).setLineWidth(0.4);
    pdf.line(MARGIN, y, MARGIN + contentW, y);
    y += 6;

    if (s.text) {
      pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...INK);
      const lines = pdf.splitTextToSize(latin1(s.text), contentW) as string[];
      ensure(lines.length * 4.6);
      pdf.text(lines, MARGIN, y);
      y += lines.length * 4.6 + 3;
    }

    s.bullets?.forEach((b) => {
      ensure(8 + b.items.length * 4.4);
      pdf.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...MUTED);
      pdf.text(latin1(b.label.toUpperCase()), MARGIN, y);
      y += 4.4;
      pdf.setFont("helvetica", "normal").setFontSize(9.5).setTextColor(...INK);
      b.items.forEach((it) => {
        const lines = pdf.splitTextToSize(latin1(`-  ${it}`), contentW - 3) as string[];
        ensure(lines.length * 4.4);
        pdf.text(lines, MARGIN + 3, y);
        y += lines.length * 4.4;
      });
      y += 3;
    });

    if (s.head && s.rows && s.rows.length > 0) {
      autoTable(pdf, {
        head: [s.head.map(latin1)],
        body: s.rows.map((r) => r.map(latin1)),
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        theme: "grid",
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: [225, 225, 218], lineWidth: 0.1 },
        headStyles: { fillColor: ACCENT, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        alternateRowStyles: { fillColor: [250, 250, 247] },
      });
      // @ts-expect-error — autoTable expose la position finale sur l'instance.
      y = (pdf.lastAutoTable?.finalY ?? y) + 7;
    }

    y += 2;
  });

  // ── Pied de page sur chaque page ────────────────────────────────────────
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(230, 230, 224).setLineWidth(0.2);
    pdf.line(MARGIN, pageH - 12, pageW - MARGIN, pageH - 12);
    pdf.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    pdf.text(latin1(FOOTER_NOTE[doc.profile]), MARGIN, pageH - 8);
    pdf.text(`${i} / ${total}`, pageW - MARGIN, pageH - 8, { align: "right" });
  }

  return pdf;
}

/** Nom de fichier stable et lisible. */
export function bpFilename(profile: BpProfile): string {
  const d = new Date();
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `atlas-studio-business-plan-${profile}-${iso}.pdf`;
}
