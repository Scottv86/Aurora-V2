import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { SearchRenderer } from '../../components/Search/SearchRenderer';
import { SearchBuilder } from '../../components/Builders/SearchBuilder/SearchBuilder';
import { Button } from '../../components/UI/Primitives';
import { fetchSavedSearch } from '../../services/searchService';
import { SavedSearchEntity } from '../../types/searchBuilder';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export const SearchRunnerPage: React.FC = () => {
  const { searchId, slug } = useParams<{ searchId?: string; slug?: string }>();
  const targetId = searchId || slug;
  const navigate = useNavigate();

  const { tenant, setBreadcrumbOverride, isBuilderFullscreen } = usePlatform();
  const { session } = useAuth();
  const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token') || 'dev-token';
  const tenantId = tenant?.id || 't1';

  const [searchDef, setSearchDef] = useState<SavedSearchEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  const loadDefinition = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const def = await fetchSavedSearch(targetId, tenantId, token);
      setSearchDef(def);
      if (def?.name && setBreadcrumbOverride) {
        setBreadcrumbOverride(targetId, def.name);
      }
    } catch (err) {
      console.error('Failed to load search:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDefinition();
  }, [targetId, tenantId, token]);

  return (
    <div className={cn(
      "flex flex-col w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative transition-all duration-300 font-sans",
      isBuilderFullscreen ? "h-screen" : "h-[calc(100vh-4rem)]"
    )}>
      {/* Top Header Bar */}
      <div className="px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/workspace/searches')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 transition-colors"
            title="Back to Searches Directory"
          >
            <ArrowLeft size={14} />
            <span>Searches</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                {searchDef?.name || (loading ? 'Loading search...' : 'Search View')}
              </h2>
              {searchDef?.category && (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                  {searchDef.category}
                </span>
              )}
            </div>
            {searchDef?.description && (
              <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-xl">{searchDef.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setIsBuilderOpen(true)}
            className="gap-1.5 text-xs text-zinc-700 dark:text-zinc-300"
            title="Edit search in Studio"
          >
            <Settings2 size={13} />
            <span>Configure</span>
          </Button>
        </div>
      </div>

      {/* Main Search View */}
      <div className="flex-1 overflow-hidden p-6">
        <SearchRenderer
          searchId={targetId}
          initialSearch={searchDef}
          displayMode="full"
          className="h-full"
        />
      </div>

      {/* In-Context Studio Builder */}
      {isBuilderOpen && (
        <SearchBuilder
          initialSearch={searchDef}
          onClose={() => setIsBuilderOpen(false)}
          onSaveSuccess={(saved) => {
            setSearchDef(saved);
            setIsBuilderOpen(false);
          }}
        />
      )}
    </div>
  );
};
