import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';
import { ModalStackProvider } from './context/ModalStackContext';
import { StackedModalManager } from './components/UI/StackedModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlatform } from './hooks/usePlatform';
import { PageLoader } from './components/UI/PageLoader';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Components & Layout
import { PlatformShell } from './components/Layout/PlatformShell';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Login } from './components/Auth/Login';
import { ComingSoon } from './components/Common/ComingSoon';
import { AIBuilder } from './components/AIBuilder';
import { SuperAdmin } from './components/SuperAdmin';
import { Onboarding } from './components/Onboarding';
import { WorkQueue } from './components/WorkQueue';
import { ExternalPortal } from './components/ExternalPortal';
import { ModuleEditor } from './components/ModuleEditor';
import { Analytics } from './components/Analytics';

import { DocumentAutomation } from './components/DocumentAutomation';
import { TenantOverview } from './components/TenantOverview';
import { AppsSettings } from './components/Settings/Organization/AppsSettings';
import { GlobalListsSettings } from './pages/Settings/PlatformModules/GlobalListsSettings';
import { PeopleOrgDirectory } from './pages/Platform/PeopleOrgDirectory';
import { PeopleOrgDetail } from './pages/Platform/PeopleOrgDetail';
import { PeopleOrgSettings } from './pages/Settings/PlatformModules/PeopleOrgSettings';
import { PlatformModulesSettings } from './pages/Settings/PlatformModules/PlatformModulesSettings';
import { KnowledgeBaseSettings } from './pages/Settings/PlatformModules/KnowledgeBaseSettings';
import { PricingCatalogSettings } from './pages/Settings/PlatformModules/PricingCatalogSettings';
import { InventoryManagerSettings } from './pages/Settings/PlatformModules/InventoryManagerSettings';
import { HealthMonitor } from './components/HealthMonitor';
import { FleetManager } from './components/FleetManager';
import { ComputeMatrix } from './components/ComputeMatrix';
import { WorkforcePage } from './pages/Settings/WorkforcePage';
import { MemberDetailView } from './pages/Settings/MemberDetailView';
import { TeamDetailView } from './pages/Settings/TeamDetailView';
import { PositionDetailView } from './pages/Settings/PositionDetailView';
import { SubscriptionPage } from './pages/Settings/SubscriptionPage';
import { OrganizationPage } from './pages/Settings/OrganizationPage';
import { LicenseGate, LicenseRestrictedPlaceholder } from './components/Auth/LicenseGate';

// Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BuilderChoice } from './pages/Builder/BuilderChoice';
import { ModuleView } from './pages/Module/ModuleView';
import { QueueView } from './pages/Queue/QueueView';
import { RecordDetailView } from './pages/Record/RecordDetailView';
import { WorkspacePageView } from './pages/WorkspacePage/WorkspacePageView';
import { PageBuilder } from './pages/WorkspacePage/PageBuilder';
import { PagesManagementPage } from './pages/Settings/PagesManagementPage';
import { SitesPage } from './pages/Settings/SitesPage';
import { BrandingSettingsPage } from './pages/Settings/BrandingSettingsPage';
import { NavigationSettingsPage } from './pages/Settings/NavigationSettingsPage';
import { SettingsOverview } from './pages/Settings/SettingsOverview';
import { ConnectorsPage } from './pages/Settings/ConnectorsPage';
import { AutomationsPage } from './pages/Settings/AutomationsPage';
import { IntakeSettingsPage } from './pages/Settings/IntakeSettingsPage';
import { TriageInboxPage } from './pages/Triage/TriageInboxPage';
import { APISettings } from './pages/Settings/APISettings';
import { QueryExplorer } from './pages/Settings/QueryExplorer';
import { RecordsManagement } from './pages/Platform/RecordsManagement';
import { RecordsManagementSettings } from './pages/Settings/PlatformModules/RecordsManagementSettings';
import { ReportManagementSettings } from './pages/Settings/PlatformModules/ReportManagementSettings';



const NavigateWithSearch = ({ to, replace }: { to: string; replace?: boolean }) => {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace={replace} />;
};

