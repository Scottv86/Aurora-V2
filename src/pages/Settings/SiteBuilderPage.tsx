import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Palette, 
  Menu, 
  LayoutGrid, 
  ShieldCheck, 
  ExternalLink, 
  Check, 
  Plus, 
  Trash2, 
  Sparkles, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Search, 
  Activity, 
  Send, 
  BookOpen, 
  Radio,
  Maximize2,
  Minimize2,
  FileCode,
  Layers,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Sliders,
  FormInput,
  Zap,
  GripVertical,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Inbox,
  Code,
  Type,
  Globe,
  BarChart3,
  History,
  RefreshCw,
  Building2,
  Clock,
  MessageSquare,
  Lock,
  Calendar,
  FileText,
  Star,
  Calculator,
  PenTool,
  UserCheck,
  Users,
  HelpCircle,
  CreditCard,
  MessageCircle,
  Bell,
  Compass,
  Database,
  Images,
  Heading,
  Minus,
  Box,
  MoveVertical
} from 'lucide-react';
export { PageBuilderEngine } from '../../components/PageEngine';


import { Site, SiteService, SiteNavItem, SiteWidget, SitePage, FormFieldConfig, PRESET_THEMES, PresetTheme, SiteThemeConfig, ENTERPRISE_FONTS } from '../../services/siteService';
import { usePlatform } from '../../hooks/usePlatform';
import { useTheme } from '../../hooks/useTheme';
import { Modal } from '../../components/UI/TabsAndModal';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { ComponentPickerModal, InContextBuilderModal, FormBuilder, FormRenderer } from '../../components/Builders';



export type InspectableElement = 
  | { type: 'header' }
  | { type: 'page_header' }
  | { type: 'widget'; id: string }
  | { type: 'footer' }
  | null;

