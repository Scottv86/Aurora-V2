import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Sparkles, 
  Check, 
  Download, 
  Wand2, 
  Layers, 
  Layout, 
  Type, 
  Loader2,
  RefreshCw,
  Sun,
  Moon,
  Smartphone,
  Globe
} from 'lucide-react';
import { Button, Input } from '../UI/Primitives';
import { 
  LogoMarkType, 
  LogoLayout, 
  LogoGeneratorConfig, 
  generateBrandLogoSuite, 
  PRESET_LOGO_STYLES,
  GeneratedLogoResult 
} from '../../services/logoGeneratorEngine';
import { BrandColors, BrandAssets } from '../../services/brandKitService';
import { toast } from 'sonner';

interface LogoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandName: string;
  colors: BrandColors;
  currentAssets?: BrandAssets;
  onApplyAssets: (newAssets: Partial<BrandAssets>) => void;
}

const MARK_TYPES: Array<{ id: LogoMarkType; label: string; group: string }> = [
  { id: 'hexagon_shield', label: 'Hex Shield', group: 'Geometric' },
  { id: 'prism_cube', label: 'Prism Cube', group: 'Geometric' },
  { id: 'diamond_apex', label: 'Diamond Apex', group: 'Geometric' },
  { id: 'stacked_layers', label: 'Stacked Layers', group: 'Geometric' },
  { id: 'orbital_helix', label: 'Orbital Helix', group: 'Abstract & Tech' },
  { id: 'wave_pulse', label: 'Wave Pulse', group: 'Abstract & Tech' },
  { id: 'infinity_loop', label: 'Infinity Loop', group: 'Abstract & Tech' },
  { id: 'quantum_core', label: 'Quantum Core', group: 'Abstract & Tech' },
  { id: 'constellation', label: 'Constellation', group: 'Abstract & Tech' },
  { id: 'cyber_spark', label: 'Cyber Spark', group: 'Abstract & Tech' },
  { id: 'dynamic_wings', label: 'Dynamic Wings', group: 'Abstract & Tech' },
  { id: 'bio_leaf', label: 'Bio Leaf', group: 'Organic' },
  { id: 'monogram_shield', label: 'Shield Initial', group: 'Monograms' },
  { id: 'monogram_circle', label: 'Circle Ring', group: 'Monograms' },
  { id: 'monogram_squircle', label: 'Squircle App', group: 'Monograms' }
];

