import { useState } from 'react';
import { Tabs, Modal } from '../../components/UI/TabsAndModal';
import { 
  Network, 
  Globe, 
  ExternalLink,
  Laptop,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Settings,
  Activity,
  Sparkles,
  Lock,
  Eye
} from 'lucide-react';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { PageHeader } from '../../components/UI/PageHeader';
import { toast } from 'sonner';

interface Site {
  id: string;
  name: string;
  description: string;
  category: 'internal' | 'external' | 'public';
  type: string;
  domain: string;
  status: 'active' | 'draft' | 'offline';
  access: 'Public' | 'Authenticated' | 'Restricted' | 'Admin Only';
  metricLabel: string;
  metricValue: string;
  lastUpdated: string;
}

const INITIAL_SITES: Site[] = [
  // Internal Sites
  {
    id: 'site-1',
    name: 'Main Intranet',
    description: 'Central organizational hub for corporate announcements, company policies, employee directories, and departmental news.',
    category: 'internal',
    type: 'Intranet Hub',
    domain: 'intranet.aurora.internal',
    status: 'active',
    access: 'Authenticated',
    metricLabel: 'Active Members',
    metricValue: '1,240',
    lastUpdated: '2 hours ago'
  },

  {
    id: 'site-3',
    name: 'IT Support Wiki & Guides',
    description: 'Technical manuals, systems architectures, standard configurations, and guides for internal hardware and software support.',
    category: 'internal',
    type: 'Wiki',
    domain: 'it-help.aurora.internal',
    status: 'draft',
    access: 'Restricted',
    metricLabel: 'Contributors',
    metricValue: '42',
    lastUpdated: '3 days ago'
  },
  // External Portals
  {
    id: 'site-4',
    name: 'Customer Submission Portal',
    description: 'Configure and review public-facing intake forms, application tracking steps, and feedback portals for active customer segments.',
    category: 'external',
    type: 'Customer Portal',
    domain: '/portal',
    status: 'active',
    access: 'Public',
    metricLabel: 'Forms Published',
    metricValue: '5',
    lastUpdated: 'Just now'
  },
  {
    id: 'site-5',
    name: 'Supplier & Vendor Portal',
    description: 'Authenticated vendor center for uploading project proposals, verifying compliance credentials, and submitting invoice details.',
    category: 'external',
    type: 'Vendor Portal',
    domain: 'vendor.aurora.app',
    status: 'active',
    access: 'Authenticated',
    metricLabel: 'Linked Vendors',
    metricValue: '120',
    lastUpdated: '4 hours ago'
  },
  {
    id: 'site-6',
    name: 'Partner Collaboration Hub',
    description: 'Shared portal for agency partners and affiliate distributors to request marketing collaterals and track joint lead statuses.',
    category: 'external',
    type: 'Partner Hub',
    domain: 'partners.aurora.app',
    status: 'offline',
    access: 'Authenticated',
    metricLabel: 'Active Partners',
    metricValue: '0',
    lastUpdated: '1 week ago'
  },
  // Public Sites
  {
    id: 'site-7',
    name: 'Product Launch Landing Page',
    description: 'Promotional marketing website for capturing customer pre-registrations, product specifications, and email signups.',
    category: 'public',
    type: 'Landing Page',
    domain: 'launch.aurora.app',
    status: 'active',
    access: 'Public',
    metricLabel: 'Monthly Traffic',
    metricValue: '88K views',
    lastUpdated: '10 mins ago'
  },
  {
    id: 'site-8',
    name: 'System Uptime Status Page',
    description: 'Public operations board illustrating server health, latency stats, historical incident records, and maintenance logs.',
    category: 'public',
    type: 'Status Page',
    domain: 'status.aurora.app',
    status: 'active',
    access: 'Public',
    metricLabel: 'Avg. Uptime',
    metricValue: '99.98%',
    lastUpdated: '5 mins ago'
  },
  {
    id: 'site-9',
    name: 'Annual Developer Conference',
    description: 'Event microsite housing schedule tables, speakers lists, location information, and registration tickets for the event.',
    category: 'public',
    type: 'Microsite',
    domain: 'event2026.aurora.app',
    status: 'offline',
    access: 'Public',
    metricLabel: 'Total Signups',
    metricValue: '0',
    lastUpdated: '2 weeks ago'
  }
];

