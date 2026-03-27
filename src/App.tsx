import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Contexts
import { ThemeProvider } from './context/ThemeContext';
import { FirebaseProvider } from './context/FirebaseContext';
import { PlatformProvider } from './context/PlatformContext';

// Components & Layout
import { PlatformShell } from './components/Layout/PlatformShell';
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

// Pages
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { BuilderChoice } from './pages/Builder/BuilderChoice';
import { ModuleView } from './pages/Module/ModuleView';
import { RecordDetailView } from './pages/Record/RecordDetailView';

const App = () => {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <PlatformProvider>
          <Router>
            <Toaster position="top-right" expand={false} richColors />
            <Routes>
              {/* Root Redirect */}
              <Route path="/" element={<Navigate to="/workspace" replace />} />

              {/* Workspace Routes (Authenticated) */}
              <Route path="/workspace" element={<PlatformShell><DashboardPage /></PlatformShell>} />
              <Route path="/workspace/catalog" element={<PlatformShell><ModuleCatalog /></PlatformShell>} />
              <Route path="/workspace/builder" element={<PlatformShell><BuilderChoice /></PlatformShell>} />
              <Route path="/workspace/ai-builder" element={<PlatformShell fullBleed><AIBuilder /></PlatformShell>} />
              <Route path="/workspace/builder/new" element={<PlatformShell fullBleed><ModuleEditor /></PlatformShell>} />
              <Route path="/workspace/builder/:id" element={<PlatformShell fullBleed><ModuleEditor /></PlatformShell>} />
              
              {/* Dynamic Module Routes */}
              <Route path="/workspace/modules/:id" element={<PlatformShell><ModuleView /></PlatformShell>} />
              <Route path="/workspace/modules/:moduleId/records/:recordId" element={<PlatformShell><RecordDetailView /></PlatformShell>} />
              
              {/* Platform Operations */}
              <Route path="/workspace/queue" element={<PlatformShell><WorkQueue /></PlatformShell>} />
              <Route path="/workspace/people" element={<PlatformShell><People /></PlatformShell>} />
              <Route path="/workspace/analytics" element={<PlatformShell><Analytics /></PlatformShell>} />
              <Route path="/workspace/workflows" element={<PlatformShell><LogicBuilder /></PlatformShell>} />
              <Route path="/workspace/documents" element={<PlatformShell><DocumentAutomation /></PlatformShell>} />
              
              {/* Other Features (Coming Soon) */}
              <Route path="/workspace/automations" element={<PlatformShell><ComingSoon title="Automations Studio" description="Advanced trigger-based automation builder with visual flow designer." /></PlatformShell>} />
              <Route path="/workspace/logic" element={<PlatformShell><ComingSoon title="Logic Assets" description="Central repository for reusable business logic, scripts, and validation rules." /></PlatformShell>} />
              <Route path="/workspace/deployments" element={<PlatformShell><ComingSoon title="Deployment Center" description="Manage environment promotions, version history, and CI/CD pipelines." /></PlatformShell>} />
              <Route path="/workspace/settings" element={<PlatformShell><ComingSoon title="Organization Settings" description="Configure tenant branding, user roles, security policies, and API keys." /></PlatformShell>} />
              
              {/* External / Admin */}
              <Route path="/portal" element={<ExternalPortal />} />
              <Route path="/admin" element={<SuperAdmin />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/workspace" replace />} />
            </Routes>
          </Router>
        </PlatformProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
};

export default App;
