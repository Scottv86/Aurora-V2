import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';

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

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlatformProvider>
          <Router>
            <Toaster position="top-right" expand={false} richColors />
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
              <Route path="/workspace" element={<ProtectedRoute><PlatformShell><DashboardPage /></PlatformShell></ProtectedRoute>} />
              {/* Legacy Redirects to new Settings location */}
              <Route path="/workspace/builder" element={<Navigate to="/workspace/settings/builder" replace />} />
              <Route path="/workspace/ai-builder" element={<Navigate to="/workspace/settings/ai-builder" replace />} />
              <Route path="/workspace/builder/:id" element={<Navigate to="/workspace/settings/builder/:id" replace />} />
              <Route path="/workspace/catalog" element={<Navigate to="/workspace/settings/modules" replace />} />
              <Route path="/workspace/documents" element={<Navigate to="/workspace/settings/templates" replace />} />
              <Route path="/workspace/workflows" element={<Navigate to="/workspace/settings/automations" replace />} />
              <Route path="/workspace/automations" element={<Navigate to="/workspace/settings/automations" replace />} />
              <Route path="/workspace/logic" element={<Navigate to="/workspace/settings/logic" replace />} />
              <Route path="/workspace/deployments" element={<Navigate to="/workspace/settings/deploy" replace />} />
              <Route path="/workspace/reports" element={<Navigate to="/workspace/settings/reports" replace />} />
              
              {/* Dynamic Module Routes */}
              <Route path="/workspace/modules/:id" element={<ProtectedRoute><PlatformShell><ModuleView /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/modules/:moduleId/records/:recordId" element={<ProtectedRoute><PlatformShell><RecordDetailView /></PlatformShell></ProtectedRoute>} />
              
              {/* Platform Operations */}
              <Route path="/workspace/queue" element={<ProtectedRoute><PlatformShell><WorkQueue /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/platform/entities" element={<Navigate to="/workspace/platform/people-organisations" replace />} />
              <Route path="/workspace/platform/people-organisations" element={<ProtectedRoute><PlatformShell><PeopleOrgDirectory /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/platform/people-organisations/:id" element={<ProtectedRoute><PlatformShell><PeopleOrgDetail /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/analytics" element={<ProtectedRoute><PlatformShell><Analytics /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/reminders" element={<ProtectedRoute><PlatformShell><ComingSoon title="Reminders" description="Set task alerts, keep track of deadlines, and manage your personal notifications." /></PlatformShell></ProtectedRoute>} />
              
              {/* Settings & Workforce (Developer Only) */}
              <Route 
                path="/workspace/settings" 
                element={
                  <ProtectedRoute>
                    <PlatformShell>
                      <LicenseGate fallback={<LicenseRestrictedPlaceholder />}>
                        <Outlet />
                      </LicenseGate>
                    </PlatformShell>
                  </ProtectedRoute>
                }
              >
                <Route index element={<OrganizationPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="usage" element={<UsagePage />} />
                <Route path="security" element={<ComingSoon title="Security Settings" description="Configure authentication policies, SSO, and audit logging." />} />
                <Route path="audit" element={<ComingSoon title="Audit Log" description="Review system activity, security events, and configuration changes across the platform." />} />
                
                {/* Module Builder */}
                <Route path="builder" element={<BuilderChoice />} />
                <Route path="ai-builder" element={<AIBuilder />} />
                <Route path="builder/:id" element={<ModuleEditor />} />
                
                <Route path="modules" element={<ModuleCatalog />} />
                <Route path="apps" element={<ComingSoon title="App Catalog" description="Discover, install, and manage third-party applications." />} />
                <Route path="email" element={<ComingSoon title="Email Exchange" description="Configure mail server settings, domain verification, and email communication protocols." />} />
                <Route path="database" element={<ComingSoon title="Database Management" description="Direct database access, schema management, and raw data exploration tools." />} />
                <Route path="lists" element={<ComingSoon title="Global Lists" description="Manage system-wide options, category lists, and lookup tables used across all modules." />} />
                <Route path="appearance" element={<AppearanceSettings />} />
                <Route path="platform-modules" element={<PlatformModulesSettings />}>
                   <Route index element={<Navigate to="people-organisations" replace />} />
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
                <Route path="data-sources" element={<ComingSoon title="Data Sources" description="Connect and manage external data providers, storage systems, and third-party integrations." />} />
                
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
        </PlatformProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
