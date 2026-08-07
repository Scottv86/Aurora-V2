import { useLocation } from 'react-router-dom';
import { 
  Code, 
  Search, 
  Play, 
  Loader2, 
  BookOpen, 
  Users, 
  Inbox, 
  Tag, 
  ChevronRight, 
  Copy,
  Check
} from 'lucide-react';
import { SettingsSubNavLayout, SettingsSubNavItem } from '../../components/Settings/SettingsSubNavLayout';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';


interface APIEndpoint {
  id: string;
  name: string;
  slug: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  icon: React.ElementType;
  description: string;
  scopes: string[];
  parameters: { name: string; type: string; required: boolean; description: string }[];
  requestBody?: string;
}

export const APISettings = () => {
  const location = useLocation();
  const isSettingsMode = location.pathname.startsWith('/workspace/settings');
  const { tenant } = usePlatform();
  const { session } = useAuth();
  
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [selectedApiId, setSelectedApiId] = useState<string>('pricing-catalog');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sandbox State
  const [devLanguage, setDevLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');
  const [sandboxSelectedSku, setSandboxSelectedSku] = useState('');
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [sandboxResponse, setSandboxResponse] = useState<any>(null);
  const [sandboxRunning, setSandboxRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const API_LIST: APIEndpoint[] = [
    {
      id: 'pricing-catalog',
      name: 'Pricing Catalog API',
      slug: 'pricing-catalog',
      method: 'GET',
      endpoint: '/api/pricing-catalog',
      icon: Tag,
      description: 'Retrieve, create, edit, or delete items within the pricing catalog registry. Scoped by tenant workspace.',
      scopes: ['read:pricing', 'write:pricing'],
      parameters: [
        { name: 'code', type: 'string', required: false, description: 'Filter items by unique SKU / Code (exact match).' },
        { name: 'type', type: 'string', required: false, description: 'Filter by item type (PRODUCT, SERVICE, FEE, RECURRING, FINE).' },
        { name: 'status', type: 'string', required: false, description: 'Filter by status (active, draft, archived).' },
        { name: 'search', type: 'string', required: false, description: 'Fuzzy search by name, code, or description.' }
      ],
      requestBody: `{
  "name": "Hourly Consulting",
  "code": "SRV-CONS-02",
  "type": "SERVICE",
  "priceType": "TIME",
  "basePrice": 250.00,
  "currency": "AUD",
  "billingBlockMinutes": 60,
  "status": "active"
}`
    },
    {
      id: 'people-organisations',
      name: 'People & Organisations API',
      slug: 'people-organisations',
      method: 'GET',
      endpoint: '/api/people-organisations',
      icon: Users,
      description: 'Manage legal structures, company records, person files, and dynamic relationship associations.',
      scopes: ['read:people', 'write:people'],
      parameters: [
        { name: 'search', type: 'string', required: false, description: 'Filter directory by first name, last name, or legal name.' },
        { name: 'status', type: 'string', required: false, description: 'Filter status (ACTIVE, DRAFT, PENDING_REVIEW).' }
      ]
    },
    {
      id: 'work-distribution',
      name: 'Work Distribution API',
      slug: 'work-distribution',
      method: 'POST',
      endpoint: '/api/data/intake',
      icon: Inbox,
      description: 'Trigger autonomous routing pipelines to queue and assign work records to workforce members.',
      scopes: ['write:intake'],
      parameters: [
        { name: 'source', type: 'string', required: true, description: 'Identifier of the intake source channel (e.g. portal, email).' }
      ],
      requestBody: `{
  "title": "New Trademark Application Lodgment",
  "sourceChannel": "PORTAL",
  "description": "Standard corporate filing under class 35.",
  "payload": {
    "applicantName": "Acme Corp Ltd"
  }
}`
    },
    {
      id: 'knowledge-base',
      name: 'Knowledge Base API',
      slug: 'knowledge-base',
      method: 'GET',
      endpoint: '/api/data/knowledge',
      icon: BookOpen,
      description: 'Query semantic documentation articles and retrieve reference text vectors for AI agent contexts.',
      scopes: ['read:knowledge'],
      parameters: [
        { name: 'query', type: 'string', required: true, description: 'Semantic search query string.' },
        { name: 'category', type: 'string', required: false, description: 'Limit search scope to specific article category.' }
      ]
    }
  ];

  useEffect(() => {
    setEndpoints(API_LIST);
    fetchCatalogItems();
  }, []);

  const fetchCatalogItems = async () => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      const data = await res.json();
      if (res.ok && data.length > 0) {
        setCatalogItems(data);
        setSandboxSelectedSku(data[0].code);
      }
    } catch (err) {
      console.error('Failed to load sandbox options:', err);
    }
  };

  const runSandbox = async () => {
    if (!sandboxSelectedSku) return;
    setSandboxRunning(true);
    setSandboxResponse(null);
    
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/pricing-catalog?code=${sandboxSelectedSku}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant?.id || ''
        }
      });
      const data = await res.json();
      if (res.ok) {
        // Return single object or list
        setSandboxResponse(data.length > 0 ? data[0] : data);
        toast.success('Sandbox API request successful!');
      } else {
        setSandboxResponse({ error: data.error || 'Failed' });
        toast.error('Sandbox API call failed');
      }
    } catch (err: any) {
      setSandboxResponse({ error: err.message });
      toast.error('Connection issue');
    } finally {
      setSandboxRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Code snippet copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter API lists
  const filteredApis = endpoints.filter(api => 
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeApi = endpoints.find(api => api.id === selectedApiId) || endpoints[0];

  // Request Code Generator
  const getRequestCodeSnippet = () => {
    if (!activeApi) return '';
    const codeParam = activeApi.id === 'pricing-catalog' ? `?code=${sandboxSelectedSku}` : '';
    
    if (devLanguage === 'curl') {
      return `curl -X ${activeApi.method} \\\n  "${API_BASE_URL}${activeApi.endpoint}${codeParam}" \\\n  -H "Authorization: Bearer YOUR_API_TOKEN" \\\n  -H "x-tenant-id: ${tenant?.id || 'TENANT-ID'}"`;
    }
    if (devLanguage === 'javascript') {
      return `const response = await fetch(\n  \`${API_BASE_URL}${activeApi.endpoint}${codeParam}\`,\n  {\n    method: '${activeApi.method}',\n    headers: {\n      'Authorization': 'Bearer YOUR_API_TOKEN',\n      'x-tenant-id': '${tenant?.id || 'TENANT-ID'}'\n    }\n  }\n);\n\nconst data = await response.json();\nconsole.log(data);`;
    }
    if (devLanguage === 'python') {
      return `import requests\n\nurl = "${API_BASE_URL}${activeApi.endpoint}"\nheaders = {\n    "Authorization": "Bearer YOUR_API_TOKEN",\n    "x-tenant-id": "${tenant?.id || 'TENANT-ID'}"\n}\n${activeApi.id === 'pricing-catalog' ? `params = { "code": "${sandboxSelectedSku}" }\nres = requests.get(url, headers=headers, params=params)` : `res = requests.${activeApi.method.toLowerCase()}(url, headers=headers)`}\nprint(res.json())`;
    }
    return '';
  };

  const apiSubNavItems: SettingsSubNavItem[] = API_LIST.map(api => ({
    id: api.id,
    label: api.name,
    icon: api.icon || Code,
    description: `${api.method} ${api.endpoint}`
  }));

  if (isSettingsMode) {
    return (
      <SettingsSubNavLayout
        title="API Management"
        description="Tenant-scoped master data REST endpoints, API keys, and programmatic execution sandboxes."
        icon={Code}
        items={apiSubNavItems}
        activeId={selectedApiId}
        onTabChange={(id) => {
          setSelectedApiId(id);
          setSandboxResponse(null);
        }}
        actions={
          <div className="flex items-center gap-2">

          </div>
        }
      >
        <div className="w-full space-y-6 text-left">
          {activeApi ? (
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              
              {/* Header details */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-5 gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                      activeApi.method === 'GET' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                      activeApi.method === 'POST' ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {activeApi.method}
                    </span>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{activeApi.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-450 mt-1">{activeApi.description}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeApi.scopes.map(scope => (
                    <span key={scope} className="text-[10px] font-mono bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md text-zinc-500 font-bold uppercase">
                      {scope}
                    </span>
                  ))}
                </div>
              </div>

              {/* Endpoint Guide */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Request Endpoint</label>
                <div className="flex items-center justify-between bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  <span>{API_BASE_URL}{activeApi.endpoint}</span>
                </div>
              </div>

              {/* Parameters Table */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Parameters</label>
                <div className="border border-zinc-200/50 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-100/50 dark:bg-white/5 border-b border-zinc-200/50 dark:border-zinc-800">
                      <tr>
                        <th className="p-3 font-bold text-zinc-400">Parameter</th>
                        <th className="p-3 font-bold text-zinc-400">Type</th>
                        <th className="p-3 font-bold text-zinc-400">Required</th>
                        <th className="p-3 font-bold text-zinc-400">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800">
                      {activeApi.parameters.map(param => (
                        <tr key={param.name}>
                          <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{param.name}</td>
                          <td className="p-3 font-mono text-zinc-500">{param.type}</td>
                          <td className="p-3">
                            {param.required ? (
                              <span className="text-[10px] font-bold uppercase text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">Required</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">Optional</span>
                            )}
                          </td>
                          <td className="p-3 text-zinc-500">{param.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Interactive Code Snippets & Sandbox */}
              <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-850">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Code size={16} className="text-indigo-500" />
                    Interactive Sandbox Tester
                  </h4>

                  {/* Dev Language Selector */}
                  <div className="flex bg-zinc-100/50 dark:bg-white/5 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                    {(['curl', 'javascript', 'python'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setDevLanguage(lang)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all ${
                          devLanguage === lang ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20' : 'text-zinc-450 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Code Snippet Box */}
                <div className="relative bg-zinc-950 rounded-2xl p-4 font-mono text-xs text-zinc-300 border border-zinc-800 group">
                  <button
                    onClick={() => copyToClipboard(getRequestCodeSnippet())}
                    className="absolute top-3 right-3 p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 text-[10px]"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <pre className="overflow-x-auto custom-scrollbar leading-relaxed whitespace-pre-wrap">
                    {getRequestCodeSnippet()}
                  </pre>
                </div>

                {/* Run Sandbox Button */}
                <div className="flex items-center justify-between pt-2">
                  {activeApi.id === 'pricing-catalog' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">SKU Filter:</span>
                      <select
                        value={sandboxSelectedSku}
                        onChange={e => setSandboxSelectedSku(e.target.value)}
                        className="bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-xs font-mono rounded-xl px-3 py-1.5 outline-none focus:border-indigo-500"
                      >
                        <option value="">All Catalog Items</option>
                        {catalogItems.map(item => (
                          <option key={item.id} value={item.code}>{item.code} - {item.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={runSandbox}
                    disabled={sandboxRunning}
                    className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
                  >
                    {sandboxRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                    <span>{sandboxRunning ? 'Executing Test...' : 'Run Test Payload'}</span>
                  </button>
                </div>

                {/* Sandbox Response Output */}
                {sandboxResponse && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">HTTP Response Output</label>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">200 OK</span>
                    </div>
                    <div className="bg-zinc-950 rounded-2xl p-4 font-mono text-xs text-emerald-400 border border-zinc-800 max-h-60 overflow-y-auto custom-scrollbar">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(sandboxResponse, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 rounded-3xl p-12 text-center text-zinc-450">
              <Code size={48} className="mb-4 mx-auto opacity-20" />
              <p className="text-base font-bold">No API selected</p>
              <p className="text-xs">Select an API from the list to view its integration guides and test sandbox.</p>
            </div>
          )}
        </div>
      </SettingsSubNavLayout>
    );
  }

  return (
    <div className="flex flex-col w-full text-left px-6 lg:px-12 py-10 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative z-10">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">API</h3>
              <p className="text-xs text-zinc-450 mt-1">Tenant-scoped master data endpoints and programmatic automation triggers.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Search APIs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              {filteredApis.map(api => {
                const isSelected = api.id === selectedApiId;
                return (
                  <div
                    key={api.id}
                    onClick={() => {
                      setSelectedApiId(api.id);
                      setSandboxResponse(null);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600/5 dark:bg-indigo-500/10 border-indigo-500/30 text-indigo-650 dark:text-indigo-400 font-bold shadow-sm shadow-indigo-500/5' 
                        : 'bg-white/50 dark:bg-white/[0.02] border-zinc-150 dark:border-zinc-800/80 hover:border-zinc-350 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-zinc-100 dark:bg-white/5 text-zinc-450 dark:text-zinc-500'}`}>
                        <api.icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{api.name}</p>
                        <p className="text-[10px] font-mono text-zinc-450 dark:text-zinc-500 mt-0.5">{api.endpoint}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className={isSelected ? 'text-indigo-500' : 'text-zinc-400'} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {activeApi && (
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 dark:border-zinc-850 pb-5 gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                      activeApi.method === 'GET' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                      activeApi.method === 'POST' ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {activeApi.method}
                    </span>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{activeApi.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-450 mt-1">{activeApi.description}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Request Endpoint</label>
                <div className="flex items-center justify-between bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                  <span>{API_BASE_URL}{activeApi.endpoint}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
