import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Activity, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  BookOpen,
  Radio,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  FormInput
} from 'lucide-react';

import { Site, SiteService, SitePage, ENTERPRISE_FONTS } from '../../services/siteService';
import { toast } from 'sonner';

export const PortalViewPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-Page & Mobile Menu State
  const [activePageId, setActivePageId] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Widget States
  const [kbQuery, setKbQuery] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<string | null>(null);

  useEffect(() => {
    const fetchSiteDetails = async () => {
      if (!siteId) return;
      try {
        setLoading(true);
        let siteData: Site;
        try {
          siteData = await SiteService.getSiteById(siteId);
        } catch {
          siteData = await SiteService.getPublicSite(siteId);
        }
        setSite(siteData);

        // Resolve pages
        if (Array.isArray(siteData.pages) && siteData.pages.length > 0) {
          setActivePageId(siteData.pages[0].id);
        } else if (Array.isArray(siteData.pagesConfig) && siteData.pagesConfig.length > 0 && siteData.pagesConfig[0].id) {
          setActivePageId(siteData.pagesConfig[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load portal site.');
      } finally {
        setLoading(false);
      }
    };

    fetchSiteDetails();
  }, [siteId]);

  const pages: SitePage[] = useMemo(() => {
    if (!site) return [];
    if (Array.isArray(site.pages) && site.pages.length > 0) return site.pages;
    if (Array.isArray(site.pagesConfig) && site.pagesConfig.length > 0 && site.pagesConfig[0].slug) return site.pagesConfig;
    
    // Legacy fallback: Build pages from navConfig so all configured navbar links render as pages
    const legacyWidgets = Array.isArray(site.pagesConfig) ? site.pagesConfig : [];
    if (Array.isArray(site.navConfig) && site.navConfig.length > 0) {
      return site.navConfig.map((nav, idx) => {
        const isHome = nav.path === '/' || idx === 0;
        return {
          id: `page-${nav.id || idx}`,
          title: nav.label,
          slug: nav.path,
          description: isHome ? 'Main portal home page.' : `${nav.label} overview and guidelines.`,
          isHome,
          widgets: isHome ? legacyWidgets : [
            { 
              id: `w-${idx}`, 
              type: nav.path.includes('contact') || nav.path.includes('support') ? 'ticket_form' : nav.path.includes('service') || nav.path.includes('knowledge') ? 'kb_search' : 'hero', 
              enabled: true, 
              title: nav.label 
            }
          ]
        };
      });
    }

    return [
      {
        id: 'page-home',
        title: 'Home',
        slug: '/',
        description: 'Main portal home page.',
        isHome: true,
        widgets: legacyWidgets
      }
    ];
  }, [site]);


  const activePage = useMemo(() => {
    return pages.find(p => p.id === activePageId) || pages[0];
  }, [pages, activePageId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent mb-3" />
        <p className="text-xs font-semibold text-zinc-400">Loading Portal Site...</p>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl max-w-md">
          <h3 className="text-base font-bold mb-1">Site Unavailable</h3>
          <p className="text-xs text-zinc-400 mb-4">{error || 'The requested site portal does not exist or is currently offline.'}</p>
          <button
            onClick={() => navigate('/workspace/settings/platform-modules/sites')}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Back to Sites
          </button>
        </div>
      </div>
    );
  }

  const accentColor = site.branding?.accentColor || '#6366f1';
  const headerTitle = site.branding?.headerTitle || site.name;
  const footerText = site.branding?.footerText || 'Powered by Aurora Platform';
  const headerLayout = site.branding?.headerLayout || site.branding?.themeConfig?.headerLayout || 'top_right';
  const navLinkStyle = site.branding?.navLinkStyle || site.branding?.themeConfig?.navLinkStyle || 'underline';

  const getNavLinkStyleClass = (isActive: boolean) => {
    switch (navLinkStyle) {
      case 'pills':
        return isActive 
          ? 'px-3 py-1 text-white font-bold rounded-xl shadow-md' 
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

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setTimeout(() => {
      const ref = `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedReceipt(ref);
      setSubmittingTicket(false);
      toast.success(`Submission ${ref} received!`);
    }, 800);
  };

  const sampleArticles = [
    { title: 'Getting Started & Account Setup Guide', cat: 'Onboarding' },
    { title: 'API Authentication & Webhook Payload Specs', cat: 'Engineering' },
    { title: 'Standard Operating Procedures & Security Audit', cat: 'Compliance' }
  ].filter(a => a.title.toLowerCase().includes(kbQuery.toLowerCase()) || a.cat.toLowerCase().includes(kbQuery.toLowerCase()));

  const fontId = site.branding?.themeConfig?.fontFamily || 'sans';
  const fontObj = ENTERPRISE_FONTS.find(f => f.id === fontId);
  const fontFamilyCss = fontObj ? fontObj.fontFamilyCss : "'Inter', sans-serif";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col" style={{ fontFamily: fontFamilyCss }}>
      
      {/* Top Banner Navigation Bar */}
      <header className={`sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 px-6 py-4 relative ${
        headerLayout === 'pill_header' ? 'max-w-5xl mx-auto my-4 rounded-2xl border border-zinc-800 shadow-xl' : ''
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="h-8 w-8 rounded-xl flex items-center justify-center font-extrabold text-white text-xs shadow-md shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {site.branding?.logoUrl ? (
                <img src={site.branding.logoUrl} alt="Logo" className="h-5 w-5 object-contain" />
              ) : (
                headerTitle ? headerTitle.charAt(0) : 'S'
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-tight">{headerTitle || site.name}</h1>
              <p className="text-[10px] text-zinc-400 font-mono">{site.domain}</p>
            </div>
          </div>

          {/* Desktop Navigation Items (Right-aligned, Supporting Parent & Nested Sub-pages) */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300 ml-auto">
            {pages.filter(p => !p.parentId).map(rootPage => {
              const children = pages.filter(p => p.parentId === rootPage.id);
              const hasChildren = children.length > 0;
              const isActive = activePage?.id === rootPage.id || children.some(c => c.id === activePage?.id);

              return (
                <div key={rootPage.id} className="relative group">
                  <button
                    onClick={() => setActivePageId(rootPage.id)}
                    className={`flex items-center gap-1 transition-all cursor-pointer relative ${getNavLinkStyleClass(isActive)}`}
                    style={isActive && navLinkStyle === 'pills' ? { backgroundColor: accentColor } : {}}
                  >
                    <span>{rootPage.title}</span>
                    {hasChildren && <ChevronDown size={12} className="text-zinc-500 group-hover:text-white" />}
                    {navLinkStyle === 'underline' && isActive && (
                      <span 
                        className="absolute -bottom-1 left-0 right-0 h-[2.5px] rounded-full transition-all" 
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </button>

                  {/* Dropdown Menu for Sub-Pages */}
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

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Responsive Navigation Drawer (Supporting Nested Sub-Pages) */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3 z-50 shadow-2xl animate-in slide-in-from-top duration-200 max-h-[60vh] overflow-y-auto">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Site Navigation Tree</p>
            <div className="space-y-1">
              {pages.filter(p => !p.parentId).map(rootPage => {
                const children = pages.filter(p => p.parentId === rootPage.id);
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

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8">

        {/* Dynamic Page Header & Breadcrumb */}
        <div className="space-y-1 pb-4 border-b border-zinc-800/80">
          {activePage?.parentId && (
            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mb-1">
              Parent: {pages.find(p => p.id === activePage.parentId)?.title} <ChevronRight size={10} />
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{activePage?.title || site.name}</h2>
          <p className="text-xs text-zinc-400">{activePage?.description || site.description}</p>
        </div>

        {/* Active Page Widgets Loop */}
        <div className="space-y-6">
          {activePage?.widgets?.filter(w => w.enabled).map(w => (
            <React.Fragment key={w.id}>

              {/* HERO SECTION */}
              {w.type === 'hero' && (
                <div className="p-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 relative overflow-hidden">
                  <div 
                    className="absolute top-0 right-0 w-64 h-64 opacity-20 rounded-full blur-2xl pointer-events-none"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="relative z-10 space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-zinc-700/60 rounded-full text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                      <Sparkles size={12} style={{ color: accentColor }} />
                      {site.category} Portal &bull; {site.type}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">{w.title || site.name}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">{w.subtitle || site.description}</p>
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

              {/* TICKET FORM / FORM EMBED WIDGET */}
              {(w.type === 'ticket_form' || w.type === 'form_embed') && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FormInput size={18} className="text-indigo-400" />
                      <h4 className="text-sm font-bold text-white">{w.title}</h4>
                    </div>
                    {w.targetModuleId && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Bound Module
                      </span>
                    )}
                  </div>

                  {submittedReceipt ? (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                      <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
                      <h4 className="text-sm font-bold text-white">Submission Confirmed</h4>
                      <p className="text-xs text-zinc-300">Reference Number: <span className="font-mono font-bold text-emerald-400">{submittedReceipt}</span></p>
                      <button
                        onClick={() => setSubmittedReceipt(null)}
                        className="mt-2 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                      >
                        Submit Another Inquiry
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleTicketSubmit} className="space-y-3 max-w-xl">
                      {(w.formFields || [
                        { id: 'f-1', label: 'Contact Email', fieldType: 'email', required: true, placeholder: 'name@company.com' },
                        { id: 'f-2', label: 'Subject / Title', fieldType: 'text', required: true, placeholder: 'Summary of inquiry...' },
                        { id: 'f-3', label: 'Detailed Description', fieldType: 'textarea', required: true, placeholder: 'Provide full details...' }
                      ]).map(field => (
                        <div key={field.id}>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            {field.label} {field.required && <span className="text-red-400">*</span>}
                          </label>
                          {field.fieldType === 'textarea' ? (
                            <textarea rows={2} placeholder={field.placeholder} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white resize-none" required={field.required} />
                          ) : field.fieldType === 'checkbox' ? (
                            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                              <input type="checkbox" className="rounded bg-zinc-950 border-zinc-800 text-indigo-600 focus:ring-0" required={field.required} />
                              <span>{field.label}</span>
                            </label>
                          ) : (
                            <input type={field.fieldType} placeholder={field.placeholder} className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white" required={field.required} />
                          )}
                        </div>
                      ))}
                      <button 
                        type="submit"
                        disabled={submittingTicket}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                      >
                        <Send size={12} /> {submittingTicket ? 'Submitting...' : 'Submit Form Record'}
                      </button>
                    </form>
                  )}
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

              {/* ANNOUNCEMENTS WIDGET */}
              {w.type === 'announcements' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Radio size={18} className="text-indigo-400" />
                      <h4 className="text-sm font-bold text-white">{w.title}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      Broadcast Feed
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Platform v2.4 Release Notes</span>
                        <span className="text-[10px] text-zinc-500 font-mono">2 hours ago</span>
                      </div>
                      <p className="text-xs text-zinc-400">Upgraded workspace performance, enhanced site builder drag & drop, and new custom domain SSL routing.</p>
                    </div>

                    <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Scheduled Maintenance Window</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Yesterday</span>
                      </div>
                      <p className="text-xs text-zinc-400">Database optimization routine completed cleanly across all primary cluster nodes with zero downtime.</p>
                    </div>
                  </div>
                </div>
              )}

            </React.Fragment>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 p-4 text-center text-xs text-zinc-500 mt-auto">
        {footerText}
      </footer>

    </div>
  );
};