const NavigateWithParams = ({ to, replace }: { to: string; replace?: boolean }) => {
  const params = useParams();
  const location = useLocation();
  let targetPath = to;
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      targetPath = targetPath.replace(`:${key}`, value);
    }
  });
  return <Navigate to={{ pathname: targetPath, search: location.search }} replace={replace} />;
};

const SettingsLayout = () => {
  const location = useLocation();
  const isFullBleed = location.pathname.includes('/builder/') || 
                     location.pathname.includes('/ai-builder') ||
                     location.pathname.startsWith('/workspace/settings');
  return (
    <PlatformShell fullBleed={isFullBleed}>
      <LicenseGate fallback={<LicenseRestrictedPlaceholder />}>
        <Outlet />
      </LicenseGate>
    </PlatformShell>
  );
};

const WorkspaceLayout = () => {
  return (
    <PlatformShell fullBleed={true}>
      <LicenseGate fallback={<LicenseRestrictedPlaceholder />}>
        <Outlet />
      </LicenseGate>
    </PlatformShell>
  );
};

const DashboardRouteWrapper = () => {
  const { modules, isLoading } = usePlatform();
  if (isLoading) return <PageLoader label="Loading Workspace..." />;
  const dashboardPage = modules.find((m: any) => m.type === 'PAGE' && (m.name.toLowerCase() === 'dashboard' || m.config?.widgets?.some((w: any) => w.type === 'stats-grid')));
  if (dashboardPage) {
    return <Navigate to={`/workspace/pages/${dashboardPage.id}`} replace />;
  }
  return <DashboardPage />;
};

