import { useState, useEffect, useRef } from "react";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

interface LockScreenProps {
  onUnlock: () => void;
  onSignOut: () => void;
}

export function LockScreen({ onUnlock, onSignOut }: LockScreenProps) {
  const { user, profile } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnlock = async () => {
    if (!user?.email || !password) {
      setError("Veuillez entrer votre mot de passe");
      return;
    }
    setError("");
    setLoading(true);

    // On vérifie le mot de passe via signInWithPassword. Un filet de sécurité
    // (timeout) garantit que le bouton ne reste jamais bloqué sur
    // « Vérification… » si le réseau traîne ou si la requête ne répond pas.
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email: user.email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 12000)
        ),
      ]);
      const authErr = (result as { error: { message: string } | null }).error;
      if (authErr) {
        setError("Mot de passe incorrect");
        setPassword("");
        inputRef.current?.focus();
      } else {
        setPassword("");
        onUnlock();
      }
    } catch (e) {
      setError(
        e instanceof Error && e.message === "timeout"
          ? "Connexion trop lente. Réessayez."
          : "Erreur de vérification"
      );
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleUnlock();
  };

  const initials = (profile?.full_name || user?.email || "A")
    .split(/[\s@]/)
    .map(s => s[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "rgba(23,25,18,0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="w-full max-w-md mx-auto px-6">
        {/* Logo (sur le voile sombre) */}
        <div className="text-center mb-8">
          <Logo size={32} color="text-white" />
          <div className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
            Console Administration
          </div>
        </div>

        {/* Lock card — carte claire */}
        <div className="bg-p-surface border border-p-border rounded-2xl p-8 shadow-elev-5">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-p-accent/12 border border-p-accent/25 flex items-center justify-center">
              <Lock size={22} className="text-p-accent" />
            </div>
          </div>

          <h2 className="text-p-text text-lg font-semibold text-center mb-2">
            Session verrouillée
          </h2>
          <p className="text-p-muted text-[12px] text-center mb-6 leading-relaxed">
            Inactivité détectée — entrez votre mot de passe<br />
            pour reprendre votre session.
          </p>

          {/* User pill */}
          <div className="flex items-center gap-3 px-3 py-2 bg-p-surface-alt border border-p-border rounded-lg mb-4">
            <div className="w-8 h-8 rounded-full bg-p-accent flex items-center justify-center text-p-on-accent text-[11px] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-p-text text-[12px] font-medium truncate">
                {profile?.full_name || "Admin"}
              </div>
              <div className="text-p-muted text-[10px] truncate">{user?.email}</div>
            </div>
          </div>

          {/* Password input */}
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mot de passe"
              disabled={loading}
              className="w-full px-3 py-2.5 pr-10 bg-p-surface-alt border border-p-border rounded-lg text-p-text text-[13px] placeholder-p-muted focus:border-p-accent outline-none transition-colors"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-p-muted hover:text-p-text transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <div className="mt-2 text-p-err text-[11px] font-medium">{error}</div>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || !password}
            className="w-full mt-4 py-2.5 bg-p-accent text-p-on-accent rounded-lg font-semibold text-[13px] hover:bg-p-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Vérification...
              </>
            ) : (
              "Déverrouiller"
            )}
          </button>

          <div className="mt-4 pt-4 border-t border-p-border text-center">
            <button
              onClick={onSignOut}
              className="text-p-muted hover:text-p-text text-[11px] transition-colors"
            >
              Se déconnecter complètement
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="text-white/50 text-[10px]">
            Atlas Studio · Sécurité console
          </div>
        </div>
      </div>
    </div>
  );
}
