import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Layers, 
  LayoutGrid, 
  Cpu, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Loader2, 
  Sparkles, 
  Globe,
  Network,
  BookOpen,
  Headphones,
  Wand2
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { SiteService, Site } from '../../services/siteService';
import { toast } from 'sonner';

interface NewSiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSiteCreated?: (newSite: Site) => void;
}

interface SiteTemplate {
  id: string;
  name: string;
  category: 'internal' | 'external' | 'public';
  type: string;
  description: string;
  icon: React.ElementType;
  pageCount: number;
  pages: any[];
}

const SITE_TEMPLATES: SiteTemplate[] = [
  {
    id: 'tpl-intranet',
    name: 'Corporate Intranet Hub',
    category: 'internal',
    type: 'Intranet Hub',
    description: 'Central organizational hub for corporate announcements, company policies, employee directory, and intake forms.',
    icon: Network,
    pageCount: 3,
    pages: [
      {
        id: 'p-home',
        title: 'Home',
        slug: '/',
        description: 'Main corporate portal overview.',
        isHome: true,
        widgets: [
          { id: 'w-1', type: 'hero', enabled: true, title: 'Welcome to Corporate Intranet', subtitle: 'Central company news, resources, and triage.' },
          { id: 'w-2', type: 'announcements', enabled: true, title: 'Company Bulletins & Updates' }
        ]
      },
      {
        id: 'p-services',
        title: 'Services & Knowledge',
        slug: '/services',
        description: 'Knowledge base and team documentation.',
        isHome: false,
        widgets: [
          { id: 'w-3', type: 'kb_search', enabled: true, title: 'Search Organizational Knowledge Base' }
        ]
      },
      {
        id: 'p-contact',
        title: 'Support & Contact',
        slug: '/contact',
        description: 'IT support ticket intake.',
        isHome: false,
        widgets: [
          { id: 'w-4', type: 'ticket_form', enabled: true, title: 'Submit Support Ticket' }
        ]
      }
    ]
  },
  {
    id: 'tpl-support',
    name: 'Client Support & Ticket Portal',
    category: 'external',
    type: 'Customer Portal',
    description: 'External customer portal with ticket submission, live chat assistant, knowledge base search, and SLA health monitor.',
    icon: Headphones,
    pageCount: 3,
    pages: [
      {
        id: 'p-support-home',
        title: 'Support Center',
        slug: '/',
        description: 'Customer support homepage.',
        isHome: true,
        widgets: [
          { id: 'w-s1', type: 'hero', enabled: true, title: 'Customer Support Portal', subtitle: 'How can we help your team today?' },
          { id: 'w-s2', type: 'kb_search', enabled: true, title: 'Search Knowledge Base' },
          { id: 'w-s3', type: 'status_widget', enabled: true, title: 'Live Service Status' }
        ]
      },
      {
        id: 'p-new-ticket',
        title: 'Submit Ticket',
        slug: '/submit-ticket',
        description: 'Submit technical support ticket.',
        isHome: false,
        widgets: [
          { id: 'w-s4', type: 'ticket_form', enabled: true, title: 'Customer Support Ticket Intake' }
        ]
      },
      {
        id: 'p-status',
        title: 'System Uptime Status',
        slug: '/status',
        description: 'Platform uptime and incident updates.',
        isHome: false,
        widgets: [
          { id: 'w-s5', type: 'status_widget', enabled: true, title: 'Real-time Infrastructure Status' }
        ]
      }
    ]
  },
  {
    id: 'tpl-kb',
    name: 'Engineering Knowledge Base',
    category: 'internal',
    type: 'Knowledge Base',
    description: 'Technical documentation, architecture decision records (ADRs), API guidelines, and developer onboarding materials.',
    icon: BookOpen,
    pageCount: 3,
    pages: [
      {
        id: 'p-eng-home',
        title: 'Developer Portal',
        slug: '/',
        description: 'Engineering docs homepage.',
        isHome: true,
        widgets: [
          { id: 'w-k1', type: 'hero', enabled: true, title: 'Engineering Knowledge Base', subtitle: 'Architecture specs, API references, and developer guidelines.' },
          { id: 'w-k2', type: 'kb_search', enabled: true, title: 'Search Technical Docs' }
        ]
      },
      {
        id: 'p-api-docs',
        title: 'API Specifications',
        slug: '/api-docs',
        description: 'REST and GraphQL API specifications.',
        isHome: false,
        widgets: [
          { id: 'w-k3', type: 'hero', enabled: true, title: 'API & Webhooks Specifications', subtitle: 'Authentication tokens, rate limits, and payload schemas.' }
        ]
      },
      {
        id: 'p-status',
        title: 'Health & Latency',
        slug: '/system-health',
        description: 'Cluster health and latency stats.',
        isHome: false,
        widgets: [
          { id: 'w-k4', type: 'status_widget', enabled: true, title: 'API Latency & Uptime' }
        ]
      }
    ]
  },
  {
    id: 'tpl-landing',
    name: 'Product Launch Landing Page',
    category: 'public',
    type: 'Landing Page',
    description: 'High-impact marketing microsite for capturing customer pre-registrations, product feature highlights, and email signups.',
    icon: Globe,
    pageCount: 2,
    pages: [
      {
        id: 'p-land-home',
        title: 'Product Showcase',
        slug: '/',
        description: 'Product launch landing page.',
        isHome: true,
        widgets: [
          { id: 'w-l1', type: 'hero', enabled: true, title: 'Next-Generation Aurora Platform', subtitle: 'Empower your enterprise with autonomous workflow execution.' },
          { id: 'w-l2', type: 'announcements', enabled: true, title: 'Release Notes & Product Updates' }
        ]
      },
      {
        id: 'p-signup',
        title: 'Request Early Access',
        slug: '/access',
        description: 'VIP early access intake form.',
        isHome: false,
        widgets: [
          { id: 'w-l3', type: 'ticket_form', enabled: true, title: 'Request Enterprise Demo' }
        ]
      }
    ]
  }
];

