import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ArrowRight, Sliders, 
  Plus, Lock, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/UI/PageHeader';
import { EmptyState } from '../../components/UI/EmptyState';
import { SearchBuilder } from '../../components/Builders/SearchBuilder/SearchBuilder';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { SavedSearchEntity } from '../../types/searchBuilder';
import { fetchSavedSearches } from '../../services/searchService';
import { cn } from '../../lib/utils';

export const SearchesDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant, isBuilderFullscreen, setIsBuilderFullscreen } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';

  useEffect(() => {
    return () => {
      if (setIsBuilderFullscreen) setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);

  const [searches, setSearches] = useState<SavedSearchEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const loadSearches = async () => {
    setLoading(true);
    try {
      const data = await fetchSavedSearches(tenantId, token);
      setSearches(data || []);
    } catch (err) {
      console.error('Failed to load searches:', err);
      setSearches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSearches();
  }, [tenantId, token]);

  // Categories extracted from searches
  const categories = useMemo(() => {
    const set = new Set<string>();
    searches.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return ['All', ...Array.from(set)];
  }, [searches]);

  // Filtered searches
  const filteredSearches = useMemo(() => {
    return searches.filter(s => {
      if (selectedCategory !== 'All' && s.category !== selectedCategory) return false;
      if (keyword.trim()) {
        const q = keyword.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = (s.description || '').toLowerCase().includes(q);
        const matchesCat = (s.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [searches, selectedCategory, keyword]);

  return (
    <div className={cn(
      "flex flex-col w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative transition-all duration-300",
      isBuilderFullscreen ? "h-screen" : "h-[calc(100vh-4rem)]"
    )}>
      {/* Standardized App Header matching Docs & Drive Suite Apps */}
      <PageHeader 
        title={
          <span className="flex items-center gap-2">
            Aurora Searches
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Workspace Suite
            </span>
          </span>
        }
        description="Cross-module self-service searches, parameterized filters, personal presets, and bulk actions"
        icon={Search}
        iconClassName="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus size={16} />
              New Search
            </button>
          </div>
        }
        className="mx-0 mt-0 mb-0"
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-8 custom-scrollbar relative z-10">
        {/* Controls & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between relative z-10">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer",
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Filter Input */}
          <div className="relative w-full md:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search across searches..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all shadow-xs"
            />
          </div>
        </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className="h-44 bg-zinc-100 dark:bg-zinc-900/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredSearches.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={Search}
                title="No Searches Found"
                description={
                  keyword || selectedCategory !== 'All'
                    ? "No searches matched your active category or filter keywords."
                    : "No published searches are available in this workspace yet."
                }
                action={{
                  label: "Create First Search",
                  onClick: () => setIsBuilderOpen(true)
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredSearches.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/workspace/searches/${item.id}`)}
                  className="group p-5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl transition-all shadow-md hover:shadow-xl hover:border-indigo-500/50 cursor-pointer flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110">
                          <Search size={18} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            {item.category || 'Operations'}
                          </span>
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                            {item.targetModuleIds?.length || 0} modules
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.allowedRoleIds && item.allowedRoleIds.length > 0 && (
                          <span className="text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1" title={`Restricted to: ${item.allowedRoleIds.join(', ')}`}>
                            <Lock size={10} />
                            <span>Restricted</span>
                          </span>
                        )}
                        <ChevronRight size={18} className="text-zinc-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.description || 'Federated cross-module search with customizable filter controls and dynamic columns.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                      <Sliders size={11} />
                      <span>{item.searchConfig?.exposedControls?.length || 0} filters</span>
                    </div>

                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                      <span>Run Search</span>
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      {/* Builder Modal */}
      {isBuilderOpen && (
        <SearchBuilder
          onClose={() => setIsBuilderOpen(false)}
          onSaveSuccess={() => {
            setIsBuilderOpen(false);
            loadSearches();
          }}
        />
      )}
    </div>
  );
};
