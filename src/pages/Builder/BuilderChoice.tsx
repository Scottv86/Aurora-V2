import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Database, ArrowRight, LayoutGrid, ArrowLeft, Loader2, HelpCircle } from 'lucide-react';
import { MODULES } from '../../constants/modules';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';

export const BuilderChoice = () => {
  const navigate = useNavigate();
  const { tenant, refreshModules } = usePlatform();
  const { session } = useAuth();
  
  const [showTemplates, setShowTemplates] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectableTemplates = MODULES.filter(t => t.id !== 'people_org');

  const handleInstallTemplate = async (template: any) => {
    if (!tenant?.id) return;
    setLoading(true);
    toast.info(`Installing template: ${template.name}...`);
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      
      const { icon, isEnabled, ...serializableMod } = template;
      
      const response = await fetch(`http://localhost:3001/api/data/modules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenant.id
        },
        body: JSON.stringify({
          ...serializableMod,
          id: undefined,
          templateId: template.id,
          isTemplate: false,
          isGlobal: template.id === 'people_org',
          category: template.category || 'Custom',
          iconName: template.icon?.name || 'Layers',
          enabled: true,
          status: 'ACTIVE'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to install module template');
      }

      const createdMod = await response.json();
      await refreshModules();
      toast.success(`${template.name} template installed successfully!`);
      navigate(`/workspace/settings/builder/${createdMod.id || createdMod.module?.id || ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to install template');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-zinc-500 text-sm font-medium">Provisioning template in your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 space-y-8">
      <div className="flex flex-col space-y-4">
        <button 
          onClick={() => {
            if (showTemplates) {
              setShowTemplates(false);
            } else {
              navigate('/workspace/settings/platform-modules');
            }
          }}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors self-start group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">
            {showTemplates ? 'Back to Choices' : 'Back to Modules'}
          </span>
        </button>

        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
            {showTemplates ? 'Solution Library' : 'Module Builder'}
          </h1>
          <p className="text-zinc-500 text-xs font-medium">
            {showTemplates 
              ? 'Select a preconfigured template to instantly enable it and begin customization.' 
              : 'Choose how you want to build your next module.'}
          </p>
        </div>
      </div>

      {!showTemplates ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate('/workspace/settings/builder/new')}
            className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-emerald-500/50 transition-all hover:shadow-2xl hover:shadow-emerald-500/10 shadow-sm dark:shadow-none"
          >
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Database size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Blank Canvas</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              Take full control and build your module manually. Define fields, set up relationships, and configure workflows step-by-step.
            </p>
            <div className="mt-6 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Start Building</span>
              <ArrowRight size={16} />
            </div>
          </button>

          <button
            onClick={() => setShowTemplates(true)}
            className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-amber-500/50 transition-all hover:shadow-2xl hover:shadow-amber-500/10 shadow-sm dark:shadow-none"
          >
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <LayoutGrid size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Start from Template</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              Choose from a library of prebuilt industry templates and blueprints. Install and customize them to fit your business needs.
            </p>
            <div className="mt-6 flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Browse Library</span>
              <ArrowRight size={16} />
            </div>
          </button>

          <button
            onClick={() => navigate('/workspace/settings/ai-builder')}
            className="group relative p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl text-left hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10 shadow-sm dark:shadow-none"
          >
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
              <Cpu size={32} />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Build with AI</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
              Describe what you want to build in plain English and let our AI generate the data schema, workflows, and automations for you.
            </p>
            <div className="mt-6 flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Get Started</span>
              <ArrowRight size={16} />
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {selectableTemplates.map((template) => {
            const IconComponent = template.icon || HelpCircle;
            return (
              <div
                key={template.id}
                onClick={() => handleInstallTemplate(template)}
                className="group p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:border-indigo-500/50 transition-all hover:shadow-xl shadow-sm dark:shadow-none cursor-pointer flex flex-col h-full justify-between"
              >
                <div>
                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform w-fit mb-4">
                    <IconComponent size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {template.name}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {template.description}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-sm font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 transform duration-300">
                  Install Template <ArrowRight size={16} className="ml-2" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
