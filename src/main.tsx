import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { initErrorMonitor, AtlasErrorBoundary } from './lib/error-sdk';
import { RequireAdmin } from './components/guards/RequireAdmin';
import { RequireSuperAdmin } from './components/guards/RequireSuperAdmin';
import { AdminLayout } from './admin/AdminLayout';
import AdminLoginPage from './admin/AdminLoginPage';
import { PaletteProvider } from './theme/palette';
import { AppFilterProvider } from './admin/contexts/AppFilterContext';
import './index.css';

// Chargement paresseux résilient : après un nouveau déploiement, les anciens
// chunks (hashés) n'existent plus sur le serveur. Si un import dynamique échoue
// (« Failed to fetch dynamically imported module »), on recharge UNE fois la
// page pour récupérer les nouveaux assets, au lieu d'afficher un écran d'erreur.
function lazyRetry<T extends { default: React.ComponentType<any> }>(factory: () => Promise<T>) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      const KEY = 'atlas_chunk_reload_at';
      const last = Number(sessionStorage.getItem(KEY) || 0);
      if (typeof window !== 'undefined' && Date.now() - last > 10000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
        return new Promise<T>(() => {}); // suspend jusqu'au rechargement
      }
      throw err;
    })
  );
}

// Pages admin — chargées à la demande
const HomePage = lazyRetry(() => import('./admin/pages/HomePage'));
const DashboardPage = lazyRetry(() => import('./admin/pages/DashboardPage'));
const ContentManagementPage = lazyRetry(() => import('./admin/pages/ContentManagementPage'));
const AdminAppsTable = lazyRetry(() => import('./admin/pages/AdminAppsTable'));
const AppCockpitPage = lazyRetry(() => import('./admin/pages/AppCockpitPage'));
const SeoPage = lazyRetry(() => import('./admin/pages/SeoPage'));
const ClientsPage = lazyRetry(() => import('./admin/pages/ClientsPage'));
const SubscriptionsPage = lazyRetry(() => import('./admin/pages/SubscriptionsPage'));
const InvoicesPage = lazyRetry(() => import('./admin/pages/InvoicesPage'));
const ActivityLogPage = lazyRetry(() => import('./admin/pages/ActivityLogPage'));
const TicketsPage = lazyRetry(() => import('./admin/pages/TicketsPage'));
const NewsletterPage = lazyRetry(() => import('./admin/pages/NewsletterPage'));
const EmailTemplatesPage = lazyRetry(() => import('./admin/pages/EmailTemplatesPage'));
const AnalyticsPage = lazyRetry(() => import('./admin/pages/AnalyticsPage'));
const AdminStatsPage = lazyRetry(() => import('./admin/pages/AdminStatsPage'));
const Proph3tPage = lazyRetry(() => import('./admin/pages/Proph3tPage'));
const SystemHealthPage = lazyRetry(() => import('./admin/pages/SystemHealthPage'));
const FeatureFlagsPage = lazyRetry(() => import('./admin/pages/FeatureFlagsPage'));
const AlertsPage = lazyRetry(() => import('./admin/pages/AlertsPage'));
const PromoCodesPage = lazyRetry(() => import('./admin/pages/PromoCodesPage'));
const DeploymentsPage = lazyRetry(() => import('./admin/pages/DeploymentsPage'));
const KnowledgeBasePage = lazyRetry(() => import('./admin/pages/KnowledgeBasePage'));
const SettingsPage = lazyRetry(() => import('./admin/pages/SettingsPage'));
const RolesPage = lazyRetry(() => import('./admin/pages/RolesPage'));
const CampaignsPage = lazyRetry(() => import('./admin/pages/CampaignsPage'));
const Proph3tMemoryPage = lazyRetry(() => import('./admin/pages/Proph3tMemoryPage'));
const Proph3tPlansPage = lazyRetry(() => import('./admin/pages/Proph3tPlansPage'));
const Proph3tKnowledgePage = lazyRetry(() => import('./admin/pages/Proph3tKnowledgePage'));
const LicencesPage = lazyRetry(() => import('./admin/pages/LicencesPage'));
const PaymentsPage = lazyRetry(() => import('./admin/pages/PaymentsPage'));
const LandingPagesPage = lazyRetry(() => import('./admin/pages/LandingPagesPage'));
const PlansPage = lazyRetry(() => import('./admin/pages/PlansPage'));
const OhadaReferentielPage = lazyRetry(() => import('./admin/pages/OhadaReferentielPage'));
const AdminsPage = lazyRetry(() => import('./admin/pages/AdminsPage'));
const ErrorMonitorIndexPage = lazyRetry(() => import('./admin/pages/error-monitor/ErrorMonitorIndexPage'));
const ErrorMonitorAppPage = lazyRetry(() => import('./admin/pages/error-monitor/ErrorMonitorAppPage'));
const ErrorMonitorDetailPage = lazyRetry(() => import('./admin/pages/error-monitor/ErrorMonitorDetailPage'));
const AsvcHubPage = lazyRetry(() => import('./admin/pages/asvc/AsvcHubPage'));
const AsvcArbitrationsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcArbitrationsPage'));
const AsvcAgentsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcAgentsPage'));
const AsvcActionsLogPage = lazyRetry(() => import('./admin/pages/asvc/AsvcActionsLogPage'));
const AsvcKillSwitchPage = lazyRetry(() => import('./admin/pages/asvc/AsvcKillSwitchPage'));
const AsvcConfigPage = lazyRetry(() => import('./admin/pages/asvc/AsvcConfigPage'));
const AsvcTicketsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcTicketsPage'));
const AsvcCustomersPage = lazyRetry(() => import('./admin/pages/asvc/AsvcCustomersPage'));
const AsvcContentPage = lazyRetry(() => import('./admin/pages/asvc/AsvcContentPage'));
const AsvcLeadsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcLeadsPage'));
const AsvcFinancePage = lazyRetry(() => import('./admin/pages/asvc/AsvcFinancePage'));
const AsvcPipelinePage = lazyRetry(() => import('./admin/pages/asvc/AsvcPipelinePage'));
const AsvcHealthPage = lazyRetry(() => import('./admin/pages/asvc/AsvcHealthPage'));
const AsvcTestsReadinessPage = lazyRetry(() => import('./admin/pages/asvc/AsvcTestsReadinessPage'));
const AsvcTemplatesPage = lazyRetry(() => import('./admin/pages/asvc/AsvcTemplatesPage'));
const AsvcConnectorsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcConnectorsPage'));
const AsvcBriefsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcBriefsPage'));
const AsvcSettingsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcSettingsPage'));
const AsvcAgentPromptsPage = lazyRetry(() => import('./admin/pages/asvc/AsvcAgentPromptsPage'));
const AsvcSetupGuidePage = lazyRetry(() => import('./admin/pages/asvc/AsvcSetupGuidePage'));
const AsvcSpecDetailPage = lazyRetry(() => import('./admin/pages/asvc/AsvcSpecDetailPage'));
const AsvcPrDetailPage = lazyRetry(() => import('./admin/pages/asvc/AsvcPrDetailPage'));
const AsvcDeploymentDetailPage = lazyRetry(() => import('./admin/pages/asvc/AsvcDeploymentDetailPage'));
const AsvcTechDebtPage = lazyRetry(() => import('./admin/pages/asvc/AsvcTechDebtPage'));

