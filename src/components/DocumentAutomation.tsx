import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { PageHeader } from './UI/PageHeader';

export const DocumentAutomation = () => {
  const { tenant, isLoading: platformLoading } = usePlatform();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <PageHeader 
        title="Templates"
        description="Create and manage reusable document templates for your platform."
        actions={
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-500/20"
          >
            <Plus size={20} />
            Create Template
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-4">
            <FileText size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Active Templates</span>
          </div>
          <div className="text-4xl font-bold text-zinc-900 dark:text-white">{templates.filter(t => t.status === 'Published').length}</div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Templates ready for generation</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-4">
            <Clock size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Drafts</span>
          </div>
          <div className="text-4xl font-bold text-zinc-900 dark:text-white">{templates.filter(t => t.status === 'Draft').length}</div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">Templates currently in development</p>
        </div>
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-sm dark:shadow-none">
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
};
