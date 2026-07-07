import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePlatform } from '../../../hooks/usePlatform';
import { Button, Input } from '../../../components/UI/Primitives';
import { Search, Plus, BookOpen, Trash2, Edit2, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../../components/UI/PageHeader';
import { toast } from 'sonner';

export interface KBArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  lastUpdated: string;
}

const DEFAULT_ARTICLES: KBArticle[] = [
  {
    id: 'kb-1',
    title: 'HR Operations & Employee Handbook',
    category: 'Operations',
    content: `Aurora Operations & Employee Policy Guidelines:
1. Working Hours: Core operational hours are 9:00 AM to 5:00 PM local time. Remote work is fully supported based on role arrangement.
2. Benefits & Paid Time Off: Standard employees receive 20 days of annual leave and 10 days of sick leave. Leave requests must be submitted through the Workforce hub at least 5 business days in advance.
3. Payroll: Processed monthly on the 25th. If the 25th falls on a weekend, payment is disbursed on the preceding Friday.
4. Business Expense Reimbursement: All business-related expenses must be submitted via the Finance module with matching receipts within 30 days of the transaction.`,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'kb-2',
    title: 'Aurora Platform API & Schema Specifications',
    category: 'Engineering',
    content: `Technical documentation for the Aurora Operating Platform:
1. REST API Base URL: http://localhost:3001/api
2. Authentication: Calls must contain the "Authorization: Bearer <token>" header. Developers should generate API keys in Settings > API.
3. Tenant Context: All tenant-specific data operations require the "x-tenant-id" header.
4. Record Schemas: Modules define data collections. Every record contains a JSON "data" object matching the module fields layout. System triggers automatically execute calculation rules and SLA deadline timers upon record creation or updates.`,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'kb-3',
    title: 'Customer Support Escalation SOP',
    category: 'Customer Success',
    content: `Standard Operating Procedures (SOP) for Customer Care:
1. SLA Tiers: Response times are graded by priority:
   - Priority 1 (System Outage): 2 hours.
   - Priority 2 (Severe Degradation): 8 hours.
   - Priority 3 (General Query): 24 hours.
2. Escalation Matrix: If a ticket is unresolved within 50% of its SLA timeframe, automatically escalate to the Team Lead.
3. Refunds and Billing adjustments: Support staff can approve refunds up to $50. Adjustments above $50 require written authorization from the Finance Manager.`,
    lastUpdated: new Date().toLocaleDateString()
  },
  {
    id: 'kb-4',
    title: 'Business Development & Pricing Playbook',
    category: 'Sales',
    content: `Aurora Product Offering & Licensing structures:
1. Subscription Tiers:
   - Standard Seat: $29/user/month. Access to basic modules and personal assistant features.
   - Developer Seat: $79/user/month. Access to custom module builder, formula engine, and workflow designer.
   - AI Agent Seat: $19/agent/month. Provisioning rate for digital coworkers.
2. Value Proposition: Aurora unifies CRM, project tracking, custom logic builder, and AI automations in a single secure environment, reducing software spend by up to 40%.`,
    lastUpdated: new Date().toLocaleDateString()
  }
];

