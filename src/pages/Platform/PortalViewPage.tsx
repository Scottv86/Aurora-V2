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
  FormInput,
  Building2,
  ShieldCheck,
  MessageSquare,
  Clock,
  Lock,
  User,
  Layers,
  Calendar,
  FileText,
  Star,
  Calculator,
  PenTool,
  Users,
  HelpCircle,
  MessageCircle,
  Bell,
  Compass,
  Globe,
  Plus,
  History as HistoryIcon,
  ChevronLeft,
  Database,
  Images
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

  // Status Tracker State
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);

  // Live Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string; isUser: boolean }>>([
    { sender: 'Aurora Support Bot', text: 'Welcome! How can we assist with your tenancy or application today?', time: 'Just now', isUser: false }
  ]);
  const [chatSending, setChatSending] = useState(false);

  // Auth Widget State
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoggedInUser, setAuthLoggedInUser] = useState<any>(null);

  // Bond Lodgement State
  const [bondStep, setBondStep] = useState<'form' | 'success'>('form');
  const [bondSubmitting, setBondSubmitting] = useState(false);
  const [bondFormData, setBondFormData] = useState({
    propertyAddress: '104 Aurora Way, Suite 4B',
    bondAmount: '2400',
    tenantName: 'Jane Smith',
    tenantEmail: 'jane.smith@example.com',
    landlordName: 'Aurora Property Holdings'
  });
  const [createdBondRef, setCreatedBondRef] = useState<string | null>(null);

  // Record Grid Widget State
  const [gridSearch, setGridSearch] = useState('');
  const [gridRecords, setGridRecords] = useState<any[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

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

        // Fetch records for record grid if any widget matches
        const records: any[] = await SiteService.fetchPublicModuleRecords(siteId).catch((): any[] => []);
        setGridRecords(records);
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

  const handleTrackLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingQuery.trim() || !siteId) return;
    setTrackingLoading(true);
    try {
      const res = await SiteService.trackApplication(siteId, trackingQuery);
      setTrackingResult(res);
      toast.success('Tracking record loaded');
    } catch (err: any) {
      toast.error(err.message || 'Reference code not found');
      setTrackingResult(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !siteId) return;
    const msg = chatInput;
    const userMsg = { sender: 'You', text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isUser: true };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatSending(true);

    try {
      const res = await SiteService.sendChatMessage(siteId, msg, authLoggedInUser?.email || 'Portal User');
      setChatMessages(prev => [...prev, {
        sender: res.sender || 'Staff Support',
        text: res.reply || 'Thanks for your inquiry!',
        time: res.timestamp || 'Just now',
        isUser: false
      }]);
    } catch {
      setChatMessages(prev => [...prev, {
        sender: 'Aurora Staff',
        text: 'Thank you for reaching out. A representative has received your message.',
        time: 'Just now',
        isUser: false
      }]);
    } finally {
      setChatSending(false);
    }
  };

  const handleBondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;
    setBondSubmitting(true);
    try {
      const res = await SiteService.lodgePropertyBond(siteId, bondFormData);
      setCreatedBondRef(res.bondNumber);
      setBondStep('success');
      toast.success(`Property Bond ${res.bondNumber} successfully lodged!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to lodge bond');
    } finally {
      setBondSubmitting(false);
    }
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail) return;
    setAuthLoggedInUser({
      email: authEmail,
      name: authEmail.split('@')[0],
      role: 'Bond Holder / Resident'
    });
    toast.success(`Signed in as ${authEmail}`);
  };

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
    <div className={`min-h-screen bg-zinc-950 text-zinc-100 flex ${
      headerLayout === 'sidebar_left' 
        ? 'flex-col md:flex-row' 
        : headerLayout === 'sidebar_right' 
          ? 'flex-col md:flex-row-reverse' 
          : 'flex-col'
    }`} style={{ fontFamily: fontFamilyCss }}>
      
      {/* RESPONSIVE VERTICAL SIDEBAR / MOBILE HEADER MENU */}
      {(headerLayout === 'sidebar_left' || headerLayout === 'sidebar_right') && (
        <>
          {/* DESKTOP SIDEBAR VIEWPORT (hidden on mobile/tablet screens) */}
          <aside className="hidden md:flex w-64 shrink-0 bg-zinc-900 border-r border-zinc-800 p-6 flex-col justify-between z-40">
            <div className="space-y-6">
              {/* Brand Header */}
              <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
                <div 
                  className="h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-white text-xs shadow-md shrink-0"
                  style={{ backgroundColor: accentColor }}
                >
                  {site.branding?.logoUrl ? (
                    <img src={site.branding.logoUrl} alt="Logo" className="h-5 w-5 object-contain" />
                  ) : (
                    headerTitle ? headerTitle.charAt(0) : 'S'
                  )}
                </div>
                <div className="overflow-hidden">
                  <h1 className="text-sm font-bold text-white truncate">{headerTitle || site.name}</h1>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">{site.domain}</p>
                </div>
              </div>

              {/* Vertical Navigation Items */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-2">Navigation Menu</p>
                {pages.filter(p => !p.parentId).map(rootPage => {
                  const children = pages.filter(p => p.parentId === rootPage.id);
                  const hasChildren = children.length > 0;
                  const isActive = activePage?.id === rootPage.id || children.some(c => c.id === activePage?.id);

                  return (
                    <div key={rootPage.id} className="space-y-1">
                      <button
                        onClick={() => setActivePageId(rootPage.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                        }`}
                        style={isActive && navLinkStyle === 'pills' ? { backgroundColor: accentColor } : {}}
                      >
                        <span className="truncate">{rootPage.title}</span>
                        {hasChildren && <ChevronDown size={12} className="text-zinc-400 shrink-0" />}
                      </button>

                      {/* Sub-Pages in Sidebar */}
                      {hasChildren && (
                        <div className="ml-3 pl-2 border-l border-zinc-800 space-y-1 my-1">
                          {children.map(child => {
                            const isChildActive = activePage?.id === child.id;
                            return (
                              <button
                                key={child.id}
                                onClick={() => setActivePageId(child.id)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                  isChildActive 
                                    ? 'text-indigo-400 font-bold bg-indigo-500/10' 
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
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
            <div className="pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>{footerText || '© Aurora Platform'}</span>
            </div>
          </aside>

          {/* MOBILE / TABLET COLLAPSED TOP BAR WITH HAMBURGER DRAWER */}
          <header className="md:hidden sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between shadow-lg">
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
              <div className="overflow-hidden">
                <h1 className="text-xs font-bold text-white truncate">{headerTitle || site.name}</h1>
                <p className="text-[9px] text-zinc-400 font-mono truncate">{site.domain}</p>
              </div>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
            >
              {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Mobile Navigation Drawer */}
            {isMobileMenuOpen && (
              <div className="absolute top-full left-0 right-0 bg-zinc-900 border-b border-zinc-800 p-4 space-y-3 z-50 shadow-2xl animate-in slide-in-from-top duration-200 max-h-[60vh] overflow-y-auto">
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

                        {children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setActivePageId(child.id);
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between pl-6 pr-3 py-2 rounded-lg text-xs font-medium text-indigo-400 hover:bg-zinc-800 transition-all text-left"
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
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Banner Navigation Bar (when not vertical sidebar) */}
        {headerLayout !== 'sidebar_left' && headerLayout !== 'sidebar_right' && (
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

              {/* Desktop Navigation Items */}
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

              {/* User Auth Pill Header Action */}
              <div className="flex items-center gap-3">
                {authLoggedInUser ? (
                  <div className="flex items-center gap-2 bg-zinc-800/80 px-2.5 py-1 rounded-xl text-xs">
                    <User size={12} className="text-indigo-400" />
                    <span className="font-bold text-white text-[11px]">{authLoggedInUser.name}</span>
                  </div>
                ) : null}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all cursor-pointer"
                >
                  {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
              </div>
            </div>

            {/* Mobile Navigation Drawer */}
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

                        {children.map(child => (
                          <button
                            key={child.id}
                            onClick={() => {
                              setActivePageId(child.id);
                              setIsMobileMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between pl-6 pr-3 py-2 rounded-lg text-xs font-medium text-indigo-400 hover:bg-zinc-800 transition-all text-left"
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
        )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8">

        {/* Dynamic Page Header */}
        <div className="space-y-1 pb-4 border-b border-zinc-800/80">
          {activePage?.parentId && (
            <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mb-1">
              Parent: {pages.find(p => p.id === activePage.parentId)?.title} <ChevronRight size={10} />
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{activePage?.title || site.name}</h2>
          <p className="text-xs text-zinc-400">{activePage?.description || site.description}</p>
        </div>

        {/* Active Page Widgets Loop (Flexbox & Grid Layout Support) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {activePage?.widgets?.filter(w => w.enabled).map(w => {
            const gridClass = getWidgetGridClass(w.layoutColumns);
            return (
              <div key={w.id} className={gridClass}>
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
                  </div>
                </div>
              )}

              {/* TURNKEY PROPERTY BOND LODGEMENT & MANAGEMENT PORTAL WIDGET */}
              {w.type === 'bond_lodgement' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={20} className="text-emerald-400" />
                      <div>
                        <h4 className="text-sm font-bold text-white">{w.title || 'Property Bond Lodgement Portal'}</h4>
                        <p className="text-[11px] text-zinc-400">Official Tenancy Authority Bond Registration Hub</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} /> Aurora Tenancy Bound
                    </span>
                  </div>

                  {bondStep === 'success' ? (
                    <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                      <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                      <h4 className="text-base font-bold text-white">Property Bond Lodged Successfully</h4>
                      <p className="text-xs text-zinc-300 max-w-md mx-auto">
                        Your bond reference number is <span className="font-mono font-bold text-emerald-400">{createdBondRef}</span>. The bond record has been committed to the Aurora Tenancy Register.
                      </p>
                      <div className="flex justify-center gap-3 pt-2">
                        <button
                          onClick={() => setBondStep('form')}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Lodge Another Bond
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleBondSubmit} className="space-y-4 max-w-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Tenant / Resident Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={bondFormData.tenantName}
                            onChange={e => setBondFormData({ ...bondFormData, tenantName: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Tenant Contact Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={bondFormData.tenantEmail}
                            onChange={e => setBondFormData({ ...bondFormData, tenantEmail: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Property Address *
                          </label>
                          <input
                            type="text"
                            required
                            value={bondFormData.propertyAddress}
                            onChange={e => setBondFormData({ ...bondFormData, propertyAddress: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                            Bond Amount ($ AUD) *
                          </label>
                          <input
                            type="number"
                            required
                            value={bondFormData.bondAmount}
                            onChange={e => setBondFormData({ ...bondFormData, bondAmount: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Landlord / Property Manager Entity
                        </label>
                        <input
                          type="text"
                          value={bondFormData.landlordName}
                          onChange={e => setBondFormData({ ...bondFormData, landlordName: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={bondSubmitting}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck size={14} /> {bondSubmitting ? 'Lodging Bond...' : 'Register & Lodge Property Bond'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* APPLICATION & BOND STATUS TRACKER WIDGET */}
              {w.type === 'status_tracker' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-amber-400" />
                    <h4 className="text-sm font-bold text-white">{w.title || 'Check Application / Bond Status'}</h4>
                  </div>
                  <p className="text-xs text-zinc-400">Enter your Reference Code or Bond Number to check real-time progress.</p>

                  <form onSubmit={handleTrackLookup} className="flex gap-2 max-w-lg">
                    <input
                      type="text"
                      placeholder={w.trackerPlaceholder || "e.g. BND-9921 or APP-1002"}
                      value={trackingQuery}
                      onChange={e => setTrackingQuery(e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono"
                    />
                    <button
                      type="submit"
                      disabled={trackingLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                      <Search size={12} /> {trackingLoading ? 'Checking...' : 'Track'}
                    </button>
                  </form>

                  {trackingResult && (
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-400 font-mono">Reference: {trackingResult.trackingCode}</span>
                          <h5 className="text-sm font-bold text-white">{trackingResult.details?.applicantName || 'Application Record'}</h5>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold rounded-lg">
                          {trackingResult.status}
                        </span>
                      </div>

                      {/* Step Progress Timeline */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800">
                        {(trackingResult.steps || []).map((step: any, idx: number) => (
                          <div key={idx} className={`p-2.5 rounded-lg border text-xs ${
                            step.completed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                            step.current ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-bold' :
                            'bg-zinc-900 border-zinc-800 text-zinc-500'
                          }`}>
                            <span className="text-[9px] block uppercase font-mono mb-1">Step {idx + 1}</span>
                            <span className="block font-bold">{step.label}</span>
                            <span className="text-[10px] opacity-75">{step.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REAL-TIME LIVE CHAT SUPPORT WIDGET */}
              {w.type === 'live_chat' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={18} className="text-indigo-400" />
                      <h4 className="text-sm font-bold text-white">{w.title || 'Online Customer Support Chat'}</h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> Staff Online
                    </span>
                  </div>

                  <div className="h-48 overflow-y-auto space-y-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                        <div className={`p-2.5 rounded-xl text-xs max-w-sm ${
                          msg.isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-zinc-800 text-zinc-200 rounded-bl-none'
                        }`}>
                          <span className="text-[9px] opacity-75 block font-bold mb-0.5">{msg.sender}</span>
                          <p>{msg.text}</p>
                        </div>
                        <span className="text-[9px] text-zinc-500 mt-0.5">{msg.time}</span>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                    />
                    <button
                      type="submit"
                      disabled={chatSending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Send size={12} /> {chatSending ? 'Sending...' : 'Send'}
                    </button>
                  </form>
                </div>
              )}

              {/* AUTH & LOGIN WIDGET */}
              {w.type === 'auth_widget' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 max-w-md mx-auto">
                  <div className="text-center space-y-1">
                    <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-2 border border-indigo-500/20">
                      <Lock size={20} />
                    </div>
                    <h4 className="text-base font-bold text-white">{w.title || 'Portal Member Access'}</h4>
                    <p className="text-xs text-zinc-400">Sign in to manage your property bonds and applications</p>
                  </div>

                  <div className="flex border-b border-zinc-800 text-xs font-bold text-zinc-400">
                    <button
                      onClick={() => setAuthTab('login')}
                      className={`flex-1 pb-2 text-center cursor-pointer ${authTab === 'login' ? 'text-indigo-400 border-b-2 border-indigo-500' : ''}`}
                    >
                      Login
                    </button>
                    <button
                      onClick={() => setAuthTab('register')}
                      className={`flex-1 pb-2 text-center cursor-pointer ${authTab === 'register' ? 'text-indigo-400 border-b-2 border-indigo-500' : ''}`}
                    >
                      Create Account
                    </button>
                  </div>

                  <form onSubmit={handleAuthSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={authEmail}
                        onChange={e => setAuthEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={e => setAuthPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {authTab === 'login' ? 'Sign In to Portal' : 'Register Portal Account'}
                    </button>

                    <div className="pt-2 text-center space-y-2">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Or continue with third-party auth</p>
                      <div className="flex justify-center gap-2">
                        <button type="button" onClick={() => toast.success('Google SSO Auth initiated')} className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-bold cursor-pointer">
                          Google SSO
                        </button>
                        <button type="button" onClick={() => toast.success('Microsoft SSO Auth initiated')} className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs text-zinc-300 font-bold cursor-pointer">
                          Microsoft
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* AURORA RECORD GRID WIDGET */}
              {w.type === 'record_grid' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={18} className="text-cyan-400" />
                      <h4 className="text-sm font-bold text-white">{w.title || 'Tenancy Records Feed'}</h4>
                    </div>
                    <div className="relative w-48">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Filter records..."
                        value={gridSearch}
                        onChange={e => setGridSearch(e.target.value)}
                        className="w-full pl-8 pr-2 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[10px] uppercase text-zinc-400 font-bold">
                          <th className="py-2 px-3">Reference / ID</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Primary Info</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 text-xs">
                        {gridRecords
                          .filter(r => JSON.stringify(r).toLowerCase().includes(gridSearch.toLowerCase()))
                          .map((rec, idx) => (
                            <tr key={rec.id || idx} className="hover:bg-zinc-800/40 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{rec._customerRef || rec.bondNumber || rec.id.substring(0, 12)}</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {rec.status || 'Active'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-300">
                                {rec.propertyAddress || rec.tenantName || rec.submitted_by || 'Record details'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => setSelectedRecord(rec)}
                                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        {gridRecords.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-xs text-zinc-500">
                              No records found for this module.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
                    </div>
                  </div>
                </div>
              )}

              {/* KANBAN BOARD WIDGET */}
              {w.type === 'kanban_board' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold text-white">{w.title || 'Multi-Step Form Wizard'}</h4>
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">Step 1: Details</span>
                    <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-bold">Step 2: Uploads</span>
                  </div>
                  <input type="text" placeholder="Full Legal Name" className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white" />
                </div>
              )}

              {/* FEEDBACK SURVEY WIDGET */}
              {w.type === 'feedback_survey' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 text-center">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Calculator size={16} className="text-cyan-400" /> {w.title || 'Pricing Calculator'}
                  </h4>
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-bold text-white">
                    <span>Estimated Total Quote</span>
                    <span className="text-lg text-cyan-400">$1,450.00</span>
                  </div>
                </div>
              )}

              {/* SIGNATURE PAD WIDGET */}
              {w.type === 'signature_pad' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 text-center space-y-2 bg-amber-500/5">
                  <Lock size={24} className="mx-auto text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-300">{w.title || 'Restricted Access Container'}</h4>
                  <p className="text-[10px] text-zinc-400">Content inside this container is locked for unauthorized user roles.</p>
                </div>
              )}

              {/* TEAM DIRECTORY WIDGET */}
              {w.type === 'team_directory' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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

              {/* ACTIVITY FEED WIDGET */}
              {w.type === 'activity_feed' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
                  <h4 className="text-sm font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                    <HistoryIcon size={16} className="text-purple-400" /> {w.title || 'Activity & Audit Log Stream'}
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                  <div className="flex gap-2 border-b border-zinc-800 pb-2 text-xs font-bold">
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg">Overview</span>
                    <span className="px-3 py-1 text-zinc-400">Specifications</span>
                  </div>
                  <p className="text-xs text-zinc-400">Interactive tabbed panel content area.</p>
                </div>
              )}

              {/* PRICING TABLE WIDGET */}
              {w.type === 'pricing_table' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
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

              {/* TESTIMONIALS WIDGET */}
              {w.type === 'testimonials' && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3 text-center">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
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
                <div className="bg-zinc-900 border border-rose-500/20 rounded-2xl p-8 relative overflow-hidden space-y-4 bg-gradient-to-br from-rose-950/20 to-zinc-950">
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
                <div className="bg-zinc-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
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
                }`} />
              )}
            </div>
          );
        })}
        </div>

      </main>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white">Record Detail View</h4>
              <button onClick={() => setSelectedRecord(null)} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl space-y-1 font-mono text-zinc-300">
                <p><span className="text-zinc-500 uppercase">ID:</span> {selectedRecord.id}</p>
                <p><span className="text-zinc-500 uppercase">Customer Ref:</span> {selectedRecord._customerRef || selectedRecord.bondNumber || 'N/A'}</p>
                <p><span className="text-zinc-500 uppercase">Status:</span> {selectedRecord.status}</p>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl space-y-1 text-zinc-300">
                <p className="font-bold text-white mb-1">Payload Fields:</p>
                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              </div>
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Close Record View
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-zinc-900 border-t border-zinc-800 p-4 text-center text-xs text-zinc-500 mt-auto">
        {footerText}
      </footer>
      </div>

    </div>
  );
};
