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
  Palette, 
  Wand2 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBrandKits } from '../../hooks/useBrandKits';
import { BrandKit } from '../../services/brandKitService';
import { generateBrandLogoSuite, LogoMarkType } from '../../services/logoGeneratorEngine';
import { usePlatform } from '../../hooks/usePlatform';
import { queryTemplateCatalog, getTemplateById, getCachedTemplateCatalog } from '../../services/templateService';
import { toast } from 'sonner';

interface NewBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandCreated?: (newBrand: BrandKit) => void;
}

interface BrandTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
    chartPalette: string[];
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    monoFont: string;
    fontSizeScale: 'compact' | 'medium' | 'spacious';
  };
  styling: {
    borderRadius: string;
    buttonStyle: 'rounded' | 'pill' | 'square';
    elevation: 'flat' | 'subtle' | 'elevated';
  };
  voiceAndTone: {
    tone: string;
    tagline: string;
    boilerplate: string;
    prohibitedWords: string[];
  };
}

export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    id: 'tpl-indigo-tech',
    name: 'Aurora Indigo Enterprise',
    category: 'Technology & Cloud',
    description: 'Sophisticated modern indigo and sky blue palette designed for B2B SaaS, developer platforms, and cloud infrastructure.',
    colors: {
      primary: '#4f46e5',
      secondary: '#0ea5e9',
      accent: '#6366f1',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
      chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      fontSizeScale: 'medium'
    },
    styling: {
      borderRadius: '12px',
      buttonStyle: 'rounded',
      elevation: 'subtle'
    },
    voiceAndTone: {
      tone: 'Professional & Authoritative',
      tagline: 'Modern Platform Excellence',
      boilerplate: 'Delivering unified enterprise-grade collaborative workflows.',
      prohibitedWords: ['synergy', 'disruptive', 'cheap']
    }
  },
  {
    id: 'tpl-emerald-health',
    name: 'Emerald Health & Bio',
    category: 'Healthcare & Life Sciences',
    description: 'Calming organic forest green and cyan palette suited for health clinics, wellness platforms, and biological research.',
    colors: {
      primary: '#059669',
      secondary: '#0284c7',
      accent: '#10b981',
      background: '#ffffff',
      surface: '#f0fdfa',
      text: '#134e4a',
      muted: '#5eead4',
      border: '#ccfbf1',
      chartPalette: ['#059669', '#10b981', '#0284c7', '#38bdf8', '#f59e0b', '#8b5cf6']
    },
    typography: {
      headingFont: 'Outfit',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      fontSizeScale: 'medium'
    },
    styling: {
      borderRadius: '16px',
      buttonStyle: 'pill',
      elevation: 'subtle'
    },
    voiceAndTone: {
      tone: 'Empathetic, Precise & Reassuring',
      tagline: 'Compassionate Care, Elevated Technology',
      boilerplate: 'Transforming healthcare delivery through secure patient-centered platforms.',
      prohibitedWords: ['experimental', 'risky', 'clunky']
    }
  },
  {
    id: 'tpl-cyber-neon',
    name: 'Cyberpunk Neon AI',
    category: 'Gaming & Next-Gen AI',
    description: 'High-contrast vibrant hot pink and tangerine accents with deep obsidian dark backgrounds for cutting-edge creative tools.',
    colors: {
      primary: '#db2777',
      secondary: '#f97316',
      accent: '#ec4899',
      background: '#09090b',
      surface: '#18181b',
      text: '#fafafa',
      muted: '#a1a1aa',
      border: '#27272a',
      chartPalette: ['#db2777', '#f97316', '#eab308', '#6366f1', '#06b6d4', '#10b981']
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      fontSizeScale: 'medium'
    },
    styling: {
      borderRadius: '8px',
      buttonStyle: 'square',
      elevation: 'elevated'
    },
    voiceAndTone: {
      tone: 'Bold, Disruptive & Visionary',
      tagline: 'Built for What Comes Next',
      boilerplate: 'Unleashing synthetic intelligence and generative creative tooling.',
      prohibitedWords: ['traditional', 'standard', 'slow']
    }
  },
  {
    id: 'tpl-nordic-slate',
    name: 'Nordic Slate Minimal',
    category: 'Finance & Legal',
    description: 'Restrained, ultra-clean monochrome slate palette with royal blue precision accents for wealth management and advisory.',
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      accent: '#3b82f6',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      muted: '#64748b',
      border: '#e2e8f0',
      chartPalette: ['#0f172a', '#3b82f6', '#0284c7', '#64748b', '#10b981', '#f59e0b']
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      monoFont: 'JetBrains Mono',
      fontSizeScale: 'medium'
    },
    styling: {
      borderRadius: '8px',
      buttonStyle: 'rounded',
      elevation: 'flat'
    },
    voiceAndTone: {
      tone: 'Discreet, Rigorous & Direct',
      tagline: 'Precision Wealth & Advisory Systems',
      boilerplate: 'Safeguarding assets and accelerating institutional compliance workflows.',
      prohibitedWords: ['cheap', 'hyped', 'guaranteed']
    }
  },
  {
    id: 'tpl-royal-violet',
    name: 'Royal Violet Studio',
    category: 'Creative Agency & Media',
    description: 'Elevated purple and magenta gradients crafted for design studios, marketing agencies, and creative content hubs.',
    colors: {
      primary: '#7c3aed',
      secondary: '#ec4899',
      accent: '#8b5cf6',
      background: '#ffffff',
      surface: '#faf5ff',
      text: '#581c87',
      muted: '#a855f7',
      border: '#f3e8ff',
      chartPalette: ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4']
    },
    typography: {
      headingFont: 'Outfit',
      bodyFont: 'Plus Jakarta Sans',
      monoFont: 'JetBrains Mono',
      fontSizeScale: 'medium'
    },
    styling: {
      borderRadius: '16px',
      buttonStyle: 'rounded',
      elevation: 'elevated'
    },
    voiceAndTone: {
      tone: 'Inspiring, Articulate & Expressive',
      tagline: 'Where Imagination Meets Scale',
      boilerplate: 'Transforming brand storytelling and digital multi-channel engagement.',
      prohibitedWords: ['boring', 'rigid', 'formulaic']
    }
  }
];

