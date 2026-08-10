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
  ChevronDown,
  FormInput,
  GripVertical,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Inbox,
  Code,
  Type,
  Globe
} from 'lucide-react';

import { Site, SiteService, SiteNavItem, SiteWidget, SitePage } from '../../services/siteService';
import { usePlatform } from '../../hooks/usePlatform';
import { Modal } from '../../components/UI/TabsAndModal';
import { toast } from 'sonner';
import { motion } from 'motion/react';


export const SiteBuilderPage: React.FC = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { isBuilderFullscreen, setIsBuilderFullscreen, toggleBuilderFullscreen } = usePlatform();

  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'pages' | 'branding' | 'widgets' | 'nav' | 'seo' | 'inbox' | 'code' | 'typography' | 'localization' | 'access'>('pages');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');


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
  const [headerLayout, setHeaderLayout] = useState<'top_right' | 'top_center' | 'pill_header' | 'minimal'>('top_right');

  // Multi-Page & Drag-and-Drop State
  const [pages, setPages] = useState<SitePage[]>([]);
  const [activePageId, setActivePageId] = useState<string>('');
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);

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
  const [fontFamily, setFontFamily] = useState<'sans' | 'outfit' | 'mono' | 'serif' | 'playfair'>('sans');
  const [borderRadius, setBorderRadius] = useState<'none' | 'md' | 'xl' | 'full'>('xl');
  const [fontScale, setFontScale] = useState<'normal' | 'compact' | 'large'>('normal');

  // Custom Code State
  const [headScripts, setHeadScripts] = useState('');
  const [bodyScripts, setBodyScripts] = useState('');
  const [customCss, setCustomCss] = useState('');

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
              title: 'Home',
              slug: '/',
              description: 'Main portal home page.',
              isHome: true,
              parentId: null,
              widgets: Array.isArray(data.pagesConfig) ? data.pagesConfig : [
                { id: 'w-hero', type: 'hero', enabled: true, title: `Welcome to ${data.name}`, subtitle: data.description },
                { id: 'w-announcements', type: 'announcements', enabled: true, title: 'Portal News & Bulletins' },
                { id: 'w-status', type: 'status_widget', enabled: data.category === 'public', title: 'Live System Status' }
              ]
            },
            {
              id: 'page-services',
              title: 'Services & Knowledge',
              slug: '/services',
              description: 'Knowledge base articles and documentation.',
              isHome: false,
              parentId: null,
              widgets: [
                { id: 'w-kb-search', type: 'kb_search', enabled: true, title: 'Search Knowledge Base' }
              ]
            },
            {
              id: 'page-contact',
              title: 'Support & Contact',
              slug: '/contact',
              description: 'Submit support tickets and inquiries.',
              isHome: false,
              parentId: null,
              widgets: [
                { id: 'w-contact-form', type: 'ticket_form', enabled: true, title: 'Submit Support Ticket' }
              ]
            }
          ];
        }

        setPages(initialPages);
        setActivePageId(initialPages[0]?.id || 'page-home');

        setNavItems(data.navConfig || [
          { id: 'nav-1', label: 'Home', path: '/' },
          { id: 'nav-2', label: 'Services & Knowledge', path: '/services' },
          { id: 'nav-3', label: 'Support & Contact', path: '/contact' }
        ]);

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
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mb-3" />
        <p className="text-xs font-semibold text-zinc-400">Loading Multi-Page Site Builder Studio...</p>
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
    setPages(prev => prev.filter(p => p.id !== pageId && p.parentId !== pageId));
    if (activePageId === pageId) {
      const remaining = pages.filter(p => p.id !== pageId);
      setActivePageId(remaining[0]?.id || '');
    }
    toast.success(`Page "${pageTitle}" deleted.`);
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

  const handleAddWidgetToActivePage = (type: SiteWidget['type']) => {
    if (!activePage) return;
    const typeTitles: Record<string, string> = {
      hero: 'Hero Section Header',
      announcements: 'Broadcast News Feed',
      ticket_form: 'Support Ticket Form',
      kb_search: 'Knowledge Base Search',
      status_widget: 'System Health Monitor',
      form_embed: 'Embedded Workspace Form',
      module_feed: 'Live Database Records Feed'
    };

    const newWidget: SiteWidget = {
      id: `w-${type}-${Date.now()}`,
      type,
      enabled: true,
      title: typeTitles[type] || 'New Layout Widget',
      targetModuleId: availableModules[0]?.id || ''
    };

    setPages(prevPages => prevPages.map(p => {
      if (p.id === activePage.id) {
        return { ...p, widgets: [...p.widgets, newWidget] };
      }
      return p;
    }));

    setIsAddWidgetModalOpen(false);
    toast.success(`Widget "${newWidget.title}" added to page "${activePage.title}"!`);
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
          headerLayout
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
    desktop: 'w-full max-w-5xl',
    tablet: 'w-[768px] max-w-full',
    mobile: 'w-[375px] max-w-full'
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
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans">
      
      {/* FULL-SCREEN BUILDER TOP TOOLBAR */}
      <header className="h-16 bg-zinc-900 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workspace/settings/platform-modules/sites')}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to Sites</span>
          </button>

          <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

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
                <h1 className="text-sm font-bold text-white leading-none">{name}</h1>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{domain} &bull; {activePage?.slug}</p>
            </div>
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="hidden md:flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => { setViewport('desktop'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewport === 'desktop' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Monitor size={14} /> Desktop
          </button>
          <button
            onClick={() => { setViewport('tablet'); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewport === 'tablet' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tablet size={14} /> Tablet
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewport === 'mobile' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Smartphone size={14} /> Mobile
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
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
            onClick={() => window.open(`/public/portal/${site.id}`, '_blank')}
            className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700/60"
          >
            <span>Live Site</span>
            <ExternalLink size={13} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Site'}</span>
          </button>
        </div>
      </header>

      {/* SPLIT-SCREEN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT INSPECTOR SIDEBAR (400px split into 56px Vertical Icon Rail + 344px Tool Panel) */}
        <aside className="w-[400px] shrink-0 bg-zinc-900 border-r border-zinc-800 flex h-full overflow-hidden">
          
          {/* VERTICAL ICON RAIL (56px) - Modern animated edge-aligned tab rail */}
          <div className="w-[56px] shrink-0 bg-black border-r border-zinc-800/80 flex flex-col items-center py-3 space-y-1 z-10 overflow-y-auto no-scrollbar">
            {[
              { id: 'pages', label: 'Pages', icon: Layers },
              { id: 'branding', label: 'Branding', icon: Palette },
              { id: 'widgets', label: 'Layout', icon: LayoutGrid },
              { id: 'nav', label: 'Header', icon: Menu },
              { id: 'seo', label: 'SEO & Social', icon: Search },
              { id: 'inbox', label: 'Form Inbox', icon: Inbox },
              { id: 'code', label: 'Custom Code', icon: Code },
              { id: 'typography', label: 'Typography', icon: Type },
              { id: 'localization', label: 'Languages', icon: Globe },
              { id: 'access', label: 'Access', icon: ShieldCheck }
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
          <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-900">
            
            {/* Tool Panel Header */}
            <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                {activeTab === 'pages' && <><Layers size={14} className="text-indigo-400" /> Site Pages</>}
                {activeTab === 'branding' && <><Palette size={14} className="text-indigo-400" /> Branding & Theme</>}
                {activeTab === 'widgets' && <><LayoutGrid size={14} className="text-indigo-400" /> Layout & Widgets</>}
                {activeTab === 'nav' && <><Menu size={14} className="text-indigo-400" /> Header Navbar</>}
                {activeTab === 'seo' && <><Search size={14} className="text-indigo-400" /> SEO & Social Sharing</>}
                {activeTab === 'inbox' && <><Inbox size={14} className="text-indigo-400" /> Form Submissions & Inbox</>}
                {activeTab === 'code' && <><Code size={14} className="text-indigo-400" /> Custom Code & Scripts</>}
                {activeTab === 'typography' && <><Type size={14} className="text-indigo-400" /> Typography & Theme</>}
                {activeTab === 'localization' && <><Globe size={14} className="text-indigo-400" /> Multi-Language & Locales</>}
                {activeTab === 'access' && <><ShieldCheck size={14} className="text-indigo-400" /> Access & Governance</>}
              </h3>
            </div>


            {/* Tab Content Panels */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              
              {/* TAB 1: PAGES MANAGER (WITH DRAG & DROP REORDERING AND NESTING) */}
              {activeTab === 'pages' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Drag & Drop Pages Manager</h4>
                    <p className="text-xs text-zinc-400">Drag items to reorder pages or select a Parent page to nest sub-pages.</p>
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
                          page.parentId ? 'ml-6 border-l-2 border-indigo-500/40 bg-zinc-950/60' : 'bg-zinc-950'
                        } ${
                          isSelected ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500/30' : 'border-zinc-800 hover:border-zinc-700'
                        } ${isDragged ? 'opacity-40 border-dashed border-amber-500' : ''} ${
                          isDragOver ? 'border-2 border-indigo-400 bg-indigo-500/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <GripVertical size={14} className="text-zinc-500 cursor-grab active:cursor-grabbing hover:text-white" />
                            {page.parentId && <CornerDownRight size={14} className="text-indigo-400 shrink-0" />}
                            <FileCode size={16} className={isSelected ? 'text-indigo-400' : 'text-zinc-500'} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white">{page.title}</span>
                                {page.isHome && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">Home</span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-zinc-400">{page.slug}</span>
                            </div>
                          </div>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleMovePageOrder(page.id, 'up')}
                              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePageOrder(page.id, 'down')}
                              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown size={12} />
                            </button>

                            {!page.isHome && (
                              <button
                                type="button"
                                onClick={() => handleDeletePage(page.id, page.title)}
                                className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded cursor-pointer"
                                title="Delete Page"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nesting Parent Selector */}
                        <div className="mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px]" onClick={e => e.stopPropagation()}>
                          <span className="text-zinc-500 font-bold uppercase">Parent:</span>
                          <select
                            value={page.parentId || ''}
                            onChange={e => handleSetPageParent(page.id, e.target.value || null)}
                            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] px-2 py-0.5 rounded cursor-pointer"
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

            {/* TAB 2: BRANDING & MENU LAYOUT */}
            {activeTab === 'branding' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Primary Accent Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={e => setAccentColor(e.target.value)}
                      className="h-10 w-12 rounded-xl border border-zinc-700 bg-transparent cursor-pointer"
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

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Header Menu Layout Style
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'top_right', label: 'Top Right', desc: 'Standard navbar' },
                      { id: 'top_center', label: 'Top Center', desc: 'Centered header' },
                      { id: 'pill_header', label: 'Pill Header', desc: 'Floating rounded bar' },
                      { id: 'minimal', label: 'Minimal', desc: 'Clean header' }
                    ].map(layout => (
                      <button
                        key={layout.id}
                        type="button"
                        onClick={() => setHeaderLayout(layout.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          headerLayout === layout.id 
                            ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400 font-bold' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                        }`}
                      >
                        <p className="text-xs font-bold text-white">{layout.label}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{layout.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Header Title
                  </label>
                  <input
                    type="text"
                    value={headerTitle}
                    onChange={e => setHeaderTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Logo Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Footer Copyright Text
                  </label>
                  <input
                    type="text"
                    value={footerText}
                    onChange={e => setFooterText(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: PAGE WIDGETS & FORM EMBEDDING */}
            {activeTab === 'widgets' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                    Widgets on Page: <span className="text-indigo-400">{activePage?.title}</span>
                  </h4>
                  <p className="text-xs text-zinc-400">Configure widgets for the active page.</p>
                </div>

                {/* Add Widget Button (Triggers Aurora Premium Modal) */}
                <button
                  type="button"
                  onClick={() => setIsAddWidgetModalOpen(true)}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus size={16} /> Add Widget to Page
                </button>


                {/* Page Widgets Inspector */}
                <div className="space-y-3">
                  {activePage?.widgets.map(w => (
                    <div
                      key={w.id}
                      className={`p-4 border rounded-2xl transition-all ${
                        w.enabled 
                          ? 'bg-zinc-950 border-indigo-500/40 shadow-sm' 
                          : 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                          <Sparkles size={12} /> {w.type.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleActivePageWidget(w.id)}
                          className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md border transition-all cursor-pointer ${
                            w.enabled 
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {w.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      <input
                        type="text"
                        value={w.title}
                        onChange={e => handleUpdateWidgetProp(w.id, 'title', e.target.value)}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold text-white mb-2"
                        placeholder="Widget Title"
                      />

                      {/* Special Inspector for Form Embed */}
                      {w.type === 'form_embed' && (
                        <div className="pt-2 border-t border-zinc-800 space-y-2">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase">
                            Select Workspace Form Module
                          </label>
                          <select
                            value={w.targetModuleId || ''}
                            onChange={e => handleUpdateWidgetProp(w.id, 'targetModuleId', e.target.value)}
                            className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                          >
                            {availableModules.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.type})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: HEADER NAVBAR */}
            {activeTab === 'nav' && (
              <div className="space-y-4">
                <p className="text-xs text-zinc-400">
                  Manage top navigation header items for your portal site.
                </p>

                <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-2">
                  <input
                    type="text"
                    placeholder="Link Label (e.g. Services)"
                    value={newNavLabel}
                    onChange={e => setNewNavLabel(e.target.value)}
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Path (e.g. /services)"
                      value={newNavPath}
                      onChange={e => setNewNavPath(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddNavItem}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {navItems.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-500 text-[10px]">{idx + 1}.</span>
                        <span className="font-bold text-white">{item.label}</span>
                        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded">{item.path}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNavItem(item.id)}
                        className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 rounded-md transition-all cursor-pointer"
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
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Search Engine & Social Preview</h4>
                  <p className="text-xs text-zinc-400">Configure global metadata and OpenGraph social cards.</p>
                </div>

                {/* Live Google Preview Card */}
                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Google Search Preview</span>
                  <p className="text-xs font-bold text-blue-400 truncate hover:underline cursor-pointer">
                    {metaTitle || name || 'Portal Title'} | Aurora Platform
                  </p>
                  <p className="text-[11px] font-mono text-emerald-400 truncate">https://{domain || 'intranet.aurora.internal'}</p>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                    {metaDescription || description || 'No meta description provided yet.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Meta Title Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Portal | Aurora"
                    value={metaTitle}
                    onChange={e => setMetaTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide a concise summary for search engine results..."
                    value={metaDescription}
                    onChange={e => setMetaDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    OpenGraph Image URL (Social Share Card)
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.com/og-banner.png"
                    value={ogImageUrl}
                    onChange={e => setOgImageUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Block Search Indexing (noindex)</p>
                    <p className="text-[10px] text-zinc-400">Prevent search engines from indexing this portal</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={noIndex}
                    onChange={e => setNoIndex(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB: FORM SUBMISSIONS & INBOX */}
            {activeTab === 'inbox' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Form Submissions Inbox</h4>
                  <p className="text-xs text-zinc-400">View live form responses submitted on embedded site pages.</p>
                </div>

                {/* Submissions List */}
                <div className="space-y-2">
                  {submissions.map(sub => (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedSubmission(selectedSubmission?.id === sub.id ? null : sub)}
                      className={`p-3 border rounded-2xl cursor-pointer transition-all ${
                        selectedSubmission?.id === sub.id
                          ? 'bg-zinc-900 border-indigo-500/60 shadow-md'
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">{sub.formName}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{sub.submittedAt}</span>
                      </div>
                      <p className="text-xs font-bold text-white mt-1">{sub.submittedBy}</p>

                      {/* Expanded Submission Payload */}
                      {selectedSubmission?.id === sub.id && (
                        <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1.5 font-mono text-[11px]">
                          {Object.entries(sub.data).map(([key, val]) => (
                            <div key={key} className="flex items-start justify-between bg-zinc-950 p-2 rounded-lg border border-zinc-800/50">
                              <span className="text-zinc-400">{key}:</span>
                              <span className="text-emerald-400 font-bold text-right ml-2">{String(val)}</span>
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
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Custom Code Injectors</h4>
                  <p className="text-xs text-zinc-400">Inject custom CSS, Google Analytics, or head scripts.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Header Scripts (&lt;head&gt;)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="<!-- Insert Google Analytics / Custom Meta Tags -->"
                    value={headScripts}
                    onChange={e => setHeadScripts(e.target.value)}
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-emerald-400 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Custom CSS Styles
                  </label>
                  <textarea
                    rows={4}
                    placeholder="/* Custom CSS overrides */"
                    value={customCss}
                    onChange={e => setCustomCss(e.target.value)}
                    className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* TAB: TYPOGRAPHY & THEME SYSTEM */}
            {activeTab === 'typography' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Typography & Border Radius</h4>
                  <p className="text-xs text-zinc-400">Configure portal font family and UI border styling.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Font Family
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'sans', label: 'Inter (Sans)', font: 'font-sans' },
                      { id: 'outfit', label: 'Outfit (Modern)', font: 'font-sans' },
                      { id: 'mono', label: 'JetBrains (Mono)', font: 'font-mono' },
                      { id: 'serif', label: 'Playfair (Serif)', font: 'font-serif' }
                    ].map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFontFamily(f.id as any)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          fontFamily === f.id
                            ? 'bg-zinc-800 border-indigo-500 text-white font-bold shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                        }`}
                      >
                        <p className={`text-xs ${f.font}`}>{f.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Border Radius Style
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
                        onClick={() => setBorderRadius(r.id as any)}
                        className={`p-2.5 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                          borderRadius === r.id
                            ? 'bg-zinc-800 border-indigo-500 text-white shadow-sm'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
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
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Multi-Language & Locales</h4>
                  <p className="text-xs text-zinc-400">Configure primary portal language and locale translations.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Primary Default Language
                  </label>
                  <select
                    value={defaultLanguage}
                    onChange={e => setDefaultLanguage(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                  >
                    <option value="en">English (US - en-US)</option>
                    <option value="es">Spanish (Español - es)</option>
                    <option value="fr">French (Français - fr)</option>
                    <option value="de">German (Deutsch - de)</option>
                    <option value="ja">Japanese (日本語 - ja)</option>
                  </select>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Enable Auto-Translation AI</p>
                    <p className="text-[10px] text-zinc-400">Automatically translate widget content for visitors</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoTranslate}
                    onChange={e => setAutoTranslate(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 5: ACCESS & GOVERNANCE */}
            {activeTab === 'access' && (

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Site Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    URL Path / Custom Domain
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                    >
                      <option value="active">Active (Online)</option>
                      <option value="draft">Draft (Setup)</option>
                      <option value="offline">Offline (Maintenance)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                      Access Level
                    </label>
                    <select
                      value={access}
                      onChange={e => setAccess(e.target.value as any)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
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
          </div>
        </div>
      </aside>





        {/* RIGHT LIVE WYSIWYG PREVIEW CANVAS */}
        <main className="flex-1 bg-zinc-950 flex flex-col items-center justify-start p-6 overflow-y-auto relative">

          {/* Viewport Frame Container */}
          <div className={`transition-all duration-300 shadow-2xl rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden flex flex-col ${viewportWidthClass} min-h-[700px]`}>
            
            {/* Live Header with Nested Dropdowns & Hamburger */}
            <header className={`bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between relative ${
              headerLayout === 'pill_header' ? 'm-4 rounded-2xl shadow-lg border border-zinc-800' : ''
            }`}>
              <div className="flex items-center gap-3">
                <div 
                  className="h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-white text-xs"
                  style={{ backgroundColor: accentColor }}
                >
                  {headerTitle ? headerTitle.charAt(0) : 'S'}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{headerTitle || name}</h2>
                  <p className="text-[10px] text-zinc-400 font-mono">{domain}</p>
                </div>
              </div>

              {/* Navbar Links (Desktop, supporting parent-child submenus) */}
              <div className="hidden md:flex items-center gap-4 text-xs font-semibold text-zinc-300">
                {rootPages.map(rootPage => {
                  const children = getChildPages(rootPage.id);
                  const hasChildren = children.length > 0;
                  const isActive = activePage?.id === rootPage.id || children.some(c => c.id === activePage?.id);

                  return (
                    <div key={rootPage.id} className="relative group">
                      <button
                        onClick={() => setActivePageId(rootPage.id)}
                        className={`flex items-center gap-1 hover:text-white transition-colors cursor-pointer ${
                          isActive ? 'text-white font-bold underline underline-offset-4' : ''
                        }`}
                      >
                        <span>{rootPage.title}</span>
                        {hasChildren && <ChevronDown size={12} className="text-zinc-500 group-hover:text-white" />}
                      </button>

                      {/* Dropdown Menu for Nested Child Pages */}
                      {hasChildren && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
                          {children.map(child => (
                            <button
                              key={child.id}
                              onClick={() => setActivePageId(child.id)}
                              className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-between"
                            >
                              <span>{child.title}</span>
                              <ChevronRight size={12} className="text-zinc-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Mobile Hamburger Toggle Button (Visible on Mobile/Tablet Viewport) */}
              <div className="flex items-center gap-2">
                {viewport !== 'desktop' && (
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
                  >
                    {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                  </button>
                )}

                <span 
                  className="px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase hidden sm:inline"
                  style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                >
                  {access}
                </span>
              </div>

              {/* Mobile Navigation Drawer Overlay (supporting nesting) */}
              {isMobileMenuOpen && viewport !== 'desktop' && (
                <div className="absolute top-full left-0 right-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3 z-50 shadow-2xl animate-in slide-in-from-top duration-200">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Site Navigation Tree</p>
                  <div className="space-y-1">
                    {rootPages.map(rootPage => {
                      const children = getChildPages(rootPage.id);
                      return (
                        <div key={rootPage.id} className="space-y-1">
                          <button
                            onClick={() => {
                              setActivePageId(rootPage.id);
                              if (children.length === 0) setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-white hover:bg-zinc-800 transition-all text-left"
                          >
                            <span>{rootPage.title}</span>
                            <ChevronRight size={14} className="text-zinc-500" />
                          </button>

                          {/* Nested Sub-Pages in Drawer */}
                          {children.map(child => (
                            <button
                              key={child.id}
                              onClick={() => {
                                setActivePageId(child.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className="w-full flex items-center justify-between pl-6 pr-3 py-2 rounded-lg text-xs font-medium text-indigo-300 hover:bg-zinc-800 transition-all text-left"
                            >
                              <span className="flex items-center gap-1">
                                <CornerDownRight size={12} className="text-indigo-400" />
                                {child.title}
                              </span>
                              <ChevronRight size={12} className="text-zinc-600" />
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </header>

            {/* Live Active Page Body */}
            <div className="p-6 sm:p-8 space-y-8 flex-1">
              
              {/* Dynamic Page Title & Parent Breadcrumb */}
              <div className="space-y-1 pb-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  {activePage?.parentId && (
                    <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                      Parent: {pages.find(p => p.id === activePage.parentId)?.title} <ChevronRight size={10} />
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">
                    Page: {activePage?.slug}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">{activePage?.title}</h3>
                <p className="text-xs text-zinc-400">{activePage?.description}</p>
              </div>

              {/* Active Page Widgets */}
              <div className="space-y-6">
                {activePage?.widgets.filter(w => w.enabled).map(w => (
                  <React.Fragment key={w.id}>
                    
                    {/* HERO WIDGET */}
                    {w.type === 'hero' && (
                      <div className="p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden">
                        <div 
                          className="absolute top-0 right-0 w-64 h-64 opacity-20 rounded-full blur-2xl pointer-events-none"
                          style={{ backgroundColor: accentColor }}
                        />
                        <div className="relative z-10 space-y-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700/60 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                            <Sparkles size={12} style={{ color: accentColor }} />
                            {category} Portal &bull; {type}
                          </span>
                          <h3 className="text-2xl sm:text-3xl font-black text-white">{w.title}</h3>
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">{w.subtitle || description}</p>
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
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FormInput size={18} className="text-indigo-400" />
                            <h4 className="text-sm font-bold text-white">{w.title}</h4>
                          </div>
                          {w.targetModuleId && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              Bound to Module: {availableModules.find(m => m.id === w.targetModuleId)?.name || 'Intake Form'}
                            </span>
                          )}
                        </div>

                        <form onSubmit={e => { e.preventDefault(); toast.success('Form response submitted!'); }} className="space-y-3 max-w-xl">
                          <input type="email" placeholder="Your Contact Email..." className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white" required />
                          <input type="text" placeholder="Subject / Title..." className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white" required />
                          <textarea rows={2} placeholder="Detailed Inquiry message..." className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white resize-none" required />
                          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer">
                            <Send size={12} /> Submit Form Record
                          </button>
                        </form>
                      </div>
                    )}

                    {/* KB SEARCH WIDGET */}
                    {w.type === 'kb_search' && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2">
                          <BookOpen size={18} className="text-blue-400" />
                          <h4 className="text-sm font-bold text-white">{w.title}</h4>
                        </div>

                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input
                            type="text"
                            placeholder="Search articles..."
                            value={kbQuery}
                            onChange={e => setKbQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sampleArticles.map((art, idx) => (
                            <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl text-xs">
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase">{art.cat}</span>
                              <p className="font-bold text-white mt-1">{art.title}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* STATUS MONITOR WIDGET */}
                    {w.type === 'status_widget' && (
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity size={18} className="text-emerald-400" />
                            <h4 className="text-sm font-bold text-white">{w.title}</h4>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Radio size={10} className="animate-pulse" /> Operational
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Uptime</span>
                            <p className="text-lg font-black text-white mt-0.5">99.98%</p>
                          </div>
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Latency</span>
                            <p className="text-lg font-black text-emerald-400 mt-0.5">42 ms</p>
                          </div>
                          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">Webhooks</span>
                            <p className="text-lg font-black text-indigo-400 mt-0.5">Synced</p>
                          </div>
                        </div>
                      </div>
                    )}

                  </React.Fragment>
                ))}
              </div>

            </div>

            {/* Live Footer */}
            <footer className="bg-zinc-900 border-t border-zinc-800 p-4 text-center text-xs text-zinc-500">
              {footerText}
            </footer>
          </div>

        </main>

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
                  className="p-5 bg-zinc-900/90 border border-zinc-800 hover:border-indigo-500/60 hover:bg-zinc-800/80 rounded-2xl cursor-pointer transition-all flex items-start gap-4 group shadow-sm hover:shadow-lg hover:shadow-indigo-500/5 ring-1 ring-transparent hover:ring-indigo-500/20"
                >
                  <div className={`p-3 rounded-xl ${w.color} shrink-0`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
                      <span>{w.title}</span>
                      <Plus size={16} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{w.desc}</p>
                  </div>
                </div>

              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};


