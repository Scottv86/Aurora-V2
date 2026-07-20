import { useState, useEffect } from 'react';
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
  Info,
  ShieldCheck
} from 'lucide-react';
import { Button, Badge, cn } from '../../components/UI/Primitives';
import { Tabs } from '../../components/UI/TabsAndModal';
import { PageHeader } from '../../components/UI/PageHeader';
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
  
  const [activeTab, setActiveTab] = useState('keys');
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
      const [keysRes, configRes, usageRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ai/keys`, { headers }),
        fetch(`${API_BASE_URL}/api/ai/config`, { headers }),
        fetch(`${API_BASE_URL}/api/ai/usage`, { headers })
      ]);

      if (keysRes.ok) setKeys(await keysRes.json());
      if (configRes.ok) setMapping(await configRes.json());
      if (usageRes.ok) setUsage(await usageRes.json());
    } catch (err: any) {
      console.error('Failed to load AI settings data:', err);
      toast.error('Failed to load AI settings');
    } finally {
      setLoading(false);
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
        body: JSON.stringify({ provider, apiKey: rawKey, baseUrl })
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

  const tabs = [
    { id: 'keys', label: 'API Keys & Providers', icon: Key },
    { id: 'routing', label: 'Model Tiers & Routing', icon: Sliders },
    { id: 'telemetry', label: 'Usage & Telemetry', icon: BarChart3 },
    { id: 'privacy', label: 'Data Privacy & Governance', icon: ShieldCheck }
  ];

  return (
    <div className="flex flex-col w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 px-6 lg:px-12 py-8 text-zinc-900 dark:text-zinc-100">
      <PageHeader 
        title="AI Services & Model Keys (BYOK)" 
        description="Bring your own API keys, set capability tiers, monitor model usage, and enforce zero-data-retention privacy policy."
        actions={
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> Add API Key
          </Button>
        }
      />

      {/* Tabs Bar */}
      <div className="my-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: API KEYS & PROVIDERS */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <p className="font-black uppercase tracking-wider">Bring Your Own Key (BYOK) Billing Model</p>
                  <p>Aurora does not markup AI models or charge for AI usage. All API calls execute using your organization's own provider keys, so billing is handled directly between your tenant and the AI provider.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PROVIDERS.map((prov) => {
                  const existingKeys = keys.filter(k => k.provider === prov.id);
                  const isConnected = existingKeys.length > 0;
                  const Icon = prov.icon;

                  return (
                    <div key={prov.id} className="p-5 rounded-2xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
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

          {/* TAB 2: MODEL TIERS & ROUTING */}
          {activeTab === 'routing' && (
            <div className="max-w-4xl space-y-6">
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
                        <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                        <option value="llama-3.1-8b-instant">Groq Llama 3.1 8B Instant (30k TPM)</option>
                        <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite</option>
                        <option value="gpt-5.6-luna">GPT-5.6 Luna</option>
                        <option value="gpt-5.5-instant">GPT-5.5 Instant</option>
                        <option value="deepseek-v4-flash">DeepSeek V4-Flash</option>
                      </optgroup>
                      <optgroup label="OpenRouter (Unified API)">
                        <option value="openrouter/auto">OpenRouter Auto (Best Available)</option>
                        <option value="openrouter/meta-llama/llama-3.3-70b-instruct:free">OpenRouter: Llama 3.3 70B (Free)</option>
                        <option value="openrouter/google/gemini-2.0-flash-exp:free">OpenRouter: Gemini 2.0 Flash (Free)</option>
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
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
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
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Custom Base URL (Optional)</label>
                  <input 
                    type="text" 
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="https://..."
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
        </div>
      )}
    </div>
  );
};
