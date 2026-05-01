import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';
import { ModalStackProvider } from './context/ModalStackContext';
import { StackedModalManager } from './components/UI/StackedModal';

// Components & Layout
import { PlatformShell } from './components/Layout/PlatformShell';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { Login } from './components/Auth/Login';
import { ComingSoon } from './components/Common/ComingSoon';
import { ModuleCatalog } from './components/ModuleCatalog';
import { AIBuilder } from './components/AIBuilder';
import { SuperAdmin } from './components/SuperAdmin';
import { Onboarding } from './components/Onboarding';
import { WorkQueue } from './components/WorkQueue';
import { ExternalPortal } from './components/ExternalPortal';
import { ModuleEditor } from './components/ModuleEditor';
import { LogicBuilder } from './components/LogicBuilder';
import { Analytics } from './components/Analytics';

import { DocumentAutomation } from './components/DocumentAutomation';
import { TenantOverview } from './components/TenantOverview';
import { AppsSettings } from './components/Settings/Organization/AppsSettings';
import { GlobalListsSettings } from './components/Settings/Organization/GlobalListsSettings';
import { PeopleOrgDirectory } from './pages/Platform/PeopleOrgDirectory';
import { PeopleOrgDetail } from './pages/Platform/PeopleOrgDetail';
import { PeopleOrgSettings } from './pages/Settings/PlatformModules/PeopleOrgSettings';
import { PlatformModulesSettings } from './pages/Settings/PlatformModules/PlatformModulesSettings';
import { HealthMonitor } from './components/HealthMonitor';
import { FleetManager } from './components/FleetManager';
import { ComputeMatrix } from './components/ComputeMatrix';
import { WorkforcePage } from './pages/Settings/WorkforcePage';
import { MemberDetailView } from './pages/Settings/MemberDetailView';
import { TeamDetailView } from './pages/Settings/TeamDetailView';
import { PositionDetailView } from './pages/Settings/PositionDetailView';
import { BillingPage } from './pages/Settings/BillingPage';
import { OrganizationPage } from './pages/Settings/OrganizationPage';
import { LicenseGate, LicenseRestrictedPlaceholder } from './components/Auth/LicenseGate';

// Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BuilderChoice } from './pages/Builder/BuilderChoice';
import { ModuleView } from './pages/Module/ModuleView';
import { RecordDetailView } from './pages/Record/RecordDetailView';
import { SitesPage } from './pages/Settings/SitesPage';
import { UsagePage } from './pages/Settings/UsagePage';
import { AppearanceSettings } from './pages/Settings/AppearanceSettings';
import { SettingsOverview } from './pages/Settings/SettingsOverview';
import { ConnectorsPage } from './pages/Settings/ConnectorsPage';

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

