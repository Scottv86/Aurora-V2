import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { 
  Key, 
  Cpu, 
  BarChart3, 
  Zap, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Sliders, 
  Sparkles, 
  ShieldCheck,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  Lock
} from 'lucide-react';
import { Button, Badge, cn } from '../../components/UI/Primitives';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { PageLoader } from '../../components/UI/PageLoader';
import { AI_FEATURES_CATALOG, AI_CATEGORY_LABELS, AIFeatureCategory } from '../../types/aiGovernance';
import { toast } from 'sonner';

interface TenantAIKey {
  id: string;
  provider: string;
  alias: string | null;
  keyHint: string;
  baseUrl: string | null;
  isDefault: boolean;
  status: string;
  createdAt: string;
}

interface TenantAIMapping {
  lowModel: string;
  mediumModel: string;
  highModel: string;
  zeroDataRetention: boolean;
  piiRedaction: boolean;
  allowLocalOnly: boolean;
}

interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUSD: number;
}

// Provider Vector Logos
const GeminiLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C12 6.62742 6.62742 12 0 12C6.62742 12 12 17.3726 12 24C12 17.3726 17.3726 12 24 12C17.3726 12 12 6.62742 12 0Z" fill="currentColor"/>
  </svg>
);

const OpenAILogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9013 6.027 6.027 0 0 0-4.4841-2.0084 6.0526 6.0526 0 0 0-5.836 4.238 6.0357 6.0357 0 0 0-4.0416 2.9304 6.0462 6.0462 0 0 0 .7419 7.0979 5.98 5.98 0 0 0 .5143 4.9108 6.052 6.052 0 0 0 6.5098 2.9013 6.01 6.01 0 0 0 4.4841 2.0084 6.0567 6.0567 0 0 0 5.836-4.238 6.0357 6.0357 0 0 0 4.0416-2.9304 6.0442 6.0442 0 0 0-.7419-7.0979z"/>
  </svg>
);

const AnthropicLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.827 3.524h3.766l5.228 16.952h-3.805l-1.129-3.799H11.517l-1.129 3.799H6.583L11.811 3.524h2.016zm3.037 10.155l-2.016-6.776-2.016 6.776h4.032zM3.18 3.524h3.738l-3.738 16.952H0L3.18 3.524z"/>
  </svg>
);

const XAILogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const DeepSeekLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const AzureLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5zm0 9L4 7v6.5l8 4 8-4V7l-8 4zm0 6l-8-4v3.5l8 4 8-4v-3.5l-8 4z"/>
  </svg>
);

const AWSLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.2L19.5 8 12 11.8 4.5 8 12 4.2zM4.5 9.8l6.5 3.3v7.4l-6.5-3.3V9.8zm15 7.4l-6.5 3.3v-7.4l6.5-3.3v7.4z"/>
  </svg>
);

const OllamaLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z"/>
  </svg>
);

const GroqLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const OpenRouterLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 8v8M8 12h8"/>
  </svg>
);

const PROVIDERS = [
  { id: 'google', name: 'Google Gemini', icon: GeminiLogo, desc: 'Gemini 3.5 Flash, 3.1 Flash-Lite, 2.0 Flash & 1.5 Pro models', color: 'from-blue-500 to-indigo-600' },
  { id: 'openai', name: 'OpenAI', icon: OpenAILogo, desc: 'GPT-4o, GPT-4o-mini, o1, o1-mini & o3-mini models', color: 'from-emerald-500 to-teal-600' },
  { id: 'anthropic', name: 'Anthropic', icon: AnthropicLogo, desc: 'Claude 3.5 Sonnet, 3.5 Haiku & 3 Opus models', color: 'from-amber-500 to-orange-600' },
  { id: 'groq', name: 'Groq', icon: GroqLogo, desc: 'Ultra-fast LPU inference (Llama 3.3 70B, DeepSeek R1, Mixtral)', color: 'from-orange-500 to-amber-600' },
  { id: 'openrouter', name: 'OpenRouter', icon: OpenRouterLogo, desc: 'Unified gateway to 100+ AI models & open weights', color: 'from-violet-500 to-purple-600' },
  { id: 'xai', name: 'xAI Grok', icon: XAILogo, desc: 'Grok-2 & Grok vision models', color: 'from-purple-500 to-pink-600' },
  { id: 'deepseek', name: 'DeepSeek', icon: DeepSeekLogo, desc: 'DeepSeek-V3 & DeepSeek-R1 reasoning models', color: 'from-cyan-500 to-blue-600' },
  { id: 'azure_openai', name: 'Azure OpenAI', icon: AzureLogo, desc: 'Enterprise isolated Azure OpenAI deployments', color: 'from-blue-600 to-cyan-600' },
  { id: 'aws_bedrock', name: 'AWS Bedrock', icon: AWSLogo, desc: 'Amazon Bedrock managed model endpoints', color: 'from-amber-600 to-yellow-600' },
  { id: 'ollama', name: 'Ollama / Local AI', icon: OllamaLogo, desc: 'Self-hosted air-gapped local models (Llama 3.3, Qwen 2.5, DeepSeek R1)', color: 'from-zinc-600 to-zinc-800' }
];