export const SiteBuilderPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen } = usePlatform();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'branding' | 'widgets' | 'nav' | 'seo' | 'inbox' | 'code' | 'typography' | 'localization' | 'access' | 'analytics' | 'history'>('pages');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile' | 'mobile_android'>('desktop');
  const [canvasZoom, setCanvasZoom] = useState<number>(100);
  const [selectedElement, setSelectedElement] = useState<InspectableElement>({ type: 'header' });
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isFormPickerOpen, setIsFormPickerOpen] = useState(false);
  const [isInContextFormBuilderOpen, setIsInContextFormBuilderOpen] = useState(false);



  // Mobile App Exporter Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [appId, setAppId] = useState('com.aurora.mobileportal');
  const [appName, setAppName] = useState('');
  const [appPlatform, setAppPlatform] = useState<'all' | 'web' | 'ios' | 'android'>('all');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [exportingApp, setExportingApp] = useState(false);
  const [exportedManifest, setExportedManifest] = useState<any>(null);

  // Theme Studio State
  const [activeThemeSegment, setActiveThemeSegment] = useState<'presets' | 'custom'>('presets');
  const [themeBgMode, setThemeBgMode] = useState<SiteThemeConfig['bgMode']>('dark_obsidian');
  const [themeCardStyle, setThemeCardStyle] = useState<SiteThemeConfig['cardStyle']>('glass');
  const [themeRadius, setThemeRadius] = useState<SiteThemeConfig['borderRadius']>('2xl');
  const [themeFont, setThemeFont] = useState<string>('sans');

  // Inspector Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'internal' | 'external' | 'public'>('internal');
  const [type, setType] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<'active' | 'draft' | 'offline'>('active');
  const [access, setAccess] = useState<'Public' | 'Authenticated' | 'Restricted' | 'Admin Only'>('Authenticated');

  // Branding state
  const [accentColor, setAccentColor] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [footerText, setFooterText] = useState('');
  const [headerLayout, setHeaderLayout] = useState<'top_right' | 'top_center' | 'pill_header' | 'minimal' | 'sidebar_left' | 'sidebar_right'>('top_right');

  // Multi-Page & Drag-and-Drop State
  const [pages, setPages] = useState<SitePage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  // Navigation Items
  const [navItems, setNavItems] = useState<SiteNavItem[]>([]);
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavPath, setNewNavPath] = useState('');

  // SEO & Social Config State
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [noIndex, setNoIndex] = useState(false);
  const [canonicalUrl, setCanonicalUrl] = useState('');

  // Typography & Styling State
  const [fontFamily, setFontFamily] = useState<string>('sans');
  const [borderRadius, setBorderRadius] = useState<'none' | 'md' | 'xl' | 'full'>('xl');
  const [fontScale, setFontScale] = useState<'normal' | 'compact' | 'large'>('normal');

  // Custom Code State
  const [headScripts, setHeadScripts] = useState('');
  const [bodyScripts, setBodyScripts] = useState('');
  const [customCss, setCustomCss] = useState('');
  const [navLinkStyle, setNavLinkStyle] = useState<SiteThemeConfig['navLinkStyle']>('underline');

  const handleApplyPresetTheme = (preset: PresetTheme) => {
    setAccentColor(preset.accentColor);
    setThemeBgMode(preset.bgMode);
    setThemeCardStyle(preset.cardStyle);
    setThemeRadius(preset.borderRadius);
    setThemeFont(preset.fontFamily);
    setHeaderLayout(preset.headerLayout);
    setFontFamily(preset.fontFamily);
    if (preset.navLinkStyle) setNavLinkStyle(preset.navLinkStyle);
    toast.success(`Preset Theme "${preset.name}" applied!`);
  };

  const getNavLinkStyleClass = (isActive: boolean) => {
    switch (navLinkStyle) {
      case 'pills':
        return isActive 
          ? 'px-3 py-1 bg-indigo-600 text-white font-bold rounded-xl shadow-md' 
          : 'px-3 py-1 hover:bg-indigo-500/10 opacity-80 hover:opacity-100 rounded-xl';
      case 'badges':
        return isActive 
          ? 'px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold rounded-lg' 
          : 'px-2.5 py-1 opacity-70 hover:opacity-100 rounded-lg';
      case 'glowing_text':
        return isActive 
          ? 'font-black text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.8)]' 
          : 'opacity-70 hover:opacity-100';
      case 'ghost_button':
        return isActive 
          ? 'px-3 py-1 border border-indigo-500 text-white font-bold rounded-lg shadow-sm' 
          : 'px-3 py-1 border border-transparent opacity-70 hover:opacity-100 hover:border-zinc-700 rounded-lg';
      case 'underline':
      default:
        return isActive 
          ? 'font-bold relative py-1' 
          : 'opacity-70 hover:opacity-100 py-1 relative transition-all';
    }
  };

  // Dynamic App-Level Theme Helpers for Editor Layout Panels
  const editorBgClass = isLight ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-zinc-100';
  const editorHeaderClass = isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-white';
  const editorRailClass = isLight ? 'bg-zinc-200/70 border-zinc-300 text-zinc-700' : 'bg-zinc-950 border-zinc-800 text-zinc-400';
  const editorPanelClass = isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white';
  const editorCanvasBgClass = isLight ? 'bg-zinc-200/90' : 'bg-zinc-950';
  const editorCardBgClass = isLight ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm' : 'bg-zinc-950 border-zinc-800 text-white';

  // Dynamic Theme Styling Helpers
  const getThemeBgClass = () => {
    switch (themeBgMode) {
      case 'light_clean': return 'bg-zinc-100 text-zinc-900 border-zinc-300';
      case 'synthwave_neon': return 'bg-zinc-950 text-white border-pink-500/40 shadow-[0_0_50px_rgba(236,72,153,0.15)]';
      case 'emerald_eco': return 'bg-slate-950 text-white border-emerald-500/30';
      case 'midnight_luxury': return 'bg-black text-white border-zinc-800';
      default: return 'bg-zinc-950 text-white border-zinc-800';
    }
  };

  const getThemeCardClass = () => {
    switch (themeCardStyle) {
      case 'solid':
        return themeBgMode === 'light_clean' ? 'bg-white border border-zinc-200 text-zinc-900 shadow-sm' : 'bg-zinc-900 border border-zinc-800 text-white';
      case 'bordered':
        return themeBgMode === 'light_clean' ? 'bg-zinc-100 border-2 border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-2 border-indigo-500/40 text-white';
      case 'gradient':
        return themeBgMode === 'light_clean' ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-zinc-900' : 'bg-gradient-to-r from-zinc-900 to-indigo-950/50 border border-indigo-500/40 text-white';
      case 'glass':
      default:
        return themeBgMode === 'light_clean' ? 'bg-white/80 backdrop-blur-md border border-zinc-200 text-zinc-900' : 'bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 text-white';
    }
  };

  const getThemeRadiusClass = () => {
    const currentRadius = borderRadius || themeRadius;
    switch (currentRadius) {
      case 'none': return 'rounded-none';
      case 'md': return 'rounded-lg';
      case '2xl': return 'rounded-2xl';
      case 'full': return 'rounded-3xl';
      case 'xl':
      default: return 'rounded-xl';
    }
  };

  const getThemeFontClass = () => {
    const currentFont = fontFamily || themeFont;
    switch (currentFont) {
      case 'mono':
      case 'fira_code':
      case 'space_mono': return 'font-mono';
      case 'serif':
      case 'playfair':
      case 'merriweather':
      case 'lora':
      case 'cinzel': return 'font-serif';
      default: return 'font-sans';
    }
  };

  const getThemeFontFamilyCss = () => {
    const fontId = fontFamily || themeFont || 'sans';
    const found = ENTERPRISE_FONTS.find(f => f.id === fontId);
    return found ? found.fontFamilyCss : "'Inter', sans-serif";
  };

  const getThemeHeaderClass = () => {
    if (themeBgMode === 'light_clean') {
      return 'bg-white border-b border-zinc-200 text-zinc-900';
    }
    return 'bg-zinc-900 border-b border-zinc-800 text-white';
  };

  // Localization Config State
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['en', 'es', 'fr']);
  const [autoTranslate, setAutoTranslate] = useState(false);

  // Form Submissions Inbox Sample Data
  const [submissions] = useState([

    {
      id: 'sub-101',
      formName: 'Internal Intake Triage Form',
      submittedBy: 'Kenny Powers (Systems Analyst)',
      submittedAt: '10 mins ago',
      data: { Urgency: 'High', Category: 'Infrastructure', Notes: 'DB connection latency spike on US-East' }
    },
    {
      id: 'sub-102',
      formName: 'Customer Support Ticket Form',
      submittedBy: 'Sarah Connor (Security Admin)',
      submittedAt: '1 hour ago',
      data: { Subject: 'API Token Rotation', Priority: 'Urgent', Department: 'SecOps' }
    },
    {
      id: 'sub-103',
      formName: 'Product Feedback Survey',
      submittedBy: 'David Miller (Product Manager)',
      submittedAt: '3 hours ago',
      data: { Score: '10/10', Experience: 'Site Builder is lightning fast!', Feature: 'Multi-Page & Drag-Drop' }
    }
  ]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  // Workspace Modules List for Form Embed
  const [availableModules, setAvailableModules] = useState<{ id: string; name: string; type: string }[]>([]);
  
  // Mobile Hamburger Toggle in Preview
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);

  // New Page Modal State inside Inspector


  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false);
  const [deletePageTarget, setDeletePageTarget] = useState<{ id: string; title: string } | null>(null);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [newPageDesc, setNewPageDesc] = useState('');
  const [newPageParentId, setNewPageParentId] = useState<string>('');

  // Preview State
  const [kbQuery, setKbQuery] = useState('');


  useEffect(() => {
    const fetchSiteAndModules = async () => {
      if (!siteId) return;
      try {
        setLoading(true);
        const data = await SiteService.getSiteById(siteId);
        setSite(data);

        setName(data.name || '');
        setDescription(data.description || '');
        setCategory(data.category || 'internal');
        setType(data.type || '');
        setDomain(data.domain || '');
        setStatus(data.status || 'active');
        setAccess(data.access || 'Authenticated');

        const branding = data.branding || {
          accentColor: '#6366f1',
          logoUrl: '',
          headerTitle: data.name,
          footerText: 'Powered by Aurora Platform',
          headerLayout: 'top_right'
        };
        setAccentColor(branding.accentColor || '#6366f1');
        setLogoUrl(branding.logoUrl || '');
        setHeaderTitle(branding.headerTitle || data.name);
        setFooterText(branding.footerText || 'Powered by Aurora Platform');
        setHeaderLayout(branding.headerLayout || 'top_right');

        // Multi-Page resolution
        let initialPages: SitePage[] = [];
        if (Array.isArray(data.pages) && data.pages.length > 0) {
          initialPages = data.pages;
        } else if (Array.isArray(data.pagesConfig) && data.pagesConfig.length > 0 && data.pagesConfig[0].slug) {
          initialPages = data.pagesConfig;
        } else {
          initialPages = [
            {
              id: 'page-home',
              title: 'Home Portal',
              slug: '/',
              description: 'Main portal home page.',
              isHome: true,
              parentId: null,
              widgets: Array.isArray(data.pagesConfig) ? data.pagesConfig : [
                { id: 'w-hero', type: 'hero', enabled: true, title: `Welcome to ${data.name}`, subtitle: data.description },
                { id: 'w-announcements', type: 'announcements', enabled: true, title: 'Portal News & Bulletins' },
                { id: 'w-status', type: 'status_widget', enabled: true, title: 'Live System Health Monitor' }
              ]
            }
          ];
        }

        setPages(initialPages);
        setActivePageId(initialPages[0]?.id || 'page-home');

        // Build navigation items from initialPages
        const navList: SiteNavItem[] = initialPages.map(p => ({
          id: `nav-${p.id}`,
          label: p.title,
          path: p.slug
        }));
        setNavItems(data.navConfig && data.navConfig.length >= initialPages.length ? data.navConfig : navList);

        // SEO Config Resolution
        if (data.seoConfig) {
          setMetaTitle(data.seoConfig.metaTitle || data.name);
          setMetaDescription(data.seoConfig.metaDescription || data.description);
          setOgImageUrl(data.seoConfig.ogImageUrl || '');
          setNoIndex(!!data.seoConfig.noIndex);
          setCanonicalUrl(data.seoConfig.canonicalUrl || '');
        } else {
          setMetaTitle(data.name);
          setMetaDescription(data.description);
        }

        // Typography Resolution
        if (data.typographyConfig) {
          setFontFamily(data.typographyConfig.fontFamily || 'sans');
          setBorderRadius(data.typographyConfig.borderRadius || 'xl');
          setFontScale(data.typographyConfig.fontScale || 'normal');
        }

        // Custom Code Resolution
        if (data.customCode) {
          setHeadScripts(data.customCode.headScripts || '');
          setBodyScripts(data.customCode.bodyScripts || '');
          setCustomCss(data.customCode.customCss || '');
        }

        // Localization Resolution
        if (data.localizationConfig) {
          setDefaultLanguage(data.localizationConfig.defaultLanguage || 'en');
          setSupportedLanguages(data.localizationConfig.supportedLanguages || ['en', 'es', 'fr']);
          setAutoTranslate(!!data.localizationConfig.autoTranslate);
        }

        // Fetch Workspace Modules for Form Embedding

        try {
          const apiBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3001/api' : '/api';
          const tenantId = localStorage.getItem('aurora_tenant_id') || 'tenant-aurora-core';
          const modRes = await fetch(`${apiBaseUrl}/data/modules`, { headers: { 'x-tenant-id': tenantId } });
          if (modRes.ok) {
            const mods = await modRes.json();
            setAvailableModules(mods.map((m: any) => ({ id: m.id, name: m.name, type: m.type })));
          }
        } catch {
          setAvailableModules([
            { id: 'mod-support-tickets', name: 'Support Tickets Intake', type: 'RECORD' },
            { id: 'mod-customer-feedback', name: 'Customer Feedback Survey', type: 'RECORD' },
            { id: 'mod-lead-registration', name: 'Lead Registration Form', type: 'RECORD' }
          ]);
        }

      } catch (err: any) {
        toast.error(err.message || 'Failed to load site details.');
        navigate('/workspace/settings/platform-modules/sites');
      } finally {
        setLoading(false);
      }
    };

    fetchSiteAndModules();
  }, [siteId, navigate]);

  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBuilderFullscreen) {
        setIsBuilderFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBuilderFullscreen, setIsBuilderFullscreen]);

  const activePage = useMemo(() => {
    return pages.find(p => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isLight ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-white'}`}>
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mb-3" />
        <p className={`text-xs font-semibold ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>Loading Multi-Page Site Builder Studio...</p>
      </div>
    );
  }

  if (!site) return null;

  const colorSwatches = [
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Indigo', value: '#6366f1' },
    { label: 'Purple', value: '#a855f7' },
    { label: 'Emerald', value: '#10b981' },
    { label: 'Amber', value: '#f59e0b' },
    { label: 'Rose', value: '#f43f5e' }
  ];

  // Drag and Drop Page Reordering & Nesting Handlers
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    e.dataTransfer.setData('text/plain', pageId);
    setDraggedPageId(pageId);
  };

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    if (draggedPageId !== pageId) {
      setDragOverPageId(pageId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    const sourceId = draggedPageId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetPageId) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    setPages(prevPages => {
      const sourceIndex = prevPages.findIndex(p => p.id === sourceId);
      const targetIndex = prevPages.findIndex(p => p.id === targetPageId);
      if (sourceIndex < 0 || targetIndex < 0) return prevPages;

      const newPages = [...prevPages];
      const [movedPage] = newPages.splice(sourceIndex, 1);
      newPages.splice(targetIndex, 0, movedPage);
      return newPages;
    });

    toast.success('Page reordered!');
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  const handleMovePageOrder = (pageId: string, direction: 'up' | 'down') => {
    setPages(prevPages => {
      const idx = prevPages.findIndex(p => p.id === pageId);
      if (idx < 0) return prevPages;
      if (direction === 'up' && idx === 0) return prevPages;
      if (direction === 'down' && idx === prevPages.length - 1) return prevPages;

      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const newPages = [...prevPages];
      const temp = newPages[idx];
      newPages[idx] = newPages[targetIdx];
      newPages[targetIdx] = temp;
      return newPages;
    });
  };

  const handleSetPageParent = (pageId: string, newParentId: string | null) => {
    if (pageId === newParentId) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === pageId) {
        return { ...p, parentId: newParentId || null };
      }
      return p;
    }));
    toast.info('Page nesting updated.');
  };

  const getWidgetGridClass = (layout?: string) => {
    switch (layout) {
      case '2_col': return 'col-span-12 md:col-span-6';
      case '3_col': return 'col-span-12 md:col-span-4';
      case '4_col': return 'col-span-12 md:col-span-3';
      case 'split_1_2': return 'col-span-12 md:col-span-4';
      case 'split_2_1': return 'col-span-12 md:col-span-8';
      case '1_col':
      default: return 'col-span-12';
    }
  };

  const handleDropWidgetOnCanvas = (targetWidgetId: string) => {
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId || !activePage) return;
    
    const updatedWidgets = [...activePage.widgets];
    const draggedIdx = updatedWidgets.findIndex(w => w.id === draggedWidgetId);
    const targetIdx = updatedWidgets.findIndex(w => w.id === targetWidgetId);
    
    if (draggedIdx !== -1 && targetIdx !== -1) {
      const [movedWidget] = updatedWidgets.splice(draggedIdx, 1);
      updatedWidgets.splice(targetIdx, 0, movedWidget);
      setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, widgets: updatedWidgets } : p));
      toast.success('Widget reordered cleanly!');
    }
    
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  // Add New Page Handler
  const handleAddPage = () => {
    if (!newPageTitle) {
      toast.error('Please enter a Page Title.');
      return;
    }
    const slug = newPageSlug ? (newPageSlug.startsWith('/') ? newPageSlug : `/${newPageSlug}`) : `/${newPageTitle.toLowerCase().replace(/\s+/g, '-')}`;
    const newPage: SitePage = {
      id: `page-${Date.now()}`,
      title: newPageTitle,
      slug,
      description: newPageDesc || 'Custom portal page.',
      isHome: false,
      parentId: newPageParentId || null,
      widgets: [
        { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: newPageTitle, subtitle: newPageDesc || 'Page overview and layout.' }
      ]
    };

    setPages(prev => [...prev, newPage]);
    setActivePageId(newPage.id);
    
    if (!navItems.some(n => n.path === slug)) {
      setNavItems(prev => [...prev, { id: `nav-${Date.now()}`, label: newPageTitle, path: slug }]);
    }

    setNewPageTitle('');
    setNewPageSlug('');
    setNewPageDesc('');
    setNewPageParentId('');
    setIsAddPageModalOpen(false);
    toast.success(`Page "${newPageTitle}" created!`);
  };


  const handleDeletePage = (pageId: string, pageTitle: string) => {
    if (pages.length <= 1) {
      toast.error('A site must have at least one page.');
      return;
    }
    setDeletePageTarget({ id: pageId, title: pageTitle });
  };

  const handleConfirmDeletePage = () => {
    if (!deletePageTarget) return;
    const { id: pageId, title: pageTitle } = deletePageTarget;
    if (pages.length <= 1) {
      toast.error('A site must have at least one page.');
      setDeletePageTarget(null);
      return;
    }
    const targetPage = pages.find(p => p.id === pageId);
    const remainingPages = pages.filter(p => p.id !== pageId && p.parentId !== pageId);
    
    // Update pages array
    setPages(remainingPages);

    // Also update navigation links if matching deleted page slug
    if (targetPage?.slug) {
      setNavItems(prev => prev.filter(item => item.path !== targetPage.slug));
    }

    // Switch active page immediately to first remaining page if deleted page was active
    if (activePageId === pageId || pages.some(p => p.parentId === pageId && p.id === activePageId)) {
      setActivePageId(remainingPages[0]?.id || '');
    }

    setDeletePageTarget(null);
    toast.success(`Page "${pageTitle}" deleted successfully.`);
  };

  const handleAddNavItem = () => {
    if (!newNavLabel || !newNavPath) {
      toast.error('Please specify both Label and URL Path.');
      return;
    }
    const newItem: SiteNavItem = {
      id: `nav-${Date.now()}`,
      label: newNavLabel,
      path: newNavPath
    };
    setNavItems(prev => [...prev, newItem]);
    setNewNavLabel('');
    setNewNavPath('');
    toast.success(`Navbar link "${newNavLabel}" added.`);
  };

  const handleDeleteNavItem = (id: string) => {
    setNavItems(prev => prev.filter(item => item.id !== id));
  };

  const handleMoveNavItem = (id: string, direction: 'up' | 'down') => {
    setNavItems(prev => {
      const idx = prev.findIndex(item => item.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const newItems = [...prev];
      const temp = newItems[idx];
      newItems[idx] = newItems[targetIdx];
      newItems[targetIdx] = temp;
      return newItems;
    });
  };

  // Active Page Widgets Handlers
  const handleToggleActivePageWidget = (widgetId: string) => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return {
          ...p,
          widgets: p.widgets.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w)
        };
      }
      return p;
    }));
  };

  const handleUpdateWidgetProp = (widgetId: string, key: string, value: any) => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return {
          ...p,
          widgets: p.widgets.map(w => w.id === widgetId ? { ...w, [key]: value } : w)
        };
      }
      return p;
    }));
  };

  const handleAddWidgetToActivePage = (type: SiteWidget['type'], customTitle?: string) => {
    if (!activePage) return;
    const typeTitles: Record<string, string> = {
      heading_block: 'Heading (H1 - H6)',
      text_paragraph: 'Text & Paragraph Block',
      horizontal_rule: 'Horizontal Divider Line (HR)',
      content_panel: 'Visual Layout Panel',
      vertical_spacer: 'Vertical Spacer & Gap',
      cms_collection_list: 'Dynamic Repeater',
      data_table: 'Dynamic Data Table',
      record_card: 'Record Profile Card',
      record_lookup: 'Reference Lookup Bar',
      card_grid: 'Catalog Card Grid',
      kanban_board: 'Kanban Pipeline Board',
      event_calendar: 'Interactive Event Calendar',
      file_vault: 'Document & File Vault',
      kpi_stat_group: 'KPI Stat Counters',
      custom_form: 'Dynamic Form Builder',
      form_wizard: 'Multi-Step Form Wizard',
      feedback_survey: 'NPS & Rating Survey',
      calculator_widget: 'Pricing & Cost Calculator',
      signature_pad: 'Digital E-Signature Pad',
      auth_box: 'Member Login & SSO Card',
      user_profile: 'User Account Profile',
      access_guard: 'Role Access Guard',
      team_directory: 'Team & Staff Directory',
      chat_thread: 'Live Support Chat Thread',
      activity_feed: 'Activity & Audit Stream',
      announcements: 'Broadcast News Banner',
      faq_accordion: 'FAQ Accordion List',
      hero: 'Hero Header Banner',
      feature_grid: 'Feature Grid Cards',
      tabbed_content: 'Interactive Content Tabs',
      pricing_table: 'Pricing & Plan Table',
      testimonials: 'Testimonial Carousel',
      cta_strip: 'CTA Highlight Strip',
      embed_iframe: 'Embed Video & External Iframe',
      bottom_nav_bar: 'Mobile Bottom Nav Bar',
      floating_action_btn: 'Floating Action Button',
      push_prompt: 'Push Notification Prompt',
      infinite_stream: 'Infinite Scroll Feed'
    };

    const newWidget: SiteWidget = {
      id: `w-${type}-${Date.now()}`,
      type,
      enabled: true,
      title: customTitle || typeTitles[type] || 'New Building Block Widget',
      targetModuleId: availableModules[0]?.id || ''
    };

    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return { ...p, widgets: [...p.widgets, newWidget] };
      }
      return p;
    }));

    setIsAddWidgetModalOpen(false);
    setSelectedElement({ type: 'widget', id: newWidget.id });
    toast.success(`Widget "${newWidget.title}" added to page "${activePage.title}"!`);
  };

  const handleMoveWidgetOrder = (widgetId: string, direction: 'up' | 'down') => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        const index = p.widgets.findIndex(w => w.id === widgetId);
        if (index === -1) return p;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= p.widgets.length) return p;

        const newWidgets = [...p.widgets];
        const [moved] = newWidgets.splice(index, 1);
        newWidgets.splice(targetIndex, 0, moved);
        return { ...p, widgets: newWidgets };
      }
      return p;
    }));
  };

  const handleDuplicateWidget = (widgetId: string) => {
    if (!activePage) return;
    let newId = '';
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        const targetWidget = p.widgets.find(w => w.id === widgetId);
        if (!targetWidget) return p;
        newId = `w-${targetWidget.type}-${Date.now()}`;
        const duplicated: SiteWidget = {
          ...targetWidget,
          id: newId,
          title: `${targetWidget.title} (Copy)`
        };
        const index = p.widgets.findIndex(w => w.id === widgetId);
        const newWidgets = [...p.widgets];
        newWidgets.splice(index + 1, 0, duplicated);
        return { ...p, widgets: newWidgets };
      }
      return p;
    }));
    if (newId) setSelectedElement({ type: 'widget', id: newId });
    toast.success('Widget duplicated!');
  };

  const handleDeleteWidget = (widgetId: string) => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return {
          ...p,
          widgets: p.widgets.filter(w => w.id !== widgetId)
        };
      }
      return p;
    }));
    if (selectedElement?.type === 'widget' && selectedElement.id === widgetId) {
      setSelectedElement(null);
    }
    toast.success('Widget removed');
  };

  const handleAddFormField = (widgetId: string) => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return {
          ...p,
          widgets: p.widgets.map(w => {
            if (w.id === widgetId) {
              const currentFields = w.formFields || [
                { id: 'f-1', label: 'Contact Email', fieldType: 'email', required: true, placeholder: 'name@company.com' },
                { id: 'f-2', label: 'Subject / Title', fieldType: 'text', required: true, placeholder: 'Summary of inquiry...' },
                { id: 'f-3', label: 'Detailed Description', fieldType: 'textarea', required: true, placeholder: 'Provide full details...' }
              ];
              const newField: FormFieldConfig = {
                id: `f-${Date.now()}`,
                label: 'New Custom Field',
                fieldType: 'text',
                required: false,
                placeholder: 'Enter field value...'
              };
              return { ...w, formFields: [...currentFields, newField] };
            }
            return w;
          })
        };
      }
      return p;
    }));
  };

  const handleUpdateFormField = (widgetId: string, fieldId: string, key: keyof FormFieldConfig, value: any) => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return {
          ...p,
          widgets: p.widgets.map(w => {
            if (w.id === widgetId) {
              const currentFields = w.formFields || [
                { id: 'f-1', label: 'Contact Email', fieldType: 'email', required: true, placeholder: 'name@company.com' },
                { id: 'f-2', label: 'Subject / Title', fieldType: 'text', required: true, placeholder: 'Summary of inquiry...' },
                { id: 'f-3', label: 'Detailed Description', fieldType: 'textarea', required: true, placeholder: 'Provide full details...' }
              ];
              return {
                ...w,
                formFields: currentFields.map(f => f.id === fieldId ? { ...f, [key]: value } : f)
              };
            }
            return w;
          })
        };
      }
      return p;
    }));
  };

  const handleRemoveFormField = (widgetId: string, fieldId: string) => {
    if (!activePage) return;
    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return {
          ...p,
          widgets: p.widgets.map(w => {
            if (w.id === widgetId) {
              const currentFields = w.formFields || [];
              return {
                ...w,
                formFields: currentFields.filter(f => f.id !== fieldId)
              };
            }
            return w;
          })
        };
      }
      return p;
    }));
  };

  const handleApplyTemplatePreset = (presetId: string) => {
    let newPages: SitePage[] = [];
    let newColor = '#6366f1';
    let newCategory: 'internal' | 'external' | 'public' = 'internal';

    if (presetId === 'intranet') {
      newColor = '#6366f1';
      newCategory = 'internal';
      newPages = [
        {
          id: 'page-home',
          title: 'Home',
          slug: '/',
          description: 'Main internal corporate portal.',
          isHome: true,
          widgets: [
            { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: `Welcome to ${name || 'Corporate Intranet'}`, subtitle: 'Central company operational hub and internal triage.' },
            { id: `w-announcements-${Date.now()}`, type: 'announcements', enabled: true, title: 'Company News & Announcements' },
            { id: `w-form-${Date.now()}`, type: 'form_embed', enabled: true, title: 'Internal Operations Intake Form' }
          ]
        },
        {
          id: 'page-services',
          title: 'Services & Knowledge',
          slug: '/services',
          description: 'Company SOPs and internal docs.',
          isHome: false,
          widgets: [
            { id: `w-kb-${Date.now()}`, type: 'kb_search', enabled: true, title: 'Internal Knowledge Base' }
          ]
        }
      ];
    } else if (presetId === 'helpdesk') {
      newColor = '#3b82f6';
      newCategory = 'external';
      newPages = [
        {
          id: 'page-home',
          title: 'Support Home',
          slug: '/',
          description: 'Customer help desk and documentation.',
          isHome: true,
          widgets: [
            { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: 'Customer Support Portal', subtitle: 'Search articles or submit an inquiry to our team.' },
            { id: `w-kb-${Date.now()}`, type: 'kb_search', enabled: true, title: 'Search Help Center' },
            { id: `w-ticket-${Date.now()}`, type: 'ticket_form', enabled: true, title: 'Submit Support Ticket' }
          ]
        }
      ];
    } else if (presetId === 'apidocs') {
      newColor = '#8b5cf6';
      newCategory = 'public';
      newPages = [
        {
          id: 'page-home',
          title: 'Developer Portal',
          slug: '/',
          description: 'API documentation & webhook integration guide.',
          isHome: true,
          widgets: [
            { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: 'Developer & API Portal', subtitle: 'Build integrations with official SDKs and webhooks.' },
            { id: `w-kb-${Date.now()}`, type: 'kb_search', enabled: true, title: 'Search API Specifications' },
            { id: `w-status-${Date.now()}`, type: 'status_widget', enabled: true, title: 'API Gateway Status' }
          ]
        }
      ];
    } else if (presetId === 'status') {
      newColor = '#10b981';
      newCategory = 'public';
      newPages = [
        {
          id: 'page-home',
          title: 'System Status',
          slug: '/',
          description: 'Real-time service health monitoring.',
          isHome: true,
          widgets: [
            { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: 'Platform Status Center', subtitle: 'Live operational health and incident history.' },
            { id: `w-status-${Date.now()}`, type: 'status_widget', enabled: true, title: 'System Services Health' },
            { id: `w-announcements-${Date.now()}`, type: 'announcements', enabled: true, title: 'Incident & Maintenance Bulletins' }
          ]
        }
      ];
    } else if (presetId === 'vendor') {
      newColor = '#f59e0b';
      newCategory = 'external';
      newPages = [
        {
          id: 'page-home',
          title: 'Vendor Hub',
          slug: '/',
          description: 'Vendor intake and compliance upload center.',
          isHome: true,
          widgets: [
            { id: `w-hero-${Date.now()}`, type: 'hero', enabled: true, title: 'Vendor Compliance Center', subtitle: 'Submit proposals, invoices, and credentials.' },
            { id: `w-form-${Date.now()}`, type: 'form_embed', enabled: true, title: 'Vendor Onboarding Intake' }
          ]
        }
      ];
    }

    if (newPages.length > 0) {
      setPages(newPages);
      setActivePageId(newPages[0].id);
      setAccentColor(newColor);
      setCategory(newCategory);
      setSelectedElement(null);
      setIsTemplateModalOpen(false);
      toast.success(`Applied ${presetId.toUpperCase()} template preset!`);
    }
  };


  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    try {
      // Sync navConfig with pages to ensure all site pages render in top navigation
      const syncedNavConfig = pages.map(p => ({
        id: `nav-${p.id}`,
        label: p.title,
        path: p.slug
      }));

      const updatedData: Partial<Site> = {
        name,
        description,
        category,
        type,
        domain,
        status,
        access,
        branding: {
          accentColor,
          logoUrl,
          headerTitle: headerTitle || name,
          footerText,
          headerLayout,
          navLinkStyle,
          themeConfig: {
            accentColor,
            bgMode: themeBgMode,
            cardStyle: themeCardStyle,
            borderRadius: themeRadius,
            fontFamily: themeFont,
            headerLayout,
            navLinkStyle,
            customCss
          }
        },
        navConfig: navItems.length > 0 ? navItems : syncedNavConfig,
        pagesConfig: pages,
        pages: pages,
        seoConfig: {
          metaTitle,
          metaDescription,
          ogImageUrl,
          noIndex,
          canonicalUrl
        },
        typographyConfig: {
          fontFamily,
          borderRadius,
          fontScale
        },
        customCode: {
          headScripts,
          bodyScripts,
          customCss
        },
        localizationConfig: {
          defaultLanguage,
          supportedLanguages,
          autoTranslate
        }
      };



      const updated = await SiteService.updateSite(site.id, updatedData);
      setSite(updated);
      toast.success(`Multi-page site "${name}" saved successfully!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save site configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Preview viewport width classes
  const viewportWidthClass = {
    desktop: 'w-full max-w-5xl rounded-2xl',
    tablet: 'w-[768px] max-w-full rounded-2xl',
    mobile: 'w-[375px] max-w-full rounded-[40px] border-4 border-zinc-700 shadow-2xl',
    mobile_android: 'w-[360px] max-w-full rounded-[28px] border-4 border-emerald-900/60 shadow-2xl'
  }[viewport];

  const sampleArticles = [
    { title: 'Getting Started & Account Setup Guide', cat: 'Onboarding' },
    { title: 'API Authentication & Webhook Payload Specs', cat: 'Engineering' },
    { title: 'Standard Operating Procedures & Security Audit', cat: 'Compliance' }
  ].filter(a => a.title.toLowerCase().includes(kbQuery.toLowerCase()) || a.cat.toLowerCase().includes(kbQuery.toLowerCase()));

  // Root & Nested Pages Helper
  const rootPages = pages.filter(p => !p.parentId);
  const getChildPages = (parentId: string) => pages.filter(p => p.parentId === parentId);

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden font-sans ${editorBgClass}`}>
      
      {/* FULL-SCREEN BUILDER TOP TOOLBAR */}
      <header className={`h-16 border-b px-6 flex items-center justify-between shrink-0 z-30 ${editorHeaderClass}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workspace/settings/platform-modules/sites')}
            className="p-2 opacity-70 hover:opacity-100 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Sites</span>
          </button>

          <div className="h-5 w-px bg-zinc-700/40 hidden sm:block" />

          {/* Site Title & Page Selector Dropdown */}
          <div className="flex items-center gap-3">
            <div 
              className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {headerTitle ? headerTitle.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold leading-none">{name}</h1>
              </div>
              <p className="text-[11px] opacity-60 font-mono mt-0.5">{domain} &bull; {activePage?.slug}</p>
            </div>
          </div>
        </div>

        {/* Viewport Switcher & Canvas Zoom Controls */}
        <div className="hidden lg:flex items-center gap-2">
          <div className={`flex items-center p-1 rounded-xl border ${editorCardBgClass}`}>
            <button
              onClick={() => { setViewport('desktop'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewport === 'desktop' ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Monitor size={14} /> Desktop
            </button>
            <button
              onClick={() => { setViewport('tablet'); setIsMobileMenuOpen(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewport === 'tablet' ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Tablet size={14} /> Tablet
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewport === 'mobile' ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
            >
              <Smartphone size={14} /> Mobile
            </button>
          </div>

          {/* Canvas Zoom Level Controls */}
          <div className={`flex items-center p-1 rounded-xl border ${editorCardBgClass}`}>
            {[100, 85, 75].map(z => (
              <button
                key={z}
                onClick={() => setCanvasZoom(z)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  canvasZoom === z ? 'bg-indigo-600 text-white shadow-sm' : 'opacity-70 hover:opacity-100'
                }`}
                title={`Canvas Zoom ${z}%`}
              >
                {z}%
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 border border-indigo-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Browse Enterprise Site Templates"
          >
            <Sparkles size={14} className="text-indigo-500" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <button
            onClick={toggleBuilderFullscreen}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isBuilderFullscreen 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20' 
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
            }`}
            title={isBuilderFullscreen ? 'Exit Full Screen Mode (Esc)' : 'Enter Full Screen Mode'}
          >
            {isBuilderFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden sm:inline">{isBuilderFullscreen ? 'Exit Fullscreen' : 'Full Screen'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            onClick={() => window.open(`/public/portal/${site.id}`, '_blank')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isLight ? 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800' : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700/60 text-white'
            }`}
          >
            <span>Launch</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer"
          >
            <Smartphone size={14} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* SPLIT-SCREEN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT INSPECTOR SIDEBAR (400px split into 56px Vertical Icon Rail + 344px Tool Panel) */}
        <aside className={`w-[400px] shrink-0 border-r flex h-full overflow-hidden ${editorPanelClass}`}>
          
          {/* VERTICAL ICON RAIL (56px) - Modern animated edge-aligned tab rail */}
          <div className={`w-[56px] shrink-0 border-r flex flex-col items-center py-3 space-y-1 z-10 overflow-y-auto no-scrollbar ${editorRailClass}`}>
            {[
              { id: 'pages', label: 'Pages', icon: Layers },
              { id: 'branding', label: 'Branding', icon: Palette },
              { id: 'widgets', label: 'Layout Catalog', icon: LayoutGrid },
              { id: 'seo', label: 'SEO & Social', icon: Search },
              { id: 'inbox', label: 'Form Inbox', icon: Inbox },
              { id: 'code', label: 'Custom Code', icon: Code },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'localization', label: 'Languages', icon: Globe },
              { id: 'access', label: 'Access', icon: ShieldCheck },
              { id: 'analytics', label: 'Site Analytics', icon: BarChart3 },
              { id: 'history', label: 'Revision History', icon: History }
            ].map(t => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className="w-full h-11 relative flex items-center justify-center cursor-pointer group transition-all"
                  title={t.label}
                >
                  {/* Left Edge Accent Bar - Smooth sliding spring transition */}
                  {isActive && (
                    <motion.span 
                      layoutId="activeSidetabIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[20px] rounded-r-full shadow-sm z-10"
                      style={{ backgroundColor: accentColor || '#6366f1' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Icon - Micro-bounce pop on active selection */}
                  <motion.div 
                    animate={{ 
                      scale: isActive ? [0.85, 1.15, 1] : 1,
                    }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex items-center justify-center"
                  >
                    <Icon 
                      size={20} 
                      className={`transition-colors duration-200 ${
                        isActive 
                          ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.4)]' 
                          : 'text-zinc-400 group-hover:text-zinc-200'
                      }`}
                      style={isActive ? { color: accentColor || '#6366f1' } : undefined}
                    />
                  </motion.div>

                  {/* Hover Tooltip */}
                  <span className="absolute left-full ml-2 px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-[11px] font-semibold rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TOOL PANEL CONTENT (344px) */}
          <div className={`flex-1 flex flex-col h-full overflow-hidden ${editorPanelClass}`}>
            
            {/* Tool Panel Header */}
            <div className={`p-4 border-b flex items-center justify-between shrink-0 ${isLight ? 'bg-zinc-100/80 border-zinc-200' : 'bg-zinc-950/40 border-zinc-800'}`}>
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                {activeTab === 'pages' && <><Layers size={14} className="text-indigo-500" /> Site Pages</>}
                {activeTab === 'branding' && <><Palette size={14} className="text-indigo-500" /> Branding & Theme</>}
                {activeTab === 'widgets' && <><LayoutGrid size={14} className="text-indigo-500" /> Layout & Widgets</>}
                {activeTab === 'nav' && <><Menu size={14} className="text-indigo-500" /> Header Navbar</>}
                {activeTab === 'seo' && <><Search size={14} className="text-indigo-500" /> SEO & Social Sharing</>}
                {activeTab === 'inbox' && <><Inbox size={14} className="text-indigo-500" /> Form Submissions & Inbox</>}
                {activeTab === 'code' && <><Code size={14} className="text-indigo-500" /> Custom Code & Scripts</>}
                {activeTab === 'typography' && <><Type size={14} className="text-indigo-500" /> Typography & Theme</>}
                {activeTab === 'localization' && <><Globe size={14} className="text-indigo-500" /> Multi-Language & Locales</>}
                {activeTab === 'access' && <><ShieldCheck size={14} className="text-indigo-500" /> Access & Governance</>}
              </h3>
            </div>


            {/* Tab Content Panels */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* TAB 1: PAGES MANAGER (WITH DRAG & DROP REORDERING AND NESTING) */}
              {activeTab === 'pages' && (
                <div className="space-y-5">
                  <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Drag & Drop Pages Manager</h4>
                    <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Drag items to reorder pages or select a Parent page to nest sub-pages.</p>
                  </div>


                {/* Add Page Button (Triggers Aurora Premium Modal) */}
                <button
                  type="button"
                  onClick={() => setIsAddPageModalOpen(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Add New Page
                </button>


                {/* Drag-and-Drop Pages List Tree */}
                <div className="space-y-2">
                  {pages.map(page => {
                    const isSelected = page.id === activePageId;
                    const isDragged = draggedPageId === page.id;
                    const isDragOver = dragOverPageId === page.id;


                    return (
                      <div
                        key={page.id}
                        draggable
                        onDragStart={e => handleDragStart(e, page.id)}
                        onDragOver={e => handleDragOver(e, page.id)}
                        onDrop={e => handleDrop(e, page.id)}
                        onClick={() => setActivePageId(page.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                          page.parentId 
                            ? (isLight ? 'ml-6 border-l-2 border-indigo-500/40 bg-zinc-100/80 border-zinc-200' : 'ml-6 border-l-2 border-indigo-500/40 bg-zinc-950/60 border-zinc-800') 
                            : (isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800')
                        } ${
                          isSelected ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30' : 'hover:border-indigo-500/30'
                        } ${isDragged ? 'opacity-40 border-dashed border-amber-500' : ''} ${
                          isDragOver ? 'border-2 border-indigo-400 bg-indigo-500/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <GripVertical size={14} className="opacity-50 cursor-grab active:cursor-grabbing hover:opacity-100" />
                            {page.parentId && <CornerDownRight size={14} className="text-indigo-500 shrink-0" />}
                            <FileCode size={16} className={isSelected ? 'text-indigo-500' : 'opacity-50'} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{page.title}</span>
                                {page.isHome && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded">Home</span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono opacity-60">{page.slug}</span>
                            </div>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleMovePageOrder(page.id, 'up')}
                              className="p-1 opacity-50 hover:opacity-100 hover:bg-indigo-500/10 rounded cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePageOrder(page.id, 'down')}
                              className="p-1 opacity-50 hover:opacity-100 hover:bg-indigo-500/10 rounded cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={12} />
                            </button>

                            {!page.isHome && (
                              <button
                                type="button"
                                onClick={() => handleDeletePage(page.id, page.title)}
                                className="p-1 opacity-50 hover:text-red-500 hover:bg-red-500/10 rounded cursor-pointer"
                                title="Delete Page"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nesting Parent Selector */}
                        <div className="mt-2 pt-2 border-t border-zinc-500/20 flex items-center justify-between text-[10px]" onClick={e => e.stopPropagation()}>
                          <span className="opacity-60 font-bold uppercase">Parent:</span>
                          <select
                            value={page.parentId || ''}
                            onChange={e => handleSetPageParent(page.id, e.target.value || null)}
                            className={`text-[10px] px-2 py-0.5 rounded cursor-pointer border ${isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}
                          >
                            <option value="">None (Root Page)</option>
                            {pages.filter(p => p.id !== page.id).map(p => (
                              <option key={p.id} value={p.id}>
                                Nest under: {p.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: BRANDING & THEME STUDIO */}
            {activeTab === 'branding' && (
              <div className="space-y-5">
                {/* Segment Switcher */}
                <div className={`flex p-1 rounded-xl border ${isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <button
                    type="button"
                    onClick={() => setActiveThemeSegment('presets')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeThemeSegment === 'presets'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    1-Click Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveThemeSegment('custom')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeThemeSegment === 'custom'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Custom Studio
                  </button>
                </div>

                {/* SEGMENT 1: PRESET THEMES GALLERY */}
                {activeThemeSegment === 'presets' && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-400">Curated enterprise design themes with instant 1-click styling sync.</p>
                    
                    <div className="space-y-3">
                      {PRESET_THEMES.map(t => (
                        <div
                          key={t.id}
                          className={`p-4 rounded-2xl border transition-all space-y-3 group ${
                            isLight 
                              ? 'bg-zinc-50 border-zinc-200 hover:border-indigo-500' 
                              : 'bg-zinc-950 border-zinc-800 hover:border-indigo-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`h-4 w-12 rounded-full bg-gradient-to-r ${t.previewGradient}`} />
                              <h5 className={`text-xs font-bold transition-colors ${
                                isLight ? 'text-zinc-900 group-hover:text-indigo-600' : 'text-white group-hover:text-indigo-400'
                              }`}>{t.name}</h5>
                            </div>
                            {t.badge && (
                              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded font-mono">
                                {t.badge}
                              </span>
                            )}
                          </div>

                          <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.description}</p>

                          <button
                            type="button"
                            onClick={() => handleApplyPresetTheme(t)}
                            className={`w-full py-1.5 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isLight 
                                ? 'bg-white text-zinc-800 border-zinc-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600' 
                                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-indigo-600 hover:text-white'
                            }`}
                          >
                            <Sparkles size={12} /> Apply Theme Preset
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SEGMENT 2: CUSTOM THEME STUDIO BUILDER */}
                {activeThemeSegment === 'custom' && (
                  <div className="space-y-5">
                    {/* Primary Accent Color */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Primary Accent Color
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={e => setAccentColor(e.target.value)}
                          className="h-10 w-12 rounded-xl border border-zinc-300 bg-transparent cursor-pointer"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          {colorSwatches.map(c => (
                            <button
                              key={c.value}
                              type="button"
                              onClick={() => setAccentColor(c.value)}
                              className="h-7 px-2.5 text-[11px] font-semibold rounded-lg text-white transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              style={{ backgroundColor: c.value }}
                            >
                              {accentColor.toLowerCase() === c.value.toLowerCase() && <Check size={12} />}
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Background Theme Mode */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Background Canvas Mode
                      </label>
                      <select
                        value={themeBgMode}
                        onChange={e => setThemeBgMode(e.target.value as any)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs ${
                          isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'
                        }`}
                      >
                        <option value="dark_obsidian">Dark Obsidian (Deep Slate)</option>
                        <option value="light_clean">Clean Light (Crisp White)</option>
                        <option value="synthwave_neon">Synthwave Neon (Dark Obsidian)</option>
                        <option value="emerald_eco">Emerald Eco (Dark Jade)</option>
                        <option value="midnight_luxury">Midnight Luxury (Pure Black)</option>
                      </select>
                    </div>

                    {/* Card Surface Texture */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Card Surface Texture
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'glass', label: 'Translucent Glass', desc: 'Blurs background' },
                          { id: 'solid', label: 'Solid Matte', desc: 'Flat surface' },
                          { id: 'bordered', label: 'Outline Bordered', desc: 'Structural lines' },
                          { id: 'gradient', label: 'Ambient Glow', desc: 'Gradient border' }
                        ].map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setThemeCardStyle(st.id as any)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              themeCardStyle === st.id
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500 font-bold'
                                : (isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900')
                            }`}
                          >
                            <p className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{st.label}</p>
                            <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'} mt-0.5`}>{st.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Border Radius Scale */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Corner Rounding Scale
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'none', label: 'Sharp' },
                          { id: 'xl', label: 'Modern' },
                          { id: '2xl', label: 'Soft' },
                          { id: 'full', label: 'Pill' }
                        ].map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setThemeRadius(r.id as any)}
                            className={`py-1.5 rounded-lg border text-center text-xs font-bold transition-all cursor-pointer ${
                              themeRadius === r.id
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500'
                                : (isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900')
                            }`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family Pairing */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Typography Font Pairing
                      </label>
                      <select
                        value={themeFont}
                        onChange={e => {
                          const val = e.target.value as any;
                          setThemeFont(val);
                          setFontFamily(val);
                        }}
                        className={`w-full px-3 py-2 border rounded-xl text-xs ${
                          isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'
                        }`}
                      >
                        <option value="sans">Inter Modern (Clean Sans-Serif)</option>
                        <option value="outfit">Outfit Geometric (Modern Tech)</option>
                        <option value="mono">JetBrains Mono (Developer Code)</option>
                        <option value="playfair">Playfair Serif (Luxury Editorial)</option>
                      </select>
                    </div>

                    {/* Custom CSS Injector */}
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                        Custom CSS Override
                      </label>
                      <textarea
                        rows={3}
                        value={customCss}
                        onChange={e => setCustomCss(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-mono resize-none focus:outline-none focus:border-indigo-500 ${
                          isLight ? 'bg-white border-zinc-300 text-indigo-600' : 'bg-zinc-950 border-zinc-800 text-indigo-300'
                        }`}
                        placeholder="/* Enter custom CSS rules */"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: WIDGET COMPONENT LIBRARY */}
            {activeTab === 'widgets' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Widget Component Library</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Click any component below to add it to <span className="text-indigo-500 font-bold">{activePage?.title}</span>.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { category: '📐 Typography & Layout Primitives', items: [
                      { type: 'heading_block', title: 'Heading (H1 - H6)', desc: 'Custom text heading with level sizes (H1-H6) and alignment.', icon: Heading, color: 'text-amber-400 bg-amber-500/10' },
                      { type: 'text_paragraph', title: 'Text & Paragraph Block', desc: 'Generic rich text paragraph block for articles & descriptions.', icon: Type, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'horizontal_rule', title: 'Horizontal Divider (HR)', desc: 'Visual divider line (solid, dashed, dotted, gradient).', icon: Minus, color: 'text-zinc-400 bg-zinc-500/10' },
                      { type: 'content_panel', title: 'Visual Layout Panel', desc: 'Styled container box card panel for grouping child content.', icon: Box, color: 'text-teal-400 bg-teal-500/10' },
                      { type: 'vertical_spacer', title: 'Vertical Spacer & Gap', desc: 'Configurable vertical spacing gap (16px to 96px).', icon: MoveVertical, color: 'text-purple-400 bg-purple-500/10' },
                    ]},
                    { category: '📊 Data, Records & Database', items: [
                      { type: 'cms_collection_list', title: 'Dynamic Repeater', desc: 'Dynamic repeater linked to workspace modules or submodules with contextual data binding.', icon: Database, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'data_table', title: 'Dynamic Data Table', desc: 'Searchable data table with custom columns, filters, and record modal.', icon: Layers, color: 'text-cyan-400 bg-cyan-500/10' },
                      { type: 'record_card', title: 'Record Profile Card', desc: 'Inspector card for key-value record attributes & avatars.', icon: ShieldCheck, color: 'text-blue-400 bg-blue-500/10' },
                      { type: 'record_lookup', title: 'Reference Lookup Bar', desc: 'Universal search bar for tracking codes and reference IDs.', icon: Search, color: 'text-amber-400 bg-amber-500/10' },
                      { type: 'card_grid', title: 'Catalog Card Grid', desc: 'Grid catalog of items, services, products, or portfolios.', icon: Building2, color: 'text-teal-400 bg-teal-500/10' },
                      { type: 'kanban_board', title: 'Kanban Pipeline Board', desc: 'Status column board for task, lead, or application stages.', icon: LayoutGrid, color: 'text-purple-400 bg-purple-500/10' },
                      { type: 'event_calendar', title: 'Interactive Calendar', desc: 'Monthly/weekly event scheduler and booking slot selector.', icon: Calendar, color: 'text-rose-400 bg-rose-500/10' },
                      { type: 'file_vault', title: 'Document & File Vault', desc: 'Drag-and-drop file uploader, PDF viewer, and file library.', icon: FileText, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'kpi_stat_group', title: 'KPI Stat Counters', desc: 'Dashboard stat counter cards with delta indicators.', icon: Activity, color: 'text-emerald-400 bg-emerald-500/10' },
                    ]},
                    { category: '📝 Forms, Surveys & Inputs', items: [
                      { type: 'custom_form', title: 'Dynamic Form Builder', desc: 'Configurable multi-field intake form.', icon: FormInput, color: 'text-emerald-400 bg-emerald-500/10' },
                      { type: 'form_wizard', title: 'Multi-Step Form Wizard', desc: 'Step-by-step progress intake wizard with step navigation.', icon: Clock, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'feedback_survey', title: 'NPS & Rating Survey', desc: 'Star ratings, emoji satisfaction scale, and NPS score slider.', icon: Star, color: 'text-amber-400 bg-amber-500/10' },
                      { type: 'calculator_widget', title: 'Pricing & Cost Calculator', desc: 'Dynamic quote builder with sliders and add-on toggles.', icon: Calculator, color: 'text-cyan-400 bg-cyan-500/10' },
                      { type: 'signature_pad', title: 'Digital E-Signature Pad', desc: 'Touch and mouse signature capture pad.', icon: PenTool, color: 'text-rose-400 bg-rose-500/10' },
                    ]},
                    { category: '🔐 User Identity & Accounts', items: [
                      { type: 'auth_box', title: 'Member Login & SSO Card', desc: 'Login, registration, and social SSO buttons.', icon: Lock, color: 'text-rose-400 bg-rose-500/10' },
                      { type: 'user_profile', title: 'User Account Profile', desc: 'Member profile settings, avatar uploader, and preferences.', icon: UserCheck, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'access_guard', title: 'Role Access Guard', desc: 'Content container locked by user role/membership.', icon: ShieldCheck, color: 'text-amber-400 bg-amber-500/10' },
                      { type: 'team_directory', title: 'Team & Staff Directory', desc: 'Member cards with job titles, departments, and contact buttons.', icon: Users, color: 'text-teal-400 bg-teal-500/10' },
                    ]},
                    { category: '💬 Engagement & Support', items: [
                      { type: 'chat_thread', title: 'Live Support Chat Thread', desc: 'Real-time customer support chat box or comment stream.', icon: MessageSquare, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'activity_feed', title: 'Activity & Audit Stream', desc: 'Timeline log of comments, updates, and system events.', icon: History, color: 'text-purple-400 bg-purple-500/10' },
                      { type: 'announcements', title: 'Broadcast News Banner', desc: 'Ticker newsfeed for urgent bulletins and releases.', icon: Radio, color: 'text-rose-400 bg-rose-500/10' },
                      { type: 'faq_accordion', title: 'FAQ Accordion List', desc: 'Expandable Q&A list with category filters and search.', icon: HelpCircle, color: 'text-blue-400 bg-blue-500/10' },
                    ]},
                    { category: '🎨 Layout, Marketing & Structure', items: [
                      { type: 'slider_carousel', title: 'Multi-Slide Banner Carousel', desc: 'Interactive image slider with auto-play, navigation arrows, and dots.', icon: Images, color: 'text-rose-400 bg-rose-500/10' },
                      { type: 'hero', title: 'Hero Header Banner', desc: 'High-impact cover header with title, subtitle, and CTA.', icon: Sparkles, color: 'text-amber-400 bg-amber-500/10' },
                      { type: 'feature_grid', title: 'Feature Grid Cards', desc: 'Multi-column icon cards highlighting features or services.', icon: LayoutGrid, color: 'text-emerald-400 bg-emerald-500/10' },
                      { type: 'tabbed_content', title: 'Interactive Content Tabs', desc: 'Tab bar to switch between content panels.', icon: Sliders, color: 'text-cyan-400 bg-cyan-500/10' },
                      { type: 'pricing_table', title: 'Pricing & Plan Table', desc: 'Tiered pricing cards with feature checklists and CTAs.', icon: CreditCard, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'testimonials', title: 'Testimonial Carousel', desc: 'Customer review quotes, rating stars, and logos.', icon: MessageCircle, color: 'text-teal-400 bg-teal-500/10' },
                      { type: 'cta_strip', title: 'CTA Highlight Strip', desc: 'Full-width banner strip driving conversion actions.', icon: Sparkles, color: 'text-purple-400 bg-purple-500/10' },
                      { type: 'embed_iframe', title: 'Embed Video & External Iframe', desc: 'Embed YouTube/Vimeo, Google Maps, or external apps.', icon: Globe, color: 'text-rose-400 bg-rose-500/10' },
                    ]},
                    { category: '📱 Mobile App Native UI', items: [
                      { type: 'bottom_nav_bar', title: 'Mobile Bottom Nav Bar', desc: 'Fixed bottom navigation bar for iOS/Android app views.', icon: Smartphone, color: 'text-indigo-400 bg-indigo-500/10' },
                      { type: 'floating_action_btn', title: 'Floating Action Button (FAB)', desc: 'Circular floating action button (+ New Record).', icon: Plus, color: 'text-rose-400 bg-rose-500/10' },
                      { type: 'push_prompt', title: 'Push Notification Prompt', desc: 'In-app permission card for mobile push alerts.', icon: Bell, color: 'text-amber-400 bg-amber-500/10' },
                      { type: 'infinite_stream', title: 'Infinite Scroll Feed', desc: 'Mobile feed container with pull-to-refresh.', icon: Compass, color: 'text-teal-400 bg-teal-500/10' },
                    ]}
                  ].map(sec => (
                    <div key={sec.category} className="space-y-2 pt-2 border-t border-zinc-500/20 first:border-0 first:pt-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">{sec.category}</p>
                      <div className="space-y-2">
                        {sec.items.map(w => {
                          const Icon = w.icon;
                          return (
                            <div
                              key={w.type}
                              onClick={() => handleAddWidgetToActivePage(w.type as any, w.title)}
                              className={`p-3 border rounded-2xl flex items-start gap-3 transition-all cursor-pointer group ${
                                isLight 
                                  ? 'bg-zinc-50 hover:bg-white border-zinc-200 hover:border-indigo-400 hover:shadow-md' 
                                  : 'bg-zinc-950/70 hover:bg-zinc-900 border-zinc-800 hover:border-indigo-500/50 hover:shadow-lg'
                              }`}
                            >
                              <div className={`p-2 rounded-xl shrink-0 ${w.color} border border-white/5 group-hover:scale-105 transition-transform`}>
                                <Icon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h5 className={`text-xs font-bold truncate ${isLight ? 'text-zinc-900' : 'text-white'}`}>{w.title}</h5>
                                  <span className="text-[9px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>
                                </div>
                                <p className={`text-[11px] leading-tight mt-0.5 ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{w.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: HEADER NAVBAR */}
            {activeTab === 'nav' && (
              <div className="space-y-4">
                <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Manage top navigation header items for your portal site.
                </p>

                <div className={`p-3 rounded-2xl border space-y-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <input
                    type="text"
                    placeholder="Link Label (e.g. Services)"
                    value={newNavLabel}
                    onChange={e => setNewNavLabel(e.target.value)}
                    className={`w-full px-3 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Path (e.g. /services)"
                      value={newNavPath}
                      onChange={e => setNewNavPath(e.target.value)}
                      className={`flex-1 px-3 py-1.5 border rounded-xl text-xs font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                    />
                    <button
                      type="button"
                      onClick={handleAddNavItem}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {navItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 border rounded-xl text-xs ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 text-[10px]">{idx + 1}.</span>
                        <span className={`font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>{item.label}</span>
                        <span className={`font-mono text-[10px] px-2 py-0.5 rounded border ${isLight ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>{item.path}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNavItem(item.id)}
                        className="p-1 opacity-60 hover:opacity-100 hover:text-red-500 rounded-md transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SEO & SOCIAL SHARING */}
            {activeTab === 'seo' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Search Engine & Social Preview</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Configure global metadata and OpenGraph social cards.</p>
                </div>

                {/* Live Google Preview Card */}
                <div className={`p-4 rounded-2xl border space-y-1 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Google Search Preview</span>
                  <p className="text-xs font-bold text-blue-500 truncate hover:underline cursor-pointer">
                    {metaTitle || name || 'Portal Title'} | Aurora Platform
                  </p>
                  <p className="text-[11px] font-mono text-emerald-500 truncate">https://{domain || 'intranet.aurora.internal'}</p>
                  <p className={`text-xs line-clamp-2 leading-relaxed mt-1 ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {metaDescription || description || 'No meta description provided yet.'}
                  </p>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Meta Title Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Portal | Aurora"
                    value={metaTitle}
                    onChange={e => setMetaTitle(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a concise summary for search engine results..."
                    value={metaDescription}
                    onChange={e => setMetaDescription(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs resize-none ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    OpenGraph Image URL (Social Share Card)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/og-banner.png"
                    value={ogImageUrl}
                    onChange={e => setOgImageUrl(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>

                <div className={`p-3 border rounded-xl flex items-center justify-between ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div>
                    <p className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Block Search Indexing (noindex)</p>
                    <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Prevent search engines from indexing this portal</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={noIndex}
                    onChange={e => setNoIndex(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: FORM SUBMISSIONS & INBOX */}
            {activeTab === 'inbox' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Form Submissions Inbox</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>View live form responses submitted on embedded site pages.</p>
                </div>

                {/* Submissions List */}
                <div className="space-y-2">
                  {submissions.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubmission(selectedSubmission?.id === sub.id ? null : sub)}
                      className={`p-3 border rounded-2xl cursor-pointer transition-all ${
                        selectedSubmission?.id === sub.id
                          ? 'bg-indigo-500/10 border-indigo-500 shadow-md'
                          : (isLight ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-300' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700')
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{sub.formName}</span>
                        <span className="text-[10px] font-mono opacity-60">{sub.submittedAt}</span>
                      </div>
                      <p className={`text-xs font-bold mt-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>{sub.submittedBy}</p>

                      {/* Expanded Submission Payload */}
                      {selectedSubmission?.id === sub.id && (
                        <div className="mt-3 pt-3 border-t border-zinc-500/20 space-y-1.5 font-mono text-[11px]">
                          {Object.entries(sub.data).map(([key, val]) => (
                            <div key={key} className={`flex items-start justify-between p-2 rounded-lg border ${isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-zinc-950 border-zinc-800 text-white'}`}>
                              <span className="opacity-70">{key}:</span>
                              <span className="text-emerald-500 font-bold text-right ml-2">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CUSTOM CODE & SCRIPTS */}
            {activeTab === 'code' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Custom Code Injectors</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Inject custom CSS, Google Analytics, or head scripts.</p>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Header Scripts (&lt;head&gt;)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="<!-- Insert Google Analytics / Custom Meta Tags -->"
                    value={headScripts}
                    onChange={e => setHeadScripts(e.target.value)}
                    className={`w-full p-3 border rounded-xl text-xs font-mono text-emerald-500 focus:outline-none focus:border-indigo-500 resize-none ${isLight ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Custom CSS Styles
                  </label>
                  <textarea
                    rows={4}
                    placeholder="/* Custom CSS overrides */"
                    value={customCss}
                    onChange={e => setCustomCss(e.target.value)}
                    className={`w-full p-3 border rounded-xl text-xs font-mono text-indigo-400 focus:outline-none focus:border-indigo-500 resize-none ${isLight ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}
                  />
                </div>
              </div>
            )}

            {/* TAB: TYPOGRAPHY & THEME SYSTEM */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Enterprise Font Library ({ENTERPRISE_FONTS.length} Fonts)</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Select a font family to apply it live across your portal design.</p>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Select Font Family
                  </label>
                  <select
                    value={fontFamily || themeFont || 'sans'}
                    onChange={e => {
                      const val = e.target.value;
                      setFontFamily(val);
                      setThemeFont(val);
                    }}
                    className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-900 focus:border-indigo-600' : 'bg-zinc-950 border-zinc-800 text-white focus:border-indigo-500'
                    }`}
                  >
                    {['Sans-Serif', 'Serif', 'Monospace'].map(cat => (
                      <optgroup key={cat} label={`── ${cat.toUpperCase()} ──`}>
                        {ENTERPRISE_FONTS.filter(f => f.category === cat).map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Compact Font Live Preview Card Specimen */}
                {(() => {
                  const activeFont = ENTERPRISE_FONTS.find(f => f.id === (fontFamily || themeFont)) || ENTERPRISE_FONTS[0];
                  return (
                    <div className={`p-4 rounded-2xl border space-y-2 transition-all ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-500/20">
                        <span className="text-[11px] font-bold text-indigo-500 truncate" style={{ fontFamily: activeFont.fontFamilyCss }}>
                          {activeFont.name}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-mono">
                          {activeFont.category}
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <p className="text-base font-extrabold leading-snug" style={{ fontFamily: activeFont.fontFamilyCss }}>
                          The Quick Brown Fox
                        </p>
                        <p className="text-xs opacity-75 leading-relaxed" style={{ fontFamily: activeFont.fontFamilyCss }}>
                          Sphinx of black quartz, judge my vow. Real-time typography rendering across all portal widgets.
                        </p>
                        <div className="p-2 rounded-xl border text-[10px] font-mono tracking-widest opacity-60" style={{ fontFamily: activeFont.fontFamilyCss, backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)' }}>
                          ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-3 border-t border-zinc-500/20">
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Border Radius Scale
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'none', label: 'Sharp' },
                      { id: 'xl', label: 'Smooth' },
                      { id: 'full', label: 'Pill' }
                    ].map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setBorderRadius(r.id as any);
                          setThemeRadius(r.id as any);
                        }}
                        className={`p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                          (borderRadius || themeRadius) === r.id
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500 shadow-sm'
                            : (isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900')
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: MULTI-LANGUAGE & LOCALES */}
            {activeTab === 'localization' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Multi-Language & Locales</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Configure primary portal language and locale translations.</p>
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Primary Default Language
                  </label>
                  <select
                    value={defaultLanguage}
                    onChange={e => setDefaultLanguage(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  >
                    <option value="en">English (US - en-US)</option>
                    <option value="es">Spanish (Español - es)</option>
                    <option value="fr">French (Français - fr)</option>
                    <option value="de">German (Deutsch - de)</option>
                    <option value="ja">Japanese (日本語 - ja)</option>
                  </select>
                </div>

                <div className={`p-3 border rounded-xl flex items-center justify-between ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div>
                    <p className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-white'}`}>Enable Auto-Translation AI</p>
                    <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Automatically translate widget content for visitors</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={e => setAutoTranslate(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 bg-white text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: ACCESS & GOVERNANCE */}
            {activeTab === 'access' && (

              <div className="space-y-4">
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs resize-none ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>

                {/* Custom Domain DNS Verification & SSL Manager */}
                <div className={`p-4 border rounded-2xl space-y-3 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={`block text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                        Custom Domain & SSL Setup
                      </label>
                      <p className={`text-[10px] ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Map custom apex domain or sub-domain</p>
                    </div>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-full flex items-center gap-1">
                      <ShieldCheck size={10} /> SSL Active
                    </span>
                  </div>

                  <input
                    type="text"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    placeholder="portal.yourdomain.com"
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                  />

                  <div className={`p-3 border rounded-xl space-y-2 text-[10px] font-mono ${isLight ? 'bg-white border-zinc-200' : 'bg-zinc-900/80 border-zinc-800'}`}>
                    <div className="flex items-center justify-between opacity-60">
                      <span>Type</span>
                      <span>Record Name</span>
                      <span>Target Value</span>
                      <span>Status</span>
                    </div>
                    <div className={`flex items-center justify-between font-bold pt-1 border-t ${isLight ? 'border-zinc-200 text-zinc-900' : 'border-zinc-800 text-white'}`}>
                      <span className="text-indigo-500">CNAME</span>
                      <span>@ / www</span>
                      <span className="opacity-80">cname.aurora-platform.io</span>
                      <span className="text-emerald-500 font-sans font-bold flex items-center gap-0.5">
                        <Check size={10} /> Validated
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toast.success(`DNS records for ${domain || 'custom domain'} verified! TLS 1.3 Certificate issued cleanly.`)}
                    className={`w-full py-2 border text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isLight ? 'bg-white border-zinc-300 text-zinc-800 hover:bg-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'
                    }`}
                  >
                    <RefreshCw size={12} /> Verify DNS & Reissue SSL
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                    >
                      <option value="active">Active (Online)</option>
                      <option value="draft">Draft (Setup)</option>
                      <option value="offline">Offline (Maintenance)</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      Access Level
                    </label>
                    <select
                      value={access}
                      onChange={e => setAccess(e.target.value as any)}
                      className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                    >
                      <option value="Public">Public</option>
                      <option value="Authenticated">Authenticated</option>
                      <option value="Restricted">Restricted</option>
                      <option value="Admin Only">Admin Only</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: SITE ANALYTICS & TRAFFIC */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Site Traffic & Performance</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Real-time visitor analytics and portal engagement metrics.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3.5 border rounded-2xl space-y-1 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Unique Visitors</span>
                    <p className={`text-xl font-black ${isLight ? 'text-zinc-900' : 'text-white'}`}>1,482</p>
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                      <ArrowUp size={10} /> +18.4% this week
                    </p>
                  </div>
                  <div className={`p-3.5 border rounded-2xl space-y-1 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Page Views</span>
                    <p className="text-xl font-black text-indigo-500">8,920</p>
                    <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                      <ArrowUp size={10} /> +24.1% vs last period
                    </p>
                  </div>
                  <div className={`p-3.5 border rounded-2xl space-y-1 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Avg Session Time</span>
                    <p className="text-xl font-black text-emerald-500">3m 42s</p>
                    <p className="text-[10px] opacity-60 font-mono">High Engagement</p>
                  </div>
                  <div className={`p-3.5 border rounded-2xl space-y-1 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">Form Conversions</span>
                    <p className="text-xl font-black text-amber-500">94.2%</p>
                    <p className="text-[10px] text-emerald-500 font-bold">142 Inquiries</p>
                  </div>
                </div>

                <div className={`p-4 border rounded-2xl space-y-3 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                  <h5 className={`text-xs font-bold uppercase tracking-wider flex items-center justify-between ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                    <span>Popular Site Pages</span>
                    <BarChart3 size={14} className="text-indigo-500" />
                  </h5>
                  <div className="space-y-2">
                    {[
                      { path: '/', title: 'Home Portal', views: '5,120 views', share: 62 },
                      { path: '/services', title: 'Services & Knowledge', views: '2,410 views', share: 28 },
                      { path: '/contact', title: 'Contact / Intake', views: '1,390 views', share: 10 }
                    ].map(p => (
                      <div key={p.path} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={isLight ? 'text-zinc-900' : 'text-white'}>{p.title} <span className="text-[10px] opacity-60 font-mono">({p.path})</span></span>
                          <span className="text-indigo-500 font-mono">{p.views}</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
                          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: `${p.share}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: REVISION HISTORY & ROLLBACK */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div>
                  <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-900' : 'text-white'}`}>Version Revision History</h4>
                  <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>Restore past portal snapshots with 1-click rollback safety.</p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      version: 'v2.4 (Current Active)',
                      time: 'Just now',
                      author: 'Scott (Admin)',
                      notes: 'Added interactive canvas widget controls and Form Builder.',
                      active: true
                    },
                    {
                      version: 'v2.3 Snapshot',
                      time: '2 hours ago',
                      author: 'System Auto-Save',
                      notes: 'Configured top navbar alignment and access control badge cleanup.',
                      active: false
                    },
                    {
                      version: 'v2.2 Snapshot',
                      time: 'Yesterday at 16:45',
                      author: 'Scott (Admin)',
                      notes: 'Applied Intranet Hub template preset.',
                      active: false
                    }
                  ].map((rev, rIdx) => (
                    <div key={rIdx} className={`p-4 border rounded-2xl space-y-2 transition-all ${
                      rev.active 
                        ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500/30' 
                        : (isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950/60 border-zinc-800')
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold flex items-center gap-1.5 ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                          <History size={14} className={rev.active ? 'text-indigo-500' : 'opacity-50'} />
                          {rev.version}
                        </span>
                        {rev.active ? (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 rounded-md">
                            Live Version
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => toast.success(`Rolled back portal layout to snapshot ${rev.version}!`)}
                            className="px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-500 border border-indigo-500/40 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Restore Version
                          </button>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>{rev.notes}</p>
                      <div className="flex items-center justify-between text-[10px] opacity-60 font-mono pt-1 border-t border-zinc-500/20">
                        <span>Author: {rev.author}</span>
                        <span>{rev.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>





        {/* RIGHT LIVE WYSIWYG PREVIEW CANVAS */}
        <main 
          onClick={() => setSelectedElement(null)}
          className={`flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto relative min-h-0 cursor-pointer ${editorCanvasBgClass}`}
        >

          {/* Viewport Frame Container */}
          <div 
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedElement(null);
              }
            }}
            style={{ 
              fontFamily: getThemeFontFamilyCss(),
              transform: canvasZoom !== 100 ? `scale(${canvasZoom / 100})` : undefined,
              transformOrigin: 'top center'
            }}
            className={`transition-all duration-300 shadow-2xl border ${getThemeBgClass()} ${getThemeFontClass()} overflow-hidden ${viewportWidthClass} h-[calc(100vh-6.5rem)] min-h-[500px] shrink-0 ${
              (headerLayout === 'sidebar_left' || headerLayout === 'sidebar_right') && viewport === 'desktop'
                ? headerLayout === 'sidebar_left' 
                  ? 'flex flex-row' 
                  : 'flex flex-row-reverse'
                : 'flex flex-col'
            }`}
          >
            {/* RESPONSIVE SIDEBAR MENU */}
            {(headerLayout === 'sidebar_left' || headerLayout === 'sidebar_right') && (
              <>
                {/* DESKTOP SIDEBAR VIEWPORT */}
                {viewport === 'desktop' && (
                  <aside
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement({ type: 'header' });
                    }}
                    className={`w-64 shrink-0 ${getThemeHeaderClass()} p-5 flex flex-col justify-between relative z-20 border-r border-zinc-800 transition-all cursor-pointer ${
                      selectedElement?.type === 'header' 
                        ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 shadow-xl' 
                        : 'hover:ring-1 hover:ring-indigo-500/40'
                    }`}
                  >
                    {selectedElement?.type === 'header' && (
                      <span className="absolute top-2 right-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-500 text-white rounded font-mono z-30">
                        VERTICAL SIDEBAR MENU
                      </span>
                    )}

                    <div className="space-y-6">
                      {/* Brand Header */}
                      <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4">
                        <div 
                          className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-white text-xs shadow-md shrink-0"
                          style={{ backgroundColor: accentColor }}
                        >
                          {headerTitle ? headerTitle.charAt(0) : 'S'}
                        </div>
                        <div className="overflow-hidden">
                          <h2 className="text-sm font-bold truncate">{headerTitle || name}</h2>
                          <p className="text-[10px] opacity-70 font-mono truncate">{domain}</p>
                        </div>
                      </div>

                      {/* Vertical Navigation Menu */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider opacity-50 px-2">Navigation Menu</p>
                        {rootPages.map(rootPage => {
                          const children = getChildPages(rootPage.id);
                          const hasChildren = children.length > 0;
                          const isActive = activePage?.id === rootPage.id || children.some(c => c.id === activePage?.id);

                          return (
                            <div key={rootPage.id} className="space-y-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePageId(rootPage.id);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                                  isActive 
                                    ? 'bg-indigo-600 text-white shadow-md' 
                                    : 'opacity-80 hover:opacity-100 hover:bg-zinc-800/60'
                                }`}
                                style={isActive && navLinkStyle === 'pills' ? { backgroundColor: accentColor } : {}}
                              >
                                <span className="truncate">{rootPage.title}</span>
                                {hasChildren && <ChevronDown size={12} className="opacity-70 shrink-0" />}
                              </button>

                              {/* Nested Sub-pages in Sidebar */}
                              {hasChildren && (
                                <div className="ml-3 pl-2 border-l border-zinc-800 space-y-1 my-1">
                                  {children.map(child => {
                                    const isChildActive = activePage?.id === child.id;
                                    return (
                                      <button
                                        key={child.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePageId(child.id);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                          isChildActive 
                                            ? 'text-indigo-400 font-bold bg-indigo-500/10' 
                                            : 'opacity-70 hover:opacity-100 hover:bg-zinc-800/40'
                                        }`}
                                      >
                                        <span className="truncate">{child.title}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Sidebar Footer */}
                    <div className="pt-4 border-t border-zinc-800/80 text-[10px] opacity-60 flex items-center justify-between">
                      <span>{footerText || '© Aurora Platform'}</span>
                      <span className="font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">Sidebar Nav</span>
                    </div>
                  </aside>
                )}

                {/* MOBILE / TABLET COLLAPSED TOP BAR WITH HAMBURGER DRAWER */}
                {(viewport === 'mobile' || viewport === 'tablet') && (
                  <header 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedElement({ type: 'header' });
                    }}
                    className={`px-4 py-3 ${getThemeHeaderClass()} border-b border-zinc-800 relative z-30 flex items-center justify-between shrink-0 transition-all cursor-pointer ${
                      selectedElement?.type === 'header' ? 'ring-2 ring-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-white text-xs shadow-md shrink-0"
                        style={{ backgroundColor: accentColor }}
                      >
                        {headerTitle ? headerTitle.charAt(0) : 'S'}
                      </div>
                      <div className="overflow-hidden">
                        <h2 className="text-xs font-bold truncate">{headerTitle || name}</h2>
                        <p className="text-[9px] opacity-60 font-mono truncate">{domain}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMobileMenuOpen(!isMobileMenuOpen);
                      }}
                      className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
                    >
                      {isMobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
                    </button>

                    {/* Mobile Menu Drawer Overlay */}
                    {isMobileMenuOpen && (
                      <div className="absolute top-full left-0 right-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3 z-50 shadow-2xl max-h-[60vh] overflow-y-auto">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Navigation Tree</p>
                        <div className="space-y-1">
                          {rootPages.map(rootPage => {
                            const children = getChildPages(rootPage.id);
                            return (
                              <div key={rootPage.id} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePageId(rootPage.id);
                                    if (children.length === 0) setIsMobileMenuOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold text-white hover:bg-zinc-800 transition-all text-left"
                                >
                                  <span>{rootPage.title}</span>
                                  <ChevronRight size={14} className="text-zinc-500" />
                                </button>

                                {children.map(child => (
                                  <button
                                    key={child.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePageId(child.id);
                                      setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between pl-5 pr-2 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:bg-zinc-800 transition-all text-left"
                                  >
                                    <span className="flex items-center gap-1">
                                      <CornerDownRight size={12} className="text-indigo-400" />
                                      {child.title}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </header>
                )}
              </>
            )}

            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
              {/* Live Top Header (when headerLayout is top_right, top_center, pill_header, minimal) */}
              {headerLayout !== 'sidebar_left' && headerLayout !== 'sidebar_right' && (
                <header 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement({ type: 'header' });
                  }}
                  className={`${getThemeHeaderClass()} px-6 py-4 flex items-center justify-between relative shrink-0 z-20 transition-all cursor-pointer ${
                    selectedElement?.type === 'header' 
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 shadow-xl' 
                      : 'hover:ring-1 hover:ring-indigo-500/40'
                  } ${
                    headerLayout === 'pill_header' ? `m-4 ${getThemeRadiusClass()} shadow-lg border border-zinc-800` : ''
                  }`}
                >
                  {selectedElement?.type === 'header' && (
                    <span className="absolute top-2 right-4 text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-500 text-white rounded font-mono z-30">
                      HEADER / NAVBAR
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-white text-xs"
                      style={{ backgroundColor: accentColor }}
                    >
                      {headerTitle ? headerTitle.charAt(0) : 'S'}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold">{headerTitle || name}</h2>
                      <p className="text-[10px] opacity-70 font-mono">{domain}</p>
                    </div>
                  </div>

                  {/* Navbar Links (Visible on Desktop Viewport) */}
                  {viewport === 'desktop' && (
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      {rootPages.map(rootPage => {
                        const children = getChildPages(rootPage.id);
                        const hasChildren = children.length > 0;
                        const isActive = activePage?.id === rootPage.id || children.some(c => c.id === activePage?.id);

                        return (
                          <div key={rootPage.id} className="relative group">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePageId(rootPage.id);
                              }}
                              className={`flex items-center gap-1 transition-all cursor-pointer relative ${getNavLinkStyleClass(isActive)}`}
                              style={isActive && navLinkStyle === 'pills' ? { backgroundColor: accentColor } : {}}
                            >
                              <span>{rootPage.title}</span>
                              {hasChildren && <ChevronDown size={12} className="opacity-60 group-hover:opacity-100" />}
                              {navLinkStyle === 'underline' && isActive && (
                                <span 
                                  className="absolute -bottom-1 left-0 right-0 h-[2.5px] rounded-full transition-all" 
                                  style={{ backgroundColor: accentColor }}
                                />
                              )}
                            </button>

                            {/* Dropdown Menu for Nested Child Pages */}
                            {hasChildren && (
                              <div className={`absolute top-full left-0 mt-2 w-48 ${getThemeCardClass()} ${getThemeRadiusClass()} p-1.5 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50`}>
                                {children.map(child => (
                                  <button
                                    key={child.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActivePageId(child.id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium opacity-80 hover:opacity-100 hover:bg-indigo-500/10 transition-colors flex items-center justify-between"
                                  >
                                    <span>{child.title}</span>
                                    <ChevronRight size={12} className="opacity-40" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Mobile Hamburger Toggle Button (Visible on Mobile/Tablet Viewport) */}
                  {viewport !== 'desktop' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMobileMenuOpen(!isMobileMenuOpen);
                        }}
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title={isMobileMenuOpen ? "Close Menu" : "Open Navigation Menu"}
                      >
                        {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                      </button>
                    </div>
                  )}

                  {/* Mobile Navigation Drawer Overlay (supporting nesting) */}
                  {isMobileMenuOpen && viewport !== 'desktop' && (
                    <div className={`absolute top-full left-0 right-0 ${getThemeHeaderClass()} p-4 space-y-3 z-50 shadow-2xl animate-in slide-in-from-top duration-200 max-h-[60vh] overflow-y-auto`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Site Navigation Tree</p>
                      <div className="space-y-1">
                        {rootPages.map(rootPage => {
                          const children = getChildPages(rootPage.id);
                          return (
                            <div key={rootPage.id} className="space-y-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivePageId(rootPage.id);
                                  if (children.length === 0) setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold hover:bg-indigo-500/10 transition-all text-left"
                              >
                                <span>{rootPage.title}</span>
                                <ChevronRight size={14} className="opacity-50" />
                              </button>

                              {/* Nested Sub-Pages in Drawer */}
                              {children.map(child => (
                                <button
                                  key={child.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePageId(child.id);
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className="w-full flex items-center justify-between pl-6 pr-3 py-2 rounded-lg text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition-all text-left"
                                >
                                  <span className="flex items-center gap-1">
                                    <CornerDownRight size={12} className="text-indigo-400" />
                                    {child.title}
                                  </span>
                                  <ChevronRight size={12} className="opacity-40" />
                                </button>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </header>
              )}

            {/* Live Active Page Body */}
            <div 
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setSelectedElement(null);
                }
              }}
              className="p-6 sm:p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar cursor-pointer"
            >
              
              {/* Dynamic Page Title & Parent Breadcrumb */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElement({ type: 'page_header' });
                }}
                className={`relative transition-all cursor-pointer p-4 ${getThemeRadiusClass()} border ${
                  selectedElement?.type === 'page_header'
                    ? 'bg-indigo-500/5 border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-transparent hover:border-indigo-500/30'
                }`}
              >
                {selectedElement?.type === 'page_header' && (
                  <span className="absolute top-2 right-4 text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-500 text-white rounded font-mono">
                    PAGE TITLE & META
                  </span>
                )}
                {activePage?.parentId && (
                  <div className="text-[10px] font-mono opacity-60 flex items-center gap-1 mb-1">
                    Parent: {pages.find(p => p.id === activePage.parentId)?.title} <ChevronRight size={10} />
                  </div>
                )}
                <h3 className="text-2xl font-extrabold">{activePage?.title}</h3>
                <p className="text-xs opacity-75">{activePage?.description}</p>
              </div>

              {/* Active Page Widgets Container (Flexbox & Grid Layout Support) */}
              <div className="grid grid-cols-12 gap-6 items-start">
                {(!activePage?.widgets || activePage.widgets.length === 0) && (
                  <div className={`col-span-12 p-10 border-2 border-dashed rounded-3xl text-center space-y-3 transition-all ${
                    isLight 
                      ? 'bg-indigo-50/50 border-indigo-200 text-zinc-800' 
                      : 'bg-indigo-950/20 border-indigo-500/30 text-white'
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 mx-auto flex items-center justify-center">
                      <Plus size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold">This page has no layout widgets yet</h4>
                      <p className={`text-xs mt-1 max-w-sm mx-auto ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        Add your first hero banner, form intake, knowledge base search, or announcement widget to build this page.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddWidgetModalOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                      >
                        <Plus size={14} /> Add Widget to Page
                      </button>
                    </div>
                  </div>
                )}

                {activePage?.widgets.map((w, index) => {
                  const isSelected = selectedElement?.type === 'widget' && selectedElement.id === w.id;
                  const isDragOver = dragOverWidgetId === w.id;
                  return (
                    <div
                      key={w.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.setData('text/plain', w.id);
                        setDraggedWidgetId(w.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverWidgetId(w.id);
                      }}
                      onDragLeave={() => setDragOverWidgetId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDropWidgetOnCanvas(w.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElement({ type: 'widget', id: w.id });
                      }}
                      className={`relative group ${getWidgetGridClass(w.layoutColumns)} ${getThemeRadiusClass()} transition-all cursor-grab active:cursor-grabbing ${
                        isSelected 
                          ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-zinc-950 shadow-2xl shadow-indigo-500/10' 
                          : 'hover:ring-1 hover:ring-indigo-500/40'
                      } ${isDragOver ? 'ring-2 ring-dashed ring-amber-400 scale-[1.01] bg-amber-500/10' : ''} ${!w.enabled ? 'opacity-40 grayscale' : ''}`}
                    >
                      {/* Visual Drag Handle Indicator */}
                      <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 bg-black/60 backdrop-blur-md text-white p-1 rounded-lg transition-all cursor-grab">
                        <GripVertical size={14} />
                      </div>
                      {/* Selection Overlay Action Bar */}
                      {isSelected && (
                        <div 
                          className="absolute -top-3.5 right-6 z-30 bg-zinc-900 border border-indigo-500/80 rounded-xl px-2 py-1 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150"
                          onClick={e => e.stopPropagation()}
                        >
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono flex items-center gap-1">
                            <Sliders size={10} /> {w.type.replace('_', ' ')}
                          </span>
                          <div className="h-3 w-px bg-zinc-800 my-auto" />
                          <button
                            type="button"
                            onClick={() => handleMoveWidgetOrder(w.id, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 rounded cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveWidgetOrder(w.id, 'down')}
                            disabled={index === (activePage.widgets.length - 1)}
                            className="p-1 hover:bg-zinc-800 text-zinc-300 disabled:opacity-30 rounded cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateWidget(w.id)}
                            className="p-1 hover:bg-zinc-800 text-zinc-300 rounded cursor-pointer"
                            title="Duplicate Widget"
                          >
                            <Copy size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActivePageWidget(w.id)}
                            className="p-1 hover:bg-zinc-800 text-zinc-300 rounded cursor-pointer"
                            title={w.enabled ? "Disable Widget" : "Enable Widget"}
                          >
                            {w.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWidget(w.id)}
                            className="p-1 hover:bg-red-500/20 text-red-400 rounded cursor-pointer"
                            title="Delete Widget"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}

                      {/* HERO WIDGET */}
                      {w.type === 'hero' && (
                        <div className={`p-8 ${getThemeCardClass()} ${getThemeRadiusClass()} relative overflow-hidden`}>
                          <div 
                            className="absolute top-0 right-0 w-64 h-64 opacity-20 rounded-full blur-2xl pointer-events-none"
                            style={{ backgroundColor: accentColor }}
                          />
                          <div className="relative z-10 space-y-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                              <Sparkles size={12} style={{ color: accentColor }} />
                              {category} Portal &bull; {type}
                            </span>
                            <h3 className="text-2xl sm:text-3xl font-black">{w.title}</h3>
                            <p className="text-xs opacity-75 leading-relaxed max-w-xl">{w.subtitle || description}</p>
                            <div className="pt-2">
                              <button 
                                className="px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                                style={{ backgroundColor: accentColor }}
                              >
                                Explore Portal
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* FORM EMBED WIDGET */}
                      {(w.type === 'form_embed' || w.type === 'ticket_form') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FormInput size={18} className="text-indigo-400" />
                              <h4 className="text-sm font-bold">{w.title}</h4>
                            </div>
                            {w.targetModuleId && (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                                Bound to Module: {availableModules.find(m => m.id === w.targetModuleId)?.name || 'Intake Form'}
                              </span>
                            )}
                          </div>

                          <form onSubmit={e => { e.preventDefault(); toast.success('Form response submitted!'); }} className="space-y-3 max-w-xl">
                            {(w.formFields || [
                              { id: 'f-1', label: 'Contact Email', fieldType: 'email', required: true, placeholder: 'name@company.com' },
                              { id: 'f-2', label: 'Subject / Title', fieldType: 'text', required: true, placeholder: 'Summary of inquiry...' },
                              { id: 'f-3', label: 'Detailed Description', fieldType: 'textarea', required: true, placeholder: 'Provide full details...' }
                            ]).map(field => (
                              <div key={field.id}>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">
                                  {field.label} {field.required && <span className="text-red-400">*</span>}
                                </label>
                                {field.fieldType === 'textarea' ? (
                                  <textarea rows={2} placeholder={field.placeholder} className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs resize-none" required={field.required} />
                                ) : field.fieldType === 'checkbox' ? (
                                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-0" required={field.required} />
                                    <span>{field.label}</span>
                                  </label>
                                ) : (
                                  <input type={field.fieldType} placeholder={field.placeholder} className="w-full px-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs" required={field.required} />
                                )}
                              </div>
                            ))}
                            <button 
                              className="px-4 py-2 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                              style={{ backgroundColor: accentColor }}
                            >
                              <Send size={12} /> Submit Form Record
                            </button>
                          </form>
                        </div>
                      )}

                      {/* KB SEARCH WIDGET */}
                      {w.type === 'kb_search' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4`}>
                          <div className="flex items-center gap-2">
                            <BookOpen size={18} className="text-blue-400" />
                            <h4 className="text-sm font-bold">{w.title}</h4>
                          </div>

                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                            <input
                              type="text"
                              placeholder="Search articles..."
                              value={kbQuery}
                              onChange={e => setKbQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-zinc-950/60 border border-zinc-800 rounded-xl text-xs"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sampleArticles.map((art, idx) => (
                              <div key={idx} className="p-3 bg-zinc-950/50 border border-zinc-800/80 rounded-xl text-xs">
                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">{art.cat}</span>
                                <p className="font-bold mt-1">{art.title}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* STATUS MONITOR WIDGET */}
                      {w.type === 'status_widget' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Activity size={18} className="text-emerald-400" />
                              <h4 className="text-sm font-bold">{w.title}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Radio size={10} className="animate-pulse" /> Operational
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                              <span className="text-[10px] opacity-60 font-bold uppercase">Uptime</span>
                              <p className="text-lg font-black mt-0.5">99.98%</p>
                            </div>
                            <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                              <span className="text-[10px] opacity-60 font-bold uppercase">Latency</span>
                              <p className="text-lg font-black text-emerald-400 mt-0.5">42 ms</p>
                            </div>
                            <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                              <span className="text-[10px] opacity-60 font-bold uppercase">Webhooks</span>
                              <p className="text-lg font-black text-indigo-400 mt-0.5">Synced</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ANNOUNCEMENTS WIDGET */}
                      {w.type === 'announcements' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Radio size={18} className="text-indigo-400" />
                              <h4 className="text-sm font-bold">{w.title}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                              Broadcast Feed
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div className="p-3.5 bg-zinc-950/50 border border-zinc-800/80 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">Platform v2.4 Release Notes</span>
                                <span className="text-[10px] opacity-50 font-mono">2 hours ago</span>
                              </div>
                              <p className="text-xs opacity-75">Upgraded workspace performance, enhanced site builder drag & drop, and new custom domain SSL routing.</p>
                            </div>

                            <div className="p-3.5 bg-zinc-950/50 border border-zinc-800/80 rounded-xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">Scheduled Maintenance Window</span>
                                <span className="text-[10px] opacity-50 font-mono">Yesterday</span>
                              </div>
                              <p className="text-xs opacity-75">Database optimization routine completed cleanly across all primary cluster nodes with zero downtime.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DYNAMIC DATA TABLE / GRID WIDGET */}
                      {(w.type === 'data_table' || w.type === 'record_grid') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-cyan-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Layers size={18} className="text-cyan-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Dynamic Data Table'}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                              3 Active Records
                            </span>
                          </div>

                          <div className="border border-zinc-800 rounded-2xl overflow-hidden text-xs">
                            <div className="grid grid-cols-4 p-2.5 bg-zinc-950 font-bold text-zinc-400 border-b border-zinc-800 uppercase text-[10px] tracking-wider">
                              <span>Record Identifier</span>
                              <span>Entity / Contact</span>
                              <span>Value / Metric</span>
                              <span>Status Badge</span>
                            </div>
                            <div className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                              <div className="grid grid-cols-4 p-2.5 items-center">
                                <span className="font-mono font-bold text-indigo-400">REC-9901</span>
                                <span className="text-white">Jane Smith</span>
                                <span className="font-mono text-emerald-400">$2,400</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full w-max">Active</span>
                              </div>
                              <div className="grid grid-cols-4 p-2.5 items-center">
                                <span className="font-mono font-bold text-indigo-400">REC-9902</span>
                                <span className="text-white">Alex Chen</span>
                                <span className="font-mono text-emerald-400">$3,100</span>
                                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full w-max">In Review</span>
                              </div>
                              <div className="grid grid-cols-4 p-2.5 items-center">
                                <span className="font-mono font-bold text-indigo-400">REC-9903</span>
                                <span className="text-white">Marcus Vance</span>
                                <span className="font-mono text-emerald-400">$1,850</span>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full w-max">Verified</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* RECORD & REFERENCE LOOKUP WIDGET */}
                      {(w.type === 'record_lookup' || w.type === 'status_tracker') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-5 border border-amber-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Search size={18} className="text-amber-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Record Reference Lookup'}</h4>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                              Universal Query Engine
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              defaultValue="REF-9921"
                              placeholder="Enter Reference Number or Search Query..."
                              className="flex-1 px-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs font-mono text-white"
                            />
                            <button className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md">
                              <Search size={13} /> Lookup Record
                            </button>
                          </div>

                          <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Matched Result</span>
                                <h5 className="text-xs font-mono font-bold text-white">REF-9921-AU</h5>
                              </div>
                              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                                Stage 3 of 4 Complete
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                              {[
                                { step: '1. Received', done: true },
                                { step: '2. Processing', done: true },
                                { step: '3. Inspection', done: true },
                                { step: '4. Finalized', done: false }
                              ].map((s, idx) => (
                                <div key={idx} className={`p-2 rounded-xl border text-[10px] font-bold ${
                                  s.done 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                }`}>
                                  {s.step}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* DYNAMIC FORM BUILDER WIDGET */}
                      {(w.type === 'custom_form') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-emerald-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <FormInput size={18} className="text-emerald-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Standalone Form Embed'}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setIsFormPickerOpen(true);
                                }}
                                className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-2.5 py-1 rounded-lg font-medium border border-indigo-500/30 transition-all flex items-center gap-1"
                              >
                                <span>Attach Form</span>
                              </button>
                              <button
                                onClick={() => {
                                  setIsInContextFormBuilderOpen(true);
                                }}
                                className="text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 px-2.5 py-1 rounded-lg font-medium border border-emerald-500/30 transition-all flex items-center gap-1"
                              >
                                <Plus size={12} />
                                <span>Build In-Context</span>
                              </button>
                            </div>
                          </div>

                          <FormRenderer
                            title={w.title}
                            subtitle={w.subtitle}
                            fields={w.formFields?.map(f => ({
                              id: f.id,
                              label: f.label,
                              type: f.fieldType as any,
                              required: f.required,
                              placeholder: f.placeholder,
                              colSpan: 12
                            })) || [
                              { id: 'name', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
                              { id: 'email', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
                              { id: 'category', label: 'Category Selection', type: 'select', options: ['General Inquiry', 'Priority Request', 'Regulatory Lodgement'], required: false, colSpan: 12 }
                            ]}
                            onSubmit={() => { toast.success('Form response submitted successfully!'); }}
                            submitButtonText={w.buttonLabel || 'Submit Form Entry'}
                          />

                        </div>
                      )}


                      {/* RECORD DETAIL CARD WIDGET */}
                      {w.type === 'record_card' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-blue-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={18} className="text-blue-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Record Detail Profile'}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                              Verified Entity
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Record Code</span>
                              <span className="font-mono font-bold text-indigo-400 mt-1 block">REC-8842</span>
                            </div>
                            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Primary Status</span>
                              <span className="font-bold text-emerald-400 mt-1 block">Approved</span>
                            </div>
                            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl">
                              <span className="text-[10px] font-bold uppercase text-zinc-400 block">Assigned Module</span>
                              <span className="font-bold text-zinc-200 mt-1 block">Tenancy Engine</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* PIPELINE & PROGRESS STEPPER WIDGET */}
                      {w.type === 'progress_stepper' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Clock size={18} className="text-indigo-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Pipeline & Progress Stepper'}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                              Step 2 of 4 Active
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold">1. Intake</div>
                            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 font-bold animate-pulse">2. Review</div>
                            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-500 font-medium opacity-60">3. Approval</div>
                            <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-zinc-500 font-medium opacity-60">4. Complete</div>
                          </div>
                        </div>
                      )}

                      {/* ACTION BUTTON BAR WIDGET */}
                      {(w.type === 'action_bar' || w.type === 'action_button') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-purple-500/20`}>
                          <h4 className="text-sm font-bold text-white mb-2">{w.title || 'Action Button Group'}</h4>
                          <div className="flex flex-wrap items-center gap-3">
                            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 cursor-pointer">
                              <Sparkles size={14} /> {w.buttonLabel || 'Primary Action'}
                            </button>
                            <button className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded-xl text-xs font-bold cursor-pointer">
                              Secondary Action
                            </button>
                            <button className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-xl text-xs font-bold cursor-pointer">
                              Learn More ↗
                            </button>
                          </div>
                        </div>
                      )}

                      {/* KPI STAT GROUP WIDGET */}
                      {w.type === 'kpi_stat_group' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-emerald-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3">{w.title || 'KPI Metrics & Stat Counters'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                              <span className="text-[10px] font-bold uppercase text-zinc-400">Total Submissions</span>
                              <p className="text-xl font-black text-white mt-0.5">1,248</p>
                              <span className="text-[10px] font-bold text-emerald-400">+12% vs last month</span>
                            </div>
                            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                              <span className="text-[10px] font-bold uppercase text-zinc-400">Average Turnaround</span>
                              <p className="text-xl font-black text-indigo-400 mt-0.5">1.4 Days</p>
                              <span className="text-[10px] font-bold text-indigo-400">Optimal Velocity</span>
                            </div>
                            <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-1">
                              <span className="text-[10px] font-bold uppercase text-zinc-400">Resolution Rate</span>
                              <p className="text-xl font-black text-amber-400 mt-0.5">99.4%</p>
                              <span className="text-[10px] font-bold text-amber-400">Verified Quality</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CARD GRID CATALOG WIDGET */}
                      {w.type === 'card_grid' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-teal-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3">{w.title || 'Card Grid Catalog'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-2xl space-y-2">
                                <div className="h-20 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
                                  <Building2 size={24} className="text-teal-400" />
                                </div>
                                <h5 className="text-xs font-bold text-white">Item Entry #{i}</h5>
                                <p className="text-[11px] text-zinc-400">Description text for item catalog card entry #{i}.</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* LIVE CHAT & SUPPORT THREAD WIDGET */}
                      {(w.type === 'chat_thread' || w.type === 'live_chat') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <MessageSquare size={18} className="text-indigo-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Live Chat & Support Thread'}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> Online Assistant
                            </span>
                          </div>

                          <div className="h-40 bg-zinc-950/70 border border-zinc-800 rounded-2xl p-3 space-y-2 overflow-y-auto">
                            <div className="max-w-[80%] p-2.5 bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none text-xs space-y-0.5">
                              <span className="text-[9px] font-bold text-indigo-400 block">System Assistant</span>
                              <p className="text-zinc-200">Hello! How can I assist you with your portal inquiry today?</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Type your message here..."
                              className="flex-1 px-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-white"
                            />
                            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md">
                              <Send size={13} /> Send
                            </button>
                          </div>
                        </div>
                      )}

                      {/* AUTH / SSO CARD WIDGET */}
                      {(w.type === 'auth_box' || w.type === 'auth_widget') && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-rose-500/20 max-w-md mx-auto`}>
                          <div className="text-center space-y-1">
                            <div className="h-10 w-10 bg-rose-500/10 text-rose-400 rounded-2xl mx-auto flex items-center justify-center border border-rose-500/20">
                              <Lock size={20} />
                            </div>
                            <h4 className="text-base font-bold text-white">{w.title || 'Member Authentication & SSO'}</h4>
                            <p className="text-xs text-zinc-400">Sign in to access protected portal tools</p>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Email Address</label>
                              <input type="email" placeholder="user@domain.com" className="w-full px-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-white" />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-zinc-400">Password</label>
                              <input type="password" placeholder="••••••••••••" className="w-full px-3 py-2 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-white" />
                            </div>
                            <button className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                              Sign In to Account
                            </button>
                          </div>
                        </div>
                      )}

                      {/* KANBAN BOARD WIDGET */}
                      {w.type === 'kanban_board' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-purple-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3">{w.title || 'Kanban Pipeline Board'}</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['To-Do (2)', 'In Progress (1)', 'Completed (4)'].map((col, idx) => (
                              <div key={idx} className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2">
                                <span className="text-[10px] font-extrabold uppercase text-purple-400">{col}</span>
                                <div className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs space-y-1">
                                  <p className="font-bold text-white">Application #{101 + idx}</p>
                                  <p className="text-[10px] text-zinc-400">Submitted 2 hours ago</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* EVENT CALENDAR WIDGET */}
                      {w.type === 'event_calendar' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-rose-500/20`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <Calendar size={16} className="text-rose-400" /> {w.title || 'Event Scheduler'}
                            </h4>
                            <span className="text-xs font-bold text-rose-400">August 2026</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-500">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
                            {[...Array(14)].map((_, i) => (
                              <div key={i} className={`p-2 rounded-lg border border-zinc-800/60 text-xs font-bold ${i === 4 ? 'bg-rose-500 text-white' : 'bg-zinc-950/60 text-zinc-300'}`}>
                                {i + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* FILE VAULT WIDGET */}
                      {w.type === 'file_vault' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                            <FileText size={16} className="text-indigo-400" /> {w.title || 'Document & File Vault'}
                          </h4>
                          <div className="p-4 border-2 border-dashed border-zinc-800 rounded-2xl text-center space-y-2 bg-zinc-950/40">
                            <FileText size={24} className="mx-auto text-indigo-400 opacity-80" />
                            <p className="text-xs font-bold text-zinc-300">Drag & Drop Documents or PDF Files Here</p>
                          </div>
                        </div>
                      )}

                      {/* FORM WIZARD WIDGET */}
                      {w.type === 'form_wizard' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/20`}>
                          <h4 className="text-sm font-bold text-white">{w.title || 'Multi-Step Form Wizard'}</h4>
                          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                            <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">Step 1: Details</span>
                            <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-bold">Step 2: Uploads</span>
                          </div>
                          <input type="text" placeholder="Full Legal Name" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white" />
                        </div>
                      )}

                      {/* FEEDBACK & NPS SURVEY WIDGET */}
                      {w.type === 'feedback_survey' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 text-center border border-amber-500/20`}>
                          <h4 className="text-sm font-bold text-white">{w.title || 'How would you rate your experience?'}</h4>
                          <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star key={star} size={20} className="text-amber-400 fill-amber-400 cursor-pointer" />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CALCULATOR WIDGET */}
                      {w.type === 'calculator_widget' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-cyan-500/20`}>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Calculator size={16} className="text-cyan-400" /> {w.title || 'Pricing Calculator'}
                          </h4>
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-bold text-white">
                            <span>Estimated Total Quote</span>
                            <span className="text-lg text-cyan-400">$1,450.00</span>
                          </div>
                        </div>
                      )}

                      {/* E-SIGNATURE PAD WIDGET */}
                      {w.type === 'signature_pad' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-rose-500/20`}>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <PenTool size={16} className="text-rose-400" /> {w.title || 'Digital E-Signature Canvas'}
                          </h4>
                          <div className="h-24 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-xs text-zinc-500 font-mono">
                            Draw signature here...
                          </div>
                        </div>
                      )}

                      {/* USER PROFILE WIDGET */}
                      {w.type === 'user_profile' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/20`}>
                          <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                              JD
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">Jane Doe</h4>
                              <p className="text-[10px] text-zinc-400">jane.doe@company.com &bull; Enterprise Admin</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ACCESS GUARD WIDGET */}
                      {w.type === 'access_guard' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 text-center space-y-2 border border-amber-500/30 bg-amber-500/5`}>
                          <Lock size={24} className="mx-auto text-amber-400" />
                          <h4 className="text-xs font-bold text-amber-300">{w.title || 'Restricted Access Container'}</h4>
                          <p className="text-[10px] text-zinc-400">Content inside this container is locked for unauthorized user roles.</p>
                        </div>
                      )}

                      {/* TEAM DIRECTORY WIDGET */}
                      {w.type === 'team_directory' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-teal-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                            <Users size={16} className="text-teal-400" /> {w.title || 'Team & Staff Directory'}
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {['Alex Vance (Lead Architect)', 'Sarah Connor (Security Head)'].map((person, idx) => (
                              <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1 text-xs font-bold text-white">
                                <p>{person}</p>
                                <span className="text-[9px] font-normal text-teal-400">Active Member</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ACTIVITY STREAM WIDGET */}
                      {w.type === 'activity_feed' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-purple-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                            <History size={16} className="text-purple-400" /> {w.title || 'Activity & Audit Log Stream'}
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                              <span className="text-zinc-300">Document PDF signed by Alex</span>
                              <span className="text-[10px] text-zinc-500 font-mono">10m ago</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* FAQ ACCORDION WIDGET */}
                      {w.type === 'faq_accordion' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-blue-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                            <HelpCircle size={16} className="text-blue-400" /> {w.title || 'Frequently Asked Questions'}
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between font-bold text-white cursor-pointer">
                              <span>How do I lodge a new bond request?</span>
                              <ChevronDown size={14} className="text-blue-400" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* FEATURE GRID WIDGET */}
                      {w.type === 'feature_grid' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-emerald-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3">{w.title || 'Platform Value Features'}</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {['Ultra Fast API', 'Bank-Grade SSO', '24/7 Support'].map((feat, idx) => (
                              <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center space-y-1">
                                <Sparkles size={16} className="mx-auto text-emerald-400" />
                                <p className="text-xs font-bold text-white">{feat}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* TABBED CONTENT WIDGET */}
                      {w.type === 'tabbed_content' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-cyan-500/20`}>
                          <div className="flex gap-2 border-b border-zinc-800 pb-2 text-xs font-bold">
                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg">Overview</span>
                            <span className="px-3 py-1 text-zinc-400">Specifications</span>
                          </div>
                          <p className="text-xs text-zinc-400">Interactive tabbed panel content area.</p>
                        </div>
                      )}

                      {/* PRICING TABLE WIDGET */}
                      {w.type === 'pricing_table' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/20`}>
                          <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3">{w.title || 'Pricing Tier Plans'}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
                              <h5 className="text-xs font-bold text-white">Starter Plan</h5>
                              <p className="text-xl font-black text-indigo-400">$49/mo</p>
                            </div>
                            <div className="p-4 bg-indigo-600/10 border border-indigo-500/40 rounded-2xl space-y-2">
                              <h5 className="text-xs font-bold text-white">Enterprise</h5>
                              <p className="text-xl font-black text-indigo-300">$199/mo</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TESTIMONIAL CAROUSEL WIDGET */}
                      {w.type === 'testimonials' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-teal-500/20 text-center`}>
                          <MessageCircle size={20} className="mx-auto text-teal-400" />
                          <p className="text-xs text-zinc-300 italic">"Aurora transformed our portal deployment speed by 10x!"</p>
                          <span className="text-[10px] font-bold text-teal-400 block">- Chief Digital Officer</span>
                        </div>
                      )}

                      {/* CTA STRIP WIDGET */}
                      {w.type === 'cta_strip' && (
                        <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-xl">
                          <div>
                            <h4 className="text-sm font-bold">{w.title || 'Ready to scale your enterprise portal?'}</h4>
                            <p className="text-xs opacity-80">Get started today in under 2 minutes.</p>
                          </div>
                          <button className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold cursor-pointer">
                            Launch Now
                          </button>
                        </div>
                      )}

                      {/* EMBED IFRAME WIDGET */}
                      {w.type === 'embed_iframe' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-rose-500/20`}>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Globe size={16} className="text-rose-400" /> {w.title || 'Embedded Web Content Frame'}
                          </h4>
                          <div className="h-32 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-center text-xs text-zinc-500 font-mono">
                            [Iframe Media / Web Container]
                          </div>
                        </div>
                      )}

                      {/* MOBILE BOTTOM NAV BAR WIDGET */}
                      {w.type === 'bottom_nav_bar' && (
                        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl flex justify-around text-center text-[10px] text-zinc-400 font-bold">
                          <span className="text-indigo-400">Home</span>
                          <span>Search</span>
                          <span>Notifications</span>
                          <span>Profile</span>
                        </div>
                      )}

                      {/* FLOATING ACTION BUTTON WIDGET */}
                      {w.type === 'floating_action_btn' && (
                        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{w.title || 'Floating Action Button (FAB)'}</span>
                          <button className="h-10 w-10 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer">
                            <Plus size={20} />
                          </button>
                        </div>
                      )}

                      {/* PUSH PROMPT WIDGET */}
                      {w.type === 'push_prompt' && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Bell size={16} className="text-amber-400" />
                            <span className="font-bold text-amber-300">Enable Push Alerts for live status updates</span>
                          </div>
                          <button className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg text-[10px]">Enable</button>
                        </div>
                      )}

                      {/* INFINITE STREAM WIDGET */}
                      {w.type === 'infinite_stream' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-3 border border-teal-500/20`}>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Compass size={16} className="text-teal-400" /> {w.title || 'Infinite Mobile Stream'}
                          </h4>
                          <div className="space-y-2">
                            {[1, 2].map(item => (
                              <div key={item} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-bold text-white">
                                Stream Item Entry #{item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* MULTI-SLIDE BANNER CAROUSEL WIDGET */}
                      {w.type === 'slider_carousel' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-8 border border-rose-500/20 relative overflow-hidden space-y-4 bg-gradient-to-br from-rose-950/20 to-zinc-950`}>
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                              <Images size={12} /> Slide 1 of {(w.slides?.length || 2)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button className="p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white opacity-70 hover:opacity-100 cursor-pointer">
                                <ChevronLeft size={14} />
                              </button>
                              <button className="p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white opacity-70 hover:opacity-100 cursor-pointer">
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-2xl font-extrabold text-white">{w.slides?.[0]?.title || w.title || 'Multi-Slide Banner Carousel'}</h3>
                            <p className="text-xs text-zinc-300 max-w-lg leading-relaxed">{w.slides?.[0]?.subtitle || w.subtitle || 'Interactive multi-slide presentation widget with auto-play & touch swipe support.'}</p>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <button className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer">
                              {w.slides?.[0]?.buttonLabel || 'Explore Features'}
                            </button>
                            <div className="flex items-center gap-1.5 ml-auto">
                              {(w.slides || [1, 2, 3]).map((_, sIdx) => (
                                <span key={sIdx} className={`h-2 rounded-full transition-all ${sIdx === 0 ? 'w-6 bg-rose-500' : 'w-2 bg-zinc-800'}`} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CMS COLLECTION REPEATER WITH SUBMODULE & CONTEXT BINDING */}
                      {w.type === 'cms_collection_list' && (
                        <div className={`${getThemeCardClass()} ${getThemeRadiusClass()} p-6 space-y-4 border border-indigo-500/30`}>
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Database size={16} className="text-indigo-400" />
                              <h4 className="text-sm font-bold text-white">{w.title || 'Dynamic Repeater Collection'}</h4>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 font-mono">
                              Source: {w.targetModuleName || 'Tenancies'} {w.targetSubmoduleId ? `➔ ${w.targetSubmoduleId}` : ''} ({w.contextSource || 'all_records'})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                              { title: 'Tenancy Agreement #1092', badge: 'Active', price: '$2,400/mo', date: 'Refined 2h ago' },
                              { title: 'Property Bond Lodgement #881', badge: 'Verified', price: '$3,800.00', date: 'Refined 1d ago' },
                              { title: 'Maintenance Request #402', badge: 'Pending Approval', price: '$450.00', date: 'Refined 3d ago' }
                            ].map((item, idx) => (
                              <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800/90 rounded-2xl space-y-2.5 relative group hover:border-indigo-500/50 transition-all">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 font-mono">
                                    {item.badge}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500">{item.date}</span>
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{item.title}</h5>
                                  <p className="text-xs font-extrabold text-indigo-400 mt-1">{item.price}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* HEADING BLOCK (H1 - H6) */}
                      {w.type === 'heading_block' && (
                        <div className={`text-${w.textAlign || 'left'} py-2`}>
                          {(w.headingLevel === 'h1' || !w.headingLevel) && <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{w.title || 'Main Page Heading (H1)'}</h1>}
                          {w.headingLevel === 'h2' && <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{w.title || 'Section Heading (H2)'}</h2>}
                          {w.headingLevel === 'h3' && <h3 className="text-xl sm:text-2xl font-bold text-white">{w.title || 'Subheading (H3)'}</h3>}
                          {w.headingLevel === 'h4' && <h4 className="text-lg font-bold text-white">{w.title || 'Card Header (H4)'}</h4>}
                          {w.headingLevel === 'h5' && <h5 className="text-sm font-bold uppercase tracking-wider text-indigo-400">{w.title || 'Subsection Header (H5)'}</h5>}
                          {w.headingLevel === 'h6' && <h6 className="text-xs font-mono font-extrabold uppercase text-zinc-500 tracking-widest">{w.title || 'Eyebrow Header (H6)'}</h6>}
                        </div>
                      )}

                      {/* TEXT PARAGRAPH BLOCK */}
                      {w.type === 'text_paragraph' && (
                        <div className={`text-${w.textAlign || 'left'} text-sm text-zinc-300 leading-relaxed py-2`}>
                          <p>{w.subtitle || w.title || 'Generic rich text paragraph block for portal content, instructions, and articles.'}</p>
                        </div>
                      )}

                      {/* HORIZONTAL RULE (HR) */}
                      {w.type === 'horizontal_rule' && (
                        <div className="py-4">
                          {w.dividerStyle === 'gradient' ? (
                            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                          ) : (
                            <hr className={`border-zinc-800 ${
                              w.dividerStyle === 'dashed' ? 'border-dashed' : w.dividerStyle === 'dotted' ? 'border-dotted' : 'border-solid'
                            }`} />
                          )}
                        </div>
                      )}

                      {/* CONTENT PANEL primitive */}
                      {w.type === 'content_panel' && (
                        <div className={`p-6 rounded-2xl border ${
                          w.panelStyle === 'subtle_tint' ? 'bg-indigo-500/5 border-indigo-500/20' :
                          w.panelStyle === 'bordered_glass' ? 'bg-zinc-900/60 backdrop-blur-xl border-zinc-700/60 shadow-2xl' :
                          w.panelStyle === 'gradient_glow' ? 'bg-gradient-to-br from-indigo-950/30 to-purple-950/30 border-indigo-500/30 shadow-indigo-500/10 shadow-2xl' :
                          'bg-zinc-900 border-zinc-800'
                        } space-y-2`}>
                          <h4 className="text-sm font-bold text-white">{w.title || 'Content Panel Box Container'}</h4>
                          <p className="text-xs text-zinc-400">{w.subtitle || 'Container box primitive for grouping nested widgets and content.'}</p>
                        </div>
                      )}

                      {/* VERTICAL SPACER */}
                      {w.type === 'vertical_spacer' && (
                        <div className={`w-full ${
                          w.spacerHeight === 'sm' ? 'h-4' :
                          w.spacerHeight === 'lg' ? 'h-12' :
                          w.spacerHeight === 'xl' ? 'h-16' :
                          w.spacerHeight === '2xl' ? 'h-24' : 'h-8'
                        } flex items-center justify-center`}>
                          <div className="w-full border-t border-dashed border-zinc-800/40 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-center text-zinc-600 font-mono">
                            Spacer ({w.spacerHeight || 'md'})
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Footer */}
            <footer 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement({ type: 'footer' });
              }}
              className={`bg-zinc-900 border-t border-zinc-800 p-4 text-center text-xs text-zinc-500 shrink-0 relative transition-all cursor-pointer ${
                selectedElement?.type === 'footer'
                  ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 z-20'
                  : 'hover:ring-1 hover:ring-indigo-500/40'
              }`}
            >
              {selectedElement?.type === 'footer' && (
                <span className="absolute top-2 right-4 text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-indigo-500 text-white rounded font-mono z-30">
                  FOOTER
                </span>
              )}
              {footerText}
            </footer>
          </div>
        </div>

        </main>

        {/* RIGHT DEDICATED PROPERTY INSPECTOR SIDEBAR (360px) */}
        <aside className={`w-[360px] shrink-0 border-l flex flex-col h-full z-20 overflow-hidden ${editorPanelClass}`}>
          
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'bg-zinc-100/80 border-zinc-200' : 'bg-zinc-950/40 border-zinc-800'}`}>
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-indigo-500" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider">Property Inspector</h3>
                <p className="text-[10px] opacity-70">
                  {selectedElement?.type === 'header' && 'Header & Navigation Bar'}
                  {selectedElement?.type === 'page_header' && `Page: ${activePage?.title || ''}`}
                  {selectedElement?.type === 'widget' && `Widget: ${activePage?.widgets.find(w => w.id === selectedElement.id)?.type.replace('_', ' ') || ''}`}
                  {selectedElement?.type === 'footer' && 'Footer Bar'}
                  {!selectedElement && 'Select an element on canvas'}
                </p>
              </div>
            </div>

            {selectedElement && (
              <button
                type="button"
                onClick={() => setSelectedElement(null)}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-all cursor-pointer"
                title="Deselect Element"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Inspector Body */}
          <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-5">
            
            {/* 1. HEADER INSPECTOR */}
            {selectedElement?.type === 'header' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    Header Title Text
                  </label>
                  <input
                    type="text"
                    value={headerTitle}
                    onChange={e => setHeaderTitle(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                    placeholder={name}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    Logo Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    Main Menu Navigation & Layout
                  </label>
                  <select
                    value={headerLayout}
                    onChange={e => setHeaderLayout(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  >
                    <optgroup label="🔝 Top Header Navigation">
                      <option value="top_right">Top Navbar &bull; Links Right Aligned</option>
                      <option value="top_center">Top Navbar &bull; Links Centered</option>
                      <option value="pill_header">Top Navbar &bull; Floating Pill Bar</option>
                      <option value="minimal">Top Navbar &bull; Minimal Layout</option>
                    </optgroup>
                    <optgroup label="◀️ Vertical Sidebar Navigation">
                      <option value="sidebar_left">Vertical Sidebar &bull; Left Navigation Panel</option>
                      <option value="sidebar_right">Vertical Sidebar &bull; Right Navigation Panel</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    Nav Item Active Link Style
                  </label>
                  <select
                    value={navLinkStyle}
                    onChange={e => setNavLinkStyle(e.target.value as any)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  >
                    <option value="underline">Modern Gradient Underline</option>
                    <option value="pills">Filled Accent Pills</option>
                    <option value="badges">Soft Tinted Badges</option>
                    <option value="glowing_text">Neon Glowing Text</option>
                    <option value="ghost_button">Ghost Bordered Button</option>
                  </select>
                </div>

                {/* Navigation Menu Items Manager */}
                <div className="pt-3 border-t border-zinc-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider">
                      Header Navigation Menu Links
                    </label>
                  </div>

                  <div className="space-y-2">
                    {navItems.map((item, idx) => (
                      <div key={item.id} className={`p-3 border rounded-xl space-y-2 ${isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={e => {
                              const val = e.target.value;
                              setNavItems(prev => prev.map(n => n.id === item.id ? { ...n, label: val } : n));
                            }}
                            className={`flex-1 px-2 py-1 border rounded-lg text-xs font-bold ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                            placeholder="Link Label"
                          />
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveNavItem(item.id, 'up')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-indigo-500/10 opacity-60 hover:opacity-100 disabled:opacity-30 rounded cursor-pointer"
                              title="Move Up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveNavItem(item.id, 'down')}
                              disabled={idx === navItems.length - 1}
                              className="p-1 hover:bg-indigo-500/10 opacity-60 hover:opacity-100 disabled:opacity-30 rounded cursor-pointer"
                              title="Move Down"
                            >
                              <ChevronDown size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNavItem(item.id)}
                              className="p-1 hover:bg-red-500/20 text-red-400 rounded cursor-pointer"
                              title="Delete Link"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={item.path}
                          onChange={e => {
                            const val = e.target.value;
                            setNavItems(prev => prev.map(n => n.id === item.id ? { ...n, path: val } : n));
                          }}
                          className={`w-full px-2 py-1 border rounded-lg text-[11px] font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-zinc-300'}`}
                          placeholder="/path"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add New Custom Nav Item Form */}
                  <div className="pt-2 border-t border-zinc-500/20 space-y-2">
                    <p className="text-[10px] font-bold opacity-70 uppercase tracking-wider">Add Custom Nav Link</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Link Label..."
                        value={newNavLabel}
                        onChange={e => setNewNavLabel(e.target.value)}
                        className={`px-2 py-1.5 border rounded-lg text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                      />
                      <input
                        type="text"
                        placeholder="/target-page"
                        value={newNavPath}
                        onChange={e => setNewNavPath(e.target.value)}
                        className={`px-2 py-1.5 border rounded-lg text-xs font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddNavItem}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Plus size={12} /> Add Navigation Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PAGE HEADER INSPECTOR */}
            {selectedElement?.type === 'page_header' && activePage && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={activePage.title}
                    onChange={e => {
                      const newTitle = e.target.value;
                      setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, title: newTitle } : p));
                    }}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    Page Description / Subtitle
                  </label>
                  <textarea
                    rows={3}
                    value={activePage.description || ''}
                    onChange={e => {
                      const newDesc = e.target.value;
                      setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, description: newDesc } : p));
                    }}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 resize-none ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                    placeholder="Brief description of this page..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={activePage.slug}
                    onChange={e => {
                      const newSlug = e.target.value;
                      setPages(prev => prev.map(p => p.id === activePage.id ? { ...p, slug: newSlug } : p));
                    }}
                    className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>
              </div>
            )}

            {/* 3. WIDGET INSPECTOR */}
            {selectedElement?.type === 'widget' && activePage?.widgets.find(w => w.id === selectedElement.id) && (
              (() => {
                const selWidget = activePage.widgets.find(w => w.id === selectedElement.id)!;
                return (
                  <div className="space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-500/20">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded font-mono">
                        {selWidget.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] opacity-60 font-mono">ID: {selWidget.id}</span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                        Widget Title
                      </label>
                      <input
                        type="text"
                        value={selWidget.title || ''}
                        onChange={e => handleUpdateWidgetProp(selWidget.id, 'title', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                      />
                    </div>

                    {(selWidget.type === 'hero' || selWidget.type === 'form_embed' || selWidget.type === 'ticket_form') && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Subtitle / Description
                        </label>
                        <textarea
                          rows={2}
                          value={selWidget.subtitle || ''}
                          onChange={e => handleUpdateWidgetProp(selWidget.id, 'subtitle', e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                        />
                      </div>
                    )}

                    {(selWidget.type === 'form_embed' || selWidget.type === 'ticket_form') && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Bound Workspace Module
                        </label>
                        <select
                          value={selWidget.targetModuleId || ''}
                          onChange={e => handleUpdateWidgetProp(selWidget.id, 'targetModuleId', e.target.value)}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                        >
                          {availableModules.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* HEADING BLOCK INSPECTOR */}
                    {selWidget.type === 'heading_block' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-500/20">
                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Heading Level Size
                          </label>
                          <select
                            value={selWidget.headingLevel || 'h2'}
                            onChange={e => handleUpdateWidgetProp(selWidget.id, 'headingLevel', e.target.value)}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="h1">H1 - Page Title (Large Hero)</option>
                            <option value="h2">H2 - Section Header (Medium Large)</option>
                            <option value="h3">H3 - Subheading (Medium)</option>
                            <option value="h4">H4 - Card Header (Standard)</option>
                            <option value="h5">H5 - Small Subsection</option>
                            <option value="h6">H6 - Micro Tag / Eyebrow Header</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Text Alignment
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {['left', 'center', 'right'].map(align => (
                              <button
                                key={align}
                                type="button"
                                onClick={() => handleUpdateWidgetProp(selWidget.id, 'textAlign', align)}
                                className={`py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                                  (selWidget.textAlign || 'left') === align
                                    ? 'bg-indigo-600 text-white'
                                    : isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-900 text-zinc-400'
                                }`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TEXT PARAGRAPH INSPECTOR */}
                    {selWidget.type === 'text_paragraph' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-500/20">
                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Paragraph Text Content
                          </label>
                          <textarea
                            rows={4}
                            value={selWidget.subtitle || selWidget.title || ''}
                            onChange={e => {
                              handleUpdateWidgetProp(selWidget.id, 'title', e.target.value);
                              handleUpdateWidgetProp(selWidget.id, 'subtitle', e.target.value);
                            }}
                            className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                            placeholder="Type paragraph text or markdown content..."
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Text Alignment
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {['left', 'center', 'right'].map(align => (
                              <button
                                key={align}
                                type="button"
                                onClick={() => handleUpdateWidgetProp(selWidget.id, 'textAlign', align)}
                                className={`py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                                  (selWidget.textAlign || 'left') === align
                                    ? 'bg-indigo-600 text-white'
                                    : isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-900 text-zinc-400'
                                }`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* HORIZONTAL RULE INSPECTOR */}
                    {selWidget.type === 'horizontal_rule' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-500/20">
                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Divider Line Style
                          </label>
                          <select
                            value={selWidget.dividerStyle || 'solid'}
                            onChange={e => handleUpdateWidgetProp(selWidget.id, 'dividerStyle', e.target.value)}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="solid">Solid Line</option>
                            <option value="dashed">Dashed Line</option>
                            <option value="dotted">Dotted Line</option>
                            <option value="gradient">Modern Neon Gradient</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* CONTENT PANEL INSPECTOR */}
                    {selWidget.type === 'content_panel' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-500/20">
                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Panel Box Style
                          </label>
                          <select
                            value={selWidget.panelStyle || 'card_surface'}
                            onChange={e => handleUpdateWidgetProp(selWidget.id, 'panelStyle', e.target.value)}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="card_surface">Standard Card Surface</option>
                            <option value="subtle_tint">Subtle Tint Container</option>
                            <option value="bordered_glass">Glassmorphic Bordered Glass</option>
                            <option value="gradient_glow">Gradient Ambient Glow</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* VERTICAL SPACER INSPECTOR */}
                    {selWidget.type === 'vertical_spacer' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-500/20">
                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Spacer Height Gap
                          </label>
                          <select
                            value={selWidget.spacerHeight || 'md'}
                            onChange={e => handleUpdateWidgetProp(selWidget.id, 'spacerHeight', e.target.value)}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="sm">Small Gap (16px)</option>
                            <option value="md">Medium Gap (32px)</option>
                            <option value="lg">Large Gap (48px)</option>
                            <option value="xl">Extra Large Gap (64px)</option>
                            <option value="2xl">Huge Gap (96px)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC REPEATER FIELD MAPPER & SUBMODULE CONTEXT INSPECTOR */}
                    {selWidget.type === 'cms_collection_list' && (
                      <div className="space-y-4 pt-3 border-t border-zinc-500/20">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                          <Database size={12} /> Dynamic Repeater Context & Field Binding Engine
                        </p>

                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Primary Module Collection
                          </label>
                          <select
                            value={selWidget.targetModuleId || ''}
                            onChange={e => {
                              const mod = availableModules.find(m => m.id === e.target.value);
                              handleUpdateWidgetProp(selWidget.id, 'targetModuleId', e.target.value);
                              handleUpdateWidgetProp(selWidget.id, 'targetModuleName', mod?.name || '');
                            }}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="">-- Select Module Collection --</option>
                            {availableModules.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.type})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Submodule Collection Relationship
                          </label>
                          <select
                            value={selWidget.targetSubmoduleId || ''}
                            onChange={e => handleUpdateWidgetProp(selWidget.id, 'targetSubmoduleId', e.target.value)}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="">-- None (Direct Module Collection) --</option>
                            <option value="submod-maintenance">Maintenance Requests (Submodule)</option>
                            <option value="submod-inspections">Property Inspections (Submodule)</option>
                            <option value="submod-payouts">Claim Payout Ledger (Submodule)</option>
                            <option value="submod-documents">Associated Document Vault (Submodule)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                            Context Binding Source
                          </label>
                          <select
                            value={selWidget.contextSource || 'all_records'}
                            onChange={e => handleUpdateWidgetProp(selWidget.id, 'contextSource', e.target.value)}
                            className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                          >
                            <option value="all_records">🌐 Fetch All Collection Records</option>
                            <option value="parent_route_record">🔗 Filter by Active Route Record ID Context</option>
                            <option value="filtered_subset">🔍 Filtered Subset (Custom Filter Criteria)</option>
                          </select>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-zinc-800">
                          <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            Dynamic Repeater Field Mapping
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] font-bold text-zinc-400">Title Field</span>
                              <input
                                type="text"
                                value={selWidget.fieldMapping?.titleField || 'title'}
                                onChange={e => handleUpdateWidgetProp(selWidget.id, 'fieldMapping', { ...selWidget.fieldMapping, titleField: e.target.value })}
                                className={`w-full px-2 py-1 border rounded-lg text-xs font-mono ${isLight ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                                placeholder="name / address"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-zinc-400">Badge Field</span>
                              <input
                                type="text"
                                value={selWidget.fieldMapping?.badgeField || 'status'}
                                onChange={e => handleUpdateWidgetProp(selWidget.id, 'fieldMapping', { ...selWidget.fieldMapping, badgeField: e.target.value })}
                                className={`w-full px-2 py-1 border rounded-lg text-xs font-mono ${isLight ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                                placeholder="status / category"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MULTI-SLIDE CAROUSEL INSPECTOR */}
                    {selWidget.type === 'slider_carousel' && (
                      <div className="space-y-3 pt-3 border-t border-zinc-500/20">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                            <Images size={12} /> Slide Items Manager
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              const existing = selWidget.slides || [
                                { id: 's-1', title: 'Welcome to Aurora Platform', subtitle: 'Build next-gen portals and mobile apps.', buttonLabel: 'Explore Portals' }
                              ];
                              const newSlides = [
                                ...existing,
                                { id: `s-${Date.now()}`, title: `Slide ${existing.length + 1}`, subtitle: 'Custom slider content presentation.', buttonLabel: 'Action CTA' }
                              ];
                              handleUpdateWidgetProp(selWidget.id, 'slides', newSlides);
                            }}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Add Slide
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(selWidget.slides || [
                            { id: 's-1', title: 'Welcome to Aurora Platform', subtitle: 'Build next-gen portals and mobile apps.', buttonLabel: 'Explore Portals' },
                            { id: 's-2', title: 'Enterprise Single Sign-On', subtitle: 'Bank-grade security and role-based access control.', buttonLabel: 'Learn More' }
                          ]).map((slide) => (
                            <div key={slide.id} className={`p-2.5 border rounded-xl space-y-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={slide.title}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const updated = (selWidget.slides || []).map(s => s.id === slide.id ? { ...s, title: val } : s);
                                    handleUpdateWidgetProp(selWidget.id, 'slides', updated);
                                  }}
                                  className={`flex-1 px-2 py-1 border rounded-lg text-xs font-bold ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                                  placeholder="Slide Title"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (selWidget.slides || []).filter(s => s.id !== slide.id);
                                    handleUpdateWidgetProp(selWidget.id, 'slides', updated);
                                  }}
                                  className="p-1 hover:bg-red-500/20 text-red-400 rounded cursor-pointer shrink-0"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(selWidget.type === 'form_embed' || selWidget.type === 'ticket_form') && (
                      <div className="space-y-3 pt-2 border-t border-zinc-800">
                        <div className="flex items-center justify-between">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Form Fields Builder
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddFormField(selWidget.id)}
                            className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Plus size={10} /> Add Field
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(selWidget.formFields || [
                            { id: 'f-1', label: 'Contact Email', fieldType: 'email', required: true, placeholder: 'name@company.com' },
                            { id: 'f-2', label: 'Subject / Title', fieldType: 'text', required: true, placeholder: 'Summary of inquiry...' },
                            { id: 'f-3', label: 'Detailed Description', fieldType: 'textarea', required: true, placeholder: 'Provide full details...' }
                          ]).map((field) => (
                            <div key={field.id} className={`p-2.5 border rounded-xl space-y-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={e => handleUpdateFormField(selWidget.id, field.id, 'label', e.target.value)}
                                  className={`flex-1 px-2 py-1 border rounded-lg text-xs font-bold ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFormField(selWidget.id, field.id)}
                                  className="p-1 hover:bg-red-500/20 text-red-400 rounded cursor-pointer shrink-0"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={field.fieldType}
                                  onChange={e => handleUpdateFormField(selWidget.id, field.id, 'fieldType', e.target.value as any)}
                                  className={`px-2 py-1 border rounded-lg text-[11px] ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                                >
                                  <option value="text">Text Input</option>
                                  <option value="email">Email Input</option>
                                  <option value="textarea">Text Area</option>
                                  <option value="checkbox">Checkbox</option>
                                </select>
                                <input
                                  type="text"
                                  value={field.placeholder || ''}
                                  onChange={e => handleUpdateFormField(selWidget.id, field.id, 'placeholder', e.target.value)}
                                  className={`px-2 py-1 border rounded-lg text-[11px] ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-900 border-zinc-800 text-white'}`}
                                />
                              </div>

                              <label className={`flex items-center gap-1.5 text-[10px] font-bold cursor-pointer ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                                <input
                                  type="checkbox"
                                  checked={!!field.required}
                                  onChange={e => handleUpdateFormField(selWidget.id, field.id, 'required', e.target.checked)}
                                  className="rounded border-zinc-300 bg-white text-indigo-600 focus:ring-0"
                                />
                                <span>Required Field</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PHASE 4: LOGIC & EVENT TRIGGER SYSTEM */}
                    <div className="pt-3 border-t border-zinc-500/20 space-y-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                        <Zap size={12} /> Logic & Event Trigger System
                      </p>
                      <div>
                        <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                          Click Event Trigger Action
                        </label>
                        <select
                          value={selWidget.buttonAction || 'open_modal'}
                          onChange={e => handleUpdateWidgetProp(selWidget.id, 'buttonAction', e.target.value)}
                          className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                        >
                          <option value="open_modal">⚡ OnClick ➔ Open Dynamic Modal</option>
                          <option value="trigger_workflow">⚡ OnClick ➔ Trigger Aurora Workflow Rule</option>
                          <option value="execute_api">⚡ OnClick ➔ Execute Custom Webhook API Call</option>
                          <option value="navigate">⚡ OnClick ➔ Navigate Page / URL</option>
                          <option value="download">⚡ OnClick ➔ Download File / Document</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                          Trigger Target / Route / Payload
                        </label>
                        <input
                          type="text"
                          value={selWidget.actionTarget || ''}
                          onChange={e => handleUpdateWidgetProp(selWidget.id, 'actionTarget', e.target.value)}
                          placeholder="e.g. /workspace/workflow-102 or ModalTitle"
                          className={`w-full px-2.5 py-1.5 border rounded-xl text-xs font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                        />
                      </div>
                    </div>

                    {/* PHASE 4: FLEXBOX & GRID CANVAS BUILDER */}
                    <div className="pt-3 border-t border-zinc-500/20 space-y-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                        <LayoutGrid size={12} /> Flexbox & Grid Canvas Controls
                      </p>
                      <div>
                        <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                          Widget Layout Grid Columns
                        </label>
                        <select
                          value={selWidget.layoutColumns || '1_col'}
                          onChange={e => handleUpdateWidgetProp(selWidget.id, 'layoutColumns', e.target.value)}
                          className={`w-full px-2.5 py-1.5 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                        >
                          <option value="1_col">1 Full-Width Column (100%)</option>
                          <option value="2_col">2 Equal Columns (50% / 50%)</option>
                          <option value="3_col">3 Equal Columns (33% / 33% / 33%)</option>
                          <option value="4_col">4 Equal Columns (25% Grid)</option>
                          <option value="split_1_2">Split 1/3 Left &bull; 2/3 Right</option>
                          <option value="split_2_1">Split 2/3 Left &bull; 1/3 Right</option>
                        </select>
                      </div>
                    </div>

                    {/* PHASE 4: CUSTOM CODE & SCHEMA ENGINE */}
                    <div className="pt-3 border-t border-zinc-500/20 space-y-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                        <Code size={12} /> Custom Code & Component Extension
                      </p>
                      <div>
                        <label className="block text-[10px] font-bold opacity-70 uppercase tracking-wider mb-1">
                          Custom HTML / Tailwind / JS Snippet
                        </label>
                        <textarea
                          rows={3}
                          value={selWidget.customSnippet || ''}
                          onChange={e => handleUpdateWidgetProp(selWidget.id, 'customSnippet', e.target.value)}
                          placeholder="<div className='p-4 bg-indigo-500/10 text-indigo-400 rounded-xl'>Custom Component Extension</div>"
                          className={`w-full px-2.5 py-1.5 border rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-500 resize-none ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-zinc-300'}`}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-500/20 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleActivePageWidget(selWidget.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          selWidget.enabled
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500'
                            : (isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-zinc-800 text-zinc-400')
                        }`}
                      >
                        {selWidget.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                        {selWidget.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicateWidget(selWidget.id)}
                          className={`p-2 rounded-xl transition-all cursor-pointer border ${isLight ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}
                          title="Duplicate Widget"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWidget(selWidget.id)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                          title="Delete Widget"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}

            {/* 4. FOOTER INSPECTOR */}
            {selectedElement?.type === 'footer' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                    Footer Copyright Text
                  </label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-indigo-500 ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                  />
                </div>
              </div>
            )}

            {!selectedElement && (
              <div className="text-center py-12 space-y-2">
                <Sliders size={28} className="mx-auto opacity-50 text-indigo-500" />
                <p className={`text-xs font-bold ${isLight ? 'text-zinc-900' : 'text-zinc-400'}`}>No Element Selected</p>
                <p className={`text-[11px] leading-relaxed max-w-[200px] mx-auto ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Click on the Header, Page Title, any Widget, or Footer in the preview canvas to inspect its properties.
                </p>
              </div>
            )}

          </div>
        </aside>

      </div>

      {/* AURORA PREMIUM MODAL FOR ADDING A NEW SITE PAGE */}
      <Modal
        isOpen={isAddPageModalOpen}
        onClose={() => setIsAddPageModalOpen(false)}
        title="Add New Site Page"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddPageModalOpen(false)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-site-page-form"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              Create & Add Page
            </button>
          </div>
        }
      >
        <form id="add-site-page-form" onSubmit={e => { e.preventDefault(); handleAddPage(); }} className="space-y-4">
          <div>
            <label htmlFor="new-page-title" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Page Title
            </label>
            <input
              id="new-page-title"
              type="text"
              placeholder="e.g. Hosting Plans & Pricing"
              value={newPageTitle}
              onChange={e => setNewPageTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="new-page-slug" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              URL Path / Slug
            </label>
            <input
              id="new-page-slug"
              type="text"
              placeholder="e.g. /services/hosting"
              value={newPageSlug}
              onChange={e => setNewPageSlug(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label htmlFor="new-page-desc" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Page Description
            </label>
            <textarea
              id="new-page-desc"
              rows={2}
              placeholder="Provide a brief summary of this page's purpose..."
              value={newPageDesc}
              onChange={e => setNewPageDesc(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div>
            <label htmlFor="new-page-parent" className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Parent Page (For Nesting)
            </label>
            <select
              id="new-page-parent"
              value={newPageParentId}
              onChange={e => setNewPageParentId(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            >
              <option value="">None (Top-Level Root Page)</option>
              {pages.map(p => (
                <option key={p.id} value={p.id}>
                  Nest under: {p.title} ({p.slug})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* AURORA PREMIUM MODAL FOR ADDING A WIDGET TO ACTIVE PAGE */}
      <Modal
        isOpen={isAddWidgetModalOpen}
        onClose={() => setIsAddWidgetModalOpen(false)}
        title={`Add Widget to Page: ${activePage?.title || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Select a widget component below to append it to <span className="font-bold text-zinc-900 dark:text-white">{activePage?.title}</span> ({activePage?.slug}).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                type: 'bond_lodgement',
                title: 'Property Bond Lodgement Portal',
                desc: 'Turnkey self-service portal for bond holders & residents to lodge, register, and manage property bonds directly in Aurora.',
                icon: Building2,
                color: 'text-emerald-400 bg-emerald-500/10'
              },
              {
                type: 'status_tracker',
                title: 'Application / Bond Status Tracker',
                desc: 'Self-service progress timeline widget for visitors to track reference codes (e.g. BND-9921) and application stages.',
                icon: Clock,
                color: 'text-amber-400 bg-amber-500/10'
              },
              {
                type: 'live_chat',
                title: 'Online Customer Support Live Chat',
                desc: 'Real-time support messaging component connecting portal visitors directly to workspace staff & AI agents.',
                icon: MessageSquare,
                color: 'text-indigo-400 bg-indigo-500/10'
              },
              {
                type: 'auth_widget',
                title: 'Portal Member Login & SSO Auth Card',
                desc: 'Authentication card supporting Email/Password, Registration, and Google/Microsoft/Apple Third-Party SSO.',
                icon: Lock,
                color: 'text-rose-400 bg-rose-500/10'
              },
              {
                type: 'record_grid',
                title: 'Aurora Record Data Grid',
                desc: 'Dynamic data grid displaying live records from an Aurora workspace module with search and detail view modal.',
                icon: Layers,
                color: 'text-cyan-400 bg-cyan-500/10'
              },
              {
                type: 'hero',
                title: 'Hero Section Header',
                desc: 'High-impact banner with custom title, subtitle, accent glow, and call-to-action button.',
                icon: Sparkles,
                color: 'text-amber-500 bg-amber-500/10'
              },
              {
                type: 'form_embed',
                title: 'Embed Workspace Module Form',
                desc: 'Select any Aurora workspace module (Intake Triage, Support Tickets, Lead Surveys) to embed custom forms.',
                icon: FormInput,
                color: 'text-emerald-500 bg-emerald-500/10'
              },
              {
                type: 'kb_search',
                title: 'Knowledge Base Search',
                desc: 'Interactive search bar with real-time article lookup and filtered topic cards.',
                icon: BookOpen,
                color: 'text-blue-500 bg-blue-500/10'
              },
              {
                type: 'status_widget',
                title: 'System Health Monitor',
                desc: 'Displays real-time service uptime stats, API latency metrics, and operational health badges.',
                icon: Activity,
                color: 'text-emerald-500 bg-emerald-500/10'
              },
              {
                type: 'announcements',
                title: 'Broadcast News Feed',
                desc: 'Broadcast announcement stream for system updates, release notes, and organizational bulletins.',
                icon: Radio,
                color: 'text-indigo-500 bg-indigo-500/10'
              }
            ].map(w => {
              const Icon = w.icon;
              return (
                <div
                  key={w.type}
                  onClick={() => handleAddWidgetToActivePage(w.type as any)}
                  className={`p-5 border rounded-2xl cursor-pointer transition-all flex items-start gap-4 group shadow-sm hover:shadow-lg ${
                    isLight 
                      ? 'bg-zinc-50 border-zinc-200 hover:border-indigo-500 hover:bg-white' 
                      : 'bg-zinc-900 border-zinc-800 hover:border-indigo-500 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`p-3 rounded-xl ${w.color} shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold transition-colors flex items-center justify-between ${
                      isLight ? 'text-zinc-900 group-hover:text-indigo-600' : 'text-white group-hover:text-indigo-400'
                    }`}>
                      <span>{w.title}</span>
                      <Plus size={16} className="opacity-50 group-hover:opacity-100 transition-colors" />
                    </h4>
                    <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{w.desc}</p>
                  </div>
                </div>

              );
            })}
          </div>
        </div>
      </Modal>

      {/* ENTERPRISE TEMPLATES PRESET GALLERY MODAL */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Enterprise Site Template Gallery"
        size="lg"
      >
        <div className="space-y-4">
          <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
            Choose a 1-click enterprise template below to pre-configure page hierarchy, color palette, and layout widget stacks.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                id: 'intranet',
                title: 'Internal Intranet Hub',
                desc: 'Corporate intranet with news broadcast feed, SOP documentation search, and internal intake triage.',
                badge: 'Internal Portal',
                color: 'from-indigo-600 to-blue-600'
              },
              {
                id: 'helpdesk',
                title: 'Customer Help Desk & KB',
                desc: 'Customer help portal with searchable knowledge base, ticket submission form, and onboarding guides.',
                badge: 'Support Center',
                color: 'from-blue-600 to-cyan-600'
              },
              {
                id: 'apidocs',
                title: 'Developer & API Portal',
                desc: 'Developer documentation site with API payload specs, SDK guides, and real-time webhook status.',
                badge: 'Developer Docs',
                color: 'from-purple-600 to-indigo-600'
              },
              {
                id: 'status',
                title: 'System Status & Uptime Page',
                desc: 'Public uptime monitoring dashboard with API latency metrics and incident bulletin updates.',
                badge: 'Status Page',
                color: 'from-emerald-600 to-teal-600'
              },
              {
                id: 'vendor',
                title: 'Partner & Vendor Portal',
                desc: 'External vendor onboarding hub for proposal submissions, compliance credentials, and invoices.',
                badge: 'Vendor Center',
                color: 'from-amber-600 to-orange-600'
              }
            ].map(tpl => (
              <div
                key={tpl.id}
                onClick={() => handleApplyTemplatePreset(tpl.id)}
                className={`p-5 border rounded-2xl cursor-pointer transition-all space-y-3 group hover:shadow-xl ${
                  isLight 
                    ? 'bg-zinc-50 border-zinc-200 hover:border-indigo-500 hover:bg-white' 
                    : 'bg-zinc-900 border-zinc-800 hover:border-indigo-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 text-[10px] font-extrabold text-white bg-gradient-to-r ${tpl.color} rounded-full uppercase tracking-wider`}>
                    {tpl.badge}
                  </span>
                  <Sparkles size={14} className="opacity-50 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold transition-colors ${isLight ? 'text-zinc-900 group-hover:text-indigo-600' : 'text-white group-hover:text-indigo-400'}`}>{tpl.title}</h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>{tpl.desc}</p>
                </div>
                <div className="pt-2 flex items-center gap-1 text-xs font-bold text-indigo-500">
                  <span>Apply Template Preset</span>
                  <ChevronRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* UNIVERSAL SINGLE-CODEBASE MOBILE APP & WEB EXPORTER WIZARD MODAL */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Single-Codebase Mobile & Web App Exporter Wizard"
        size="lg"
      >
        <div className="space-y-5">
          <div className={`p-4 border rounded-2xl space-y-1 ${isLight ? 'bg-indigo-50/50 border-indigo-200 text-zinc-900' : 'bg-indigo-500/10 border-indigo-500/20 text-white'}`}>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Smartphone size={18} className="text-indigo-400" />
              Compile & Export Native Mobile Application
            </h4>
            <p className="text-xs opacity-80 leading-relaxed">
              Package your site configuration into a single-codebase mobile app for iOS (Apple App Store) and Android (Google Play) using Capacitor & Expo React Native.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                Mobile App Bundle Identifier (App ID)
              </label>
              <input
                type="text"
                value={appId}
                onChange={e => setAppId(e.target.value)}
                placeholder="com.aurora.tenancyportal"
                className={`w-full px-3 py-2 border rounded-xl text-xs font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  App Name
                </label>
                <input
                  type="text"
                  value={appName || name}
                  onChange={e => setAppName(e.target.value)}
                  placeholder="Aurora Portal"
                  className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Version
                </label>
                <input
                  type="text"
                  value={appVersion}
                  onChange={e => setAppVersion(e.target.value)}
                  placeholder="1.0.0"
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-mono ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                />
              </div>
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-zinc-700' : 'text-zinc-400'}`}>
                  Target Platform
                </label>
                <select
                  value={appPlatform}
                  onChange={e => setAppPlatform(e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs ${isLight ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'}`}
                >
                  <option value="all">iOS & Android (Universal Single Codebase)</option>
                  <option value="ios">Apple iOS (.ipa)</option>
                  <option value="android">Android (.apk / .aab)</option>
                  <option value="web">PWA / Web Bundle Only</option>
                </select>
              </div>
            </div>

            <div className={`p-4 border rounded-2xl space-y-2 ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-950 border-zinc-800'}`}>
              <span className={`block text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-900' : 'text-white'}`}>
                Native Mobile Device Capabilities
              </span>

              <label className="flex items-center justify-between text-xs cursor-pointer">
                <span className={isLight ? 'text-zinc-700' : 'text-zinc-300'}>Push Notifications Engine</span>
                <input
                  type="checkbox"
                  checked={pushEnabled}
                  onChange={e => setPushEnabled(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-indigo-600"
                />
              </label>
            </div>

            <button
              onClick={async () => {
                if (!site) return;
                setExportingApp(true);
                try {
                  const res = await SiteService.exportMobileAppManifest(site.id, {
                    appId: appId || `com.aurora.${site.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                    appName: appName || site.name,
                    platform: appPlatform,
                    version: appVersion,
                    buildNumber: 1,
                    pushNotificationsEnabled: pushEnabled,
                    cameraAccessEnabled: true,
                    biometricsEnabled: true
                  });
                  setExportedManifest(res.manifest);
                  toast.success('Mobile app bundle manifest compiled successfully!');
                } catch (err: any) {
                  toast.error(err.message || 'Failed to generate mobile export package');
                } finally {
                  setExportingApp(false);
                }
              }}
              disabled={exportingApp}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
            >
              <Smartphone size={16} /> {exportingApp ? 'Compiling Mobile Package...' : 'Compile Single-Codebase App Bundle'}
            </button>

            {exportedManifest && (
              <div className={`p-4 border rounded-2xl space-y-3 ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Check size={16} /> Native Manifest Ready ({exportedManifest.app?.appName})
                  </span>
                  <button
                    onClick={() => {
                      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportedManifest, null, 2));
                      const downloadAnchor = document.createElement('a');
                      downloadAnchor.setAttribute("href", dataStr);
                      downloadAnchor.setAttribute("download", `aurora-mobile-app-${appId}.json`);
                      document.body.appendChild(downloadAnchor);
                      downloadAnchor.click();
                      downloadAnchor.remove();
                      toast.success('Mobile App Bundle JSON downloaded!');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    Download App Bundle JSON
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-emerald-300 max-h-36 overflow-y-auto p-3 bg-black/40 rounded-xl">
                  {JSON.stringify(exportedManifest.capacitorConfig, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* DELETE PAGE CONFIRMATION MODAL */}
      {deletePageTarget && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md ${isLight ? 'bg-white text-zinc-900 border-zinc-200 shadow-2xl' : 'bg-zinc-900 text-white border-zinc-800 shadow-2xl'} border rounded-3xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold">Delete Page Confirmation</h3>
                <p className={`text-xs ${isLight ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Are you sure you want to delete <span className="font-bold text-rose-400 font-mono">"{deletePageTarget.title}"</span>?
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${isLight ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-950 text-zinc-400 border border-zinc-800'}`}>
              <p className="font-bold text-rose-400 flex items-center gap-1">
                <span>⚠️</span> Irreversible Action
              </p>
              <p>Deleting this page will permanently remove it along with all configured widgets and any child pages. The preview canvas will update immediately to show your remaining pages.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-500/10">
              <button
                type="button"
                onClick={() => setDeletePageTarget(null)}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${isLight ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'} cursor-pointer transition-all`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePage}
                className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-lg shadow-rose-600/20 flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={13} /> Yes, Delete Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Picker Modal for Site Forms */}
      <ComponentPickerModal
        isOpen={isFormPickerOpen}
        onClose={() => setIsFormPickerOpen(false)}
        title="Attach Form from Central Library"
        componentType="form"
        items={[
          { id: 'f_contact', name: 'Contact & Inquiry Form', description: 'Standard public lead intake form.', isGlobal: true, version: 1 },
          { id: 'f_support', name: 'Customer Support Intake', description: 'Priority support ticket form.', isGlobal: true, version: 2 },
          { id: 'f_feedback', name: 'Feedback & Rating Survey', description: 'End-of-service satisfaction survey.', isGlobal: true, version: 1 }
        ]}
        onSelect={(item) => {
          toast.success(`Attached "${item.name}" to form widget!`);
        }}
        onCreateNew={() => {
          setIsInContextFormBuilderOpen(true);
        }}
      />

      {/* In-Context Form Builder Modal */}
      <InContextBuilderModal
        isOpen={isInContextFormBuilderOpen}
        onClose={() => setIsInContextFormBuilderOpen(false)}
        title="In-Context Form Builder"
        subtitle="Designing custom form for current Site Page"
        builderContext={{
          mode: 'in_context',
          hostType: 'site',
          hostId: siteId
        }}
      >
        <FormBuilder
          builderContext={{
            mode: 'in_context',
            hostType: 'site',
            hostId: siteId,
            onSaveSuccess: (_id, form) => {
              toast.success(`Form "${form.name}" created & attached to site widget!`);
              setIsInContextFormBuilderOpen(false);
            }

          }}
        />
      </InContextBuilderModal>
    </div>
  );
};



