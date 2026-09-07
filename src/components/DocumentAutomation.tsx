import { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Trash2,
  Database,
  ArrowRight,
  Mail,
  Globe,
  MessageSquare,
  Sparkles,
  Layers
} from 'lucide-react';
import { DocumentTemplate, ContentType } from '../types/platform';
import { DocumentService } from '../services/documentService';
import { TrashService } from '../services/trashService';
import { usePlatform } from '../hooks/usePlatform';
import { DocumentTemplateBuilder } from './DocumentTemplateBuilder';
import { Button } from './UI/Primitives';
import { toast } from 'sonner';
import { PageHeader } from './UI/PageHeader';
import { EmptyState } from './UI/EmptyState';
import { motion } from 'motion/react';
import { DeleteConfirmationModal } from './Common/DeleteConfirmationModal';
import { NewContentModal } from './Modals/NewContentModal';
import { builderCache } from '../utils/builderCache';
import { cn } from '../lib/utils';

const TYPE_CONFIG: Record<ContentType, { label: string; icon: any; color: string; bg: string; border: string; desc: string }> = {
  email: {
    label: 'Email',
    icon: Mail,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    desc: 'Automated notification emails, welcome sequences, and newsletters.'
  },
  letter: {
    label: 'Letter & PDF',
    icon: FileText,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    desc: 'Formal printable contracts, non-disclosure agreements, and invoices.'
  },
  page: {
    label: 'Site Page',
    icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    desc: 'Portal announcement layouts, knowledge snippets, and terms pages.'
  },
  message: {
    label: 'SMS & Message',
    icon: MessageSquare,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    desc: 'Short-form transactional SMS reminders and urgent system alerts.'
  }
};

export const DocumentAutomation = () => {
  const { tenant, isLoading: platformLoading } = usePlatform();
  const cacheKey = `templates_${tenant?.id || 'default'}`;
  const [templates, setTemplates] = useState<DocumentTemplate[]>(() => builderCache.get<DocumentTemplate[]>(cacheKey) || []);
  const [loading, setLoading] = useState(() => !builderCache.has(cacheKey));
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<ContentType>('letter');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | ContentType>('all');
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
      console.error("Failed to load content", error);
      toast.error("Failed to load content items");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTypePicker = () => {
    setIsTypePickerOpen(true);
  };

  const handleSelectTypeToCreate = (type: ContentType) => {
    setSelectedType(type);
    setSelectedTemplate(undefined);
    setIsTypePickerOpen(false);
    setIsBuilderOpen(true);
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setSelectedType(template.type || 'letter');
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
          subtitle: tmpl.description || `Content Item`,
          payload: tmpl
        });
      }
      await DocumentService.deleteTemplate(tenant?.id || 'default', tmpl.id).catch(() => {});
      toast.success('Content moved to Recycling Bin');
      setTemplates(prev => {
        const next = prev.filter(t => t.id !== tmpl.id);
        builderCache.set(cacheKey, next);
        return next;
      });
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    } finally {
      setIsDeleting(false);
      setTemplateToDelete(null);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const itemType = t.type || 'letter';
      const matchesType = activeTypeFilter === 'all' || itemType === activeTypeFilter;
      if (!matchesType) return false;

      const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.metadata?.subject && t.metadata.subject.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      if (activeTab === 'published') return t.status === 'Published';
      if (activeTab === 'drafts') return t.status === 'Draft';
      return true;
    });
  }, [templates, searchQuery, activeTypeFilter, activeTab]);

  if (isBuilderOpen) {
    return (
      <DocumentTemplateBuilder
        template={selectedTemplate}
        initialType={selectedType}
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

  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      <PageHeader
        title="Content"
        description="Create and manage reusable emails, formal PDF letters, portal pages, and SMS notifications across Aurora."
        actions={
          <Button 
            onClick={handleOpenTypePicker} 
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create</span>
          </Button>
        }
      />

      <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
        {/* Type & Search Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Content Type Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTypeFilter('all')}
              className={cn(
                "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                activeTypeFilter === 'all' 
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              All Content
            </button>
            {(['email', 'letter', 'page', 'message'] as ContentType[]).map(type => {
              const cfg = TYPE_CONFIG[type];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => setActiveTypeFilter(type)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer",
                    activeTypeFilter === type 
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <Icon size={13} className={cfg.color} />
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search content..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white placeholder-zinc-400"
              />
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
              {(['all', 'published', 'drafts'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer",
                    activeTab === tab 
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" 
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-3xl bg-zinc-100 dark:bg-zinc-900/50 animate-pulse border border-zinc-200/50 dark:border-zinc-800/50" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={searchQuery || activeTypeFilter !== 'all' ? "No matching content found" : "No content items yet"}
            description={
              searchQuery || activeTypeFilter !== 'all' 
                ? "Try adjusting your search criteria or type filters." 
                : "Create your first email template, formal letter agreement, site page snippet, or SMS notification."
            }
            action={
              <Button
                onClick={handleOpenTypePicker}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus size={16} />
                <span>Create</span>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tmpl, idx) => {
              const itemType: ContentType = tmpl.type || 'letter';
              const cfg = TYPE_CONFIG[itemType] || TYPE_CONFIG.letter;
              const Icon = cfg.icon;

              return (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.03, ease: 'easeOut' }}
                  onClick={() => handleEdit(tmpl)}
                  className="group bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 hover:shadow-xl hover:border-indigo-500/50 transition-all duration-200 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    {/* Card Header: Icon + Type Badge + Actions */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("p-2.5 rounded-2xl border", cfg.bg, cfg.border, cfg.color)}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                            {cfg.label}
                          </span>
                          <span className={cn(
                            "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5",
                            tmpl.status === 'Published'
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          )}>
                            {tmpl.status || 'Draft'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDeleteClick(tmpl, e)}
                          className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Delete Content"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Title & Subject */}
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {tmpl.name}
                    </h3>

                    {tmpl.metadata?.subject && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1 line-clamp-1">
                        Subj: {tmpl.metadata.subject}
                      </p>
                    )}

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {tmpl.description || `Configured ${cfg.label.toLowerCase()} template for automated dispatch and document rendering.`}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                    <div className="flex items-center gap-2">
                      <span>v{tmpl.version || 1}</span>
                      {tmpl.blocks && tmpl.blocks.length > 0 && (
                        <span>• {tmpl.blocks.length} blocks</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                      Edit in Studio <ArrowRight size={14} />
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Create Card in Grid */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: filteredTemplates.length * 0.03, ease: 'easeOut' }}
              onClick={handleOpenTypePicker}
              className="group p-6 border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500/50 rounded-3xl cursor-pointer flex flex-col items-center justify-center min-h-[230px] transition-[border-color,background-color] duration-200 text-center hover:bg-indigo-500/[0.01]"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                <Plus size={24} />
              </div>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                Create
              </span>
              <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                Choose from Email, Letter/PDF, Site Page, or SMS.
              </p>
            </motion.div>
          </div>
        )}

        {/* Content Type Selector Modal */}
        <NewContentModal
          isOpen={isTypePickerOpen}
          onClose={() => setIsTypePickerOpen(false)}
          onSelectType={handleSelectTypeToCreate}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={Boolean(templateToDelete)}
          onClose={() => setTemplateToDelete(null)}
          onConfirm={confirmDeleteTemplate}
          title="Delete Content"
          description="Are you sure you want to delete this content item? It will be moved to the Recycling Bin."
          itemName={templateToDelete?.name}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
};
