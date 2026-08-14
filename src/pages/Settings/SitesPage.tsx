import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewSiteModal } from '../../components/Modals/NewSiteModal';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion } from 'motion/react';
import { 
  Network, 
  Globe, 
  ExternalLink,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Headphones,
  BookOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { SiteService, Site } from '../../services/siteService';
import { toast } from 'sonner';

const INITIAL_SEED_SITES: Partial<Site>[] = [
  // Internal Sites
  {
    name: 'Main Intranet',
    description: 'Central organizational hub for corporate announcements, company policies, employee directories, and departmental news.',
    category: 'internal',
    type: 'Intranet Hub',
    domain: 'intranet.aurora.internal',
    status: 'active',
    access: 'Authenticated',
    metrics: { metricLabel: 'Active Members', metricValue: '1,240' }
  },
  {
    name: 'Engineering Knowledge Base',
    description: 'Technical documentation, architecture decision records (ADRs), API guidelines, and developer onboarding materials.',
    category: 'internal',
    type: 'Knowledge Base',
    domain: 'docs.eng.aurora.internal',
    status: 'active',
    access: 'Restricted',
    metrics: { metricLabel: 'Articles Published', metricValue: '348' }
  },
  {
    name: 'Operations Handbook',
    description: 'Standard operating procedures, emergency protocols, infrastructure runbooks, and compliance checklists.',
    category: 'internal',
    type: 'Wiki',
    domain: 'ops.aurora.internal',
    status: 'active',
    access: 'Authenticated',
    metrics: { metricLabel: 'Active Readers', metricValue: '512' }
  },
  // External Portals
  {
    name: 'Property Bond Lodgement Portal',
    description: 'Official self-service portal for bond holders & residents to lodge property bonds, track application status, and live chat with support.',
    category: 'external',
    type: 'Customer Portal',
    domain: 'bonds.aurora.app',
    status: 'active',
    access: 'Public',
    metrics: { metricLabel: 'Bonds Lodged', metricValue: '1,840' }
  },
  {
    name: 'Client Support Portal',
    description: 'Customer ticket submission, live chat assistant, knowledge base search, and SLA status tracking dashboard.',
    category: 'external',
    type: 'Customer Portal',
    domain: 'support.aurora-app.com',
    status: 'active',
    access: 'Public',
    metrics: { metricLabel: 'Monthly Tickets', metricValue: '4,120' }
  },
  {
    name: 'Supplier & Vendor Portal',
    description: 'Authenticated vendor center for uploading project proposals, verifying compliance credentials, and submitting invoice details.',
    category: 'external',
    type: 'Vendor Portal',
    domain: 'vendor.aurora.app',
    status: 'active',
    access: 'Authenticated',
    metrics: { metricLabel: 'Linked Vendors', metricValue: '120' }
  },
  // Public Sites
  {
    name: 'Product Launch Landing Page',
    description: 'Promotional marketing website for capturing customer pre-registrations, product specifications, and email signups.',
    category: 'public',
    type: 'Landing Page',
    domain: 'launch.aurora.app',
    status: 'active',
    access: 'Public',
    metrics: { metricLabel: 'Monthly Traffic', metricValue: '88K views' }
  }
];

export const SitesPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSites = async () => {
    try {
      setLoading(true);
      let data = await SiteService.getSites();
      
      // Auto-seed demo sites if database has no sites
      if (data.length === 0) {
        toast.info('Seeding default enterprise sites...');
        for (const seed of INITIAL_SEED_SITES) {
          await SiteService.createSite(seed);
        }
        data = await SiteService.getSites();
      }
      
      setSites(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch sites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleDeleteSite = async (e: React.MouseEvent, siteId: string, siteName: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${siteName}"?`)) return;

    try {
      await SiteService.deleteSite(siteId);
      setSites(prev => prev.filter(s => s.id !== siteId));
      toast.success(`Site "${siteName}" deleted.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete site.');
    }
  };

  const handleOpenBuilder = (siteId: string) => {
    navigate(`/workspace/settings/builder/site/${siteId}`);
  };

  // Filter logic
  const filteredSites = sites.filter(site => {
    const matchesCategory = activeTab === 'all' || site.category === activeTab;
    const matchesSearch = searchQuery === '' || 
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesCategory && matchesSearch && matchesStatus;
  });

  const getSiteIcon = (type: string, category: string) => {
    if (type.includes('Customer') || type.includes('Support')) return Headphones;
    if (type.includes('Knowledge') || type.includes('Docs')) return BookOpen;
    if (category === 'public') return Globe;
    return Network;
  };

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50">
        
        {/* Page Header matching Custom Modules Page */}
        <PageHeader 
          title="Sites"
          description="Build, manage, and extend tenant-specific intranet hubs, client-facing submission portals, and public marketing sites."

          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSites}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
                title="Refresh Sites"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-indigo-500/10">
                <Plus size={16} /> Create Site
              </Button>
            </div>
          }
        />

        <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
          
          {/* Category Filter Pills & Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All Sites' },
                { id: 'internal', label: 'Internal Hubs' },
                { id: 'external', label: 'External Portals' },
                { id: 'public', label: 'Public Sites' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-white/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search & Status Filter */}
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                <input
                  type="text"
                  placeholder="Search sites or domains..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none shadow-sm cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          {/* Glassmorphic 3-Column Grid matching Custom Modules */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-3" />
              <p className="text-xs font-semibold">Loading sites & portals from database...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSites.map((site, i) => {
                const SiteIcon = getSiteIcon(site.type || '', site.category);
                return (
                  <motion.div
                    key={site.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleOpenBuilder(site.id)}
                    className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all">
                            <SiteIcon size={22} />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                              site.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                            }`}>
                              {site.status}
                            </span>
                            
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/public/portal/${site.id}`, '_blank'); }}
                              className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                              title="Visit Live Site"
                            >
                              <ExternalLink size={14} />
                            </button>
                            
                            <button
                              onClick={(e) => handleDeleteSite(e, site.id, site.name)}
                              className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                              title="Delete Site"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                          {site.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {site.description || 'No description provided.'}
                        </p>

                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/10">
                          <Globe size={13} className="shrink-0" />
                          <span className="truncate">{site.domain}</span>
                        </div>
                      </div>
                        <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                          <div className="text-xs text-zinc-500 font-semibold font-mono">
                            {site.domain}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                            Edit in Builder <ArrowRight size={14} />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                );
              })}

              {/* Dashed Create Card matching Custom Modules */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: filteredSites.length * 0.03 }}
                onClick={() => setIsModalOpen(true)}
                className="group p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[240px]"
              >
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform mb-3">
                  <Plus size={24} />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">Create Custom Site</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                  Start from scratch, deploy a pre-configured site blueprint, or generate with AI.
                </p>
              </motion.div>
            </div>
          )}

          {filteredSites.length === 0 && !loading && (
            <div className="text-center py-16 text-zinc-500">
              <Sparkles size={32} className="mx-auto mb-3 text-zinc-400 opacity-50" />
              <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">No Sites Found</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                No sites or portals match "{searchQuery}". Create a new site or adjust your search filters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Site Creation Modal (Choices, Templates & AI) */}
      <NewSiteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSiteCreated={() => fetchSites()}
      />
    </LicenseGate>
  );
};