const App = () => {
  return (
    <ThemeProvider>
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
                <Route index element={<DashboardPage />} />
                
                {/* Legacy Redirects */}
                <Route path="builder" element={<Navigate to="/workspace/settings/builder" replace />} />
                <Route path="ai-builder" element={<Navigate to="/workspace/settings/ai-builder" replace />} />
                <Route path="builder/:id" element={<Navigate to="/workspace/settings/builder/:id" replace />} />
                <Route path="catalog" element={<Navigate to="/workspace/settings/modules" replace />} />
                <Route path="documents" element={<Navigate to="/workspace/settings/templates" replace />} />
                <Route path="workflows" element={<Navigate to="/workspace/settings/automations" replace />} />
                <Route path="automations" element={<Navigate to="/workspace/settings/automations" replace />} />
                <Route path="logic" element={<Navigate to="/workspace/settings/logic" replace />} />
                <Route path="deployments" element={<Navigate to="/workspace/settings/deploy" replace />} />
                <Route path="reports" element={<Navigate to="/workspace/settings/reports" replace />} />
                <Route path="platform/entities" element={<Navigate to="/workspace/platform/people-organisations" replace />} />
                
                {/* Dynamic Module Routes */}
                <Route path="modules/:moduleId" element={<ModuleView />} />
                <Route path="modules/:moduleId/records/:recordId" element={<RecordDetailView />} />
                
                {/* Platform Operations */}
                <Route path="queue" element={<WorkQueue />} />
                <Route path="platform/people-organisations" element={<PeopleOrgDirectory />} />
                <Route path="platform/people-organisations/:id" element={<PeopleOrgDetail />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="reminders" element={<ComingSoon title="Reminders" description="Set task alerts, keep track of deadlines, and manage your personal notifications." />} />
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
                <Route path="billing" element={<BillingPage />} />
                <Route path="usage" element={<UsagePage />} />
                <Route path="security" element={<ComingSoon title="Security Settings" description="Configure authentication policies, SSO, and audit logging." />} />
                <Route path="audit" element={<ComingSoon title="Audit Log" description="Review system activity, security events, and configuration changes across the platform." />} />
                
                {/* Module Builder */}
                <Route path="builder" element={<BuilderChoice />} />
                <Route path="ai-builder" element={<AIBuilder />} />
                <Route path="builder/:id" element={<ModuleEditor />} />
                
                <Route path="modules" element={<ModuleCatalog />} />
                <Route path="apps" element={<AppsSettings />} />
                <Route path="messaging" element={<ComingSoon title="Messaging" description="View messaging logs including emails, SMS, Push notifications, and Portal notifications." />} />
                <Route path="database" element={<ComingSoon title="Database Management" description="Direct database access, schema management, and raw data exploration tools." />} />
                <Route path="lists" element={<GlobalListsSettings />} />
                <Route path="appearance" element={<AppearanceSettings />} />
                <Route path="platform-modules" element={<PlatformModulesSettings />}>
                   <Route path="people-organisations" element={<PeopleOrgSettings />} />
                   <Route path="entities" element={<Navigate to="people-organisations" replace />} />
                </Route>
                <Route path="templates" element={<DocumentAutomation />} />
                <Route path="automations" element={<ComingSoon title="Automations Studio" description="Advanced trigger-based automation builder with visual flow designer." />} />
                <Route path="reports" element={<ComingSoon title="Report Builder" description="Create custom data visualizations, scheduled reports, and export dashboards." />} />
                <Route path="knowledge" element={<ComingSoon title="Knowledge Base" description="Central repository for institutional knowledge, documentation, and training materials." />} />
                <Route path="sites" element={<SitesPage />} />
                <Route path="logic" element={<LogicBuilder />} />
                <Route path="testing" element={<ComingSoon title="Test Center" description="Automated testing suite, quality assurance dashboard, and regression monitoring." />} />
                <Route path="deploy" element={<ComingSoon title="Deployment Center" description="Manage environment promotions, version history, and CI/CD pipelines." />} />
                <Route path="api" element={<ComingSoon title="API Management" description="Configure API keys, webhooks, and external integration points." />} />
                
                {/* New Settings Placeholder Routes */}
                <Route path="records" element={<ComingSoon title="Records" description="Manage system records, data entries, and historical logs across all modules." />} />
                <Route path="fees-products" element={<ComingSoon title="Fees & Products" description="Configure service fees, product catalogs, and pricing structures." />} />
                <Route path="finance" element={<ComingSoon title="Finance" description="Financial settings, tax configurations, and payment processing rules." />} />
                <Route path="intake" element={<ComingSoon title="Intake" description="Design and manage intake forms, onboarding flows, and data capture processes." />} />
                <Route path="reset" element={<ComingSoon title="Factory Reset" description="Revert system settings to default, clear temporary data, and reset configuration states." />} />
                <Route path="migration" element={<ComingSoon title="Migration Tools" description="Data import, export, and migration utilities for moving data between systems." />} />
                <Route path="connectors" element={<ConnectorsPage />} />
                <Route path="connectors/:id" element={<ConnectorsPage />} />
                
                {/* Workforce Management (Integrated under Settings) */}
                <Route path="workforce" element={<WorkforcePage />} />
                <Route path="workforce/member/:id" element={<MemberDetailView />} />
                <Route path="workforce/teams/:id" element={<TeamDetailView />} />
                <Route path="workforce/roles/:id" element={<PositionDetailView />} />
              </Route>
              
              {/* External / Public */}
              <Route path="/portal" element={<ExternalPortal />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Redundant / Legacy Workforce Path support */}
              <Route path="/dashboard/settings/workforce/*" element={<Navigate to="/workspace/settings/workforce" replace />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/workspace" replace />} />
            </Routes>
            </Router>
          </ModalStackProvider>
        </PlatformProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
