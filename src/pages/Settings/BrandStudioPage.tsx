import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Palette, 
  Sparkles, 
  Image as ImageIcon, 
  Type, 
  MessageSquare, 
  Mail, 
  ArrowLeft, 
  Save, 
  Eye, 
  Wand2, 
  Globe, 
  Star,
  FileText,
  BarChart3,
  Loader2
} from 'lucide-react';
import { Button, Input } from '../../components/UI/Primitives';
import { useBrandKits } from '../../hooks/useBrandKits';
import { BrandKit } from '../../services/brandKitService';
import { LogoStudioModal } from '../../components/Modals/LogoStudioModal';
import { toast } from 'sonner';

const COLOR_PRESETS: Array<{ name: string; primary: string; secondary: string; accent: string; chartPalette: string[] }> = [
  {
    name: 'Aurora Indigo',
    primary: '#4f46e5',
    secondary: '#0ea5e9',
    accent: '#6366f1',
    chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
  },
  {
    name: 'Emerald Growth',
    primary: '#059669',
    secondary: '#0284c7',
    accent: '#10b981',
    chartPalette: ['#059669', '#10b981', '#0284c7', '#38bdf8', '#f59e0b', '#8b5cf6']
  },
  {
    name: 'Cyber Sunset',
    primary: '#db2777',
    secondary: '#f97316',
    accent: '#ec4899',
    chartPalette: ['#db2777', '#f97316', '#eab308', '#6366f1', '#06b6d4', '#10b981']
  },
  {
    name: 'Nordic Slate',
    primary: '#0f172a',
    secondary: '#475569',
    accent: '#3b82f6',
    chartPalette: ['#0f172a', '#3b82f6', '#0284c7', '#64748b', '#10b981', '#f59e0b']
  },
  {
    name: 'Royal Violet',
    primary: '#7c3aed',
    secondary: '#ec4899',
    accent: '#8b5cf6',
    chartPalette: ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4']
  }
];

const GOOGLE_FONTS = [
  'Plus Jakarta Sans',
  'Inter',
  'Outfit',
  'Poppins',
  'Space Grotesk',
  'Syne',
  'Roboto',
  'Open Sans',
  'Montserrat'
];

