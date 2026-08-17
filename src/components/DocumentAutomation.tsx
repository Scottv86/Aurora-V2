import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2,
  Database,
  ArrowRight
} from 'lucide-react';
import { DocumentTemplate } from '../types/platform';
import { DocumentService } from '../services/documentService';
import { TrashService } from '../services/trashService';
import { usePlatform } from '../hooks/usePlatform';
import { DocumentTemplateBuilder } from './DocumentTemplateBuilder';
import { InContextBuilderModal } from './Builders/Common/InContextBuilderModal';
import { Button } from './UI/Primitives';
import { toast } from 'sonner';
import { PageHeader } from './UI/PageHeader';
import { EmptyState } from './UI/EmptyState';
import { motion } from 'motion/react';
import { DeleteConfirmationModal } from './Common/DeleteConfirmationModal';
import { builderCache } from '../utils/builderCache';

export const DocumentAutomation = () => {

  const { tenant, isLoading: platformLoading } = usePlatform();
  const cacheKey = `templates_${tenant?.id || 'default'}`;
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => builderCache.get<DocumentTemplate[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !builderCache.has(cacheKey));
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'drafts'>('all');
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (tenant) {
      loadTemplates();
    }
  }, [tenant]);

  const loadTemplates = async () => {
    if (!builderCache.has(cacheKey)) {
      setLoading(true);
    }
    try {
      if (tenant) {
        const tmpls = await DocumentService.getTemplates(tenant.id);
        setTemplates(tmpls);
        builderCache.set(cacheKey, tmpls);
      }
    } catch (error) {
      console.error("Failed to load templates", error);
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(undefined);
    setIsBuilderOpen(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsBuilderOpen(true);
  };

  const handleDeleteClick = (tmpl: DocumentTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setTemplateToDelete(tmpl);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const tmpl = templateToDelete;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'DOCUMENT_TEMPLATE',
          itemId: tmpl.id,
          title: tmpl.name,
          subtitle: tmpl.description || `Document Template`,
          payload: tmpl
        });
      }
      await DocumentService.deleteTemplate(tenant?.id || 'default', tmpl.id).catch(() => {});
      toast.success('Template moved to Recycling Bin');
      setTemplates(prev => {
        const next = prev.filter(t => t.id !== tmpl.id);
        builderCache.set(cacheKey, next);
        return next;
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setIsDeleting(false);
      setTemplateToDelete(null);
    }
  };


  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;
      if (activeTab === 'published') return t.status === 'Published';
      if (activeTab === 'drafts') return t.status === 'Draft';
      return true;
    });
  }, [templates, searchQuery, activeTab]);


  if (isBuilderOpen) {
    return (
      <DocumentTemplateBuilder
        template={selectedTemplate}
        onSave={() => {
          setIsBuilderOpen(false);
          loadTemplates();
        }}
        onCancel={() => setIsBuilderOpen(false)}
      />
    );
  }

  if (!tenant && !platformLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-full">
          <Database className="text-zinc-300 dark:text-zinc-700" size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">No Workspace Selected</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mt-2">
            You don't seem to be associated with a workspace. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  const mainGridContent = (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      <PageHeader
        title="Templates"
        description="Create and manage automated PDF and document output templates across platform modules."
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

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
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

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {[
              { id: 'all', label: 'All' },
              { id: 'published', label: 'Published' },
              { id: 'drafts', label: 'Drafts' }
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setActiveTab(mode.id as any)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === mode.id
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? null : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No templates found"
            description="Create and manage automated PDF and document output templates across platform modules."
            action={{
              label: "Create",
              onClick: handleCreateNew
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                onClick={() => handleEdit(t)}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                        <FileText size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          t.status === 'Published'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>

                        <button
                          onClick={(e) => handleDeleteClick(t, e)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                      {t.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {t.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="text-xs text-zinc-500 font-semibold font-mono">
                      Module: {t.moduleId || 'Global'} • v{t.version}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredTemplates.length * 0.03, ease: 'easeOut' }}
              onClick={handleCreateNew}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center min-h-[220px] transition-[border-color,background-color] duration-200 text-center hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create Template
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Design a new document output template.
              </p>
            </motion.div>
          </div>
        )}

        <InContextBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          title={selectedTemplate ? `Edit ${selectedTemplate.name}` : 'Create Document Template'}
          subtitle="Document Output Studio"
          builderContext={{ mode: 'global' }}
        >
          <DocumentTemplateBuilder
            template={selectedTemplate}
            onSave={() => {
              setIsBuilderOpen(false);
              loadTemplates();
            }}
            onCancel={() => setIsBuilderOpen(false)}
          />
        </InContextBuilderModal>

        <DeleteConfirmationModal
          isOpen={Boolean(templateToDelete)}
          onClose={() => setTemplateToDelete(null)}
          onConfirm={confirmDeleteTemplate}
          title="Delete Document Template"
          description="Are you sure you want to delete this document template? It will be moved to the Recycling Bin."
          itemName={templateToDelete?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );

  return mainGridContent;
};