export const LogoStudioModal: React.FC<LogoStudioModalProps> = ({
  isOpen,
  onClose,
  brandName: initialBrandName,
  colors,
  onApplyAssets
}) => {
  const [name, setName] = useState(initialBrandName || 'Aurora');
  const [tagline, setTagline] = useState('');
  const [markType, setMarkType] = useState<LogoMarkType>('hexagon_shield');
  const [layout, setLayout] = useState<LogoLayout>('horizontal');
  const [fontFamily, setFontFamily] = useState('Plus Jakarta Sans');
  const [letterSpacing, setLetterSpacing] = useState(0.5);
  const [monogramLetters, setMonogramLetters] = useState('');

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Active preview tab for mobile/modal viewing
  const [previewTab, setPreviewTab] = useState<'dual' | 'light' | 'dark' | 'favicon'>('dual');

  // Sync brand name when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setName(initialBrandName || 'Aurora');
      const initials = (initialBrandName || 'Aurora')
        .split(/\s+/)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      setMonogramLetters(initials || 'A');
    }
  }, [isOpen, initialBrandName]);

  const config: LogoGeneratorConfig = useMemo(() => ({
    brandName: name,
    tagline: tagline.trim() || undefined,
    markType,
    layout,
    colors: {
      primary: colors.primary || '#4f46e5',
      secondary: colors.secondary || '#0ea5e9',
      accent: colors.accent || '#6366f1'
    },
    fontFamily,
    letterSpacing,
    monogramLetters: monogramLetters.trim() || undefined
  }), [name, tagline, markType, layout, colors, fontFamily, letterSpacing, monogramLetters]);

  const result: GeneratedLogoResult = useMemo(() => {
    return generateBrandLogoSuite(config);
  }, [config]);

  const handleApplyPreset = (preset: typeof PRESET_LOGO_STYLES[0]) => {
    setMarkType(preset.markType);
    setLayout(preset.layout);
    setFontFamily(preset.fontFamily);
    toast.success(`Applied ${preset.name} style`);
  };

  const handleApplyAll = () => {
    onApplyAssets({
      logoLight: result.dataUrlLight,
      logoDark: result.dataUrlDark,
      favicon: result.faviconDataUrl,
      iconMark: result.faviconDataUrl
    });
    toast.success('Applied generated Light Logo, Dark Logo, and Favicon to Brand!');
    onClose();
  };

  const handleApplyLightOnly = () => {
    onApplyAssets({ logoLight: result.dataUrlLight });
    toast.success('Applied Light Mode logo');
  };

  const handleApplyDarkOnly = () => {
    onApplyAssets({ logoDark: result.dataUrlDark });
    toast.success('Applied Dark Mode logo');
  };

  const handleApplyFaviconOnly = () => {
    onApplyAssets({ favicon: result.faviconDataUrl, iconMark: result.faviconDataUrl });
    toast.success('Applied Favicon & App Mark');
  };

  const handleDownloadSvg = (svgContent: string, filename: string) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleAiSuggest = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a description for AI logo recommendation.');
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch('/api/brand-kits/generate-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          brandName: name
        })
      });

      if (!response.ok) throw new Error('Failed to generate AI logo style');
      const data = await response.json();

      if (data.markType) setMarkType(data.markType);
      if (data.layout) setLayout(data.layout);
      if (data.tagline) setTagline(data.tagline);
      if (data.fontFamily) setFontFamily(data.fontFamily);

      toast.success(data.rationale || 'AI Logo parameters configured!');
    } catch (err: any) {
      toast.error(err.message || 'AI logo generation error');
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-6xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
        >
          {/* Studio Header */}
          <div className="p-5 md:px-8 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner">
                <Wand2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Vector Logo & App Mark Studio
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    SVG Engine
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Generate resolution-independent dual-mode vector logos and app icons calibrated to your brand palette.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleApplyAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                <Check size={14} />
                <span>Apply to Brand</span>
              </Button>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Studio Split Body */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            {/* Left Controls Column (5 cols) */}
            <div className="lg:col-span-5 p-6 overflow-y-auto custom-scrollbar border-r border-zinc-800/80 space-y-6 bg-zinc-950">
              {/* AI Prompt Assistant Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                    <Sparkles size={13} className="text-indigo-400" />
                    AI Style Assistant
                  </span>
                  {isAiLoading && <Loader2 size={13} className="animate-spin text-indigo-400" />}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Minimalist quantum cloud network mark..."
                    value={aiPrompt}
                    onChange={(e: any) => setAiPrompt(e.target.value)}
                    onKeyDown={(e: any) => e.key === 'Enter' && handleAiSuggest()}
                    className="text-xs bg-zinc-900 border-zinc-700 text-white h-9"
                  />
                  <Button
                    onClick={handleAiSuggest}
                    disabled={isAiLoading || !aiPrompt.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 h-9 shrink-0 cursor-pointer"
                  >
                    Suggest
                  </Button>
                </div>
              </div>

              {/* Quick Presets Carousel */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
                  Curated Style Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_LOGO_STYLES.slice(0, 6).map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                        markType === preset.markType 
                          ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold' 
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs block truncate">{preset.name}</span>
                      <span className="text-[9px] text-zinc-500 font-mono block truncate">{preset.category}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mark Symbol Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
                  Vector Mark Symbol (15 Types)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MARK_TYPES.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMarkType(m.id)}
                      className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                        markType === m.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300 font-bold shadow-sm'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      <span className="block truncate">{m.label}</span>
                      <span className="text-[9px] text-zinc-500 font-mono block">{m.group}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Mode Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono block">
                  Layout Arrangement
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'horizontal', label: 'Inline' },
                    { id: 'vertical', label: 'Stacked' },
                    { id: 'mark_only', label: 'Mark Only' },
                    { id: 'wordmark_only', label: 'Wordmark' }
                  ].map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id as LogoLayout)}
                      className={`p-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        layout === l.id
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography & Content */}
              <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1">
                      Brand Name
                    </label>
                    <Input
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      className="text-xs bg-zinc-900 border-zinc-800 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1">
                      Initials (Monogram)
                    </label>
                    <Input
                      maxLength={3}
                      value={monogramLetters}
                      onChange={(e: any) => setMonogramLetters(e.target.value.toUpperCase())}
                      className="text-xs font-mono uppercase bg-zinc-900 border-zinc-800 text-white text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1">
                    Tagline (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Modern Platform Architecture"
                    value={tagline}
                    onChange={(e: any) => setTagline(e.target.value)}
                    className="text-xs bg-zinc-900 border-zinc-800 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1">
                      Font Family
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Space Grotesk">Space Grotesk</option>
                      <option value="Inter">Inter</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono block mb-1">
                      Letter Spacing
                    </label>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.5"
                        value={letterSpacing}
                        onChange={e => setLetterSpacing(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-zinc-400 w-6 text-right">{letterSpacing}px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Preview Column (7 cols) */}
            <div className="lg:col-span-7 p-6 overflow-y-auto custom-scrollbar bg-zinc-900/30 flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                {/* Surface Mode 1: Dark Surface (Light Text Logo) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono">
                      <Moon size={14} className="text-indigo-400" />
                      <span>Dark Surface Version (Light Text / Navbar)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApplyLightOnly}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Apply as Light Logo
                      </button>
                      <button
                        onClick={() => handleDownloadSvg(result.svgLight, `${name.toLowerCase()}-logo-light.svg`)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Download SVG"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="h-32 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-6 flex items-center justify-center relative overflow-hidden shadow-inner">
                    <div 
                      className="h-full max-w-md w-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: result.svgLight }}
                    />
                  </div>
                </div>

                {/* Surface Mode 2: Light Surface (Dark Text Logo) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono">
                      <Sun size={14} className="text-amber-400" />
                      <span>Light Surface Version (Dark Text / Documents)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleApplyDarkOnly}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                      >
                        Apply as Dark Logo
                      </button>
                      <button
                        onClick={() => handleDownloadSvg(result.svgDark, `${name.toLowerCase()}-logo-dark.svg`)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        title="Download SVG"
                      >
                        <Download size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="h-32 rounded-2xl bg-white border border-zinc-300 p-6 flex items-center justify-center relative overflow-hidden shadow-inner">
                    <div 
                      className="h-full max-w-md w-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: result.svgDark }}
                    />
                  </div>
                </div>

                {/* Favicon & App Icon Tiles */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 font-mono">
                      <Globe size={14} className="text-emerald-400" />
                      <span>Favicon & App Icon Marks</span>
                    </div>
                    <button
                      onClick={handleApplyFaviconOnly}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Apply as Favicon
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Dark App Tile */}
                    <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-xl overflow-hidden shadow-sm"
                        dangerouslySetInnerHTML={{ __html: result.faviconSvg }}
                      />
                      <span className="text-[10px] font-mono text-zinc-400">Dark App Tile</span>
                    </div>

                    {/* Light App Tile */}
                    <div className="p-4 rounded-2xl bg-white border border-zinc-300 flex flex-col items-center justify-center gap-2">
                      <div 
                        className="w-10 h-10 rounded-xl overflow-hidden shadow-sm"
                        dangerouslySetInnerHTML={{ __html: result.faviconSvg }}
                      />
                      <span className="text-[10px] font-mono text-zinc-600">Light Tile</span>
                    </div>

                    {/* Browser Tab Mock */}
                    <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-center">
                      <div className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center gap-2 max-w-[140px]">
                        <div 
                          className="w-3.5 h-3.5 shrink-0"
                          dangerouslySetInnerHTML={{ __html: result.faviconSvg }}
                        />
                        <span className="text-[10px] font-semibold text-zinc-300 truncate">{name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 mt-2 text-center">Browser Tab</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Multi-Action Bar */}
              <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                <div className="text-[11px] text-zinc-500 font-mono">
                  Pure SVG vector • Resolution independent
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleApplyAll}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Apply All Assets to Brand</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
