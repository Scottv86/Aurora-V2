import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Search, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  Lock, 
  ArrowRight,
  Briefcase,
  Users,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { DriveItem } from '../../types/drive';
import { DriveService, sendToGlobalRecyclingBin } from '../../services/driveService';
import { DeleteConfirmModal } from '../../components/Drive/DeleteConfirmModal';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';


const TEMPLATES = [
  {
    id: 'tpl-blank',
    title: 'Blank Document',
    description: 'Start with a fresh, clean canvas for any document.',
    icon: Plus,
    bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    content: '<h1>Untitled Document</h1><p>Start typing your document content here...</p>'
  },
  {
    id: 'tpl-meeting',
    title: 'Meeting Minutes & Action Items',
    description: 'Structure team notes, attendees, decisions, and action items.',
    icon: Users,
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    content: `<h1>Meeting Minutes & Action Items</h1><p><strong>Date:</strong> {{system.currentDate}}</p><p><strong>Organization:</strong> {{tenant.name}}</p><p><strong>Lead Organizer:</strong> {{party.firstName}} {{party.familyName}} ({{party.workEmail}})</p><hr/><h2>1. Attendees</h2><ul><li>Sarah Jenkins (Finance)</li><li>David Vance (Legal)</li><li>Internal Team Members</li></ul><h2>2. Key Decisions & Notes</h2><p>Reviewed quarterly targets and verified module configuration standards.</p><h2>3. Action Items</h2><ol><li>Finalize compliance schedule submission.</li><li>Update pricing catalog item code {{catalog.itemCode}}.</li></ol>`
  },
  {
    id: 'tpl-proposal',
    title: 'Executive Business Proposal',
    description: 'Formal proposal template with financial estimates and approval milestones.',
    icon: Briefcase,
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    content: `<h1>Executive Business Proposal</h1><p><strong>Prepared for:</strong> {{party.organizationName}}</p><p><strong>Primary Contact:</strong> {{party.firstName}} {{party.familyName}}</p><p><strong>Date:</strong> {{system.currentDate}}</p><hr/><h2>Executive Summary</h2><p>This proposal presents an operational overview of services aligned with {{catalog.itemCode}} pricing standards at {{catalog.unitPrice}}.</p><h2>Governance & Compliance</h2><blockquote><p>Managed under Record Number {{record.number}} with mandatory 7-Year Tax & Financial Records retention.</p></blockquote>`
  },
  {
    id: 'tpl-policy',
    title: 'Corporate Security Policy',
    description: 'Enterprise policy document for records governance and information protection.',
    icon: ShieldAlert,
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    content: `<h1>Corporate Security & Governance Policy</h1><p><strong>Scope:</strong> {{tenant.name}} Workspace</p><p><strong>Compliance Standard:</strong> {{record.number}}</p><hr/><h2>1. Information Classification</h2><p>All assets created within the workspace must be tagged under an explicit Document Classification (PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED).</p><h2>2. Legal Hold & Immutable Freezes</h2><p>Under regulatory review, legal hold freezes supersede all automated disposal schedules.</p>`
  }
];

export const DocsApp = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { user, session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [itemToDelete, setItemToDelete] = useState<DriveItem | null>(null);

  // Fetch all documents from DriveService
  const allDocuments = useMemo(() => {
    const items = DriveService.getAllItems();
    return items.filter(item => item.type === 'DOCUMENT' && item.status === 'ACTIVE');
  }, [refreshKey]);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return allDocuments;
    return allDocuments.filter(doc => 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.recordsMetadata.recordNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allDocuments, searchQuery]);

  const handleCreateFromTemplate = (template: typeof TEMPLATES[0]) => {
    const newDoc = DriveService.saveDocument(
      null,
      template.title === 'Blank Document' ? 'Untitled Document' : template.title,
      template.content,
      'TENANT_SHARED',
      null
    );
    toast.success(`Created "${newDoc.name}"`);
    navigate(`/workspace/apps/docs/${newDoc.id}`);
  };

  const handleDeleteDocument = async (doc: DriveItem) => {
    if (doc.recordsMetadata.isLegalHold) {
      toast.error(`Cannot delete "${doc.name}": Active legal hold.`);
      return;
    }
    try {
      DriveService.softDeleteItem(doc.id);
      await sendToGlobalRecyclingBin(doc, tenant?.id, user?.email, session?.access_token);
      toast.success(`Moved "${doc.name}" to global Recycling Bin`);
      setRefreshKey(prev => prev + 1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete document');
    }
  };


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full bg-zinc-50/50 dark:bg-zinc-950/50 overflow-hidden relative">
      {/* Background Orbs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* App Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-xl flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-sm">
            <FileText size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              Aurora Documents
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Workspace Suite
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Create, edit, and collaborate on dynamic documents with automated module mail-merge fields and Drive storage
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCreateFromTemplate(TEMPLATES[0])}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            New Document
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 custom-scrollbar relative z-10">

      {/* Templates Starter Section */}
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            Start a New Document
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TEMPLATES.map(tpl => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.id}
                onClick={() => handleCreateFromTemplate(tpl)}
                className="group p-5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl transition-all shadow-md hover:shadow-xl hover:border-indigo-500/50 cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", tpl.bg)}>
                    <Icon size={24} />
                  </div>
                  <ChevronRight size={18} className="text-zinc-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {tpl.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Existing Documents Library */}
      <div className="space-y-4 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Recent Documents
          </h2>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-12 bg-white/40 dark:bg-white/[0.02] border border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-2">
            <FileText size={40} className="mx-auto text-zinc-300 dark:text-zinc-700 stroke-[1]" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No documents found</h3>
            <p className="text-xs text-zinc-500">Click a template starter above to create your first document.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc: DriveItem) => (
              <div
                key={doc.id}
                onClick={() => navigate(`/workspace/apps/docs/${doc.id}`)}
                className="group p-5 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border border-zinc-200/80 dark:border-white/5 rounded-3xl transition-all shadow-sm hover:shadow-lg hover:border-indigo-500/40 cursor-pointer flex flex-col justify-between space-y-4 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:scale-105 transition-transform">
                    <FileText size={22} />
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.recordsMetadata.isLegalHold && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-bold">
                        <Lock size={10} /> Hold
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(doc);
                      }}
                      className="p-1.5 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete to Global Recycling Bin"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {doc.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                    <span>{doc.recordsMetadata.recordNumber}</span>
                    <span>•</span>
                    <span>{doc.driveType === 'PERSONAL' ? 'My Drive' : 'Shared Drive'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Modified {new Date(doc.updatedAt).toLocaleDateString()}</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Edit <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Premium Aurora Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!itemToDelete}
        item={itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDeleteDocument(itemToDelete)}
      />
      </div>
    </div>
  );
};

