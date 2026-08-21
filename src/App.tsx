import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';
import { DigitalTwinProvider } from './context/DigitalTwinContext';
import { AIContextProvider } from './context/AIContextProvider';
import { ModalStackProvider } from './context/ModalStackContext';
import { NewModuleModalProvider } from './context/NewModuleModalContext';
import { NewModuleModal } from './components/Modals/NewModuleModal';
import { StackedModalManager } from './components/UI/StackedModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePlatform } from './hooks/usePlatform';
import { useAuth } from './hooks/useAuth';
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
import { LicenseGate, LicenseRestrictedPlaceholder } from './components/Auth/LicenseGate';

// Lazy-loaded Pages & Heavy Builders
const AIBuilder = lazy(() => import('./components/AIBuilder').then(m => ({ default: m.AIBuilder })));
const Onboarding = lazy(() => import('./components/Onboarding').then(m => ({ default: m.Onboarding })));
const WorkQueue = lazy(() => import('./components/WorkQueue').then(m => ({ default: m.WorkQueue })));
const ExternalPortal = lazy(() => import('./components/ExternalPortal').then(m => ({ default: m.ExternalPortal })));
const ModuleEditor = lazy(() => import('./components/ModuleEditor').then(m => ({ default: m.ModuleEditor })));
const Analytics = lazy(() => import('./components/Analytics').then(m => ({ default: m.Analytics })));
const AntigravityChat = lazy(() => import('./components/AntigravityChat').then(m => ({ default: m.AntigravityChat })));