export const NewBrandModal: React.FC<NewBrandModalProps> = ({
  isOpen,
  onClose,
  onBrandCreated
}) => {
  const navigate = useNavigate();
  const { brandKits, generateAIPalette } = useBrandKits();
  const { tenant } = usePlatform();

  const [view, setView] = useState<'choices' | 'blank_form' | 'templates' | 'ai_prompt'>('choices');

  // Blank Form State
  const [name, setName] = useState('');
  const [description, setNewDescription] = useState('');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [templates, setTemplates] = useState<BrandTemplate[]>(() => {
    const cached = getCachedTemplateCatalog({ builderType: 'BRAND', includePayload: true }, tenant?.id);
    if (cached?.templates && cached.templates.length > 0) {
      return cached.templates.map(t => {
        const p = (t.payload || t.schemaPayload) || {};
        return {
          id: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          colors: p.colors || { primary: '#4f46e5', secondary: '#6366f1', accent: '#06b6d4', background: '#09090b', surface: '#18181b', text: '#f4f4f5', muted: '#a1a1aa' },
          typography: p.typography || { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter' },
          styling: p.styling,
          voiceAndTone: p.voiceAndTone
        };
      });
    }
    return BRAND_TEMPLATES;
  });

  // Reset modal state and load templates when opened
  React.useEffect(() => {
    if (isOpen) {
      setView('choices');
      setName('');
      setNewDescription('');
      setAiPrompt('');
      setSearchQuery('');

      queryTemplateCatalog({ builderType: 'BRAND', includePayload: true }, undefined, tenant?.id)
        .then(async (res) => {
          if (res.templates && res.templates.length > 0) {
            const loaded: BrandTemplate[] = await Promise.all(
              res.templates.map(async (t) => {
                const full = await getTemplateById(t.id, undefined, tenant?.id);
                const p = full?.payload || {};
                return {
                  id: t.id,
                  name: t.name,
                  category: t.category,
                  description: t.description,
                  colors: p.colors || { primary: '#4f46e5', secondary: '#6366f1', accent: '#06b6d4', background: '#09090b', surface: '#18181b', text: '#f4f4f5', muted: '#a1a1aa' },
                  typography: p.typography || { headingFont: 'Plus Jakarta Sans', bodyFont: 'Inter' },
                  styling: p.styling,
                  voiceAndTone: p.voiceAndTone
                };
              })
            );
            setTemplates(loaded);
          }
        })
        .catch((err) => {
          console.warn('[NewBrandModal] Failed to load remote brand templates, using local fallback:', err);
        });
    }
  }, [isOpen, tenant?.id]);

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBlank = () => {
    if (!name.trim()) {
      toast.error('Please enter a Brand Name.');
      return;
    }
    const draftBrand: any = {
      id: 'new',
      tenantId: tenant?.id || '',
      name: name.trim(),
      description: description.trim() || undefined,
      isDefault: brandKits.length === 0,
      colors: {
        primary: '#4f46e5',
        secondary: '#0ea5e9',
        accent: '#6366f1',
        background: '#09090b',
        surface: '#18181b',
        text: '#f4f4f5',
        muted: '#a1a1aa',
        border: '#27272a',
        chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
      },
      typography: {
        headingFont: 'Plus Jakarta Sans',
        bodyFont: 'Inter',
        monoFont: 'JetBrains Mono',
        fontSizeScale: 'normal'
      },
      styling: {
        borderRadius: 'xl',
        shadowLevel: 'medium'
      },
      assets: {}
    };
    if (onBrandCreated) onBrandCreated(draftBrand);
    onClose();
    navigate('/workspace/settings/builder/brand/new', { state: { draftBrand } });
    toast.success(`Created blank brand draft for "${name.trim()}"`);
  };

  const handleInstallTemplate = (template: BrandTemplate) => {
    let markType: LogoMarkType = 'hexagon_shield';
    if (template.id.includes('helix') || template.id.includes('tech')) markType = 'orbital_helix';
    else if (template.id.includes('health') || template.id.includes('bio')) markType = 'bio_leaf';
    else if (template.id.includes('cyber')) markType = 'cyber_spark';
    else if (template.id.includes('slate')) markType = 'diamond_apex';
    else if (template.id.includes('violet')) markType = 'monogram_squircle';

    const logoSuite = generateBrandLogoSuite({
      brandName: template.name.replace(/\s+(Enterprise|Studio|AI|Minimal|Health & Bio).*$/i, ''),
      tagline: template.voiceAndTone?.tagline,
      markType,
      layout: 'horizontal',
      colors: template.colors,
      fontFamily: template.typography?.headingFont || 'Plus Jakarta Sans'
    });

    const draftBrand: any = {
      id: 'new',
      tenantId: tenant?.id || '',
      name: template.name,
      description: template.description,
      isDefault: brandKits.length === 0,
      colors: {
        ...template.colors,
        border: (template.colors as any).border || '#27272a'
      },
      typography: {
        ...template.typography,
        monoFont: (template.typography as any).monoFont || 'JetBrains Mono',
        fontSizeScale: 'normal'
      },
      styling: template.styling,
      voiceAndTone: template.voiceAndTone,
      assets: {
        logoLight: logoSuite.dataUrlLight,
        logoDark: logoSuite.dataUrlDark,
        favicon: logoSuite.faviconDataUrl,
        iconMark: logoSuite.faviconDataUrl
      }
    };

    if (onBrandCreated) onBrandCreated(draftBrand);
    onClose();
    navigate('/workspace/settings/builder/brand/new', { state: { draftBrand } });
    toast.success(`Loaded "${template.name}" template into brand studio draft`);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for AI brand generation.');
      return;
    }
    setAiGenerating(true);
    toast.info('Aurora AI is generating your brand design tokens...');

    try {
      const titleMatch = aiPrompt.match(/(?:for|a|an)\s+([A-Za-z0-9\s]+?)(?:\s+brand|\s+system|\s+theme|\s+portal|$)/i);
      const brandName = titleMatch ? `${titleMatch[1].trim()} Brand` : 'AI Generated Brand';

      const suggestion = await generateAIPalette({
        brandName,
        prompt: aiPrompt
      });

      const logoSuite = generateBrandLogoSuite({
        brandName,
        tagline: suggestion.voiceAndTone?.tagline,
        markType: 'hexagon_shield',
        layout: 'horizontal',
        colors: {
          primary: suggestion.colors?.primary || '#4f46e5',
          secondary: suggestion.colors?.secondary || '#0ea5e9',
          accent: suggestion.colors?.accent || '#6366f1'
        },
        fontFamily: suggestion.typography?.headingFont || 'Plus Jakarta Sans'
      });

      const draftBrand: any = {
        id: 'new',
        tenantId: tenant?.id || '',
        name: brandName,
        description: aiPrompt,
        isDefault: brandKits.length === 0,
        colors: (suggestion.colors as any) || {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
          accent: '#6366f1',
          background: '#09090b',
          surface: '#18181b',
          text: '#f4f4f5',
          muted: '#a1a1aa',
          border: '#27272a',
          chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
        },
        typography: {
          ...suggestion.typography,
          monoFont: 'JetBrains Mono',
          fontSizeScale: 'normal'
        },
        styling: suggestion.styling,
        voiceAndTone: suggestion.voiceAndTone,
        assets: {
          logoLight: logoSuite.dataUrlLight,
          logoDark: logoSuite.dataUrlDark,
          favicon: logoSuite.faviconDataUrl,
          iconMark: logoSuite.faviconDataUrl
        }
      };

      if (onBrandCreated) onBrandCreated(draftBrand);
      toast.success('AI Brand Profile generated into editor draft!');
      onClose();
      navigate('/workspace/settings/builder/brand/new', { state: { draftBrand } });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate AI brand profile.');
    } finally {
      setAiGenerating(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-4xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 md:p-8 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Palette size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Create Brand Profile</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Select how you would like to scaffold your organization's brand kit and design system.
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

          {/* Body Content */}
          <div className="px-6 md:px-8 py-6 flex-1 overflow-y-auto custom-scrollbar">
            {/* VIEW 1: CHOICES GRID (Matching Module & Site Builder) */}
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
                        Build your brand profile from scratch. Define custom hex tokens, typography scales, and voice guidelines step-by-step.
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
                        Select from curated production design systems (Cloud SaaS, BioTech, Cyberpunk, Luxury Slate) and customize.
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
                        Describe your brand identity, industry, or vibe in plain English and let Aurora AI generate tokens and tone guidelines for you.
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
                      Brand Profile Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Health, Aurora Enterprise"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      autoFocus
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                      Description / Scope
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Provide a short summary of this brand profile's purpose and target audience..."
                      value={description}
                      onChange={e => setNewDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>

                  <div className="pt-3 flex justify-end">
                    <button
                      onClick={handleCreateBlank}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
                    >
                      <Layers size={16} />
                      <span>Create Blank Brand & Open Studio</span>
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
                      placeholder="Search design templates..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredTemplates.map(template => {
                    return (
                      <div
                        key={template.id}
                        className="p-5 bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl flex flex-col justify-between gap-4 hover:border-amber-500/40 transition-all"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 font-mono">
                                {template.category}
                              </span>
                              <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                                {template.name}
                              </h4>
                            </div>

                            {/* Color Swatch Preview */}
                            <div className="flex items-center gap-1">
                              <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: template.colors.primary }} />
                              <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: template.colors.secondary }} />
                              <div className="h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: template.colors.accent }} />
                            </div>
                          </div>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                            {template.description}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono pt-1">
                            <span className="px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {template.typography.headingFont}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {template.voiceAndTone.tone}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleInstallTemplate(template)}
                          className="w-full py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow-amber-500/10"
                        >
                          <LayoutGrid size={14} />
                          <span>Use Template & Open Studio</span>
                        </button>
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

                <div className="p-6 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/20 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                    <Wand2 size={20} />
                    <h4 className="text-sm font-bold">Describe Your Brand Identity</h4>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tell Aurora AI what kind of brand profile you're creating. Include industry, desired color vibes, mood, or audience persona.
                  </p>

                  <textarea
                    rows={4}
                    placeholder="e.g. A cutting-edge sustainable fintech brand with deep forest emeralds, electric mint accents, clean Swiss typography, and an authoritative yet approachable tone of voice."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />

                  {/* Vibe Quick Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">Try:</span>
                    {[
                      'Modern B2B SaaS in Deep Indigo',
                      'Minimalist Scandinavian Slate Agency',
                      'High-Performance Cyber AI Platform',
                      'Clean Organic Wellness & BioTech'
                    ].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAiPrompt(preset)}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-500 transition-colors cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleGenerateAI}
                      disabled={aiGenerating || !aiPrompt.trim()}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {aiGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                      <span>{aiGenerating ? 'Generating Design System...' : 'Generate Brand & Open Studio'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