const MyWorkRouteWrapper = () => {
  const { modules, isLoading } = usePlatform();
  if (isLoading) return <PageLoader label="Loading Queue..." />;
  const myWorkPage = modules.find((m: any) => m.type === 'PAGE' && (m.name.toLowerCase() === 'my work' || m.config?.widgets?.some((w: any) => w.type === 'work-queue')));
  if (myWorkPage) {
    return <Navigate to={`/workspace/pages/${myWorkPage.id}`} replace />;
  }
  return <WorkQueue />;
};

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
        <PlatformProvider>
          <ModalStackProvider>
            <Router>
              <Toaster position="top-right" expand={false} richColors />
              <StackedModalManager />
              <Routes>
              {/* Login & Root Redirect */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/workspace" replace />} />

              {/* Platform Operations & Administration (SuperAdmin Only) */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><PlatformShell><SuperAdmin /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/health" element={<ProtectedRoute requireAdmin><PlatformShell><HealthMonitor /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/fleet" element={<ProtectedRoute requireAdmin><PlatformShell><FleetManager /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/compute" element={<ProtectedRoute requireAdmin><PlatformShell><ComputeMatrix /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/tenants/:id" element={<ProtectedRoute requireAdmin><PlatformShell><TenantOverview /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><PlatformShell><ComingSoon title="Platform Controls" description="Global organization settings, security policies, and administrative keys." /></PlatformShell></ProtectedRoute>} />

              {/* Workspace Routes (Authenticated Standard Users) */}
              <Route path="/workspace" element={<ProtectedRoute><WorkspaceLayout /></ProtectedRoute>}>
                <Route index element={<DashboardRouteWrapper />} />
                <Route path="pages/:pageId" element={<WorkspacePageView />} />
                
                {/* Legacy Redirects */}
                <Route path="builder" element={<Navigate to="/workspace/settings/builder" replace />} />
                <Route path="ai-builder" element={<Navigate to="/workspace/settings/ai-builder" replace />} />
                <Route path="builder/:id" element={<Navigate to="/workspace/settings/builder/:id" replace />} />
                <Route path="catalog" element={<Navigate to="/workspace/settings/modules" replace />} />
                <Route path="documents" element={<Navigate to="/workspace/settings/templates" replace />} />
                <Route path="workflows" element={<Navigate to="/workspace/settings/automations" replace />} />
                <Route path="automations" element={<Navigate to="/workspace/settings/automations" replace />} />
                <Route path="reports" element={<Navigate to="/workspace/settings/reports" replace />} />
                <Route path="platform/entities" element={<Navigate to="/workspace/platform/people-organisations" replace />} />
                <Route path="platform" element={<NavigateWithSearch to="/workspace/platform/people-organisations" replace />} />
                <Route path="modules" element={<NavigateWithSearch to="/workspace/settings/modules" replace />} />
                
                {/* Dynamic Module Routes */}
                <Route path="modules/:moduleId" element={<ModuleView />} />
                <Route path="modules/:moduleId/records/:recordId" element={<RecordDetailView />} />
                <Route path="modules/:parentModuleId/records/:parentRecordId/sub/:moduleId/:recordId" element={<RecordDetailView />} />
                <Route path="queues/:queueId" element={<QueueView />} />
                
                {/* Platform Operations */}
                <Route path="my-work" element={<MyWorkRouteWrapper />} />
                <Route path="queue" element={<Navigate to="/workspace/my-work" replace />} />
                <Route path="platform/people-organisations" element={<PeopleOrgDirectory />} />
                <Route path="platform/people-organisations/:id" element={<PeopleOrgDetail />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="platform/intake" element={<TriageInboxPage />} />
                <Route path="platform/knowledge-base" element={<KnowledgeBaseSettings />} />
                <Route path="platform/pricing-catalog" element={<PricingCatalogSettings />} />
                <Route path="platform/inventory-manager" element={<InventoryManagerSettings />} />
                <Route path="platform/global-lists" element={<GlobalListsSettings />} />
                <Route path="platform/workforce" element={<WorkforcePage />} />
                <Route path="platform/workforce/member/:id" element={<MemberDetailView />} />
                <Route path="platform/workforce/teams/:id" element={<TeamDetailView />} />
                <Route path="platform/integrations" element={<ConnectorsPage />} />
                <Route path="platform/sites" element={<SitesPage />} />
                <Route path="platform/automations" element={<AutomationsPage />} />
                <Route path="platform/templates" element={<DocumentAutomation />} />
                <Route path="platform/reports" element={<ReportManagementSettings />} />
                <Route path="platform/api" element={<APISettings />} />
                <Route path="platform/finance" element={<ComingSoon title="Financial Management" description="Financial settings, tax configurations, and payment processing rules." />} />
                <Route path="platform/records-management" element={<RecordsManagement />} />
              </Route>
              
              {/* Settings & Workforce (Developer Only) */}
              <Route 
                path="/workspace/settings" 
                element={
                  <ProtectedRoute>
                    <SettingsLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<SettingsOverview />} />
                <Route path="organization" element={<OrganizationPage />} />
                <Route path="subscription" element={<SubscriptionPage />} />
                <Route path="billing" element={<Navigate to="/workspace/settings/subscription" replace />} />
                <Route path="usage" element={<Navigate to="/workspace/settings/subscription" replace />} />
                
                {/* Module Builder */}
                <Route path="builder" element={<BuilderChoice />} />
                <Route path="ai-builder" element={<AIBuilder />} />
                <Route path="builder/:id" element={<ModuleEditor />} />
                <Route path="builder/page/:id" element={<PageBuilder />} />
                <Route path="pages" element={<PagesManagementPage />} />
                <Route path="modules" element={<Navigate to="/workspace/settings/platform-modules" replace />} />
                <Route path="apps" element={<AppsSettings />} />

                <Route path="lists" element={<Navigate to="/workspace/settings/platform-modules/global-lists" replace />} />
                <Route path="branding" element={<BrandingSettingsPage />} />
                <Route path="navigation" element={<NavigationSettingsPage />} />
                <Route path="appearance" element={<Navigate to="/workspace/settings/branding" replace />} />
                <Route path="platform-modules" element={<PlatformModulesSettings />}>
                   <Route path="people-organisations" element={<PeopleOrgSettings />} />
                   <Route path="entities" element={<Navigate to="people-organisations" replace />} />
                   <Route path="work-distribution" element={<IntakeSettingsPage />} />
                   <Route path="knowledge-base" element={<KnowledgeBaseSettings />} />
                   <Route path="pricing-catalog" element={<PricingCatalogSettings />} />
                   <Route path="inventory-manager" element={<InventoryManagerSettings />} />
                   <Route path="global-lists" element={<GlobalListsSettings />} />
                   <Route path="workforce-management" element={<WorkforcePage />} />
                   <Route path="workforce-management/member/:id" element={<MemberDetailView />} />
                   <Route path="workforce-management/teams/:id" element={<TeamDetailView />} />
                   <Route path="workforce-management/positions/:id" element={<PositionDetailView />} />
                   <Route path="integration-management" element={<ConnectorsPage />} />
                   <Route path="integration-management/:id" element={<ConnectorsPage />} />
                   <Route path="sites" element={<SitesPage />} />
                   <Route path="automation-management" element={<AutomationsPage />} />
                   <Route path="document-generation" element={<DocumentAutomation />} />
                   <Route path="report-management" element={<ReportManagementSettings />} />
                   <Route path="api-management" element={<APISettings />} />
                   <Route path="financial-management" element={<ComingSoon title="Financial Management" description="Financial settings, tax configurations, and payment processing rules." />} />
                   <Route path="records-management" element={<RecordsManagementSettings />} />
                </Route>
                 <Route path="templates" element={<Navigate to="/workspace/settings/platform-modules/document-generation" replace />} />
                 <Route path="automations" element={<Navigate to="/workspace/settings/platform-modules/automation-management" replace />} />
                 <Route path="reports" element={<Navigate to="/workspace/settings/platform-modules/report-management" replace />} />
                 <Route path="knowledge" element={<Navigate to="/workspace/settings/platform-modules/knowledge-base" replace />} />
                 <Route path="sites" element={<Navigate to="/workspace/settings/platform-modules/sites" replace />} />
                 <Route path="api" element={<Navigate to="/workspace/settings/platform-modules/api-management" replace />} />
                 
                 {/* New Settings Placeholder Routes */}
                 <Route path="data" element={<QueryExplorer />} />
                 <Route path="fees-products" element={<NavigateWithSearch to="/workspace/settings/platform-modules/pricing-catalog" replace />} />
                 <Route path="finance" element={<Navigate to="/workspace/settings/platform-modules/financial-management" replace />} />
                 <Route path="records-management" element={<Navigate to="/workspace/settings/platform-modules/records-management" replace />} />
                 <Route path="work-distribution" element={<NavigateWithSearch to="/workspace/settings/platform-modules/work-distribution" replace />} />
                 <Route path="intake" element={<NavigateWithSearch to="/workspace/settings/platform-modules/work-distribution" replace />} />
                 <Route path="migration" element={<ComingSoon title="Migration" description="Data import, export, and migration utilities for moving data between systems." />} />
                 <Route path="integrations" element={<Navigate to="/workspace/settings/platform-modules/integration-management" replace />} />
                 <Route path="integrations/:id" element={<NavigateWithParams to="/workspace/settings/platform-modules/integration-management/:id" replace />} />
                 {/* Legacy redirects */}
                 <Route path="connectors" element={<Navigate to="/workspace/settings/platform-modules/integration-management" replace />} />
                 <Route path="connectors/:id" element={<NavigateWithParams to="/workspace/settings/platform-modules/integration-management/:id" replace />} />
                 
                 {/* Workforce Management (Integrated under Settings) */}
                 <Route path="workforce" element={<Navigate to="/workspace/settings/platform-modules/workforce-management" replace />} />
                 <Route path="workforce/member/:id" element={<NavigateWithParams to="/workspace/settings/platform-modules/workforce-management/member/:id" replace />} />
                 <Route path="workforce/teams/:id" element={<NavigateWithParams to="/workspace/settings/platform-modules/workforce-management/teams/:id" replace />} />
                 <Route path="workforce/positions/:id" element={<NavigateWithParams to="/workspace/settings/platform-modules/workforce-management/positions/:id" replace />} />
              </Route>
              
              {/* External / Public */}
              <Route path="/portal" element={<ExternalPortal />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Redundant / Legacy Workforce Path support */}
               <Route path="/dashboard/settings/workforce/*" element={<Navigate to="/workspace/settings/platform-modules/workforce-management" replace />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/workspace" replace />} />
            </Routes>
            </Router>
          </ModalStackProvider>
        </PlatformProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
