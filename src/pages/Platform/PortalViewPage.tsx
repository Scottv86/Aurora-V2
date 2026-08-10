import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Activity, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  ArrowLeft,
  BookOpen,
  Radio,
  Menu,
  X,
  ChevronRight,
  FormInput
} from 'lucide-react';

import { Site, SiteService, SitePage } from '../../services/siteService';
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
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketEmail, setTicketEmail] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
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

  const accentColor = site.branding?.accentColor || '#3b82f6';
  const headerTitle = site.branding?.headerTitle || site.name;
  const footerText = site.branding?.footerText || 'Powered by Aurora Platform';
  const headerLayout = site.branding?.headerLayout || 'top_right';

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) {
      toast.error('Please enter a subject and description for your submission.');
      return;
    }

    setSubmittingTicket(true);
    setTimeout(() => {
      const ref = `SUB-${Math.floor(100000 + Math.random() * 900000)}`;
      setSubmittedReceipt(ref);
      setSubmittingTicket(false);
      toast.success(`Submission ${ref} received!`);
      setTicketSubject('');
      setTicketDesc('');
      setTicketEmail('');
    }, 800);
  };

  const sampleArticles = [
    { title: 'Getting Started & Account Setup Guide', cat: 'Onboarding', views: '1.4k' },
    { title: 'API Authentication & Webhook Payload Specs', cat: 'Engineering', views: '980' },
    { title: 'Standard Operating Procedures & Security Audit', cat: 'Compliance', views: '2.1k' },
    { title: 'Billing, Invoicing & Subscription Tier FAQ', cat: 'Finance', views: '640' }
  ].filter(a => a.title.toLowerCase().includes(kbQuery.toLowerCase()) || a.cat.toLowerCase().includes(kbQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      
      {/* Top Banner Navigation Bar */}
      <header className={`sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 px-6 py-4 ${
        headerLayout === 'pill_header' ? 'max-w-5xl mx-auto my-4 rounded-2xl border border-zinc-800 shadow-xl' : ''
      }`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-white text-base shadow-md shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {site.branding?.logoUrl ? (
                <img src={site.branding.logoUrl} alt="Logo" className="h-6 w-6 object-contain" />
              ) : (
                headerTitle.charAt(0)
              )}
            </div>
            <div>
              <h1 className="text-base font-extrabold text-white leading-tight">{headerTitle}</h1>
              <p className="text-xs text-zinc-400 font-mono">{site.domain}</p>
            </div>
          </div>

          {/* Desktop Navigation Items (Supporting Parent & Nested Sub-pages) */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            {pages.filter(p => !p.parentId).map(rootPage => {
              const children = pages.filter(p => p.parentId === rootPage.id);
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
            <span 
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-white/10 text-white uppercase tracking-wider hidden sm:inline"
              style={{ backgroundColor: `${accentColor}25`, borderColor: `${accentColor}50`, color: accentColor }}
            >
              {site.access}
            </span>

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <button
              onClick={() => navigate(`/workspace/settings/builder/site/${site.id}`)}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700/60"
            >
              <ArrowLeft size={14} /> Open Builder
            </button>
          </div>
        </div>

        {/* Mobile Responsive Navigation Drawer (Supporting Nested Sub-Pages) */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-zinc-800/80 space-y-2 animate-in slide-in-from-top duration-200">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Navigation Tree</p>
            {pages.filter(p => !p.parentId).map(rootPage => {
              const children = pages.filter(p => p.parentId === rootPage.id);
              return (
                <div key={rootPage.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setActivePageId(rootPage.id);
                      if (children.length === 0) setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold text-white bg-zinc-950/60 hover:bg-zinc-800 transition-all text-left"
                  >
                    <span>{rootPage.title}</span>
                    <ChevronRight size={14} className="text-zinc-500" />
                  </button>

                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setActivePageId(child.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between pl-6 pr-3 py-2 rounded-lg text-xs font-medium text-indigo-300 hover:bg-zinc-800 transition-all text-left"
                    >
                      <span>└ {child.title}</span>
                      <ChevronRight size={12} className="text-zinc-600" />
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-10">

        {/* Dynamic Page Header */}
        <div className="space-y-1 pb-4 border-b border-zinc-800/80">
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded uppercase font-bold">
            Page: {activePage?.slug || '/'}
          </span>
          <h2 className="text-3xl font-extrabold text-white">{activePage?.title || site.name}</h2>
          <p className="text-xs text-zinc-400">{activePage?.description || site.description}</p>
        </div>

        {/* Active Page Widgets Loop */}
        <div className="space-y-8">
          {activePage?.widgets?.filter(w => w.enabled).map(w => (
            <React.Fragment key={w.id}>

              {/* HERO SECTION */}
              {w.type === 'hero' && (
                <section className="relative overflow-hidden p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl">
                  <div 
                    className="absolute top-0 right-0 w-96 h-96 opacity-15 rounded-full blur-3xl pointer-events-none"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="relative z-10 space-y-4 max-w-2xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800/80 border border-zinc-700/60 rounded-full text-xs font-bold uppercase tracking-wider text-zinc-300">
                      <Sparkles size={14} style={{ color: accentColor }} />
                      {site.category} Portal &bull; {site.type}
                    </span>

                    <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                      {w.title || site.name}
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {w.subtitle || site.description}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button 
                        className="px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition-all hover:brightness-110 active:scale-95 cursor-pointer"
                        style={{ backgroundColor: accentColor }}
                      >
                        Explore Portal
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* TICKET FORM / FORM EMBED WIDGET */}
              {(w.type === 'ticket_form' || w.type === 'form_embed') && (
                <section className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <FormInput size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-white">{w.title}</h3>
                      <p className="text-xs text-zinc-400">Fill out the inquiry form below to submit a response.</p>
                    </div>
                  </div>

                  {submittedReceipt ? (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-2">
                      <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                      <h4 className="text-base font-bold text-white">Submission Confirmed</h4>
                      <p className="text-xs text-zinc-300">Reference Number: <span className="font-mono font-bold text-emerald-400">{submittedReceipt}</span></p>
                      <button
                        onClick={() => setSubmittedReceipt(null)}
                        className="mt-3 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Submit Another Inquiry
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleTicketSubmit} className="space-y-4 max-w-2xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Your Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="name@company.com"
                            value={ticketEmail}
                            onChange={e => setTicketEmail(e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Subject / Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Account Billing Question"
                            value={ticketSubject}
                            onChange={e => setTicketSubject(e.target.value)}
                            className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Detailed Description
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Provide details about your inquiry or request..."
                          value={ticketDesc}
                          onChange={e => setTicketDesc(e.target.value)}
                          className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingTicket}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Send size={14} />
                        <span>{submittingTicket ? 'Submitting...' : 'Submit Form Response'}</span>
                      </button>
                    </form>
                  )}
                </section>
              )}

              {/* KB SEARCH WIDGET */}
              {w.type === 'kb_search' && (
                <section className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-white">{w.title}</h3>
                      <p className="text-xs text-zinc-400">Search guides, operating procedures, and developer docs.</p>
                    </div>
                  </div>

                  <div className="relative max-w-xl">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search articles by title, topic or category..."
                      value={kbQuery}
                      onChange={e => setKbQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl text-xs text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sampleArticles.map((art, idx) => (
                      <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-2xl hover:border-zinc-700 transition-all">
                        <span className="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase tracking-wider">{art.cat}</span>
                        <h4 className="text-xs font-bold text-white mt-2">{art.title}</h4>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* SYSTEM STATUS WIDGET */}
              {w.type === 'status_widget' && (
                <section className="bg-zinc-900/90 border border-zinc-800/80 rounded-3xl p-8 shadow-xl space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">{w.title}</h3>
                        <p className="text-xs text-zinc-400">Real-time status tracking for organization services.</p>
                      </div>
                    </div>

                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full flex items-center gap-1.5">
                      <Radio size={12} className="animate-pulse" /> All Systems Operational
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Average Uptime</span>
                      <p className="text-2xl font-black text-white mt-1">99.98%</p>
                    </div>
                    <div className="p-5 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">API Latency</span>
                      <p className="text-2xl font-black text-emerald-400 mt-1">42 ms</p>
                    </div>
                    <div className="p-5 bg-zinc-950 border border-zinc-800/80 rounded-2xl">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Webhooks Status</span>
                      <p className="text-2xl font-black text-indigo-400 mt-1">Synced</p>
                    </div>
                  </div>
                </section>
              )}

            </React.Fragment>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 py-6 px-6 bg-zinc-900/60 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>{footerText}</p>
          <span className="text-zinc-400 font-mono text-[11px]">&bull; Aurora Platform Engine</span>
        </div>
      </footer>

    </div>
  );
};