const DocumentAutomation = lazy(() => import('./components/DocumentAutomation').then(m => ({ default: m.DocumentAutomation })));
const TenantOverview = lazy(() => import('./components/TenantOverview').then(m => ({ default: m.TenantOverview })));
const GlobalListsSettings = lazy(() => import('./pages/Settings/PlatformModules/GlobalListsSettings').then(m => ({ default: m.GlobalListsSettings })));
const PeopleOrgDirectory = lazy(() => import('./pages/Platform/PeopleOrgDirectory').then(m => ({ default: m.PeopleOrgDirectory })));
const PeopleOrgDetail = lazy(() => import('./pages/Platform/PeopleOrgDetail').then(m => ({ default: m.PeopleOrgDetail })));
const PeopleOrgSettings = lazy(() => import('./pages/Settings/PlatformModules/PeopleOrgSettings').then(m => ({ default: m.PeopleOrgSettings })));
const PlatformModulesSettings = lazy(() => import('./pages/Settings/PlatformModules/PlatformModulesSettings').then(m => ({ default: m.PlatformModulesSettings })));
const KnowledgeBaseSettings = lazy(() => import('./pages/Settings/PlatformModules/KnowledgeBaseSettings').then(m => ({ default: m.KnowledgeBaseSettings })));
const PricingCatalogSettings = lazy(() => import('./pages/Settings/PlatformModules/PricingCatalogSettings').then(m => ({ default: m.PricingCatalogSettings })));
const InventoryManagerSettings = lazy(() => import('./pages/Settings/PlatformModules/InventoryManagerSettings').then(m => ({ default: m.InventoryManagerSettings })));
const HealthMonitor = lazy(() => import('./components/HealthMonitor').then(m => ({ default: m.HealthMonitor })));
const FleetManager = lazy(() => import('./components/FleetManager').then(m => ({ default: m.FleetManager })));
const ComputeMatrix = lazy(() => import('./components/ComputeMatrix').then(m => ({ default: m.ComputeMatrix })));
const WorkforcePage = lazy(() => import('./pages/Settings/WorkforcePage').then(m => ({ default: m.WorkforcePage })));
const MemberDetailView = lazy(() => import('./pages/Settings/MemberDetailView').then(m => ({ default: m.MemberDetailView })));
const TeamDetailView = lazy(() => import('./pages/Settings/TeamDetailView').then(m => ({ default: m.TeamDetailView })));
const PositionDetailView = lazy(() => import('./pages/Settings/PositionDetailView').then(m => ({ default: m.PositionDetailView })));
const SubscriptionPage = lazy(() => import('./pages/Settings/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const FormsLibraryPage = lazy(() => import('./pages/Settings/FormsLibraryPage').then(m => ({ default: m.FormsLibraryPage })));
const WorkflowsLibraryPage = lazy(() => import('./pages/Settings/WorkflowsLibraryPage').then(m => ({ default: m.WorkflowsLibraryPage })));
const ValidationsLibraryPage = lazy(() => import('./pages/Settings/ValidationsLibraryPage').then(m => ({ default: m.ValidationsLibraryPage })));
const QueuesLibraryPage = lazy(() => import('./pages/Settings/QueuesLibraryPage').then(m => ({ default: m.QueuesLibraryPage })));
const QueriesLibraryPage = lazy(() => import('./pages/Settings/QueriesLibraryPage').then(m => ({ default: m.QueriesLibraryPage })));
const AgentsLibraryPage = lazy(() => import('./pages/Settings/AgentsLibraryPage').then(m => ({ default: m.AgentsLibraryPage })));
const AgentBuilderStudio = lazy(() => import('./components/Builders/AgentBuilder/AgentBuilderStudio').then(m => ({ default: m.AgentBuilderStudio })));

const OrganizationPage = lazy(() => import('./pages/Settings/OrganizationPage').then(m => ({ default: m.OrganizationPage })));
const AISettingsPage = lazy(() => import('./pages/Settings/AISettingsPage').then(m => ({ default: m.AISettingsPage })));

// Super Admin Suite Pages
const SuperAdminOverview = lazy(() => import('./pages/SuperAdmin/SuperAdminOverview').then(m => ({ default: m.SuperAdminOverview })));
const TenantManagementPage = lazy(() => import('./pages/SuperAdmin/TenantManagementPage').then(m => ({ default: m.TenantManagementPage })));
const UserManagementPage = lazy(() => import('./pages/SuperAdmin/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const RolesAccessPage = lazy(() => import('./pages/SuperAdmin/RolesAccessPage').then(m => ({ default: m.RolesAccessPage })));
const BillingSubscriptionsPage = lazy(() => import('./pages/SuperAdmin/BillingSubscriptionsPage').then(m => ({ default: m.BillingSubscriptionsPage })));
const RevenueAnalyticsPage = lazy(() => import('./pages/SuperAdmin/RevenueAnalyticsPage').then(m => ({ default: m.RevenueAnalyticsPage })));
const ProvisioningResourcesPage = lazy(() => import('./pages/SuperAdmin/ProvisioningResourcesPage').then(m => ({ default: m.ProvisioningResourcesPage })));
const ServerLoadsPage = lazy(() => import('./pages/SuperAdmin/ServerLoadsPage').then(m => ({ default: m.ServerLoadsPage })));
const StorageManagementPage = lazy(() => import('./pages/SuperAdmin/StorageManagementPage').then(m => ({ default: m.StorageManagementPage })));
const AIMonitoringPage = lazy(() => import('./pages/SuperAdmin/AIMonitoringPage').then(m => ({ default: m.AIMonitoringPage })));
const SystemMonitoringPage = lazy(() => import('./pages/SuperAdmin/SystemMonitoringPage').then(m => ({ default: m.SystemMonitoringPage })));
const SystemLogsAuditPage = lazy(() => import('./pages/SuperAdmin/SystemLogsAuditPage').then(m => ({ default: m.SystemLogsAuditPage })));
const BugsSupportPage = lazy(() => import('./pages/SuperAdmin/BugsSupportPage').then(m => ({ default: m.BugsSupportPage })));
const DevelopmentPage = lazy(() => import('./pages/SuperAdmin/DevelopmentPage').then(m => ({ default: m.DevelopmentPage })));
const SuperAdminSettingsPage = lazy(() => import('./pages/SuperAdmin/SuperAdminSettingsPage').then(m => ({ default: m.SuperAdminSettingsPage })));

// Pages
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ModuleView = lazy(() => import('./pages/Module/ModuleView').then(m => ({ default: m.ModuleView })));
const QueueView = lazy(() => import('./pages/Queue/QueueView').then(m => ({ default: m.QueueView })));
const RecordDetailView = lazy(() => import('./pages/Record/RecordDetailView').then(m => ({ default: m.RecordDetailView })));
const WorkspacePageView = lazy(() => import('./pages/WorkspacePage/WorkspacePageView').then(m => ({ default: m.WorkspacePageView })));
const PageBuilder = lazy(() => import('./pages/WorkspacePage/PageBuilder').then(m => ({ default: m.PageBuilder })));
const PagesManagementPage = lazy(() => import('./pages/Settings/PagesManagementPage').then(m => ({ default: m.PagesManagementPage })));
const SitesPage = lazy(() => import('./pages/Settings/SitesPage').then(m => ({ default: m.SitesPage })));
const SiteBuilderPage = lazy(() => import('./pages/Settings/SiteBuilderPage').then(m => ({ default: m.SiteBuilderPage })));
const PortalViewPage = lazy(() => import('./pages/Platform/PortalViewPage').then(m => ({ default: m.PortalViewPage })));

const BrandingSettingsPage = lazy(() => import('./pages/Settings/BrandingSettingsPage').then(m => ({ default: m.BrandingSettingsPage })));
const NavigationSettingsPage = lazy(() => import('./pages/Settings/NavigationSettingsPage').then(m => ({ default: m.NavigationSettingsPage })));
const NavigationManagementPage = lazy(() => import('./pages/Settings/NavigationManagementPage').then(m => ({ default: m.NavigationManagementPage })));
const SettingsOverview = lazy(() => import('./pages/Settings/SettingsOverview').then(m => ({ default: m.SettingsOverview })));
const ConnectorsPage = lazy(() => import('./pages/Settings/ConnectorsPage').then(m => ({ default: m.ConnectorsPage })));
const MigrationPage = lazy(() => import('./pages/Settings/MigrationPage').then(m => ({ default: m.MigrationPage })));
const AutomationsPage = lazy(() => import('./pages/Settings/AutomationsPage').then(m => ({ default: m.AutomationsPage })));
const IntakeSettingsPage = lazy(() => import('./pages/Settings/IntakeSettingsPage').then(m => ({ default: m.IntakeSettingsPage })));
const TriageInboxPage = lazy(() => import('./pages/Triage/TriageInboxPage').then(m => ({ default: m.TriageInboxPage })));
const APISettings = lazy(() => import('./pages/Settings/APISettings').then(m => ({ default: m.APISettings })));
const TestingPage = lazy(() => import('./pages/Settings/TestingPage').then(m => ({ default: m.TestingPage })));
const QueryExplorer = lazy(() => import('./pages/Settings/QueryExplorer').then(m => ({ default: m.QueryExplorer })));
const RecordsManagement = lazy(() => import('./pages/Platform/RecordsManagement').then(m => ({ default: m.RecordsManagement })));
const RecordsManagementSettings = lazy(() => import('./pages/Settings/PlatformModules/RecordsManagementSettings').then(m => ({ default: m.RecordsManagementSettings })));
const ReportManagementSettings = lazy(() => import('./pages/Settings/PlatformModules/ReportManagementSettings').then(m => ({ default: m.ReportManagementSettings })));
const SolutionsPage = lazy(() => import('./pages/Settings/SolutionsPage').then(m => ({ default: m.SolutionsPage })));
const DriveApp = lazy(() => import('./pages/Apps/DriveApp').then(m => ({ default: m.DriveApp })));

const DocsApp = lazy(() => import('./pages/Apps/DocsApp').then(m => ({ default: m.DocsApp })));
const DocEditor = lazy(() => import('./pages/Apps/DocEditor').then(m => ({ default: m.DocEditor })));
import { slugify } from './lib/utils';




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
  const { isSuperAdmin } = useAuth();
  const { modules, isLoading, tenant } = usePlatform();

  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isLoading) return <PageLoader label="Loading Workspace..." />;
  
  // 1. Check if a default home page is explicitly configured in tenant workspaceSettings
  const homePageId = tenant?.workspaceSettings?.homePageId;
  if (homePageId) {
    const homePage = modules.find((m: any) => m.id === homePageId && m.type === 'PAGE');
    if (homePage) {
      return <Navigate to={`/workspace/pages/${slugify(homePage.name)}`} replace />;
    }
  }

  // 2. Fall back to existing dashboard lookup logic
  const dashboardPage = modules.find((m: any) => m.type === 'PAGE' && (m.name.toLowerCase() === 'dashboard' || m.config?.widgets?.some((w: any) => w.type === 'stats-grid')));
  if (dashboardPage) {
    return <Navigate to={`/workspace/pages/${slugify(dashboardPage.name)}`} replace />;
  }

  // 3. Fall back to the first available PAGE module if dashboard doesn't exist but other pages do
  const firstPage = modules.find((m: any) => m.type === 'PAGE');
  if (firstPage) {
    return <Navigate to={`/workspace/pages/${slugify(firstPage.name)}`} replace />;
  }

  return <DashboardPage />;
};

const MyWorkRouteWrapper = () => {
  const { modules, isLoading } = usePlatform();
  if (isLoading) return <PageLoader label="Loading Queue..." />;
  const myWorkPage = modules.find((m: any) => m.type === 'PAGE' && (m.name.toLowerCase() === 'my work' || m.config?.widgets?.some((w: any) => w.type === 'work-queue')));
  if (myWorkPage) {
    return <Navigate to={`/workspace/pages/${slugify(myWorkPage.name)}`} replace />;
  }
  return <WorkQueue />;
};

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AIContextProvider>
            <PlatformProvider>
              <DigitalTwinProvider>
                <ModalStackProvider>
                  <NewModuleModalProvider>
                    <Router>
                      <Toaster position="bottom-left" expand={false} closeButton duration={4000} />
                      <StackedModalManager />
                      <NewModuleModal />
                      <Suspense fallback={<PageLoader label="Loading view..." />}>
                        <Routes>
                          {/* Login & Root Redirect */}
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/workspace" replace />} />
              <Route path="/public/portal/:siteId" element={<PortalViewPage />} />

                {/* Aurora Chat (Unified all-in-one sidebar/screen) */}
                <Route path="/workspace/aurora-vibe" element={<ProtectedRoute><AntigravityChat /></ProtectedRoute>} />
                <Route path="/workspace/aurora-vibe/:sessionId" element={<ProtectedRoute><AntigravityChat /></ProtectedRoute>} />

               {/* Platform Operations & Administration (SuperAdmin Suite) */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><PlatformShell><SuperAdminOverview /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/tenants" element={<ProtectedRoute requireAdmin><PlatformShell><TenantManagementPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/tenants/:id" element={<ProtectedRoute requireAdmin><PlatformShell><TenantOverview /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requireAdmin><PlatformShell><UserManagementPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/roles-access" element={<ProtectedRoute requireAdmin><PlatformShell><RolesAccessPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/subscriptions" element={<ProtectedRoute requireAdmin><PlatformShell><BillingSubscriptionsPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/revenue" element={<ProtectedRoute requireAdmin><PlatformShell><RevenueAnalyticsPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/provisioning" element={<ProtectedRoute requireAdmin><PlatformShell><ProvisioningResourcesPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/server-loads" element={<ProtectedRoute requireAdmin><PlatformShell><ServerLoadsPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/storage" element={<ProtectedRoute requireAdmin><PlatformShell><StorageManagementPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/health" element={<ProtectedRoute requireAdmin><PlatformShell><HealthMonitor /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/ai-monitoring" element={<ProtectedRoute requireAdmin><PlatformShell><AIMonitoringPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/system-monitoring" element={<ProtectedRoute requireAdmin><PlatformShell><SystemMonitoringPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><PlatformShell><SystemLogsAuditPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/bugs" element={<ProtectedRoute requireAdmin><PlatformShell><BugsSupportPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/development" element={<ProtectedRoute requireAdmin><PlatformShell><DevelopmentPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><PlatformShell><SuperAdminSettingsPage /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/fleet" element={<ProtectedRoute requireAdmin><PlatformShell><FleetManager /></PlatformShell></ProtectedRoute>} />
              <Route path="/admin/compute" element={<ProtectedRoute requireAdmin><PlatformShell><ComputeMatrix /></PlatformShell></ProtectedRoute>} />

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
                <Route path="pages" element={<NavigateWithSearch to="/workspace/settings/pages" replace />} />
                <Route path="queues" element={<NavigateWithSearch to="/workspace/settings/queues" replace />} />
                <Route path="testing" element={<Navigate to="/workspace/settings/testing" replace />} />
                
                {/* Dynamic Module Routes */}
                <Route path="modules/:moduleId" element={<ModuleView />} />
                <Route path="modules/:moduleId/records/:recordId" element={<RecordDetailView />} />
                <Route path="modules/:parentModuleId/records/:parentRecordId/sub/:moduleId/:recordId" element={<RecordDetailView />} />
                <Route path="queues/:queueId" element={<QueueView />} />
                <Route path="queues/:queueId/records/:recordId" element={<RecordDetailView />} />
                <Route path="queues/:queueId/modules/:moduleId/records/:recordId" element={<RecordDetailView />} />
                <Route path="pages/:pageId/records/:recordId" element={<RecordDetailView />} />
                <Route path="pages/:pageId/modules/:moduleId/records/:recordId" element={<RecordDetailView />} />
                
                {/* Platform Operations */}
                <Route path="my-work" element={<MyWorkRouteWrapper />} />
                <Route path="queue" element={<Navigate to="/workspace/my-work" replace />} />
                <Route path="platform/people-organisations" element={<PeopleOrgDirectory />} />
                <Route path="platform/people-organisations/:id" element={<PeopleOrgDetail />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="platform/work-distribution" element={<TriageInboxPage />} />
                <Route path="platform/intake" element={<Navigate to="/workspace/platform/work-distribution" replace />} />
                <Route path="platform/knowledge-base" element={<KnowledgeBaseSettings />} />
                <Route path="platform/pricing-catalog" element={<PricingCatalogSettings />} />
                <Route path="platform/inventory-manager" element={<InventoryManagerSettings />} />
                <Route path="platform/global-lists" element={<GlobalListsSettings />} />
                <Route path="platform/workforce" element={<WorkforcePage />} />
                <Route path="platform/workforce/member/:id" element={<MemberDetailView />} />
                <Route path="platform/workforce/teams/:id" element={<TeamDetailView />} />
                <Route path="platform/integrations" element={<ConnectorsPage />} />
                <Route path="platform/sites" element={<SitesPage />} />
                <Route path="platform/sites/:siteId/portal" element={<NavigateWithParams to="/public/portal/:siteId" replace />} />


                <Route path="platform/automations" element={<AutomationsPage />} />
                <Route path="platform/templates" element={<DocumentAutomation />} />
                <Route path="platform/reports" element={<ReportManagementSettings />} />
                <Route path="platform/api" element={<APISettings />} />
                <Route path="platform/finance" element={<ComingSoon title="Financial Management" description="Financial settings, tax configurations, and payment processing rules." />} />
                <Route path="platform/records-management" element={<RecordsManagement />} />
                
                {/* Aurora Utility Apps */}
                <Route path="apps/drive" element={<DriveApp />} />
                <Route path="apps/docs" element={<DocsApp />} />
                <Route path="apps/docs/:documentId" element={<DocEditor />} />
                <Route path="apps/query" element={<QueryExplorer />} />
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
                <Route path="ai-services" element={<AISettingsPage />} />
                <Route path="billing" element={<Navigate to="/workspace/settings/subscription" replace />} />
                <Route path="usage" element={<Navigate to="/workspace/settings/subscription" replace />} />
                
                {/* Module Builder */}
                <Route path="builder" element={<Navigate to="/workspace/settings/platform-modules?newModule=true" replace />} />
                 <Route path="ai-builder" element={<AIBuilder />} />
                 <Route path="builder/:id" element={<ModuleEditor />} />
                 <Route path="builder/page/:id" element={<PageBuilder />} />
                 <Route path="builder/site/:siteId" element={<SiteBuilderPage />} />
                 <Route path="builder/agent" element={<AgentBuilderStudio />} />
                 <Route path="builder/agent/:id" element={<AgentBuilderStudio />} />
                 <Route path="agent-builder" element={<AgentBuilderStudio />} />


                <Route path="pages" element={<PagesManagementPage />} />
                <Route path="modules" element={<Navigate to="/workspace/settings/platform-modules" replace />} />
                <Route path="apps" element={<Navigate to="/workspace/settings" replace />} />

                <Route path="lists" element={<Navigate to="/workspace/settings/platform-modules/global-lists" replace />} />
                <Route path="branding" element={<BrandingSettingsPage />} />
                <Route path="navigation" element={<NavigationManagementPage />} />
                <Route path="navigation/builder" element={<NavigationSettingsPage />} />
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
                   <Route path="solutions" element={<SolutionsPage />} />
                   <Route path="integration-management" element={<ConnectorsPage />} />
                   <Route path="integration-management/:id" element={<ConnectorsPage />} />
                   <Route path="sites" element={<SitesPage />} />
                   <Route path="automation-management" element={<AutomationsPage />} />
                   <Route path="forms-library" element={<FormsLibraryPage />} />
                   <Route path="workflows-library" element={<WorkflowsLibraryPage />} />
                   <Route path="validations-library" element={<ValidationsLibraryPage />} />
                   <Route path="document-generation" element={<DocumentAutomation />} />

                   <Route path="report-management" element={<ReportManagementSettings />} />
                   <Route path="api-management" element={<APISettings />} />
                   <Route path="financial-management" element={<ComingSoon title="Financial Management" description="Financial settings, tax configurations, and payment processing rules." />} />
                   <Route path="queues-management" element={<QueuesLibraryPage />} />
                   <Route path="queries-library" element={<QueriesLibraryPage />} />
                   <Route path="records-management" element={<RecordsManagementSettings />} />
                   <Route path="agents" element={<AgentsLibraryPage />} />
                   <Route path="agents-library" element={<AgentsLibraryPage />} />
                   <Route path="testing" element={<TestingPage />} />
                </Route>
                 <Route path="solutions" element={<Navigate to="/workspace/settings/platform-modules/solutions" replace />} />
                 <Route path="solution" element={<Navigate to="/workspace/settings/platform-modules/solutions" replace />} />
                 <Route path="queries" element={<Navigate to="/workspace/settings/platform-modules/queries-library" replace />} />
                 <Route path="templates" element={<Navigate to="/workspace/settings/platform-modules/document-generation" replace />} />
                 <Route path="automations" element={<Navigate to="/workspace/settings/platform-modules/automation-management" replace />} />
                 <Route path="reports" element={<Navigate to="/workspace/settings/platform-modules/report-management" replace />} />
                 <Route path="knowledge" element={<Navigate to="/workspace/settings/platform-modules/knowledge-base" replace />} />
                 <Route path="sites" element={<Navigate to="/workspace/settings/platform-modules/sites" replace />} />
                 <Route path="api" element={<Navigate to="/workspace/settings/platform-modules/api-management" replace />} />
                 <Route path="agents" element={<Navigate to="/workspace/settings/platform-modules/agents-library" replace />} />
                 <Route path="agents-library" element={<Navigate to="/workspace/settings/platform-modules/agents-library" replace />} />
                 
                 {/* New Settings Placeholder Routes */}
                 <Route path="testing" element={<TestingPage />} />
                 <Route path="data" element={<Navigate to="/workspace/apps/query" replace />} />
                 <Route path="fees-products" element={<NavigateWithSearch to="/workspace/settings/platform-modules/pricing-catalog" replace />} />
                 <Route path="finance" element={<Navigate to="/workspace/settings/platform-modules/financial-management" replace />} />
                 <Route path="records-management" element={<Navigate to="/workspace/settings/platform-modules/records-management" replace />} />
                 <Route path="work-distribution" element={<NavigateWithSearch to="/workspace/settings/platform-modules/work-distribution" replace />} />
                 <Route path="intake" element={<NavigateWithSearch to="/workspace/settings/platform-modules/work-distribution" replace />} />
                 <Route path="migration" element={<MigrationPage />} />
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
              </Suspense>
              </Router>
              </NewModuleModalProvider>
            </ModalStackProvider>
          </DigitalTwinProvider>
            </PlatformProvider>
          </AIContextProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
