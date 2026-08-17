import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NewSiteModal } from '../../components/Modals/NewSiteModal';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { motion } from 'motion/react';
import { 
  Network, 
  Globe, 
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Headphones,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { EmptyState } from '../../components/UI/EmptyState';
import { Skeleton } from '../../components/UI/Skeleton';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { SiteService, Site } from '../../services/siteService';
import { toast } from 'sonner';
import { usePlatform } from '../../hooks/usePlatform';
import { TrashService } from '../../services/trashService';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';

export const SitesPage = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const data = await SiteService.getSites();
      setSites(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch sites.');
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent, site: Site) => {
    e.stopPropagation();
    setSiteToDelete(site);
  };

  const confirmDeleteSite = async () => {
    if (!siteToDelete) return;
    const site = siteToDelete;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'SITE',
          itemId: site.id,
          title: site.name,
          subtitle: site.description || `Site: ${site.domain || site.name}`,
          payload: site
        });
      }
      await SiteService.deleteSite(site.id).catch(() => {});
      setSites(prev => prev.filter(s => s.id !== site.id));
      toast.success(`Site "${site.name}" moved to Recycling Bin.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete site.');
    } finally {
      setIsDeleting(false);
      setSiteToDelete(null);
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
              <Button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Create</span>
              </Button>
            </div>
          }
        />

        <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
          
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              {/* Category Pills */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Sites' },
                  { id: 'internal', label: 'Internal' },
                  { id: 'external', label: 'External' },
                  { id: 'public', label: 'Public' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <Skeleton key={n} height={220} variant="rounded" className="rounded-3xl" />
              ))}
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
                    className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden min-h-[240px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <button
                      onClick={(e) => handleDeleteClick(e, site)}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20"
                      title="Delete Site"
                    >
                      <Trash2 size={14} />
                    </button>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all">
                            <SiteIcon size={22} />
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            site.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                          }`}>
                            {site.status || 'Draft'}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                          {site.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {site.description || 'No description provided.'}
                        </p>

                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/10 mt-4">
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
                className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-all text-center hover:bg-indigo-500/[0.01]"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-all mb-3">
                  <Plus size={24} />
                </div>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors">
                  Create Site
                </span>
                <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                  Build an intranet hub, portal, or public web site.
                </p>
              </motion.div>
            </div>
          )}

          {filteredSites.length === 0 && !loading && (
            <EmptyState
              icon={Globe}
              title="No sites deployed"
              description="Build, manage, and deploy tenant intranet hubs, client portals, and public web applications."
              action={{
                label: "Create",
                onClick: () => setIsModalOpen(true)
              }}
            />
          )}
        </div>
      </div>

      {/* New Site Creation Modal (Choices, Templates & AI) */}
      <NewSiteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSiteCreated={() => fetchSites()}
      />

      <DeleteConfirmationModal
        isOpen={Boolean(siteToDelete)}
        onClose={() => setSiteToDelete(null)}
        onConfirm={confirmDeleteSite}
        title="Delete Site"
        description="Are you sure you want to delete this site? It will be moved to the Recycling Bin."
        itemName={siteToDelete?.name}
        isDeleting={isDeleting}
      />
    </LicenseGate>
  );
};
