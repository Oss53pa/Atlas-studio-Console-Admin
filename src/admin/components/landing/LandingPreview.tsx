import {
  Activity, Archive, ArrowRight, Award, BadgeCheck, Banknote, BarChart, BarChart3, Bell, BookOpen,
  Bot, Boxes, Brain, Briefcase, Building2, Calendar, CalendarCheck, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock, Cloud, Coffee, Coins, Compass, Cpu, CreditCard, Database, Eye, FileCheck,
  FileSpreadsheet, FileText, Filter, Fingerprint, Flame, Gauge, GitBranch, Globe, Grid3x3,
  Handshake, Key, Landmark, Layers, Lightbulb, LineChart, ListChecks, Lock, Mail, MapPin,
  MessageSquare, Monitor, Network, PenTool, PieChart, Play, Puzzle, Quote, Receipt, Repeat,
  RefreshCw, Rocket, Scale, Search, Send, Server, Settings, Share2, Shield, ShieldCheck,
  Smartphone, Sparkles, Star, Sun, Sunrise, Target, Timer, TrendingUp, Trophy, Truck, Users,
  Users2, Video, Wallet, Wand2, Webhook, Workflow, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";
import { asArr, asObj, asStr, pickStr } from "./LandingKit";
import { readCta, readTrustBadges } from "./LandingSchema";

/* ══════════════════════════════════════════════════════════════════════════
   Aperçu de la landing page — rendu du BROUILLON en cours d'édition.

   Objectif : voir la page telle qu'elle sera publiée AVANT d'enregistrer.
   Le rendu est volontairement autonome (couleurs en style inline dérivées de
   l'accent de la marque) pour ne pas hériter du thème de la console : ce qui
   est lisible ici est représentatif de ce que verra le visiteur.
   ══════════════════════════════════════════════════════════════════════════ */

const ICONS: Record<string, LucideIcon> = {
  Activity, Archive, ArrowRight, Award, BadgeCheck, Banknote, BarChart, BarChart3, Bell, BookOpen,
  Bot, Boxes, Brain, Briefcase, Building2, Calendar, CalendarCheck, Check, CheckCircle2, ChevronRight,
  ClipboardList, Clock, Cloud, Coffee, Coins, Compass, Cpu, CreditCard, Database, Eye, FileCheck,
  FileSpreadsheet, FileText, Filter, Fingerprint, Flame, Gauge, GitBranch, Globe, Grid3x3,
  Handshake, Key, Landmark, Layers, Lightbulb, LineChart, ListChecks, Lock, Mail, MapPin,
  MessageSquare, Monitor, Network, PenTool, PieChart, Play, Puzzle, Quote, Receipt, Repeat,
  RefreshCw, Rocket, Scale, Search, Send, Server, Settings, Share2, Shield, ShieldCheck,
  Smartphone, Sparkles, Star, Sun, Sunrise, Target, Timer, TrendingUp, Trophy, Truck, Users,
  Users2, Video, Wallet, Wand2, Webhook, Workflow, Wrench, Zap,
};

const iconOf = (name: unknown): LucideIcon => ICONS[asStr(name)] ?? Sparkles;

/* ── palette dérivée de l'accent de l'app ── */
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
function toRgb(hex: string): [number, number, number] {
  const m = HEX.exec(hex.trim());
  if (!m) return [79, 70, 229];
  let h = m[1];
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const rgba = (hex: string, a: number) => { const [r, g, b] = toRgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };
/** Assombrit l'accent si besoin pour rester lisible en texte sur fond clair. */
function readableInk(hex: string): string {
  let [r, g, b] = toRgb(hex);
  // Luminance relative (WCAG) — on assombrit tant que le contraste sur blanc < 4.5:1.
  const lum = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  let guard = 0;
  while (guard++ < 24) {
    const L = 0.2126 * lum(r) + 0.7152 * lum(g) + 0.0722 * lum(b);
    if ((1.05) / (L + 0.05) >= 4.5) break;
    r = Math.round(r * 0.88); g = Math.round(g * 0.88); b = Math.round(b * 0.88);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

const INK = "#15171b";
const BODY = "#4a4f57";
const MUTED = "#767c86";
const LINE = "#e6e8ec";

const fmtPrice = (v: unknown): string => {
  const n = Number(v);
  return Number.isFinite(n) && asStr(v) !== "" ? new Intl.NumberFormat("fr-FR").format(n) : asStr(v);
};

/* ── briques de mise en page ── */
function Band({ children, tint, style }: { children: React.ReactNode; tint?: string; style?: React.CSSProperties }) {
  return <section style={{ padding: "44px 32px", background: tint ?? "#ffffff", ...style }}>{children}</section>;
}

function SectionHead({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  if (!title && !subtitle) return null;
  return (
    <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 28px" }}>
      {title && <h2 style={{ color: INK, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>}
      {subtitle && <p style={{ color: BODY, fontSize: 14, lineHeight: 1.6, margin: "8px 0 0" }}>{subtitle}</p>}
      <div style={{ width: 44, height: 3, borderRadius: 2, background: accent, margin: "14px auto 0" }} />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "18px 16px", textAlign: "center", color: MUTED, fontSize: 12 }}>
      {label}
    </div>
  );
}

/* ── sections ── */
function Hero({ d, accent, ink }: { d: Record<string, unknown>; accent: string; ink: string }) {
  const primary = readCta(d, "cta_primary");
  const secondary = readCta(d, "cta_secondary");
  const badges = asArr<string>(d.badges);
  const rotating = asArr<string>(d.rotating_words);
  const trust = asArr<string>(d.trust_inline);
  const social = asObj(d.social_proof);
  return (
    <Band tint={`linear-gradient(180deg, ${rgba(accent, 0.07)} 0%, #ffffff 100%)`} style={{ padding: "56px 32px 48px", textAlign: "center" }}>
      {badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 18 }}>
          {badges.map((b, i) => (
            <span key={i} style={{
              padding: "4px 11px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: rgba(accent, 0.12), color: ink, border: `1px solid ${rgba(accent, 0.25)}`,
            }}>{b}</span>
          ))}
        </div>
      )}
      {rotating.length > 0 && (
        <div style={{ color: ink, fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          {rotating.join(" · ")}
        </div>
      )}
      <h1 style={{ color: INK, fontSize: 36, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>
        {asStr(d.title) || <span style={{ color: MUTED, fontWeight: 500 }}>Titre du hero…</span>}
      </h1>
      {asStr(d.subtitle) && (
        <p style={{ color: BODY, fontSize: 15, lineHeight: 1.65, maxWidth: 620, margin: "16px auto 0" }}>{asStr(d.subtitle)}</p>
      )}
      {(primary.text || secondary.text) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 24 }}>
          {primary.text && (
            <span style={{ padding: "11px 22px", borderRadius: 999, background: accent, color: "#fff", fontSize: 14, fontWeight: 700 }}>
              {primary.text}
            </span>
          )}
          {secondary.text && (
            <span style={{ padding: "11px 22px", borderRadius: 999, border: `1.5px solid ${rgba(accent, 0.4)}`, color: ink, fontSize: 14, fontWeight: 600 }}>
              {secondary.text}
            </span>
          )}
        </div>
      )}
      {trust.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginTop: 20 }}>
          {trust.map((t, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: MUTED, fontSize: 12 }}>
              <Check size={13} color={accent} strokeWidth={3} />{t}
            </span>
          ))}
        </div>
      )}
      {Boolean(social.count || social.label) && (
        <p style={{ color: MUTED, fontSize: 12, marginTop: 16 }}>
          <strong style={{ color: ink }}>{asStr(social.count)}</strong> {asStr(social.label)}
        </p>
      )}
    </Band>
  );
}

