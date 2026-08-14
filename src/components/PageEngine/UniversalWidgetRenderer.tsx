import React from 'react';
import { FormRenderer } from '../Builders';
import { WorkQueue } from '../WorkQueue';
import { 
  Database, Globe, Cpu, ShieldCheck, Workflow, 
  HelpCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export interface UniversalWidgetProps {
  widget: {
    id: string;
    type: string;
    title?: string;
    subtitle?: string;
    properties?: Record<string, any>;
    formFields?: any[];
    buttonLabel?: string;
  };
  mode?: 'site' | 'workspace';
}

export const UniversalWidgetRenderer: React.FC<UniversalWidgetProps> = ({
  widget,
  mode: _mode = 'workspace'
}) => {

  switch (widget.type) {
    case 'standalone-form':
    case 'custom_form':
      return (
        <div className="relative group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden">
          {/* Global Component Hover Badge */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md text-white p-1 rounded-xl shadow-lg border border-zinc-700 text-[10px] font-bold">
            <span className="px-2 py-0.5 text-emerald-400 bg-emerald-950/60 rounded-md">Global Library Form</span>
            <button 
              onClick={() => toast.info('Launching in-context builder...')}
              className="px-2 py-0.5 hover:bg-zinc-800 rounded-md transition-colors"
            >
              Edit Inline
            </button>
          </div>

          <FormRenderer
            title={widget.title}
            subtitle={widget.subtitle || widget.properties?.subtitle}
            fields={widget.formFields || widget.properties?.fields || [
              { id: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
              { id: 'email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
              { id: 'comments', label: 'Comments / Inquiry', type: 'textarea', required: false, colSpan: 12 }
            ]}
            onSubmit={() => { toast.success('Form entry submitted!'); }}
            submitButtonText={widget.buttonLabel || 'Submit Request'}
          />
        </div>
      );


    case 'stats-grid':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Records', value: '1,420', icon: Database, color: 'text-indigo-500 bg-indigo-500/10' },
            { label: 'Submissions', value: '384', icon: Globe, color: 'text-emerald-500 bg-emerald-500/10' },
            { label: 'AI Operations', value: '89', icon: Cpu, color: 'text-purple-500 bg-purple-500/10' },
            { label: 'System Uptime', value: '99.9%', icon: ShieldCheck, color: 'text-amber-500 bg-amber-500/10' }
          ].map((stat, i) => (
            <div key={i} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{stat.label}</span>
                <p className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">{stat.value}</p>
              </div>
              <div className={cn("p-2.5 rounded-xl", stat.color)}>
                <stat.icon size={18} />
              </div>
            </div>
          ))}
        </div>
      );

    case 'active-workflows':
      return (
        <div className="h-full flex flex-col p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-3">
            <Workflow size={16} className="text-indigo-500" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">{widget.title || 'Active Workflows'}</h3>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {[
              { name: 'Customer Onboarding', status: 'Running', queue: 24 },
              { name: 'Vendor Approval', status: 'Running', queue: 8 },
              { name: 'Support Escalation', status: 'Healthy', queue: 3 }
            ].map((wf, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-xs">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{wf.name}</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 rounded-md">
                  {wf.status} ({wf.queue})
                </span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'work-queue':
      return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
          <WorkQueue />
        </div>
      );

    case 'rich-text':
      return (
        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm prose dark:prose-invert max-w-none text-xs text-zinc-700 dark:text-zinc-300">
          {widget.title && <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-2">{widget.title}</h3>}
          <div dangerouslySetInnerHTML={{ __html: widget.properties?.content || '<p>Configure HTML or text announcement content.</p>' }} />
        </div>
      );

    case 'hero':
      return (
        <div className="p-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-3xl shadow-lg text-center space-y-4">
          <h2 className="text-3xl font-black">{widget.title || 'Welcome to Aurora Platform'}</h2>
          <p className="text-sm text-indigo-100 max-w-xl mx-auto">{widget.subtitle || 'Empowering operational excellence with modular low-code engines.'}</p>
          <div className="pt-2">
            <button className="px-6 py-2.5 bg-white text-indigo-600 font-bold text-xs rounded-xl shadow-md hover:bg-indigo-50 transition-all">
              {widget.buttonLabel || 'Explore Portal'}
            </button>
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-4">
            <HelpCircle size={16} className="text-indigo-500" />
            <span>Frequently Asked Questions</span>
          </h3>
          {[
            { q: 'How do I embed a form?', a: 'Use the Form Library to pick or build a form, then drop the Standalone Form widget onto your page.' },
            { q: 'Can I export custom mobile apps?', a: 'Yes, open Site Builder settings to export branded PWA, Android, and iOS app manifests.' }
          ].map((item, i) => (
            <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-xs">
              <p className="font-semibold text-zinc-900 dark:text-white mb-1">Q: {item.q}</p>
              <p className="text-zinc-500 dark:text-zinc-400">{item.a}</p>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-500">
          Widget: <span className="font-bold text-zinc-800 dark:text-zinc-200">{widget.title || widget.type}</span>
        </div>
      );
  }
};