export const NewSiteModal: React.FC<NewSiteModalProps> = ({ isOpen, onClose, onSiteCreated }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<'choices' | 'blank_form' | 'templates' | 'ai_prompt'>('choices');
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);

  // Blank Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'internal' | 'external' | 'public'>('internal');
  const [type, setType] = useState('Intranet Hub');
  const [domain, setDomain] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Reset modal state when opened
  React.useEffect(() => {
    if (isOpen) {
      setView('choices');
      setName('');
      setDescription('');
      setCategory('internal');
      setType('Intranet Hub');
      setDomain('');
      setAiPrompt('');
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredTemplates = SITE_TEMPLATES.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBlank = async () => {
    if (!name.trim()) {
      toast.error('Please enter a Site Name.');
      return;
    }
    setLoading(true);
    try {
      const generatedDomain = domain.trim() || `${name.toLowerCase().replace(/\s+/g, '-')}.aurora.internal`;
      const newSiteData: Partial<Site> = {
        name,
        description: description || 'Custom enterprise site portal.',
        category,
        type,
        domain: generatedDomain,
        status: 'active',
        access: category === 'public' ? 'Public' : 'Authenticated',
        branding: {
          accentColor: '#3b82f6',
          headerTitle: name,
          footerText: 'Powered by Aurora Platform',
          headerLayout: 'top_right'
        },
        pages: [
          {
            id: `p-home-${Date.now()}`,
            title: 'Home',
            slug: '/',
            description: 'Main portal homepage.',
            isHome: true,
            parentId: null,
            widgets: [
              { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: `Welcome to ${name}`, subtitle: description || 'Portal home page.' }
            ]
          }
        ]
      };

      const created = await SiteService.createSite(newSiteData);
      toast.success(`Site "${created.name}" created successfully!`);
      if (onSiteCreated) onSiteCreated(created);
      onClose();
      navigate(`/workspace/settings/builder/site/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create site.');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallTemplate = async (template: SiteTemplate) => {
    setLoading(true);
    setInstallingId(template.id);
    toast.info(`Provisioning ${template.name}...`);
    try {
      const newSiteData: Partial<Site> = {
        name: template.name,
        description: template.description,
        category: template.category,
        type: template.type,
        domain: `${template.name.toLowerCase().replace(/\s+/g, '-')}.aurora.internal`,
        status: 'active',
        access: template.category === 'public' ? 'Public' : 'Authenticated',
        branding: {
          accentColor: template.category === 'public' ? '#10b981' : template.category === 'external' ? '#f59e0b' : '#3b82f6',
          headerTitle: template.name,
          footerText: 'Powered by Aurora Platform',
          headerLayout: 'top_right'
        },
        pages: template.pages
      };

      const created = await SiteService.createSite(newSiteData);
      toast.success(`${template.name} template deployed successfully!`);
      if (onSiteCreated) onSiteCreated(created);
      onClose();
      navigate(`/workspace/settings/builder/site/${created.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to deploy template.');
    } finally {
      setLoading(false);
      setInstallingId(null);
    }
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for AI site generation.');
      return;
    }
    setAiGenerating(true);
    toast.info('Aurora AI is generating your site schema & layout...');

    setTimeout(async () => {
      try {
        const titleMatch = aiPrompt.match(/(?:for|a|an)\s+([A-Za-z0-9\s]+?)(?:\s+portal|\s+site|\s+hub|\s+page|$)/i);
        const siteName = titleMatch ? `${titleMatch[1].trim()} Portal` : 'AI Generated Portal';
        
        const created = await SiteService.createSite({
          name: siteName,
          description: aiPrompt,
          category: 'internal',
          type: 'AI Custom Portal',
          domain: `${siteName.toLowerCase().replace(/\s+/g, '-')}.aurora.internal`,
          status: 'active',
          access: 'Authenticated',
          branding: {
            accentColor: '#6366f1',
            headerTitle: siteName,
            footerText: 'Powered by Aurora AI Platform',
            headerLayout: 'top_right'
          },
          pages: [
            {
              id: `p-ai-home-${Date.now()}`,
              title: 'Overview',
              slug: '/',
              description: 'AI Generated portal overview.',
              isHome: true,
              parentId: null,
              widgets: [
                { id: `w-ai-1`, type: 'hero', enabled: true, title: siteName, subtitle: aiPrompt },
                { id: `w-ai-2`, type: 'announcements', enabled: true, title: 'Portal Updates & Highlights' }
              ]
            },
            {
              id: `p-ai-intake-${Date.now()}`,
              title: 'Triage & Intake',
              slug: '/intake',
              description: 'AI Form Intake Page.',
              isHome: false,
              parentId: null,
              widgets: [
                { id: `w-ai-3`, type: 'ticket_form', enabled: true, title: 'AI Triage Form' }
              ]
            }
          ]
        });

        toast.success(`AI Portal "${created.name}" generated!`);
        if (onSiteCreated) onSiteCreated(created);
        onClose();
        navigate(`/workspace/settings/builder/site/${created.id}`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to generate AI site.');
      } finally {
        setAiGenerating(false);
      }
    }, 1200);
  };

  if (!isOpen) return null;

  const modalNode = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/75 backdrop-blur-xl transition-opacity"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[32px] shadow-2xl shadow-indigo-500/10 backdrop-blur-2xl overflow-hidden z-10 flex flex-col my-auto max-h-[90vh]"
        >
          {/* Ambient Background Radial Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -ml-20 -mb-20" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                  {view === 'templates' 
                    ? 'Site & Portal Library' 
                    : view === 'blank_form' 
                    ? 'Configure Blank Site' 
                    : view === 'ai_prompt' 
                    ? 'Build Site with AI' 
                    : 'Create New Site or Portal'}
                </h2>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  {view === 'templates' 
                    ? 'Pick a pre-configured site blueprint to deploy into your workspace.' 
                    : view === 'blank_form' 
                    ? 'Set up basic name and domain details to open Site Studio.'
                    : view === 'ai_prompt'
                    ? 'Describe your desired portal vision and let AI architect it.'
                    : 'Choose how you want to architect your next portal and web site.'}
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

          {/* Body content */}
          <div className="px-8 pb-8 flex-1 overflow-y-auto custom-scrollbar relative z-10">
            {/* VIEW 1: CHOICES GRID */}
            {view === 'choices' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                {/* 1. Blank Canvas */}
                <div 
                  onClick={() => setView('blank_form')}
                  className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-emerald-500/30 dark:hover:border-emerald-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        Manual
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start Blank</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Take total control. Build custom pages, widgets, navigation, and theme styles step-by-step.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
                    <span>Start Blank Canvas</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>

                {/* 2. Template Library */}
                <div 
                  onClick={() => setView('templates')}
                  className="group relative p-6 bg-zinc-50/50 dark:bg-zinc-950/50 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-amber-500/30 dark:hover:border-amber-500/30 rounded-3xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LayoutGrid size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        Prebuilt
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Start from Template</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Select from pre-configured site blueprints (Intranet Hub, Client Portal, KB) and customize.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Browse Templates</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>

                {/* 3. AI Architect */}
                <div 
                  onClick={() => setView('ai_prompt')}
                  className="group relative p-6 bg-indigo-500/10 dark:bg-indigo-500/15 hover:bg-indigo-500/20 border border-indigo-500/30 dark:border-indigo-500/40 rounded-3xl transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Cpu size={24} />
                    </div>
                    <div>
                      <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                        AI Powered
                      </span>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white">Build with AI</h3>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Describe your portal vision in plain English and let Aurora AI generate schema and pages for you.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                    <span>Generate with AI</span>
                    <ArrowRight size={14} className="ml-1" />
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: BLANK FORM */}
            {view === 'blank_form' && (
              <div className="space-y-5 pt-2">
                <button
                  onClick={() => setView('choices')}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Options</span>
                </button>

                <div className="p-6 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Site / Portal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Employee Operations Handbook"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Provide a short summary of this site's purpose..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value as any)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="internal">Internal (Employee Hub)</option>
                        <option value="external">External (Client Portal)</option>
                        <option value="public">Public (Marketing Site)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                        URL Path / Domain
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ops.aurora.internal"
                        value={domain}
                        onChange={e => setDomain(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleCreateBlank}
                      disabled={loading}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
                      <span>{loading ? 'Creating Site...' : 'Create Blank Site & Open Studio'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: TEMPLATES */}
            {view === 'templates' && (
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={() => setView('choices')}
                    className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    <span>Back to Options</span>
                  </button>

                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTemplates.map(template => {
                    const TemplateIcon = template.icon;
                    const isInstalling = installingId === template.id;

                    return (
                      <div
                        key={template.id}
                        className="p-5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4 hover:border-amber-500/40 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                            <TemplateIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{template.name}</h4>
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 uppercase">
                                {template.category}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {template.pageCount} pages pre-configured
                          </span>
                          <button
                            onClick={() => handleInstallTemplate(template)}
                            disabled={loading}
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                          >
                            {isInstalling ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Deploying...</span>
                              </>
                            ) : (
                              <>
                                <span>Deploy Template</span>
                                <ArrowRight size={14} />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 4: AI PROMPT */}
            {view === 'ai_prompt' && (
              <div className="space-y-5 pt-2">
                <button
                  onClick={() => setView('choices')}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Options</span>
                </button>

                <div className="p-6 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                    <Wand2 size={16} />
                    <span>Describe Your Site or Portal Vision</span>
                  </div>

                  <textarea
                    rows={4}
                    placeholder="e.g. Build an Incident Triage Portal with a support ticket intake form, live latency health monitor, and knowledge base search..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />

                  {/* Suggestion Chips */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Example Prompts:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'IT Helpdesk with Ticket Intake Form and Knowledge Base Search',
                        'Executive Dashboard Portal with Status Monitor and News Bulletins',
                        'Customer Feedback & Product Survey Portal'
                      ].map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setAiPrompt(prompt)}
                          className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-500/20 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiGenerating}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      <span>{aiGenerating ? 'Generating Site with AI...' : 'Generate Site with AI'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