export const BrandStudioPage: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    brandKits, 
    loading: kitsLoading, 
    createBrandKit,
    updateBrandKit, 
    setDefaultBrandKit,
    generateAIPalette 
  } = useBrandKits();

  const [brand, setBrand] = useState<BrandKit | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'assets' | 'typography' | 'voice' | 'email'>('colors');
  const [activePreviewDevice, setActivePreviewDevice] = useState<'portal' | 'letterhead' | 'chart' | 'email'>('portal');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [isLogoStudioOpen, setIsLogoStudioOpen] = useState(false);

  // Sync route param or draft state to local state
  useEffect(() => {
    const draftBrand = (location.state as any)?.draftBrand;
    if (brandId === 'new' || draftBrand) {
      if (draftBrand) {
        setBrand(JSON.parse(JSON.stringify(draftBrand)));
        return;
      }
    }
    if (brandKits.length > 0) {
      const matched = brandKits.find(b => b.id === brandId) || brandKits[0];
      if (matched) {
        setBrand(JSON.parse(JSON.stringify(matched)));
      }
    }
  }, [brandId, brandKits, location.state]);

  const handleSave = async () => {
    if (!brand) return;
    setIsSaving(true);
    try {
      const isNew = brandId === 'new' || brand.id === 'new' || !brand.id;
      if (isNew) {
        const created = await createBrandKit(brand);
        setBrand(created);
        navigate(`/workspace/settings/builder/brand/${created.id}`, { replace: true });
      } else {
        await updateBrandKit(brand.id, brand);
      }
    } catch (err) {
      // toast is handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    if (!brand) return;
    setBrand({
      ...brand,
      colors: {
        ...brand.colors,
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent,
        chartPalette: [...preset.chartPalette]
      }
    });
    toast.info(`Applied "${preset.name}" color preset`);
  };

  const handleGenerateAI = async () => {
    if (!brand) return;
    setIsGeneratingAI(true);
    try {
      const suggestion = await generateAIPalette({
        brandName: brand.name,
        prompt: aiPrompt || brand.description || 'Modern clean SaaS enterprise brand'
      });

      setBrand({
        ...brand,
        colors: suggestion.colors || brand.colors,
        typography: suggestion.typography || brand.typography,
        styling: suggestion.styling || brand.styling,
        voiceAndTone: suggestion.voiceAndTone || brand.voiceAndTone
      });
      setShowAiModal(false);
      setAiPrompt('');
      toast.success('AI Brand tokens generated and applied!');
    } catch (err) {
      // toast in hook
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (kitsLoading || !brand) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-xs font-mono text-zinc-400">Loading Brand Studio...</p>
      </div>
    );
  }

  const colors = brand.colors || {
    primary: '#4f46e5',
    secondary: '#0ea5e9',
    accent: '#6366f1',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
  };
  const assets = brand.assets || {};
  const typography = brand.typography || {
    headingFont: 'Plus Jakarta Sans',
    bodyFont: 'Inter',
    monoFont: 'JetBrains Mono',
    fontSizeScale: 'medium'
  };
  const styling = brand.styling || {
    borderRadius: '12px',
    buttonStyle: 'rounded',
    elevation: 'subtle',
    headerLayout: 'top_right',
    navLinkStyle: 'underline'
  };
  const voice = brand.voiceAndTone || {
    tone: 'Professional & Approachable',
    boilerplate: 'Delivering excellence and modern collaborative workflows.',
    tagline: 'Modern Platform Excellence',
    prohibitedWords: ['synergy', 'disruptive', 'cheap'],
    audiencePersona: 'Enterprise decision makers and team leads'
  };
  const email = brand.emailDefaults || {
    signatureTemplate: 'standard',
    disclaimer: 'This email is confidential and intended solely for the recipient.',
    socialLinks: { website: 'https://aurora.platform' }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      {/* Full-Screen Studio Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/workspace/settings/brand-builder')}
            className="text-zinc-400 hover:text-white gap-1.5 px-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-semibold">Exit Studio</span>
          </Button>

          <div className="h-4 w-px bg-zinc-800" />

          <div className="flex items-center gap-2.5">
            <div 
              className="h-3.5 w-3.5 rounded-full shadow-md"
              style={{ backgroundColor: colors.primary }}
            />
            <span className="text-sm font-bold text-white tracking-tight">
              {brand.name}
            </span>
            {brand.isDefault && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Star className="w-3 h-3 fill-current" /> Default Brand
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {!brand.isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await setDefaultBrandKit(brand.id);
                setBrand({ ...brand, isDefault: true });
              }}
              className="text-xs text-zinc-400 hover:text-amber-400 gap-1.5"
            >
              <Star className="w-3.5 h-3.5" /> Make Default
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAiModal(true)}
            className="gap-2 text-indigo-400 font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> AI Palette Studio
          </Button>

          <Button
            onClick={handleSave}
            loading={isSaving}
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20"
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>
      </header>

      {/* Main Split-Screen Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Brand Design Tokens & Controls */}
        <div className="w-full lg:w-1/2 flex flex-col border-r border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
          {/* Studio Tab Bar */}
          <div className="flex items-center border-b border-zinc-800/80 px-6 gap-6 bg-zinc-900/60 shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'colors', label: 'Color Tokens', icon: Palette },
              { id: 'assets', label: 'Logos & Assets', icon: ImageIcon },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'voice', label: 'AI Voice & Tone', icon: MessageSquare },
              { id: 'email', label: 'Email Signatures', icon: Mail }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive 
                      ? 'border-indigo-500 text-indigo-400' 
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Configuration Form Panes */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 custom-scrollbar text-zinc-200">
            {/* 1. COLOR TOKENS TAB */}
            {activeTab === 'colors' && (
              <div className="space-y-6">
                {/* Presets Quick Picker */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-2.5">
                    Curated Harmonized Presets
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {COLOR_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => handleApplyPreset(preset)}
                        className="p-3 rounded-2xl border border-zinc-800 hover:border-indigo-500/60 text-left bg-zinc-900/80 hover:bg-zinc-800/60 transition-all flex flex-col gap-2 cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                          <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: preset.secondary }} />
                          <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-xs font-semibold text-zinc-300">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary, Secondary, Accent Pickers */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Core Brand Colors
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                      <label className="text-[11px] font-semibold text-zinc-400 block">Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colors.primary}
                          onChange={e => setBrand({
                            ...brand,
                            colors: { ...colors, primary: e.target.value }
                          })}
                          className="h-8 w-8 rounded-xl cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <Input
                          value={colors.primary}
                          onChange={(e: any) => setBrand({
                            ...brand,
                            colors: { ...colors, primary: e.target.value }
                          })}
                          className="font-mono text-xs uppercase bg-zinc-950 border-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                      <label className="text-[11px] font-semibold text-zinc-400 block">Secondary Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colors.secondary}
                          onChange={e => setBrand({
                            ...brand,
                            colors: { ...colors, secondary: e.target.value }
                          })}
                          className="h-8 w-8 rounded-xl cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <Input
                          value={colors.secondary}
                          onChange={(e: any) => setBrand({
                            ...brand,
                            colors: { ...colors, secondary: e.target.value }
                          })}
                          className="font-mono text-xs uppercase bg-zinc-950 border-zinc-700"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                      <label className="text-[11px] font-semibold text-zinc-400 block">Accent Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={colors.accent}
                          onChange={e => setBrand({
                            ...brand,
                            colors: { ...colors, accent: e.target.value }
                          })}
                          className="h-8 w-8 rounded-xl cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <Input
                          value={colors.accent}
                          onChange={(e: any) => setBrand({
                            ...brand,
                            colors: { ...colors, accent: e.target.value }
                          })}
                          className="font-mono text-xs uppercase bg-zinc-950 border-zinc-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6-Color Chart & KPI Data Visualization Palette */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                      Chart & KPI Visualization Palette
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Used across dashboard metrics, bar charts, and reports.</p>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {(colors.chartPalette || ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']).map((cp, idx) => (
                      <div key={idx} className="p-2.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-center">
                        <input
                          type="color"
                          value={cp}
                          onChange={e => {
                            const newPalette = [...colors.chartPalette];
                            newPalette[idx] = e.target.value;
                            setBrand({
                              ...brand,
                              colors: { ...colors, chartPalette: newPalette }
                            });
                          }}
                          className="h-8 w-full rounded-xl cursor-pointer border-0 p-0 shadow-sm"
                        />
                        <span className="text-[10px] font-mono text-zinc-400 uppercase block truncate">{cp}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. LOGOS & ASSETS TAB */}
            {activeTab === 'assets' && (
              <div className="space-y-6">
                {/* Vector Logo Generator Action Bar */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-indigo-500/5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Wand2 size={16} />
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        Vector Logo & App Mark Studio
                      </h4>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                      Generate crisp, resolution-independent vector marks, monograms, and dual-mode SVG logos (light & dark surfaces) with 1 click.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsLogoStudioOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shrink-0 cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Wand2 size={14} />
                    <span>Open Logo Studio</span>
                  </Button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Brand Logo Variations
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Light Logo */}
                    <div className="p-4 rounded-2xl border border-zinc-800 space-y-3 bg-zinc-900/60">
                      <label className="text-xs font-semibold text-zinc-300 block">
                        Light Mode Logo (for Dark surfaces)
                      </label>
                      <Input
                        placeholder="https://example.com/logo-light.png"
                        value={assets.logoLight || ''}
                        onChange={(e: any) => setBrand({
                          ...brand,
                          assets: { ...assets, logoLight: e.target.value }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      {assets.logoLight && (
                        <div className="h-16 rounded-xl bg-zinc-950 p-2 border border-zinc-800 flex items-center justify-center">
                          <img src={assets.logoLight} alt="Light logo preview" className="max-h-full object-contain" />
                        </div>
                      )}
                    </div>

                    {/* Dark Logo */}
                    <div className="p-4 rounded-2xl border border-zinc-800 space-y-3 bg-zinc-900/60">
                      <label className="text-xs font-semibold text-zinc-300 block">
                        Dark Mode Logo (for White documents)
                      </label>
                      <Input
                        placeholder="https://example.com/logo-dark.png"
                        value={assets.logoDark || ''}
                        onChange={(e: any) => setBrand({
                          ...brand,
                          assets: { ...assets, logoDark: e.target.value }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                      {assets.logoDark && (
                        <div className="h-16 rounded-xl bg-white p-2 border border-zinc-200 flex items-center justify-center">
                          <img src={assets.logoDark} alt="Dark logo preview" className="max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Favicon & Letterhead Banner */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Favicon & Letterhead Banner
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Favicon / App Mark URL
                      </label>
                      <Input
                        placeholder="https://example.com/favicon.ico"
                        value={assets.favicon || ''}
                        onChange={(e: any) => setBrand({
                          ...brand,
                          assets: { ...assets, favicon: e.target.value }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Official Letterhead Banner Image
                      </label>
                      <Input
                        placeholder="https://example.com/letterhead.png"
                        value={assets.letterheadBanner || ''}
                        onChange={(e: any) => setBrand({
                          ...brand,
                          assets: { ...assets, letterheadBanner: e.target.value }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. TYPOGRAPHY & GEOMETRY TAB */}
            {activeTab === 'typography' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Font Hierarchy
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Heading Font
                      </label>
                      <select
                        value={typography.headingFont}
                        onChange={e => setBrand({
                          ...brand,
                          typography: { ...typography, headingFont: e.target.value }
                        })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {GOOGLE_FONTS.map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Body Font
                      </label>
                      <select
                        value={typography.bodyFont}
                        onChange={e => setBrand({
                          ...brand,
                          typography: { ...typography, bodyFont: e.target.value }
                        })}
                        className="w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {GOOGLE_FONTS.map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Geometry & Border Radius */}
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Corner Geometry & Radius
                  </h4>

                  <div className="grid grid-cols-3 gap-3">
                    {['8px', '12px', '16px'].map(r => (
                      <button
                        key={r}
                        onClick={() => setBrand({
                          ...brand,
                          styling: { ...styling, borderRadius: r }
                        })}
                        className={`p-3 text-center border transition-all cursor-pointer ${
                          styling.borderRadius === r 
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                            : 'border-zinc-800 text-zinc-400 hover:text-white bg-zinc-900/60'
                        }`}
                        style={{ borderRadius: r }}
                      >
                        <span className="text-xs">{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. AI VOICE & PERSONA TAB */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Brand Tone & Voice Guidelines
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Aurora AI copywriters and report generators will strictly follow these identity parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Tone of Voice
                    </label>
                    <Input
                      placeholder="e.g. Professional, authoritative, empathetic, concise"
                      value={voice.tone || ''}
                      onChange={(e: any) => setBrand({
                        ...brand,
                        voiceAndTone: { ...voice, tone: e.target.value }
                      })}
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Company Tagline / Value Proposition
                    </label>
                    <Input
                      placeholder="e.g. Modern Platform Excellence for Scaled Teams"
                      value={voice.tagline || ''}
                      onChange={(e: any) => setBrand({
                        ...brand,
                        voiceAndTone: { ...voice, tagline: e.target.value }
                      })}
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Company Boilerplate / Mission Statement
                    </label>
                    <textarea
                      placeholder="Brief standard description of the company..."
                      value={voice.boilerplate || ''}
                      onChange={e => setBrand({
                        ...brand,
                        voiceAndTone: { ...voice, boilerplate: e.target.value }
                      })}
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Restricted Words (comma-separated)
                    </label>
                    <Input
                      placeholder="e.g. synergy, disruptive, cheap, complex"
                      value={(voice.prohibitedWords || []).join(', ')}
                      onChange={(e: any) => setBrand({
                        ...brand,
                        voiceAndTone: { 
                          ...voice, 
                          prohibitedWords: e.target.value.split(',').map((w: string) => w.trim()).filter(Boolean) 
                        }
                      })}
                      className="bg-zinc-950 border-zinc-800"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. EMAIL SIGNATURES TAB */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                    Email & Comms Branding
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Standard corporate signature blocks and legal confidentiality notices.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1">
                      Legal Disclaimer
                    </label>
                    <textarea
                      placeholder="This message and any attachments are confidential..."
                      value={email.disclaimer || ''}
                      onChange={e => setBrand({
                        ...brand,
                        emailDefaults: { ...email, disclaimer: e.target.value }
                      })}
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        Corporate Website URL
                      </label>
                      <Input
                        placeholder="https://company.com"
                        value={email.socialLinks?.website || ''}
                        onChange={(e: any) => setBrand({
                          ...brand,
                          emailDefaults: { 
                            ...email, 
                            socialLinks: { ...email.socialLinks, website: e.target.value } 
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-zinc-300 block mb-1">
                        LinkedIn Profile URL
                      </label>
                      <Input
                        placeholder="https://linkedin.com/company/..."
                        value={email.socialLinks?.linkedin || ''}
                        onChange={(e: any) => setBrand({
                          ...brand,
                          emailDefaults: { 
                            ...email, 
                            socialLinks: { ...email.socialLinks, linkedin: e.target.value } 
                          }
                        })}
                        className="bg-zinc-950 border-zinc-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Live Cascade Preview Canvas */}
        <div className="hidden lg:flex lg:w-1/2 flex-col bg-black overflow-hidden">
          {/* Preview Device Selector */}
          <div className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-900/40 shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                Live Cascade Matrix
              </span>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              {[
                { id: 'portal', label: 'Public Portal', icon: Globe },
                { id: 'letterhead', label: 'Letterhead Doc', icon: FileText },
                { id: 'chart', label: 'KPI Dashboard', icon: BarChart3 },
                { id: 'email', label: 'Email Signature', icon: Mail }
              ].map(device => {
                const Icon = device.icon;
                const isSelected = activePreviewDevice === device.id;
                return (
                  <button
                    key={device.id}
                    onClick={() => setActivePreviewDevice(device.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {device.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="flex-1 p-8 overflow-y-auto flex items-center justify-center custom-scrollbar">
            {/* 1. PUBLIC PORTAL / SITE PREVIEW */}
            {activePreviewDevice === 'portal' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden"
                style={{ fontFamily: typography.bodyFont || 'sans-serif' }}
              >
                <div className="px-4 py-2.5 bg-zinc-800/80 border-b border-zinc-700/60 flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 max-w-xs mx-auto bg-zinc-900 px-3 py-0.5 rounded-md text-[10px] text-zinc-400 font-mono truncate text-center">
                    https://portal.aurora.platform
                  </div>
                </div>

                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {assets.logoLight || assets.logoDark ? (
                      <img src={assets.logoLight || assets.logoDark} alt="Logo" className="h-6 object-contain" />
                    ) : (
                      <div 
                        className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span 
                      className="font-bold text-sm text-white"
                      style={{ fontFamily: typography.headingFont }}
                    >
                      {brand.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                    <span className="text-indigo-400 font-bold">Home</span>
                    <span>Services</span>
                    <span>Knowledge</span>
                    <button 
                      className="px-3 py-1.5 text-xs text-white font-semibold shadow-md"
                      style={{ 
                        backgroundColor: colors.primary, 
                        borderRadius: styling.borderRadius 
                      }}
                    >
                      Sign In
                    </button>
                  </div>
                </div>

                <div 
                  className="p-8 text-center relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}15)`
                  }}
                >
                  <span 
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-bold mb-3"
                    style={{ 
                      backgroundColor: `${colors.accent}25`,
                      color: colors.accent
                    }}
                  >
                    {voice.tagline || 'Official Enterprise Portal'}
                  </span>

                  <h2 
                    className="text-2xl font-black text-white tracking-tight"
                    style={{ fontFamily: typography.headingFont }}
                  >
                    Welcome to {brand.name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-2 max-w-sm mx-auto">
                    {voice.boilerplate || 'Empowering organizational excellence with instant digital workflows.'}
                  </p>

                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      className="px-4 py-2 text-xs font-bold text-white shadow-lg"
                      style={{ 
                        backgroundColor: colors.primary,
                        borderRadius: styling.borderRadius,
                        boxShadow: `0 8px 20px -4px ${colors.primary}50`
                      }}
                    >
                      Explore Services
                    </button>
                    <button
                      className="px-4 py-2 text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700"
                      style={{ borderRadius: styling.borderRadius }}
                    >
                      Submit Inquiry
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. OFFICIAL LETTERHEAD / DOCUMENT PREVIEW */}
            {activePreviewDevice === 'letterhead' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md aspect-[1/1.3] bg-white text-zinc-900 rounded-xl shadow-2xl border border-zinc-300 p-8 flex flex-col justify-between"
                style={{ fontFamily: typography.bodyFont || 'sans-serif' }}
              >
                <div className="border-b-2 pb-4 flex items-start justify-between" style={{ borderColor: colors.primary }}>
                  <div>
                    <h3 
                      className="text-lg font-black tracking-tight"
                      style={{ fontFamily: typography.headingFont, color: colors.primary }}
                    >
                      {brand.name.toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{voice.tagline || 'Official Statement of Record'}</p>
                  </div>
                  {assets.logoLight || assets.logoDark ? (
                    <img src={assets.logoDark || assets.logoLight} alt="Logo" className="h-8 object-contain" />
                  ) : (
                    <div 
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: colors.primary }}
                    >
                      {brand.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="space-y-3 my-auto">
                  <div className="h-3 w-1/3 bg-zinc-200 rounded" />
                  <div className="h-2.5 w-full bg-zinc-100 rounded" />
                  <div className="h-2.5 w-5/6 bg-zinc-100 rounded" />
                  <div className="h-2.5 w-4/6 bg-zinc-100 rounded" />
                  
                  <div className="p-3 rounded-lg border my-4" style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}30` }}>
                    <p className="text-[11px] font-semibold" style={{ color: colors.primary }}>
                      AI Tone & Voice Directives:
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      "{voice.tone || 'Professional & Direct'}"
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t text-[9px] text-zinc-400 flex items-center justify-between">
                  <span>{email.socialLinks?.website || 'https://aurora.platform'}</span>
                  <span>Confidential & Proprietary</span>
                </div>
              </motion.div>
            )}

            {/* 3. KPI DASHBOARD CARD PREVIEW */}
            {activePreviewDevice === 'chart' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5"
                style={{ fontFamily: typography.bodyFont }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Revenue Performance
                    </span>
                    <h3 
                      className="text-2xl font-black text-white mt-1"
                      style={{ fontFamily: typography.headingFont }}
                    >
                      $842,500.00
                    </h3>
                  </div>
                  <span 
                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}
                  >
                    +24.8% YoY
                  </span>
                </div>

                <div className="h-32 flex items-end justify-between gap-3 pt-4 border-t border-zinc-800">
                  {(colors.chartPalette || ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']).map((cp, idx) => {
                    const heights = [45, 70, 60, 95, 80, 100];
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                        <div
                          className="w-full rounded-t-lg transition-all duration-500"
                          style={{ 
                            height: `${heights[idx % heights.length]}%`, 
                            backgroundColor: cp 
                          }}
                        />
                        <span className="text-[9px] font-mono text-zinc-400">Q{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* 4. EMAIL SIGNATURE PREVIEW */}
            {activePreviewDevice === 'email' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4"
                style={{ fontFamily: typography.bodyFont }}
              >
                <div className="flex items-center gap-4 pb-4 border-b border-zinc-800">
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: colors.primary }}
                  >
                    JD
                  </div>
                  <div>
                    <h4 
                      className="text-sm font-bold text-white"
                      style={{ fontFamily: typography.headingFont }}
                    >
                      Jane Doe
                    </h4>
                    <p className="text-xs text-zinc-400">Principal Solutions Director</p>
                    <p className="text-xs font-semibold" style={{ color: colors.primary }}>
                      {brand.name}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 space-y-1">
                  <p>🌐 {email.socialLinks?.website || 'https://aurora.platform'}</p>
                  <p className="text-[10px] text-zinc-500 italic pt-2">
                    {email.disclaimer || 'This message is confidential and protected by applicable copyright.'}
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: AI Palette & Tone Generator */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-6 text-zinc-100"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">AI Brand Generator</h3>
                  <p className="text-xs text-zinc-400">
                    Generate an entire design system, color palette, and tone from a prompt.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1.5">
                  Describe your brand or industry vibe
                </label>
                <textarea
                  placeholder="e.g. A cutting-edge fintech platform for modern startups with a bold, trustworthy, futuristic aesthetic."
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowAiModal(false)} className="text-zinc-400 hover:text-white">
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateAI}
                  loading={isGeneratingAI}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  <Sparkles className="w-4 h-4" /> Generate Design System
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Vector Logo & App Mark Studio */}
      {brand && (
        <LogoStudioModal
          isOpen={isLogoStudioOpen}
          onClose={() => setIsLogoStudioOpen(false)}
          brandName={brand.name}
          colors={brand.colors || { primary: '#4f46e5', secondary: '#0ea5e9', accent: '#6366f1' }}
          currentAssets={brand.assets}
          onApplyAssets={(newAssets) => {
            setBrand({
              ...brand,
              assets: { ...brand.assets, ...newAssets }
            });
          }}
        />
      )}
    </div>
  );
};

export default BrandStudioPage;