// Atlas Cortex (module business model / stratégie)
const CortexDashboardPage = lazyRetry(() => import('./admin/pages/cortex/CortexDashboardPage'));
const CortexPortfolioPage = lazyRetry(() => import('./admin/pages/cortex/CortexPortfolioPage'));
const CortexPipelinePage = lazyRetry(() => import('./admin/pages/cortex/CortexPipelinePage'));
const CortexPlanningPage = lazyRetry(() => import('./admin/pages/cortex/CortexPlanningPage'));
const CortexCostsPage = lazyRetry(() => import('./admin/pages/cortex/CortexCostsPage'));
const CortexAppPage = lazyRetry(() => import('./admin/pages/cortex/CortexAppPage'));

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

  // Vite signale l'échec de préchargement d'un chunk (après un nouveau déploiement).
  // On recharge une fois pour récupérer les nouveaux assets.
  window.addEventListener('vite:preloadError', () => {
    const KEY = 'atlas_chunk_reload_at';
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
    }
  });
}

initErrorMonitor(CONSOLE_APP_ID);

const S = (el: React.ReactNode) => <Suspense fallback={<AdminLoader />}>{el}</Suspense>;

const container = document.getElementById('root')!;
const root = (container as any).__root ?? createRoot(container);
(container as any).__root = root;
root.render(
  <StrictMode>
    <AtlasErrorBoundary appId={CONSOLE_APP_ID}>
      <PaletteProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Accueil PUBLIC (avant login) — page éditoriale, sans l'appli */}
            <Route path="/" element={<AppFilterProvider>{S(<HomePage />)}</AppFilterProvider>} />

            <Route path="/admin">
              {/* Connexion — publique */}
              <Route path="login" element={<AdminLoginPage />} />

              {/* Pages protégées (l'appli) */}
              <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={S(<DashboardPage />)} />
                <Route path="content" element={S(<ContentManagementPage />)} />
                <Route path="apps" element={S(<AdminAppsTable />)} />
                <Route path="apps/:appId" element={S(<AppCockpitPage />)} />
                <Route path="clients" element={S(<ClientsPage />)} />
                <Route path="subscriptions" element={S(<SubscriptionsPage />)} />
                <Route path="invoices" element={S(<InvoicesPage />)} />
                <Route path="activity" element={S(<ActivityLogPage />)} />
                <Route path="tickets" element={S(<TicketsPage />)} />
                <Route path="analytics" element={S(<AnalyticsPage />)} />
                <Route path="stats" element={S(<AdminStatsPage />)} />
                <Route path="newsletter" element={S(<NewsletterPage />)} />
                <Route path="emails" element={S(<EmailTemplatesPage />)} />
                <Route path="proph3t" element={S(<Proph3tPage />)} />
                <Route path="system" element={S(<SystemHealthPage />)} />
                <Route path="feature-flags" element={S(<FeatureFlagsPage />)} />
                <Route path="alerts" element={S(<AlertsPage />)} />
                <Route path="promo-codes" element={S(<PromoCodesPage />)} />
                <Route path="deployments" element={S(<DeploymentsPage />)} />
                <Route path="knowledge-base" element={S(<KnowledgeBasePage />)} />
                <Route path="settings" element={S(<SettingsPage />)} />
                <Route path="roles" element={S(<RolesPage />)} />
                <Route path="campaigns" element={S(<CampaignsPage />)} />
                <Route path="proph3t-memory" element={S(<Proph3tMemoryPage />)} />
                <Route path="proph3t-plans" element={S(<Proph3tPlansPage />)} />
                <Route path="proph3t-knowledge" element={S(<Proph3tKnowledgePage />)} />
                <Route path="licences" element={S(<LicencesPage />)} />
                <Route path="payments" element={S(<PaymentsPage />)} />
                <Route path="plans" element={S(<PlansPage />)} />
                <Route path="ohada" element={S(<OhadaReferentielPage />)} />
                <Route path="admins" element={<RequireSuperAdmin>{S(<AdminsPage />)}</RequireSuperAdmin>} />
                <Route path="landing-pages" element={S(<LandingPagesPage />)} />
                <Route path="seo" element={S(<SeoPage />)} />
                <Route path="error-monitor" element={S(<ErrorMonitorIndexPage />)} />
                <Route path="error-monitor/:appSlug" element={S(<ErrorMonitorAppPage />)} />
                <Route path="error-monitor/:appSlug/:errorId" element={S(<ErrorMonitorDetailPage />)} />
                <Route path="asvc" element={S(<AsvcHubPage />)} />
                <Route path="asvc/arbitrations" element={S(<AsvcArbitrationsPage />)} />
                <Route path="asvc/agents" element={S(<AsvcAgentsPage />)} />
                <Route path="asvc/actions" element={S(<AsvcActionsLogPage />)} />
                <Route path="asvc/kill-switch" element={S(<AsvcKillSwitchPage />)} />
                <Route path="asvc/config" element={S(<AsvcConfigPage />)} />
                <Route path="asvc/tickets" element={S(<AsvcTicketsPage />)} />
                <Route path="asvc/customers" element={S(<AsvcCustomersPage />)} />
                <Route path="asvc/content" element={S(<AsvcContentPage />)} />
                <Route path="asvc/leads" element={S(<AsvcLeadsPage />)} />
                <Route path="asvc/finance" element={S(<AsvcFinancePage />)} />
                <Route path="asvc/pipeline" element={S(<AsvcPipelinePage />)} />
                <Route path="asvc/health" element={S(<AsvcHealthPage />)} />
                <Route path="asvc/tests" element={S(<AsvcTestsReadinessPage />)} />
                <Route path="asvc/templates" element={S(<AsvcTemplatesPage />)} />
                <Route path="asvc/tech-debt" element={S(<AsvcTechDebtPage />)} />
                <Route path="asvc/connectors" element={S(<AsvcConnectorsPage />)} />
                <Route path="asvc/briefs" element={S(<AsvcBriefsPage />)} />
                <Route path="asvc/settings" element={S(<AsvcSettingsPage />)} />
                <Route path="asvc/agent-prompts" element={S(<AsvcAgentPromptsPage />)} />
                <Route path="asvc/setup-guide" element={S(<AsvcSetupGuidePage />)} />
                <Route path="asvc/specs/:id" element={S(<AsvcSpecDetailPage />)} />
                <Route path="asvc/prs/:id" element={S(<AsvcPrDetailPage />)} />
                <Route path="asvc/deployments/:id" element={S(<AsvcDeploymentDetailPage />)} />

                {/* Atlas Cortex */}
                <Route path="cortex" element={S(<CortexDashboardPage />)} />
                <Route path="cortex/portfolio" element={S(<CortexPortfolioPage />)} />
                <Route path="cortex/pipeline" element={S(<CortexPipelinePage />)} />
                <Route path="cortex/planning" element={S(<CortexPlanningPage />)} />
                <Route path="cortex/costs" element={S(<CortexCostsPage />)} />
                <Route path="cortex/app/:id" element={S(<CortexAppPage />)} />
              </Route>
            </Route>

            {/* Tout le reste → console */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </PaletteProvider>
    </AtlasErrorBoundary>
  </StrictMode>
);
