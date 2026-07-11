import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { SITE_URL } from '../../config/site';

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-onyx px-6 text-center">
      {children}
    </div>
  );
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, loading, signOut } = useAuth();

  // 1. Session en cours de résolution.
  if (loading) {
    return <Screen><span className="text-neutral-placeholder text-sm">Chargement…</span></Screen>;
  }

  // 2. Pas connecté → login.
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // 3. Connecté mais le profil du bon utilisateur n'est pas encore chargé
  //    (course juste après la connexion : `user` est défini avant `profile`).
  //    On PATIENTE au lieu de rediriger — sinon un admin légitime serait
  //    éjecté vers le site pendant ce court instant.
  const profileReady = !!profile && profile.id === user.id;
  if (!profileReady) {
    return (
      <Screen>
        <span className="text-neutral-placeholder text-sm">Chargement du profil…</span>
        <button onClick={signOut} className="text-admin-accent text-xs hover:underline">Se déconnecter</button>
      </Screen>
    );
  }

  // 4. Connecté, profil chargé, mais pas administrateur → accès refusé
  //    (message clair, pas de redirection externe automatique).
  if (!isAdmin) {
    return (
      <Screen>
        <div>
          <h1 className="text-neutral-light text-lg font-semibold mb-1">Accès réservé aux administrateurs</h1>
          <p className="text-neutral-muted text-sm">Ce compte n'a pas les droits d'accès à la console.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={signOut} className="px-4 py-2 rounded-lg bg-admin-accent text-onyx text-sm font-semibold hover:brightness-110 transition-all">
            Se déconnecter
          </button>
          <a href={SITE_URL} className="px-4 py-2 rounded-lg border border-white/15 text-neutral-light text-sm hover:bg-white/5 transition-all">
            Aller au site
          </a>
        </div>
      </Screen>
    );
  }

  return <>{children}</>;
}
