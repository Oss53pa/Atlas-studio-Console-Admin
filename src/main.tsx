import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { initErrorMonitor, AtlasErrorBoundary } from './lib/error-sdk';
import { RequireAdmin } from './components/guards/RequireAdmin';
import { RequireSuperAdmin } from './components/guards/RequireSuperAdmin';
import { AdminLayout } from './admin/AdminLayout';
import AdminLoginPage from './admin/AdminLoginPage';
import './index.css';

// Pages admin — chargées à la demande
const HomePage = lazy(() => import('./admin/pages/HomePage'));
const DashboardPage = lazy(() => import('./admin/pages/DashboardPage'));
const ContentManagementPage = lazy(() => import('./admin/pages/ContentManagementPage'));
const AdminAppsTable = lazy(() => import('./admin/pages/AdminAppsTable'));
const ClientsPage = lazy(() => import('./admin/pages/ClientsPage'));
const SubscriptionsPage = lazy(() => import('./admin/pages/SubscriptionsPage'));
const InvoicesPage = lazy(() => import('./admin/pages/InvoicesPage'));
const ActivityLogPage = lazy(() => import('./admin/pages/ActivityLogPage'));
const TicketsPage = lazy(() => import('./admin/pages/TicketsPage'));
const NewsletterPage = lazy(() => import('./admin/pages/NewsletterPage'));
const EmailTemplatesPage = lazy(() => import('./admin/pages/EmailTemplatesPage'));
const AnalyticsPage = lazy(() => import('./admin/pages/AnalyticsPage'));
const AdminStatsPage = lazy(() => import('./admin/pages/AdminStatsPage'));
const Proph3tPage = lazy(() => import('./admin/pages/Proph3tPage'));
const SystemHealthPage = lazy(() => import('./admin/pages/SystemHealthPage'));
const FeatureFlagsPage = lazy(() => import('./admin/pages/FeatureFlagsPage'));
const AlertsPage = lazy(() => import('./admin/pages/AlertsPage'));
const PromoCodesPage = lazy(() => import('./admin/pages/PromoCodesPage'));
const DeploymentsPage = lazy(() => import('./admin/pages/DeploymentsPage'));
const KnowledgeBasePage = lazy(() => import('./admin/pages/KnowledgeBasePage'));
const SettingsPage = lazy(() => import('./admin/pages/SettingsPage'));
const RolesPage = lazy(() => import('./admin/pages/RolesPage'));
const CampaignsPage = lazy(() => import('./admin/pages/CampaignsPage'));
const Proph3tMemoryPage = lazy(() => import('./admin/pages/Proph3tMemoryPage'));
const Proph3tPlansPage = lazy(() => import('./admin/pages/Proph3tPlansPage'));
const Proph3tKnowledgePage = lazy(() => import('./admin/pages/Proph3tKnowledgePage'));
const LicencesPage = lazy(() => import('./admin/pages/LicencesPage'));
const PaymentsPage = lazy(() => import('./admin/pages/PaymentsPage'));
const LandingPagesPage = lazy(() => import('./admin/pages/LandingPagesPage'));
const PlansPage = lazy(() => import('./admin/pages/PlansPage'));
const AdminsPage = lazy(() => import('./admin/pages/AdminsPage'));
const ErrorMonitorIndexPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorIndexPage'));
const ErrorMonitorAppPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorAppPage'));
const ErrorMonitorDetailPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorDetailPage'));

const CONSOLE_APP_ID = 'atlas-studio-console';

function AdminLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-neutral-muted text-sm">Chargement...</div>
    </div>
  );
}

// Silencieux sur les AbortError (fetch annulé lors d'une navigation) — attendu, pas une vraie erreur.
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isAbort =
      (reason instanceof DOMException && reason.name === 'AbortError') ||
      (reason && typeof reason === 'object' &&
        ((reason as { name?: string }).name === 'AbortError' ||
          String((reason as { message?: string }).message || '').includes('signal is aborted')));
    if (isAbort) {
      event.preventDefault();
    }
  });
}

initErrorMonitor(CONSOLE_APP_ID);