function Stats({ d, ink }: { d: Record<string, unknown>; ink: string }) {
  const items = asArr<Record<string, unknown>>(d.items);
  return (
    <Band tint="#fafbfc">
      {items.length === 0 ? <Empty label="Aucun chiffre clé" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 20, textAlign: "center" }}>
          {items.map((s, i) => (
            <div key={i}>
              <div style={{ color: ink, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em" }}>{asStr(s.value)}</div>
              <div style={{ color: BODY, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 4 }}>
                {asStr(s.label)}
              </div>
              {asStr(s.sub) && <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{asStr(s.sub)}</div>}
            </div>
          ))}
        </div>
      )}
    </Band>
  );
}

function Features({ d, accent, ink }: { d: Record<string, unknown>; accent: string; ink: string }) {
  const items = asArr<Record<string, unknown>>(d.items);
  return (
    <Band>
      <SectionHead title={asStr(d.title)} subtitle={asStr(d.subtitle)} accent={accent} />
      {items.length === 0 ? <Empty label="Aucune fonctionnalité" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {items.map((f, i) => {
            const Icon = iconOf(f.icon);
            return (
              <div key={i} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, background: "#fff" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: rgba(accent, 0.12),
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                }}>
                  <Icon size={17} color={ink} strokeWidth={2} />
                </div>
                <div style={{ color: INK, fontSize: 14, fontWeight: 700 }}>{asStr(f.title)}</div>
                <p style={{ color: BODY, fontSize: 12.5, lineHeight: 1.6, margin: "5px 0 0" }}>{pickStr(f, "description", "body", "text")}</p>
              </div>
            );
          })}
        </div>
      )}
    </Band>
  );
}

