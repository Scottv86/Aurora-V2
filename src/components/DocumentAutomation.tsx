import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock,
  Zap,
  Copy,
  Trash2,
  Edit2,
  Filter,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DocumentTemplate } from '../types/platform';
import { DocumentService } from '../services/documentService';
import { usePlatform } from '../hooks/usePlatform';
import { DocumentTemplateBuilder } from './DocumentTemplateBuilder';
import { InContextBuilderModal } from './Builders/Common/InContextBuilderModal';
import { Button } from './UI/Primitives';
import { toast } from 'sonner';
import { PageHeader } from './UI/PageHeader';

export const DocumentAutomation = () => {

  const location = useLocation();
  const isSettingsMode = location.pathname.startsWith('/workspace/settings');
  const { tenant, isLoading: platformLoading } = usePlatform();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'drafts'>('all');

  useEffect(() => {
    if (tenant) {
      loadTemplates();
    }
  }, [tenant]);

  const loadTemplates = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const tmpls = await DocumentService.getTemplates(tenant.id);
      setTemplates(tmpls);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
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

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;
    toast.success('Template deleted');
    setTemplates(prev => prev.filter(t => t.id !== id));
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

  const mainContent = (
    <div className="space-y-8 text-left w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/40 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-4">
            <FileText size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Active Templates</span>
          </div>
          <div className="text-4xl font-bold text-zinc-900 dark:text-white">{templates.filter(t => t.status === 'Published').length}</div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Templates ready for generation</p>
        </div>
        <div className="bg-white/40 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
            <Clock size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Drafts</span>
          </div>
          <div className="text-4xl font-bold text-zinc-900 dark:text-white">{templates.filter(t => t.status === 'Draft').length}</div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Templates currently in development</p>
        </div>
        <div className="bg-white/40 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-4">
            <Zap size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Auto-Generated</span>
          </div>
          <div className="text-4xl font-bold text-zinc-900 dark:text-white">1,284</div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Documents generated this month</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm dark:shadow-none"
            />
          </div>
          <div className="flex gap-3">
            <button className="p-2.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all">
              <Filter size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Template</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Module</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Version</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading templates...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTemplates.length > 0 ? (
                filteredTemplates.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl group-hover:bg-indigo-500/10 transition-colors">
                          <FileText className="text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t.name}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                        {t.moduleId || 'Global'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        t.status === 'Published' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                        t.status === 'Draft' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" :
                        "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20"
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">v{t.version}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => handleEdit(t)}
                          className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all">
                          <Copy size={16} />
                        </button>
                        <button className="p-2 text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-full">
                        <FileText className="text-zinc-300 dark:text-zinc-600" size={40} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No templates found</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Get started by creating your first document template.</p>
                      </div>
                      <button
                        onClick={handleCreateNew}
                        className="mt-2 flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold"
                      >
                        <Plus size={18} />
                        Create First Template
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (isSettingsMode) {
    return (
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
              <span>Create Template</span>
            </Button>
          }
        />

        <div className="p-6 lg:p-12 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
              {(['all', 'published', 'drafts'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setActiveTab(mode)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    activeTab === mode
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-3" />
              <p className="text-xs font-semibold">Loading templates...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => handleEdit(t)}
                  className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
                >
                  <div>
                    <div className="relative z-10 flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        <FileText size={24} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          t.status === 'Published'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {t.status}
                        </span>

                        <button
                          onClick={(e) => handleDeleteTemplate(t.id, e)}
                          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-1.5">
                        {t.name}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3 line-clamp-2">
                        {t.description || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                        <span>Module: {t.moduleId || 'Global'}</span>
                        <span>v{t.version}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                    <span className="flex items-center gap-2">
                      Configure Template Studio →
                    </span>
                  </div>
                </div>
              ))}

              <div
                onClick={handleCreateNew}
                className="group p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px]"
              >
                <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-all mb-3">
                  <Plus size={24} />
                </div>
                <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Create Template
                </span>
                <span className="text-xs text-zinc-400 mt-1">
                  Design a new document template
                </span>
              </div>
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

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <PageHeader 
        title="Templates"
        description="Create and manage reusable document templates for your platform."
        actions={
          <Button
            onClick={handleCreateNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Template</span>
          </Button>
        }
      />
      {mainContent}
    </div>
  );
};