const container = document.getElementById('root')!;
const root = (container as any).__root ?? createRoot(container);
(container as any).__root = root;
root.render(
  <StrictMode>
    <AtlasErrorBoundary appId={CONSOLE_APP_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Racine → console */}
            <Route path="/" element={<Navigate to="/admin" replace />} />

            <Route path="/admin">
              {/* Connexion — publique */}
              <Route path="login" element={<AdminLoginPage />} />

              {/* Pages protégées */}
              <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<Suspense fallback={<AdminLoader />}><HomePage /></Suspense>} />
                <Route path="dashboard" element={<Suspense fallback={<AdminLoader />}><DashboardPage /></Suspense>} />
                <Route path="content" element={<Suspense fallback={<AdminLoader />}><ContentManagementPage /></Suspense>} />
                <Route path="apps" element={<Suspense fallback={<AdminLoader />}><AdminAppsTable /></Suspense>} />
                <Route path="clients" element={<Suspense fallback={<AdminLoader />}><ClientsPage /></Suspense>} />
                <Route path="subscriptions" element={<Suspense fallback={<AdminLoader />}><SubscriptionsPage /></Suspense>} />
                <Route path="invoices" element={<Suspense fallback={<AdminLoader />}><InvoicesPage /></Suspense>} />
                <Route path="activity" element={<Suspense fallback={<AdminLoader />}><ActivityLogPage /></Suspense>} />
                <Route path="tickets" element={<Suspense fallback={<AdminLoader />}><TicketsPage /></Suspense>} />
                <Route path="analytics" element={<Suspense fallback={<AdminLoader />}><AnalyticsPage /></Suspense>} />
                <Route path="stats" element={<Suspense fallback={<AdminLoader />}><AdminStatsPage /></Suspense>} />
                <Route path="newsletter" element={<Suspense fallback={<AdminLoader />}><NewsletterPage /></Suspense>} />
                <Route path="emails" element={<Suspense fallback={<AdminLoader />}><EmailTemplatesPage /></Suspense>} />
                <Route path="proph3t" element={<Suspense fallback={<AdminLoader />}><Proph3tPage /></Suspense>} />
                <Route path="system" element={<Suspense fallback={<AdminLoader />}><SystemHealthPage /></Suspense>} />
                <Route path="feature-flags" element={<Suspense fallback={<AdminLoader />}><FeatureFlagsPage /></Suspense>} />
                <Route path="alerts" element={<Suspense fallback={<AdminLoader />}><AlertsPage /></Suspense>} />
                <Route path="promo-codes" element={<Suspense fallback={<AdminLoader />}><PromoCodesPage /></Suspense>} />
                <Route path="deployments" element={<Suspense fallback={<AdminLoader />}><DeploymentsPage /></Suspense>} />
                <Route path="knowledge-base" element={<Suspense fallback={<AdminLoader />}><KnowledgeBasePage /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<AdminLoader />}><SettingsPage /></Suspense>} />
                <Route path="roles" element={<Suspense fallback={<AdminLoader />}><RolesPage /></Suspense>} />
                <Route path="campaigns" element={<Suspense fallback={<AdminLoader />}><CampaignsPage /></Suspense>} />
                <Route path="proph3t-memory" element={<Suspense fallback={<AdminLoader />}><Proph3tMemoryPage /></Suspense>} />
                <Route path="proph3t-plans" element={<Suspense fallback={<AdminLoader />}><Proph3tPlansPage /></Suspense>} />
                <Route path="proph3t-knowledge" element={<Suspense fallback={<AdminLoader />}><Proph3tKnowledgePage /></Suspense>} />
                <Route path="licences" element={<Suspense fallback={<AdminLoader />}><LicencesPage /></Suspense>} />
                <Route path="payments" element={<Suspense fallback={<AdminLoader />}><PaymentsPage /></Suspense>} />
                <Route path="plans" element={<Suspense fallback={<AdminLoader />}><PlansPage /></Suspense>} />
                <Route path="admins" element={<RequireSuperAdmin><Suspense fallback={<AdminLoader />}><AdminsPage /></Suspense></RequireSuperAdmin>} />
                <Route path="landing-pages" element={<Suspense fallback={<AdminLoader />}><LandingPagesPage /></Suspense>} />
                <Route path="error-monitor" element={<Suspense fallback={<AdminLoader />}><ErrorMonitorIndexPage /></Suspense>} />
                <Route path="error-monitor/:appSlug" element={<Suspense fallback={<AdminLoader />}><ErrorMonitorAppPage /></Suspense>} />
                <Route path="error-monitor/:appSlug/:errorId" element={<Suspense fallback={<AdminLoader />}><ErrorMonitorDetailPage /></Suspense>} />
              </Route>
            </Route>

            {/* Tout le reste → console */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AtlasErrorBoundary>
  </StrictMode>
);
