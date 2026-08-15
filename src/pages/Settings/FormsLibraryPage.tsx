import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, Eye, Layers, ArrowRight } from 'lucide-react';



import { FormEntity } from '../../types/platform';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { InContextBuilderModal } from '../../components/Builders/Common/InContextBuilderModal';
import { DependencyDrawer } from '../../components/Builders/Common/DependencyDrawer';
import { ShareEmbedModal } from '../../components/Builders/Common/ShareEmbedModal';
import { FormBuilder } from '../../components/Builders/FormBuilder/FormBuilder';
import { FormRenderer } from '../../components/Builders/FormBuilder/FormRenderer';
import { Modal } from '../../components/UI/TabsAndModal';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../config';
import { usePlatform } from '../../hooks/usePlatform';
import { motion } from 'motion/react';

export const FormsLibraryPage: React.FC = () => {
  const { tenant, modules } = usePlatform();
  const [forms, setForms] = useState<FormEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'global' | 'module'>('all');
  
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormEntity | null>(null);
  const [previewForm, setPreviewForm] = useState<FormEntity | null>(null);
  const [shareForm, setShareForm] = useState<FormEntity | null>(null);
  const [depForm, setDepForm] = useState<FormEntity | null>(null);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/forms`, {
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setForms(data);
      } else {
        setForms([
          {
            id: 'form_contact',
            tenantId: tenant?.id || 't1',
            name: 'Standard Contact & Inquiry Form',
            description: 'Public intake form for general customer inquiries.',
            isGlobal: true,
            version: 1,
            status: 'PUBLISHED',
            schema: {
              layout: [
                { id: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
                { id: 'email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
                { id: 'subject', label: 'Inquiry Subject', type: 'text', required: true, colSpan: 12 },
                { id: 'message', label: 'Message Body', type: 'textarea', required: true, colSpan: 12 }
              ]
            }
          },
          {
            id: 'form_support',
            tenantId: tenant?.id || 't1',
            name: 'Customer Support Ticket Intake',
            description: 'Priority support request form for logged-in users.',
            isGlobal: true,
            version: 2,
            status: 'PUBLISHED',
            schema: {
              layout: [
                { id: 'user', label: 'User Email', type: 'email', required: true, colSpan: 6 },
                { id: 'priority', label: 'Severity Level', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], required: true, colSpan: 6 },
                { id: 'issue', label: 'Issue Description', type: 'textarea', required: true, colSpan: 12 }
              ]
            }
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch forms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [tenant?.id]);

  const handleDeleteForm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/forms/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenant?.id || '' }
      });
      toast.success('Form deleted successfully');
      setForms(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      toast.error('Failed to delete form');
    }
  };

  // Combine standalone forms with custom module form layouts
  const allForms = React.useMemo(() => {
    const moduleForms: FormEntity[] = (modules || []).flatMap((mod: any) => {
      const items: FormEntity[] = [];
      if (mod.layout && mod.layout.length > 0) {
        items.push({
          id: `mod_form_${mod.id}`,
          tenantId: tenant?.id || 't1',
          name: `${mod.name} Form`,
          description: `Primary data intake form for ${mod.name} module.`,
          isGlobal: false,
          moduleId: mod.id,
          moduleName: mod.name,
          version: 1,
          status: 'PUBLISHED',
          schema: { layout: mod.layout }
        });
      }
      if (mod.config?.forms && Array.isArray(mod.config.forms)) {
        mod.config.forms.forEach((cf: any, i: number) => {
          items.push({
            id: cf.id || `mod_subform_${mod.id}_${i}`,
            tenantId: tenant?.id || 't1',
            name: cf.name || `${mod.name} Custom Form #${i + 1}`,
            description: cf.description || `Custom form defined within ${mod.name} module.`,
            isGlobal: false,
            moduleId: mod.id,
            moduleName: mod.name,
            version: cf.version || 1,
            status: cf.status || 'PUBLISHED',
            schema: cf.schema || { layout: cf.fields || [] }
          });
        });
      }
      return items;
    });

    return [...forms, ...moduleForms];
  }, [forms, modules, tenant?.id]);

  const filteredForms = allForms.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || 
                          (f.description && f.description.toLowerCase().includes(search.toLowerCase()));
    if (filter === 'global') return matchesSearch && f.isGlobal;
    if (filter === 'module') return matchesSearch && !f.isGlobal;
    return matchesSearch;
  });


  return (
    <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50 overflow-y-auto">
      {/* Standardized PageHeader matching Modules & Sites */}
      <PageHeader
        title="Forms"
        description="Centralized hub for managing standalone embeddable forms across your workspace, site pages, and portals."
        actions={
          <Button
            onClick={() => {
              setSelectedForm(null);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Form</span>
          </Button>
        }
      />

      {/* Main Content Area */}
      <div className="p-6 lg:p-12 space-y-6">
        {/* Search & Scope Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search forms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-zinc-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-full sm:w-auto">
            {(['all', 'global', 'module'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                  filter === mode
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {mode} Forms
              </button>
            ))}
          </div>
        </div>

        {/* Glassmorphic 3-Column Grid matching Modules & Sites */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent mb-3" />
            <p className="text-xs font-semibold">Loading forms catalog...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form, i) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  setSelectedForm(form);
                  setIsBuilderOpen(true);
                }}
                className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden min-h-[220px]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-all">
                        <FileText size={22} />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                          form.isGlobal
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                        }`}>
                          {form.isGlobal ? 'Global' : 'Module-Bound'}
                        </span>

                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewForm(form); }}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-indigo-500/10 text-zinc-500 hover:text-indigo-500 dark:bg-zinc-800/80 dark:hover:bg-indigo-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Preview Form"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={(e) => handleDeleteForm(e, form.id)}
                          className="p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer"
                          title="Delete Form"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                      {form.name}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {form.description || "No description provided."}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-semibold">
                      <Layers size={13} className="text-zinc-400" />
                      <span>{form.schema?.layout?.length || 0} Fields</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform">
                      Edit in Builder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}


            {/* Dashed Create Card matching Custom Modules */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: filteredForms.length * 0.03 }}
              onClick={() => {
                setSelectedForm(null);
                setIsBuilderOpen(true);
              }}
              className="group p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center text-center min-h-[220px]"
            >
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-all mb-3">
                <Plus size={24} />
              </div>
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                Create Form
              </span>
              <span className="text-xs text-zinc-400 mt-1">
                Add a new standalone embeddable form
              </span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Standalone Builder Modal */}
      <InContextBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        title={selectedForm ? `Edit ${selectedForm.name}` : 'Create New Form'}
        subtitle="Global Platform Form Builder"
        builderContext={{ mode: 'global' }}
      >
        <FormBuilder
          initialForm={selectedForm || undefined}
          builderContext={{
            mode: 'global',
            onSaveSuccess: (_id, savedForm) => {
              toast.success(`Form "${savedForm.name}" saved!`);
              setIsBuilderOpen(false);
              fetchForms();
            }
          }}
        />
      </InContextBuilderModal>

      {/* Preview Modal */}
      {previewForm && (
        <Modal
          isOpen={Boolean(previewForm)}
          onClose={() => setPreviewForm(null)}
          title={`Preview: ${previewForm.name}`}
          size="lg"
        >
          <div className="py-2">
            <FormRenderer
              title={previewForm.name}
              subtitle={previewForm.description}
              fields={previewForm.schema?.layout || []}
              tabs={previewForm.schema?.tabs || []}
              readOnly
            />
          </div>
        </Modal>
      )}

      {/* Share / Export Code Snippet Modal */}
      {shareForm && (
        <ShareEmbedModal
          isOpen={Boolean(shareForm)}
          onClose={() => setShareForm(null)}
          entityName={shareForm.name}
          entityId={shareForm.id}
          entityType="Form"
        />
      )}

      {/* Dependency Lineage Drawer */}
      {depForm && (
        <DependencyDrawer
          isOpen={Boolean(depForm)}
          onClose={() => setDepForm(null)}
          entityName={depForm.name}
          entityType="Form"
          dependencies={[
            { id: 'dep_1', name: 'Public Contact & Support Portal', type: 'site' },
            { id: 'dep_2', name: 'Internal Case Triage Dashboard', type: 'workspace' }
          ]}
        />
      )}
    </div>
  );
};
