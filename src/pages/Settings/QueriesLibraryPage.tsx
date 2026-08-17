import React, { useState, useEffect, useMemo } from 'react';
import { Database, Plus, Search, Trash2, Eye, Layers, ArrowRight, Sliders } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';

import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { QueryBuilder } from '../../components/Builders/QueryBuilder/QueryBuilder';
import { Modal } from '../../components/UI/TabsAndModal';
import { API_BASE_URL } from '../../config';
import { supabase } from '../../lib/supabase';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { TrashService } from '../../services/trashService';
import { builderCache } from '../../utils/builderCache';
import { SavedQueryEntity } from '../../types/queryBuilder';

export const QueriesLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';
  
  const cacheKey = `queries_${tenant?.id || 'default'}`;
  const [queries, setQueries] = useState<SavedQueryEntity[]>(() => {
    const cached = builderCache.get<SavedQueryEntity[]>(cacheKey) || [];
    return cached.filter(q => q.id !== 'query_active_deals_summary' && q.id !== 'query_member_team_distribution');
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<SavedQueryEntity | null>(null);
  const [previewQuery, setPreviewQuery] = useState<SavedQueryEntity | null>(null);
  const [queryToDelete, setQueryToDelete] = useState<SavedQueryEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Preview Results State
  const [previewResults, setPreviewResults] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchQueries = async () => {
    if (!builderCache.has(cacheKey)) {
      setLoading(true);
    }
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      const res = await fetch(`${API_BASE_URL}/api/saved-queries`, {
        headers: {
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${activeToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        const next = Array.isArray(data) ? data : [];
        setQueries(next);
        builderCache.set(cacheKey, next);
      } else {
        if (!builderCache.has(cacheKey)) setQueries([]);
      }
    } catch (err) {
      console.error('Failed to fetch queries:', err);
      if (!builderCache.has(cacheKey)) setQueries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueries();
  }, [tenant?.id, token]);

  // Check if opened from QueryExplorer with prefill SQL
  useEffect(() => {
    const prefill = (location.state as any)?.prefillSql;
    if (prefill && typeof prefill === 'string') {
      setSelectedQuery({
        id: '',
        tenantId: tenant?.id || 't1',
        name: 'New Query View',
        slug: 'new-query-view',
        description: 'Imported from SQL Explorer',
        sql: prefill,
        parameters: [],
        columnsConfig: [],
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsBuilderOpen(true);
      toast.info('Opened in Query Builder with SQL from Explorer');
    }
  }, [location.state]);

  const handleDeleteClick = (e: React.MouseEvent, query: SavedQueryEntity) => {
    e.stopPropagation();
    setQueryToDelete(query);
  };

  const confirmDeleteQuery = async () => {
    if (!queryToDelete) return;
    const q = queryToDelete;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'QUERY',
          itemId: q.id,
          title: q.name,
          subtitle: q.description || `Query: ${q.name}`,
          payload: q
        });
      }
      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      await fetch(`${API_BASE_URL}/api/saved-queries/${q.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': tenantId,
          'Authorization': `Bearer ${activeToken}`
        }
      }).catch(() => {});
      toast.success('Query moved to Recycling Bin');
      setQueries(prev => {
        const next = prev.filter(item => item.id !== q.id);
        builderCache.set(cacheKey, next);
        return next;
      });
    } catch (err) {
      toast.error('Failed to delete query');
    } finally {
      setIsDeleting(false);
      setQueryToDelete(null);
    }
  };

  const handlePreviewClick = async (e: React.MouseEvent, query: SavedQueryEntity) => {
    e.stopPropagation();
    setPreviewQuery(query);
    setPreviewResults([]);
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      let executableSql = query.sql;
      (query.parameters || []).forEach(p => {
        const val = p.defaultValue ?? '';
        const regex = new RegExp(`:${p.name}\\b`, 'g');
        const escaped = String(val).replace(/'/g, "''");
        executableSql = executableSql.replace(regex, `'${escaped}'`);
      });

      const { data: sessData } = await supabase.auth.getSession();
      const activeToken = sessData?.session?.access_token || token;
      const res = await fetch(`${API_BASE_URL}/api/query-explorer/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`,
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({ query: executableSql })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      setPreviewResults(Array.isArray(data.rows) ? data.rows : (Array.isArray(data.results) ? data.results : []));
    } catch (err: any) {
      setPreviewError(err.message || 'Execution error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedQuery({
      id: '',
      tenantId: tenant?.id || 't1',
      name: 'Untitled Query View',
      slug: 'untitled-query-view',
      description: '',
      sql: `-- Write your SQL query here\nSELECT * FROM workspaces LIMIT 10;`,
      parameters: [],
      columnsConfig: [],
      status: 'PUBLISHED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsBuilderOpen(true);
  };

  const filteredQueries = useMemo(() => {
    return queries.filter(q => {
      const matchesSearch = q.name.toLowerCase().includes(search.toLowerCase()) ||
                            (q.description && q.description.toLowerCase().includes(search.toLowerCase())) ||
                            (q.category && q.category.toLowerCase().includes(search.toLowerCase())) ||
                            (q.tags && q.tags.some(t => t.toLowerCase().includes(search.toLowerCase())));
      if (filter === 'published') return matchesSearch && q.status === 'PUBLISHED';
      if (filter === 'draft') return matchesSearch && q.status === 'DRAFT';
      return matchesSearch;
    });
  }, [queries, search, filter]);

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Modules, Forms, Queues, Sites */}
      <PageHeader
        title="Queries"
        description="Centralized hub for authoring, parameterizing, and managing reusable dataset queries across your workspace."
        actions={
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Search & Scope Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search queries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

        {/* Query Cards Grid or Empty State */}
        {loading ? null : filteredQueries.length === 0 ? (
          <EmptyState
            icon={Database}
            title={search ? "No queries match your search" : "No queries created yet"}
            description={
              search 
                ? "Try searching for a different keyword or clear your search query." 
                : "Create a blank dataset query, configure dynamic parameters, and reuse them across your platform."
            }
            action={{
              label: "Create Query",
              onClick: handleCreateNew
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQueries.map((query, i) => (
              <motion.div
                key={query.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                onClick={() => {
                  setSelectedQuery(query);
                  setIsBuilderOpen(true);
                }}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <Database size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          query.status === 'PUBLISHED'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {query.status}
                        </span>

                        <button
                          onClick={(e) => handlePreviewClick(e, query)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Quick Run / Preview"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={(e) => handleDeleteClick(e, query)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Query"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                      {query.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {query.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <Sliders size={13} className="text-zinc-400" />
                        <span>{query.parameters?.length || 0} Params</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers size={13} className="text-zinc-400" />
                        <span>{query.columnsConfig?.length || 0} Columns</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Dashed Create Card matching Forms, Queues, Modules */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredQueries.length * 0.03, ease: 'easeOut' }}
              onClick={handleCreateNew}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl transition-[border-color,background-color] duration-200 cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px] hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create Query View
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Add a new parameterized dataset or SQL view.
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* Full Screen Query Builder Studio */}
      {isBuilderOpen && (
        <QueryBuilder
          initialQuery={selectedQuery}
          onClose={() => {
            setIsBuilderOpen(false);
            setSelectedQuery(null);
            fetchQueries();
          }}
          onSaveSuccess={() => {
            fetchQueries();
          }}
        />
      )}

      {/* Quick Preview Modal */}
      {previewQuery && (
        <Modal
          isOpen={Boolean(previewQuery)}
          onClose={() => setPreviewQuery(null)}
          title={`Quick Test: ${previewQuery.name}`}
        >
          <div className="space-y-4 p-4">
            <div className="p-3 bg-zinc-950 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto border border-zinc-800">
              <pre>{previewQuery.sql}</pre>
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-8 text-zinc-400 text-xs">
                <span>Running query inside sandbox...</span>
              </div>
            ) : previewError ? (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                <p className="font-bold">Execution Error</p>
                <p className="font-mono mt-1">{previewError}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                  <span>Results ({previewResults.length} records)</span>
                </div>
                {previewResults.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-4 text-center">No rows returned for default parameters.</p>
                ) : (
                  <div className="max-h-64 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                        <tr>
                          {Object.keys(previewResults[0]).map(col => (
                            <th key={col} className="px-3 py-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {previewResults.map((r, i) => (
                          <tr key={i} className="hover:bg-zinc-900/50">
                            {Object.keys(previewResults[0]).map(col => (
                              <td key={col} className="px-3 py-2 whitespace-nowrap text-zinc-300">
                                {typeof r[col] === 'object' ? JSON.stringify(r[col]) : String(r[col])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setPreviewQuery(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const q = previewQuery;
                  setPreviewQuery(null);
                  setSelectedQuery(q);
                  setIsBuilderOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Edit in Full Builder
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {queryToDelete && (
        <DeleteConfirmationModal
          isOpen={Boolean(queryToDelete)}
          onClose={() => setQueryToDelete(null)}
          onConfirm={confirmDeleteQuery}
          title={`Delete "${queryToDelete.name}"`}
          description="Are you sure you want to delete this saved query? Any Dashboards, Work Queues, or Automations depending on this dataset may stop functioning."
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default QueriesLibraryPage;
