import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Activity, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";

/* ─────────────────────────────────────────────────────────────
   Page d'accueil PUBLIQUE (avant login).
   Reprend le hero éditorial de la console, sans aucune donnée
   sensible — juste l'entrée vers la connexion.
   Flux : cette page → /admin/login → console.
   ───────────────────────────────────────────────────────────── */

export default function LandingPage() {
  const { user } = useAuth();
  const cta = user
    ? { to: "/admin", label: "Accéder à la console" }
    : { to: "/admin/login", label: "Se connecter" };

  const now = new Date();
  const moisAnnee = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisAnneeCap = moisAnnee.charAt(0).toUpperCase() + moisAnnee.slice(1);

  return (
    <div className="relative min-h-screen overflow-hidden bg-admin-bg flex flex-col">
      {/* Fonds décoratifs */}
      <div className="absolute inset-0 bg-gradient-ink-radial" />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 75%)",
        }}
      />

      {/* Contenu centré */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="inline-flex items-center gap-2 text-admin-accent text-[11px] font-bold uppercase tracking-[0.2em]">
          <span className="w-1.5 h-1.5 rounded-full bg-admin-accent animate-pulse" />
          Bienvenue · {moisAnneeCap}
        </div>

        <h1 className="mt-5 text-4xl md:text-6xl font-bold text-neutral-light tracking-tight">
          Console{" "}
          <span className="font-logo text-[1.15em] bg-gradient-champagne bg-clip-text text-transparent">
            Atlas Studio
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-neutral-body text-sm md:text-[15px] leading-relaxed">
          Pilotage unifié de votre suite — du <strong className="text-neutral-light font-semibold">catalogue d'apps</strong> aux{" "}
          <strong className="text-neutral-light font-semibold">clients, abonnements et licences</strong>. Données 100 % en temps réel.
        </p>

        {/* CTA */}
        <Link
          to={cta.to}
          className="mt-9 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-admin-accent text-onyx text-sm font-semibold hover:brightness-110 transition-all shadow-premium"
        >
          {cta.label} <ArrowRight size={16} />
        </Link>

        {/* Chips non sensibles */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: ShieldCheck, label: "Conformité RGPD" },
            { icon: Sparkles, label: "Piste d'audit SHA-256" },
            { icon: Activity, label: "Temps réel" },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/[0.02] text-neutral-muted text-[12px]"
            >
              <Icon size={13} className="text-admin-accent" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Pied */}
      <div className="relative pb-8 text-center text-neutral-muted/60 text-[11px]">
        Atlas Studio · Console d'administration
      </div>
    </div>
  );
}