function Pricing({ d, accent, ink }: { d: Record<string, unknown>; accent: string; ink: string }) {
  const plans = asArr<Record<string, unknown>>(d.plans);
  const addOns = asArr<Record<string, unknown>>(d.add_ons);
  return (
    <Band tint="#fafbfc">
      <SectionHead title={asStr(d.title)} subtitle={asStr(d.subtitle)} accent={accent} />
      {plans.length === 0 ? <Empty label="Aucune offre" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, alignItems: "start" }}>
          {plans.map((p, i) => (
            <div key={i} style={{
              border: p.is_popular ? `2px solid ${accent}` : `1px solid ${LINE}`,
              borderRadius: 16, padding: 18, background: "#fff", position: "relative",
            }}>
              {Boolean(p.is_popular) && (
                <span style={{
                  position: "absolute", top: -10, left: 18, padding: "2px 9px", borderRadius: 999,
                  background: accent, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
                }}>POPULAIRE</span>
              )}
              <div style={{ color: INK, fontSize: 15, fontWeight: 700 }}>{asStr(p.name)}</div>
              <div style={{ margin: "8px 0 4px", display: "flex", alignItems: "baseline", gap: 5 }}>
                <span style={{ color: ink, fontSize: 26, fontWeight: 800 }}>{fmtPrice(p.price)}</span>
                <span style={{ color: MUTED, fontSize: 12, fontWeight: 600 }}>{asStr(p.currency)}</span>
                {asStr(p.period) && <span style={{ color: MUTED, fontSize: 12 }}>/{asStr(p.period)}</span>}
              </div>
              {pickStr(p, "description", "tagline") && <p style={{ color: BODY, fontSize: 12, margin: "0 0 10px" }}>{pickStr(p, "description", "tagline")}</p>}
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
                {asArr<string>(p.features).map((f, j) => (
                  <li key={j} style={{ display: "flex", gap: 7, alignItems: "flex-start", color: BODY, fontSize: 12.5, marginBottom: 6 }}>
                    <Check size={13} color={accent} strokeWidth={3} style={{ marginTop: 2, flexShrink: 0 }} />{f}
                  </li>
                ))}
              </ul>
              {asStr(p.cta_text) && (
                <div style={{
                  marginTop: 14, padding: "9px 14px", borderRadius: 999, textAlign: "center", fontSize: 13, fontWeight: 700,
                  background: p.is_popular ? accent : rgba(accent, 0.1),
                  color: p.is_popular ? "#fff" : ink,
                }}>{asStr(p.cta_text)}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {addOns.length > 0 && (
        <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {addOns.map((a, i) => (
            <span key={i} style={{
              padding: "6px 12px", borderRadius: 999, border: `1px solid ${LINE}`, background: "#fff",
              color: BODY, fontSize: 12,
            }}>
              {asStr(a.name)} — <strong style={{ color: ink }}>{fmtPrice(a.price)}</strong>
              {asStr(a.period) && <span style={{ color: MUTED }}>/{asStr(a.period)}</span>}
            </span>
          ))}
        </div>
      )}
    </Band>
  );
}

function Testimonials({ d, accent, ink }: { d: Record<string, unknown>; accent: string; ink: string }) {
  const items = asArr<Record<string, unknown>>(d.items);
  return (
    <Band>
      <SectionHead title={asStr(d.title)} subtitle={asStr(d.subtitle)} accent={accent} />
      {asStr(d.rating) && (
        <p style={{ textAlign: "center", color: ink, fontSize: 13, fontWeight: 700, margin: "-14px 0 20px" }}>
          {asStr(d.rating)}
        </p>
      )}
      {items.length === 0 ? <Empty label="Aucun témoignage" /> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 14 }}>
          {items.map((t, i) => {
            const avatar = pickStr(t, "avatar", "initials");
            const isUrl = /^(https?:)?\/\//.test(avatar);
            return (
              <div key={i} style={{ border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, background: "#fff" }}>
                <Quote size={16} color={rgba(accent, 0.55)} />
                <div style={{ display: "flex", gap: 2, margin: "8px 0" }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} size={12} color={accent} fill={n <= (Number(t.rating) || 0) ? accent : "transparent"} />
                  ))}
                </div>
                <p style={{ color: BODY, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{pickStr(t, "text", "quote")}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12 }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: 999, background: rgba(accent, 0.15), color: ink,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800,
                    overflow: "hidden", flexShrink: 0,
                  }}>
                    {isUrl
                      ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (avatar || asStr(t.name).slice(0, 2).toUpperCase())}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: INK, fontSize: 12.5, fontWeight: 700 }}>{asStr(t.name)}</div>
                    <div style={{ color: MUTED, fontSize: 11 }}>
                      {[asStr(t.role), asStr(t.company)].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Band>
  );
}

function Faq({ d, accent }: { d: Record<string, unknown>; accent: string }) {
  const items = asArr<Record<string, unknown>>(d.items);
  return (
    <Band tint="#fafbfc">
      <SectionHead title={asStr(d.title)} subtitle={asStr(d.subtitle)} accent={accent} />
      {items.length === 0 ? <Empty label="Aucune question" /> : (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {items.map((f, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${LINE}`, padding: "12px 0" }}>
              <div style={{ display: "flex", gap: 8, color: INK, fontSize: 13.5, fontWeight: 700 }}>
                <ChevronRight size={15} color={accent} style={{ marginTop: 2, flexShrink: 0 }} />
                {pickStr(f, "question", "q")}
              </div>
              <p style={{ color: BODY, fontSize: 12.5, lineHeight: 1.65, margin: "6px 0 0 23px" }}>{pickStr(f, "answer", "a")}</p>
            </div>
          ))}
        </div>
      )}
    </Band>
  );
}

function FinalCta({ d, accent, ink }: { d: Record<string, unknown>; accent: string; ink: string }) {
  const badges = readTrustBadges(d.trust_badges);
  return (
    <Band tint={`linear-gradient(180deg, #ffffff 0%, ${rgba(accent, 0.1)} 100%)`} style={{ textAlign: "center" }}>
      <h2 style={{ color: INK, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>{asStr(d.title)}</h2>
      {asStr(d.subtitle) && (
        <p style={{ color: BODY, fontSize: 14, lineHeight: 1.65, maxWidth: 560, margin: "10px auto 0" }}>{asStr(d.subtitle)}</p>
      )}
      {asStr(d.cta_text) && (
        <div style={{ marginTop: 18 }}>
          <span style={{ display: "inline-block", padding: "12px 26px", borderRadius: 999, background: accent, color: "#fff", fontSize: 14, fontWeight: 700 }}>
            {asStr(d.cta_text)}
          </span>
        </div>
      )}
      {badges.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 18 }}>
          {badges.map((b, i) => {
            const Icon = b.icon ? iconOf(b.icon) : CheckCircle2;
            return (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: BODY, fontSize: 12 }}>
                <Icon size={14} color={ink} />{b.label}
              </span>
            );
          })}
        </div>
      )}
    </Band>
  );
}

const RENDERERS: Record<string, React.FC<{ d: Record<string, unknown>; accent: string; ink: string }>> = {
  hero: Hero,
  stats: ({ d, ink }) => <Stats d={d} ink={ink} />,
  features: Features,
  pricing: Pricing,
  testimonials: Testimonials,
  faq: ({ d, accent }) => <Faq d={d} accent={accent} />,
  cta: FinalCta,
};

/* ── conteneur ── */
export interface PreviewSection {
  key: string;
  data: Record<string, unknown>;
  isActive: boolean;
}

export function LandingPreview({ appName, appColor, sections }: {
  appName: string;
  appColor: string;
  sections: PreviewSection[];
}) {
  const accent = appColor && HEX.test(appColor) ? appColor : "#4F46E5";
  const ink = readableInk(accent);
  const rendered = sections.filter(s => RENDERERS[s.key]);

  return (
    <div style={{ background: "#ffffff", color: INK, fontFamily: "'Dosis', sans-serif" }}>
      {/* barre de navigation factice — repère visuel */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: `1px solid ${LINE}`, background: "#fff",
      }}>
        <span style={{ color: INK, fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em" }}>{appName}</span>
        <span style={{ padding: "6px 14px", borderRadius: 999, background: accent, color: "#fff", fontSize: 12, fontWeight: 700 }}>
          Se connecter
        </span>
      </div>

      {rendered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: MUTED, fontSize: 13 }}>
          Aucune section visible à afficher.
        </div>
      ) : rendered.map(s => {
        const R = RENDERERS[s.key];
        return (
          <div key={s.key} style={s.isActive ? undefined : { opacity: 0.4, position: "relative" }}>
            {!s.isActive && (
              <div style={{
                position: "absolute", top: 10, right: 12, zIndex: 1, padding: "3px 9px", borderRadius: 999,
                background: "#e6e8ec", color: BODY, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
              }}>MASQUÉE EN LIGNE</div>
            )}
            <R d={s.data} accent={accent} ink={ink} />
          </div>
        );
      })}

      <div style={{ padding: "22px 24px", borderTop: `1px solid ${LINE}`, textAlign: "center", color: MUTED, fontSize: 11 }}>
        © {appName} — Atlas Studio
      </div>
    </div>
  );
}