export const AISettingsPage = () => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'governance');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<TenantAIKey[]>([]);
  const [mapping, setMapping] = useState<TenantAIMapping>({
    lowModel: 'gemini-2.0-flash',
    mediumModel: 'claude-3-5-sonnet',
    highModel: 'gpt-4o',
    zeroDataRetention: true,
    piiRedaction: false,
    allowLocalOnly: false
  });
  const [usage, setUsage] = useState<{
    summary: UsageSummary;
    rollingLimits?: {
      fiveHour: { tokensUsed: number; requestsUsed: number; tokenBudget: number; percentage: number; resetHours: number };
      sevenDay: { tokensUsed: number; requestsUsed: number; tokenBudget: number; percentage: number; resetDays: number };
    };
    recentMetrics: any[];
    pricingCatalog: any;
  }>({
    summary: { totalRequests: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, estimatedCostUSD: 0 },
    rollingLimits: {
      fiveHour: { tokensUsed: 0, requestsUsed: 0, tokenBudget: 250000, percentage: 0, resetHours: 5 },
      sevenDay: { tokensUsed: 0, requestsUsed: 0, tokenBudget: 5000000, percentage: 0, resetDays: 7 }
    },
    recentMetrics: [],
    pricingCatalog: {}
  });

  // Governance State
  const [featureDefaults, setFeatureDefaults] = useState<Record<string, boolean>>({});
  const [savingGovernance, setSavingGovernance] = useState(false);
  const [teamsList, setTeamsList] = useState<any[]>([]);
  const [memberOverridesCount, setMemberOverridesCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [keyAlias, setKeyAlias] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const getAuthHeader = () => {
    const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-tenant-id': tenant?.id || ''
    };
  };

  const fetchData = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const headers = getAuthHeader();
      const [keysRes, configRes, usageRes, govRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ai/keys`, { headers }),
        fetch(`${API_BASE_URL}/api/ai/config`, { headers }),
        fetch(`${API_BASE_URL}/api/ai/usage`, { headers }),
        fetch(`${API_BASE_URL}/api/ai/governance`, { headers })
      ]);

      if (keysRes.ok) setKeys(await keysRes.json());
      if (configRes.ok) setMapping(await configRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
      if (govRes.ok) {
        const govData = await govRes.json();
        setFeatureDefaults(govData.featureDefaults || {});
        setTeamsList(govData.teams || []);
        setMemberOverridesCount(govData.memberOverridesCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to load AI settings data:', err);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = (key: string) => {
    setFeatureDefaults(prev => ({
      ...prev,
      [key]: prev[key] === false ? true : false
    }));
  };

  const handleApplyPreset = (preset: 'all' | 'productivity' | 'zero') => {
    const updated: Record<string, boolean> = {};
    if (preset === 'all') {
      AI_FEATURES_CATALOG.forEach(f => {
        updated[f.key] = true;
      });
      toast.info('Enabled all AI features preset');
    } else if (preset === 'zero') {
      AI_FEATURES_CATALOG.forEach(f => {
        updated[f.key] = false;
      });
      toast.warning('Air-gapped Zero-AI preset applied');
    } else if (preset === 'productivity') {
      AI_FEATURES_CATALOG.forEach(f => {
        if (
          f.key === 'ai:formula_assistant' ||
          f.key === 'ai:ask_aurora_filter' ||
          f.key === 'ai:record_summary' ||
          f.key === 'ai:report_generator' ||
          f.key === 'ai:document_template'
        ) {
          updated[f.key] = true;
        } else {
          updated[f.key] = false;
        }
      });
      toast.info('Strict Productivity AI preset applied');
    }
    setFeatureDefaults(updated);
  };

  const handleSaveGovernanceDefaults = async () => {
    setSavingGovernance(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/governance/defaults`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify({ featureDefaults })
      });
      if (res.ok) {
        toast.success('AI Feature Governance policies saved successfully');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to save governance defaults');
      }
    } catch (err: any) {
      toast.error('Failed to save governance defaults');
    } finally {
      setSavingGovernance(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenant?.id, session?.access_token]);

  const handleTestConnection = async (provider: string, rawKey: string, baseUrl?: string) => {
    setIsTesting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/keys/test`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({ provider, keyId: rawKey, apiKey: rawKey, baseUrl })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Connection successful');
      } else {
        toast.error(data.error || 'Connection test failed');
      }
    } catch (err: any) {
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput) {
      toast.error('Please enter an API Key');
      return;
    }
    setSavingKey(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/keys`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          provider: selectedProvider,
          alias: keyAlias || `${selectedProvider.toUpperCase()} Key`,
          apiKey: apiKeyInput,
          baseUrl: baseUrlInput || null,
          isDefault: true
        })
      });

      if (res.ok) {
        toast.success('API Key saved successfully');
        setIsAddModalOpen(false);
        setApiKeyInput('');
        setKeyAlias('');
        setBaseUrlInput('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save key');
      }
    } catch (err: any) {
      toast.error('Failed to save API Key');
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API Key?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/keys/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      if (res.ok) {
        toast.success('API Key removed');
        setKeys(keys.filter(k => k.id !== id));
      }
    } catch (err: any) {
      toast.error('Failed to delete key');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/config`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(mapping)
      });
      if (res.ok) {
        toast.success('AI Model configuration updated');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (err: any) {
      toast.error('Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const subNavItems: SettingsSubNavItem[] = [
    { id: 'governance', label: 'Feature Governance', icon: ShieldCheck, description: '19-Feature Policy Matrix' },
    { id: 'keys', label: 'API Keys & Providers', icon: Key, description: 'BYOK Provider Keys' },
    { id: 'routing', label: 'Model Tiers & Routing', icon: Sliders, description: 'Cost & performance' },
    { id: 'telemetry', label: 'Usage & Quotas', icon: BarChart3, description: 'Token consumption' },
    { id: 'privacy', label: 'Data Privacy & Rules', icon: Lock, description: 'Zero-retention rules' }
  ];

  const filteredFeatures = AI_FEATURES_CATALOG.filter(f => {
    if (selectedCategory === 'all') return true;
    return f.category === selectedCategory;
  });

  const enabledFeaturesCount = AI_FEATURES_CATALOG.filter(f => featureDefaults[f.key] !== false).length;
  const restrictedFeaturesCount = AI_FEATURES_CATALOG.length - enabledFeaturesCount;

  return (
    <SettingsSubNavLayout
      title="AI Services & Governance"
      description="Manage enterprise AI features, configure hierarchical user/team policies, connect BYOK providers, and monitor telemetry."
      icon={Sparkles}
      items={subNavItems}
      activeId={activeTab}
      onTabChange={setActiveTab}
      actions={
        activeTab === 'governance' ? (
          <Button 
            onClick={handleSaveGovernanceDefaults}
            disabled={savingGovernance}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 shadow-md shadow-indigo-500/20"
          >
            <ShieldCheck size={16} /> {savingGovernance ? 'Saving...' : 'Save AI Policies'}
          </Button>
        ) : (
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-2 shadow-md shadow-indigo-500/20"
          >
            <Plus size={16} /> Add API Key
          </Button>
        )
      }
    >
      {loading ? (
        <PageLoader label="Loading AI Services..." fullscreen={false} className="min-h-[400px]" />
      ) : (
        <>
          {/* TAB 0: AI FEATURE GOVERNANCE & POLICY GATING */}
          {activeTab === 'governance' && (
            <div className="w-full space-y-6">
              {/* Governance Stats Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Active Features</p>
                    <p className="text-xl font-extrabold text-zinc-900 dark:text-white">
                      {enabledFeaturesCount} <span className="text-xs text-zinc-400 font-normal">/ {AI_FEATURES_CATALOG.length}</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Restricted Features</p>
                    <p className="text-xl font-extrabold text-zinc-900 dark:text-white">
                      {restrictedFeaturesCount}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Teams Configured</p>
                    <p className="text-xl font-extrabold text-zinc-900 dark:text-white">
                      {teamsList.length}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">User Overrides</p>
                    <p className="text-xl font-extrabold text-zinc-900 dark:text-white">
                      {memberOverridesCount}
                    </p>
                  </div>
                </div>
              </div>

              {/* Presets & Controls Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 backdrop-blur-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="text-indigo-500" size={18} />
                      Governance Quick Presets
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Apply pre-configured compliance templates across all 19 platform AI tools with one click.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => handleApplyPreset('all')}
                      className="text-xs font-bold gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center transition-all shadow-sm"
                    >
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      Full Enterprise AI
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleApplyPreset('productivity')}
                      className="text-xs font-bold gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center transition-all shadow-sm"
                    >
                      <Sliders size={13} className="text-indigo-500" />
                      Strict Productivity
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleApplyPreset('zero')}
                      className="text-xs font-bold gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200/60 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center transition-all shadow-sm"
                    >
                      <XCircle size={13} className="text-rose-500" />
                      Air-Gapped (Zero AI)
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border",
                    selectedCategory === 'all'
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                      : "bg-zinc-100/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  )}
                >
                  All Features ({AI_FEATURES_CATALOG.length})
                </button>
                {(Object.keys(AI_CATEGORY_LABELS) as AIFeatureCategory[]).map(catKey => {
                  const count = AI_FEATURES_CATALOG.filter(f => f.category === catKey).length;
                  const isCatSelected = selectedCategory === catKey;
                  return (
                    <button
                      type="button"
                      key={catKey}
                      onClick={() => setSelectedCategory(catKey)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border",
                        isCatSelected
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                          : "bg-zinc-100/80 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 border-zinc-200/60 dark:border-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      )}
                    >
                      {AI_CATEGORY_LABELS[catKey].title} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Features List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeatures.map(feat => {
                  const isEnabled = featureDefaults[feat.key] !== false;
                  return (
                    <div 
                      key={feat.key}
                      className={cn(
                        "p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4",
                        isEnabled 
                          ? "bg-white dark:bg-white/5 border-zinc-200 dark:border-zinc-800 shadow-sm"
                          : "bg-zinc-50/70 dark:bg-white/[0.02] border-zinc-200/60 dark:border-zinc-800/60 opacity-80"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-colors",
                              isEnabled
                                ? "bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                            )}>
                              <Cpu size={18} />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{feat.name}</h4>
                              <span className="text-[10px] font-mono text-zinc-400">{feat.key}</span>
                            </div>
                          </div>
                          
                          {/* Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleFeature(feat.key)}
                            className={cn(
                              "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              isEnabled ? "bg-indigo-600" : "bg-zinc-300 dark:bg-zinc-700"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                isEnabled ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                        </div>

                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          {feat.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800/50 text-[11px]">
                        <span className="text-zinc-400 font-medium">
                          {AI_CATEGORY_LABELS[feat.category].title}
                        </span>
                        <Badge variant={isEnabled ? 'green' : 'zinc'} className="text-[10px] font-bold">
                          {isEnabled ? 'Enabled Org-Wide' : 'Restricted Org-Wide'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Info Note */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 text-center">
                Changes apply immediately as baseline defaults for all users unless overridden at the team or member level.
              </div>
            </div>
          )}
          {activeTab === 'keys' && (
            <div className="w-full space-y-6">
              <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-indigo-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">Default Baseline Active Model</h4>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40">
                        Zero-Config Baseline
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 font-medium">
                      Powered by Gemini 3.1 Flash-Lite (Free Tier)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">Rate Limit Protection: <strong className="text-emerald-600 dark:text-emerald-400">5 RPM Intercept Active</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PROVIDERS.map((prov) => {
                  const existingKeys = keys.filter(k => k.provider === prov.id);
                  const isConnected = existingKeys.length > 0;
                  const Icon = prov.icon;

                  return (
                    <div key={prov.id} className="p-6 rounded-3xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-2xl transition-all flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md", prov.color)}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <Badge variant={isConnected ? 'green' : 'zinc'} className="text-[10px] font-black uppercase tracking-wider">
                            {isConnected ? 'Connected' : 'Not Configured'}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">{prov.name}</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{prov.desc}</p>
                      </div>

                      {isConnected ? (
                        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                          {existingKeys.map(k => (
                            <div key={k.id} className="flex items-center justify-between text-xs">
                              <span className="font-mono text-zinc-600 dark:text-zinc-300 font-bold">{k.keyHint}</span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleTestConnection(k.provider, k.id, k.baseUrl || undefined)} 
                                  className="p-1 text-zinc-400 hover:text-blue-500" 
                                  title="Test Connection"
                                >
                                  <RefreshCw size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteKey(k.id)} 
                                  className="p-1 text-zinc-400 hover:text-red-500" 
                                  title="Delete Key"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Button 
                          onClick={() => {
                            setSelectedProvider(prov.id);
                            setIsAddModalOpen(true);
                          }}
                          variant="secondary"
                          className="w-full text-xs font-bold py-2 mt-2"
                        >
                          Configure Key
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ROUTING & SYSTEM TOPOLOGY */}
          {activeTab === 'routing' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-6">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        4-Tier Connection Architecture
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Multi-tiered AI backend selector supporting zero-config native baseline, enterprise VPC, BYOK, and custom OpenAI-compatible endpoints.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Tier 1 */}
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-indigo-500/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap size={14} /> Tier 1: Aurora Native AI (Default)
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Active Free Tier
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Gemini 3.1 Flash-Lite (Native Baseline)
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Zero-configuration platform baseline using Google Gemini Free Tier via GEMINI_API_KEY. Optimized for speed and cost efficiency.
                    </p>
                  </div>

                  {/* Tier 2 */}
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={14} /> Tier 2: Tenant-Hosted Native AI
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Enterprise Orgs
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Private Endpoint Docker Container
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Runs self-hosted model containers inside tenant private cloud (VPC) with custom endpoint URLs and tokens.
                    </p>
                  </div>

                  {/* Tier 3 */}
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Key size={14} /> Tier 3: OpenRouter & BYOK
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        Supabase Vault
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Claude 3.5 Sonnet, GPT-4o, DeepSeek-V3
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Encrypted API keys stored in Vault. Direct tenant billing with Anthropic, OpenAI, or OpenRouter.
                    </p>
                  </div>

                  {/* Tier 4 */}
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Cpu size={14} /> Tier 4: Custom Local Models
                      </span>
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        OpenAI Compatible
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-zinc-200">
                      Ollama / Local LLM Endpoints
                    </p>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Air-gapped flexibility. Connects local OpenAI-compatible endpoints with custom headers.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Preset Capability Tiers</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Map capability tiers to your preferred model. When users select Low, Medium, or High in Aurora Chat, requests are automatically routed to these model configurations.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* LOW TIER */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center font-bold">
                        <Zap size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Low (Fast / Budget Tier)</h4>
                        <p className="text-xs text-zinc-400">High speed, lowest latency, ideal for quick triage & simple responses.</p>
                      </div>
                    </div>
                    <select
                      value={mapping.lowModel}
                      onChange={(e) => setMapping({ ...mapping, lowModel: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold"
                    >
                      <optgroup label="Direct Providers">
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Aurora Default)</option>
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                        <option value="llama-3.1-8b-instant">Groq Llama 3.1 8B Instant (30k TPM)</option>
                        <option value="gpt-5.6-luna">GPT-5.6 Luna</option>
                        <option value="gpt-5.5-instant">GPT-5.5 Instant</option>
                        <option value="deepseek-v4-flash">DeepSeek V4-Flash</option>
                      </optgroup>
                      <optgroup label="OpenRouter (Unified API)">
                        <option value="openrouter/google/gemini-2.0-flash-lite-001">OpenRouter: Gemini Flash-Lite (Aurora Default Stunt Double)</option>
                        <option value="openrouter/auto">OpenRouter Auto (Best Available)</option>
                        <option value="openrouter/meta-llama/llama-3.3-70b-instruct:free">OpenRouter: Llama 3.3 70B (Free)</option>
                        <option value="openrouter/deepseek/deepseek-chat:free">OpenRouter: DeepSeek V3 (Free)</option>
                        <option value="openrouter/openai/gpt-4o-mini">OpenRouter: GPT-4o Mini</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* MEDIUM TIER */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                        <Cpu size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Medium (Balanced Workhorse)</h4>
                        <p className="text-xs text-zinc-400">Balanced intelligence & speed for everyday enterprise assistant workflows.</p>
                      </div>
                    </div>
                    <select
                      value={mapping.mediumModel}
                      onChange={(e) => setMapping({ ...mapping, mediumModel: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold"
                    >
                      <optgroup label="Direct Providers">
                        <option value="llama-3.3-70b-versatile">Groq Llama 3.3 70B Versatile</option>
                        <option value="grok-4.5">xAI Grok 4.5</option>
                        <option value="claude-sonnet-4.6">Claude Sonnet 4.6</option>
                        <option value="gpt-5.6-terra">GPT-5.6 Terra</option>
                        <option value="gpt-5.5">GPT-5.5</option>
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      </optgroup>
                      <optgroup label="OpenRouter (Unified API)">
                        <option value="openrouter/deepseek/deepseek-r1:free">OpenRouter: DeepSeek R1 Reasoning (Free)</option>
                        <option value="openrouter/meta-llama/llama-3.3-70b-instruct">OpenRouter: Llama 3.3 70B Instruct</option>
                        <option value="openrouter/anthropic/claude-3.5-sonnet">OpenRouter: Claude 3.5 Sonnet</option>
                        <option value="openrouter/openai/gpt-4o-mini">OpenRouter: GPT-4o Mini</option>
                        <option value="openrouter/mistralai/mistral-small-24b-instruct-2501:free">OpenRouter: Mistral Small 24B (Free)</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* HIGH TIER */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">High (Pro Reasoning & Deep Analysis)</h4>
                        <p className="text-xs text-zinc-400">Flagship reasoning models for complex architecture & long context analysis.</p>
                      </div>
                    </div>
                    <select
                      value={mapping.highModel}
                      onChange={(e) => setMapping({ ...mapping, highModel: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-mono font-bold"
                    >
                      <optgroup label="Direct Providers">
                        <option value="llama-3.3-70b-versatile">Groq Llama 3.3 70B Versatile</option>
                        <option value="claude-fable-5">Claude Fable 5</option>
                        <option value="gpt-5.6-sol">GPT-5.6 Sol</option>
                        <option value="gemini-3.1-pro">Gemini 3.1 Pro</option>
                        <option value="deepseek-v4-pro">DeepSeek V4-Pro (1M Context)</option>
                        <option value="grok-4.5">xAI Grok 4.5</option>
                      </optgroup>
                      <optgroup label="OpenRouter (Unified API)">
                        <option value="openrouter/deepseek/deepseek-r1">OpenRouter: DeepSeek R1 (Full)</option>
                        <option value="openrouter/openai/gpt-4o">OpenRouter: OpenAI GPT-4o</option>
                        <option value="openrouter/anthropic/claude-3.5-sonnet">OpenRouter: Claude 3.5 Sonnet</option>
                        <option value="openrouter/google/gemini-pro-1.5">OpenRouter: Gemini 1.5 Pro</option>
                        <option value="openrouter/qwen/qwen-2.5-coder-32b-instruct">OpenRouter: Qwen 2.5 Coder 32B</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {savingConfig ? 'Saving...' : 'Save Tier Routing'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: USAGE & TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Total Requests</p>
                  <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">{usage.summary.totalRequests}</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Total Tokens</p>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                    {usage.summary.totalTokens.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Prompt / Completion</p>
                  <p className="text-base font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                    {usage.summary.promptTokens.toLocaleString()} / {usage.summary.completionTokens.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-black text-zinc-400 uppercase tracking-wider">Est. Provider Cost</p>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    ${usage.summary.estimatedCostUSD.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Real-Time Rolling Limit Gauges */}
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <BarChart3 className="text-blue-500" size={18} /> Real-Time Rolling Usage Limits & Gauges
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Tracks model activity across rolling time windows (matching IDE/Antigravity rate limit indicators).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 5-Hour Window */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <Zap size={14} className="text-amber-500" /> 5-Hour Rolling Window
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-mono">
                        {usage.rollingLimits?.fiveHour.percentage || 0}% Capacity
                      </span>
                    </div>

                    <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          (usage.rollingLimits?.fiveHour.percentage || 0) > 80 ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"
                        )}
                        style={{ width: `${Math.max(5, usage.rollingLimits?.fiveHour.percentage || 0)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>{usage.rollingLimits?.fiveHour.tokensUsed.toLocaleString() || 0} / {usage.rollingLimits?.fiveHour.tokenBudget.toLocaleString() || 250000} tokens</span>
                      <span>5h rolling window</span>
                    </div>
                  </div>

                  {/* 7-Day Window */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <BarChart3 size={14} className="text-purple-500" /> 7-Day Weekly Window
                      </span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono">
                        {usage.rollingLimits?.sevenDay.percentage || 0}% Capacity
                      </span>
                    </div>

                    <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500 rounded-full",
                          (usage.rollingLimits?.sevenDay.percentage || 0) > 80 ? "bg-red-500" : "bg-gradient-to-r from-purple-500 to-pink-600"
                        )}
                        style={{ width: `${Math.max(5, usage.rollingLimits?.sevenDay.percentage || 0)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>{usage.rollingLimits?.sevenDay.tokensUsed.toLocaleString() || 0} / {usage.rollingLimits?.sevenDay.tokenBudget.toLocaleString() || 5000000} tokens</span>
                      <span>7d rolling window</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benchmark Rates Table */}
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">BYOK Provider Benchmark Rate Table (per 1M Tokens)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase">
                        <th className="py-2 px-3">Model</th>
                        <th className="py-2 px-3">Prompt Rate / 1M</th>
                        <th className="py-2 px-3">Completion Rate / 1M</th>
                        <th className="py-2 px-3">Category</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 font-mono">
                      {Object.entries(usage.pricingCatalog || {}).map(([model, info]: [string, any]) => (
                        <tr key={model}>
                          <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">{model}</td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">${info.promptPer1M.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">${info.completionPer1M.toFixed(2)}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <Badge variant={info.promptPer1M === 0 ? 'green' : 'zinc'} className="text-[9px]">
                              {info.promptPer1M === 0 ? 'Free / Local' : 'Commercial API'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA PRIVACY & GOVERNANCE */}
          {activeTab === 'privacy' && (
            <div className="max-w-4xl space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 space-y-6">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <ShieldCheck className="text-emerald-500" /> Data Privacy & Zero Training Guarantees
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Aurora guarantees that your organization's prompt payloads are transmitted directly to your BYOK providers and strictly bound by enterprise non-training API terms.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Zero Data Retention Toggle */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">Enforce Zero Data Retention (ZDR)</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">Appends ZDR header flags where supported to prevent provider logging.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={mapping.zeroDataRetention}
                      onChange={(e) => setMapping({ ...mapping, zeroDataRetention: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* PII Redaction Toggle */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">Client-Side PII Masking & Redaction</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">Automatically redacts SSNs, credit card numbers, and API tokens before transmission.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={mapping.piiRedaction}
                      onChange={(e) => setMapping({ ...mapping, piiRedaction: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  {/* Local Only Toggle */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">Enforce Local / Air-Gapped Models Only</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">Blocks all cloud AI providers and forces routing exclusively through local Ollama/vLLM endpoints.</p>
                    </div>
                    <input 
                      type="checkbox"
                      checked={mapping.allowLocalOnly}
                      onChange={(e) => setMapping({ ...mapping, allowLocalOnly: e.target.checked })}
                      className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button 
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {savingConfig ? 'Saving...' : 'Save Privacy Controls'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add API Key Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">Configure {selectedProvider.toUpperCase()} Key</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Key Alias / Name</label>
                <input 
                  type="text" 
                  value={keyAlias}
                  onChange={(e) => setKeyAlias(e.target.value)}
                  placeholder="e.g. Primary Enterprise Key"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">API Key / Token</label>
                <input 
                  type="password" 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                />
              </div>

              {(selectedProvider === 'azure_openai' || selectedProvider === 'ollama' || selectedProvider === 'openrouter') && (
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Custom Endpoint Base URL</label>
                  <input 
                    type="text" 
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="https://your-resource.openai.azure.com/"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-300 dark:border-zinc-700 text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <Button 
                variant="secondary" 
                onClick={() => handleTestConnection(selectedProvider, apiKeyInput, baseUrlInput || undefined)}
                disabled={isTesting || !apiKeyInput}
                className="text-xs font-bold"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-xs font-bold">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveKey}
                disabled={savingKey}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
              >
                {savingKey ? 'Saving...' : 'Save API Key'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </SettingsSubNavLayout>
  );
};