export const SitesPage = () => {
  const [activeTab, setActiveTab] = useState('internal');
  const [sites, setSites] = useState<Site[]>(INITIAL_SITES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Site Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDesc, setNewSiteDesc] = useState('');
  const [newSiteCategory, setNewSiteCategory] = useState<'internal' | 'external' | 'public'>('internal');
  const [newSiteType, setNewSiteType] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [newSiteAccess, setNewSiteAccess] = useState<'Public' | 'Authenticated' | 'Restricted' | 'Admin Only'>('Authenticated');
  const [newSiteStatus, setNewSiteStatus] = useState<'active' | 'draft' | 'offline'>('active');

  const tabs = [
    { id: 'internal', label: 'Internal Sites', icon: Network },
    { id: 'external', label: 'External Portals', icon: Globe },
    { id: 'public', label: 'Public Sites', icon: Laptop },
  ];

  const handleCopyLink = (domain: string, id: string) => {
    const fullUrl = domain.startsWith('/') ? `${window.location.origin}${domain}` : `https://${domain}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    toast.success('Site link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteSite = (id: string, name: string) => {
    setSites(prev => prev.filter(site => site.id !== id));
    toast.success(`"${name}" was deleted successfully.`);
  };

  const handleToggleStatus = (id: string, currentStatus: 'active' | 'draft' | 'offline') => {
    const statusCycle: ('active' | 'draft' | 'offline')[] = ['active', 'draft', 'offline'];
    const nextIndex = (statusCycle.indexOf(currentStatus) + 1) % statusCycle.length;
    const nextStatus = statusCycle[nextIndex];

    setSites(prev => prev.map(site => {
      if (site.id === id) {
        return { ...site, status: nextStatus, lastUpdated: 'Just now' };
      }
      return site;
    }));
    toast.info(`Site status updated to ${nextStatus.toUpperCase()}`);
  };

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName || !newSiteDomain) {
      toast.error('Please enter a Site Name and URL / Domain.');
      return;
    }

    const metricMapping = {
      internal: { label: 'Active Members', value: '1' },
      external: { label: 'Forms Published', value: '1' },
      public: { label: 'Monthly Traffic', value: '0 views' }
    };

    const newSite: Site = {
      id: `site-${Date.now()}`,
      name: newSiteName,
      description: newSiteDesc || 'No description provided.',
      category: newSiteCategory,
      type: newSiteType || (newSiteCategory === 'internal' ? 'Intranet Hub' : newSiteCategory === 'external' ? 'Customer Portal' : 'Landing Page'),
      domain: newSiteDomain,
      status: newSiteStatus,
      access: newSiteAccess,
      metricLabel: metricMapping[newSiteCategory].label,
      metricValue: metricMapping[newSiteCategory].value,
      lastUpdated: 'Just now'
    };

    setSites(prev => [newSite, ...prev]);
    setIsModalOpen(false);
    toast.success(`"${newSiteName}" site created successfully!`);

    // Reset fields
    setNewSiteName('');
    setNewSiteDesc('');
    setNewSiteType('');
    setNewSiteDomain('');
    setNewSiteAccess('Authenticated');
    setNewSiteStatus('active');
  };

  // Filter logic
  const filteredSites = sites.filter(site => {
    const matchesCategory = site.category === activeTab;
    const matchesSearch = site.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          site.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          site.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  // Calculate statistics for active tab
  const activeTabSites = sites.filter(s => s.category === activeTab);
  const totalCount = activeTabSites.length;
  const activeCount = activeTabSites.filter(s => s.status === 'active').length;
  const customDomains = activeTabSites.filter(s => !s.domain.startsWith('/')).length;

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex flex-col w-full px-6 lg:px-12 py-10">
        <PageHeader 
          title="Sites"
          description="Manage your organization's internal hubs, client-facing submission portals, and public marketing microsites. Configure access control, custom domains, and templates."
          tabs={
            <Tabs 
              tabs={tabs} 
              activeTab={activeTab} 
              onChange={setActiveTab} 
              className="border-none"
              firstTabPadding={false}
            />
          }
        />

        {/* Content Area */}
        <div className="flex-1 space-y-8 mt-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
                <Network size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Total Sites</p>
                <h4 className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">{totalCount}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl relative">
                <Activity size={20} />
                <span className="absolute top-3 right-3 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Active & Live</p>
                <h4 className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">{activeCount}</h4>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl">
                <Globe size={20} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">Custom Domains</p>
                <h4 className="text-2xl font-extrabold text-zinc-900 dark:text-white mt-1">{customDomains}</h4>
              </div>
            </div>
          </div>

          {/* Filtering and Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <input 
                  type="text"
                  placeholder="Search sites by name, type or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-200 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {/* Create Button */}
            <button 
              onClick={() => {
                setNewSiteCategory(activeTab as 'internal' | 'external' | 'public');
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-indigo-500/20 active:scale-98 transition-all"
            >
              <Plus size={16} />
              <span>New Site</span>
            </button>
          </div>

          {/* Grid View */}
          {filteredSites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSites.map(site => {
                const isCopied = copiedId === site.id;
                const statusColors = {
                  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
                  draft: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
                  offline: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20 dark:text-zinc-400'
                };
                
                return (
                  <div 
                    key={site.id}
                    className="group relative flex flex-col p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
                  >
                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Card Header */}
                    <div className="flex items-start justify-between relative z-10">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg uppercase tracking-wide">
                        {site.type}
                      </span>
                      
                      {/* Status pill (Interactive: toggles on click for admin settings) */}
                      <button
                        onClick={() => handleToggleStatus(site.id, site.status)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border text-xs font-semibold rounded-full transition-all hover:brightness-95 active:scale-95 ${statusColors[site.status]}`}
                        title="Click to toggle status"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          site.status === 'active' ? 'bg-emerald-500' : site.status === 'draft' ? 'bg-amber-500' : 'bg-zinc-400'
                        }`} />
                        <span className="capitalize">{site.status}</span>
                      </button>
                    </div>

                    {/* Site Info */}
                    <div className="mt-4 flex-1 relative z-10">
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                        {site.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed line-clamp-3 min-h-[3rem]">
                        {site.description}
                      </p>
                    </div>

                    {/* URL Path / Custom Domain (Interactive Copy) */}
                    <div className="mt-4 relative z-10">
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/80 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors">
                        <span className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 font-mono truncate">
                          <Globe size={12} className="text-zinc-400 shrink-0" />
                          {site.domain}
                        </span>
                        <button
                          onClick={() => handleCopyLink(site.domain, site.id)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-md transition-all shrink-0"
                          title="Copy Link"
                        >
                          {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Mini Stats and Access Controls */}
                    <div className="mt-4 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-4 text-xs relative z-10">
                      <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                        {site.access === 'Public' ? <Eye size={12} /> : <Lock size={12} />}
                        <span className="font-medium">{site.access}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-400">{site.metricLabel}: </span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{site.metricValue}</span>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-4 relative z-10">
                      <a 
                        href={site.domain.startsWith('/') ? site.domain : `https://${site.domain}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl transition-all"
                      >
                        <span>Visit Site</span>
                        <ExternalLink size={12} />
                      </a>

                      <button 
                        onClick={() => toast.info(`Configuration settings for "${site.name}" will open in a sidebar soon.`)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all"
                        title="Configure Branding & SEO"
                      >
                        <Settings size={14} />
                      </button>

                      <button 
                        onClick={() => handleDeleteSite(site.id, site.name)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all"
                        title="Delete Site"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/30">
              <Sparkles size={36} className="text-zinc-300 dark:text-zinc-700 mb-3" />
              <h4 className="text-base font-bold text-zinc-900 dark:text-white">No sites found</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center max-w-sm mt-1">
                We couldn't find any sites matching your filters. Create a new one or adjust your search parameters.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Create Site Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Site"
        size="md"
        footer={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-site-form"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all"
            >
              Create Site
            </button>
          </div>
        }
      >
        <form id="create-site-form" onSubmit={handleCreateSite} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['internal', 'external', 'public'] as const).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setNewSiteCategory(cat);
                    // Autofill type suggestions based on category
                    if (cat === 'internal') setNewSiteType('Intranet Hub');
                    else if (cat === 'external') setNewSiteType('Customer Portal');
                    else setNewSiteType('Landing Page');
                  }}
                  className={`py-2 px-3 text-xs font-bold border rounded-xl capitalize transition-all ${
                    newSiteCategory === cat 
                      ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                >
                  {cat === 'internal' ? 'Internal' : cat === 'external' ? 'External' : 'Public'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="site-name" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Site Name
            </label>
            <input 
              id="site-name"
              type="text"
              placeholder="e.g. employee-handbook"
              value={newSiteName}
              onChange={(e) => setNewSiteName(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="site-desc" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              id="site-desc"
              rows={2}
              placeholder="Provide a short summary of this site's purpose..."
              value={newSiteDesc}
              onChange={(e) => setNewSiteDesc(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="site-type" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Site Type
              </label>
              <select
                id="site-type"
                value={newSiteType}
                onChange={(e) => setNewSiteType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-200"
              >
                {newSiteCategory === 'internal' && (
                  <>
                    <option value="Intranet Hub">Intranet Hub</option>
                    <option value="Knowledge Base">Knowledge Base</option>
                    <option value="Wiki">Wiki</option>
                  </>
                )}
                {newSiteCategory === 'external' && (
                  <>
                    <option value="Customer Portal">Customer Portal</option>
                    <option value="Vendor Portal">Vendor Portal</option>
                    <option value="Partner Hub">Partner Hub</option>
                  </>
                )}
                {newSiteCategory === 'public' && (
                  <>
                    <option value="Landing Page">Landing Page</option>
                    <option value="Status Page">Status Page</option>
                    <option value="Microsite">Microsite</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label htmlFor="site-access" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Access Level
              </label>
              <select
                id="site-access"
                value={newSiteAccess}
                onChange={(e) => setNewSiteAccess(e.target.value as any)}
                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-200"
              >
                <option value="Public">Public (Unauthenticated)</option>
                <option value="Authenticated">Authenticated</option>
                <option value="Restricted">Restricted (Invitation only)</option>
                <option value="Admin Only">Admin Only</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="site-domain" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              URL Path / Custom Domain
            </label>
            <input 
              id="site-domain"
              type="text"
              placeholder={newSiteCategory === 'external' ? 'e.g. /portal or portal.mycompany.com' : 'e.g. docs.mycompany.com'}
              value={newSiteDomain}
              onChange={(e) => setNewSiteDomain(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label htmlFor="site-status" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Initial Status
            </label>
            <select
              id="site-status"
              value={newSiteStatus}
              onChange={(e) => setNewSiteStatus(e.target.value as any)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-zinc-800 dark:text-zinc-200"
            >
              <option value="active">Active (Online)</option>
              <option value="draft">Draft (Private Setup)</option>
              <option value="offline">Offline (Maintenance)</option>
            </select>
          </div>
        </form>
      </Modal>
    </LicenseGate>
  );
};

