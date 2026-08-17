import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  FileText, 
  LayoutGrid, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Sparkles,
  HelpCircle,
  Mail,
  UserCheck,
  Star,
  Calendar,
  Briefcase,
  Database,
  Wand2,
  Loader2,
  Cpu
} from 'lucide-react';
import { ModuleField } from '../../types/platform';
import { usePlatform } from '../../hooks/usePlatform';
import { generateFormWithAI } from '../../services/aiService';
import { toast } from 'sonner';

export interface FormTemplateItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  fieldsCount: number;
  schema: {
    layout: ModuleField[];
  };
}

export const FORM_TEMPLATES: FormTemplateItem[] = [
  {
    id: 'tpl_contact',
    name: 'Standard Contact & Inquiry Form',
    category: 'General & Public',
    description: 'Clean public intake form for inquiries, leads, and visitor communication.',
    icon: Mail,
    fieldsCount: 4,
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
    id: 'tpl_support',
    name: 'Customer Support Ticket Intake',
    category: 'Support & Helpdesk',
    description: 'Priority support request form with severity and issue classification.',
    icon: HelpCircle,
    fieldsCount: 5,
    schema: {
      layout: [
        { id: 'user_email', label: 'Requester Email', type: 'email', required: true, colSpan: 6 },
        { id: 'category', label: 'Issue Category', type: 'select', options: ['Billing', 'Bug Report', 'Feature Request', 'Account Access', 'Other'], required: true, colSpan: 6 },
        { id: 'priority', label: 'Severity Level', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], required: true, colSpan: 6 },
        { id: 'subject', label: 'Summary', type: 'text', required: true, colSpan: 6 },
        { id: 'issue', label: 'Detailed Description', type: 'textarea', required: true, colSpan: 12 }
      ]
    }
  },
  {
    id: 'tpl_onboarding',
    name: 'Client Onboarding & Registration',
    category: 'Operations & Accounts',
    description: 'Intake form for customer onboarding, account setup, and client profile data.',
    icon: UserCheck,
    fieldsCount: 6,
    schema: {
      layout: [
        { id: 'company_name', label: 'Company / Organization Name', type: 'text', required: true, colSpan: 6 },
        { id: 'contact_name', label: 'Primary Contact Person', type: 'text', required: true, colSpan: 6 },
        { id: 'work_email', label: 'Business Email', type: 'email', required: true, colSpan: 6 },
        { id: 'phone', label: 'Phone Number', type: 'text', required: false, colSpan: 6 },
        { id: 'industry', label: 'Industry Vertical', type: 'select', options: ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Other'], required: true, colSpan: 6 },
        { id: 'target_date', label: 'Target Launch Date', type: 'date', required: false, colSpan: 6 }
      ]
    }
  },
  {
    id: 'tpl_feedback',
    name: 'Customer Satisfaction & Feedback Survey',
    category: 'Customer Success',
    description: 'Collect ratings, user feedback, and NPS sentiment from users.',
    icon: Star,
    fieldsCount: 4,
    schema: {
      layout: [
        { id: 'cust_name', label: 'Customer / User Name', type: 'text', required: false, colSpan: 6 },
        { id: 'rating', label: 'Overall Rating', type: 'select', options: ['5 - Excellent', '4 - Good', '3 - Neutral', '2 - Poor', '1 - Very Poor'], required: true, colSpan: 6 },
        { id: 'highlights', label: 'What did you like most?', type: 'textarea', required: false, colSpan: 12 },
        { id: 'improvements', label: 'What can we improve?', type: 'textarea', required: false, colSpan: 12 }
      ]
    }
  },
  {
    id: 'tpl_event',
    name: 'Event Registration & RSVP',
    category: 'Events & Marketing',
    description: 'Attendee registration form for webinars, conferences, or workshops.',
    icon: Calendar,
    fieldsCount: 5,
    schema: {
      layout: [
        { id: 'attendee_name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
        { id: 'attendee_email', label: 'Work Email', type: 'email', required: true, colSpan: 6 },
        { id: 'attendee_role', label: 'Job Title & Organization', type: 'text', required: false, colSpan: 12 },
        { id: 'session_track', label: 'Preferred Track', type: 'select', options: ['Keynote & Strategy', 'Technical & Architecture', 'Design & UX'], required: true, colSpan: 6 },
        { id: 'dietary', label: 'Dietary / Special Needs', type: 'text', required: false, colSpan: 6 }
      ]
    }
  },
  {
    id: 'tpl_job',
    name: 'Job Application & Talent Intake',
    category: 'HR & Recruitment',
    description: 'Intake form for candidate applications and talent pipelines.',
    icon: Briefcase,
    fieldsCount: 6,
    schema: {
      layout: [
        { id: 'applicant_name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
        { id: 'applicant_email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
        { id: 'phone', label: 'Phone Number', type: 'text', required: true, colSpan: 6 },
        { id: 'position', label: 'Position Applied For', type: 'text', required: true, colSpan: 6 },
        { id: 'portfolio', label: 'Portfolio / LinkedIn URL', type: 'text', required: false, colSpan: 12 },
        { id: 'cover_letter', label: 'Cover Letter / Bio', type: 'textarea', required: false, colSpan: 12 }
      ]
    }
  }
];

export interface NewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlank: () => void;
  onSelectTemplate: (template: FormTemplateItem) => void;
  onSelectModule: (module: any) => void;
  onSelectAIGenerated: (generatedForm: { name: string; description: string; schema: { layout: ModuleField[] } }) => void;
}

export const NewFormModal: React.FC<NewFormModalProps> = ({
  isOpen,
  onClose,
  onSelectBlank,
  onSelectTemplate,
  onSelectModule,
  onSelectAIGenerated
}) => {
  const { modules } = usePlatform();
  const [view, setView] = useState<'choices' | 'templates' | 'modules' | 'ai_prompt'>('choices');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setView('choices');
      setSearchQuery('');
      setAiPrompt('');
      setIsGeneratingAI(false);
    }
  }, [isOpen]);

  const filteredTemplates = FORM_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableModules = (modules || []).filter((m: any) => {
    if (!m || !m.name) return false;
    if (m.type === 'PAGE' || m.category === 'Workspace Pages') return false;
    if (m.isGlobal || m.isIntakeTriage || m.config?.isIntakeTriage || m.name === 'Work Distribution' || m.category === 'Intake & Requests') return false;
    if (m.enabled === false) return false;
    return true;
  });

  const filteredModules = availableModules.filter((m: any) =>
    (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for your form.');
      return;
    }

    setIsGeneratingAI(true);
    try {
      toast.info('Generating form schema with AI...');
      const generated = await generateFormWithAI(aiPrompt);
      toast.success(`Form "${generated.name}" generated with ${generated.schema.layout.length} fields!`);
      onSelectAIGenerated(generated);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate form with AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="new-form-modal-container" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Modal Window Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
          >
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                    {view === 'templates' && 'Form Template Library'}
                    {view === 'modules' && 'Generate Form from Module'}
                    {view === 'ai_prompt' && 'Generate Form with AI'}
                    {view === 'choices' && 'Create Form'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium mt-0.5">
                    {view === 'templates' && 'Select a pre-configured form template to customize in the builder.'}
                    {view === 'modules' && 'Choose an active module to generate an intake form from its data schema.'}
                    {view === 'ai_prompt' && 'Describe your form requirements in plain English and let AI generate the schema.'}
                    {view === 'choices' && 'Choose how you want to initiate your new form.'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Views */}
            <div className="p-8 pt-4 overflow-y-auto max-h-[calc(90vh-140px)] relative z-10">
              {view === 'choices' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Choice 1: Blank Form */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onSelectBlank}
                    className="group relative flex flex-col justify-between p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/5"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-200">
                        <FileText size={24} />
                      </div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white mt-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Blank Form
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed font-medium">
                        Start with an empty canvas and build custom fields and layouts step-by-step.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-6 group-hover:translate-x-1 transition-transform">
                      <span>Start blank</span>
                      <ArrowRight size={14} />
                    </div>
                  </motion.div>

                  {/* Choice 2: Pre-built Templates */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('templates')}
                    className="group relative flex flex-col justify-between p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-violet-500/50 dark:hover:border-violet-500/50 hover:bg-violet-50/20 dark:hover:bg-violet-950/20 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-violet-500/5"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-200">
                        <LayoutGrid size={24} />
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                          From Template
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                          {FORM_TEMPLATES.length}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed font-medium">
                        Choose from proven form schemas for contacts, support tickets, and surveys.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 mt-6 group-hover:translate-x-1 transition-transform">
                      <span>Templates</span>
                      <ArrowRight size={14} />
                    </div>
                  </motion.div>

                  {/* Choice 3: Generate from Module */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('modules')}
                    className="group relative flex flex-col justify-between p-6 rounded-3xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-emerald-500/5"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-700/60 flex items-center justify-center text-zinc-700 dark:text-zinc-200 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-200">
                        <Database size={24} />
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          From Module
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {availableModules.length}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed font-medium">
                        Import fields and intake layout automatically from an existing workspace module.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-6 group-hover:translate-x-1 transition-transform">
                      <span>Pick module</span>
                      <ArrowRight size={14} />
                    </div>
                  </motion.div>

                  {/* Choice 4: Generate with AI */}
                  <motion.div
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setView('ai_prompt')}
                    className="group relative flex flex-col justify-between p-6 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 dark:border-indigo-500/40 hover:border-indigo-500/60 hover:bg-indigo-500/20 transition-all cursor-pointer shadow-sm hover:shadow-xl hover:shadow-indigo-500/10"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Cpu size={24} />
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          Build with AI
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          AI
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed font-medium">
                        Describe your form in plain English and let Aurora AI generate the schema and fields for you.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-6 group-hover:translate-x-1 transition-transform">
                      <span>Generate AI</span>
                      <ArrowRight size={14} />
                    </div>
                  </motion.div>
                </div>
              ) : view === 'templates' ? (
                <div>
                  {/* Top Bar for Templates view */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <button
                      onClick={() => setView('choices')}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Options</span>
                    </button>

                    {/* Search box */}
                    <div className="relative w-full max-w-xs">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search form templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Templates Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredTemplates.map((template) => {
                      const IconComp = template.icon || FileText;
                      return (
                        <motion.div
                          key={template.id}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => onSelectTemplate(template)}
                          className="group p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-indigo-500/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <IconComp size={20} />
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                                {template.fieldsCount} Fields
                              </span>
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">
                                {template.category}
                              </span>
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5">
                                {template.name}
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                                {template.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-4 group-hover:translate-x-1 transition-transform">
                            <span>Use this template</span>
                            <ArrowRight size={12} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {filteredTemplates.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-xs text-zinc-500 font-medium">No templates match "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              ) : view === 'modules' ? (
                <div>
                  {/* Top Bar for Modules view */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <button
                      onClick={() => setView('choices')}
                      className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Options</span>
                    </button>

                    {/* Search box */}
                    <div className="relative w-full max-w-xs">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search workspace modules..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Modules Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredModules.map((mod: any) => {
                      const layout = mod.layout || mod.config?.layout || [];
                      const fieldCount = Array.isArray(layout) ? layout.length : 0;
                      return (
                        <motion.div
                          key={mod.id}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => onSelectModule(mod)}
                          className="group p-5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition-all cursor-pointer flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Database size={20} />
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300">
                                {fieldCount} Module Fields
                              </span>
                            </div>

                            <div className="mt-3">
                              <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                                {mod.category || 'Custom Module'}
                              </span>
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mt-0.5">
                                {mod.name}
                              </h4>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                                {mod.description || `Generate a form intake layout bound to the ${mod.name} module schema.`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-4 group-hover:translate-x-1 transition-transform">
                            <span>Generate form from {mod.name}</span>
                            <ArrowRight size={12} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {filteredModules.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="text-xs text-zinc-500 font-medium">
                        {availableModules.length === 0 ? 'No active custom modules found in workspace.' : `No modules match "${searchQuery}"`}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* VIEW 4: AI PROMPT */
                <div className="space-y-5 pt-2">
                  <button
                    onClick={() => setView('choices')}
                    className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Options</span>
                  </button>

                  <div className="p-6 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                      <Wand2 size={16} />
                      <span>Describe Your Form Requirements</span>
                    </div>

                    <textarea
                      rows={4}
                      placeholder="e.g. Create a vendor onboarding form with banking details, tax ID, company registration, primary contact, and service category..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="w-full p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none font-medium placeholder-zinc-400"
                    />

                    {/* Example Suggestion Chips */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Example Prompts:</span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Vendor Onboarding & Tax Details Form',
                          'IT Equipment Checkout & Asset Tagging',
                          'Job Candidate Interview Evaluation Form',
                          'Patient Intake & Medical History Survey',
                          'Event Sponsorship Application'
                        ].map((prompt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAiPrompt(prompt)}
                            className="px-3 py-1 bg-white dark:bg-zinc-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer shadow-xs"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <button
                        onClick={handleGenerateWithAI}
                        disabled={isGeneratingAI || !aiPrompt.trim()}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isGeneratingAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        <span>{isGeneratingAI ? 'Generating Form with AI...' : 'Generate Form with AI'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