export const KnowledgeBaseSettings = () => {
  const { tenant } = usePlatform();
  const location = useLocation();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Editor State
  const [activeArticle, setActiveArticle] = useState<KBArticle | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editContent, setEditContent] = useState('');

  // Load articles from localStorage on mount/tenant change
  useEffect(() => {
    if (!tenant?.id) return;
    const storageKey = `aurora_kb_articles_${tenant.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setArticles(JSON.parse(stored));
      } catch (e) {
        setArticles(DEFAULT_ARTICLES);
      }
    } else {
      localStorage.setItem(storageKey, JSON.stringify(DEFAULT_ARTICLES));
      setArticles(DEFAULT_ARTICLES);
    }
  }, [tenant?.id]);

  const saveArticlesToStorage = (newArticles: KBArticle[]) => {
    if (!tenant?.id) return;
    const storageKey = `aurora_kb_articles_${tenant.id}`;
    localStorage.setItem(storageKey, JSON.stringify(newArticles));
    setArticles(newArticles);
  };

  const categories = ['All', ...Array.from(new Set(articles.map(a => a.category)))];

  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || art.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectArticle = (art: KBArticle) => {
    setActiveArticle(art);
    setEditTitle(art.title);
    setEditCategory(art.category);
    setEditContent(art.content);
    setIsEditing(false);
  };

  const handleStartCreate = () => {
    setActiveArticle(null);
    setEditTitle('');
    setEditCategory('');
    setEditContent('');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast.error('Article Title is required.');
      return;
    }
    if (!editCategory.trim()) {
      toast.error('Article Category is required.');
      return;
    }
    if (!editContent.trim()) {
      toast.error('Article Content is required.');
      return;
    }

    let newArticles = [...articles];
    if (activeArticle) {
      // Update existing
      newArticles = articles.map(a => a.id === activeArticle.id ? {
        ...a,
        title: editTitle,
        category: editCategory,
        content: editContent,
        lastUpdated: new Date().toLocaleDateString()
      } : a);
      toast.success('Article updated successfully.');
    } else {
      // Create new
      const newArt: KBArticle = {
        id: `kb-${Date.now()}`,
        title: editTitle,
        category: editCategory,
        content: editContent,
        lastUpdated: new Date().toLocaleDateString()
      };
      newArticles.push(newArt);
      setActiveArticle(newArt);
      toast.success('Article created successfully.');
    }

    saveArticlesToStorage(newArticles);
    setIsEditing(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    const newArticles = articles.filter(a => a.id !== id);
    saveArticlesToStorage(newArticles);
    setActiveArticle(null);
    setIsEditing(false);
    toast.success('Article deleted successfully.');
  };

  const isSettingsMode = location.pathname.startsWith('/workspace/settings');

  const content = (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[60vh]">
      {/* Sidebar List */}
      <div className="w-full lg:w-96 flex flex-col space-y-6">
        <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-6 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xs uppercase tracking-widest text-zinc-400">Knowledge Index</h3>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl" onClick={handleStartCreate}>
              <Plus size={16} />
            </Button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-indigo-600 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-9 pr-4 text-[11px] font-bold outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-zinc-800 dark:bg-white/5 shadow-sm"
            />
          </div>

          {/* Categories select */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedCategory === cat ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/15' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-white/5 dark:text-zinc-400'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List Card */}
        <div className="flex-1 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2rem] p-6 shadow-xl overflow-y-auto max-h-[500px]">
          <div className="space-y-2">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 space-y-3">
                <p className="text-xs font-bold">No articles found.</p>
                <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="text-[10px] font-bold">
                  Reset Filters
                </Button>
              </div>
            ) : (
              filteredArticles.map(art => {
                const isActive = activeArticle?.id === art.id;
                return (
                  <button
                    key={art.id}
                    onClick={() => handleSelectArticle(art)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${isActive ? 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/30' : 'border-zinc-100 hover:border-zinc-200 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white/30 dark:bg-transparent'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                        {art.category}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-bold">{art.lastUpdated}</span>
                    </div>
                    <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 mt-2 truncate">{art.title}</h4>
                    <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2 leading-relaxed">{art.content}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Editor/Viewer */}
      <div className="flex-1 flex flex-col">
        {isEditing ? (
          <div className="flex-1 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl min-h-[450px] flex flex-col">
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input 
                    label="Article Title" 
                    placeholder="e.g. Server Access SOP" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                  <Input 
                    label="Category / Collection" 
                    placeholder="e.g. Operations" 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 flex-1 flex flex-col">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Content Body</label>
                  <textarea 
                    className="w-full flex-1 min-h-[250px] bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-medium leading-relaxed shadow-inner"
                    placeholder="Write structured guidelines, procedures, or schema specifications here..."
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800/50">
                <Button variant="ghost" onClick={() => setIsEditing(false)} className="font-bold">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} className="font-bold gap-2">
                  <CheckCircle size={14} /> Save Article
                </Button>
              </div>
            </div>
          </div>
        ) : !activeArticle ? (
          <div className="flex-1 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2.5rem] p-12 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 min-h-[450px]">
            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-full flex items-center justify-center">
              <BookOpen size={32} />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-bold">No Article Selected</h3>
              <p className="text-xs text-zinc-500">Select an article from the index on the left to read or edit it, or create a new article to build your knowledge base.</p>
            </div>
            <Button variant="primary" size="sm" onClick={handleStartCreate} className="font-bold gap-2">
              <Plus size={16} /> Create Article
            </Button>
          </div>
        ) : (
          <div className="flex-1 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[2.5rem] p-8 shadow-2xl min-h-[450px] flex flex-col space-y-6 text-left">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/50">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 px-3 py-1 rounded-full mb-3 inline-block">
                  {activeArticle.category}
                </span>
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white mt-1">
                  {activeArticle.title}
                </h2>
                <p className="text-xs text-zinc-400 mt-2 font-medium">
                  Last updated on {activeArticle.lastUpdated}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-2 font-bold">
                  <Edit2 size={14} /> Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(activeArticle.id)} className="gap-2 font-bold">
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </div>

            {/* Content view with markdown style styling */}
            <div className="flex-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium font-sans">
              {activeArticle.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isSettingsMode) {
    return content;
  }

  return (
    <div className="flex flex-col w-full px-6 lg:px-12 py-10 relative">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none" />

      <PageHeader 
        title="Knowledge Base"
        description="Central repository for institutional knowledge, documentation, training materials, and AI agent reference context."
      />
      <div className="flex-1 relative z-10">
        {content}
      </div>
    </div>
  );
};
