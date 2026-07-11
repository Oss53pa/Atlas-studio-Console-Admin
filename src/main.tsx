import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { initErrorMonitor, AtlasErrorBoundary } from './lib/error-sdk';
import { RequireAdmin } from './components/guards/RequireAdmin';
import { RequireSuperAdmin } from './components/guards/RequireSuperAdmin';
import { AdminLayout } from './admin/AdminLayout';
import AdminLoginPage from './admin/AdminLoginPage';
import LandingPage from './admin/LandingPage';
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
const OhadaReferentielPage = lazy(() => import('./admin/pages/OhadaReferentielPage'));
const AdminsPage = lazy(() => import('./admin/pages/AdminsPage'));
const ErrorMonitorIndexPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorIndexPage'));
const ErrorMonitorAppPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorAppPage'));
const ErrorMonitorDetailPage = lazy(() => import('./admin/pages/error-monitor/ErrorMonitorDetailPage'));
const AsvcHubPage = lazy(() => import('./admin/pages/asvc/AsvcHubPage'));
const AsvcArbitrationsPage = lazy(() => import('./admin/pages/asvc/AsvcArbitrationsPage'));
const AsvcAgentsPage = lazy(() => import('./admin/pages/asvc/AsvcAgentsPage'));
const AsvcActionsLogPage = lazy(() => import('./admin/pages/asvc/AsvcActionsLogPage'));
const AsvcKillSwitchPage = lazy(() => import('./admin/pages/asvc/AsvcKillSwitchPage'));
const AsvcConfigPage = lazy(() => import('./admin/pages/asvc/AsvcConfigPage'));
const AsvcTicketsPage = lazy(() => import('./admin/pages/asvc/AsvcTicketsPage'));
const AsvcCustomersPage = lazy(() => import('./admin/pages/asvc/AsvcCustomersPage'));
const AsvcContentPage = lazy(() => import('./admin/pages/asvc/AsvcContentPage'));
const AsvcLeadsPage = lazy(() => import('./admin/pages/asvc/AsvcLeadsPage'));
const AsvcFinancePage = lazy(() => import('./admin/pages/asvc/AsvcFinancePage'));
const AsvcPipelinePage = lazy(() => import('./admin/pages/asvc/AsvcPipelinePage'));
const AsvcHealthPage = lazy(() => import('./admin/pages/asvc/AsvcHealthPage'));
const AsvcTestsReadinessPage = lazy(() => import('./admin/pages/asvc/AsvcTestsReadinessPage'));
const AsvcTemplatesPage = lazy(() => import('./admin/pages/asvc/AsvcTemplatesPage'));
const AsvcConnectorsPage = lazy(() => import('./admin/pages/asvc/AsvcConnectorsPage'));
const AsvcBriefsPage = lazy(() => import('./admin/pages/asvc/AsvcBriefsPage'));
const AsvcSettingsPage = lazy(() => import('./admin/pages/asvc/AsvcSettingsPage'));
const AsvcAgentPromptsPage = lazy(() => import('./admin/pages/asvc/AsvcAgentPromptsPage'));
const AsvcSetupGuidePage = lazy(() => import('./admin/pages/asvc/AsvcSetupGuidePage'));
const AsvcSpecDetailPage = lazy(() => import('./admin/pages/asvc/AsvcSpecDetailPage'));
const AsvcPrDetailPage = lazy(() => import('./admin/pages/asvc/AsvcPrDetailPage'));
const AsvcDeploymentDetailPage = lazy(() => import('./admin/pages/asvc/AsvcDeploymentDetailPage'));
const AsvcTechDebtPage = lazy(() => import('./admin/pages/asvc/AsvcTechDebtPage'));

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

const S = (el: React.ReactNode) => <Suspense fallback={<AdminLoader />}>{el}</Suspense>;

const container = document.getElementById('root')!;
const root = (container as any).__root ?? createRoot(container);
(container as any).__root = root;
root.render(
  <StrictMode>
    <AtlasErrorBoundary appId={CONSOLE_APP_ID}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Racine → page d'accueil publique (avant login) */}
            <Route path="/" element={<LandingPage />} />

            <Route path="/admin">
              {/* Connexion — publique */}
              <Route path="login" element={<AdminLoginPage />} />

              {/* Pages protégées */}
              <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={S(<HomePage />)} />
                <Route path="dashboard" element={S(<DashboardPage />)} />
                <Route path="content" element={S(<ContentManagementPage />)} />
                <Route path="apps" element={S(<AdminAppsTable />)} />
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
              </Route>
            </Route>

            {/* Tout le reste → page d'accueil */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </AtlasErrorBoundary>
  </StrictMode>
);
