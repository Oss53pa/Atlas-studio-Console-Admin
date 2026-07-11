import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { SITE_URL } from '../../config/site';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  // Utilisateur connecté mais non-admin : on le renvoie vers le site vitrine.
  // (Redirection externe — un <Navigate to="/"> reboucle sur /admin dans la console autonome.)
  const denied = !loading && !!user && !isAdmin;
  useEffect(() => {
    if (denied && typeof window !== 'undefined') {
      window.location.replace(SITE_URL);
    }
  }, [denied]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="text-neutral-placeholder text-sm">Accès réservé aux administrateurs — redirection…</div>
      </div>
    );
  }

  return <>{children}</>;
}
