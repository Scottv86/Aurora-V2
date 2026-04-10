import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { People } from './components/People';
import { DocumentAutomation } from './components/DocumentAutomation';
import { TenantOverview } from './components/TenantOverview';
import { HealthMonitor } from './components/HealthMonitor';
import { FleetManager } from './components/FleetManager';
import { ComputeMatrix } from './components/ComputeMatrix';

// Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BuilderChoice } from './pages/Builder/BuilderChoice';
import { ModuleView } from './pages/Module/ModuleView';
import { RecordDetailView } from './pages/Record/RecordDetailView';

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
              <Route path="/workspace/people" element={<ProtectedRoute><PlatformShell><People /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/analytics" element={<ProtectedRoute><PlatformShell><Analytics /></PlatformShell></ProtectedRoute>} />
              
              {/* Settings & Studio (Consolidated) */}
              <Route path="/workspace/settings" element={<ProtectedRoute><PlatformShell><ComingSoon title="Organization Settings" description="Configure tenant branding, site metadata, and global workspace defaults." /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/team" element={<ProtectedRoute><PlatformShell><ComingSoon title="Team Management" description="Invite users, manage roles, and configure access control policies." /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/billing" element={<ProtectedRoute><PlatformShell><ComingSoon title="Billing & Plans" description="Manage subscriptions, payment methods, and billing history." /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/security" element={<ProtectedRoute><PlatformShell><ComingSoon title="Security Settings" description="Configure authentication policies, SSO, and audit logging." /></PlatformShell></ProtectedRoute>} />
              
              {/* Module Builder (within Settings) */}
              <Route path="/workspace/settings/builder" element={<ProtectedRoute><PlatformShell><BuilderChoice /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/ai-builder" element={<ProtectedRoute><PlatformShell fullBleed><AIBuilder /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/builder/:id" element={<ProtectedRoute><PlatformShell fullBleed><ModuleEditor /></PlatformShell></ProtectedRoute>} />
              
              <Route path="/workspace/settings/modules" element={<ProtectedRoute><PlatformShell><ModuleCatalog /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/apps" element={<ProtectedRoute><PlatformShell><ComingSoon title="App Catalog" description="Discover, install, and manage third-party applications." /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/templates" element={<ProtectedRoute><PlatformShell><DocumentAutomation /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/automations" element={<ProtectedRoute><PlatformShell><ComingSoon title="Automations Studio" description="Advanced trigger-based automation builder with visual flow designer." /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/reports" element={<ProtectedRoute><PlatformShell><ComingSoon title="Report Builder" description="Create custom data visualizations, scheduled reports, and export dashboards." /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/logic" element={<ProtectedRoute><PlatformShell><LogicBuilder /></PlatformShell></ProtectedRoute>} />
              <Route path="/workspace/settings/deploy" element={<ProtectedRoute><PlatformShell><ComingSoon title="Deployment Center" description="Manage environment promotions, version history, and CI/CD pipelines." /></PlatformShell></ProtectedRoute>} />
              
              {/* External / Public */}
              <Route path="/portal" element={<ExternalPortal />} />
              <Route path="/onboarding" element={<Onboarding />} />

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
