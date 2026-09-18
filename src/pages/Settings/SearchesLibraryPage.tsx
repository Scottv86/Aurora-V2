import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Trash2, Eye, Layers, ArrowRight, 
  Sliders, Database, Layout
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { SearchBuilder } from '../../components/Builders/SearchBuilder/SearchBuilder';
import { QueryBuilder } from '../../components/Builders/QueryBuilder/QueryBuilder';
import { SearchRenderer } from '../../components/Search/SearchRenderer';
import { Modal } from '../../components/UI/TabsAndModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { SavedSearchEntity } from '../../types/searchBuilder';
import { fetchSavedSearches, deleteSavedSearch } from '../../services/searchService';
import { TrashService } from '../../services/trashService';

export const SearchesLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';

  const [searches, setSearches] = useState<SavedSearchEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Modals & Drawers
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<SavedSearchEntity | null>(null);
  const [previewSearch, setPreviewSearch] = useState<SavedSearchEntity | null>(null);
  const [searchToDelete, setSearchToDelete] = useState<SavedSearchEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query Builder Bridge State
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState(false);
  const [queryBuilderPrefill, setQueryBuilderPrefill] = useState<{ sql: string; search: SavedSearchEntity } | null>(null);

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

  const handleCreateNew = () => {
    setSelectedSearch(null);
    setIsBuilderOpen(true);
  };

  const handlePreviewClick = (e: React.MouseEvent, search: SavedSearchEntity) => {
    e.stopPropagation();
    setPreviewSearch(search);
  };

  const handleDeleteClick = (e: React.MouseEvent, search: SavedSearchEntity) => {
    e.stopPropagation();
    setSearchToDelete(search);
  };

  const confirmDelete = async () => {
    if (!searchToDelete) return;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'QUERY',
          itemId: searchToDelete.id,
          title: searchToDelete.name,
          subtitle: searchToDelete.description || `Search: ${searchToDelete.name}`,
          payload: searchToDelete
        });
      }
      await deleteSavedSearch(searchToDelete.id, tenantId, token);
      toast.success('Search moved to Recycling Bin');
      setSearches(prev => prev.filter(s => s.id !== searchToDelete.id));
      setSearchToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete search');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSearches = useMemo(() => {
    return searches.filter(s => {
      const matchesText = !keyword || 
        s.name.toLowerCase().includes(keyword.toLowerCase()) || 
        (s.description || '').toLowerCase().includes(keyword.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(keyword.toLowerCase());
      const matchesFilter = filter === 'all' || 
        (filter === 'published' && s.status === 'PUBLISHED') || 
        (filter === 'draft' && s.status === 'DRAFT');
      return matchesText && matchesFilter;
    });
  }, [searches, keyword, filter]);

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized Full-Width PageHeader matching Queries, Forms, Queues, Sites */}
      <PageHeader
        title="Searches"
        description="Centralized hub for designing, parameterizing, and managing self-service cross-module searches for business users."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate('/workspace/settings/platform-modules/queries-library')}
              className="flex items-center gap-2 text-xs"
            >
              <Database size={15} />
              <span>Query Builder</span>
            </Button>

            <Button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Create</span>
            </Button>
          </div>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Scope Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search searches..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'published', label: 'Published' },
              { id: 'draft', label: 'Drafts' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setFilter(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  filter === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Searches Cards Grid or Empty State */}
        {loading ? null : filteredSearches.length === 0 ? (
          <EmptyState
            icon={Search}
            title={keyword ? "No searches match your keyword" : "No searches configured yet"}
            description={
              keyword 
                ? "Try searching for a different keyword or reset your filters." 
                : "Design your first cross-module search with dynamic filters so business users can query records and files allocated to them without writing SQL."
            }
            action={{
              label: "Create Search",
              onClick: handleCreateNew
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSearches.map((search, i) => {
              const controlsCount = search.searchConfig?.exposedControls?.length || 0;
              const modulesCount = search.targetModuleIds?.length || 0;
              return (
                <motion.div
                  key={search.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                  onClick={() => {
                    setSelectedSearch(search);
                    setIsBuilderOpen(true);
                  }}
                  className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10 flex flex-col h-full justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                          <Search size={22} />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                            search.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {search.status}
                          </span>

                          <button
                            onClick={(e) => handlePreviewClick(e, search)}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="Test Consumer Search"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={(e) => handleDeleteClick(e, search)}
                            className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                            title="Delete Search"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {search.category || 'General'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                        {search.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                        {search.description || "No description provided."}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-semibold">
                        <div className="flex items-center gap-1.5" title="Scoped Modules">
                          <Layers size={13} className="text-zinc-400" />
                          <span>{search.scopeType === 'PLATFORM' ? 'All Modules' : `${modulesCount} Modules`}</span>
                        </div>
                        <div className="flex items-center gap-1.5" title="Active Filter Parameters">
                          <Sliders size={13} className="text-zinc-400" />
                          <span>{controlsCount} Filters</span>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5" title="Default Layout">
                          <Layout size={13} className="text-zinc-400" />
                          <span className="capitalize">{search.searchConfig?.defaultLayout || 'table'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                        Edit in Studio <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Dashed Create Card matching Forms, Queues, Modules */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredSearches.length * 0.03, ease: 'easeOut' }}
              onClick={handleCreateNew}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl transition-[border-color,background-color] duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px] hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create Search View
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Design a new multi-module search with interactive filters.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Full Screen Search Builder Studio */}
      {isBuilderOpen && (
        <SearchBuilder
          initialSearch={selectedSearch}
          onClose={() => {
            setIsBuilderOpen(false);
            setSelectedSearch(null);
            loadSearches();
          }}
          onSaveSuccess={() => {
            loadSearches();
            setIsBuilderOpen(false);
          }}
          onOpenInQueryBuilder={(sql, draft) => {
            setIsBuilderOpen(false);
            setQueryBuilderPrefill({ sql, search: draft });
            setIsQueryBuilderOpen(true);
          }}
        />
      )}

      {/* Full Screen Query Builder Bridge Studio */}
      {isQueryBuilderOpen && (
        <QueryBuilder
          initialQuery={queryBuilderPrefill ? {
            id: queryBuilderPrefill.search.id,
            tenantId: queryBuilderPrefill.search.tenantId,
            name: `${queryBuilderPrefill.search.name} (SQL View)`,
            slug: `${queryBuilderPrefill.search.slug}-sql`,
            description: queryBuilderPrefill.search.description,
            category: queryBuilderPrefill.search.category,
            tags: queryBuilderPrefill.search.tags || [],
            iconName: 'Database',
            sql: queryBuilderPrefill.sql,
            parameters: queryBuilderPrefill.search.parameters || [],
            columnsConfig: queryBuilderPrefill.search.columnsConfig || [],
            status: 'PUBLISHED',
            createdAt: queryBuilderPrefill.search.createdAt,
            updatedAt: queryBuilderPrefill.search.updatedAt
          } : null}
          onClose={() => setIsQueryBuilderOpen(false)}
          onSaveSuccess={() => {
            setIsQueryBuilderOpen(false);
            loadSearches();
          }}
        />
      )}

      {/* Consumer Preview Modal */}
      {previewSearch && (
        <Modal
          isOpen={Boolean(previewSearch)}
          onClose={() => setPreviewSearch(null)}
          size="xl"
          title={`Search Preview: ${previewSearch.name}`}
        >
          <div className="h-[80vh] p-2">
            <SearchRenderer
              initialSearch={previewSearch}
              className="h-full"
            />
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {searchToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(searchToDelete)}
          onClose={() => setSearchToDelete(null)}
          onConfirm={confirmDelete}
          title={`Delete "${searchToDelete.name}"`}
          description="Are you sure you want to delete this business search? Any embedded workspace widgets or reports referencing this search will be affected."
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default SearchesLibraryPage;
