import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  ShieldCheck, 
  Search, 
  Terminal,
  Activity,
  Check,
  Filter,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/UI/Primitives';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { cn } from '../../lib/utils';

interface TestSuite {
  id: string;
  name: string;
  category: string;
  testsCount: number;
  passingCount: number;
  duration: string;
  status: 'passed' | 'running' | 'failed' | 'pending';
  lastRun: string;
  coverage: number;
}

const INITIAL_TEST_SUITES: TestSuite[] = [
  {
    id: 'TS-001',
    name: 'Module Data Validation & Schema Integrity',
    category: 'Schema & Models',
    testsCount: 24,
    passingCount: 24,
    duration: '1.2s',
    status: 'passed',
    lastRun: '10 mins ago',
    coverage: 98
  },
  {
    id: 'TS-002',
    name: 'Automation Trigger & Webhook Dispatcher',
    category: 'Workflows & Automations',
    testsCount: 18,
    passingCount: 18,
    duration: '2.4s',
    status: 'passed',
    lastRun: '1 hour ago',
    coverage: 94
  },
  {
    id: 'TS-003',
    name: 'API Authentication & Token Scopes',
    category: 'Security & API',
    testsCount: 32,
    passingCount: 32,
    duration: '850ms',
    status: 'passed',
    lastRun: '2 hours ago',
    coverage: 100
  },
  {
    id: 'TS-004',
    name: 'AI Agent Swarm & Tool Call Assertions',
    category: 'AI Services',
    testsCount: 15,
    passingCount: 15,
    duration: '3.1s',
    status: 'passed',
    lastRun: '3 hours ago',
    coverage: 91
  },
  {
    id: 'TS-005',
    name: 'Document Generation & PDF Merge Engine',
    category: 'Templates & Generation',
    testsCount: 12,
    passingCount: 12,
    duration: '1.8s',
    status: 'passed',
    lastRun: 'Yesterday',
    coverage: 96
  }
];

export const TestingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('suites');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(INITIAL_TEST_SUITES[0]);
  const [testSuites] = useState<TestSuite[]>(INITIAL_TEST_SUITES);

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'suites', label: 'Test Suites', icon: FlaskConical, description: 'Automated test suite registry', badge: testSuites.length },
    { id: 'runner', label: 'Sandbox Runner', icon: Terminal, description: 'Interactive simulation harness' },
    { id: 'coverage', label: 'Coverage Reports', icon: BarChart3, description: 'Schema & logic coverage' },
    { id: 'history', label: 'Execution Logs', icon: Clock, description: 'Recent test run traces' },
  ];

  const handleRunAllTests = () => {
    setIsRunningAll(true);
    toast.info('Initiating platform test runner...');
    setTimeout(() => {
      setIsRunningAll(false);
      toast.success('All 101 automated test cases executed successfully (100% passing)');
    }, 1800);
  };

  const filteredSuites = testSuites.filter(suite => {
    const matchesSearch = suite.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          suite.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || suite.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalTests = testSuites.reduce((acc, s) => acc + s.testsCount, 0);
  const avgCoverage = Math.round(testSuites.reduce((acc, s) => acc + s.coverage, 0) / testSuites.length);

  return (
    <SettingsSubNavLayout
      title="Testing & Sandbox"
      description="Automated test harness, schema regression suites, webhook simulations, and validation runner."
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      sectionTitle="Testing Suite"
      actions={
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRunAllTests}
            disabled={isRunningAll}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
          >
            {isRunningAll ? (
              <>
                <RotateCcw size={14} className="animate-spin" />
                <span>Running Suites...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Run All Suites</span>
              </>
            )}
          </Button>
        </div>
      }
    >
      {/* Test Suites Tab */}
      {activeTab === 'suites' && (
        <div className="space-y-8 max-w-6xl pb-16">
          {/* Metrics summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Total Tests</p>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{totalTests} Cases</h3>
                <p className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                  <Check size={12} /> 100% passing
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FlaskConical size={24} />
              </div>
            </div>

            <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Average Coverage</p>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">{avgCoverage}%</h3>
                <p className="text-[11px] text-zinc-400 mt-1">Across 5 domain modules</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck size={24} />
              </div>
            </div>

            <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Last Full Run</p>
                <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-1">10 mins ago</h3>
                <p className="text-[11px] text-zinc-400 mt-1">Duration: 9.35s</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Activity size={24} />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input
                type="text"
                placeholder="Search test suites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                <Filter size={12} /> Filter:
              </span>
              {['all', 'Schema & Models', 'Workflows & Automations', 'Security & API'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize",
                    filterCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200/40 dark:border-zinc-800/40"
                  )}
                >
                  {cat === 'all' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Test Suites List */}
          <div className="space-y-4">
            {filteredSuites.map((suite, idx) => (
              <motion.div
                key={suite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => setSelectedSuite(suite)}
                className={cn(
                  "p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group",
                  selectedSuite?.id === suite.id
                    ? "border-indigo-500/50 dark:border-indigo-500/50 ring-1 ring-indigo-500/20"
                    : "border-white/20 dark:border-white/5 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                    <FlaskConical size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{suite.id}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50">
                        {suite.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white mt-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {suite.name}
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {suite.passingCount} of {suite.testsCount} tests passing • Execution time: {suite.duration}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{suite.coverage}% Coverage</p>
                    <p className="text-[10px] text-zinc-400">{suite.lastRun}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                    <CheckCircle2 size={14} />
                    <span>Passed</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Sandbox Runner Tab */}
      {activeTab === 'runner' && (
        <div className="space-y-6 max-w-4xl pb-16">
          <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Terminal size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Interactive Sandbox Simulation</h3>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                Sandbox Mode
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Execute test payloads against mock database tables, test validation rules against simulated schemas, and dispatch virtual webhook events without touching production data.
            </p>

            <div className="p-4 rounded-2xl bg-zinc-950 text-zinc-100 font-mono text-xs space-y-2 border border-zinc-800">
              <div className="flex items-center justify-between text-zinc-500 text-[10px] border-b border-zinc-800 pb-2">
                <span>TEST RUNNER CONSOLE</span>
                <span>STATUS: READY</span>
              </div>
              <p className="text-emerald-400">$ aurora test --suite=all --env=sandbox</p>
              <p className="text-zinc-400">[info] Loading sandbox environment configurations...</p>
              <p className="text-zinc-400">[info] 5 test suites detected (101 unit/integration assertions)</p>
              <p className="text-emerald-400">[pass] TS-001: Schema validation passed in 1.2s</p>
              <p className="text-emerald-400">[pass] TS-002: Automation triggers passed in 2.4s</p>
              <p className="text-emerald-400">[pass] TS-003: API scopes passed in 850ms</p>
              <p className="text-indigo-400">[ready] Awaiting new test payload...</p>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Reports Tab */}
      {activeTab === 'coverage' && (
        <div className="space-y-6 max-w-4xl pb-16">
          <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none space-y-6">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Platform Logic & Schema Coverage</h3>
            <div className="space-y-4">
              {[
                { label: 'Data Modules & Custom Schemas', coverage: 98 },
                { label: 'Automations & Rule Triggers', coverage: 94 },
                { label: 'REST API & Webhook Endpoints', coverage: 100 },
                { label: 'Access Control & Permission Policies', coverage: 96 },
                { label: 'AI Agent Coworker Skills', coverage: 91 },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-zinc-700 dark:text-zinc-300">{item.label}</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{item.coverage}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                      style={{ width: `${item.coverage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Execution Logs Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4 max-w-4xl pb-16">
          <div className="p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-xl shadow-black/5 dark:shadow-none space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Execution History</h3>
            <div className="space-y-3">
              {[
                { id: 'RUN-4091', suite: 'All Test Suites', duration: '9.35s', status: 'Passed', time: '10 mins ago' },
                { id: 'RUN-4090', suite: 'API Authentication', duration: '850ms', status: 'Passed', time: '1 hour ago' },
                { id: 'RUN-4089', suite: 'Automation Triggers', duration: '2.4s', status: 'Passed', time: '3 hours ago' },
                { id: 'RUN-4088', suite: 'AI Agent Swarm', duration: '3.1s', status: 'Passed', time: 'Yesterday' }
              ].map((run) => (
                <div key={run.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">{run.suite}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{run.id} • {run.duration}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">{run.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SettingsSubNavLayout>
  );
};
